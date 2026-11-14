/**
 * Commit-message drafting: the prompt a model receives and the parsing of its
 * answer.
 *
 * Everything here is pure text handling except `draftCommitMessage`, so the
 * shape the model must return is testable without a model or a repository.
 */

import { extractJsonObject, stripFence } from './pr-draft.ts'
import type { CommitConfig } from './config.ts'
import type { LlmService, ModelRoute } from '../host/dsh.ts'

/** Longest subject line this plugin keeps. */
export const MAX_SUBJECT_LENGTH = 72

/** Language name used in the instruction, from the UI locale. */
const LANGUAGES = new Map<string, string>([
  ['vi', 'Vietnamese'],
  ['en', 'English'],
  ['zh', 'Chinese'],
  ['ja', 'Japanese'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
  ['ru', 'Russian'],
  ['pt', 'Portuguese'],
])

/** One file whose change the message describes. */
export interface CommitFile {
  path: string
  additions: number
  deletions: number
}

/** The facts a commit message is drafted from. */
export interface CommitFacts {
  branch: string
  files: CommitFile[]
  recentSubjects: string[]
  diff: string
  truncated?: boolean
}

/** One parsed commit message. */
export interface CommitDraft {
  subject: string
  body: string
  parsed: 'json' | 'text' | 'fallback'
}

/** What one model call needs to draft a commit message. */
export interface DraftCommitMessageOptions {
  /** The LLM service, which a composition may not have. */
  llm?: unknown
  route: ModelRoute | null
  sessionId?: string
  branch: string
  files: CommitFile[]
  diff: string
  truncated?: boolean
  recentSubjects: string[]
  locale?: string
  config: Partial<CommitConfig>
  signal?: AbortSignal
  logger?: { warn?: (...args: unknown[]) => void }
}

/** One drafted commit message, with the reason when the model did not answer. */
export interface DraftedCommitMessage {
  /** The whole message, ready to commit. */
  message: string
  subject: string
  body: string
  source: 'model' | 'fallback'
  model: string | null
  error?: string
}

/** The instruction that frames one drafting request. */
export function commitSystemPrompt(locale = 'en'): string {
  const language = LANGUAGES.get(String(locale ?? '').slice(0, 2).toLowerCase()) ?? 'English'
  return [
    'You write Git commit messages for the changes in a repository.',
    'You receive JSON describing the branch, the changed files, the recent commit subjects, and a diff excerpt.',
    'Answer with one JSON object and nothing else: {"subject": string, "body": string}.',
    `The subject is one imperative line under ${MAX_SUBJECT_LENGTH} characters, with no trailing period, naming what the commit does.`,
    'Do not add a conventional-commit prefix such as "feat:" or "fix:" unless the recent subjects in the repository use one.',
    'The body is optional plain text wrapped at 72 columns: it explains what changed and why, not how it was implemented.',
    `Write the message in ${language} unless the recent subjects are clearly written in another language, in which case follow the recent subjects.`,
    'Describe only what the supplied diff shows. Never invent a file, a test, or a reason.',
  ].join('\n')
}

/**
 * Frame the commit facts as JSON so file names and commit text cannot break the
 * prompt.
 *
 * @param facts the branch, its files, the recent subjects, and the diff excerpt.
 */
export function buildCommitInput(facts: CommitFacts): string {
  const payload = {
    branch: facts.branch,
    files: (facts.files ?? []).map((file) => ({
      path: file.path,
      additions: file.additions,
      deletions: file.deletions,
    })),
    recentSubjects: facts.recentSubjects ?? [],
    diffTruncated: facts.truncated === true,
    diff: facts.diff ?? '',
  }
  return [
    `Draft the commit message for the staged changes on ${facts.branch}:`,
    '```json',
    JSON.stringify(payload),
    '```',
    'Answer with the JSON object only.',
  ].join('\n')
}

/**
 * Read a model answer as a commit message.
 *
 * Models sometimes wrap JSON in a code fence or add a sentence before it, so a
 * fence is stripped and the outermost JSON object is located before a plain
 * "first line is the subject" fallback is tried.
 *
 * @param text model output.
 * @param options subject used when the answer is unusable.
 */
export function parseCommitDraft(text: string, options: { fallbackSubject?: string } = {}): CommitDraft {
  const raw = String(text ?? '').trim()
  const fallbackSubject = cleanSubjectLine(options.fallbackSubject ?? '')
  if (raw.length === 0) {
    return { subject: fallbackSubject, body: '', parsed: 'fallback' }
  }

  const jsonText = extractJsonObject(raw)
  if (jsonText !== null) {
    try {
      const value: unknown = JSON.parse(jsonText)
      const record = value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
      const subject = cleanSubjectLine(String(record.subject ?? record.title ?? ''))
      const body = normalizeCommitBody(String(record.body ?? record.description ?? ''))
      if (subject.length > 0) return { subject, body, parsed: 'json' }
      // A draft-shaped object with no usable subject is an unusable answer:
      // falling through to the raw text would commit the JSON itself.
      if ('subject' in record || 'title' in record || 'body' in record || 'description' in record) {
        return { subject: fallbackSubject, body, parsed: 'fallback' }
      }
    } catch {
      // A malformed object still leaves the readable text below.
    }
  }

  const lines = raw.split(/\r?\n/)
  const subjectLine = lines.find((line) => line.trim().length > 0) ?? ''
  const subject = cleanSubjectLine(subjectLine)
  if (subject.length === 0) {
    return { subject: fallbackSubject, body: stripFence(raw), parsed: 'fallback' }
  }
  const rest = lines.slice(lines.indexOf(subjectLine) + 1).join('\n').trim()
  return { subject, body: normalizeCommitBody(stripFence(rest)), parsed: 'text' }
}

/**
 * Reduce one model answer to the two fields a commit carries.
 *
 * The first line is the subject: surrounding quotes and backticks, a leading
 * list marker, and trailing periods are removed, whitespace is collapsed, and
 * the line is capped at the configured length with an ellipsis. The rest of the
 * answer keeps its line breaks and is only trimmed.
 *
 * @param text the model answer, or a hand-written message.
 * @param maxSubjectLength longest subject this plugin keeps.
 */
export function sanitizeCommitMessage(text: string, maxSubjectLength = MAX_SUBJECT_LENGTH): { subject: string; body: string } {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').trim().split('\n')
  const subject = cleanSubjectLine(lines[0] ?? '', maxSubjectLength)
  const body = normalizeCommitBody(lines.slice(1).join('\n'))
  return { subject, body }
}

/**
 * A complete message for a change whose model answer was unusable, from the
 * changed files alone.
 *
 * @param files the changed files, in the order the panel lists them.
 */
export function fallbackCommitMessage(files: Array<{ path: string }>): { subject: string; body: string } {
  const list = files ?? []
  const subject = list.length === 0
    ? 'Update project files'
    : list.length === 1
      ? `Update ${basenameOf(list[0].path)}`
      : `Update ${list.length} files`
  const body = list.slice(0, 20).map((file) => `- ${file.path}`).join('\n')
  return { subject, body }
}

/**
 * Draft one commit message with a model, falling back to the changed files.
 *
 * The reasoning effort is the lowest the route advertises: one subject line and
 * a short body need no deliberation, and the user asked for the current model at
 * its cheapest setting. Any failure — no LLM service, a disabled feature, an
 * aborted request, an unusable answer — returns the file-derived message with
 * the reason recorded instead of failing the whole commit.
 */
export async function draftCommitMessage(options: DraftCommitMessageOptions): Promise<DraftedCommitMessage> {
  const {
    llm,
    route,
    sessionId = '',
    branch,
    files,
    diff,
    truncated = false,
    recentSubjects,
    locale,
    config,
    signal,
    logger,
  } = options
  const fallback = fallbackCommitMessage(files ?? [])
  const fallbackResult: DraftedCommitMessage = {
    message: composeMessage(fallback),
    subject: fallback.subject,
    body: fallback.body,
    source: 'fallback',
    model: null,
  }
  if (!isLlmService(llm)) return { ...fallbackResult, error: 'model-unavailable' }
  if (route === null || typeof route.provider !== 'string' || typeof route.model !== 'string') {
    return { ...fallbackResult, error: 'model-unavailable' }
  }
  if (config?.enabled === false) return { ...fallbackResult, error: 'model-unavailable' }

  const timeoutMs = Math.max(5000, Number(config?.timeoutMs) || 60000)
  const deadline = AbortSignal.timeout(timeoutMs)
  const combined = signal === undefined ? deadline : AbortSignal.any([signal, deadline])
  try {
    const call = await llm.prepareCall(
      { provider: route.provider, model: route.model, maxTokens: Number(config?.maxOutputTokens) || 512 },
      combined,
      (controls, model) => {
        const efforts = (model as { reasoning?: { efforts?: Array<{ id?: string }> } } | null | undefined)?.reasoning?.efforts
        const effort = efforts?.[0]?.id
        return effort === undefined ? controls : { ...controls, reasoningEffort: effort }
      },
    )
    const system = commitSystemPrompt(locale)
    const input = buildCommitInput({
      branch,
      files: files ?? [],
      recentSubjects: recentSubjects ?? [],
      diff: diff ?? '',
      truncated,
    })
    let streamed = ''
    const blocks: string[] = []
    for await (const chunk of call.stream({
      ...call.config,
      messages: [{ role: 'user', content: [{ type: 'text', text: input }] }],
      system,
      ...(sessionId.length === 0 ? {} : { sessionId }),
      signal: combined,
    })) {
      if (chunk?.type === 'text-delta' && typeof chunk.text === 'string') streamed += chunk.text
      else if (chunk?.type === 'block-end' && chunk.block?.type === 'text' && typeof chunk.block.text === 'string') {
        blocks.push(chunk.block.text)
      }
    }
    const draft = parseCommitDraft(blocks.length > 0 ? blocks.join('\n') : streamed, { fallbackSubject: fallback.subject })
    if (draft.parsed === 'fallback') return { ...fallbackResult, error: 'unparsed-answer' }
    const cleaned = sanitizeCommitMessage(
      draft.body.length > 0 ? `${draft.subject}\n\n${draft.body}` : draft.subject,
      config?.maxSubjectLength,
    )
    const subject = cleaned.subject.length > 0 ? cleaned.subject : fallback.subject
    const body = cleaned.body.length > 0 ? cleaned.body : fallback.body
    return {
      message: composeMessage({ subject, body }),
      subject,
      body,
      source: 'model',
      model: `${route.provider}/${route.model}`,
    }
  } catch (error) {
    if (signal?.aborted === true) throw error
    logger?.warn?.('git: the commit-message draft failed: %s', messageOf(error))
    return { ...fallbackResult, error: messageOf(error) }
  }
}

/** Read a model answer as a subject line: one line, no markers, no periods. */
function cleanSubjectLine(text: string, maxSubjectLength = MAX_SUBJECT_LENGTH): string {
  const single = String(text ?? '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^\*{1,3}(.*?)\*{1,3}$/, '$1')
    .trim()
    .replace(/\.+$/, '')
    .trim()
  const limit = Math.max(1, Math.trunc(maxSubjectLength))
  return single.length <= limit ? single : `${single.slice(0, limit - 1).trimEnd()}…`
}

/** Normalize a message body: line breaks kept, only the edges trimmed. */
function normalizeCommitBody(text: string): string {
  return String(text ?? '').replace(/\r\n/g, '\n').trim()
}

/** The whole commit message: the subject, a blank line, then the body. */
function composeMessage({ subject, body }: { subject: string; body: string }): string {
  return body.length > 0 ? `${subject}\n\n${body}` : subject
}

/** Last path segment, tolerant of both separator styles. */
function basenameOf(path: string): string {
  const normalized = String(path ?? '').replace(/[\\/]+$/, '')
  const index = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'))
  return index < 0 ? normalized : normalized.slice(index + 1)
}

/** Whether the composition supplied an LLM service. */
function isLlmService(value: unknown): value is LlmService {
  return value !== null && typeof value === 'object' && typeof (value as { prepareCall?: unknown }).prepareCall === 'function'
}

/** Message of an unknown thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
