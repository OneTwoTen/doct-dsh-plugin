// Screenshot the panel harness: the detail pane's scroll behaviour, the New
// Session worktree option, and the status card, in both themes.
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

const bundle = readFileSync(resolve(out, '..', 'plugin', 'dist', 'client.js'), 'utf8')
writeFileSync(resolve(out, 'git.css'), cssFrom(bundle, 'working dist/client.js'), 'utf8')

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const page = 'file:///' + out.replace(/\\/g, '/') + '/harness-panel.html'
for (const [name, theme, scroll] of [
  ['panel-detail-top', 'light', ''],
  ['panel-detail-bottom', 'light', 'bottom'],
  ['panel-dark', 'dark', 'bottom'],
]) {
  const file = resolve(out, `${name}.png`)
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=2',
    '--virtual-time-budget=2000',
    '--window-size=920,520',
    `--screenshot=${file}`,
    `${page}?theme=${theme}${scroll.length === 0 ? '' : `&scroll=${scroll}`}`,
  ], { stdio: 'ignore' })
  console.log('wrote', name + '.png')
}
