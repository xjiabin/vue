/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 把模板转换成 ast 抽象语法树
  // 抽象语法树，用来以树形的形式描述代码结构
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    // 优化抽象语法树
    optimize(ast, options)
  }
  // 把抽象语法树生成 `字符串形式` 的 js 代码
  const code = generate(ast, options)
  return {
    ast,
    // 渲染函数，此时的 render 是字符串形式的，并不是我们最终调用的那个 render 函数
    // 最终还要通过 compileToFunctions 转换成函数的形式（createFunction）
    render: code.render,
    // 静态渲染函数：生成静态 VNode 树
    staticRenderFns: code.staticRenderFns
  }
})
