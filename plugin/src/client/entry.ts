/**
 * The module-loader entry the Harness Web page evaluates.
 *
 * The page hands the factory its own `require`, which is the only way to reach
 * React; installing it here keeps every component reading the same instance.
 */
import { installReact } from './runtime.ts'
import type { ModuleRequire } from './runtime.ts'
import { createClient } from './client.ts'

declare const window: {
  __ModuleLoader__: {
    load(spec: {
      id: string
      factory(require: ModuleRequire): unknown
    }): void
  }
}

window.__ModuleLoader__.load({
  id: '@local/personal-hub',
  factory(require: ModuleRequire) {
    installReact(require)
    return createClient()
  },
})
