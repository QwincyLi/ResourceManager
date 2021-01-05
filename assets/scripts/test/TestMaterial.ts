// import Test from "./Test";

// const { ccclass, property } = cc._decorator;

// @ccclass
// export default class TestMaterial extends Test {

//     materialPrefab: cc.Prefab = null
//     materialAsset: cc.Material = null
//     materialNode: cc.Node = null

//     loadString: string = "加载材质"
//     releaseString: string = "释放材质"

//     onTest() {
//         super.onTest()
//         const Resource = this.resource
//         if (this.testFlag) {
//             //金币 spriteframe 1个 texture 1个 测试预制 1个 自定义材质 1个 自定义effect 1个 共增加五个资源(编辑器模式下)
//             Resource.loadPrefab("bundles", "prefabs/Material", (err, prefab) => {
//                 if (!err) {
//                     this.materialPrefab = prefab
//                     this.materialNode = Resource.instantiateNode(this.materialPrefab)
//                     this.testNode.addChild(this.materialNode)

//                     let clickEventHandler = new cc.Component.EventHandler();
//                     clickEventHandler.target = this.node;
//                     clickEventHandler.component = "TestMaterial";
//                     clickEventHandler.handler = "onChangeMaterial";
//                     clickEventHandler.customEventData = null;

//                     let button = this.onUpdateButton()
//                     button.clickEvents.push(clickEventHandler);
//                 }
//             })
//             Resource.loadMaterial("bundles", "material/red_material", (err, clip) => {
//                 if (!err) {
//                     this.materialAsset = clip
//                     this.onUpdateButton()
//                 }
//             })
//         } else {
//             Resource.destroyAllChildrenNode(this.testNode)
//             this.materialNode = null
//             //如果没有点击按钮替换使用自定义材质 而只是加载了 则其还是在内存中的 需要手动释放
//             if (this.materialAsset && cc.isValid(this.materialAsset)) {
//                 Resource.decRef(this.materialAsset)
//             }
//             this.materialAsset = null
//         }
//     }

//     onUpdateButton() {
//         if (this.materialNode) {
//             let button = this.materialNode.getComponentInChildren(cc.Button);
//             if (this.materialPrefab && this.materialAsset) {
//                 button.interactable = true
//             } else {
//                 button.interactable = false
//             }
//             return button
//         }
//         return null
//     }

//     onChangeMaterial() {
//         const Resource = this.resource
//         if (this.materialNode && this.materialAsset) {
//             let builtin = this.materialNode.getChildByName("builtin").getComponent(cc.Sprite)
//             let custom = this.materialNode.getChildByName("custom").getComponent(cc.Sprite)


//             let builtinMaterial = cc.Material.getBuiltinMaterial('2d-gray-sprite');
//             let customMaterial = this.materialAsset
//             Resource.setMaterial(builtin, 0, builtinMaterial)
//             Resource.setMaterial(custom, 0, customMaterial)
//         }
//     }
// }
