import Test from "./Test";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TestOnlyLoad extends Test {

    testLabel: cc.Label
    loadString: string = "只加载"
    releaseString: string = "释放"

    start() {
        this.testLabel = this.testNode.addComponent(cc.Label)
    }

    onTest() {
        super.onTest()
        const Resource = this.resource
        if (this.testFlag) {
            //如果只调用加载接口而不使用资源的话则该资源会一直存在不会被释放掉,这是由引擎的机制所决定的
            //若要释放则需要手动调用释放接口
            Resource.loadSpriteFrame("resources", "content", (err, spriteFrame) => { this.testLabel.string = "只加载,加载完成(如果不使用或设置为静态,则将会被自动释放" })
            this.testLabel.node.stopAllActions()
        } else {
            Resource.loadSpriteFrame("resources", "content", (err, spriteFrame) => {
                if (cc.isValid(spriteFrame)) {
                    spriteFrame.decRef();
                    this.testLabel.string = "只加载 释放完成"
                } else {
                    this.testLabel.string = "已经被释放了"
                }
            })
            this.testLabel.node.stopAllActions()
            this.testLabel.node.runAction(cc.sequence(cc.delayTime(1), cc.callFunc(() => { this.testLabel.string = "" })))
        }
    }
}