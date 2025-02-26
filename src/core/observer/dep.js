/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  // 静态属性，保存 Watcher 对象
  static target: ?Watcher;
  // dep 实例的 id，也就是当前 dep 实例的唯一标识
  id: number;
  // 订阅者数组：dep 实例对应的 watcher 对象
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }
  // 添加新的观察者（订阅者） watcher 对象
  addSub (sub: Watcher) {
    // 把 watcher 添加到 subs 数组中
    this.subs.push(sub)
  }
  // 移除所有观察者（订阅者）
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }
  // 建立 观察对象 和 watcher 的依赖
  depend () {
    if (Dep.target) {
      // target 就是 watcher 对象
      // 如果 target 存在，把 dep 对象添加到 watcher 的依赖中
      Dep.target.addDep(this)
    }
  }
  // 派发更新通知
  notify () {
    // stabilize the subscriber list first
    // 克隆 subs 数组
    // 目的是为了防止在后续执行 update() 方法时, 
    // this.subs 数组中有新的 watcher 对象被添加进来
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      // 排序
      subs.sort((a, b) => a.id - b.id)
    }
    // 遍历数组, 调用每个订阅者 watcher 的 update 方法, 更新视图
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// Dep.target 用来存放目前正在使用的 watcher
// 全局唯一，并且只有一次也只能有一个 watcher 被使用
Dep.target = null
const targetStack = []
// 入栈并将当前 watcher 赋值给 Dep.target
// 父子组件嵌套的时候, 先把父组件对应的 watcher 入栈
// 再去处理子组件的 watcher
// 子组件的 watcher 处理完毕之后, 再把父组件对应的 watcher 出栈, 继续操作
export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  // 出栈操作
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
