/* @flow */

import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'

export function initProvide (vm: Component) {
  // 获取 provide
  const provide = vm.$options.provide
  // 如果定义了 provide
  if (provide) {
    // vm._provided 这个属性在 initInjections 中会使用到, 用于判断 inject 对象的属性是否在于该对象中
    vm._provided = typeof provide === 'function'
      ? provide.call(vm) // 如果是函数, 调用 provide, 并将 函数返回值保存到 _provided 中
      : provide // 如果是对象, 直接将对象保存到 _provided
  }
}

export function initInjections (vm: Component) {
  // 提取 vm 中存在的 inject 对象, 并且这个属性中存在于 vm._provide
  const result = resolveInject(vm.$options.inject, vm)
  if (result) {
    toggleObserving(false)
    // 遍历对象
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        // 将属性注入到 vm 上, 并设置成响应式
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })
    toggleObserving(true)
  }
}

export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)
    // 获取 inject 中所有属性
    const keys = hasSymbol
      ? Reflect.ownKeys(inject)
      : Object.keys(inject)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // #6574 in case the inject object is observed...
      if (key === '__ob__') continue
      const provideKey = inject[key].from
      let source = vm
      while (source) {
        // 判断 inject 的中的属性是否存在于 vm._provided 中
        if (source._provided && hasOwn(source._provided, provideKey)) {
          // 如果存在 , 保存到 result 中
          result[key] = source._provided[provideKey]
          break
        }
        source = source.$parent
      }
      if (!source) {
        if ('default' in inject[key]) {
          const provideDefault = inject[key].default
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result
  }
}
