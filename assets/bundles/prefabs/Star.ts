import Global from "../../scripts/Global";

const { ccclass, property } = cc._decorator;

@ccclass
export default class Star extends cc.Component {

    @property(cc.Sprite)
    titleBg: cc.Sprite = null

    onReplaceSpriteFrame() {

        /**
         * 背景被替换了但是资源没被释放呢？
         * 
         * 因为是预制实例化出来的 预制还对其存在静态资源依赖所以未被释放掉
         */
        Global.Resource.setSpriteFrame(this.titleBg, null)
    }
}
