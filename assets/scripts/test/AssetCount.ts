const { ccclass, property } = cc._decorator;

@ccclass
export default class AssetCount extends cc.Component {

    @property(cc.Label)
    label: cc.Label = null

    start() {
        this.schedule(() => {
            cc.log(cc.assetManager.assets)
        }, 5)
    }

    update() {
        if (this.label)
            this.label.string = "assets : " + cc.assetManager.assets.count.toString()
    }
}
