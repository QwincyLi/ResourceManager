const { ccclass, property } = cc._decorator;

/**
 * 需要绑定资源的用户自定义脚本基类
 * 
 * 脚本上有绑定资源得自定义组件都应该继承这个类
 * 通过遍历并检查所有属性实现(所以会比较缓慢,有一定的性能负担)，可以自定义实现它得子类 采用更严苛得检查规则减少遍历消耗
 */
@ccclass
export default class SlowlyRef extends cc.Component {

}
