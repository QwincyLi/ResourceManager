import Test from "./Test";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TestPrefab extends Test {

    loadString: string = "加载预制"
    releaseString: string = "释放预制"

    onTest() {
        super.onTest()
        const Resource = this.resource
        if (this.testFlag) {

            Resource.loadPrefab("bundles", "prefabs/Star", (err, prefab) => {
                if (!err) {
                    let node = Resource.instantiateNode(prefab)
                    this.testNode.addChild(node)
                }
            })
        } else {
            Resource.destroyAllChildrenNode(this.testNode)
        }
    }


}
