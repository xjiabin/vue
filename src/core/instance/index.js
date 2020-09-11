import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// 使用 function 而不用 class 的原因：
// 为方便后续给 Vue 实例混入成员
function Vue (options) {
  // 必须使用 new 的方式声明
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 调用 _init 方法
  this._init(options)
}

// 注册 vm 的 _init 方法，初始化 vm
initMixin(Vue)
// 注册 vm 的 $data, $props, $set, $delete, $watch
stateMixin(Vue)
// 初始化时机相关的方法
// $on, $once, $off, $emit
eventsMixin(Vue)
// 初始化生命周期相关的混入方法
// _update, $forceUpdate, $destroy
lifecycleMixin(Vue)
// 混入 render
// $nextTick, _render
renderMixin(Vue)

export default Vue
