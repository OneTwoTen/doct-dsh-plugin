import assert from 'node:assert/strict'
import { test } from 'node:test'

/** A React stand-in: enough to render the pure presentation helpers. */
const fakeReact = {
  createElement: (type, props, ...children) => {
    if (typeof type === 'function') return type(props ?? {})
    return { type, props: props ?? {}, children }
  },
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useCallback: (callback) => callback,
  useMemo: (factory) => factory(),
  useRef: (value) => ({ current: value }),
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
}

/** Load the browser module with the stand-in React, once per process. */
let loadedSpec
async function loadClient() {
  if (loadedSpec === undefined) {
    globalThis.window = {
      __ModuleLoader__: {
        load(spec) {
          loadedSpec = spec
        },
      },
    }
    await import('../client.js')
  }

  assert.equal(typeof loadedSpec?.factory, 'function')
  return loadedSpec.factory((id) => {
    if (id === 'react') return fakeReact
    throw new Error(`unexpected module ${id}`)
  })
}

/** Flatten a rendered tree into its text content. */
function textOf(node) {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  return textOf(node.children)
}

/** Collect every element of one type in a rendered tree. */
function findAll(node, predicate, found = []) {
  if (node === null || node === undefined || typeof node !== 'object') return found
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, found)
    return found
  }
  if (predicate(node)) found.push(node)
  findAll(node.children, predicate, found)
  return found
}

test('the client module registers a row config card for the bundle row', async () => {
  const module = await loadClient()

  assert.deepEqual(module.inject.includes('slots'), true)
  assert.equal(typeof module.apply, 'function')

  const registrations = []
  const remote = {
    credentials: {
      describe: async () => ({ ok: true, value: { DSH_TELEGRAM_BOT_TOKEN: { configured: true, writable: true } } }),
      set: async () => {},
      unset: async () => {},
    },
    $on: () => () => {},
  }
  const ctx = {
    remote,
    locale: {
      bind: () => (key) => key,
      register: () => () => {},
    },
    slots: {
      inject: (key, callback) => {
        callback()
        return () => {}
      },
      register: (options, component) => {
        registrations.push({ options, component })
        return () => {}
      },
    },
    effect: (fn) => {
      const dispose = fn()
      return () => dispose?.()
    },
  }

  module.apply(ctx)

  const card = registrations.find((entry) => entry.options.name === 'plugins.row.config')
  assert.ok(card, 'registered into plugins.row.config')
  assert.equal(card.options.key, '@local/personal-hub#personal-hub')
  const injected = card.options.inject()
  assert.equal(typeof injected.save, 'function')
  assert.equal(typeof injected.getState, 'function')
  assert.equal(typeof injected.subscribe, 'function')
  assert.equal(typeof card.component, 'function')
})

/** Answer one POST with a JSON body, recording the request first. */
function stubFetch(calls, body) {
  const previous = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return {
      ok: true,
      status: 200,
      json: async () => body,
    }
  }
  return () => {
    globalThis.fetch = previous
  }
}

test('the client module registers the Git tab type, its body, and the header button', async () => {
  const module = await loadClient()

  const registrations = []
  const tabTypes = []
  const opened = []
  const slots = {
    inject: (key, callback) => {
      callback()
      return () => {}
    },
    register: (options, component) => {
      registrations.push({ options, component })
      return () => {}
    },
  }
  const locale = {
    bind: () => (key) => key,
    register: () => () => {},
  }
  const calls = []
  const gitContext = {
    sidebarRightTabs: {
      register: (definition) => {
        tabTypes.push(definition)
        return () => {}
      },
    },
    sidebarRight: {
      openTab: (kind) => opened.push(kind),
    },
    slots,
    locale,
    effect: (fn) => {
      fn()
      return () => {}
    },
  }

  const ctx = {
    remote: {
      credentials: { describe: async () => ({ ok: true, value: {} }), set: async () => {}, unset: async () => {} },
      $on: () => () => {},
    },
    locale,
    slots,
    effect: (fn) => {
      fn()
      return () => {}
    },
    inject: (deps, callback) => {
      assert.deepEqual(deps, ['sidebarRightTabs', 'sidebarRight'])
      callback(gitContext)
    },
  }

  module.apply(ctx)

  assert.equal(tabTypes.length, 1)
  const tab = tabTypes[0]
  assert.equal(tab.kind, 'personal-hub-git')
  assert.equal(tab.id, '@local/personal-hub/git')
  assert.equal(tab.priority, 'extension')
  assert.equal(tab.keepMounted, true)
  assert.equal(typeof tab.title, 'function')
  assert.equal(tab.title(), 'gitTab')
  assert.equal(tab.guide.length, 1)
  assert.equal(tab.guide[0].id, 'git')
  assert.equal(typeof tab.guide[0].icon, 'function')
  assert.equal(tab.guide[0].title(), 'gitGuide')

  const body = registrations.find((entry) => entry.options.name === 'sidebar.right.pane.tab')
  assert.ok(body, 'registered the tab body')
  assert.equal(body.options.key, '@local/personal-hub/git')
  const bodyProps = body.options.inject()
  assert.equal(typeof bodyProps.call, 'function')
  assert.equal(typeof body.component, 'function')

  // The injected caller posts to the Host route and unwraps the result envelope.
  const restore = stubFetch(calls, { ok: true, value: {} })
  try {
    const answer = await bodyProps.call('overview', { sessionId: 's1' })
    assert.deepEqual(answer, {})
  } finally {
    restore()
  }
  assert.equal(calls[0].url, 'api/personal-hub-git/overview')
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].init.body), { sessionId: 's1' })
  assert.equal(calls[0].init.credentials, 'same-origin')

  const button = registrations.find((entry) => entry.options.name === 'conversation.session.header.utilities')
  assert.ok(button, 'registered the header button')
  assert.equal(button.options.id, 'personal-hub-git')
  button.options.inject().open()
  assert.deepEqual(opened, ['personal-hub-git'])
})

test('the injected caller turns a failed envelope into an error with its code', async () => {
  const module = await loadClient()
  const registrations = []
  const slots = {
    inject: (_key, callback) => {
      callback()
      return () => {}
    },
    register: (options, component) => {
      registrations.push({ options, component })
      return () => {}
    },
  }
  const locale = { bind: () => (key) => key, register: () => () => {} }
  const gitContext = {
    sidebarRightTabs: { register: () => () => {} },
    sidebarRight: { openTab: () => {} },
    slots,
    locale,
    effect: (fn) => fn(),
  }
  module.apply({
    remote: {
      credentials: { describe: async () => ({ ok: true, value: {} }), set: async () => {}, unset: async () => {} },
      $on: () => () => {},
    },
    locale,
    slots,
    effect: (fn) => fn(),
    inject: (_deps, callback) => callback(gitContext),
  })

  const body = registrations.find((entry) => entry.options.name === 'sidebar.right.pane.tab')
  const { call } = body.options.inject()
  const calls = []
  const restore = stubFetch(calls, { ok: false, error: { code: 'git/not-a-repository', message: 'not here' } })
  try {
    await assert.rejects(() => call('overview', {}), (error) => {
      assert.equal(error.code, 'git/not-a-repository')
      assert.equal(error.message, 'not here')
      return true
    })
  } finally {
    restore()
  }
})

test('the injected caller reports an unreachable Host as a connection failure', async () => {
  const module = await loadClient()
  const registrations = []
  const slots = {
    inject: (_key, callback) => {
      callback()
      return () => {}
    },
    register: (options, component) => {
      registrations.push({ options, component })
      return () => {}
    },
  }
  const locale = { bind: () => (key) => key, register: () => () => {} }
  const gitContext = {
    sidebarRightTabs: { register: () => () => {} },
    sidebarRight: { openTab: () => {} },
    slots,
    locale,
    effect: (fn) => fn(),
  }
  module.apply({
    remote: {
      credentials: { describe: async () => ({ ok: true, value: {} }), set: async () => {}, unset: async () => {} },
      $on: () => () => {},
    },
    locale,
    slots,
    effect: (fn) => fn(),
    inject: (_deps, callback) => callback(gitContext),
  })

  const body = registrations.find((entry) => entry.options.name === 'sidebar.right.pane.tab')
  const { call } = body.options.inject()
  const previous = globalThis.fetch
  globalThis.fetch = async () => ({ ok: false, status: 405, json: async () => ({}) })
  try {
    await assert.rejects(() => call('overview', {}), (error) => {
      assert.equal(error.code, 'connection/failed')
      assert.match(error.message, /HTTP 405/)
      return true
    })
  } finally {
    globalThis.fetch = previous
  }
})

test('the git panel renders its header, file groups, and a diff without a browser', async () => {
  const module = await loadClient()
  const view = module.__internal

  const overview = {
    repo: {
      root: 'C:\\work\\demo',
      name: 'demo',
      branch: 'feature/git',
      detached: false,
      upstream: 'origin/feature/git',
      ahead: 2,
      behind: 1,
      shortOid: 'abcdef12',
      remote: { slug: 'owner/demo', provider: 'github' },
    },
    stats: { files: 3, additions: 12, deletions: 4, staged: 1, unstaged: 2, untracked: 1, conflicted: 0 },
    stash: 1,
    files: [
      { path: 'src/app.js', kind: 'modified', staged: false, unstaged: true, additions: 8, deletions: 4 },
      { path: 'README.md', kind: 'added', staged: true, unstaged: false, additions: 4, deletions: 0 },
      { path: 'notes/todo.txt', kind: 'untracked', untracked: true, staged: false, unstaged: true, additions: 2, deletions: 0 },
    ],
    branchPull: { number: 7, title: 'Add the panel', state: 'open' },
  }

  const header = view.GitHeader({ t: (key) => key, overview, refreshing: false, onRefresh: () => {}, onOpenPull: () => {} })
  const headerText = textOf(header)
  assert.match(headerText, /demo/)
  assert.match(headerText, /feature\/git/)
  assert.match(headerText, /↑2/)
  assert.match(headerText, /↓1/)
  assert.match(headerText, /#7/)

  const nav = view.GitNav({ t: (key) => key, value: 'changes', onChange: () => {}, overview })
  assert.equal(findAll(nav, (node) => node.type === 'button').length, 4)

  const changes = view.ChangesView({ t: (key) => key, overview, onSelect: () => {}, selection: null })
  const rows = findAll(changes, (node) => node.props?.className === 'ph-file')
  assert.equal(rows.length, 3)
  const groups = findAll(changes, (node) => node.props?.className === 'ph-section')
  assert.equal(groups.length, 3, 'staged, unstaged, and untracked groups')
  assert.match(textOf(groups[0]), /gitStaged/)

  const row = view.FileRow({
    t: (key, params) => `${key}:${params?.path ?? ''}`,
    file: { path: 'src/deep/app.js', kind: 'modified', additions: 3, deletions: 1 },
    active: false,
    onSelect: () => {},
  })
  assert.match(textOf(row), /src\/deep\//)
  assert.match(textOf(row), /app\.js/)
  assert.match(textOf(row), /\+3/)
  assert.match(textOf(row), /−1/)

  const patch = {
    path: 'src/app.js',
    additions: 2,
    deletions: 1,
    hunks: [{
      header: '@@ -1,2 +1,3 @@',
      lines: [
        { type: 'context', text: 'const a = 1', oldNumber: 1, newNumber: 1 },
        { type: 'del', text: 'let b = 2', oldNumber: 2, newNumber: null },
        { type: 'add', text: 'let b = 3', oldNumber: null, newNumber: 2 },
        { type: 'add', text: '', oldNumber: null, newNumber: 3 },
      ],
    }],
  }
  const diff = view.PatchBody({ t: (key) => key, files: [patch], truncated: false })
  const lines = findAll(diff, (node) => node.props?.className === 'ph-line')
  assert.equal(lines.length, 4)
  assert.equal(lines[1].props['data-kind'], 'del')
  assert.equal(lines[2].props['data-kind'], 'add')
  assert.match(textOf(diff), /const a = 1/)

  const truncated = view.PatchBody({ t: (key) => key, files: [{ path: 'x', hunks: [], binary: true }], truncated: true })
  assert.match(textOf(truncated), /gitBinary/)
  assert.match(textOf(truncated), /gitTooLarge/)

  const pull = view.PullRow({
    t: (key, params) => (params === undefined ? key : `${key}:${Object.values(params).join(',')}`),
    pull: {
      number: 7,
      title: 'Add the panel',
      state: 'open',
      author: 'ada',
      branch: 'feature/git',
      updatedAt: new Date().toISOString(),
      checks: { state: 'success', total: 2, success: 2, failure: 0, pending: 0 },
      review: 'approved',
    },
    onSelect: () => {},
  })
  assert.match(textOf(pull), /#7/)
  assert.match(textOf(pull), /gitChecksSuccess:2/)
  assert.match(textOf(pull), /gitReviewApproved/)

  const check = view.CheckRow({ check: { name: 'build', state: 'success', url: null, description: 'ci', startedAt: '2024-01-01T00:00:00Z', completedAt: '2024-01-01T00:00:42Z' } })
  assert.match(textOf(check), /build/)
  assert.match(textOf(check), /42s/)

  const empty = view.Empty({ icon: 'check', title: 'clean', hint: 'nothing' })
  assert.match(textOf(empty), /clean/)
  assert.match(textOf(empty), /nothing/)

  const failure = view.Failure({ error: Object.assign(new Error('boom'), { code: 'git/failed' }), title: 'bad', onRetry: () => {} })
  assert.match(textOf(failure), /boom/)
  assert.match(textOf(failure), /git\/failed/)
})
