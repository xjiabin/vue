/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools,
  inBrowser,
  isIE
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

// Async edge case #6566 requires saving the timestamp when event listeners are
// attached. However, calling performance.now() has a perf overhead especially
// if the page has thousands of event listeners. Instead, we take a timestamp
// every time the scheduler flushes and use that for all event listeners
// attached during that flush.
export let currentFlushTimestamp = 0

// Async edge case fix requires storing an event listener's attach timestamp.
let getNow: () => number = Date.now

// Determine what event timestamp the browser is using. Annoyingly, the
// timestamp can either be hi-res (relative to page load) or low-res
// (relative to UNIX epoch), so in order to compare time we have to use the
// same timestamp type when saving the flush timestamp.
// All IE versions use low-res event timestamps, and have problematic clock
// implementations (#9632)
if (inBrowser && !isIE) {
  const performance = window.performance
  if (
    performance &&
    typeof performance.now === 'function' &&
    getNow() > document.createEvent('Event').timeStamp
  ) {
    // if the event timestamp, although evaluated AFTER the Date.now(), is
    // smaller than it, it means the event is using a hi-res timestamp,
    // and we need to use the hi-res version for event listener timestamps as
    // well.
    getNow = () => performance.now()
  }
}

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue () {
  currentFlushTimestamp = getNow()
  // 修改记录, 标识当前 watcher queue 队列正在执行
  flushing = true
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  //    组件更新顺序是从父组件到子组件 (因为父组件总是在子组件之前创建)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  //    组件的用户 watcher 要比渲染 watcher 先运行 , 因为: 
  //    用户 watcher (initState() 函数中创建) 是在
  //    渲染 watcher (mountComponent() 函数中创建) 之前创建的
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  //    如果一个组件, 在父组件执行之前就被销毁了 , 这个 watcher 应该被跳过
  // id 从小到大排序
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  // 不要缓存 length, 因为当 watcher 在执行的过程中, 还有可能有其他的 watcher 被添加进来
  // 不把 queue.length 放在第一个的原因
  for (index = 0; index < queue.length; index++) {
    // 取出当前需要执行的 watcher
    watcher = queue[index]
    // 判断是否有 before 函数
    // before 函数是在创建渲染 watcher 的时候才有的
    if (watcher.before) {
      // before 用于调用 beforeUpdate 钩子函数
      watcher.before()
    }
    // 获取 watcher 的 id, 并将 has[id] 设置为 null, 标识这个 watcher 已经被处理过了
    id = watcher.id
    // 把当前 has[id] 设置为 null 的目的: 在数据发生变化时, 这个 watcher 还可以继续被执行
    has[id] = null
    // 执行 watcher 的 run 方法
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()

  resetSchedulerState()

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 * 把当前 watcher 放到队列中
 */
export function queueWatcher (watcher: Watcher) {
  // 获取当前 watcher 的 id
  const id = watcher.id
  // 只对没有处理的 watcher 进行处理
  // 避免重复处理
  if (has[id] == null) {
    // 标记当前 watcher 已经在处理
    has[id] = true
    // watcher queue 没有被处理
    if (!flushing) {
      // 如果没有正在处理的 watcher, 把当前 watcher 添加到 watcher queue 队列中
      queue.push(watcher)
    }
    // watcher queue 队列正在被处理
    else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      // 获取队列长度
      let i = queue.length - 1
      // index: 当前队列中处理到第几个元素
      // 如果 i > index: 说明队列没有被处理完, 
      // queue[i].id: 从后往前取出每个 watcher 对象的 id
      // 判断 id 是否 大于当前 watcher 的 id
      // 如果大于当前 watcher 的 id, 表示这个位置就是我们要把当前 watcher 插入的位置
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      // ---- watcher queue 队列: [1, 2, 3, 4]
      // ---- 当前需要执行的 watcher 对象的 id, watcher.id: 2
      // ---- 当前正在执行的 watcher queue 下标 index: 2
      // 4 > 2 && 4 > 2  => i-- === 3
      // 3 > 2 && 3 > 2  => i-- === 2
      // 2 > 2 && 2 > 2  => 不成立 i === 2
      // 在 2 后面插入当前需要执行的 watcher 对象 => [1, 2, 2, 3, 4]
      // 如果当前需要执行的 watcher 对象的 id 为 5
      // 4 > 2 && 4 > 5 // 不成立 , i 不变, 为 queue 队列长度 4
      // 在队列的最后插入 当前需要执行的 watcher 对象 => [1,2,3,4,5]


      // 将当前 watcher 添加到 queue 中, 正在处理的 watcher 的下一位.
      queue.splice(i + 1, 0, watcher)
    }
    // queue the flush
    // 当前队列是否正在执行
    if (!waiting) {
      // 当前队列没有在执行,
      // 记录队列正在执行
      waiting = true

      if (process.env.NODE_ENV !== 'production' && !config.async) {
        flushSchedulerQueue()
        return
      }
      nextTick(flushSchedulerQueue)
    }
  }
}
