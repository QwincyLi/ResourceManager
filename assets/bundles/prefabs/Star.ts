import Resource from "../../scripts/Resource";

const { ccclass, property } = cc._decorator;

@ccclass
export default class Star extends cc.Component {

    @property(cc.Sprite)
    titleBg: cc.Sprite = null

    onReplaceSpriteFrame() {
        let resource = cc.director.getScene().getComponentInChildren(Resource)
        resource.setSpriteFrame(this.titleBg, null)
    }
}
