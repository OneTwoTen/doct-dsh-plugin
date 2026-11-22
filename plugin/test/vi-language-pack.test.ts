/// <reference lib="es2024" />
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { VI_DICTIONARIES } from '../src/client/vi-dictionaries.ts'
import {
  VI_LOCALE_FALLBACK,
  VI_LOCALE_ID,
  VI_LOCALE_LABEL,
  mountVietnamese,
  registerVietnamese,
} from '../src/client/vi-language-pack.ts'

interface LocaleCall {
  method: 'register' | 'addLanguage'
  args: unknown[]
}

/** A stand-in `locale` service that records what the pack registers. */
function fakeLocale() {
  const calls: LocaleCall[] = []
  const disposers: number[] = []
  let disposed = 0
  return {
    calls,
    get disposed() {
      return disposed
    },
    bind() {
      return (key: string) => key
    },
    addLanguage(input: unknown) {
      calls.push({ method: 'addLanguage', args: [input] })
      return () => {
        disposed++
      }
    },
    register(...args: unknown[]) {
      calls.push({ method: 'register', args })
      const id = disposers.length
      disposers.push(id)
      return () => {
        disposed++
      }
    },
  }
}

test('the pack adds Vietnamese with an English fallback', () => {
  const locale = fakeLocale()
  const result = registerVietnamese({ locale })
  assert.equal(result.namespaces.length, 76)
  assert.equal(result.keys, 4253)
  assert.deepEqual(locale.calls[0], {
    method: 'addLanguage',
    args: [{ id: 'vi', label: 'Tiếng Việt', fallback: 'en' }],
  })
  assert.equal(VI_LOCALE_ID, 'vi')
  assert.equal(VI_LOCALE_LABEL, 'Tiếng Việt')
  assert.equal(VI_LOCALE_FALLBACK, 'en')
})

test('every translated namespace is registered for vi only', () => {
  const locale = fakeLocale()
  registerVietnamese({ locale })
  const registrations = locale.calls.filter((call) => call.method === 'register')
  assert.equal(registrations.length, Object.keys(VI_DICTIONARIES).length)
  for (const call of registrations) {
    assert.equal(call.args.length, 3)
    assert.equal(call.args[1], 'vi')
    assert.equal(typeof call.args[0], 'string')
    assert.equal(typeof call.args[2], 'object')
  }
})

test('the core Harness namespaces carry Vietnamese copy', () => {
  assert.match(VI_DICTIONARIES.common.cancel ?? '', /^H[uủ]y$/)
  assert.equal(VI_DICTIONARIES.common.save, 'Lưu')
  assert.equal(VI_DICTIONARIES['settings.locale']['language.title'], 'Ngôn ngữ')
  assert.equal(VI_DICTIONARIES.settings['general.nav'], 'Chung')
  assert.equal(VI_DICTIONARIES.conversation['input.send'], 'Gửi tin nhắn')
})

test('translations keep their named placeholders', () => {
  const cases: [string, string, string[]][] = [
    ['common', 'copy.optionsHint', ['{action}']],
    ['chat', 'message.context.catalog.more', ['{count}']],
    ['conversation', 'attachment.dropDesc', ['{count}', '{size}']],
    ['workspace', 'toast.archived', []],
    ['directory-browser', 'browser.createIn', ['{name}']],
    ['pluginManager', 'openDetail', ['{name}']],
  ]
  for (const [namespace, key, placeholders] of cases) {
    const value = VI_DICTIONARIES[namespace]?.[key]
    assert.equal(typeof value, 'string', `${namespace}.${key} must exist`)
    for (const placeholder of placeholders) {
      assert.equal(value.includes(placeholder), true, `${namespace}.${key} keeps ${placeholder}`)
    }
  }
})

test('mounting registers every piece through its own owned effect', () => {
  const locale = fakeLocale()
  const cleanups: Array<() => void> = []
  const ctx = {
    locale,
    effect(factory: () => (() => void) | void) {
      const cleanup = factory()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
    },
  }
  mountVietnamese(ctx)
  const namespaceCount = Object.keys(VI_DICTIONARIES).length
  assert.equal(cleanups.length, namespaceCount + 1)
  const languages = locale.calls.filter((call) => call.method === 'addLanguage')
  assert.equal(languages.length, 1)
  assert.equal(locale.calls.filter((call) => call.method === 'register').length, namespaceCount)
  for (const cleanup of cleanups) cleanup()
  assert.equal(locale.disposed, namespaceCount + 1)
})

test('a rejected registration does not take the rest of the pack down', () => {
  const registered: string[] = []
  const locale = {
    bind: () => (key: string) => key,
    addLanguage: () => () => {},
    register(namespace: string) {
      if (namespace === 'conversation') throw new Error('taken')
      registered.push(namespace)
      return () => {}
    },
  }
  const cleanups: Array<() => void> = []
  const warnings: unknown[][] = []
  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => warnings.push(args)
  try {
    mountVietnamese({
      locale,
      effect(factory: () => (() => void) | void) {
        const cleanup = factory()
        if (typeof cleanup === 'function') cleanups.push(cleanup)
      },
    })
  } finally {
    console.warn = originalWarn
  }
  assert.equal(registered.length, Object.keys(VI_DICTIONARIES).length - 1)
  assert.equal(warnings.length, 1)
  assert.equal(cleanups.length, Object.keys(VI_DICTIONARIES).length + 1)
})

test('no translated value is empty or carries zero-width characters', () => {
  let count = 0
  for (const dictionary of Object.values(VI_DICTIONARIES)) {
    for (const value of Object.values(dictionary)) {
      count++
      assert.equal(typeof value, 'string')
      assert.equal(/[\u200B\uFEFF]/.test(value), false)
      if (value.trim() !== '') assert.equal(value.trim().length > 0, true)
    }
  }
  assert.equal(count, 4253)
})
