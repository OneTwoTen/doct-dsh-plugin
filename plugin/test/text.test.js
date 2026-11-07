import assert from 'node:assert/strict'
import { test } from 'node:test'

import { chunkText, isCommand, parseCommand, withSuffix } from '../lib/text.js'
import { normalizeConfig } from '../lib/config.js'

test('chunkText returns no chunks for blank input', () => {
  assert.deepEqual(chunkText('   \n '), [])
})

test('chunkText splits a long answer at a line boundary', () => {
  const line = 'x'.repeat(120)
  const text = Array.from({ length: 100 }, () => line).join('\n')
  const chunks = chunkText(text, 500)
  assert.equal(chunks.length > 1, true)
  assert.equal(chunks.join(''), text)
  for (const chunk of chunks) assert.equal(chunk.length <= 500, true)
})

test('chunkText never splits a surrogate pair', () => {
  const text = '🙂'.repeat(600)
  const chunks = chunkText(text, 401)
  for (const chunk of chunks) {
    assert.equal(chunk.isWellFormed(), true)
  }
  assert.equal(chunks.join(''), text)
})

test('withSuffix keeps the tail inside the message limit', () => {
  const text = 'a'.repeat(5000) + 'TAIL'
  const value = withSuffix(text, '…', 4096)
  assert.equal(value.length <= 4096, true)
  assert.equal(value.endsWith('TAIL…'), true)
})

test('parseCommand handles bot mentions and arguments', () => {
  assert.deepEqual(parseCommand('/new@personal_hub_bot D:\\work'), { name: 'new', argument: 'D:\\work' })
  assert.deepEqual(parseCommand('/status'), { name: 'status', argument: '' })
  assert.equal(isCommand('/help'), true)
  assert.equal(isCommand('giúp tôi'), false)
})

test('normalizeConfig fills defaults and clamps ranges', () => {
  const settings = normalizeConfig({
    telegram: { allowedChatIds: [123, ' 456 ', ''], pollTimeoutSec: 999, progressIntervalMs: 0 },
  })
  assert.deepEqual(settings.telegram.allowedChatIds, ['123', '456'])
  assert.equal(settings.telegram.pollTimeoutSec, 50)
  assert.equal(settings.telegram.progressIntervalMs, 1500)
  assert.equal(settings.telegram.tokenEnv, 'DSH_TELEGRAM_BOT_TOKEN')
  assert.equal(settings.telegram.pushResponses, true)
  assert.equal(settings.telegram.pushChanges, true)
  assert.equal(normalizeConfig(undefined).telegram.enabled, true)
  assert.equal(normalizeConfig({ telegram: { enabled: 'false' } }).telegram.enabled, false)
  assert.equal(normalizeConfig({ telegram: { pushResponses: 'false' } }).telegram.pushResponses, false)
})
