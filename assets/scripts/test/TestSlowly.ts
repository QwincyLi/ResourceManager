import Test from "./Test";

const { ccclass, property } = cc._decorator;

@ccclass
export default class TestSlowly extends Test {
    loadString: string = "加载自定义"
    releaseString: string = "释放自定义"
    onTest() {
        super.onTest()
        const Resource = this.resource
        if (this.testFlag) {
            //如果只调用加载接口而不使用资源的话则该资源会一直存在不会被释放掉,这是由引擎的机制所决定的
            //若要释放则需要手动调用释放接口
            Resource.loadPrefab("bundles", "prefabs/Slowly", (err, prefab) => {
                if (!err) {
                    let node = Resource.instantiateNode(prefab)
                    this.testNode.addChild(node)
                }
            })
        } else {
            Resource.loadPrefab("bundles", "prefabs/Slowly", (err, prefab) => { Resource.destroyAllChildrenNode(this.testNode) });
        }
    }
}
