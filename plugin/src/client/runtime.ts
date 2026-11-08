/**
 * The browser runtime this bundle borrows from the page.
 *
 * React comes from the Harness module table, not from a dependency: the
 * loader's `require` is the only way to reach it, so this module stores that
 * function once and every component reads the same React instance from here.
 * Typing the few hooks used keeps component code checked without shipping
 * React's own types.
 */

/** A rendered element, as React hands it back. */
export interface ReactElementLike {
  type: unknown
  props: Record<string, unknown>
  children?: unknown
}

/** One state setter. */
export type SetState<T> = (next: T | ((previous: T) => T)) => void

/** A cleanup function a React effect may return. */
export type EffectCleanup = void | (() => void)

/** The slice of the React API this bundle calls. */
export interface ReactApi {
  createElement(type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]): ReactElementLike
  Fragment: unknown
  useState<T>(initial: T | (() => T)): [T, SetState<T>]
  useEffect(effect: () => EffectCleanup, deps?: readonly unknown[]): void
  useMemo<T>(factory: () => T, deps?: readonly unknown[]): T
  useCallback<T>(callback: T, deps?: readonly unknown[]): T
  useRef<T>(initial: T): { current: T }
  useSyncExternalStore<T>(
    subscribe: (onChange: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T,
  ): T
}

/** The function the module loader passes into the factory. */
export type ModuleRequire = (id: string) => unknown

let installed: ReactApi | undefined

/**
 * Bind the page's React once, when the module factory runs.
 * @param requireFn the loader-provided require.
 */
export function installReact(requireFn: ModuleRequire): ReactApi {
  if (installed === undefined) installed = requireFn('react') as ReactApi
  return installed
}

/** The bound React instance. */
export function react(): ReactApi {
  if (installed === undefined) throw new Error('[personal-hub] React was not installed by the module factory')
  return installed
}

/**
 * Create one element, with JSX factory semantics.
 *
 * This is the `h` the JSX transform calls, so it must accept `null` props and
 * any number of children.
 */
export function h(type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]): ReactElementLike {
  return react().createElement(type, props ?? null, ...children)
}

/** The JSX fragment marker. */
export const Fragment: unknown = Symbol.for('personal-hub.fragment')

export function useState<T>(initial: T | (() => T)): [T, SetState<T>] {
  return react().useState(initial)
}

export function useEffect(effect: () => EffectCleanup, deps?: readonly unknown[]): void {
  react().useEffect(effect, deps)
}

export function useMemo<T>(factory: () => T, deps?: readonly unknown[]): T {
  return react().useMemo(factory, deps)
}

export function useCallback<T>(callback: T, deps?: readonly unknown[]): T {
  return react().useCallback(callback, deps)
}

export function useRef<T>(initial: T): { current: T } {
  return react().useRef(initial)
}

export function useSyncExternalStore<T>(
  subscribe: (onChange: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T,
): T {
  return react().useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
