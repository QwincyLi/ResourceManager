import Resource from "../Resource";

const { ccclass, property } = cc._decorator;

@ccclass
export default class Test extends cc.Component {

    resource: Resource = null
    testRoot: cc.Node
    testNode: cc.Node
    testFlag: boolean = false

    loadString: string = "加载"
    releaseString: string = "释放"

    onLoad() {
        let node = cc.find("TestList")
        this.resource = node.getComponent(Resource)
        this.testNode = new cc.Node(this.name)
        this.testRoot = cc.find("Canvas")
        this.testRoot.addChild(this.testNode)
    }

    onTest() {
        this.testFlag = !this.testFlag
        let label = this.node.getComponentInChildren(cc.Label)
        label.string = this.testFlag ? this.releaseString : this.loadString
    }

    onDestroy() {
        if (this.testFlag)
            this.onTest()
    }
}
