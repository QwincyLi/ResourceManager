## asset(resource) auto release demo for cocos creator
### cocos creator version : 2.4.3+
---
一个cocos creator asset bundle下的资源自动管理方案和测试demo。将引擎的[资源的静态引用](https://docs.cocos.com/creator/manual/zh/asset-manager/release-manager.html#%E8%B5%84%E6%BA%90%E7%9A%84%E9%9D%99%E6%80%81%E5%BC%95%E7%94%A8)和[资源的动态引用](https://docs.cocos.com/creator/manual/zh/asset-manager/release-manager.html#%E8%B5%84%E6%BA%90%E7%9A%84%E5%8A%A8%E6%80%81%E5%BC%95%E7%94%A8)的资源管理统一,通过引用计数实现资源的自动释放。

---
### Resource Demo: https://github.com/QinSheng-Li/ResourceDemo
### 项目资源来自 : [cocos-creator/example-cases](https://github.com/cocos-creator/example-cases)
--- 
- @author : lqs
- @license : MIT
- @email : 1053128593@qq.com  
---
### FAQ:
- 1.如何使用: 将Resource引入项目(节点实例化、销毁 资源加载、替换请使用下文Api内接口)
- 2.预加载: 直接使用引擎接口或者preloadAsset
- 3.资源常驻: 在加载完成得回调中调用本模块的addRef接口(非引擎自带的 cc.Asset.prototyp.addRef)
- 4.资源加载接口与引擎接口的区别: 对资源的动态引用进行特殊处理 并且 如果已经加载到内存中了则立即执行回调而不是特意延迟模拟异步
- 5.场景的资源自动释放是否需要勾选: 勾选(引擎场景资源释放也是通过引用计数减少的方式,所以不再重复实现,如果需要场景切换对某些资源不释放,参考第三点:资源常驻)
- 6.节点销毁后资源为啥没有立即被释放: 为了避免某些场景下资源被频繁的卸载释放,我们会延迟一段时间定期释放,这个间隔可以通过```releaseDelay : number```参数进行控制 
- 7.场景切换后资源为啥又是立即释放: 为了避免大场景切换是两个场景资源同时存在 长时间的使得内存居高不下(使用的是引擎的资源释放接口会被立即释放掉, 参考第五点)
### API:
#### 1. 节点实例化及销毁
``` typescript
/** 
 * 实例化一个预制或者节点,
 * 为了保证资源被正确引用计数，请使用此接口代替cc.instantiate 
 */
instantiateNode(prefabOrNode: cc.Prefab | cc.Node): cc.Node
/**
 * 销毁一个节点
 * 为了保证资源被正确引用计数，请使用此接口代替cc.Node中的destroy方法
 */
destroyNode(node: cc.Node)
/**
 * 销毁一个节点的所有子节点
 * 为了保证资源被正确引用计数，请使用此接口代替cc.Node中的destroy方法
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
public setSpine(skeleton: sp.Skeleton, newSkeletonData: sp.SkeletonData)`
```
#### 3. 资源动态加载(自动释放的情况下 请使用以下接口替代引擎接口)
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
/**
 * 加载并运行场景（暂未特殊处理,参考FAQ 第七点)
 */
loadScene(sceneName: string, callback?: (err: string, scene: cc.Scene) => void)
```
---
### 如果觉得有用的话,也可以支持一波:pray:
![img](https://raw.githubusercontent.com/QinSheng-Li/qsbundle/master/images/alipay.jpg)
![img](https://raw.githubusercontent.com/QinSheng-Li/qsbundle/master/images/wechatpay.jpg)