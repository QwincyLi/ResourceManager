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
        this.testRoot = cc.find("CountLabel")
        this.testRoot.addChild(this.testNode)
        let visibleSize = cc.view.getVisibleSize()
        this.testNode.setPosition(this.testRoot.convertToNodeSpaceAR(cc.v2(visibleSize.width / 2, visibleSize.height / 2)))
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
