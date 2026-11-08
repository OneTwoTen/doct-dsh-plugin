/**
 * Build the two artifacts this bundle ships.
 *
 * `dist/index.js` is the Host half: one Node ESM bundle, so the profile can
 * resolve a single entry. `dist/client.js` is the browser half: one IIFE that
 * registers a lazy factory with the page's module loader, exactly as the
 * Harness client expects. React is never bundled; the loader's `require`
 * supplies it.
 *
 * Usage: node scripts/build.mjs [--watch]
 */
import { build, context } from 'esbuild'
import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const dist = join(root, 'dist')
const watch = process.argv.includes('--watch')

/** Host bundle: Node ESM, every package left to the runtime. */
const host = {
  entryPoints: [join(root, 'src/index.ts')],
  outfile: join(dist, 'index.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  logLevel: 'info',
  legalComments: 'none',
}

/**
 * Browser bundle: one IIFE whose entry calls `window.__ModuleLoader__.load`.
 * `require('react')` stays a call to the factory's own `require`, because the
 * source never imports React and esbuild leaves the free identifier alone.
 */
const client = {
  entryPoints: [join(root, 'src/client/entry.ts')],
  outfile: join(dist, 'client.js'),
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  // JSX compiles to the runtime's own `h`, the same call the hand-written
  // elements use; React is never imported, so the page's instance is the only one.
  jsx: 'transform',
  jsxFactory: 'h',
  logLevel: 'info',
  legalComments: 'none',
}

if (watch) {
  const hostContext = await context(host)
  const clientContext = await context(client)
  await Promise.all([hostContext.watch(), clientContext.watch()])
  console.log('[personal-hub] watching src/ for changes')
} else {
  await rm(dist, { recursive: true, force: true })
  await Promise.all([build(host), build(client)])
  console.log('[personal-hub] built dist/index.js and dist/client.js')
}
