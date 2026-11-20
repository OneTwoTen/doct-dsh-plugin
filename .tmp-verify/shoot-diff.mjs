// Screenshot a long diff scrolled sideways: the committed bundle is the "before"
// state, the working tree the "after". In the bug the add/delete tint stopped
// where the row box ended while the code kept overflowing to the right, and the
// line numbers scrolled out of view; both are visible in the same harness page.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const out = resolve(here)

/** Pull the `GIT_CSS` template literal out of the built client bundle. */
function cssFrom(text, label) {
  const start = text.indexOf('.ph-git{display:flex')
  const tail = text.indexOf('.ph-pair[data-expired=true] .ph-pair-code', start)
  if (start < 0 || tail < 0) throw new Error(`GIT_CSS not found in ${label}`)
  const close = text.indexOf('}', tail)
  return text.slice(start, close + 1)
}

const before = execFileSync('git', ['show', 'HEAD:plugin/dist/client.js'], {
  cwd: resolve(out, '..'),
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
writeFileSync(resolve(out, 'git-diff-before.css'), cssFrom(before, 'HEAD dist/client.js'), 'utf8')

const after = readFileSync(resolve(out, '..', 'plugin', 'dist', 'client.js'), 'utf8')
writeFileSync(resolve(out, 'git-diff-after.css'), cssFrom(after, 'working dist/client.js'), 'utf8')

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const page = 'file:///' + out.replace(/\\/g, '/') + '/harness-diff.html'
for (const [name, css] of [
  ['diff-scroll-before', 'git-diff-before.css'],
  ['diff-scroll-after', 'git-diff-after.css'],
]) {
  const file = resolve(out, `${name}.png`)
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--force-device-scale-factor=2',
    '--virtual-time-budget=2000',
    '--window-size=620,600',
    `--screenshot=${file}`,
    `${page}?css=${css}&scroll=max`,
  ], { stdio: 'ignore' })
  console.log('wrote', name + '.png')
}
