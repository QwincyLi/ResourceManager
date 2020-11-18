## cocos creator 资源管理demo(通过资源自动引用计数,自动释放 持续迭代中)
## asset(resource) auto release demo for cocos creator
### cocos creator version : 2.4.3+
--- 
- @author : lqs
- @license : MIT
- @email : 1053128593@qq.com

---  
### FAQ:
- 1.预加载: 直接使用引擎接口即可
- 2.资源常驻: 在加载完成得回调中调用本模块的addRef接口(非引擎自带的资源addRef)
- 3.资源加载接口与引擎接口的区别: 如果已经加载到内存中了则立即执行回调而不是特意延迟模拟异步)
- 4.场景的资源自动释放是否需要勾选: 建议不勾选(若已经采用本套方案,为了避免未知错误,建议不勾选)
---
### Demo: https://github.com/QinSheng-Li/ResourceDemo
---
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
```
#### 2. 资源加载(与引擎接口的区别是: 如果已经加载到内存中了则立即执行回调而不是特意延迟模拟异步)
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
loadSpine(bundleName: string, spinePath: string, callback?: (err?: string, spine?: sp.SkeletonData) => void)
loadAudioClip(bundleName: string, audioClipPath: string, callback: (err: string, clip: cc.AudioClip) => void) 
loadAnimationClip(bundleName: string, clipPath: string, callback: (err: string, clip: cc.AnimationClip) => void) 
/**
 * 与引擎接口含义一致,加载并运行场景(建议不勾选场景的资源自动释放)
 */
loadScene(sceneName: string, callback?: (err: string, scene: cc.Scene) => void)
```
---
### 如果觉得有用的话,也可以支持一波:pray:
![img](https://raw.githubusercontent.com/QinSheng-Li/qsbundle/master/images/alipay.jpg)
![img](https://raw.githubusercontent.com/QinSheng-Li/qsbundle/master/images/wechatpay.jpg)