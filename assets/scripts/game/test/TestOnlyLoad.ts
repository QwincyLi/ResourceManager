// import Test from "./Test";

import Global from "../../Global";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TestOnlyLoad extends cc.Component {

    testFlag: boolean = false
    loadString: string = "只加载"
    releaseString: string = "释放"

    testLabel: cc.Label = null

    start() {
        let node = new cc.Node()
        this.testLabel = node.addComponent(cc.Label)
        node.parent = Global.Test.node.parent
    }

    onTest() {

        this.testFlag = !this.testFlag
        let label = this.node.getComponentInChildren(cc.Label)
        label.string = this.testFlag ? this.releaseString : this.loadString

        if (this.testFlag) {
            //如果只调用加载接口而不使用资源的话则该资源会一直存在不会被释放掉,这是由引擎的机制所决定的
            //若要释放则需要手动调用释放接口
            Global.Resource.loadSpriteFrame("resources", "content", (err, spriteFrame) => {
                spriteFrame.addRef()
                this.testLabel.string = "加载完成(如果不使用或不设置为静态,则将会被自动释放"
                this.tipAction()
            })
        } else {
            Global.Resource.loadSpriteFrame("resources", "content", (err, spriteFrame) => {
                if (cc.isValid(spriteFrame)) {
                    //引用计数归0后将被立即释放
                    spriteFrame.decRef();

                    //引用计数归0后将被延迟释放
                    //spriteFrame.decRef(false)
                    //Global.Resource.tryRelease(spriteFrame._uuid)

                    this.testLabel.string = "只加载 释放完成"
                } else {
                    this.testLabel.string = "已经被释放了"
                }
                this.tipAction()
            })
        }
    }

    tipAction() {
        this.testLabel.node.stopAllActions()
        this.testLabel.node.runAction(cc.sequence(cc.delayTime(1), cc.callFunc(() => { this.testLabel.string = "" })))
    }
}