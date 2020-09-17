/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
// 使用数组构造函数的原型 创建一个新的对象
export const arrayMethods = Object.create(arrayProto)
// 操作数组元素的方法 (都是会修改原数组的方法)
// 当数组发生变化时, 需要调用 dep 的 notify 方法, 派发更新通知. 更新视图
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 * 拦截数组的方法, 并派发数据更新的通知
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  // 保存数组的原始方法
  const original = arrayProto[method]
  // 调用 Object.defineProperty() 方法, 重新定义 会修改数组的方法
  def(arrayMethods, method, function mutator (...args) {
    // 执行数组的原始方法, 获取其返回值
    const result = original.apply(this, args)
    // 获取数组的 ob 对象
    const ob = this.__ob__
    // 用于存储数组中新增的元素
    let inserted
    // 可能会新增数组元素的方法
    switch (method) {
      case 'push':
      case 'unshift':
        // 传入的参数就是新增的元素
        inserted = args
        break
      case 'splice':
        // splice 的 第三个参数就是新增的元素
        inserted = args.slice(2)
        break
    }
    // 有新增的元素, 遍历新增的数组,
    // 将新增的数组元素(如果数组元素是对象的话)设置为响应式数据
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 调用了修改数组的方法, 需要派发通知
    ob.dep.notify()
    return result
  })
})
