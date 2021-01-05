import Resource from "./framework/Resource"
import Test from "./game/Test"

const { ccclass, property, menu } = cc._decorator;

@ccclass
@menu("Common/Global")
export default class Global extends cc.Component {

    /** 资源管理模块 */
    public static Resource: Resource = null
    /** 测试模块 */
    public static Test: Test = null

    onLoad() {
        cc.game.addPersistRootNode(this.node)

        Global.Resource = this.getComponentInChildren(Resource)
        Global.Test = this.getComponentInChildren(Test)
    }
}
