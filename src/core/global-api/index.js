/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      // 不能替换 Vue.config，可以在 Vue.config 里面挂载属性
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 给 Vue 注册 config 属性
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  // 静态方法 set/delete/nextTick
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  // 将一个对象可响应
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }

  // 初始化 Vue.options 对象
  // components directives filters
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    // 给 Vue.options 挂载属性：components directives filters，初始化为空对象
    // 这 3 个选项用来存储全局的 组件、指令、过滤器
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  // 记录 Vue 构造函数
  Vue.options._base = Vue

  // 注册 keep-alive 组件
  extend(Vue.options.components, builtInComponents)

  // 注册 Vue.use()，用来注册插件
  initUse(Vue)
  // 注册 Vue.mixin()，混入
  initMixin(Vue)
  // 注册 Vue.extend()，基于传入的 options 返回一个组件的构造函数
  initExtend(Vue)
  // 注册 Vue.directive()、Vue.component()、Vue.filter()
  initAssetRegisters(Vue)
}
