/**
 * Live subagent model policy from an OpenCode Go-style LLM catalog.
 *
 * DSH records subagent model authorization as a durable Session event holding
 * **exact** provider/model routes. The built-in settings owner samples one
 * static list when a Session is created, so a new gateway model never reaches
 * subagents. This feature replaces that sample with the provider's live
 * `listModels()` answer: every fresh top-level Session receives a policy built
 * from whatever the gateway advertises right now, and child Sessions inherit
 * the same policy from their parent.
 *
 * The feature deliberately does not own an LLM route. `dsh-opencode-go` stays
 * the adapter; this only feeds its live catalog into the subagent policy.
 */
import type { DshContext, Disposer, Logger } from '../host/dsh.ts'

/** One exact provider/model route in a subagent policy. */
export interface ModelRoute {
  provider: string
  model: string
}

/** The configuration slice driving this feature. */
export interface OpencodeSubagentFeatureConfig {
  enabled: boolean
  provider: string
}

/** The small piece of `ctx.llm` this feature uses. */
interface LlmCatalogService {
  listModels?(provider: string): Promise<readonly { id?: unknown; provider?: unknown }[]>
}

/** One Session event as the projection reads it. */
interface PolicyEvent {
  type?: string
  data?: { allowedModels?: unknown }
}

/** The Session surface needed for policy sampling. */
interface PolicySession {
  header?: { origin?: string; parentSession?: string; [key: string]: unknown }
  append?(type: string, data: unknown): void
  snapshotEvents?(): readonly PolicyEvent[]
}

/** Payload of `agent/created`. */
interface AgentCreated {
  agent?: { session?: PolicySession }
}

const POLICY_EVENT = 'subagent/model-selection-policy'

/**
 * Turn one live catalog answer into unique, non-empty exact routes.
 * Exported for a focused unit test without mounting a Host.
 */
export function allowedModelsFrom(models: readonly unknown[], provider: string): ModelRoute[] {
  const seen = new Set<string>()
  const routes: ModelRoute[] = []
  for (const entry of models) {
    if (typeof entry !== 'object' || entry === null) continue
    const id = (entry as { id?: unknown }).id
    if (typeof id !== 'string' || id.length === 0 || seen.has(id)) continue
    seen.add(id)
    routes.push({ provider, model: id })
  }
  return routes
}

/** Read an already recorded policy from a Session log, if any. */
function recordedPolicy(session: PolicySession | undefined): ModelRoute[] | undefined {
  const events = session?.snapshotEvents?.() ?? []
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index]
    if (event?.type !== POLICY_EVENT) continue
    const allowed = event.data?.allowedModels
    if (!Array.isArray(allowed)) return undefined
    const routes: ModelRoute[] = []
    const seen = new Set<string>()
    for (const raw of allowed) {
      if (typeof raw !== 'object' || raw === null) continue
      const provider = (raw as { provider?: unknown }).provider
      const model = (raw as { model?: unknown }).model
      if (typeof provider !== 'string' || provider.length === 0) continue
      if (typeof model !== 'string' || model.length === 0) continue
      const key = `${provider}\0${model}`
      if (seen.has(key)) continue
      seen.add(key)
      routes.push({ provider, model })
    }
    return routes.length > 0 ? routes : undefined
  }
  return undefined
}

/**
 * @param ctx Harness plugin context.
 * @param config normalized slice for this feature.
 * @param deps shared feature dependencies.
 */
export function mountOpencodeSubagent(
  ctx: DshContext,
  config: OpencodeSubagentFeatureConfig,
  deps: { logger: Logger },
): Disposer {
  const { logger } = deps
  const llm = ctx.get<LlmCatalogService>('llm')
  const sessions = ctx.get<{ get(sessionId: string): PolicySession | undefined }>('sessions')
  if (llm?.listModels === undefined) {
    logger.warn('personal-hub: llm.listModels unavailable; subagent models keep their existing policy')
    return () => {}
  }

  let disposed = false
  let lastKnown: ModelRoute[] = []
  const listModels = llm.listModels

  const readLive = async (): Promise<ModelRoute[]> => {
    const models = await listModels.call(llm, config.provider)
    const routes = allowedModelsFrom(models, config.provider)
    if (routes.length === 0) throw new Error(`no models advertised by ${config.provider}`)
    lastKnown = routes
    return routes
  }

  const onAgentCreated = async (payload: AgentCreated): Promise<void> => {
    if (disposed) return
    const session = payload?.agent?.session
    if (session?.append === undefined) return
    if (recordedPolicy(session) !== undefined) return

    // Children inherit the exact routes their parent was admitted with.
    if (session.header?.origin === 'subagent') {
      const parentId = session.header.parentSession
      const inherited = typeof parentId === 'string'
        ? recordedPolicy(sessions?.get(parentId))
        : undefined
      if (inherited !== undefined) {
        session.append(POLICY_EVENT, { allowedModels: inherited })
        return
      }
    }

    let allowedModels: ModelRoute[]
    try {
      allowedModels = await readLive()
    } catch (error) {
      if (lastKnown.length === 0) {
        logger.warn('personal-hub: cannot read %s models for subagents: %s', config.provider, String(error))
        return
      }
      allowedModels = lastKnown
      logger.warn('personal-hub: using last known %s models for subagents: %s', config.provider, String(error))
    }
    if (disposed) return
    session.append(POLICY_EVENT, { allowedModels })
    logger.info('personal-hub: subagent models synced from %s (%d)', config.provider, allowedModels.length)
  }

  const off = ctx.on?.('agent/created' as never, onAgentCreated as never)
  return () => {
    disposed = true
    off?.()
  }
}
