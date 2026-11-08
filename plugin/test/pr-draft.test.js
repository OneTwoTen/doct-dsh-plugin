import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildChangeRequestInput,
  changeRequestSystemPrompt,
  draftChangeRequest,
  extractJsonObject,
  MAX_TITLE_LENGTH,
  normalizeTitle,
  offlineDraft,
  parseChangeRequestDraft,
  stripFence,
} from '../lib/pr-draft.js'

/** One model stand-in that streams a fixed answer and records its controls. */
function fakeModel(answer, { efforts = ['low', 'high'], chunk = 'text-delta' } = {}) {
  const seen = { configure: null, options: null, maxTokens: null }
  return {
    seen,
    llm: {
      async prepareCall(config, _signal, configure) {
        seen.maxTokens = config.maxTokens
        const controls = configure({}, { reasoning: { efforts: efforts.map((id) => ({ id })) } })
        seen.configure = controls
        return {
          config: { provider: config.provider, model: config.model, ...controls },
          async *stream(options) {
            seen.options = options
            if (chunk === 'block') {
              yield { type: 'block-end', index: 0, block: { type: 'text', text: answer } }
              return
            }
            for (const piece of String(answer).match(/[\s\S]{1,7}/g) ?? []) {
              yield { type: 'text-delta', index: 0, text: piece }
            }
          },
        }
      },
    },
  }
}

const facts = {
  branch: 'feature/x',
  base: 'main',
  ahead: 2,
  commits: [{ subject: 'add the panel', author: 'A' }, { subject: 'fix the route', author: 'B' }],
  files: [{ path: 'a.js', additions: 10, deletions: 2 }],
  diff: 'diff --git a/a.js b/a.js\n+hello\n',
  truncated: false,
}

test('the drafting instruction follows the reader language and forbids invention', () => {
  const english = changeRequestSystemPrompt('en')
  assert.match(english, /English/)
  assert.match(english, /Never invent/)
  assert.match(changeRequestSystemPrompt('vi'), /Vietnamese/)
  assert.match(changeRequestSystemPrompt('pt-BR'), /Portuguese/)
  assert.match(changeRequestSystemPrompt('xx'), /English/)
})

test('the framed input is JSON so commit text cannot break the prompt', () => {
  const input = buildChangeRequestInput(facts)
  assert.match(input, /```json/)
  const payload = JSON.parse(input.split('```json\n')[1].split('\n```')[0])
  assert.equal(payload.branch, 'feature/x')
  assert.equal(payload.base, 'main')
  assert.equal(payload.commits.length, 2)
  assert.equal(payload.files[0].path, 'a.js')
  assert.equal(payload.diffTruncated, false)
})

test('a fenced JSON answer becomes a titled draft', () => {
  const draft = parseChangeRequestDraft('```json\n{"title":"Add the panel","body":"It adds a panel."}\n```')
  assert.deepEqual(draft, { title: 'Add the panel', body: 'It adds a panel.', parsed: 'json' })
})

test('a JSON answer wrapped in prose is still read', () => {
  const draft = parseChangeRequestDraft('Sure — here it is:\n{"title": "Add the panel", "body": "B"}\nThanks!')
  assert.equal(draft.parsed, 'json')
  assert.equal(draft.title, 'Add the panel')
})

test('a plain answer becomes a title and a body', () => {
  const draft = parseChangeRequestDraft('# Add the panel\n\nIt adds a panel.\nSecond line.')
  assert.equal(draft.parsed, 'text')
  assert.equal(draft.title, 'Add the panel')
  assert.match(draft.body, /It adds a panel/)
})

test('an unusable answer keeps the caller fallback title', () => {
  const draft = parseChangeRequestDraft('   ', { fallbackTitle: 'Fallback' })
  assert.deepEqual(draft, { title: 'Fallback', body: '', parsed: 'fallback' })
})

test('a title is one line within the code host limit', () => {
  const long = `x${'y'.repeat(400)}`
  assert.ok(normalizeTitle(long).length <= MAX_TITLE_LENGTH)
  assert.equal(normalizeTitle('**Two\n  lines**'), 'Two lines')
})

test('braces inside strings do not end the located object', () => {
  const text = 'prefix {"title": "a } b", "body": "c"} suffix'
  assert.equal(extractJsonObject(text), '{"title": "a } b", "body": "c"}')
})

test('a fence is stripped once, at the edges only', () => {
  assert.equal(stripFence('```js\nconst a = 1\n```'), 'const a = 1')
  assert.equal(stripFence('no fence'), 'no fence')
})

test('the offline draft names the files and commits', () => {
  const draft = offlineDraft(facts)
  assert.equal(draft.title, 'add the panel')
  assert.match(draft.body, /a\.js/)
  assert.match(draft.body, /fix the route/)
})

test('the model draft uses the lowest effort the route offers and the text answer', async () => {
  const model = fakeModel('{"title":"Add the panel","body":"Why and what."}')
  const draft = await draftChangeRequest({
    llm: model.llm,
    route: { provider: 'p', model: 'm' },
    sessionId: 'session-1',
    facts,
    branch: 'feature/x',
    base: 'main',
    locale: 'en',
    config: { timeoutMs: 5000, maxOutputTokens: 1024 },
  })
  assert.equal(model.seen.configure.reasoningEffort, 'low')
  assert.equal(model.seen.maxTokens, 1024)
  assert.equal(model.seen.options.messages[0].role, 'user')
  assert.equal(model.seen.options.sessionId, 'session-1')
  assert.match(model.seen.options.system, /pull request/)
  assert.equal(draft.source, 'model')
  assert.equal(draft.title, 'Add the panel')
  assert.equal(draft.model, 'p/m')
})

test('a text-only route needs no effort choice', async () => {
  const model = fakeModel('{"title":"T","body":"B"}', { efforts: [] })
  await draftChangeRequest({
    llm: model.llm,
    route: { provider: 'p', model: 'm' },
    facts,
    branch: 'feature/x',
    base: 'main',
    config: {},
  })
  assert.equal(model.seen.configure.reasoningEffort, undefined)
})

test('a block-end answer is assembled like streamed text', async () => {
  const model = fakeModel('{"title":"Block","body":"Body"}', { chunk: 'block' })
  const draft = await draftChangeRequest({
    llm: model.llm,
    route: { provider: 'p', model: 'm' },
    facts,
    branch: 'feature/x',
    base: 'main',
    config: {},
  })
  assert.equal(draft.title, 'Block')
})

test('a missing model service or route falls back to the commits', async () => {
  const noLlm = await draftChangeRequest({ llm: undefined, route: { provider: 'p', model: 'm' }, facts, branch: 'feature/x', base: 'main', config: {} })
  assert.equal(noLlm.source, 'commits')
  assert.equal(noLlm.error, 'model-unavailable')
  const noRoute = await draftChangeRequest({ llm: fakeModel('{}').llm, route: null, facts, branch: 'feature/x', base: 'main', config: {} })
  assert.equal(noRoute.error, 'model-unavailable')
})

test('a failed request falls back with the reason instead of failing the action', async () => {
  const llm = {
    async prepareCall() {
      throw new Error('provider is down')
    },
  }
  const draft = await draftChangeRequest({
    llm,
    route: { provider: 'p', model: 'm' },
    facts,
    branch: 'feature/x',
    base: 'main',
    config: {},
    logger: { warn: () => {} },
  })
  assert.equal(draft.source, 'commits')
  assert.equal(draft.error, 'provider is down')
})
