/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    // 获取所有已经 安装过的插件
    // this：谁调用，this 就指向谁，
    // 通过 Vue.use() 调用，所以此处的 this 就指向 Vue 构造函数
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    // 如果已经注册过该插件
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // Vue.use(VueRouter, {...})
    // additional parameters
    // 把参数列表中的第一个参数（plugin）去掉，然后转成数组
    const args = toArray(arguments, 1)
    // 把 this (Vue 构造函数)插入到第一个元素的位置
    args.unshift(this)
    // 如果是对象的话，对象必须要包含 install 方法
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      // 如果是函数，则直接调用这个函数
      plugin.apply(null, args)
    }
    // 保存这个已经注册的插件
    installedPlugins.push(plugin)
    return this
  }
}
