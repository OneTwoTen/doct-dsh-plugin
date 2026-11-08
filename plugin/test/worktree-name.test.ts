import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  BRANCH_PREFIXES,
  branchNamingPrompt,
  MAX_SLUG_LENGTH,
  parseBranchDraft,
  sanitizeBranchSlug,
  semanticBranchName,
  suggestBranchName,
} from '../src/lib/worktree-name.ts'

/** What the fake model recorded about one call. */
interface Seen {
  configure: Record<string, unknown> | null
  options: { sessionId?: string } | null
}

/** One model stand-in that streams a fixed answer and records its controls. */
function fakeModel(answer: string, { efforts = ['low', 'high'] }: { efforts?: string[] } = {}) {
  const seen: Seen = { configure: null, options: null }
  return {
    seen,
    llm: {
      async prepareCall(
        config: { provider: string; model: string },
        _signal: AbortSignal,
        configure: (controls: Record<string, unknown>, model: unknown) => Record<string, unknown>,
      ) {
        const controls = configure({}, { reasoning: { efforts: efforts.map((id) => ({ id })) } })
        seen.configure = controls
        return {
          config: { provider: config.provider, model: config.model, ...controls },
          async *stream(options: Seen['options']) {
            seen.options = options
            yield { type: 'text-delta', index: 0, text: answer }
          },
        }
      },
    },
  }
}

test('a slug is ASCII, lowercase, hyphenated, and bounded', () => {
  assert.equal(sanitizeBranchSlug('Sửa lỗi đăng nhập'), 'sua-loi-dang-nhap')
  assert.equal(sanitizeBranchSlug('  Fix: the LOGIN flow!!  '), 'fix-the-login-flow')
  assert.equal(sanitizeBranchSlug('a--b__c'), 'a-b-c')
  assert.equal(sanitizeBranchSlug('một hai ba bốn năm sáu'), 'mot-hai-ba-bon')
  assert.equal(sanitizeBranchSlug('đường dẫn'), 'duong-dan')
  assert.equal(sanitizeBranchSlug(''), '')
  assert.equal(sanitizeBranchSlug('!!!'), '')
  const long = sanitizeBranchSlug('one two three four five six seven eight nine ten', { maxLength: 12 })
  assert.ok(long.length <= 12)
  assert.doesNotMatch(long, /-$/)
})

test('a branch name uses an allowed prefix and falls back safely', () => {
  assert.equal(semanticBranchName({ prefix: 'feat', slug: 'add panel' }), 'feat/add-panel')
  assert.equal(semanticBranchName({ prefix: 'FIX', slug: 'crash' }), 'fix/crash')
  // An unknown prefix becomes the configured fallback rather than inventing one.
  assert.equal(semanticBranchName({ prefix: 'random', slug: 'thing', fallbackPrefix: 'dsh' }), 'dsh/thing')
  assert.equal(semanticBranchName({ prefix: 'feat', slug: '', fallbackPrefix: 'dsh' }), '')
  assert.equal(semanticBranchName({ slug: 'no prefix', fallbackPrefix: '' }), 'no-prefix')
  for (const prefix of BRANCH_PREFIXES) {
    assert.equal(semanticBranchName({ prefix, slug: 'x' }), `${prefix}/x`)
  }
})

test('a model answer is read as JSON, a bare branch, or a colon form', () => {
  assert.deepEqual(parseBranchDraft('{"prefix":"feat","slug":"Add the panel"}'), {
    branch: 'feat/add-the-panel',
    prefix: 'feat',
    slug: 'add-the-panel',
  })
  assert.deepEqual(parseBranchDraft('Sure:\n{"prefix":"fix","slug":"login crash"}\n'), {
    branch: 'fix/login-crash',
    prefix: 'fix',
    slug: 'login-crash',
  })
  assert.deepEqual(parseBranchDraft('feat/add-panel'), { branch: 'feat/add-panel', prefix: 'feat', slug: 'add-panel' })
  assert.deepEqual(parseBranchDraft('fix: login crash'), { branch: 'fix/login-crash', prefix: 'fix', slug: 'login-crash' })
  assert.equal(parseBranchDraft(''), null)
  assert.equal(parseBranchDraft('!!!'), null)
})

test('the naming instruction carries the extra instructions', () => {
  const prompt = branchNamingPrompt('Start with the issue id.')
  assert.match(prompt, /"prefix"/)
  assert.match(prompt, /feat/)
  assert.match(prompt, /Start with the issue id\./)
  assert.doesNotMatch(branchNamingPrompt(''), /Additional naming instructions/)
  assert.ok(MAX_SLUG_LENGTH >= 10)
})

test('the model names the branch with the lowest effort the route offers', async () => {
  const model = fakeModel('{"prefix":"feat","slug":"bang the panel"}')
  const draft = await suggestBranchName({
    llm: model.llm,
    route: { provider: 'p', model: 'm' },
    text: 'Please add the bang panel to the sidebar',
    sessionId: 'session-1',
    config: { timeoutMs: 5000, maxOutputTokens: 100 },
  })
  assert.equal(model.seen.configure?.reasoningEffort, 'low')
  assert.equal(model.seen.options?.sessionId, 'session-1')
  assert.deepEqual(draft, { branch: 'feat/bang-the-panel', prefix: 'feat', slug: 'bang-the-panel' })
})

test('an unusable answer, a missing model, or a failure leaves the name alone', async () => {
  const unusable = fakeModel('I cannot help with that.')
  assert.equal(await suggestBranchName({ llm: unusable.llm, route: { provider: 'p', model: 'm' }, text: 'x', config: {} }), null)
  assert.equal(await suggestBranchName({ llm: undefined, route: { provider: 'p', model: 'm' }, text: 'x', config: {} }), null)
  assert.equal(await suggestBranchName({ llm: fakeModel('{}').llm, route: null, text: 'x', config: {} }), null)
  assert.equal(await suggestBranchName({ llm: fakeModel('{}').llm, route: { provider: 'p', model: 'm' }, text: '  ', config: {} }), null)

  const failing = {
    async prepareCall() {
      throw new Error('provider down')
    },
  }
  assert.equal(await suggestBranchName({ llm: failing, route: { provider: 'p', model: 'm' }, text: 'x', config: {}, logger: { warn: () => {} } }), null)
})
