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
 * Feature 3 — automatic archive: chats without a prompt for a configured number
 * of days are hidden from the Session list, and can always be restored.
 *
 * Add a feature by writing `features/<name>.ts` that exports `mount(ctx, config,
 * deps)` returning a disposer, then list it in `FEATURES` below.
 */
import { normalizeConfig } from './lib/config.ts'
import type { HubConfig } from './lib/config.ts'
import { mountAutoArchive } from './features/auto-archive.ts'
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

/** One feature this bundle mounts. */
interface HubFeature {
  key: keyof HubConfig
  label: string
  /**
   * Mount even while the configuration says off: the feature's settings card is
   * the control that turns it back on, and a disabled mount starts no work.
   */
  mountWhenDisabled?: boolean
}

const FEATURES: readonly HubFeature[] = [
  { key: 'telegram', label: 'Telegram remote control' },
  { key: 'git', label: 'Git panel' },
  { key: 'webRemote', label: 'Web Remote', mountWhenDisabled: true },
  { key: 'autoArchive', label: 'Automatic archive', mountWhenDisabled: true },
]

/**
 * Mount one feature with its own configuration slice.
 *
 * @param ctx Harness plugin context.
 * @param settings the normalized row configuration.
 * @param key which feature to mount.
 * @param deps what every feature receives.
 */
function mountFeature(
  ctx: DshContext,
  settings: HubConfig,
  key: HubFeature['key'],
  deps: FeatureDeps,
): Disposer {
  switch (key) {
    case 'telegram':
      return mountTelegramRemote(ctx, settings.telegram, deps)
    case 'git':
      return mountGit(ctx, settings.git, deps)
    case 'webRemote':
      return mountWebRemote(ctx, settings.webRemote, deps)
    case 'autoArchive':
      return mountAutoArchive(ctx, settings.autoArchive, deps)
  }
}

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
      const featureConfig = settings[feature.key]
      if (featureConfig.enabled === false && feature.mountWhenDisabled !== true) {
        logger.info('personal-hub: %s disabled by configuration', feature.label)
        continue
      }
      try {
        disposers.push(mountFeature(ctx, settings, feature.key, { logger }))
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
