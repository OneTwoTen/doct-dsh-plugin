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

/** Collect every element matching a predicate. */
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

/** The `t` a slot receives: it echoes the key and its parameters. */
const t = (key, params) => (params === undefined ? key : `${key}:${Object.values(params).join(',')}`)

const bases = {
  local: [{ name: 'main' }, { name: 'feature/x' }],
  remote: [{ name: 'origin/main', remote: 'origin', branch: 'main' }, { name: 'origin/next', remote: 'origin', branch: 'next' }],
  defaultBase: 'main',
  current: 'feature/x',
}

test('the worktree row offers both starting points and the branches they hold', async () => {
  const view = (await loadClient()).__internal
  const calls = { source: [], base: [], enable: 0 }
  const node = view.WorktreeOption({
    t,
    info: { supported: true, bases, current: null },
    source: 'local',
    base: 'main',
    busy: false,
    error: '',
    notice: '',
    onSource: (kind) => calls.source.push(kind),
    onBase: (value) => calls.base.push(value),
    onEnable: () => {
      calls.enable += 1
    },
    onRemove: () => {},
  })
  const text = textOf(node)
  assert.match(text, /wtOption/)
  assert.match(text, /wtLocal/)
  assert.match(text, /wtRemote/)

  const select = findAll(node, (item) => item.type === 'select')[0]
  assert.equal(select.props.value, 'main')
  assert.deepEqual(select.children[0].map((option) => option.props.value), ['main', 'feature/x'])

  const sources = findAll(node, (item) => item.props?.['aria-pressed'] === 'true' && item.type === 'button')
  assert.equal(sources.length, 1)
  sources[0].props.onClick()
  assert.deepEqual(calls.source, ['local'])

  const toggle = findAll(node, (item) => item.type === 'button').find((item) => textOf(item).trim() === 'wtOption')
  assert.ok(toggle, 'the toggle is labelled New worktree')
  toggle.props.onClick()
  assert.equal(calls.enable, 1)
})

test('the remote starting point lists remote branch names and disables an empty pool', async () => {
  const view = (await loadClient()).__internal
  const node = view.WorktreeOption({
    t,
    info: { supported: true, bases, current: null },
    source: 'remote',
    base: 'main',
    busy: false,
    error: '',
    notice: '',
    onSource: () => {},
    onBase: () => {},
    onEnable: () => {},
    onRemove: () => {},
  })
  const select = findAll(node, (item) => item.type === 'select')[0]
  assert.deepEqual(select.children[0].map((option) => option.props.value), ['main', 'next'])

  const empty = view.WorktreeOption({
    t,
    info: { supported: true, bases: { local: [], remote: [], defaultBase: null, current: null }, current: null },
    source: 'local',
    base: '',
    busy: false,
    error: '',
    notice: '',
    onSource: () => {},
    onBase: () => {},
    onEnable: () => {},
    onRemove: () => {},
  })
  assert.match(textOf(empty), /wtNoBase/)
  const toggle = findAll(empty, (item) => item.type === 'button').find((item) => textOf(item).trim() === 'wtOption')
  assert.equal(toggle.props.disabled, true)
})

test('the worktree row shows a failure without losing its controls', async () => {
  const view = (await loadClient()).__internal
  const node = view.WorktreeOption({
    t,
    info: { supported: true, bases, current: null },
    source: 'local',
    base: 'main',
    busy: false,
    error: 'wtFailed: boom',
    notice: '',
    onSource: () => {},
    onBase: () => {},
    onEnable: () => {},
    onRemove: () => {},
  })
  assert.match(textOf(node), /wtFailed: boom/)
  assert.equal(findAll(node, (item) => item.type === 'select').length, 1)
})

test('an existing worktree shows its branch and a remove control instead of the toggle', async () => {
  const view = (await loadClient()).__internal
  let removed = 0
  const node = view.WorktreeOption({
    t,
    info: {
      supported: true,
      bases,
      current: { branch: 'dsh-ad0ab5d0-1a2b', path: 'C:/repo/.agents/worktrees/dsh-ad0ab5d0-1a2b' },
    },
    source: 'local',
    base: 'main',
    busy: false,
    error: '',
    notice: 'wtCreated:dsh-ad0ab5d0-1a2b',
    onSource: () => {},
    onBase: () => {},
    onEnable: () => {},
    onRemove: () => {
      removed += 1
    },
  })
  const text = textOf(node)
  assert.match(text, /dsh-ad0ab5d0-1a2b/)
  assert.match(text, /wtCreated/)
  // No toggle and no source choice once the checkout exists.
  assert.equal(findAll(node, (item) => item.type === 'button' && textOf(item) === 'wtOption').length, 0)
  assert.equal(findAll(node, (item) => item.props?.['aria-label'] === 'wtSource').length, 0)

  const remove = findAll(node, (item) => item.props?.['aria-label'] === 'wtRemove')[0]
  assert.ok(remove, 'the remove control is labelled')
  remove.props.onClick()
  assert.equal(removed, 1)
})

test('the pull-request confirmation names both branches and can report the created request', async () => {
  const view = (await loadClient()).__internal
  let confirmed = 0
  const pending = view.PullConfirm({
    t,
    branch: 'feature/x',
    base: 'main',
    busy: false,
    error: '',
    notice: '',
    url: '',
    number: undefined,
    onConfirm: () => {
      confirmed += 1
    },
    onCancel: () => {},
  })
  assert.match(textOf(pending), /gitPrConfirm:feature\/x,main/)
  assert.match(textOf(pending), /gitPrConfirmHint/)
  const confirmButton = findAll(pending, (item) => item.type === 'button' && item.props.className === 'ph-primary')[0]
  confirmButton.props.onClick()
  assert.equal(confirmed, 1)

  const busy = view.PullConfirm({ t, branch: 'feature/x', base: 'main', busy: true, error: '', notice: '', url: '', number: undefined, onConfirm: () => {}, onCancel: () => {} })
  assert.match(textOf(busy), /gitPrBusy/)

  const done = view.PullConfirm({
    t,
    branch: 'feature/x',
    base: 'main',
    busy: false,
    error: '',
    notice: 'gitPrCreated:12',
    url: 'https://host/pull/12',
    number: 12,
    onConfirm: () => {},
    onCancel: () => {},
  })
  assert.match(textOf(done), /gitPrCreated:12/)
  const link = findAll(done, (item) => item.type === 'a')[0]
  assert.equal(link.props.href, 'https://host/pull/12')
  assert.match(textOf(done), /gitPrOpen/)
})

test('the merge setting form reflects the stored switches and disables them off', async () => {
  const view = (await loadClient()).__internal
  const changes = []
  const node = view.MergeSettingsForm({
    t,
    settings: { enabled: true, removeWorktree: true, deleteBranch: false, archiveSession: true, writable: true },
    status: 'ready',
    error: '',
    notice: '',
    onChange: (patch) => changes.push(patch),
    onSave: () => {},
  })
  const boxes = findAll(node, (item) => item.type === 'input')
  // Four merge switches, then the cleanup group's enabled, idle-days, and no-commit controls.
  assert.equal(boxes.length, 7)
  assert.deepEqual(boxes.slice(0, 4).map((box) => box.props.checked), [true, true, false, true])
  boxes[2].props.onChange({ target: { checked: true } })
  assert.deepEqual(changes, [{ deleteBranch: true }])
  assert.match(textOf(node), /gitSettingsSave/)

  // Cleanup starts off, so its dependent controls are disabled but the switch is not.
  assert.equal(boxes[4].props.disabled, false)
  assert.equal(boxes[5].props.disabled, true)
  assert.equal(boxes[6].props.disabled, true)
  boxes[4].props.onChange({ target: { checked: true } })
  assert.deepEqual(changes.at(-1), { cleanup: { enabled: true } })
  const keep = findAll(node, (item) => item.type === 'select')[0]
  assert.equal(keep.props.value, 'tracked')
  keep.props.onChange({ target: { value: 'any' } })
  assert.deepEqual(changes.at(-1), { cleanup: { keepChanges: 'any' } })
  assert.match(textOf(node), /cleanupTitle/)
  assert.match(textOf(node), /cleanupNever/)

  const off = view.MergeSettingsForm({
    t,
    settings: { enabled: false, removeWorktree: true, deleteBranch: true, archiveSession: true, writable: true },
    status: 'ready',
    error: '',
    notice: '',
    onChange: () => {},
    onSave: () => {},
  })
  const offBoxes = findAll(off, (item) => item.type === 'input')
  assert.deepEqual(offBoxes.slice(0, 4).map((box) => box.props.disabled), [false, true, true, true])
  assert.match(textOf(off), /gitSettingsOff/)

  const readOnly = view.MergeSettingsForm({
    t,
    settings: { enabled: true, removeWorktree: true, deleteBranch: false, archiveSession: true, writable: false },
    status: 'ready',
    error: '',
    notice: '',
    onChange: () => {},
    onSave: () => {},
  })
  assert.match(textOf(readOnly), /gitSettingsReadOnly/)
  // Every action is present but inert without a configuration editor.
  const readOnlyButtons = findAll(readOnly, (item) => item.type === 'button')
  assert.equal(readOnlyButtons.length > 0, true)
  assert.deepEqual(readOnlyButtons.map((button) => button.props.disabled), readOnlyButtons.map(() => true))
})

test('the client registers the worktree option and one row card', async () => {
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
  const locale = { bind: () => t, register: () => () => {} }
  module.apply({
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
  })

  const hero = registrations.find((entry) => entry.options.name === 'conversation.hero.options')
  assert.ok(hero, 'registered the worktree option')
  assert.equal(hero.options.id, 'personal-hub-worktree')
  assert.equal(hero.options.locale, 'personalHub')
  assert.equal(typeof hero.component, 'function')
  const injected = hero.options.inject('session-ad0ab5d0-bb7b-4713-8ff9-ce1842335e26')
  assert.equal(typeof injected.call, 'function')
  assert.equal(injected.sessionId, 'session-ad0ab5d0-bb7b-4713-8ff9-ce1842335e26')

  const cards = registrations.filter((entry) => entry.options.name === 'plugins.row.config')
  // One occupant per row key: the Telegram binding and the git setting share a
  // single card, because a second registration for the same key throws.
  assert.equal(cards.length, 1)
  const card = cards[0]
  assert.equal(card.options.key, '@local/personal-hub#personal-hub')
  assert.equal(card.options.id, 'personal-hub')
  assert.equal(typeof card.component, 'function')
  assert.equal(card.component, module.__internal.PersonalHubCard)
  const cardProps = card.options.inject()
  assert.equal(typeof cardProps.call, 'function')
  assert.equal(typeof cardProps.save, 'function')
  assert.equal(card.options.label(), 'cardTitle')

  // The Hero renders nothing without a Session identity, which is the state the
  // slot reports before a Session exists.
  const rendered = hero.component({ t, call: async () => ({ supported: false, current: null }) })
  assert.equal(rendered, null)
})
