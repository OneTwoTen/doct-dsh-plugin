import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildChangeRequestInput,
  changeRequestSystemPrompt,
  draftChangeRequest,
  draftIsUsable,
  extractJsonObject,
  MAX_TITLE_LENGTH,
  normalizeTitle,
  offlineDraft,
  parseChangeRequestDraft,
  stripFence,
} from '../src/lib/pr-draft.ts'

/** What the fake model recorded about one call. */
interface Seen {
  configure: Record<string, unknown> | null
  options: { messages?: Array<{ role?: string }>; sessionId?: string; system?: string } | null
  calls: Array<{ messages?: Array<{ role?: string; content?: Array<{ text?: string }> }>; sessionId?: string; system?: string }>
  maxTokens: unknown
}

/** One model stand-in that streams a fixed answer (or the next of several) and records its controls. */
function fakeModel(answer: string | string[], { efforts = ['low', 'high'], chunk = 'text-delta' }: { efforts?: string[]; chunk?: 'text-delta' | 'block' } = {}) {
  const seen: Seen = { configure: null, options: null, calls: [], maxTokens: null }
  const answers = Array.isArray(answer) ? answer : [answer]
  return {
    seen,
    llm: {
      async prepareCall(
        config: { provider: string; model: string; maxTokens?: number },
        _signal: AbortSignal,
        configure: (controls: Record<string, unknown>, model: unknown) => Record<string, unknown>,
      ) {
        seen.maxTokens = config.maxTokens
        const controls = configure({}, { reasoning: { efforts: efforts.map((id) => ({ id })) } })
        seen.configure = controls
        return {
          config: { provider: config.provider, model: config.model, ...controls },
          async *stream(options: Seen['options']) {
            seen.options = options
            seen.calls.push(options as Seen['calls'][number])
            const reply = answers[Math.min(seen.calls.length - 1, answers.length - 1)]
            if (chunk === 'block') {
              yield { type: 'block-end', index: 0, block: { type: 'text', text: reply } }
              return
            }
            for (const piece of String(reply).match(/[\s\S]{1,7}/g) ?? []) {
              yield { type: 'text-delta', index: 0, text: piece }
            }
          },
        }
      },
    },
  }
}

/** A realistic answer the validator accepts. */
const goodAnswer = JSON.stringify({
  title: 'Add the Git panel to the right sidebar',
  body: 'The panel lists changes, diffs, and pull requests.\n\n## Changes\n- Adds the panel component.\n- Wires the sidebar tab.\n\n## Testing\n- Tests were not run.',
})

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
  assert.match(english, /three sections/)
  assert.match(english, /generic title/)
  const vietnamese = changeRequestSystemPrompt('vi')
  assert.match(vietnamese, /Vietnamese/)
  assert.match(changeRequestSystemPrompt('pt-BR'), /Portuguese/)
  assert.match(changeRequestSystemPrompt('xx'), /English/)
})

test('the framed input is JSON so commit text cannot break the prompt', () => {
  const input = buildChangeRequestInput(facts)
  assert.match(input, /```json/)
  const payload = JSON.parse(input.split('```json\n')[1].split('\n```')[0])
  assert.equal(payload.branch, 'feature/x')
  assert.equal(payload.base, 'main')
  assert.equal(payload.ahead, 2)
  assert.equal(payload.commits.length, 2)
  assert.equal(payload.files[0].path, 'a.js')
  assert.equal(payload.fileCount, 1)
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

test('the offline draft names the files and commits, in the reader language', () => {
  const vietnamese = offlineDraft(facts, 'vi')
  assert.equal(vietnamese.title, 'add the panel')
  assert.match(vietnamese.body, /a\.js/)
  assert.match(vietnamese.body, /fix the route/)
  assert.match(vietnamese.body, /## Thay đổi/)
  assert.match(vietnamese.body, /## Kiểm thử/)

  const english = offlineDraft(facts, 'en')
  assert.match(english.body, /## Changes/)
  assert.match(english.body, /## Testing/)
  assert.doesNotMatch(english.body, /Thay đổi/)
})

test('a draft is usable only when the title is concrete and the body has substance', () => {
  const body = 'This change adds the panel.\n\n## Changes\n- Adds the panel.\n\n## Testing\n- Tests were not run.'
  assert.equal(draftIsUsable('Add the Git panel to the sidebar', body), true)
  assert.equal(draftIsUsable('Update the sidebar layout with a compact header', body), true, 'a specific update is fine')
  assert.equal(draftIsUsable('Update files', body), false, 'generic titles are rejected')
  assert.equal(draftIsUsable('Fix', body), false, 'short titles are rejected')
  assert.equal(draftIsUsable('Add the Git panel to the sidebar', 'Short body.'), false, 'a one-line body is rejected')
  assert.equal(draftIsUsable('Add the Git panel to the sidebar', 'Add the Git panel to the sidebar'), false)
})

test('the model draft uses the lowest effort the route offers and the text answer', async () => {
  const model = fakeModel(goodAnswer)
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
  assert.equal(model.seen.configure?.reasoningEffort, 'low')
  assert.equal(model.seen.maxTokens, 1024)
  assert.equal(model.seen.options?.messages?.[0]?.role, 'user')
  assert.equal(model.seen.options?.sessionId, 'session-1')
  assert.match(String(model.seen.options?.system), /pull request/)
  assert.equal(draft.source, 'model')
  assert.equal(draft.title, 'Add the Git panel to the right sidebar')
  assert.match(draft.body, /## Changes/)
  assert.equal(draft.error, undefined)
  assert.equal(draft.model, 'p/m')
})

test('a vague first answer is retried once with a pointed correction', async () => {
  const model = fakeModel([JSON.stringify({ title: 'Update files', body: 'Changes.' }), goodAnswer])
  const draft = await draftChangeRequest({
    llm: model.llm,
    route: { provider: 'p', model: 'm' },
    facts,
    branch: 'feature/x',
    base: 'main',
    config: {},
  })
  assert.equal(model.seen.calls.length, 2, 'the draft was asked for twice')
  assert.match(String(model.seen.calls[1]?.messages?.[0]?.content?.[0]?.text), /not usable/)
  assert.equal(draft.source, 'model')
  assert.equal(draft.title, 'Add the Git panel to the right sidebar')
})

test('two vague answers fall back to the commits with a reason', async () => {
  const model = fakeModel(JSON.stringify({ title: 'WIP', body: 'x' }))
  const draft = await draftChangeRequest({
    llm: model.llm,
    route: { provider: 'p', model: 'm' },
    facts,
    branch: 'feature/x',
    base: 'main',
    config: {},
    logger: { warn: () => {} },
  })
  assert.equal(draft.source, 'commits')
  assert.equal(draft.error, 'unusable-answer')
})

test('a text-only route needs no effort choice', async () => {
  const model = fakeModel(goodAnswer, { efforts: [] })
  await draftChangeRequest({
    llm: model.llm,
    route: { provider: 'p', model: 'm' },
    facts,
    branch: 'feature/x',
    base: 'main',
    config: {},
  })
  assert.equal(model.seen.configure?.reasoningEffort, undefined)
})

test('a block-end answer is assembled like streamed text', async () => {
  const model = fakeModel(JSON.stringify({
    title: 'Add the Git panel to the sidebar',
    body: 'Adds the panel with its diff stack.\n\n## Changes\n- Adds the panel component.\n\n## Testing\n- Tests were not run.',
  }), { chunk: 'block' })
  const draft = await draftChangeRequest({
    llm: model.llm,
    route: { provider: 'p', model: 'm' },
    facts,
    branch: 'feature/x',
    base: 'main',
    config: {},
  })
  assert.equal(draft.title, 'Add the Git panel to the sidebar')
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
