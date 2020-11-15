const { ccclass, property } = cc._decorator;

@ccclass
export default class AssetCount extends cc.Component {

    @property(cc.Label)
    label: cc.Label = null

    onLoad() {
        cc.game.addPersistRootNode(this.node)
    }

    update() {
        if (this.label)
            this.label.string = "assets : " + cc.assetManager.assets.count.toString()
    }
}
