import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const bundle = resolve(here, '..', 'plugin', 'dist', 'client.js')
const source = readFileSync(bundle, 'utf8')
const start = source.indexOf('.ph-git{display:flex')
if (start < 0) throw new Error('GIT_CSS not found in the bundle')
const end = source.indexOf('.ph-pair[data-expired=true] .ph-pair-code', start)
if (end < 0) throw new Error('GIT_CSS tail not found')
const close = source.indexOf('}', end)
if (close < 0) throw new Error('GIT_CSS terminator not found')

mkdirSync(here, { recursive: true })
writeFileSync(resolve(here, 'git.css'), source.slice(start, close + 1), 'utf8')
console.log('wrote git.css', close + 1 - start, 'bytes')
