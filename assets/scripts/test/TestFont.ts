import Test from "./Test";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TestFont extends Test {

    loadString: string = "加载字体"
    releaseString: string = "释放字体"

    onTest() {
        super.onTest()
        const Resource = this.resource
        if (this.testFlag) {
            Resource.loadPrefab("bundles", "prefabs/Font", (err, prefab) => {
                if (!err) {
                    let node = Resource.instantiateNode(prefab)
                    this.testNode.addChild(node)
                }
            })
        } else {
            for (let i = 0; i < this.testNode.childrenCount; i++) {
                let node = this.testNode.children[i]
                Resource.destroyAllChildrenNode(node)
            }
            Resource.destroyAllChildrenNode(this.testNode)
        }
    }
}

