import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const bundle = join(here, '..', 'dist', 'client.js')

/** Pull the GIT_CSS template literal out of the built client bundle. */
async function gitCss(): Promise<string> {
  const text = await readFile(bundle, 'utf8')
  const marker = 'var GIT_CSS = `'
  const start = text.indexOf(marker)
  assert.ok(start >= 0, 'the client bundle must carry the Git stylesheet')
  const body = start + marker.length
  const end = text.indexOf('`', body)
  assert.ok(end > body, 'the Git stylesheet must be terminated')
  return text.slice(body, end)
}

test('split rows wrap inside their column even with the wrap switch off', async () => {
  const css = await gitCss()
  const selector = '.ph-diff[data-wrap=false] .ph-split .ph-side'
  assert.ok(css.includes(selector), 'no-wrap split rows need their own rule')
  const start = css.indexOf(selector)
  const declaration = css.slice(start, css.indexOf('}', start))
  // white-space:pre keeps a long line at its full width and prints it over
  // the next column, so the two halves of a row overlap and both are unreadable.
  assert.match(declaration, /white-space:pre-wrap/, 'split rows must wrap in their own half')
  assert.match(declaration, /overflow-wrap:anywhere/, 'an overlong single token must break too')
})
