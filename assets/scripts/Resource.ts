const { ccclass, property, menu } = cc._decorator;

/**
 * 资源管理模块
 * 
 * @link [asset bundle](https://forum.cocos.org/t/creator-asset-bundle/99886)
 * @link [资源管理](https://forum.cocos.org/t/creator/99454)
 * @link [加载与预加载](https://forum.cocos.org/t/topic/99843)
 */
@ccclass
export default class Resource extends cc.Component {

    public autoRef: boolean = true

    async onLoad() {

        if (CC_PREVIEW) {
            this.schedule(() => {
                cc.log(cc.assetManager.assets)
            }, 3)
        }

        //直接预制引用计数-1 资源被移除
        this.scheduleOnce(() => {
            cc.assetManager.loadBundle("prefabs", (err: Error, bundle: cc.AssetManager.Bundle) => {
                if (err) {
                    cc.warn(err)
                    return
                }
                cc.log(bundle)
                bundle.load("test1", cc.Prefab, (err, prefab: cc.Prefab) => {
                    if (err) {
                        cc.warn(err)
                        return
                    }
                    let node = this.Instantiate(prefab)
                    this.node.addChild(node)


                    this.scheduleOnce(() => {
                        //this.decRef(prefab)
                        this.scheduleOnce(() => {
                            this.Destroy(node)
                        }, 10)
                    }, 10)
                })
            })
        }, 0)
    }

    public Instantiate(prefabOrNode: cc.Prefab | cc.Node): cc.Node {
        if (this.autoRef && prefabOrNode instanceof cc.Prefab) {
            //预制添加引用
            this.addRef(prefabOrNode)
            this.autoRefNodeAsset(prefabOrNode.data)
        }
        let node = cc.instantiate(prefabOrNode as cc.Node)

        if (this.autoRef) {
            // @ts-expect-error
            if (prefabOrNode._uuid) {
                //hack 标记资源的预制来源
                //@ts-expect-error
                node._uuid = prefabOrNode._uuid
                // delta = 2 //预制实例化多一次引用 保证其初始依赖的资源在被替换后不会被移除
            }
            this.autoRefNodeAsset(node)
        }
        return node
    }

    public Destroy(node: cc.Node) {
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
                this.autoRefNodeAsset(node, -1)
            }
            node.destroy()
        }
    }

    public addRef(asset: cc.Asset, delta: number = 1) {
        if (this.autoRef) {
            this.autoRefAsset(asset, delta)
            //子资源引用计数管理
            if (asset instanceof cc.SpriteAtlas) {
                let sprites = asset.getSpriteFrames()
                for (let i = 0; i < sprites.length; i++) {
                    this.autoRefAsset(sprites[i], delta)
                }
            }
        }
    }

    public decRef(asset: cc.Asset, delta: number = 1) {
        if (this.autoRef && asset) {
            if (asset.refCount > 0) {
                this.autoRefAsset(asset, -1 * delta)
                //子资源引用计数管理
                if (asset instanceof cc.SpriteAtlas) {
                    let sprites = asset.getSpriteFrames()
                    for (let i = 0; i < sprites.length; i++) {
                        this.autoRefAsset(sprites[i], -1 * delta)
                    }
                } else if (asset instanceof cc.Prefab) {
                    this.autoRefNodeAsset(asset.data, -1 * delta)
                }
            }
        }
    }

    public autoRefAsset(asset: cc.Asset, delta) {
        if (delta > 0) {
            for (let i = 0; i < delta; i++) {
                asset.addRef()
                if (CC_PREVIEW) {
                    cc.log(new Date().toLocaleTimeString() + " : " + asset.name + " 引用计数+1, 剩余 " + asset.refCount)
                }
            }
        } else if (delta < 0) {
            for (let i = delta; i < 0; i++) {
                if (asset.refCount <= 0) break
                asset.decRef()
                if (CC_PREVIEW) {
                    cc.log(new Date().toLocaleTimeString() + " : " + asset.name + " 引用计数-1, 剩余 " + asset.refCount)
                }
            }
        }
    }

    autoRefNodeAsset(node: cc.Node, delta: number = 1) {
        let componentList = node.getComponentsInChildren(cc.Component)
        for (let i = 0; i < componentList.length; i++) {
            let component = componentList[i]
            this.autoRefComponentAsset(component, delta)
        }
    }

    autoRefComponentAsset(component: cc.Component, delta: number = 1) {
        for (let property in component) {
            let value = component[property]
            if (this.checkProperty(property, value, component, delta)) {
                continue
            } else if (Array.isArray(value)) {
                this.checkArray(value, delta)
            } else if (value instanceof Map) {
                this.checkMap(value, delta)
            }
        }
    }

    checkProperty(key: string, value: any, component, delta: number) {
        if (value instanceof cc.Asset) {
            if (value instanceof cc.Texture2D) return false
            //跳过setter getter
            let descriptor = Object.getOwnPropertyDescriptor(component, key)
            if (!descriptor) {
                return false
            }
            let asset: cc.Asset = value
            this.autoRefAsset(asset, delta)
            return true
        }
        return false
    }

    checkArray(arrayList: any[], delta: number) {
        for (let i = 0; i < arrayList.length; i++) {
            let data = arrayList[i]
            if (data instanceof cc.Asset) {
                if (data instanceof cc.Texture2D) continue
                let asset: cc.Asset = data
                this.autoRefAsset(asset, delta)
            }
        }
    }

    checkMap(map: Map<any, any>, delta: number) {
        map.forEach((value, key) => {
            if (value instanceof cc.Asset && !(value instanceof cc.Texture2D)) {
                this.autoRefAsset(value, delta)
            }
            if (key instanceof cc.Asset && !(key instanceof cc.Texture2D)) {
                this.autoRefAsset(key, delta)
            }
        })
    }

    /**
     * 加载Bundle资源
     * @param bundleName 
     * @param onLoad 
     */
    loadBundleAsync(bundleName: string, onLoaded: (err, bundle: cc.AssetManager.Bundle) => void) {
        cc.assetManager.loadBundle(bundleName, onLoaded)
    }

    loadPrefabAsync(bundleName, prefabPath: string, onLoaded: (err, prefab: cc.Prefab) => void) {
        this.loadBundleAsync(bundleName, (err, bundle) => {
            if (err) {
                onLoaded(err, null)
                return
            }
            bundle.load(prefabPath, cc.Prefab, (err, prefab: cc.Prefab) => {
                if (err) {
                    onLoaded(err, null)
                    return
                }
                onLoaded(null, prefab)
            })
        })
    }

    async loadBundleSync(bundleName) {
        return new Promise((resolve, reject) => {
            cc.assetManager.loadBundle(bundleName, (err, bundle) => {
                if (err) {
                    resolve(null)
                } else {
                    resolve(bundle)
                }
            })
        })
    }


}
