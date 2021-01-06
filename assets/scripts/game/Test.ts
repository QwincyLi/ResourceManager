import Global from "../Global";

const { ccclass, property } = cc._decorator;

@ccclass
export default class Test extends cc.Component {

    private _testBits: number = 0

    _isTesting(bit: number) {
        return (this._testBits & bit) == 1
    }

    onTestResourceLoad(event) {
        let node: cc.Node = event.target
        if (!this._isTesting(1)) {
            node.getComponentInChildren(cc.Label).string = "加载中..."
            
        } else {
            //勾选syncCallback后是同步获取的已缓存资源
            Global.Resource.loadSpriteFrame("resources", "content", (err, spriteFrame) => {
                //@ts-expect-error
                spriteFrame.decRef(false)
                //@ts-expect-error
                Global.Resource.tryRelease(spriteFrame._uuid)
                this._testBits ^= 0
                node.getComponentInChildren(cc.Label).string = "资源加载"
            })
        }
    }
}
