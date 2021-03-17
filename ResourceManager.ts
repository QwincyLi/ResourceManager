const { ccclass, property, menu } = cc._decorator;


enum DynamicState {
    STATIC = undefined,
    UNUSE = 0,
    //USE = 1, //大于这个值都是USE
}

interface DynamicAsset extends cc.Asset {
    _ref: number
    _uuid: string
    _dynamic: DynamicState
}

const dependUtil = cc.assetManager.dependUtil
const assets = cc.assetManager.assets

@ccclass
export default class ResourceManager extends cc.Component {

    @property({ tooltip: "是否启动自动释放管理, 游戏运行时不可以再修改" })
    public autoRelease: boolean = true

    @property({ tooltip: "资源自动释放延迟间隔,引用计数归0后多久释放资源", type: cc.Float, min: 0.0 })
    public releaseDelay: number = 5.0

    @property({ tooltip: "是否直接执行回调,如果资源已经下载缓存了的话" })
    public syncCallback: boolean = false

    /** 等待释放的资源uuid */
    private _waitDelete: Map<string, number> = new Map()

    onLoad() {
        //循环进行资源检测
        if (CC_PREVIEW) {
            this.schedule(() => {
                cc.log(assets)
            }, 5)
        }
        if (this.autoRelease) {
            //引擎内置资源常驻
            assets.forEach((asset, uuid) => { asset.addRef() })
            this.schedule(() => {
                this._doRelease()
            }, this.releaseDelay / 2.0)
        }
    }

    private _doRelease() {
        if (this._waitDelete.size) {
            let now = performance.now()
            this._waitDelete.forEach((deleteTick, uuid) => {
                //超过时间进行删除检测
                if (now >= deleteTick) {
                    let asset = assets.get(uuid)
                    if (asset) {
                        //@ts-expect-error
                        cc.assetManager._releaseManager._free(asset)
                        //cc.log(`Resource : do release asset ${asset.name} ${cc.js.getClassName(asset)} ${uuid} , refCount : ${asset.refCount}`)
                    }
                    this._waitDelete.delete(uuid)

                }
            })
        }
    }

    private _visitAsset(asset: cc.Asset, deps: string[]) {
        let dynamicAsset = asset as DynamicAsset
        if (!dynamicAsset._uuid) return
        if (dynamicAsset._dynamic != DynamicState.STATIC && dynamicAsset._dynamic != DynamicState.UNUSE) {
            //@ts-expect-error
            if (!deps.includes(asset._uuid)) {
                //@ts-expect-error
                deps.push(asset._uuid)
            }
        }
    }

    private _visitComponent(comp: cc.Component, deps: string[]) {
        let props = Object.getOwnPropertyNames(comp);
        for (let i = 0; i < props.length; i++) {
            let propName = props[i];
            if (propName === 'node' || propName === '__eventTargets') continue;
            let value = comp[propName];
            if (typeof value === 'object' && value) {
                if (Array.isArray(value)) {
                    for (let j = 0; j < value.length; j++) {
                        let val = value[j];
                        if (val instanceof cc.Asset) {
                            this._visitAsset(val, deps);
                        }
                    }
                }
                else if (!value.constructor || value.constructor === Object) {
                    let keys = Object.getOwnPropertyNames(value);
                    for (let j = 0; j < keys.length; j++) {
                        let val = value[keys[j]];
                        if (val instanceof cc.Asset) {
                            this._visitAsset(val, deps);
                        }
                    }
                }
                else if (value instanceof cc.Asset) {
                    this._visitAsset(value, deps);
                }
            }
        }
    }

    private _visitNode(node, deps) {
        for (let i = 0; i < node._components.length; i++) {
            this._visitComponent(node._components[i], deps);
        }
        for (let i = 0; i < node._children.length; i++) {
            this._visitNode(node._children[i], deps);
        }
    }

    /**
     * 尝试删除(将其放入待删除容器中,真正删除在定时器中调用)
     * @param uuid 资源的uuid
     */
    public tryRelease(uuid: string) {
        let deleteTimeStamp = performance.now() + this.releaseDelay * 1000
        this._waitDelete.set(uuid, deleteTimeStamp)
    }

    /**
     * 获取节点动态加载的资源依赖
     * @param node 
     * @param delta 
     */
    private _addNodeDependAssetsRef(node: cc.Node, delta: number = 1) {
        let deps = [];
        this._visitNode(node, deps);
        for (let i = 0, l = deps.length; i < l; i++) {
            let dependAsset = assets.get(deps[i]);
            if (dependAsset) {
                this._addRef(dependAsset, delta)
            }
        }
    }

    /**
     * 将节点中动态加载的资源引用计数减少
     * @param node
     * @param delta
     */
    private _decNodeDependAssetsRef(node: cc.Node) {
        let deps = []
        this._visitNode(node, deps)
        for (let i = 0, l = deps.length; i < l; i++) {
            var dependAsset = assets.get(deps[i]);
            if (dependAsset) {
                this._decRef(dependAsset)
            } else {
                cc.warn(`Resource : node dec asset , ${node.name} not fount depend asset ${deps[i]}`)
            }
        }
    }

    /**
     * 实例化一个预制或者节点,为了保证资源被正确引用计数，请使用此接口代替cc.instantiate
     * @param prefabOrNode
     */
    public instantiateNode(prefabOrNode: cc.Prefab | cc.Node) {
        let node = cc.instantiate(prefabOrNode as cc.Node)
        if (this.autoRelease) {
            if (prefabOrNode instanceof cc.Prefab) {
                prefabOrNode.addRef()
                //hack 标记资源的预制来源
                //@ts-expect-error
                node._uuid = prefabOrNode._uuid

                //动态加载的资源 引用计数
                let dynamicAsset = prefabOrNode as any as DynamicAsset
                if (dynamicAsset._dynamic != DynamicState.STATIC) {
                    dynamicAsset._dynamic += 1
                }
            } else {
                //检查节点里动态加载的资源并增加引用计数
                this._addNodeDependAssetsRef(prefabOrNode)
            }
        }
        return node
    }

    /**
     * 销毁一个节点,为了保证资源被正确引用计数，请使用此接口代替cc.Node的destroy方法
     * @param node
     */
    public destroyNode(node: cc.Node) {
        if (node && cc.isValid(node)) {
            let name = node.name
            if (this.autoRelease) {
                this._decNodeDependAssetsRef(node)
                //hack 根据标记的预制来源 减少预制的引用
                //@ts-expect-error
                if (node._uuid) {
                    //@ts-expect-error
                    let prefab = cc.assetManager.assets.get(node._uuid) as cc.Prefab
                    if (prefab) {
                        this._decRef(prefab)
                    }
                }
            }
            node.destroy()
        }
    }

    /**
     * 销毁一个节点的所有子节点
     * 为了保证资源被正确引用计数，请使用此接口代替cc.Node中的destroyAllChildren方法
     */
    public destroyAllChildrenNode(node: cc.Node) {
        if (node) {
            let count = node.childrenCount
            for (let i = 0; i < count; i++) {
                this.destroyNode(node.children[i])
            }
        }
    }

    /**
     * 给动态加载的资源增加引用计数(静态资源不生效)
     * @param asset 
     * @param delta 
     */
    private _addRef(asset: cc.Asset, delta: number = 1) {
        if (this.autoRelease && asset) {
            if (!cc.isValid(asset, true)) {
                cc.warn(`Resource: asset addRef ${asset.name} not valid, addRef failuer`)
                return
            }

            if (asset instanceof cc.MaterialVariant) {
                //@ts-expect-error
                asset = asset.material
            }
            let dynamicAsset = asset as DynamicAsset
            if (dynamicAsset._dynamic != DynamicState.STATIC) {
                dynamicAsset._dynamic += delta
                dynamicAsset._ref += delta
            }
        }
    }

    /**
     * 给动态加载的资源减少引用计数(静态资源不生效)
     * @param asset 
     */
    private _decRef(asset: cc.Asset, delta: number = 1) {
        if (this.autoRelease && asset) {
            if (asset instanceof cc.MaterialVariant) {
                //@ts-expect-error
                asset = asset.material
            }
            let dynamicAsset = asset as DynamicAsset
            if (dynamicAsset._dynamic != DynamicState.STATIC && dynamicAsset._dynamic != DynamicState.UNUSE) {
                dynamicAsset._dynamic -= delta
                dynamicAsset._ref -= delta
                //引用计数不为0 可能是循环引用也需要做释放检测
                this.tryRelease(dynamicAsset._uuid)
            }
        }
    }

    /**
     * 加载bundle 若已缓存则直接同步执行回调
     * @param bundleName
     * @param onLoad
     */
    public loadBundle(bundleName: string, onLoad) {
        if (this.syncCallback) {
            let cacheBundle = cc.assetManager.bundles.get(bundleName)
            if (cacheBundle) {
                onLoad(null, cacheBundle)
                return
            }
        }

        cc.assetManager.loadBundle(bundleName, (err, bundle: cc.AssetManager.Bundle) => {
            if (err) {
                cc.warn(err)
                onLoad(err, null)
                return
            }
            //检测bundle包的依赖
            let deps = bundle.deps
            if (deps) {
                for (let i = 0; i < deps.length; i++) {
                    let depBundleName = deps[i]
                    if (cc.assetManager.bundles.get(depBundleName)) {

                    } else {
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
            this._decRef(oldSpriteFrame)
        }
        if (newSpriteFrame) {
            this._addRef(newSpriteFrame)
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
            this._decRef(oldNormalSpriteFrame)
        if (oldPressedSpriteFrame)
            this._decRef(oldPressedSpriteFrame)
        if (oldHoverSpriteFrame)
            this._decRef(oldHoverSpriteFrame)
        if (oldDisableSpriteFrame)
            this._decRef(oldDisableSpriteFrame)

        if (newNormalSpriteFrame)
            this._addRef(newNormalSpriteFrame)
        if (newPressedSpriteFrame)
            this._addRef(newPressedSpriteFrame)
        if (newHoverSpriteFrame)
            this._addRef(newHoverSpriteFrame)
        if (newDisableSpriteFrame)
            this._addRef(newDisableSpriteFrame)

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
        if (this.autoRelease) {
            if (oldFont)
                this._decRef(oldFont)
            if (newFont)
                this._addRef(newFont)
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
            this._decRef(oldDragonBonesAsset)
        if (oldDragonBonesAtlas)
            this._decRef(oldDragonBonesAtlas)

        if (newDragonBonesAltas)
            this._addRef(newDragonBonesAltas)
        if (newDragonBonesAsset)
            this._addRef(newDragonBonesAsset)

        dragonBones.dragonAsset = newDragonBonesAsset
        dragonBones.dragonAtlasAsset = newDragonBonesAltas
    }

    /**
     * 替换spine资源,为了保证资源被正确计数,请使用此接口进行替换
     */
    public setSpine(skeleton: sp.Skeleton, newSkeletonData: sp.SkeletonData) {
        if (!skeleton) return
        let oldSkeletonData = skeleton.skeletonData
        if (oldSkeletonData)
            this._decRef(oldSkeletonData)
        if (newSkeletonData)
            this._addRef(newSkeletonData)

        skeleton.skeletonData = newSkeletonData
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
        //if (oldMaterial == newMaterial) return //getMaterial获取的是材质变体 肯定无法相等 在引用管理内部会对此进行处理(_autoReleaseAsset)
        if (oldMaterial) {
            this._decRef(oldMaterial)
        }
        if (newMaterial)
            this._addRef(newMaterial)
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

    public loadAtlas(bundleName: string, atlasPath: string, callback?: (err?: string, atlas?: cc.SpriteAtlas) => void) {
        this.loadAsset(bundleName, atlasPath, cc.SpriteAtlas, callback)
    }

    public loadSpine(bundleName: string, spinePath: string, callback?: (err?: string, spine?: sp.SkeletonData) => void) {
        this.loadAsset(bundleName, spinePath, sp.SkeletonData, callback)
    }

    // public loadDragBones(bundleName: string, dragonBonesPath: string, callback?: (err?: string, dragonBones?: dragonBones.DragonBonesAsset) => void) {
    //     this.loadAsset(bundleName, dragonBonesPath, dragonBones.DragonBonesAsset, callback)
    // }

    public loadAudioClip(bundleName: string, audioClipPath: string, callback: (err: string, clip: cc.AudioClip) => void) {
        this.loadAsset(bundleName, audioClipPath, cc.AudioClip, callback)
    }

    public loadAnimationClip(bundleName: string, clipPath: string, callback: (err: string, clip: cc.AnimationClip) => void) {
        this.loadAsset(bundleName, clipPath, cc.AnimationClip, callback)
    }

    // /**
    //  * 与引擎接口含义一致
    //  */
    // public loadScene(sceneName: string, callback?: (err: string, scene: cc.Scene) => void) {
    //     //@ts-expect-error
    //     let bundleOfScene = cc.assetManager.bundles.find(function (bundle) {
    //         return bundle.getSceneInfo(sceneName);
    //     });
    //     if (!bundleOfScene) {
    //         cc.warn("Resource : loadScene failed, not found scene info from bundles")
    //         return
    //     }
    //     cc.assetManager.loadAny({ 'scene': sceneName }, { preset: "scene", bundle: bundleOfScene.name }, (err, sceneAsset) => {
    //         if (err) {
    //             cc.warn(err)
    //             //@ts-expect-error
    //             callback && callback(err, null)
    //             return
    //         }
    //         // let dynamicAsset = sceneAsset as DynamicAsset
    //         // if (dynamicAsset._dynamic == DynamicState.STATIC) {
    //         //     dynamicAsset._dynamic = DynamicState.UNUSE
    //         // }
    //         // this.addRef(sceneAsset)
    //         cc.director.runScene(sceneAsset, null, (err, newScene: cc.Scene) => {
    //             callback && callback(err, newScene)
    //         })
    //     })
    // }

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
                            this._initDynamicLoadAsset(cachedAsset)
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
                        this._initDynamicLoadAsset(asset)
                        callback && callback(null, asset)
                    }
                });
            } else {
                cc.warn(err)
                callback && callback(err)
            }
        })
    }

    private _initDynamicLoadAsset(asset: cc.Asset) {
        if (this.autoRelease) {
            let dynamicAsset = asset as DynamicAsset
            if (dynamicAsset._dynamic == DynamicState.STATIC) {
                dynamicAsset._dynamic = DynamicState.UNUSE
            }
            this.tryRelease(dynamicAsset._uuid) //资源加载后不使用也会被自动释放,防止资源一直占据内存,如果需要常驻 请调用asset.addRef 添加引用计数
        }
    }

    public preloadPrefab(bundleName: string, prefabPath: string, callback?: (err?: string) => void) {
        this.preloadAsset(bundleName, prefabPath, cc.Prefab, callback)
    }

    public preloadAsset(bundleName: string, assetPath: string, type: typeof cc.Asset, callback?: (err?: string) => void) {
        this.loadBundle(bundleName, (err: string, bundle: cc.AssetManager.Bundle) => {
            if (!err) {
                let info = bundle.getInfoWithPath(assetPath, type)
                if (info) {
                    let uuid = info.uuid //cc.assetManager.assets里面存储的key
                    if (uuid) {
                        let cachedAsset = cc.assetManager.assets.get(uuid)
                        if (cachedAsset && cc.isValid(cachedAsset)) {
                            callback && callback(null)
                            return
                        }
                    }
                }
                bundle.preload(assetPath, type, (err, items) => {
                    if (err) {
                        cc.warn(err)
                        //@ts-expect-error
                        callback && callback(err)
                    } else {
                        callback && callback(null)
                    }
                });
            } else {
                cc.warn(err)
                callback && callback(err)
            }
        })
    }
}

