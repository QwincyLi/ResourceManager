import Resource from "../Resource";
import SlowlyRef from "../SlowlyRef";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TestSlolyComponent extends SlowlyRef {

    @property(dragonBones.DragonBonesAsset)
    dragonBonesAsset: dragonBones.DragonBonesAsset = null
    @property(dragonBones.DragonBonesAtlasAsset)
    dragonBonesAtlas: dragonBones.DragonBonesAtlasAsset = null

    onShowDragBones() {
        let name = "dragbones"
        if (!this.node.getChildByName(name)) {
            let resource = cc.director.getScene().getComponentInChildren(Resource)
            let node = new cc.Node(name)
            let db = node.addComponent(dragonBones.ArmatureDisplay)
            db.dragonAsset = this.dragonBonesAsset
            this.node.addChild(node)
            let visibleSize = cc.view.getVisibleSize()
            node.scale = 0.5
            node.setPosition(this.node.convertToNodeSpaceAR(cc.v2(visibleSize.width / 2, visibleSize.height / 2)))
            resource.setDragonBones(db, this.dragonBonesAsset, this.dragonBonesAtlas)
            db.armatureName = 'armatureName';
            db.playAnimation('stand', 0);
        }
    }
}
