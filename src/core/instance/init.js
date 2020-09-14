/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  // 给 Vue 实例增加 _init()  方法
  // 合并 options / 初始化操作
  Vue.prototype._init = function (options?: Object) {
    // 记录当前 Vue 实例
    const vm: Component = this
    // a uid
    // 唯一标识符
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // 设置 _isVue，目的是：做数据响应式处理时，Vue 实例不需要被 observe
    vm._isVue = true
    // merge options
    // 合并 options
    // 把用户传入的 options 跟 Vue 的构造函数中的 options 合并
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    // 初始化 vm 的生命周期相关变量
    // $parent、$root、$children、$refs
    initLifecycle(vm)
    // 初始化 vm 的事件，父组件绑定在当前组件上的事件
    initEvents(vm)
    // 初始化 vm 的 render 编译方法
    // $slot 、$scopedSlots 、_c 、$createElement 、$attrs 、$listeners'
    // _c(). 是在 [没有传入 render 函数, 将 template 编译成 render 函数时], render 函数内部调用的
    // $craeteElement(). 就是 render(h){}  中的 h 参数
    initRender(vm)
    // 调用 beforeCreate 钩子函数
    callHook(vm, 'beforeCreate')
    // 初始化 inject , 把 inject 的成员注入到当前 vm 上
    // 与下边的 initProvide 是一对, 用于实现组件之间的依赖注入
    initInjections(vm) // resolve injections before data/props
    // 初始化 vm 的 _props, methods, _data, computed, watch
    initState(vm)
    // 初始化 provide, (需要在加载完 data/props 之后才初始化 provide)
    initProvide(vm) // resolve provide after data/props
    // 调用 created 钩子函数
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
