// import Test from "./Test";

// const { ccclass, property } = cc._decorator;

// @ccclass
// export default class TestSpriteFrame extends Test {

//     testNode: cc.Node
//     testSprite: cc.Sprite

//     loadString: string = "加载精灵"
//     releaseString: string = "释放精灵"

//     start() {
//         this.testSprite = this.testNode.addComponent(cc.Sprite)
//     }

//     onTest() {
//         super.onTest()
//         const Resource = this.resource
//         let sprite = this.testSprite
//         if (this.testFlag) {
//             //内部还有张纹理资源 所以一个spriteFrame会使得引用计数+2
//             Resource.loadSpriteFrame("resources", "gold", (err, spriteFrame) => {
//                 if (!err) {
//                     Resource.setSpriteFrame(sprite, spriteFrame)
//                 }
//             })
//         } else {
//             Resource.setSpriteFrame(sprite, null)
//             cc.log(new Date().toLocaleTimeString() + " 释放精灵")
//         }
//     }
// }
