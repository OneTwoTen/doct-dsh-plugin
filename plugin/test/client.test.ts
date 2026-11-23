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
  const locale = { bind: () => (key: string) => key, register: () => () => {}, addLanguage: () => () => {} }
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
  assert.equal(typeof injected.webRemote, 'object')
  assert.equal(typeof (injected.webRemote as { state?: unknown }).state, 'function')
  assert.equal(typeof (injected.webRemote as { unpair?: unknown }).unpair, 'function')
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

  // The New Session row records what the first message should do, and the
  // status card above the composer reports the creation it starts.
  const option = registrations.find((entry) => entry.options.name === 'conversation.hero.options')
  assert.ok(option, 'registered the New Session worktree option')
  assert.equal(typeof (option.options.inject as () => Record<string, unknown>)().api, 'object')
  const dock = registrations.find((entry) => entry.options.name === 'conversation.input.dock')
  assert.ok(dock, 'registered the worktree status card')
  assert.equal(typeof (dock.options.inject as () => Record<string, unknown>)().api, 'object')
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
  const locale = { bind: () => (key: string) => key, register: () => () => {}, addLanguage: () => () => {} }
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

test('the Git caller can force a rescan and reach the checkout-state routes', async () => {
  const { createGitApi, createGitCaller } = await import('../src/client/api.ts')
  const api = createGitApi(createGitCaller())
  const calls: Array<{ url: string; init: { method: string; body: string; credentials: string } }> = []
  const restore = stubFetch(calls, {
    ok: true,
    value: {
      workspaceRoot: '/work',
      kind: 'multi',
      isolation: true,
      context: null,
      contextMissing: false,
      repos: [],
      warnings: [],
    },
  })
  try {
    await api.repos({ sessionId: 's1', refresh: true })
    const state = await api.checkoutState({ sessionId: 's1' })
    assert.equal(state.contextMissing, false)
    await api.contextRepair({ sessionId: 's1' })
  } finally {
    restore()
  }
  assert.deepEqual(calls.map((call) => call.url), [
    'api/personal-hub-git/repos',
    'api/personal-hub-git/checkoutState',
    'api/personal-hub-git/contextRepair',
  ])
  assert.deepEqual(JSON.parse(calls[0].init.body), { sessionId: 's1', refresh: true })
  assert.deepEqual(JSON.parse(calls[1].init.body), { sessionId: 's1' })
  assert.deepEqual(JSON.parse(calls[2].init.body), { sessionId: 's1' })
  for (const call of calls) assert.equal(call.init.credentials, 'same-origin')
})

test('the workspace changes route posts its scope to its own endpoint', async () => {
  const { createGitApi, createGitCaller } = await import('../src/client/api.ts')
  const api = createGitApi(createGitCaller())
  const calls: Array<{ url: string; init: { method: string; body: string; credentials: string } }> = []
  const restore = stubFetch(calls, {
    ok: true,
    value: { workspaceRoot: '/work', scope: 'branch', repos: [], warnings: [] },
  })
  try {
    const result = await api.workspaceChanges({ sessionId: 's1', scope: 'branch', includeDiff: true })
    assert.equal(result.scope, 'branch')
  } finally {
    restore()
  }
  assert.equal(calls[0].url, 'api/personal-hub-git/workspaceChanges')
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].init.body), { sessionId: 's1', scope: 'branch', includeDiff: true })
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

test('a changed file offers stage, unstage, and discard in the working scope', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const DiffFileSection = view.DiffFileSection as (props: Record<string, unknown>) => unknown
  const file = {
    path: 'src/a.ts',
    file: null,
    additions: 1,
    deletions: 0,
    binary: false,
    truncated: false,
    tooLarge: false,
    untracked: false,
    oldPath: null,
    whitespaceOnly: false,
  }
  const calls: string[] = []
  const base = {
    t: (key: string) => key,
    file,
    expanded: false,
    selected: true,
    layout: 'unified',
    wrap: false,
    onToggle: () => {},
    onSelect: () => {},
    onCopied: () => {},
    onStage: () => calls.push('stage'),
    onUnstage: () => calls.push('unstage'),
    onDiscard: () => calls.push('discard'),
  }
  const unstaged = DiffFileSection({ ...base, staged: false })
  const buttons = findAll(unstaged, (element) => element.type === 'button')
  const byTitle = (title: string) => buttons.find((button) => button.props?.title === title)
  assert.ok(byTitle('gitStage'), 'an unstaged file offers Stage')
  assert.equal(byTitle('gitUnstage'), undefined)
  assert.ok(byTitle('gitDiscard'))
  ;(byTitle('gitStage')?.props?.onClick as (event: unknown) => void)({ stopPropagation() {} })
  ;(byTitle('gitDiscard')?.props?.onClick as (event: unknown) => void)({ stopPropagation() {} })
  assert.deepEqual(calls, ['stage', 'discard'])

  const staged = DiffFileSection({ ...base, staged: true })
  const stagedButtons = findAll(staged, (element) => element.type === 'button')
  assert.ok(stagedButtons.some((button) => button.props?.title === 'gitUnstage'), 'a staged file offers Unstage')
  assert.equal(stagedButtons.some((button) => button.props?.title === 'gitStage'), false)

  // The branch scope renders the same file without working-tree actions.
  const branch = DiffFileSection({ ...base, onStage: undefined, onUnstage: undefined, onDiscard: undefined })
  const branchButtons = findAll(branch, (element) => element.type === 'button')
  assert.equal(branchButtons.some((button) => button.props?.title === 'gitStage'), false)
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

test('the worktree option asks for a checkout on send instead of making one now', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const WorktreeOption = view.WorktreeOption as (props: Record<string, unknown>) => unknown
  const toggles: boolean[] = []
  const option = WorktreeOption({
    t: (key: string) => key,
    info: {
      enabled: true,
      supported: true,
      reason: null,
      sessionId: 's1',
      current: null,
      bases: {
        local: [{ name: 'main', short: 'main', date: '', subject: 'first', current: true, remote: null }],
        remote: [{ name: 'origin/main', remote: 'origin', branch: 'main', short: 'main', date: '' }],
        defaultBase: 'main',
        current: 'main',
      },
      project: { directory: '/repo', linked: false },
      auto: true,
      request: null,
      creating: null,
      started: false,
    },
    source: 'remote',
    base: 'main',
    wanted: true,
    busy: false,
    error: '',
    notice: '',
    onToggle: (next: boolean) => toggles.push(next),
    onBase: () => {},
    onSource: () => {},
  })
  assert.match(textOf(option), /wtAuto/)
  assert.match(textOf(option), /main/)
  const box = findAll(option, (element) => element.type === 'input')[0]
  assert.equal(box?.props?.checked, true)
  ;(box?.props?.onChange as (event: { target: { checked: boolean } }) => void)({ target: { checked: false } })
  assert.deepEqual(toggles, [false])
  // Nothing is created while the chat is being written: the row has no create button.
  assert.equal(findAll(option, (element) => /wtOption|wtBusy/.test(textOf(element))).length, 0)
})

test('the worktree status card reports a creation, its success, and its failure', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const WorktreeDockCard = view.WorktreeDockCard as (props: Record<string, unknown>) => unknown
  const t = (key: string, values?: Record<string, string | number>) => values === undefined ? key : `${key}:${Object.values(values).join(',')}`
  const shared = { t, busy: false, error: '', onRetry: () => {}, onContinue: () => {}, onDismiss: () => {} }

  // A message waits while the checkout is created.
  const creating = WorktreeDockCard({
    ...shared,
    creating: { phase: 'create', branch: 'dsh-ab12-cd34', base: 'main', remote: 'origin', source: 'remote', startedAt: 1 },
    request: { enabled: true, base: 'main', source: 'remote', explicit: false, error: null, createdAt: 1, updatedAt: 1 },
    created: '',
  })
  assert.match(textOf(creating), /wtDockCreating:dsh-ab12-cd34/)
  assert.match(textOf(creating), /wtDockHint:origin\/main/)
  assert.equal((creating as { props: Record<string, unknown> }).props['data-tone'], 'busy')

  // A failure keeps the message in the project and offers the two ways out.
  const failed = WorktreeDockCard({
    ...shared,
    creating: null,
    request: { enabled: true, base: 'main', source: 'remote', explicit: true, error: 'worktree/no-remote: no remote', createdAt: 1, updatedAt: 2 },
    created: '',
  })
  assert.match(textOf(failed), /wtDockFailed/)
  assert.match(textOf(failed), /wtDockRetry/)
  assert.match(textOf(failed), /wtDockContinue/)
  assert.equal((failed as { props: Record<string, unknown> }).props['data-tone'], 'error')

  // The success names the branch, and the card then stays out of the way.
  const done = WorktreeDockCard({ ...shared, creating: null, request: null, created: 'feat/page' })
  assert.match(textOf(done), /wtDockCreated:feat\/page/)
  assert.equal(WorktreeDockCard({ ...shared, creating: null, request: null, created: '' }), null)
})

test('the worktree option shows the checkout a chat already has', async () => {
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
      current: { path: '/repo/.agents/worktrees/dsh-1', branch: 'feat/x', name: 'dsh-1', repositoryRoot: '/repo', sessionId: 's1', createdAt: 1 },
      bases: null,
      project: { directory: '/repo', linked: false },
      auto: true,
      request: null,
      creating: null,
      started: false,
    },
    source: 'local',
    base: 'main',
    wanted: true,
    busy: false,
    error: '',
    notice: '',
    onToggle: () => {},
    onBase: () => {},
    onSource: () => {},
  })
  assert.match(textOf(option), /feat\/x/)
})

test('the context worktree option offers the checkout mode, the single-repo one does not', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const WorktreeOption = view.WorktreeOption as (props: Record<string, unknown>) => unknown
  const contextInfo = {
    enabled: true,
    supported: true,
    reason: null,
    sessionId: 's1',
    current: null,
    bases: null,
    project: { directory: '/work', linked: false },
    kind: 'context',
    workspaceRoot: '/work',
    repos: [],
    checkoutMode: 'lazy',
    auto: true,
    request: null,
    creating: null,
    started: false,
  }
  const modes: string[] = []
  const shared = {
    t: (key: string) => key,
    source: 'local',
    base: '',
    wanted: true,
    busy: false,
    error: '',
    notice: '',
    onToggle: () => {},
    onBase: () => {},
    onSource: () => {},
  }
  const context = WorktreeOption({
    ...shared,
    info: contextInfo,
    mode: 'lazy',
    onMode: (next: string) => modes.push(next),
  })
  const selects = findAll(context, (element) => element.type === 'select')
  assert.equal(selects.length, 1, 'the context branch has one mode picker')
  assert.equal(selects[0].props?.['aria-label'], 'wtMode')
  assert.equal(selects[0].props?.value, 'lazy')
  ;(selects[0].props?.onChange as (event: { target: { value: string } }) => void)({ target: { value: 'eager' } })
  assert.deepEqual(modes, ['eager'])

  const off = WorktreeOption({ ...shared, info: contextInfo, mode: 'off', onMode: () => {} })
  assert.equal(findAll(off, (element) => element.type === 'select').length, 0, 'off hides the picker')

  // The single-repository branch keeps only its base branch picker.
  const single = WorktreeOption({
    ...shared,
    info: { ...contextInfo, kind: undefined, checkoutMode: undefined },
    base: 'main',
    mode: 'lazy',
    onMode: () => {},
  })
  const singleSelects = findAll(single, (element) => element.type === 'select')
  assert.equal(singleSelects.length, 1)
  assert.equal(singleSelects[0].props?.['aria-label'], 'wtBase')
})

test('the worktree option stays out of a project that cannot host one', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const WorktreeOption = view.WorktreeOption as (props: Record<string, unknown>) => unknown
  const linked = WorktreeOption({
    t: (key: string) => key,
    info: {
      enabled: true,
      supported: false,
      reason: 'linked-project',
      sessionId: 's1',
      current: null,
      bases: null,
      project: { directory: '/repo/wt', linked: true },
    },
    source: 'local',
    base: '',
    wanted: true,
    busy: false,
    error: '',
    notice: '',
    onToggle: () => {},
    onBase: () => {},
    onSource: () => {},
  })
  assert.match(textOf(linked), /wtLinkedProject/)

  const outside = WorktreeOption({
    t: (key: string) => key,
    info: {
      enabled: true,
      supported: false,
      reason: 'not-a-repository',
      sessionId: 's1',
      current: null,
      bases: null,
      project: null,
    },
    source: 'local',
    base: '',
    wanted: true,
    busy: false,
    error: '',
    notice: '',
    onToggle: () => {},
    onBase: () => {},
    onSource: () => {},
  })
  assert.match(textOf(outside), /wtNoRepository/)
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

test('the Web Remote caller posts to its own route prefix', async () => {
  const { createWebRemoteApi } = await import('../src/client/api.ts')
  const calls: Array<{ url: string; init: { method: string; body: string; credentials: string } }> = []
  const restore = stubFetch(calls, { ok: true, value: { writable: true, settings: {}, status: {} } })
  try {
    const api = createWebRemoteApi()
    const answer = await api.state({})
    assert.deepEqual(answer, { writable: true, settings: {}, status: {} })
  } finally {
    restore()
  }
  assert.equal(calls[0].url, 'api/personal-hub-web-remote/state')
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].init.credentials, 'same-origin')
})

test('the Web Remote card shows the pairing code, the countdown, and the approval link', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const WebRemoteForm = view.WebRemoteForm as (props: Record<string, unknown>) => unknown
  const now = Date.parse('2026-11-08T12:00:00.000Z')
  const form = WebRemoteForm({
    t: (key: string, values?: Record<string, string | number>) => (values === undefined ? key : `${key}:${Object.values(values).join(',')}`),
    state: {
      writable: true,
      settings: { enabled: true, relayUrl: 'https://relay.test', deviceName: 'PC-Office', effectiveDeviceName: 'PC-Office', autoPair: true },
      status: {
        state: 'pairing',
        deviceId: 'dev_1',
        deviceName: 'PC-Office',
        fingerprint: 'SHA256:AA:BB:CC',
        relayUrl: 'https://relay.test',
        paired: false,
        pairedAt: null,
        connectedAt: null,
        pairing: { code: 'ABCD-EFGH', uri: 'https://relay.test/pair', expiresAt: new Date(now + 600_000).toISOString() },
        pairingStatus: 'authorize',
        watching: [],
        lastError: null,
        updatedAt: null,
      },
    },
    draft: { enabled: true, relayUrl: 'https://relay.test', deviceName: 'PC-Office', autoPair: true },
    dirty: false,
    busy: '',
    error: '',
    notice: '',
    copied: false,
    unpairArmed: false,
    now,
    stale: false,
    onDraft: () => {},
    onSave: () => {},
    onRefresh: () => {},
    onPair: () => {},
    onCancelPairing: () => {},
    onArmUnpair: () => {},
    onCancelUnpair: () => {},
    onUnpair: () => {},
    onCopyCode: () => {},
  })

  assert.match(textOf(form), /webRemoteStatePairing/)
  assert.match(textOf(form), /ABCD-EFGH/)
  assert.match(textOf(form), /webRemotePairExpires:10:00/)
  assert.match(textOf(form), /webRemotePairOpen/)
  assert.match(textOf(form), /webRemotePairCancel/)
  assert.match(textOf(form), /webRemotePairAgain|webRemotePairNow/)

  const inputs = findAll(form, (element) => element.type === 'input')
  const relay = inputs.find((element) => element.props?.id === 'personal-hub-web-relay')
  assert.equal(relay?.props?.value, 'https://relay.test')
  const save = findAll(form, (element) => element.type === 'button')
    .find((element) => (((element as { children?: unknown[] }).children) ?? []).includes('webRemoteSave'))
  assert.equal(save?.props?.disabled, true, 'an unchanged form cannot be saved')
})

test('the Web Remote card shows the identity and the disconnect controls once paired', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const WebRemoteForm = view.WebRemoteForm as (props: Record<string, unknown>) => unknown
  const form = WebRemoteForm({
    t: (key: string, values?: Record<string, string | number>) => (values === undefined ? key : `${key}:${Object.values(values).join(',')}`),
    state: {
      writable: true,
      settings: { enabled: true, relayUrl: 'https://relay.test', deviceName: 'PC-Office', effectiveDeviceName: 'PC-Office', autoPair: true },
      status: {
        state: 'connected',
        deviceId: 'dev_1',
        deviceName: 'PC-Office',
        fingerprint: 'SHA256:AA:BB:CC',
        relayUrl: 'https://relay.test',
        paired: true,
        pairedAt: '2026-11-08T11:00:00.000Z',
        connectedAt: '2026-11-08T11:59:00.000Z',
        pairing: null,
        pairingStatus: null,
        watching: ['s1', 's2'],
        lastError: null,
        updatedAt: null,
      },
    },
    draft: { enabled: true, relayUrl: 'https://relay.test', deviceName: 'PC-Office', autoPair: true },
    dirty: true,
    busy: '',
    error: '',
    notice: '',
    copied: false,
    unpairArmed: false,
    now: Date.parse('2026-11-08T12:00:00.000Z'),
    stale: false,
    onDraft: () => {},
    onSave: () => {},
    onRefresh: () => {},
    onPair: () => {},
    onCancelPairing: () => {},
    onArmUnpair: () => {},
    onCancelUnpair: () => {},
    onUnpair: () => {},
    onCopyCode: () => {},
  })

  assert.match(textOf(form), /webRemoteStateConnected/)
  assert.match(textOf(form), /PC-Office/)
  assert.match(textOf(form), /SHA256:AA:BB:CC/)
  assert.match(textOf(form), /webRemoteWatchingCount:2/)
  assert.match(textOf(form), /webRemoteUnpair/)
  assert.match(textOf(form), /webRemotePairAgain/)
  assert.deepEqual(findAll(form, (element) => element.type === 'a').map((element) => element.props?.href), [
    'https://relay.test',
  ])
})

test('the Web Remote card offers the switch that turns a disabled feature on', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const WebRemoteForm = view.WebRemoteForm as (props: Record<string, unknown>) => unknown
  const form = WebRemoteForm({
    t: (key: string) => key,
    state: {
      writable: true,
      settings: { enabled: false, relayUrl: '', deviceName: '', effectiveDeviceName: 'PC-Office', autoPair: true },
      status: {
        state: 'disabled',
        deviceId: '',
        deviceName: 'PC-Office',
        fingerprint: '',
        relayUrl: '',
        paired: false,
        pairedAt: null,
        connectedAt: null,
        pairing: null,
        pairingStatus: null,
        watching: [],
        lastError: null,
        updatedAt: null,
      },
    },
    draft: { enabled: false, relayUrl: '', deviceName: '', autoPair: true },
    dirty: false,
    busy: '',
    error: '',
    notice: '',
    copied: false,
    unpairArmed: false,
    now: 0,
    stale: false,
    onDraft: () => {},
    onSave: () => {},
    onRefresh: () => {},
    onPair: () => {},
    onCancelPairing: () => {},
    onArmUnpair: () => {},
    onCancelUnpair: () => {},
    onUnpair: () => {},
    onCopyCode: () => {},
  })

  assert.match(textOf(form), /webRemoteStateDisabled/)
  assert.match(textOf(form), /webRemoteDisabledHint/)
  assert.match(textOf(form), /webRemoteEnabled/)
  const boxes = findAll(form, (element) => element.type === 'input' && typeof element.props?.type === 'string')
    .filter((element) => element.props?.type === 'checkbox')
  assert.equal(boxes.length, 2)
  assert.equal(boxes[0].props?.checked, false)
  assert.equal(boxes[1].props?.checked, true)
})

test('the Web Remote helpers name states and refuse URLs the transport cannot use', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const stateLabel = view.stateLabel as (t: (key: string) => string, state: string) => string
  const stateTone = view.stateTone as (state: string) => string
  const countdownText = view.countdownText as (ms: number) => string
  const relayLooksValid = view.relayLooksValid as (value: string) => boolean

  assert.equal(stateLabel((key) => `label:${key}`, 'connected'), 'label:webRemoteStateConnected')
  assert.equal(stateLabel((key) => `label:${key}`, 'pairing-required'), 'label:webRemoteStatePairingRequired')
  assert.equal(stateLabel((key) => `label:${key}`, 'disabled'), 'label:webRemoteStateDisabled')
  assert.equal(stateLabel((key) => key, 'a-state-from-the-future'), 'a-state-from-the-future')
  assert.equal(stateTone('connected'), 'success')
  assert.equal(stateTone('pairing'), 'warn')
  assert.equal(stateTone('revoked'), 'error')
  assert.equal(stateTone('starting'), 'idle')
  assert.equal(countdownText(600_000), '10:00')
  assert.equal(countdownText(59_000), '0:59')
  assert.equal(countdownText(-1), '0:00')
  assert.equal(relayLooksValid(''), true)
  assert.equal(relayLooksValid('https://relay.test'), true)
  assert.equal(relayLooksValid('wss://relay.test/ws'), true)
  assert.equal(relayLooksValid('relay.test'), false)
  assert.equal(relayLooksValid('ftp://relay.test'), false)
})

test('the automatic-archive form draws the rules and the last pass', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const AutoArchiveForm = view.AutoArchiveForm as (props: Record<string, unknown>) => unknown
  const changes: Array<Record<string, unknown>> = []
  const form = AutoArchiveForm({
    t: (key: string, values?: Record<string, string | number>) =>
      values === undefined ? key : `${key}:${Object.values(values).join(',')}`,
    settings: {
      enabled: true,
      inactiveDays: 2,
      checkMs: 3600000,
      skipActive: true,
      archiveRunning: false,
      archiveBlank: true,
      dryRun: false,
      maxPerPass: 50,
    },
    last: {
      at: 1_700_000_000_000,
      dryRun: false,
      scanned: 6,
      due: 2,
      recent: 4,
      pinned: 0,
      archivedCount: 2,
      failedCount: 0,
      activeCount: 0,
      deferredCount: 0,
      archived: [],
      failed: [],
      active: [],
      deferred: [],
    },
    writable: true,
    status: 'ready',
    error: '',
    notice: '',
    running: false,
    onChange: (patch: Record<string, unknown>) => {
      changes.push(patch)
    },
    onSave: () => {},
    onRun: () => {},
  })

  assert.match(textOf(form), /aaTitle/)
  assert.match(textOf(form), /aaEnabled/)
  assert.match(textOf(form), /aaInactiveDays/)
  assert.match(textOf(form), /aaLast:6,2,0,0/)
  const boxes = findAll(form, (element) => element.type === 'input' && element.props?.type === 'checkbox')
  assert.equal(boxes.length, 5)
  assert.equal(boxes[0].props?.checked, true)

  const days = findAll(form, (element) => element.type === 'input' && element.props?.type === 'number')[0]
  assert.equal(days.props?.value, 2)
  ;(days.props?.onChange as (event: { target: { value: string } }) => void)({ target: { value: '3' } })
  assert.deepEqual(changes[0], { inactiveDays: 3 })
  // The interval field is in minutes and converts back to milliseconds.
  const minutes = findAll(form, (element) => element.type === 'input' && element.props?.type === 'number')[1]
  assert.equal(minutes.props?.value, 60)
  ;(minutes.props?.onChange as (event: { target: { value: string } }) => void)({ target: { value: '90' } })
  assert.deepEqual(changes[1], { checkMs: 5400000 })
})

test('the automatic-archive caller posts to its own route prefix', async () => {
  const { createAutoArchiveApi } = await import('../src/client/api.ts')
  const calls: Array<{ url: string; init: { method: string; body: string; credentials: string } }> = []
  const restore = stubFetch(calls, { ok: true, value: { writable: true, settings: {}, last: null } })
  try {
    const api = createAutoArchiveApi()
    const answer = await api.runNow({})
    assert.deepEqual(answer, { writable: true, settings: {}, last: null })
  } finally {
    restore()
  }
  assert.equal(calls[0].url, 'api/personal-hub-auto-archive/runNow')
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].init.credentials, 'same-origin')
})

test('the change set groups files per repository and shows no commit composer', async () => {
  const module = await loadClient()
  const view = module.__internal as Record<string, unknown>
  const ChangeSetView = view.ChangeSetView as (props: Record<string, unknown>) => unknown
  const t = (key: string, values?: Record<string, string | number>) =>
    values === undefined ? key : `${key}:${Object.values(values).join(',')}`
  const file = (path: string, kind: string, additions: number, deletions: number) => ({
    path,
    kind,
    index: 'M',
    worktree: 'M',
    staged: false,
    unstaged: true,
    untracked: false,
    conflicted: false,
    additions,
    deletions,
    binary: false,
  })
  const result = {
    workspaceRoot: '/work',
    scope: 'working',
    warnings: ['one workspace warning'],
    repos: [
      {
        id: 'api',
        name: 'api',
        role: 'service',
        root: '/work/api',
        branch: 'main',
        state: 'ready',
        files: [file('src/index.ts', 'modified', 12, 3), file('src/new.ts', 'added', 5, 0)],
        stats: { files: 2, additions: 17, deletions: 3 },
      },
      {
        id: 'web',
        name: 'web',
        role: 'client',
        root: '/work/web',
        branch: 'feat/ui',
        state: 'ready',
        files: [file('docs/readme.md', 'modified', 1, 2)],
        stats: { files: 1, additions: 1, deletions: 2 },
      },
      {
        id: 'infra',
        name: 'infra',
        role: '',
        root: '/work/infra',
        branch: null,
        state: 'not-checked-out',
        files: [],
        stats: { files: 0, additions: 0, deletions: 0 },
        error: { code: 'git/no-repo', message: 'not a repository' },
      },
    ],
  }
  // The summary is read through the unscoped API; the view renders what it answers.
  const calls: Array<Record<string, unknown>> = []
  const api = {
    workspaceChanges: async (payload: Record<string, unknown>) => {
      calls.push(payload)
      return result
    },
  }
  const loaded = await api.workspaceChanges({ sessionId: 's1' })
  const opened: string[] = []
  const tree = ChangeSetView({ t, result: loaded, onOpenRepo: (id: string) => opened.push(id) })
  const text = textOf(tree)
  assert.deepEqual(calls, [{ sessionId: 's1' }])
  assert.match(text, /api/)
  assert.match(text, /service/)
  assert.match(text, /src\/index\.ts/)
  assert.match(text, /src\/new\.ts/)
  assert.match(text, /web/)
  assert.match(text, /feat\/ui/)
  assert.match(text, /docs\/readme\.md/)
  assert.match(text, /one workspace warning/)
  assert.match(text, /git\/no-repo: not a repository/)
  assert.match(text, /gitChangeSetClean/)
  // One repo badge per file, not just the per-group heading.
  assert.equal(findAll(tree, (element) => element.props?.className === 'ph-chip ph-tiny').length, 3)
  // This is a read-only overview: staging and committing live in the repo view.
  assert.doesNotMatch(text, /gitCommit|gitStage|gitDiscard|gitCommitMessage/)
  const buttons = findAll(tree, (element) => element.type === 'button')
  assert.equal(buttons.length, 3)
  ;(buttons[0].props?.onClick as () => void)()
  assert.deepEqual(opened, ['api'])
})

test('both languages carry the same personal-hub keys and placeholders', async () => {
  const { en, vi } = await import('../src/client/i18n.ts')
  assert.deepEqual(Object.keys(vi).sort(), Object.keys(en).sort())
  const placeholders = (text: string): string[] =>
    [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
  for (const key of Object.keys(en)) {
    assert.deepEqual(placeholders(vi[key]), placeholders(en[key]), `placeholders of ${key}`)
  }
})

test('the repository filter, rescan, and context repair are translated in both languages', async () => {
  const { en, vi } = await import('../src/client/i18n.ts')
  for (const key of [
    'gitRepoFilter',
    'gitRepoNoMatch',
    'gitRepoRescan',
    'gitRepoError',
    'gitContextMissing',
    'gitContextMissingHint',
    'gitContextRepair',
    'gitContextRepairing',
    'gitContextRepaired',
    'gitContextRepairFailed',
    'wtNoRepository',
  ]) {
    assert.ok(en[key] && en[key].length > 0, `English ${key}`)
    assert.ok(vi[key] && vi[key].length > 0, `Vietnamese ${key}`)
    assert.notEqual(en[key], vi[key], `${key} is translated`)
  }
  assert.equal(vi.gitRepoRescan, 'Quét lại')
  assert.equal(vi.gitContextMissing, 'Context đã mất')
  assert.equal(vi.gitContextRepair, 'Tạo lại')
  assert.equal(vi.wtNoRepository, 'Thư mục chưa có kho Git')
  assert.match(en.gitRepoFilter, /filter/i)
})

test('the change-set and checkout-mode labels are translated in both languages', async () => {
  const { en, vi } = await import('../src/client/i18n.ts')
  for (const key of [
    'gitChangeSetTitle',
    'gitChangeSetHint',
    'gitChangeSetClean',
    'gitChangeSetEmpty',
    'gitChangeSetError',
    'wtMode',
    'wtModeHint',
    'wtModeLazy',
    'wtModeEager',
  ]) {
    assert.ok(en[key] && en[key].length > 0, `English ${key}`)
    assert.ok(vi[key] && vi[key].length > 0, `Vietnamese ${key}`)
    assert.notEqual(en[key], vi[key], `${key} is translated`)
  }
  assert.equal(en.wtModeLazy, 'Lazy')
  assert.equal(en.wtModeEager, 'Eager')
})
