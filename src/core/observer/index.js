/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

// 获取 arrayMethods 所有自身属性的属性名
// 其实就是获取 push pop 等修补过的方法
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  // 观测对象
  value: any;
  // 依赖对象
  dep: Dep;
  // 实例计数器
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    // 被观察的对象
    this.value = value
    // 依赖，每一个属性都有一个 dep 对象
    this.dep = new Dep()
    // 初始化计数器为 0
    this.vmCount = 0
    // 将 Observer 实例挂载到观察对象 value 的 __ob__ 属性上
    def(value, '__ob__', this)
    // 数组的响应式处理
    if (Array.isArray(value)) {
      // 判断是否有 __proto__ 属性 (浏览器兼容性)
      // protoAugment, copyAugment 的作用是: 重新修补 会改变原数组的 数组方法 (push, pop ...)
      if (hasProto) {
        // 改变当前数组的原型属性
        // arrayMethods 中修补了 push pop 等方法,
        // arrayMethods 的原型指向了数组构造函数的原型
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 为数组中每个对象创建一个 observer 实例
      this.observeArray(value)
    } else {
      // 遍历对象的每一个属性，将其转换为 getter/setter
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    // 获取 obj 所有属性
    const keys = Object.keys(obj)
    // 遍历属性，设置响应式数据
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    // 遍历成员, 为每一个数组元素(如果这个元素是对象的话)转换成响应式的对象
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  // 改变当前数组的原型属性
  // 让数组的原型属性指向 arrayMethods
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    // 获取属性名: push pop 等
    const key = keys[i]
    // 给当前数组对象重新定义 push pop 等方法
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * -----------------------------
 * 尝试为 value 创建一个 observer 实例
 * 如果成功创建了，会返回这个新创建的 observer 实例
 * 或者返回已经存在的 observer 实例
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 如果 value 不是对象，或者 value 是虚拟 DOM 。 返回
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 如果有 __ob__ (observe 对象) 属性，并且 __ob__ 属性是 Observer 的实例
  // 取出 __ob__ 赋值给 ob，并返回 ob
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  }
  // 如果没有 __ob__ 属性，
  else if (
    shouldObserve &&
    !isServerRendering() &&
    // 如果是数组，或者是纯粹的 JavaScript 对象
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    // 如果 value 是 Vue 实例，不需要进行响应式处理
    !value._isVue
  ) {
    // 创建一个响应式对象
    ob = new Observer(value)
  }
  // 对根数据，计数
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  /**
   * 调试:
   *  obj 为 data: { arr: [1, 2, 3] }
   *  key 为 arr
   */
  // 创建依赖对象实例，为当前属性收集依赖（收集观察当前属性的 watcher）
  // 也就是为当前的 arr 属性收集依赖
  const dep = new Dep()
  // 获取 obj 对象的属性描述符
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    // 当前属性不可配置，return
    return
  }

  // cater for pre-defined getter/setters
  // 使用预定义的 getter/setters
  const getter = property && property.get
  const setter = property && property.set
  // 如果只传入了 2 个参数，赋值 val
  // 设: val = arr / [1, 2, 3]
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }
  // 判断是否需要深度观察子对象，(当前属性的值是对象)
  // 并将子对象转化为 getter/setter，然后返回子对象
  // => childOb [1, 2, 3, __proto__]
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 获取属性值 value
      // 如果预定义的 getter 存在，则 value 等于调用 getter 返回的值
      // 否则直接赋予属性值
      const value = getter ? getter.call(obj) : val
      // 如果存在当前依赖目标(即 watcher 对象)，建立依赖
      // watcher 对象的 get 方法中，会给 Dep.target 赋值
      // watcher 对象是在 lifecycle.js 中的 mountComponent() 方法中实例化。
      if (Dep.target) {
        // 为当前属性收集依赖(arr 属性), 当属性发生变化时, 会通知 watcher
        // 比如, 重新给 arr 赋值的时候, 会通知 watcher
        // 先将 dep 对象添加到 watcher 对象的集合（newDeps）中
        // 然后将 watcher 对象添加到 dep 的 subs 数组中
        dep.depend()
        // 如果子观察目标存在，建立子对象的依赖关系
        if (childOb) {
          // 为当前 arr 数组对象收集依赖
          // 也就是当 arr 数组中元素发生变化的时候, 通知 watcher
          childOb.dep.depend()
          // 如果属性值是数组，收集数组对象依赖
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      // 返回属性值
      return value
    },
    set: function reactiveSetter (newVal) {
      // 获取属性值 value
      // 如果预定义的 getter 存在，则 value 等于调用 getter 返回的值
      // 否则直接赋予属性值
      const value = getter ? getter.call(obj) : val
      // 如果新值与旧值相等，或者新旧值为 NaN 的话，return
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // 如果没有 setter，则为只读属性，直接返回
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      // 如果预定义的 setter 存在则调用, 并传入 newVal
      if (setter) {
        setter.call(obj, newVal)
      } else {
        // 直接更新 val
        val = newVal
      }
      // 如果 newVal 是对象，进行 observe 处理，并返回 子的 observe 对象
      childOb = !shallow && observe(newVal)
      // 派发更新（发布更改通知）
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  // 遍历数组
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    // 如果数组中的元素是对象, 对这个元素(对象) 收集依赖
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
