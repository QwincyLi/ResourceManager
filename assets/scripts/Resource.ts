const { ccclass, property, menu } = cc._decorator;

/**
 * 资源管理模块
 * 
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
     */s
    public instantiateNodeMultip(prefabOrNode: cc.Prefab | cc.Node, count: number = 1): cc.Node[] {
        if (!prefabOrNode) return null
        let isPrefab = prefabOrNode instanceof cc.Prefab
        if (this.autoRef && isPrefab) {
            //预制添加引用
            this.addRef(prefabOrNode as cc.Prefab, count)
        }
        let nodeList = []
        for (let i = 0; i < nodeList.length; i++) {
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

    public addRef(asset: cc.Asset, delta: number = 1) {
        if (this.autoRef) {
            this._autoRefAsset(asset, delta)
            //子资源引用计数管理
            if (asset instanceof cc.SpriteAtlas) {
                let sprites = asset.getSpriteFrames()
                for (let i = 0; i < sprites.length; i++) {
                    this._autoRefAsset(sprites[i], delta)
                }
            } else if (asset instanceof cc.Prefab) {
                this._autoRefNodeAsset(asset.data, 1)
            }
            // if (CC_PREVIEW) {
            //     cc.log(new Date().toLocaleTimeString() + " : " + asset.name + " 引用计数+1, 剩余 " + asset.refCount)
            // }
        }
    }

    public decRef(asset: cc.Asset, delta: number = 1) {
        if (this.autoRef && asset) {
            //子资源引用计数管理
            if (asset instanceof cc.SpriteAtlas) {
                let sprites = asset.getSpriteFrames()
                for (let i = 0; i < sprites.length; i++) {
                    this._autoRefAsset(sprites[i], -1 * delta)
                }
            } else if (asset instanceof cc.Prefab) {
                this._autoRefNodeAsset(asset.data, -1 * delta)
            }
            // else if (asset instanceof cc.Material) {
            //     let effectAsset = asset.effectAsset
            //     if (effectAsset) {
            //         this._autoRefAsset(effectAsset, -1 * delta)
            //     }
            // }
            this._autoRefAsset(asset, -1 * delta)
            // if (CC_PREVIEW) {
            //     cc.log(new Date().toLocaleTimeString() + " : " + asset.name + " 引用计数-1, 剩余 " + asset.refCount)
            // }

        }
    }

    private _autoRefAsset(asset: cc.Asset, delta) {
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

        if (delta > 0) {
            if (asset.refCount <= 0 && CC_PREVIEW)
                cc.log(asset.name + " 将被自动引用管理")
            for (let i = 0; i < delta; i++) {
                asset.addRef()
            }
        } else if (delta < 0) {
            for (let i = delta; i < 0; i++) {
                asset.decRef()
            }
            if (asset.refCount <= 0 && CC_PREVIEW)
                cc.log(asset.name + " 将被释放")
        }
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
            let value = component[property]
            if (Array.isArray(value)) {
                this._checkArray(value, delta)
            } else if (value instanceof Map) {
                this._checkMap(value, delta)
            } else if (this._checkProperty(property, value, component, delta)) {
                continue
            }
        }
    }

    private _checkProperty(key: string, value: any, component, delta: number) {
        if (value instanceof cc.Asset) {
            if (value instanceof cc.Texture2D) return false
            //if (value instanceof cc.Material && !(cc instanceof cc.MaterialVariant)) return false
            //跳过setter getter
            let descriptor = Object.getOwnPropertyDescriptor(component, key)
            if (!descriptor) {
                return false
            }

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
        cc.log("bundle加载: " + bundleName)
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
                        cc.log("bundle依赖加载: " + bundleName + " - " + depBundleName)
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

    public loadAudioClip(bundleName: string, audioClipPath: string, callback: (err: string, clip: cc.AudioClip) => void) {
        this.loadAsset(bundleName, audioClipPath, cc.AudioClip, callback)
    }

    public loadAnimationClip(bundleName: string, clipPath: string, callback: (err: string, clip: cc.AnimationClip) => void) {
        this.loadAsset(bundleName, clipPath, cc.AnimationClip, callback)
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
                //hack 将路径转换为uuid (参考引擎资源加载管线中 urlTransformer 实现)
                //@ts-expect-error
                let config = bundle._config;
                let info = config.getInfoWithPath(assetName, type);
                if (info) {
                    let uuid = info.uuid //cc.assetManager.assets里面存储的key
                    let cachedAsset = cc.assetManager.assets.get(uuid)
                    if (cachedAsset) {
                        callback && callback(null, cachedAsset)
                        return
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
