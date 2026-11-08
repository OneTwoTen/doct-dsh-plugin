/**
 * Naming a worktree branch after the task.
 *
 * A checkout is created before the Session's first message exists, so its
 * branch starts as a temporary `dsh-…` name. Once the first message arrives,
 * a model reads it and this module turns the answer into a branch-safe
 * `feat/…` name. Everything except the model call is pure text handling.
 */
import { extractJsonObject, stripFence } from './pr-draft.js'

/** Prefixes a model may choose, in the order this plugin prefers to offer them. */
export const BRANCH_PREFIXES = Object.freeze(['feat', 'fix', 'chore', 'docs', 'refactor', 'test', 'perf', 'build', 'ci'])
/** Longest branch suffix accepted from one answer. */
export const MAX_SLUG_LENGTH = 40
/** Most words a suffix may hold. */
export const MAX_SLUG_WORDS = 4

/** The instruction that frames one naming request. */
export function branchNamingPrompt(instructions = '') {
  const extra = String(instructions ?? '').trim()
  return [
    'You name a Git branch for one coding task inside an existing repository.',
    'You receive the first message of the task as JSON.',
    'Answer with one JSON object and nothing else: {"prefix": string, "slug": string}.',
    `"prefix" is one of: ${BRANCH_PREFIXES.join(', ')}.`,
    `"slug" is ${2}–${MAX_SLUG_WORDS} lowercase English words joined by hyphens that describe the task, at most ${MAX_SLUG_LENGTH} characters.`,
    'Use ASCII letters, digits, and hyphens only. Never include the branch prefix in the slug.',
    extra.length === 0 ? '' : `Additional naming instructions: ${extra}`,
  ].filter((line) => line.length > 0).join('\n')
}

/**
 * Reduce free text to a branch-safe slug.
 *
 * Diacritics are folded first, so a Vietnamese or Spanish message still yields
 * an ASCII branch: "sửa lỗi đăng nhập" becomes `sua-loi-dang-nhap`.
 *
 * @param {string} text free text, usually a model answer.
 * @param {{ maxWords?: number, maxLength?: number }} [limits]
 * @returns {string} a lowercase hyphenated slug, possibly empty.
 */
export function sanitizeBranchSlug(text, limits = {}) {
  const maxWords = Math.max(1, Number(limits.maxWords) || MAX_SLUG_WORDS)
  const maxLength = Math.max(4, Number(limits.maxLength) || MAX_SLUG_LENGTH)
  const folded = String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (folded.length === 0) return ''
  const words = folded.split('-').filter((word) => word.length > 0).slice(0, maxWords)
  let slug = words.join('-')
  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength).replace(/-+$/g, '')
  }
  return slug
}

/**
 * Build the branch name from a chosen prefix and slug.
 * @param {{ prefix?: string, slug: string, fallbackPrefix?: string }} parts
 * @returns {string} a branch name, or an empty string when there is no slug.
 */
export function semanticBranchName({ prefix, slug, fallbackPrefix = 'dsh' }) {
  const clean = sanitizeBranchSlug(slug)
  if (clean.length === 0) return ''
  const chosen = String(prefix ?? '').trim().toLowerCase()
  const head = BRANCH_PREFIXES.includes(chosen)
    ? chosen
    : sanitizeBranchSlug(fallbackPrefix, { maxWords: 1, maxLength: 16 })
  return head.length > 0 ? `${head}/${clean}` : clean
}

/**
 * Read a model answer as a branch name.
 *
 * Accepts the requested JSON object, a bare `feat/thing` line, or a colon form
 * like `feat: thing`, because a small cheap model sometimes answers the name
 * directly instead of wrapping it.
 *
 * @param {string} text model output.
 * @param {{ fallbackPrefix?: string }} [options]
 * @returns {{ branch: string, prefix: string, slug: string } | null}
 */
export function parseBranchDraft(text, options = {}) {
  const raw = String(text ?? '').trim()
  if (raw.length === 0) return null
  const fallbackPrefix = options.fallbackPrefix ?? 'dsh'

  const jsonText = extractJsonObject(raw)
  if (jsonText !== null) {
    try {
      const value = JSON.parse(jsonText)
      const branch = semanticBranchName({
        prefix: String(value?.prefix ?? ''),
        slug: String(value?.slug ?? value?.name ?? ''),
        fallbackPrefix,
      })
      if (branch.length > 0) {
        return { branch, prefix: branch.split('/')[0], slug: branch.slice(branch.indexOf('/') + 1) }
      }
    } catch {
      // A malformed object falls through to the plain-text forms.
    }
  }

  const line = stripFence(raw).split(/\r?\n/).map((item) => item.trim()).find((item) => item.length > 0) ?? ''
  const direct = /^([a-z]+)\/([a-z0-9][a-z0-9-]*)$/i.exec(line)
  if (direct !== null) {
    const branch = semanticBranchName({ prefix: direct[1], slug: direct[2], fallbackPrefix })
    if (branch.length > 0) return { branch, prefix: branch.split('/')[0], slug: branch.slice(branch.indexOf('/') + 1) }
  }
  const colon = /^([a-z]+)\s*:\s*(.+)$/i.exec(line)
  if (colon !== null) {
    const branch = semanticBranchName({ prefix: colon[1], slug: colon[2], fallbackPrefix })
    if (branch.length > 0) return { branch, prefix: branch.split('/')[0], slug: branch.slice(branch.indexOf('/') + 1) }
  }
  // A bare name is only accepted when it looks like one: a single token without
  // spaces. Prose ("I cannot help with that") must not become a branch.
  if (/^[A-Za-z0-9._-]{2,60}$/.test(line)) {
    const bare = semanticBranchName({ prefix: '', slug: line, fallbackPrefix })
    if (bare.length > 0) {
      return { branch: bare, prefix: bare.split('/')[0], slug: bare.slice(bare.indexOf('/') + 1) }
    }
  }
  return null
}

/**
 * Ask a model to name one branch from the task's first message.
 *
 * The lowest reasoning effort the route offers is used: naming a branch is a
 * four-word decision. Any failure returns `null`, and the checkout keeps its
 * temporary name — the same fallback the reference implementation uses.
 *
 * @param {{
 *   llm: { prepareCall: Function } | undefined,
 *   route: { provider: string, model: string } | null,
 *   text: string,
 *   sessionId?: string,
 *   instructions?: string,
 *   fallbackPrefix?: string,
 *   config?: { timeoutMs?: number, maxOutputTokens?: number },
 *   signal?: AbortSignal,
 *   logger?: { warn: Function },
 * }} options
 * @returns {Promise<{ branch: string, prefix: string, slug: string } | null>}
 */
export async function suggestBranchName({ llm, route, text, sessionId = '', instructions = '', fallbackPrefix = 'dsh', config, signal, logger }) {
  const message = String(text ?? '').trim()
  if (llm === undefined || typeof llm.prepareCall !== 'function') return null
  if (route === null || typeof route?.provider !== 'string' || typeof route?.model !== 'string') return null
  if (message.length === 0) return null

  const timeoutMs = Math.max(5000, Number(config?.timeoutMs) || 30000)
  const deadline = AbortSignal.timeout(timeoutMs)
  const combined = signal === undefined ? deadline : AbortSignal.any([signal, deadline])
  try {
    const call = await llm.prepareCall(
      { provider: route.provider, model: route.model, maxTokens: Number(config?.maxOutputTokens) || 200 },
      combined,
      (controls, model) => {
        const effort = model?.reasoning?.efforts?.[0]?.id
        return effort === undefined ? controls : { ...controls, reasoningEffort: effort }
      },
    )
    const input = `Name this task from its first message:\n${JSON.stringify({ message: message.slice(0, 2000) })}`
    let streamed = ''
    const blocks = []
    for await (const chunk of call.stream({
      ...call.config,
      messages: [{ role: 'user', content: [{ type: 'text', text: input }] }],
      system: branchNamingPrompt(instructions),
      ...(sessionId.length === 0 ? {} : { sessionId }),
      signal: combined,
    })) {
      if (chunk?.type === 'text-delta' && typeof chunk.text === 'string') streamed += chunk.text
      else if (chunk?.type === 'block-end' && chunk.block?.type === 'text' && typeof chunk.block.text === 'string') {
        blocks.push(chunk.block.text)
      }
    }
    return parseBranchDraft(blocks.length > 0 ? blocks.join('\n') : streamed, { fallbackPrefix })
  } catch (error) {
    if (signal?.aborted === true) throw error
    logger?.warn?.('git: branch naming failed: %s', error instanceof Error ? error.message : String(error))
    return null
  }
}
