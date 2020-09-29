/* @flow */

import { makeMap, isBuiltInTag, cached, no } from 'shared/util'

let isStaticKey
let isPlatformReservedTag

const genStaticKeysCached = cached(genStaticKeys)

/**
 * Goal of the optimizer: walk the generated template AST tree
 * and detect sub-trees that are purely static, i.e. parts of
 * the DOM that never needs to change.
 *
 * Once we detect these sub-trees, we can:
 *
 * 1. Hoist them into constants, so that we no longer need to
 *    create fresh nodes for them on each re-render;
 * 2. Completely skip them in the patching process.
 */
export function optimize (root: ?ASTElement, options: CompilerOptions) {
  if (!root) return
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  isPlatformReservedTag = options.isReservedTag || no
  // first pass: mark all non-static nodes.
  // 标记静态节点
  markStatic(root)
  // second pass: mark static roots.
  // 标记静态根节点
  markStaticRoots(root, false)
}

function genStaticKeys (keys: string): Function {
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
    (keys ? ',' + keys : '')
  )
}

function markStatic (node: ASTNode) {
  // 判断当前节点是否是静态的
  node.static = isStatic(node)
  // 是元素节点，需要处理子节点
  if (node.type === 1) {
    // do not make component slot content static. this avoids
    // 1. components not able to mutate slot nodes
    // 2. static slot content fails for hot-reloading
    // 不要将组件插槽的内容设为静态。 这样可以避免
    // 1.无法更改插槽节点的组件
    // 2.静态插槽内容无法进行热重新加载
    // 如果不是保留标签，那就认为是组件
    // 如果是组件的话，不会把组件的 slot 标签标记为静态节点
    // 如果把 slot 标签标记为静态节点的话，它就无法改变
    if (
      !isPlatformReservedTag(node.tag) && // 是组件（不是保留标签）
      node.tag !== 'slot' && // 不是 slot
      node.attrsMap['inline-template'] == null // 没有 inline-template
    ) {
      return
    }
    // 遍历 ast 对象的所有子节点
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      // 标记静态节点
      markStatic(child)
      // 如果有一个子节点不是 static，那么当前的节点就不是 static
      if (!child.static) {
        node.static = false
      }
    }
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        const block = node.ifConditions[i].block
        markStatic(block)
        if (!block.static) {
          node.static = false
        }
      }
    }
  }
}

function markStaticRoots (node: ASTNode, isInFor: boolean) {
  // 当前节点是否是元素
  if (node.type === 1) {
    // 是否静态的，或者只渲染一次
    if (node.static || node.once) {
      // 标记该节点在 for 循环中是否是静态的
      node.staticInFor = isInFor
    }
    // For a node to qualify as a static root, it should have children that
    // are not just static text. Otherwise the cost of hoisting out will
    // outweigh the benefits and it's better off to just always render it fresh.
    // 如果一个元素内只有文本节点，此时这个元素不是静态根节点
    // Vue 认为这种优化回带来负面的影响
    // 静态根节点：
    // 1. 当前节点必须是静态的
    // 2. 当前节点必须要有子节点
    // 3. 不能只有文本节点
    if (node.static && node.children.length && !(
      node.children.length === 1 &&
      node.children[0].type === 3
    )) {
      node.staticRoot = true
      return
    } else {
      node.staticRoot = false
    }
    // 检测当前节点的子节点中是否有静态根节点
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}

function isStatic (node: ASTNode): boolean {
  // 表达式
  if (node.type === 2) { // expression
    return false
  }
  // 文本
  if (node.type === 3) { // text
    return true
  }
  return !!(node.pre || (
    !node.hasBindings && // no dynamic bindings 不是动态绑定
    !node.if && !node.for && // not v-if or v-for or v-else
    !isBuiltInTag(node.tag) && // not a built-in 不能是内置标签
    isPlatformReservedTag(node.tag) && // not a component 不能是组件
    !isDirectChildOfTemplateFor(node) && // 不能是 v-for 下的直接子节点
    Object.keys(node).every(isStaticKey)
  ))
}

function isDirectChildOfTemplateFor (node: ASTElement): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}
