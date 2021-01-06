// import Resource from "../Resource";

// const { ccclass, property } = cc._decorator;

// @ccclass
// export default class TestSpine extends cc.Component {

//     @property(cc.Label)
//     label: cc.Label = null

//     start() {
//         const resource = cc.find("TestList").getComponent(Resource)
//         resource.loadSpine("resource", "spine/alien-ess", this.onComplete.bind(this))
//     }

//     onComplete(err, res) {
//         if (err) {
//             this.label.string = "spine 资源加载失败"
//             cc.error(err)
//         }

//         let spine = this.getComponent(sp.Skeleton)
//         spine.skeletonData = res
//         let animation = spine.setAnimation(0, "run", true)
//         this.label.string = "spine 资源加载完成"
//     }
// }
