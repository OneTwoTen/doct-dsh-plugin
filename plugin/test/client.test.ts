import assert from 'node:assert/strict'
import { test } from 'node:test'

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
    // The built bundle is a script, not a module: it registers itself with the
    // page's loader when evaluated, so it has no exports to type.
    // @ts-expect-error the built client bundle has no type declarations
    await import('../dist/client.js')
  }
  assert.equal(typeof loadedSpec?.factory, 'function')
  return loadedSpec!.factory((id) => {
    if (id === 'react') return fakeReact
    throw new Error(`unexpected module ${id}`)
  }) as Record<string, unknown>
}

/** Flatten a rendered tree into its text content. */
function textOf(node: unknown): string {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  const element = node as { children?: unknown; props?: Record<string, unknown> }
  const children = element.children ?? element.props?.children
  return textOf(children)
}

/** Collect every element of one type in a rendered tree. */
function findAll(node: unknown, predicate: (element: { type?: unknown; props?: Record<string, unknown> }) => boolean, found: Array<{ type?: unknown; props?: Record<string, unknown> }> = []): Array<{ type?: unknown; props?: Record<string, unknown> }> {
  if (node === null || node === undefined || typeof node !== 'object') return found
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, found)
    return found
  }
  const element = node as { type?: unknown; props?: Record<string, unknown>; children?: unknown }
  if (predicate(element)) found.push(element)
  findAll(element.children, predicate, found)
  return found
}

/** Answer one POST with a JSON body, recording the request first. */
function stubFetch(calls: Array<{ url: string; init: { method: string; body: string; credentials: string } }>, body: unknown): () => void {
  const previous = (globalThis as Record<string, unknown>).fetch
  ;(globalThis as Record<string, unknown>).fetch = async (url: string, init: { method: string; body: string; credentials: string }) => {
    calls.push({ url, init })
    return { ok: true, status: 200, json: async () => body }
  }
  return () => {
    ;(globalThis as Record<string, unknown>).fetch = previous
  }
}

test('the client module registers the row card, the Git tab type, its body, and the header button', async () => {
  const module = await loadClient()
  assert.equal(module.name, 'personal-hub-client')
  assert.deepEqual(module.inject, ['slots', 'locale', 'remote', 'remote.credentials'])

  const registrations: Array<{ options: Record<string, unknown>; component: unknown }> = []
  const tabTypes: Array<Record<string, unknown>> = []
  const opened: string[] = []
  const slots = {
    inject: (_key: string, callback: () => unknown) => {
      callback()
      return () => {}
    },
    register: (options: Record<string, unknown>, component: unknown) => {
      registrations.push({ options, component })
      return () => {}
    },
  }
  const locale = { bind: () => (key: string) => key, register: () => () => {} }
  const gitContext = {
    get: (name: string) => name === 'sidebarRightTabs'
      ? { register: (definition: Record<string, unknown>) => { tabTypes.push(definition); return () => {} } }
      : name === 'sidebarRight'
        ? { openTab: (kind: string) => opened.push(kind) }
        : undefined,
    slots,
    locale,
    effect: (fn: () => unknown) => fn(),
  }
  const ctx = {
    remote: {
      credentials: { describe: async () => ({ ok: true, value: {} }), set: async () => {}, unset: async () => {} },
      $on: () => () => {},
    },
    locale,
    slots,
    effect: (fn: () => unknown) => fn(),
    inject: (deps: string[], callback: (scoped: unknown) => void) => {
      assert.deepEqual(deps, ['sidebarRightTabs', 'sidebarRight'])
      callback(gitContext)
    },
  }

  ;(module.apply as (value: unknown) => void)(ctx)

  const card = registrations.find((entry) => entry.options.name === 'plugins.row.config')
  assert.ok(card, 'registered into plugins.row.config')
  assert.equal(card.options.key, '@local/personal-hub#personal-hub')
  const injected = (card.options.inject as () => Record<string, unknown>)()
  assert.equal(typeof injected.api, 'object')
  assert.equal(typeof (injected.api as { overview?: unknown }).overview, 'function')
  assert.equal(typeof injected.save, 'function')
  assert.equal(typeof injected.getState, 'function')

  assert.equal(tabTypes.length, 1)
  const tab = tabTypes[0]
  assert.equal(tab.kind, 'personal-hub-git')
  assert.equal(tab.id, '@local/personal-hub/git')
  assert.equal(tab.priority, 'extension')
  assert.equal(tab.keepMounted, true)
  assert.equal((tab.title as () => string)(), 'gitTab')
  const guide = tab.guide as Array<Record<string, unknown>>
  assert.equal(guide[0].id, 'git')
  assert.equal(typeof guide[0].icon, 'function')

  const body = registrations.find((entry) => entry.options.name === 'sidebar.right.pane.tab')
  assert.ok(body, 'registered the tab body')
  assert.equal(body.options.key, '@local/personal-hub/git')
  const bodyProps = (body.options.inject as () => Record<string, unknown>)()
  assert.equal(typeof bodyProps.api, 'object')
  assert.equal(typeof bodyProps.newChat, 'function')

  const button = registrations.find((entry) => entry.options.name === 'conversation.session.header.utilities')
  assert.ok(button, 'registered the header button')
  ;(button.options.inject as () => { open(): void })().open()
  assert.deepEqual(opened, ['personal-hub-git'])
})

test('the caller posts to the Host route and unwraps the envelope', async () => {
  const module = await loadClient()
  const registrations: Array<{ options: Record<string, unknown> }> = []
  const slots = {
    inject: (_key: string, callback: () => unknown) => {
      callback()
      return () => {}
    },
    register: (options: Record<string, unknown>) => {
      registrations.push({ options })
      return () => {}
    },
  }
  const locale = { bind: () => (key: string) => key, register: () => () => {} }
  const gitContext = {
    get: (name: string) => name === 'sidebarRightTabs' ? { register: () => () => {} } : name === 'sidebarRight' ? { openTab: () => {} } : undefined,
    slots,
    locale,
    effect: (fn: () => unknown) => fn(),
  }
  ;(module.apply as (value: unknown) => void)({
    remote: {
      credentials: { describe: async () => ({ ok: true, value: {} }), set: async () => {}, unset: async () => {} },
      $on: () => () => {},
    },
    locale,
    slots,
    effect: (fn: () => unknown) => fn(),
    inject: (_deps: string[], callback: (scoped: unknown) => void) => callback(gitContext),
  })

  const body = registrations.find((entry) => entry.options.name === 'sidebar.right.pane.tab')
  const api = (body!.options.inject as () => { api: { overview(payload: unknown): Promise<unknown> } })().api
  const calls: Array<{ url: string; init: { method: string; body: string; credentials: string } }> = []
  const restore = stubFetch(calls, { ok: true, value: { ok: 'yes' } })
  try {
    const answer = await api.overview({ sessionId: 's1' })
    assert.deepEqual(answer, { ok: 'yes' })
  } finally {
    restore()
  }
  assert.equal(calls[0].url, 'api/personal-hub-git/overview')
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].init.body), { sessionId: 's1' })
  assert.equal(calls[0].init.credentials, 'same-origin')
})

test('a failed envelope becomes an error with its code, and a transport failure its own', async () => {
  const { createGitCaller, GitRequestError } = await import('../src/client/api.ts')
  const call = createGitCaller()
  const calls: Array<{ url: string; init: { method: string; body: string; credentials: string } }> = []
  const restore = stubFetch(calls, { ok: false, error: { code: 'git/not-a-repository', message: 'not here' } })
  try {
    await assert.rejects(() => call('overview', {}), (error: unknown) => {
      assert.ok(error instanceof GitRequestError)
      assert.equal(error.code, 'git/not-a-repository')
      assert.equal(error.message, 'not here')
      return true
    })
  } finally {
    restore()
  }

  const previous = (globalThis as Record<string, unknown>).fetch
  ;(globalThis as Record<string, unknown>).fetch = async () => ({ ok: false, status: 405, json: async () => ({}) })
  try {
    await assert.rejects(() => call('overview', {}), (error: unknown) => {
      assert.ok(error instanceof GitRequestError)
      assert.equal(error.code, 'connection/failed')
      assert.match(error.message, /HTTP 405/)
      return true
    })
  } finally {
    ;(globalThis as Record<string, unknown>).fetch = previous
  }
})

test('the actions control names the next step, then shows progress and success', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const GitActions = view.GitActions as (props: Record<string, unknown>) => unknown
  const base = {
    t: (key: string) => key,
    menuItems: [],
    running: false,
    progress: null,
    success: null,
    menuOpen: false,
    onToggleMenu: () => {},
    onQuick: () => {},
    onRun: () => {},
    onOpenPublish: () => {},
    onPull: () => {},
    onHint: () => {},
  }

  const quick = GitActions({ ...base, quick: { labelKey: 'gitActionCommitPushPr', disabled: false, kind: 'run_action', action: 'commit_push_pr' } })
  assert.match(textOf(quick), /gitActionCommitPushPr/)

  const disabled = GitActions({
    ...base,
    quick: { labelKey: 'gitActionCommit', disabled: true, kind: 'show_hint', hintKey: 'gitHintClean' },
  })
  assert.match(textOf(disabled), /gitHintClean/)

  const running = GitActions({
    ...base,
    quick: { labelKey: 'gitActionCommit', disabled: false, kind: 'run_action', action: 'commit' },
    running: true,
    progress: {
      actionId: 'a',
      action: 'commit_push',
      status: 'running',
      phases: ['commit', 'push'],
      phase: 'push',
      label: 'gitPhasePush',
      startedAt: Date.now() - 5000,
      finishedAt: null,
      output: ['writing objects'],
      result: null,
      error: null,
    },
  })
  assert.match(textOf(running), /gitPhasePush/)
  assert.match(textOf(running), /writing objects/)
  assert.match(textOf(running), /5s/)

  const success = GitActions({
    ...base,
    quick: { labelKey: 'gitActionCommit', disabled: false, kind: 'run_action', action: 'commit' },
    success: { title: 'Created #4', description: 'Add the panel', href: 'https://example.test/4', hrefLabel: 'gitViewPr' },
  })
  assert.match(textOf(success), /Created #4/)
  assert.match(textOf(success), /Add the panel/)
})

test('a diff file section renders its header, counts, and hunk lines', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const DiffFileSection = view.DiffFileSection as (props: Record<string, unknown>) => unknown
  const file = {
    path: 'src/deep/app.ts',
    file: {
      path: 'src/deep/app.ts',
      oldPath: null,
      additions: 2,
      deletions: 1,
      binary: false,
      meta: [],
      hunks: [{
        header: '@@ -1,2 +1,3 @@',
        section: '',
        oldStart: 1,
        oldLines: 2,
        newStart: 1,
        newLines: 3,
        lines: [
          { type: 'context', text: 'const a = 1', oldNumber: 1, newNumber: 1 },
          { type: 'del', text: 'let b = 2', oldNumber: 2, newNumber: null },
          { type: 'add', text: 'let b = 3', oldNumber: null, newNumber: 2 },
          { type: 'add', text: '', oldNumber: null, newNumber: 3 },
        ],
      }],
    },
    additions: 2,
    deletions: 1,
    binary: false,
    truncated: false,
    tooLarge: false,
    untracked: false,
    oldPath: null,
    whitespaceOnly: false,
  }
  const collapsed = DiffFileSection({
    t: (key: string) => key,
    file,
    expanded: false,
    selected: true,
    layout: 'unified',
    wrap: false,
    onToggle: () => {},
    onSelect: () => {},
    onCopied: () => {},
  })
  assert.match(textOf(collapsed), /src\/deep/)
  assert.match(textOf(collapsed), /app\.ts/)
  assert.match(textOf(collapsed), /\+2/)
  assert.match(textOf(collapsed), /−1/)

  const expanded = DiffFileSection({
    t: (key: string) => key,
    file,
    expanded: true,
    selected: true,
    layout: 'unified',
    wrap: false,
    onToggle: () => {},
    onSelect: () => {},
    onCopied: () => {},
  })
  const lines = findAll(expanded, (element) => element.props?.className === 'ph-line')
  assert.equal(lines.length, 4)
  assert.equal(lines[1].props?.['data-kind'], 'del')
  assert.equal(lines[2].props?.['data-kind'], 'add')
  assert.match(textOf(expanded), /const a = 1/)
})

test('the commit box shows the selection, the placeholder, and both commit actions', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const CommitComposer = view.CommitComposer as (props: Record<string, unknown>) => unknown
  const files = [
    { path: 'a.txt', kind: 'modified', staged: false, unstaged: true, untracked: false, conflicted: false, additions: 2, deletions: 1, binary: false, index: 'M', worktree: 'M' },
    { path: 'b.txt', kind: 'untracked', staged: false, unstaged: true, untracked: true, conflicted: false, additions: 1, deletions: 0, binary: false, index: '?', worktree: '?' },
  ]
  const composer = CommitComposer({
    t: (key: string, values?: Record<string, string | number>) => values === undefined ? key : `${key}:${Object.values(values).join(',')}`,
    api: {},
    files,
    selected: new Set(['a.txt']),
    busy: false,
    onSelectAll: () => {},
    onToggleFile: () => {},
    onCommit: () => {},
    onToast: () => {},
  })
  assert.match(textOf(composer), /gitCommitTitle/)
  assert.match(textOf(composer), /gitCommitSelected:1,2/)
  const textarea = findAll(composer, (element) => element.type === 'textarea')[0]
  assert.equal(textarea?.props?.placeholder, 'gitCommitPlaceholder')
  assert.match(textOf(composer), /gitCommitButton/)
  assert.match(textOf(composer), /gitCommitOnNewBranch/)
})

test('the worktree option shows the current checkout and the base picker', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const WorktreeOption = view.WorktreeOption as (props: Record<string, unknown>) => unknown
  const option = WorktreeOption({
    t: (key: string) => key,
    info: {
      enabled: true,
      supported: true,
      reason: null,
      sessionId: 's1',
      current: { path: '/repo/.agents/worktrees/dsh-1', branch: 'dsh-1', name: 'dsh-1', repositoryRoot: '/repo', sessionId: 's1', createdAt: 1 },
      bases: {
        local: [{ name: 'main', short: 'main', date: '', subject: 'first', current: true, remote: null }],
        remote: [],
        defaultBase: 'main',
        current: 'main',
      },
      project: { directory: '/repo', linked: false },
    },
    source: 'local',
    base: 'main',
    busy: false,
    error: '',
    notice: '',
    onEnable: () => {},
    onRemove: () => {},
    onBase: () => {},
    onSource: () => {},
  })
  assert.match(textOf(option), /dsh-1/)
  assert.match(textOf(option), /main/)
})

test('the settings form draws every switch it can save', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const MergeSettingsForm = view.MergeSettingsForm as (props: Record<string, unknown>) => unknown
  const form = MergeSettingsForm({
    t: (key: string) => key,
    settings: {
      enabled: true,
      removeWorktree: true,
      deleteBranch: false,
      archiveSession: true,
      cleanup: { enabled: false, inactiveDays: 7, whenNoCommits: true, noCommitsAfterHours: 6, keepChanges: 'tracked', deleteBranch: false },
      cleanupLast: null,
      writable: true,
      forge: 'auto',
      gitlabHosts: ['gitlab.example.com'],
      cliPath: '',
    },
    hostsText: 'gitlab.example.com',
    status: 'ready',
    error: '',
    notice: '',
    runningCleanup: false,
    onChange: () => {},
    onHostsText: () => {},
    onSave: () => {},
    onRunCleanup: () => {},
  })
  const boxes = findAll(form, (element) => element.type === 'input')
  assert.ok(boxes.length >= 4)
  assert.match(textOf(form), /gitSettingsMerged/)
  assert.match(textOf(form), /cleanupTitle/)
  assert.match(textOf(form), /gitCodeHost/)
  const hostField = findAll(form, (element) => element.type === 'input' && element.props?.value === 'gitlab.example.com')[0]
  assert.ok(hostField, 'the GitLab host field carries the saved hosts')
})

test('the worktree manager row shows the checkout, its state, and its actions', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const WorktreeRow = view.WorktreeRow as (props: Record<string, unknown>) => unknown
  const base = {
    t: (key: string, values?: Record<string, string | number>) => values === undefined ? key : `${key}:${Object.values(values).join(',')}`,
    sessionId: 'session-1',
    busy: false,
    copied: false,
    removing: false,
    deleteBranch: false,
    force: false,
    onCopy: () => {},
    onSwitch: () => {},
    onOpenChat: () => {},
    onRemove: () => {},
    onCancelRemove: () => {},
    onDeleteBranch: () => {},
    onForce: () => {},
    onConfirmRemove: () => {},
  }
  const entry = {
    path: 'C:/work/demo/.agents/worktrees/feat-panel',
    branch: 'feat-panel',
    head: 'abcdef1234',
    bare: false,
    detached: false,
    locked: false,
    prunable: false,
    current: false,
    isPool: true,
    sessionId: 'session-1',
    createdAt: Date.now(),
    changedFiles: 2,
  }
  const row = WorktreeRow({ ...base, entry, main: false })
  assert.match(textOf(row), /feat-panel/)
  assert.match(textOf(row), /wtDirty:2/)
  assert.match(textOf(row), /wtSwitchHere/)
  assert.match(textOf(row), /wtOpenChat/)
  assert.match(textOf(row), /wtRemoveAction/)
  assert.match(textOf(row), /wtThisChat/)

  const main = WorktreeRow({
    ...base,
    entry: { ...entry, path: 'C:/work/demo', branch: 'main', isPool: false, sessionId: null, current: true, changedFiles: 0 },
    main: true,
  })
  assert.match(textOf(main), /wtMain/)
  assert.match(textOf(main), /wtCurrent/)
  assert.match(textOf(main), /wtClean/)
  assert.doesNotMatch(textOf(main), /wtRemoveAction/)
})
