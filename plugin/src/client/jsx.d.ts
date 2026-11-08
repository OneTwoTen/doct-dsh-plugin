/**
 * The JSX namespace this bundle compiles against.
 *
 * React's own types are not installed: the runtime comes from the page's module
 * table. Intrinsic elements are therefore checked loosely, while component
 * props stay typed at each component's own signature.
 */
import type { ReactElementLike } from './runtime.ts'

declare global {
  namespace JSX {
    type Element = ReactElementLike
    interface ElementChildrenAttribute {
      children: unknown
    }
    interface IntrinsicElements {
      [tagName: string]: Record<string, unknown>
    }
  }
}

export {}
