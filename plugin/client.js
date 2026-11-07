window.__ModuleLoader__.load({
  id: '@local/personal-hub',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Dictionary namespace owned by this plugin. */
    const NS = 'personalHub'
    /** Credential reference the Host resolves as the bot token. */
    const TOKEN_REF = 'DSH_TELEGRAM_BOT_TOKEN'
    /** The `plugins.row.config` key: bundle package name and row id. */
    const ROW_KEY = '@local/personal-hub#personal-hub'

    const en = {
      title: 'Telegram remote control',
      summary: 'Send messages to a Telegram bot and they become prompts in a bound DSH session.',
      stateOn: 'Token configured',
      stateOff: 'No token yet',
      stateUnknown: 'Token state unknown',
      intro: 'Paste the token BotFather gave you. It is stored in the credential store, never in the plugin config file.',
      tokenLabel: 'Bot token',
      tokenPlaceholder: '123456789:AA…',
      save: 'Save token',
      saving: 'Saving…',
      clear: 'Remove token',
      saved: 'Token saved. Send /start to your bot in Telegram; the first chat to do so is paired.',
      cleared: 'Token removed.',
      empty: 'Paste a token first.',
      hint: 'The plugin reads the token on its own schedule, so a saved token applies within seconds without a restart. The status line below updates after each save.',
      error: 'The Host rejected the change: {message}',
      readOnly: 'This deployment stores credentials read-only.',
    }

    const vi = {
      title: 'Điều khiển DSH qua Telegram',
      summary: 'Nhắn tin cho bot Telegram, tin nhắn trở thành prompt trong phiên DSH đã gắn.',
      stateOn: 'Đã có token',
      stateOff: 'Chưa có token',
      stateUnknown: 'Chưa đọc được trạng thái token',
      intro: 'Dán token BotFather đã gửi. Token được lưu trong kho bí mật của DSH, không ghi vào tệp cấu hình plugin.',
      tokenLabel: 'Token bot',
      tokenPlaceholder: '123456789:AA…',
      save: 'Lưu token',
      saving: 'Đang lưu…',
      clear: 'Xoá token',
      saved: 'Đã lưu token. Gửi /start cho bot trong Telegram; chat đầu tiên gửi /start sẽ được ghép nối.',
      cleared: 'Đã xoá token.',
      empty: 'Hãy dán token trước.',
      hint: 'Plugin tự đọc lại token theo chu kỳ nên token vừa lưu có hiệu lực sau vài giây, không cần khởi động lại. Dòng trạng thái bên dưới cập nhật sau mỗi lần lưu.',
      error: 'Máy chủ DSH từ chối thay đổi: {message}',
      readOnly: 'Bản cài này lưu bí mật ở chế độ chỉ đọc.',
    }

    const style = {
      root: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: '13px',
        lineHeight: 1.5,
      },
      statusRow: { display: 'flex', alignItems: 'center', gap: '8px' },
      dot: { width: '8px', height: '8px', borderRadius: '999px', flex: 'none' },
      hint: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: '12px' },
      field: { display: 'flex', flexDirection: 'column', gap: '6px' },
      label: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' },
      input: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '7px 10px',
        borderRadius: '8px',
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        font: 'inherit',
      },
      actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
      button: {
        padding: '6px 14px',
        borderRadius: '8px',
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-2)',
        color: 'var(--dsw-alias-label-primary)',
        font: 'inherit',
        cursor: 'pointer',
      },
      primary: {
        padding: '6px 14px',
        borderRadius: '8px',
        border: '1px solid transparent',
        background: 'var(--dsw-alias-brand-primary)',
        color: '#ffffff',
        font: 'inherit',
        cursor: 'pointer',
      },
      ok: { margin: 0, color: 'var(--dsw-alias-state-success-primary)', fontSize: '12px' },
      error: { margin: 0, color: 'var(--dsw-alias-state-error-primary)', fontSize: '12px' },
    }

    /**
     * One card controller: reads the credential state and writes the token.
     * @param ctx - the browser plugin context.
     * @param t - the page's locale reader.
     */
    function createController(ctx, t) {
      let snapshot = { configured: false, writable: true, known: false, busy: false, error: '', notice: '' }
      const listeners = new Set()
      let disposed = false

      const publish = (patch) => {
        snapshot = { ...snapshot, ...patch }
        for (const listener of [...listeners]) {
          try {
            listener()
          } catch {
            // A listener's failure must not break the others.
          }
        }
      }

      async function refresh() {
        try {
          const response = await ctx.remote.credentials.describe([TOKEN_REF])
          if (disposed) return
          if (!response || response.ok !== true) {
            publish({ known: false, error: response?.error?.message ?? '' })
            return
          }
          const view = response.value?.[TOKEN_REF] ?? {}
          publish({
            known: true,
            configured: view.configured === true,
            writable: view.writable !== false,
            error: '',
          })
        } catch (error) {
          if (!disposed) publish({ known: false, error: messageOf(error) })
        }
      }

      async function save(value) {
        const token = String(value ?? '').trim()
        if (token.length === 0) {
          publish({ error: t('empty'), notice: '' })
          return
        }
        publish({ busy: true, error: '', notice: '' })
        try {
          await ctx.remote.credentials.set(TOKEN_REF, token)
          await refresh()
          if (!disposed) publish({ busy: false, notice: t('saved') })
        } catch (error) {
          if (!disposed) publish({ busy: false, error: t('error', { message: messageOf(error) }) })
        }
      }

      async function clear() {
        publish({ busy: true, error: '', notice: '' })
        try {
          await ctx.remote.credentials.unset(TOKEN_REF)
          await refresh()
          if (!disposed) publish({ busy: false, notice: t('cleared') })
        } catch (error) {
          if (!disposed) publish({ busy: false, error: t('error', { message: messageOf(error) }) })
        }
      }

      return {
        getState: () => snapshot,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        refresh,
        save,
        clear,
        dispose: () => {
          disposed = true
          listeners.clear()
        },
      }
    }

    /** The row's configuration card: reads the viewer's Telegram binding state. */
    function TelegramCard(props) {
      const t = props.t
      const [draft, setDraft] = React.useState('')
      const state = React.useSyncExternalStore(props.subscribe, props.getState, props.getState)

      if (props.view === 'summary') return h('span', null, t('summary'))

      const dotColor = state.known
        ? state.configured
          ? 'var(--dsw-alias-state-success-primary)'
          : 'var(--dsw-alias-state-idle-primary)'
        : 'var(--dsw-alias-state-warn-primary)'
      const statusText = state.known ? (state.configured ? t('stateOn') : t('stateOff')) : t('stateUnknown')

      return h(
        'div',
        { style: style.root, 'data-personal-hub-telegram': true },
        h(
          'div',
          { style: style.statusRow },
          h('span', { style: { ...style.dot, background: dotColor } }),
          h('span', null, statusText),
        ),
        h('p', { style: style.hint }, t('intro')),
        h(
          'div',
          { style: style.field },
          h('label', { style: style.label, htmlFor: 'personal-hub-token' }, t('tokenLabel')),
          h('input', {
            id: 'personal-hub-token',
            style: style.input,
            type: 'password',
            autoComplete: 'off',
            spellCheck: false,
            value: draft,
            placeholder: t('tokenPlaceholder'),
            disabled: !state.writable || state.busy,
            onChange: (event) => setDraft(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter' && draft.trim().length > 0 && !state.busy) {
                props.save(draft).then(() => setDraft(''))
              }
            },
          }),
        ),
        h(
          'div',
          { style: style.actions },
          h(
            'button',
            {
              type: 'button',
              style: state.writable ? style.primary : style.button,
              disabled: !state.writable || state.busy || draft.trim().length === 0,
              onClick: () => props.save(draft).then(() => setDraft('')),
            },
            state.busy ? t('saving') : t('save'),
          ),
          state.configured
            ? h(
                'button',
                { type: 'button', style: style.button, disabled: !state.writable || state.busy, onClick: () => props.clear() },
                t('clear'),
              )
            : null,
        ),
        state.writable ? null : h('p', { style: style.hint }, t('readOnly')),
        state.error.length > 0 ? h('p', { style: style.error }, state.error) : null,
        state.notice.length > 0 ? h('p', { style: style.ok }, state.notice) : null,
        h('p', { style: style.hint }, t('hint')),
      )
    }

    function messageOf(error) {
      if (error && typeof error === 'object' && 'message' in error) return String(error.message)
      return String(error)
    }

    return {
      name: 'personal-hub-client',
      inject: ['slots', 'locale', 'remote', 'remote.credentials'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, { en, vi }), 'personal-hub: dictionaries')

        const controller = createController(ctx, t)
        ctx.effect(() => {
          void controller.refresh()
          const off = ctx.remote.$on('credentials/reference-updated', (ref) => {
            if (ref === TOKEN_REF) void controller.refresh()
          })
          return () => {
            off()
            controller.dispose()
          }
        }, 'personal-hub: credential watch')

        ctx.effect(
          () =>
            ctx.slots.inject('plugins.row.config', () =>
              ctx.slots.register(
                {
                  name: 'plugins.row.config',
                  id: 'personal-hub-telegram',
                  key: ROW_KEY,
                  order: 10,
                  label: () => t('title'),
                  locale: NS,
                  inject: () => ({
                    subscribe: controller.subscribe,
                    getState: controller.getState,
                    save: controller.save,
                    clear: controller.clear,
                  }),
                },
                TelegramCard,
              ),
            ),
          'personal-hub: row config card',
        )
      },
    }
  },
})
