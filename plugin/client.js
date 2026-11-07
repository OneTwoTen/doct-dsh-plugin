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
    /** Connection channel the Host feature mounts. */
    const GIT_CHANNEL = '/personal-hub-git'
    /** This plugin's tab-type identity in the right Sidebar. */
    const GIT_ID = '@local/personal-hub/git'
    /** The tab kind the guide and the header button open. */
    const GIT_KIND = 'personal-hub-git'
    /** Lines one diff pane renders before it stops and says so. */
    const MAX_DIFF_LINES = 4000

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

      gitTab: 'Git',
      gitGuide: 'Git',
      gitGuideHint: 'Changes, pull requests, and issues',
      gitOpen: 'Open the Git panel',
      gitChanges: 'Changes',
      gitPulls: 'Pull requests',
      gitIssues: 'Issues',
      gitCommits: 'Commits',
      gitRefresh: 'Refresh',
      gitLoading: 'Loading…',
      gitRetry: 'Retry',
      gitBack: 'Back',
      gitClean: 'No uncommitted changes',
      gitCleanHint: 'The working tree matches the last commit.',
      gitNoRepo: 'Not a git repository',
      gitNoRepoHint: 'This session’s folder is not inside a repository. Open a session in a project folder to use this panel.',
      gitNoDirectory: 'This session has no working folder yet.',
      gitReadError: 'Could not read the repository',
      gitBridgeHint: 'The Host half of this plugin is not loaded yet. Restart Harness after installing or updating the plugin.',
      gitStaged: 'Staged',
      gitUnstaged: 'Changes',
      gitUntracked: 'Untracked',
      gitConflicted: 'Conflicts',
      gitFilesOne: '{count} file',
      gitFilesMany: '{count} files',
      gitChangedFiles: '{count} changed',
      gitStashCount: '{count} stashed',
      gitAhead: 'Ahead {count}',
      gitBehind: 'Behind {count}',
      gitBinary: 'Binary file — no text diff to show.',
      gitNoText: 'No textual changes in this file.',
      gitTruncated: 'This diff is longer than the panel shows, so it stops here.',
      gitTooLarge: 'This file is larger than the diff limit, so only part of it is shown.',
      gitRenamedFrom: 'Renamed from {path}',
      gitCopyPath: 'Copy path',
      gitCopied: 'Path copied.',
      gitFilesHeading: 'Files',
      gitOpenOnWeb: 'Open on the web',
      gitChecks: 'Checks',
      gitNoChecks: 'No checks reported',
      gitChecksUnavailable: 'The GitHub CLI reports check details; without it this panel cannot show them.',
      gitReview: 'Review',
      gitReviewApproved: 'Approved',
      gitReviewChanges: 'Changes requested',
      gitReviewRequired: 'Review required',
      gitReviewNone: 'No review yet',
      gitMergeable: 'Mergeable',
      gitConflicting: 'Has conflicts',
      gitMergeUnknown: 'Merge state unknown',
      gitDescription: 'Description',
      gitNoDescription: 'No description.',
      gitStateOpen: 'Open',
      gitStateDraft: 'Draft',
      gitStateMerged: 'Merged',
      gitStateClosed: 'Closed',
      gitFilterOpen: 'Open',
      gitFilterClosed: 'Closed',
      gitFilterMerged: 'Merged',
      gitFilterAll: 'All',
      gitEmptyPulls: 'No pull requests',
      gitEmptyPullsHint: 'Nothing matches this filter.',
      gitEmptyIssues: 'No issues',
      gitEmptyIssuesHint: 'Nothing matches this filter.',
      gitForgeOff: 'Pull requests and issues need a code host',
      gitForgeHint: 'Add a GitHub or GitLab remote to this repository, or sign in with the code host CLI.',
      gitBy: 'by {author}',
      gitUpdated: 'updated {when}',
      gitCommented: '{count} comments',
      gitFrom: 'from {branch}',
      gitCommitListEmpty: 'No commits yet',
      gitCommitListEmptyHint: 'The repository has no commits.',
      gitAuthor: 'Author',
      gitDate: 'Date',
      gitHash: 'Commit',
      gitLoadingLong: 'Reading the repository…',
      gitChecksFailure: '{count} failed',
      gitChecksPending: '{count} running',
      gitChecksSuccess: '{count} passed',
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

      gitTab: 'Git',
      gitGuide: 'Git',
      gitGuideHint: 'Thay đổi, pull request và issue',
      gitOpen: 'Mở bảng Git',
      gitChanges: 'Thay đổi',
      gitPulls: 'Pull request',
      gitIssues: 'Issue',
      gitCommits: 'Commit',
      gitRefresh: 'Làm mới',
      gitLoading: 'Đang tải…',
      gitRetry: 'Thử lại',
      gitBack: 'Quay lại',
      gitClean: 'Không có thay đổi chưa commit',
      gitCleanHint: 'Cây làm việc trùng với commit gần nhất.',
      gitNoRepo: 'Không phải kho git',
      gitNoRepoHint: 'Thư mục của phiên này không nằm trong kho git. Mở phiên trong thư mục dự án để dùng bảng này.',
      gitNoDirectory: 'Phiên này chưa có thư mục làm việc.',
      gitReadError: 'Không đọc được kho mã',
      gitBridgeHint: 'Phần Host của plugin chưa được nạp. Hãy khởi động lại Harness sau khi cài hoặc cập nhật plugin.',
      gitStaged: 'Đã stage',
      gitUnstaged: 'Chưa stage',
      gitUntracked: 'Chưa theo dõi',
      gitConflicted: 'Xung đột',
      gitFilesOne: '{count} tệp',
      gitFilesMany: '{count} tệp',
      gitChangedFiles: '{count} thay đổi',
      gitStashCount: '{count} đang stash',
      gitAhead: 'Hơn {count} commit',
      gitBehind: 'Chậm {count} commit',
      gitBinary: 'Tệp nhị phân — không có diff văn bản.',
      gitNoText: 'Tệp này không có thay đổi văn bản.',
      gitTruncated: 'Diff dài hơn mức bảng hiển thị nên dừng ở đây.',
      gitTooLarge: 'Tệp lớn hơn giới hạn diff nên chỉ hiển thị một phần.',
      gitRenamedFrom: 'Đổi tên từ {path}',
      gitCopyPath: 'Sao chép đường dẫn',
      gitCopied: 'Đã sao chép đường dẫn.',
      gitFilesHeading: 'Tệp',
      gitOpenOnWeb: 'Mở trên web',
      gitChecks: 'Kiểm tra',
      gitNoChecks: 'Chưa có kiểm tra',
      gitChecksUnavailable: 'Cần GitHub CLI để xem chi tiết kiểm tra.',
      gitReview: 'Đánh giá',
      gitReviewApproved: 'Đã duyệt',
      gitReviewChanges: 'Yêu cầu sửa',
      gitReviewRequired: 'Cần đánh giá',
      gitReviewNone: 'Chưa có đánh giá',
      gitMergeable: 'Có thể gộp',
      gitConflicting: 'Đang xung đột',
      gitMergeUnknown: 'Chưa rõ trạng thái gộp',
      gitDescription: 'Mô tả',
      gitNoDescription: 'Không có mô tả.',
      gitStateOpen: 'Đang mở',
      gitStateDraft: 'Bản nháp',
      gitStateMerged: 'Đã gộp',
      gitStateClosed: 'Đã đóng',
      gitFilterOpen: 'Đang mở',
      gitFilterClosed: 'Đã đóng',
      gitFilterMerged: 'Đã gộp',
      gitFilterAll: 'Tất cả',
      gitEmptyPulls: 'Không có pull request',
      gitEmptyPullsHint: 'Không có mục nào khớp bộ lọc này.',
      gitEmptyIssues: 'Không có issue',
      gitEmptyIssuesHint: 'Không có mục nào khớp bộ lọc này.',
      gitForgeOff: 'Pull request và issue cần máy chủ mã nguồn',
      gitForgeHint: 'Thêm remote GitHub hoặc GitLab cho kho mã, hoặc đăng nhập bằng CLI của máy chủ đó.',
      gitBy: 'bởi {author}',
      gitUpdated: 'cập nhật {when}',
      gitCommented: '{count} bình luận',
      gitFrom: 'từ {branch}',
      gitCommitListEmpty: 'Chưa có commit',
      gitCommitListEmptyHint: 'Kho mã chưa có commit nào.',
      gitAuthor: 'Tác giả',
      gitDate: 'Thời điểm',
      gitHash: 'Commit',
      gitLoadingLong: 'Đang đọc kho mã…',
      gitChecksFailure: '{count} lỗi',
      gitChecksPending: '{count} đang chạy',
      gitChecksSuccess: '{count} đạt',
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

    /** Class vocabulary of the Git panel; every colour is a theme alias token. */
    const GIT_CSS = `
.ph-git{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.5}
.ph-head{display:flex;flex-direction:column;gap:6px;padding:10px 12px 9px;border-bottom:1px solid var(--dsw-alias-border-l3);flex:none}
.ph-row{display:flex;align-items:center;gap:6px;min-width:0}
.ph-repo-row{gap:8px}
.ph-glyph{display:inline-flex;flex:none;color:var(--dsw-alias-label-tertiary)}
.ph-repo{min-width:0;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-spacer{flex:1 1 auto;min-width:0}
.ph-icon-button{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none}
.ph-icon-button:hover:enabled{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ph-icon-button:disabled{cursor:default;opacity:.6}
.ph-icon-button[data-busy=true] svg{animation:ph-spin 1s linear infinite}
@keyframes ph-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.ph-icon-button[data-busy=true] svg{animation:none}}
.ph-branch{display:inline-flex;align-items:center;gap:4px;max-width:100%;min-width:0;padding:1px 7px 1px 6px;border-radius:7px;background:var(--dsw-alias-interactive-bg-hover);font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:11.5px}
.ph-ellipsis{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-pill{flex:none;padding:0 6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:11px;font-variant-numeric:tabular-nums}
.ph-dim{color:var(--dsw-alias-label-tertiary)}
.ph-tiny{font-size:11px}
.ph-mono{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace)}
.ph-add{color:var(--dsw-alias-state-success-primary);font-variant-numeric:tabular-nums}
.ph-del{color:var(--dsw-alias-state-error-primary);font-variant-numeric:tabular-nums}
.ph-stats{flex-wrap:wrap;gap:8px;font-size:11.5px}
.ph-bar{display:flex;height:4px;min-width:40px;max-width:140px;flex:1 1 40px;border-radius:999px;overflow:hidden;background:var(--dsw-alias-interactive-bg-hover)}
.ph-bar-add{background:var(--dsw-alias-state-success-primary)}
.ph-bar-del{background:var(--dsw-alias-state-error-primary)}
.ph-tabs{display:flex;gap:2px;padding:0 8px;border-bottom:1px solid var(--dsw-alias-border-l3);flex:none;overflow-x:auto;scrollbar-width:none}
.ph-tabs::-webkit-scrollbar{display:none}
.ph-tab{display:inline-flex;align-items:center;gap:5px;padding:7px 8px;border:0;border-radius:6px 6px 0 0;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;white-space:nowrap;cursor:pointer;box-shadow:inset 0 -2px 0 transparent}
.ph-tab:hover{color:var(--dsw-alias-label-primary)}
.ph-tab[aria-selected=true]{color:var(--dsw-alias-label-primary);box-shadow:inset 0 -2px 0 var(--dsw-alias-brand-primary)}
.ph-tab-count{font-size:10.5px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.ph-body{flex:1 1 auto;min-height:0;overflow:auto}
.ph-section{display:flex;align-items:center;gap:6px;padding:9px 12px 3px;font-size:10.5px;letter-spacing:.03em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}
.ph-file{display:flex;align-items:center;gap:8px;width:100%;padding:5px 12px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.ph-file:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ph-file[data-active=true]{background:var(--dsw-alias-interactive-bg-hover)}
.ph-badge{display:grid;place-items:center;width:17px;height:17px;flex:none;border-radius:5px;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:10px;font-weight:700;background:var(--dsw-alias-interactive-bg-hover)}
.ph-badge[data-tone=success]{color:var(--dsw-alias-state-success-primary)}
.ph-badge[data-tone=error]{color:var(--dsw-alias-state-error-primary)}
.ph-badge[data-tone=warn]{color:var(--dsw-alias-state-warn-primary)}
.ph-badge[data-tone=business]{color:var(--dsw-alias-state-business-primary)}
.ph-badge[data-tone=muted]{color:var(--dsw-alias-label-tertiary)}
.ph-file-text{display:flex;align-items:baseline;gap:1px;min-width:0;flex:1 1 auto;overflow:hidden}
.ph-dir{min-width:0;flex:0 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:11.5px}
.ph-name{flex:none;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-counts{display:inline-flex;gap:6px;flex:none;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}
.ph-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:100%;min-height:180px;padding:24px;text-align:center;color:var(--dsw-alias-label-secondary)}
.ph-empty-icon{color:var(--dsw-alias-label-tertiary);display:inline-flex}
.ph-empty-title{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500}
.ph-empty-hint{font-size:12px;max-width:280px}
.ph-notice{margin:8px 12px;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:12px}
.ph-notice-code{margin-top:4px;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11.5px;color:var(--dsw-alias-label-primary)}
.ph-error{display:flex;flex-direction:column;gap:8px;align-items:flex-start;padding:16px 14px;color:var(--dsw-alias-label-secondary);font-size:12px}
.ph-error-title{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500}
.ph-error-code{font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px;color:var(--dsw-alias-label-tertiary)}
.ph-button{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.ph-button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ph-diff-head{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base)}
.ph-diff-body{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:var(--dsh-code-font-size,12px);line-height:1.55;padding-bottom:16px;min-width:max-content}
.ph-hunk-head{position:sticky;top:40px;z-index:1;padding:3px 10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);font-size:11.5px;white-space:pre}
.ph-line{display:grid;grid-template-columns:3.2em 3.2em 1.4em minmax(0,1fr);white-space:pre}
.ph-line[data-kind=add]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 13%,transparent)}
.ph-line[data-kind=del]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 13%,transparent)}
.ph-line[data-kind=meta]{color:var(--dsw-alias-label-tertiary);font-style:italic}
.ph-num{padding:0 6px;text-align:right;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;user-select:none}
.ph-sign{color:var(--dsw-alias-label-tertiary);text-align:center;user-select:none}
.ph-line[data-kind=add] .ph-sign{color:var(--dsw-alias-state-success-primary)}
.ph-line[data-kind=del] .ph-sign{color:var(--dsw-alias-state-error-primary)}
.ph-code{padding-right:12px;overflow-wrap:anywhere}
.ph-item{display:flex;flex-direction:column;gap:3px;width:100%;padding:8px 12px;border:0;border-bottom:1px solid var(--dsw-alias-border-l3);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.ph-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ph-item-title{display:flex;align-items:baseline;gap:6px;min-width:0}
.ph-item-number{flex:none;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11.5px}
.ph-item-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px}
.ph-item-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--dsw-alias-label-tertiary);min-width:0}
.ph-dot{display:inline-block;width:7px;height:7px;border-radius:999px;flex:none;background:var(--dsw-alias-label-tertiary)}
.ph-dot[data-state=success],.ph-dot[data-state=open]{background:var(--dsw-alias-state-success-primary)}
.ph-dot[data-state=failure]{background:var(--dsw-alias-state-error-primary)}
.ph-dot[data-state=pending]{background:var(--dsw-alias-state-warn-primary)}
.ph-dot[data-state=merged]{background:var(--dsw-alias-state-business-primary)}
.ph-dot[data-state=closed]{background:var(--dsw-alias-state-error-primary)}
.ph-dot[data-state=draft]{background:var(--dsw-alias-label-tertiary)}
.ph-chip{display:inline-flex;align-items:center;gap:4px;padding:0 6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:10.5px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-chip[data-tone=success]{color:var(--dsw-alias-state-success-primary)}
.ph-chip[data-tone=error]{color:var(--dsw-alias-state-error-primary)}
.ph-chip[data-tone=warn]{color:var(--dsw-alias-state-warn-primary)}
.ph-chip[data-tone=business]{color:var(--dsw-alias-state-business-primary)}
.ph-filters{display:flex;gap:4px;padding:8px 12px;flex-wrap:wrap;flex:none;border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-filter{padding:3px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer}
.ph-filter:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ph-filter[aria-pressed=true]{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff}
.ph-detail{display:flex;flex-direction:column;gap:10px;padding:10px 12px 24px}
.ph-detail-title{font-size:14px;font-weight:600;line-height:1.4;overflow-wrap:anywhere}
.ph-detail-meta{display:flex;flex-direction:column;gap:5px;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}
.ph-detail-row{display:flex;align-items:baseline;gap:8px;min-width:0}
.ph-detail-label{flex:none;width:72px;color:var(--dsw-alias-label-tertiary)}
.ph-detail-value{display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:wrap;color:var(--dsw-alias-label-primary)}
.ph-prose{margin:0;font-size:12.5px;line-height:1.6;color:var(--dsw-alias-label-primary);white-space:pre-wrap;overflow-wrap:anywhere}
.ph-card{display:flex;flex-direction:column;gap:6px;padding:10px;border:1px solid var(--dsw-alias-border-l3);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.ph-card-title{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.ph-check{display:flex;align-items:center;gap:8px;font-size:12px;min-width:0}
.ph-check-name{min-width:0;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-check-duration{flex:none;color:var(--dsw-alias-label-tertiary);font-size:11px;font-variant-numeric:tabular-nums}
.ph-comment{display:flex;flex-direction:column;gap:3px;padding:7px 0;border-top:1px solid var(--dsw-alias-border-l3)}
.ph-comment-head{display:flex;align-items:baseline;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}
.ph-comment-author{color:var(--dsw-alias-label-primary);font-weight:500}
.ph-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.ph-split{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
`

    /** Tiny stroke icons, drawn with `currentColor` so they follow the theme. */
    function Icon(props) {
      const size = props.size ?? 16
      const common = {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: props.weight ?? 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        style: { display: 'block', flex: 'none' },
      }
      switch (props.name) {
        case 'git':
          return h('svg', common,
            h('circle', { cx: 5, cy: 4, r: 1.6 }),
            h('circle', { cx: 5, cy: 12, r: 1.6 }),
            h('circle', { cx: 11, cy: 6.5, r: 1.6 }),
            h('path', { d: 'M5 5.6v4.8' }),
            h('path', { d: 'M11 8.1c0 1.9-1.7 2.8-3.6 3.1' }),
          )
        case 'branch':
          return h('svg', common,
            h('circle', { cx: 4.5, cy: 3.5, r: 1.5 }),
            h('circle', { cx: 4.5, cy: 12.5, r: 1.5 }),
            h('circle', { cx: 11.5, cy: 5.5, r: 1.5 }),
            h('path', { d: 'M4.5 5v6' }),
            h('path', { d: 'M11.5 7c0 2.2-1.6 3.2-3.5 3.6' }),
          )
        case 'file':
          return h('svg', common, h('path', { d: 'M9 1.8H4.8A1.3 1.3 0 0 0 3.5 3.1v9.8a1.3 1.3 0 0 0 1.3 1.3h6.4a1.3 1.3 0 0 0 1.3-1.3V5.3z' }), h('path', { d: 'M9 1.8v3.5h3.5' }))
        case 'refresh':
          return h('svg', common, h('path', { d: 'M13.2 7.2a5.2 5.2 0 1 0 .2 2' }), h('path', { d: 'M13.4 3.2v4h-4' }))
        case 'back':
          return h('svg', common, h('path', { d: 'M9.5 3.5 5 8l4.5 4.5' }))
        case 'external':
          return h('svg', common, h('path', { d: 'M9.5 2.5h4v4' }), h('path', { d: 'M13.5 2.5 7.8 8.2' }), h('path', { d: 'M12 9.6v3.2a1.2 1.2 0 0 1-1.2 1.2H3.7a1.2 1.2 0 0 1-1.2-1.2V5.7a1.2 1.2 0 0 1 1.2-1.2h3.2' }))
        case 'copy':
          return h('svg', common, h('rect', { x: 5.5, y: 5.5, width: 8, height: 8, rx: 1.5 }), h('path', { d: 'M10.5 5.5V3.9a1.4 1.4 0 0 0-1.4-1.4H3.9a1.4 1.4 0 0 0-1.4 1.4v5.2a1.4 1.4 0 0 0 1.4 1.4h1.6' }))
        case 'check':
          return h('svg', common, h('path', { d: 'M3 8.4 6.3 11.7 13 4.8' }))
        case 'cross':
          return h('svg', common, h('path', { d: 'M4 4l8 8M12 4l-8 8' }))
        case 'dot':
          return h('svg', { ...common, strokeWidth: 0 }, h('circle', { cx: 8, cy: 8, r: 3.2, fill: 'currentColor', stroke: 'none' }))
        case 'clock':
          return h('svg', common, h('circle', { cx: 8, cy: 8, r: 5.6 }), h('path', { d: 'M8 4.9V8l2.2 1.5' }))
        case 'alert':
          return h('svg', common, h('path', { d: 'M8 2.4 14 13H2z' }), h('path', { d: 'M8 6.3v3.1' }), h('path', { d: 'M8 11.3v.1' }))
        case 'comment':
          return h('svg', common, h('path', { d: 'M13.5 8.6c0 2.4-2.5 4.3-5.5 4.3-.7 0-1.5-.1-2.2-.3L3 13.5l1-2.4c-.7-.7-1-1.6-1-2.5C3 6.2 5.5 4.3 8 4.3s5.5 1.9 5.5 4.3z' }))
        case 'merge':
          return h('svg', common, h('circle', { cx: 4.5, cy: 4, r: 1.5 }), h('circle', { cx: 4.5, cy: 12, r: 1.5 }), h('circle', { cx: 11.5, cy: 8, r: 1.5 }), h('path', { d: 'M4.5 5.5v5' }), h('path', { d: 'M10 8H7.2a2.7 2.7 0 0 1-2.7-2.7' }))
        case 'issue':
          return h('svg', common, h('circle', { cx: 8, cy: 8, r: 5.6 }), h('path', { d: 'M8 5.2v3.3' }), h('path', { d: 'M8 10.8v.1' }))
        case 'commit':
          return h('svg', common, h('circle', { cx: 8, cy: 8, r: 2.6 }), h('path', { d: 'M1.8 8h3.6M10.6 8h3.6' }))
        case 'folder':
          return h('svg', common, h('path', { d: 'M2.5 5.2a1.2 1.2 0 0 1 1.2-1.2h2.4l1.4 1.6h4.8a1.2 1.2 0 0 1 1.2 1.2v5.1a1.2 1.2 0 0 1-1.2 1.2H3.7a1.2 1.2 0 0 1-1.2-1.2z' }))
        case 'chevron':
          return h('svg', common, h('path', { d: 'M6 4l4 4-4 4' }))
        default:
          return h('svg', common, h('circle', { cx: 8, cy: 8, r: 5.5 }))
      }
    }

    /** One glyph for the guide card, sized by the Sidebar. */
    function GitGlyph(props) {
      return h(Icon, { name: 'git', size: props.size ?? 22, className: props.className })
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

    /* ------------------------------------------------------------------ */
    /* Git panel                                                          */
    /* ------------------------------------------------------------------ */

    /** One caller for the Host channel, folding every failure into a thrown error. */
    function createGitCaller(connection) {
      return async function call(endpoint, payload) {
        let result
        try {
          result = await connection.rpc.call(GIT_CHANNEL, endpoint, payload)
        } catch (error) {
          throw failureOf('connection/failed', messageOf(error))
        }
        if (result === undefined || result === null) throw failureOf('connection/empty', 'The Host sent no answer')
        if (result.ok !== true) {
          const detail = result.error ?? {}
          throw failureOf(detail.code ?? 'system/failed', detail.message ?? 'Git request failed')
        }
        return result.value
      }
    }

    function failureOf(code, message) {
      const error = new Error(message)
      error.code = code
      return error
    }

    /** Load one value, keeping the previous one on screen while it reloads. */
    function useLoader(loader, deps) {
      const [state, setState] = React.useState({ status: 'loading', value: undefined, error: undefined })
      React.useEffect(() => {
        let alive = true
        setState((previous) => ({ status: 'loading', value: previous.value, error: undefined }))
        Promise.resolve()
          .then(loader)
          .then((value) => {
            if (alive) setState({ status: 'ready', value, error: undefined })
          })
          .catch((error) => {
            if (alive) setState({ status: 'error', value: undefined, error })
          })
        return () => {
          alive = false
        }
      }, deps)
      return state
    }

    const STATUS_META = {
      added: { letter: 'A', tone: 'success' },
      modified: { letter: 'M', tone: 'warn' },
      deleted: { letter: 'D', tone: 'error' },
      renamed: { letter: 'R', tone: 'business' },
      copied: { letter: 'C', tone: 'business' },
      typechange: { letter: 'T', tone: 'warn' },
      conflicted: { letter: '!', tone: 'error' },
      untracked: { letter: 'U', tone: 'muted' },
    }

    /** Human text for an instant, in the reader's own language and unit. */
    function relativeTime(value) {
      const time = typeof value === 'number' ? value : Date.parse(String(value ?? ''))
      if (!Number.isFinite(time)) return ''
      const seconds = Math.round((time - Date.now()) / 1000)
      const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
      const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
      for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit)
      }
      return formatter.format(seconds, 'second')
    }

    /** Split a repository path into the dimmed directory and the file name. */
    function splitPath(path) {
      const text = String(path ?? '')
      const index = text.lastIndexOf('/')
      return index < 0 ? { dir: '', name: text } : { dir: text.slice(0, index + 1), name: text.slice(index + 1) }
    }

    /** A compact `+n −m` pair. */
    function Counts(props) {
      if ((props.additions ?? 0) === 0 && (props.deletions ?? 0) === 0) return null
      return h('span', { className: 'ph-counts' },
        props.additions > 0 ? h('span', { className: 'ph-add' }, `+${props.additions}`) : null,
        props.deletions > 0 ? h('span', { className: 'ph-del' }, `−${props.deletions}`) : null)
    }

    /** A stacked bar of added and removed lines, so the size of a change is visible at a glance. */
    function DiffBar(props) {
      const additions = Number(props.additions) || 0
      const deletions = Number(props.deletions) || 0
      const total = additions + deletions
      if (total === 0) return null
      const added = Math.max(2, Math.round((additions / total) * 100))
      return h('span', { className: 'ph-bar', 'aria-hidden': 'true' },
        h('span', { className: 'ph-bar-add', style: { width: `${added}%` } }),
        h('span', { className: 'ph-bar-del', style: { width: `${100 - added}%` } }))
    }

    /** The guide's own state label for a change request. */
    function stateLabel(t, state) {
      switch (state) {
        case 'open': return t('gitStateOpen')
        case 'draft': return t('gitStateDraft')
        case 'merged': return t('gitStateMerged')
        case 'closed': return t('gitStateClosed')
        default: return state
      }
    }

    /** One empty or placeholder state. */
    function Empty(props) {
      return h('div', { className: 'ph-empty' },
        h('span', { className: 'ph-empty-icon' }, h(Icon, { name: props.icon ?? 'git', size: 26 })),
        h('span', { className: 'ph-empty-title' }, props.title),
        props.hint === undefined ? null : h('span', { className: 'ph-empty-hint' }, props.hint),
        props.action ?? null)
    }

    /** One failed load, with the Host's code so a report can be acted on. */
    function Failure(props) {
      const error = props.error
      return h('div', { className: 'ph-error' },
        h('span', { className: 'ph-error-title' }, h(Icon, { name: 'alert', size: 15 }), props.title ?? 'Error'),
        h('span', null, messageOf(error)),
        error?.code === undefined ? null : h('span', { className: 'ph-error-code' }, error.code),
        props.onRetry === undefined ? null : h('button', { type: 'button', className: 'ph-button', onClick: props.onRetry }, h(Icon, { name: 'refresh', size: 12 }), props.retryLabel ?? 'Retry'),
        props.hint === undefined ? null : h('span', { className: 'ph-dim ph-tiny' }, props.hint))
    }

    /** A small inline spinner-less loading row. */
    function Loading(props) {
      return h('div', { className: 'ph-error' }, h('span', { className: 'ph-dim' }, props.label ?? 'Loading…'))
    }

    /** The panel header: repository, branch, counters, and the refresh control. */
    function GitHeader(props) {
      const { t, overview, refreshing, onRefresh } = props
      const stats = overview?.stats
      const repo = overview?.repo
      const files = stats?.files ?? 0
      const pull = overview?.branchPull
      return h('div', { className: 'ph-head' },
        h('div', { className: 'ph-row ph-repo-row' },
          h('span', { className: 'ph-glyph' }, h(Icon, { name: 'git', size: 15 })),
          h('span', { className: 'ph-repo', title: repo?.root ?? '' }, repo?.name ?? t('gitTab')),
          h('span', { className: 'ph-spacer' }),
          h('button', {
            type: 'button',
            className: 'ph-icon-button',
            title: t('gitRefresh'),
            'aria-label': t('gitRefresh'),
            'data-busy': refreshing ? 'true' : 'false',
            disabled: refreshing,
            onClick: onRefresh,
          }, h(Icon, { name: 'refresh', size: 14 }))),
        repo === undefined ? null : h('div', { className: 'ph-row', style: { flexWrap: 'wrap' } },
          h('span', { className: 'ph-branch', title: repo.upstream === null ? (repo.branch ?? 'HEAD') : `${repo.branch ?? 'HEAD'} → ${repo.upstream}` },
            h(Icon, { name: 'branch', size: 12 }),
            h('span', { className: 'ph-ellipsis' }, repo.detached === true ? `HEAD ${repo.shortOid ?? ''}` : repo.branch ?? 'HEAD')),
          repo.ahead > 0 ? h('span', { className: 'ph-pill', title: t('gitAhead', { count: repo.ahead }) }, `↑${repo.ahead}`) : null,
          repo.behind > 0 ? h('span', { className: 'ph-pill', title: t('gitBehind', { count: repo.behind }) }, `↓${repo.behind}`) : null,
          repo.remote?.slug ? h('span', { className: 'ph-dim ph-tiny ph-ellipsis' }, repo.remote.slug) : null),
        h('div', { className: 'ph-row ph-stats' },
          files === 0
            ? h('span', { className: 'ph-dim' }, t('gitClean'))
            : [
                h('span', { key: 'count', className: 'ph-dim' }, t(files === 1 ? 'gitFilesOne' : 'gitFilesMany', { count: files })),
                h('span', { key: 'add', className: 'ph-add' }, `+${stats.additions}`),
                h('span', { key: 'del', className: 'ph-del' }, `−${stats.deletions}`),
                h(DiffBar, { key: 'bar', additions: stats.additions, deletions: stats.deletions }),
                overview.stash > 0 ? h('span', { key: 'stash', className: 'ph-dim' }, t('gitStashCount', { count: overview.stash })) : null,
              ],
          pull === null || pull === undefined ? null : h('button', {
            type: 'button',
            className: 'ph-chip',
            'data-tone': pull.state === 'merged' ? 'business' : pull.state === 'closed' ? 'error' : pull.state === 'draft' ? undefined : 'success',
            title: pull.title,
            onClick: () => props.onOpenPull(pull.number),
          }, h('span', { className: 'ph-dot', 'data-state': pull.state }), `#${pull.number}`, stateLabel(t, pull.state))))
    }

    /** The four views' tab strip. */
    function GitNav(props) {
      const { t, value, onChange, overview } = props
      const items = [
        { id: 'changes', label: t('gitChanges'), count: overview?.stats?.files ?? 0 },
        { id: 'pulls', label: t('gitPulls'), count: props.pullCount ?? 0 },
        { id: 'issues', label: t('gitIssues'), count: props.issueCount ?? 0 },
        { id: 'commits', label: t('gitCommits'), count: 0 },
      ]
      return h('div', { className: 'ph-tabs', role: 'tablist' },
        items.map((item) => h('button', {
          key: item.id,
          type: 'button',
          role: 'tab',
          className: 'ph-tab',
          'aria-selected': value === item.id ? 'true' : 'false',
          onClick: () => onChange(item.id),
        }, h('span', null, item.label), item.count > 0 ? h('span', { className: 'ph-tab-count' }, String(item.count)) : null)))
    }

    /** One file row in the changes list or a commit's file list. */
    function FileRow(props) {
      const { file, t, active, onSelect } = props
      const meta = STATUS_META[file.kind] ?? STATUS_META.modified
      const parts = splitPath(file.path)
      const title = file.origPath === undefined ? file.path : t('gitRenamedFrom', { path: file.origPath })
      return h('button', {
        type: 'button',
        className: 'ph-file',
        'data-active': active === true ? 'true' : 'false',
        title,
        onClick: () => onSelect(file),
      },
        h('span', { className: 'ph-badge', 'data-tone': meta.tone, 'aria-hidden': 'true' }, meta.letter),
        h('span', { className: 'ph-file-text' },
          parts.dir.length > 0 ? h('span', { className: 'ph-dir' }, parts.dir) : null,
          h('span', { className: 'ph-name' }, parts.name)),
        file.binary === true ? h('span', { className: 'ph-dim ph-tiny' }, 'bin') : h(Counts, { additions: file.additions, deletions: file.deletions }))
    }

    /** The changes view: staged, unstaged, untracked, and conflicted groups. */
    function ChangesView(props) {
      const { t, overview, onSelect, selection } = props
      const files = overview.files ?? []
      if (files.length === 0) {
        return h(Empty, { icon: 'check', title: t('gitClean'), hint: t('gitCleanHint') })
      }
      const groups = [
        { id: 'conflicted', label: t('gitConflicted'), files: files.filter((file) => file.conflicted === true) },
        { id: 'staged', label: t('gitStaged'), files: files.filter((file) => file.conflicted !== true && file.staged === true) },
        { id: 'unstaged', label: t('gitUnstaged'), files: files.filter((file) => file.conflicted !== true && file.untracked !== true && file.unstaged === true) },
        { id: 'untracked', label: t('gitUntracked'), files: files.filter((file) => file.untracked === true) },
      ].filter((group) => group.files.length > 0)

      return h('div', null, groups.map((group) => h('div', { key: group.id },
        h('div', { className: 'ph-section' },
          h('span', null, group.label),
          h('span', { className: 'ph-tab-count' }, String(group.files.length))),
        group.files.map((file) => h(FileRow, {
          key: `${group.id}:${file.path}`,
          file,
          t,
          active: selection !== null && selection.type === 'file' && selection.path === file.path && selection.staged === (group.id === 'staged'),
          onSelect: () => onSelect({ type: 'file', path: file.path, staged: group.id === 'staged', untracked: file.untracked === true, kind: file.kind }),
        })))))
    }

    /** Render parsed hunks with a gutter, hunk separators, and add/remove tints. */
    function PatchBody(props) {
      const { t, files, truncated } = props
      let budget = MAX_DIFF_LINES
      const blocks = []
      for (const [fileIndex, file] of files.entries()) {
        if (file.binary === true) {
          blocks.push(h('div', { key: `bin-${fileIndex}`, className: 'ph-notice' }, t('gitBinary')))
          continue
        }
        if (file.hunks.length === 0) {
          blocks.push(h('div', { key: `empty-${fileIndex}`, className: 'ph-notice' }, t('gitNoText')))
          continue
        }
        for (const [hunkIndex, hunk] of file.hunks.entries()) {
          if (budget <= 0) break
          const rows = [h('div', { key: `h-${fileIndex}-${hunkIndex}`, className: 'ph-hunk-head' }, hunk.header)]
          for (const [lineIndex, line] of hunk.lines.entries()) {
            if (budget <= 0) break
            budget -= 1
            rows.push(h('div', { key: `l-${fileIndex}-${hunkIndex}-${lineIndex}`, className: 'ph-line', 'data-kind': line.type },
              h('span', { className: 'ph-num' }, line.oldNumber === null ? '' : String(line.oldNumber)),
              h('span', { className: 'ph-num' }, line.newNumber === null ? '' : String(line.newNumber)),
              h('span', { className: 'ph-sign' }, line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '),
              h('span', { className: 'ph-code' }, line.text.length === 0 ? ' ' : line.text)))
          }
          blocks.push(h('div', { key: `hunk-${fileIndex}-${hunkIndex}` }, rows))
        }
      }
      if (budget <= 0) blocks.push(h('div', { key: 'truncated', className: 'ph-notice' }, t('gitTruncated')))
      if (truncated === true) blocks.push(h('div', { key: 'cut', className: 'ph-notice' }, t('gitTooLarge')))
      return h('div', { className: 'ph-diff-body' }, blocks)
    }

    /** A header row for a detail pane, with Back and the file path. */
    function DetailBar(props) {
      return h('div', { className: 'ph-diff-head' },
        h('button', { type: 'button', className: 'ph-icon-button', title: props.t('gitBack'), 'aria-label': props.t('gitBack'), onClick: props.onBack }, h(Icon, { name: 'back', size: 15 })),
        h('span', { className: 'ph-file-text' },
          props.dir !== undefined && props.dir.length > 0 ? h('span', { className: 'ph-dir' }, props.dir) : null,
          h('span', { className: 'ph-name' }, props.name)),
        h('span', { className: 'ph-spacer' }),
        props.children)
    }

    /** One file's diff. */
    function DiffPane(props) {
      const { t, call, sessionId, cwd, selection, refreshKey, onBack } = props
      const state = useLoader(() => call('diff', {
        sessionId,
        cwd: cwd || undefined,
        path: selection.path,
        staged: selection.staged === true,
        untracked: selection.untracked === true,
      }), [selection.path, selection.staged, selection.untracked, refreshKey, sessionId, cwd])
      const parts = splitPath(selection.path)
      const value = state.value
      const patch = value?.files?.[0]
      const [copied, setCopied] = React.useState(false)

      const copy = () => {
        const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard
        if (clipboard === undefined) return
        clipboard.writeText(selection.path).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }).catch(() => {})
      }

      return h('div', null,
        h(DetailBar, { t, dir: parts.dir, name: parts.name, onBack },
          patch === undefined ? null : h(Counts, { additions: patch.additions, deletions: patch.deletions }),
          h('button', { type: 'button', className: 'ph-icon-button', title: copied ? t('gitCopied') : t('gitCopyPath'), 'aria-label': t('gitCopyPath'), onClick: copy }, h(Icon, { name: copied ? 'check' : 'copy', size: 14 }))),
        state.status === 'error' ? h(Failure, { error: state.error, title: t('gitReadError'), retryLabel: t('gitRetry'), onRetry: () => props.reload() }) : null,
        state.status === 'loading' && value === undefined ? h(Loading, { label: t('gitLoading') }) : null,
        state.value === undefined ? null : h(PatchBody, { t, files: state.value.files ?? [], truncated: state.value.truncated === true }))
    }

    /** The commit list. */
    function CommitsView(props) {
      const { t, call, sessionId, cwd, refreshKey, onSelect } = props
      const state = useLoader(() => call('commits', { sessionId, cwd: cwd || undefined, limit: 60 }), [sessionId, cwd, refreshKey])
      const commits = state.value?.commits ?? []
      if (state.status === 'error') return h(Failure, { error: state.error, title: t('gitReadError'), retryLabel: t('gitRetry'), onRetry: () => props.reload() })
      if (state.status === 'loading' && state.value === undefined) return h(Loading, { label: t('gitLoading') })
      if (commits.length === 0) return h(Empty, { icon: 'commit', title: t('gitCommitListEmpty'), hint: t('gitCommitListEmptyHint') })
      return h('div', null, commits.map((commit) => h('button', {
        key: commit.hash,
        type: 'button',
        className: 'ph-item',
        onClick: () => onSelect({ type: 'commit', hash: commit.hash }),
      },
        h('span', { className: 'ph-item-title' },
          h('span', { className: 'ph-item-number' }, commit.short),
          commit.refs.length > 0 ? h('span', { className: 'ph-chip', 'data-tone': 'business', title: commit.refs }, commit.refs.split(',')[0].trim()) : null,
          h('span', { className: 'ph-item-text' }, commit.subject)),
        h('span', { className: 'ph-item-meta' },
          h('span', null, commit.author),
          h('span', null, relativeTime(commit.date))))))
    }

    /** One commit: metadata, its files, and its patch. */
    function CommitPane(props) {
      const { t, call, sessionId, cwd, selection, refreshKey, onBack } = props
      const state = useLoader(() => call('commit', { sessionId, cwd: cwd || undefined, hash: selection.hash }), [selection.hash, refreshKey, sessionId, cwd])
      if (state.status === 'error') return h('div', null, h(DetailBar, { t, dir: '', name: selection.hash.slice(0, 8), onBack }), h(Failure, { error: state.error, title: t('gitReadError'), retryLabel: t('gitRetry'), onRetry: () => props.reload() }))
      if (state.value === undefined) return h('div', null, h(DetailBar, { t, dir: '', name: selection.hash.slice(0, 8), onBack }), h(Loading, { label: t('gitLoading') }))
      const value = state.value
      const commit = value.commit
      return h('div', null,
        h(DetailBar, { t, dir: '', name: commit.short, onBack },
          h(Counts, { additions: (value.files ?? []).reduce((sum, file) => sum + file.additions, 0), deletions: (value.files ?? []).reduce((sum, file) => sum + file.deletions, 0) })),
        h('div', { className: 'ph-detail' },
          h('div', { className: 'ph-detail-title' }, commit.subject),
          h('div', { className: 'ph-detail-meta' },
            h('div', { className: 'ph-detail-row' }, h('span', { className: 'ph-detail-label' }, t('gitAuthor')), h('span', { className: 'ph-detail-value' }, commit.author)),
            h('div', { className: 'ph-detail-row' }, h('span', { className: 'ph-detail-label' }, t('gitDate')), h('span', { className: 'ph-detail-value' }, relativeTime(commit.date))),
            h('div', { className: 'ph-detail-row' }, h('span', { className: 'ph-detail-label' }, t('gitHash')), h('span', { className: 'ph-detail-value ph-mono ph-tiny' }, commit.hash))),
          commit.body.length > 0 ? h('div', { className: 'ph-card' }, h('p', { className: 'ph-prose' }, commit.body)) : null,
          (value.files ?? []).length === 0 ? null : h('div', { className: 'ph-card' },
            h('div', { className: 'ph-card-title' }, h(Icon, { name: 'folder', size: 13 }), t('gitFilesHeading')),
            value.files.map((file) => h('div', { key: file.path, className: 'ph-row' },
              h('span', { className: 'ph-ellipsis', style: { flex: '1 1 auto' }, title: file.path }, file.path),
              h(Counts, { additions: file.additions, deletions: file.deletions }))))),
        h(PatchBody, { t, files: value.patches ?? [], truncated: value.truncated === true }))
    }

    /** The filter chips shared by the change-request and issue lists. */
    function Filters(props) {
      return h('div', { className: 'ph-filters', role: 'group' },
        props.options.map((option) => h('button', {
          key: option.id,
          type: 'button',
          className: 'ph-filter',
          'aria-pressed': props.value === option.id ? 'true' : 'false',
          onClick: () => props.onChange(option.id),
        }, option.label)))
    }

    /** One row for a change request. */
    function PullRow(props) {
      const { t, pull, onSelect } = props
      return h('button', { type: 'button', className: 'ph-item', onClick: () => onSelect({ type: 'pull', number: pull.number }) },
        h('span', { className: 'ph-item-title' },
          h('span', { className: 'ph-dot', 'data-state': pull.state }),
          h('span', { className: 'ph-item-number' }, `#${pull.number}`),
          h('span', { className: 'ph-item-text' }, pull.title)),
        h('span', { className: 'ph-item-meta' },
          h('span', { className: 'ph-chip', 'data-tone': pull.state === 'merged' ? 'business' : pull.state === 'closed' ? 'error' : undefined }, stateLabel(t, pull.state)),
          pull.checks.total > 0 ? h('span', { className: 'ph-chip', 'data-tone': pull.checks.state === 'failure' ? 'error' : pull.checks.state === 'pending' ? 'warn' : pull.checks.state === 'success' ? 'success' : undefined },
            h('span', { className: 'ph-dot', 'data-state': pull.checks.state }),
            pull.checks.failure > 0 ? t('gitChecksFailure', { count: pull.checks.failure }) : pull.checks.pending > 0 ? t('gitChecksPending', { count: pull.checks.pending }) : t('gitChecksSuccess', { count: pull.checks.success })) : null,
          pull.review === 'changes_requested' ? h('span', { className: 'ph-chip', 'data-tone': 'error' }, t('gitReviewChanges')) : null,
          pull.review === 'approved' ? h('span', { className: 'ph-chip', 'data-tone': 'success' }, t('gitReviewApproved')) : null,
          pull.branch.length > 0 ? h('span', { className: 'ph-chip ph-mono', title: pull.branch }, pull.branch) : null,
          pull.author.length > 0 ? h('span', null, t('gitBy', { author: pull.author })) : null,
          h('span', null, relativeTime(pull.updatedAt))))
    }

    /** The change-request list. */
    function PullsView(props) {
      const { t, call, sessionId, cwd, refreshKey, filter, onFilter, onSelect, forgeState } = props
      const state = useLoader(() => call('pulls', { sessionId, cwd: cwd || undefined, state: filter, limit: 30 }), [sessionId, cwd, filter, refreshKey])
      const value = state.value
      if (state.status === 'error') return h(Failure, { error: state.error, title: t('gitReadError'), retryLabel: t('gitRetry'), onRetry: () => props.reload() })
      if (value === undefined) return h(Loading, { label: t('gitLoading') })
      if (value.available !== true) {
        const forge = forgeState ?? value
        return h(ForgeNotice, { t, forge })
      }
      const pulls = value.pulls ?? []
      return h('div', null,
        h(Filters, {
          value: filter,
          onChange: onFilter,
          options: [
            { id: 'open', label: t('gitFilterOpen') },
            { id: 'merged', label: t('gitFilterMerged') },
            { id: 'closed', label: t('gitFilterClosed') },
            { id: 'all', label: t('gitFilterAll') },
          ],
        }),
        pulls.length === 0
          ? h(Empty, { icon: 'merge', title: t('gitEmptyPulls'), hint: t('gitEmptyPullsHint') })
          : h('div', null, pulls.map((pull) => h(PullRow, { key: pull.number, t, pull, onSelect }))))
    }

    /** The notice shown when the code host cannot be reached or is not signed in. */
    function ForgeNotice(props) {
      const { t, forge } = props
      const reason = forge?.reason ?? forge?.note ?? ''
      const cli = forge?.cli ?? (forge?.provider === 'gitlab' ? 'glab' : forge?.provider === 'github' ? 'gh' : undefined)
      return h('div', { className: 'ph-notice' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dsw-alias-label-primary)' } },
          h(Icon, { name: 'alert', size: 14 }),
          h('span', null, t('gitForgeOff'))),
        h('div', { style: { marginTop: '4px' } }, t('gitForgeHint')),
        reason.length > 0 ? h('div', { style: { marginTop: '4px' } }, reason) : null,
        cli === undefined ? null : h('div', { className: 'ph-notice-code' }, `${cli} auth login`))
    }

    /** One change request in full: checks, review, body, comments, and its files. */
    function PullPane(props) {
      const { t, call, sessionId, cwd, selection, refreshKey, onBack } = props
      const state = useLoader(() => call('pull', { sessionId, cwd: cwd || undefined, number: selection.number }), [selection.number, refreshKey, sessionId, cwd])
      if (state.status === 'error') return h('div', null, h(DetailBar, { t, dir: '', name: `#${selection.number}`, onBack }), h(Failure, { error: state.error, title: t('gitReadError'), retryLabel: t('gitRetry'), onRetry: () => props.reload() }))
      if (state.value === undefined) return h('div', null, h(DetailBar, { t, dir: '', name: `#${selection.number}`, onBack }), h(Loading, { label: t('gitLoading') }))
      const value = state.value
      if (value.available !== true) return h('div', null, h(DetailBar, { t, dir: '', name: `#${selection.number}`, onBack }), h(ForgeNotice, { t, forge: value }))
      const pull = value.pull
      const reviews = (value.reviews ?? []).filter((review) => review.state !== 'commented' || review.body.length > 0)
      return h('div', null,
        h(DetailBar, { t, dir: '', name: `#${pull.number}`, onBack },
          pull.url.length > 0 ? h('a', { className: 'ph-icon-button', href: pull.url, target: '_blank', rel: 'noreferrer noopener', title: t('gitOpenOnWeb'), 'aria-label': t('gitOpenOnWeb') }, h(Icon, { name: 'external', size: 14 })) : null),
        h('div', { className: 'ph-detail' },
          h('div', { className: 'ph-detail-title' }, pull.title),
          h('div', { className: 'ph-split' },
            h('span', { className: 'ph-chip', 'data-tone': pull.state === 'merged' ? 'business' : pull.state === 'closed' ? 'error' : 'success' }, h('span', { className: 'ph-dot', 'data-state': pull.state }), stateLabel(t, pull.state)),
            pull.branch.length > 0 ? h('span', { className: 'ph-chip ph-mono' }, t('gitFrom', { branch: pull.branch })) : null,
            pull.base.length > 0 ? h('span', { className: 'ph-chip ph-mono' }, `→ ${pull.base}`) : null),
          h('div', { className: 'ph-detail-meta' },
            h('div', { className: 'ph-detail-row' }, h('span', { className: 'ph-detail-label' }, t('gitAuthor')), h('span', { className: 'ph-detail-value' }, pull.author.length > 0 ? pull.author : '—')),
            h('div', { className: 'ph-detail-row' }, h('span', { className: 'ph-detail-label' }, t('gitUpdated')), h('span', { className: 'ph-detail-value' }, relativeTime(pull.updatedAt))),
            h('div', { className: 'ph-detail-row' }, h('span', { className: 'ph-detail-label' }, t('gitReview')), h('span', { className: 'ph-detail-value' }, reviewLabel(t, pull.review))),
            h('div', { className: 'ph-detail-row' }, h('span', { className: 'ph-detail-label' }, t('gitMergeable')), h('span', { className: 'ph-detail-value' }, pull.mergeable === true ? t('gitMergeable') : pull.mergeable === false ? t('gitConflicting') : t('gitMergeUnknown'))),
            h('div', { className: 'ph-detail-row' }, h('span', { className: 'ph-detail-label' }, t('gitFilesHeading')), h('span', { className: 'ph-detail-value' }, t('gitChangedFiles', { count: pull.changedFiles }), h(Counts, { additions: pull.additions, deletions: pull.deletions })))),
          h('div', { className: 'ph-card' },
            h('div', { className: 'ph-card-title' }, h(Icon, { name: 'check', size: 13 }), t('gitChecks')),
            value.checksUnavailable === true
              ? h('div', { className: 'ph-dim ph-tiny' }, t('gitChecksUnavailable'))
              : (value.checks ?? []).length === 0
                ? h('div', { className: 'ph-dim ph-tiny' }, t('gitNoChecks'))
                : value.checks.map((check) => h(CheckRow, { key: check.name, check }))),
          h('div', { className: 'ph-card' },
            h('div', { className: 'ph-card-title' }, h(Icon, { name: 'file', size: 13 }), t('gitDescription')),
            value.body.length === 0 ? h('div', { className: 'ph-dim ph-tiny' }, t('gitNoDescription')) : h('p', { className: 'ph-prose' }, value.body)),
          reviews.length === 0 ? null : h('div', { className: 'ph-card' },
            h('div', { className: 'ph-card-title' }, h(Icon, { name: 'comment', size: 13 }), t('gitReview')),
            reviews.map((review, index) => h('div', { key: `review-${index}`, className: 'ph-comment' },
              h('div', { className: 'ph-comment-head' }, h('span', { className: 'ph-comment-author' }, review.author.length > 0 ? review.author : '—'), h('span', null, review.state), review.submittedAt === null ? null : h('span', null, relativeTime(review.submittedAt))),
              review.body.length > 0 ? h('p', { className: 'ph-prose' }, review.body) : null))),
          (value.files ?? []).length === 0 ? null : h('div', { className: 'ph-card' },
            h('div', { className: 'ph-card-title' }, h(Icon, { name: 'folder', size: 13 }), t('gitFilesHeading')),
            value.files.map((file) => h('div', { key: file.path, className: 'ph-row' },
              h('span', { className: 'ph-ellipsis', style: { flex: '1 1 auto' }, title: file.path }, file.path),
              h(Counts, { additions: file.additions, deletions: file.deletions })))),
          (value.comments ?? []).length === 0 ? null : h('div', { className: 'ph-card' },
            h('div', { className: 'ph-card-title' }, h(Icon, { name: 'comment', size: 13 }), t('gitCommented', { count: value.comments.length })),
            value.comments.map((comment, index) => h('div', { key: `comment-${index}`, className: 'ph-comment' },
              h('div', { className: 'ph-comment-head' }, h('span', { className: 'ph-comment-author' }, comment.author.length > 0 ? comment.author : '—'), h('span', null, relativeTime(comment.createdAt))),
              h('p', { className: 'ph-prose' }, comment.body))))))
    }

    function reviewLabel(t, review) {
      switch (review) {
        case 'approved': return t('gitReviewApproved')
        case 'changes_requested': return t('gitReviewChanges')
        case 'review_required': return t('gitReviewRequired')
        default: return t('gitReviewNone')
      }
    }

    /** One check row: outcome dot, name, and duration. */
    function CheckRow(props) {
      const { check } = props
      const duration = check.startedAt !== null && check.completedAt !== null
        ? Math.max(0, Math.round((Date.parse(check.completedAt) - Date.parse(check.startedAt)) / 1000))
        : null
      const children = [
        h('span', { key: 'dot', className: 'ph-dot', 'data-state': check.state }),
        h('span', { key: 'name', className: 'ph-check-name', title: check.description.length > 0 ? check.description : check.name }, check.name),
        duration === null
          ? null
          : h('span', { key: 'time', className: 'ph-check-duration' }, duration >= 60 ? `${Math.round(duration / 60)}m` : `${duration}s`),
      ]
      if (check.url === null) return h('div', { className: 'ph-check' }, children)
      return h('a', {
        className: 'ph-check',
        href: check.url,
        target: '_blank',
        rel: 'noreferrer noopener',
        style: { color: 'inherit', textDecoration: 'none' },
      }, children)
    }

    /** One issue row. */
    function IssueRow(props) {
      const { t, issue, onSelect } = props
      return h('button', { type: 'button', className: 'ph-item', onClick: () => onSelect({ type: 'issue', number: issue.number }) },
        h('span', { className: 'ph-item-title' },
          h('span', { className: 'ph-glyph', style: { color: issue.state === 'open' ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-tertiary)' } }, h(Icon, { name: 'issue', size: 12 })),
          h('span', { className: 'ph-item-number' }, `#${issue.number}`),
          h('span', { className: 'ph-item-text' }, issue.title)),
        h('span', { className: 'ph-item-meta' },
          issue.labels.map((label) => h('span', { key: label.name, className: 'ph-chip' }, label.name)),
          issue.author.length > 0 ? h('span', null, t('gitBy', { author: issue.author })) : null,
          issue.commentCount > 0 ? h('span', null, t('gitCommented', { count: issue.commentCount })) : null,
          h('span', null, relativeTime(issue.updatedAt))))
    }

    /** The issue list. */
    function IssuesView(props) {
      const { t, call, sessionId, cwd, refreshKey, filter, onFilter, onSelect, forgeState } = props
      const state = useLoader(() => call('issues', { sessionId, cwd: cwd || undefined, state: filter, limit: 30 }), [sessionId, cwd, filter, refreshKey])
      const value = state.value
      if (state.status === 'error') return h(Failure, { error: state.error, title: t('gitReadError'), retryLabel: t('gitRetry'), onRetry: () => props.reload() })
      if (value === undefined) return h(Loading, { label: t('gitLoading') })
      if (value.available !== true) return h(ForgeNotice, { t, forge: forgeState ?? value })
      const issues = value.issues ?? []
      return h('div', null,
        h(Filters, {
          value: filter,
          onChange: onFilter,
          options: [
            { id: 'open', label: t('gitFilterOpen') },
            { id: 'closed', label: t('gitFilterClosed') },
            { id: 'all', label: t('gitFilterAll') },
          ],
        }),
        issues.length === 0
          ? h(Empty, { icon: 'issue', title: t('gitEmptyIssues'), hint: t('gitEmptyIssuesHint') })
          : h('div', null, issues.map((issue) => h(IssueRow, { key: issue.number, t, issue, onSelect }))))
    }

    /** One issue in full. */
    function IssuePane(props) {
      const { t, call, sessionId, cwd, selection, refreshKey, onBack } = props
      const state = useLoader(() => call('issue', { sessionId, cwd: cwd || undefined, number: selection.number }), [selection.number, refreshKey, sessionId, cwd])
      if (state.status === 'error') return h('div', null, h(DetailBar, { t, dir: '', name: `#${selection.number}`, onBack }), h(Failure, { error: state.error, title: t('gitReadError'), retryLabel: t('gitRetry'), onRetry: () => props.reload() }))
      if (state.value === undefined) return h('div', null, h(DetailBar, { t, dir: '', name: `#${selection.number}`, onBack }), h(Loading, { label: t('gitLoading') }))
      const value = state.value
      if (value.available !== true) return h('div', null, h(DetailBar, { t, dir: '', name: `#${selection.number}`, onBack }), h(ForgeNotice, { t, forge: value }))
      const issue = value.issue
      return h('div', null,
        h(DetailBar, { t, dir: '', name: `#${issue.number}`, onBack },
          issue.url.length > 0 ? h('a', { className: 'ph-icon-button', href: issue.url, target: '_blank', rel: 'noreferrer noopener', title: t('gitOpenOnWeb'), 'aria-label': t('gitOpenOnWeb') }, h(Icon, { name: 'external', size: 14 })) : null),
        h('div', { className: 'ph-detail' },
          h('div', { className: 'ph-detail-title' }, issue.title),
          h('div', { className: 'ph-split' },
            h('span', { className: 'ph-chip', 'data-tone': issue.state === 'open' ? 'success' : undefined }, issue.state === 'open' ? t('gitStateOpen') : t('gitStateClosed')),
            issue.labels.map((label) => h('span', { key: label.name, className: 'ph-chip' }, label.name))),
          h('div', { className: 'ph-detail-meta' },
            h('div', { className: 'ph-detail-row' }, h('span', { className: 'ph-detail-label' }, t('gitAuthor')), h('span', { className: 'ph-detail-value' }, issue.author.length > 0 ? issue.author : '—')),
            h('div', { className: 'ph-detail-row' }, h('span', { className: 'ph-detail-label' }, t('gitUpdated')), h('span', { className: 'ph-detail-value' }, relativeTime(issue.updatedAt)))),
          h('div', { className: 'ph-card' },
            h('div', { className: 'ph-card-title' }, h(Icon, { name: 'file', size: 13 }), t('gitDescription')),
            value.body.length === 0 ? h('div', { className: 'ph-dim ph-tiny' }, t('gitNoDescription')) : h('p', { className: 'ph-prose' }, value.body)),
          (value.comments ?? []).length === 0 ? null : h('div', { className: 'ph-card' },
            h('div', { className: 'ph-card-title' }, h(Icon, { name: 'comment', size: 13 }), t('gitCommented', { count: value.comments.length })),
            value.comments.map((comment, index) => h('div', { key: `comment-${index}`, className: 'ph-comment' },
              h('div', { className: 'ph-comment-head' }, h('span', { className: 'ph-comment-author' }, comment.author.length > 0 ? comment.author : '—'), h('span', null, relativeTime(comment.createdAt))),
              h('p', { className: 'ph-prose' }, comment.body))))))
    }

    /**
     * The Git panel a right-sidebar tab renders.
     *
     * It owns the overview, the active view, and the open detail; each view
     * loads its own slice through the same Host channel, so switching a tab
     * never refetches what the header already has.
     */
    function GitPanel(props) {
      const { t, call, sessionId } = props
      const useSessions = props.useSessions
      const useTabInfo = props.useTabInfo
      const tabInfo = typeof useTabInfo === 'function' ? useTabInfo() : undefined
      // A kept-mounted tab keeps its data; it only refreshes while it is on screen.
      const visible = tabInfo?.tab?.visible !== false
      const cwd = typeof useSessions === 'function'
        ? useSessions((snapshot) => snapshot?.byId?.[sessionId]?.cwd ?? '')
        : ''

      const [view, setView] = React.useState('changes')
      const [selection, setSelection] = React.useState(null)
      const [pullFilter, setPullFilter] = React.useState('open')
      const [issueFilter, setIssueFilter] = React.useState('open')
      const [revision, setRevision] = React.useState(0)
      const [overview, setOverview] = React.useState(undefined)
      const [status, setStatus] = React.useState('loading')
      const [error, setError] = React.useState(null)
      const [refreshing, setRefreshing] = React.useState(false)

      const reload = React.useCallback(() => setRevision((value) => value + 1), [])

      React.useEffect(() => {
        let alive = true
        setRefreshing(true)
        call('overview', { sessionId, cwd: cwd || undefined })
          .then((value) => {
            if (!alive) return
            setOverview(value)
            setError(null)
            setStatus('ready')
          })
          .catch((failure) => {
            if (!alive) return
            setError(failure)
            setStatus('error')
          })
          .finally(() => {
            if (alive) setRefreshing(false)
          })
        return () => {
          alive = false
        }
      }, [call, sessionId, cwd, revision])

      const interval = Math.max(8000, Number(overview?.refreshMs) || 30000)
      React.useEffect(() => {
        if (!visible) return undefined
        const timer = setInterval(() => setRevision((value) => value + 1), interval)
        return () => clearInterval(timer)
      }, [interval, visible])

      /** Refresh once when the tab comes back on screen, and when the window does. */
      const shown = React.useRef(visible)
      React.useEffect(() => {
        if (visible && shown.current !== true) reload()
        shown.current = visible
      }, [visible, reload])

      React.useEffect(() => {
        if (typeof document === 'undefined') return undefined
        const onVisible = () => {
          if (document.visibilityState === 'visible') reload()
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
      }, [reload])

      const openDetail = React.useCallback((next) => {
        setSelection(next)
      }, [])

      const back = React.useCallback(() => setSelection(null), [])

      const selectPull = React.useCallback((next) => {
        setView('pulls')
        setSelection(next)
      }, [])

      const changeView = React.useCallback((next) => {
        setSelection(null)
        setView(next)
      }, [])

      if (status === 'loading' && overview === undefined) {
        return h('div', { className: 'ph-git' }, h(Loading, { label: t('gitLoadingLong') }))
      }
      if (status === 'error' && overview === undefined) {
        const noFolder = error?.code === 'git/no-directory'
        return h('div', { className: 'ph-git', 'data-personal-hub-git': true },
          h(Failure, {
            error,
            title: noFolder ? t('gitNoDirectory') : error?.code === 'git/not-a-repository' ? t('gitNoRepo') : t('gitReadError'),
            hint: error?.code === 'git/not-a-repository'
              ? t('gitNoRepoHint')
              : error?.code === 'connection/failed'
                ? t('gitBridgeHint')
                : undefined,
            onRetry: reload,
            retryLabel: t('gitRetry'),
          }))
      }

      const forgeState = overview?.forge
      let body
      if (selection !== null && view === 'changes' && selection.type === 'file') {
        body = h(DiffPane, { t, call, sessionId, cwd, selection, refreshKey: revision, onBack: back, reload })
      } else if (selection !== null && view === 'commits' && selection.type === 'commit') {
        body = h(CommitPane, { t, call, sessionId, cwd, selection, refreshKey: revision, onBack: back, reload })
      } else if (selection !== null && view === 'pulls' && selection.type === 'pull') {
        body = h(PullPane, { t, call, sessionId, cwd, selection, refreshKey: revision, onBack: back, reload })
      } else if (selection !== null && view === 'issues' && selection.type === 'issue') {
        body = h(IssuePane, { t, call, sessionId, cwd, selection, refreshKey: revision, onBack: back, reload })
      } else if (view === 'pulls') {
        body = h(PullsView, { t, call, sessionId, cwd, refreshKey: revision, filter: pullFilter, onFilter: setPullFilter, onSelect: openDetail, forgeState, reload })
      } else if (view === 'issues') {
        body = h(IssuesView, { t, call, sessionId, cwd, refreshKey: revision, filter: issueFilter, onFilter: setIssueFilter, onSelect: openDetail, forgeState, reload })
      } else if (view === 'commits') {
        body = h(CommitsView, { t, call, sessionId, cwd, refreshKey: revision, onSelect: openDetail, reload })
      } else {
        body = overview === undefined
          ? h(Loading, { label: t('gitLoading') })
          : h(ChangesView, { t, overview, onSelect: openDetail, selection })
      }

      return h('div', { className: 'ph-git', 'data-personal-hub-git': true },
        h(GitHeader, { t, overview, refreshing, onRefresh: reload, onOpenPull: selectPull }),
        h(GitNav, { t, value: view, onChange: changeView, overview }),
        status === 'error' && overview !== undefined
          ? h('div', { className: 'ph-notice' },
              h('div', null, t('gitReadError')),
              h('div', { className: 'ph-tiny ph-dim' }, messageOf(error)))
          : null,
        h('div', { className: 'ph-body' }, body))
    }

    /** The conversation-header button that opens the Git tab. */
    function GitHeaderButton(props) {
      const t = props.t
      const open = () => {
        if (typeof props.open === 'function') props.open()
      }
      return h('button', {
        type: 'button',
        className: 'ph-icon-button',
        title: t('gitOpen'),
        'aria-label': t('gitOpen'),
        onClick: open,
        style: { width: '28px', height: '28px' },
      }, h(Icon, { name: 'git', size: 15 }))
    }

    /** Install the panel's stylesheet once, and remove it with the plugin. */
    function installGitStyles() {
      if (typeof document === 'undefined') return () => {}
      const style = document.createElement('style')
      style.dataset.personalHub = 'git'
      style.textContent = GIT_CSS
      document.head.append(style)
      return () => style.remove()
    }

    return {
      name: 'personal-hub-client',
      inject: ['slots', 'locale', 'remote', 'remote.credentials'],
      /** Rendering helpers the Node test harness exercises with a stand-in React. */
      __internal: { GitHeader, GitNav, ChangesView, FileRow, PatchBody, PullRow, CheckRow, Empty, Failure, installGitStyles },
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

        // The Git panel needs the right Sidebar and the Connection RPC face.
        // They are optional services: the Telegram card above mounts either way.
        if (typeof ctx.inject !== 'function') return
        ctx.inject(['connection', 'sidebarRightTabs', 'sidebarRight'], (gitCtx) => {
          if (typeof gitCtx.connection?.rpc?.call !== 'function') return
          const call = createGitCaller(gitCtx.connection)

          gitCtx.effect(() => installGitStyles(), 'personal-hub: git styles')

          gitCtx.effect(() => gitCtx.sidebarRightTabs.register({
            id: GIT_ID,
            kind: GIT_KIND,
            priority: 'extension',
            keepMounted: true,
            title: () => t('gitTab'),
            guide: [{
              id: 'git',
              order: 20,
              icon: GitGlyph,
              title: () => t('gitGuide'),
              description: () => t('gitGuideHint'),
            }],
          }), 'personal-hub: git tab type')

          gitCtx.effect(() => gitCtx.slots.inject('sidebar.right.pane.tab', () => gitCtx.slots.register({
            name: 'sidebar.right.pane.tab',
            key: GIT_ID,
            locale: NS,
            inject: () => ({ call }),
          }, GitPanel)), 'personal-hub: git tab body')

          gitCtx.effect(() => gitCtx.slots.inject('conversation.session.header.utilities', () => gitCtx.slots.register({
            name: 'conversation.session.header.utilities',
            id: 'personal-hub-git',
            order: 40,
            label: () => t('gitOpen'),
            locale: NS,
            inject: () => ({
              open: () => {
                try {
                  gitCtx.sidebarRight.openTab(GIT_KIND)
                } catch (error) {
                  console.warn('[personal-hub] cannot open the Git tab:', messageOf(error))
                }
              },
            }),
          }, GitHeaderButton)), 'personal-hub: git header button')
        })
      },
    }
  },
})
