"use strict";
(() => {
  // src/client/runtime.ts
  var installed;
  function installReact(requireFn) {
    if (installed === void 0) installed = requireFn("react");
    return installed;
  }
  function react() {
    if (installed === void 0) throw new Error("[personal-hub] React was not installed by the module factory");
    return installed;
  }
  function h(type, props, ...children) {
    return react().createElement(type, props ?? null, ...children);
  }
  function useState(initial) {
    return react().useState(initial);
  }
  function useEffect(effect, deps) {
    react().useEffect(effect, deps);
  }
  function useMemo(factory, deps) {
    return react().useMemo(factory, deps);
  }
  function useCallback(callback, deps) {
    return react().useCallback(callback, deps);
  }
  function useRef(initial) {
    return react().useRef(initial);
  }
  function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
    return react().useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  }

  // src/client/i18n.ts
  var NS = "personalHub";
  var en = {
    cardTitle: "Personal hub",
    title: "Telegram remote control",
    summary: "Send messages to a Telegram bot and they become prompts in a bound DSH session.",
    stateOn: "Token configured",
    stateOff: "No token yet",
    stateUnknown: "Token state unknown",
    intro: "Paste the token BotFather gave you. It is stored in the credential store, never in the plugin config file.",
    tokenLabel: "Bot token",
    tokenPlaceholder: "123456789:AA\u2026",
    save: "Save token",
    saving: "Saving\u2026",
    clear: "Remove token",
    saved: "Token saved. Send /start to your bot in Telegram; the first chat to do so is paired.",
    cleared: "Token removed.",
    empty: "Paste a token first.",
    hint: "The plugin reads the token on its own schedule, so a saved token applies within seconds without a restart. The status line below updates after each save.",
    error: "The Host rejected the change: {message}",
    readOnly: "This deployment stores credentials read-only.",
    gitTab: "Git",
    gitGuide: "Git",
    gitGuideHint: "Changes, pull requests, and issues",
    gitOpen: "Open the Git panel",
    gitChanges: "Changes",
    gitPulls: "Pull requests",
    gitIssues: "Issues",
    gitCommits: "Commits",
    gitRefresh: "Refresh",
    gitLoading: "Loading\u2026",
    gitLoadingLong: "Reading the repository\u2026",
    gitRetry: "Retry",
    gitBack: "Back",
    gitClean: "No uncommitted changes",
    gitCleanHint: "The working tree matches the last commit.",
    gitNoRepo: "Not a git repository",
    gitNoRepoHint: "This session\u2019s folder is not inside a repository. Open a session in a project folder to use this panel.",
    gitNoDirectory: "This session has no working folder yet.",
    gitReadError: "Could not read the repository",
    gitBridgeHint: "The Host half of this plugin is not loaded yet. Restart Harness after installing or updating the plugin.",
    gitStaged: "Staged",
    gitUnstaged: "Changes",
    gitUntracked: "Untracked",
    gitConflicted: "Conflicts",
    gitFilesOne: "{count} file",
    gitFilesMany: "{count} files",
    gitChangedFiles: "{count} changed",
    gitStashCount: "{count} stashed",
    gitAhead: "Ahead {count}",
    gitBehind: "Behind {count}",
    gitBinary: "Binary file \u2014 no text diff to show.",
    gitNoText: "No textual changes in this file.",
    gitTruncated: "This diff is longer than the panel shows, so it stops here.",
    gitTooLarge: "This file is larger than the diff limit, so only part of it is shown.",
    gitRenamedFrom: "Renamed from {path}",
    gitCopyPath: "Copy path",
    gitCopied: "Path copied.",
    gitFilesHeading: "Files",
    gitOpenOnWeb: "Open on the web",
    gitChecks: "Checks",
    gitNoChecks: "No checks reported",
    gitChecksUnavailable: "The GitHub CLI reports check details; without it this panel cannot show them.",
    gitReview: "Review",
    gitReviewApproved: "Approved",
    gitReviewChanges: "Changes requested",
    gitReviewRequired: "Review required",
    gitReviewNone: "No review yet",
    gitMergeable: "Mergeable",
    gitConflicting: "Has conflicts",
    gitMergeUnknown: "Merge state unknown",
    gitDescription: "Description",
    gitNoDescription: "No description.",
    gitStateOpen: "Open",
    gitStateDraft: "Draft",
    gitStateMerged: "Merged",
    gitStateClosed: "Closed",
    gitFilterOpen: "Open",
    gitFilterClosed: "Closed",
    gitFilterMerged: "Merged",
    gitFilterAll: "All",
    gitEmptyPulls: "No pull requests",
    gitEmptyPullsHint: "Nothing matches this filter.",
    gitEmptyIssues: "No issues",
    gitEmptyIssuesHint: "Nothing matches this filter.",
    gitForgeOff: "Pull requests and issues need a code host",
    gitForgeHint: "Add a GitHub or GitLab remote to this repository, or sign in with the code host CLI.",
    gitBy: "by {author}",
    gitUpdated: "updated {when}",
    gitCommented: "{count} comments",
    gitFrom: "from {branch}",
    gitCommitListEmpty: "No commits yet",
    gitCommitListEmptyHint: "The repository has no commits.",
    gitAuthor: "Author",
    gitDate: "Date",
    gitHash: "Commit",
    gitChecksFailure: "{count} failed",
    gitChecksPending: "{count} running",
    gitChecksSuccess: "{count} passed",
    gitPrAction: "Create pull request",
    gitPrConfirm: "Create a pull request from {branch} into {base}?",
    gitPrConfirmHint: "The branch is pushed, then this chat\u2019s model drafts the title and description before the request opens.",
    gitPrCreate: "Create",
    gitPrCancel: "Cancel",
    gitPrBusy: "Drafting the pull request\u2026",
    gitPrCreated: "Pull request #{number} created",
    gitPrOpen: "Open on the web",
    gitPrFailed: "Could not create the pull request",
    gitPrBase: "Base branch",
    gitPrNoForge: "Pull requests need a signed-in code host CLI",
    gitPrNoBranch: "This checkout has no named branch",
    wtOption: "New worktree",
    wtSource: "Start from",
    wtLocal: "Local branch",
    wtRemote: "Remote branch",
    wtBase: "Base branch",
    wtBusy: "Creating the worktree\u2026",
    wtCreated: "This chat now works in {branch}",
    wtRemove: "Remove worktree",
    wtRemoved: "Worktree removed; the chat is back in the project",
    wtFailed: "Could not create the worktree",
    wtNoBase: "No branch to start from yet",
    wtHint: "The checkout lives under the repository and starts from the branch you pick.",
    gitSettingsTitle: "Worktrees and merged pull requests",
    gitSettingsSummary: "Clean up after a chat\u2019s pull request merges",
    gitSettingsMerged: "When the pull request of a chat is merged",
    gitSettingsRemove: "Delete the worktree",
    gitSettingsDeleteBranch: "Delete its branch too",
    gitSettingsArchive: "Hide the chat from the list",
    gitSettingsSave: "Save",
    gitSettingsSaving: "Saving\u2026",
    gitSettingsSaved: "Saved. The panel reloads with the new setting.",
    gitSettingsReadOnly: "This deployment does not allow configuration edits.",
    gitSettingsOff: "Off",
    gitSettingsFailed: "Could not save the setting",
    gitSettingsError: "Could not read the setting",
    gitNewChat: "New chat in this worktree",
    gitNewChatCreated: "A new chat now works in {branch}",
    gitNewChatHint: "Open it from the sidebar; this chat keeps its own checkout.",
    gitNewChatFailed: "Could not start a chat in the worktree",
    cleanupTitle: "Worktree cleanup",
    cleanupEnabled: "Remove checkouts nobody uses",
    cleanupInactiveDays: "idle days before removal (0 turns this rule off)",
    cleanupNoCommits: "Remove when the branch has no commit over its base",
    cleanupKeep: "Keep a checkout with",
    cleanupKeepTracked: "Uncommitted tracked edits",
    cleanupKeepAny: "Any local file",
    cleanupKeepNone: "Nothing \u2014 remove anyway",
    cleanupRun: "Clean up now",
    cleanupRunning: "Cleaning\u2026",
    cleanupLast: "Last pass: {removed} removed, {kept} kept",
    cleanupNever: "No cleanup pass has run yet.",
    cleanupOff: "Cleanup is off.",
    /* Git actions */
    gitActions: "Git actions",
    gitActionOptions: "Git action options",
    gitActionCommit: "Commit",
    gitActionPush: "Push",
    gitActionCreatePr: "Create pull request",
    gitActionCommitPush: "Commit & push",
    gitActionCommitPushPr: "Commit, push & pull request",
    gitActionPushPr: "Push & create pull request",
    gitActionPull: "Pull",
    gitActionSync: "Sync branch",
    gitActionPublish: "Publish repository",
    gitActionInitialize: "Initialize Git",
    gitActionInitializing: "Initializing\u2026",
    gitHintBusy: "A Git action is already running.",
    gitHintNoStatus: "Git status is unavailable.",
    gitHintDetached: "Create and check out a branch before pushing or opening a pull request.",
    gitHintUpToDate: "Branch is up to date. No action needed.",
    gitHintNoCommits: "No local commits to push.",
    gitHintBehind: "The branch is behind its upstream. Pull first.",
    gitHintDiverged: "The branch has diverged from its upstream. Rebase or merge first.",
    gitHintClean: "The working tree is clean. Make changes before committing.",
    gitHintNoRemote: 'Add an "origin" remote before pushing.',
    gitHintNoBranch: "Detached HEAD: check out a branch first.",
    gitHintBehindPr: "The branch is behind its upstream. Pull before opening a pull request.",
    gitHintNoPrCommits: "No local commits to include in a pull request.",
    gitHintCannotWrite: "This page cannot change source control.",
    gitStarting: "Starting\u2026",
    gitPhaseBranch: "Preparing feature branch\u2026",
    gitPhaseMessage: "Generating commit message\u2026",
    gitPhaseCommit: "Committing\u2026",
    gitPhasePush: "Pushing\u2026",
    gitPhasePr: "Creating pull request\u2026",
    gitPhasePrContent: "Generating pull request content\u2026",
    gitPullStatus: "Pulling latest changes\u2026",
    gitActionDone: "Done",
    gitActionFailed: "Git action failed",
    gitPullFailed: "Pull failed",
    gitPullDone: "Pulled",
    gitPullUpToDate: "Already up to date",
    gitPullUpdated: "Updated {branch}",
    gitPullSynced: "{branch} is already synchronized.",
    gitViewPr: "View pull request",
    gitCreatePrCta: "Create pull request",
    gitPushCta: "Push",
    gitSuccessCommitted: "Committed {sha}",
    gitSuccessPushed: "Pushed {sha} to {branch}",
    gitSuccessPr: "Created #{number}",
    gitSuccessPrOpened: "Opened #{number}",
    /* Commit composer */
    gitCommitTitle: "Commit changes",
    gitCommitHint: "Pick the files to include. Leave the message empty to generate one.",
    gitCommitMessage: "Commit message",
    gitCommitPlaceholder: "Leave empty to auto-generate",
    gitCommitGenerate: "Generate",
    gitCommitGenerating: "Generating\u2026",
    gitCommitButton: "Commit",
    gitCommitAndPush: "Commit & push",
    gitCommitOnNewBranch: "Commit on new branch",
    gitCommitNoFiles: "Select at least one file.",
    gitCommitSelected: "{selected} of {total} files",
    gitSelectAll: "Select all files",
    gitClearSelection: "Clear selection",
    gitExcluded: "Excluded",
    gitDefaultBranch: "Default branch",
    gitDetachedHead: "(detached HEAD)",
    gitDefaultTitle: "Run this on {branch}?",
    gitDefaultPushTitle: "Push to {branch}?",
    gitDefaultPrTitle: "Create a pull request from {branch}?",
    gitDefaultBody: 'This runs on "{branch}", the default branch. Continue here, or check out a feature branch and run the same action there.',
    gitDefaultContinue: "Continue on {branch}",
    gitDefaultFeature: "Check out a feature branch & continue",
    gitDefaultAbort: "Abort",
    gitDefaultWarning: "There are no changes to commit, so a feature branch cannot be named.",
    /* Branch picker */
    gitBranchSelect: "Switch branch",
    gitBranchSearch: "Search branches\u2026",
    gitBranchNoMatch: "No branches found.",
    gitBranchCreate: 'Create branch "{name}"',
    gitBranchCurrent: "current",
    gitBranchRemote: "remote",
    gitBranchDefault: "default",
    gitBranchLoading: "Loading branches\u2026",
    gitBranchSwitchFailed: "Could not switch branch",
    gitBranchCreateFailed: "Could not create the branch",
    gitBranchName: "Branch name",
    /* Publish */
    gitPublishTitle: "Publish repository",
    gitPublishHint: "Pick where to host it, then name the repository.",
    gitPublishProvider: "Provider",
    gitPublishRepository: "Repository",
    gitPublishVisibility: "Visibility",
    gitPublishPrivate: "Private",
    gitPublishPrivateHint: "Only invited people",
    gitPublishPublic: "Public",
    gitPublishPublicHint: "Anyone on the web",
    gitPublishButton: "Publish",
    gitPublishBusy: "Publishing\u2026",
    gitPublishDone: "Repository published",
    gitPublishFailed: "Could not publish the repository",
    gitPublishOpen: "Open on the web",
    /* Diff */
    gitDiffScope: "Diff scope",
    gitScopeWorking: "Uncommitted",
    gitScopeBranch: "Branch",
    gitScopeLabel: "vs {base}",
    gitUncommitted: "Uncommitted",
    gitLayout: "Diff layout",
    gitLayoutUnified: "Unified",
    gitLayoutSplit: "Split",
    gitWrap: "Wrap lines",
    gitWhitespace: "Hide whitespace changes",
    gitExpandAll: "Expand all files",
    gitCollapseAll: "Collapse all files",
    gitExpandFile: "Expand {path}",
    gitCollapseFile: "Collapse {path}",
    gitNoDiff: "No changes to show.",
    gitDiffTooLarge: "This diff is too large to show in full. Totals include every change.",
    gitWhitespaceOnly: "Only whitespace changes.",
    gitShowMore: "Show more",
    gitLines: "{count} lines",
    gitAdditions: "{count} additions",
    gitDeletions: "{count} deletions",
    /* Misc */
    gitToastCopied: "Copied",
    gitOpenFailed: "Could not open the file",
    gitSessionUnavailable: "This build cannot start a chat for the panel",
    gitActionUnavailable: "Action unavailable"
  };
  var vi = {
    cardTitle: "Trung t\xE2m c\xE1 nh\xE2n",
    title: "\u0110i\u1EC1u khi\u1EC3n DSH qua Telegram",
    summary: "Nh\u1EAFn tin cho bot Telegram, tin nh\u1EAFn tr\u1EDF th\xE0nh prompt trong phi\xEAn DSH \u0111\xE3 g\u1EAFn.",
    stateOn: "\u0110\xE3 c\xF3 token",
    stateOff: "Ch\u01B0a c\xF3 token",
    stateUnknown: "Ch\u01B0a \u0111\u1ECDc \u0111\u01B0\u1EE3c tr\u1EA1ng th\xE1i token",
    intro: "D\xE1n token BotFather \u0111\xE3 g\u1EEDi. Token \u0111\u01B0\u1EE3c l\u01B0u trong kho b\xED m\u1EADt c\u1EE7a DSH, kh\xF4ng ghi v\xE0o t\u1EC7p c\u1EA5u h\xECnh plugin.",
    tokenLabel: "Token bot",
    tokenPlaceholder: "123456789:AA\u2026",
    save: "L\u01B0u token",
    saving: "\u0110ang l\u01B0u\u2026",
    clear: "Xo\xE1 token",
    saved: "\u0110\xE3 l\u01B0u token. G\u1EEDi /start cho bot trong Telegram; chat \u0111\u1EA7u ti\xEAn g\u1EEDi /start s\u1EBD \u0111\u01B0\u1EE3c gh\xE9p n\u1ED1i.",
    cleared: "\u0110\xE3 xo\xE1 token.",
    empty: "H\xE3y d\xE1n token tr\u01B0\u1EDBc.",
    hint: "Plugin t\u1EF1 \u0111\u1ECDc l\u1EA1i token theo chu k\u1EF3 n\xEAn token v\u1EEBa l\u01B0u c\xF3 hi\u1EC7u l\u1EF1c sau v\xE0i gi\xE2y, kh\xF4ng c\u1EA7n kh\u1EDFi \u0111\u1ED9ng l\u1EA1i. D\xF2ng tr\u1EA1ng th\xE1i b\xEAn d\u01B0\u1EDBi c\u1EADp nh\u1EADt sau m\u1ED7i l\u1EA7n l\u01B0u.",
    error: "M\xE1y ch\u1EE7 DSH t\u1EEB ch\u1ED1i thay \u0111\u1ED5i: {message}",
    readOnly: "B\u1EA3n c\xE0i n\xE0y l\u01B0u b\xED m\u1EADt \u1EDF ch\u1EBF \u0111\u1ED9 ch\u1EC9 \u0111\u1ECDc.",
    gitTab: "Git",
    gitGuide: "Git",
    gitGuideHint: "Thay \u0111\u1ED5i, pull request v\xE0 issue",
    gitOpen: "M\u1EDF b\u1EA3ng Git",
    gitChanges: "Thay \u0111\u1ED5i",
    gitPulls: "Pull request",
    gitIssues: "Issue",
    gitCommits: "Commit",
    gitRefresh: "L\xE0m m\u1EDBi",
    gitLoading: "\u0110ang t\u1EA3i\u2026",
    gitLoadingLong: "\u0110ang \u0111\u1ECDc kho m\xE3\u2026",
    gitRetry: "Th\u1EED l\u1EA1i",
    gitBack: "Quay l\u1EA1i",
    gitClean: "Kh\xF4ng c\xF3 thay \u0111\u1ED5i ch\u01B0a commit",
    gitCleanHint: "C\xE2y l\xE0m vi\u1EC7c tr\xF9ng v\u1EDBi commit g\u1EA7n nh\u1EA5t.",
    gitNoRepo: "Kh\xF4ng ph\u1EA3i kho git",
    gitNoRepoHint: "Th\u01B0 m\u1EE5c c\u1EE7a phi\xEAn n\xE0y kh\xF4ng n\u1EB1m trong kho git. M\u1EDF phi\xEAn trong th\u01B0 m\u1EE5c d\u1EF1 \xE1n \u0111\u1EC3 d\xF9ng b\u1EA3ng n\xE0y.",
    gitNoDirectory: "Phi\xEAn n\xE0y ch\u01B0a c\xF3 th\u01B0 m\u1EE5c l\xE0m vi\u1EC7c.",
    gitReadError: "Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c kho m\xE3",
    gitBridgeHint: "Ph\u1EA7n Host c\u1EE7a plugin ch\u01B0a \u0111\u01B0\u1EE3c n\u1EA1p. H\xE3y kh\u1EDFi \u0111\u1ED9ng l\u1EA1i Harness sau khi c\xE0i ho\u1EB7c c\u1EADp nh\u1EADt plugin.",
    gitStaged: "\u0110\xE3 stage",
    gitUnstaged: "Ch\u01B0a stage",
    gitUntracked: "Ch\u01B0a theo d\xF5i",
    gitConflicted: "Xung \u0111\u1ED9t",
    gitFilesOne: "{count} t\u1EC7p",
    gitFilesMany: "{count} t\u1EC7p",
    gitChangedFiles: "{count} thay \u0111\u1ED5i",
    gitStashCount: "{count} \u0111ang stash",
    gitAhead: "H\u01A1n {count} commit",
    gitBehind: "Ch\u1EADm {count} commit",
    gitBinary: "T\u1EC7p nh\u1ECB ph\xE2n \u2014 kh\xF4ng c\xF3 diff v\u0103n b\u1EA3n.",
    gitNoText: "T\u1EC7p n\xE0y kh\xF4ng c\xF3 thay \u0111\u1ED5i v\u0103n b\u1EA3n.",
    gitTruncated: "Diff d\xE0i h\u01A1n m\u1EE9c b\u1EA3ng hi\u1EC3n th\u1ECB n\xEAn d\u1EEBng \u1EDF \u0111\xE2y.",
    gitTooLarge: "T\u1EC7p l\u1EDBn h\u01A1n gi\u1EDBi h\u1EA1n diff n\xEAn ch\u1EC9 hi\u1EC3n th\u1ECB m\u1ED9t ph\u1EA7n.",
    gitRenamedFrom: "\u0110\u1ED5i t\xEAn t\u1EEB {path}",
    gitCopyPath: "Sao ch\xE9p \u0111\u01B0\u1EDDng d\u1EABn",
    gitCopied: "\u0110\xE3 sao ch\xE9p \u0111\u01B0\u1EDDng d\u1EABn.",
    gitFilesHeading: "T\u1EC7p",
    gitOpenOnWeb: "M\u1EDF tr\xEAn web",
    gitChecks: "Ki\u1EC3m tra",
    gitNoChecks: "Ch\u01B0a c\xF3 ki\u1EC3m tra",
    gitChecksUnavailable: "C\u1EA7n GitHub CLI \u0111\u1EC3 xem chi ti\u1EBFt ki\u1EC3m tra.",
    gitReview: "\u0110\xE1nh gi\xE1",
    gitReviewApproved: "\u0110\xE3 duy\u1EC7t",
    gitReviewChanges: "Y\xEAu c\u1EA7u s\u1EEDa",
    gitReviewRequired: "C\u1EA7n \u0111\xE1nh gi\xE1",
    gitReviewNone: "Ch\u01B0a c\xF3 \u0111\xE1nh gi\xE1",
    gitMergeable: "C\xF3 th\u1EC3 g\u1ED9p",
    gitConflicting: "\u0110ang xung \u0111\u1ED9t",
    gitMergeUnknown: "Ch\u01B0a r\xF5 tr\u1EA1ng th\xE1i g\u1ED9p",
    gitDescription: "M\xF4 t\u1EA3",
    gitNoDescription: "Kh\xF4ng c\xF3 m\xF4 t\u1EA3.",
    gitStateOpen: "\u0110ang m\u1EDF",
    gitStateDraft: "B\u1EA3n nh\xE1p",
    gitStateMerged: "\u0110\xE3 g\u1ED9p",
    gitStateClosed: "\u0110\xE3 \u0111\xF3ng",
    gitFilterOpen: "\u0110ang m\u1EDF",
    gitFilterClosed: "\u0110\xE3 \u0111\xF3ng",
    gitFilterMerged: "\u0110\xE3 g\u1ED9p",
    gitFilterAll: "T\u1EA5t c\u1EA3",
    gitEmptyPulls: "Kh\xF4ng c\xF3 pull request",
    gitEmptyPullsHint: "Kh\xF4ng c\xF3 m\u1EE5c n\xE0o kh\u1EDBp b\u1ED9 l\u1ECDc n\xE0y.",
    gitEmptyIssues: "Kh\xF4ng c\xF3 issue",
    gitEmptyIssuesHint: "Kh\xF4ng c\xF3 m\u1EE5c n\xE0o kh\u1EDBp b\u1ED9 l\u1ECDc n\xE0y.",
    gitForgeOff: "Pull request v\xE0 issue c\u1EA7n m\xE1y ch\u1EE7 m\xE3 ngu\u1ED3n",
    gitForgeHint: "Th\xEAm remote GitHub ho\u1EB7c GitLab cho kho m\xE3, ho\u1EB7c \u0111\u0103ng nh\u1EADp b\u1EB1ng CLI c\u1EE7a m\xE1y ch\u1EE7 \u0111\xF3.",
    gitBy: "b\u1EDFi {author}",
    gitUpdated: "c\u1EADp nh\u1EADt {when}",
    gitCommented: "{count} b\xECnh lu\u1EADn",
    gitFrom: "t\u1EEB {branch}",
    gitCommitListEmpty: "Ch\u01B0a c\xF3 commit",
    gitCommitListEmptyHint: "Kho m\xE3 ch\u01B0a c\xF3 commit n\xE0o.",
    gitAuthor: "T\xE1c gi\u1EA3",
    gitDate: "Th\u1EDDi \u0111i\u1EC3m",
    gitHash: "Commit",
    gitChecksFailure: "{count} l\u1ED7i",
    gitChecksPending: "{count} \u0111ang ch\u1EA1y",
    gitChecksSuccess: "{count} \u0111\u1EA1t",
    gitPrAction: "T\u1EA1o pull request",
    gitPrConfirm: "T\u1EA1o pull request t\u1EEB {branch} v\xE0o {base}?",
    gitPrConfirmHint: "Nh\xE1nh \u0111\u01B0\u1EE3c \u0111\u1EA9y l\xEAn tr\u01B0\u1EDBc, sau \u0111\xF3 model c\u1EE7a phi\xEAn n\xE0y vi\u1EBFt ti\xEAu \u0111\u1EC1 v\xE0 m\xF4 t\u1EA3 r\u1ED3i pull request m\u1EDBi \u0111\u01B0\u1EE3c m\u1EDF.",
    gitPrCreate: "T\u1EA1o",
    gitPrCancel: "Hu\u1EF7",
    gitPrBusy: "\u0110ang so\u1EA1n pull request\u2026",
    gitPrCreated: "\u0110\xE3 t\u1EA1o pull request #{number}",
    gitPrOpen: "M\u1EDF tr\xEAn web",
    gitPrFailed: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c pull request",
    gitPrBase: "Nh\xE1nh n\u1EC1n",
    gitPrNoForge: "C\u1EA7n CLI c\u1EE7a m\xE1y ch\u1EE7 m\xE3 ngu\u1ED3n \u0111\xE3 \u0111\u0103ng nh\u1EADp \u0111\u1EC3 t\u1EA1o pull request",
    gitPrNoBranch: "B\u1EA3n checkout n\xE0y kh\xF4ng \u1EDF tr\xEAn nh\xE1nh n\xE0o",
    wtOption: "Worktree m\u1EDBi",
    wtSource: "B\u1EAFt \u0111\u1EA7u t\u1EEB",
    wtLocal: "Nh\xE1nh local",
    wtRemote: "Nh\xE1nh remote",
    wtBase: "Nh\xE1nh n\u1EC1n",
    wtBusy: "\u0110ang t\u1EA1o worktree\u2026",
    wtCreated: "Phi\xEAn n\xE0y gi\u1EDD l\xE0m vi\u1EC7c trong {branch}",
    wtRemove: "Xo\xE1 worktree",
    wtRemoved: "\u0110\xE3 xo\xE1 worktree; phi\xEAn quay l\u1EA1i th\u01B0 m\u1EE5c d\u1EF1 \xE1n",
    wtFailed: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c worktree",
    wtNoBase: "Ch\u01B0a c\xF3 nh\xE1nh n\xE0o \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u",
    wtHint: "Checkout n\u1EB1m trong kho m\xE3 v\xE0 b\u1EAFt \u0111\u1EA7u t\u1EEB nh\xE1nh b\u1EA1n ch\u1ECDn.",
    gitSettingsTitle: "Worktree v\xE0 pull request \u0111\xE3 g\u1ED9p",
    gitSettingsSummary: "D\u1ECDn d\u1EB9p sau khi pull request c\u1EE7a phi\xEAn \u0111\u01B0\u1EE3c g\u1ED9p",
    gitSettingsMerged: "Khi pull request c\u1EE7a phi\xEAn \u0111\u01B0\u1EE3c g\u1ED9p",
    gitSettingsRemove: "Xo\xE1 worktree",
    gitSettingsDeleteBranch: "Xo\xE1 c\u1EA3 nh\xE1nh c\u1EE7a n\xF3",
    gitSettingsArchive: "\u1EA8n phi\xEAn kh\u1ECFi danh s\xE1ch",
    gitSettingsSave: "L\u01B0u",
    gitSettingsSaving: "\u0110ang l\u01B0u\u2026",
    gitSettingsSaved: "\u0110\xE3 l\u01B0u. B\u1EA3ng t\u1EA3i l\u1EA1i v\u1EDBi thi\u1EBFt l\u1EADp m\u1EDBi.",
    gitSettingsReadOnly: "B\u1EA3n c\xE0i n\xE0y kh\xF4ng cho s\u1EEDa c\u1EA5u h\xECnh.",
    gitSettingsOff: "T\u1EAFt",
    gitSettingsFailed: "Kh\xF4ng l\u01B0u \u0111\u01B0\u1EE3c thi\u1EBFt l\u1EADp",
    gitSettingsError: "Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c thi\u1EBFt l\u1EADp",
    gitNewChat: "Chat m\u1EDBi trong worktree n\xE0y",
    gitNewChatCreated: "Chat m\u1EDBi gi\u1EDD l\xE0m vi\u1EC7c trong {branch}",
    gitNewChatHint: "M\u1EDF t\u1EEB thanh b\xEAn; chat n\xE0y gi\u1EEF checkout ri\xEAng.",
    gitNewChatFailed: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c chat trong worktree",
    cleanupTitle: "D\u1ECDn worktree",
    cleanupEnabled: "Xo\xE1 checkout kh\xF4ng ai d\xF9ng",
    cleanupInactiveDays: "s\u1ED1 ng\xE0y kh\xF4ng d\xF9ng tr\u01B0\u1EDBc khi xo\xE1 (0 = t\u1EAFt quy t\u1EAFc n\xE0y)",
    cleanupNoCommits: "Xo\xE1 khi nh\xE1nh kh\xF4ng c\xF3 commit n\xE0o h\u01A1n nh\xE1nh n\u1EC1n",
    cleanupKeep: "Gi\u1EEF checkout khi c\xF3",
    cleanupKeepTracked: "Thay \u0111\u1ED5i ch\u01B0a commit",
    cleanupKeepAny: "B\u1EA5t k\u1EF3 t\u1EC7p local n\xE0o",
    cleanupKeepNone: "Kh\xF4ng gi\u1EEF g\xEC \u2014 v\u1EABn xo\xE1",
    cleanupRun: "D\u1ECDn ngay",
    cleanupRunning: "\u0110ang d\u1ECDn\u2026",
    cleanupLast: "L\u1EA7n tr\u01B0\u1EDBc: xo\xE1 {removed}, gi\u1EEF {kept}",
    cleanupNever: "Ch\u01B0a c\xF3 l\u1EA7n d\u1ECDn n\xE0o.",
    cleanupOff: "D\u1ECDn d\u1EB9p \u0111ang t\u1EAFt.",
    gitActions: "Thao t\xE1c Git",
    gitActionOptions: "Tu\u1EF3 ch\u1ECDn thao t\xE1c Git",
    gitActionCommit: "Commit",
    gitActionPush: "Push",
    gitActionCreatePr: "T\u1EA1o pull request",
    gitActionCommitPush: "Commit & push",
    gitActionCommitPushPr: "Commit, push & pull request",
    gitActionPushPr: "Push & t\u1EA1o pull request",
    gitActionPull: "Pull",
    gitActionSync: "\u0110\u1ED3ng b\u1ED9 nh\xE1nh",
    gitActionPublish: "\u0110\u01B0a kho m\xE3 l\xEAn m\xE1y ch\u1EE7",
    gitActionInitialize: "Kh\u1EDFi t\u1EA1o Git",
    gitActionInitializing: "\u0110ang kh\u1EDFi t\u1EA1o\u2026",
    gitHintBusy: "M\u1ED9t thao t\xE1c Git \u0111ang ch\u1EA1y.",
    gitHintNoStatus: "Ch\u01B0a \u0111\u1ECDc \u0111\u01B0\u1EE3c tr\u1EA1ng th\xE1i Git.",
    gitHintDetached: "T\u1EA1o v\xE0 checkout m\u1ED9t nh\xE1nh tr\u01B0\u1EDBc khi push ho\u1EB7c m\u1EDF pull request.",
    gitHintUpToDate: "Nh\xE1nh \u0111\xE3 \u0111\u1ED3ng b\u1ED9. Kh\xF4ng c\u1EA7n l\xE0m g\xEC.",
    gitHintNoCommits: "Kh\xF4ng c\xF3 commit local n\xE0o \u0111\u1EC3 push.",
    gitHintBehind: "Nh\xE1nh \u0111ang ch\u1EADm h\u01A1n upstream. H\xE3y pull tr\u01B0\u1EDBc.",
    gitHintDiverged: "Nh\xE1nh \u0111\xE3 t\xE1ch kh\u1ECFi upstream. H\xE3y rebase ho\u1EB7c merge tr\u01B0\u1EDBc.",
    gitHintClean: "C\xE2y l\xE0m vi\u1EC7c s\u1EA1ch. H\xE3y s\u1EEDa g\xEC \u0111\xF3 tr\u01B0\u1EDBc khi commit.",
    gitHintNoRemote: 'Th\xEAm remote "origin" tr\u01B0\u1EDBc khi push.',
    gitHintNoBranch: "HEAD r\u1EDDi: h\xE3y checkout m\u1ED9t nh\xE1nh tr\u01B0\u1EDBc.",
    gitHintBehindPr: "Nh\xE1nh \u0111ang ch\u1EADm h\u01A1n upstream. H\xE3y pull tr\u01B0\u1EDBc khi m\u1EDF pull request.",
    gitHintNoPrCommits: "Kh\xF4ng c\xF3 commit local n\xE0o \u0111\u1EC3 \u0111\u01B0a v\xE0o pull request.",
    gitHintCannotWrite: "Trang n\xE0y kh\xF4ng \u0111\u01B0\u1EE3c ph\xE9p \u0111\u1ED5i m\xE3 ngu\u1ED3n.",
    gitStarting: "\u0110ang b\u1EAFt \u0111\u1EA7u\u2026",
    gitPhaseBranch: "\u0110ang chu\u1EA9n b\u1ECB nh\xE1nh feature\u2026",
    gitPhaseMessage: "\u0110ang vi\u1EBFt th\xF4ng \u0111i\u1EC7p commit\u2026",
    gitPhaseCommit: "\u0110ang commit\u2026",
    gitPhasePush: "\u0110ang push\u2026",
    gitPhasePr: "\u0110ang t\u1EA1o pull request\u2026",
    gitPhasePrContent: "\u0110ang vi\u1EBFt n\u1ED9i dung pull request\u2026",
    gitPullStatus: "\u0110ang pull thay \u0111\u1ED5i m\u1EDBi\u2026",
    gitActionDone: "Xong",
    gitActionFailed: "Thao t\xE1c Git th\u1EA5t b\u1EA1i",
    gitPullFailed: "Pull th\u1EA5t b\u1EA1i",
    gitPullDone: "\u0110\xE3 pull",
    gitPullUpToDate: "\u0110\xE3 c\u1EADp nh\u1EADt",
    gitPullUpdated: "\u0110\xE3 c\u1EADp nh\u1EADt {branch}",
    gitPullSynced: "{branch} \u0111\xE3 \u0111\u1ED3ng b\u1ED9.",
    gitViewPr: "Xem pull request",
    gitCreatePrCta: "T\u1EA1o pull request",
    gitPushCta: "Push",
    gitSuccessCommitted: "\u0110\xE3 commit {sha}",
    gitSuccessPushed: "\u0110\xE3 push {sha} l\xEAn {branch}",
    gitSuccessPr: "\u0110\xE3 t\u1EA1o #{number}",
    gitSuccessPrOpened: "\u0110\xE3 m\u1EDF #{number}",
    gitCommitTitle: "Commit thay \u0111\u1ED5i",
    gitCommitHint: "Ch\u1ECDn c\xE1c t\u1EC7p c\u1EA7n \u0111\u01B0a v\xE0o. \u0110\u1EC3 tr\u1ED1ng th\xF4ng \u0111i\u1EC7p \u0111\u1EC3 t\u1EF1 sinh.",
    gitCommitMessage: "Th\xF4ng \u0111i\u1EC7p commit",
    gitCommitPlaceholder: "\u0110\u1EC3 tr\u1ED1ng \u0111\u1EC3 t\u1EF1 sinh",
    gitCommitGenerate: "T\u1EF1 sinh",
    gitCommitGenerating: "\u0110ang sinh\u2026",
    gitCommitButton: "Commit",
    gitCommitAndPush: "Commit & push",
    gitCommitOnNewBranch: "Commit tr\xEAn nh\xE1nh m\u1EDBi",
    gitCommitNoFiles: "Ch\u1ECDn \xEDt nh\u1EA5t m\u1ED9t t\u1EC7p.",
    gitCommitSelected: "{selected} tr\xEAn {total} t\u1EC7p",
    gitSelectAll: "Ch\u1ECDn t\u1EA5t c\u1EA3 t\u1EC7p",
    gitClearSelection: "B\u1ECF ch\u1ECDn",
    gitExcluded: "Kh\xF4ng ch\u1ECDn",
    gitDefaultBranch: "Nh\xE1nh m\u1EB7c \u0111\u1ECBnh",
    gitDetachedHead: "(HEAD r\u1EDDi)",
    gitDefaultTitle: "Ch\u1EA1y thao t\xE1c n\xE0y tr\xEAn {branch}?",
    gitDefaultPushTitle: "Push l\xEAn {branch}?",
    gitDefaultPrTitle: "T\u1EA1o pull request t\u1EEB {branch}?",
    gitDefaultBody: 'Thao t\xE1c n\xE0y ch\u1EA1y tr\xEAn "{branch}", nh\xE1nh m\u1EB7c \u0111\u1ECBnh. Ti\u1EBFp t\u1EE5c \u1EDF \u0111\xE2y, ho\u1EB7c checkout m\u1ED9t nh\xE1nh feature r\u1ED3i ch\u1EA1y l\u1EA1i.',
    gitDefaultContinue: "Ti\u1EBFp t\u1EE5c tr\xEAn {branch}",
    gitDefaultFeature: "Checkout nh\xE1nh feature & ti\u1EBFp t\u1EE5c",
    gitDefaultAbort: "Hu\u1EF7",
    gitDefaultWarning: "Kh\xF4ng c\xF3 thay \u0111\u1ED5i n\xE0o \u0111\u1EC3 commit n\xEAn kh\xF4ng \u0111\u1EB7t t\xEAn \u0111\u01B0\u1EE3c nh\xE1nh feature.",
    gitBranchSelect: "\u0110\u1ED5i nh\xE1nh",
    gitBranchSearch: "T\xECm nh\xE1nh\u2026",
    gitBranchNoMatch: "Kh\xF4ng c\xF3 nh\xE1nh n\xE0o.",
    gitBranchCreate: 'T\u1EA1o nh\xE1nh "{name}"',
    gitBranchCurrent: "hi\u1EC7n t\u1EA1i",
    gitBranchRemote: "remote",
    gitBranchDefault: "m\u1EB7c \u0111\u1ECBnh",
    gitBranchLoading: "\u0110ang t\u1EA3i nh\xE1nh\u2026",
    gitBranchSwitchFailed: "Kh\xF4ng \u0111\u1ED5i \u0111\u01B0\u1EE3c nh\xE1nh",
    gitBranchCreateFailed: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c nh\xE1nh",
    gitBranchName: "T\xEAn nh\xE1nh",
    gitPublishTitle: "\u0110\u01B0a kho m\xE3 l\xEAn m\xE1y ch\u1EE7",
    gitPublishHint: "Ch\u1ECDn n\u01A1i l\u01B0u tr\u1EEF, r\u1ED3i \u0111\u1EB7t t\xEAn kho m\xE3.",
    gitPublishProvider: "M\xE1y ch\u1EE7",
    gitPublishRepository: "Kho m\xE3",
    gitPublishVisibility: "Ch\u1EBF \u0111\u1ED9 hi\u1EC3n th\u1ECB",
    gitPublishPrivate: "Ri\xEAng t\u01B0",
    gitPublishPrivateHint: "Ch\u1EC9 ng\u01B0\u1EDDi \u0111\u01B0\u1EE3c m\u1EDDi",
    gitPublishPublic: "C\xF4ng khai",
    gitPublishPublicHint: "B\u1EA5t k\u1EF3 ai tr\xEAn web",
    gitPublishButton: "\u0110\u0103ng",
    gitPublishBusy: "\u0110ang \u0111\u0103ng\u2026",
    gitPublishDone: "\u0110\xE3 \u0111\u01B0a kho m\xE3 l\xEAn",
    gitPublishFailed: "Kh\xF4ng \u0111\u01B0a \u0111\u01B0\u1EE3c kho m\xE3 l\xEAn",
    gitPublishOpen: "M\u1EDF tr\xEAn web",
    gitDiffScope: "Ph\u1EA1m vi diff",
    gitScopeWorking: "Ch\u01B0a commit",
    gitScopeBranch: "Nh\xE1nh",
    gitScopeLabel: "so v\u1EDBi {base}",
    gitUncommitted: "Ch\u01B0a commit",
    gitLayout: "C\xE1ch hi\u1EC3n th\u1ECB diff",
    gitLayoutUnified: "M\u1ED9t c\u1ED9t",
    gitLayoutSplit: "Hai c\u1ED9t",
    gitWrap: "Xu\u1ED1ng d\xF2ng",
    gitWhitespace: "\u1EA8n thay \u0111\u1ED5i kho\u1EA3ng tr\u1EAFng",
    gitExpandAll: "M\u1EDF t\u1EA5t c\u1EA3 t\u1EC7p",
    gitCollapseAll: "Thu g\u1ECDn t\u1EA5t c\u1EA3 t\u1EC7p",
    gitExpandFile: "M\u1EDF {path}",
    gitCollapseFile: "Thu g\u1ECDn {path}",
    gitNoDiff: "Kh\xF4ng c\xF3 thay \u0111\u1ED5i \u0111\u1EC3 hi\u1EC3n th\u1ECB.",
    gitDiffTooLarge: "Diff qu\xE1 l\u1EDBn \u0111\u1EC3 hi\u1EC3n th\u1ECB \u0111\u1EA7y \u0111\u1EE7. T\u1ED5ng s\u1ED1 v\u1EABn t\xEDnh m\u1ECDi thay \u0111\u1ED5i.",
    gitWhitespaceOnly: "Ch\u1EC9 thay \u0111\u1ED5i kho\u1EA3ng tr\u1EAFng.",
    gitShowMore: "Hi\u1EC7n th\xEAm",
    gitLines: "{count} d\xF2ng",
    gitAdditions: "{count} d\xF2ng th\xEAm",
    gitDeletions: "{count} d\xF2ng xo\xE1",
    gitToastCopied: "\u0110\xE3 sao ch\xE9p",
    gitOpenFailed: "Kh\xF4ng m\u1EDF \u0111\u01B0\u1EE3c t\u1EC7p",
    gitSessionUnavailable: "B\u1EA3n c\xE0i n\xE0y kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c chat cho b\u1EA3ng",
    gitActionUnavailable: "Thao t\xE1c ch\u01B0a d\xF9ng \u0111\u01B0\u1EE3c"
  };
  var dictionaries = { en, vi };

  // src/client/api.ts
  var GIT_PATH = "api/personal-hub-git";
  var GitRequestError = class extends Error {
    code;
    details;
    constructor(code, message, details) {
      super(message);
      this.name = "GitRequestError";
      this.code = code;
      this.details = details;
    }
  };
  function createGitCaller() {
    return async function call(endpoint, payload) {
      let response;
      try {
        response = await fetch(`${GIT_PATH}/${endpoint}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload ?? {}),
          credentials: "same-origin",
          cache: "no-store"
        });
      } catch (error) {
        throw new GitRequestError("connection/failed", messageOf(error));
      }
      if (!response.ok) {
        throw new GitRequestError("connection/failed", `transport failure for ${endpoint}: HTTP ${response.status}`);
      }
      let result;
      try {
        result = await response.json();
      } catch {
        throw new GitRequestError("connection/empty", "The Host sent no answer");
      }
      if (result === null || typeof result !== "object") {
        throw new GitRequestError("connection/empty", "The Host sent no answer");
      }
      const envelope = result;
      if (envelope.ok !== true) {
        const detail = envelope.error;
        throw new GitRequestError(
          detail?.code ?? "system/failed",
          detail?.message ?? "The Git request failed",
          detail?.details
        );
      }
      return envelope.value;
    };
  }
  function createGitApi(call) {
    const route = (name) => (payload) => call(name, payload);
    return {
      overview: route("overview"),
      diff: route("diff"),
      diffAll: route("diffAll"),
      commits: route("commits"),
      commit: route("commit"),
      branches: route("branches"),
      switchBranch: route("switchBranch"),
      createBranch: route("createBranch"),
      stage: route("stage"),
      unstage: route("unstage"),
      discard: route("discard"),
      commitChanges: route("commitChanges"),
      push: route("push"),
      pull: route("pull"),
      draftMessage: route("draftMessage"),
      startAction: route("startAction"),
      actionState: route("actionState"),
      forge: route("forge"),
      pulls: route("pulls"),
      pullRequest: route("pullRequest"),
      branchPull: route("branchPull"),
      issues: route("issues"),
      issue: route("issue"),
      createPull: route("createPull"),
      publish: route("publish"),
      worktreeState: route("worktreeState"),
      worktreeCreate: route("worktreeCreate"),
      worktreeRemove: route("worktreeRemove"),
      mergeSettings: route("mergeSettings"),
      mergeSettingsSet: route("mergeSettingsSet"),
      cleanupState: route("cleanupState"),
      cleanupRun: route("cleanupRun")
    };
  }
  function messageOf(error) {
    if (error !== null && typeof error === "object" && "message" in error) return String(error.message);
    return String(error);
  }
  function codeOf(error) {
    if (error !== null && typeof error === "object" && "code" in error) {
      const code = error.code;
      return typeof code === "string" ? code : void 0;
    }
    return void 0;
  }

  // src/client/styles.ts
  var GIT_CSS = `
.ph-git{display:flex;flex-direction:column;min-height:0;height:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:12.5px}
.ph-git *{box-sizing:border-box}
.ph-git button{font:inherit;color:inherit}
.ph-git .ph-spacer{flex:1 1 auto;min-width:0}
.ph-git .ph-dim{color:var(--dsw-alias-label-tertiary)}
.ph-git .ph-tiny{font-size:11px}
.ph-git .ph-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ph-git .ph-ellipsis{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.ph-git .ph-row{display:flex;align-items:center;gap:6px;min-width:0}

/* Header */
.ph-head{display:flex;flex-direction:column;gap:6px;padding:8px 10px 6px;border-bottom:1px solid var(--dsw-alias-border-l3);flex:none}
.ph-repo-row{display:flex;align-items:center;gap:6px;min-width:0}
.ph-repo{font-weight:600;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-branch-row{display:flex;align-items:center;gap:6px;min-width:0}
.ph-branch-button{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:2px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);cursor:pointer;min-width:0}
.ph-branch-button:hover{background:var(--dsw-alias-bg-layer-2)}
.ph-pill{display:inline-flex;align-items:center;gap:2px;padding:1px 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10.5px;font-variant-numeric:tabular-nums;white-space:nowrap}
.ph-pill[data-tone=warn]{color:var(--dsw-alias-state-warn-primary)}
.ph-pill[data-tone=success]{color:var(--dsw-alias-state-success-primary)}
.ph-chip{display:inline-flex;align-items:center;gap:4px;max-width:100%;padding:1px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
button.ph-chip{cursor:pointer}
button.ph-chip:hover{background:var(--dsw-alias-bg-layer-2)}
.ph-chip[data-tone=success]{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,transparent)}
.ph-chip[data-tone=warn]{color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 40%,transparent)}
.ph-chip[data-tone=error]{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent)}
.ph-chip[data-tone=business]{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,transparent)}
.ph-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-label-tertiary);flex:none}
.ph-dot[data-state=open]{background:var(--dsw-alias-state-success-primary)}
.ph-dot[data-state=success]{background:var(--dsw-alias-state-success-primary)}
.ph-dot[data-state=failure]{background:var(--dsw-alias-state-error-primary)}
.ph-dot[data-state=error]{background:var(--dsw-alias-state-error-primary)}
.ph-dot[data-state=pending]{background:var(--dsw-alias-state-warn-primary)}
.ph-dot[data-state=merged]{background:var(--dsw-alias-brand-primary)}
.ph-dot[data-state=closed]{background:var(--dsw-alias-label-tertiary)}
.ph-dot[data-state=draft]{background:var(--dsw-alias-label-secondary)}

/* Actions: one split control, as the reference implementation has */
.ph-actions{display:flex;align-items:stretch;gap:0;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;position:relative}
.ph-actions[data-running=true]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,var(--dsw-alias-border-l1))}
.ph-action-primary{display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0;padding:6px 9px;border:0;background:transparent;cursor:pointer;font-weight:600;font-size:12.5px;text-align:left}
.ph-action-primary:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.ph-action-primary:disabled{cursor:default;color:var(--dsw-alias-label-tertiary)}
.ph-action-caret{display:flex;align-items:center;justify-content:center;width:28px;border:0;border-left:1px solid var(--dsw-alias-border-l3);background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary)}
.ph-action-caret:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.ph-action-caret:disabled{cursor:default;opacity:.55}
.ph-action-hint{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.4;margin:0}
.ph-menu{position:absolute;right:0;top:calc(100% + 4px);z-index:50;display:flex;flex-direction:column;min-width:220px;padding:4px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 10px 28px rgba(0,0,0,.24)}
.ph-menu-item{display:flex;align-items:center;gap:8px;padding:6px 8px;border:0;border-radius:6px;background:transparent;cursor:pointer;text-align:left;font-size:12px}
.ph-menu-item:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1)}
.ph-menu-item:disabled{cursor:default;color:var(--dsw-alias-label-tertiary)}
.ph-menu-hint{padding:4px 8px 6px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.4}
.ph-menu-sep{height:1px;margin:4px 2px;background:var(--dsw-alias-border-l3)}

/* Progress and inline success replace the control */
.ph-progress{display:flex;flex-direction:column;gap:2px;padding:6px 9px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,var(--dsw-alias-border-l1));border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
.ph-progress-row{display:flex;align-items:center;gap:7px;min-width:0}
.ph-progress-text{font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-progress-elapsed{margin-left:auto;font-size:10.5px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;flex:none}
.ph-progress-output{margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-spinner{width:12px;height:12px;flex:none;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,transparent);border-top-color:var(--dsw-alias-brand-primary);animation:ph-spin .8s linear infinite}
@keyframes ph-spin{to{transform:rotate(360deg)}}
.ph-success{display:flex;align-items:center;gap:7px;padding:6px 9px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,var(--dsw-alias-border-l1));border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,var(--dsw-alias-bg-layer-1))}
.ph-success-text{font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-success-desc{font-size:11px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Tabs */
.ph-tabs{display:flex;align-items:center;gap:2px;padding:0 6px;border-bottom:1px solid var(--dsw-alias-border-l3);flex:none;overflow-x:auto;scrollbar-width:none}
.ph-tabs::-webkit-scrollbar{display:none}
.ph-tab{display:inline-flex;align-items:center;gap:5px;padding:7px 8px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:12px;white-space:nowrap}
.ph-tab:hover{color:var(--dsw-alias-label-primary)}
.ph-tab[aria-selected=true]{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-brand-primary)}
.ph-tab-count{padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);font-size:10px;font-variant-numeric:tabular-nums}

/* Body */
.ph-body{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain}
.ph-toolbar{display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l3);flex:none;flex-wrap:wrap}
.ph-toolbar .ph-spacer{flex:1 1 auto}
.ph-toolbar-title{font-weight:600;font-size:12px}

/* Buttons */
.ph-button{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:11.5px;white-space:nowrap}
.ph-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ph-button:disabled{opacity:.55;cursor:default}
.ph-button[aria-pressed=true]{border-color:transparent;background:var(--dsw-alias-brand-primary);color:#fff}
.ph-primary{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:5px 12px;border:1px solid transparent;border-radius:7px;background:var(--dsw-alias-brand-primary);color:#fff;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap}
.ph-primary:disabled{opacity:.55;cursor:default}
.ph-icon-button{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;flex:none}
.ph-icon-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ph-icon-button:disabled{opacity:.5;cursor:default}
.ph-icon-button[data-busy=true] svg{animation:ph-spin .9s linear infinite}
.ph-link{color:var(--dsw-alias-brand-primary);text-decoration:none;cursor:pointer}
.ph-link:hover{text-decoration:underline}

/* Commit box */
.ph-commit{border-top:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-1);padding:8px 10px;display:flex;flex-direction:column;gap:6px;flex:none}
.ph-commit-head{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.ph-commit-files{max-height:132px;overflow:auto;border:1px solid var(--dsw-alias-border-l3);border-radius:7px;background:var(--dsw-alias-bg-base)}
.ph-commit-file{display:flex;align-items:center;gap:6px;width:100%;padding:3px 7px;border:0;background:transparent;cursor:pointer;font-size:11.5px;text-align:left;min-width:0}
.ph-commit-file:hover{background:var(--dsw-alias-bg-layer-2)}
.ph-commit-file[data-excluded=true]{color:var(--dsw-alias-label-tertiary)}
.ph-textarea{width:100%;min-height:52px;max-height:160px;resize:vertical;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:1.45}
.ph-textarea:focus{outline:1px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
.ph-commit-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ph-commit-actions .ph-spacer{flex:1 1 auto}
.ph-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.45}
.ph-error-text{margin:0;color:var(--dsw-alias-state-error-primary);font-size:11.5px;line-height:1.45}

/* Changes / diff stack */
.ph-stack{display:flex;flex-direction:column}
.ph-stack-toolbar{display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l3);position:sticky;top:0;z-index:6;background:var(--dsw-alias-bg-base);flex-wrap:wrap}
.ph-file{border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-file-head{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:6px;width:100%;padding:5px 8px;border:0;background:var(--dsw-alias-bg-layer-1);cursor:pointer;text-align:left;min-width:0;min-height:32px}
.ph-file-head:hover{background:var(--dsw-alias-bg-layer-2)}
.ph-file-head[data-expanded=true]{border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-file-check{flex:none;margin:0;cursor:pointer}
.ph-file-path{display:flex;align-items:baseline;gap:0;min-width:0;flex:1 1 auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px}
.ph-file-dir{color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;direction:rtl;text-align:left}
.ph-file-name{color:var(--dsw-alias-label-primary);white-space:nowrap}
.ph-badge{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;flex:none;border-radius:4px;font-size:9.5px;font-weight:700;font-family:ui-monospace,monospace;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.ph-badge[data-tone=success]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 18%,transparent);color:var(--dsw-alias-state-success-primary)}
.ph-badge[data-tone=warn]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 18%,transparent);color:var(--dsw-alias-state-warn-primary)}
.ph-badge[data-tone=error]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 18%,transparent);color:var(--dsw-alias-state-error-primary)}
.ph-badge[data-tone=business]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent);color:var(--dsw-alias-brand-primary)}
.ph-badge[data-tone=muted]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary)}
.ph-counts{display:inline-flex;align-items:center;gap:4px;flex:none;font-family:ui-monospace,monospace;font-size:10.5px;font-variant-numeric:tabular-nums}
.ph-glyph{display:inline-flex;align-items:center;flex:none;color:var(--dsw-alias-label-tertiary)}
.ph-bar{display:inline-flex;width:44px;height:4px;border-radius:2px;overflow:hidden;background:var(--dsw-alias-bg-layer-2);flex:none}
.ph-bar-add{display:block;height:100%;background:var(--dsw-alias-state-success-primary)}
.ph-bar-del{display:block;height:100%;background:var(--dsw-alias-state-error-primary)}
.ph-add{color:var(--dsw-alias-state-success-primary)}
.ph-del{color:var(--dsw-alias-state-error-primary)}
.ph-file-body{background:var(--dsw-alias-bg-base)}
.ph-notice{margin:6px 10px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l3);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:1.45}
.ph-diff{display:flex;flex-direction:column;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;line-height:1.5}
.ph-diff[data-wrap=true]{overflow-x:hidden}
.ph-hunk-head{padding:2px 10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);font-size:10.5px;white-space:pre;position:sticky;left:0}
.ph-line{display:flex;align-items:flex-start;min-width:0;white-space:pre}
.ph-diff[data-wrap=true] .ph-line{white-space:pre-wrap;word-break:break-word}
.ph-line[data-kind=add]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.ph-line[data-kind=del]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.ph-line[data-kind=meta]{color:var(--dsw-alias-label-tertiary);font-style:italic}
.ph-num{flex:none;width:34px;padding:0 6px;text-align:right;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;user-select:none}
.ph-sign{flex:none;width:14px;text-align:center;color:var(--dsw-alias-label-tertiary);user-select:none}
.ph-code{flex:1 1 auto;min-width:0;padding-right:10px}
.ph-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-width:0}
.ph-split .ph-side{display:flex;align-items:flex-start;min-width:0;border-right:1px solid var(--dsw-alias-border-l3);white-space:pre}
.ph-diff[data-wrap=true] .ph-split .ph-side{white-space:pre-wrap;word-break:break-word}
.ph-split .ph-side:last-child{border-right:0}
.ph-split .ph-side[data-kind=add]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.ph-split .ph-side[data-kind=del]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.ph-split .ph-side[data-empty=true]{background:var(--dsw-alias-bg-layer-1)}

/* Branch picker */
.ph-branch-pop{position:absolute;left:0;top:calc(100% + 4px);z-index:60;width:min(320px,calc(100vw - 40px));display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 12px 32px rgba(0,0,0,.26);overflow:hidden}
.ph-pop-search{display:flex;align-items:center;gap:6px;padding:7px 8px;border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-pop-input{flex:1 1 auto;min-width:0;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none}
.ph-pop-list{max-height:240px;overflow:auto;padding:4px}
.ph-ref{display:flex;align-items:center;gap:6px;width:100%;padding:5px 7px;border:0;border-radius:6px;background:transparent;cursor:pointer;text-align:left;font-size:12px;min-width:0}
.ph-ref:hover{background:var(--dsw-alias-bg-layer-1)}
.ph-ref[data-current=true]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.ph-ref-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-ref-tag{flex:none;font-size:9.5px;color:var(--dsw-alias-label-tertiary);border:1px solid var(--dsw-alias-border-l3);border-radius:999px;padding:0 4px}
.ph-pop-foot{padding:6px 8px;border-top:1px solid var(--dsw-alias-border-l3);font-size:10.5px;color:var(--dsw-alias-label-tertiary)}

/* Dialog (inside the panel) */
.ph-overlay{position:absolute;inset:0;z-index:70;display:flex;align-items:flex-end;justify-content:center;padding:8px;background:rgba(0,0,0,.28)}
.ph-dialog{width:100%;max-height:92%;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 18px 42px rgba(0,0,0,.32)}
.ph-dialog-title{font-size:13px;font-weight:600}
.ph-dialog-body{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}
.ph-dialog-actions{display:flex;align-items:center;gap:6px;justify-content:flex-end;flex-wrap:wrap}
.ph-field{display:flex;flex-direction:column;gap:4px}
.ph-field-label{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.ph-input,.ph-select{width:100%;padding:5px 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.ph-radio{display:flex;align-items:flex-start;gap:7px;padding:7px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;cursor:pointer}
.ph-radio[data-checked=true]{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}
.ph-radio input{margin:2px 0 0}
.ph-radio-text{display:flex;flex-direction:column;gap:1px;min-width:0}
.ph-radio-title{font-size:12px;font-weight:500}
.ph-radio-hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}

/* Toasts */
.ph-toasts{position:absolute;left:8px;right:8px;bottom:8px;z-index:80;display:flex;flex-direction:column;gap:6px;pointer-events:none}
.ph-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:7px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 10px 26px rgba(0,0,0,.28);font-size:11.5px}
.ph-toast[data-tone=error]{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,var(--dsw-alias-border-l1))}
.ph-toast[data-tone=success]{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 45%,var(--dsw-alias-border-l1))}
.ph-toast-text{flex:1 1 auto;min-width:0}
.ph-toast-title{font-weight:600;margin-bottom:1px}
.ph-toast-desc{color:var(--dsw-alias-label-tertiary);line-height:1.4;word-break:break-word}

/* Lists, details, cards */
.ph-section{display:flex;align-items:center;gap:6px;padding:5px 10px;color:var(--dsw-alias-label-tertiary);font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-item{display:flex;flex-direction:column;gap:2px;width:100%;padding:7px 10px;border:0;border-bottom:1px solid var(--dsw-alias-border-l3);background:transparent;cursor:pointer;text-align:left}
.ph-item:hover{background:var(--dsw-alias-bg-layer-1)}
.ph-item-title{display:flex;align-items:center;gap:5px;min-width:0;font-size:12px}
.ph-item-number{flex:none;font-family:ui-monospace,monospace;font-size:11px;color:var(--dsw-alias-label-tertiary)}
.ph-item-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.ph-item-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:var(--dsw-alias-label-tertiary);font-size:10.5px}
.ph-detail{display:flex;flex-direction:column;gap:8px;padding:10px}
.ph-detail-title{font-size:13px;font-weight:600;line-height:1.4}
.ph-detail-meta{display:flex;flex-direction:column;gap:3px}
.ph-detail-row{display:flex;align-items:baseline;gap:8px;font-size:11.5px}
.ph-detail-label{flex:none;width:76px;color:var(--dsw-alias-label-tertiary)}
.ph-detail-value{min-width:0;overflow:hidden;text-overflow:ellipsis}
.ph-card{display:flex;flex-direction:column;gap:6px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
.ph-card-title{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.ph-prose{margin:0;font-size:11.5px;line-height:1.55;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word}
.ph-comment{display:flex;flex-direction:column;gap:3px;padding:6px 0;border-top:1px solid var(--dsw-alias-border-l3)}
.ph-comment:first-of-type{border-top:0}
.ph-comment-head{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-size:10.5px}
.ph-comment-author{color:var(--dsw-alias-label-secondary);font-weight:600}
.ph-check{display:flex;align-items:center;gap:6px;padding:2px 0;font-size:11.5px;min-width:0}
.ph-check-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-check-duration{flex:none;color:var(--dsw-alias-label-tertiary);font-size:10.5px}
.ph-filters{display:flex;align-items:center;gap:4px;padding:6px 10px;flex-wrap:wrap;border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-filter{padding:2px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:11px}
.ph-filter[aria-pressed=true]{border-color:transparent;background:var(--dsw-alias-brand-primary);color:#fff}

/* Empty, loading, failure */
.ph-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:28px 18px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.ph-empty-icon{display:flex;color:var(--dsw-alias-label-tertiary);opacity:.8}
.ph-empty-title{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.ph-empty-hint{font-size:11.5px;line-height:1.5;max-width:260px}
.ph-error{display:flex;flex-direction:column;align-items:flex-start;gap:5px;margin:8px 10px;padding:9px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,var(--dsw-alias-border-l1));border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 7%,var(--dsw-alias-bg-layer-1));font-size:11.5px;line-height:1.45}
.ph-error-title{display:flex;align-items:center;gap:5px;font-weight:600;color:var(--dsw-alias-state-error-primary)}
.ph-error-code{font-family:ui-monospace,monospace;font-size:10.5px;color:var(--dsw-alias-label-tertiary)}
.ph-loading{display:flex;align-items:center;gap:7px;padding:12px;color:var(--dsw-alias-label-tertiary);font-size:11.5px}

/* Settings card (plugin row) */
.ph-wrap{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}
.ph-setting{display:flex;flex-direction:column;gap:7px;padding:9px 0}
.ph-setting-head{font-size:12.5px;font-weight:500}
.ph-check-row{display:flex;align-items:center;gap:7px;font-size:12px}
.ph-check-row input{flex:none;margin:0}
.ph-check-row input:disabled+span{opacity:.6}
.ph-ok{margin:0;color:var(--dsw-alias-state-success-primary);font-size:12px}
.ph-tooltip{position:relative}
`;

  // src/client/icons.tsx
  function Icon(props) {
    const size = props.size ?? 16;
    const common = {
      width: size,
      height: size,
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: props.weight ?? 1.4,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      className: props.className,
      style: { display: "block", flex: "none" }
    };
    const children = glyph(props.name);
    return h("svg", common, ...children);
  }
  function glyph(name) {
    switch (name) {
      case "git":
        return [
          h("circle", { key: "a", cx: 5, cy: 4, r: 1.6 }),
          h("circle", { key: "b", cx: 5, cy: 12, r: 1.6 }),
          h("circle", { key: "c", cx: 11, cy: 6.5, r: 1.6 }),
          h("path", { key: "d", d: "M5 5.6v4.8" }),
          h("path", { key: "e", d: "M11 8.1c0 1.9-1.7 2.8-3.6 3.1" })
        ];
      case "branch":
        return [
          h("circle", { key: "a", cx: 4.5, cy: 3.5, r: 1.5 }),
          h("circle", { key: "b", cx: 4.5, cy: 12.5, r: 1.5 }),
          h("circle", { key: "c", cx: 11.5, cy: 5.5, r: 1.5 }),
          h("path", { key: "d", d: "M4.5 5v6" }),
          h("path", { key: "e", d: "M11.5 7c0 2.2-1.6 3.2-3.5 3.6" })
        ];
      case "branchPlus":
        return [
          h("circle", { key: "a", cx: 4.5, cy: 3.5, r: 1.5 }),
          h("circle", { key: "b", cx: 4.5, cy: 12.5, r: 1.5 }),
          h("path", { key: "c", d: "M4.5 5v6" }),
          h("path", { key: "d", d: "M9.5 4.5h4" }),
          h("path", { key: "e", d: "M11.5 2.5v4" })
        ];
      case "file":
        return [
          h("path", { key: "a", d: "M9 1.8H4.8A1.3 1.3 0 0 0 3.5 3.1v9.8a1.3 1.3 0 0 0 1.3 1.3h6.4a1.3 1.3 0 0 0 1.3-1.3V5.3z" }),
          h("path", { key: "b", d: "M9 1.8v3.5h3.5" })
        ];
      case "fileDiff":
        return [
          h("path", { key: "a", d: "M9 1.8H4.8A1.3 1.3 0 0 0 3.5 3.1v9.8a1.3 1.3 0 0 0 1.3 1.3h6.4a1.3 1.3 0 0 0 1.3-1.3V5.3z" }),
          h("path", { key: "b", d: "M9 1.8v3.5h3.5" }),
          h("path", { key: "c", d: "M5.6 9.2h4.8" }),
          h("path", { key: "d", d: "M8 6.8v4.8" })
        ];
      case "folder":
        return [h("path", { key: "a", d: "M2.5 5.2a1.2 1.2 0 0 1 1.2-1.2h2.4l1.4 1.6h4.8a1.2 1.2 0 0 1 1.2 1.2v5.1a1.2 1.2 0 0 1-1.2 1.2H3.7a1.2 1.2 0 0 1-1.2-1.2z" })];
      case "refresh":
        return [
          h("path", { key: "a", d: "M13.2 7.2a5.2 5.2 0 1 0 .2 2" }),
          h("path", { key: "b", d: "M13.4 3.2v4h-4" })
        ];
      case "back":
        return [h("path", { key: "a", d: "M9.5 3.5 5 8l4.5 4.5" })];
      case "external":
        return [
          h("path", { key: "a", d: "M9.5 2.5h4v4" }),
          h("path", { key: "b", d: "M13.5 2.5 7.8 8.2" }),
          h("path", { key: "c", d: "M12 9.6v3.2a1.2 1.2 0 0 1-1.2 1.2H3.7a1.2 1.2 0 0 1-1.2-1.2V5.7a1.2 1.2 0 0 1 1.2-1.2h3.2" })
        ];
      case "copy":
        return [
          h("rect", { key: "a", x: 5.5, y: 5.5, width: 8, height: 8, rx: 1.5 }),
          h("path", { key: "b", d: "M10.5 5.5V3.9a1.4 1.4 0 0 0-1.4-1.4H3.9a1.4 1.4 0 0 0-1.4 1.4v5.2a1.4 1.4 0 0 0 1.4 1.4h1.6" })
        ];
      case "check":
        return [h("path", { key: "a", d: "M3 8.4 6.3 11.7 13 4.8" })];
      case "cross":
        return [h("path", { key: "a", d: "M4 4l8 8M12 4l-8 8" })];
      case "dot":
        return [h("circle", { key: "a", cx: 8, cy: 8, r: 3.2, fill: "currentColor", stroke: "none" })];
      case "clock":
        return [
          h("circle", { key: "a", cx: 8, cy: 8, r: 5.6 }),
          h("path", { key: "b", d: "M8 4.9V8l2.2 1.5" })
        ];
      case "alert":
        return [
          h("path", { key: "a", d: "M8 2.4 14 13H2z" }),
          h("path", { key: "b", d: "M8 6.3v3.1" }),
          h("path", { key: "c", d: "M8 11.3v.1" })
        ];
      case "comment":
        return [h("path", { key: "a", d: "M13.5 8.6c0 2.4-2.5 4.3-5.5 4.3-.7 0-1.5-.1-2.2-.3L3 13.5l1-2.4c-.7-.7-1-1.6-1-2.5C3 6.2 5.5 4.3 8 4.3s5.5 1.9 5.5 4.3z" })];
      case "merge":
        return [
          h("circle", { key: "a", cx: 4.5, cy: 4, r: 1.5 }),
          h("circle", { key: "b", cx: 4.5, cy: 12, r: 1.5 }),
          h("circle", { key: "c", cx: 11.5, cy: 8, r: 1.5 }),
          h("path", { key: "d", d: "M4.5 5.5v5" }),
          h("path", { key: "e", d: "M10 8H7.2a2.7 2.7 0 0 1-2.7-2.7" })
        ];
      case "issue":
        return [
          h("circle", { key: "a", cx: 8, cy: 8, r: 5.6 }),
          h("path", { key: "b", d: "M8 5.2v3.3" }),
          h("path", { key: "c", d: "M8 10.8v.1" })
        ];
      case "commit":
        return [
          h("circle", { key: "a", cx: 8, cy: 8, r: 2.6 }),
          h("path", { key: "b", d: "M1.8 8h3.6M10.6 8h3.6" })
        ];
      case "chevron":
        return [h("path", { key: "a", d: "M6 4l4 4-4 4" })];
      case "chevronDown":
        return [h("path", { key: "a", d: "M4 6l4 4 4-4" })];
      case "upload":
        return [
          h("path", { key: "a", d: "M8 10.5V2.8" }),
          h("path", { key: "b", d: "M4.8 6l3.2-3.2L11.2 6" }),
          h("path", { key: "c", d: "M2.8 12.8h10.4" })
        ];
      case "download":
        return [
          h("path", { key: "a", d: "M8 2.8v7.7" }),
          h("path", { key: "b", d: "M4.8 7.3 8 10.5l3.2-3.2" }),
          h("path", { key: "c", d: "M2.8 12.8h10.4" })
        ];
      case "sparkles":
        return [
          h("path", { key: "a", d: "M6.5 2.5 7.4 5l2.5.9-2.5.9-.9 2.5-.9-2.5L3.1 5.9 5.6 5z" }),
          h("path", { key: "b", d: "M11.5 8.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" })
        ];
      case "trash":
        return [
          h("path", { key: "a", d: "M3.5 4.5h9" }),
          h("path", { key: "b", d: "M6.5 4.5V3h3v1.5" }),
          h("path", { key: "c", d: "M4.6 4.5l.5 8.2a1.2 1.2 0 0 0 1.2 1.1h3.4a1.2 1.2 0 0 0 1.2-1.1l.5-8.2" })
        ];
      case "plus":
        return [h("path", { key: "a", d: "M8 3.2v9.6M3.2 8h9.6" })];
      case "search":
        return [
          h("circle", { key: "a", cx: 7.2, cy: 7.2, r: 4.2 }),
          h("path", { key: "b", d: "M10.4 10.4 13.5 13.5" })
        ];
      case "columns":
        return [
          h("rect", { key: "a", x: 2.5, y: 3, width: 11, height: 10, rx: 1.4 }),
          h("path", { key: "b", d: "M8 3v10" })
        ];
      case "rows":
        return [
          h("rect", { key: "a", x: 2.5, y: 3, width: 11, height: 10, rx: 1.4 }),
          h("path", { key: "b", d: "M2.5 6.4h11M2.5 9.6h11" })
        ];
      case "wrap":
        return [
          h("path", { key: "a", d: "M2.5 4.5h11" }),
          h("path", { key: "b", d: "M2.5 8h8.2a2.3 2.3 0 0 1 0 4.6H7.4" }),
          h("path", { key: "c", d: "M8.6 11l-1.4 1.6 1.4 1.6" }),
          h("path", { key: "d", d: "M2.5 11.5h3" })
        ];
      case "pilcrow":
        return [
          h("path", { key: "a", d: "M9.4 2.5H6.6a2.6 2.6 0 0 0 0 5.2h2.8z" }),
          h("path", { key: "b", d: "M9.4 2.5v11" }),
          h("path", { key: "c", d: "M12.4 2.5v11" })
        ];
      case "tree":
        return [
          h("path", { key: "a", d: "M3 3.5h4v3H3zM3 9.5h4v3H3z" }),
          h("path", { key: "b", d: "M9 5h2v6.5H9" }),
          h("path", { key: "c", d: "M7 5h2M7 11h2" })
        ];
      case "lock":
        return [
          h("rect", { key: "a", x: 3.4, y: 7, width: 9.2, height: 6.2, rx: 1.3 }),
          h("path", { key: "b", d: "M5.6 7V5.4a2.4 2.4 0 0 1 4.8 0V7" })
        ];
      case "globe":
        return [
          h("circle", { key: "a", cx: 8, cy: 8, r: 5.6 }),
          h("path", { key: "b", d: "M2.6 8h10.8" }),
          h("path", { key: "c", d: "M8 2.4c1.7 1.6 2.6 3.5 2.6 5.6S9.7 12 8 13.6C6.3 12 5.4 10.1 5.4 8S6.3 4 8 2.4z" })
        ];
      case "info":
        return [
          h("circle", { key: "a", cx: 8, cy: 8, r: 5.6 }),
          h("path", { key: "b", d: "M8 7.2v4" }),
          h("path", { key: "c", d: "M8 4.9v.1" })
        ];
      default:
        return [h("circle", { key: "a", cx: 8, cy: 8, r: 5.5 })];
    }
  }

  // src/client/telegram.tsx
  var TOKEN_REF = "DSH_TELEGRAM_BOT_TOKEN";
  function createController(ctx, t) {
    let snapshot = { configured: false, writable: true, known: false, busy: false, error: "", notice: "" };
    const listeners = /* @__PURE__ */ new Set();
    let disposed = false;
    const publish = (patch) => {
      snapshot = { ...snapshot, ...patch };
      for (const listener of [...listeners]) {
        try {
          listener();
        } catch {
        }
      }
    };
    async function refresh() {
      try {
        const response = await ctx.remote.credentials.describe([TOKEN_REF]);
        if (disposed) return;
        if (response === null || response === void 0 || response.ok !== true) {
          publish({ known: false, error: response?.error?.message ?? "" });
          return;
        }
        const view = response.value?.[TOKEN_REF] ?? { configured: false, writable: true };
        publish({
          known: true,
          configured: view.configured === true,
          writable: view.writable !== false,
          error: ""
        });
      } catch (error) {
        if (!disposed) publish({ known: false, error: messageOf(error) });
      }
    }
    async function save(value) {
      const token = String(value ?? "").trim();
      if (token.length === 0) {
        publish({ error: t("empty"), notice: "" });
        return;
      }
      publish({ busy: true, error: "", notice: "" });
      try {
        await ctx.remote.credentials.set(TOKEN_REF, token);
        await refresh();
        if (!disposed) publish({ busy: false, notice: t("saved") });
      } catch (error) {
        if (!disposed) publish({ busy: false, error: t("error", { message: messageOf(error) }) });
      }
    }
    async function clear() {
      publish({ busy: true, error: "", notice: "" });
      try {
        await ctx.remote.credentials.unset(TOKEN_REF);
        await refresh();
        if (!disposed) publish({ busy: false, notice: t("cleared") });
      } catch (error) {
        if (!disposed) publish({ busy: false, error: t("error", { message: messageOf(error) }) });
      }
    }
    return {
      getState: () => snapshot,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      refresh,
      save,
      clear,
      dispose: () => {
        disposed = true;
        listeners.clear();
      }
    };
  }
  function TelegramCard(props) {
    const { t } = props;
    const [draft, setDraft] = useState("");
    const state = useSyncExternalStore(props.subscribe, props.getState, props.getState);
    if (props.view === "summary") return h("span", null, t("summary"));
    const dotColor = state.known ? state.configured ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-state-idle-primary)" : "var(--dsw-alias-state-warn-primary)";
    const statusText = state.known ? state.configured ? t("stateOn") : t("stateOff") : t("stateUnknown");
    return h(
      "div",
      { "data-personal-hub-telegram": true, style: { display: "flex", flexDirection: "column", gap: "8px" } },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "6px" } },
        h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: dotColor, flex: "none" } }),
        h("span", null, statusText)
      ),
      h("p", { className: "ph-hint" }, t("intro")),
      h(
        "div",
        { className: "ph-field" },
        h("label", { className: "ph-field-label", htmlFor: "personal-hub-token" }, t("tokenLabel")),
        h("input", {
          id: "personal-hub-token",
          className: "ph-input",
          type: "password",
          autoComplete: "off",
          spellCheck: false,
          value: draft,
          placeholder: t("tokenPlaceholder"),
          disabled: !state.writable || state.busy,
          onInput: (event) => setDraft(event.target.value),
          onChange: (event) => setDraft(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter" && draft.trim().length > 0 && !state.busy) {
              void props.save(draft).then(() => setDraft(""));
            }
          }
        })
      ),
      h(
        "div",
        { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
        h("button", {
          type: "button",
          className: state.writable ? "ph-primary" : "ph-button",
          disabled: !state.writable || state.busy || draft.trim().length === 0,
          onClick: () => void props.save(draft).then(() => setDraft(""))
        }, state.busy ? t("saving") : t("save")),
        state.configured ? h("button", {
          type: "button",
          className: "ph-button",
          disabled: !state.writable || state.busy,
          onClick: () => void props.clear()
        }, t("clear")) : null
      ),
      state.writable ? null : h("p", { className: "ph-hint" }, t("readOnly")),
      state.error.length > 0 ? h("p", { className: "ph-error-text" }, state.error) : null,
      state.notice.length > 0 ? h("p", { className: "ph-ok" }, state.notice) : null,
      h("p", { className: "ph-hint" }, t("hint"))
    );
  }

  // src/client/git/settings.tsx
  function emptySettings() {
    return {
      enabled: false,
      removeWorktree: true,
      deleteBranch: false,
      archiveSession: true,
      cleanup: {
        enabled: false,
        inactiveDays: 7,
        whenNoCommits: true,
        noCommitsAfterHours: 6,
        keepChanges: "tracked",
        deleteBranch: false
      },
      cleanupLast: null,
      writable: false
    };
  }
  function MergeSettingsCard(props) {
    const { t, api } = props;
    const [settings, setSettings] = useState(void 0);
    const [status, setStatus] = useState("loading");
    const [runningCleanup, setRunningCleanup] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    useEffect(() => {
      let alive = true;
      api.mergeSettings({}).then((value2) => {
        if (!alive) return;
        setSettings(value2);
        setStatus("ready");
      }).catch((failure) => {
        if (!alive) return;
        setError(`${t("gitSettingsError")}: ${messageOf(failure)}`);
        setStatus("error");
      });
      return () => {
        alive = false;
      };
    }, [api, t]);
    if (props.view === "summary") return h("span", null, t("gitSettingsSummary"));
    if (status === "loading") return h("p", { className: "ph-hint" }, t("gitLoading"));
    const update = (patch) => {
      setSettings((current) => {
        const base = current ?? emptySettings();
        const cleanup = patch.cleanup === void 0 ? base.cleanup : { ...base.cleanup, ...patch.cleanup };
        return { ...base, ...patch.merge ?? {}, cleanup };
      });
    };
    const save = async () => {
      setStatus("saving");
      setError("");
      setNotice("");
      try {
        const value2 = await api.mergeSettingsSet({
          enabled: settings?.enabled === true,
          removeWorktree: settings?.removeWorktree === true,
          deleteBranch: settings?.deleteBranch === true,
          archiveSession: settings?.archiveSession === true,
          cleanup: settings?.cleanup ?? {}
        });
        setSettings((current) => ({
          ...current ?? emptySettings(),
          ...value2.merged,
          cleanup: value2.cleanup
        }));
        setStatus("ready");
        setNotice(t("gitSettingsSaved"));
      } catch (failure) {
        setStatus("ready");
        setError(`${t("gitSettingsFailed")}: ${messageOf(failure)}`);
      }
    };
    const runCleanup = async () => {
      setRunningCleanup(true);
      setError("");
      setNotice("");
      try {
        const value2 = await api.cleanupRun({});
        setSettings((current) => ({ ...current ?? emptySettings(), cleanupLast: value2.last }));
        if (value2.ran === false) setError(t("cleanupOff"));
        else if (value2.last !== null) {
          setNotice(t("cleanupLast", { removed: value2.last.removed.length, kept: value2.last.kept.length }));
        }
      } catch (failure) {
        setError(`${t("gitSettingsFailed")}: ${messageOf(failure)}`);
      } finally {
        setRunningCleanup(false);
      }
    };
    const value = settings ?? emptySettings();
    return h(MergeSettingsForm, {
      t,
      settings: value,
      status,
      error,
      notice,
      runningCleanup,
      onChange: update,
      onSave: () => void save(),
      onRunCleanup: () => void runCleanup()
    });
  }
  function MergeSettingsForm(props) {
    const { t, settings } = props;
    const writable = settings.writable;
    const enabled = settings.enabled;
    const busy = props.status === "saving";
    const disabled = !writable || busy;
    return h(
      "div",
      { "data-personal-hub-git-settings": true },
      h(
        "div",
        { className: "ph-setting" },
        h("div", { className: "ph-setting-head" }, t("gitSettingsMerged")),
        h(
          "label",
          { className: "ph-check-row" },
          h("input", {
            type: "checkbox",
            checked: enabled,
            disabled,
            onChange: (event) => props.onChange({ merge: { enabled: event.target.checked } })
          }),
          h("span", null, enabled ? t("gitSettingsSave") : t("gitSettingsOff"))
        ),
        h(
          "label",
          { className: "ph-check-row" },
          h("input", {
            type: "checkbox",
            checked: settings.removeWorktree,
            disabled: disabled || !enabled,
            onChange: (event) => props.onChange({ merge: { removeWorktree: event.target.checked } })
          }),
          h("span", null, t("gitSettingsRemove"))
        ),
        h(
          "label",
          { className: "ph-check-row" },
          h("input", {
            type: "checkbox",
            checked: settings.deleteBranch,
            disabled: disabled || !enabled || !settings.removeWorktree,
            onChange: (event) => props.onChange({ merge: { deleteBranch: event.target.checked } })
          }),
          h("span", null, t("gitSettingsDeleteBranch"))
        ),
        h(
          "label",
          { className: "ph-check-row" },
          h("input", {
            type: "checkbox",
            checked: settings.archiveSession,
            disabled: disabled || !enabled,
            onChange: (event) => props.onChange({ merge: { archiveSession: event.target.checked } })
          }),
          h("span", null, t("gitSettingsArchive"))
        )
      ),
      h(CleanupSection, {
        t,
        cleanup: settings.cleanup,
        last: settings.cleanupLast,
        writable,
        running: props.runningCleanup,
        onChange: (patch) => props.onChange({ cleanup: patch }),
        onRun: props.onRunCleanup
      }),
      writable ? h(
        "div",
        { style: { display: "flex", gap: "6px" } },
        h("button", {
          type: "button",
          className: "ph-primary",
          disabled: busy,
          onClick: props.onSave
        }, busy ? t("gitSettingsSaving") : t("gitSettingsSave"))
      ) : h("p", { className: "ph-hint" }, t("gitSettingsReadOnly")),
      props.error.length > 0 ? h("p", { className: "ph-error-text" }, props.error) : null,
      props.notice.length > 0 ? h("p", { className: "ph-ok" }, props.notice) : null,
      h("p", { className: "ph-hint" }, t("gitSettingsSummary"))
    );
  }
  function CleanupSection(props) {
    const { t, cleanup } = props;
    const disabled = !props.writable || props.running;
    return h(
      "div",
      { className: "ph-setting" },
      h("div", { className: "ph-setting-head" }, t("cleanupTitle")),
      h(
        "label",
        { className: "ph-check-row" },
        h("input", {
          type: "checkbox",
          checked: cleanup.enabled,
          disabled,
          onChange: (event) => props.onChange({ enabled: event.target.checked })
        }),
        h("span", null, t("cleanupEnabled"))
      ),
      h(
        "label",
        { className: "ph-check-row" },
        h("input", {
          type: "number",
          min: 0,
          max: 3650,
          value: cleanup.inactiveDays,
          disabled: disabled || !cleanup.enabled,
          style: { width: "64px" },
          onChange: (event) => props.onChange({ inactiveDays: Number(event.target.value) || 0 })
        }),
        h("span", null, t("cleanupInactiveDays"))
      ),
      h(
        "label",
        { className: "ph-check-row" },
        h("input", {
          type: "checkbox",
          checked: cleanup.whenNoCommits,
          disabled: disabled || !cleanup.enabled,
          onChange: (event) => props.onChange({ whenNoCommits: event.target.checked })
        }),
        h("span", null, t("cleanupNoCommits"))
      ),
      h(
        "label",
        { className: "ph-field" },
        h("span", { className: "ph-field-label" }, t("cleanupKeep")),
        h(
          "select",
          {
            className: "ph-select",
            value: cleanup.keepChanges,
            disabled: disabled || !cleanup.enabled,
            onChange: (event) => props.onChange({ keepChanges: event.target.value })
          },
          h("option", { value: "tracked" }, t("cleanupKeepTracked")),
          h("option", { value: "any" }, t("cleanupKeepAny")),
          h("option", { value: "none" }, t("cleanupKeepNone"))
        )
      ),
      h(
        "div",
        { style: { display: "flex", gap: "6px" } },
        h("button", {
          type: "button",
          className: "ph-button",
          disabled: disabled || !cleanup.enabled,
          onClick: props.onRun
        }, h(Icon, { name: "trash", size: 11 }), props.running ? t("cleanupRunning") : t("cleanupRun"))
      ),
      h(
        "p",
        { className: "ph-hint" },
        props.last === null ? t("cleanupNever") : t("cleanupLast", { removed: props.last.removed.length, kept: props.last.kept.length })
      ),
      cleanup.enabled ? null : h("p", { className: "ph-hint" }, t("cleanupOff"))
    );
  }

  // src/client/worktree.tsx
  function WorktreeOption(props) {
    const { t, info } = props;
    const current = info?.current ?? null;
    const bases = props.source === "remote" ? info?.bases?.remote ?? [] : info?.bases?.local ?? [];
    const options = bases.map((item) => ({
      value: props.source === "remote" ? item.branch : item.name,
      label: item.name
    }));
    if (props.base.length > 0 && !options.some((option) => option.value === props.base)) {
      options.unshift({ value: props.base, label: props.base });
    }
    return h(
      "span",
      { className: "ph-wrap", "data-personal-hub-worktree": true },
      current === null ? h("button", {
        type: "button",
        className: "ph-button",
        "aria-pressed": props.busy ? "true" : "false",
        title: t("wtHint"),
        disabled: props.busy || options.length === 0,
        onClick: props.onEnable
      }, h(Icon, { name: "folder", size: 11 }), props.busy ? t("wtBusy") : t("wtOption")) : h(
        "span",
        { className: "ph-chip ph-mono", title: String(current.path ?? "") },
        h(Icon, { name: "branch", size: 11 }),
        h("span", { className: "ph-ellipsis" }, String(current.branch ?? "")),
        h("button", {
          type: "button",
          className: "ph-icon-button",
          style: { width: "16px", height: "16px" },
          title: t("wtRemove"),
          "aria-label": t("wtRemove"),
          disabled: props.busy,
          onClick: props.onRemove
        }, h(Icon, { name: "cross", size: 10 }))
      ),
      h("select", {
        className: "ph-select",
        style: { width: "auto", maxWidth: "168px" },
        value: props.base,
        disabled: props.busy || options.length === 0,
        "aria-label": t("wtBase"),
        title: t("wtBase"),
        onChange: (event) => props.onBase(event.target.value)
      }, options.length === 0 ? h("option", { value: "" }, t("wtNoBase")) : options.map((option) => h("option", { key: option.value, value: option.value }, option.label))),
      current === null ? h(
        "div",
        { style: { display: "inline-flex", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: "7px", overflow: "hidden" } },
        ["local", "remote"].map((kind) => h("button", {
          key: kind,
          type: "button",
          className: "ph-filter",
          style: { border: 0, borderRadius: 0 },
          "aria-pressed": props.source === kind ? "true" : "false",
          disabled: props.busy,
          onClick: () => props.onSource(kind)
        }, kind === "remote" ? t("wtRemote") : t("wtLocal")))
      ) : null,
      props.error.length > 0 ? h("span", { className: "ph-error-text" }, props.error) : null,
      current !== null && props.notice.length > 0 ? h("span", { className: "ph-ok ph-tiny" }, props.notice) : null
    );
  }
  function WorktreeHero(props) {
    const { t, api } = props;
    const sessionId = typeof props.sessionId === "string" ? props.sessionId : typeof props.session?.id === "string" ? props.session.id : "";
    const cwd = typeof props.useSessions === "function" ? props.useSessions((snapshot) => snapshot?.byId?.[sessionId]?.cwd ?? "") : "";
    const [info, setInfo] = useState(void 0);
    const [source, setSource] = useState("local");
    const [base, setBase] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    useEffect(() => {
      if (sessionId.length === 0) return void 0;
      let alive = true;
      api.worktreeState({ sessionId, cwd: cwd || void 0, probe: true }).then((value) => {
        if (!alive) return;
        setInfo(value);
        setSource(value?.sourceDefault === "remote" ? "remote" : "local");
        setBase(value?.bases?.defaultBase ?? "");
      }).catch(() => {
        if (alive) setInfo({ enabled: false, supported: false, reason: null, sessionId, current: null, bases: null, project: null });
      });
      return () => {
        alive = false;
      };
    }, [api, sessionId, cwd]);
    const create = useCallback(async (nextBase, nextSource) => {
      setBusy(true);
      setError("");
      setNotice("");
      try {
        if ((info?.current ?? null) !== null) {
          await api.worktreeRemove({ sessionId, deleteBranch: true });
          setInfo((previous) => previous === void 0 ? previous : { ...previous, current: null });
        }
        const answer = await api.worktreeCreate({ sessionId, cwd: cwd || void 0, base: nextBase, source: nextSource });
        setBase(nextBase);
        setSource(nextSource);
        setInfo((previous) => previous === void 0 ? previous : { ...previous, current: answer.worktree });
        setNotice(t("wtCreated", { branch: String(answer.worktree?.branch ?? "") }));
      } catch (failure) {
        setError(`${t("wtFailed")}: ${messageOf(failure)}`);
      } finally {
        setBusy(false);
      }
    }, [api, sessionId, cwd, info, t]);
    const remove = useCallback(async () => {
      setBusy(true);
      setError("");
      setNotice("");
      try {
        await api.worktreeRemove({ sessionId, deleteBranch: false });
        setInfo((previous) => previous === void 0 ? previous : { ...previous, current: null });
        setNotice(t("wtRemoved"));
      } catch (failure) {
        setError(`${t("wtFailed")}: ${messageOf(failure)}`);
      } finally {
        setBusy(false);
      }
    }, [api, sessionId, t]);
    if (sessionId.length === 0 || info === void 0) return null;
    const current = info.current ?? null;
    return h(WorktreeOption, {
      t,
      info,
      source,
      base,
      busy,
      error,
      notice,
      onEnable: () => void create(base, source),
      onRemove: () => void remove(),
      onBase: (value) => {
        setBase(value);
        if (current !== null) void create(value, source);
      },
      onSource: (kind) => {
        const list = kind === "remote" ? info.bases?.remote ?? [] : info.bases?.local ?? [];
        const preferred = info.bases?.defaultBase ?? "";
        const names = list.map((item) => kind === "remote" ? item.branch : item.name);
        const next = names.includes(preferred) ? preferred : names[0] ?? "";
        setSource(kind);
        setBase(next);
        if (current !== null) void create(next, kind);
      }
    });
  }

  // src/client/hooks.ts
  function useLoader(loader, deps) {
    const [state, setState] = useState({ status: "loading", value: void 0, error: void 0 });
    useEffect(() => {
      let alive = true;
      setState((previous) => ({ status: "loading", value: previous.value, error: void 0 }));
      Promise.resolve().then(loader).then((value) => {
        if (alive) setState({ status: "ready", value, error: void 0 });
      }).catch((error) => {
        if (alive) setState({ status: "error", value: void 0, error });
      });
      return () => {
        alive = false;
      };
    }, deps);
    return state;
  }
  function useNowSecond(active) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
      if (!active) return void 0;
      setNow(Date.now());
      const timer = setInterval(() => setNow(Date.now()), 1e3);
      return () => clearInterval(timer);
    }, [active]);
    return now;
  }
  function useDocumentVisible() {
    const [visible, setVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
    useEffect(() => {
      if (typeof document === "undefined") return void 0;
      const onChange = () => setVisible(document.visibilityState === "visible");
      document.addEventListener("visibilitychange", onChange);
      return () => document.removeEventListener("visibilitychange", onChange);
    }, []);
    return visible;
  }
  function relativeTime(value) {
    const time = typeof value === "number" ? value : Date.parse(String(value ?? ""));
    if (!Number.isFinite(time)) return "";
    const seconds = Math.round((time - Date.now()) / 1e3);
    const formatter = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    const units = [
      ["year", 31536e3],
      ["month", 2592e3],
      ["week", 604800],
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60]
    ];
    for (const [unit, size] of units) {
      if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
    }
    return formatter.format(seconds, "second");
  }
  function splitPath(path) {
    const text = String(path ?? "");
    const index = text.lastIndexOf("/");
    return index < 0 ? { dir: "", name: text } : { dir: text.slice(0, index + 1), name: text.slice(index + 1) };
  }
  function formatElapsed(startedAtMs, nowMs) {
    if (startedAtMs === null) return null;
    const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1e3));
    if (elapsedSeconds < 60) return `${elapsedSeconds}s`;
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }
  async function copyText(text) {
    const clipboard = typeof navigator === "undefined" ? void 0 : navigator.clipboard;
    if (clipboard === void 0) return false;
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  // src/client/git/action-logic.ts
  function actionStatusOf(overview) {
    if (overview === void 0) return null;
    const repo = overview.repo;
    return {
      branch: repo.branch,
      hasWorkingTreeChanges: overview.stats.files > 0,
      hasUpstream: repo.hasUpstream,
      ahead: repo.ahead,
      behind: repo.behind,
      aheadOfDefault: repo.aheadOfDefault,
      isDefaultRef: repo.isDefaultRef,
      hasPrimaryRemote: repo.remote !== null,
      prState: overview.branchPull?.state ?? null
    };
  }
  function resolveQuickAction(status, isRunning) {
    if (isRunning) {
      return { labelKey: "gitActionCommit", disabled: true, kind: "show_hint", hintKey: "gitHintBusy" };
    }
    if (status === null) {
      return { labelKey: "gitActionCommit", disabled: true, kind: "show_hint", hintKey: "gitHintNoStatus" };
    }
    if (status.branch === null) {
      return { labelKey: "gitActionCommit", disabled: true, kind: "show_hint", hintKey: "gitHintDetached" };
    }
    const hasChanges = status.hasWorkingTreeChanges;
    const hasOpenPr = status.prState === "open";
    const isAhead = status.ahead > 0;
    const isBehind = status.behind > 0;
    const isDiverged = isAhead && isBehind;
    const hasDefaultDelta = (status.aheadOfDefault || status.ahead) > 0;
    if (hasChanges) {
      if (isBehind || !status.hasUpstream && !status.hasPrimaryRemote) {
        return { labelKey: "gitActionCommit", disabled: false, kind: "run_action", action: "commit" };
      }
      if (hasOpenPr || status.isDefaultRef) {
        return { labelKey: "gitActionCommitPush", disabled: false, kind: "run_action", action: "commit_push" };
      }
      return { labelKey: "gitActionCommitPushPr", disabled: false, kind: "run_action", action: "commit_push_pr" };
    }
    if (!status.hasUpstream) {
      if (!status.hasPrimaryRemote) {
        return { labelKey: "gitActionPublish", disabled: false, kind: "open_publish" };
      }
      if (!isAhead) {
        return hasOpenPr ? { labelKey: "gitActionCommit", disabled: true, kind: "show_hint", hintKey: "gitHintUpToDate" } : { labelKey: "gitActionPush", disabled: true, kind: "show_hint", hintKey: "gitHintNoCommits" };
      }
      if (hasOpenPr || status.isDefaultRef) {
        return {
          labelKey: "gitActionPush",
          disabled: false,
          kind: "run_action",
          action: status.isDefaultRef ? "commit_push" : "push"
        };
      }
      return { labelKey: "gitActionPushPr", disabled: false, kind: "run_action", action: "create_pr" };
    }
    if (isDiverged) {
      return { labelKey: "gitActionSync", disabled: true, kind: "show_hint", hintKey: "gitHintDiverged" };
    }
    if (isBehind) {
      return { labelKey: "gitActionPull", disabled: false, kind: "run_pull" };
    }
    if (isAhead) {
      if (hasOpenPr || status.isDefaultRef) {
        return {
          labelKey: "gitActionPush",
          disabled: false,
          kind: "run_action",
          action: status.isDefaultRef ? "commit_push" : "push"
        };
      }
      return { labelKey: "gitActionPushPr", disabled: false, kind: "run_action", action: "create_pr" };
    }
    if (hasOpenPr) {
      return { labelKey: "gitActionCommit", disabled: true, kind: "show_hint", hintKey: "gitHintUpToDate" };
    }
    if (hasDefaultDelta && !status.isDefaultRef) {
      return { labelKey: "gitActionCreatePr", disabled: false, kind: "run_action", action: "create_pr" };
    }
    return { labelKey: "gitActionCommit", disabled: true, kind: "show_hint", hintKey: "gitHintUpToDate" };
  }
  function buildActionMenuItems(status, isRunning) {
    if (status === null) return [];
    const busy = isRunning;
    const hasBranch = status.branch !== null;
    const hasOpenPr = status.prState === "open";
    const canCommit = !busy && status.hasWorkingTreeChanges;
    const canPush = !busy && hasBranch && status.behind === 0 && status.ahead > 0 && (status.hasUpstream || status.hasPrimaryRemote);
    const canCreatePr = !busy && hasBranch && !hasOpenPr && (status.aheadOfDefault || status.ahead) > 0 && status.behind === 0 && (status.hasUpstream || status.hasPrimaryRemote);
    const commit = {
      id: "commit",
      labelKey: "gitActionCommit",
      disabled: !canCommit,
      disabledHintKey: busy ? "gitHintBusy" : !hasBranch ? "gitHintDetached" : "gitHintClean",
      opensCommitDialog: true
    };
    if (!status.hasPrimaryRemote) return [commit];
    const push = {
      id: "push",
      labelKey: "gitActionPush",
      disabled: !canPush,
      disabledHintKey: busy ? "gitHintBusy" : !hasBranch ? "gitHintNoBranch" : status.behind > 0 ? "gitHintBehind" : !status.hasUpstream && !status.hasPrimaryRemote ? "gitHintNoRemote" : "gitHintNoCommits"
    };
    if (hasOpenPr) return [commit, push];
    const pr = {
      id: "pr",
      labelKey: "gitActionCreatePr",
      disabled: !canCreatePr,
      disabledHintKey: busy ? "gitHintBusy" : !hasBranch ? "gitHintNoBranch" : status.behind > 0 ? "gitHintBehindPr" : (status.aheadOfDefault || status.ahead) === 0 ? "gitHintNoPrCommits" : "gitActionUnavailable"
    };
    return [commit, push, pr];
  }
  function needsDefaultBranchConfirmation(action, isDefaultRef) {
    return isDefaultRef && action !== "commit";
  }
  function actionIncludesCommit(action) {
    return action === "commit" || action === "commit_push" || action === "commit_push_pr";
  }

  // src/client/git/actions.tsx
  function GitActions(props) {
    const { t, quick, progress } = props;
    const now = useNowSecond(props.running);
    if (props.running) {
      const label = progress?.label ?? t("gitStarting");
      const startedAt = progress?.startedAt ?? null;
      const elapsed = formatElapsed(startedAt, now);
      const output = progress?.output ?? [];
      return h(
        "div",
        { className: "ph-progress", role: "status", "aria-live": "polite" },
        h(
          "div",
          { className: "ph-progress-row" },
          h("span", { className: "ph-spinner", "aria-hidden": "true" }),
          h("span", { className: "ph-progress-text" }, label),
          elapsed === null ? null : h("span", { className: "ph-progress-elapsed" }, elapsed)
        ),
        output.length > 0 ? h("p", { className: "ph-progress-output", title: output[output.length - 1] }, output[output.length - 1]) : null
      );
    }
    if (props.success !== null) {
      return h(
        "div",
        { className: "ph-success", role: "status", "aria-live": "polite" },
        h(Icon, { name: "check", size: 14, weight: 2 }),
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", minWidth: 0, flex: "1 1 auto" } },
          h("span", { className: "ph-success-text" }, props.success.title),
          props.success.description.length > 0 ? h("span", { className: "ph-success-desc" }, props.success.description) : null
        ),
        props.success.href === void 0 ? null : h("a", {
          className: "ph-button",
          href: props.success.href,
          target: "_blank",
          rel: "noreferrer noopener",
          style: { textDecoration: "none", flex: "none" }
        }, h(Icon, { name: "external", size: 11 }), props.success.hrefLabel ?? t("gitViewPr"))
      );
    }
    const disabled = quick.disabled;
    return h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "4px", position: "relative" } },
      h(
        "div",
        {
          className: "ph-actions",
          role: "group",
          "aria-label": t("gitActions"),
          "data-running": "false"
        },
        h(
          "button",
          {
            type: "button",
            className: "ph-action-primary",
            disabled,
            title: disabled && quick.hintKey !== void 0 ? t(quick.hintKey) : void 0,
            "aria-disabled": disabled ? "true" : "false",
            onClick: () => {
              if (disabled) {
                if (quick.hintKey !== void 0) props.onHint(quick.hintKey);
                return;
              }
              props.onQuick();
            }
          },
          h(Icon, { name: quickIcon(quick), size: 14 }),
          h("span", { className: "ph-ellipsis" }, t(quick.labelKey))
        ),
        h("button", {
          type: "button",
          className: "ph-action-caret",
          title: t("gitActionOptions"),
          "aria-label": t("gitActionOptions"),
          "aria-expanded": props.menuOpen ? "true" : "false",
          onClick: props.onToggleMenu
        }, h(Icon, { name: "chevronDown", size: 12 }))
      ),
      props.menuOpen ? h(
        "div",
        { className: "ph-menu", role: "menu", "aria-label": t("gitActionOptions") },
        props.menuItems.map((item) => h(
          "button",
          {
            key: item.id,
            type: "button",
            role: "menuitem",
            className: "ph-menu-item",
            disabled: item.disabled,
            title: item.disabled && item.disabledHintKey !== void 0 ? t(item.disabledHintKey) : void 0,
            onClick: () => {
              if (item.disabled) return;
              if (item.id === "commit") props.onRun("commit");
              else if (item.id === "push") props.onRun("push");
              else props.onRun("create_pr");
            }
          },
          h(Icon, { name: item.id === "commit" ? "commit" : item.id === "push" ? "upload" : "merge", size: 13 }),
          h("span", { className: "ph-ellipsis" }, t(item.labelKey))
        )),
        props.menuItems.length === 0 ? h("div", { className: "ph-menu-hint" }, t("gitHintNoStatus")) : null,
        h("div", { className: "ph-menu-sep" }),
        h("button", {
          type: "button",
          role: "menuitem",
          className: "ph-menu-item",
          onClick: props.onOpenPublish
        }, h(Icon, { name: "globe", size: 13 }), h("span", { className: "ph-ellipsis" }, t("gitActionPublish")))
      ) : null,
      disabled && quick.hintKey !== void 0 ? h("p", { className: "ph-action-hint" }, t(quick.hintKey)) : null
    );
  }
  function quickIcon(quick) {
    if (quick.kind === "open_publish") return "globe";
    if (quick.kind === "run_pull") return "download";
    if (quick.kind === "show_hint") return "info";
    if (quick.action === "push") return "upload";
    if (quick.action === "create_pr" || quick.action === "commit_push_pr") return "merge";
    return "commit";
  }
  function DefaultBranchDialog(props) {
    const { t } = props;
    const title = props.action === "push" ? t("gitDefaultPushTitle", { branch: props.branch }) : props.action === "create_pr" ? t("gitDefaultPrTitle", { branch: props.branch }) : t("gitDefaultTitle", { branch: props.branch });
    return h(
      "div",
      { className: "ph-overlay", role: "presentation" },
      h(
        "div",
        { className: "ph-dialog", role: "alertdialog", "aria-modal": "true", "aria-label": title },
        h("div", { className: "ph-dialog-title" }, title),
        h("p", { className: "ph-dialog-body" }, t("gitDefaultBody", { branch: props.branch })),
        props.includesCommit ? null : h("p", { className: "ph-hint" }, t("gitDefaultWarning")),
        h(
          "div",
          { className: "ph-dialog-actions" },
          h("button", { type: "button", className: "ph-button", disabled: props.busy, onClick: props.onAbort }, t("gitDefaultAbort")),
          h("button", { type: "button", className: "ph-button", disabled: props.busy, onClick: props.onFeatureBranch }, t("gitDefaultFeature")),
          h(
            "button",
            { type: "button", className: "ph-primary", disabled: props.busy, onClick: props.onContinue },
            t("gitDefaultContinue", { branch: props.branch })
          )
        )
      )
    );
  }
  function PublishDialog(props) {
    const { t } = props;
    const ready = props.providers.filter((item) => item.ready);
    const [provider, setProvider] = useProvider(ready[0]?.id ?? props.providers[0]?.id ?? "github");
    const [repository, setRepository] = useRepository("");
    const [visibility, setVisibility] = useVisibility("private");
    return h(
      "div",
      { className: "ph-overlay", role: "presentation" },
      h(
        "div",
        { className: "ph-dialog", role: "dialog", "aria-modal": "true", "aria-label": t("gitPublishTitle") },
        h("div", { className: "ph-dialog-title" }, t("gitPublishTitle")),
        h("p", { className: "ph-dialog-body" }, t("gitPublishHint")),
        h(
          "div",
          { className: "ph-field" },
          h("span", { className: "ph-field-label" }, t("gitPublishProvider")),
          props.providers.map((item) => h(
            "label",
            {
              key: item.id,
              className: "ph-radio",
              "data-checked": provider === item.id ? "true" : "false"
            },
            h("input", {
              type: "radio",
              name: "personal-hub-publish-provider",
              checked: provider === item.id,
              disabled: !item.ready || props.busy,
              onChange: () => setProvider(item.id)
            }),
            h(
              "span",
              { className: "ph-radio-text" },
              h("span", { className: "ph-radio-title" }, item.label),
              item.ready ? null : h("span", { className: "ph-radio-hint" }, t("gitActionUnavailable"))
            )
          ))
        ),
        h(
          "label",
          { className: "ph-field" },
          h("span", { className: "ph-field-label" }, t("gitPublishRepository")),
          h("input", {
            className: "ph-input",
            value: repository,
            placeholder: "owner/repository",
            spellcheck: false,
            disabled: props.busy,
            onInput: (event) => setRepository(event.target.value),
            onChange: (event) => setRepository(event.target.value)
          })
        ),
        h(
          "div",
          { className: "ph-field" },
          h("span", { className: "ph-field-label" }, t("gitPublishVisibility")),
          h(
            "label",
            { className: "ph-radio", "data-checked": visibility === "private" ? "true" : "false" },
            h("input", { type: "radio", name: "personal-hub-publish-visibility", checked: visibility === "private", disabled: props.busy, onChange: () => setVisibility("private") }),
            h(
              "span",
              { className: "ph-radio-text" },
              h("span", { className: "ph-radio-title" }, t("gitPublishPrivate")),
              h("span", { className: "ph-radio-hint" }, t("gitPublishPrivateHint"))
            )
          ),
          h(
            "label",
            { className: "ph-radio", "data-checked": visibility === "public" ? "true" : "false" },
            h("input", { type: "radio", name: "personal-hub-publish-visibility", checked: visibility === "public", disabled: props.busy, onChange: () => setVisibility("public") }),
            h(
              "span",
              { className: "ph-radio-text" },
              h("span", { className: "ph-radio-title" }, t("gitPublishPublic")),
              h("span", { className: "ph-radio-hint" }, t("gitPublishPublicHint"))
            )
          )
        ),
        props.error.length > 0 ? h("p", { className: "ph-error-text" }, props.error) : null,
        h(
          "div",
          { className: "ph-dialog-actions" },
          h("button", { type: "button", className: "ph-button", disabled: props.busy, onClick: props.onCancel }, t("gitDefaultAbort")),
          h("button", {
            type: "button",
            className: "ph-primary",
            disabled: props.busy || repository.trim().length === 0,
            onClick: () => props.onPublish(provider, repository.trim(), visibility)
          }, props.busy ? t("gitPublishBusy") : t("gitPublishButton"))
        )
      )
    );
  }
  function useProvider(initial) {
    return useState(initial);
  }
  function useRepository(initial) {
    return useState(initial);
  }
  function useVisibility(initial) {
    return useState(initial);
  }

  // src/client/git/branch-selector.tsx
  function BranchSelector(props) {
    const { t, api } = props;
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const box = useRef(null);
    useEffect(() => {
      if (!open) return void 0;
      const onDown = (event) => {
        if (box.current !== null && event.target instanceof Node && !box.current.contains(event.target)) setOpen(false);
      };
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, [open]);
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const answer = await api.branches({
          sessionId: props.sessionId,
          cwd: props.cwd || void 0,
          limit: 120,
          refresh: true
        });
        setBranches(answer.branches);
      } catch (failure) {
        setError(messageOf(failure));
      } finally {
        setLoading(false);
      }
    };
    const toggle = () => {
      if (props.disabled === true) return;
      const next = !open;
      setOpen(next);
      setQuery("");
      if (next) void load();
    };
    const switchTo = async (name) => {
      setBusy(true);
      setError("");
      try {
        const answer = await api.switchBranch({ sessionId: props.sessionId, cwd: props.cwd || void 0, name });
        setOpen(false);
        props.onChanged(answer.branch);
      } catch (failure) {
        setError(messageOf(failure));
      } finally {
        setBusy(false);
      }
    };
    const createAndSwitch = async (name) => {
      setBusy(true);
      setError("");
      try {
        const answer = await api.createBranch({ sessionId: props.sessionId, cwd: props.cwd || void 0, name });
        setOpen(false);
        props.onChanged(answer.branch);
      } catch (failure) {
        setError(messageOf(failure));
      } finally {
        setBusy(false);
      }
    };
    const text = query.trim().toLowerCase();
    const matches = branches.filter((item) => text.length === 0 || item.name.toLowerCase().includes(text));
    const exact = branches.some((item) => item.name.toLowerCase() === text);
    const label = props.branch ?? t("gitDetachedHead");
    return h(
      "div",
      { style: { position: "relative", minWidth: 0, display: "flex" }, ref: box },
      h(
        "button",
        {
          type: "button",
          className: "ph-branch-button",
          title: t("gitBranchSelect"),
          "aria-label": t("gitBranchSelect"),
          disabled: props.disabled === true,
          onClick: toggle
        },
        h(Icon, { name: "branch", size: 11 }),
        h("span", { className: "ph-ellipsis" }, label),
        h(Icon, { name: "chevronDown", size: 10 })
      ),
      open ? h(
        "div",
        { className: "ph-branch-pop", role: "dialog", "aria-label": t("gitBranchSelect") },
        h(
          "div",
          { className: "ph-pop-search" },
          h(Icon, { name: "search", size: 12 }),
          h("input", {
            className: "ph-pop-input",
            type: "search",
            autoFocus: true,
            placeholder: t("gitBranchSearch"),
            value: query,
            "aria-label": t("gitBranchSearch"),
            onInput: (event) => setQuery(event.target.value),
            onChange: (event) => setQuery(event.target.value),
            onKeyDown: (event) => {
              if (event.key === "Enter" && text.length > 0 && !exact) void createAndSwitch(query.trim());
            }
          })
        ),
        h(
          "div",
          { className: "ph-pop-list" },
          loading ? h("div", { className: "ph-pop-foot" }, t("gitBranchLoading")) : matches.length === 0 && text.length === 0 ? h("div", { className: "ph-pop-foot" }, t("gitBranchNoMatch")) : matches.map((item) => h(
            "button",
            {
              key: `${item.isRemote ? "r" : "l"}:${item.name}`,
              type: "button",
              className: "ph-ref",
              "data-current": item.current ? "true" : "false",
              title: item.subject,
              disabled: busy,
              onClick: () => void switchTo(item.name)
            },
            h(Icon, { name: item.isRemote ? "globe" : "branch", size: 11 }),
            h("span", { className: "ph-ref-name" }, item.name),
            item.isDefault ? h("span", { className: "ph-ref-tag" }, t("gitBranchDefault")) : null,
            item.current ? h("span", { className: "ph-ref-tag" }, t("gitBranchCurrent")) : null,
            item.isRemote ? h("span", { className: "ph-ref-tag" }, t("gitBranchRemote")) : null
          )),
          text.length > 0 && !exact ? h(
            "button",
            {
              type: "button",
              className: "ph-ref",
              disabled: busy,
              onClick: () => void createAndSwitch(query.trim())
            },
            h(Icon, { name: "branchPlus", size: 11 }),
            h("span", { className: "ph-ref-name" }, t("gitBranchCreate", { name: query.trim() }))
          ) : null
        ),
        error.length > 0 ? h("div", { className: "ph-pop-foot" }, h("span", { className: "ph-error-text" }, error)) : null
      ) : null
    );
  }

  // src/client/git/diff-model.ts
  function isWhitespaceOnlyHunk(hunk) {
    const removed = hunk.lines.filter((line) => line.type === "del").map((line) => normalizeWhitespace(line.text));
    const added = hunk.lines.filter((line) => line.type === "add").map((line) => normalizeWhitespace(line.text));
    if (removed.length === 0 && added.length === 0) return false;
    if (removed.length !== added.length) return false;
    return removed.every((line, index) => line === added[index]);
  }
  function normalizeWhitespace(text) {
    return String(text ?? "").replace(/\s+/g, " ").trim();
  }
  function filterWhitespaceChanges(file) {
    if (file.binary) return file;
    const hunks = file.hunks.filter((hunk) => !isWhitespaceOnlyHunk(hunk));
    return hunks.length === file.hunks.length ? file : { ...file, hunks };
  }
  function buildSplitRows(hunk) {
    const rows = [];
    let pending = [];
    const flush = () => {
      for (const line of pending) rows.push({ left: line, right: null, kind: "deletion" });
      pending = [];
    };
    for (const line of hunk.lines) {
      if (line.type === "del") {
        pending.push(line);
        continue;
      }
      if (line.type === "add") {
        const partner = pending.shift();
        if (partner !== void 0) {
          rows.push({ left: partner, right: line, kind: "change" });
          continue;
        }
        rows.push({ left: null, right: line, kind: "addition" });
        continue;
      }
      flush();
      if (line.type === "context") {
        rows.push({ left: line, right: line, kind: "context" });
      } else {
        rows.push({ left: null, right: null, kind: "context" });
      }
    }
    flush();
    return rows;
  }
  function countPatch(file) {
    let additions = 0;
    let deletions = 0;
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === "add") additions += 1;
        else if (line.type === "del") deletions += 1;
      }
    }
    return { additions, deletions };
  }
  function buildStack(bundle, hideWhitespace) {
    if (bundle === void 0) return [];
    const stack = [];
    for (const entry of bundle.files) {
      for (const patch of entry.files.length > 0 ? entry.files : [null]) {
        if (patch === null) {
          stack.push({
            path: entry.path,
            file: null,
            additions: 0,
            deletions: 0,
            binary: entry.binary,
            truncated: entry.truncated,
            tooLarge: entry.tooLarge === true,
            untracked: entry.untracked,
            oldPath: null,
            whitespaceOnly: false
          });
          continue;
        }
        const filtered = hideWhitespace ? filterWhitespaceChanges(patch) : patch;
        const counts = countPatch(patch);
        stack.push({
          path: patch.path ?? entry.path,
          file: filtered,
          additions: counts.additions,
          deletions: counts.deletions,
          binary: patch.binary || entry.binary,
          truncated: entry.truncated || patch.truncated === true,
          tooLarge: entry.tooLarge === true,
          untracked: entry.untracked,
          oldPath: patch.oldPath,
          whitespaceOnly: filtered.hunks.length === 0 && patch.hunks.length > 0
        });
      }
    }
    return stack;
  }
  function stackKey(file) {
    return `${file.oldPath ?? ""}\0${file.path}`;
  }

  // src/client/git/diff-view.tsx
  var MAX_DIFF_LINES = 4e3;
  function fileBadge(file) {
    if (file.untracked) return { letter: "U", tone: "muted" };
    if (file.oldPath !== null && file.oldPath !== file.path) return { letter: "R", tone: "business" };
    if (file.binary) return { letter: "M", tone: "warn" };
    if (file.deletions === 0 && file.additions > 0) return { letter: "A", tone: "success" };
    if (file.additions === 0 && file.deletions > 0) return { letter: "D", tone: "error" };
    return { letter: "M", tone: "warn" };
  }
  function DiffFileSection(props) {
    const { file, t } = props;
    const parts = splitPath(file.path);
    const badge = fileBadge(file);
    const [copied, setCopied] = useState(false);
    const copy = (event) => {
      event.stopPropagation();
      void copyText(file.path).then((ok) => {
        if (!ok) return;
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        props.onCopied(file.path);
      });
    };
    const header = h(
      "div",
      {
        className: "ph-file-head",
        "data-expanded": props.expanded ? "true" : "false",
        onClick: props.onToggle,
        role: "button",
        tabIndex: 0,
        "aria-expanded": props.expanded ? "true" : "false",
        "aria-label": props.expanded ? t("gitCollapseFile", { path: file.path }) : t("gitExpandFile", { path: file.path }),
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            props.onToggle();
          }
        }
      },
      h("input", {
        type: "checkbox",
        className: "ph-file-check",
        checked: props.selected,
        "aria-label": file.path,
        onClick: (event) => event.stopPropagation(),
        onChange: (event) => props.onSelect(event.target.checked)
      }),
      h(
        "span",
        { style: { display: "flex", color: "var(--dsw-alias-label-tertiary)", transform: props.expanded ? "rotate(90deg)" : "none", transition: "transform .12s" } },
        h(Icon, { name: "chevron", size: 11 })
      ),
      h("span", { className: "ph-badge", "data-tone": badge.tone, "aria-hidden": "true" }, badge.letter),
      h(
        "span",
        { className: "ph-file-path", title: file.path },
        parts.dir.length > 0 ? h("span", { className: "ph-file-dir" }, parts.dir) : null,
        h("span", { className: "ph-file-name" }, parts.name)
      ),
      h(Counts, { additions: file.additions, deletions: file.deletions }),
      h("button", {
        type: "button",
        className: "ph-icon-button",
        title: copied ? t("gitCopied") : t("gitCopyPath"),
        "aria-label": t("gitCopyPath"),
        onClick: copy
      }, h(Icon, { name: copied ? "check" : "copy", size: 12 }))
    );
    return h(
      "section",
      { className: "ph-file", "data-path": file.path },
      header,
      props.expanded ? h(
        "div",
        { className: "ph-file-body" },
        h("div", { className: "ph-diff", "data-wrap": props.wrap ? "true" : "false" }, body(props))
      ) : null
    );
  }
  function body(props) {
    const { file, t } = props;
    if (file.binary) return [h("div", { key: "bin", className: "ph-notice" }, t("gitBinary"))];
    if (file.whitespaceOnly) return [h("div", { key: "ws", className: "ph-notice" }, t("gitWhitespaceOnly"))];
    if (file.file === null || file.file.hunks.length === 0) {
      return [h("div", { key: "none", className: "ph-notice" }, t("gitNoText"))];
    }
    const blocks = [];
    let budget = MAX_DIFF_LINES;
    for (const [index, hunk] of file.file.hunks.entries()) {
      if (budget <= 0) break;
      blocks.push(h(HunkBlock, {
        key: `hunk-${index}`,
        hunk,
        layout: props.layout,
        wrap: props.wrap,
        budget: () => budget,
        spend: (count) => {
          budget -= count;
        }
      }));
    }
    if (budget <= 0) blocks.push(h("div", { key: "truncated", className: "ph-notice" }, t("gitTruncated")));
    if (file.truncated) blocks.push(h("div", { key: "cut", className: "ph-notice" }, t("gitTooLarge")));
    return blocks;
  }
  function HunkBlock(props) {
    const { hunk } = props;
    if (props.layout === "split") {
      const rows = buildSplitRows(hunk);
      const visible2 = rows.slice(0, Math.max(0, props.budget()));
      props.spend(visible2.length);
      return h(
        "div",
        { className: "ph-split" },
        visible2.map((row, index) => h(SplitRowView, { key: index, row }))
      );
    }
    const visible = hunk.lines.slice(0, Math.max(0, props.budget()));
    props.spend(visible.length);
    return h(
      "div",
      null,
      h("div", { className: "ph-hunk-head" }, hunk.header),
      visible.map((line, index) => h(UnifiedRow, { key: index, line }))
    );
  }
  function UnifiedRow(props) {
    const { line } = props;
    if (line.type === "meta") return h("div", { className: "ph-line", "data-kind": "meta" }, h("span", { className: "ph-code" }, line.text));
    return h(
      "div",
      { className: "ph-line", "data-kind": line.type },
      h("span", { className: "ph-num" }, line.oldNumber === null ? "" : String(line.oldNumber)),
      h("span", { className: "ph-num" }, line.newNumber === null ? "" : String(line.newNumber)),
      h("span", { className: "ph-sign" }, line.type === "add" ? "+" : line.type === "del" ? "\u2212" : " "),
      h("span", { className: "ph-code" }, line.text.length === 0 ? " " : line.text)
    );
  }
  function SplitRowView(props) {
    const { row } = props;
    return h(
      "div",
      { style: { display: "contents" } },
      h(
        "div",
        { className: "ph-side", "data-kind": row.left?.type ?? "empty", "data-empty": row.left === null ? "true" : "false" },
        h("span", { className: "ph-num" }, row.left?.oldNumber === null || row.left === null ? "" : String(row.left.oldNumber)),
        h("span", { className: "ph-code" }, row.left === null ? "" : row.left.text.length === 0 ? " " : row.left.text)
      ),
      h(
        "div",
        { className: "ph-side", "data-kind": row.right?.type ?? "empty", "data-empty": row.right === null ? "true" : "false" },
        h("span", { className: "ph-num" }, row.right?.newNumber === null || row.right === null ? "" : String(row.right.newNumber)),
        h("span", { className: "ph-code" }, row.right === null ? "" : row.right.text.length === 0 ? " " : row.right.text)
      )
    );
  }
  function StaticPatch(props) {
    const { file, t } = props;
    if (file.binary) return h("div", { className: "ph-notice" }, t("gitBinary"));
    if (file.hunks.length === 0) return h("div", { className: "ph-notice" }, t("gitNoText"));
    let budget = MAX_DIFF_LINES;
    const blocks = file.hunks.map((hunk, index) => h(HunkBlock, {
      key: index,
      hunk,
      layout: "unified",
      wrap: props.wrap === true,
      budget: () => budget,
      spend: (count) => {
        budget -= count;
      }
    }));
    return h("div", { className: "ph-diff", "data-wrap": props.wrap === true ? "true" : "false" }, blocks);
  }
  function Counts(props) {
    const additions = Number(props.additions) || 0;
    const deletions = Number(props.deletions) || 0;
    if (additions === 0 && deletions === 0) return null;
    return h(
      "span",
      { className: "ph-counts" },
      additions > 0 ? h("span", { className: "ph-add" }, `+${additions}`) : null,
      deletions > 0 ? h("span", { className: "ph-del" }, `\u2212${deletions}`) : null
    );
  }
  function DiffControls(props) {
    const { t } = props;
    return h(
      "div",
      { className: "ph-row", style: { gap: "2px" } },
      h("button", {
        type: "button",
        className: "ph-icon-button",
        title: t("gitExpandAll"),
        "aria-label": t("gitExpandAll"),
        onClick: props.onExpandAll
      }, h(Icon, { name: "rows", size: 13 })),
      h("button", {
        type: "button",
        className: "ph-icon-button",
        title: t("gitCollapseAll"),
        "aria-label": t("gitCollapseAll"),
        onClick: props.onCollapseAll
      }, h(Icon, { name: "tree", size: 13 })),
      h("span", { style: { width: "1px", height: "14px", background: "var(--dsw-alias-border-l3)", margin: "0 2px" } }),
      h("button", {
        type: "button",
        className: "ph-icon-button",
        title: t("gitLayoutUnified"),
        "aria-label": t("gitLayoutUnified"),
        "aria-pressed": props.layout === "unified" ? "true" : "false",
        style: props.layout === "unified" ? pressedStyle : void 0,
        onClick: () => props.onLayout("unified")
      }, h(Icon, { name: "rows", size: 13 })),
      h("button", {
        type: "button",
        className: "ph-icon-button",
        title: t("gitLayoutSplit"),
        "aria-label": t("gitLayoutSplit"),
        "aria-pressed": props.layout === "split" ? "true" : "false",
        style: props.layout === "split" ? pressedStyle : void 0,
        onClick: () => props.onLayout("split")
      }, h(Icon, { name: "columns", size: 13 })),
      h("button", {
        type: "button",
        className: "ph-icon-button",
        title: t("gitWrap"),
        "aria-label": t("gitWrap"),
        "aria-pressed": props.wrap ? "true" : "false",
        style: props.wrap ? pressedStyle : void 0,
        onClick: () => props.onWrap(!props.wrap)
      }, h(Icon, { name: "wrap", size: 13 })),
      h("button", {
        type: "button",
        className: "ph-icon-button",
        title: t("gitWhitespace"),
        "aria-label": t("gitWhitespace"),
        "aria-pressed": props.hideWhitespace ? "true" : "false",
        style: props.hideWhitespace ? pressedStyle : void 0,
        onClick: () => props.onWhitespace(!props.hideWhitespace)
      }, h(Icon, { name: "pilcrow", size: 13 }))
    );
  }
  var pressedStyle = {
    background: "var(--dsw-alias-bg-layer-2)",
    color: "var(--dsw-alias-label-primary)"
  };

  // src/client/git/commit-composer.tsx
  function CommitComposer(props) {
    const { t, api, files } = props;
    const [message, setMessage] = useState("");
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [showFiles, setShowFiles] = useState(false);
    const selectedPaths = files.filter((file) => props.selected.has(file.path)).map((file) => file.path);
    const allSelected = files.length > 0 && selectedPaths.length === files.length;
    const generate = async () => {
      setGenerating(true);
      setError("");
      try {
        const draft = await api.draftMessage({
          sessionId: props.sessionId,
          cwd: props.cwd || void 0,
          paths: selectedPaths.length > 0 ? selectedPaths : void 0,
          locale: typeof navigator === "undefined" ? "" : navigator.language
        });
        setMessage(draft.message);
        if (draft.error !== void 0 && draft.source !== "model") {
          props.onToast(t("gitCommitGenerate"), draft.error, "error");
        }
      } catch (failure) {
        setError(messageOf(failure));
      } finally {
        setGenerating(false);
      }
    };
    const commit = (featureBranch) => {
      if (props.busy) return;
      if (selectedPaths.length === 0) {
        setError(t("gitCommitNoFiles"));
        return;
      }
      setError("");
      props.onCommit({ message: message.trim(), paths: selectedPaths, featureBranch });
    };
    return h(
      "div",
      { className: "ph-commit", "data-personal-hub-commit": true },
      h(
        "div",
        { className: "ph-commit-head" },
        h(Icon, { name: "commit", size: 12 }),
        h("span", { style: { fontWeight: 600 } }, t("gitCommitTitle")),
        h("span", { className: "ph-spacer" }),
        h(
          "span",
          { className: "ph-dim ph-tiny" },
          allSelected ? t("gitFilesMany", { count: files.length }) : t("gitCommitSelected", { selected: selectedPaths.length, total: files.length })
        ),
        h("button", {
          type: "button",
          className: "ph-icon-button",
          title: allSelected ? t("gitClearSelection") : t("gitSelectAll"),
          "aria-label": allSelected ? t("gitClearSelection") : t("gitSelectAll"),
          disabled: files.length === 0,
          onClick: () => props.onSelectAll(!allSelected)
        }, h(Icon, { name: allSelected ? "check" : "plus", size: 12 })),
        h("button", {
          type: "button",
          className: "ph-icon-button",
          title: t("gitFilesHeading"),
          "aria-label": t("gitFilesHeading"),
          "aria-expanded": showFiles ? "true" : "false",
          onClick: () => setShowFiles((value) => !value)
        }, h(Icon, { name: "chevronDown", size: 12 }))
      ),
      showFiles ? h("div", { className: "ph-commit-files" }, files.map((file) => h(
        "button",
        {
          key: file.path,
          type: "button",
          className: "ph-commit-file",
          "data-excluded": props.selected.has(file.path) ? "false" : "true",
          title: file.path,
          onClick: () => props.onToggleFile(file.path, !props.selected.has(file.path))
        },
        h("input", {
          type: "checkbox",
          checked: props.selected.has(file.path),
          "aria-label": file.path,
          onClick: (event) => event.stopPropagation(),
          onChange: (event) => props.onToggleFile(file.path, event.target.checked)
        }),
        h("span", { className: "ph-ellipsis", style: { flex: "1 1 auto" } }, file.path),
        props.selected.has(file.path) ? h(
          "span",
          { className: "ph-counts" },
          file.additions > 0 ? h("span", { className: "ph-add" }, `+${file.additions}`) : null,
          file.deletions > 0 ? h("span", { className: "ph-del" }, `\u2212${file.deletions}`) : null
        ) : h("span", { className: "ph-dim ph-tiny" }, t("gitExcluded"))
      ))) : null,
      h(
        "div",
        { className: "ph-field" },
        h(
          "div",
          { className: "ph-row" },
          h("label", { className: "ph-field-label", htmlFor: "personal-hub-commit-message" }, t("gitCommitMessage")),
          h("span", { className: "ph-spacer" }),
          h("button", {
            type: "button",
            className: "ph-button",
            title: t("gitCommitGenerate"),
            disabled: generating || props.busy,
            onClick: () => void generate()
          }, h(Icon, { name: "sparkles", size: 11 }), generating ? t("gitCommitGenerating") : t("gitCommitGenerate"))
        ),
        h("textarea", {
          id: "personal-hub-commit-message",
          className: "ph-textarea",
          value: message,
          placeholder: t("gitCommitPlaceholder"),
          spellcheck: false,
          onInput: (event) => setMessage(event.target.value),
          onChange: (event) => setMessage(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              commit(false);
            }
          }
        })
      ),
      error.length > 0 ? h("p", { className: "ph-error-text" }, error) : null,
      h(
        "div",
        { className: "ph-commit-actions" },
        h("button", {
          type: "button",
          className: "ph-button",
          disabled: props.busy || selectedPaths.length === 0,
          title: t("gitCommitOnNewBranch"),
          onClick: () => commit(true)
        }, h(Icon, { name: "branchPlus", size: 11 }), t("gitCommitOnNewBranch")),
        h("span", { className: "ph-spacer" }),
        h("button", {
          type: "button",
          className: "ph-primary",
          disabled: props.busy || selectedPaths.length === 0,
          onClick: () => commit(false)
        }, h(Icon, { name: "commit", size: 11 }), t("gitCommitButton"))
      ),
      h("p", { className: "ph-hint" }, t("gitCommitHint"))
    );
  }

  // src/client/git/changes.tsx
  var PREFERENCES_KEY = "personal-hub:diff-preferences";
  function readPreferences() {
    const fallback = { layout: "unified", wrap: false, hideWhitespace: false, scope: "working" };
    if (typeof localStorage === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(PREFERENCES_KEY);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      return {
        layout: parsed.layout === "split" ? "split" : "unified",
        wrap: parsed.wrap === true,
        hideWhitespace: parsed.hideWhitespace === true,
        scope: parsed.scope === "branch" ? "branch" : "working"
      };
    } catch {
      return fallback;
    }
  }
  function writePreferences(value) {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(value));
    } catch {
    }
  }
  function ChangesView(props) {
    const { t, api, overview } = props;
    const files = overview.files;
    const initial = useMemo(readPreferences, []);
    const [layout, setLayout] = useState(initial.layout);
    const [wrap, setWrap] = useState(initial.wrap);
    const [hideWhitespace, setHideWhitespace] = useState(initial.hideWhitespace);
    const [scope, setScope] = useState(initial.scope);
    const [expanded, setExpanded] = useState(() => /* @__PURE__ */ new Set());
    const [selection, setSelection] = useState(() => /* @__PURE__ */ new Set());
    const known = useRef(/* @__PURE__ */ new Set());
    const initialized = useRef(false);
    useEffect(() => {
      writePreferences({ layout, wrap, hideWhitespace, scope });
    }, [layout, wrap, hideWhitespace, scope]);
    const signature = files.map((file) => file.path).join("\n");
    useEffect(() => {
      const paths = files.map((file) => file.path);
      setSelection((previous) => {
        const next = /* @__PURE__ */ new Set();
        for (const path of paths) {
          if (!known.current.has(path) || previous.has(path)) next.add(path);
        }
        return next;
      });
      setExpanded((previous) => {
        const next = /* @__PURE__ */ new Set();
        for (const path of paths) {
          if (known.current.has(path) ? previous.has(path) : !initialized.current && paths.length <= 3) next.add(path);
        }
        return next;
      });
      known.current = new Set(paths);
      initialized.current = true;
    }, [signature]);
    const loaded = useLoader(
      () => api.diffAll({
        sessionId: props.sessionId,
        cwd: props.cwd || void 0,
        scope,
        includeUntracked: true
      }),
      [props.sessionId, props.cwd, scope, props.revision]
    );
    const stack = useMemo(
      () => buildStack(loaded.value, hideWhitespace),
      [loaded.value, hideWhitespace]
    );
    const toggleExpanded = (key) => {
      setExpanded((previous) => {
        const next = new Set(previous);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    };
    const toggleSelected = (path, next) => {
      setSelection((previous) => {
        const value = new Set(previous);
        if (next) value.add(path);
        else value.delete(path);
        return value;
      });
    };
    const selectAll = (next) => {
      setSelection(next ? new Set(files.map((file) => file.path)) : /* @__PURE__ */ new Set());
    };
    const expandAll = () => setExpanded(new Set(stack.map((file) => stackKey(file))));
    const collapseAll = () => setExpanded(/* @__PURE__ */ new Set());
    const baseLabel = overview.branchChanges?.baseRef ?? overview.repo.defaultBranch ?? "";
    const toolbar = h(
      "div",
      { className: "ph-stack-toolbar" },
      h(
        "div",
        { style: { display: "flex", borderRadius: "999px", border: "1px solid var(--dsw-alias-border-l1)", overflow: "hidden" } },
        h("button", {
          type: "button",
          className: "ph-filter",
          style: { border: 0, borderRadius: 0 },
          "aria-pressed": scope === "working" ? "true" : "false",
          onClick: () => setScope("working")
        }, t("gitScopeWorking")),
        h("button", {
          type: "button",
          className: "ph-filter",
          style: { border: 0, borderRadius: 0 },
          "aria-pressed": scope === "branch" ? "true" : "false",
          onClick: () => setScope("branch")
        }, t("gitScopeBranch"))
      ),
      baseLabel.length > 0 && scope === "branch" ? h("span", { className: "ph-dim ph-tiny" }, t("gitScopeLabel", { base: baseLabel })) : null,
      h("span", { className: "ph-spacer" }),
      h("button", {
        type: "button",
        className: "ph-icon-button",
        title: t("gitRefresh"),
        "aria-label": t("gitRefresh"),
        "data-busy": loaded.status === "loading" ? "true" : "false",
        onClick: props.onRefresh
      }, h(Icon, { name: "refresh", size: 13 })),
      h(DiffControls, {
        t,
        layout,
        wrap,
        hideWhitespace,
        onLayout: setLayout,
        onWrap: setWrap,
        onWhitespace: setHideWhitespace,
        onExpandAll: expandAll,
        onCollapseAll: collapseAll
      })
    );
    let content;
    if (files.length === 0 && scope === "working") {
      content = h(EmptyChanges, { t });
    } else if (loaded.status === "error" && loaded.value === void 0) {
      content = h(
        "div",
        { className: "ph-error" },
        h("span", { className: "ph-error-title" }, h(Icon, { name: "alert", size: 14 }), t("gitReadError")),
        h("span", null, messageOf(loaded.error)),
        h("button", { type: "button", className: "ph-button", onClick: props.onRefresh }, t("gitRetry"))
      );
    } else if (loaded.value === void 0) {
      content = h("div", { className: "ph-loading" }, h("span", { className: "ph-spinner" }), t("gitLoading"));
    } else if (stack.length === 0) {
      content = h(EmptyChanges, { t });
    } else {
      content = [
        loaded.value.truncated ? h("div", { key: "truncated", className: "ph-notice" }, t("gitDiffTooLarge")) : null,
        ...stack.map((file) => {
          const key = stackKey(file);
          return h(DiffFileSection, {
            key,
            file,
            t,
            layout,
            wrap,
            expanded: expanded.has(key),
            selected: selection.has(file.path),
            onToggle: () => toggleExpanded(key),
            onSelect: (next) => toggleSelected(file.path, next),
            onCopied: (path) => props.onToast(t("gitCopied"), path, "success")
          });
        })
      ];
    }
    return h(
      "div",
      { style: { display: "flex", flexDirection: "column", minHeight: 0, flex: "1 1 auto" } },
      toolbar,
      h("div", { className: "ph-body", style: { flex: "1 1 auto" } }, content),
      h(
        "div",
        { style: { flex: "none" } },
        h(CommitComposer, {
          api,
          t,
          sessionId: props.sessionId,
          cwd: props.cwd,
          files,
          selected: selection,
          busy: props.busy,
          onSelectAll: selectAll,
          onToggleFile: toggleSelected,
          onCommit: props.onCommit,
          onToast: props.onToast
        })
      )
    );
  }
  function EmptyChanges(props) {
    return h(
      "div",
      { className: "ph-empty" },
      h("span", { className: "ph-empty-icon" }, h(Icon, { name: "check", size: 26 })),
      h("span", { className: "ph-empty-title" }, props.t("gitClean")),
      h("span", { className: "ph-empty-hint" }, props.t("gitCleanHint"))
    );
  }
  function ChangesSummary(props) {
    const totals = props.branchChanges !== null && (props.branchChanges.insertions > 0 || props.branchChanges.deletions > 0) ? props.branchChanges : { baseRef: null, insertions: props.stats.additions, deletions: props.stats.deletions };
    const base = totals.baseRef === null ? props.t("gitUncommitted") : props.t("gitScopeLabel", { base: totals.baseRef });
    return h(
      "button",
      {
        type: "button",
        className: "ph-button",
        style: { width: "100%", justifyContent: "flex-start", padding: "5px 8px" },
        onClick: props.onClick
      },
      h(Icon, { name: "fileDiff", size: 12 }),
      h("span", null, props.t("gitChanges")),
      h("span", { className: "ph-dim ph-tiny" }, base),
      h("span", { className: "ph-spacer" }),
      h(Counts, { additions: totals.insertions, deletions: totals.deletions })
    );
  }

  // src/client/git/common.tsx
  function Empty(props) {
    return h(
      "div",
      { className: "ph-empty" },
      h("span", { className: "ph-empty-icon" }, h(Icon, { name: props.icon ?? "git", size: 26 })),
      h("span", { className: "ph-empty-title" }, props.title),
      props.hint === void 0 ? null : h("span", { className: "ph-empty-hint" }, props.hint)
    );
  }
  function Failure(props) {
    const code = codeOf(props.error);
    return h(
      "div",
      { className: "ph-error" },
      h("span", { className: "ph-error-title" }, h(Icon, { name: "alert", size: 14 }), props.title),
      h("span", null, messageOf(props.error)),
      code === void 0 ? null : h("span", { className: "ph-error-code" }, code),
      props.onRetry === void 0 ? null : h(
        "button",
        { type: "button", className: "ph-button", onClick: props.onRetry },
        h(Icon, { name: "refresh", size: 11 }),
        props.retryLabel
      ),
      props.hint === void 0 ? null : h("span", { className: "ph-dim ph-tiny" }, props.hint)
    );
  }
  function Loading(props) {
    return h("div", { className: "ph-loading" }, h("span", { className: "ph-spinner" }), props.label);
  }
  function DetailBar(props) {
    return h(
      "div",
      { className: "ph-toolbar" },
      h("button", {
        type: "button",
        className: "ph-icon-button",
        title: props.t("gitBack"),
        "aria-label": props.t("gitBack"),
        onClick: props.onBack
      }, h(Icon, { name: "back", size: 15 })),
      h(
        "span",
        { className: "ph-file-path", title: props.name },
        props.dir !== void 0 && props.dir.length > 0 ? h("span", { className: "ph-file-dir" }, props.dir) : null,
        h("span", { className: "ph-file-name" }, props.name)
      ),
      h("span", { className: "ph-spacer" }),
      props.children
    );
  }
  function Filters(props) {
    return h(
      "div",
      { className: "ph-filters", role: "group" },
      props.options.map((option) => h("button", {
        key: option.id,
        type: "button",
        className: "ph-filter",
        "aria-pressed": props.value === option.id ? "true" : "false",
        onClick: () => props.onChange(option.id)
      }, option.label))
    );
  }
  function stateLabel(t, state) {
    switch (state) {
      case "open":
        return t("gitStateOpen");
      case "draft":
        return t("gitStateDraft");
      case "merged":
        return t("gitStateMerged");
      case "closed":
        return t("gitStateClosed");
      default:
        return state;
    }
  }
  function reviewLabel(t, review) {
    switch (review) {
      case "approved":
        return t("gitReviewApproved");
      case "changes_requested":
        return t("gitReviewChanges");
      case "review_required":
        return t("gitReviewRequired");
      default:
        return t("gitReviewNone");
    }
  }
  function CheckRow(props) {
    const { check } = props;
    const duration = check.startedAt !== null && check.completedAt !== null ? Math.max(0, Math.round((Date.parse(check.completedAt) - Date.parse(check.startedAt)) / 1e3)) : null;
    const children = [
      h("span", { key: "dot", className: "ph-dot", "data-state": check.state }),
      h("span", { key: "name", className: "ph-check-name", title: check.description.length > 0 ? check.description : check.name }, check.name),
      duration === null ? null : h("span", { key: "time", className: "ph-check-duration" }, duration >= 60 ? `${Math.round(duration / 60)}m` : `${duration}s`)
    ];
    if (check.url === null) return h("div", { className: "ph-check" }, children);
    return h("a", {
      className: "ph-check",
      href: check.url,
      target: "_blank",
      rel: "noreferrer noopener",
      style: { color: "inherit", textDecoration: "none" }
    }, children);
  }
  function ForgeNotice(props) {
    const { t, forge } = props;
    const reason = forge?.reason ?? forge?.note ?? "";
    const cli = forge?.cli ?? (forge?.provider === "gitlab" ? "glab" : forge?.provider === "github" ? "gh" : void 0);
    return h(
      "div",
      { className: "ph-notice" },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "6px", color: "var(--dsw-alias-label-primary)" } },
        h(Icon, { name: "alert", size: 14 }),
        h("span", null, t("gitForgeOff"))
      ),
      h("div", { style: { marginTop: "4px" } }, t("gitForgeHint")),
      reason.length > 0 ? h("div", { style: { marginTop: "4px" } }, reason) : null,
      cli === void 0 ? null : h("div", { className: "ph-error-code" }, `${cli} auth login`)
    );
  }
  function PullMeta(props) {
    const { t, pull } = props;
    return h(
      "span",
      { className: "ph-item-meta" },
      h(
        "span",
        { className: "ph-chip", "data-tone": pull.state === "merged" ? "business" : pull.state === "closed" ? "error" : void 0 },
        h("span", { className: "ph-dot", "data-state": pull.state }),
        stateLabel(t, pull.state)
      ),
      pull.checks.total > 0 ? h(
        "span",
        {
          className: "ph-chip",
          "data-tone": pull.checks.state === "failure" ? "error" : pull.checks.state === "pending" ? "warn" : pull.checks.state === "success" ? "success" : void 0
        },
        h("span", { className: "ph-dot", "data-state": pull.checks.state }),
        pull.checks.failure > 0 ? t("gitChecksFailure", { count: pull.checks.failure }) : pull.checks.pending > 0 ? t("gitChecksPending", { count: pull.checks.pending }) : t("gitChecksSuccess", { count: pull.checks.success })
      ) : null,
      pull.review === "changes_requested" ? h("span", { className: "ph-chip", "data-tone": "error" }, t("gitReviewChanges")) : null,
      pull.review === "approved" ? h("span", { className: "ph-chip", "data-tone": "success" }, t("gitReviewApproved")) : null,
      pull.branch.length > 0 ? h("span", { className: "ph-chip ph-mono", title: pull.branch }, pull.branch) : null,
      pull.author.length > 0 ? h("span", null, t("gitBy", { author: pull.author })) : null,
      h("span", null, relativeTime(pull.updatedAt))
    );
  }

  // src/client/git/commits.tsx
  function CommitsView(props) {
    const { t, api } = props;
    const state = useLoader(
      () => api.commits({ sessionId: props.sessionId, cwd: props.cwd || void 0, limit: 60 }),
      [props.sessionId, props.cwd, props.revision]
    );
    const commits = state.value?.commits ?? [];
    if (state.status === "error" && state.value === void 0) {
      return h(Failure, { error: state.error, title: t("gitReadError"), retryLabel: t("gitRetry") });
    }
    if (state.value === void 0) return h(Loading, { label: t("gitLoading") });
    if (commits.length === 0) {
      return h(Empty, { icon: "commit", title: t("gitCommitListEmpty"), hint: t("gitCommitListEmptyHint") });
    }
    return h("div", null, commits.map((commit) => h(
      "button",
      {
        key: commit.hash,
        type: "button",
        className: "ph-item",
        onClick: () => props.onSelect(commit.hash)
      },
      h(
        "span",
        { className: "ph-item-title" },
        h("span", { className: "ph-item-number" }, commit.short),
        commit.refs.length > 0 ? h("span", { className: "ph-chip", "data-tone": "business", title: commit.refs }, commit.refs.split(",")[0].trim()) : null,
        h("span", { className: "ph-item-text" }, commit.subject)
      ),
      h(
        "span",
        { className: "ph-item-meta" },
        h("span", null, commit.author),
        h("span", null, relativeTime(commit.date))
      )
    )));
  }
  function CommitPane(props) {
    const { t, api } = props;
    const state = useLoader(
      () => api.commit({ sessionId: props.sessionId, cwd: props.cwd || void 0, hash: props.hash }),
      [props.hash, props.revision, props.sessionId, props.cwd]
    );
    const short = props.hash.slice(0, 8);
    if (state.status === "error" && state.value === void 0) {
      return h(
        "div",
        null,
        h(DetailBar, { t, name: short, onBack: props.onBack }),
        h(Failure, { error: state.error, title: t("gitReadError"), retryLabel: t("gitRetry") })
      );
    }
    if (state.value === void 0) {
      return h("div", null, h(DetailBar, { t, name: short, onBack: props.onBack }), h(Loading, { label: t("gitLoading") }));
    }
    const value = state.value;
    const commit = value.commit;
    const additions = value.files.reduce((sum, file) => sum + file.additions, 0);
    const deletions = value.files.reduce((sum, file) => sum + file.deletions, 0);
    return h(
      "div",
      null,
      h(
        DetailBar,
        { t, name: commit.short, onBack: props.onBack },
        h(Counts, { additions, deletions })
      ),
      h(
        "div",
        { className: "ph-detail" },
        h("div", { className: "ph-detail-title" }, commit.subject),
        h(
          "div",
          { className: "ph-detail-meta" },
          h(
            "div",
            { className: "ph-detail-row" },
            h("span", { className: "ph-detail-label" }, t("gitAuthor")),
            h("span", { className: "ph-detail-value" }, commit.author)
          ),
          h(
            "div",
            { className: "ph-detail-row" },
            h("span", { className: "ph-detail-label" }, t("gitDate")),
            h("span", { className: "ph-detail-value" }, relativeTime(commit.date))
          ),
          h(
            "div",
            { className: "ph-detail-row" },
            h("span", { className: "ph-detail-label" }, t("gitHash")),
            h("span", { className: "ph-detail-value ph-mono ph-tiny" }, commit.hash)
          )
        ),
        commit.body.length > 0 ? h("div", { className: "ph-card" }, h("p", { className: "ph-prose" }, commit.body)) : null,
        value.files.length === 0 ? null : h(
          "div",
          { className: "ph-card" },
          h("div", { className: "ph-card-title" }, h(Icon, { name: "folder", size: 12 }), t("gitFilesHeading")),
          value.files.map((file) => h(
            "div",
            { key: file.path, className: "ph-row" },
            h("span", { className: "ph-ellipsis", style: { flex: "1 1 auto" }, title: file.path }, file.path),
            h(Counts, { additions: file.additions, deletions: file.deletions })
          ))
        )
      ),
      value.patches.length === 0 ? null : h(
        "div",
        { style: { display: "flex", flexDirection: "column" } },
        value.patches.map((patch, index) => h(
          "section",
          { key: `${patch.path ?? index}`, className: "ph-file" },
          h(
            "div",
            { className: "ph-file-head", style: { cursor: "default" } },
            h("span", { className: "ph-file-path" }, patch.path ?? ""),
            h(Counts, { additions: patch.additions, deletions: patch.deletions })
          ),
          h(StaticPatch, { file: patch, t })
        ))
      )
    );
  }

  // src/client/git/pulls.tsx
  function PullsView(props) {
    const { t, api } = props;
    const state = useLoader(
      () => api.pulls({
        sessionId: props.sessionId,
        cwd: props.cwd || void 0,
        state: props.filter,
        limit: 30
      }),
      [props.sessionId, props.cwd, props.filter, props.revision]
    );
    if (state.status === "error" && state.value === void 0) {
      return h(Failure, { error: state.error, title: t("gitReadError"), retryLabel: t("gitRetry") });
    }
    const value = state.value;
    if (value === void 0) return h(Loading, { label: t("gitLoading") });
    if (value.available !== true) return h(ForgeNotice, { t, forge: props.forgeState ?? value });
    const pulls = value.pulls ?? [];
    return h(
      "div",
      null,
      h(Filters, {
        value: props.filter,
        onChange: props.onFilter,
        options: [
          { id: "open", label: t("gitFilterOpen") },
          { id: "merged", label: t("gitFilterMerged") },
          { id: "closed", label: t("gitFilterClosed") },
          { id: "all", label: t("gitFilterAll") }
        ]
      }),
      pulls.length === 0 ? h(Empty, { icon: "merge", title: t("gitEmptyPulls"), hint: t("gitEmptyPullsHint") }) : h("div", null, pulls.map((pull) => h(
        "button",
        {
          key: pull.number,
          type: "button",
          className: "ph-item",
          onClick: () => props.onSelect(pull.number)
        },
        h(
          "span",
          { className: "ph-item-title" },
          h("span", { className: "ph-dot", "data-state": pull.state }),
          h("span", { className: "ph-item-number" }, `#${pull.number}`),
          h("span", { className: "ph-item-text" }, pull.title)
        ),
        h(PullMeta, { t, pull })
      )))
    );
  }
  function PullPane(props) {
    const { t, api } = props;
    const state = useLoader(
      () => api.pullRequest({
        sessionId: props.sessionId,
        cwd: props.cwd || void 0,
        number: props.number
      }),
      [props.number, props.revision, props.sessionId, props.cwd]
    );
    if (state.status === "error" && state.value === void 0) {
      return h(
        "div",
        null,
        h(DetailBar, { t, name: `#${props.number}`, onBack: props.onBack }),
        h(Failure, { error: state.error, title: t("gitReadError"), retryLabel: t("gitRetry") })
      );
    }
    if (state.value === void 0) {
      return h("div", null, h(DetailBar, { t, name: `#${props.number}`, onBack: props.onBack }), h(Loading, { label: t("gitLoading") }));
    }
    const value = state.value;
    if (value.available !== true) {
      return h("div", null, h(DetailBar, { t, name: `#${props.number}`, onBack: props.onBack }), h(ForgeNotice, { t, forge: value }));
    }
    const pull = value.pull;
    if (pull === void 0) {
      return h("div", null, h(DetailBar, { t, name: `#${props.number}`, onBack: props.onBack }), h(Empty, { title: t("gitEmptyPulls") }));
    }
    const reviews = (value.reviews ?? []).filter((review) => review.state !== "commented" || review.body.length > 0);
    return h(
      "div",
      null,
      h(
        DetailBar,
        { t, name: `#${pull.number}`, onBack: props.onBack },
        pull.url.length > 0 ? h("a", {
          className: "ph-icon-button",
          href: pull.url,
          target: "_blank",
          rel: "noreferrer noopener",
          title: t("gitOpenOnWeb"),
          "aria-label": t("gitOpenOnWeb")
        }, h(Icon, { name: "external", size: 13 })) : null
      ),
      h(
        "div",
        { className: "ph-detail" },
        h("div", { className: "ph-detail-title" }, pull.title),
        h(
          "div",
          { style: { display: "flex", gap: "4px", flexWrap: "wrap" } },
          h(
            "span",
            { className: "ph-chip", "data-tone": pull.state === "merged" ? "business" : pull.state === "closed" ? "error" : "success" },
            h("span", { className: "ph-dot", "data-state": pull.state }),
            stateLabel(t, pull.state)
          ),
          pull.branch.length > 0 ? h("span", { className: "ph-chip ph-mono" }, t("gitFrom", { branch: pull.branch })) : null,
          pull.base.length > 0 ? h("span", { className: "ph-chip ph-mono" }, `\u2192 ${pull.base}`) : null
        ),
        h(
          "div",
          { className: "ph-detail-meta" },
          h(
            "div",
            { className: "ph-detail-row" },
            h("span", { className: "ph-detail-label" }, t("gitAuthor")),
            h("span", { className: "ph-detail-value" }, pull.author.length > 0 ? pull.author : "\u2014")
          ),
          h(
            "div",
            { className: "ph-detail-row" },
            h("span", { className: "ph-detail-label" }, t("gitUpdated")),
            h("span", { className: "ph-detail-value" }, relativeTime(pull.updatedAt))
          ),
          h(
            "div",
            { className: "ph-detail-row" },
            h("span", { className: "ph-detail-label" }, t("gitReview")),
            h("span", { className: "ph-detail-value" }, reviewLabel(t, pull.review))
          ),
          h(
            "div",
            { className: "ph-detail-row" },
            h("span", { className: "ph-detail-label" }, t("gitMergeable")),
            h(
              "span",
              { className: "ph-detail-value" },
              pull.mergeable === true ? t("gitMergeable") : pull.mergeable === false ? t("gitConflicting") : t("gitMergeUnknown")
            )
          ),
          h(
            "div",
            { className: "ph-detail-row" },
            h("span", { className: "ph-detail-label" }, t("gitFilesHeading")),
            h(
              "span",
              { className: "ph-detail-value" },
              t("gitChangedFiles", { count: pull.changedFiles }),
              h(Counts, { additions: pull.additions, deletions: pull.deletions })
            )
          )
        ),
        h(
          "div",
          { className: "ph-card" },
          h("div", { className: "ph-card-title" }, h(Icon, { name: "check", size: 12 }), t("gitChecks")),
          value.checksUnavailable === true ? h("div", { className: "ph-dim ph-tiny" }, t("gitChecksUnavailable")) : (value.checks ?? []).length === 0 ? h("div", { className: "ph-dim ph-tiny" }, t("gitNoChecks")) : (value.checks ?? []).map((check) => h(CheckRow, { key: check.name, check }))
        ),
        h(
          "div",
          { className: "ph-card" },
          h("div", { className: "ph-card-title" }, h(Icon, { name: "file", size: 12 }), t("gitDescription")),
          (value.body ?? "").length === 0 ? h("div", { className: "ph-dim ph-tiny" }, t("gitNoDescription")) : h("p", { className: "ph-prose" }, value.body)
        ),
        reviews.length === 0 ? null : h(
          "div",
          { className: "ph-card" },
          h("div", { className: "ph-card-title" }, h(Icon, { name: "comment", size: 12 }), t("gitReview")),
          reviews.map((review, index) => h(
            "div",
            { key: `review-${index}`, className: "ph-comment" },
            h(
              "div",
              { className: "ph-comment-head" },
              h("span", { className: "ph-comment-author" }, review.author.length > 0 ? review.author : "\u2014"),
              h("span", null, review.state),
              review.submittedAt === null ? null : h("span", null, relativeTime(review.submittedAt))
            ),
            review.body.length > 0 ? h("p", { className: "ph-prose" }, review.body) : null
          ))
        ),
        (value.files ?? []).length === 0 ? null : h(
          "div",
          { className: "ph-card" },
          h("div", { className: "ph-card-title" }, h(Icon, { name: "folder", size: 12 }), t("gitFilesHeading")),
          (value.files ?? []).map((file) => h(
            "div",
            { key: file.path, className: "ph-row" },
            h("span", { className: "ph-ellipsis", style: { flex: "1 1 auto" }, title: file.path }, file.path),
            h(Counts, { additions: file.additions, deletions: file.deletions })
          ))
        ),
        (value.comments ?? []).length === 0 ? null : h(
          "div",
          { className: "ph-card" },
          h("div", { className: "ph-card-title" }, h(Icon, { name: "comment", size: 12 }), t("gitCommented", { count: (value.comments ?? []).length })),
          (value.comments ?? []).map((comment, index) => h(
            "div",
            { key: `comment-${index}`, className: "ph-comment" },
            h(
              "div",
              { className: "ph-comment-head" },
              h("span", { className: "ph-comment-author" }, comment.author.length > 0 ? comment.author : "\u2014"),
              h("span", null, relativeTime(comment.createdAt))
            ),
            h("p", { className: "ph-prose" }, comment.body)
          ))
        )
      )
    );
  }

  // src/client/git/issues.tsx
  function IssuesView(props) {
    const { t, api } = props;
    const state = useLoader(
      () => api.issues({
        sessionId: props.sessionId,
        cwd: props.cwd || void 0,
        state: props.filter,
        limit: 30
      }),
      [props.sessionId, props.cwd, props.filter, props.revision]
    );
    if (state.status === "error" && state.value === void 0) {
      return h(Failure, { error: state.error, title: t("gitReadError"), retryLabel: t("gitRetry") });
    }
    const value = state.value;
    if (value === void 0) return h(Loading, { label: t("gitLoading") });
    if (value.available !== true) return h(ForgeNotice, { t, forge: props.forgeState ?? value });
    const issues = value.issues ?? [];
    return h(
      "div",
      null,
      h(Filters, {
        value: props.filter,
        onChange: props.onFilter,
        options: [
          { id: "open", label: t("gitFilterOpen") },
          { id: "closed", label: t("gitFilterClosed") },
          { id: "all", label: t("gitFilterAll") }
        ]
      }),
      issues.length === 0 ? h(Empty, { icon: "issue", title: t("gitEmptyIssues"), hint: t("gitEmptyIssuesHint") }) : h("div", null, issues.map((issue) => h(
        "button",
        {
          key: issue.number,
          type: "button",
          className: "ph-item",
          onClick: () => props.onSelect(issue.number)
        },
        h(
          "span",
          { className: "ph-item-title" },
          h(
            "span",
            { className: "ph-glyph", style: { color: issue.state === "open" ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-label-tertiary)" } },
            h(Icon, { name: "issue", size: 12 })
          ),
          h("span", { className: "ph-item-number" }, `#${issue.number}`),
          h("span", { className: "ph-item-text" }, issue.title)
        ),
        h(
          "span",
          { className: "ph-item-meta" },
          issue.labels.map((label) => h("span", { key: label.name, className: "ph-chip" }, label.name)),
          issue.author.length > 0 ? h("span", null, t("gitBy", { author: issue.author })) : null,
          issue.commentCount > 0 ? h("span", null, t("gitCommented", { count: issue.commentCount })) : null,
          h("span", null, relativeTime(issue.updatedAt))
        )
      )))
    );
  }
  function IssuePane(props) {
    const { t, api } = props;
    const state = useLoader(
      () => api.issue({
        sessionId: props.sessionId,
        cwd: props.cwd || void 0,
        number: props.number
      }),
      [props.number, props.revision, props.sessionId, props.cwd]
    );
    if (state.status === "error" && state.value === void 0) {
      return h(
        "div",
        null,
        h(DetailBar, { t, name: `#${props.number}`, onBack: props.onBack }),
        h(Failure, { error: state.error, title: t("gitReadError"), retryLabel: t("gitRetry") })
      );
    }
    if (state.value === void 0) {
      return h("div", null, h(DetailBar, { t, name: `#${props.number}`, onBack: props.onBack }), h(Loading, { label: t("gitLoading") }));
    }
    const value = state.value;
    if (value.available !== true) {
      return h("div", null, h(DetailBar, { t, name: `#${props.number}`, onBack: props.onBack }), h(ForgeNotice, { t, forge: value }));
    }
    const issue = value.issue;
    if (issue === void 0) {
      return h("div", null, h(DetailBar, { t, name: `#${props.number}`, onBack: props.onBack }), h(Empty, { title: t("gitEmptyIssues") }));
    }
    return h(
      "div",
      null,
      h(
        DetailBar,
        { t, name: `#${issue.number}`, onBack: props.onBack },
        issue.url.length > 0 ? h("a", {
          className: "ph-icon-button",
          href: issue.url,
          target: "_blank",
          rel: "noreferrer noopener",
          title: t("gitOpenOnWeb"),
          "aria-label": t("gitOpenOnWeb")
        }, h(Icon, { name: "external", size: 13 })) : null
      ),
      h(
        "div",
        { className: "ph-detail" },
        h("div", { className: "ph-detail-title" }, issue.title),
        h(
          "div",
          { style: { display: "flex", gap: "4px", flexWrap: "wrap" } },
          h(
            "span",
            { className: "ph-chip", "data-tone": issue.state === "open" ? "success" : void 0 },
            issue.state === "open" ? t("gitStateOpen") : t("gitStateClosed")
          ),
          issue.labels.map((label) => h("span", { key: label.name, className: "ph-chip" }, label.name))
        ),
        h(
          "div",
          { className: "ph-detail-meta" },
          h(
            "div",
            { className: "ph-detail-row" },
            h("span", { className: "ph-detail-label" }, t("gitAuthor")),
            h("span", { className: "ph-detail-value" }, issue.author.length > 0 ? issue.author : "\u2014")
          ),
          h(
            "div",
            { className: "ph-detail-row" },
            h("span", { className: "ph-detail-label" }, t("gitUpdated")),
            h("span", { className: "ph-detail-value" }, relativeTime(issue.updatedAt))
          )
        ),
        h(
          "div",
          { className: "ph-card" },
          h("div", { className: "ph-card-title" }, h(Icon, { name: "file", size: 12 }), t("gitDescription")),
          (value.body ?? "").length === 0 ? h("div", { className: "ph-dim ph-tiny" }, t("gitNoDescription")) : h("p", { className: "ph-prose" }, value.body)
        ),
        (value.comments ?? []).length === 0 ? null : h(
          "div",
          { className: "ph-card" },
          h("div", { className: "ph-card-title" }, h(Icon, { name: "comment", size: 12 }), t("gitCommented", { count: (value.comments ?? []).length })),
          (value.comments ?? []).map((comment, index) => h(
            "div",
            { key: `comment-${index}`, className: "ph-comment" },
            h(
              "div",
              { className: "ph-comment-head" },
              h("span", { className: "ph-comment-author" }, comment.author.length > 0 ? comment.author : "\u2014"),
              h("span", null, relativeTime(comment.createdAt))
            ),
            h("p", { className: "ph-prose" }, comment.body)
          ))
        )
      )
    );
  }

  // src/client/git/panel.tsx
  function GitPanel(props) {
    const { t, api } = props;
    const sessionId = typeof props.sessionId === "string" ? props.sessionId : "";
    const tabInfo = typeof props.useTabInfo === "function" ? props.useTabInfo() : void 0;
    const visible = tabInfo?.tab?.visible !== false;
    const documentVisible = useDocumentVisible();
    const cwd = typeof props.useSessions === "function" ? props.useSessions((snapshot) => snapshot?.byId?.[sessionId]?.cwd ?? "") : "";
    const [view, setView] = useState("changes");
    const [selection, setSelection] = useState(null);
    const [pullFilter, setPullFilter] = useState("open");
    const [issueFilter, setIssueFilter] = useState("open");
    const [revision, setRevision] = useState(0);
    const [progress, setProgress] = useState(null);
    const [running, setRunning] = useState(false);
    const [success, setSuccess] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [pending, setPending] = useState(null);
    const [publishOpen, setPublishOpen] = useState(false);
    const [publishBusy, setPublishBusy] = useState(false);
    const [publishError, setPublishError] = useState("");
    const mounted = useRef(true);
    const toastId = useRef(0);
    const successTimer = useRef(void 0);
    useEffect(() => () => {
      mounted.current = false;
      if (successTimer.current !== void 0) clearTimeout(successTimer.current);
    }, []);
    const reload = () => setRevision((value) => value + 1);
    const overviewState = useLoader(
      () => api.overview({ sessionId, cwd: cwd || void 0 }),
      [sessionId, cwd, revision]
    );
    const overview = overviewState.value;
    const status = actionStatusOf(overview);
    useEffect(() => {
      if (!visible || !documentVisible) return void 0;
      const interval = Math.max(8e3, Number(overview?.refreshMs) || 3e4);
      const timer = setInterval(reload, interval);
      return () => clearInterval(timer);
    }, [visible, documentVisible, overview?.refreshMs]);
    const shown = useRef(visible);
    useEffect(() => {
      if (visible && shown.current !== true) reload();
      shown.current = visible;
    }, [visible]);
    useEffect(() => {
      if (typeof document === "undefined") return void 0;
      const onVisible = () => {
        if (document.visibilityState === "visible") reload();
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => document.removeEventListener("visibilitychange", onVisible);
    }, []);
    useEffect(() => {
      if (typeof document === "undefined") return void 0;
      const onKey = (event) => {
        if (event.key !== "Escape") return;
        setMenuOpen(false);
        setPending(null);
        setPublishOpen(false);
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, []);
    const toast = (title, description, tone) => {
      const id = toastId.current += 1;
      setToasts((previous) => [...previous.slice(-2), { id, title, description, tone }]);
      if (tone !== "error") {
        setTimeout(() => {
          if (!mounted.current) return;
          setToasts((previous) => previous.filter((item) => item.id !== id));
        }, 6e3);
      }
    };
    const showSuccess = (next) => {
      if (successTimer.current !== void 0) clearTimeout(successTimer.current);
      setSuccess(next);
      successTimer.current = setTimeout(() => {
        if (mounted.current) setSuccess(null);
      }, 1e4);
    };
    const pollAction = async (actionId) => {
      for (; ; ) {
        let state;
        try {
          state = await api.actionState({ actionId });
        } catch (failure) {
          if (!mounted.current) return;
          setRunning(false);
          toast(t("gitActionFailed"), messageOf(failure), "error");
          return;
        }
        if (!mounted.current) return;
        setProgress(state);
        if (state.status === "running") {
          await sleep(300);
          continue;
        }
        setRunning(false);
        reload();
        if (state.status === "failed") {
          toast(t("gitActionFailed"), state.error?.message ?? t("gitActionFailed"), "error");
          return;
        }
        const result = state.result;
        if (result === null) return;
        const toastInfo = result.toast;
        showSuccess({
          title: toastInfo.title,
          description: toastInfo.description ?? "",
          ...toastInfo.cta.kind === "open_pr" ? { href: toastInfo.cta.url, hrefLabel: toastInfo.cta.label } : {}
        });
        return;
      }
    };
    const startAction = async (action, options, confirmed = false) => {
      if (running) return;
      if (!confirmed && needsDefaultBranchConfirmation(action, status?.isDefaultRef === true)) {
        setPending({ action, options });
        return;
      }
      setMenuOpen(false);
      setPending(null);
      setRunning(true);
      setSuccess(null);
      setProgress({
        actionId: "",
        action,
        status: "running",
        phases: [],
        phase: null,
        label: t("gitStarting"),
        startedAt: Date.now(),
        finishedAt: null,
        output: [],
        result: null,
        error: null
      });
      try {
        const started = await api.startAction({
          sessionId,
          cwd: cwd || void 0,
          action,
          commitMessage: options.commitMessage !== void 0 && options.commitMessage.length > 0 ? options.commitMessage : void 0,
          paths: options.paths !== void 0 && options.paths.length > 0 ? options.paths : void 0,
          featureBranch: options.featureBranch === true,
          base: options.base,
          locale: typeof navigator === "undefined" ? "" : navigator.language
        });
        await pollAction(started.actionId);
      } catch (failure) {
        if (!mounted.current) return;
        setRunning(false);
        toast(t("gitActionFailed"), messageOf(failure), "error");
      }
    };
    const runPull = async () => {
      if (running) return;
      setRunning(true);
      setSuccess(null);
      setProgress({
        actionId: "pull",
        action: "push",
        status: "running",
        phases: ["push"],
        phase: "push",
        label: t("gitPullStatus"),
        startedAt: Date.now(),
        finishedAt: null,
        output: [],
        result: null,
        error: null
      });
      try {
        const result = await api.pull({ sessionId, cwd: cwd || void 0 });
        if (!mounted.current) return;
        setRunning(false);
        reload();
        showSuccess({
          title: result.status === "pulled" ? t("gitPullDone") : t("gitPullUpToDate"),
          description: result.status === "pulled" ? t("gitPullUpdated", { branch: result.branch }) : t("gitPullSynced", { branch: result.branch })
        });
      } catch (failure) {
        if (!mounted.current) return;
        setRunning(false);
        toast(t("gitPullFailed"), messageOf(failure), "error");
      }
    };
    const publish = async (provider, repository, visibility) => {
      setPublishBusy(true);
      setPublishError("");
      try {
        const result = await api.publish({ sessionId, cwd: cwd || void 0, provider, repository, visibility });
        if (!mounted.current) return;
        setPublishOpen(false);
        reload();
        showSuccess({
          title: t("gitPublishDone"),
          description: result.url ?? repository,
          ...result.url === null ? {} : { href: result.url, hrefLabel: t("gitPublishOpen") }
        });
      } catch (failure) {
        if (mounted.current) setPublishError(messageOf(failure));
      } finally {
        if (mounted.current) setPublishBusy(false);
      }
    };
    const quick = resolveQuickAction(status, running);
    const menuItems = buildActionMenuItems(status, running);
    const runQuick = () => {
      if (quick.kind === "run_pull") {
        void runPull();
        return;
      }
      if (quick.kind === "open_publish") {
        setPublishOpen(true);
        return;
      }
      if (quick.kind === "run_action" && quick.action !== void 0) {
        void startAction(quick.action, {});
      }
    };
    const focusComposer = () => {
      setView("changes");
      setSelection(null);
      if (typeof document !== "undefined") {
        setTimeout(() => {
          const field = document.getElementById("personal-hub-commit-message");
          if (field !== null && typeof field.focus === "function") field.focus();
        }, 0);
      }
    };
    const onMenuRun = (action) => {
      if (action === "commit") {
        setMenuOpen(false);
        focusComposer();
        return;
      }
      void startAction(action, {});
    };
    const onCommit = (request) => {
      void startAction("commit", {
        commitMessage: request.message,
        paths: request.paths,
        featureBranch: request.featureBranch
      });
    };
    const header = overview === void 0 ? null : h(PanelHeader, {
      t,
      overview,
      status,
      quick,
      menuItems,
      running,
      progress,
      success,
      menuOpen,
      api,
      sessionId,
      cwd,
      onToggleMenu: () => setMenuOpen((value) => !value),
      onQuick: runQuick,
      onRun: onMenuRun,
      onOpenPublish: () => {
        setMenuOpen(false);
        setPublishOpen(true);
      },
      onPull: () => void runPull(),
      onHint: (key) => toast(t("gitActions"), t(key), "info"),
      onRefresh: reload,
      onOpenPull: (number) => {
        setView("pulls");
        setSelection({ type: "pull", number });
      },
      onBranchChanged: (branch) => {
        reload();
        toast(t("gitBranchSelect"), branch ?? t("gitDetachedHead"), "success");
      },
      onOpenChanges: () => {
        setView("changes");
        setSelection(null);
      }
    });
    let body2;
    if (overviewState.status === "error" && overview === void 0) {
      const error = overviewState.error;
      const code = errorCode(error);
      body2 = h(Failure, {
        error,
        title: code === "git/no-directory" ? t("gitNoDirectory") : code === "git/not-a-repository" ? t("gitNoRepo") : t("gitReadError"),
        hint: code === "git/not-a-repository" ? t("gitNoRepoHint") : code === "connection/failed" ? t("gitBridgeHint") : void 0,
        retryLabel: t("gitRetry"),
        onRetry: reload
      });
    } else if (overview === void 0) {
      body2 = h(Loading, { label: t("gitLoadingLong") });
    } else if (selection !== null && view === "commits" && selection.type === "commit") {
      body2 = h(CommitPane, {
        api,
        t,
        sessionId,
        cwd,
        revision,
        hash: selection.hash,
        onBack: () => setSelection(null)
      });
    } else if (selection !== null && view === "pulls" && selection.type === "pull") {
      body2 = h(PullPane, {
        api,
        t,
        sessionId,
        cwd,
        revision,
        number: selection.number,
        onBack: () => setSelection(null)
      });
    } else if (selection !== null && view === "issues" && selection.type === "issue") {
      body2 = h(IssuePane, {
        api,
        t,
        sessionId,
        cwd,
        revision,
        number: selection.number,
        onBack: () => setSelection(null)
      });
    } else if (view === "pulls") {
      body2 = h(PullsView, {
        api,
        t,
        sessionId,
        cwd,
        revision,
        filter: pullFilter,
        forgeState: overview.forge,
        onFilter: setPullFilter,
        onSelect: (number) => setSelection({ type: "pull", number })
      });
    } else if (view === "issues") {
      body2 = h(IssuesView, {
        api,
        t,
        sessionId,
        cwd,
        revision,
        filter: issueFilter,
        forgeState: overview.forge,
        onFilter: setIssueFilter,
        onSelect: (number) => setSelection({ type: "issue", number })
      });
    } else if (view === "commits") {
      body2 = h(CommitsView, {
        api,
        t,
        sessionId,
        cwd,
        revision,
        onSelect: (hash) => setSelection({ type: "commit", hash })
      });
    } else {
      body2 = h(ChangesView, {
        api,
        t,
        sessionId,
        cwd,
        overview,
        revision,
        busy: running,
        onCommit,
        onToast: toast,
        onRefresh: reload
      });
    }
    const isDetail = selection !== null;
    return h(
      "div",
      { className: "ph-git", "data-personal-hub-git": true, style: { position: "relative" } },
      header,
      h(PanelTabs, {
        t,
        value: view,
        counts: {
          changes: overview?.stats.files ?? 0,
          pulls: 0,
          issues: 0,
          commits: 0
        },
        onChange: (next) => {
          setView(next);
          setSelection(null);
        }
      }),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", minHeight: 0, flex: "1 1 auto", overflow: isDetail || view === "changes" ? "hidden" : "auto" } },
        body2
      ),
      pending === null ? null : h(DefaultBranchDialog, {
        t,
        branch: overview?.repo.branch ?? "",
        action: pending.action,
        includesCommit: actionIncludesCommit(pending.action),
        busy: running,
        onAbort: () => setPending(null),
        onContinue: () => {
          const next = pending;
          setPending(null);
          void startAction(next.action, next.options, true);
        },
        onFeatureBranch: () => {
          const next = pending;
          setPending(null);
          void startAction(next.action, { ...next.options, featureBranch: true }, true);
        }
      }),
      publishOpen ? h(PublishDialog, {
        t,
        busy: publishBusy,
        error: publishError,
        providers: publishProviders(overview?.forge),
        onCancel: () => setPublishOpen(false),
        onPublish: (provider, repository, visibility) => void publish(provider, repository, visibility)
      }) : null,
      toasts.length === 0 ? null : h("div", { className: "ph-toasts" }, toasts.map((item) => h(
        "div",
        {
          key: item.id,
          className: "ph-toast",
          "data-tone": item.tone === "info" ? "success" : item.tone,
          role: item.tone === "error" ? "alert" : "status"
        },
        h(Icon, { name: item.tone === "error" ? "alert" : item.tone === "success" ? "check" : "info", size: 13 }),
        h(
          "div",
          { className: "ph-toast-text" },
          h("div", { className: "ph-toast-title" }, item.title),
          item.description.length > 0 ? h("div", { className: "ph-toast-desc" }, item.description) : null
        ),
        h("button", {
          type: "button",
          className: "ph-icon-button",
          "aria-label": t("gitDefaultAbort"),
          onClick: () => setToasts((previous) => previous.filter((toastItem) => toastItem.id !== item.id))
        }, h(Icon, { name: "cross", size: 11 }))
      )))
    );
  }
  function PanelHeader(props) {
    const { t, overview } = props;
    const repo = overview.repo;
    const pull = overview.branchPull;
    return h(
      "div",
      { className: "ph-head" },
      h(
        "div",
        { className: "ph-repo-row" },
        h("span", { style: { display: "flex", color: "var(--dsw-alias-label-tertiary)" } }, h(Icon, { name: "git", size: 14 })),
        h("span", { className: "ph-repo", title: repo.root }, repo.name),
        h("span", { className: "ph-spacer" }),
        h("button", {
          type: "button",
          className: "ph-icon-button",
          title: t("gitRefresh"),
          "aria-label": t("gitRefresh"),
          onClick: props.onRefresh
        }, h(Icon, { name: "refresh", size: 13 }))
      ),
      h(
        "div",
        { className: "ph-branch-row" },
        h(BranchSelector, {
          api: props.api,
          t,
          sessionId: props.sessionId,
          cwd: props.cwd,
          branch: repo.branch,
          defaultBranch: repo.defaultBranch,
          disabled: props.running,
          onChanged: props.onBranchChanged
        }),
        repo.ahead > 0 ? h("span", { className: "ph-pill", title: t("gitAhead", { count: repo.ahead }) }, `\u2191${repo.ahead}`) : null,
        repo.behind > 0 ? h("span", { className: "ph-pill", "data-tone": "warn", title: t("gitBehind", { count: repo.behind }) }, `\u2193${repo.behind}`) : null,
        pull === null ? null : h(
          "button",
          {
            type: "button",
            className: "ph-chip",
            "data-tone": pull.state === "merged" ? "business" : pull.state === "closed" ? "error" : "success",
            title: pull.title,
            onClick: () => props.onOpenPull(pull.number)
          },
          h("span", { className: "ph-dot", "data-state": pull.state }),
          `#${pull.number}`,
          stateLabel(t, pull.state)
        ),
        repo.remote?.slug !== null && repo.remote?.slug !== void 0 ? h("span", { className: "ph-dim ph-tiny ph-ellipsis", title: repo.remote.slug }, repo.remote.slug) : null
      ),
      h(GitActions, {
        t,
        quick: props.quick,
        menuItems: props.menuItems,
        running: props.running,
        progress: props.progress,
        success: props.success,
        menuOpen: props.menuOpen,
        onToggleMenu: props.onToggleMenu,
        onQuick: props.onQuick,
        onRun: props.onRun,
        onOpenPublish: props.onOpenPublish,
        onPull: props.onPull,
        onHint: props.onHint
      }),
      h(ChangesSummary, {
        t,
        stats: overview.stats,
        branchChanges: overview.branchChanges,
        onClick: props.onOpenChanges
      })
    );
  }
  function PanelTabs(props) {
    const items = [
      { id: "changes", label: props.t("gitChanges"), count: props.counts.changes },
      { id: "pulls", label: props.t("gitPulls"), count: props.counts.pulls },
      { id: "issues", label: props.t("gitIssues"), count: props.counts.issues },
      { id: "commits", label: props.t("gitCommits"), count: props.counts.commits }
    ];
    return h(
      "div",
      { className: "ph-tabs", role: "tablist" },
      items.map((item) => h(
        "button",
        {
          key: item.id,
          type: "button",
          role: "tab",
          className: "ph-tab",
          "aria-selected": props.value === item.id ? "true" : "false",
          onClick: () => props.onChange(item.id)
        },
        h("span", null, item.label),
        item.count > 0 ? h("span", { className: "ph-tab-count" }, String(item.count)) : null
      ))
    );
  }
  function publishProviders(forge) {
    const provider = forge?.provider ?? "";
    return [
      { id: "github", label: "GitHub", ready: provider === "github" && forge?.available === true },
      { id: "gitlab", label: "GitLab", ready: provider === "gitlab" && forge?.available === true }
    ];
  }
  function errorCode(error) {
    if (error !== null && typeof error === "object" && "code" in error) {
      const code = error.code;
      return typeof code === "string" ? code : void 0;
    }
    return void 0;
  }
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function GitHeaderButton(props) {
    return h("button", {
      type: "button",
      className: "ph-icon-button",
      title: props.t("gitOpen"),
      "aria-label": props.t("gitOpen"),
      onClick: () => props.open?.(),
      style: { width: "28px", height: "28px" }
    }, h(Icon, { name: "git", size: 15 }));
  }

  // src/client/client.ts
  var ROW_KEY = "@local/personal-hub#personal-hub";
  var GIT_ID = "@local/personal-hub/git";
  var GIT_KIND = "personal-hub-git";
  function createClient() {
    return {
      name: "personal-hub-client",
      inject: ["slots", "locale", "remote", "remote.credentials"],
      /** Rendering helpers the Node test harness exercises with a stand-in React. */
      __internal: {
        TelegramCard,
        MergeSettingsCard,
        WorktreeHero,
        WorktreeOption,
        GitPanel,
        GitHeaderButton,
        GitActions,
        DiffFileSection,
        CommitComposer,
        MergeSettingsForm,
        installStyles
      },
      apply(ctx) {
        const t = ctx.locale.bind(NS);
        ctx.effect(() => ctx.locale.register(NS, dictionaries), "personal-hub: dictionaries");
        const controller = createController(ctx, t);
        ctx.effect(() => {
          void controller.refresh();
          const off = ctx.remote.$on("credentials/reference-updated", (ref) => {
            if (ref === "DSH_TELEGRAM_BOT_TOKEN") void controller.refresh();
          });
          return () => {
            off();
            controller.dispose();
          };
        }, "personal-hub: credential watch");
        const api = createGitApi(createGitCaller());
        ctx.effect(() => installStyles(), "personal-hub: styles");
        ctx.effect(
          () => ctx.slots.inject("plugins.row.config", () => registerSlot(ctx, {
            name: "plugins.row.config",
            id: "personal-hub",
            key: ROW_KEY,
            order: 10,
            label: () => t("cardTitle"),
            locale: NS,
            inject: () => ({
              t,
              subscribe: controller.subscribe,
              getState: controller.getState,
              save: controller.save,
              clear: controller.clear,
              api
            })
          }, PersonalHubCard)),
          "personal-hub: row config card"
        );
        ctx.effect(
          () => ctx.slots.inject("conversation.hero.options", () => registerSlot(ctx, {
            name: "conversation.hero.options",
            id: "personal-hub-worktree",
            order: 20,
            label: () => t("wtOption"),
            locale: NS,
            inject: () => ({ api, t })
          }, WorktreeHero)),
          "personal-hub: worktree option"
        );
        if (typeof ctx.inject !== "function") return;
        ctx.inject(["sidebarRightTabs", "sidebarRight"], (scoped) => {
          const gitCtx = scoped;
          const tabs = gitCtx.get("sidebarRightTabs");
          if (tabs === void 0) return;
          gitCtx.effect(() => tabs.register({
            id: GIT_ID,
            kind: GIT_KIND,
            priority: "extension",
            keepMounted: true,
            title: () => t("gitTab"),
            guide: [{
              id: "git",
              order: 20,
              icon: (props) => h(Icon, { name: "git", size: props.size ?? 22, className: props.className }),
              title: () => t("gitGuide"),
              description: () => t("gitGuideHint")
            }]
          }), "personal-hub: git tab type");
          gitCtx.effect(() => gitCtx.slots.inject("sidebar.right.pane.tab", () => registerSlot(gitCtx, {
            name: "sidebar.right.pane.tab",
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
              newChat: async (path) => {
                const remoteSession = ctx.remote?.session;
                if (typeof remoteSession?.create !== "function") {
                  throw new Error("This build exposes no session creator");
                }
                const response = await remoteSession.create({ cwd: path });
                if (response === null || typeof response !== "object" || response.ok !== true) {
                  throw new Error(response?.error?.message ?? "The Host could not create a chat");
                }
                return response.value;
              }
            })
          }, GitPanel)), "personal-hub: git tab body");
          gitCtx.effect(() => gitCtx.slots.inject("conversation.session.header.utilities", () => registerSlot(gitCtx, {
            name: "conversation.session.header.utilities",
            id: "personal-hub-git",
            order: 40,
            label: () => t("gitOpen"),
            locale: NS,
            inject: () => ({
              t,
              open: () => {
                try {
                  const sidebar = gitCtx.get("sidebarRight");
                  sidebar?.openTab(GIT_KIND);
                } catch (error) {
                  console.warn("[personal-hub] cannot open the Git tab:", messageOf(error));
                }
              }
            })
          }, GitHeaderButton)), "personal-hub: git header button");
        });
      }
    };
  }
  function PersonalHubCard(props) {
    const t = props.t;
    if (props.view === "summary") {
      return h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: "4px" } },
        h("span", null, t("summary")),
        h("span", { className: "ph-hint" }, t("gitSettingsSummary"))
      );
    }
    return h(
      "div",
      { "data-personal-hub-card": true, style: { display: "flex", flexDirection: "column", gap: "16px" } },
      h(TelegramCard, props),
      h("div", { style: { borderTop: "1px solid var(--dsw-alias-border-l3)" } }),
      h(MergeSettingsCard, { api: props.api, t })
    );
  }
  function registerSlot(ctx, options, component) {
    try {
      return ctx.slots.register(options, component);
    } catch (error) {
      console.warn(
        `[personal-hub] cannot register ${String(options.name)}${options.id === void 0 ? "" : `#${String(options.id)}`}:`,
        messageOf(error)
      );
      return () => {
      };
    }
  }
  function installStyles() {
    if (typeof document === "undefined") return () => {
    };
    const installed2 = document.querySelector("style[data-personal-hub=git]");
    if (installed2 !== null) return () => {
    };
    const style = document.createElement("style");
    style.dataset.personalHub = "git";
    style.textContent = GIT_CSS;
    document.head.append(style);
    return () => style.remove();
  }

  // src/client/entry.ts
  window.__ModuleLoader__.load({
    id: "@local/personal-hub",
    factory(require2) {
      installReact(require2);
      return createClient();
    }
  });
})();
