import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

test('apply reports a waiting-token status when no token is configured', async () => {
  const home = await mkdtemp(join(tmpdir(), 'personal-hub-home-'))
  const previousHome = process.env.DSH_HOME
  const previousEnv = process.env.DSH_TELEGRAM_BOT_TOKEN
  process.env.DSH_HOME = home
  delete process.env.DSH_TELEGRAM_BOT_TOKEN

  const disposers = []
  const ctx = {
    get(key) {
      return key === 'sessionController' ? { create: async () => ({ sessionId: 's' }) } : undefined
    },
    logger() {
      return { info() {}, warn() {}, error() {}, debug() {} }
    },
    effect(fn) {
      disposers.push(fn())
    },
  }

  try {
    const { apply } = await import('../index.js')
    apply(ctx, { telegram: { enabled: true } })

    const statusFile = join(home, 'personal-hub', 'telegram-remote', 'status.json')
    const started = Date.now()
    let status
    while (Date.now() - started < 3000) {
      try {
        status = JSON.parse(await readFile(statusFile, 'utf8'))
        break
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
    }
    assert.ok(status, 'status file was written')
    assert.equal(status.state, 'waiting-token')
    assert.match(status.hint, /token/)
  } finally {
    for (const dispose of disposers) dispose?.()
    process.env.DSH_HOME = previousHome
    if (previousEnv !== undefined) process.env.DSH_TELEGRAM_BOT_TOKEN = previousEnv
    await rm(home, { recursive: true, force: true })
  }
})
