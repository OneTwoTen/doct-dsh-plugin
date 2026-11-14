/**
 * The browser half of the bundle: the plugin row's cards, the New Session
 * worktree option, and the right-sidebar Git tab.
 *
 * `apply` registers slots and styles with `ctx.effect`, so unloading the plugin
 * removes everything it added. Every registration is isolated: one rejected
 * slot must not take the rest of the bundle down.
 */
import { h } from './runtime.ts'
import type { ClientContext, Disposer } from '../host/dsh.ts'
import { NS, dictionaries } from './i18n.ts'
import type { Translate } from './i18n.ts'
import { createGitCaller, createGitApi, createWebRemoteApi, messageOf } from './api.ts'
import type { GitApi, WebRemoteApi } from './api.ts'
import { GIT_CSS } from './styles.ts'
import { Icon } from './icons.tsx'
import { TelegramCard, createController } from './telegram.tsx'
import { WebRemoteCard, WebRemoteForm, countdownText, draftOf, emptyCardState, relayLooksValid, stateLabel, stateTone } from './web-remote.tsx'
import { MergeSettingsCard, MergeSettingsForm } from './git/settings.tsx'
import { WorktreeHero, WorktreeOption } from './worktree.tsx'
import { GitPanel, GitHeaderButton } from './git/panel.tsx'
import { GitActions } from './git/actions.tsx'
import { DiffFileSection } from './git/diff-view.tsx'
import { CommitComposer } from './git/commit-composer.tsx'
import { WorktreesView, WorktreeRow } from './git/worktrees.tsx'

/** The `plugins.row.config` key: bundle package name and row id. */
const ROW_KEY = '@local/personal-hub#personal-hub'
/** This plugin's tab-type identity in the right Sidebar. */
const GIT_ID = '@local/personal-hub/git'
/** The tab kind the guide and the header button open. */
const GIT_KIND = 'personal-hub-git'

/** The browser module this bundle registers. */
export interface ClientModule {
  name: string
  inject: string[]
  apply(ctx: ClientContext): void
  __internal: Record<string, unknown>
}

/**
 * Build the browser module. Called once by the module factory, after React has
 * been installed from the page's module table.
 */
export function createClient(): ClientModule {
  return {
    name: 'personal-hub-client',
    inject: ['slots', 'locale', 'remote', 'remote.credentials'],

    /** Rendering helpers the Node test harness exercises with a stand-in React. */
    __internal: {
      TelegramCard,
      WebRemoteCard,
      WebRemoteForm,
      MergeSettingsCard,
      WorktreeHero,
      WorktreeOption,
      GitPanel,
      GitHeaderButton,
      GitActions,
      DiffFileSection,
      CommitComposer,
      WorktreesView,
      WorktreeRow,
      MergeSettingsForm,
      stateLabel,
      stateTone,
      countdownText,
      relayLooksValid,
      emptyCardState,
      draftOf,
      installStyles,
    },

    apply(ctx) {
      const t: Translate = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, dictionaries), 'personal-hub: dictionaries')

      const controller = createController(ctx, t)
      ctx.effect(() => {
        void controller.refresh()
        const off = ctx.remote.$on('credentials/reference-updated', (ref: string) => {
          if (ref === 'DSH_TELEGRAM_BOT_TOKEN') void controller.refresh()
        })
        return () => {
          off()
          controller.dispose()
        }
      }, 'personal-hub: credential watch')

      const api: GitApi = createGitApi(createGitCaller())
      const webRemote: WebRemoteApi = createWebRemoteApi()
      ctx.effect(() => installStyles(), 'personal-hub: styles')

      // `plugins.row.config` is a keyed slot with exactly one occupant per row
      // key: a second registration for the same row throws and would take the
      // whole client plugin down, so both sections live in one card.
      ctx.effect(
        () => ctx.slots.inject('plugins.row.config', () => registerSlot(ctx, {
          name: 'plugins.row.config',
          id: 'personal-hub',
          key: ROW_KEY,
          order: 10,
          label: () => t('cardTitle'),
          locale: NS,
          inject: () => ({
            t,
            subscribe: controller.subscribe,
            getState: controller.getState,
            save: controller.save,
            clear: controller.clear,
            api,
            webRemote,
          }),
        }, PersonalHubCard)),
        'personal-hub: row config card',
      )

      // The New Session worktree option belongs to the conversation, not to a
      // side panel, so it mounts on its own and stays hidden outside a
      // repository. A session-scoped slot injects the Session identity, which is
      // what the Host needs to move that Session into a checkout.
      ctx.effect(
        () => ctx.slots.inject('conversation.hero.options', () => registerSlot(ctx, {
          name: 'conversation.hero.options',
          id: 'personal-hub-worktree',
          order: 20,
          label: () => t('wtOption'),
          locale: NS,
          inject: () => ({ api, t }),
        }, WorktreeHero)),
        'personal-hub: worktree option',
      )

      // The Git panel needs the right Sidebar. It is an optional service: the
      // cards above mount either way.
      if (typeof ctx.inject !== 'function') return
      ctx.inject(['sidebarRightTabs', 'sidebarRight'], (scoped) => {
        const gitCtx = scoped as ClientContext
        const tabs = gitCtx.get<{ register(options: Record<string, unknown>): Disposer }>('sidebarRightTabs')
        if (tabs === undefined) return
        gitCtx.effect(() => tabs.register({
          id: GIT_ID,
          kind: GIT_KIND,
          priority: 'extension',
          keepMounted: true,
          title: () => t('gitTab'),
          guide: [{
            id: 'git',
            order: 20,
            icon: (props: { size?: number; className?: string }) => h(Icon, { name: 'git', size: props.size ?? 22, className: props.className }),
            title: () => t('gitGuide'),
            description: () => t('gitGuideHint'),
          }],
        }), 'personal-hub: git tab type')

        gitCtx.effect(() => gitCtx.slots.inject('sidebar.right.pane.tab', () => registerSlot(gitCtx, {
          name: 'sidebar.right.pane.tab',
          key: GIT_ID,
          locale: NS,
          inject: () => ({
            api,
            t,
            /**
             * Start a new chat whose working directory is an existing checkout,
             * so two chats can share one worktree.
             * @param path absolute checkout directory.
             */
            newChat: async (path: string) => {
              const remoteSession = ctx.remote?.session
              if (typeof remoteSession?.create !== 'function') {
                throw new Error('This build exposes no session creator')
              }
              const response = await remoteSession.create({ cwd: path })
              if (response === null || typeof response !== 'object' || response.ok !== true) {
                throw new Error(response?.error?.message ?? 'The Host could not create a chat')
              }
              return response.value
            },
          }),
        }, GitPanel)), 'personal-hub: git tab body')

        gitCtx.effect(() => gitCtx.slots.inject('conversation.session.header.utilities', () => registerSlot(gitCtx, {
          name: 'conversation.session.header.utilities',
          id: 'personal-hub-git',
          order: 40,
          label: () => t('gitOpen'),
          locale: NS,
          inject: () => ({
            t,
            open: () => {
              try {
                const sidebar = gitCtx.get<{ openTab(kind: string): void }>('sidebarRight')
                sidebar?.openTab(GIT_KIND)
              } catch (error) {
                console.warn('[personal-hub] cannot open the Git tab:', messageOf(error))
              }
            },
          }),
        }, GitHeaderButton)), 'personal-hub: git header button')
      })
    },
  }
}

/**
 * The plugin row's configuration card: the Telegram binding, then the Web
 * Remote controls, then the worktree and merge cleanup settings.
 *
 * All sections share one registration because `plugins.row.config` keeps a
 * single occupant per row key.
 */
function PersonalHubCard(props: Record<string, unknown> & {
  t: Translate
  api: GitApi
  webRemote: WebRemoteApi
  view?: string
}): ReturnType<typeof h> {
  const t = props.t
  if (props.view === 'summary') {
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
      h('span', null, t('summary')),
      h('span', { className: 'ph-hint' }, t('webRemoteSummary')),
      h('span', { className: 'ph-hint' }, t('gitSettingsSummary')))
  }
  return h('div', { 'data-personal-hub-card': true, style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
    h(TelegramCard, props as never),
    h('div', { style: { borderTop: '1px solid var(--dsw-alias-border-l3)' } }),
    h(WebRemoteCard, { api: props.webRemote, t }),
    h('div', { style: { borderTop: '1px solid var(--dsw-alias-border-l3)' } }),
    h(MergeSettingsCard, { api: props.api, t }))
}

/**
 * Register one slot entry, turning a rejected registration into a warning.
 *
 * A registration throws on a taken key or a shape mismatch. Letting that reach
 * the plugin's `apply` would take every other surface of this bundle down with
 * it, so the failure is logged and only this entry is lost.
 */
function registerSlot(
  ctx: { slots: { register(options: Record<string, unknown>, component: unknown): Disposer } },
  options: Record<string, unknown>,
  component: unknown,
): Disposer {
  try {
    return ctx.slots.register(options, component)
  } catch (error) {
    console.warn(
      `[personal-hub] cannot register ${String(options.name)}${options.id === undefined ? '' : `#${String(options.id)}`}:`,
      messageOf(error),
    )
    return () => {}
  }
}

/** Install the panel's stylesheet once, and remove it with the plugin. */
export function installStyles(): Disposer {
  if (typeof document === 'undefined') return () => {}
  // The worktree option renders outside the Git tab, so both entry points
  // install the sheet and the second one must not add a copy.
  const installed = document.querySelector('style[data-personal-hub=git]')
  if (installed !== null) return () => {}
  const style = document.createElement('style')
  style.dataset.personalHub = 'git'
  style.textContent = GIT_CSS
  document.head.append(style)
  return () => style.remove()
}
