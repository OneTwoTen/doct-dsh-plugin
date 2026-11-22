/**
 * Vietnamese language pack for the Harness web GUI.
 *
 * The Harness locale service ships English, Chinese, Japanese, Spanish,
 * French, German, Russian, and Brazilian Portuguese. A language pack extends
 * that catalog from a client plugin: `addLanguage` makes Vietnamese selectable
 * in Settings → General, and one single-locale `register` call per namespace
 * supplies the translated copy. Keys this pack does not translate fall back to
 * English through the declared fallback chain, so a newer Harness that adds UI
 * strings still runs in Vietnamese with those strings in English.
 *
 * Every registration is an owned effect, so unloading the plugin withdraws the
 * language and its dictionaries and returns an active Vietnamese preference to
 * the browser or default locale.
 */
import type { ClientContext } from '../host/dsh.ts'
import { VI_DICTIONARIES } from './vi-dictionaries.ts'

/** The language id this pack adds. */
export const VI_LOCALE_ID = 'vi'

/** The name the language row shows, written in Vietnamese. */
export const VI_LOCALE_LABEL = 'Tiếng Việt'

/** The language consulted for keys this pack does not translate. */
export const VI_LOCALE_FALLBACK = 'en'

/** What a pack registration reports back, for logging and tests. */
export interface VietnameseRegistration {
  /** Namespaces whose Vietnamese dictionary was registered. */
  namespaces: string[]
  /** Total translated strings registered. */
  keys: number
}

/**
 * Add Vietnamese and register every translated namespace.
 *
 * Definitions and dictionaries may register in either order: the locale
 * service resolves a stored `vi` preference as soon as both exist. The caller
 * owns the returned disposer.
 *
 * @param ctx client context carrying the `locale` service.
 */
export function registerVietnamese(ctx: Pick<ClientContext, 'locale'>): VietnameseRegistration {
  const namespaces = Object.keys(VI_DICTIONARIES)
  let keys = 0
  for (const namespace of namespaces) keys += Object.keys(VI_DICTIONARIES[namespace]).length
  ctx.locale.addLanguage({
    id: VI_LOCALE_ID,
    label: VI_LOCALE_LABEL,
    fallback: VI_LOCALE_FALLBACK,
  })
  for (const namespace of namespaces) {
    ctx.locale.register(namespace, VI_LOCALE_ID, VI_DICTIONARIES[namespace])
  }
  return { namespaces, keys }
}

/**
 * Register Vietnamese through owned effects, so the bundle's unload removes
 * the language and every dictionary with it.
 *
 * Each registration is its own effect: a conflicting language id or namespace
 * is logged and skipped instead of taking the whole bundle's client half down.
 *
 * @param ctx client context carrying the `locale` service.
 */
export function mountVietnamese(ctx: Pick<ClientContext, 'locale'> & Pick<ClientContext, 'effect'>): void {
  const guarded = (label: string, register: () => () => void): void => {
    ctx.effect(() => {
      try {
        return register()
      } catch (error) {
        console.warn(`[personal-hub] cannot register ${label}:`, error instanceof Error ? error.message : String(error))
        return () => {}
      }
    }, label)
  }
  guarded('personal-hub: Vietnamese language', () => ctx.locale.addLanguage({
    id: VI_LOCALE_ID,
    label: VI_LOCALE_LABEL,
    fallback: VI_LOCALE_FALLBACK,
  }))
  for (const [namespace, dictionary] of Object.entries(VI_DICTIONARIES)) {
    guarded(`personal-hub: Vietnamese ${namespace}`, () => ctx.locale.register(namespace, VI_LOCALE_ID, dictionary))
  }
}
