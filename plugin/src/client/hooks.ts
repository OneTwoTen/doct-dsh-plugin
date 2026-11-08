/**
 * Small browser-side hooks and formatters shared by the panel's components.
 */
import { useEffect, useRef, useState } from './runtime.ts'
import type { SetState } from './runtime.ts'

/** One loaded value, keeping the previous one on screen while it reloads. */
export interface LoadState<T> {
  status: 'loading' | 'ready' | 'error'
  value: T | undefined
  error: unknown
}

/**
 * Load one value, keeping the previous one on screen while it reloads.
 *
 * The loader runs whenever `deps` change; a late answer for an old request is
 * dropped, so a fast tab switch cannot show stale data.
 */
export function useLoader<T>(loader: () => Promise<T>, deps: readonly unknown[]): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading', value: undefined, error: undefined })
  useEffect(() => {
    let alive = true
    setState((previous) => ({ status: 'loading', value: previous.value, error: undefined }))
    Promise.resolve()
      .then(loader)
      .then((value) => {
        if (alive) setState({ status: 'ready', value, error: undefined })
      })
      .catch((error) => {
        if (alive) setState({ status: 'error', value: undefined, error })
      })
    return () => {
      alive = false
    }
  }, deps)
  return state
}

/**
 * A counter that ticks once a second while `active` is true.
 *
 * Elapsed-time labels read this instead of setting a timeout per action, so one
 * timer serves every running row.
 */
export function useNowSecond(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}

/** Whether the document is visible, so a hidden tab stops polling. */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible')
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onChange = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return visible
}

/** A value that is true for `ms` after `trigger` is called. */
export function useTransient(ms: number): [boolean, (value: boolean) => void] {
  const [on, setOn] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => {
    if (timer.current !== undefined) clearTimeout(timer.current)
  }, [])
  const start = (value: boolean): void => {
    if (timer.current !== undefined) clearTimeout(timer.current)
    setOn(value)
    if (value) timer.current = setTimeout(() => setOn(false), ms)
  }
  return [on, start]
}

/** A stable setter that ignores updates after unmount. */
export function useSafeState<T>(initial: T): [T, SetState<T>] {
  const [value, setValue] = useState(initial)
  const alive = useRef(true)
  useEffect(() => () => {
    alive.current = false
  }, [])
  const set: SetState<T> = (next) => {
    if (!alive.current) return
    setValue(next)
  }
  return [value, set]
}

/**
 * Human text for an instant, in the reader's own language and unit.
 * @param value an ISO date or a millisecond timestamp.
 */
export function relativeTime(value: string | number | null | undefined): string {
  const time = typeof value === 'number' ? value : Date.parse(String(value ?? ''))
  if (!Number.isFinite(time)) return ''
  const seconds = Math.round((time - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit)
  }
  return formatter.format(seconds, 'second')
}

/**
 * Split a repository path into the dimmed directory and the file name.
 *
 * The directory deliberately has no trailing slash: the two halves are rendered
 * as separate spans with an explicit separator. Keeping the slash inside the
 * bidi-truncated directory span made it jump to the start of the path, which
 * turned `plugin/src/client/api.ts` into `/plugin/src/clientapi.ts`.
 */
export function splitPath(path: string): { dir: string; name: string } {
  const text = String(path ?? '')
  const index = text.lastIndexOf('/')
  return index < 0 ? { dir: '', name: text } : { dir: text.slice(0, index), name: text.slice(index + 1) }
}

/**
 * The start-truncated form of a long path, which keeps the file name readable
 * in a narrow row.
 */
export function truncateStart(path: string, max = 42): string {
  const text = String(path ?? '')
  if (text.length <= max) return text
  return `…${text.slice(text.length - max + 1)}`
}

/**
 * Format an elapsed duration the way the action row shows it: `12s`, `1m 5s`.
 * @param startedAtMs when the phase or hook started.
 * @param nowMs the current time.
 */
export function formatElapsed(startedAtMs: number | null, nowMs: number): string | null {
  if (startedAtMs === null) return null
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000))
  if (elapsedSeconds < 60) return `${elapsedSeconds}s`
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  return `${minutes}m ${seconds}s`
}

/**
 * Write text to the clipboard, reporting whether the browser allowed it.
 * @param text what to copy.
 */
export async function copyText(text: string): Promise<boolean> {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard
  if (clipboard === undefined) return false
  try {
    await clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Run a promise-returning function once per click, ignoring re-entry. */
export function usePending(): [boolean, { <T>(task: () => Promise<T>): Promise<T | undefined> }] {
  const [pending, setPending] = useState(false)
  const run = async <T,>(task: () => Promise<T>): Promise<T | undefined> => {
    if (pending) return undefined
    setPending(true)
    try {
      return await task()
    } finally {
      setPending(false)
    }
  }
  return [pending, run]
}
