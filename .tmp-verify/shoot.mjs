import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const out = resolve(here)

function cssFrom(text, label) {
  const start = text.indexOf('.ph-git{display:flex')
  const tail = text.indexOf('.ph-pair[data-expired=true] .ph-pair-code', start)
  if (start < 0 || tail < 0) throw new Error(`GIT_CSS not found in ${label}`)
  const close = text.indexOf('}', tail)
  return text.slice(start, close + 1)
}

mkdirSync(out, { recursive: true })

// The committed bundle is the "before" state; the working tree is "after".
const before = execFileSync('git', ['show', 'HEAD:plugin/dist/client.js'], {
  cwd: resolve(out, '..'),
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
writeFileSync(resolve(out, 'git-before.css'), cssFrom(before, 'HEAD dist/client.js'), 'utf8')

const after = readFileSync(resolve(out, '..', 'plugin', 'dist', 'client.js'), 'utf8')
writeFileSync(resolve(out, 'git.css'), cssFrom(after, 'working dist/client.js'), 'utf8')

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const page = 'file:///' + out.replace(/\\/g, '/') + '/harness.html'
for (const [name, theme, css] of [
  ['before-light', 'light', 'git-before.css'],
  ['after-light', 'light', 'git.css'],
  ['before-dark', 'dark', 'git-before.css'],
  ['after-dark', 'dark', 'git.css'],
]) {
  const file = resolve(out, `${name}.png`)
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=2',
    '--virtual-time-budget=1500',
    '--window-size=660,190',
    `--screenshot=${file}`,
    `${page}?theme=${theme}&css=${css}`,
  ], { stdio: 'ignore' })
  console.log('wrote', name + '.png')
}
