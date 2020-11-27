## asset(resource) auto release demo for cocos creator
### cocos creator version : 2.4.3+
---
一个cocos creator资源自动管理方案和测试demo。将引擎的[资源的静态引用](https://docs.cocos.com/creator/manual/zh/asset-manager/release-manager.html#%E8%B5%84%E6%BA%90%E7%9A%84%E9%9D%99%E6%80%81%E5%BC%95%E7%94%A8)和[资源的动态引用](https://docs.cocos.com/creator/manual/zh/asset-manager/release-manager.html#%E8%B5%84%E6%BA%90%E7%9A%84%E5%8A%A8%E6%80%81%E5%BC%95%E7%94%A8)的资源管理统一,通过引用计数实现资源的自动释放。

---
### Resource Demo: https://github.com/QinSheng-Li/ResourceDemo
### 项目资源来自 : [cocos-creator/example-cases](https://github.com/cocos-creator/example-cases)
--- 
- @author : lqs
- @license : MIT
- @email : 1053128593@qq.com
---  
### FAQ:
- 1.如何使用: 将Resource、SlowlyRef两个文件引入项目(需要挂载资源的自定义脚本需要继承SlowlyRef组件,示例：TestSlolyComponent)
- 2.预加载: 直接使用引擎接口即可
- 3.资源常驻: 在加载完成得回调中调用本模块的addRef接口(非引擎自带的资源addRef)
- 4.资源加载接口与引擎接口的区别: 如果已经加载到内存中了则立即执行回调而不是特意延迟模拟异步)
- 5.场景的资源自动释放是否需要勾选: 勾选(引擎场景资源释放也是通过引用计数减少的方式,所以不再重复实现,如果需要场景切换对某些资源不释放,参考第三点:资源常驻)
### API:
#### 1. 资源引用计数
``` typescript
/** 
 * 给资源增加引用计数
 * 为了保证资源被正确引用计数，请使用此接口代替cc.Asset中的addRef方法
 */
addRef(asset : cc.Asset, delta : number = 1) 
/** 
 * 给资源减少引用计数
 * 为了保证资源被正确引用计数，请使用此接口代替cc.Asset中的addRef方法 
 */
decRef(asset : cc.Asset, delta : number = 1) 
/** 
 * 实例化一个预制或者节点,
 * 为了保证资源被正确引用计数，请使用此接口代替cc.instantiate 
 */
instantiateNode(prefabOrNode: cc.Prefab | cc.Node): cc.Node
/** 
 * 实例化多个对象
 * (自动引用计数时会遍历所有组件,为了减少消耗,需要实例化多个时建议使用此接口) 
 */
instantiateNodeMultip(prefabOrNode: cc.Prefab | cc.Node, count: number = 1): cc.Node[]
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
```
#### 2. 资源加载(与引擎接口的区别是: 如果已经加载到内存中了则立即执行回调而不是特意延迟模拟异步,如果不需要可以不使用
``` typescript
/**
 * 加载bundle 若已缓存则直接同步执行回调
 * @param bundleName bundle包名
 */
loadBundle(bundleName: string, onLoad : (err : string, bundle : cc.AssetManager.Bundle))
/**
 * 从指定资源包中加载指定资源
 *
 * @param bundleName bundle包名
 * @param assetName 资源名称
 * @param type 资源类型
 * @param callback 加载完成 回调函数
 */
loadAsset(bundleName: string, assetName: string, type: typeof cc.Asset, callback?: (err?: string, asset?: cc.Asset) => void)
//下面的这些具体类型 只是为了减少类型声明手写代码量
loadSpriteFrame(bundleName: string, imageName: string, callback: (err?: string, spriteFrame?: cc.SpriteFrame) => void)
loadFont(bundleName: string, fontPath: string, callback?: (err?: string, font?: cc.Font) => void) 
loadMaterial(bundleName: string, materialPath: string, callback?: (err?: string, material?: cc.Material) => void) 
loadPrefab(bundleName: string, prefabPath: string, callback: (err?: string, prefab?: cc.Prefab) => void) 
loadAudioClip(bundleName: string, audioClipPath: string, callback: (err: string, clip: cc.AudioClip) => void) 
loadAnimationClip(bundleName: string, clipPath: string, callback: (err: string, clip: cc.AnimationClip) => void)
loadAtlas(bundleName: string, atlasPath: string, callback?: (err?: string, atlas?: cc.SpriteAtlas) => void)
public loadSpine(bundleName: string, spinePath: string, callback?: (err?: string, spine?: sp.SkeletonData) => void)
/**
 * 与引擎接口含义一致,加载并运行场景
 */
loadScene(sceneName: string, callback?: (err: string, scene: cc.Scene) => void)
```
---
### 如果觉得有用的话,也可以支持一波:pray:
![img](https://raw.githubusercontent.com/QinSheng-Li/qsbundle/master/images/alipay.jpg)
![img](https://raw.githubusercontent.com/QinSheng-Li/qsbundle/master/images/wechatpay.jpg)