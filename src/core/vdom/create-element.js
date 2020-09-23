/* @flow */

import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { traverse } from '../observer/traverse'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject,
  isPrimitive,
  resolveAsset
} from '../util/index'

import {
  normalizeChildren,
  simpleNormalizeChildren
} from './helpers/index'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
export function createElement (
  context: Component,
  tag: any,
  data: any,
  children: any,
  normalizationType: any,
  alwaysNormalize: boolean
): VNode | Array<VNode> {
  // 如果第三个参数 data 是数组，或者是原始值（string，number，symbol，boolean）
  // 则 data 就是 children，类似于函数重载
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children
    children = data
    data = undefined
  }
  // 判断是否是首次渲染
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  return _createElement(context, tag, data, children, normalizationType)
}

export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  // 如果 data 有定义，并且 data 是一个响应式对象
  if (isDef(data) && isDef((data: any).__ob__)) {
    // 开发环境下警告，避免将响应式对象用作 vnode 的 data
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      context
    )
    // 返回一个空的 VNode 节点（注释节点）
    return createEmptyVNode()
  }
  // <component v-bind:is="currentTabComponent"></component>
  // object syntax in v-bind
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }
  // 如果 tag 为 false，说明 component 的 :is 属性的 value 设置为 false
  // 返回空的 VNode 节点
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }
  // warn against non-primitive key
  if (process.env.NODE_ENV !== 'production' &&
    // data 有定义，并且 data 的 key 存在，data 的 key 属性不是原始值
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    // 报警告：data 的 key 避免使用非原始值
    // 应该使用 string/number 类型的值作为 key
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }
  // TODO: 处理作用域插槽
  // support single function children as default scoped slot
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    data = data || {}
    data.scopedSlots = { default: children[0] }
    children.length = 0
  }
  // 处理 children
  if (normalizationType === ALWAYS_NORMALIZE) {
    // 处理用户传入的 render 函数
    // 如果 children 是原始值的话，转化为 VNode，然后放在数组中
    // 如果 children 是数组的话，并且 children 的子元素还是数组，将数组拍平（将多维数组转化为一维数组）
    // 如果连续两个节点都是字符串的话，会合并文本节点
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    // 把二维数组转化为一维数组
    // 如果 children 中有函数组件的话，函数组件会返回数组形式
    // 这时候 children 就是一个二维数组，只需要把二维数组转换为一维数组
    children = simpleNormalizeChildren(children)
  }
  // 创建 VNode 对象
  let vnode, ns
  // 如果 tag 是字符串类型
  if (typeof tag === 'string') {
    let Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    // 如果 tag 是 html 的保留标签
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      if (process.env.NODE_ENV !== 'production' && isDef(data) && isDef(data.nativeOn)) {
        warn(
          `The .native modifier for v-on is only valid on components but it was used on <${tag}>.`,
          context
        )
      }
      // 根据 tag 创建 VNode 对象
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
    } else if (
      // 如果 tag 是 自定义组件，并且 data 选项未定义
      (!data || !data.pre) &&
      // 根据 tag (自定义组件名称)查找自定义组件构造函数的声明
      // 在 components 对象中找
      isDef(Ctor = resolveAsset(context.$options, 'components', tag))
    ) {
      // 根据 Ctor 创建组件的 VNode 对象
      // component
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // 自定义标签
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
    // tag 是组件
    // direct component options / constructor
    vnode = createComponent(tag, data, context, children)
  }
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) applyNS(vnode, ns)
    if (isDef(data)) registerDeepBindings(data)
    return vnode
  } else {
    return createEmptyVNode()
  }
}

function applyNS (vnode, ns, force) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i]
      if (isDef(child.tag) && (
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force)
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}
