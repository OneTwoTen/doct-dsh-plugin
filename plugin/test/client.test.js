import assert from 'node:assert/strict'
import { test } from 'node:test'

test('the client module registers a row config card for the bundle row', async () => {
  let loaded
  globalThis.window = {
    __ModuleLoader__: {
      load(spec) {
        loaded = spec
      },
    },
  }

  await import('../client.js')

  assert.equal(typeof loaded?.factory, 'function')
  const React = {
    createElement: () => null,
    useState: (initial) => [initial, () => {}],
    useSyncExternalStore: (_subscribe, getState) => getState(),
  }
  const module = loaded.factory((id) => {
    if (id === 'react') return React
    throw new Error(`unexpected module ${id}`)
  })

  assert.deepEqual(module.inject.includes('slots'), true)
  assert.equal(typeof module.apply, 'function')

  const registrations = []
  const remote = {
    credentials: {
      describe: async () => ({ ok: true, value: { DSH_TELEGRAM_BOT_TOKEN: { configured: true, writable: true } } }),
      set: async () => {},
      unset: async () => {},
    },
    $on: () => () => {},
  }
  const ctx = {
    remote,
    locale: {
      bind: () => (key) => key,
      register: () => () => {},
    },
    slots: {
      inject: (key, callback) => {
        callback()
        return () => {}
      },
      register: (options, component) => {
        registrations.push({ options, component })
        return () => {}
      },
    },
    effect: (fn) => {
      const dispose = fn()
      return () => dispose?.()
    },
  }

  module.apply(ctx)

  const card = registrations.find((entry) => entry.options.name === 'plugins.row.config')
  assert.ok(card, 'registered into plugins.row.config')
  assert.equal(card.options.key, '@local/personal-hub#personal-hub')
  const injected = card.options.inject()
  assert.equal(typeof injected.save, 'function')
  assert.equal(typeof injected.getState, 'function')
  assert.equal(typeof injected.subscribe, 'function')
  assert.equal(typeof card.component, 'function')
})
