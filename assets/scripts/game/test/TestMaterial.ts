import Global from "../../Global";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TestMaterial extends cc.Component {

    materialPrefab: cc.Prefab = null
    materialAsset: cc.Material = null
    materialNode: cc.Node = null
    testFlag: boolean = false

    loadString: string = "加载材质"
    releaseString: string = "释放材质"

    onTest() {
        this.testFlag = !this.testFlag
        let label = this.node.getComponentInChildren(cc.Label)
        label.string = this.testFlag ? this.releaseString : this.loadString

        const Resource = Global.Resource
        if (this.testFlag) {
            //金币 spriteframe 1个 texture 1个 测试预制 1个 自定义材质 1个 自定义effect 1个 共增加五个资源(编辑器模式下)
            Resource.loadPrefab("bundles", "prefabs/Material", (err, prefab) => {
                if (!err) {
                    this.materialPrefab = prefab
                    this.materialNode = Resource.instantiateNode(this.materialPrefab)
                    Global.Test.node.parent.addChild(this.materialNode)

                    let clickEventHandler = new cc.Component.EventHandler();
                    clickEventHandler.target = this.node;
                    clickEventHandler.component = "TestMaterial";
                    clickEventHandler.handler = "onChangeMaterial";
                    clickEventHandler.customEventData = null;

                    let button = this.onUpdateButton()
                    button.clickEvents.push(clickEventHandler);
                    this.initMaterial()
                }
            })
            Resource.loadMaterial("bundles", "material/red_material", (err, material) => {
                if (!err) {
                    this.materialAsset = material
                    //this.materialAsset.addRef() //想保持长期持有的话 需要添加引用计数
                    this.onUpdateButton()
                    this.initMaterial()
                }
            })
        } else {
            Resource.destroyNode(this.materialNode)
            this.materialNode = null
            //没有替换的话则其还在被使用 需要进行释放
            if (this.materialAsset && cc.isValid(this.materialAsset)) {
                this.materialAsset.decRef()
            }
            this.materialAsset = null
        }
    }

    onUpdateButton() {
        if (this.materialNode) {
            let button = this.materialNode.getComponentInChildren(cc.Button);
            if (this.materialPrefab && this.materialAsset) {
                button.interactable = true
            } else {
                button.interactable = false
            }
            return button
        }
        return null
    }

    initMaterial() {
        const Resource = Global.Resource
        if (this.materialNode && this.materialAsset) {
            let builtin = this.materialNode.getChildByName("builtin").getComponent(cc.Sprite)
            let custom = this.materialNode.getChildByName("custom").getComponent(cc.Sprite)

            let builtinMaterial = cc.Material.getBuiltinMaterial('2d-gray-sprite');
            let customMaterial = this.materialAsset
            Resource.setMaterial(builtin, 0, builtinMaterial)
            Resource.setMaterial(custom, 0, customMaterial) //使用动态加载的材质
        }
    }

    onChangeMaterial() {
        const Resource = Global.Resource
        if (this.materialNode && this.materialAsset) {
            let builtin = this.materialNode.getChildByName("builtin").getComponent(cc.Sprite)
            let custom = this.materialNode.getChildByName("custom").getComponent(cc.Sprite)

            let builtinMaterial = cc.Material.getBuiltinMaterial('2d-sprite');
            let customMaterial = builtinMaterial
            Resource.setMaterial(builtin, 0, builtinMaterial)
            Resource.setMaterial(custom, 0, customMaterial) //动态加载的材质被替换

            /**
             * 注:
             * 这个时候动态加载的material引用计数已被归0了 等待延迟释放
             * 如果继续使用this.materialAsset的话会导致异常，如果想保持持有 需要在加载完成后 this.materialAsset.addRef() 
             * 然后在onDestry 中调用 this.materialAsset.decRef(); this.materialAsset = null
             */

            let button = this.materialNode.getComponentInChildren(cc.Button);
            button && (button.interactable = false)
        }
    }

    // onDestroy() {
    //     if (this.materialAsset && cc.isValid(this.materialAsset, true)) {
    //         this.materialAsset.decRef()
    //         this.materialAsset = null
    //     }
    // }
}
