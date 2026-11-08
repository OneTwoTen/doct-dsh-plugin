import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

/** Expand a leading `~`, `~/`, or `~\` against the OS home directory. */
export function expandHome(input: string): string {
  if (typeof input !== 'string' || input.length === 0) return input
  const value = input.trim()
  if (value === '~') return homedir()
  if (value.startsWith('~/') || value.startsWith('~\\')) return join(homedir(), value.slice(2))
  return value
}

/**
 * Resolve the DeepSeek Harness home the same way the harness does:
 * `$DSH_HOME` when set and non-blank, otherwise `~/.dsh`.
 *
 * @param env process environment to read; defaults to `process.env`
 */
export function dshHome(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) return resolve(expandHome(fromEnv))
  return join(homedir(), '.dsh')
}

/** Absolute path of this plugin's private data directory inside the harness home. */
export function pluginDataDir(name: string, env: NodeJS.ProcessEnv = process.env): string {
  return join(dshHome(env), name)
}
