const { ccclass, property } = cc._decorator;

@ccclass
export default class Log extends cc.Component {

    @property(cc.Label)
    label: cc.Label = null

    update() {
        if (this.label)
            this.label.string = "assets : " + cc.assetManager.assets.count.toString()
    }
}
