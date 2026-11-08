/**
 * Personal hub: one local bundle, several features.
 *
 * Feature 1 — remote control of DeepSeek Harness from Telegram: messages in an
 * authorized chat become prompts in a bound Session, and the assistant's answer
 * comes back to that chat.
 *
 * Feature 2 — a Git panel in the right Sidebar: the working tree, per-file
 * diffs, the commit log, and the code host's change requests and issues.
 *
 * Add a feature by writing `features/<name>.ts` that exports `mount(ctx, config,
 * deps)` returning a disposer, then list it in `FEATURES` below.
 */
import { normalizeConfig } from './lib/config.ts'
import type { GitConfig, TelegramConfig, WebRemoteConfig } from './lib/config.ts'
import { mountGit } from './features/git.ts'
import { mountTelegramRemote } from './features/telegram-remote.ts'
import { mountWebRemote } from './features/web-remote.ts'
import type { DshContext, Disposer, Logger } from './host/dsh.ts'

export const name = 'personal-hub'

/** Session control is the whole point of the first feature; wait for it. */
export const inject = ['sessionController']

/** What `apply` hands each feature when it mounts. */
interface FeatureDeps {
  logger: Logger
}

const FEATURES = [
  {
    key: 'telegram',
    label: 'Telegram remote control',
    mount: mountTelegramRemote,
  },
  {
    key: 'git',
    label: 'Git panel',
    mount: mountGit,
  },
  {
    key: 'webRemote',
    label: 'Web Remote',
    mount: mountWebRemote,
  },
] as const

/**
 * @param ctx Harness plugin context.
 * @param config the plugin row's configuration, normalized here.
 */
export function apply(ctx: DshContext, config: unknown): void {
  const settings = normalizeConfig(config)
  const logger = makeLogger(ctx)

  if (ctx.get('sessionController') === undefined) {
    logger.warn('personal-hub: sessionController is absent; no feature can mount')
    return
  }

  ctx.effect(() => {
    const disposers: Disposer[] = []
    for (const feature of FEATURES) {
      const featureConfig: TelegramConfig | GitConfig | WebRemoteConfig | undefined = settings[feature.key]
      if (featureConfig === undefined) continue
      // Web Remote still mounts while disabled: its settings card is the control
      // that turns it back on, and a disabled mount opens no socket.
      if (featureConfig.enabled === false && feature.key !== 'webRemote') {
        logger.info('personal-hub: %s disabled by configuration', feature.label)
        continue
      }
      try {
        // The three entries carry different configuration slices, so the
        // discriminant is what keeps each `mount` paired with its own slice.
        disposers.push(feature.key === 'telegram'
          ? feature.mount(ctx, settings.telegram, { logger })
          : feature.key === 'git'
            ? feature.mount(ctx, settings.git, { logger })
            : feature.mount(ctx, settings.webRemote, { logger }))
        logger.info('personal-hub: %s mounted', feature.label)
      } catch (error) {
        logger.error('personal-hub: %s failed to mount: %s', feature.label, message(error))
      }
    }
    return () => {
      for (const dispose of disposers) {
        try {
          dispose()
        } catch (error) {
          logger.warn('personal-hub: feature dispose failed: %s', message(error))
        }
      }
    }
  })
}

function makeLogger(ctx: DshContext): Logger {
  if (typeof ctx.logger === 'function') {
    const logger = ctx.logger('personal-hub')
    return {
      info: (...args: unknown[]) => logger.info(...args),
      warn: (...args: unknown[]) => logger.warn(...args),
      error: (...args: unknown[]) => logger.error(...args),
    }
  }
  return {
    info: (...args: unknown[]) => console.info('[personal-hub]', ...args),
    warn: (...args: unknown[]) => console.warn('[personal-hub]', ...args),
    error: (...args: unknown[]) => console.error('[personal-hub]', ...args),
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
