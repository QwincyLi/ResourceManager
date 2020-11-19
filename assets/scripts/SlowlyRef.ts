const { ccclass } = cc._decorator;

/**
 * 需要绑定资源的用户自定义脚本基类
 * 
 * 脚本上有绑定资源得自定义组件都应该继承这个类
 * 通过遍历并检查所有属性实现(所以会比较缓慢,有一定的性能负担)，可以根据项目自定义实现类似脚本 并修改拓展Resource脚本中的autoCustomComponentAsset方法 采用更严苛得检查规则减少遍历消耗
 * 
 * (注: 如果不需要挂载资源,请勿继承,会增加额外开销)
 */
@ccclass
export default class SlowlyRef extends cc.Component {

}
