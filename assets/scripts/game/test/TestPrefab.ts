import Global from "../../Global";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TestPrefab extends cc.Component {

    loadString: string = "加载预制"
    releaseString: string = "释放预制"
    testFlag: boolean = false
    testNode: cc.Node = null

    onTest() {

        this.testFlag = !this.testFlag
        let label = this.node.getComponentInChildren(cc.Label)
        label.string = this.testFlag ? this.releaseString : this.loadString

        if (this.testFlag) {
            Global.Resource.loadPrefab("bundles", "prefabs/Star", (err, prefab) => {
                if (!err) {
                    this.testNode = Global.Resource.instantiateNode(prefab)
                    Global.Test.node.parent.addChild(this.testNode)
                }
            })
        } else {
            if (this.testNode) {
                Global.Resource.destroyNode(this.testNode)
                this.testNode = null
            }
        }
    }
}
