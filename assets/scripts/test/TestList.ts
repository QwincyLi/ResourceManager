const { ccclass, property } = cc._decorator;

@ccclass
export default class TestList extends cc.Component {

    onLoad() {
        cc.game.addPersistRootNode(this.node)
    }
}
