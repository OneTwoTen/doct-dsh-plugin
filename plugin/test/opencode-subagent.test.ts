import assert from 'node:assert/strict'
import { test } from 'node:test'

import { allowedModelsFrom } from '../src/features/opencode-subagent.ts'
import { normalizeConfig } from '../src/lib/config.ts'

test('live catalog entries become unique exact routes', () => {
  assert.deepEqual(
    allowedModelsFrom(
      [
        { id: 'hy4', provider: 'dsh-opencode-go', name: 'Hy4' },
        { id: 'hy4', provider: 'dsh-opencode-go', name: 'duplicate' },
        { id: '', provider: 'dsh-opencode-go' },
        null,
        'not-a-model',
      ],
      'dsh-opencode-go',
    ),
    [{ provider: 'dsh-opencode-go', model: 'hy4' }],
  )
})

test('the live subagent feature defaults to the OpenCode Go route', () => {
  const config = normalizeConfig({})
  assert.equal(config.opencodeSubagent.enabled, true)
  assert.equal(config.opencodeSubagent.provider, 'dsh-opencode-go')
})

test('the live subagent feature can be disabled and pointed at another route', () => {
  const config = normalizeConfig({ opencodeSubagent: { enabled: false, provider: 'other-route' } })
  assert.equal(config.opencodeSubagent.enabled, false)
  assert.equal(config.opencodeSubagent.provider, 'other-route')
})
