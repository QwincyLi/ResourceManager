import SlowlyRef from "./SlowlyRef";

const { ccclass, property, menu } = cc._decorator;

/**
 * 资源自动引用计数管理模块
 */
@ccclass
export default class Resource extends cc.Component {

    @property({ tooltip: "游戏运行后不可再修改" })
    public autoRef: boolean = true

    public onLoad() {
        // cc.assetManager.assets.forEach((asset: cc.Asset, url) => {
        //     this.addRef(asset)
        // })
    }

    /**
     * 实例化一个预制或者节点,为了保证资源被正确引用计数，请使用此接口代替cc.instantiate
     * @param prefabOrNode 
     */
    public instantiateNode(prefabOrNode: cc.Prefab | cc.Node): cc.Node {
        if (!prefabOrNode) return null
        // let performance1 = performance.now()
        if (this.autoRef && prefabOrNode instanceof cc.Prefab) {
            //预制资源添加引用(如果单次创建 实例化后不需要保留预制资源的引用的话 则需要调用decRef 将预制手动释放掉)
            this.addRef(prefabOrNode)
        }
        // let performance2 = performance.now()
        let node = cc.instantiate(prefabOrNode as cc.Node)
        // let performance3 = performance.now()
        if (this.autoRef) {
            // @ts-expect-error
            if (prefabOrNode._uuid) {
                //hack 标记资源的预制来源
                //@ts-expect-error
                node._uuid = prefabOrNode._uuid
            }
            this._autoRefNodeAsset(node)
        }
        // let performance4 = performance.now()
        // let engineDuration = performance3 - performance2
        // let totalDuration = performance4 - performance1
        // let resourceDuration = totalDuration - engineDuration
        // cc.log(`${prefabOrNode.name} 引擎实例化耗时 ${engineDuration}`)
        // cc.log(`${prefabOrNode.name} Resource实例化耗时 ${resourceDuration}`)
        // cc.log(`${prefabOrNode.name} 总共实例化耗时 ${totalDuration}`)
        return node
    }

    /**
     * 实例化多个对象(自动引用计数时会遍历所有组件,为了减少消耗,需要实例化多个时建议使用此接口)
     * @param prefabOrNode 
     * @param count 
     */
    public instantiateNodeMultip(prefabOrNode: cc.Prefab | cc.Node, count: number = 1): cc.Node[] {
        if (!prefabOrNode) return null
        let isPrefab = prefabOrNode instanceof cc.Prefab
        if (this.autoRef && isPrefab) {
            //预制添加引用
            this.addRef(prefabOrNode as cc.Prefab, count)
        }
        let nodeList = []
        for (let i = 0; i < count; i++) {
            let node = cc.instantiate(prefabOrNode as cc.Node)
            nodeList.push(node)
        }

        if (this.autoRef) {
            // @ts-expect-error
            if (prefabOrNode._uuid) {
                //hack 标记资源的预制来源
                //@ts-expect-error
                node._uuid = prefabOrNode._uuid
            }
            this._autoRefNodeAsset(isPrefab ? (prefabOrNode as cc.Prefab).data : (prefabOrNode as cc.Node), count)
        }
        return nodeList
    }

    /**
     * 销毁一个节点,为了保证资源被正确引用计数，请使用此接口代替cc.Asset中的addRef方法
     * @param node 
     */
    public destroyNode(node: cc.Node) {
        if (node && cc.isValid(node)) {
            if (this.autoRef) {
                this._autoRefNodeAsset(node, -1)
                //hack 根据标记的预}制来源 减少预制的引用
                //@ts-expect-error
                if (node._uuid) {
                    //实例化预制减少引用
                    //@ts-expect-error
                    let prefab = cc.assetManager.assets.get(node._uuid) as cc.Prefab
                    if (prefab) {
                        this.decRef(prefab)
                    }
                }
            }
            node.destroy()
        }
    }

    public destroyAllChildrenNode(node: cc.Node) {
        if (node) {
            let count = node.childrenCount
            for (let i = 0; i < count; i++) {
                this.destroyNode(node.children[i])
            }
        }
    }

    /**
     * 给资源增加引用计数,为了保证资源被正确引用计数，请使用此接口代替cc.Asset中的addRef方法
     * @param asset 
     * @param delta 增加的引用计数量,默认为1
     */
    public addRef(asset: cc.Asset, delta: number = 1) {
        if (this.autoRef && asset) {
            this._autoRefAnyAsset(asset, delta)
        }
    }

    /**
     * 给资源减少引用计数,为了保证资源被正确引用计数，请使用此接口代替cc.Asset中的addRef方法
     * @param asset 
     * @param delta 减少的引用计数量,默认为1
     */
    public decRef(asset: cc.Asset, delta: number = 1) {
        if (this.autoRef && asset) {
            this._autoRefAnyAsset(asset, -1 * delta)
        }
    }

    private _autoRefAnyAsset(asset: cc.Asset, delta) {
        if (!asset) return
        if (delta == 0) return

        //材质特殊处理
        if (asset instanceof cc.Material) {
            this._autoRefMaterialAsset(asset, delta)
        } else if (asset instanceof cc.Prefab) { //prefab 增加引用计数的时候 用到的资源都进行了增加 所以需要释放
            this._autoRefPrefabAsset(asset, delta)
        } else if (asset instanceof cc.BitmapFont) {
            this._autoRefFontAsset(asset, delta)
        } else if (asset instanceof cc.SpriteAtlas) {
            this._autoRefAtlasAsset(asset, delta)
        } else {
            this._autoRef(asset, delta)
            this._autoRefSubAsset(asset, delta)
        }
    }

    private _autoRefPrefabAsset(prefab: cc.Prefab, delta) {
        this._autoRefNodeAsset(prefab.data, delta)
        this._autoRef(prefab, delta)
    }

    private _autoRefMaterialAsset(materialOrVariant: cc.Material, delta: number = 1) {
        //@ts-expect-error
        let material = materialOrVariant instanceof cc.MaterialVariant ? materialOrVariant.material : materialOrVariant
        //内置材质 跳过(内置材质引用计数减为0 其实还在使用中也没释放掉)
        if (cc.assetManager.builtins.getBuiltin("material", material.name)) {
            return
        } else {
            //对材质变体增减引用计数其实就是对材质本身操作
        }
        this._autoRef(material, delta)
    }

    private _autoRefFontAsset(font: cc.Font, delta) {
        this._autoRef(font, delta)
        if (font instanceof cc.BitmapFont) {
            //@ts-expect-error
            this._autoRef(font.spriteFrame, font.refCount - (font.spriteFrame as cc.SpriteFrame).refCount)
        }
    }

    private _autoRefAtlasAsset(atlas: cc.SpriteAtlas, delta) {
        atlas.addRef()
        let sprites = atlas.getSpriteFrames()
        for (let i = 0; i < sprites.length; i++) {
            this._autoRef(sprites[i], atlas.refCount - sprites[i].refCount)
        }
    }

    /**
     * 处理子资源引用计数 引擎层面的处理会使得子资源数量+1
     * @param asset 
     * @param delta 
     */
    private _autoRefSubAsset(asset: cc.Asset, delta) {

        // else if (asset instanceof cc.Material) {
        //     let effectAsset = asset.effectAsset
        //     if (effectAsset) {
        //         this._autoRefAsset(effectAsset, -1 * delta)
        //     }
        // }
    }

    private _autoRef(asset: cc.Asset, delta) {
        if (delta > 0) {
            // if (asset.refCount <= 0 && CC_PREVIEW)
            //     cc.log(asset.name + " 将被自动引用管理")
            for (let i = 0; i < delta; i++) {
                asset.addRef()
            }
        } else if (delta < 0) {
            for (let i = delta; i < 0; i++) {
                asset.decRef()
            }
            // if (asset.refCount <= 0 && CC_PREVIEW)
            //     cc.log(asset.name + " 将被释放")
        }
    }

    /**
     * 对场景进行自动引用计数(常驻接口将被跳过)
     * @param scene 
     * @param delta 
     */
    private _autoRefSceneAsset(scene: cc.Scene, delta: number = 1) {
        let sceneChildren = scene.children
        let sceneChildrenCount = scene.childrenCount
        for (let i = 0; i < sceneChildrenCount; i++) {
            let node = sceneChildren[i]
            //非常驻节点才需要
            //@ts-expect-error
            if (!node._persistNode) {
                this._autoRefNodeAsset(node, delta)
            }
        }
        return
    }

    private _autoRefNodeAsset(node: cc.Node, delta: number = 1) {
        //子节点
        let nodeChilren = node.children
        let nodeChilrenCount = node.childrenCount
        for (let i = 0; i < nodeChilrenCount; i++) {
            this._autoRefNodeAsset(nodeChilren[i], delta)
        }

        //组件
        //@ts-ignore
        let nodeComponents = node._components as cc.Component[]
        let nodeComponentCount = nodeComponents.length
        for (let i = 0; i < nodeComponentCount; i++) {
            this._autoRefComponentAsset(nodeComponents[i], delta)
        }
    }

    private _autoRefRenderComponentAsset(render: cc.RenderComponent, delta) {
        let materialList = render.getMaterials()
        for (let j = 0; j < materialList.length; j++) {
            let material = materialList[j]
            if (material) {
                this._autoRefMaterialAsset(material, delta)
            }
        }
    }

    private _autoRefAnimationComponentAsset(animation: cc.Animation, delta) {
        let clips = animation.getClips()
        for (let i = 0; i < clips.length; i++) {
            this._autoRef(clips[i], delta)
        }
    }

    /**
     * 用户自定义资源属性自动引用计数管理
     * @param custom 
     * @param delta 
     */
    private _autoCustomComponentAsset(custom: cc.Component, delta) {
        if (custom instanceof SlowlyRef) {
            //循环遍历所有属性是有一定性能负担
            for (let property in custom) {
                //跳过setter getter
                let descriptor = Object.getOwnPropertyDescriptor(custom, property)
                if (!descriptor) {
                    continue
                }
                let value = custom[property]
                if (Array.isArray(value)) {
                    this._checkArray(value, delta)
                } else if (value instanceof Map) {
                    this._checkMap(value, delta)
                } else if (this._checkProperty(value, delta)) {
                    continue
                }
            }
        }
    }

    private _autoRefComponentAsset(component: cc.Component, delta: number = 1) {
        if (component instanceof cc.Sprite) {  //精灵
            let sprite = component
            if (sprite) {
                if (sprite.spriteFrame) {
                    this._autoRef(sprite.spriteFrame, delta)
                }
                this._autoRefRenderComponentAsset(sprite, delta)
            }
        } else if (component instanceof cc.Button) {//按钮
            let button = component
            if (button.normalSprite) {
                this._autoRef(button.normalSprite, delta)
            }
            if (button.pressedSprite) {
                this._autoRef(button.normalSprite, delta)
            }
            if (button.hoverSprite) {
                this._autoRef(button.hoverSprite, delta)
            }
            if (button.disabledSprite) {
                this._autoRef(button.disabledSprite, delta)
            }
        } else if (component instanceof cc.Label) {
            if (component.font)
                this._autoRefFontAsset(component.font, delta)
            this._autoRefRenderComponentAsset(component, delta)
        } else if (component instanceof cc.RichText) {
            let richText = component
            if (richText) {
                if (richText.font)
                    this._autoRefAnyAsset(richText.font, delta)
                if (richText.imageAtlas) {
                    this._autoRefAtlasAsset(richText.imageAtlas, delta)
                }
            }
        } else if (component instanceof cc.ParticleSystem) {
            if (component.file) {
                this._autoRef(component.file, delta)
            }
            if (component.spriteFrame) {
                this._autoRef(component.spriteFrame, delta)
            }
        } else if (component instanceof cc.PageViewIndicator) {
            if (component.spriteFrame) {
                this._autoRef(component.spriteFrame, delta)
            }
            // //新版本已经将输入框背景解耦出来成一个独立节点了 如果是旧版本或者cc.EditBox的引用出现问题则放开此注释
            // } else if (component instanceof cc.EditBox) {
            //     let editBox = component
            //     if (editBox.backgroundImage) {
            //         this._autoRefAsset(editBox.backgroundImage, delta)
            //     }
        } else if (component instanceof cc.Mask) {
            if (component.spriteFrame) { this._autoRef(component.spriteFrame, delta) }
        } else if (component instanceof cc.Animation) {
            this._autoRefAnimationComponentAsset(component, delta)
        } else if (window["sp"] && component instanceof sp.Skeleton) { //可能会被模块剔除
            this._autoRef(component.skeletonData, delta)
            this._autoRefRenderComponentAsset(component, delta)
        } else if (window["dragonBones"] && component instanceof dragonBones.ArmatureDisplay) { //可能会被模块剔除
            this._autoRef(component.dragonAsset, delta)
            this._autoRef(component.dragonAtlasAsset, delta)
        } else {
            //自定义脚本部分
            this._autoCustomComponentAsset(component, delta)
        }

        // //所有组件全部暴力轮询(最初版本)
        // for (let property in component) {
        //     //跳过setter getter
        //     let descriptor = Object.getOwnPropertyDescriptor(component, property)
        //     if (!descriptor) {
        //         continue
        //     }
        //     let value = component[property]
        //     if (Array.isArray(value)) {
        //         this._checkArray(value, delta)
        //     } else if (value instanceof Map) {
        //         this._checkMap(value, delta)
        //     } else if (this._checkProperty(value, delta)) {
        //         continue
        //     }
        // }
    }

    private _checkProperty(value: any, delta: number) {
        if (value instanceof cc.Asset) {
            if (value instanceof cc.Texture2D) return false
            let asset: cc.Asset = value
            this._autoRefAnyAsset(asset, delta)
            return true
        }
        return false
    }

    private _checkArray(arrayList: any[], delta: number) {
        for (let i = 0; i < arrayList.length; i++) {
            let data = arrayList[i]
            if (data instanceof cc.Asset) {
                if (data instanceof cc.Texture2D) continue
                let asset: cc.Asset = data
                this._autoRefAnyAsset(asset, delta)
            }
        }
    }

    private _checkMap(map: Map<any, any>, delta: number) {
        map.forEach((value, key) => {
            if (value instanceof cc.Asset && !(value instanceof cc.Texture2D)) {
                this._autoRefAnyAsset(value, delta)
            }
            if (key instanceof cc.Asset && !(key instanceof cc.Texture2D)) {
                this._autoRefAnyAsset(key, delta)
            }
        })
    }

    /**
     * 加载bundle 若已缓存则直接同步执行回调
     * @param bundleName 
     * @param onLoad 
     */
    public loadBundle(bundleName: string, onLoad) {
        let cacheBundle = cc.assetManager.bundles.get(bundleName)
        if (cacheBundle) {
            onLoad(null, cacheBundle)
            return
        }
        //cc.log("bundle加载: " + bundleName)
        cc.assetManager.loadBundle(bundleName, (err, bundle: cc.AssetManager.Bundle) => {
            if (err) {
                cc.warn(err)
                onLoad(err, null)
                return
            }
            let deps = bundle.deps
            if (deps) {
                for (let i = 0; i < deps.length; i++) {
                    let depBundleName = deps[i]
                    if (cc.assetManager.bundles.get(depBundleName)) {

                    } else {
                        //cc.log("bundle依赖加载: " + bundleName + " - " + depBundleName)
                        cc.assetManager.loadBundle(depBundleName, (depErr, depBundle) => {
                            if (depErr) {
                                cc.warn(depErr)
                                return
                            }
                        })
                    }
                }
            }
            onLoad(null, bundle)
        })
    }

    /** 
     * 替换SpriteFrame 
     * 为了保证资源被正确引用计数，在替换时请使用此接口而不是直接使用引擎接口 
     *      错误示例: sprite.spriteFrame = newSpriteFrame 或者 sprite.spriteFrame = null
     */
    public setSpriteFrame(image: cc.Sprite | cc.Mask, newSpriteFrame: cc.SpriteFrame) {
        if (!image) return
        let oldSpriteFrame = image.spriteFrame
        if (oldSpriteFrame == newSpriteFrame) return
        if (oldSpriteFrame) {
            this.decRef(oldSpriteFrame)
        }
        if (newSpriteFrame) {
            this.addRef(newSpriteFrame)
        }

        try {
            image.spriteFrame = newSpriteFrame
        } catch (e) {
            cc.warn(e)
        }
    }

    /**
     * 替换按钮状态纹理
     */
    public setButtonSpriteFrame(button: cc.Button, newNormalSpriteFrame: cc.SpriteFrame, newPressedSpriteFrame: cc.SpriteFrame, newHoverSpriteFrame: cc.SpriteFrame, newDisableSpriteFrame: cc.SpriteFrame) {
        if (!button) return
        let oldNormalSpriteFrame = button.normalSprite
        let oldPressedSpriteFrame = button.pressedSprite
        let oldHoverSpriteFrame = button.hoverSprite
        let oldDisableSpriteFrame = button.disabledSprite

        if (oldNormalSpriteFrame)
            this.decRef(oldNormalSpriteFrame, -1)
        if (oldPressedSpriteFrame)
            this.decRef(oldPressedSpriteFrame, -1)
        if (oldHoverSpriteFrame)
            this.decRef(oldHoverSpriteFrame, -1)
        if (oldDisableSpriteFrame)
            this.decRef(oldDisableSpriteFrame, -1)

        if (newNormalSpriteFrame)
            this.addRef(newNormalSpriteFrame, 1)
        if (newPressedSpriteFrame)
            this.addRef(newPressedSpriteFrame, 1)
        if (newHoverSpriteFrame)
            this.addRef(newHoverSpriteFrame, 1)
        if (newDisableSpriteFrame)
            this.addRef(newDisableSpriteFrame, 1)

        button.normalSprite = newNormalSpriteFrame
        button.pressedSprite = newPressedSpriteFrame
        button.hoverSprite = newHoverSpriteFrame
        button.disabledSprite = newDisableSpriteFrame
    }

    /** 
     * 替换字体
     * 为了保证资源被正确引用计数，在替换时请使用此接口而不是直接使用引擎接口 
     *      错误示例: label.font = newFont 或者 label.font = null
     */
    public setFont(label: cc.Label | cc.RichText, newFont: cc.Font) {
        if (!label) return
        let oldFont = label.font
        if (oldFont == newFont) return
        if (this.autoRef) {
            if (oldFont)
                this.decRef(oldFont)
            if (newFont)
                this.addRef(newFont)
        }
        label.font = newFont
    }

    /**
     * 替换龙骨资源
     */
    public setDragonBones(dragonBones: dragonBones.ArmatureDisplay, newDragonBonesAsset: dragonBones.DragonBonesAsset, newDragonBonesAltas: dragonBones.DragonBonesAtlasAsset): void {
        if (!dragonBones) return
        let oldDragonBonesAsset = dragonBones.dragonAsset
        let oldDragonBonesAtlas = dragonBones.dragonAtlasAsset
        if (oldDragonBonesAsset)
            this.decRef(oldDragonBonesAsset)
        if (oldDragonBonesAtlas)
            this.decRef(oldDragonBonesAtlas)

        if (newDragonBonesAltas)
            this.addRef(newDragonBonesAltas)
        if (newDragonBonesAsset)
            this.addRef(newDragonBonesAsset)

        dragonBones.dragonAsset = newDragonBonesAsset
        dragonBones.dragonAtlasAsset = newDragonBonesAltas
    }

    /** 
    * 替换材质
    * 为了保证资源被正确引用计数，在替换时请使用此接口而不是直接使用引擎接口 
    *      错误示例: sprite.setMaterial(0, newMaterial)
    */
    public setMaterial(render: cc.RenderComponent, index: number, newMaterial: cc.Material) {
        //边界条件检查
        if (index < 0) return
        if (index >= render.getMaterials().length) return
        let oldMaterial = render.getMaterial(index)
        //if (oldMaterial == newMaterial) return //getMaterial获取的是材质变体 肯定无法相等 在引用管理内部会对此进行处理(_autoRefAsset)
        if (oldMaterial) {
            this.decRef(oldMaterial)
        }
        if (newMaterial)
            this.addRef(newMaterial)
        render.setMaterial(index, newMaterial)
    }

    public loadSpriteFrame(bundleName: string, imageName: string, callback: (err?: string, spriteFrame?: cc.SpriteFrame) => void) {
        this.loadAsset(bundleName, imageName, cc.SpriteFrame, callback)
    }

    public loadFont(bundleName: string, fontPath: string, callback?: (err?: string, font?: cc.Font) => void) {
        this.loadAsset(bundleName, fontPath, cc.Font, callback)
    }

    public loadMaterial(bundleName: string, materialPath: string, callback?: (err?: string, material?: cc.Material) => void) {
        this.loadAsset(bundleName, materialPath, cc.Material, callback)
    }

    public loadPrefab(bundleName: string, prefabPath: string, callback?: (err?: string, prefab?: cc.Prefab) => void) {
        this.loadAsset(bundleName, prefabPath, cc.Prefab, callback)
    }

    // public loadSpine(bundleName: string, spinePath: string, callback?: (err?: string, spine?: sp.SkeletonData) => void) {
    //     this.loadAsset(bundleName, spinePath, sp.SkeletonData, callback)
    // }

    // public loadDragBones(bundleName: string, dragonBonesPath: string, callback?: (err?: string, dragonBones?: dragonBones.DragonBonesAsset) => void) {
    //     this.loadAsset(bundleName, dragonBonesPath, dragonBones.DragonBonesAsset, callback)
    // }

    public loadAudioClip(bundleName: string, audioClipPath: string, callback: (err: string, clip: cc.AudioClip) => void) {
        this.loadAsset(bundleName, audioClipPath, cc.AudioClip, callback)
    }

    public loadAnimationClip(bundleName: string, clipPath: string, callback: (err: string, clip: cc.AnimationClip) => void) {
        this.loadAsset(bundleName, clipPath, cc.AnimationClip, callback)
    }

    // public loadScene(bundleName: string, sceneName: string, callack?: (err: string, sceneAsset: cc.SceneAsset) => void) {
    //     this.loadBundle(bundleName, (err, bundle: cc.AssetManager.Bundle) => {
    //         if (err) {
    //             cc.warn(err)
    //             callack && callack(err, null)
    //             return
    //         }
    //         let info = bundle.getSceneInfo(sceneName)
    //         cc.log(info)
    //         cc.log(bundle)
    //         cc.assetManager.loadAny({ 'scene': sceneName }, { preset: "scene", bundle: bundleName }, (err: any, sceneAsset) => {
    //             callack && callack(err, sceneAsset)
    //         })
    //     })
    // }

    /**
     * 与引擎接口含义一致
     */
    public loadScene(sceneName: string, callback?: (err: string, scene: cc.Scene) => void) {
        //@ts-expect-error
        let bundleOfScene = cc.assetManager.bundles.find(function (bundle) {
            return bundle.getSceneInfo(sceneName);
        });
        cc.assetManager.loadAny({ 'scene': sceneName }, { preset: "scene", bundle: bundleOfScene.name }, (finished, total, item) => {
            cc.log(item)
        }, (err, sceneAsset) => {
            if (err) {
                cc.warn(err)
                //@ts-expect-error
                callback && callback(err, null)
                return
            }
            cc.director.runScene(sceneAsset, null, (err, newScene: cc.Scene) => {
                callback && callback(err, newScene)
            })
        })
    }

    /**
     * 从指定资源包中加载指定资源
     *
     * @param bundleName bundle包名
     * @param assetName 资源名称
     * @param type 资源类型
     * @param callback 加载完成 回调函数
     */
    public loadAsset(bundleName: string, assetName: string, type: typeof cc.Asset, callback?: (err?: string, asset?: cc.Asset) => void) {
        this.loadBundle(bundleName, (err: string, bundle: cc.AssetManager.Bundle) => {
            if (!err) {
                let info = bundle.getInfoWithPath(assetName, type)
                if (info) {
                    let uuid = info.uuid //cc.assetManager.assets里面存储的key
                    if (uuid) {
                        let cachedAsset = cc.assetManager.assets.get(uuid)
                        if (cachedAsset && cc.isValid(cachedAsset)) {
                            callback && callback(null, cachedAsset)
                            return
                        }
                    }
                }
                bundle.load(assetName, type, (err, asset: cc.Asset) => {
                    if (err) {
                        cc.warn(err)
                        //@ts-expect-error
                        callback && callback(err)
                    } else {
                        callback && callback(null, asset)
                    }
                });
            } else {
                cc.warn(err)
                callback && callback(err)
            }
        })
    }
}
