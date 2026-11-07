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
 * Add a feature by writing `features/<name>.js` that exports `mount(ctx, config,
 * deps)` returning a disposer, then list it in `FEATURES` below.
 */
import { normalizeConfig } from './lib/config.js'
import { mountGit } from './features/git.js'
import { mountTelegramRemote } from './features/telegram-remote.js'

export const name = 'personal-hub'

/** Session control is the whole point of the first feature; wait for it. */
export const inject = ['sessionController']

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
]

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {unknown} config
 */
export function apply(ctx, config) {
  const settings = normalizeConfig(config)
  const logger = makeLogger(ctx)

  if (ctx.get('sessionController') === undefined) {
    logger.warn('personal-hub: sessionController is absent; no feature can mount')
    return
  }

  ctx.effect(() => {
    const disposers = []
    for (const feature of FEATURES) {
      const featureConfig = settings[feature.key]
      if (featureConfig === undefined) continue
      if (featureConfig.enabled === false) {
        logger.info('personal-hub: %s disabled by configuration', feature.label)
        continue
      }
      try {
        disposers.push(feature.mount(ctx, featureConfig, { logger }))
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

function makeLogger(ctx) {
  if (typeof ctx.logger === 'function') {
    const logger = ctx.logger('personal-hub')
    return {
      info: (...args) => logger.info(...args),
      warn: (...args) => logger.warn(...args),
      error: (...args) => logger.error(...args),
    }
  }
  return {
    info: (...args) => console.info('[personal-hub]', ...args),
    warn: (...args) => console.warn('[personal-hub]', ...args),
    error: (...args) => console.error('[personal-hub]', ...args),
  }
}

function message(error) {
  return error instanceof Error ? error.message : String(error)
}
