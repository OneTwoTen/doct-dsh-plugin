import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * The Git panel shows issue bodies, change-request descriptions and comments as
 * Markdown, the way the code host does. These tests drive the renderer that the
 * built browser bundle exports for them.
 */

/** A React stand-in: enough to render the pure presentation helpers. */
const fakeReact = {
  createElement: (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => {
    if (typeof type === 'function') return (type as (p: Record<string, unknown>) => unknown)(props ?? {})
    return { type, props: props ?? {}, children }
  },
  Fragment: Symbol.for('fragment'),
  useState: (initial: unknown) => [typeof initial === 'function' ? (initial as () => unknown)() : initial, () => {}],
  useEffect: () => {},
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (callback: unknown) => callback,
  useRef: (value: unknown) => ({ current: value }),
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
}

/** Load the browser module with the stand-in React, once per process. */
let loadedSpec: { factory(require: (id: string) => unknown): unknown } | undefined
async function loadClient(): Promise<Record<string, unknown>> {
  if (loadedSpec === undefined) {
    ;(globalThis as Record<string, unknown>).window = {
      __ModuleLoader__: {
        load(spec: { factory(require: (id: string) => unknown): unknown }) {
          loadedSpec = spec
        },
      },
    }
    // @ts-expect-error the built client bundle has no type declarations
    await import('../dist/client.js')
  }
  assert.equal(typeof loadedSpec?.factory, 'function')
  return loadedSpec!.factory((id) => {
    if (id === 'react') return fakeReact
    throw new Error(`unexpected module ${id}`)
  }) as Record<string, unknown>
}

type Element = { type?: unknown; props?: Record<string, unknown>; children?: unknown }

/** The Markdown component the bundle exposes. */
async function markdownComponent(): Promise<(props: { text: string }) => unknown> {
  const module = await loadClient()
  const internal = module.__internal as Record<string, unknown>
  const component = internal.Markdown
  assert.equal(typeof component, 'function', 'the bundle must export Markdown for the panel')
  return component as (props: { text: string }) => unknown
}

/** Render one Markdown string. */
async function render(source: string): Promise<unknown> {
  const Markdown = await markdownComponent()
  return Markdown({ text: source })
}

/** Flatten a rendered tree into its text content. */
function textOf(node: unknown): string {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  const element = node as Element
  return textOf(element.children ?? element.props?.children)
}

/** Collect every element that matches a predicate. */
function findAll(node: unknown, predicate: (element: Element) => boolean, found: Element[] = []): Element[] {
  if (node === null || node === undefined || typeof node !== 'object') return found
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, found)
    return found
  }
  const element = node as Element
  if (predicate(element)) found.push(element)
  findAll(element.children, predicate, found)
  return found
}

/** Every element of one tag. */
function tags(node: unknown, type: string): Element[] {
  return findAll(node, (element) => element.type === type)
}

/** The one element of a tag, failing when the count differs. */
function one(node: unknown, type: string): Element {
  const found = tags(node, type)
  assert.equal(found.length, 1, `expected exactly one <${type}>, found ${found.length}`)
  return found[0]
}

test('an issue description renders its headings, list, table and code fence', async () => {
  const tree = await render([
    '## Mục tiêu',
    '',
    'Hợp nhất cách **LoveTold** lưu, suy ra, chuyển đổi.',
    '',
    '1. Canonical — `document.events`',
    '2. Quick-Flow — `event_date_lunar`',
    '',
    '| ID | Vấn đề |',
    '|---|---|',
    '| F1 | Bảng lịch âm |',
    '',
    '```ts',
    'const x: number = 1',
    '```',
  ].join('\n'))

  const heading = one(tree, 'h2')
  assert.equal(textOf(heading), 'Mục tiêu')
  assert.match(textOf(one(tree, 'strong')), /LoveTold/)
  assert.equal(textOf(one(tree, 'ol')).includes('Canonical'), true)
  assert.equal(tags(tree, 'code').length >= 2, true)
  const table = one(tree, 'table')
  assert.equal(textOf(one(table, 'thead')).trim(), 'ID Vấn đề')
  assert.equal(textOf(one(table, 'tbody')).trim(), 'F1 Bảng lịch âm')
  const pre = one(tree, 'pre')
  assert.match(textOf(pre), /const x: number = 1/)

  // The syntax is gone from the text: nothing is displayed as raw Markdown.
  const flat = textOf(tree)
  assert.equal(flat.includes('##'), false)
  assert.equal(flat.includes('**'), false)
  assert.equal(flat.includes('|---|'), false)
})

test('inline code, emphasis, strikethrough and links become elements', async () => {
  const tree = await render('A **bold**, *italic*, ~~gone~~, `code` and [site](https://example.com).')
  assert.equal(textOf(one(tree, 'strong')), 'bold')
  assert.equal(textOf(one(tree, 'em')), 'italic')
  assert.equal(textOf(one(tree, 'del')), 'gone')
  assert.equal(textOf(one(tree, 'code')), 'code')
  const link = one(tree, 'a')
  assert.equal(link.props?.href, 'https://example.com')
  assert.equal(link.props?.target, '_blank')
  assert.equal(link.props?.rel, 'noreferrer noopener')
})

test('a scripted link stays plain text', async () => {
  const tree = await render('[click](javascript:alert(1))')
  assert.equal(tags(tree, 'a').length, 0)
  assert.match(textOf(tree), /click/)
})

test('an image with an unsafe source is not fetched', async () => {
  const trusted = await render('![shot](https://example.com/a.png)')
  const image = one(trusted, 'img')
  assert.equal(image.props?.src, 'https://example.com/a.png')
  assert.equal(image.props?.alt, 'shot')

  const unsafe = await render('![shot](javascript:alert(1))')
  assert.equal(tags(unsafe, 'img').length, 0)
})

test('raw HTML is dropped instead of executed, and its text survives', async () => {
  const tree = await render('<img src=x onerror=alert(1)>hello <b>there</b>')
  assert.equal(tags(tree, 'img').length, 0)
  assert.equal(tags(tree, 'b').length, 0)
  assert.match(textOf(tree), /hello/)
  assert.match(textOf(tree), /there/)
})

test('two trailing spaces break a line, a plain newline wraps it', async () => {
  const hard = await render('one  \ntwo')
  assert.equal(tags(hard, 'br').length, 1)
  assert.match(textOf(hard), /one/)
  assert.match(textOf(hard), /two/)

  const soft = await render('one\ntwo')
  assert.equal(tags(soft, 'br').length, 0)
  assert.equal(textOf(one(soft, 'p')).trim(), 'one two')
})

test('a fenced block keeps its Markdown literal', async () => {
  const tree = await render('```\n**not bold** [not a link](https://example.com)\n```')
  assert.equal(tags(tree, 'strong').length, 0)
  assert.equal(tags(tree, 'a').length, 0)
  assert.match(textOf(one(tree, 'pre')), /\*\*not bold\*\*/)
})

test('a table aligns its columns and pads a short row', async () => {
  const tree = await render('| a | b |\n|:--|--:|\n| 1 |')
  const headers = tags(tree, 'th')
  assert.equal(headers.length, 2)
  assert.deepEqual(headers[0].props?.style, { textAlign: 'left' })
  assert.deepEqual(headers[1].props?.style, { textAlign: 'right' })
  const cells = tags(tree, 'td')
  assert.equal(cells.length, 2)
  assert.equal(textOf(cells[1]), '')
})

test('a task list marks done items and nests inside an item', async () => {
  const tree = await render('- [x] shipped\n- [ ] pending\n  - nested')
  const checks = findAll(tree, (element) => element.props?.className === 'ph-md-task')
  assert.deepEqual(checks.map((check) => check.props?.['data-done']), ['true', 'false'])
  const lists = tags(tree, 'ul')
  assert.equal(lists.length, 2, 'the nested list is its own list')
  assert.equal(tags(tree, 'li').length, 3)
  assert.equal(tags(lists[1], 'li').length, 1)
  assert.match(textOf(lists[1]), /nested/)
})

test('a list separated by blank lines stays one list', async () => {
  const tree = await render('- a\n\n- b')
  assert.equal(tags(tree, 'ul').length, 1)
  assert.equal(tags(tree, 'li').length, 2)
})

test('an ordered list keeps its starting number', async () => {
  const tree = await render('3. three\n4. four')
  const list = one(tree, 'ol')
  assert.equal(list.props?.start, 3)
  assert.equal(tags(list, 'li').length, 2)
})

test('a bare URL becomes a link without swallowing the sentence', async () => {
  const tree = await render('see https://github.com/OneTwoTen/your-invitations/issues/980.')
  const link = one(tree, 'a')
  assert.equal(link.props?.href, 'https://github.com/OneTwoTen/your-invitations/issues/980')
  assert.equal(textOf(link), 'https://github.com/OneTwoTen/your-invitations/issues/980')
})

test('block quotes nest their own blocks', async () => {
  const tree = await render('> quoted **text**\n> - item')
  const quote = one(tree, 'blockquote')
  assert.match(textOf(quote), /quoted/)
  assert.equal(tags(quote, 'strong').length, 1)
  assert.equal(tags(quote, 'ul').length, 1)
})

test('Windows line endings and an empty body are handled', async () => {
  const windows = await render('first\r\n\r\nsecond')
  assert.equal(tags(windows, 'p').length, 2)
  assert.equal(textOf(windows).includes('\r'), false)

  const empty = await render('')
  assert.equal(textOf(empty), '')
})

test('the shipped bundle builds elements, never HTML strings', async () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const bundle = await readFile(join(here, '..', 'dist', 'client.js'), 'utf8')
  assert.equal(bundle.includes('dangerouslySetInnerHTML'), false)
  assert.equal(bundle.includes('data-personal-hub-markdown'), true)
})
