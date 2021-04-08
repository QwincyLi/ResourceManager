## Resource manager for cocos creator
### cocos creator version : 2.4.3
---

TODO: 移除动态属性(避免js引擎创建冗余的隐藏类),使用Map记录标记

---
一个cocos creator的资源管理方案。将引擎的[资源的静态引用](https://docs.cocos.com/creator/manual/zh/asset-manager/release-manager.html#%E8%B5%84%E6%BA%90%E7%9A%84%E9%9D%99%E6%80%81%E5%BC%95%E7%94%A8)和[资源的动态引用](https://docs.cocos.com/creator/manual/zh/asset-manager/release-manager.html#%E8%B5%84%E6%BA%90%E7%9A%84%E5%8A%A8%E6%80%81%E5%BC%95%E7%94%A8)统一,通过引用计数实现资源的自动释放。

如果你使用过unity的addressables的话，你可以将其理解为一个cocos creator的addressables的近似实现，配合bundle集成配置插件使用效果更佳： [qsbundle](https://github.com/QinSheng-Li/qsbundle)

--- 
- @author : lqs
- @license : MIT
- @email : 1053128593@qq.com  
---
### FAQ:
- 1.如何使用: 将ResourceManager文件引入项目并将其挂载在常驻节点或者其子节点上(节点实例化、销毁 资源加载、替换请使用下文Api内接口)
- 2.预加载: 直接使用引擎接口或者preloadAsset
- 3.资源常驻: 直接调用引擎资源接口```cc.Asset.prototype.addRef```)即可
- 4.资源加载接口与引擎接口的区别: 对资源的动态引用进行标记（建议已加载的资源也使用此接口获取进行标记检查）。并且如果将syncCallback设为true的话，则已经加载到内存中了资源则立即执行回调而不是使用引擎的延迟模拟异步
- 5.场景的资源自动释放是否需要勾选: 勾选(引擎场景资源自动释放也是通过引用计数减少的方式,所以不再重复实现,如果需要场景切换对某些资源不释放,参考第三点:资源常驻)
- 6.节点销毁后资源为啥没有立即被释放: 为了避免某些场景下资源被频繁的卸载加载,我们会延迟一段时间定期释放,这个间隔可以通过```releaseDelay : number```参数进行控制，默认值为5s
- 7.调用decRef为什么被立即释放: 这是由引擎实现所决定的,如果希望同第6点,需调用引擎资源接口```asset.decRef(false)//传入false只减少引用计数,不释放 ``` 后 调用本模块的 ```resMgr.tryRelease(asset._uuid)```
- 8.资源加载完成后为什么立即被放入待释放队列: 希望用户能有更清晰的资源管理概念，理清什么动态资源需要常驻,什么动态资源在界面或者场景关闭后需要释放,避免资源被加载后却遗忘释放，如果避免被释放的话参考第3点。
eg: 如果是同某界面一起的生命周期 你可以在onLoad中动态加载并addRef,然后在onDestroy中decRef
### API:
#### 1. 节点实例化及销毁
``` typescript
/** 
 * 实例化一个预制或者节点
 * 并对节点所来源的预制或者其依赖的动态加载资源进行引用计数+1
 * 
 * 为了保证资源被正确引用计数，请使用此接口代替cc.instantiate 
 */
instantiateNode(prefabOrNode: cc.Prefab | cc.Node): cc.Node
/**
 * 销毁一个节点,
 * 并对节点所来源的预制或者其依赖的动态加载资源进行引用计数-1 
 * 如果节点所使用的预制没有其他实例，则会放入待释放队列中进行释放
 * 
 * 为了保证资源被正确引用计数，请使用此接口代替cc.Node中的destroy方法
 */
destroyNode(node: cc.Node)
/**
 * 销毁一个节点的所有子节点
 * 
 * 为了保证资源被正确引用计数，请使用此接口代替cc.Node中的destroyAllChildren方法
 */
destroyAllChildrenNode(node: cc.Node)
```
#### 2.资源替换
``` typescript
/** 
 * 替换SpriteFrame 
 * 为了保证资源被正确引用计数，在替换时请使用此接口而不是直接使用引擎接口 
 *      错误示例: sprite.spriteFrame = newSpriteFrame 或者 sprite.spriteFrame = null
 */
setSpriteFrame(image: cc.Sprite | cc.Mask, newSpriteFrame: cc.SpriteFrame)
/** 
 * 替换字体
 * 为了保证资源被正确引用计数，在替换时请使用此接口而不是直接使用引擎接口 
 *      错误示例: label.font = newFont 或者 label.font = null
 */
setFont(label: cc.Label | cc.RichText, newFont: cc.Font)
/** 
 * 替换材质
 * 为了保证资源被正确引用计数，在替换时请使用此接口而不是直接使用引擎接口 
 *      错误示例: sprite.setMaterial(0, newMaterial)
 */
setMaterial(render: cc.RenderComponent, index: number, newMaterial: cc.Material) 
/**
 * 替换按钮状态纹理
 */
setButtonSpriteFrame(button: cc.Button, newNormalSpriteFrame: cc.SpriteFrame, newPressedSpriteFrame: cc.SpriteFrame, newHoverSpriteFrame: cc.SpriteFrame, newDisableSpriteFrame: cc.SpriteFrame)
/**
 * 替换龙骨资源
 */
setDragonBones(dragonBones: dragonBones.ArmatureDisplay, newDragonBonesAsset: dragonBones.DragonBonesAsset, newDragonBonesAltas: dragonBones.DragonBonesAtlasAsset)
/**
 * 替换spine资源,为了保证资源被正确计数,请使用此接口进行替换
 */
setSpine(skeleton: sp.Skeleton, newSkeletonData: sp.SkeletonData)`
```
#### 3. 资源动态加载(请使用以下接口替代引擎接口, 注: 资源加载完成后会被放入待释放队列)
``` typescript
/**
 * 加载bundle 若已缓存则直接同步执行回调
 * @param bundleName bundle包名
 */
loadBundle(bundleName: string, onLoad : (err : string, bundle : cc.AssetManager.Bundle)=> void)
/**
 * 从指定资源包中加载指定资源
 *
 * @param bundleName bundle包名
 * @param assetName 资源名称
 * @param type 资源类型
 * @param callback 加载完成 回调函数
 */
loadAsset(bundleName: string, assetName: string, type: typeof cc.Asset, callback?: (err?: string, asset?: cc.Asset) => void)
//下面的这些具体类型 只是为了避免每次加载时都需要声明资源类型 
loadSpriteFrame(bundleName: string, imageName: string, callback: (err?: string, spriteFrame?: cc.SpriteFrame) => void)
loadFont(bundleName: string, fontPath: string, callback?: (err?: string, font?: cc.Font) => void) 
loadMaterial(bundleName: string, materialPath: string, callback?: (err?: string, material?: cc.Material) => void) 
loadPrefab(bundleName: string, prefabPath: string, callback: (err?: string, prefab?: cc.Prefab) => void) 
loadAudioClip(bundleName: string, audioClipPath: string, callback: (err: string, clip: cc.AudioClip) => void) 
loadAnimationClip(bundleName: string, clipPath: string, callback: (err: string, clip: cc.AnimationClip) => void)
loadAtlas(bundleName: string, atlasPath: string, callback?: (err?: string, atlas?: cc.SpriteAtlas) => void)
loadSpine(bundleName: string, spinePath: string, callback?: (err?: string, spine?: sp.SkeletonData) => void)
```
---
### 如果觉得有用的话,也可以支持一波:pray:
![img](https://raw.githubusercontent.com/QinSheng-Li/qsbundle/master/images/alipay.jpg)
![img](https://raw.githubusercontent.com/QinSheng-Li/qsbundle/master/images/wechatpay.jpg)
