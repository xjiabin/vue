/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach(type => {
    // Vue.component('form', {})
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      // 如果没有定义该参数。
      // 说明是获取这个 组件/指令/过滤器
      // this.options.components
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        // 如果 定义 方式是对象。
        // Vue.component('comp', { ... })
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id
          // 把组件配置选项转换为组件的 构造函数
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // 全局注册，存储资源并赋值
        // this.options['components']['comp'] = definition
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
