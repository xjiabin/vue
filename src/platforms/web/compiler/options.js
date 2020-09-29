/* @flow */

import {
  isPreTag,
  mustUseProp,
  isReservedTag,
  getTagNamespace
} from '../util/index'

import modules from './modules/index'
import directives from './directives/index'
import { genStaticKeys } from 'shared/util'
import { isUnaryTag, canBeLeftOpenTag } from './util'

export const baseOptions: CompilerOptions = {
  expectHTML: true, // 期望 HTML 内容
  modules,          // 模块
  directives,       // 指令
  isPreTag,         // 是否是 pre 标签
  isUnaryTag,       // 一元标签(自闭合标签) <input />
  mustUseProp,
  canBeLeftOpenTag,
  isReservedTag,    // 是否是保留标签
  getTagNamespace,
  staticKeys: genStaticKeys(modules)
}
