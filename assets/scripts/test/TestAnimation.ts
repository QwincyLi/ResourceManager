import Test from "./Test";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TestAnimation extends Test {

    animationPrefab: cc.Prefab = null
    animationClip: cc.AnimationClip = null

    loadString: string = "加载动画"
    releaseString: string = "释放动画"

    onTest() {
        super.onTest()
        const Resource = this.resource
        if (this.testFlag) {
            Resource.loadPrefab("bundles", "prefabs/tips/Tips", (err, prefab) => {
                if (!err) {
                    this.animationPrefab = prefab
                    this.onTryPlayAnimation()
                }
            })
            Resource.loadAnimationClip("bundles", "prefabs/tips/up", (err, clip) => {
                if (!err) {
                    this.animationClip = clip
                    this.onTryPlayAnimation()
                }
            })
        } else {
            Resource.destroyAllChildrenNode(this.testNode)
            this.animationPrefab = null
            this.animationPrefab = null
        }
    }

    onTryPlayAnimation() {
        const Resource = this.resource
        if (this.animationPrefab && this.animationPrefab) {
            let node = Resource.instantiateNode(this.animationPrefab)
            this.testNode.addChild(node)
            let animation = node.getComponent(cc.Animation)
            animation.addClip(this.animationClip)
            animation.play("up")
        }
    }
}
