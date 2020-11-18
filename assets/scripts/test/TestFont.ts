import Test from "./Test";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TestFont extends Test {

    loadString: string = "加载字体"
    releaseString: string = "释放字体"
    testLabel: cc.Label = null

    start() {
        if (!this.testNode.getComponent(cc.Label))
            this.testLabel = this.testNode.addComponent(cc.Label)
    }

    onTest() {
        super.onTest()
        const Resource = this.resource
        if (this.testFlag) {
            Resource.loadPrefab("bundles", "prefabs/Font", (err, prefab) => {
                if (!err) {
                    let node = Resource.instantiateNode(prefab)
                    this.testNode.addChild(node)

                    let clickEventHandler = new cc.Component.EventHandler();
                    clickEventHandler.target = this.node;
                    clickEventHandler.component = "TestFont";
                    clickEventHandler.handler = "onChangeFont";
                    clickEventHandler.customEventData = null;

                    let button = node.getComponentInChildren(cc.Button)
                    button.clickEvents.push(clickEventHandler);
                }
            })
            Resource.loadFont("resources", "font/enligsh-chinese", (err, font) => {
                this.testLabel.string = "一0五3一2八5九3";
                Resource.setFont(this.testLabel, font)
            })
        } else {
            Resource.destroyAllChildrenNode(this.testNode)
            this.testLabel.string = ""
            Resource.setFont(this.testLabel, null)
        }
    }

    onChangeFont() {
        const Resource = this.resource
        let labels = this.testNode.getComponentsInChildren(cc.Label)
        for (let i = 0; i < labels.length; i++) {
            let label = labels[i]
            Resource.setFont(label, null)
        }
    }
}

