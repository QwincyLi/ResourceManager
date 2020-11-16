const { ccclass, property, menu } = cc._decorator;

/**
 * 资源管理模块
 * 
 * 1.预加载: 直接使用引擎接口即可
 * 2.资源常驻: 在加载完成得回调中调用本模块的addRef接口(非引擎自带的资源addRef)
 * 3.测试demo: https://github.com/QinSheng-Li/ResourceDemo
 * TODO : 遍历所有组件及其属性的方式优化
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
        if (this.autoRef && prefabOrNode instanceof cc.Prefab) {
            //预制资源添加引用(如果单次创建 实例化后不需要保留预制资源的引用的话 则需要调用decRef 将预制手动释放掉)
            this.addRef(prefabOrNode)
        }
        let node = cc.instantiate(prefabOrNode as cc.Node)

        if (this.autoRef) {
            // @ts-expect-error
            if (prefabOrNode._uuid) {
                //hack 标记资源的预制来源
                //@ts-expect-error
                node._uuid = prefabOrNode._uuid
            }
            this._autoRefNodeAsset(node)
        }
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
        if (node) {
            if (this.autoRef) {
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
                this._autoRefNodeAsset(node, -1)
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
        if (this.autoRef) {
            this._autoRefAsset(asset, delta)
            // if (CC_PREVIEW) {
            //     cc.log(new Date().toLocaleTimeString() + " : " + asset.name + " 引用计数+1, 剩余 " + asset.refCount)
            // }
        }
    }

    /**
     * 给资源减少引用计数,为了保证资源被正确引用计数，请使用此接口代替cc.Asset中的addRef方法
     * @param asset 
     * @param delta 减少的引用计数量,默认为1
     */
    public decRef(asset: cc.Asset, delta: number = 1) {
        if (this.autoRef && asset) {
            this._autoRefAsset(asset, -1 * delta)
            // if (CC_PREVIEW) {
            //     cc.log(new Date().toLocaleTimeString() + " : " + asset.name + " 引用计数-1, 剩余 " + asset.refCount)
            // }
        }
    }

    private _autoRefAsset(asset: cc.Asset, delta) {
        if (!asset) return
        if (delta == 0) return

        if (asset instanceof cc.Material) {
            //@ts-expect-error
            let material = asset instanceof cc.MaterialVariant ? asset.material : asset
            //内置材质 跳过(内置材质引用计数减为0其实也没释放掉)
            if (cc.assetManager.builtins.getBuiltin("material", material.name)) {
                return
            } else {
                //对材质变体增减引用计数其实就是对材质本身操作
                asset = material
            }
        }
        this._autoRef(asset, delta)
        //处理子资源引用计数
        this._autoRefSubAsset(asset, delta)
    }

    private _autoRefSubAsset(asset: cc.Asset, delta) {
        if (!asset) return
        if (delta == 0) return

        //子资源引用计数管理
        if (asset instanceof cc.SpriteAtlas) {
            let sprites = asset.getSpriteFrames()
            for (let i = 0; i < sprites.length; i++) {
                this._autoRef(sprites[i], delta)
            }
        } else if (asset instanceof cc.Prefab) {
            this._autoRefNodeAsset(asset.data, delta)
        } else if (asset instanceof cc.BitmapFont) {
            //@ts-expect-error
            this._autoRef(asset.spriteFrame, delta)
        }
        // else if (asset instanceof cc.Material) {
        //     let effectAsset = asset.effectAsset
        //     if (effectAsset) {
        //         this._autoRefAsset(effectAsset, -1 * delta)
        //     }
        // }
    }

    _autoRef(asset: cc.Asset, delta) {
        if (!asset) return
        if (delta == 0) return
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
        for (let i = 0; i < scene.childrenCount; i++) {
            let node = scene.children[i]
            //非常驻节点才需要
            //@ts-expect-error
            if (!node._persistNode) {
                this._autoRefNodeAsset(node, delta)
            }
        }
        return
    }

    private _autoRefNodeAsset(node: cc.Node, delta: number = 1) {
        let componentList = node.getComponentsInChildren(cc.Component)
        for (let i = 0; i < componentList.length; i++) {
            let component = componentList[i]
            this._autoRefComponentAsset(component, delta)
        }
    }

    private _autoRefComponentAsset(component: cc.Component, delta: number = 1) {
        for (let property in component) {

            //跳过setter getter
            let descriptor = Object.getOwnPropertyDescriptor(component, property)
            if (!descriptor) {
                continue
            }

            let value = component[property]
            if (Array.isArray(value)) {
                this._checkArray(value, delta)
            } else if (value instanceof Map) {
                this._checkMap(value, delta)
            } else if (this._checkProperty(value, component, delta)) {
                continue
            }
        }
    }

    private _checkProperty(value: any, component, delta: number) {
        if (value instanceof cc.Asset) {
            if (value instanceof cc.Texture2D) return false
            let asset: cc.Asset = value
            this._autoRefAsset(asset, delta)
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
                this._autoRefAsset(asset, delta)
            }
        }
    }

    private _checkMap(map: Map<any, any>, delta: number) {
        map.forEach((value, key) => {
            if (value instanceof cc.Asset && !(value instanceof cc.Texture2D)) {
                this._autoRefAsset(value, delta)
            }
            if (key instanceof cc.Asset && !(key instanceof cc.Texture2D)) {
                this._autoRefAsset(key, delta)
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
     * 替换字体
     * 为了保证资源被正确引用计数，在替换时请使用此接口而不是直接使用引擎接口 
     *      错误示例: label.font = newFont 或者 label.font = null
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
     * 替换材质
     * 为了保证资源被正确引用计数，在替换时请使用此接口而不是直接使用引擎接口 
     *      错误示例: sprite.setMaterial(0, newMaterial)
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

    public loadMaterial(bundleName: string, materialPath: string, callback?: (err?: string, material?: cc.Material) => void) {
        this.loadAsset(bundleName, materialPath, cc.Material, callback)
    }

    public loadPrefab(bundleName: string, prefabPath: string, callback: (err?: string, prefab?: cc.Prefab) => void) {
        this.loadAsset(bundleName, prefabPath, cc.Prefab, callback)
    }

    public loadSpine(bundleName: string, spinePath: string, callback?: (err?: string, spine?: sp.SkeletonData) => void) {
        this.loadAsset(bundleName, spinePath, sp.SkeletonData, callback)
    }

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
     * 与引擎接口含义一致,加载并运行场景(建议不勾选场景的资源自动释放)
     */
    public loadScene(sceneName: string, callback?: (err: string, scene: cc.Scene) => void) {
        //@ts-expect-error
        let bundleOfScene = cc.assetManager.bundles.find(function (bundle) {
            return bundle.getSceneInfo(sceneName);
        });
        cc.assetManager.loadAny({ 'scene': sceneName }, { preset: "scene", bundle: bundleOfScene.name }, (err, sceneAsset) => {
            if (err) {
                cc.warn(err)
                //@ts-expect-error
                callback && callback(err, null)
                return
            }
            let oldScene = cc.director.getScene()
            this._autoRefSceneAsset(oldScene, -1)

            cc.director.runScene(sceneAsset, (err, newScene: cc.Scene) => {
                if (newScene) {
                    this._autoRefSceneAsset(newScene, 1)
                }
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
                        if (cachedAsset) {
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
