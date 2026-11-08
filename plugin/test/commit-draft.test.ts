import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  MAX_SUBJECT_LENGTH,
  buildCommitInput,
  commitSystemPrompt,
  draftCommitMessage,
  fallbackCommitMessage,
  parseCommitDraft,
  sanitizeCommitMessage,
} from '../src/lib/commit-draft.ts'

/** What the fake model recorded about one call. */
interface Seen {
  configure: Record<string, unknown> | null
  options: { messages?: Array<{ role?: string }>; sessionId?: string; system?: string } | null
  maxTokens: unknown
}

/** One model stand-in that streams a fixed answer and records its controls. */
function fakeModel(answer: string, { efforts = ['low', 'high'], chunk = 'text-delta' }: { efforts?: string[]; chunk?: 'text-delta' | 'block' } = {}) {
  const seen: Seen = { configure: null, options: null, maxTokens: null }
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

const files = [{ path: 'src/a.ts', additions: 3, deletions: 1 }]

test('the commit instruction asks for one imperative subject and a JSON answer', () => {
  const english = commitSystemPrompt('en')
  assert.match(english, /English/)
  assert.match(english, new RegExp(`under ${MAX_SUBJECT_LENGTH} characters`))
  assert.match(english, /no trailing period/)
  assert.match(english, /conventional-commit prefix/)
  assert.match(english, /JSON object/)
  assert.match(english, /Never invent/)
  assert.match(commitSystemPrompt('vi'), /Vietnamese/)
  assert.match(commitSystemPrompt('pt-BR'), /Portuguese/)
  assert.match(commitSystemPrompt('xx'), /English/)
})

test('the framed input is JSON so file names cannot break the prompt', () => {
  const input = buildCommitInput({
    branch: 'feature/x',
    files,
    recentSubjects: ['Add the panel'],
    diff: 'diff --git a/src/a.ts b/src/a.ts\n+hello\n',
  })
  assert.match(input, /```json/)
  const payload = JSON.parse(input.split('```json\n')[1].split('\n```')[0]) as {
    branch: string
    files: Array<{ path: string; additions: number; deletions: number }>
    recentSubjects: string[]
    diffTruncated: boolean
  }
  assert.equal(payload.branch, 'feature/x')
  assert.equal(payload.files[0].path, 'src/a.ts')
  assert.equal(payload.files[0].additions, 3)
  assert.deepEqual(payload.recentSubjects, ['Add the panel'])
  assert.equal(payload.diffTruncated, false)
})

test('a fenced JSON answer becomes a subject and a body', () => {
  const draft = parseCommitDraft('```json\n{"subject":"Add the panel","body":"It adds a panel."}\n```')
  assert.deepEqual(draft, { subject: 'Add the panel', body: 'It adds a panel.', parsed: 'json' })
})

test('a JSON answer wrapped in prose is still read', () => {
  const draft = parseCommitDraft('Sure — here it is:\n{"subject": "Add the panel", "body": "B"}\nThanks!')
  assert.equal(draft.parsed, 'json')
  assert.equal(draft.subject, 'Add the panel')
})

test('a plain answer becomes a subject and a body', () => {
  const draft = parseCommitDraft('Add the panel\n\nIt adds a panel.\nSecond line.')
  assert.equal(draft.parsed, 'text')
  assert.equal(draft.subject, 'Add the panel')
  assert.match(draft.body, /It adds a panel\.\nSecond line\./)
})

test('markdown markers and a trailing period are cleaned from a plain subject', () => {
  const draft = parseCommitDraft('* Add the panel.')
  assert.equal(draft.parsed, 'text')
  assert.equal(draft.subject, 'Add the panel')
})

test('an unusable answer keeps the caller fallback subject', () => {
  assert.deepEqual(parseCommitDraft('   ', { fallbackSubject: 'Update files' }), {
    subject: 'Update files',
    body: '',
    parsed: 'fallback',
  })
})

test('a subject line loses quotes, list markers, periods, and extra space', () => {
  assert.equal(sanitizeCommitMessage('"`Add the panel.`"').subject, 'Add the panel')
  assert.equal(sanitizeCommitMessage('- Add   the panel').subject, 'Add the panel')
  assert.equal(sanitizeCommitMessage('1. Add the panel.').subject, 'Add the panel')
})

test('the subject is capped and the body keeps its line breaks', () => {
  const long = `Add ${'x'.repeat(200)}`
  const { subject, body } = sanitizeCommitMessage(`${long}\n\nWhy it changed.\nStill why.`)
  assert.equal(subject.length, MAX_SUBJECT_LENGTH)
  assert.ok(subject.endsWith('…'))
  assert.equal(body, 'Why it changed.\nStill why.')
})

test('a custom subject limit is honored', () => {
  const { subject } = sanitizeCommitMessage('Add a very long subject line', 10)
  assert.equal(subject.length, 10)
  assert.ok(subject.endsWith('…'))
})

test('the fallback names the files it changed', () => {
  assert.deepEqual(fallbackCommitMessage([]), { subject: 'Update project files', body: '' })
  assert.deepEqual(fallbackCommitMessage([{ path: 'src/a.ts' }]), { subject: 'Update a.ts', body: '- src/a.ts' })
  assert.deepEqual(fallbackCommitMessage([{ path: 'a' }, { path: 'b' }, { path: 'c' }]), {
    subject: 'Update 3 files',
    body: '- a\n- b\n- c',
  })
})

test('the fallback body lists at most twenty paths', () => {
  const many = Array.from({ length: 25 }, (_, index) => ({ path: `src/f${index}.ts` }))
  const { subject, body } = fallbackCommitMessage(many)
  assert.equal(subject, 'Update 25 files')
  assert.equal(body.split('\n').length, 20)
})

test('a model answer becomes a commit message at the lowest effort', async () => {
  const model = fakeModel('{"subject":"Add the commit drafter","body":"It drafts messages."}')
  const drafted = await draftCommitMessage({
    llm: model.llm,
    route: { provider: 'p', model: 'm' },
    sessionId: 'session-1',
    branch: 'feature/x',
    files,
    diff: 'diff --git a/src/a.ts b/src/a.ts\n+hello\n',
    recentSubjects: ['Add the panel'],
    locale: 'en',
    config: { timeoutMs: 5000, maxOutputTokens: 1024 },
  })
  assert.equal(model.seen.configure?.reasoningEffort, 'low')
  assert.equal(model.seen.maxTokens, 1024)
  assert.equal(model.seen.options?.messages?.[0]?.role, 'user')
  assert.equal(model.seen.options?.sessionId, 'session-1')
  assert.match(String(model.seen.options?.system), /commit messages/)
  assert.equal(drafted.source, 'model')
  assert.equal(drafted.subject, 'Add the commit drafter')
  assert.equal(drafted.body, 'It drafts messages.')
  assert.equal(drafted.message, 'Add the commit drafter\n\nIt drafts messages.')
  assert.equal(drafted.model, 'p/m')
})

test('a block-end answer is assembled like streamed text', async () => {
  const model = fakeModel('{"subject":"Block","body":"Body"}', { chunk: 'block' })
  const drafted = await draftCommitMessage({
    llm: model.llm,
    route: { provider: 'p', model: 'm' },
    branch: 'feature/x',
    files,
    diff: '',
    recentSubjects: [],
    config: {},
  })
  assert.equal(drafted.subject, 'Block')
  assert.equal(drafted.body, 'Body')
})

test('a missing model service, route, or disabled feature falls back to the files', async () => {
  const noLlm = await draftCommitMessage({
    llm: undefined,
    route: { provider: 'p', model: 'm' },
    branch: 'feature/x',
    files,
    diff: '',
    recentSubjects: [],
    config: {},
  })
  assert.equal(noLlm.source, 'fallback')
  assert.equal(noLlm.error, 'model-unavailable')
  assert.equal(noLlm.message, 'Update a.ts\n\n- src/a.ts')

  const noRoute = await draftCommitMessage({
    llm: fakeModel('{}').llm,
    route: null,
    branch: 'feature/x',
    files,
    diff: '',
    recentSubjects: [],
    config: {},
  })
  assert.equal(noRoute.source, 'fallback')
  assert.equal(noRoute.error, 'model-unavailable')

  const disabled = await draftCommitMessage({
    llm: fakeModel('{}').llm,
    route: { provider: 'p', model: 'm' },
    branch: 'feature/x',
    files,
    diff: '',
    recentSubjects: [],
    config: { enabled: false },
  })
  assert.equal(disabled.error, 'model-unavailable')
})

test('an unusable answer falls back with unparsed-answer', async () => {
  const model = fakeModel('   ')
  const drafted = await draftCommitMessage({
    llm: model.llm,
    route: { provider: 'p', model: 'm' },
    branch: 'feature/x',
    files,
    diff: '',
    recentSubjects: [],
    config: {},
  })
  assert.equal(drafted.source, 'fallback')
  assert.equal(drafted.error, 'unparsed-answer')
})

test('a failed request falls back with the reason instead of failing the commit', async () => {
  const llm = {
    async prepareCall() {
      throw new Error('provider is down')
    },
  }
  const drafted = await draftCommitMessage({
    llm,
    route: { provider: 'p', model: 'm' },
    branch: 'feature/x',
    files,
    diff: '',
    recentSubjects: [],
    config: {},
    logger: { warn: () => {} },
  })
  assert.equal(drafted.source, 'fallback')
  assert.equal(drafted.error, 'provider is down')
  assert.equal(drafted.message, 'Update a.ts\n\n- src/a.ts')
})
