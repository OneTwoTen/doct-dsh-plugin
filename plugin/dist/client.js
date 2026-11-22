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
  function currentLocale(t) {
    const marker = t("gitActions");
    if (marker === en.gitActions) return "en";
    if (marker === vi.gitActions) return "vi";
    const language = typeof navigator === "undefined" ? "" : String(navigator.language ?? "");
    return language.length > 0 ? language : "en";
  }
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
    gitWorktrees: "Worktrees",
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
    gitPrConfirmHint: "The model drafts the title and description; the branch is pushed only when you create the request.",
    gitPrCreate: "Create",
    gitPrCancel: "Cancel",
    gitPrBusy: "Drafting the pull request\u2026",
    gitPrCreated: "Pull request #{number} created",
    gitPrOpen: "Open on the web",
    gitPrFailed: "Could not create the pull request",
    gitPrBase: "Base branch",
    gitPrNoForge: "Pull requests need a signed-in code host CLI",
    gitPrNoBranch: "This checkout has no named branch",
    gitPrTitleLabel: "Title",
    gitPrBodyLabel: "Description",
    gitPrTitlePlaceholder: "Write the title, or let the model draft one",
    gitPrBodyPlaceholder: "Describe what changed and how it was tested, or let the model draft it",
    gitPrDrafting: "Drafting the pull request\u2026",
    gitPrRegenerate: "Draft again",
    gitPrDraftModel: "Drafted by {model}",
    gitPrDraftFallback: "Drafted from the commits",
    gitPrDraftFallbackReason: "Drafted from the commits ({reason})",
    gitPrNoCommitsHint: "The branch has no commit over its base yet.",
    gitPrDefaultBranchHint: "This checkout is on {branch}; create a feature branch before opening a pull request.",
    gitPrCreating: "Creating pull request\u2026",
    /* Merging a change request */
    gitMerge: "Merge",
    gitMergeSquash: "Squash & merge",
    gitMergeRebase: "Rebase & merge",
    gitMergeTitle: "Merge pull request #{number}",
    gitMergeBody: "Merge {branch} into {base}?",
    gitMergeHint: "The code host still applies its checks, reviews, and branch protection rules.",
    gitMergeDeleteBranch: "Delete the source branch after merging",
    gitMergeCancel: "Cancel",
    gitMergeConfirm: "Merge",
    gitMergeBusy: "Merging\u2026",
    gitMergeDone: "Merged #{number}",
    gitMergeQueued: "Merge requested for #{number}",
    gitMergeFailed: "Could not merge the pull request",
    gitMergeBlocked: "The code host did not accept the merge",
    gitMergeUnsupported: "This code host does not support that merge method",
    gitMergeDeletedBranch: "The source branch was deleted.",
    gitMergeDeleteFailed: "The merge succeeded, but the source branch could not be deleted.",
    /* Staging one file */
    gitStage: "Stage",
    gitUnstage: "Unstage",
    gitDiscard: "Discard",
    gitDiscardBusy: "Discarding\u2026",
    gitDiscardConfirm: "Discard changes in {path}?",
    gitDiscardUntracked: "Delete the untracked file {path}?",
    gitFileActions: "File actions",
    gitStageDone: "Staged {path}",
    gitUnstageDone: "Unstaged {path}",
    gitDiscardDone: "Discarded {path}",
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
    wtAuto: "Worktree",
    wtAutoHint: "When you send the first message, this chat gets its own checkout of the repository, so the project folder stays untouched.",
    wtNextMessage: "The next message starts in a new worktree from {branch}",
    wtOff: "This chat stays in the project folder",
    wtDefaultBranch: "the default branch",
    wtLinkedProject: "This project is itself a linked worktree, so no second checkout is offered.",
    wtCreatingBranch: "Creating {branch}\u2026",
    wtDockLabel: "Worktree status",
    wtDockCreating: "Creating worktree {branch}",
    wtDockHint: "From the latest {base}; the message starts once the checkout is ready.",
    wtDockCreated: "Worktree ready: {branch}",
    wtDockCreatedHint: "This chat now works in its own checkout.",
    wtDockFailed: "Could not create the worktree",
    wtDockFailedHint: "The message continues in the project folder. Retry creates {base} for the next message.",
    wtDockRetry: "Retry",
    wtDockContinue: "Continue here",
    wtDockDismiss: "Dismiss",
    gitSettingsTitle: "Worktrees and merged pull requests",
    gitSettingsSummary: "Clean up after a chat\u2019s pull request merges",
    gitSettingsMerged: "When the pull request of a chat is merged",
    gitCodeHost: "Code host",
    gitCodeHostProvider: "Provider",
    gitCodeHostAuto: "Detect from the remote",
    gitCodeHostNone: "Off (no pull requests or issues)",
    gitCodeHostGitlabHosts: "Self-hosted GitLab hosts",
    gitCodeHostHint: "Comma-separated hostnames or base URLs, for example gitlab.example.com. gitlab.com is detected automatically. Set GITLAB_TOKEN or the DSH_GITLAB_TOKEN credential to read without glab.",
    gitCodeHostCli: "CLI path (optional)",
    gitSettingsRemove: "Delete the worktree",
    gitSettingsDeleteBranch: "Delete its branch too",
    gitSettingsArchive: "Hide the chat from the list (stops its running work)",
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
    gitHintOpenPr: "This branch already has an open pull request.",
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
    gitActionUnavailable: "Action unavailable",
    /* Worktree manager */
    wtManagerTitle: "Worktrees",
    wtManagerHint: "Each checkout has its own branch and folder; the main checkout stays untouched.",
    wtNew: "New worktree",
    wtCreateTitle: "Create worktree",
    wtCreateHint: "The checkout starts from the branch you pick and gets a new branch of its own.",
    wtName: "Branch name",
    wtNamePlaceholder: "leave empty for a generated name",
    wtSwitchHere: "Work here",
    wtSwitchThisChat: "Switch this chat here",
    wtOpenChat: "Open chat",
    wtRemoveAction: "Remove",
    wtRemoveConfirm: "Remove {branch}?",
    wtRemoveHint: "Git keeps a checkout with uncommitted work unless you force the removal.",
    wtForce: "Remove anyway",
    wtDeleteBranch: "Delete the branch too",
    wtCancel: "Cancel",
    wtCreate: "Create",
    wtCreating: "Creating\u2026",
    wtCurrent: "current",
    wtMain: "main",
    wtPool: "worktree",
    wtDetached: "detached",
    wtLocked: "locked",
    wtPrunable: "missing",
    wtDirty: "{count} changed",
    wtClean: "clean",
    wtCreatedNotice: "Created {branch}",
    wtCreatedSwitched: "Created {branch}; this chat moved into it",
    wtSwitched: "This chat now works in {branch}",
    wtRemovedNotice: "Removed {branch}",
    wtPruned: "Removed {count} stale registrations",
    wtPrunedNone: "No stale worktree registrations",
    wtPrune: "Prune",
    wtPruneHint: "Forget registrations whose folder disappeared",
    wtError: "Worktree action failed",
    wtLoadError: "Could not read the worktrees",
    wtEmpty: "No worktrees yet",
    wtEmptyHint: "Create one to work on a branch without touching the main checkout.",
    wtMainHint: "The project folder every worktree shares.",
    wtThisChat: "this chat",
    wtOtherChat: "chat {id}",
    wtCreatedAt: "created {when}",
    wtNoSession: "Open a chat to move it into a worktree.",
    wtLoadBases: "Loading branches\u2026",
    wtAddFailed: "Could not create the worktree",
    webRemoteTitle: "Web Remote",
    webRemoteSummary: "Control this DSH from your phone through a relay; no port is opened on this machine.",
    webRemoteIntro: "The plugin connects out to your relay, pairs once, then serves chats, prompts, approvals, and questions to the web client.",
    webRemoteLoading: "Reading the Web Remote state\u2026",
    webRemoteUnavailable: "The Host half of this plugin is not reachable, so the Web Remote state is unavailable. Restart Harness after installing or updating the plugin.",
    webRemoteStale: "The last status update failed; this snapshot may be a few seconds old.",
    webRemoteRelayLabel: "Relay URL",
    webRemoteRelayPlaceholder: "https://chat.example.com",
    webRemoteRelayHint: "Changing the relay removes the stored credential, so this device pairs again.",
    webRemoteRelayInvalid: "The relay URL must start with http://, https://, ws://, or wss://.",
    webRemoteDeviceLabel: "Device name",
    webRemoteDevicePlaceholder: "Name shown on the approval screen",
    webRemoteAutoPair: "Start pairing automatically when no credential is stored",
    webRemoteEnabled: "Turn Web Remote on",
    webRemoteDisabledHint: "Web Remote is off in this profile. Turn it on and save to let the plugin connect out to your relay.",
    webRemoteSettingsTitle: "Relay settings",
    webRemoteSave: "Save",
    webRemoteSaving: "Saving\u2026",
    webRemoteSaved: "Saved. Harness reloads this plugin row, so the change applies in a moment.",
    webRemoteReadOnly: "This deployment does not allow configuration edits.",
    webRemoteRefresh: "Refresh status",
    webRemotePairedBadge: "paired",
    webRemoteDevice: "Device",
    webRemoteFingerprint: "Key fingerprint",
    webRemoteConnection: "Connection",
    webRemoteConnectedAt: "connected {when}",
    webRemotePaired: "Pairing",
    webRemotePairedAt: "paired {when}",
    webRemoteWatching: "Web clients",
    webRemoteWatchingCount: "{count} session(s) followed",
    webRemoteWatchingNone: "none following",
    webRemoteLastError: "Last error",
    webRemoteOpenWebChat: "Open the WebChat",
    webRemoteNoRelayHint: "Set the relay URL and save to pair this machine.",
    webRemotePairTitle: "Pair this device",
    webRemotePairStep: "Open the approval page on another device, enter this code, then approve:",
    webRemotePairOpen: "Open the approval page",
    webRemotePairCopy: "Copy code",
    webRemotePairCopied: "Copied",
    webRemotePairExpires: "The code expires in {time}.",
    webRemotePairExpired: "The code expired. Start pairing again.",
    webRemotePairCancel: "Cancel pairing",
    webRemotePairCancelled: "Pairing was cancelled.",
    webRemotePairNow: "Pair now",
    webRemotePairAgain: "Pair again",
    webRemoteUnpair: "Disconnect",
    webRemoteUnpairConfirm: "Delete the stored credential and cut the web client off?",
    webRemoteUnpairYes: "Disconnect",
    webRemoteUnpairCancel: "Keep it",
    webRemoteUnpaired: "Disconnected. The web client lost access until you pair again.",
    webRemoteActionFailed: "The action failed: {message}",
    webRemoteStateStarting: "Starting\u2026",
    webRemoteStateDisabled: "Off",
    webRemoteStateWaitingRelay: "No relay configured",
    webRemoteStatePairing: "Waiting for approval",
    webRemoteStateWaitingPairing: "Pairing required",
    webRemoteStatePairingRequired: "Pairing required",
    webRemoteStateConnecting: "Connecting\u2026",
    webRemoteStateReconnecting: "Reconnecting\u2026",
    webRemoteStateConnected: "Connected",
    webRemoteStatePaired: "Paired",
    webRemoteStateAuthRequired: "The relay rejected the credential",
    webRemoteStateRevoked: "Device revoked",
    webRemoteStateError: "Error",
    webRemoteStateStopped: "Stopped",
    webRemoteStateDisconnected: "Disconnected",
    /* Automatic archive */
    aaTitle: "Automatic archive",
    aaSummary: "Archive chats nobody has written to for a while",
    aaIntro: "A chat with no new message for the configured number of days is hidden from the session list. Archiving keeps the conversation, and you can restore it from the archive filter in the sidebar.",
    aaEnabled: "Archive idle chats automatically",
    aaInactiveDays: "Days without a message",
    aaInactiveDaysHint: "0 turns the age rule off; nothing is archived until you set it back above zero.",
    aaCheckMinutes: "Check every (minutes)",
    aaCheckMinutesHint: "The schedule only runs while Harness is open; a pass catches up at startup.",
    aaSkipActive: "Keep the chat open in this window",
    aaBlank: "Also archive chats that never got a message",
    aaRunning: "Archive even while work is running (stops that work)",
    aaDryRun: "Dry run: report what would be archived, archive nothing",
    aaSave: "Save",
    aaSaving: "Saving\u2026",
    aaSaved: "Saved. The next pass uses these rules.",
    aaSaveFailed: "The Host rejected the change",
    aaRunNow: "Run now",
    aaRunningNow: "Running\u2026",
    aaRunDone: "Pass finished: {archived} archived, {failed} failed.",
    aaRunFailed: "The pass failed",
    aaNever: "No pass has run yet.",
    aaLast: "Last pass: scanned {scanned}, archived {archived}, kept {active} with running work, {failed} failed.",
    aaLastDry: "Last dry run: scanned {scanned}, {due} would be archived.",
    aaOff: "Automatic archiving is off, so no pass ran.",
    aaOffHint: "Turn the switch on and save to start archiving.",
    aaRestoreHint: "Pinned chats are never archived; with the running-work switch off, chats with active work are kept too. Restore an archived chat from the sidebar\u2019s archive filter.",
    aaLoadFailed: "Could not read the automatic-archive settings"
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
    gitWorktrees: "Worktree",
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
    gitPrConfirmHint: "Model vi\u1EBFt ti\xEAu \u0111\u1EC1 v\xE0 m\xF4 t\u1EA3; nh\xE1nh ch\u1EC9 \u0111\u01B0\u1EE3c \u0111\u1EA9y l\xEAn khi b\u1EA1n b\u1EA5m t\u1EA1o.",
    gitPrCreate: "T\u1EA1o",
    gitPrCancel: "Hu\u1EF7",
    gitPrBusy: "\u0110ang so\u1EA1n pull request\u2026",
    gitPrCreated: "\u0110\xE3 t\u1EA1o pull request #{number}",
    gitPrOpen: "M\u1EDF tr\xEAn web",
    gitPrFailed: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c pull request",
    gitPrBase: "Nh\xE1nh n\u1EC1n",
    gitPrNoForge: "C\u1EA7n CLI c\u1EE7a m\xE1y ch\u1EE7 m\xE3 ngu\u1ED3n \u0111\xE3 \u0111\u0103ng nh\u1EADp \u0111\u1EC3 t\u1EA1o pull request",
    gitPrNoBranch: "B\u1EA3n checkout n\xE0y kh\xF4ng \u1EDF tr\xEAn nh\xE1nh n\xE0o",
    gitPrTitleLabel: "Ti\xEAu \u0111\u1EC1",
    gitPrBodyLabel: "M\xF4 t\u1EA3",
    gitPrTitlePlaceholder: "Vi\u1EBFt ti\xEAu \u0111\u1EC1, ho\u1EB7c \u0111\u1EC3 model vi\u1EBFt",
    gitPrBodyPlaceholder: "M\xF4 t\u1EA3 thay \u0111\u1ED5i v\xE0 c\xE1ch ki\u1EC3m th\u1EED, ho\u1EB7c \u0111\u1EC3 model vi\u1EBFt",
    gitPrDrafting: "\u0110ang so\u1EA1n pull request\u2026",
    gitPrRegenerate: "Vi\u1EBFt l\u1EA1i",
    gitPrDraftModel: "Do {model} vi\u1EBFt",
    gitPrDraftFallback: "D\u1EF1ng t\u1EEB commit",
    gitPrDraftFallbackReason: "D\u1EF1ng t\u1EEB commit ({reason})",
    gitPrNoCommitsHint: "Nh\xE1nh ch\u01B0a c\xF3 commit n\xE0o h\u01A1n nh\xE1nh n\u1EC1n.",
    gitPrDefaultBranchHint: "Checkout \u0111ang \u1EDF {branch}; h\xE3y t\u1EA1o nh\xE1nh feature tr\u01B0\u1EDBc khi m\u1EDF pull request.",
    gitPrCreating: "\u0110ang t\u1EA1o pull request\u2026",
    /* Gộp pull request */
    gitMerge: "G\u1ED9p",
    gitMergeSquash: "Squash & g\u1ED9p",
    gitMergeRebase: "Rebase & g\u1ED9p",
    gitMergeTitle: "G\u1ED9p pull request #{number}",
    gitMergeBody: "G\u1ED9p {branch} v\xE0o {base}?",
    gitMergeHint: "M\xE1y ch\u1EE7 m\xE3 ngu\u1ED3n v\u1EABn \xE1p d\u1EE5ng ki\u1EC3m tra, review v\xE0 quy t\u1EAFc b\u1EA3o v\u1EC7 nh\xE1nh.",
    gitMergeDeleteBranch: "Xo\xE1 nh\xE1nh ngu\u1ED3n sau khi g\u1ED9p",
    gitMergeCancel: "Hu\u1EF7",
    gitMergeConfirm: "G\u1ED9p",
    gitMergeBusy: "\u0110ang g\u1ED9p\u2026",
    gitMergeDone: "\u0110\xE3 g\u1ED9p #{number}",
    gitMergeQueued: "\u0110\xE3 g\u1EEDi y\xEAu c\u1EA7u g\u1ED9p #{number}",
    gitMergeFailed: "Kh\xF4ng g\u1ED9p \u0111\u01B0\u1EE3c pull request",
    gitMergeBlocked: "M\xE1y ch\u1EE7 m\xE3 ngu\u1ED3n kh\xF4ng ch\u1EA5p nh\u1EADn g\u1ED9p",
    gitMergeUnsupported: "M\xE1y ch\u1EE7 m\xE3 ngu\u1ED3n kh\xF4ng h\u1ED7 tr\u1EE3 ki\u1EC3u g\u1ED9p n\xE0y",
    gitMergeDeletedBranch: "\u0110\xE3 xo\xE1 nh\xE1nh ngu\u1ED3n.",
    gitMergeDeleteFailed: "G\u1ED9p th\xE0nh c\xF4ng nh\u01B0ng ch\u01B0a xo\xE1 \u0111\u01B0\u1EE3c nh\xE1nh ngu\u1ED3n.",
    /* Stage từng tệp */
    gitStage: "Stage",
    gitUnstage: "B\u1ECF stage",
    gitDiscard: "Hu\u1EF7 thay \u0111\u1ED5i",
    gitDiscardBusy: "\u0110ang hu\u1EF7\u2026",
    gitDiscardConfirm: "Hu\u1EF7 thay \u0111\u1ED5i trong {path}?",
    gitDiscardUntracked: "Xo\xE1 t\u1EC7p ch\u01B0a theo d\xF5i {path}?",
    gitFileActions: "Thao t\xE1c t\u1EC7p",
    gitStageDone: "\u0110\xE3 stage {path}",
    gitUnstageDone: "\u0110\xE3 b\u1ECF stage {path}",
    gitDiscardDone: "\u0110\xE3 hu\u1EF7 thay \u0111\u1ED5i {path}",
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
    wtAuto: "Worktree",
    wtAutoHint: "Khi b\u1EA1n g\u1EEDi tin nh\u1EAFn \u0111\u1EA7u ti\xEAn, chat n\xE0y c\xF3 checkout ri\xEAng c\u1EE7a kho m\xE3, n\xEAn th\u01B0 m\u1EE5c d\u1EF1 \xE1n kh\xF4ng b\u1ECB \u0111\u1EE5ng t\u1EDBi.",
    wtNextMessage: "Tin nh\u1EAFn ti\u1EBFp theo b\u1EAFt \u0111\u1EA7u trong worktree m\u1EDBi t\u1EEB {branch}",
    wtOff: "Chat n\xE0y \u1EDF l\u1EA1i th\u01B0 m\u1EE5c d\u1EF1 \xE1n",
    wtDefaultBranch: "nh\xE1nh m\u1EB7c \u0111\u1ECBnh",
    wtLinkedProject: "D\u1EF1 \xE1n n\xE0y v\u1ED1n l\xE0 m\u1ED9t worktree li\xEAn k\u1EBFt n\xEAn kh\xF4ng t\u1EA1o th\xEAm checkout.",
    wtCreatingBranch: "\u0110ang t\u1EA1o {branch}\u2026",
    wtDockLabel: "Tr\u1EA1ng th\xE1i worktree",
    wtDockCreating: "\u0110ang t\u1EA1o worktree {branch}",
    wtDockHint: "T\u1EEB {base} m\u1EDBi nh\u1EA5t; tin nh\u1EAFn b\u1EAFt \u0111\u1EA7u khi checkout s\u1EB5n s\xE0ng.",
    wtDockCreated: "Worktree s\u1EB5n s\xE0ng: {branch}",
    wtDockCreatedHint: "Chat n\xE0y gi\u1EDD l\xE0m vi\u1EC7c trong checkout ri\xEAng.",
    wtDockFailed: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c worktree",
    wtDockFailedHint: "Tin nh\u1EAFn ti\u1EBFp t\u1EE5c trong th\u01B0 m\u1EE5c d\u1EF1 \xE1n. B\u1EA5m th\u1EED l\u1EA1i \u0111\u1EC3 t\u1EA1o {base} cho tin nh\u1EAFn sau.",
    wtDockRetry: "Th\u1EED l\u1EA1i",
    wtDockContinue: "Ti\u1EBFp t\u1EE5c \u1EDF \u0111\xE2y",
    wtDockDismiss: "\u0110\xF3ng",
    gitSettingsTitle: "Worktree v\xE0 pull request \u0111\xE3 g\u1ED9p",
    gitSettingsSummary: "D\u1ECDn d\u1EB9p sau khi pull request c\u1EE7a phi\xEAn \u0111\u01B0\u1EE3c g\u1ED9p",
    gitSettingsMerged: "Khi pull request c\u1EE7a phi\xEAn \u0111\u01B0\u1EE3c g\u1ED9p",
    gitCodeHost: "M\xE1y ch\u1EE7 m\xE3 ngu\u1ED3n",
    gitCodeHostProvider: "Nh\xE0 cung c\u1EA5p",
    gitCodeHostAuto: "T\u1EF1 nh\u1EADn di\u1EC7n t\u1EEB remote",
    gitCodeHostNone: "T\u1EAFt (kh\xF4ng \u0111\u1ECDc pull request/issue)",
    gitCodeHostGitlabHosts: "GitLab t\u1EF1 host",
    gitCodeHostHint: "Nh\u1EADp hostname ho\u1EB7c URL, c\xE1ch nhau b\u1EB1ng d\u1EA5u ph\u1EA9y, v\xED d\u1EE5 gitlab.example.com. gitlab.com \u0111\u01B0\u1EE3c nh\u1EADn di\u1EC7n t\u1EF1 \u0111\u1ED9ng. \u0110\u1EB7t GITLAB_TOKEN ho\u1EB7c credential DSH_GITLAB_TOKEN \u0111\u1EC3 \u0111\u1ECDc m\xE0 kh\xF4ng c\u1EA7n glab.",
    gitCodeHostCli: "\u0110\u01B0\u1EDDng d\u1EABn CLI (tu\u1EF3 ch\u1ECDn)",
    gitSettingsRemove: "Xo\xE1 worktree",
    gitSettingsDeleteBranch: "Xo\xE1 c\u1EA3 nh\xE1nh c\u1EE7a n\xF3",
    gitSettingsArchive: "\u1EA8n phi\xEAn kh\u1ECFi danh s\xE1ch (d\u1EEBng vi\u1EC7c \u0111ang ch\u1EA1y)",
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
    gitHintOpenPr: "Nh\xE1nh n\xE0y \u0111\xE3 c\xF3 pull request \u0111ang m\u1EDF.",
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
    gitActionUnavailable: "Thao t\xE1c ch\u01B0a d\xF9ng \u0111\u01B0\u1EE3c",
    wtManagerTitle: "Worktree",
    wtManagerHint: "M\u1ED7i checkout c\xF3 nh\xE1nh v\xE0 th\u01B0 m\u1EE5c ri\xEAng; checkout ch\xEDnh kh\xF4ng b\u1ECB \u0111\u1EE5ng t\u1EDBi.",
    wtNew: "Worktree m\u1EDBi",
    wtCreateTitle: "T\u1EA1o worktree",
    wtCreateHint: "Checkout b\u1EAFt \u0111\u1EA7u t\u1EEB nh\xE1nh b\u1EA1n ch\u1ECDn v\xE0 c\xF3 nh\xE1nh m\u1EDBi ri\xEAng.",
    wtName: "T\xEAn nh\xE1nh",
    wtNamePlaceholder: "\u0111\u1EC3 tr\u1ED1ng \u0111\u1EC3 t\u1EF1 sinh t\xEAn",
    wtSwitchHere: "L\xE0m vi\u1EC7c \u1EDF \u0111\xE2y",
    wtSwitchThisChat: "Chuy\u1EC3n chat n\xE0y sang \u0111\xE2y",
    wtOpenChat: "M\u1EDF chat",
    wtRemoveAction: "Xo\xE1",
    wtRemoveConfirm: "Xo\xE1 {branch}?",
    wtRemoveHint: "Git gi\u1EEF checkout c\xF2n thay \u0111\u1ED5i ch\u01B0a commit tr\u1EEB khi b\u1EA1n bu\u1ED9c xo\xE1.",
    wtForce: "V\u1EABn xo\xE1",
    wtDeleteBranch: "Xo\xE1 c\u1EA3 nh\xE1nh",
    wtCancel: "Hu\u1EF7",
    wtCreate: "T\u1EA1o",
    wtCreating: "\u0110ang t\u1EA1o\u2026",
    wtCurrent: "hi\u1EC7n t\u1EA1i",
    wtMain: "ch\xEDnh",
    wtPool: "worktree",
    wtDetached: "HEAD r\u1EDDi",
    wtLocked: "\u0111ang kho\xE1",
    wtPrunable: "m\u1EA5t th\u01B0 m\u1EE5c",
    wtDirty: "{count} thay \u0111\u1ED5i",
    wtClean: "s\u1EA1ch",
    wtCreatedNotice: "\u0110\xE3 t\u1EA1o {branch}",
    wtCreatedSwitched: "\u0110\xE3 t\u1EA1o {branch}; chat n\xE0y \u0111\xE3 chuy\u1EC3n sang \u0111\xF3",
    wtSwitched: "Chat n\xE0y gi\u1EDD l\xE0m vi\u1EC7c trong {branch}",
    wtRemovedNotice: "\u0110\xE3 xo\xE1 {branch}",
    wtPruned: "\u0110\xE3 d\u1ECDn {count} \u0111\u0103ng k\xFD c\u0169",
    wtPrunedNone: "Kh\xF4ng c\xF3 \u0111\u0103ng k\xFD worktree c\u0169",
    wtPrune: "D\u1ECDn \u0111\u0103ng k\xFD",
    wtPruneHint: "Qu\xEAn c\xE1c \u0111\u0103ng k\xFD c\xF3 th\u01B0 m\u1EE5c \u0111\xE3 m\u1EA5t",
    wtError: "Thao t\xE1c worktree th\u1EA5t b\u1EA1i",
    wtLoadError: "Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c danh s\xE1ch worktree",
    wtEmpty: "Ch\u01B0a c\xF3 worktree",
    wtEmptyHint: "T\u1EA1o m\u1ED9t c\xE1i \u0111\u1EC3 l\xE0m vi\u1EC7c tr\xEAn nh\xE1nh ri\xEAng m\xE0 kh\xF4ng \u0111\u1EE5ng checkout ch\xEDnh.",
    wtMainHint: "Th\u01B0 m\u1EE5c d\u1EF1 \xE1n m\xE0 m\u1ECDi worktree chia s\u1EBB.",
    wtThisChat: "chat n\xE0y",
    wtOtherChat: "chat {id}",
    wtCreatedAt: "t\u1EA1o {when}",
    wtNoSession: "M\u1EDF m\u1ED9t chat \u0111\u1EC3 chuy\u1EC3n n\xF3 v\xE0o worktree.",
    wtLoadBases: "\u0110ang t\u1EA3i nh\xE1nh\u2026",
    wtAddFailed: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c worktree",
    webRemoteTitle: "Web Remote",
    webRemoteSummary: "\u0110i\u1EC1u khi\u1EC3n DSH n\xE0y t\u1EEB \u0111i\u1EC7n tho\u1EA1i qua relay; m\xE1y kh\xF4ng m\u1EDF c\u1ED5ng n\xE0o.",
    webRemoteIntro: "Plugin n\u1ED1i ra ngo\xE0i t\u1EDBi relay, gh\xE9p c\u1EB7p m\u1ED9t l\u1EA7n, r\u1ED3i ph\u1EE5c v\u1EE5 chat, prompt, ph\xEA duy\u1EC7t v\xE0 c\xE2u h\u1ECFi cho web client.",
    webRemoteLoading: "\u0110ang \u0111\u1ECDc tr\u1EA1ng th\xE1i Web Remote\u2026",
    webRemoteUnavailable: "Kh\xF4ng li\xEAn l\u1EA1c \u0111\u01B0\u1EE3c ph\u1EA7n Host c\u1EE7a plugin, n\xEAn ch\u01B0a \u0111\u1ECDc \u0111\u01B0\u1EE3c tr\u1EA1ng th\xE1i Web Remote. H\xE3y kh\u1EDFi \u0111\u1ED9ng l\u1EA1i Harness sau khi c\xE0i ho\u1EB7c c\u1EADp nh\u1EADt plugin.",
    webRemoteStale: "L\u1EA7n c\u1EADp nh\u1EADt tr\u1EA1ng th\xE1i g\u1EA7n nh\u1EA5t th\u1EA5t b\u1EA1i; s\u1ED1 li\u1EC7u c\xF3 th\u1EC3 c\u0169 v\xE0i gi\xE2y.",
    webRemoteRelayLabel: "\u0110\u1ECBa ch\u1EC9 relay",
    webRemoteRelayPlaceholder: "https://chat.example.com",
    webRemoteRelayHint: "\u0110\u1ED5i relay s\u1EBD xo\xE1 credential \u0111\xE3 l\u01B0u, n\xEAn thi\u1EBFt b\u1ECB ph\u1EA3i gh\xE9p c\u1EB7p l\u1EA1i.",
    webRemoteRelayInvalid: "\u0110\u1ECBa ch\u1EC9 relay ph\u1EA3i b\u1EAFt \u0111\u1EA7u b\u1EB1ng http://, https://, ws:// ho\u1EB7c wss://.",
    webRemoteDeviceLabel: "T\xEAn thi\u1EBFt b\u1ECB",
    webRemoteDevicePlaceholder: "T\xEAn hi\u1EC7n tr\xEAn m\xE0n h\xECnh duy\u1EC7t",
    webRemoteAutoPair: "T\u1EF1 ch\u1EA1y gh\xE9p c\u1EB7p khi ch\u01B0a c\xF3 credential",
    webRemoteEnabled: "B\u1EADt Web Remote",
    webRemoteDisabledHint: "Web Remote \u0111ang t\u1EAFt trong profile n\xE0y. B\u1EADt r\u1ED3i l\u01B0u \u0111\u1EC3 plugin n\u1ED1i ra relay.",
    webRemoteSettingsTitle: "Thi\u1EBFt l\u1EADp relay",
    webRemoteSave: "L\u01B0u",
    webRemoteSaving: "\u0110ang l\u01B0u\u2026",
    webRemoteSaved: "\u0110\xE3 l\u01B0u. Harness t\u1EA3i l\u1EA1i h\xE0ng plugin n\xE0y, n\xEAn thay \u0111\u1ED5i \xE1p d\u1EE5ng ngay sau \u0111\xF3.",
    webRemoteReadOnly: "B\u1EA3n c\xE0i n\xE0y kh\xF4ng cho s\u1EEDa c\u1EA5u h\xECnh.",
    webRemoteRefresh: "L\xE0m m\u1EDBi tr\u1EA1ng th\xE1i",
    webRemotePairedBadge: "\u0111\xE3 gh\xE9p c\u1EB7p",
    webRemoteDevice: "Thi\u1EBFt b\u1ECB",
    webRemoteFingerprint: "V\xE2n tay kho\xE1",
    webRemoteConnection: "K\u1EBFt n\u1ED1i",
    webRemoteConnectedAt: "k\u1EBFt n\u1ED1i {when}",
    webRemotePaired: "Gh\xE9p c\u1EB7p",
    webRemotePairedAt: "gh\xE9p c\u1EB7p {when}",
    webRemoteWatching: "Web client",
    webRemoteWatchingCount: "\u0111ang theo d\xF5i {count} phi\xEAn",
    webRemoteWatchingNone: "ch\u01B0a theo d\xF5i phi\xEAn n\xE0o",
    webRemoteLastError: "L\u1ED7i g\u1EA7n nh\u1EA5t",
    webRemoteOpenWebChat: "M\u1EDF WebChat",
    webRemoteNoRelayHint: "\u0110\u1EB7t \u0111\u1ECBa ch\u1EC9 relay r\u1ED3i l\u01B0u \u0111\u1EC3 gh\xE9p c\u1EB7p m\xE1y n\xE0y.",
    webRemotePairTitle: "Gh\xE9p c\u1EB7p thi\u1EBFt b\u1ECB",
    webRemotePairStep: "M\u1EDF trang duy\u1EC7t tr\xEAn thi\u1EBFt b\u1ECB kh\xE1c, nh\u1EADp m\xE3 n\xE0y r\u1ED3i b\u1EA5m Duy\u1EC7t:",
    webRemotePairOpen: "M\u1EDF trang duy\u1EC7t",
    webRemotePairCopy: "Sao ch\xE9p m\xE3",
    webRemotePairCopied: "\u0110\xE3 ch\xE9p",
    webRemotePairExpires: "M\xE3 h\u1EBFt h\u1EA1n sau {time}.",
    webRemotePairExpired: "M\xE3 \u0111\xE3 h\u1EBFt h\u1EA1n. H\xE3y gh\xE9p c\u1EB7p l\u1EA1i.",
    webRemotePairCancel: "Hu\u1EF7 gh\xE9p c\u1EB7p",
    webRemotePairCancelled: "\u0110\xE3 hu\u1EF7 gh\xE9p c\u1EB7p.",
    webRemotePairNow: "Gh\xE9p c\u1EB7p ngay",
    webRemotePairAgain: "Gh\xE9p c\u1EB7p l\u1EA1i",
    webRemoteUnpair: "Ng\u1EAFt gh\xE9p n\u1ED1i",
    webRemoteUnpairConfirm: "Xo\xE1 credential \u0111\xE3 l\u01B0u v\xE0 ng\u1EAFt quy\u1EC1n c\u1EE7a web client?",
    webRemoteUnpairYes: "Ng\u1EAFt",
    webRemoteUnpairCancel: "Gi\u1EEF l\u1EA1i",
    webRemoteUnpaired: "\u0110\xE3 ng\u1EAFt. Web client m\u1EA5t quy\u1EC1n truy c\u1EADp cho t\u1EDBi khi b\u1EA1n gh\xE9p c\u1EB7p l\u1EA1i.",
    webRemoteActionFailed: "Thao t\xE1c th\u1EA5t b\u1EA1i: {message}",
    webRemoteStateStarting: "\u0110ang kh\u1EDFi \u0111\u1ED9ng\u2026",
    webRemoteStateDisabled: "\u0110ang t\u1EAFt",
    webRemoteStateWaitingRelay: "Ch\u01B0a c\u1EA5u h\xECnh relay",
    webRemoteStatePairing: "\u0110ang ch\u1EDD duy\u1EC7t",
    webRemoteStateWaitingPairing: "C\u1EA7n gh\xE9p c\u1EB7p",
    webRemoteStatePairingRequired: "C\u1EA7n gh\xE9p c\u1EB7p",
    webRemoteStateConnecting: "\u0110ang k\u1EBFt n\u1ED1i\u2026",
    webRemoteStateReconnecting: "\u0110ang k\u1EBFt n\u1ED1i l\u1EA1i\u2026",
    webRemoteStateConnected: "\u0110\xE3 k\u1EBFt n\u1ED1i",
    webRemoteStatePaired: "\u0110\xE3 gh\xE9p c\u1EB7p",
    webRemoteStateAuthRequired: "Relay t\u1EEB ch\u1ED1i credential",
    webRemoteStateRevoked: "Thi\u1EBFt b\u1ECB b\u1ECB thu h\u1ED3i",
    webRemoteStateError: "L\u1ED7i",
    webRemoteStateStopped: "\u0110\xE3 d\u1EEBng",
    webRemoteStateDisconnected: "\u0110\xE3 ng\u1EAFt k\u1EBFt n\u1ED1i",
    /* Tự động lưu trữ */
    aaTitle: "T\u1EF1 \u0111\u1ED9ng l\u01B0u tr\u1EEF",
    aaSummary: "L\u01B0u tr\u1EEF chat l\xE2u ng\xE0y kh\xF4ng c\xF3 tin nh\u1EAFn m\u1EDBi",
    aaIntro: "Chat kh\xF4ng c\xF3 tin nh\u1EAFn m\u1EDBi trong s\u1ED1 ng\xE0y \u0111\xE3 \u0111\u1EB7t s\u1EBD \u0111\u01B0\u1EE3c \u1EA9n kh\u1ECFi danh s\xE1ch phi\xEAn. L\u01B0u tr\u1EEF v\u1EABn gi\u1EEF nguy\xEAn h\u1ED9i tho\u1EA1i; kh\xF4i ph\u1EE5c b\u1EB1ng b\u1ED9 l\u1ECDc l\u01B0u tr\u1EEF \u1EDF thanh b\xEAn.",
    aaEnabled: "T\u1EF1 \u0111\u1ED9ng l\u01B0u tr\u1EEF chat kh\xF4ng t\u01B0\u01A1ng t\xE1c",
    aaInactiveDays: "S\u1ED1 ng\xE0y kh\xF4ng c\xF3 tin nh\u1EAFn",
    aaInactiveDaysHint: "0 l\xE0 t\u1EAFt quy t\u1EAFc tu\u1ED5i; s\u1EBD kh\xF4ng l\u01B0u tr\u1EEF g\xEC cho t\u1EDBi khi \u0111\u1EB7t l\u1EA1i l\u1EDBn h\u01A1n 0.",
    aaCheckMinutes: "Ki\u1EC3m tra m\u1ED7i (ph\xFAt)",
    aaCheckMinutesHint: "L\u1ECBch ch\u1EC9 ch\u1EA1y khi Harness \u0111ang m\u1EDF; m\u1EDF l\u1EA1i DSH s\u1EBD ki\u1EC3m tra b\xF9 ngay sau khi kh\u1EDFi \u0111\u1ED9ng.",
    aaSkipActive: "Gi\u1EEF chat \u0111ang m\u1EDF trong c\u1EEDa s\u1ED5 n\xE0y",
    aaBlank: "L\u01B0u tr\u1EEF c\u1EA3 chat ch\u01B0a t\u1EEBng c\xF3 tin nh\u1EAFn",
    aaRunning: "L\u01B0u tr\u1EEF c\u1EA3 khi \u0111ang c\xF3 vi\u1EC7c ch\u1EA1y (d\u1EEBng vi\u1EC7c \u0111\xF3)",
    aaDryRun: "Ch\u1EA1y th\u1EED: ch\u1EC9 b\xE1o c\xE1o s\u1EBD l\u01B0u tr\u1EEF g\xEC, kh\xF4ng l\u01B0u tr\u1EEF th\u1EADt",
    aaSave: "L\u01B0u",
    aaSaving: "\u0110ang l\u01B0u\u2026",
    aaSaved: "\u0110\xE3 l\u01B0u. L\u01B0\u1EE3t ki\u1EC3m tra k\u1EBF ti\u1EBFp d\xF9ng quy t\u1EAFc n\xE0y.",
    aaSaveFailed: "Host t\u1EEB ch\u1ED1i thay \u0111\u1ED5i",
    aaRunNow: "Ch\u1EA1y ngay",
    aaRunningNow: "\u0110ang ch\u1EA1y\u2026",
    aaRunDone: "L\u01B0\u1EE3t ch\u1EA1y xong: l\u01B0u tr\u1EEF {archived}, l\u1ED7i {failed}.",
    aaRunFailed: "L\u01B0\u1EE3t ch\u1EA1y th\u1EA5t b\u1EA1i",
    aaNever: "Ch\u01B0a c\xF3 l\u01B0\u1EE3t ki\u1EC3m tra n\xE0o.",
    aaLast: "L\u01B0\u1EE3t tr\u01B0\u1EDBc: qu\xE9t {scanned}, l\u01B0u tr\u1EEF {archived}, gi\u1EEF {active} v\xEC c\xF2n vi\u1EC7c ch\u1EA1y, l\u1ED7i {failed}.",
    aaLastDry: "L\u01B0\u1EE3t ch\u1EA1y th\u1EED tr\u01B0\u1EDBc: qu\xE9t {scanned}, s\u1EBD l\u01B0u tr\u1EEF {due}.",
    aaOff: "T\u1EF1 \u0111\u1ED9ng l\u01B0u tr\u1EEF \u0111ang t\u1EAFt n\xEAn kh\xF4ng c\xF3 l\u01B0\u1EE3t ch\u1EA1y n\xE0o.",
    aaOffHint: "B\u1EADt c\xF4ng t\u1EAFc r\u1ED3i l\u01B0u \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u l\u01B0u tr\u1EEF.",
    aaRestoreHint: 'Chat \u0111\u01B0\u1EE3c ghim th\xEC kh\xF4ng bao gi\u1EDD b\u1ECB l\u01B0u tr\u1EEF; khi t\u1EAFt c\xF4ng t\u1EAFc "\u0111ang c\xF3 vi\u1EC7c ch\u1EA1y", chat c\xF2n vi\u1EC7c c\u0169ng \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i. Kh\xF4i ph\u1EE5c chat \u0111\xE3 l\u01B0u tr\u1EEF b\u1EB1ng b\u1ED9 l\u1ECDc l\u01B0u tr\u1EEF \u1EDF thanh b\xEAn.',
    aaLoadFailed: "Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c thi\u1EBFt l\u1EADp t\u1EF1 \u0111\u1ED9ng l\u01B0u tr\u1EEF"
  };
  var dictionaries = { en, vi };

  // src/client/api.ts
  var GIT_PATH = "api/personal-hub-git";
  var WEB_REMOTE_PATH = "api/personal-hub-web-remote";
  var AUTO_ARCHIVE_PATH = "api/personal-hub-auto-archive";
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
  function createCaller(prefix) {
    return async function call(endpoint, payload) {
      let response;
      try {
        response = await fetch(`${prefix}/${endpoint}`, {
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
          detail?.message ?? "The request failed",
          detail?.details
        );
      }
      return envelope.value;
    };
  }
  function createGitCaller() {
    return createCaller(GIT_PATH);
  }
  function createWebRemoteApi(call = createCaller(WEB_REMOTE_PATH)) {
    return {
      state: (payload) => call("state", payload),
      settingsSet: (payload) => call("settingsSet", payload),
      pair: (payload) => call("pair", payload),
      pairCancel: (payload) => call("pairCancel", payload),
      unpair: (payload) => call("unpair", payload)
    };
  }
  function createAutoArchiveApi(call = createCaller(AUTO_ARCHIVE_PATH)) {
    return {
      state: (payload) => call("state", payload),
      settingsSet: (payload) => call("settingsSet", payload),
      runNow: (payload) => call("runNow", payload)
    };
  }
  function createGitApi(call) {
    const route = (name) => (payload) => call(name, payload);
    return {
      overview: route("overview"),
      counts: route("counts"),
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
      draftPull: route("draftPull"),
      mergePull: route("mergePull"),
      publish: route("publish"),
      worktreeState: route("worktreeState"),
      worktreeRequest: route("worktreeRequest"),
      worktrees: route("worktrees"),
      worktreeAdd: route("worktreeAdd"),
      worktreeSwitch: route("worktreeSwitch"),
      worktreeRemovePath: route("worktreeRemovePath"),
      worktreePrune: route("worktreePrune"),
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
.ph-git{display:flex;flex-direction:column;min-height:0;height:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px}
.ph-git *{box-sizing:border-box}
.ph-git button{font:inherit}
/* The panel's text colour is only a default for buttons: written as
   .ph-git button it out-ranked every single-class rule below, so a
   .ph-primary kept its brand-black fill while its label was repainted in the
   theme's dark colour \u2014 an apparently empty black button. Zero specificity lets
   .ph-primary (white on the fill), .ph-chip, .ph-filter and the rest win. */
:where(.ph-git) :where(button){color:inherit}
.ph-git .ph-spacer{flex:1 1 auto;min-width:0}
.ph-git .ph-dim{color:var(--dsw-alias-label-tertiary)}
.ph-git .ph-tiny{font-size:11px}
.ph-git .ph-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ph-git .ph-ellipsis{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.ph-git .ph-row{display:flex;align-items:center;gap:7px;min-width:0}

/* Header */
.ph-head{display:flex;flex-direction:column;gap:8px;padding:10px 12px 9px;border-bottom:1px solid var(--dsw-alias-border-l3);flex:none}
.ph-repo-row{display:flex;align-items:center;gap:7px;min-width:0}
.ph-repo{font-weight:650;font-size:13.5px;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-branch-row{display:flex;align-items:center;gap:6px;min-width:0}
.ph-branch-button{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:4px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);cursor:pointer;min-width:0;font-size:12.5px}
.ph-branch-button:hover{background:var(--dsw-alias-bg-layer-2)}
.ph-pill{display:inline-flex;align-items:center;gap:2px;padding:2px 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap}
.ph-pill[data-tone=warn]{color:var(--dsw-alias-state-warn-primary)}
.ph-pill[data-tone=success]{color:var(--dsw-alias-state-success-primary)}
.ph-chip{display:inline-flex;align-items:center;gap:4px;max-width:100%;padding:2px 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
button.ph-chip{cursor:pointer}
button.ph-chip:hover{background:var(--dsw-alias-bg-layer-2)}
.ph-worktree-chip{border-style:dashed;color:var(--dsw-alias-label-tertiary)}
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
.ph-actions{display:flex;align-items:stretch;gap:0;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;position:relative}
.ph-actions[data-running=true]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,var(--dsw-alias-border-l1))}
.ph-action-primary{display:flex;align-items:center;gap:7px;flex:1 1 auto;min-width:0;padding:8px 10px;border:0;background:transparent;cursor:pointer;font-weight:600;font-size:13px;text-align:left}
.ph-action-primary:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.ph-action-primary:disabled{cursor:default;color:var(--dsw-alias-label-tertiary)}
.ph-action-caret{display:flex;align-items:center;justify-content:center;width:30px;border:0;border-left:1px solid var(--dsw-alias-border-l3);background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary)}
.ph-action-caret:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.ph-action-caret:disabled{cursor:default;opacity:.55}
.ph-action-hint{font-size:11.5px;color:var(--dsw-alias-label-tertiary);line-height:1.45;margin:0}
.ph-menu{position:absolute;right:0;top:calc(100% + 4px);z-index:50;display:flex;flex-direction:column;min-width:230px;padding:5px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 10px 28px rgba(0,0,0,.24)}
.ph-menu-item{display:flex;align-items:center;gap:8px;padding:7px 9px;border:0;border-radius:7px;background:transparent;cursor:pointer;text-align:left;font-size:12.5px}
.ph-menu-item:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1)}
.ph-menu-item:disabled{cursor:default;color:var(--dsw-alias-label-tertiary)}
.ph-menu-hint{padding:4px 9px 6px;color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:1.45}
.ph-menu-sep{height:1px;margin:5px 3px;background:var(--dsw-alias-border-l3)}

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
.ph-tabs{display:flex;align-items:center;gap:2px;padding:0 8px;border-bottom:1px solid var(--dsw-alias-border-l3);flex:none;overflow-x:auto;scrollbar-width:none}
.ph-tabs::-webkit-scrollbar{display:none}
.ph-tab{display:inline-flex;align-items:center;gap:6px;padding:9px 9px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:12.5px;white-space:nowrap}
.ph-tab:hover{color:var(--dsw-alias-label-primary)}
.ph-tab[aria-selected=true]{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:550}
.ph-tab-count{padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);font-size:10.5px;font-variant-numeric:tabular-nums}

/* Body */
.ph-body{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain}
/* A detail pane scrolls on its own, so the back bar stays put and everything
   below the fold stays readable in a panel of any height. */
.ph-detail-body{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain}
.ph-detail-body .ph-toolbar{position:sticky;top:0;z-index:6;background:var(--dsw-alias-bg-base)}
.ph-toolbar{display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l3);flex:none;flex-wrap:wrap}
.ph-toolbar .ph-spacer{flex:1 1 auto}
.ph-toolbar-title{font-weight:600;font-size:12px}

/* Buttons */
.ph-button{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:12px;white-space:nowrap}
.ph-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ph-button:disabled{opacity:.55;cursor:default}
.ph-button[aria-pressed=true]{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted)}
.ph-primary{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:6px 13px;border:1px solid transparent;border-radius:8px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted);cursor:pointer;font-size:12.5px;font-weight:600;white-space:nowrap}
.ph-primary.ph-danger{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-on-color)}
.ph-primary:disabled{opacity:.55;cursor:default;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);border-color:var(--dsw-alias-border-l1)}
.ph-primary:hover:not(:disabled){filter:brightness(1.06)}
.ph-icon-button{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;flex:none}
.ph-icon-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ph-icon-button:disabled{opacity:.5;cursor:default}
.ph-icon-button[data-busy=true] svg{animation:ph-spin .9s linear infinite}
.ph-link{color:var(--dsw-alias-brand-primary);text-decoration:none;cursor:pointer}
.ph-link:hover{text-decoration:underline}

/* Commit box */
.ph-commit{border-top:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-1);padding:10px 12px;display:flex;flex-direction:column;gap:7px;flex:none}
.ph-commit-head{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.ph-check-inline{display:inline-flex;align-items:center;gap:4px;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-size:11px;white-space:nowrap}
.ph-check-inline input{flex:none;margin:0;cursor:pointer}
.ph-commit-files{max-height:140px;overflow:auto;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;background:var(--dsw-alias-bg-base)}
.ph-commit-file{display:flex;align-items:center;gap:7px;width:100%;padding:4px 8px;border:0;background:transparent;cursor:pointer;font-size:12px;text-align:left;min-width:0}
.ph-commit-file:hover{background:var(--dsw-alias-bg-layer-2)}
.ph-commit-file[data-excluded=true]{color:var(--dsw-alias-label-tertiary)}
.ph-textarea{width:100%;min-height:60px;max-height:170px;resize:vertical;padding:7px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:1.5}
.ph-textarea:focus{outline:1px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
.ph-commit-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ph-commit-actions .ph-spacer{flex:1 1 auto}
.ph-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:1.5}
.ph-error-text{margin:0;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.45}

/* Changes / diff stack */
.ph-stack{display:flex;flex-direction:column}
.ph-stack-toolbar{display:flex;align-items:center;gap:6px;padding:7px 12px;border-bottom:1px solid var(--dsw-alias-border-l3);position:sticky;top:0;z-index:6;background:var(--dsw-alias-bg-base);flex-wrap:wrap}
.ph-file{border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-file-head{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:6px;width:100%;padding:6px 9px;border:0;background:var(--dsw-alias-bg-layer-1);cursor:pointer;text-align:left;min-width:0;min-height:34px}
.ph-file-head:hover{background:var(--dsw-alias-bg-layer-2)}
.ph-file-head[data-expanded=true]{border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-file-check{flex:none;margin:0;cursor:pointer}
.ph-file-path{display:flex;align-items:baseline;gap:0;min-width:0;flex:1 1 auto;overflow:hidden;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
.ph-file-dir{color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:0 1 auto;max-width:52%;direction:rtl;text-align:left}
.ph-file-sep{color:var(--dsw-alias-label-tertiary);flex:none}
.ph-file-name{color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 0 auto;max-width:100%}
.ph-file-actions{display:inline-flex;align-items:center;gap:0;flex:none;padding-left:1px;border-left:1px solid var(--dsw-alias-border-l3);margin-left:1px}
.ph-file-actions .ph-icon-button{width:22px;height:22px}
.ph-file-discard:hover:not(:disabled){color:var(--dsw-alias-state-error-primary)}
.ph-file-copy{width:0;min-width:0;padding:0;overflow:hidden;opacity:0;transition:width .1s ease,opacity .1s ease}
.ph-file-head:hover .ph-file-copy,.ph-file-head:focus-within .ph-file-copy{width:26px;opacity:1}
.ph-badge{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;flex:none;border-radius:4px;font-size:9.5px;font-weight:700;text-transform:uppercase;font-family:ui-monospace,monospace;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
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
.ph-diff{display:flex;flex-direction:column;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.55}
.ph-diff[data-wrap=true]{overflow-x:hidden}
.ph-hunk-head{padding:3px 11px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);font-size:11px;white-space:pre;position:sticky;left:0}
.ph-line{display:flex;align-items:flex-start;min-width:0;white-space:pre}
.ph-diff[data-wrap=true] .ph-line{white-space:pre-wrap;word-break:break-word}
/* A hunk is as wide as its longest line, so a tinted row covers the whole
   scrollable width instead of ending where the visible panel does. */
.ph-diff[data-wrap=false] > div:not(.ph-split){width:max-content;min-width:100%}
.ph-line[data-kind=add]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.ph-line[data-kind=del]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.ph-line[data-kind=meta]{color:var(--dsw-alias-label-tertiary);font-style:italic}
.ph-num{flex:none;width:38px;padding:0 7px;text-align:right;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;user-select:none}
.ph-sign{flex:none;width:15px;text-align:center;color:var(--dsw-alias-label-tertiary);user-select:none}
/* The numbers and the +/\u2212 sit still while a long line scrolls sideways, so the
   gutter never slides off the left edge. Their opaque tint matches the row. */
.ph-line > .ph-num,.ph-line > .ph-sign{position:sticky;z-index:1;background:var(--dsw-alias-bg-base)}
.ph-line > .ph-num{left:0}
.ph-line > .ph-num:nth-child(2){left:38px}
.ph-line > .ph-sign{left:76px}
.ph-line[data-kind=add] > .ph-num,.ph-line[data-kind=add] > .ph-sign{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,var(--dsw-alias-bg-base))}
.ph-line[data-kind=del] > .ph-num,.ph-line[data-kind=del] > .ph-sign{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,var(--dsw-alias-bg-base))}
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
.ph-create{max-width:560px;gap:9px}
.ph-create-head{display:flex;align-items:center;gap:6px;min-width:0}
.ph-create-title{display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0;font-size:13px;font-weight:600}
.ph-create-fields{display:flex;flex-direction:column;gap:8px;min-height:0}
.ph-create-body{min-height:170px;max-height:42vh}
.ph-create-source{display:flex;align-items:center;gap:5px}
.ph-create-source .ph-spinner{width:10px;height:10px}
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
.ph-card{display:flex;flex-direction:column;gap:6px;padding:9px 10px;border:1px solid var(--dsw-alias-border-l3);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}
.ph-card-title{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.ph-card.ph-merge{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 35%,var(--dsw-alias-border-l3));background:color-mix(in srgb,var(--dsw-alias-brand-primary) 6%,var(--dsw-alias-bg-layer-1))}
.ph-merge-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ph-merge-methods{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.ph-prose{margin:0;font-size:11.5px;line-height:1.55;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word}
/* Markdown prose: a code host's description, at the sidebar's size */
.ph-md{display:flex;flex-direction:column;gap:6px;min-width:0;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);word-break:break-word}
.ph-md>*{margin:0;max-width:100%}
.ph-md-h{margin:2px 0 0;font-weight:650;line-height:1.35;color:var(--dsw-alias-label-primary)}
.ph-md-h1{font-size:14.5px}
.ph-md-h2{font-size:13.5px}
.ph-md-h3{font-size:12.5px}
.ph-md-h4,.ph-md-h5,.ph-md-h6{font-size:12px;color:var(--dsw-alias-label-secondary)}
.ph-md-p{margin:0}
.ph-md strong{font-weight:650;color:var(--dsw-alias-label-primary)}
.ph-md del{opacity:.72}
.ph-md-a{color:var(--dsw-alias-brand-primary);text-decoration:none}
.ph-md-a:hover{text-decoration:underline}
a.ph-md-a{word-break:break-word}
.ph-md-code{padding:1px 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px;color:var(--dsw-alias-label-primary)}
.ph-md-code-block{display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l3);border-radius:7px;background:var(--dsw-alias-bg-base);overflow:hidden}
.ph-md-code-info{padding:3px 8px;border-bottom:1px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,monospace;font-size:10px}
.ph-md-pre{margin:0;padding:7px 9px;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px;line-height:1.55;color:var(--dsw-alias-label-primary);white-space:pre}
.ph-md-quote{margin:0;padding:1px 0 1px 8px;border-left:2px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.ph-md-list{margin:0;padding-left:17px}
.ph-md-ul{list-style:disc}
.ph-md-ol{list-style:decimal}
.ph-md-li{margin:2px 0}
.ph-md-li-task{position:relative;margin-left:-14px;padding-left:14px;list-style:none}
.ph-md-task{position:absolute;left:0;top:2px;display:inline-flex;align-items:center;justify-content:center;width:11px;height:11px;border:1.4px solid var(--dsw-alias-border-l1);border-radius:3px;color:transparent}
.ph-md-task[data-done=true]{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}
.ph-md-table-wrap{overflow-x:auto;border:1px solid var(--dsw-alias-border-l3);border-radius:7px}
.ph-md-table{border-collapse:collapse;width:100%;font-size:11px}
.ph-md-th,.ph-md-td{padding:4px 8px;border-right:1px solid var(--dsw-alias-border-l3);border-bottom:1px solid var(--dsw-alias-border-l3);text-align:left;vertical-align:top;word-break:normal;overflow-wrap:break-word}
.ph-md-th{background:var(--dsw-alias-bg-layer-1);font-weight:600;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.ph-md-th:last-child,.ph-md-td:last-child{border-right:0}
.ph-md-table tbody tr:last-child .ph-md-td{border-bottom:0}
.ph-md-img{display:block;max-width:100%;height:auto;border-radius:6px}
.ph-md-rule{margin:2px 0;border:0;border-top:1px solid var(--dsw-alias-border-l3)}
.ph-comment{display:flex;flex-direction:column;gap:3px;padding:6px 0;border-top:1px solid var(--dsw-alias-border-l3)}
.ph-comment:first-of-type{border-top:0}
.ph-comment-head{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-size:10.5px}
.ph-comment-author{color:var(--dsw-alias-label-secondary);font-weight:600}
.ph-check{display:flex;align-items:center;gap:6px;padding:2px 0;font-size:11.5px;min-width:0}
.ph-check-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-check-duration{flex:none;color:var(--dsw-alias-label-tertiary);font-size:10.5px}
.ph-filters{display:flex;align-items:center;gap:4px;padding:6px 10px;flex-wrap:wrap;border-bottom:1px solid var(--dsw-alias-border-l3)}
.ph-filter{padding:2px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:11px}
.ph-filter[aria-pressed=true]{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted)}

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
.ph-wt-toggle{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:11.5px;cursor:pointer}
.ph-wt-toggle input{flex:none;margin:0;cursor:pointer}
.ph-wt-toggle input:disabled{cursor:default}

/* Worktree status above the composer: creation, success, and failure */
.ph-dock{display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);font-size:11.5px;min-width:0}
.ph-dock[data-tone=busy]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,var(--dsw-alias-border-l1))}
.ph-dock[data-tone=success]{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,var(--dsw-alias-bg-layer-1))}
.ph-dock[data-tone=error]{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 7%,var(--dsw-alias-bg-layer-1))}
.ph-dock-icon{display:flex;flex:none;color:var(--dsw-alias-label-secondary)}
.ph-dock[data-tone=success] .ph-dock-icon{color:var(--dsw-alias-state-success-primary)}
.ph-dock[data-tone=error] .ph-dock-icon{color:var(--dsw-alias-state-error-primary)}
.ph-dock-text{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1 1 auto}
.ph-dock-title{font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-dock-detail{color:var(--dsw-alias-label-tertiary);line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-setting{display:flex;flex-direction:column;gap:7px;padding:9px 0}
.ph-setting-head{font-size:12.5px;font-weight:500}
.ph-check-row{display:flex;align-items:center;gap:7px;font-size:12px}
.ph-check-row input{flex:none;margin:0}
.ph-check-row input:disabled+span{opacity:.6}
.ph-ok{margin:0;color:var(--dsw-alias-state-success-primary);font-size:12px}

/* Web Remote card (plugin row) */
.ph-dot[data-state=warn]{background:var(--dsw-alias-state-warn-primary)}
.ph-dot[data-state=idle]{background:var(--dsw-alias-label-tertiary)}
a.ph-button{text-decoration:none;color:var(--dsw-alias-label-secondary)}
.ph-pair{display:flex;flex-direction:column;gap:6px;padding:9px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 35%,var(--dsw-alias-border-l1));border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 6%,var(--dsw-alias-bg-layer-1))}
.ph-pair[data-expired=true]{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.ph-pair-code-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ph-pair-code{flex:1 1 auto;min-width:0;padding:6px 10px;border:1px dashed var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:17px;font-weight:600;letter-spacing:.14em;text-align:center;user-select:all}
.ph-pair[data-expired=true] .ph-pair-code{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}
.ph-fingerprint{font-size:10.5px;word-break:break-all}
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
    return index < 0 ? { dir: "", name: text } : { dir: text.slice(0, index), name: text.slice(index + 1) };
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

  // src/client/web-remote.tsx
  function emptyCardState() {
    return {
      writable: false,
      settings: { enabled: false, relayUrl: "", deviceName: "", effectiveDeviceName: "", autoPair: true },
      status: {
        state: "starting",
        deviceId: "",
        deviceName: "",
        fingerprint: "",
        relayUrl: "",
        paired: false,
        pairedAt: null,
        connectedAt: null,
        pairing: null,
        pairingStatus: null,
        watching: [],
        lastError: null,
        updatedAt: null
      }
    };
  }
  function draftOf(settings) {
    return {
      enabled: settings.enabled,
      relayUrl: settings.relayUrl,
      deviceName: settings.deviceName,
      autoPair: settings.autoPair
    };
  }
  var STATE_KEYS = {
    starting: "webRemoteStateStarting",
    disabled: "webRemoteStateDisabled",
    "waiting-relay": "webRemoteStateWaitingRelay",
    pairing: "webRemoteStatePairing",
    "waiting-pairing": "webRemoteStateWaitingPairing",
    "pairing-required": "webRemoteStatePairingRequired",
    connecting: "webRemoteStateConnecting",
    reconnecting: "webRemoteStateReconnecting",
    connected: "webRemoteStateConnected",
    paired: "webRemoteStatePaired",
    "auth-required": "webRemoteStateAuthRequired",
    revoked: "webRemoteStateRevoked",
    error: "webRemoteStateError",
    stopped: "webRemoteStateStopped",
    disconnected: "webRemoteStateDisconnected"
  };
  function stateTone(state) {
    if (state === "connected" || state === "paired") return "success";
    if (state === "error" || state === "auth-required" || state === "revoked") return "error";
    if (["pairing", "waiting-pairing", "pairing-required", "connecting", "reconnecting", "waiting-relay"].includes(state)) {
      return "warn";
    }
    return "idle";
  }
  function stateLabel(t, state) {
    const key = STATE_KEYS[state];
    return key === void 0 ? state : t(key);
  }
  function countdownText(remainingMs) {
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "0:00";
    const seconds = Math.floor(remainingMs / 1e3);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }
  function relayLooksValid(value) {
    const trimmed = value.trim();
    if (trimmed.length === 0) return true;
    try {
      const url = new URL(trimmed);
      return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "ws:" || url.protocol === "wss:";
    } catch {
      return false;
    }
  }
  function WebRemoteCard(props) {
    const { t, api } = props;
    const [loaded, setLoaded] = useState(void 0);
    const [draft, setDraft] = useState(void 0);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [loadError, setLoadError] = useState("");
    const [notice, setNotice] = useState("");
    const [copied, setCopied] = useState(false);
    const [unpairArmed, setUnpairArmed] = useState(false);
    const visible = useDocumentVisible();
    const now = useNowSecond(true);
    const reload = useCallback(async () => {
      try {
        const value = await api.state({});
        setLoaded(value);
        setLoadError("");
      } catch (failure) {
        setLoadError(messageOf(failure));
      }
    }, [api]);
    useEffect(() => {
      let alive = true;
      const load = async () => {
        await reload();
        if (!alive) return;
      };
      void load();
      if (!visible) {
        return () => {
          alive = false;
        };
      }
      const timer = setInterval(() => void load(), 2e3);
      return () => {
        alive = false;
        clearInterval(timer);
      };
    }, [reload, visible]);
    useEffect(() => {
      if (loaded === void 0 || dirty) return;
      setDraft(draftOf(loaded.settings));
    }, [loaded, dirty]);
    const changeDraft = (patch) => {
      setDraft((current) => ({ ...current ?? draftOf(emptyCardState().settings), ...patch }));
      setDirty(true);
      setNotice("");
      setError("");
    };
    const run = async (label, task, done) => {
      setBusy(label);
      setError("");
      setNotice("");
      try {
        await task();
        setNotice(done);
      } catch (failure) {
        setError(t("webRemoteActionFailed", { message: messageOf(failure) }));
      } finally {
        setBusy("");
      }
    };
    const save = () => {
      const value = draft ?? draftOf(emptyCardState().settings);
      if (!relayLooksValid(value.relayUrl)) {
        setError(t("webRemoteRelayInvalid"));
        return;
      }
      void run("save", async () => {
        try {
          const answer = await api.settingsSet(value);
          setLoaded((current) => current === void 0 ? current : { ...current, settings: answer.settings });
          setDraft(draftOf(answer.settings));
        } catch (failure) {
          const code = codeOf(failure);
          if (code !== "connection/failed" && code !== "connection/empty") throw failure;
        }
        setDirty(false);
      }, t("webRemoteSaved"));
    };
    const pair = () => {
      void run("pair", async () => {
        await api.pair({});
      }, "");
    };
    const cancelPairing = () => {
      void run("cancel", async () => {
        await api.pairCancel({});
      }, "");
    };
    const unpair = () => {
      setUnpairArmed(false);
      void run("unpair", async () => {
        await api.unpair({});
      }, t("webRemoteUnpaired"));
    };
    const copyCode = () => {
      const code = loaded?.status.pairing?.code ?? "";
      if (code.length === 0) return;
      void copyText(code).then((ok) => {
        setCopied(ok);
        if (ok) setTimeout(() => setCopied(false), 2e3);
      });
    };
    if (props.view === "summary") return h("span", null, t("webRemoteSummary"));
    if (loaded === void 0) {
      return h(
        "div",
        { "data-personal-hub-web-remote": true, style: { display: "flex", flexDirection: "column", gap: "6px" } },
        h("div", { className: "ph-setting-head" }, t("webRemoteTitle")),
        h("p", { className: "ph-hint" }, t("webRemoteLoading")),
        loadError.length > 0 ? h("p", { className: "ph-hint" }, t("webRemoteUnavailable")) : null
      );
    }
    return h(WebRemoteForm, {
      t,
      state: loaded,
      draft: draft ?? draftOf(loaded.settings),
      dirty,
      busy,
      error,
      notice,
      copied,
      unpairArmed,
      now,
      stale: loadError.length > 0,
      onDraft: changeDraft,
      onSave: save,
      onRefresh: () => void reload(),
      onPair: pair,
      onCancelPairing: cancelPairing,
      onArmUnpair: () => setUnpairArmed(true),
      onCancelUnpair: () => setUnpairArmed(false),
      onUnpair: unpair,
      onCopyCode: copyCode
    });
  }
  function WebRemoteForm(props) {
    const { t, state, draft } = props;
    const status = state.status;
    const writable = state.writable;
    const busy = props.busy;
    const paired = status.paired;
    const pairing = status.pairing;
    const remaining = pairing === null ? 0 : Date.parse(pairing.expiresAt) - props.now;
    const expired = pairing !== null && remaining <= 0;
    const off = status.state === "disabled";
    const relayMissing = status.relayUrl.length === 0;
    return h(
      "div",
      { "data-personal-hub-web-remote": true, style: { display: "flex", flexDirection: "column", gap: "8px" } },
      h("div", { className: "ph-setting-head" }, t("webRemoteTitle")),
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" } },
        h("span", { className: "ph-dot", "data-state": stateTone(status.state) }),
        h("span", null, stateLabel(t, status.state)),
        paired ? h("span", { className: "ph-chip", "data-tone": "success" }, t("webRemotePairedBadge")) : null,
        h("button", {
          type: "button",
          className: "ph-icon-button",
          title: t("webRemoteRefresh"),
          "aria-label": t("webRemoteRefresh"),
          disabled: busy.length > 0,
          onClick: props.onRefresh
        }, h(Icon, { name: "refresh", size: 11 }))
      ),
      h("p", { className: "ph-hint" }, t("webRemoteIntro")),
      props.stale ? h("p", { className: "ph-hint" }, t("webRemoteStale")) : null,
      pairing === null ? null : h(PairBlock, { t, pairing, remaining, expired, copied: props.copied, busy, onCopy: props.onCopyCode, onCancel: props.onCancelPairing }),
      // A cancelled or finished attempt leaves a note without a code to show.
      pairing === null && status.pairingStatus === "cancelled" ? h("p", { className: "ph-hint" }, t("webRemotePairCancelled")) : null,
      relayMissing || off ? h("p", { className: "ph-hint" }, off ? t("webRemoteDisabledHint") : t("webRemoteNoRelayHint")) : h(StatusDetails, { t, status, paired, busy, unpairArmed: props.unpairArmed, onPair: props.onPair, onArmUnpair: props.onArmUnpair, onCancelUnpair: props.onCancelUnpair, onUnpair: props.onUnpair }),
      h(
        "div",
        { className: "ph-setting" },
        h("div", { className: "ph-setting-head" }, t("webRemoteSettingsTitle")),
        h(
          "label",
          { className: "ph-check-row" },
          h("input", {
            type: "checkbox",
            checked: draft.enabled,
            disabled: !writable || busy.length > 0,
            onChange: (event) => props.onDraft({ enabled: event.target.checked })
          }),
          h("span", null, t("webRemoteEnabled"))
        ),
        h(
          "div",
          { className: "ph-field" },
          h("label", { className: "ph-field-label", htmlFor: "personal-hub-web-relay" }, t("webRemoteRelayLabel")),
          h("input", {
            id: "personal-hub-web-relay",
            className: "ph-input",
            type: "url",
            inputMode: "url",
            autoComplete: "off",
            spellCheck: false,
            value: draft.relayUrl,
            placeholder: t("webRemoteRelayPlaceholder"),
            disabled: !writable || busy.length > 0,
            onInput: (event) => props.onDraft({ relayUrl: event.target.value }),
            onChange: (event) => props.onDraft({ relayUrl: event.target.value })
          })
        ),
        h(
          "div",
          { className: "ph-field" },
          h("label", { className: "ph-field-label", htmlFor: "personal-hub-web-name" }, t("webRemoteDeviceLabel")),
          h("input", {
            id: "personal-hub-web-name",
            className: "ph-input",
            type: "text",
            autoComplete: "off",
            spellCheck: false,
            value: draft.deviceName,
            placeholder: status.deviceName.length > 0 ? status.deviceName : t("webRemoteDevicePlaceholder"),
            disabled: !writable || busy.length > 0,
            onInput: (event) => props.onDraft({ deviceName: event.target.value }),
            onChange: (event) => props.onDraft({ deviceName: event.target.value })
          })
        ),
        h(
          "label",
          { className: "ph-check-row" },
          h("input", {
            type: "checkbox",
            checked: draft.autoPair,
            disabled: !writable || busy.length > 0,
            onChange: (event) => props.onDraft({ autoPair: event.target.checked })
          }),
          h("span", null, t("webRemoteAutoPair"))
        ),
        h("p", { className: "ph-hint" }, t("webRemoteRelayHint")),
        writable ? h(
          "div",
          { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
          h("button", {
            type: "button",
            className: "ph-primary",
            disabled: busy.length > 0 || !props.dirty,
            onClick: props.onSave
          }, busy === "save" ? t("webRemoteSaving") : t("webRemoteSave"))
        ) : h("p", { className: "ph-hint" }, t("webRemoteReadOnly"))
      ),
      props.error.length > 0 ? h("p", { className: "ph-error-text" }, props.error) : null,
      props.notice.length > 0 ? h("p", { className: "ph-ok" }, props.notice) : null
    );
  }
  function PairBlock(props) {
    const { t, pairing } = props;
    return h(
      "div",
      { className: "ph-pair", "data-expired": props.expired },
      h("div", { className: "ph-setting-head" }, t("webRemotePairTitle")),
      h("p", { className: "ph-hint" }, t("webRemotePairStep")),
      h(
        "div",
        { className: "ph-pair-code-row" },
        h("code", { className: "ph-pair-code" }, pairing.code),
        h("button", {
          type: "button",
          className: "ph-button",
          disabled: props.busy.length > 0,
          onClick: props.onCopy
        }, h(Icon, { name: "copy", size: 11 }), props.copied ? t("webRemotePairCopied") : t("webRemotePairCopy"))
      ),
      h(
        "p",
        { className: "ph-hint" },
        props.expired ? t("webRemotePairExpired") : t("webRemotePairExpires", { time: countdownText(props.remaining) })
      ),
      h(
        "div",
        { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
        h("a", {
          className: "ph-button",
          href: pairing.uri,
          target: "_blank",
          rel: "noreferrer"
        }, h(Icon, { name: "external", size: 11 }), t("webRemotePairOpen")),
        h("button", {
          type: "button",
          className: "ph-button",
          disabled: props.busy.length > 0,
          onClick: props.onCancel
        }, t("webRemotePairCancel"))
      )
    );
  }
  function StatusDetails(props) {
    const { t, status } = props;
    const pairingBusy = props.busy === "pair" || props.busy === "cancel" || props.busy === "unpair";
    return h(
      "div",
      { className: "ph-setting" },
      h(
        "div",
        { className: "ph-detail-meta" },
        h(
          "div",
          { className: "ph-detail-row" },
          h("span", { className: "ph-detail-label" }, t("webRemoteDevice")),
          h("span", { className: "ph-detail-value" }, status.deviceName)
        ),
        status.fingerprint.length > 0 ? h(
          "div",
          { className: "ph-detail-row" },
          h("span", { className: "ph-detail-label" }, t("webRemoteFingerprint")),
          h("span", { className: "ph-detail-value ph-mono ph-fingerprint" }, status.fingerprint)
        ) : null,
        status.connectedAt === null ? null : h(
          "div",
          { className: "ph-detail-row" },
          h("span", { className: "ph-detail-label" }, t("webRemoteConnection")),
          h("span", { className: "ph-detail-value" }, t("webRemoteConnectedAt", { when: relativeTime(status.connectedAt) }))
        ),
        status.pairedAt === null ? null : h(
          "div",
          { className: "ph-detail-row" },
          h("span", { className: "ph-detail-label" }, t("webRemotePaired")),
          h("span", { className: "ph-detail-value" }, t("webRemotePairedAt", { when: relativeTime(status.pairedAt) }))
        ),
        h(
          "div",
          { className: "ph-detail-row" },
          h("span", { className: "ph-detail-label" }, t("webRemoteWatching")),
          h("span", { className: "ph-detail-value" }, status.watching.length > 0 ? t("webRemoteWatchingCount", { count: status.watching.length }) : t("webRemoteWatchingNone"))
        ),
        status.lastError === null ? null : h(
          "div",
          { className: "ph-detail-row" },
          h("span", { className: "ph-detail-label" }, t("webRemoteLastError")),
          h("span", { className: "ph-detail-value ph-error-text" }, status.lastError)
        )
      ),
      h(
        "div",
        { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
        h("button", {
          type: "button",
          className: "ph-button",
          disabled: pairingBusy || props.busy.length > 0 || status.pairing !== null,
          onClick: props.onPair
        }, h(Icon, { name: "refresh", size: 11 }), props.paired ? t("webRemotePairAgain") : t("webRemotePairNow")),
        props.paired ? props.unpairArmed ? h(
          "span",
          { className: "ph-wrap" },
          h("span", { className: "ph-hint" }, t("webRemoteUnpairConfirm")),
          h("button", {
            type: "button",
            className: "ph-button",
            disabled: props.busy.length > 0,
            onClick: props.onUnpair
          }, t("webRemoteUnpairYes")),
          h("button", {
            type: "button",
            className: "ph-button",
            disabled: props.busy.length > 0,
            onClick: props.onCancelUnpair
          }, t("webRemoteUnpairCancel"))
        ) : h("button", {
          type: "button",
          className: "ph-button",
          disabled: props.busy.length > 0,
          onClick: props.onArmUnpair
        }, h(Icon, { name: "cross", size: 11 }), t("webRemoteUnpair")) : null
      ),
      status.relayUrl.length > 0 ? h("a", { className: "ph-hint", href: status.relayUrl, target: "_blank", rel: "noreferrer" }, t("webRemoteOpenWebChat")) : null
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
      writable: false,
      forge: "auto",
      gitlabHosts: [],
      cliPath: ""
    };
  }
  function parseHostList(value) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const item of value.split(/[\s,]+/)) {
      const host = item.trim().replace(/\/+$/, "");
      if (host.length === 0 || seen.has(host.toLowerCase())) continue;
      seen.add(host.toLowerCase());
      result.push(host);
    }
    return result;
  }
  function MergeSettingsCard(props) {
    const { t, api } = props;
    const [settings, setSettings] = useState(void 0);
    const [status, setStatus] = useState("loading");
    const [runningCleanup, setRunningCleanup] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [hostsText, setHostsText] = useState("");
    useEffect(() => {
      let alive = true;
      api.mergeSettings({}).then((value2) => {
        if (!alive) return;
        setSettings(value2);
        setHostsText(value2.gitlabHosts.join(", "));
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
        return {
          ...base,
          ...patch.merge ?? {},
          ...patch.forge ?? {},
          cleanup
        };
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
          cleanup: settings?.cleanup ?? {},
          forge: settings?.forge ?? "auto",
          gitlabHosts: settings?.gitlabHosts ?? [],
          cliPath: settings?.cliPath ?? ""
        });
        setSettings((current) => ({
          ...current ?? emptySettings(),
          ...value2.merged,
          cleanup: value2.cleanup,
          ...value2.forge
        }));
        setHostsText(value2.forge.gitlabHosts.join(", "));
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
      hostsText,
      status,
      error,
      notice,
      runningCleanup,
      onChange: update,
      onHostsText: (text) => {
        setHostsText(text);
        update({ forge: { gitlabHosts: parseHostList(text) } });
      },
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
        h("div", { className: "ph-setting-head" }, t("gitCodeHost")),
        h(
          "label",
          { className: "ph-field" },
          h("span", { className: "ph-field-label" }, t("gitCodeHostProvider")),
          h(
            "select",
            {
              className: "ph-select",
              value: settings.forge,
              disabled,
              onChange: (event) => props.onChange({
                forge: { forge: event.target.value }
              })
            },
            h("option", { value: "auto" }, t("gitCodeHostAuto")),
            h("option", { value: "github" }, "GitHub"),
            h("option", { value: "gitlab" }, "GitLab"),
            h("option", { value: "none" }, t("gitCodeHostNone"))
          )
        ),
        h(
          "label",
          { className: "ph-field" },
          h("span", { className: "ph-field-label" }, t("gitCodeHostGitlabHosts")),
          h("input", {
            className: "ph-input",
            value: props.hostsText,
            placeholder: "gitlab.example.com",
            spellcheck: false,
            disabled,
            onInput: (event) => props.onHostsText(event.target.value),
            onChange: (event) => props.onHostsText(event.target.value)
          })
        ),
        h("p", { className: "ph-hint" }, t("gitCodeHostHint")),
        h(
          "label",
          { className: "ph-field" },
          h("span", { className: "ph-field-label" }, t("gitCodeHostCli")),
          h("input", {
            className: "ph-input",
            value: settings.cliPath,
            placeholder: "gh / glab",
            spellcheck: false,
            disabled,
            onInput: (event) => props.onChange({ forge: { cliPath: event.target.value } }),
            onChange: (event) => props.onChange({ forge: { cliPath: event.target.value } })
          })
        )
      ),
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

  // src/client/auto-archive.tsx
  var EMPTY_SETTINGS = {
    enabled: true,
    inactiveDays: 2,
    checkMs: 36e5,
    skipActive: true,
    archiveRunning: false,
    archiveBlank: true,
    dryRun: false,
    maxPerPass: 50
  };
  var MAX_DAYS = 3650;
  var MIN_CHECK_MS = 6e4;
  var MAX_CHECK_MS = 864e5;
  function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.round(value)));
  }
  function AutoArchiveCard(props) {
    const { api, t } = props;
    const [settings, setSettings] = useState(void 0);
    const [last, setLast] = useState(null);
    const [writable, setWritable] = useState(false);
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [running, setRunning] = useState(false);
    useEffect(() => {
      let alive = true;
      api.state({}).then((state) => {
        if (!alive) return;
        setSettings(state.settings);
        setLast(state.last);
        setWritable(state.writable);
        setStatus("ready");
      }).catch((failure) => {
        if (!alive) return;
        setError(`${t("aaLoadFailed")}: ${messageOf(failure)}`);
        setStatus("error");
      });
      return () => {
        alive = false;
      };
    }, [api, t]);
    if (props.view === "summary") return h("span", null, t("aaSummary"));
    const value = settings ?? EMPTY_SETTINGS;
    const update = (patch) => {
      setSettings((current) => ({ ...current ?? EMPTY_SETTINGS, ...patch }));
    };
    const save = async () => {
      setStatus("saving");
      setError("");
      setNotice("");
      try {
        const answer = await api.settingsSet(value);
        setSettings(answer.settings);
        setStatus("ready");
        setNotice(t("aaSaved"));
      } catch (failure) {
        setStatus("ready");
        setError(`${t("aaSaveFailed")}: ${messageOf(failure)}`);
      }
    };
    const run = async () => {
      setRunning(true);
      setError("");
      setNotice("");
      try {
        const answer = await api.runNow({});
        setLast(answer.last);
        if (!answer.ran) setNotice(t("aaOff"));
        else if (answer.last !== null) {
          setNotice(t("aaRunDone", {
            archived: answer.last.archivedCount,
            failed: answer.last.failedCount
          }));
        }
      } catch (failure) {
        setError(`${t("aaRunFailed")}: ${messageOf(failure)}`);
      } finally {
        setRunning(false);
      }
    };
    if (status === "loading") return h("p", { className: "ph-hint" }, t("gitLoading"));
    return h(AutoArchiveForm, {
      t,
      settings: value,
      last,
      writable,
      status,
      error,
      notice,
      running,
      onChange: update,
      onSave: () => void save(),
      onRun: () => void run()
    });
  }
  function AutoArchiveForm(props) {
    const { t, settings } = props;
    const disabled = !props.writable || props.status === "saving";
    const minutes = Math.round(settings.checkMs / 6e4);
    return h(
      "div",
      { "data-personal-hub-auto-archive": true, className: "ph-setting" },
      h("div", { className: "ph-setting-head" }, t("aaTitle")),
      h("p", { className: "ph-hint" }, t("aaIntro")),
      h(
        "label",
        { className: "ph-check-row" },
        h("input", {
          type: "checkbox",
          checked: settings.enabled,
          disabled,
          onChange: (event) => props.onChange({ enabled: event.target.checked })
        }),
        h("span", null, t("aaEnabled"))
      ),
      h(
        "label",
        { className: "ph-field" },
        h("span", { className: "ph-field-label" }, t("aaInactiveDays")),
        h("input", {
          className: "ph-input",
          type: "number",
          min: 0,
          max: MAX_DAYS,
          value: settings.inactiveDays,
          disabled: disabled || !settings.enabled,
          onChange: (event) => props.onChange({
            inactiveDays: clamp(Number(event.target.value), 0, MAX_DAYS)
          })
        }),
        h("span", { className: "ph-hint" }, t("aaInactiveDaysHint"))
      ),
      h(
        "label",
        { className: "ph-field" },
        h("span", { className: "ph-field-label" }, t("aaCheckMinutes")),
        h("input", {
          className: "ph-input",
          type: "number",
          min: 1,
          max: MAX_CHECK_MS / 6e4,
          value: minutes,
          disabled: disabled || !settings.enabled,
          onChange: (event) => props.onChange({
            checkMs: clamp(Number(event.target.value) * 6e4, MIN_CHECK_MS, MAX_CHECK_MS)
          })
        }),
        h("span", { className: "ph-hint" }, t("aaCheckMinutesHint"))
      ),
      h(
        "label",
        { className: "ph-check-row" },
        h("input", {
          type: "checkbox",
          checked: settings.skipActive,
          disabled: disabled || !settings.enabled,
          onChange: (event) => props.onChange({ skipActive: event.target.checked })
        }),
        h("span", null, t("aaSkipActive"))
      ),
      h(
        "label",
        { className: "ph-check-row" },
        h("input", {
          type: "checkbox",
          checked: settings.archiveBlank,
          disabled: disabled || !settings.enabled,
          onChange: (event) => props.onChange({ archiveBlank: event.target.checked })
        }),
        h("span", null, t("aaBlank"))
      ),
      h(
        "label",
        { className: "ph-check-row" },
        h("input", {
          type: "checkbox",
          checked: settings.archiveRunning,
          disabled: disabled || !settings.enabled,
          onChange: (event) => props.onChange({ archiveRunning: event.target.checked })
        }),
        h("span", null, t("aaRunning"))
      ),
      h(
        "label",
        { className: "ph-check-row" },
        h("input", {
          type: "checkbox",
          checked: settings.dryRun,
          disabled: disabled || !settings.enabled,
          onChange: (event) => props.onChange({ dryRun: event.target.checked })
        }),
        h("span", null, t("aaDryRun"))
      ),
      h(
        "div",
        { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
        h("button", {
          type: "button",
          className: "ph-primary",
          disabled,
          onClick: props.onSave
        }, props.status === "saving" ? t("aaSaving") : t("aaSave")),
        h("button", {
          type: "button",
          className: "ph-button",
          disabled: disabled || !settings.enabled || props.running,
          onClick: props.onRun
        }, props.running ? t("aaRunningNow") : t("aaRunNow"))
      ),
      h(
        "p",
        { className: "ph-hint" },
        props.last === null ? t("aaNever") : props.last.dryRun ? t("aaLastDry", { scanned: props.last.scanned, due: props.last.due }) : t("aaLast", {
          scanned: props.last.scanned,
          archived: props.last.archivedCount,
          failed: props.last.failedCount,
          active: props.last.activeCount
        })
      ),
      settings.enabled ? null : h("p", { className: "ph-hint" }, t("aaOffHint")),
      h("p", { className: "ph-hint" }, t("aaRestoreHint")),
      props.error.length > 0 ? h("p", { className: "ph-error-text" }, props.error) : null,
      props.notice.length > 0 ? h("p", { className: "ph-ok" }, props.notice) : null
    );
  }

  // src/client/worktree.tsx
  var DOCK_POLL_MS = 1200;
  var DOCK_SUCCESS_MS = 8e3;
  function WorktreeOption(props) {
    const { t, info } = props;
    if (info.enabled !== true || info.supported !== true) {
      return info.reason === "linked-project" ? h("span", { className: "ph-hint ph-tiny", "data-personal-hub-worktree": true }, t("wtLinkedProject")) : null;
    }
    const current = info.current ?? null;
    const bases = props.source === "remote" ? info.bases?.remote ?? [] : info.bases?.local ?? [];
    const options = bases.map((item) => ({
      value: props.source === "remote" ? item.branch : item.name,
      label: item.name
    }));
    if (props.base.length > 0 && !options.some((option) => option.value === props.base)) {
      options.unshift({ value: props.base, label: props.base });
    }
    const creating = info.creating ?? null;
    return h(
      "span",
      { className: "ph-wrap", "data-personal-hub-worktree": true },
      current === null ? h(
        "label",
        {
          className: "ph-check-inline ph-wt-toggle",
          title: t("wtAutoHint")
        },
        h("input", {
          type: "checkbox",
          checked: props.wanted,
          disabled: props.busy,
          onChange: (event) => props.onToggle(event.target.checked)
        }),
        h(Icon, { name: "branch", size: 11 }),
        h("span", null, t("wtAuto"))
      ) : h(
        "span",
        { className: "ph-chip ph-mono", title: String(current.path ?? "") },
        h(Icon, { name: "branch", size: 11 }),
        h("span", { className: "ph-ellipsis" }, String(current.branch ?? ""))
      ),
      props.wanted || current !== null ? h("select", {
        className: "ph-select",
        style: { width: "auto", maxWidth: "168px" },
        value: props.base,
        disabled: props.busy || options.length === 0 || current !== null,
        "aria-label": t("wtBase"),
        title: t("wtBase"),
        onChange: (event) => props.onBase(event.target.value)
      }, options.length === 0 ? h("option", { value: "" }, t("wtNoBase")) : options.map((option) => h("option", { key: option.value, value: option.value }, option.label))) : null,
      props.wanted || current !== null ? h(
        "div",
        { style: { display: "inline-flex", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: "7px", overflow: "hidden" } },
        ["local", "remote"].map((kind) => h("button", {
          key: kind,
          type: "button",
          className: "ph-filter",
          style: { border: 0, borderRadius: 0 },
          "aria-pressed": props.source === kind ? "true" : "false",
          disabled: props.busy || current !== null,
          onClick: () => props.onSource(kind)
        }, kind === "remote" ? t("wtRemote") : t("wtLocal")))
      ) : null,
      creating === null ? null : h(
        "span",
        { className: "ph-chip", "data-tone": "business" },
        h("span", { className: "ph-spinner" }),
        t("wtCreatingBranch", { branch: creating.branch })
      ),
      props.error.length > 0 ? h("span", { className: "ph-error-text" }, props.error) : null,
      current !== null && props.notice.length > 0 ? h("span", { className: "ph-ok ph-tiny" }, props.notice) : null
    );
  }
  function WorktreeHero(props) {
    const { t, api } = props;
    const sessionId = typeof props.sessionId === "string" ? props.sessionId : typeof props.session?.id === "string" ? props.session.id : "";
    const cwd = typeof props.useSessions === "function" ? props.useSessions((snapshot) => snapshot?.byId?.[sessionId]?.cwd ?? "") : "";
    const [info, setInfo] = useState(void 0);
    const [wanted, setWanted] = useState(false);
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
        setSource(value.request?.source ?? value.sourceDefault ?? "local");
        setBase(value.request?.base ?? value.bases?.defaultBase ?? "");
        setWanted(value.request === null || value.request === void 0 ? value.auto !== false : value.request.enabled);
      }).catch(() => {
        if (alive) setInfo(void 0);
      });
      return () => {
        alive = false;
      };
    }, [api, sessionId, cwd]);
    const apply = useCallback(async (next) => {
      if (sessionId.length === 0) return;
      setBusy(true);
      setError("");
      setNotice("");
      try {
        await api.worktreeRequest({
          sessionId,
          cwd: cwd || void 0,
          enabled: next.wanted,
          base: next.base,
          source: next.source
        });
        setWanted(next.wanted);
        setBase(next.base);
        setSource(next.source);
        setNotice(next.wanted ? t("wtNextMessage", { branch: next.base.length > 0 ? next.base : t("wtDefaultBranch") }) : t("wtOff"));
      } catch (failure) {
        setError(`${t("wtFailed")}: ${messageOf(failure)}`);
      } finally {
        setBusy(false);
      }
    }, [api, sessionId, cwd, t]);
    if (sessionId.length === 0 || info === void 0) return null;
    return h(WorktreeOption, {
      t,
      info,
      source,
      base,
      wanted,
      busy,
      error,
      notice,
      onToggle: (next) => void apply({ wanted: next, base, source }),
      onBase: (value) => void apply({ wanted, base: value, source }),
      onSource: (kind) => {
        const list = kind === "remote" ? info.bases?.remote ?? [] : info.bases?.local ?? [];
        const preferred = info.bases?.defaultBase ?? "";
        const names = list.map((item) => kind === "remote" ? item.branch : item.name);
        const next = names.includes(preferred) ? preferred : names[0] ?? "";
        void apply({ wanted, base: next, source: kind });
      }
    });
  }
  function WorktreeDockCard(props) {
    const { t } = props;
    const failed = props.request !== null && props.request.error !== null && props.request.error !== void 0;
    if (!failed && props.creating === null && props.created.length === 0) return null;
    const detail = props.creating === null ? failed ? t("wtDockFailedHint", { base: props.request?.base.length === 0 ? t("wtDefaultBranch") : String(props.request?.base) }) : t("wtDockCreatedHint") : t("wtDockHint", {
      base: props.creating.remote ? `${props.creating.remote}/${props.creating.base ?? ""}` : String(props.creating.base ?? "")
    });
    const title = props.creating === null ? failed ? t("wtDockFailed") : t("wtDockCreated", { branch: props.created }) : t("wtDockCreating", { branch: props.creating.branch });
    return h(
      "div",
      {
        className: "ph-dock",
        "data-tone": failed ? "error" : props.creating === null ? "success" : "busy",
        role: props.creating === null && !failed ? "status" : void 0
      },
      h(
        "span",
        { className: "ph-dock-icon" },
        props.creating === null ? h(Icon, { name: failed ? "alert" : "check", size: 13 }) : h("span", { className: "ph-spinner" })
      ),
      h(
        "span",
        { className: "ph-dock-text" },
        h("span", { className: "ph-dock-title" }, title),
        h("span", { className: "ph-dock-detail" }, detail)
      ),
      props.error.length > 0 ? h("span", { className: "ph-error-text" }, props.error) : null,
      h("span", { className: "ph-spacer" }),
      failed ? h("button", {
        type: "button",
        className: "ph-button",
        disabled: props.busy,
        onClick: props.onContinue
      }, t("wtDockContinue")) : null,
      failed ? h("button", {
        type: "button",
        className: "ph-primary",
        disabled: props.busy,
        onClick: props.onRetry
      }, t("wtDockRetry")) : h("button", {
        type: "button",
        className: "ph-icon-button",
        title: t("wtDockDismiss"),
        "aria-label": t("wtDockDismiss"),
        onClick: props.onDismiss
      }, h(Icon, { name: "cross", size: 11 }))
    );
  }
  function WorktreeDock(props) {
    const { t, api } = props;
    const sessionId = typeof props.sessionId === "string" ? props.sessionId : typeof props.session?.id === "string" ? props.session.id : "";
    const cwd = typeof props.useSessions === "function" ? props.useSessions((snapshot) => snapshot?.byId?.[sessionId]?.cwd ?? "") : "";
    const [info, setInfo] = useState(void 0);
    const [created, setCreated] = useState("");
    const [hidden, setHidden] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const creating = info?.creating ?? null;
    const request = info?.request ?? null;
    const waiting = info !== void 0 && info.current === null && (creating !== null || request !== null && request.enabled && request.error === null);
    const fresh = info !== void 0 && info.current === null && info.started !== true && info.supported === true;
    const poll = waiting || fresh;
    useEffect(() => {
      if (sessionId.length === 0 || !poll) return void 0;
      let alive = true;
      let stopped = false;
      const load = async () => {
        try {
          const value = await api.worktreeState({ sessionId, cwd: cwd || void 0, lite: true });
          if (!alive) return;
          setInfo(value);
          if (value.current !== null && value.current !== void 0) {
            setCreated(value.current.branch);
            stopped = true;
          }
        } catch {
        }
      };
      void load();
      const timer = setInterval(() => {
        if (stopped) return;
        void load();
      }, DOCK_POLL_MS);
      return () => {
        alive = false;
        clearInterval(timer);
      };
    }, [api, sessionId, cwd, poll]);
    useEffect(() => {
      if (created.length === 0) return void 0;
      const timer = setTimeout(() => setCreated(""), DOCK_SUCCESS_MS);
      return () => clearTimeout(timer);
    }, [created]);
    useEffect(() => {
      if (sessionId.length === 0 || info !== void 0) return void 0;
      let alive = true;
      api.worktreeState({ sessionId, cwd: cwd || void 0, lite: true }).then((value) => {
        if (alive) setInfo(value);
      }).catch(() => void 0);
      return () => {
        alive = false;
      };
    }, [api, sessionId, cwd, info]);
    const retry = async () => {
      setBusy(true);
      setError("");
      try {
        const answer = await api.worktreeRequest({ sessionId, cwd: cwd || void 0, enabled: true, retry: true });
        setInfo((previous) => previous === void 0 ? previous : { ...previous, request: answer.request });
        setHidden(false);
      } catch (failure) {
        setError(messageOf(failure));
      } finally {
        setBusy(false);
      }
    };
    const continueHere = async () => {
      setBusy(true);
      try {
        const answer = await api.worktreeRequest({ sessionId, cwd: cwd || void 0, enabled: false });
        setInfo((previous) => previous === void 0 ? previous : { ...previous, request: answer.request });
        setHidden(true);
      } catch (failure) {
        setError(messageOf(failure));
      } finally {
        setBusy(false);
      }
    };
    if (hidden || sessionId.length === 0 || info === void 0) return null;
    return h(WorktreeDockCard, {
      t,
      creating,
      request,
      created,
      busy,
      error,
      onRetry: () => void retry(),
      onContinue: () => void continueHere(),
      onDismiss: () => setHidden(true)
    });
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
    const isBehind = status.behind > 0;
    const isAhead = status.ahead > 0 || !status.hasUpstream && status.aheadOfDefault > 0;
    const isDiverged = status.ahead > 0 && isBehind;
    const hasDefaultDelta = (status.aheadOfDefault || status.ahead) > 0;
    if (hasChanges) {
      if (isBehind || !status.hasUpstream && !status.hasPrimaryRemote) {
        return { labelKey: "gitActionCommit", disabled: false, kind: "run_action", action: "commit" };
      }
      if (hasOpenPr) {
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
      if (hasOpenPr) {
        return { labelKey: "gitActionPush", disabled: false, kind: "run_action", action: "push" };
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
      if (hasOpenPr) {
        return { labelKey: "gitActionPush", disabled: false, kind: "run_action", action: "push" };
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
  function resolvePrAction(status, isRunning) {
    if (isRunning) return { enabled: false, hintKey: "gitHintBusy" };
    if (status === null) return { enabled: false, hintKey: "gitHintNoStatus" };
    if (status.branch === null) return { enabled: false, hintKey: "gitHintNoBranch" };
    if (!status.hasPrimaryRemote) return { enabled: false, hintKey: "gitHintNoRemote" };
    if (status.prState === "open") return { enabled: false, hintKey: "gitHintOpenPr" };
    if (status.behind > 0) {
      return { enabled: false, hintKey: status.ahead > 0 ? "gitHintDiverged" : "gitHintBehindPr" };
    }
    if ((status.aheadOfDefault || status.ahead) === 0) return { enabled: false, hintKey: "gitHintNoPrCommits" };
    return { enabled: true };
  }
  function buildActionMenuItems(status, isRunning) {
    if (status === null) return [];
    const busy = isRunning;
    const hasBranch = status.branch !== null;
    const canCommit = !busy && status.hasWorkingTreeChanges;
    const canPush = !busy && hasBranch && status.behind === 0 && (status.ahead > 0 || !status.hasUpstream && status.aheadOfDefault > 0) && (status.hasUpstream || status.hasPrimaryRemote);
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
    const prAction = resolvePrAction(status, isRunning);
    const pr = {
      id: "pr",
      labelKey: "gitActionCreatePr",
      disabled: !prAction.enabled,
      disabledHintKey: prAction.hintKey
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
  function CreatePullButton(props) {
    const { t } = props;
    const hint = props.enabled || props.hintKey === void 0 ? "" : t(props.hintKey);
    const visible = hint.length > 0 && props.showHint !== false;
    return h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 } },
      h(
        "button",
        {
          type: "button",
          className: "ph-button",
          style: { width: "100%", justifyContent: "center" },
          disabled: !props.enabled,
          title: hint.length > 0 ? hint : void 0,
          "aria-label": t("gitActionCreatePr"),
          onClick: props.onClick
        },
        h(Icon, { name: "merge", size: 12 }),
        h("span", { className: "ph-ellipsis" }, t("gitActionCreatePr"))
      ),
      visible ? h("p", { className: "ph-hint", style: { textAlign: "center" } }, hint) : null
    );
  }
  function DefaultBranchDialog(props) {
    const { t } = props;
    const title = props.action === "push" ? t("gitDefaultPushTitle", { branch: props.branch }) : props.action === "create_pr" || props.action === "commit_push_pr" ? t("gitDefaultPrTitle", { branch: props.branch }) : t("gitDefaultTitle", { branch: props.branch });
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
          h(
            "button",
            { type: "button", className: "ph-button", disabled: props.busy, onClick: props.onContinue },
            t("gitDefaultContinue", { branch: props.branch })
          ),
          // A request needs a branch of its own, so the feature-branch path is the
          // default answer; continuing on the default branch stays available but
          // secondary.
          h(
            "button",
            { type: "button", className: "ph-primary", disabled: props.busy, onClick: props.onFeatureBranch },
            t("gitDefaultFeature")
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
        parts.dir.length > 0 ? [
          h("span", { className: "ph-file-dir", key: "dir" }, parts.dir),
          h("span", { className: "ph-file-sep", key: "sep" }, "/")
        ] : null,
        h("span", { className: "ph-file-name" }, parts.name)
      ),
      h(Counts, { additions: file.additions, deletions: file.deletions }),
      props.onStage === void 0 && props.onUnstage === void 0 && props.onDiscard === void 0 ? null : h(
        "div",
        { className: "ph-file-actions" },
        props.staged === true ? h("button", {
          type: "button",
          className: "ph-icon-button",
          title: t("gitUnstage"),
          "aria-label": t("gitUnstage"),
          disabled: props.actionBusy === true || props.onUnstage === void 0,
          onClick: (event) => {
            event.stopPropagation();
            props.onUnstage?.();
          }
        }, h(Icon, { name: "cross", size: 12 })) : h("button", {
          type: "button",
          className: "ph-icon-button",
          title: t("gitStage"),
          "aria-label": t("gitStage"),
          disabled: props.actionBusy === true || props.onStage === void 0,
          onClick: (event) => {
            event.stopPropagation();
            props.onStage?.();
          }
        }, h(Icon, { name: "plus", size: 12 })),
        props.onDiscard === void 0 ? null : h("button", {
          type: "button",
          className: "ph-icon-button ph-file-discard",
          title: t("gitDiscard"),
          "aria-label": t("gitDiscard"),
          disabled: props.actionBusy === true,
          onClick: (event) => {
            event.stopPropagation();
            props.onDiscard?.();
          }
        }, h(Icon, { name: file.untracked ? "trash" : "back", size: 12 }))
      ),
      h("button", {
        type: "button",
        className: "ph-icon-button ph-file-copy",
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
          locale: currentLocale(t)
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
        h(
          "label",
          {
            className: "ph-check-inline",
            title: allSelected ? t("gitClearSelection") : t("gitSelectAll")
          },
          h("input", {
            type: "checkbox",
            checked: allSelected,
            disabled: files.length === 0,
            "aria-label": allSelected ? t("gitClearSelection") : t("gitSelectAll"),
            onChange: () => props.onSelectAll(!allSelected)
          }),
          h("span", null, allSelected ? t("gitClearSelection") : t("gitSelectAll"))
        ),
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
    const [working, setWorking] = useState(null);
    const [confirmDiscard, setConfirmDiscard] = useState(null);
    const known = useRef(/* @__PURE__ */ new Set());
    const initialized = useRef(false);
    useEffect(() => {
      writePreferences({ layout, wrap, hideWhitespace, scope });
    }, [layout, wrap, hideWhitespace, scope]);
    const signature = files.map((file) => file.path).join("\n");
    const stagedPaths = useMemo(
      () => new Map(files.map((file) => [file.path, file.staged === true])),
      [files]
    );
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
    const runFileAction = async (kind, path, untracked) => {
      if (working !== null) return;
      setWorking(path);
      try {
        const target = { sessionId: props.sessionId, cwd: props.cwd || void 0 };
        if (kind === "stage") await api.stage({ ...target, paths: [path] });
        else if (kind === "unstage") await api.unstage({ ...target, paths: [path] });
        else {
          if (!untracked) await api.unstage({ ...target, paths: [path] });
          await api.discard({ ...target, paths: [path], includeUntracked: untracked });
        }
        const key = kind === "stage" ? "gitStageDone" : kind === "unstage" ? "gitUnstageDone" : "gitDiscardDone";
        props.onToast(t(key, { path }), "", "success");
        setConfirmDiscard(null);
        props.onRefresh();
      } catch (failure) {
        props.onToast(t("gitActionFailed"), messageOf(failure), "error");
      } finally {
        setWorking(null);
      }
    };
    const expandAll = () => setExpanded(new Set(stack.map((file) => stackKey(file))));
    const collapseAll = () => setExpanded(/* @__PURE__ */ new Set());
    const baseLabel = overview.branchChanges?.baseRef ?? overview.repo.defaultBranch ?? "";
    const totals = scope === "branch" ? { insertions: overview.branchChanges?.insertions ?? 0, deletions: overview.branchChanges?.deletions ?? 0 } : { insertions: overview.stats.additions, deletions: overview.stats.deletions };
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
      h("span", { className: "ph-dim ph-tiny" }, t("gitFilesMany", { count: files.length })),
      h(Counts, { additions: totals.insertions, deletions: totals.deletions }),
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
            staged: stagedPaths.get(file.path) === true,
            actionBusy: working === file.path,
            onToggle: () => toggleExpanded(key),
            onSelect: (next) => toggleSelected(file.path, next),
            onCopied: (path) => props.onToast(t("gitCopied"), path, "success"),
            onStage: scope === "working" ? () => void runFileAction("stage", file.path, file.untracked) : void 0,
            onUnstage: scope === "working" ? () => void runFileAction("unstage", file.path, file.untracked) : void 0,
            onDiscard: scope === "working" ? () => setConfirmDiscard({ path: file.path, untracked: file.untracked }) : void 0
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
      ),
      confirmDiscard === null ? null : h(
        "div",
        { className: "ph-overlay", role: "presentation" },
        h(
          "div",
          { className: "ph-dialog", role: "alertdialog", "aria-modal": "true", "aria-label": t("gitDiscard") },
          h("div", { className: "ph-dialog-title" }, t("gitDiscard")),
          h(
            "p",
            { className: "ph-dialog-body" },
            t(confirmDiscard.untracked ? "gitDiscardUntracked" : "gitDiscardConfirm", { path: confirmDiscard.path })
          ),
          h(
            "div",
            { className: "ph-dialog-actions" },
            h("button", {
              type: "button",
              className: "ph-button",
              disabled: working !== null,
              onClick: () => setConfirmDiscard(null)
            }, t("gitDefaultAbort")),
            h("button", {
              type: "button",
              className: "ph-primary ph-danger",
              disabled: working !== null,
              onClick: () => {
                const target = confirmDiscard;
                void runFileAction("discard", target.path, target.untracked);
              }
            }, working === confirmDiscard.path ? t("gitDiscardBusy") : t("gitDiscard"))
          )
        )
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
        props.dir !== void 0 && props.dir.length > 0 ? [
          h("span", { className: "ph-file-dir", key: "dir" }, props.dir.replace(/\/+$/, "")),
          h("span", { className: "ph-file-sep", key: "sep" }, "/")
        ] : null,
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
  function stateLabel2(t, state) {
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
        stateLabel2(t, pull.state)
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

  // src/client/git/markdown.tsx
  var FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})[ \t]*(\S*)/;
  var FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
  var HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
  var RULE = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
  var QUOTE = /^ {0,3}>[ \t]?(.*)$/;
  var ITEM = /^( *)([-*+]|\d{1,9}[.)])(?:([ \t]+)(.*))?$/;
  var DEFINITION = /^ {0,3}\[[^\]]+\]:[ \t]+\S/;
  var TASK = /^\[([ xX])\](?:[ \t]+([\s\S]*))?$/;
  var ESCAPABLE = /[\\`*_{}[\]()#+\-.!|~>]/;
  function Markdown(props) {
    const text = typeof props.text === "string" ? props.text : "";
    const blocks = parseBlocks(text.replace(/\r\n?/g, "\n").split("\n"));
    const className = props.className === void 0 || props.className.length === 0 ? "ph-md" : `ph-md ${props.className}`;
    return h(
      "div",
      { className, "data-personal-hub-markdown": true },
      blocks.map((block, index) => renderBlock(block, `md-${index}`))
    );
  }
  function parseBlocks(lines) {
    const blocks = [];
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      if (line.trim().length === 0) {
        index += 1;
        continue;
      }
      const fence = FENCE_OPEN.exec(line);
      if (fence !== null) {
        index = readFence(blocks, lines, index, fence[1], (fence[2] ?? "").trim());
        continue;
      }
      const heading = HEADING.exec(line);
      if (heading !== null) {
        const text = (heading[2] ?? "").replace(/[ \t]+#+[ \t]*$/, "").trim();
        blocks.push({ kind: "heading", level: heading[1].length, text });
        index += 1;
        continue;
      }
      if (RULE.test(line)) {
        blocks.push({ kind: "rule" });
        index += 1;
        continue;
      }
      if (DEFINITION.test(line)) {
        index += 1;
        continue;
      }
      if (QUOTE.test(line)) {
        const inner = [];
        while (index < lines.length) {
          const quoted = QUOTE.exec(lines[index]);
          if (quoted === null) break;
          inner.push(quoted[1]);
          index += 1;
        }
        blocks.push({ kind: "quote", blocks: parseBlocks(inner) });
        continue;
      }
      if (isTableStart(lines, index)) {
        index = readTable(blocks, lines, index);
        continue;
      }
      if (ITEM.test(line)) {
        index = readList(blocks, lines, index);
        continue;
      }
      const paragraph = [];
      while (index < lines.length) {
        if (lines[index].trim().length === 0) break;
        if (startsBlock(lines, index)) break;
        paragraph.push(lines[index].replace(/^ {0,3}/, ""));
        index += 1;
      }
      blocks.push({ kind: "paragraph", text: paragraph.join("\n").trimEnd() });
    }
    return blocks;
  }
  function readFence(blocks, lines, start, marker, info) {
    const body2 = [];
    const character = marker[0];
    let index = start + 1;
    while (index < lines.length) {
      const close = FENCE_CLOSE.exec(lines[index]);
      if (close !== null && close[1][0] === character && close[1].length >= marker.length) break;
      body2.push(lines[index]);
      index += 1;
    }
    blocks.push({ kind: "code", info, text: body2.join("\n") });
    return index + 1;
  }
  function readTable(blocks, lines, start) {
    const header = splitRow(lines[start]);
    const align = splitRow(lines[start + 1]).map(alignOf);
    const rows = [];
    let index = start + 2;
    while (index < lines.length) {
      const line = lines[index];
      if (line.trim().length === 0 || !line.includes("|")) break;
      rows.push(splitRow(line));
      index += 1;
    }
    blocks.push({ kind: "table", align, header, rows });
    return index;
  }
  function readList(blocks, lines, start) {
    const first = ITEM.exec(lines[start]);
    const ordered = !isBullet(first[2]);
    const items = [];
    let index = start;
    while (index < lines.length) {
      const match = ITEM.exec(lines[index]);
      if (match === null) break;
      if (isBullet(match[2]) === ordered) break;
      const contentIndent = match[1].length + match[2].length + Math.max(1, (match[3] ?? " ").length);
      const content = [match[4] ?? ""];
      index += 1;
      while (index < lines.length) {
        const next = lines[index];
        if (next.trim().length === 0) {
          let look = index + 1;
          while (look < lines.length && lines[look].trim().length === 0) look += 1;
          if (look < lines.length && leadingSpaces(lines[look]) >= contentIndent) {
            while (index < look) {
              content.push("");
              index += 1;
            }
            continue;
          }
          index = look;
          break;
        }
        if (leadingSpaces(next) >= contentIndent) {
          content.push(next.slice(contentIndent));
          index += 1;
          continue;
        }
        if (startsBlock(lines, index)) break;
        content.push(next.trim());
        index += 1;
      }
      let task = null;
      const checked = TASK.exec(content[0]);
      if (checked !== null) {
        task = checked[1] !== " ";
        content[0] = checked[2] ?? "";
      }
      items.push({ task, blocks: parseBlocks(content) });
    }
    blocks.push({ kind: "list", ordered, start: ordered ? Number.parseInt(first[2], 10) : 1, items });
    return index;
  }
  function startsBlock(lines, index) {
    const line = lines[index];
    return FENCE_OPEN.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line) || ITEM.test(line) || DEFINITION.test(line) || isTableStart(lines, index);
  }
  function isTableStart(lines, index) {
    if (index + 1 >= lines.length) return false;
    if (!lines[index].includes("|")) return false;
    if (!isDelimiterRow(lines[index + 1])) return false;
    return splitRow(lines[index]).length === splitRow(lines[index + 1]).length;
  }
  function isDelimiterRow(line) {
    if (!line.includes("-")) return false;
    const cells = splitRow(line);
    return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
  }
  function splitRow(line) {
    let text = line.trim();
    if (text.startsWith("|")) text = text.slice(1);
    if (text.endsWith("|") && !text.endsWith("\\|")) text = text.slice(0, -1);
    const cells = [];
    let cell = "";
    let ticks = 0;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (character === "\\" && text[index + 1] === "|") {
        cell += "|";
        index += 1;
        continue;
      }
      if (character === "`") {
        let run = 1;
        while (text[index + run] === "`") run += 1;
        ticks = ticks === 0 ? run : ticks === run ? 0 : ticks;
        cell += text.slice(index, index + run);
        index += run - 1;
        continue;
      }
      if (character === "|" && ticks === 0) {
        cells.push(cell.trim());
        cell = "";
        continue;
      }
      cell += character;
    }
    cells.push(cell.trim());
    return cells;
  }
  function isBullet(marker) {
    return marker === "-" || marker === "*" || marker === "+";
  }
  function alignOf(cell) {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    if (left) return "left";
    return null;
  }
  function leadingSpaces(line) {
    const match = /^ */.exec(line);
    return match === null ? 0 : match[0].length;
  }
  function renderBlock(block, key) {
    switch (block.kind) {
      case "paragraph":
        return h("p", { key, className: "ph-md-p" }, ...renderInline(block.text, key));
      case "heading": {
        const level = Math.min(6, Math.max(1, block.level));
        return h(`h${level}`, { key, className: `ph-md-h ph-md-h${level}` }, ...renderInline(block.text, key));
      }
      case "code":
        return h(
          "div",
          { key, className: "ph-md-code-block" },
          block.info.length === 0 ? null : h("div", { key: "info", className: "ph-md-code-info" }, block.info),
          h(
            "pre",
            { key: "pre", className: "ph-md-pre" },
            h("code", { key: "code" }, block.text.length === 0 ? "\n" : block.text)
          )
        );
      case "quote":
        return h(
          "blockquote",
          { key, className: "ph-md-quote" },
          block.blocks.map((child, index) => renderBlock(child, `${key}-${index}`))
        );
      case "list": {
        const items = block.items.map((item, index) => {
          const itemKey = `${key}-i${index}`;
          return h(
            "li",
            {
              key: itemKey,
              className: item.task === null ? "ph-md-li" : "ph-md-li ph-md-li-task"
            },
            item.task === null ? null : h("span", {
              key: "task",
              className: "ph-md-task",
              "data-done": item.task ? "true" : "false",
              "aria-hidden": "true"
            }, item.task ? h(Icon, { name: "check", size: 10, weight: 2 }) : null),
            item.blocks.map((child, childIndex) => renderBlock(child, `${itemKey}-${childIndex}`))
          );
        });
        return h(block.ordered ? "ol" : "ul", {
          key,
          className: block.ordered ? "ph-md-list ph-md-ol" : "ph-md-list ph-md-ul",
          start: block.ordered && block.start !== 1 ? block.start : void 0
        }, ...items);
      }
      case "table": {
        const columnStyle = (index) => {
          const align = block.align[index];
          return typeof align === "string" ? { textAlign: align } : void 0;
        };
        const header = block.header.map((cell, index) => h("th", {
          key: `h${index}`,
          className: "ph-md-th",
          style: columnStyle(index)
        }, ...renderInline(cell, `${key}-h${index}`)));
        const rows = block.rows.map((row, rowIndex) => h(
          "tr",
          { key: `r${rowIndex}` },
          block.header.map((_, column) => h("td", {
            key: `c${column}`,
            className: "ph-md-td",
            style: columnStyle(column)
          }, ...renderInline(row[column] ?? "", `${key}-r${rowIndex}c${column}`)))
        ));
        return h(
          "div",
          { key, className: "ph-md-table-wrap" },
          h(
            "table",
            { key: "table", className: "ph-md-table" },
            h("thead", { key: "head" }, h("tr", { key: "row" }, ...header)),
            rows.length === 0 ? null : h("tbody", { key: "body" }, ...rows)
          )
        );
      }
      case "rule":
        return h("hr", { key, className: "ph-md-rule" });
      default:
        return h("div", { key });
    }
  }
  function renderInline(text, keyPrefix) {
    const nodes = [];
    let buffer = "";
    let index = 0;
    const flush = () => {
      if (buffer.length > 0) {
        nodes.push(buffer);
        buffer = "";
      }
    };
    while (index < text.length) {
      const character = text[index];
      if (character === "\\" && ESCAPABLE.test(text[index + 1] ?? "")) {
        buffer += text[index + 1];
        index += 2;
        continue;
      }
      if (character === "\n") {
        const hard = /(?: {2}|\\)$/.exec(buffer);
        if (hard !== null) {
          buffer = buffer.slice(0, hard.index);
          flush();
          nodes.push(h("br", { key: `${keyPrefix}-br-${index}` }));
        } else {
          buffer += " ";
        }
        index += 1;
        continue;
      }
      if (character === "`") {
        const run = /^`+/.exec(text.slice(index))[0];
        const rest = text.slice(index);
        const close = rest.indexOf(run, run.length);
        if (close === -1) {
          buffer += run;
          index += run.length;
          continue;
        }
        let code = rest.slice(run.length, close).replace(/\n/g, " ");
        if (code.length > 1 && code.startsWith(" ") && code.endsWith(" ")) code = code.slice(1, -1);
        flush();
        nodes.push(h("code", { key: `${keyPrefix}-code-${index}`, className: "ph-md-code" }, code));
        index += close + run.length;
        continue;
      }
      if (character === "!" && text[index + 1] === "[") {
        const image = /^!\[([^\]]*)\]\(([^)]*)\)/.exec(text.slice(index));
        if (image !== null) {
          const target = linkTarget(image[2]);
          flush();
          const source = target.href !== null && /^https?:/i.test(target.href) ? target.href : null;
          nodes.push(source === null ? h("span", { key: `${keyPrefix}-img-${index}`, className: "ph-md-a" }, image[1].length > 0 ? image[1] : image[2]) : h("img", {
            key: `${keyPrefix}-img-${index}`,
            className: "ph-md-img",
            src: source,
            alt: image[1],
            title: target.title,
            loading: "lazy",
            referrerPolicy: "no-referrer"
          }));
          index += image[0].length;
          continue;
        }
      }
      if (character === "[") {
        const link = /^\[([^\]]*)\]\(([^)]*)\)/.exec(text.slice(index));
        if (link !== null) {
          const target = linkTarget(link[2]);
          flush();
          const label = renderInline(link[1], `${keyPrefix}-a-${index}`);
          nodes.push(target.href === null ? h("span", { key: `${keyPrefix}-a-${index}`, className: "ph-md-a" }, ...label) : h("a", {
            key: `${keyPrefix}-a-${index}`,
            className: "ph-md-a",
            href: target.href,
            title: target.title,
            target: "_blank",
            rel: "noreferrer noopener"
          }, ...label));
          index += link[0].length;
          continue;
        }
      }
      if (character === "<") {
        const rest = text.slice(index);
        const autolink = /^<([a-zA-Z][a-zA-Z0-9+.-]*:[^>\s]*)>/.exec(rest);
        if (autolink !== null) {
          const href = safeHref(autolink[1]);
          if (href !== null) {
            flush();
            nodes.push(h("a", {
              key: `${keyPrefix}-a-${index}`,
              className: "ph-md-a",
              href,
              target: "_blank",
              rel: "noreferrer noopener"
            }, autolink[1]));
            index += autolink[0].length;
            continue;
          }
        }
        if (/^<br\s*\/?>/i.test(rest)) {
          const length = /^<br\s*\/?>/i.exec(rest)[0].length;
          flush();
          nodes.push(h("br", { key: `${keyPrefix}-br-${index}` }));
          index += length;
          continue;
        }
        const garbage = /^(?:<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>)/.exec(rest);
        if (garbage !== null) {
          index += garbage[0].length;
          continue;
        }
      }
      if ((character === "h" || character === "H") && /^https?:\/\//i.test(text.slice(index, index + 8))) {
        const match = /^https?:\/\/[^\s<>"'`]+/i.exec(text.slice(index));
        let url = match[0];
        while (url.length > 8 && /[.,;:!?)\]]$/.test(url)) url = url.slice(0, -1);
        flush();
        nodes.push(h("a", {
          key: `${keyPrefix}-a-${index}`,
          className: "ph-md-a",
          href: url,
          target: "_blank",
          rel: "noreferrer noopener"
        }, url));
        index += url.length;
        continue;
      }
      if (character === "*" || character === "_" || character === "~") {
        const rest = text.slice(index);
        const previous = index > 0 ? text[index - 1] : "";
        if (character === "_" && /[0-9A-Za-z]/.test(previous)) {
          buffer += character;
          index += 1;
          continue;
        }
        if (character === "~") {
          const strike = /^~~(?=\S)([\s\S]*?\S)~~/.exec(rest);
          if (strike !== null) {
            flush();
            nodes.push(h("del", { key: `${keyPrefix}-del-${index}` }, ...renderInline(strike[1], `${keyPrefix}-del-${index}`)));
            index += strike[0].length;
            continue;
          }
        } else {
          const strong = /^(\*\*|__)(?=\S)([\s\S]*?\S)\1/.exec(rest);
          if (strong !== null) {
            flush();
            nodes.push(h("strong", { key: `${keyPrefix}-strong-${index}` }, ...renderInline(strong[2], `${keyPrefix}-strong-${index}`)));
            index += strong[0].length;
            continue;
          }
          const emphasis = /^([*_])(?=\S)([\s\S]*?\S)\1/.exec(rest);
          if (emphasis !== null) {
            flush();
            nodes.push(h("em", { key: `${keyPrefix}-em-${index}` }, ...renderInline(emphasis[2], `${keyPrefix}-em-${index}`)));
            index += emphasis[0].length;
            continue;
          }
        }
        buffer += character;
        index += 1;
        continue;
      }
      buffer += character;
      index += 1;
    }
    flush();
    return nodes;
  }
  function linkTarget(raw) {
    const trimmed = raw.trim();
    const titled = /^(\S+)\s+"([^"]*)"$/.exec(trimmed);
    const href = titled !== null ? titled[1] : trimmed;
    return { href: safeHref(href), title: titled === null ? void 0 : titled[2] };
  }
  function safeHref(raw) {
    const href = raw.trim();
    if (href.length === 0) return null;
    const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(href);
    if (scheme === null) {
      return href.startsWith("#") || href.startsWith("/") || href.startsWith("./") || href.startsWith("../") ? href : null;
    }
    const name = scheme[1].toLowerCase();
    return name === "http" || name === "https" || name === "mailto" ? href : null;
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
      props.prAction.enabled ? h(
        "div",
        { className: "ph-toolbar" },
        h("span", { className: "ph-spacer" }),
        h("button", {
          type: "button",
          className: "ph-button",
          onClick: props.onCreatePr
        }, h(Icon, { name: "merge", size: 12 }), t("gitActionCreatePr"))
      ) : null,
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
    const [refresh, setRefresh] = useState(0);
    const [pending, setPending] = useState(null);
    const [deleteBranch, setDeleteBranch] = useState(false);
    const [merging, setMerging] = useState(false);
    const [mergeError, setMergeError] = useState("");
    const [merged, setMerged] = useState(null);
    const state = useLoader(
      () => api.pullRequest({
        sessionId: props.sessionId,
        cwd: props.cwd || void 0,
        number: props.number,
        ...refresh === 0 ? {} : { refresh: true }
      }),
      [props.number, props.revision, refresh, props.sessionId, props.cwd]
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
    const canMerge = pull.state === "open" && merged === null;
    const merge = async (method) => {
      setMerging(true);
      setMergeError("");
      try {
        const result = await api.mergePull({
          sessionId: props.sessionId,
          cwd: props.cwd || void 0,
          number: pull.number,
          method,
          deleteBranch
        });
        setMerged(result);
        setPending(null);
        setRefresh((value2) => value2 + 1);
        props.onChanged?.();
      } catch (failure) {
        setMergeError(messageOf(failure));
      } finally {
        setMerging(false);
      }
    };
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
            stateLabel2(t, pull.state)
          ),
          pull.branch.length > 0 ? h("span", { className: "ph-chip ph-mono" }, t("gitFrom", { branch: pull.branch })) : null,
          pull.base.length > 0 ? h("span", { className: "ph-chip ph-mono" }, `\u2192 ${pull.base}`) : null
        ),
        merged === null ? null : h(
          "div",
          { className: merged.merged ? "ph-success" : "ph-notice" },
          h(Icon, { name: merged.merged ? "check" : "clock", size: 13 }),
          h(
            "span",
            { className: "ph-success-text" },
            merged.merged ? t("gitMergeDone", { number: pull.number }) : t("gitMergeQueued", { number: pull.number })
          ),
          merged.branchDeleted === true ? h("span", { className: "ph-dim ph-tiny" }, t("gitMergeDeletedBranch")) : null,
          merged.branchDeleted === false ? h("span", { className: "ph-dim ph-tiny" }, t("gitMergeDeleteFailed")) : null
        ),
        canMerge ? h(
          "div",
          { className: "ph-card ph-merge" },
          h("div", { className: "ph-card-title" }, h(Icon, { name: "merge", size: 12 }), t("gitMergeTitle", { number: pull.number })),
          h("p", { className: "ph-hint" }, t("gitMergeBody", { branch: pull.branch, base: pull.base })),
          h(
            "div",
            { className: "ph-merge-actions" },
            h("button", {
              type: "button",
              className: "ph-primary",
              disabled: merging,
              onClick: () => {
                setPending("merge");
                setMergeError("");
              }
            }, h(Icon, { name: "merge", size: 12 }), t("gitMerge")),
            h("button", {
              type: "button",
              className: "ph-button",
              disabled: merging,
              onClick: () => {
                setPending("squash");
                setMergeError("");
              }
            }, h(Icon, { name: "commit", size: 12 }), t("gitMergeSquash")),
            value.provider === "gitlab" ? null : h("button", {
              type: "button",
              className: "ph-button",
              disabled: merging,
              onClick: () => {
                setPending("rebase");
                setMergeError("");
              }
            }, h(Icon, { name: "branch", size: 12 }), t("gitMergeRebase"))
          )
        ) : null,
        mergeError.length > 0 ? h("p", { className: "ph-error-text" }, `${t("gitMergeFailed")}: ${mergeError}`) : null,
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
          (value.body ?? "").length === 0 ? h("div", { className: "ph-dim ph-tiny" }, t("gitNoDescription")) : h(Markdown, { text: value.body ?? "" })
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
            review.body.length > 0 ? h(Markdown, { text: review.body }) : null
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
            h(Markdown, { text: comment.body })
          ))
        )
      ),
      pending === null ? null : h(
        "div",
        { className: "ph-overlay", role: "presentation" },
        h(
          "div",
          { className: "ph-dialog", role: "alertdialog", "aria-modal": "true", "aria-label": t("gitMergeTitle", { number: pull.number }) },
          h("div", { className: "ph-dialog-title" }, t("gitMergeTitle", { number: pull.number })),
          h("p", { className: "ph-dialog-body" }, t("gitMergeBody", { branch: pull.branch, base: pull.base })),
          h("p", { className: "ph-hint" }, t("gitMergeHint")),
          h(
            "label",
            { className: "ph-check-row" },
            h("input", {
              type: "checkbox",
              checked: deleteBranch,
              disabled: merging,
              onChange: (event) => setDeleteBranch(event.target.checked)
            }),
            h("span", null, t("gitMergeDeleteBranch"))
          ),
          mergeError.length > 0 ? h("p", { className: "ph-error-text" }, mergeError) : null,
          h(
            "div",
            { className: "ph-merge-methods" },
            ["merge", "squash", ...value.provider === "gitlab" ? [] : ["rebase"]].map((method) => h("button", {
              key: method,
              type: "button",
              className: pending === method ? "ph-filter" : "ph-button",
              "aria-pressed": pending === method ? "true" : "false",
              disabled: merging,
              onClick: () => setPending(method)
            }, methodLabel(t, method)))
          ),
          h(
            "div",
            { className: "ph-dialog-actions" },
            h("button", {
              type: "button",
              className: "ph-button",
              disabled: merging,
              onClick: () => {
                setPending(null);
                setMergeError("");
              }
            }, t("gitMergeCancel")),
            h("button", {
              type: "button",
              className: "ph-primary",
              disabled: merging,
              onClick: () => void merge(pending)
            }, merging ? t("gitMergeBusy") : t("gitMergeConfirm"))
          )
        )
      )
    );
  }
  function methodLabel(t, method) {
    if (method === "squash") return t("gitMergeSquash");
    if (method === "rebase") return t("gitMergeRebase");
    return t("gitMerge");
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
          (value.body ?? "").length === 0 ? h("div", { className: "ph-dim ph-tiny" }, t("gitNoDescription")) : h(Markdown, { text: value.body ?? "" })
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
            h(Markdown, { text: comment.body })
          ))
        )
      )
    );
  }

  // src/client/git/worktrees.tsx
  function WorktreesView(props) {
    const { t, api } = props;
    const sessionId = typeof props.sessionId === "string" ? props.sessionId : "";
    const [creating, setCreating] = useState(false);
    const [bases, setBases] = useState(void 0);
    const [name, setName] = useState("");
    const [base, setBase] = useState("");
    const [source, setSource] = useState("local");
    const [switchHere, setSwitchHere] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [removing, setRemoving] = useState(null);
    const [deleteBranch, setDeleteBranch] = useState(false);
    const [force, setForce] = useState(false);
    const [pruning, setPruning] = useState(false);
    const [copied, setCopied] = useState("");
    const state = useLoader(
      () => api.worktrees({ sessionId: sessionId || void 0, cwd: props.cwd || void 0 }),
      [sessionId, props.cwd, props.revision]
    );
    useEffect(() => {
      if (!creating) return void 0;
      let alive = true;
      setBases(void 0);
      api.worktreeState({ sessionId: sessionId || void 0, cwd: props.cwd || void 0 }).then((value) => {
        if (!alive) return;
        setBases(value);
        setBase((current) => current.length > 0 ? current : value.bases?.defaultBase ?? "");
        setSource(value.sourceDefault === "remote" ? "remote" : "local");
      }).catch(() => {
        if (alive) setBases(void 0);
      });
      return () => {
        alive = false;
      };
    }, [creating, api, sessionId, props.cwd]);
    const reload = () => props.onChanged();
    const create = async () => {
      setBusy(true);
      setError("");
      try {
        const answer = await api.worktreeAdd({
          sessionId: sessionId || void 0,
          cwd: props.cwd || void 0,
          name: name.trim().length > 0 ? name.trim() : void 0,
          base: base.length > 0 ? base : void 0,
          source,
          switch: sessionId.length > 0 ? switchHere : false
        });
        setCreating(false);
        setName("");
        props.onToast(
          answer.switched ? t("wtCreatedSwitched", { branch: answer.worktree.branch }) : t("wtCreatedNotice", { branch: answer.worktree.branch }),
          "",
          "success"
        );
        setName("");
        setBases(void 0);
        props.onChanged();
      } catch (failure) {
        setError(`${t("wtAddFailed")}: ${messageOf(failure)}`);
      } finally {
        setBusy(false);
      }
    };
    const switchTo = async (entry) => {
      if (sessionId.length === 0) {
        props.onToast(t("wtError"), t("wtNoSession"), "info");
        return;
      }
      setError("");
      try {
        const answer = await api.worktreeSwitch({ sessionId, path: entry.path });
        props.onToast(t("wtSwitched", { branch: answer.branch ?? entry.branch ?? entry.path }), "", "success");
        reload();
      } catch (failure) {
        props.onToast(t("wtError"), messageOf(failure), "error");
      }
    };
    const openChat = async (entry) => {
      if (typeof props.newChat !== "function") {
        props.onToast(t("wtError"), t("gitSessionUnavailable"), "error");
        return;
      }
      try {
        await props.newChat(entry.path);
        props.onToast(t("wtOpenChat"), entry.branch ?? entry.path, "success");
      } catch (failure) {
        props.onToast(t("wtError"), messageOf(failure), "error");
      }
    };
    const remove = async (entry) => {
      setBusy(true);
      setError("");
      try {
        await api.worktreeRemovePath({
          sessionId: sessionId || void 0,
          cwd: props.cwd || void 0,
          path: entry.path,
          deleteBranch,
          force
        });
        props.onToast(t("wtRemovedNotice", { branch: entry.branch ?? entry.path }), "", "success");
        setRemoving(null);
        setDeleteBranch(false);
        setForce(false);
        reload();
      } catch (failure) {
        setError(`${t("wtError")}: ${messageOf(failure)}`);
      } finally {
        setBusy(false);
      }
    };
    const prune = async () => {
      setPruning(true);
      setError("");
      try {
        const answer = await api.worktreePrune({ sessionId: sessionId || void 0, cwd: props.cwd || void 0 });
        props.onToast(
          answer.pruned > 0 ? t("wtPruned", { count: answer.pruned }) : t("wtPrunedNone"),
          "",
          "success"
        );
        reload();
      } catch (failure) {
        setError(`${t("wtError")}: ${messageOf(failure)}`);
      } finally {
        setPruning(false);
      }
    };
    const copy = async (path) => {
      const ok = await copyText(path);
      if (!ok) return;
      setCopied(path);
      setTimeout(() => setCopied(""), 1500);
      props.onToast(t("gitCopied"), path, "success");
    };
    const toolbar = h(
      "div",
      { className: "ph-toolbar" },
      h(Icon, { name: "tree", size: 13 }),
      h("span", { className: "ph-toolbar-title" }, t("wtManagerTitle")),
      h("span", { className: "ph-spacer" }),
      h("button", {
        type: "button",
        className: "ph-icon-button",
        title: t("wtPruneHint"),
        "aria-label": t("wtPrune"),
        disabled: pruning,
        onClick: () => void prune()
      }, h(Icon, { name: "refresh", size: 13 })),
      h("button", {
        type: "button",
        className: "ph-button",
        disabled: creating,
        onClick: () => {
          setCreating((value) => !value);
          setError("");
        }
      }, h(Icon, { name: "branchPlus", size: 12 }), t("wtNew"))
    );
    const createCard = creating ? h(
      "div",
      { className: "ph-card", style: { margin: "8px 10px" } },
      h("div", { className: "ph-card-title" }, h(Icon, { name: "branchPlus", size: 12 }), t("wtCreateTitle")),
      h("p", { className: "ph-hint" }, t("wtCreateHint")),
      h(
        "label",
        { className: "ph-field" },
        h("span", { className: "ph-field-label" }, t("wtName")),
        h("input", {
          className: "ph-input",
          value: name,
          placeholder: t("wtNamePlaceholder"),
          spellcheck: false,
          disabled: busy,
          onInput: (event) => setName(event.target.value),
          onChange: (event) => setName(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter" && !busy) void create();
          }
        })
      ),
      h(
        "label",
        { className: "ph-field" },
        h("span", { className: "ph-field-label" }, t("wtBase")),
        h(
          "select",
          {
            className: "ph-select",
            value: base,
            disabled: busy || bases === void 0,
            onChange: (event) => setBase(event.target.value)
          },
          h("option", { value: "" }, bases?.bases?.defaultBase ?? t("wtLoadBases")),
          (source === "remote" ? bases?.bases?.remote ?? [] : bases?.bases?.local ?? []).map((item) => h("option", {
            key: `${source}:${"branch" in item ? item.branch : item.name}`,
            value: "branch" in item ? item.branch : item.name
          }, item.name))
        )
      ),
      (bases?.bases?.remote ?? []).length === 0 ? null : h(
        "div",
        { className: "ph-field" },
        h("span", { className: "ph-field-label" }, t("wtSource")),
        h(
          "div",
          { style: { display: "inline-flex", border: "1px solid var(--dsw-alias-border-l1)", borderRadius: "7px", overflow: "hidden" } },
          ["local", "remote"].map((kind) => h("button", {
            key: kind,
            type: "button",
            className: "ph-filter",
            style: { border: 0, borderRadius: 0 },
            "aria-pressed": source === kind ? "true" : "false",
            disabled: busy,
            onClick: () => {
              setSource(kind);
              setBase("");
            }
          }, kind === "remote" ? t("wtRemote") : t("wtLocal")))
        )
      ),
      sessionId.length === 0 ? h("p", { className: "ph-hint" }, t("wtNoSession")) : h(
        "label",
        { className: "ph-check-row" },
        h("input", {
          type: "checkbox",
          checked: switchHere,
          disabled: busy,
          onChange: (event) => setSwitchHere(event.target.checked)
        }),
        h("span", null, t("wtSwitchThisChat"))
      ),
      error.length > 0 ? h("p", { className: "ph-error-text" }, error) : null,
      h(
        "div",
        { className: "ph-dialog-actions" },
        h("button", {
          type: "button",
          className: "ph-button",
          disabled: busy,
          onClick: () => {
            setCreating(false);
            setError("");
          }
        }, t("wtCancel")),
        h("button", {
          type: "button",
          className: "ph-primary",
          disabled: busy || bases === void 0,
          onClick: () => void create()
        }, busy ? t("wtCreating") : t("wtCreate"))
      )
    ) : null;
    let body2;
    if (state.status === "error" && state.value === void 0) {
      body2 = h(Failure, { error: state.error, title: t("wtLoadError"), retryLabel: t("gitRetry"), onRetry: reload });
    } else if (state.value === void 0) {
      body2 = h(Loading, { label: t("gitLoading") });
    } else if (state.value.worktrees.length === 0) {
      body2 = h(Empty, { icon: "tree", title: t("wtEmpty"), hint: t("wtEmptyHint") });
    } else {
      body2 = state.value.worktrees.map((entry) => h(WorktreeRow, {
        key: entry.path,
        t,
        entry,
        main: entry.path === state.value?.root,
        sessionId,
        busy,
        copied: copied === entry.path,
        removing: removing === entry.path,
        deleteBranch,
        force,
        onCopy: () => void copy(entry.path),
        onSwitch: () => void switchTo(entry),
        onOpenChat: typeof props.newChat === "function" ? () => void openChat(entry) : void 0,
        onRemove: () => {
          setRemoving(entry.path);
          setDeleteBranch(false);
          setForce(false);
          setError("");
        },
        onCancelRemove: () => setRemoving(null),
        onDeleteBranch: (next) => setDeleteBranch(next),
        onForce: (next) => setForce(next),
        onConfirmRemove: () => void remove(entry)
      }));
    }
    return h(
      "div",
      { style: { display: "flex", flexDirection: "column", minHeight: 0, flex: "1 1 auto" } },
      toolbar,
      createCard,
      error.length > 0 && !creating ? h(
        "div",
        { className: "ph-error" },
        h("span", { className: "ph-error-title" }, h(Icon, { name: "alert", size: 13 }), t("wtError")),
        h("span", null, error)
      ) : null,
      h(
        "div",
        { className: "ph-body", style: { flex: "1 1 auto" } },
        h("p", { className: "ph-hint", style: { padding: "8px 10px 0" } }, t("wtManagerHint")),
        body2
      )
    );
  }
  function WorktreeRow(props) {
    const { t, entry } = props;
    const parts = splitPath(entry.path);
    const label = entry.branch ?? parts.name;
    const dirty = entry.changedFiles !== null && entry.changedFiles > 0;
    return h(
      "section",
      { className: "ph-file", "data-path": entry.path },
      h(
        "div",
        { className: "ph-file-head", style: { cursor: "default" } },
        h(
          "span",
          { style: { display: "flex", color: "var(--dsw-alias-label-tertiary)" } },
          h(Icon, { name: props.main ? "folder" : "branch", size: 13 })
        ),
        h(
          "span",
          { className: "ph-file-path", title: entry.path },
          h("span", { className: "ph-file-name" }, label)
        ),
        entry.current ? h("span", { className: "ph-chip", "data-tone": "success" }, t("wtCurrent")) : null,
        props.main ? h("span", { className: "ph-chip" }, t("wtMain")) : null,
        entry.detached ? h("span", { className: "ph-chip", "data-tone": "warn" }, t("wtDetached")) : null,
        entry.locked ? h("span", { className: "ph-chip", "data-tone": "warn" }, t("wtLocked")) : null,
        entry.prunable ? h("span", { className: "ph-chip", "data-tone": "error" }, t("wtPrunable")) : null,
        dirty ? h("span", { className: "ph-chip", "data-tone": "warn" }, t("wtDirty", { count: entry.changedFiles ?? 0 })) : null,
        !dirty && entry.changedFiles === 0 ? h("span", { className: "ph-chip" }, t("wtClean")) : null,
        h("span", { className: "ph-spacer" }),
        h("button", {
          type: "button",
          className: "ph-icon-button",
          title: props.copied ? t("gitCopied") : t("gitCopyPath"),
          "aria-label": t("gitCopyPath"),
          onClick: props.onCopy
        }, h(Icon, { name: props.copied ? "check" : "copy", size: 12 }))
      ),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: "5px", padding: "5px 10px 8px" } },
        h("span", { className: "ph-mono ph-tiny ph-dim ph-ellipsis", title: entry.path }, entry.path),
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" } },
          entry.sessionId !== null ? h(
            "span",
            { className: "ph-chip ph-mono" },
            t(entry.sessionId === props.sessionId ? "wtThisChat" : "wtOtherChat", { id: entry.sessionId.slice(0, 8) })
          ) : null,
          entry.createdAt === null ? null : h("span", { className: "ph-dim ph-tiny" }, t("wtCreatedAt", { when: relativeTime(entry.createdAt) })),
          h("span", { className: "ph-spacer" }),
          entry.current || entry.prunable ? null : h("button", {
            type: "button",
            className: "ph-button",
            disabled: props.busy || props.sessionId.length === 0,
            title: props.sessionId.length === 0 ? t("wtNoSession") : t("wtSwitchThisChat"),
            onClick: props.onSwitch
          }, h(Icon, { name: "branch", size: 11 }), t("wtSwitchHere")),
          props.onOpenChat === void 0 || entry.bare || entry.prunable ? null : h("button", {
            type: "button",
            className: "ph-button",
            disabled: props.busy,
            onClick: props.onOpenChat
          }, h(Icon, { name: "comment", size: 11 }), t("wtOpenChat")),
          entry.isPool || entry.prunable || !props.main ? h("button", {
            type: "button",
            className: "ph-button",
            disabled: props.busy,
            onClick: props.onRemove
          }, h(Icon, { name: "trash", size: 11 }), t("wtRemoveAction")) : null
        )
      ),
      props.removing ? h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: "6px", padding: "0 10px 10px" } },
        h("div", { className: "ph-confirm-text" }, t("wtRemoveConfirm", { branch: label })),
        h("p", { className: "ph-hint" }, t("wtRemoveHint")),
        h(
          "label",
          { className: "ph-check-row" },
          h("input", {
            type: "checkbox",
            checked: props.deleteBranch,
            onChange: (event) => props.onDeleteBranch(event.target.checked)
          }),
          h("span", null, t("wtDeleteBranch"))
        ),
        h(
          "label",
          { className: "ph-check-row" },
          h("input", {
            type: "checkbox",
            checked: props.force,
            onChange: (event) => props.onForce(event.target.checked)
          }),
          h("span", null, t("wtForce"))
        ),
        h(
          "div",
          { className: "ph-dialog-actions" },
          h("button", { type: "button", className: "ph-button", disabled: props.busy, onClick: props.onCancelRemove }, t("wtCancel")),
          h("button", { type: "button", className: "ph-primary", disabled: props.busy, onClick: props.onConfirmRemove }, t("wtRemoveAction"))
        )
      ) : null
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
    const countsState = useLoader(
      () => api.counts({ sessionId, cwd: cwd || void 0 }),
      [sessionId, cwd, revision]
    );
    const counts = countsState.value;
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
          locale: currentLocale(t)
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
    const prAction = resolvePrAction(status, running);
    const openCreatePull = () => {
      void startAction("create_pr", {});
    };
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
      prAction,
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
      onCreatePr: openCreatePull,
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
      onOpenWorktrees: () => {
        setView("worktrees");
        setSelection(null);
      },
      onBranchChanged: (branch) => {
        reload();
        toast(t("gitBranchSelect"), branch ?? t("gitDetachedHead"), "success");
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
        onBack: () => setSelection(null),
        onChanged: reload
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
        prAction,
        onCreatePr: openCreatePull,
        onFilter: setPullFilter,
        onSelect: (number) => setSelection({ type: "pull", number })
      });
    } else if (view === "worktrees") {
      body2 = h(WorktreesView, {
        api,
        t,
        sessionId,
        cwd,
        revision,
        newChat: props.newChat,
        onToast: toast,
        onChanged: reload
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
          changes: overview === void 0 ? null : { value: overview.stats.files },
          worktrees: counts === void 0 ? null : { value: counts.worktrees },
          pulls: counts === void 0 || counts.pulls === null ? null : { value: counts.pulls, capped: counts.pullsCapped },
          issues: counts === void 0 || counts.issues === null ? null : { value: counts.issues, capped: counts.issuesCapped },
          commits: counts === void 0 ? null : { value: counts.commits }
        },
        onChange: (next) => {
          setView(next);
          setSelection(null);
        }
      }),
      // The list views scroll as a whole, so their toolbars travel with the
      // content. The Changes and Worktrees views and every detail pane own their
      // scroller instead: a detail that is merely clipped cannot be read below
      // the fold, which is what this wrapper used to do.
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", minHeight: 0, flex: "1 1 auto", overflow: isDetail || view === "changes" || view === "worktrees" ? "hidden" : "auto" } },
        isDetail ? h("div", { className: "ph-detail-body", "data-personal-hub-detail-body": true }, body2) : body2
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
    const inWorktree = props.cwd.length > 0 && props.cwd.toLowerCase() !== repo.root.toLowerCase();
    const worktreeName = inWorktree ? splitPath(props.cwd).name : "";
    const remoteLabel = repo.remote?.slug ?? null;
    return h(
      "div",
      { className: "ph-head" },
      h(
        "div",
        { className: "ph-repo-row" },
        h("span", { style: { display: "flex", color: "var(--dsw-alias-label-tertiary)" } }, h(Icon, { name: "git", size: 14 })),
        h("span", { className: "ph-repo", title: remoteLabel === null ? repo.root : `${remoteLabel}
${repo.root}` }, repo.name),
        inWorktree ? h("button", {
          type: "button",
          className: "ph-chip ph-worktree-chip",
          title: props.cwd,
          onClick: props.onOpenWorktrees
        }, h(Icon, { name: "folder", size: 10 }), h("span", { className: "ph-ellipsis" }, worktreeName)) : null,
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
        h("span", { className: "ph-spacer" }),
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
          stateLabel2(t, pull.state)
        )
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
      // The change request control is always on screen once a remote exists, so
      // "create pull request" never hides behind the caret menu.
      props.status !== null && props.status.hasPrimaryRemote ? h(CreatePullButton, {
        t,
        enabled: props.prAction.enabled,
        hintKey: props.prAction.hintKey,
        // The primary control already explains the same blocker.
        showHint: props.quick.hintKey !== props.prAction.hintKey,
        onClick: props.onCreatePr
      }) : null
    );
  }
  function PanelTabs(props) {
    const items = [
      { id: "changes", label: props.t("gitChanges") },
      { id: "worktrees", label: props.t("gitWorktrees") },
      { id: "pulls", label: props.t("gitPulls") },
      { id: "issues", label: props.t("gitIssues") },
      { id: "commits", label: props.t("gitCommits") }
    ];
    return h(
      "div",
      { className: "ph-tabs", role: "tablist" },
      items.map((item) => {
        const count = props.counts[item.id];
        return h(
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
          count === null || count.value === 0 ? null : h("span", { className: "ph-tab-count" }, count.capped === true ? `${count.value}+` : String(count.value))
        );
      })
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

  // src/client/vi-dictionaries.ts
  var VI_DICTIONARIES = {
    "account.notifications": {
      "close": "\u0110\xF3ng"
    },
    "actionCards": {
      "collapseBrief": "Xem \xEDt h\u01A1n",
      "dismiss": "\u0110\u1EC3 sau",
      "dismissed": "\u0110\xE3 b\u1ECF qua",
      "expandBrief": "Xem th\xEAm",
      "replaced": "\u0110\xE3 thay th\u1EBF",
      "row.error": "Kh\xF4ng hi\u1EC3n th\u1ECB",
      "row.inspect": "Ki\u1EC3m tra l\u1EC7nh g\u1ECDi",
      "row.ok": "\u0110\xE3 \u0111\u1EC1 xu\u1EA5t",
      "row.preparing": "\u0110ang chu\u1EA9n b\u1ECB th\u1EBB",
      "row.running": "\u0110ang \u0111\u1EC1 xu\u1EA5t",
      "row.stopped": "\u0110\xE3 gi\xE1n \u0111o\u1EA1n",
      "row.title": "Th\u1EBB h\xE0nh \u0111\u1ED9ng",
      "transport": "Kh\xF4ng th\u1EC3 x\xE1c nh\u1EADn k\u1EBFt qu\u1EA3. H\xE3y k\u1EBFt n\u1ED1i l\u1EA1i v\xE0 ki\u1EC3m tra th\u1EBB tr\u01B0\u1EDBc khi th\u1EED l\u1EA1i.",
      "unavailable": "H\xE0nh \u0111\u1ED9ng n\xE0y kh\xF4ng kh\u1EA3 d\u1EE5ng. H\xE3y ki\u1EC3m tra plugin trong m\u1EE5c Plugin."
    },
    "agent-team": {
      "blocked": "B\u1ECB ch\u1EB7n b\u1EDFi ph\u1EE5 thu\u1ED9c",
      "command.done": "\u0110\xE3 ho\xE0n th\xE0nh",
      "command.failed": "Th\u1EA5t b\u1EA1i",
      "command.failedReason": "Th\u1EA5t b\u1EA1i: {reason}",
      "command.running": "\u0110ang ch\u1EA1y",
      "command.title": "L\xE0m vi\u1EC7c nh\xF3m gi\u1EEFa c\xE1c agent",
      "disable.cancel": "H\u1EE7y",
      "disable.close": "\u0110\xF3ng",
      "disable.confirm": "T\u1EAFt",
      "disable.description": "T\u1EAFt l\xE0m vi\u1EC7c nh\xF3m gi\u1EEFa c\xE1c agent trong cu\u1ED9c h\u1ED9i tho\u1EA1i s\u1EBD d\u1EEBng vi\u1EC7c s\u1EED d\u1EE5ng c\xE1c c\xF4ng c\u1EE5 t\xE1c v\u1EE5 chung v\xE0 h\u01B0\u1EDBng d\u1EABn ph\u1ED1i h\u1EE3p nh\xF3m.",
      "disable.title": "T\u1EAFt l\xE0m vi\u1EC7c nh\xF3m gi\u1EEFa c\xE1c agent?",
      "disable.warning": "Vi\u1EC7c t\u1EAFt c\xF3 th\u1EC3 \u1EA3nh h\u01B0\u1EDFng \u0111\u1EBFn kh\u1EA3 n\u0103ng t\xE1i s\u1EED d\u1EE5ng cache, l\xE0m t\u0103ng l\u01B0\u1EE3ng token v\xE0 chi ph\xED sau \u0111\xF3, \u0111\u1ED3ng th\u1EDDi \u1EA3nh h\u01B0\u1EDFng \u0111\u1EBFn c\u1ED9ng t\xE1c trong t\xE1c v\u1EE5 hi\u1EC7n t\u1EA1i.",
      "empty": "Ch\u01B0a c\xF3 t\xE1c v\u1EE5 chung. H\xE3y t\u1EA1o ch\xFAng qua cu\u1ED9c h\u1ED9i tho\u1EA1i.",
      "failure": "B\u1EA3n ghi t\xE1c v\u1EE5 \u0111\xE3 l\u01B0u kh\xF4ng h\u1EE3p l\u1EC7: {message}",
      "loading": "\u0110ang t\u1EA3i b\u1EA3ng t\xE1c v\u1EE5\u2026",
      "mode.description": "Ph\u1ED1i h\u1EE3p c\xF4ng vi\u1EC7c v\xE0 ti\u1EBFn \u0111\u1ED9 gi\u1EEFa c\xE1c agent b\u1EB1ng b\u1EA3ng t\xE1c v\u1EE5 chung \u0111\u1EC3 \u0111\u1EA1t k\u1EBFt qu\u1EA3 t\u1ED1t h\u01A1n v\u1EDBi t\xE1c v\u1EE5 ph\u1EE9c t\u1EA1p, c\xF9ng v\u1EDBi chi ph\xED token cao h\u01A1n t\u01B0\u01A1ng \u1EE9ng.",
      "mode.failed": "Kh\xF4ng th\u1EC3 x\xE1c nh\u1EADn c\xE0i \u0111\u1EB7t l\xE0m vi\u1EC7c nh\xF3m gi\u1EEFa c\xE1c agent \u0111\xE3 \u0111\u01B0\u1EE3c l\u01B0u. H\xE3y th\u1EED l\u1EA1i: {message}",
      "mode.infoLabel": "Gi\u1EDBi thi\u1EC7u v\u1EC1 l\xE0m vi\u1EC7c nh\xF3m gi\u1EEFa c\xE1c agent",
      "mode.label": "B\u1EADt l\xE0m vi\u1EC7c nh\xF3m gi\u1EEFa c\xE1c agent",
      "owner": "Ng\u01B0\u1EDDi ph\u1EE5 tr\xE1ch",
      "progress.active": "{count} \u0111ang th\u1EF1c hi\u1EC7n",
      "progress.completed": "{count} \u0111\xE3 ho\xE0n th\xE0nh",
      "progress.pending": "{count} \u0111ang ch\u1EDD",
      "status.completed": "\u0110\xE3 ho\xE0n th\xE0nh",
      "status.in_progress": "\u0110ang th\u1EF1c hi\u1EC7n",
      "status.pending": "\u0110ang ch\u1EDD",
      "tasks": "T\xE1c v\u1EE5 chung",
      "trigger": "B\u1EA3ng t\xE1c v\u1EE5",
      "unavailable": "B\u1EA3ng t\xE1c v\u1EE5 kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "unowned": "Ch\u01B0a c\xF3 ng\u01B0\u1EDDi ph\u1EE5 tr\xE1ch"
    },
    "approval": {
      "allow": "Cho ph\xE9p",
      "allowAlways": "Lu\xF4n cho ph\xE9p",
      "allowOnce": "Cho ph\xE9p m\u1ED9t l\u1EA7n",
      "detail.aria": "Chi ti\u1EBFt ph\xEA duy\u1EC7t",
      "escalation": "C\xF4ng c\u1EE5 {toolName} y\xEAu c\u1EA7u th\u1EF1c thi \u0111\u1EB7c quy\u1EC1n",
      "reject": "T\u1EEB ch\u1ED1i",
      "waiting": "\u0110ang ch\u1EDD ph\xEA duy\u1EC7t"
    },
    "chat": {
      "chat.deepDiving": "\u0110ang t\xECm hi\u1EC3u s\xE2u",
      "chat.deepDivingFor": "\u0110ang t\xECm hi\u1EC3u s\xE2u trong {duration} \xB7\xB7\xB7",
      "chat.historyStart": "B\u1EAFt \u0111\u1EA7u cu\u1ED9c h\u1ED9i tho\u1EA1i",
      "chat.loadError": "Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c l\u1ECBch s\u1EED: {message} ({code})",
      "chat.loadingHistory": "\u0110ang t\u1EA3i l\u1ECBch s\u1EED\u2026",
      "chat.loadingOlder": "\u0110ang t\u1EA3i ph\u1EA7n tr\u01B0\u1EDBc \u0111\xF3",
      "chat.loadOlder": "T\u1EA3i ph\u1EA7n tr\u01B0\u1EDBc \u0111\xF3",
      "chat.processingOlder": "\u0110ang x\u1EED l\xFD",
      "chat.retryOlder": "Th\u1EED t\u1EA3i l\u1EA1i",
      "chat.toBottom": "V\u1EC1 cu\u1ED1i cu\u1ED9c h\u1ED9i tho\u1EA1i",
      "chat.turnNavigation.jump": "Chuy\u1EC3n \u0111\u1EBFn l\u01B0\u1EE3t {turn}",
      "chat.turnNavigation.jumpLoad": "T\u1EA3i v\xE0 chuy\u1EC3n \u0111\u1EBFn l\u01B0\u1EE3t {turn}",
      "chat.turnNavigation.label": "\u0110i\u1EC1u h\u01B0\u1EDBng theo l\u01B0\u1EE3t",
      "chat.turnNavigation.turn": "L\u01B0\u1EE3t {turn}",
      "clock.md": "{m}/{d}",
      "clock.ymd": "{y}-{m}-{d}",
      "command.done": "\u0110\xE3 ho\xE0n th\xE0nh",
      "command.failed": "L\u1EC7nh th\u1EA5t b\u1EA1i",
      "command.running": "\u0110ang ch\u1EA1y\u2026",
      "command.title": "L\u1EC7nh",
      "duration.compactMinutes": "{minutes}m{seconds}s",
      "duration.compactSeconds": "{seconds}s",
      "duration.hourUnit": "h ",
      "duration.milliseconds": "{milliseconds}ms",
      "duration.minuteUnit": "m ",
      "duration.secondUnit": "s",
      "fileOpen.title": "Kh\xF4ng th\u1EC3 m\u1EDF t\u1EC7p",
      "fileOpen.unknown": "Kh\xF4ng th\u1EC3 m\u1EDF t\u1EC7p n\xE0y",
      "image.close": "\u0110\xF3ng xem tr\u01B0\u1EDBc h\xECnh \u1EA3nh",
      "image.dialog": "Xem tr\u01B0\u1EDBc h\xECnh \u1EA3nh",
      "image.failed": "Kh\xF4ng th\u1EC3 xem tr\u01B0\u1EDBc h\xECnh \u1EA3nh",
      "image.loading": "\u0110ang t\u1EA3i h\xECnh \u1EA3nh\u2026",
      "image.open": "Xem to\xE0n b\u1ED9 h\xECnh \u1EA3nh",
      "json.truncated": "\u2026 \u0111\xE3 c\u1EAFt b\u1EDBt, t\u1ED5ng {total} k\xFD t\u1EF1",
      "message.branch": "T\u1EA1o nh\xE1nh th\xE0nh h\u1ED9i tho\u1EA1i m\u1EDBi",
      "message.branchUnavailable": "Ch\u1EC9 kh\u1EA3 d\u1EE5ng \u1EDF tin nh\u1EAFn cu\u1ED1i c\u1EE7a m\u1ED9t l\u01B0\u1EE3t \u0111\xE3 ho\xE0n th\xE0nh",
      "message.compaction": "\u0110\xE3 n\xE9n ng\u1EEF c\u1EA3nh",
      "message.compaction.commandTitle": "compact",
      "message.compaction.completed": "\u0110\xE3 n\xE9n {items} m\u1EE5c l\u1ECBch s\u1EED (~{tokens} token)",
      "message.compaction.expand": "Xem t\xF3m t\u1EAFt n\xE9n",
      "message.compaction.running": "\u0110ang n\xE9n ng\u1EEF c\u1EA3nh\u2026",
      "message.compaction.unavailable": "T\xF3m t\u1EAFt n\xE9n kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "message.context.catalog.more": "\u2026 {count} m\u1EE5c kh\xE1c",
      "message.context.catalog.replaced": "Danh m\u1EE5c thay th\u1EBF",
      "message.context.instructions.added": "\u0111\xE3 th\xEAm",
      "message.context.instructions.loaded": "\u0111\xE3 t\u1EA3i",
      "message.context.instructions.removed": "\u0111\xE3 x\xF3a",
      "message.context.instructions.updated": "\u0111\xE3 c\u1EADp nh\u1EADt",
      "message.context.recall.counts": "gi\u1EEF {retained} \xB7 b\u1ECF {omitted}",
      "message.context.recall.truncated": "\u0111\xE3 c\u1EAFt b\u1EDBt",
      "message.context.relay.from": "T\u1EEB phi\xEAn {session}",
      "message.context.snapshot.supersedes": "Thay th\u1EBF c\xE1c \u1EA3nh ch\u1EE5p tr\u01B0\u1EDBc \u0111\xF3",
      "message.contextInjection": "Ch\xE8n ng\u1EEF c\u1EA3nh",
      "message.contextRecall": "G\u1EE3i nh\u1EDB phi\xEAn",
      "message.continuation.requested": "\u0110\xE3 y\xEAu c\u1EA7u ti\u1EBFp t\u1EE5c t\u1EA1o",
      "message.extraBlock": "Kh\u1ED1i n\u1ED9i dung b\u1ED5 sung",
      "message.failure.accountSignedOut": "\u0110\xE3 d\u1EEBng v\xEC b\u1EA1n \u0111\xE3 \u0111\u0103ng xu\u1EA5t kh\u1ECFi DeepSeek.",
      "message.failure.accountSignInRequired": "H\xE3y \u0111\u0103ng nh\u1EADp DeepSeek v\xE0 \u0111\u1EA3m b\u1EA3o \u0111\xEDch y\xEAu c\u1EA7u h\u1ED7 tr\u1EE3 x\xE1c th\u1EF1c t\xE0i kho\u1EA3n.",
      "message.failure.auth": "API key kh\xF4ng h\u1EE3p l\u1EC7",
      "message.failure.interrupted": "Ti\u1EBFn tr\xECnh DSH \u0111\xE3 tho\xE1t tr\u01B0\u1EDBc khi l\u01B0\u1EE3t n\xE0y ho\xE0n t\u1EA5t (v\xED d\u1EE5: b\u1ECB bu\u1ED9c d\u1EEBng, g\u1EB7p s\u1EF1 c\u1ED1 ho\u1EB7c h\u1EBFt th\u1EDDi gian ch\u1EDD khi \u0111ang t\u1EAFt m\xE1y), n\xEAn l\u01B0\u1EE3t \u0111\xE3 b\u1ECB \u0111\xF3ng khi DSH kh\u1EDFi \u0111\u1ED9ng l\u1EA1i. C\xE1c l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 ch\u01B0a ho\xE0n t\u1EA5t c\xF3 k\u1EBFt qu\u1EA3 kh\xF4ng x\xE1c \u0111\u1ECBnh.",
      "message.failure.quota": "\u0110\xE3 h\u1EBFt h\u1EA1n m\u1EE9c y\xEAu c\u1EA7u.",
      "message.maxTokens": "\u0110\xE3 \u0111\u1EA1t gi\u1EDBi h\u1EA1n token \u0111\u1EA7u ra",
      "message.maxTokens.hint": 'Ph\u1EA3n h\u1ED3i \u0111\xE3 b\u1ECB c\u1EAFt; ph\u1EA7n \u0111\u1EA7u ra tr\u01B0\u1EDBc \u0111\xF3 \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i trong h\u1ED9i tho\u1EA1i. G\u1EEDi "continue" \u0111\u1EC3 model ti\u1EBFp t\u1EE5c.',
      "message.referenceSeparator": ", ",
      "message.referenceSummary": "Phi\xEAn \u0111\u01B0\u1EE3c tham chi\u1EBFu \xB7 {labels}",
      "message.retry.active": "\u0110ang th\u1EED l\u1EA1i y\xEAu c\u1EA7u model",
      "message.retry.cancelled": "\u0110\xE3 h\u1EE7y vi\u1EC7c th\u1EED l\u1EA1i y\xEAu c\u1EA7u model",
      "message.retry.delay": "\u0110\u1ED9 tr\u1EC5 th\u1EED l\u1EA1i: ",
      "message.retry.failure": "L\xFD do th\u1EA5t b\u1EA1i: ",
      "message.retry.scheduled": "\u0110ang ch\u1EDD th\u1EED l\u1EA1i y\xEAu c\u1EA7u model",
      "message.retry.started": "\u0110\xE3 th\u1EED l\u1EA1i y\xEAu c\u1EA7u model",
      "message.retry.status": "{label} ({retry}/{maximum}) \xB7 {seconds}s",
      "message.stepProcess.code": "\u0110ang ch\u1EA1y m\xE3",
      "message.stepProcess.comma": ", ",
      "message.stepProcess.commands": "\u0110ang ch\u1EA1y l\u1EC7nh",
      "message.stepProcess.done.code": "\u0110\xE3 ch\u1EA1y m\xE3",
      "message.stepProcess.done.commands": "\u0110\xE3 ch\u1EA1y l\u1EC7nh",
      "message.stepProcess.done.context": "\u0110\xE3 ch\xE8n ng\u1EEF c\u1EA3nh",
      "message.stepProcess.done.edit": "\u0110\xE3 ch\u1EC9nh s\u1EEDa t\u1EC7p",
      "message.stepProcess.done.plan": "\u0110\xE3 c\u1EADp nh\u1EADt k\u1EBF ho\u1EA1ch",
      "message.stepProcess.done.questions": "\u0110\xE3 \u0111\u1EB7t c\xE2u h\u1ECFi",
      "message.stepProcess.done.read": "\u0110\xE3 \u0111\u1ECDc t\u1EC7p",
      "message.stepProcess.done.readImage": "\u0110\xE3 \u0111\u1ECDc h\xECnh \u1EA3nh",
      "message.stepProcess.done.search": "\u0110\xE3 t\xECm ki\u1EBFm m\xE3",
      "message.stepProcess.done.subagents": "\u0110\xE3 ph\u1ED1i h\u1EE3p c\xE1c subagent",
      "message.stepProcess.done.thinking": "\u0110\xE3 ph\xE2n t\xEDch xong",
      "message.stepProcess.done.tools": "\u0110\xE3 g\u1ECDi c\xF4ng c\u1EE5",
      "message.stepProcess.done.webFetch": "\u0110\xE3 truy c\u1EADp trang web",
      "message.stepProcess.done.webSearch": "\u0110\xE3 t\xECm ki\u1EBFm tr\xEAn web",
      "message.stepProcess.done.write": "\u0110\xE3 ghi t\u1EC7p",
      "message.stepProcess.edit": "\u0110ang ch\u1EC9nh s\u1EEDa t\u1EC7p",
      "message.stepProcess.joinTwo": "{first} v\xE0 {second}",
      "message.stepProcess.more": "{title}, v.v.",
      "message.stepProcess.plan": "\u0110ang c\u1EADp nh\u1EADt k\u1EBF ho\u1EA1ch",
      "message.stepProcess.prepare.code": "\u0110ang chu\u1EA9n b\u1ECB ch\u1EA1y m\xE3",
      "message.stepProcess.prepare.commands": "\u0110ang chu\u1EA9n b\u1ECB ch\u1EA1y l\u1EC7nh",
      "message.stepProcess.prepare.edit": "\u0110ang chu\u1EA9n b\u1ECB ch\u1EC9nh s\u1EEDa t\u1EC7p",
      "message.stepProcess.prepare.plan": "\u0110ang chu\u1EA9n b\u1ECB c\u1EADp nh\u1EADt k\u1EBF ho\u1EA1ch",
      "message.stepProcess.prepare.questions": "\u0110ang chu\u1EA9n b\u1ECB c\xE2u h\u1ECFi",
      "message.stepProcess.prepare.read": "\u0110ang chu\u1EA9n b\u1ECB \u0111\u1ECDc t\u1EC7p",
      "message.stepProcess.prepare.readImage": "\u0110ang chu\u1EA9n b\u1ECB \u0111\u1ECDc h\xECnh \u1EA3nh",
      "message.stepProcess.prepare.search": "\u0110ang chu\u1EA9n b\u1ECB t\xECm ki\u1EBFm m\xE3",
      "message.stepProcess.prepare.subagents": "\u0110ang chu\u1EA9n b\u1ECB ph\u1ED1i h\u1EE3p c\xE1c subagent",
      "message.stepProcess.prepare.tools": "\u0110ang chu\u1EA9n b\u1ECB g\u1ECDi c\xF4ng c\u1EE5",
      "message.stepProcess.prepare.webFetch": "\u0110ang chu\u1EA9n b\u1ECB truy c\u1EADp trang web",
      "message.stepProcess.prepare.webSearch": "\u0110ang chu\u1EA9n b\u1ECB t\xECm ki\u1EBFm tr\xEAn web",
      "message.stepProcess.prepare.write": "\u0110ang chu\u1EA9n b\u1ECB ghi t\u1EC7p",
      "message.stepProcess.questions": "\u0110ang ch\u1EDD b\u1EA1n thao t\xE1c",
      "message.stepProcess.read": "\u0110ang \u0111\u1ECDc t\u1EC7p",
      "message.stepProcess.readImage": "\u0110ang \u0111\u1ECDc h\xECnh \u1EA3nh",
      "message.stepProcess.search": "\u0110ang t\xECm ki\u1EBFm m\xE3",
      "message.stepProcess.sharedPrefix": "",
      "message.stepProcess.subagents": "\u0110ang ph\u1ED1i h\u1EE3p c\xE1c subagent",
      "message.stepProcess.thinking": "\u0110ang ph\xE2n t\xEDch y\xEAu c\u1EA7u",
      "message.stepProcess.tools": "\u0110ang g\u1ECDi c\xF4ng c\u1EE5",
      "message.stepProcess.webFetch": "\u0110ang truy c\u1EADp trang web",
      "message.stepProcess.webSearch": "\u0110ang t\xECm ki\u1EBFm tr\xEAn web",
      "message.stepProcess.write": "\u0110ang ghi t\u1EC7p",
      "message.stopped": "\u0110\xE3 d\u1EEBng",
      "message.systemPrompt": "L\u1EDDi nh\u1EAFc h\u1EC7 th\u1ED1ng",
      "message.systemPromptUpdate": "C\u1EADp nh\u1EADt l\u1EDDi nh\u1EAFc h\u1EC7 th\u1ED1ng",
      "message.taskStopped": "T\xE1c v\u1EE5 \u0111\xE3 d\u1EEBng",
      "message.think": "Suy ngh\u0129",
      "message.tokensPerSecond": "{tps} tok/s",
      "message.toolAdded": "\u0110\xE3 th\xEAm c\xF4ng c\u1EE5: {name}",
      "message.toolRemoved": "\u0110\xE3 x\xF3a c\xF4ng c\u1EE5: {name}",
      "message.toolsAdded": "\u0110\xE3 th\xEAm: {names}",
      "message.toolsAddedCount": "{count} \u0111\xE3 th\xEAm",
      "message.toolsChanged": "{added} \u0111\xE3 th\xEAm, {removed} \u0111\xE3 x\xF3a",
      "message.toolsRemoved": "\u0110\xE3 x\xF3a: {names}",
      "message.toolsRemovedCount": "{count} \u0111\xE3 x\xF3a",
      "message.toolsUpdated": "\u0110\xE3 c\u1EADp nh\u1EADt c\xF4ng c\u1EE5",
      "message.trigger.agent": "\u0110\xE3 nh\u1EADn tin nh\u1EAFn t\xE1c v\u1EE5",
      "message.trigger.explanation": "Th\xF4ng b\xE1o n\xE0y \u0111\xE3 k\xEDch ho\u1EA1t ph\u1EA3n h\u1ED3i n\xE0y.",
      "message.trigger.github": "\u0110\xE3 nh\u1EADn s\u1EF1 ki\u1EC7n GitHub",
      "message.trigger.goal": "\u0110ang ti\u1EBFp t\u1EE5c m\u1EE5c ti\xEAu",
      "message.trigger.job": "\u0110\xE3 c\u1EADp nh\u1EADt t\xE1c v\u1EE5 n\u1EC1n",
      "message.trigger.plugin": "\u0110\xE3 c\u1EADp nh\u1EADt tr\u1EA1ng th\xE1i plugin",
      "message.trigger.request": "Y\xEAu c\u1EA7u th\u1EF1c thi",
      "message.trigger.schedule": "T\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng h\xF3a",
      "message.trigger.subagent": "\u0110\xE3 c\u1EADp nh\u1EADt tr\u1EA1ng th\xE1i t\xE1c v\u1EE5 con",
      "message.trigger.subagent.aborted": "L\u01B0\u1EE3t ch\u1EA1y subagent \u0111\xE3 d\u1EEBng",
      "message.trigger.subagent.completed": "L\u01B0\u1EE3t ch\u1EA1y subagent \u0111\xE3 ho\xE0n th\xE0nh",
      "message.trigger.subagent.error": "L\u01B0\u1EE3t ch\u1EA1y subagent th\u1EA5t b\u1EA1i",
      "message.trigger.subagent.maxTokens": "Subagent \u0111\xE3 \u0111\u1EA1t gi\u1EDBi h\u1EA1n token",
      "message.trigger.subagent.refusal": "Subagent \u0111\xE3 t\u1EEB ch\u1ED1i t\xE1c v\u1EE5",
      "message.trigger.subagent.unknown": "L\u01B0\u1EE3t ch\u1EA1y subagent k\u1EBFt th\xFAc b\u1EA5t ng\u1EDD",
      "message.trigger.team": "\u0110\xE3 nh\u1EADn tin nh\u1EAFn nh\xF3m",
      "message.trigger.webhook": "\u0110\xE3 nh\u1EADn s\u1EF1 ki\u1EC7n b\xEAn ngo\xE0i",
      "message.turnError": "L\u01B0\u1EE3t n\xE0y th\u1EA5t b\u1EA1i",
      "message.turnProcess.failed": "Th\u1EA5t b\u1EA1i",
      "message.turnProcess.messages.one": "{count} tin nh\u1EAFn",
      "message.turnProcess.messages.other": "{count} tin nh\u1EAFn",
      "message.turnProcess.separator": " \xB7 ",
      "message.turnProcess.subagents.one": "{count} subagent",
      "message.turnProcess.subagents.other": "{count} subagent",
      "message.turnProcess.thoughtForAWhile": "\u0110\xE3 suy ngh\u0129 m\u1ED9t l\xFAc",
      "message.turnProcess.took": "Ho\xE0n th\xE0nh trong ",
      "message.turnProcess.toolCalls.one": "{count} l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5",
      "message.turnProcess.toolCalls.other": "{count} l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5",
      "message.turnProcess.worked": "\u0110\xE3 ho\xE0n th\xE0nh",
      "message.turnUsage.cacheHit": "Tr\xFAng cache",
      "message.turnUsage.cacheRead": "\u0110\u1EA7u v\xE0o \u0111\xE3 cache",
      "message.turnUsage.cacheWrite": "Ghi cache",
      "message.turnUsage.consumed": "M\u1EE9c s\u1EED d\u1EE5ng {total}",
      "message.turnUsage.count": "{count} tok",
      "message.turnUsage.input": "\u0110\u1EA7u v\xE0o ch\u01B0a cache",
      "message.turnUsage.model": "Nh\xE0 cung c\u1EA5p / model",
      "message.turnUsage.output": "\u0110\u1EA7u ra",
      "message.turnUsage.reasoning": " ({tokens} suy lu\u1EADn)",
      "message.turnUsage.title": "M\u1EE9c s\u1EED d\u1EE5ng c\u1EE7a l\u01B0\u1EE3t",
      "message.unknownBlock": "Kh\u1ED1i n\u1ED9i dung kh\xF4ng x\xE1c \u0111\u1ECBnh",
      "message.unknownSurface": "S\u1EF1 ki\u1EC7n b\u1EC1 m\u1EB7t kh\xF4ng x\xE1c \u0111\u1ECBnh: {type}",
      "number.groupSeparator": ",",
      "row.failed": "Th\u1EA5t b\u1EA1i",
      "row.running": "\u0110ang ch\u1EA1y",
      "settings.collapse.completion": "Khi ho\xE0n th\xE0nh",
      "settings.collapse.description": "Ch\u1ECDn th\u1EDDi \u0111i\u1EC3m t\u1EF1 \u0111\u1ED9ng thu g\u1ECDn chi ti\u1EBFt c\xF4ng vi\u1EC7c",
      "settings.collapse.nextInput": "Khi c\xF3 tin nh\u1EAFn ti\u1EBFp theo",
      "settings.collapse.title": "Khi n\xE0o thu g\u1ECDn chi ti\u1EBFt c\xF4ng vi\u1EC7c",
      "settings.foldedReplies.all": "T\u1EA5t c\u1EA3 ph\u1EA3n h\u1ED3i",
      "settings.foldedReplies.description": "Ch\u1ECDn nh\u1EEFng ph\u1EA3n h\u1ED3i c\u1EE7a tr\u1EE3 l\xFD v\u1EABn hi\u1EC3n th\u1ECB khi chi ti\u1EBFt c\xF4ng vi\u1EC7c \u0111\u01B0\u1EE3c thu g\u1ECDn",
      "settings.foldedReplies.final": "Ch\u1EC9 c\xE2u tr\u1EA3 l\u1EDDi cu\u1ED1i c\xF9ng",
      "settings.foldedReplies.title": "Ph\u1EA3n h\u1ED3i sau khi thu g\u1ECDn",
      "settings.links.description": "Ch\u1ECDn n\u01A1i m\u1EDF c\xE1c li\xEAn k\u1EBFt web",
      "settings.links.newTab": "Tr\xECnh duy\u1EC7t m\u1EB7c \u0111\u1ECBnh",
      "settings.links.sidebar": "Thanh b\xEAn trong \u1EE9ng d\u1EE5ng",
      "settings.links.title": "M\u1EDF li\xEAn k\u1EBFt chat trong",
      "settings.performance.compact": "G\u1ECDn",
      "settings.performance.description": "Ch\u1ECDn l\u01B0\u1EE3ng th\xF4ng tin v\u1EC1 hi\u1EC7u n\u0103ng v\xE0 m\u1EE9c s\u1EED d\u1EE5ng c\u1EA7n hi\u1EC3n th\u1ECB",
      "settings.performance.detailed": "Chi ti\u1EBFt",
      "settings.performance.title": "Hi\u1EC7u n\u0103ng & m\u1EE9c s\u1EED d\u1EE5ng",
      "settings.transcript.compact": "G\u1ECDn",
      "settings.transcript.description": "Ch\u1ECDn m\u1EE9c \u0111\u1ED9 chi ti\u1EBFt hi\u1EC3n th\u1ECB cho c\xE1c l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5",
      "settings.transcript.detailed": "Chi ti\u1EBFt",
      "settings.transcript.standard": "Ti\xEAu chu\u1EA9n",
      "settings.transcript.title": "Chi ti\u1EBFt c\xF4ng vi\u1EC7c",
      "settings.transcript.verbose": "\u0110\u1EA7y \u0111\u1EE7",
      "stats.cacheHit": "Tr\xFAng cache {percent}%",
      "stats.counts": "{turns} l\u01B0\u1EE3t {steps} b\u01B0\u1EDBc",
      "stats.dialog.llmTime": "Th\u1EDDi gian LLM",
      "stats.dialog.speed": "Token m\u1ED7i gi\xE2y (TPS)",
      "stats.dialog.title": "Th\u1ED1ng k\xEA phi\xEAn",
      "stats.dialog.toolTime": "Th\u1EDDi gian c\xF4ng c\u1EE5",
      "stats.dialog.ttft": "Th\u1EDDi gian trung b\xECnh \u0111\u1EBFn token \u0111\u1EA7u ti\xEAn (TTFT)",
      "stats.dialog.usageTitle": "L\u01B0\u1EE3ng token s\u1EED d\u1EE5ng",
      "view.chat": "Chat"
    },
    "command": {
      "description.compact": "N\xE9n l\u1ECBch s\u1EED h\u1ED9i tho\u1EA1i c\u0169",
      "description.export": "T\u1EA3i nh\u1EADt k\xFD phi\xEAn n\xE0y d\u01B0\u1EDBi d\u1EA1ng t\u1EC7p ZIP",
      "description.feedback": "Ghi l\u1EA1i ph\u1EA3n h\u1ED3i v\u1EC1 phi\xEAn n\xE0y",
      "description.goal": "\u0110\u1EB7t ho\u1EB7c xem m\u1EE5c ti\xEAu cho t\xE1c v\u1EE5 d\xE0i h\u1EA1n",
      "description.permission": "Chuy\u1EC3n m\u1EABu quy\u1EC1n (ch\u1EBF \u0111\u1ED9 sandbox + ch\xEDnh s\xE1ch ph\xEA duy\u1EC7t)",
      "description.plan": "V\xE0o ho\u1EB7c tho\xE1t ch\u1EBF \u0111\u1ED9 l\u1EADp k\u1EBF ho\u1EA1ch",
      "label.compact": "N\xE9n",
      "label.export": "Xu\u1EA5t",
      "label.feedback": "Ph\u1EA3n h\u1ED3i",
      "label.goal": "M\u1EE5c ti\xEAu",
      "label.permission": "Quy\u1EC1n",
      "label.plan": "K\u1EBF ho\u1EA1ch",
      "listbox.aria": "K\u1EBFt qu\u1EA3 kh\u1EDBp /{command}",
      "notice.attachmentsUnsupported": "/{command} kh\xF4ng ch\u1EA5p nh\u1EADn t\u1EC7p \u0111\xEDnh k\xE8m; h\xE3y x\xF3a ch\xFAng tr\u01B0\u1EDBc",
      "overlay.aria": "T\xF9y ch\u1ECDn /{command}",
      "search.aria": "L\u1ECDc t\xF9y ch\u1ECDn",
      "search.placeholder": "T\xECm ki\u1EBFm\u2026",
      "section.add": "Th\xEAm",
      "section.commands": "L\u1EC7nh",
      "status.applying": "\u0110ang \xE1p d\u1EE5ng\u2026",
      "status.empty": "Kh\xF4ng c\xF3 t\xF9y ch\u1ECDn",
      "status.loading": "\u0110ang t\u1EA3i t\xF9y ch\u1ECDn\u2026",
      "token.compact": "compact",
      "token.export": "export",
      "token.feedback": "feedback",
      "token.goal": "goal",
      "token.permission": "permission",
      "token.plan": "plan"
    },
    "common": {
      "back": "Quay l\u1EA1i",
      "brand.localBuild": "B\u1EA3n d\u1EF1ng c\u1EE5c b\u1ED9 DSH",
      "cancel": "H\u1EE7y",
      "close": "\u0110\xF3ng",
      "codeBlock.title": "Kh\u1ED1i m\xE3",
      "codeBlock.unwrap": "Kh\xF4ng b\u1ECDc d\xF2ng",
      "codeBlock.wrap": "B\u1ECDc d\xF2ng",
      "collapse": "Thu g\u1ECDn",
      "copied": "\u0110\xE3 sao ch\xE9p",
      "copy": "Sao ch\xE9p",
      "copy.compactJson": "Sao ch\xE9p JSON thu g\u1ECDn",
      "copy.failed": "Sao ch\xE9p th\u1EA5t b\u1EA1i",
      "copy.json": "Sao ch\xE9p JSON",
      "copy.optionsHint": "{action}; nh\u1EA5p chu\u1ED9t ph\u1EA3i \u0111\u1EC3 xem t\xF9y ch\u1ECDn sao ch\xE9p",
      "copy.path": "Sao ch\xE9p \u0111\u01B0\u1EDDng d\u1EABn thu\u1ED9c t\xEDnh",
      "copy.prettyJson": "Sao ch\xE9p JSON \u0111\u1ECBnh d\u1EA1ng \u0111\u1EB9p",
      "copy.value": "Sao ch\xE9p gi\xE1 tr\u1ECB",
      "delete": "X\xF3a",
      "edit": "S\u1EEDa",
      "expand": "M\u1EDF r\u1ED9ng",
      "json.label": "JSON",
      "load.failed": "T\u1EA3i th\u1EA5t b\u1EA1i",
      "loading": "\u0110ang t\u1EA3i\u2026",
      "markdown.footnotes": "Ch\xFA th\xEDch cu\u1ED1i trang",
      "markdown.truncatedCharacters": "\u2026 \u0111\xE3 c\u1EAFt ng\u1EAFn t\u1EA1i {total} k\xFD t\u1EF1",
      "more": "Th\xEAm",
      "next": "Ti\u1EBFp",
      "none": "Kh\xF4ng c\xF3",
      "number.million": "{value}M",
      "number.thousand": "{value}K",
      "ok": "OK",
      "previous": "Tr\u01B0\u1EDBc",
      "retry": "Th\u1EED l\u1EA1i",
      "save": "L\u01B0u",
      "search": "T\xECm ki\u1EBFm",
      "skip": "B\u1ECF qua",
      "submit": "G\u1EEDi",
      "submitting": "\u0110ang g\u1EEDi\u2026",
      "truncated": "\u0110\xE3 c\u1EAFt ng\u1EAFn",
      "unknown": "Kh\xF4ng r\xF5",
      "workspace.defaultName": "Workspace m\u1EB7c \u0111\u1ECBnh"
    },
    "contextMenu": {
      "back": "Quay l\u1EA1i",
      "failed": "Kh\xF4ng th\u1EC3 ho\xE0n t\u1EA5t h\xE0nh \u0111\u1ED9ng. H\xE3y th\u1EED l\u1EA1i."
    },
    "conversation": {
      "ask.answered": "{answered}/{total} \u0111\xE3 tr\u1EA3 l\u1EDDi",
      "ask.cancelled": "\u0111\xE3 h\u1EE7y",
      "ask.cancelledDetail": "B\u1ED9 c\xE2u h\u1ECFi n\xE0y \u0111\xE3 b\u1ECB h\u1EE7y tr\u01B0\u1EDBc khi c\xE2u tr\u1EA3 l\u1EDDi \u0111\u01B0\u1EE3c g\u1EEDi.",
      "ask.closed": "\u0111\xE3 \u0111\xF3ng",
      "ask.closedDetail": "C\xE2u h\u1ECFi n\xE0y \u0111\xE3 \u0111\xF3ng; k\u1EBFt qu\u1EA3 c\u1EE7a n\xF3 n\u1EB1m trong cu\u1ED9c h\u1ED9i tho\u1EA1i b\xEAn d\u01B0\u1EDBi.",
      "ask.interrupted": "b\u1ECB ng\u1EAFt",
      "ask.interruptedDetail": "B\u1ED9 c\xE2u h\u1ECFi n\xE0y \u0111\xE3 b\u1ECB ng\u1EAFt tr\u01B0\u1EDBc khi c\xE2u tr\u1EA3 l\u1EDDi \u0111\u01B0\u1EE3c g\u1EEDi.",
      "ask.pending": "\u0111\xE3 ti\u1EBFp t\u1EE5c; v\u1EABn c\xF3 th\u1EC3 tr\u1EA3 l\u1EDDi",
      "ask.pendingDetail": "Nh\u1EEFng c\xE2u h\u1ECFi \u0111ang ch\u1EDD n\xE0y v\u1EABn c\xF3 th\u1EC3 tr\u1EA3 l\u1EDDi t\u1EEB \xF4 so\u1EA1n tin.",
      "ask.reopen": "Tr\u1EA3 l\u1EDDi",
      "ask.review": "Xem c\xE2u tr\u1EA3 l\u1EDDi",
      "ask.rowTitle": "\u0110\u1EB7t c\xE2u h\u1ECFi",
      "ask.skipped": "Ch\u01B0a tr\u1EA3 l\u1EDDi",
      "ask.waiting": "\u0111ang ch\u1EDD",
      "attachment.directoryDesktopOnly": "Ch\u1EC9 c\xF3 th\u1EC3 th\xEAm th\u01B0 m\u1EE5c trong \u1EE9ng d\u1EE5ng desktop; h\xE3y th\xEAm t\u1EEBng t\u1EC7p ri\xEAng l\u1EBB trong tr\xECnh duy\u1EC7t",
      "attachment.dropBlocked": "Hi\u1EC7n kh\xF4ng th\u1EC3 th\xEAm t\u1EC7p v\xE0 h\xECnh \u1EA3nh",
      "attachment.dropDesc": "Gi\u1EDBi h\u1EA1n h\xECnh \u1EA3nh: t\u1ED1i \u0111a {count} h\xECnh, {size} m\u1ED7i h\xECnh",
      "attachment.dropTitle": "K\xE9o t\u1EC7p ho\u1EB7c h\xECnh \u1EA3nh v\xE0o \u0111\xE2y \u0111\u1EC3 th\xEAm",
      "attachment.pathUnavailable": "Kh\xF4ng l\u1EA5y \u0111\u01B0\u1EE3c \u0111\u01B0\u1EDDng d\u1EABn th\u01B0 m\u1EE5c; h\xE3y k\xE9o l\u1EA1i l\u1EA7n n\u1EEFa",
      "attachment.pathUnsupported": "\u0110\u01B0\u1EDDng d\u1EABn ch\u1EE9a k\xFD t\u1EF1 m\xE0 tham chi\u1EBFu kh\xF4ng th\u1EC3 mang theo; h\xE3y \u0111\u1ED5i t\xEAn r\u1ED3i th\u1EED l\u1EA1i",
      "attachment.pending": "T\u1EC7p \u0111\xEDnh k\xE8m \u0111ang ch\u1EDD",
      "attachment.scrollLeft": "Cu\u1ED9n t\u1EC7p \u0111\xEDnh k\xE8m sang tr\xE1i",
      "attachment.scrollRight": "Cu\u1ED9n t\u1EC7p \u0111\xEDnh k\xE8m sang ph\u1EA3i",
      "bash.failed": "Th\u1EA5t b\u1EA1i",
      "bash.running": "\u0110ang ch\u1EA1y",
      "bash.stopped": "\u0110\xE3 d\u1EEBng",
      "command.attachmentsUnsupported": "/{command} kh\xF4ng nh\u1EADn t\u1EC7p \u0111\xEDnh k\xE8m; h\xE3y x\xF3a ch\xFAng tr\u01B0\u1EDBc",
      "context.aria": "\u0110\xE3 d\xF9ng {percent} ng\u1EEF c\u1EA3nh",
      "context.messages": "Tin nh\u1EAFn",
      "context.system": "L\u1EDDi nh\u1EAFc h\u1EC7 th\u1ED1ng",
      "context.tools": "\u0110\u1ECBnh ngh\u0129a c\xF4ng c\u1EE5",
      "context.used": "ng\u1EEF c\u1EA3nh \u0111\xE3 d\xF9ng",
      "detail.agent.reply": "Ph\u1EA3n h\u1ED3i c\u1EE7a agent",
      "detail.agents.count": "{count} agent",
      "detail.days": "{count} ng\xE0y",
      "detail.empty": "Kh\xF4ng c\xF3 k\u1EBFt qu\u1EA3",
      "detail.event.neighbors": "S\u1EF1 ki\u1EC7n xung quanh",
      "detail.field.agent": "ID agent",
      "detail.field.agentDescription": "M\xF4 t\u1EA3 t\xE1c v\u1EE5 c\u1EE7a agent",
      "detail.field.agentName": "T\xEAn agent",
      "detail.field.agents": "Agent \u0111\xE3 kh\u1EDFi ch\u1EA1y",
      "detail.field.availability": "Kh\u1EA3 d\u1EE5ng",
      "detail.field.bestMatch": "Kh\u1EDBp nh\u1EA5t",
      "detail.field.callId": "ID l\u1EC7nh g\u1ECDi",
      "detail.field.content": "N\u1ED9i dung",
      "detail.field.context": "Ng\u1EEF c\u1EA3nh",
      "detail.field.currentPackage": "G\xF3i hi\u1EC7n t\u1EA1i",
      "detail.field.data": "D\u1EEF li\u1EC7u",
      "detail.field.dependencies": "Ph\u1EE5 thu\u1ED9c",
      "detail.field.diagnostics": "Ch\u1EA9n \u0111o\xE1n",
      "detail.field.exitCode": "M\xE3 tho\xE1t",
      "detail.field.id": "ID",
      "detail.field.inputSchema": "L\u01B0\u1EE3c \u0111\u1ED3 \u0111\u1EA7u v\xE0o",
      "detail.field.job": "ID t\xE1c v\u1EE5",
      "detail.field.latestRun": "L\u1EA7n ch\u1EA1y g\u1EA7n nh\u1EA5t",
      "detail.field.message": "Tin nh\u1EAFn",
      "detail.field.messageId": "ID tin nh\u1EAFn",
      "detail.field.methods": "Ph\u01B0\u01A1ng th\u1EE9c",
      "detail.field.model": "Model",
      "detail.field.nextPackage": "G\xF3i ti\u1EBFp theo",
      "detail.field.outputSchema": "L\u01B0\u1EE3c \u0111\u1ED3 \u0111\u1EA7u ra",
      "detail.field.owner": "Ch\u1EE7 s\u1EDF h\u1EEFu",
      "detail.field.packages": "G\xF3i",
      "detail.field.parent": "C\u1EA5p cha",
      "detail.field.pid": "ID ti\u1EBFn tr\xECnh",
      "detail.field.platform": "N\u1EC1n t\u1EA3ng",
      "detail.field.previousStatus": "Tr\u1EA1ng th\xE1i tr\u01B0\u1EDBc",
      "detail.field.processGroup": "Nh\xF3m ti\u1EBFn tr\xECnh",
      "detail.field.props": "Props",
      "detail.field.provider": "Nh\xE0 cung c\u1EA5p",
      "detail.field.ready": "S\u1EB5n s\xE0ng",
      "detail.field.registrations": "\u0110\u0103ng k\xFD",
      "detail.field.result": "K\u1EBFt qu\u1EA3",
      "detail.field.revision": "Phi\xEAn b\u1EA3n",
      "detail.field.role": "Vai tr\xF2",
      "detail.field.root": "G\u1ED1c",
      "detail.field.seq": "Chu\u1ED7i s\u1EF1 ki\u1EC7n",
      "detail.field.signal": "T\xEDn hi\u1EC7u",
      "detail.field.source": "Ngu\u1ED3n",
      "detail.field.step": "B\u01B0\u1EDBc",
      "detail.field.surface": "Tr\u1EA1ng th\xE1i b\u1EA3n ghi",
      "detail.field.target": "S\u1EF1 ki\u1EC7n \u0111\xEDch",
      "detail.field.task": "T\xE1c v\u1EE5",
      "detail.field.time": "Th\u1EDDi gian",
      "detail.field.turn": "L\u01B0\u1EE3t",
      "detail.field.type": "Lo\u1EA1i",
      "detail.field.warnings": "C\u1EA3nh b\xE1o",
      "detail.field.writeScopes": "Ph\u1EA1m vi ghi",
      "detail.goal.active": "\u0110ang ho\u1EA1t \u0111\u1ED9ng",
      "detail.goal.blocked": "B\u1ECB ch\u1EB7n",
      "detail.goal.complete": "Ho\xE0n th\xE0nh",
      "detail.goal.disarmed": "Ch\u1EDD ti\u1EBFp t\u1EE5c",
      "detail.goal.empty": "Kh\xF4ng c\xF3 m\u1EE5c ti\xEAu",
      "detail.goal.paused": "T\u1EA1m d\u1EEBng",
      "detail.goal.reason": "\u0110i\u1EC3m ch\u1EB7n",
      "detail.goal.rounds": "S\u1ED1 v\xF2ng",
      "detail.hours": "{count} gi\u1EDD",
      "detail.jobs.count": "{count} t\xE1c v\u1EE5 n\u1EC1n",
      "detail.location": "D\xF2ng {line}, c\u1ED9t {column}",
      "detail.locations.count": "{count} v\u1ECB tr\xED",
      "detail.matches.capped": "\u0110\xE3 \u0111\u1EA1t gi\u1EDBi h\u1EA1n k\u1EBFt qu\u1EA3; h\xE3y thu h\u1EB9p t\xECm ki\u1EBFm \u0111\u1EC3 xem th\xEAm",
      "detail.matches.count": "{count} k\u1EBFt qu\u1EA3 kh\u1EDBp",
      "detail.minutes": "{count} ph\xFAt",
      "detail.models.title": "Model kh\u1EA3 d\u1EE5ng",
      "detail.moreInInspect": "C\xF2n {count} m\u1EE5c trong Inspect",
      "detail.no": "Kh\xF4ng",
      "detail.none": "Kh\xF4ng c\xF3",
      "detail.output.lines": "D\xF2ng {begin}\u2013{end} trong {total}",
      "detail.output.truncated": "\u0110\u1EA7u ra \u0111\xE3 b\u1ECB c\u1EAFt",
      "detail.plugins.count": "{count} plugin \u0111\u1ED9ng",
      "detail.providers.count": "{count} nh\xE0 cung c\u1EA5p inspect",
      "detail.ralph.limit": "\u0110\xE3 \u0111\u1EA1t gi\u1EDBi h\u1EA1n s\u1ED1 v\xF2ng",
      "detail.ralph.reportedBlocker": "Worker b\xE1o c\xF3 \u0111i\u1EC3m ch\u1EB7n",
      "detail.ralph.reportedComplete": "Worker b\xE1o \u0111\xE3 ho\xE0n th\xE0nh",
      "detail.receipt.alreadyFinished": "\u0110\xE3 k\u1EBFt th\xFAc tr\u01B0\u1EDBc \u0111\xF3",
      "detail.receipt.cancel": "\u0110\xE3 y\xEAu c\u1EA7u h\u1EE7y",
      "detail.receipt.closed": "\u0110\xE3 \u0111\xF3ng",
      "detail.receipt.closing": "\u0110ang \u0111\xF3ng",
      "detail.receipt.delivered": "\u0110\xE3 g\u1EEDi tin nh\u1EAFn",
      "detail.receipt.interrupt": "\u0110\xE3 y\xEAu c\u1EA7u ng\u1EAFt",
      "detail.receipt.signal": "\u0110\xE3 g\u1EEDi t\xEDn hi\u1EC7u",
      "detail.receipt.started": "\u0110\xE3 b\u1EAFt \u0111\u1EA7u",
      "detail.recordedResult": "K\u1EBFt qu\u1EA3 \u0111\xE3 ghi",
      "detail.report.nextSteps": "C\xF4ng vi\u1EC7c c\xF2n l\u1EA1i",
      "detail.schedule.active": "\u0110\xE3 b\u1EADt",
      "detail.schedule.count": "{count} t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng",
      "detail.schedule.cron": "Cron {expression} ({zone})",
      "detail.schedule.custom": "T\xF9y ch\u1EC9nh",
      "detail.schedule.daily": "M\u1ED7i ng\xE0y l\xFAc {time} ({zone})",
      "detail.schedule.deleted": "\u0110\xE3 x\xF3a",
      "detail.schedule.empty": "Kh\xF4ng c\xF3 t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng",
      "detail.schedule.ended": "\u0110\xE3 k\u1EBFt th\xFAc",
      "detail.schedule.every": "M\u1ED7i {interval}",
      "detail.schedule.frequency": "L\u1EB7p l\u1EA1i",
      "detail.schedule.once": "M\u1ED9t l\u1EA7n",
      "detail.schedule.overdue": "Qu\xE1 h\u1EA1n, \u0111ang ch\u1EDD ti\u1EBFp t\u1EE5c phi\xEAn",
      "detail.schedule.paused": "T\u1EA1m d\u1EEBng",
      "detail.schedule.scheduled": "\u0110\xE3 l\xEAn l\u1ECBch",
      "detail.schedule.weekly": "H\xE0ng tu\u1EA7n v\xE0o {days} l\xFAc {time} ({zone})",
      "detail.schedule.when": "L\xEAn l\u1ECBch cho",
      "detail.seconds": "{count} gi\xE2y",
      "detail.state": "Tr\u1EA1ng th\xE1i",
      "detail.status.accepted": "\u0110\xE3 ch\u1EA5p nh\u1EADn",
      "detail.status.completed": "Ho\xE0n th\xE0nh",
      "detail.status.corrupt": "H\u1ECFng",
      "detail.status.deleted": "\u0110\xE3 x\xF3a",
      "detail.status.exited": "\u0110\xE3 tho\xE1t",
      "detail.status.failed": "Th\u1EA5t b\u1EA1i",
      "detail.status.idle": "R\u1EA3nh",
      "detail.status.inactive": "Kh\xF4ng ho\u1EA1t \u0111\u1ED9ng",
      "detail.status.killed": "\u0110\xE3 h\u1EE7y",
      "detail.status.provisioning": "\u0110ang kh\u1EDFi t\u1EA1o",
      "detail.status.queued": "Trong h\xE0ng \u0111\u1EE3i",
      "detail.status.ready": "S\u1EB5n s\xE0ng",
      "detail.status.running": "\u0110ang ch\u1EA1y",
      "detail.status.unavailable": "Kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "detail.status.unsupported": "Kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3",
      "detail.tasks.count": "{count} t\xE1c v\u1EE5 nh\xF3m",
      "detail.tasks.nextPage": "C\xF2n t\xE1c v\u1EE5 kh\xE1c; con tr\u1ECF ti\u1EBFp theo l\xE0 {cursor}",
      "detail.terminals.count": "{count} terminal",
      "detail.todo.completed": "Ho\xE0n th\xE0nh",
      "detail.todo.empty": "Danh s\xE1ch vi\u1EC7c c\u1EA7n l\xE0m tr\u1ED1ng",
      "detail.todo.in_progress": "\u0110ang th\u1EF1c hi\u1EC7n",
      "detail.todo.pending": "\u0110ang ch\u1EDD",
      "detail.trace.ancestors": "Phi\xEAn c\u1EA5p tr\xEAn",
      "detail.trace.derived": "S\u1EF1 ki\u1EC7n d\u1EABn xu\u1EA5t",
      "detail.trace.descendants": "Phi\xEAn c\u1EA5p d\u01B0\u1EDBi",
      "detail.trace.replacedBy": "\u0110\u01B0\u1EE3c thay th\u1EBF b\u1EDFi",
      "detail.trace.replacementChain": "Chu\u1ED7i thay th\u1EBF",
      "detail.trace.replaces": "S\u1EF1 ki\u1EC7n \u0111\u01B0\u1EE3c thay th\u1EBF",
      "detail.trace.sources": "S\u1EF1 ki\u1EC7n ngu\u1ED3n",
      "detail.wait.ended": "\u0110\xE3 k\u1EBFt th\xFAc ch\u1EDD",
      "detail.wait.noProgress": "Kh\xF4ng c\xF3 subagent \u0111ang ho\u1EA1t \u0111\u1ED9ng",
      "detail.wait.timeout": "H\u1EBFt th\u1EDDi gian ch\u1EDD",
      "detail.wait.title": "K\u1EBFt qu\u1EA3 ch\u1EDD",
      "detail.weekday.1": "T2",
      "detail.weekday.2": "T3",
      "detail.weekday.3": "T4",
      "detail.weekday.4": "T5",
      "detail.weekday.5": "T6",
      "detail.weekday.6": "T7",
      "detail.weekday.7": "CN",
      "detail.weekday.join": ", ",
      "detail.workflow.script": "Script workflow",
      "detail.yes": "C\xF3",
      "details.running": "\u0110ang ch\u1EA1y\u2026",
      "diff.collapseAria": "Thu g\u1ECDn diff",
      "diff.expandAria": "M\u1EDF r\u1ED9ng th\xEAm {count} d\xF2ng diff",
      "diff.expandRest": "\u2026 {count} d\xF2ng n\u1EEFa",
      "error.sessionInUse": "Phi\xEAn n\xE0y \u0111ang \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng, c\xF3 th\u1EC3 b\u1EDFi m\u1ED9t instance DSH kh\xE1c \u0111ang ch\u1EA1y (nh\u01B0 dsh web ho\u1EB7c \u1EE9ng d\u1EE5ng desktop). H\xE3y tho\xE1t c\xE1c instance DSH kh\xE1c r\u1ED3i th\u1EED l\u1EA1i.",
      "file.label": "T\u1EC7p",
      "file.notStaged": "T\u1EC7p ch\u01B0a t\u1EA3i l\xEAn xong; h\xE3y th\xEAm l\u1EA1i v\xE0 th\u1EED l\u1EA1i",
      "file.pending": "T\u1EC7p \u0111ang ch\u1EDD",
      "file.remove": "X\xF3a t\u1EC7p {name}",
      "file.retry": "Th\u1EED t\u1EA3i l\xEAn l\u1EA1i {name}",
      "file.sessionUnavailable": "Phi\xEAn kh\xF4ng kh\u1EA3 d\u1EE5ng; kh\xF4ng th\u1EC3 t\u1EA3i t\u1EC7p l\xEAn",
      "file.stillUploading": "T\u1EC7p v\u1EABn \u0111ang \u0111\u01B0\u1EE3c t\u1EA3i l\xEAn; h\xE3y g\u1EEDi sau khi ho\xE0n t\u1EA5t",
      "file.uploadFailed": "T\u1EA3i l\xEAn th\u1EA5t b\u1EA1i; nh\u1EA5n \u0111\u1EC3 th\u1EED l\u1EA1i",
      "file.uploading": "\u0110ang t\u1EA3i l\xEAn\u2026",
      "header.more": "Thao t\xE1c kh\xE1c",
      "hero.chooseWorkspace": "Ch\u1ECDn workspace",
      "hero.headline": "Ti\u1EBFn v\xE0o v\xF9ng ch\u01B0a bi\u1EBFt",
      "hero.preview": "Xem tr\u01B0\u1EDBc",
      "hint.goal": "m\xF4 t\u1EA3 m\u1EE5c ti\xEAu cho m\u1ED9t t\xE1c v\u1EE5 d\xE0i h\u1EA1n",
      "hint.goal.active": "m\u1EE5c ti\xEAu \u0111ang ho\u1EA1t \u0111\u1ED9ng \u2014 s\u1EEDa / t\u1EA1m d\u1EEBng / ti\u1EBFp t\u1EE5c / x\xF3a",
      "image.closePreview": "\u0110\xF3ng xem tr\u01B0\u1EDBc h\xECnh \u1EA3nh g\u1ED1c",
      "image.dimensionTooLarge": "C\u1EA1nh c\u1EE7a h\xECnh \u1EA3nh t\u1ED1i \u0111a l\xE0 {size}px; h\xE3y thu nh\u1ECF r\u1ED3i th\u1EED l\u1EA1i",
      "image.fileTooLarge": "M\u1ED7i h\xECnh \u1EA3nh ph\u1EA3i nh\u1ECF h\u01A1n {size}",
      "image.label": "H\xECnh \u1EA3nh",
      "image.loadFailed": "Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c h\xECnh \u1EA3nh; nh\u1EA5n \u0111\u1EC3 th\u1EED l\u1EA1i",
      "image.loading": "\u0110ang t\u1EA3i h\xECnh \u1EA3nh\u2026",
      "image.modelUnsupported": "Model hi\u1EC7n t\u1EA1i kh\xF4ng h\u1ED7 tr\u1EE3 h\xECnh \u1EA3nh; h\xE3y chuy\u1EC3n sang model c\xF3 h\u1ED7 tr\u1EE3",
      "image.openOriginal": "Xem b\u1EA3n g\u1ED1c",
      "image.openOriginalLabel": "{label}, nh\u1EA5n \u0111\u1EC3 xem b\u1EA3n g\u1ED1c",
      "image.original": "H\xECnh \u1EA3nh g\u1ED1c",
      "image.pending": "H\xECnh \u1EA3nh \u0111ang ch\u1EDD",
      "image.preview": "Xem tr\u01B0\u1EDBc h\xECnh \u1EA3nh g\u1ED1c",
      "image.remove": "X\xF3a h\xECnh \u1EA3nh {name}",
      "image.sendFailed": "G\u1EEDi h\xECnh \u1EA3nh th\u1EA5t b\u1EA1i ({reason}); h\xE3y th\xEAm l\u1EA1i v\xE0 th\u1EED l\u1EA1i",
      "image.tooMany": "M\u1ED7i tin nh\u1EAFn c\xF3 th\u1EC3 g\u1ED3m t\u1ED1i \u0111a {count} h\xECnh \u1EA3nh",
      "image.tooManyPixels": "\u0110\u1ED9 ph\xE2n gi\u1EA3i h\xECnh \u1EA3nh qu\xE1 cao; h\xE3y n\xE9n r\u1ED3i th\u1EED l\u1EA1i",
      "image.totalTooLarge": "T\u1ED5ng k\xEDch th\u01B0\u1EDBc h\xECnh \u1EA3nh v\u01B0\u1EE3t qu\xE1 {size}; h\xE3y x\xF3a b\u1EDBt v\xE0 th\u1EED l\u1EA1i",
      "image.unsupportedType": "Ch\u1EC9 h\u1ED7 tr\u1EE3 h\xECnh \u1EA3nh PNG, JPG, WebP v\xE0 GIF",
      "input.commands": "Th\xEAm t\u1EC7p ho\u1EB7c ch\u1EA1y l\u1EC7nh",
      "input.continue": "Ti\u1EBFp t\u1EE5c t\u1EA1o",
      "input.file": "T\u1EC7p",
      "input.send": "G\u1EEDi tin nh\u1EAFn",
      "input.send.queue": "\u0110\u01B0a tin nh\u1EAFn v\xE0o h\xE0ng \u0111\u1EE3i",
      "input.send.steer": "\u0110i\u1EC1u h\u01B0\u1EDBng tin nh\u1EAFn",
      "input.sending": "\u0110ang g\u1EEDi tin nh\u1EAFn",
      "input.stop": "D\u1EEBng t\u1EA1o",
      "placeholder.default": "Nh\u1EAFn tin ho\u1EB7c ch\u1EA1y t\xE1c v\u1EE5, / l\u1EC7nh, @ t\u1EC7p ho\u1EB7c phi\xEAn",
      "placeholder.hero": "M\xF4 t\u1EA3 nh\u1EEFng g\xEC b\u1EA1n mu\u1ED1n x\xE2y d\u1EF1ng, / l\u1EC7nh, @ t\u1EC7p ho\u1EB7c phi\xEAn",
      "placeholder.steerQueue": "Cmd/Ctrl+Enter \u0111i\u1EC1u h\u01B0\u1EDBng t\u1EA5t c\u1EA3 tin nh\u1EAFn trong h\xE0ng \u0111\u1EE3i",
      "placeholder.unavailable": "Phi\xEAn kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "placeholder.workspace": "Ch\u1ECDn workspace \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u",
      "queue.cancelEdit": "H\u1EE7y ch\u1EC9nh s\u1EEDa",
      "queue.count": "{n} tin nh\u1EAFn trong h\xE0ng \u0111\u1EE3i",
      "queue.edit": "S\u1EEDa tin nh\u1EAFn trong h\xE0ng \u0111\u1EE3i",
      "queue.edit.unsupported": "Ch\u1EE9a n\u1ED9i dung kh\xF4ng ph\u1EA3i v\u0103n b\u1EA3n; ch\u01B0a h\u1ED7 tr\u1EE3 ch\u1EC9nh s\u1EEDa",
      "queue.editFailed": "Ch\u1EC9nh s\u1EEDa th\u1EA5t b\u1EA1i: tin nh\u1EAFn n\xE0y c\xF3 th\u1EC3 \u0111\xE3 b\u1EAFt \u0111\u1EA7u \u0111\u01B0\u1EE3c g\u1EEDi.",
      "queue.file": "T\u1EC7p trong h\xE0ng \u0111\u1EE3i {name}",
      "queue.image": "H\xECnh \u1EA3nh c\u1EE7a tin nh\u1EAFn trong h\xE0ng \u0111\u1EE3i",
      "queue.remove": "X\xF3a tin nh\u1EAFn trong h\xE0ng \u0111\u1EE3i",
      "queue.removeFailed": "X\xF3a th\u1EA5t b\u1EA1i: tin nh\u1EAFn n\xE0y c\xF3 th\u1EC3 \u0111\xE3 b\u1EAFt \u0111\u1EA7u \u0111\u01B0\u1EE3c g\u1EEDi.",
      "queue.save": "L\u01B0u tin nh\u1EAFn trong h\xE0ng \u0111\u1EE3i",
      "queue.sending": "\u0110ang g\u1EEDi\u2026",
      "queue.steer": "\u0110i\u1EC1u h\u01B0\u1EDBng tin nh\u1EAFn trong h\xE0ng \u0111\u1EE3i",
      "queue.steer.unavailable": "Ch\u1EC9 c\xF3 th\u1EC3 \u0111i\u1EC1u h\u01B0\u1EDBng khi agent \u0111ang ch\u1EA1y",
      "queue.steerFailed": "\u0110i\u1EC1u h\u01B0\u1EDBng th\u1EA5t b\u1EA1i. H\xE3y th\u1EED l\u1EA1i.",
      "quote.remove": "X\xF3a tr\xEDch d\u1EABn",
      "read.collapseAria": "Thu g\u1ECDn n\u1ED9i dung",
      "read.expandAria": "M\u1EDF r\u1ED9ng th\xEAm {count} d\xF2ng",
      "read.expandRest": "\u2026 {count} d\xF2ng n\u1EEFa",
      "read.window": "\u0110ang hi\u1EC3n th\u1ECB {shown} trong {total} d\xF2ng",
      "row.commandArguments": "Tham s\u1ED1 l\u1EC7nh",
      "row.failed": "Th\u1EA5t b\u1EA1i",
      "row.imageSize": "{width}x{height}px, {bytes} byte",
      "row.imageSizeDownscaled": "{width}x{height}px (thu nh\u1ECF t\u1EEB {originalWidth}x{originalHeight}px), {bytes} byte",
      "row.input": "V\xC0O",
      "row.inspect": "Ki\u1EC3m tra",
      "row.output": "RA",
      "row.preparing": "\u0110ang chu\u1EA9n b\u1ECB g\u1ECDi c\xF4ng c\u1EE5",
      "row.running": "\u0110ang ch\u1EA1y",
      "row.stopped": "\u0110\xE3 d\u1EEBng",
      "search.collapseAria": "Thu g\u1ECDn k\u1EBFt qu\u1EA3",
      "search.expandAria": "M\u1EDF r\u1ED9ng th\xEAm {count} d\xF2ng k\u1EBFt qu\u1EA3",
      "search.expandRest": "\u2026 {count} d\xF2ng n\u1EEFa",
      "search.matches": "{shown} k\u1EBFt qu\u1EA3 kh\u1EDBp \xB7 {files} t\u1EC7p",
      "search.matches.truncated": "\u0110ang hi\u1EC3n th\u1ECB {shown} trong {total} k\u1EBFt qu\u1EA3 kh\u1EDBp \xB7 {files} t\u1EC7p",
      "search.noResults": "Kh\xF4ng c\xF3 k\u1EBFt qu\u1EA3",
      "search.paths": "{shown} \u0111\u01B0\u1EDDng d\u1EABn",
      "search.paths.truncated": "\u0110ang hi\u1EC3n th\u1ECB {shown} trong {total} \u0111\u01B0\u1EDDng d\u1EABn",
      "session.hierarchy": "C\u1EA5u tr\xFAc phi\xEAn",
      "session.moreViews": "Ch\u1EBF \u0111\u1ED9 xem h\u1ED9i tho\u1EA1i kh\xE1c",
      "settings.enter.description": "Enter v\xE0 n\xFAt G\u1EEDi s\u1EBD l\xE0m g\xEC khi agent \u0111ang ch\u1EA1y; Cmd/Ctrl+Enter d\xF9ng h\xE0nh vi c\xF2n l\u1EA1i",
      "settings.enter.queue": "H\xE0ng \u0111\u1EE3i",
      "settings.enter.steer": "\u0110i\u1EC1u h\u01B0\u1EDBng",
      "settings.enter.title": "H\xE0nh vi g\u1EEDi khi \u0111ang b\u1EADn",
      "shortcut.complementary": "D\xF9ng thao t\xE1c b\u1ED5 tr\u1EE3 Queue / Steer",
      "shortcut.mention": "M\u1EDF menu tham chi\u1EBFu",
      "shortcut.newline": "Xu\u1ED1ng d\xF2ng",
      "shortcut.slash": "M\u1EDF menu l\u1EC7nh",
      "terminal.collapseAria": "Thu g\u1ECDn \u0111\u1EA7u ra",
      "terminal.commandLine": "D\xF2ng l\u1EC7nh {n}",
      "terminal.done": "Xong",
      "terminal.exitCode": "m\xE3 tho\xE1t {code}",
      "terminal.expandAria": "M\u1EDF r\u1ED9ng {n} d\xF2ng \u0111\u1EA7u ra c\xF2n l\u1EA1i",
      "terminal.expandRest": "\u2026 {n} d\xF2ng n\u1EEFa",
      "terminal.failed": "Th\u1EA5t b\u1EA1i",
      "terminal.noExitCode": "kh\xF4ng c\xF3 m\xE3 tho\xE1t",
      "terminal.noOutput": "Kh\xF4ng c\xF3 \u0111\u1EA7u ra",
      "terminal.running": "\u0110ang ch\u1EA1y",
      "terminal.sendInput": "(g\u1EEDi \u0111\u1EA7u v\xE0o)",
      "terminal.session": "Terminal {sessionId}",
      "terminal.signal": "t\xEDn hi\u1EC7u {signal}",
      "todo.completed": "{done}/{total} \u0111\xE3 ho\xE0n th\xE0nh",
      "todo.diff.added": "{count} \u0111\u01B0\u1EE3c th\xEAm",
      "todo.diff.addedItem": "\u0110\xE3 th\xEAm",
      "todo.diff.compare": "Thay \u0111\u1ED5i so v\u1EDBi danh s\xE1ch tr\u01B0\u1EDBc",
      "todo.diff.initial": "Danh s\xE1ch ban \u0111\u1EA7u",
      "todo.diff.movedItem": "\u0110\xE3 s\u1EAFp x\u1EBFp l\u1EA1i",
      "todo.diff.noChanges": "Danh s\xE1ch kh\xF4ng thay \u0111\u1ED5i",
      "todo.diff.removed": "{count} b\u1ECB x\xF3a",
      "todo.diff.removedItem": "\u0110\xE3 x\xF3a",
      "todo.diff.unavailable": "Danh s\xE1ch tr\u01B0\u1EDBc kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "todo.diff.unchanged": "{count} kh\xF4ng \u0111\u1ED5i",
      "todo.diff.updated": "{count} \u0111\u01B0\u1EE3c c\u1EADp nh\u1EADt",
      "todo.diff.updatedItem": "Tr\u1EA1ng th\xE1i \u0111\xE3 \u0111\u1ED5i",
      "todo.progress.active": "{active} \u0111ang th\u1EF1c hi\u1EC7n",
      "todo.progress.done": "{done} \u0111\xE3 ho\xE0n th\xE0nh",
      "todo.progress.pending": "{pending} \u0111ang ch\u1EDD",
      "todo.rowTitle": "C\u1EADp nh\u1EADt danh s\xE1ch vi\u1EC7c c\u1EA7n l\xE0m",
      "todo.status.completed": "Ho\xE0n th\xE0nh",
      "todo.status.inProgress": "\u0110ang th\u1EF1c hi\u1EC7n",
      "todo.status.pending": "\u0110ang ch\u1EDD",
      "todo.title": "Vi\u1EC7c c\u1EA7n l\xE0m",
      "tool.autoReviewNotExecuted": "C\xF4ng c\u1EE5 kh\xF4ng \u0111\u01B0\u1EE3c th\u1EF1c thi. L\xFD do: {reason}",
      "tool.autoReviewReasonFallback": "Auto review kh\xF4ng cho ph\xE9p thao t\xE1c n\xE0y",
      "tool.autoReviewRejected": "B\u1ECB t\u1EEB ch\u1ED1i b\u1EDFi Auto review",
      "tool.preparing.content": "{kilobytes}KB",
      "tool.title.applyPatch": "S\u1EEDa",
      "tool.title.bash": "Bash",
      "tool.title.closeTerminal": "\u0110\xF3ng terminal",
      "tool.title.code": "M\xE3",
      "tool.title.createGoal": "T\u1EA1o m\u1EE5c ti\xEAu",
      "tool.title.createSchedule": "T\u1EA1o t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng",
      "tool.title.createTeamTask": "T\u1EA1o t\xE1c v\u1EE5 nh\xF3m",
      "tool.title.deleteSchedule": "X\xF3a t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng",
      "tool.title.edit": "S\u1EEDa",
      "tool.title.editSchedule": "S\u1EEDa t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng",
      "tool.title.findDefinition": "T\xECm \u0111\u1ECBnh ngh\u0129a",
      "tool.title.findImplementation": "T\xECm ph\u1EA7n tri\u1EC3n khai",
      "tool.title.findReferences": "T\xECm tham chi\u1EBFu",
      "tool.title.generic": "L\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5",
      "tool.title.getGoal": "Xem m\u1EE5c ti\xEAu",
      "tool.title.getTeamTask": "\u0110\u1ECDc t\xE1c v\u1EE5 nh\xF3m",
      "tool.title.glob": "Glob",
      "tool.title.grep": "Grep",
      "tool.title.hoverSymbol": "Ki\u1EC3m tra k\xFD hi\u1EC7u",
      "tool.title.inspect": "Truy v\u1EA5n m\xF4i tr\u01B0\u1EDDng Cordis",
      "tool.title.inspectPlugins": "Ki\u1EC3m tra plugin",
      "tool.title.inspectProviders": "Ki\u1EC3m tra nh\xE0 cung c\u1EA5p",
      "tool.title.interruptAgent": "Ng\u1EAFt agent",
      "tool.title.killJob": "H\u1EE7y t\xE1c v\u1EE5 n\u1EC1n",
      "tool.title.listAgents": "Li\u1EC7t k\xEA subagent",
      "tool.title.listJobs": "Li\u1EC7t k\xEA t\xE1c v\u1EE5 n\u1EC1n",
      "tool.title.listModels": "Li\u1EC7t k\xEA model",
      "tool.title.listSchedules": "Li\u1EC7t k\xEA t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng",
      "tool.title.listTeamTasks": "Li\u1EC7t k\xEA t\xE1c v\u1EE5 nh\xF3m",
      "tool.title.listTerminals": "Li\u1EC7t k\xEA terminal",
      "tool.title.lsp": "Truy v\u1EA5n k\xFD hi\u1EC7u m\xE3",
      "tool.title.officeConvert": "Chuy\u1EC3n \u0111\u1ED5i t\xE0i li\u1EC7u",
      "tool.title.officeRecalculate": "T\xEDnh l\u1EA1i b\u1EA3ng t\xEDnh",
      "tool.title.officeRender": "K\u1EBFt xu\u1EA5t t\xE0i li\u1EC7u",
      "tool.title.openTerminal": "M\u1EDF terminal",
      "tool.title.pwsh": "Pwsh",
      "tool.title.queryRuntime": "Truy v\u1EA5n runtime",
      "tool.title.ralph": "Ch\u1EA1y v\xF2ng l\u1EB7p ralph",
      "tool.title.read": "\u0110\u1ECDc",
      "tool.title.readEvent": "\u0110\u1ECDc s\u1EF1 ki\u1EC7n",
      "tool.title.readImage": "\u0110\u1ECDc h\xECnh \u1EA3nh",
      "tool.title.readJob": "\u0110\u1ECDc \u0111\u1EA7u ra t\xE1c v\u1EE5",
      "tool.title.readTerminal": "\u0110\u1ECDc terminal",
      "tool.title.removeCordis": "X\xF3a Cordis Plugin",
      "tool.title.runCordis": "Ch\u1EA1y Cordis Plugin",
      "tool.title.search": "T\xECm ki\u1EBFm",
      "tool.title.searchEvents": "T\xECm s\u1EF1 ki\u1EC7n",
      "tool.title.searchSessions": "T\xECm phi\xEAn",
      "tool.title.sendMessage": "G\u1EEDi tin nh\u1EAFn",
      "tool.title.signalTerminal": "G\u1EEDi t\xEDn hi\u1EC7u terminal",
      "tool.title.spawnTeammate": "T\u1EA1o teammate",
      "tool.title.stopCordis": "D\u1EEBng Cordis Plugin",
      "tool.title.subagent": "T\u1EA1o subagent",
      "tool.title.subagentFork": "Fork subagent",
      "tool.title.traceEvent": "Truy v\u1EBFt s\u1EF1 ki\u1EC7n",
      "tool.title.traceSession": "Truy v\u1EBFt phi\xEAn",
      "tool.title.updateGoal": "C\u1EADp nh\u1EADt m\u1EE5c ti\xEAu",
      "tool.title.updateSchedule": "C\u1EADp nh\u1EADt t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng",
      "tool.title.updateTeamTask": "C\u1EADp nh\u1EADt t\xE1c v\u1EE5 nh\xF3m",
      "tool.title.viewSchedule": "Xem t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng",
      "tool.title.waitAgent": "\u0110ang ch\u1EDD tin nh\u1EAFn\u2026",
      "tool.title.webFetch": "T\u1EA3i v\u1EC1",
      "tool.title.webSearch": "T\xECm ki\u1EBFm",
      "tool.title.workflow": "Ch\u1EA1y workflow",
      "tool.title.write": "Ghi",
      "web.contentTruncated": "N\u1ED9i dung \u0111\xE3 b\u1ECB c\u1EAFt",
      "web.http": "HTTP",
      "web.noResults": "Kh\xF4ng t\xECm th\u1EA5y k\u1EBFt qu\u1EA3",
      "web.sourcesTruncated": "Danh s\xE1ch ngu\u1ED3n \u0111\xE3 b\u1ECB c\u1EAFt"
    },
    "cordis": {
      "a11y.defining": "\u0110ang \u0111\u1ECBnh ngh\u0129a plugin",
      "a11y.failed": "\u0110\u1ECBnh ngh\u0129a th\u1EA5t b\u1EA1i",
      "a11y.preparing": "\u0110ang chu\u1EA9n b\u1ECB l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 Cordis",
      "a11y.stopped": "\u0110\u1ECBnh ngh\u0129a b\u1ECB gi\xE1n \u0111o\u1EA1n",
      "action.approve": "Cho ph\xE9p",
      "action.approveOnce": "Ch\u1EC9 cho ph\xE9p phi\xEAn b\u1EA3n n\xE0y",
      "action.approvePlugin": "Cho ph\xE9p c\xE1c phi\xEAn b\u1EA3n sau c\u1EE7a plugin n\xE0y",
      "action.decline": "T\u1EEB ch\u1ED1i",
      "action.inspect": "Xem chi ti\u1EBFt",
      "action.remove": "Xo\xE1",
      "action.retry": "Th\u1EED l\u1EA1i",
      "action.rollback": "Kh\xF4i ph\u1EE5c",
      "action.run": "Ch\u1EA1y",
      "action.stop": "D\u1EEBng",
      "body.clientCode": "Client",
      "body.copied": "\u0110\xE3 sao ch\xE9p",
      "body.copy": "Sao ch\xE9p",
      "body.hostCode": "Host",
      "body.output": "K\u1EBFt qu\u1EA3",
      "body.source": "M\xE3 ngu\u1ED3n plugin",
      "panel.approvals.aria": "Ph\xEA duy\u1EC7t Cordis",
      "panel.current": "Hi\u1EC7n t\u1EA1i: {packageId}",
      "panel.empty": "Ch\u01B0a c\xF3 plugin n\xE0o \u0111\u01B0\u1EE3c \u0111\u1ECBnh ngh\u0129a",
      "panel.group.current": "Phi\xEAn n\xE0y",
      "panel.group.others": "Phi\xEAn kh\xE1c",
      "panel.hint": "C\xE1c \u0111i\u1EC1u khi\u1EC3n ch\u1EA1y n\u1EB1m trong b\u1EA3ng Cordis ph\xEDa tr\xEAn C\xE0i \u0111\u1EB7t",
      "panel.loading": "\u0110ang \u0111\u1ECDc\u2026",
      "panel.next": "Ti\u1EBFp theo: {packageId}",
      "panel.plugins.aria": "Plugin Cordis",
      "panel.readFailed": "\u0110\u1ECDc danh s\xE1ch plugin th\u1EA5t b\u1EA1i: {message}",
      "panel.runningCount": "{count} \u0111ang ch\u1EA1y",
      "panel.title": "Plugin Cordis",
      "panel.trigger": "Cordis Plugin",
      "panel.version": "Phi\xEAn b\u1EA3n",
      "purpose.missing": "(kh\xF4ng c\xF3 m\u1EE5c \u0111\xEDch)",
      "render.failedAbdicated": "Hi\u1EC3n th\u1ECB th\u1EA5t b\u1EA1i trong {slot}; giao di\u1EC7n m\u1EB7c \u0111\u1ECBnh \u0111\xE3 \u0111\u01B0\u1EE3c kh\xF4i ph\u1EE5c:",
      "render.failedHeld": "Hi\u1EC3n th\u1ECB th\u1EA5t b\u1EA1i trong {slot}:",
      "row.defineTitle": "\u0110\u0103ng k\xFD Cordis Plugin",
      "row.removeTitle": "Xo\xE1 Cordis Plugin",
      "row.runTitle": "Ch\u1EA1y Cordis Plugin",
      "row.stopTitle": "D\u1EEBng Cordis Plugin",
      "row.updateTitle": "C\u1EADp nh\u1EADt Cordis Plugin",
      "run.removed": "G\xF3i n\xE0y kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i",
      "run.superseded": "Th\u1EBB ch\u1EA1y m\u1EDBi h\u01A1n \u1EDF b\xEAn d\u01B0\u1EDBi",
      "status.awaitingApproval": "\u0110ang ch\u1EDD ph\xEA duy\u1EC7t",
      "status.clientPending": "Client s\u1EB5n s\xE0ng k\xEDch ho\u1EA1t",
      "status.failed": "Ch\u1EA1y th\u1EA5t b\u1EA1i",
      "status.idle": "S\u1EB5n s\xE0ng",
      "status.removed": "\u0110\xE3 xo\xE1",
      "status.running": "\u0110ang ch\u1EA1y",
      "status.superseded": "C\xF3 l\u1EA7n ch\u1EA1y m\u1EDBi h\u01A1n"
    },
    "cotTranslation": {
      "anonymousNotice": "Bing v\xE0 Google kh\xF4ng c\u1EA7n \u0111\u0103ng nh\u1EADp d\u1ECBch hay kho\xE1 API. C\xE1c endpoint \u1EA9n danh c\u1EE7a h\u1ECD c\xF3 th\u1EC3 t\u1EEB ch\u1ED1i ho\u1EB7c gi\u1EDBi h\u1EA1n y\xEAu c\u1EA7u.",
      "bing": "Bing",
      "codeTitle": "Kh\u1ED1i m\xE3",
      "copied": "\u0110\xE3 sao ch\xE9p",
      "copy": "Sao ch\xE9p",
      "deepseekAccount": "DeepSeek Flash \u2014 t\xE0i kho\u1EA3n (tr\u1EA3 ph\xED)",
      "deepseekOfficial": "DeepSeek Flash \u2014 API ch\xEDnh th\u1EE9c (tr\u1EA3 ph\xED)",
      "failed": "D\u1ECBch th\u1EA5t b\u1EA1i. \u0110ang hi\u1EC3n th\u1ECB b\u1EA3n g\u1ED1c.",
      "footnotes": "Ch\xFA th\xEDch cu\u1ED1i trang",
      "google": "Google",
      "invalidLanguage": "Nh\u1EADp auto ho\u1EB7c m\xE3 ng\xF4n ng\u1EEF, ch\u1EB3ng h\u1EA1n zh, en ho\u1EB7c ja.",
      "invalidProvider": "H\xE3y ch\u1ECDn d\u1ECBch v\u1EE5 d\u1ECBch.",
      "original": "Xem b\u1EA3n g\u1ED1c",
      "overridden": "\u0110\xE3 ghi \u0111\xE8",
      "paidNotice": "M\u1ED7i \u0111o\u1EA1n ch\u01B0a \u0111\u01B0\u1EE3c l\u01B0u \u0111\u1EC7m s\u1EBD g\u1EEDi m\u1ED9t y\xEAu c\u1EA7u DeepSeek Flash tr\u1EA3 ph\xED ri\xEAng qua t\xE0i kho\u1EA3n ho\u1EB7c th\xF4ng tin x\xE1c th\u1EF1c API ch\xEDnh th\u1EE9c \u0111\xE3 ch\u1ECDn. Khi m\u1EDF l\u1EA1i ph\u1EA7n suy lu\u1EADn, k\u1EBFt qu\u1EA3 \u0111\xE3 l\u01B0u s\u1EBD \u0111\u01B0\u1EE3c d\xF9ng l\u1EA1i; thay \u0111\u1ED5i nh\xE0 cung c\u1EA5p, ng\xF4n ng\u1EEF, v\u0103n b\u1EA3n ngu\u1ED3n ho\u1EB7c c\xE0i \u0111\u1EB7t y\xEAu c\u1EA7u c\xF3 th\u1EC3 g\u1EEDi m\u1ED9t y\xEAu c\u1EA7u tr\u1EA3 ph\xED m\u1EDBi.",
      "privacy": "Ph\u1EA7n suy lu\u1EADn \u0111\xE3 m\u1EDF r\u1ED9ng \u0111\u01B0\u1EE3c g\u1EEDi t\u1EDBi d\u1ECBch v\u1EE5 \u0111\xE3 ch\u1ECDn. N\u1ED9i dung c\xF3 th\u1EC3 ch\u1EE9a m\xE3 ri\xEAng t\u01B0 ho\u1EB7c chi ti\u1EBFt cu\u1ED9c tr\xF2 chuy\u1EC7n.",
      "provider": "D\u1ECBch v\u1EE5 d\u1ECBch",
      "providerUnavailable": "Nh\xE0 cung c\u1EA5p n\xE0y kh\xF4ng kh\u1EA3 d\u1EE5ng. H\xE3y c\u1EA5u h\xECnh t\xE0i kho\u1EA3n DeepSeek ho\u1EB7c nh\xE0 cung c\u1EA5p API ch\xEDnh th\u1EE9c c\u1EE7a b\u1EA1n, ho\u1EB7c ch\u1ECDn m\u1ED9t d\u1ECBch v\u1EE5 kh\u1EA3 d\u1EE5ng.",
      "providerUnavailableOption": "{provider} \u2014 kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "readOnly": "B\u1EA3n tri\u1EC3n khai n\xE0y l\u01B0u c\xE0i \u0111\u1EB7t \u1EDF ch\u1EBF \u0111\u1ED9 ch\u1EC9 \u0111\u1ECDc.",
      "reset": "\u0110\u1EB7t l\u1EA1i v\u1EC1 m\u1EB7c \u0111\u1ECBnh",
      "retry": "Th\u1EED l\u1EA1i",
      "save": "L\u01B0u",
      "saveFailed": "B\u1EA3n tri\u1EC3n khai kh\xF4ng ch\u1EA5p nh\u1EADn c\xE1c gi\xE1 tr\u1ECB n\xE0y; ch\xFAng \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i \u0111\u1EC3 b\u1EA1n s\u1EEDa.",
      "saving": "\u0110ang l\u01B0u\u2026",
      "targetLanguage": "Ng\xF4n ng\u1EEF \u0111\xEDch",
      "targetLanguageHint": "auto s\u1EBD theo ng\xF4n ng\u1EEF giao di\u1EC7n; m\xE3 ng\xF4n ng\u1EEF nh\u01B0 zh, en v\xE0 ja c\u0169ng d\xF9ng \u0111\u01B0\u1EE3c.",
      "translating": "\u0110ang d\u1ECBch suy lu\u1EADn",
      "translation": "Xem b\u1EA3n d\u1ECBch",
      "unavailable": "Tu\u1EF3 ch\u1ECDn d\u1ECBch kh\xF4ng kh\u1EA3 d\u1EE5ng.",
      "unwrap": "T\u1EAFt ng\u1EAFt d\xF2ng t\u1EF1 \u0111\u1ED9ng",
      "wrap": "Ng\u1EAFt d\xF2ng t\u1EF1 \u0111\u1ED9ng"
    },
    "creationRecommendations": {
      "access-denied": "K\u1EBFt n\u1ED1i n\xE0y kh\xF4ng th\u1EC3 thay \u0111\u1ED5i plugin.",
      "applicationCancelled": "Thay \u0111\u1ED5i cu\u1ED1i \u0111\xE3 b\u1ECB hu\u1EF7.",
      "applicationFailed": "Thay \u0111\u1ED5i cu\u1ED1i kh\xF4ng \u0111\u01B0\u1EE3c \xE1p d\u1EE5ng. Ki\u1EC3m tra Plugin.",
      "cancel": "Hu\u1EF7 t\u1EA1o",
      "cancelled": "\u0110\xE3 hu\u1EF7",
      "cancelling": "\u0110ang hu\u1EF7\u2026",
      "closing": "Plugin t\u1EA1o \u0111ang d\u1EEBng. H\xE3y th\u1EED l\u1EA1i sau khi n\xF3 t\u1EA3i l\u1EA1i.",
      "collapseContent": "Thu g\u1ECDn n\u1ED9i dung",
      "create": "T\u1EA1o",
      "creating": "\u0110ang t\u1EA1o \u1EDF n\u1EC1n",
      "creationBackground": "Nh\u1EA5n T\u1EA1o \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u ch\u1EA1y n\u1EC1n. B\u1EA1n c\xF3 th\u1EC3 ti\u1EBFp t\u1EE5c chat t\u1EA1i \u0111\xE2y.",
      "creationCost": "Vi\u1EC7c t\u1EA1o c\xF3 th\u1EC3 m\u1EA5t m\u1ED9t l\xFAc v\xE0 d\xF9ng nhi\u1EC1u token.",
      "creationInfo": "C\xE1ch ho\u1EA1t \u0111\u1ED9ng c\u1EE7a vi\u1EC7c t\u1EA1o v\xE0 m\u1EE9c d\xF9ng token",
      "creationMethod": "Ch\u1EBF \u0111\u1ED9 tr\xECnh t\u1EA1o s\u1EBD t\u1EA1o m\u1ED9t trang m\u1EDBi m\xE0 b\u1EA1n c\xF3 th\u1EC3 xo\xE1 b\u1EA5t c\u1EE9 l\xFAc n\xE0o.",
      "custom": "T\u1EF1 vi\u1EBFt m\xF4 t\u1EA3",
      "customHint": "M\xF4 t\u1EA3 n\u01A1i b\u1EA1n mu\u1ED1n n\xF3 xu\u1EA5t hi\u1EC7n",
      "customLabel": "N\xF3 n\xEAn xu\u1EA5t hi\u1EC7n \u1EDF \u0111\xE2u?",
      "customPlaceholder": "V\xED d\u1EE5: m\u1ED9t m\u1EE5c \u1EDF thanh b\xEAn tr\xE1i m\u1EDF l\u1ECBch to\xE0n trang",
      "dismiss": "\u0110\u1EC3 sau",
      "dismissed": "\u0110\xE3 b\u1ECF qua",
      "expandContent": "Xem to\xE0n b\u1ED9 n\u1ED9i dung",
      "failed": "T\u1EA1o th\u1EA5t b\u1EA1i. H\xE3y th\u1EED l\u1EA1i.",
      "heading": "Trang c\xE1 nh\xE2n ho\xE1",
      "initialContent": "B\u1EAFt \u0111\u1EA7u v\u1EDBi",
      "installed": "\u0110\xE3 c\xE0i \u0111\u1EB7t",
      "installing": "\u0110ang c\xE0i \u0111\u1EB7t\u2026",
      "interrupted": "T\u1EA1o b\u1ECB gi\xE1n \u0111o\u1EA1n. H\xE3y th\u1EED l\u1EA1i.",
      "invalid-location": "H\xE3y ch\u1ECDn m\u1ED9t v\u1ECB tr\xED ho\u1EB7c m\xF4 t\u1EA3 trong t\u1ED1i \u0111a 1.000 k\xFD t\u1EF1.",
      "kept": "\u0110\xE3 gi\u1EEF",
      "location": "Th\xEAm v\xE0o",
      "not-live-root": "M\u1EDF cu\u1ED9c tr\xF2 chuy\u1EC7n g\u1ED1c \u0111\u1EC3 d\xF9ng th\u1EBB n\xE0y.",
      "overridden": "M\u1ED9t c\u1EA5u h\xECnh kh\xE1c ghi \u0111\xE8 thay \u0111\u1ED5i n\xE0y.",
      "page": "Tab phi\xEAn",
      "pageHint": "M\u1EDF b\xEAn c\u1EA1nh Chat v\xE0 Trajectory",
      "read-only": "Phi\xEAn n\xE0y l\xE0 ch\u1EC9 \u0111\u1ECDc. H\xE3y chuy\u1EC3n preset quy\u1EC1n \u0111\u1EC3 t\u1EA1o trang.",
      "removed": "\u0110\xE3 xo\xE1",
      "replaced": "\u0110\xE3 thay th\u1EBF",
      "restart-required": "Thay \u0111\u1ED5i \u0111\xE3 \u0111\u01B0\u1EE3c l\u01B0u. Kh\u1EDFi \u0111\u1ED9ng l\u1EA1i DSH \u0111\u1EC3 \xE1p d\u1EE5ng.",
      "restore": "Kh\xF4i ph\u1EE5c",
      "restoring": "\u0110ang kh\xF4i ph\u1EE5c\u2026",
      "retry": "T\u1EA1o l\u1EA1i",
      "sidebar-left": "Trang to\xE0n c\u1EE5c",
      "sidebar-leftHint": "M\u1EDF t\u1EEB thanh b\xEAn tr\xE1i",
      "sidebar-right": "Thanh b\xEAn ph\u1EA3i",
      "sidebar-rightHint": "Xem song song v\u1EDBi cu\u1ED9c tr\xF2 chuy\u1EC7n n\xE0y",
      "source-missing": "C\xE1c t\u1EC7p trang \u0111\xE3 m\u1EA5t. H\xE3y y\xEAu c\u1EA7u \u0111\u1EC1 xu\u1EA5t m\u1EDBi.",
      "sourceRetained": "Ho\xE0n t\xE1c s\u1EBD gi\u1EEF c\xE1c t\u1EC7p ngu\u1ED3n trong th\u01B0 m\u1EE5c .dsh-created-plugins/ c\u1EE7a workspace g\u1ED1c.",
      "starting": "\u0110ang b\u1EAFt \u0111\u1EA7u\u2026",
      "transport": "Kh\xF4ng th\u1EC3 x\xE1c nh\u1EADn k\u1EBFt qu\u1EA3. H\xE3y k\u1EBFt n\u1ED1i l\u1EA1i v\xE0 ki\u1EC3m tra th\u1EBB tr\u01B0\u1EDBc khi th\u1EED l\u1EA1i.",
      "unavailable": "H\xE0nh \u0111\u1ED9ng n\xE0y kh\xF4ng kh\u1EA3 d\u1EE5ng. Ki\u1EC3m tra plugin trong Plugin.",
      "unconfirmed": "Ch\u01B0a x\xE1c nh\u1EADn k\u1EBFt qu\u1EA3. Th\u1EED l\u1EA1i \u0111\u1EC3 ki\u1EC3m tra.",
      "undo": "Ho\xE0n t\xE1c",
      "unknown": "\u0110\u1EC1 xu\u1EA5t n\xE0y kh\xF4ng c\xF2n kh\u1EA3 d\u1EE5ng."
    },
    "cuaPermissions": {
      "accessibility": "Tr\u1EE3 n\u0103ng",
      "accessibilityPermission": "Trong C\xE0i \u0111\u1EB7t h\u1EC7 th\u1ED1ng, h\xE3y cho ph\xE9p {application} \u0111\u1ECDc \u0111i\u1EC1u khi\u1EC3n giao di\u1EC7n, nh\u1EA5p v\xE0 nh\u1EADp.",
      "accessibilityUse": "\u0110\u1ECDc c\xE1c \u0111i\u1EC1u khi\u1EC3n giao di\u1EC7n, nh\u1EA5p v\xE0 nh\u1EADp.",
      "allowedApps": "\u1EE8ng d\u1EE5ng lu\xF4n \u0111\u01B0\u1EE3c cho ph\xE9p",
      "applicationInteraction": "T\u01B0\u01A1ng t\xE1c \u1EE9ng d\u1EE5ng",
      "applicationsFailed": "Kh\xF4ng th\u1EC3 t\u1EA3i quy\u1EC1n truy c\u1EADp \u1EE9ng d\u1EE5ng: {message}",
      "applicationsTitle": "Qu\u1EA3n l\xFD \u1EE9ng d\u1EE5ng m\xE0 t\xEDnh n\u0103ng d\xF9ng m\xE1y t\xEDnh c\xF3 th\u1EC3 truy c\u1EADp",
      "approvalRiskNotice": "Agent ch\u1EC9 c\xF3 th\u1EC3 truy c\u1EADp c\xE1c \u1EE9ng d\u1EE5ng b\u1EA1n ph\xEA duy\u1EC7t v\xE0 c\xF3 th\u1EC3 \u0111\u1ECDc, \u0111i\u1EC1u khi\u1EC3n ch\xFAng \u1EDF n\u1EC1n.\n\nGame tr\u1EF1c tuy\u1EBFn, \u1EE9ng d\u1EE5ng nh\u1EAFn tin v\xE0 c\xE1c \u1EE9ng d\u1EE5ng kh\xE1c c\xF3 th\u1EC3 h\u1EA1n ch\u1EBF t\u1EF1 \u0111\u1ED9ng ho\xE1. Vi ph\u1EA1m \u0111i\u1EC1u kho\u1EA3n c\u1EE7a h\u1ECD c\xF3 th\u1EC3 khi\u1EBFn t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n v\u1EDBi \u1EE9ng d\u1EE5ng \u0111\xF3 b\u1ECB t\u1EA1m ng\u01B0ng ho\u1EB7c c\u1EA5m.\n\nB\u1EA1n t\u1EF1 ch\u1ECBu r\u1EE7i ro. \u0110\u1EC3 d\u1EEBng \u0111i\u1EC1u khi\u1EC3n t\u1EF1 \u0111\u1ED9ng b\u1EA5t c\u1EE9 l\xFAc n\xE0o, nh\u1EA5n D\u1EEBng trong DeepSeek Harness.",
      "approvalRisks": "R\u1EE7i ro",
      "approvalRiskTitle": "R\u1EE7i ro khi d\xF9ng m\xE1y t\xEDnh",
      "available": "Kh\u1EA3 d\u1EE5ng",
      "blockedApps": "\u1EE8ng d\u1EE5ng kh\xF4ng \u0111\u01B0\u1EE3c cho ph\xE9p",
      "close": "\u0110\xF3ng",
      "defaultBody": "T\xEDnh n\u0103ng d\xF9ng m\xE1y t\xEDnh ch\u1EC9 kh\u1EA3 d\u1EE5ng \u1EDF ch\u1EBF \u0111\u1ED9 PTC.",
      "defaultConfirm": "\u0110\u1EB7t th\xE0nh PTC",
      "defaultFailed": "Kh\xF4ng th\u1EC3 thay \u0111\u1ED5i ch\u1EBF \u0111\u1ED9 m\u1EB7c \u0111\u1ECBnh: {message}",
      "defaultNotSaved": "Ch\u1EBF \u0111\u1ED9 m\u1EB7c \u0111\u1ECBnh ch\u01B0a \u0111\u01B0\u1EE3c l\u01B0u. H\xE3y th\u1EED l\u1EA1i.",
      "defaultReadOnly": "C\xE0i \u0111\u1EB7t ch\u1EBF \u0111\u1ED9 m\u1EB7c \u0111\u1ECBnh l\xE0 ch\u1EC9 \u0111\u1ECDc.",
      "defaultSet": "PTC l\xE0 m\u1EB7c \u0111\u1ECBnh",
      "defaultTitle": "Ch\u1EBF \u0111\u1ED9 m\u1EB7c \u0111\u1ECBnh cho phi\xEAn m\u1EDBi",
      "defaultUnavailable": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc ch\u1EBF \u0111\u1ED9 m\u1EB7c \u0111\u1ECBnh. H\xE3y ki\u1EC3m tra trong C\xE0i \u0111\u1EB7t.",
      "elevated": "Th\xE0nh ph\u1EA7n g\u1ED1c \u0111ang ch\u1EA1y v\u1EDBi quy\u1EC1n qu\u1EA3n tr\u1ECB vi\xEAn.",
      "failed": "Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt quy\u1EC1n: {message}",
      "granted": "\u0110\xE3 cho ph\xE9p",
      "iconsFailed": "Kh\xF4ng th\u1EC3 t\u1EA3i bi\u1EC3u t\u01B0\u1EE3ng \u1EE9ng d\u1EE5ng: {message}",
      "later": "\u0110\u1EC3 sau",
      "locked": "\u0110\xE3 kho\xE1 ho\u1EB7c m\u1EA5t k\u1EBFt n\u1ED1i",
      "noApps": "Kh\xF4ng c\xF3 \u1EE9ng d\u1EE5ng n\xE0o lu\xF4n \u0111\u01B0\u1EE3c cho ph\xE9p ho\u1EB7c b\u1ECB ch\u1EB7n.",
      "opened": "\u0110\xE3 m\u1EDF C\xE0i \u0111\u1EB7t h\u1EC7 th\u1ED1ng",
      "openSetup": "M\u1EDF c\xE0i \u0111\u1EB7t",
      "permissionHint": "Qu\u1EA3n l\xFD quy\u1EC1n Tr\u1EE3 n\u0103ng v\xE0 Ghi m\xE0n h\xECnh trong C\xE0i \u0111\u1EB7t h\u1EC7 th\u1ED1ng.",
      "persistentBody": "Gi\u1EEF bi\u1EBFn v\xE0 \u0111\u1ED1i t\u01B0\u1EE3ng \u1EE9ng d\u1EE5ng qua c\xE1c l\u1EA7n g\u1ECDi c\xF4ng c\u1EE5. Vi\u1EC7c chuy\u1EC3n \u0111\u1ED5i s\u1EBD kh\u1EDFi \u0111\u1ED9ng l\u1EA1i runtime PTC.",
      "persistentConfirm": "D\xF9ng ch\u1EBF \u0111\u1ED9 duy tr\xEC",
      "persistentFailed": "Kh\xF4ng th\u1EC3 thay \u0111\u1ED5i ch\u1EBF \u0111\u1ED9 th\u1EF1c thi PTC: {message}",
      "persistentNotSaved": "Ch\u1EBF \u0111\u1ED9 th\u1EF1c thi PTC ch\u01B0a \u0111\u01B0\u1EE3c l\u01B0u. H\xE3y th\u1EED l\u1EA1i.",
      "persistentReadOnly": "C\xE0i \u0111\u1EB7t th\u1EF1c thi PTC l\xE0 ch\u1EC9 \u0111\u1ECDc.",
      "persistentSet": "\u0110\xE3 b\u1EADt ch\u1EBF \u0111\u1ED9 duy tr\xEC",
      "persistentTitle": "Ch\u1EBF \u0111\u1ED9 th\u1EF1c thi PTC",
      "persistentUnavailable": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc ch\u1EBF \u0111\u1ED9 th\u1EF1c thi PTC. H\xE3y ki\u1EC3m tra trong C\xE0i \u0111\u1EB7t.",
      "queryFailed": "Kh\xF4ng th\u1EC3 ki\u1EC3m tra quy\u1EC1n: {message}",
      "request": "Y\xEAu c\u1EA7u quy\u1EC1n",
      "requested": "L\xE0m theo h\u01B0\u1EDBng d\u1EABn \u1EDF cu\u1ED1i C\xE0i \u0111\u1EB7t h\u1EC7 th\u1ED1ng",
      "retry": "Th\u1EED l\u1EA1i",
      "retryAllowed": "L\u1EA7n ch\u1ECDn \u1EE9ng d\u1EE5ng ti\u1EBFp theo s\u1EBD h\u1ECFi l\u1EA1i; quy\u1EC1n truy c\u1EADp ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5p",
      "retryApproval": "Cho ph\xE9p h\u1ECFi l\u1EA1i",
      "revoke": "Thu h\u1ED3i",
      "revoked": "\u0110\xE3 thu h\u1ED3i quy\u1EC1n truy c\u1EADp \u1EE9ng d\u1EE5ng",
      "screenRecording": "Ghi m\xE0n h\xECnh",
      "screenRecordingPermission": "Trong C\xE0i \u0111\u1EB7t h\u1EC7 th\u1ED1ng, h\xE3y cho ph\xE9p {application} ch\u1EE5p c\u1EEDa s\u1ED5 \u1EE9ng d\u1EE5ng.",
      "screenRecordingUse": "Ch\u1EE5p c\u1EEDa s\u1ED5 \u1EE9ng d\u1EE5ng \u0111\xE3 ch\u1ECDn.",
      "settings": "M\u1EDF C\xE0i \u0111\u1EB7t h\u1EC7 th\u1ED1ng",
      "setupBody": "T\xEDnh n\u0103ng d\xF9ng m\xE1y t\xEDnh \u0111\xE3 b\u1EADt. Tr\u01B0\u1EDBc khi d\xF9ng, h\xE3y chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 PTC v\xE0 c\u1EA5p quy\u1EC1n Tr\u1EE3 n\u0103ng v\xE0 Ghi m\xE0n h\xECnh. M\u1EDF chi ti\u1EBFt plugin \u0111\u1EC3 ho\xE0n t\u1EA5t thi\u1EBFt l\u1EADp.",
      "setupQueryFailed": "T\xEDnh n\u0103ng d\xF9ng m\xE1y t\xEDnh \u0111\xE3 b\u1EADt nh\u01B0ng kh\xF4ng th\u1EC3 ki\u1EC3m tra quy\u1EC1n h\u1EC7 th\u1ED1ng. M\u1EDF chi ti\u1EBFt plugin \u0111\u1EC3 xem l\u1ED7i v\xE0 th\u1EED l\u1EA1i.",
      "setupTitle": "Thi\u1EBFt l\u1EADp t\xEDnh n\u0103ng d\xF9ng m\xE1y t\xEDnh tr\u01B0\u1EDBc khi s\u1EED d\u1EE5ng",
      "standardPrivileges": "Th\xE0nh ph\u1EA7n g\u1ED1c \u0111ang ch\u1EA1y v\u1EDBi quy\u1EC1n ng\u01B0\u1EDDi d\xF9ng ti\xEAu chu\u1EA9n.",
      "title": "C\u1EA5p quy\u1EC1n d\xF9ng m\xE1y t\xEDnh",
      "unavailable": "Kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "unknown": "Kh\xF4ng x\xE1c \u0111\u1ECBnh",
      "windowsCapture": "Ch\u1EE5p c\u1EEDa s\u1ED5",
      "windowsCaptureUnavailable": "Phi\xEAn Windows n\xE0y kh\xF4ng h\u1ED7 tr\u1EE3 ch\u1EE5p c\u1EEDa s\u1ED5. H\xE3y ki\u1EC3m tra phi\xEAn b\u1EA3n Windows v\xE0 tr\xECnh \u0111i\u1EC1u khi\u1EC3n \u0111\u1ED3 ho\u1EA1, r\u1ED3i ki\u1EC3m tra l\u1EA1i.",
      "windowsDesktop": "M\xE0n h\xECnh t\u01B0\u01A1ng t\xE1c",
      "windowsDesktopUse": "C\u1EA7n m\xE0n h\xECnh kh\xF4ng kho\xE1 \u0111\u1EC3 quan s\xE1t v\xE0 nh\u1EADp li\u1EC7u.",
      "windowsInstructions": "Gi\u1EEF m\xE0n h\xECnh Windows kh\xF4ng kho\xE1. M\u1ED9t s\u1ED1 thao t\xE1c nh\u1EADp c\u1EA7n \u1EE9ng d\u1EE5ng \u0111\xEDch \u1EDF ph\xEDa tr\u01B0\u1EDBc. \u1EE8ng d\u1EE5ng ch\u1EA1y v\u1EDBi quy\u1EC1n cao h\u01A1n c\xF3 th\u1EC3 t\u1EEB ch\u1ED1i truy c\u1EADp.",
      "windowsSessionUnknown": "Kh\xF4ng x\xE1c minh \u0111\u01B0\u1EE3c m\xE0n h\xECnh Windows t\u01B0\u01A1ng t\xE1c. H\xE3y ch\u1EA1y DSH trong phi\xEAn m\xE0n h\xECnh \u0111\xE3 \u0111\u0103ng nh\u1EADp, r\u1ED3i ki\u1EC3m tra l\u1EA1i.",
      "windowsSetupBody": "M\u1EDF kho\xE1 m\xE0n h\xECnh Windows, r\u1ED3i ki\u1EC3m tra l\u1EA1i. DSH s\u1EBD h\u1ECFi tr\u01B0\u1EDBc khi truy c\u1EADp t\u1EEBng \u1EE9ng d\u1EE5ng.",
      "windowsSetupTitle": "Ki\u1EC3m tra quy\u1EC1n truy c\u1EADp m\xE0n h\xECnh Windows"
    },
    "deepseekChatImport": {
      "action.label": "Nh\u1EADp chat DeepSeek",
      "dialog.cancel": "Hu\u1EF7",
      "dialog.changeFile": "Thay \u0111\u1ED5i",
      "dialog.chooseFile": "Ch\u1ECDn t\u1EC7p\u2026",
      "dialog.chooseWorkspace": "Ch\u1ECDn workspace",
      "dialog.close": "\u0110\xF3ng",
      "dialog.description": "Ch\u1ECDn t\u1EC7p ZIP xu\u1EA5t t\u1EEB trang web DeepSeek (deepseek_data-*.zip) v\xE0 workspace s\u1EBD nh\u1EADn c\xE1c phi\xEAn.",
      "dialog.done": "Xong",
      "dialog.file": "T\u1EC7p xu\u1EA5t",
      "dialog.import": "Nh\u1EADp",
      "dialog.importing": "\u0110ang nh\u1EADp\u2026",
      "dialog.importingCount": "\u0110ang nh\u1EADp {done}/{total}",
      "dialog.title": "Nh\u1EADp l\u1ECBch s\u1EED chat DeepSeek",
      "dialog.uploading": "\u0110ang t\u1EA3i l\xEAn {percent}%",
      "dialog.workspace": "Workspace",
      "error.busy": "M\u1ED9t l\u1EA7n nh\u1EADp kh\xE1c \u0111ang ch\u1EA1y. H\xE3y th\u1EED l\u1EA1i sau.",
      "error.missing-index": "\u0110\xE2y kh\xF4ng ph\u1EA3i b\u1EA3n xu\u1EA5t DeepSeek: thi\u1EBFu chat_session_index.json ho\u1EB7c kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c.",
      "error.missing-manifest": "\u0110\xE2y kh\xF4ng ph\u1EA3i b\u1EA3n xu\u1EA5t DeepSeek: thi\u1EBFu manifest.json.",
      "error.no-conversations": "B\u1EA3n xu\u1EA5t kh\xF4ng c\xF3 cu\u1ED9c tr\xF2 chuy\u1EC7n n\xE0o c\xF3 th\u1EC3 nh\u1EADp.",
      "error.too-large": "T\u1EC7p qu\xE1 l\u1EDBn: gi\u1EDBi h\u1EA1n l\xE0 {limit}.",
      "error.unknown": "Nh\u1EADp th\u1EA5t b\u1EA1i: {message}",
      "error.unreadable-archive": "T\u1EC7p kh\xF4ng ph\u1EA3i kho ZIP \u0111\u1ECDc \u0111\u01B0\u1EE3c.",
      "error.unsupported-version": "Phi\xEAn b\u1EA3n \u0111\u1ECBnh d\u1EA1ng xu\u1EA5t n\xE0y kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3.",
      "error.upload-failed": "T\u1EA3i l\xEAn th\u1EA5t b\u1EA1i: {message}",
      "error.workspace-not-found": "Workspace \u0111\xE3 ch\u1ECDn kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i. H\xE3y ch\u1ECDn workspace kh\xE1c.",
      "result.imported.one": "\u0110\xE3 nh\u1EADp {count} phi\xEAn v\xE0o workspace {name}.",
      "result.imported.other": "\u0110\xE3 nh\u1EADp {count} phi\xEAn v\xE0o workspace {name}.",
      "result.omitted.one": "{count} cu\u1ED9c tr\xF2 chuy\u1EC7n c\u0169 h\u01A1n \u0111\xE3 v\u01B0\u1EE3t gi\u1EDBi h\u1EA1n nh\u1EADp v\xE0 kh\xF4ng \u0111\u01B0\u1EE3c nh\u1EADp.",
      "result.omitted.other": "{count} cu\u1ED9c tr\xF2 chuy\u1EC7n c\u0169 h\u01A1n \u0111\xE3 v\u01B0\u1EE3t gi\u1EDBi h\u1EA1n nh\u1EADp v\xE0 kh\xF4ng \u0111\u01B0\u1EE3c nh\u1EADp.",
      "result.skipped.one": "Kh\xF4ng th\u1EC3 nh\u1EADp {count} cu\u1ED9c tr\xF2 chuy\u1EC7n.",
      "result.skipped.other": "Kh\xF4ng th\u1EC3 nh\u1EADp {count} cu\u1ED9c tr\xF2 chuy\u1EC7n."
    },
    "deliverables": {
      "changes.added": "+{count}",
      "changes.all": "T\u1EA5t c\u1EA3 {count} t\u1EC7p",
      "changes.binary": "nh\u1ECB ph\xE2n",
      "changes.collapse": "Thu g\u1ECDn",
      "changes.collapseAria": "Thu g\u1ECDn c\xE1c t\u1EC7p \u0111\xE3 thay \u0111\u1ED5i",
      "changes.deleted": "-{count}",
      "changes.expandAria": "Hi\u1EC7n t\u1EA5t c\u1EA3 {count} t\u1EC7p \u0111\xE3 thay \u0111\u1ED5i",
      "changes.openReview": "Xem l\u1EA1i thay \u0111\u1ED5i c\u1EE7a l\u01B0\u1EE3t n\xE0y trong thanh b\xEAn",
      "changes.oversized": "qu\xE1 l\u1EDBn",
      "changes.singleTitle": "\u0110\xE3 s\u1EEDa {name}",
      "changes.title": "\u0110\xE3 s\u1EEDa {count} t\u1EC7p",
      "changes.viewDiff": "Xem thay \u0111\u1ED5i c\u1EE7a {name}",
      "diff.binary": "T\u1EC7p nh\u1ECB ph\xE2n; kh\xF4ng th\u1EC3 hi\u1EC3n th\u1ECB thay \u0111\u1ED5i",
      "diff.coarse": "So s\xE1nh d\xF2ng qu\xE1 th\u1EDDi gian; hi\u1EC3n th\u1ECB d\u01B0\u1EDBi d\u1EA1ng thay th\u1EBF to\xE0n b\u1ED9 t\u1EC7p",
      "diff.created": "\u0110\u01B0\u1EE3c t\u1EA1o trong l\u01B0\u1EE3t n\xE0y",
      "diff.deleted": "\u0110\u01B0\u1EE3c xo\xE1 trong l\u01B0\u1EE3t n\xE0y",
      "diff.error": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc c\xE1c thay \u0111\u1ED5i",
      "diff.loading": "\u0110ang \u0111\u1ECDc thay \u0111\u1ED5i\u2026",
      "diff.missing": "N\u1ED9i dung thay \u0111\u1ED5i c\u1EE7a l\u01B0\u1EE3t n\xE0y kh\xF4ng c\xF2n kh\u1EA3 d\u1EE5ng",
      "diff.oversized": "T\u1EC7p qu\xE1 l\u1EDBn; kh\xF4ng th\u1EC3 hi\u1EC3n th\u1ECB thay \u0111\u1ED5i",
      "diff.truncated": "\u0110ang hi\u1EC3n th\u1ECB {count} d\xF2ng \u0111\u1EA7u ti\xEAn",
      "diff.unchanged": "Hai b\xEAn c\xF3 c\xE1c d\xF2ng gi\u1ED1ng nhau",
      "presented.all": "T\u1EA5t c\u1EA3 {count} t\u1EC7p",
      "presented.collapse": "Thu g\u1ECDn",
      "presented.collapseAria": "Thu g\u1ECDn c\xE1c t\u1EC7p \u0111\xE3 giao",
      "presented.directoryError": "Kh\xF4ng th\u1EC3 m\u1EDF th\u01B0 m\u1EE5c ch\u1EE9a. H\xE3y th\u1EED l\u1EA1i.",
      "presented.directoryOpening": "\u0110ang m\u1EDF th\u01B0 m\u1EE5c ch\u1EE9a\u2026",
      "presented.error": "Kh\xF4ng th\u1EC3 m\u1EDF. Nh\u1EA5n \u0111\u1EC3 th\u1EED l\u1EA1i.",
      "presented.expandAria": "Hi\u1EC7n t\u1EA5t c\u1EA3 {count} t\u1EC7p \u0111\xE3 giao",
      "presented.file": "T\u1EC7p",
      "presented.hostError": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc th\xF4ng tin m\xE0n h\xECnh c\u1EE7a Host",
      "presented.nativeUnavailable": "T\u1EC7p n\xE0y kh\xF4ng c\xF3 \u0111\u01B0\u1EDDng d\u1EABn Host kh\u1EA3 d\u1EE5ng. H\xE3y xem tr\u01B0\u1EDBc trong thanh b\xEAn.",
      "presented.opening": "\u0110ang m\u1EDF\u2026",
      "presented.preview": "Xem tr\u01B0\u1EDBc trong thanh b\xEAn",
      "presented.previewButton": "M\u1EDF {name} trong thanh b\xEAn",
      "presented.previewCard": "Xem tr\u01B0\u1EDBc {name} trong thanh b\xEAn",
      "presented.retry": "Th\u1EED l\u1EA1i",
      "presented.revealError": "Kh\xF4ng th\u1EC3 hi\u1EC3n th\u1ECB trong tr\xECnh qu\u1EA3n l\xFD t\u1EC7p. H\xE3y th\u1EED l\u1EA1i.",
      "presented.revealing": "\u0110ang hi\u1EC3n th\u1ECB trong tr\xECnh qu\u1EA3n l\xFD t\u1EC7p\u2026",
      "presented.unavailable": "Host n\xE0y kh\xF4ng c\xF3 m\xE0n h\xECnh \u0111\u1EC3 m\u1EDF t\u1EC7p ho\u1EB7c th\u01B0 m\u1EE5c trong \u1EE9ng d\u1EE5ng b\xEAn ngo\xE0i. B\u1EA1n v\u1EABn c\xF3 th\u1EC3 xem tr\u01B0\u1EDBc t\u1EC7p trong thanh b\xEAn.",
      "review.nowrap": "T\u1EAFt ng\u1EAFt d\xF2ng t\u1EF1 \u0111\u1ED9ng",
      "review.openFile": "M\u1EDF to\xE0n b\u1ED9 t\u1EC7p trong thanh b\xEAn",
      "review.openFileAria": "M\u1EDF {name} trong thanh b\xEAn",
      "review.selectFile": "Ch\u1ECDn t\u1EC7p \u0111\u1EC3 xem l\u1EA1i",
      "review.split": "Chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 xem chia \u0111\xF4i",
      "review.splitAria": "Ch\u1EBF \u0111\u1ED9 xem chia \u0111\xF4i",
      "review.title": "Xem l\u1EA1i \xB7 l\u01B0\u1EE3t {turn}",
      "review.unified": "Chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 xem h\u1EE3p nh\u1EA5t",
      "review.wrap": "B\u1EADt ng\u1EAFt d\xF2ng t\u1EF1 \u0111\u1ED9ng",
      "review.wrapAria": "Ng\u1EAFt d\xF2ng t\u1EF1 \u0111\u1ED9ng",
      "row.error": "Giao th\u1EA5t b\u1EA1i",
      "row.inspect": "Xem chi ti\u1EBFt l\u1EC7nh g\u1ECDi",
      "row.ok": "\u0110\xE3 giao",
      "row.preparing": "\u0110ang chu\u1EA9n b\u1ECB t\u1EC7p giao",
      "row.running": "\u0110ang giao",
      "row.stopped": "B\u1ECB gi\xE1n \u0111o\u1EA1n",
      "row.title": "Tr\xECnh b\xE0y t\u1EC7p"
    },
    "directory-browser": {
      "browser.cancel": "Hu\u1EF7",
      "browser.create": "T\u1EA1o",
      "browser.createIn": 'Th\u01B0 m\u1EE5c m\u1EDBi trong "{name}"',
      "browser.editPath": "S\u1EEDa \u0111\u01B0\u1EDDng d\u1EABn",
      "browser.folderName": "T\xEAn th\u01B0 m\u1EE5c",
      "browser.home": "Th\u01B0 m\u1EE5c ch\xEDnh",
      "browser.loading": "\u0110ang t\u1EA3i\u2026",
      "browser.newFolder": "Th\u01B0 m\u1EE5c m\u1EDBi",
      "browser.open": "M\u1EDF",
      "browser.showHidden": "Hi\u1EC7n t\u1EC7p \u1EA9n",
      "browser.title": "Ch\u1ECDn th\u01B0 m\u1EE5c workspace",
      "browser.truncated": "C\xF3 qu\xE1 nhi\u1EC1u th\u01B0 m\u1EE5c \u0111\u1EC3 li\u1EC7t k\xEA; ch\u1EC9 ph\u1EA7n \u0111\u1EA7u \u0111\u01B0\u1EE3c hi\u1EC3n th\u1ECB.",
      "browser.untitledFolder": "Th\u01B0 m\u1EE5c ch\u01B0a \u0111\u1EB7t t\xEAn"
    },
    "documentHtml": {
      "failed": "Kh\xF4ng th\u1EC3 xem tr\u01B0\u1EDBc t\xE0i li\u1EC7u HTML n\xE0y.",
      "frame": "Xem tr\u01B0\u1EDBc t\xE0i li\u1EC7u HTML",
      "loading": "\u0110ang hi\u1EC3n th\u1ECB t\xE0i li\u1EC7u...",
      "title": "HTML"
    },
    "documentMarkdown": {
      "code.copied": "\u0110\xE3 sao ch\xE9p",
      "code.copy": "Sao ch\xE9p",
      "footnotes": "Ch\xFA th\xEDch cu\u1ED1i trang",
      "viewer.label": "Markdown"
    },
    "entryCustomization": {
      "create": "T\u1EA1o plugin c\u1EE7a b\u1EA1n",
      "createPrompt.conversation": "T\u1EA1o plugin d\u1EA1ng xem cu\u1ED9c tr\xF2 chuy\u1EC7n DSH.",
      "createPrompt.rightbar": "T\u1EA1o plugin DSH c\xF3 m\u1EE5c \u1EDF thanh b\xEAn ph\u1EA3i.",
      "createPrompt.sidebar": "T\u1EA1o plugin DSH c\xF3 m\u1EE5c \u1EDF thanh b\xEAn tr\xE1i.",
      "install": "Duy\u1EC7t plugin kh\xE1c",
      "pin": "Ghim {name} v\xE0o thanh b\xEAn",
      "pinTooltip": "Ghim v\xE0o thanh b\xEAn tr\xE1i"
    },
    "feedback": {
      "action.dislike": "Ph\u1EA3n h\u1ED3i k\xE9m",
      "action.dislikeActive": "X\xF3a \u0111\xE1nh gi\xE1",
      "action.like": "Ph\u1EA3n h\u1ED3i t\u1ED1t",
      "action.likeActive": "X\xF3a \u0111\xE1nh gi\xE1",
      "category.instruction-following": "Hi\u1EC3u v\xE0 tu\xE2n theo ch\u1EC9 d\u1EABn",
      "category.other": "Kh\xE1c",
      "category.product-interaction": "T\xEDnh n\u0103ng v\xE0 t\u01B0\u01A1ng t\xE1c s\u1EA3n ph\u1EA9m",
      "category.resource-cost": "M\u1EE9c s\u1EED d\u1EE5ng t\xE0i nguy\xEAn v\xE0 chi ph\xED",
      "category.security-privacy-permission": "B\u1EA3o m\u1EADt, quy\u1EC1n ri\xEAng t\u01B0 v\xE0 quy\u1EC1n",
      "category.service-stability": "\u0110\u1ED9 \u1ED5n \u0111\u1ECBnh v\xE0 t\u1ED1c \u0111\u1ED9",
      "category.task-result": "K\u1EBFt qu\u1EA3 t\xE1c v\u1EE5",
      "dialog.categories": "Danh m\u1EE5c ph\u1EA3n h\u1ED3i",
      "dialog.detail": "Chi ti\u1EBFt ph\u1EA3n h\u1ED3i",
      "dialog.hint": "Th\xEAm chi ti\u1EBFt \u0111\u1EC3 gi\xFAp ch\xFAng t\xF4i c\u1EA3i thi\u1EC7n. N\u1ED9i dung g\u1EEDi \u0111i s\u1EBD bao g\u1ED3m nh\u1EADt k\xFD h\u1ED9i tho\u1EA1i hi\u1EC7n t\u1EA1i.",
      "dialog.title": "G\u1EEDi ph\u1EA3n h\u1ED3i",
      "error.conflict": "Ph\u1EA3n h\u1ED3i n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c thay \u0111\u1ED5i \u1EDF n\u01A1i kh\xE1c; tr\u1EA1ng th\xE1i m\u1EDBi nh\u1EA5t \u0111\u01B0\u1EE3c hi\u1EC3n th\u1ECB",
      "error.generic": "Kh\xF4ng th\u1EC3 l\u01B0u ph\u1EA3n h\u1ED3i",
      "error.load": "Kh\xF4ng th\u1EC3 t\u1EA3i ph\u1EA3n h\u1ED3i",
      "error.noteTooLarge": "M\xF4 t\u1EA3 qu\xE1 d\xE0i; h\xE3y r\xFAt ng\u1EAFn r\u1ED3i g\u1EEDi l\u1EA1i",
      "toast.recorded": "C\u1EA3m \u01A1n ph\u1EA3n h\u1ED3i c\u1EE7a b\u1EA1n"
    },
    "fileActions": {
      "menu.copied": "\u0110\xE3 sao ch\xE9p",
      "menu.copyFailed": "Kh\xF4ng th\u1EC3 sao ch\xE9p. H\xE3y ki\u1EC3m tra n\u1ED9i dung c\xF3 s\u1EB5n r\u1ED3i th\u1EED l\u1EA1i.",
      "menu.copyImage": "Sao ch\xE9p \u1EA3nh",
      "menu.download": "T\u1EA3i xu\u1ED1ng",
      "menu.downloaded": "T\u1EA3i xu\u1ED1ng ho\xE0n t\u1EA5t",
      "menu.downloadStarted": "\u0110\xE3 b\u1EAFt \u0111\u1EA7u t\u1EA3i xu\u1ED1ng",
      "menu.finder": "Hi\u1EC7n trong Finder",
      "menu.reveal": "Hi\u1EC7n trong th\u01B0 m\u1EE5c",
      "menu.saveAs": "L\u01B0u th\xE0nh\u2026",
      "menu.saved": "\u0110\xE3 l\u01B0u",
      "menu.saveFailed": "Kh\xF4ng th\u1EC3 l\u01B0u. H\xE3y ki\u1EC3m tra ngu\u1ED3n v\xE0 \u0111\xEDch r\u1ED3i th\u1EED l\u1EA1i.",
      "path.revealError": "Kh\xF4ng th\u1EC3 hi\u1EC3n th\u1ECB v\u1ECB tr\xED t\u1EC7p. H\xE3y th\u1EED l\u1EA1i."
    },
    "fileDrag": {
      "failed": "K\xE9o th\u1EA3 th\u1EA5t b\u1EA1i. H\xE3y th\u1EED l\u1EA1i."
    },
    "forgePanel": {
      "branch.behind": "Ch\u1EADm h\u01A1n {base}",
      "branch.changed": "\u0110\xE3 c\xF3 commit m\u1EDBi. H\xE3y xem l\u1EA1i r\u1ED3i m\u1EDF l\u1EA1i menu n\xE0y.",
      "branch.confirm": "X\xE1c nh\u1EADn c\u1EADp nh\u1EADt",
      "branch.linked": "Worktree: {path}",
      "branch.method.merge": "C\u1EADp nh\u1EADt b\u1EB1ng commit g\u1ED9p",
      "branch.method.rebase": "C\u1EADp nh\u1EADt b\u1EB1ng rebase",
      "branch.missing": "Worktree kh\xF4ng kh\u1EA3 d\u1EE5ng: {path}",
      "branch.note.merge": "Th\xEAm m\u1ED9t commit g\u1ED9p v\xE0o nh\xE1nh",
      "branch.note.rebase": "Rebase c\xE1c commit c\u1EE7a nh\xE1nh l\xEAn {base}, vi\u1EBFt l\u1EA1i ch\xFAng",
      "branch.project": "Th\u01B0 m\u1EE5c d\u1EF1 \xE1n: {path}",
      "branch.update": "C\u1EADp nh\u1EADt nh\xE1nh",
      "branch.updateTitle": "C\u1EADp nh\u1EADt {head} b\u1EB1ng commit m\u1EDBi t\u1EEB {base}",
      "branch.worktree": "Worktree (t\u1EEB {base}): {path}",
      "change.check.queued": "Trong h\xE0ng \u0111\u1EE3i",
      "change.check.running": "\u0110ang ch\u1EA1y",
      "change.checks.cancelled": "{count} \u0111\xE3 h\u1EE7y",
      "change.checks.failed": "{count} th\u1EA5t b\u1EA1i",
      "change.checks.loadFailed": "Kh\xF4ng th\u1EC3 t\u1EA3i th\xEAm ki\u1EC3m tra: {message}",
      "change.checks.loading": "\u0110ang t\u1EA3i th\xEAm ki\u1EC3m tra",
      "change.checks.other": "{count} kh\xE1c",
      "change.checks.passed": "{count} \u0111\xE3 qua",
      "change.checks.retry": "Th\u1EED t\u1EA3i l\u1EA1i ki\u1EC3m tra",
      "change.checks.running": "{count} \u0111ang ch\u1EA1y",
      "change.checks.truncated": "\u0110\xE3 t\u1EA3i {count} ki\u1EC3m tra; c\xF2n nhi\u1EC1u h\u01A1n",
      "change.ci.cancelled": "{count} ki\u1EC3m tra \u0111\xE3 h\u1EE7y",
      "change.ci.failed": "{count} ki\u1EC3m tra th\u1EA5t b\u1EA1i",
      "change.ci.failedUnlisted": "Ki\u1EC3m tra th\u1EA5t b\u1EA1i",
      "change.ci.none": "Kh\xF4ng c\xF3 ki\u1EC3m tra",
      "change.ci.passed": "Ki\u1EC3m tra \u0111\xE3 qua",
      "change.ci.running": "\u0110ang ch\u1EA1y ki\u1EC3m tra",
      "change.collapse": "Thu g\u1ECDn {name}",
      "change.copy": "Sao ch\xE9p li\xEAn k\u1EBFt y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "change.expand": "M\u1EDF r\u1ED9ng {name}",
      "change.failure.notFound": "Y\xEAu c\u1EA7u thay \u0111\u1ED5i kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c kh\xF4ng th\u1EC3 truy c\u1EADp",
      "change.failure.unauthenticated": "\u0110\u0103ng nh\u1EADp \u0111\u1EC3 \u0111\u1ECDc tr\u1EA1ng th\xE1i c\u1EE7a n\xF3",
      "change.failure.unavailable": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc tr\u1EA1ng th\xE1i y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "change.flag.changesRequested": "\u0110\xE3 y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "change.flag.conflicting": "Xung \u0111\u1ED9t",
      "change.flag.draft": "B\u1EA3n nh\xE1p",
      "change.markReady": "S\u1EB5n s\xE0ng review",
      "change.merge": "G\u1ED9p",
      "change.merge.conflicting": "Xung \u0111\u1ED9t v\u1EDBi {base}",
      "change.merge.mergeable": "Kh\xF4ng xung \u0111\u1ED9t",
      "change.merge.unknown": "\u0110ang ki\u1EC3m tra xung \u0111\u1ED9t",
      "change.mergeChanged": "\u0110\xE3 c\xF3 commit m\u1EDBi. H\xE3y xem l\u1EA1i tr\u01B0\u1EDBc khi m\u1EDF l\u1EA1i menu g\u1ED9p.",
      "change.mergeConfirm": "X\xE1c nh\u1EADn g\u1ED9p",
      "change.mergedTo": "\u0110\xE3 g\u1ED9p v\xE0o {base}",
      "change.mergeMethod.merge": "T\u1EA1o commit g\u1ED9p",
      "change.mergeMethod.rebase": "Rebase v\xE0 g\u1ED9p",
      "change.mergeMethod.squash": "Squash v\xE0 g\u1ED9p",
      "change.mergeNote.merge": "Gi\u1EEF m\u1ECDi commit v\xE0 th\xEAm m\u1ED9t commit g\u1ED9p",
      "change.mergeNote.rebase": "Ph\xE1t l\u1EA1i t\u1EEBng commit l\xEAn {base}",
      "change.mergeNote.squash": "G\u1ED9p m\u1ECDi commit th\xE0nh m\u1ED9t",
      "change.mergeTitle": "G\u1ED9p {name} v\xE0o {base}",
      "change.number": "#{number}",
      "change.remove": "X\xF3a kh\u1ECFi phi\xEAn n\xE0y",
      "change.removeAria": "X\xF3a {name} kh\u1ECFi phi\xEAn n\xE0y",
      "change.review.approved": "\u0110\xE3 ph\xEA duy\u1EC7t",
      "change.review.changesRequested": "\u0110\xE3 y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "change.review.none": "Kh\xF4ng y\xEAu c\u1EA7u review",
      "change.review.required": "C\u1EA7n review",
      "change.row.changes": "Thay \u0111\u1ED5i",
      "change.row.checks": "Ki\u1EC3m tra",
      "change.row.merge": "G\u1ED9p",
      "change.row.review": "Review",
      "change.state.blocked": "C\u1EA7n ch\xFA \xFD",
      "change.state.closed": "\u0110\xE3 \u0111\xF3ng",
      "change.state.draft": "B\u1EA3n nh\xE1p",
      "change.state.merged": "\u0110\xE3 g\u1ED9p",
      "change.state.open": "M\u1EDF",
      "change.state.unknown": "Kh\xF4ng r\xF5",
      "change.stateAria": "Tr\u1EA1ng th\xE1i y\xEAu c\u1EA7u thay \u0111\u1ED5i: {state}",
      "change.threads": "{count} lu\u1ED3ng ch\u01B0a gi\u1EA3i quy\u1EBFt",
      "change.unserved": "M\xE1y ch\u1EE7 m\xE3 n\xE0y ch\u01B0a h\u1ED7 tr\u1EE3 tr\u1EA1ng th\xE1i y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "change.view": "M\u1EDF trong tr\xECnh duy\u1EC7t",
      "change.viewChangesAria": "Xem thay \u0111\u1ED5i c\u1EE7a {name}: th\xEAm {added} d\xF2ng, x\xF3a {deleted} d\xF2ng",
      "changes.empty": "Phi\xEAn n\xE0y ch\u01B0a c\xF3 y\xEAu c\u1EA7u thay \u0111\u1ED5i n\xE0o",
      "changes.emptyHint": "Y\xEAu c\u1EA7u thay \u0111\u1ED5i li\xEAn k\u1EBFt v\u1EDBi phi\xEAn n\xE0y (\u0111\u01B0\u1EE3c t\u1EA1o, xem, ch\u1EC9nh s\u1EEDa ho\u1EB7c checkout, ho\u1EB7c \u0111ang m\u1EDF tr\xEAn nh\xE1nh hi\u1EC7n t\u1EA1i hay nh\xE1nh \u0111\xE3 push) s\u1EBD xu\u1EA5t hi\u1EC7n \u1EDF \u0111\xE2y",
      "changes.local.create": "T\u1EA1o y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "changes.local.files": "{count} t\u1EC7p",
      "changes.local.prompt": "T\u1EA1o y\xEAu c\u1EA7u thay \u0111\u1ED5i cho c\xE1c thay \u0111\u1ED5i c\u1EE7a phi\xEAn n\xE0y",
      "changes.local.refs": "{head} \u2192 {base}",
      "changes.local.title": "Thay \u0111\u1ED5i c\u1EE5c b\u1ED9",
      "changes.local.viewAria": "Xem thay \u0111\u1ED5i c\u1EE7a phi\xEAn n\xE0y: {count} t\u1EC7p, th\xEAm {added} d\xF2ng, x\xF3a {deleted} d\xF2ng",
      "changes.title": "Y\xEAu c\u1EA7u thay \u0111\u1ED5i c\u1EE7a phi\xEAn n\xE0y \xB7 {count}",
      "checkout.copyProjectPath": "Sao ch\xE9p \u0111\u01B0\u1EDDng d\u1EABn th\u01B0 m\u1EE5c d\u1EF1 \xE1n",
      "checkout.copyWorktreePath": "Sao ch\xE9p \u0111\u01B0\u1EDDng d\u1EABn worktree",
      "checkout.detached": "Kh\xF4ng thu\u1ED9c nh\xE1nh n\xE0o",
      "checkout.failed": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc th\xF4ng tin Git",
      "checkout.none": "Th\u01B0 m\u1EE5c n\xE0y kh\xF4ng ph\u1EA3i kho m\xE3 Git",
      "checkout.project": "Th\u01B0 m\u1EE5c d\u1EF1 \xE1n",
      "checkout.restore": "Kh\xF4i ph\u1EE5c",
      "checkout.worktree": "Worktree",
      "checkout.worktreeFrom": "Worktree \xB7 t\u1EEB {base}",
      "checks.allPassed": "T\u1EA5t c\u1EA3 {count} ki\u1EC3m tra \u0111\xE3 qua",
      "checks.group.cancelled": "\u0110\xE3 h\u1EE7y",
      "checks.group.failed": "Th\u1EA5t b\u1EA1i",
      "checks.group.other": "B\u1ECF qua v\xE0 kh\xE1c",
      "checks.group.passed": "\u0110\xE3 qua",
      "checks.group.running": "\u0110ang ch\u1EA1y",
      "checks.rerunFailed": "Ch\u1EA1y l\u1EA1i c\xE1c ki\u1EC3m tra th\u1EA5t b\u1EA1i",
      "checks.showQuiet": "Hi\u1EC7n th\xEAm {count} (\u0111\xE3 qua, b\u1ECF qua)",
      "commits.all": "T\u1EA5t c\u1EA3 commit",
      "commits.aria": "Commit \u0111ang hi\u1EC3n th\u1ECB: {commits}",
      "commits.count": "{count} commit",
      "commits.failed": "Kh\xF4ng th\u1EC3 t\u1EA3i commit",
      "commits.loading": "\u0110ang t\u1EA3i commit\u2026",
      "commits.missing": "C\xE1c commit \u0111\xE3 ch\u1ECDn kh\xF4ng c\xF2n \u0111\u01B0\u1EE3c bao g\u1ED3m",
      "commits.notLinear": "C\xE1c commit n\xE0y kh\xF4ng n\u1EB1m tr\xEAn m\u1ED9t d\xF2ng l\u1ECBch s\u1EED",
      "commits.range": "{from}\u2026{to}",
      "commits.shiftHint": "Gi\u1EEF Shift \u0111\u1EC3 ch\u1ECDn c\xE1c commit li\xEAn ti\u1EBFp",
      "commits.showAll": "Hi\u1EC7n t\u1EA5t c\u1EA3 commit",
      "commits.truncatedNewest": "Ch\u1EC9 li\u1EC7t k\xEA {count} commit m\u1EDBi nh\u1EA5t",
      "commits.truncatedOldest": "Ch\u1EC9 li\u1EC7t k\xEA {count} commit s\u1EDBm nh\u1EA5t",
      "creation.base": "T\u1EEB",
      "creation.branch": "Nh\xE1nh",
      "creation.cancel": "H\u1EE7y",
      "creation.checkout": "Checkout t\u1EC7p",
      "creation.details": "Th\xEAm chi ti\u1EBFt",
      "creation.error": "L\xFD do",
      "creation.failed": "Kh\xF4ng th\u1EC3 t\u1EA1o worktree",
      "creation.head": "HEAD hi\u1EC7n t\u1EA1i",
      "creation.prepare": "T\u1EA1o nh\xE1nh",
      "creation.retry": "Th\u1EED l\u1EA1i",
      "creation.skip": "Ti\u1EBFp t\u1EE5c kh\xF4ng d\xF9ng worktree",
      "creation.stopped": "\u0110\xE3 d\u1EEBng t\u1EA1o worktree",
      "creation.title": "\u0110ang t\u1EA1o worktree",
      "creation.waiting": "Tin nh\u1EAFn s\u1EBD \u0111\u01B0\u1EE3c g\u1EEDi khi worktree t\u1ED3n t\u1EA1i",
      "diff.allFiles": "T\u1EA5t c\u1EA3 {count} t\u1EC7p",
      "diff.badgeUncommitted": "Ch\u01B0a commit",
      "diff.base.aria": "Nh\xE1nh c\u01A1 s\u1EDF: {base}",
      "diff.base.automatic": "M\u1EB7c \u0111\u1ECBnh",
      "diff.base.empty": "Kh\xF4ng c\xF3 nh\xE1nh ph\xF9 h\u1EE3p",
      "diff.base.loading": "\u0110ang \u0111\u1ECDc nh\xE1nh\u2026",
      "diff.base.local": "Nh\xE1nh c\u1EE5c b\u1ED9",
      "diff.base.note": "So v\u1EDBi merge base c\u1EE7a HEAD v\xE0 nh\xE1nh \u0111\xE3 ch\u1ECDn, bao g\u1ED3m thay \u0111\u1ED5i ch\u01B0a commit",
      "diff.base.remote": "Nh\xE1nh remote",
      "diff.base.search": "T\xECm nh\xE1nh",
      "diff.base.uncommitted": "Bao g\u1ED3m thay \u0111\u1ED5i ch\u01B0a commit",
      "diff.base.worktree": "\u0110i\u1EC3m b\u1EAFt \u0111\u1EA7u worktree",
      "diff.baseMissing": "Kh\xF4ng t\xECm th\u1EA5y nh\xE1nh c\u01A1 s\u1EDF {base}; c\xF3 th\u1EC3 nh\xE1nh \u0111\xE3 b\u1ECB x\xF3a",
      "diff.baseUnrelated": "{base} kh\xF4ng c\xF3 l\u1ECBch s\u1EED chung v\u1EDBi HEAD",
      "diff.binary": "T\u1EC7p nh\u1ECB ph\xE2n; kh\xF4ng th\u1EC3 hi\u1EC3n th\u1ECB thay \u0111\u1ED5i",
      "diff.binaryLabel": "Nh\u1ECB ph\xE2n",
      "diff.collapseAll": "Thu g\u1ECDn t\u1EA5t c\u1EA3 t\u1EC7p",
      "diff.copyPath": "Sao ch\xE9p \u0111\u01B0\u1EDDng d\u1EABn",
      "diff.deletedFile": "\u0110\xE3 x\xF3a",
      "diff.empty": "Kh\xF4ng c\xF3 thay \u0111\u1ED5i",
      "diff.error": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc c\xE1c thay \u0111\u1ED5i",
      "diff.expandAll": "M\u1EDF r\u1ED9ng t\u1EA5t c\u1EA3 t\u1EC7p",
      "diff.fileTooLarge": "T\u1EC7p n\xE0y qu\xE1 l\u1EDBn \u0111\u1EC3 hi\u1EC3n th\u1ECB",
      "diff.fileTree": "C\xE2y t\u1EC7p",
      "diff.filterConfigFailed": "Kh\xF4ng ch\u1EA1y so s\xE1nh v\xEC kh\xF4ng th\u1EC3 \u0111\u1ECDc \u0111\u1EA7y \u0111\u1EE7 c\xE0i \u0111\u1EB7t b\u1ED9 l\u1ECDc Git. H\xE3y ki\u1EC3m tra c\xE0i \u0111\u1EB7t Git v\xE0 gi\u1EDBi h\u1EA1n \u0111\u1EA7u ra, r\u1ED3i th\u1EED l\u1EA1i.",
      "diff.filterFiles": "L\u1ECDc t\u1EC7p\u2026",
      "diff.hideFileTree": "\u1EA8n c\xE2y t\u1EC7p",
      "diff.largeCollapsed": "T\u1EC7p l\u1EDBn: {count} d\xF2ng thay \u0111\u1ED5i \u0111\xE3 thu g\u1ECDn",
      "diff.moreActions": "Th\xEAm thao t\xE1c cho {name}",
      "diff.moreOptions": "Th\xEAm t\xF9y ch\u1ECDn hi\u1EC3n th\u1ECB",
      "diff.moveFileTreeRight": "Chuy\u1EC3n c\xE2y t\u1EC7p sang ph\u1EA3i",
      "diff.newFile": "T\u1EC7p m\u1EDBi",
      "diff.noForkPoint": "Kh\xF4ng t\xECm th\u1EA5y \u0111i\u1EC3m r\u1EBD nh\xE1nh cho nh\xE1nh n\xE0y; h\xE3y ch\u1ECDn nh\xE1nh c\u01A1 s\u1EDF ho\u1EB7c ph\u1EA1m vi kh\xE1c",
      "diff.noMatchingFiles": "Kh\xF4ng c\xF3 t\u1EC7p ph\xF9 h\u1EE3p",
      "diff.nowrap": "Ng\u1EEBng ng\u1EAFt d\xF2ng d\xE0i",
      "diff.omitted": "{count} t\u1EC7p ch\u01B0a theo d\xF5i kh\xE1c kh\xF4ng \u0111\u01B0\u1EE3c li\u1EC7t k\xEA",
      "diff.openFileInBrowser": "Xem t\u1EC7p trong tr\xECnh duy\u1EC7t",
      "diff.openFileInSidebar": "M\u1EDF to\xE0n b\u1ED9 t\u1EC7p trong thanh b\xEAn",
      "diff.refresh": "L\xE0m m\u1EDBi thay \u0111\u1ED5i",
      "diff.renamed": "\u0110\u1ED5i t\xEAn t\u1EEB {from}",
      "diff.renamedPath": "{from} \u2192 {path}",
      "diff.resizeFileTree": "Thay \u0111\u1ED5i k\xEDch th\u01B0\u1EDBc c\xE2y t\u1EC7p",
      "diff.scope.branch": "Nh\xE1nh",
      "diff.scope.staged": "\u0110\xE3 stage",
      "diff.scope.uncommitted": "Ch\u01B0a commit",
      "diff.scope.unstaged": "Ch\u01B0a stage",
      "diff.scopeNote.staged": "Index so v\u1EDBi HEAD",
      "diff.scopeNote.uncommitted": "So v\u1EDBi HEAD, bao g\u1ED3m c\xE1c t\u1EC7p ch\u01B0a theo d\xF5i",
      "diff.scopeNote.unstaged": "So v\u1EDBi index, bao g\u1ED3m c\xE1c t\u1EC7p ch\u01B0a theo d\xF5i",
      "diff.showFileTreeLeft": "Hi\u1EC7n c\xE2y t\u1EC7p b\xEAn tr\xE1i",
      "diff.split": "Hi\u1EC7n song song",
      "diff.splitAria": "Song song",
      "diff.stale": "Nh\xE1nh c\u1EE5c b\u1ED9 c\xF3 {count} commit ch\u01B0a push; \u0111\xE2y l\xE0 c\xE1c thay \u0111\u1ED5i tr\xEAn y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "diff.tab": "Thay \u0111\u1ED5i",
      "diff.tabNumbered": "Thay \u0111\u1ED5i trong #{number}",
      "diff.tooLarge": "C\xE1c thay \u0111\u1ED5i n\xE0y qu\xE1 l\u1EDBn \u0111\u1EC3 hi\u1EC3n th\u1ECB \u1EDF \u0111\xE2y",
      "diff.unchanged": "{count} d\xF2ng kh\xF4ng \u0111\u1ED5i",
      "diff.unchangedRest": "C\xE1c d\xF2ng kh\xF4ng \u0111\u1ED5i c\xF2n l\u1EA1i",
      "diff.unified": "Hi\u1EC7n m\u1ED9t c\u1ED9t",
      "diff.useAutomaticBase": "D\xF9ng nh\xE1nh c\u01A1 s\u1EDF m\u1EB7c \u0111\u1ECBnh",
      "diff.viewInBrowser": "Xem trong tr\xECnh duy\u1EC7t",
      "diff.wrap": "Ng\u1EAFt d\xF2ng d\xE0i",
      "diff.wrapAria": "Ng\u1EAFt d\xF2ng",
      "duration.hours": "{hours} gi\u1EDD {minutes} ph\xFAt",
      "duration.minutes": "{minutes} ph\xFAt {seconds} gi\xE2y",
      "duration.seconds": "{seconds} gi\xE2y",
      "guide.description": "Xem l\u1EA1i c\xE1c thay \u0111\u1ED5i m\xE3 v\xE0 y\xEAu c\u1EA7u thay \u0111\u1ED5i c\u1EE7a phi\xEAn n\xE0y",
      "guide.title": "Review m\xE3 v\xE0 thay \u0111\u1ED5i",
      "header.attention": "Y\xEAu c\u1EA7u thay \u0111\u1ED5i c\u1EE7a phi\xEAn n\xE0y c\u1EA7n \u0111\u01B0\u1EE3c ch\xFA \xFD",
      "header.label": "Y\xEAu c\u1EA7u thay \u0111\u1ED5i c\u1EE7a phi\xEAn n\xE0y",
      "issues.aria": "M\u1EDF issue {label}: {title}",
      "issues.label": "Issue li\xEAn k\u1EBFt",
      "issues.more": " v\xE0 th\xEAm",
      "issues.separator": ", ",
      "lens.all": "T\u1EA5t c\u1EA3",
      "lens.aria": "L\u1EDBp review",
      "lens.empty": "Kh\xF4ng c\xF3 t\u1EC7p \u0111\u1EC3 hi\u1EC3n th\u1ECB",
      "lens.implementation": "Tri\u1EC3n khai",
      "lens.interface": "Giao di\u1EC7n",
      "lens.menuAria": "L\u1EDBp review: {lens}",
      "lens.test": "Ki\u1EC3m th\u1EED",
      "lens.testHidden": "T\u1EC7p ki\u1EC3m th\u1EED \u0111ang b\u1ECB \u1EA9n",
      "list.more": "Th\xEAm {count} y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "list.stateChecks": "{state} \xB7 {checks}",
      "list.worktree": "Trong worktree ri\xEAng",
      "missing.kept": "Worktree c\u1EE7a nh\xE1nh {branch} c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c kh\xF4i ph\u1EE5c t\u1EA1i v\u1ECB tr\xED ban \u0111\u1EA7u. C\xE1c thay \u0111\u1ED5i ch\u01B0a commit t\u1EEB tr\u01B0\u1EDBc khi x\xF3a kh\xF4ng th\u1EC3 kh\xF4i ph\u1EE5c",
      "missing.leave": "Ti\u1EBFp t\u1EE5c trong d\u1EF1 \xE1n",
      "missing.recreated": "Nh\xE1nh {branch} c\u0169ng \u0111\xE3 b\u1ECB x\xF3a. Kh\xF4i ph\u1EE5c s\u1EBD t\u1EA1o l\u1EA1i nh\xE1nh t\u1EA1i commit m\xE0 worktree b\u1EAFt \u0111\u1EA7u, kh\xF4ng c\xF3 c\xE1c commit sau hay thay \u0111\u1ED5i ch\u01B0a commit",
      "missing.restore": "Kh\xF4i ph\u1EE5c worktree",
      "missing.title": "Worktree kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "missing.unknown": "Vi\u1EC7c kh\xF4i ph\u1EE5c worktree ch\u01B0a ho\xE0n t\u1EA5t v\xE0 kh\xF4ng th\u1EC3 ki\u1EC3m tra nh\xE1nh {branch}. H\xE3y x\u1EED l\xFD l\u1ED7i kh\xF4i ph\u1EE5c v\xE0 th\u1EED l\u1EA1i, ho\u1EB7c ti\u1EBFp t\u1EE5c trong d\u1EF1 \xE1n.",
      "missing.waiting": "Tin nh\u1EAFn s\u1EBD \u0111\u01B0\u1EE3c g\u1EEDi sau khi b\u1EA1n kh\xF4i ph\u1EE5c worktree ho\u1EB7c ti\u1EBFp t\u1EE5c trong d\u1EF1 \xE1n",
      "refresh": "L\xE0m m\u1EDBi tr\u1EA1ng th\xE1i",
      "restoration.prepare": "Chu\u1EA9n b\u1ECB worktree",
      "restoration.title": "\u0110ang kh\xF4i ph\u1EE5c worktree",
      "retry": "Th\u1EED l\u1EA1i",
      "review.addComment": "Th\xEAm b\xECnh lu\u1EADn",
      "review.addToInput": "Th\xEAm v\xE0o \xF4 nh\u1EADp",
      "review.approve": "Ph\xEA duy\u1EC7t",
      "review.browserDraft": "B\u1EA3n nh\xE1p tr\xECnh duy\u1EC7t",
      "review.browserDrafts": "C\xF3 {count} b\u1EA3n nh\xE1p b\xECnh lu\u1EADn ch\u1EC9 \u0111\u01B0\u1EE3c l\u01B0u trong tr\xECnh duy\u1EC7t n\xE0y, kh\xF4ng n\u1EB1m trong review GitHub \u0111ang ch\u1EDD c\u1EE7a b\u1EA1n. H\xE3y th\xEAm ch\xFAng v\xE0o review ho\u1EB7c x\xF3a tr\u01B0\u1EDBc.",
      "review.cancel": "H\u1EE7y",
      "review.close": "\u0110\xF3ng",
      "review.comment": "\u0110\u1EC3 l\u1EA1i b\xECnh lu\u1EADn\u2026",
      "review.commentOnly": "B\xECnh lu\u1EADn",
      "review.confirmRetry": "\u0110\xE3 ki\u1EC3m tra; cho ph\xE9p g\u1EEDi l\u1EA1i",
      "review.discard": "H\u1EE7y review",
      "review.discardConfirm": "H\u1EE7y review \u0111ang ch\u1EDD c\u1EE7a b\u1EA1n v\xE0 {count} b\xECnh lu\u1EADn c\u1EE7a n\xF3? Kh\xF4ng th\u1EC3 ho\xE0n t\xE1c.",
      "review.discarded": "\u0110\xE3 h\u1EE7y review",
      "review.discarding": "\u0110ang h\u1EE7y\u2026",
      "review.done": "Xong",
      "review.drafts": "B\xECnh lu\u1EADn \u0111ang ch\u1EDD ({count})",
      "review.edit": "S\u1EEDa",
      "review.failed": "G\u1EEDi th\u1EA5t b\u1EA1i: {message}",
      "review.githubActions": "T\xF9y ch\u1ECDn b\xECnh lu\u1EADn GitHub",
      "review.inputFailed": "\xD4 nh\u1EADp ch\u01B0a th\u1EC3 nh\u1EADn tham chi\u1EBFu. H\xE3y th\u1EED l\u1EA1i sau gi\xE2y l\xE1t.",
      "review.loadFailed": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc b\u1EA3n nh\xE1p review. H\xE3y ki\u1EC3m tra b\u1ED9 nh\u1EDB tr\xECnh duy\u1EC7t.",
      "review.outdated": "M\xE3 \u0111\xE3 c\u1EADp nh\u1EADt",
      "review.ownChangeRequest": "\u0110\xE2y l\xE0 PR c\u1EE7a ch\xEDnh b\u1EA1n. GitHub cho ph\xE9p b\u1EA1n b\xECnh lu\u1EADn nh\u01B0ng kh\xF4ng th\u1EC3 ph\xEA duy\u1EC7t hay y\xEAu c\u1EA7u thay \u0111\u1ED5i.",
      "review.pending": "\u0110ang ch\u1EDD",
      "review.publish": "\u0110\u0103ng m\u1ED9t b\xECnh lu\u1EADn",
      "review.published": "\u0110\xE3 \u0111\u0103ng l\xEAn GitHub",
      "review.publishing": "\u0110ang \u0111\u0103ng\u2026",
      "review.queue": "Th\xEAm v\xE0o review",
      "review.quoted": "\u0110\xE3 th\xEAm v\xE0o \xF4 nh\u1EADp",
      "review.range": "B\xECnh lu\u1EADn tr\xEAn {range}",
      "review.recheck": "Xem tr\xEAn GitHub",
      "review.remove": "X\xF3a",
      "review.requestChanges": "Y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "review.saveFailed": "Kh\xF4ng th\u1EC3 l\u01B0u b\u1EA3n nh\xE1p review. H\xE3y ki\u1EC3m tra b\u1ED9 nh\u1EDB tr\xECnh duy\u1EC7t v\xE0 th\u1EED l\u1EA1i.",
      "review.selectLine": "Ch\u1ECDn d\xF2ng {line}",
      "review.stale": "PR \u0111\xE3 c\xF3 commit m\u1EDBi. H\xE3y l\xE0m m\u1EDBi v\xE0 ch\u1ECDn l\u1EA1i c\xE1c d\xF2ng c\u1EA7n b\xECnh lu\u1EADn.",
      "review.startReview": "B\u1EAFt \u0111\u1EA7u review",
      "review.submit": "G\u1EEDi review",
      "review.submitted": "\u0110\xE3 g\u1EEDi review",
      "review.submitting": "\u0110ang g\u1EEDi\u2026",
      "review.summary": "T\xF3m t\u1EAFt review\u2026",
      "review.summaryRequired": "Nh\u1EADp t\xF3m t\u1EAFt review \u0111\u1EC3 y\xEAu c\u1EA7u thay \u0111\u1ED5i.",
      "review.unknown": "Kh\xF4ng r\xF5 k\u1EBFt qu\u1EA3 g\u1EEDi. H\xE3y ki\u1EC3m tra GitHub tr\u01B0\u1EDBc khi \u0111\u0103ng l\u1EA1i.",
      "review.unsupported": "M\xE1y ch\u1EE7 m\xE3 n\xE0y kh\xF4ng h\u1ED7 tr\u1EE3 g\u1EEDi review.",
      "review.yourComment": "B\xECnh lu\u1EADn c\u1EE7a b\u1EA1n",
      "reviewers.approved": "\u0110\xE3 ph\xEA duy\u1EC7t",
      "reviewers.bot": "Bot",
      "reviewers.changesRequested": "\u0110\xE3 y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "reviewers.codeOwner": "Ch\u1EE7 s\u1EDF h\u1EEFu m\xE3",
      "reviewers.commented": "\u0110\xE3 b\xECnh lu\u1EADn",
      "reviewers.dismissed": "\u0110\xE3 lo\u1EA1i",
      "reviewers.empty": "Kh\xF4ng c\xF3 ng\u01B0\u1EDDi ph\xF9 h\u1EE3p",
      "reviewers.loadFailed": "Kh\xF4ng th\u1EC3 li\u1EC7t k\xEA ng\u01B0\u1EDDi",
      "reviewers.loading": "\u0110ang t\u1EA3i danh s\xE1ch ng\u01B0\u1EDDi",
      "reviewers.none": "Ch\u01B0a c\xF3 ng\u01B0\u1EDDi review",
      "reviewers.older": "Tr\u01B0\u1EDBc commit m\u1EDBi nh\u1EA5t",
      "reviewers.pending": "\u0110ang ch\u1EDD review",
      "reviewers.requestMore": "Y\xEAu c\u1EA7u ng\u01B0\u1EDDi kh\xE1c review\u2026",
      "reviewers.rerequestAria": "Y\xEAu c\u1EA7u {login} review l\u1EA1i",
      "reviewers.search": "T\xECm ng\u01B0\u1EDDi",
      "reviewers.suggested": "\u0110\u1EC1 xu\u1EA5t",
      "reviewers.team": "Nh\xF3m",
      "reviewers.truncated": "M\u1ED9t s\u1ED1 ng\u01B0\u1EDDi review kh\xF4ng \u0111\u01B0\u1EE3c li\u1EC7t k\xEA; h\xE3y m\u1EDF y\xEAu c\u1EA7u thay \u0111\u1ED5i \u0111\u1EC3 xem t\u1EA5t c\u1EA3",
      "settings.readOnly": "B\u1EA3n tri\u1EC3n khai n\xE0y l\u01B0u c\xE0i \u0111\u1EB7t \u1EDF ch\u1EBF \u0111\u1ED9 ch\u1EC9 \u0111\u1ECDc.",
      "settings.retainOnArchive.description": "Khi b\u1EADt, vi\u1EC7c l\u01B0u tr\u1EEF phi\xEAn s\u1EBD gi\u1EEF l\u1EA1i worktree m\xE0 phi\xEAn \u0111\xE3 t\u1EA1o; khi t\u1EAFt, worktree s\u1EA1ch v\xE0 kh\xF4ng c\xF2n \u0111\u01B0\u1EE3c tham chi\u1EBFu s\u1EBD b\u1ECB x\xF3a trong khi nh\xE1nh v\xE0 c\xE1c commit c\u1EE7a n\xF3 v\u1EABn c\xF2n.",
      "settings.retainOnArchive.title": "Gi\u1EEF worktree khi l\u01B0u tr\u1EEF",
      "settings.save": "L\u01B0u",
      "settings.saveFailed": "B\u1EA3n tri\u1EC3n khai kh\xF4ng ch\u1EA5p nh\u1EADn c\xE1c gi\xE1 tr\u1ECB n\xE0y; ch\xFAng \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i \u0111\u1EC3 b\u1EA1n s\u1EEDa.",
      "settings.saving": "\u0110ang l\u01B0u\u2026",
      "settings.unavailable": "C\xE0i \u0111\u1EB7t worktree kh\xF4ng kh\u1EA3 d\u1EE5ng.",
      "signin.copy": "Sao ch\xE9p l\u1EC7nh \u0111\u0103ng nh\u1EADp",
      "signin.title": "\u0110\u0103ng nh\u1EADp v\xE0o {host} \u0111\u1EC3 hi\u1EC3n th\u1ECB tr\u1EA1ng th\xE1i y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "signin.unavailable": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc y\xEAu c\u1EA7u thay \u0111\u1ED5i tr\xEAn {host}: {message}",
      "stream.failed": "Kh\xF4ng th\u1EC3 t\u1EA3i b\u1EA3ng y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "tab.title": "Y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "tests.hide": "\u1EA8n t\u1EC7p ki\u1EC3m th\u1EED",
      "tests.hideHint": "\u1EA8n ki\u1EC3m th\u1EED, snapshot, t\u1EC7p ng\xF4n ng\u1EEF, lockfile v\xE0 t\u1EC7p \u0111\u01B0\u1EE3c t\u1EA1o",
      "thread.author": "T\xE1c gi\u1EA3",
      "thread.back": "Quay l\u1EA1i thay \u0111\u1ED5i",
      "thread.bot": "bot",
      "thread.close": "\u0110\xF3ng danh s\xE1ch lu\u1ED3ng",
      "thread.codeBlock": "Kh\u1ED1i m\xE3",
      "thread.collapse": "Thu g\u1ECDn",
      "thread.commentActions": "Thao t\xE1c cho b\xECnh lu\u1EADn c\u1EE7a {author}",
      "thread.copied": "\u0110\xE3 sao ch\xE9p",
      "thread.copy": "Sao ch\xE9p",
      "thread.deleteConfirm": "X\xF3a b\xECnh lu\u1EADn n\xE0y?",
      "thread.deletedAuthor": "T\xE0i kho\u1EA3n \u0111\xE3 x\xF3a",
      "thread.deleteLast": "X\xF3a b\xECnh lu\u1EADn n\xE0y? \u0110\xE2y l\xE0 b\xECnh lu\u1EADn duy nh\u1EA5t n\xEAn lu\u1ED3ng c\u0169ng b\u1ECB x\xF3a.",
      "thread.deleting": "\u0110ang x\xF3a\u2026",
      "thread.editAria": "S\u1EEDa b\xECnh lu\u1EADn",
      "thread.elsewhereTag": "Kh\xF4ng n\u1EB1m trong c\xE1c commit \u0111\xE3 ch\u1ECDn",
      "thread.empty": "Ch\u01B0a c\xF3 lu\u1ED3ng review n\xE0o",
      "thread.expand": "M\u1EDF r\u1ED9ng",
      "thread.fileLevel": "Lu\u1ED3ng c\u1EA5p t\u1EC7p",
      "thread.filter.all": "T\u1EA5t c\u1EA3",
      "thread.filter.resolved": "\u0110\xE3 gi\u1EA3i quy\u1EBFt",
      "thread.filter.unresolved": "Ch\u01B0a gi\u1EA3i quy\u1EBFt",
      "thread.filterAria": "L\u1ECDc lu\u1ED3ng",
      "thread.footnotes": "Ch\xFA th\xEDch cu\u1ED1i",
      "thread.hideOriginal": "\u1EA8n t\u1EC7p t\u1EA1i commit \u0111\xF3",
      "thread.inputFailed": "\xD4 nh\u1EADp kh\xF4ng th\u1EC3 nh\u1EADn lu\u1ED3ng n\xE0y; h\xE3y th\u1EED l\u1EA1i sau",
      "thread.list": "Lu\u1ED3ng",
      "thread.listAria": "Lu\u1ED3ng review, t\u1ED5ng c\u1ED9ng {count}",
      "thread.loadFailed": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc lu\u1ED3ng GitHub: {message}",
      "thread.next": "Chuy\u1EC3n t\u1EDBi lu\u1ED3ng ch\u01B0a gi\u1EA3i quy\u1EBFt ti\u1EBFp theo",
      "thread.none": "Kh\xF4ng c\xF3 lu\u1ED3ng n\xE0o kh\u1EDBp b\u1ED9 l\u1ECDc n\xE0y",
      "thread.onCommit": "tr\xEAn {commit}",
      "thread.openAll": "Xem tr\xEAn GitHub",
      "thread.openOnHost": "Xem tr\xEAn GitHub",
      "thread.originalFailed": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc t\u1EC7p t\u1EA1i commit \u0111\xF3: {message}",
      "thread.originalLoading": "\u0110ang \u0111\u1ECDc t\u1EC7p t\u1EA1i commit \u0111\xF3\u2026",
      "thread.originally": "Ban \u0111\u1EA7u {range}",
      "thread.outdatedSection": "{count} lu\u1ED3ng l\u1ED7i th\u1EDDi: c\xE1c commit sau \u0111\xE3 thay \u0111\u1ED5i m\xE3 c\u1EE7a ch\xFAng",
      "thread.outdatedTag": "L\u1ED7i th\u1EDDi",
      "thread.replies": "{count} tr\u1EA3 l\u1EDDi",
      "thread.reply": "Tr\u1EA3 l\u1EDDi",
      "thread.replyActions": "T\xF9y ch\u1ECDn tr\u1EA3 l\u1EDDi",
      "thread.replyPlaceholder": "Tr\u1EA3 l\u1EDDi\u2026",
      "thread.resolve": "Gi\u1EA3i quy\u1EBFt lu\u1ED3ng",
      "thread.resolvedRow": "Lu\u1ED3ng \u0111\xE3 gi\u1EA3i quy\u1EBFt \xB7 {author}",
      "thread.save": "L\u01B0u",
      "thread.saving": "\u0110ang l\u01B0u\u2026",
      "thread.treeCount": "{count} lu\u1ED3ng ch\u01B0a gi\u1EA3i quy\u1EBFt",
      "thread.truncated": "Qu\xE1 nhi\u1EC1u lu\u1ED3ng; \u0111ang hi\u1EC3n th\u1ECB {count} lu\u1ED3ng \u0111\u1EA7u ti\xEAn",
      "thread.unresolve": "B\u1ECF gi\u1EA3i quy\u1EBFt lu\u1ED3ng",
      "thread.unresolvedAria": "{name} c\xF3 {count} lu\u1ED3ng ch\u01B0a gi\u1EA3i quy\u1EBFt; chuy\u1EC3n t\u1EDBi lu\u1ED3ng ti\u1EBFp theo",
      "thread.unresolvedCount": "{count} ch\u01B0a gi\u1EA3i quy\u1EBFt",
      "thread.unwrap": "Kh\xF4ng ng\u1EAFt d\xF2ng",
      "thread.viewOriginal": "Xem t\u1EC7p t\u1EA1i commit \u0111\xF3",
      "thread.wrap": "Ng\u1EAFt d\xF2ng",
      "thread.writeFailed": "GitHub kh\xF4ng \xE1p d\u1EE5ng thay \u0111\u1ED5i n\xE0y: {message}",
      "thread.writeStale": "PR \u0111\xE3 c\xF3 commit m\u1EDBi. C\xE1c lu\u1ED3ng \u0111ang \u0111\u01B0\u1EE3c \u0111\u1ECDc l\u1EA1i \u1EDF head m\u1EDBi; h\xE3y ki\u1EC3m tra r\u1ED3i th\u1EED l\u1EA1i.",
      "thread.writeUnknown": "Kh\xF4ng th\u1EC3 x\xE1c nh\u1EADn GitHub \u0111\xE3 \xE1p d\u1EE5ng thay \u0111\u1ED5i n\xE0y hay ch\u01B0a. C\xE1c lu\u1ED3ng \u0111ang \u0111\u01B0\u1EE3c \u0111\u1ECDc l\u1EA1i; h\xE3y ki\u1EC3m tra tr\u01B0\u1EDBc khi th\u1EED l\u1EA1i.",
      "thread.writeUnsupported": "M\xE1y ch\u1EE7 m\xE3 n\xE0y kh\xF4ng h\u1ED7 tr\u1EE3 thay \u0111\u1ED5i lu\u1ED3ng \u1EDF \u0111\xE2y.",
      "time.days": "{n} ng\xE0y tr\u01B0\u1EDBc",
      "time.finished": "{state} \xB7 {time}",
      "time.hours": "{n} gi\u1EDD tr\u01B0\u1EDBc",
      "time.minutes": "{n} ph\xFAt tr\u01B0\u1EDBc",
      "time.months": "{n} th\xE1ng tr\u01B0\u1EDBc",
      "time.now": "v\u1EEBa xong",
      "time.years": "{n} n\u0103m tr\u01B0\u1EDBc",
      "toast.actionUnknown": "Kh\xF4ng th\u1EC3 x\xE1c nh\u1EADn thao t\xE1c tr\xEAn {name} c\xF3 hi\u1EC7u l\u1EF1c hay kh\xF4ng. H\xE3y ki\u1EC3m tra tr\xEAn tr\xECnh duy\u1EC7t tr\u01B0\u1EDBc khi th\u1EED l\u1EA1i.",
      "toast.archiveCleanupFailed": "\u0110\xE3 l\u01B0u tr\u1EEF; d\u1ECDn d\u1EB9p worktree th\u1EA5t b\u1EA1i. Nh\xE1nh \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i. H\xE3y ki\u1EC3m tra worktree.",
      "toast.archiveCleanupScheduled": "\u0110\xE3 l\u01B0u tr\u1EEF; worktree s\u1EBD \u0111\u01B0\u1EE3c d\u1ECDn d\u1EB9p",
      "toast.branchesFailed": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc nh\xE1nh",
      "toast.branchUpdated": "\u0110\xE3 b\u1EAFt \u0111\u1EA7u c\u1EADp nh\u1EADt nh\xE1nh c\u1EE7a {name}",
      "toast.branchUpdateFailed": "Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt nh\xE1nh: {message}",
      "toast.branchUpdateStale": "{name} c\xF3 commit m\u1EDBi. H\xE3y xem l\u1EA1i tr\u01B0\u1EDBc khi c\u1EADp nh\u1EADt.",
      "toast.copied": "\u0110\xE3 sao ch\xE9p li\xEAn k\u1EBFt",
      "toast.copyFailed": "Sao ch\xE9p th\u1EA5t b\u1EA1i",
      "toast.expandFailed": "Kh\xF4ng th\u1EC3 hi\u1EC3n th\u1ECB c\xE1c d\xF2ng kh\xF4ng \u0111\u1ED5i: {message}",
      "toast.expandStale": "T\u1EC7p \u0111\xE3 thay \u0111\u1ED5i sau khi \u0111\u1ECDc thay \u0111\u1ED5i; h\xE3y l\xE0m m\u1EDBi tr\u01B0\u1EDBc khi m\u1EDF r\u1ED9ng",
      "toast.leaveFailed": "Kh\xF4ng th\u1EC3 chuy\u1EC3n sang th\u01B0 m\u1EE5c d\u1EF1 \xE1n; h\xE3y th\u1EED l\u1EA1i",
      "toast.markedReady": "\u0110\xE3 \u0111\xE1nh d\u1EA5u {name} s\u1EB5n s\xE0ng review",
      "toast.markReadyFailed": "Kh\xF4ng th\u1EC3 \u0111\xE1nh d\u1EA5u s\u1EB5n s\xE0ng: {message}",
      "toast.merged": "\u0110\xE3 g\u1ED9p {name}",
      "toast.mergeFailed": "Kh\xF4ng th\u1EC3 g\u1ED9p: {message}",
      "toast.mergeStale": "{name} c\xF3 commit m\u1EDBi; h\xE3y xem l\u1EA1i tr\u01B0\u1EDBc khi g\u1ED9p",
      "toast.pathCopied": "\u0110\xE3 sao ch\xE9p \u0111\u01B0\u1EDDng d\u1EABn",
      "toast.prompted": "\u0110\xE3 g\u1EEDi: {text}",
      "toast.promptFailed": "Kh\xF4ng th\u1EC3 g\u1EEDi tin nh\u1EAFn",
      "toast.refreshFailed": "L\xE0m m\u1EDBi th\u1EA5t b\u1EA1i",
      "toast.removed": "\u0110\xE3 x\xF3a {name} kh\u1ECFi phi\xEAn n\xE0y",
      "toast.removeFailed": "X\xF3a th\u1EA5t b\u1EA1i",
      "toast.rerunFailed": "Kh\xF4ng th\u1EC3 ch\u1EA1y l\u1EA1i ki\u1EC3m tra: {message}",
      "toast.rerunRequested": "\u0110\xE3 y\xEAu c\u1EA7u ch\u1EA1y l\u1EA1i c\xE1c ki\u1EC3m tra c\u1EE7a {name}",
      "toast.rerunStale": "{name} c\xF3 commit m\u1EDBi. H\xE3y xem ki\u1EC3m tra c\u1EE7a commit m\u1EDBi tr\u01B0\u1EDBc khi ch\u1EA1y l\u1EA1i.",
      "toast.restored": "\u0110\xE3 kh\xF4i ph\u1EE5c worktree",
      "toast.restoreFailed": "Kh\xF4ng th\u1EC3 kh\xF4i ph\u1EE5c worktree: {message}",
      "toast.reviewRequested": "\u0110\xE3 y\xEAu c\u1EA7u {login} review {name}",
      "toast.reviewRequestFailed": "Kh\xF4ng th\u1EC3 y\xEAu c\u1EA7u review: {message}",
      "toast.undo": "Ho\xE0n t\xE1c",
      "toast.undoFailed": "Ho\xE0n t\xE1c th\u1EA5t b\u1EA1i",
      "toast.worktreeFailed": "Kh\xF4ng th\u1EC3 thay \u0111\u1ED5i t\xF9y ch\u1ECDn worktree",
      "toast.worktreeStarted": "Phi\xEAn n\xE0y \u0111\xE3 b\u1EAFt \u0111\u1EA7u n\xEAn kh\xF4ng th\u1EC3 d\xF9ng worktree n\u1EEFa",
      "viewed.aria": "\u0110\xE1nh d\u1EA5u {name} l\xE0 \u0111\xE3 xem",
      "viewed.changed": "\u0110\xE3 thay \u0111\u1ED5i k\u1EC3 t\u1EEB khi xem",
      "viewed.count": "{viewed}/{total}",
      "viewed.hint": "Nh\u1EA5n V \u0111\u1EC3 chuy\u1EC3n tr\u1EA1ng th\xE1i t\u1EC7p hi\u1EC7n t\u1EA1i",
      "viewed.hintHost": "\u0110\xE3 l\u01B0u tr\xEAn GitHub \xB7 Nh\u1EA5n V \u0111\u1EC3 chuy\u1EC3n tr\u1EA1ng th\xE1i t\u1EC7p hi\u1EC7n t\u1EA1i",
      "viewed.label": "\u0110\xE3 xem",
      "viewed.progress": "{viewed} / {total} \u0111\xE3 xem",
      "viewed.progressAria": "T\u1EC7p \u0111\xE3 xem",
      "viewed.readFailed": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc t\u1EC7p \u0111\xE3 xem t\u1EEB GitHub n\xEAn kh\xF4ng th\u1EC3 \u0111\xE1nh d\u1EA5u t\u1EC7p: {message}",
      "viewed.saveFailed": "Kh\xF4ng th\u1EC3 l\u01B0u tr\u1EA1ng th\xE1i \u0111\xE3 xem",
      "viewed.saving": "\u0110ang l\u01B0u l\xEAn GitHub\u2026",
      "viewed.syncFailed": "Kh\xF4ng th\u1EC3 l\u01B0u d\u1EA5u \u0111\xE3 xem l\xEAn GitHub: {message}",
      "viewed.syncStale": "PR \u0111\xE3 c\xF3 commit m\u1EDBi n\xEAn d\u1EA5u \u0111\xE3 xem kh\xF4ng \u0111\u01B0\u1EE3c l\u01B0u. H\xE3y l\xE0m m\u1EDBi v\xE0 \u0111\xE1nh d\u1EA5u l\u1EA1i t\u1EC7p.",
      "viewed.syncUnknown": "Kh\xF4ng th\u1EC3 x\xE1c nh\u1EADn d\u1EA5u \u0111\xE3 xem \u0111\xE3 \u0111\u01B0\u1EE3c l\u01B0u: {message}. H\xE3y l\xE0m m\u1EDBi \u0111\u1EC3 xem tr\u1EA1ng th\xE1i.",
      "viewed.unavailable": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc t\u1EC7p \u0111\xE3 xem t\u1EEB GitHub",
      "worktree.base": "T\u1EEB {branch}",
      "worktree.baseHead": "T\u1EEB HEAD hi\u1EC7n t\u1EA1i",
      "worktree.baseMenu": "Nh\xE1nh c\u01A1 s\u1EDF",
      "worktree.blocked.outside-writable-root": "D\u1EEF li\u1EC7u Git c\u1EE7a workspace n\xE0y n\u1EB1m ngo\xE0i c\xE1c th\u01B0 m\u1EE5c ghi \u0111\u01B0\u1EE3c, ch\u1EB3ng h\u1EA1n khi workspace ch\xEDnh l\xE0 m\u1ED9t worktree, n\xEAn ch\u01B0a th\u1EC3 d\xF9ng worktree",
      "worktree.blocked.read-only": "Phi\xEAn ch\u1EC9 \u0111\u1ECDc kh\xF4ng th\u1EC3 d\xF9ng worktree",
      "worktree.currentBranch": "Hi\u1EC7n t\u1EA1i",
      "worktree.currentBranchTip": "Nh\xE1nh hi\u1EC7n t\u1EA1i: {branch}",
      "worktree.detachedTip": "Kh\xF4ng thu\u1ED9c nh\xE1nh n\xE0o \xB7 {commit}",
      "worktree.hint": "Ch\u1EA1y phi\xEAn n\xE0y trong worktree ri\xEAng: khi g\u1EEDi, m\u1ED9t nh\xE1nh m\u1EDBi s\u1EBD \u0111\u01B0\u1EE3c t\u1EA1o t\u1EEB nh\xE1nh \u0111\xE3 ch\u1ECDn, n\xEAn c\xE1c thay \u0111\u1ED5i v\xE0 commit kh\xF4ng \u1EA3nh h\u01B0\u1EDFng t\u1EDBi th\u01B0 m\u1EE5c d\u1EF1 \xE1n",
      "worktree.label": "Worktree m\u1EDBi"
    },
    "goal": {
      "action.cancel": "H\u1EE7y ch\u1EC9nh s\u1EEDa",
      "action.clear": "X\xF3a m\u1EE5c ti\xEAu",
      "action.edit": "S\u1EEDa m\u1EE5c ti\xEAu",
      "action.pause": "T\u1EA1m d\u1EEBng m\u1EE5c ti\xEAu",
      "action.resume": "Ti\u1EBFp t\u1EE5c m\u1EE5c ti\xEAu",
      "action.save": "L\u01B0u m\u1EE5c ti\xEAu",
      "commandInput.aria": "Nh\u1EADp l\u1EC7nh",
      "objective.aria": "N\u1ED9i dung m\u1EE5c ti\xEAu",
      "phase.active": "M\u1EE5c ti\xEAu \u0111ang ch\u1EA1y",
      "phase.active.disarmed": "M\u1EE5c ti\xEAu kh\xF4ng ho\u1EA1t \u0111\u1ED9ng",
      "phase.blocked": "M\u1EE5c ti\xEAu b\u1ECB ch\u1EB7n",
      "phase.paused": "M\u1EE5c ti\xEAu t\u1EA1m d\u1EEBng"
    },
    "job": {
      "count.idle.one": "{count} t\xE1c v\u1EE5 n\u1EC1n",
      "count.idle.other": "{count} t\xE1c v\u1EE5 n\u1EC1n",
      "duration.hours": "{hours} gi\u1EDD {minutes} ph\xFAt",
      "duration.minutes": "{minutes} ph\xFAt {seconds} gi\xE2y",
      "duration.seconds": "{seconds} gi\xE2y",
      "duration.title.done": "M\u1EA5t {duration}",
      "duration.title.live": "\u0110\xE3 ch\u1EA1y {duration}",
      "kill.confirm": "B\u1EA5m l\u1EA1i \u0111\u1EC3 x\xE1c nh\u1EADn",
      "kill.confirmAction": "X\xE1c nh\u1EADn d\u1EEBng",
      "kill.failed": "D\u1EEBng th\u1EA5t b\u1EA1i",
      "kill.stop": "D\u1EEBng t\xE1c v\u1EE5 {label}",
      "list.aria": "T\xE1c v\u1EE5 n\u1EC1n",
      "output.error": "lu\u1ED3ng \u0111\u1EA7u ra tr\u1EF1c ti\u1EBFp b\u1ECB gi\xE1n \u0111o\u1EA1n: {error}",
      "output.gap": "\u2026 \u0111\u1EA7u ra tr\u01B0\u1EDBc \u0111\xF3 \u0111\xE3 b\u1ECB b\u1ECF \u2026",
      "row.collapseAria": "\u1EA8n \u0111\u1EA7u ra tr\u1EF1c ti\u1EBFp c\u1EE7a {label}",
      "row.expandAria": "Hi\u1EC7n \u0111\u1EA7u ra tr\u1EF1c ti\u1EBFp c\u1EE7a {label}",
      "section.clear": "X\xF3a",
      "section.live": "\u0110ang ch\u1EA1y",
      "section.settledCount": "\u0110\xE3 xong {count}",
      "status.completed": "\u0111\xE3 ho\xE0n th\xE0nh",
      "status.failed": "th\u1EA5t b\u1EA1i",
      "status.killed": "\u0111\xE3 h\u1EE7y",
      "status.running": "\u0111ang ch\u1EA1y",
      "status.stopping": "\u0111ang d\u1EEBng",
      "terminal.collapse": "Thu g\u1ECDn",
      "terminal.collapseAria": "Thu g\u1ECDn \u0111\u1EA7u ra",
      "terminal.commandLine": "D\xF2ng l\u1EC7nh {n}",
      "terminal.copied": "\u0110\xE3 sao ch\xE9p",
      "terminal.copy": "Sao ch\xE9p",
      "terminal.done": "xong",
      "terminal.exitCode": "m\xE3 tho\xE1t {code}",
      "terminal.expand": "Hi\u1EC7n th\xEAm {n} d\xF2ng",
      "terminal.expandAria": "M\u1EDF r\u1ED9ng {n} d\xF2ng \u0111\u1EA7u ra \u0111\xE3 thu g\u1ECDn",
      "terminal.failed": "th\u1EA5t b\u1EA1i",
      "terminal.noExitCode": "kh\xF4ng c\xF3 m\xE3 tho\xE1t",
      "terminal.noOutput": "(kh\xF4ng c\xF3 \u0111\u1EA7u ra)",
      "terminal.running": "\u0111ang ch\u1EA1y",
      "terminal.signal": "t\xEDn hi\u1EC7u {signal}"
    },
    "liveshare": {
      "dialog.accessUnavailable": "Kh\xF4ng c\xF3 th\xF4ng tin truy c\u1EADp cho chia s\u1EBB n\xE0y. C\xE1c quy\u1EC1n hi\u1EC7n c\xF3 kh\xF4ng thay \u0111\u1ED5i.",
      "dialog.addressHint": "H\xE3y l\u01B0u \u0111\u1ECBa ch\u1EC9 d\u1ECBch v\u1EE5 chia s\u1EBB tr\u01B0\u1EDBc.",
      "dialog.allowsFork": "Cho ph\xE9p ng\u01B0\u1EDDi xem fork phi\xEAn",
      "dialog.allowsForkHint": "Phi\xEAn \u0111\u01B0\u1EE3c fork gi\u1EEF nguy\xEAn quy\u1EC1n nh\u01B0 phi\xEAn ngu\u1ED3n.",
      "dialog.cancel": "H\u1EE7y",
      "dialog.capabilities": "Endpoint plugin",
      "dialog.capabilities.createFailed": "Chia s\u1EBB \u0111\xE3 \u0111\u01B0\u1EE3c t\u1EA1o nh\u01B0ng endpoint plugin ch\u01B0a \u0111\u01B0\u1EE3c l\u01B0u; h\xE3y th\u1EED l\u1EA1i trong Quy\u1EC1n chia s\u1EBB.",
      "dialog.capabilities.empty": "Hi\u1EC7n kh\xF4ng c\xF3 plugin n\xE0o khai b\xE1o endpoint \u0111\u1EC3 chia s\u1EBB.",
      "dialog.capabilities.global": "Quy\u1EC1n plugin",
      "dialog.capabilities.global.all": "Cho ph\xE9p t\u1EA5t c\u1EA3",
      "dialog.capabilities.global.custom": "T\xF9y ch\u1EC9nh",
      "dialog.capabilities.global.none": "T\u1EEB ch\u1ED1i t\u1EA5t c\u1EA3",
      "dialog.capabilities.partial": "M\u1ED9t ph\u1EA7n",
      "dialog.capabilities.tier.all": "T\u1EA5t c\u1EA3 ph\u01B0\u01A1ng th\u1EE9c",
      "dialog.capabilities.tier.none": "Kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "dialog.connectivityChecking": "\u0110ang ki\u1EC3m tra \u0111\u1ECBa ch\u1EC9 d\u1ECBch v\u1EE5 chia s\u1EBB c\xF3 ph\u1EA3n h\u1ED3i kh\xF4ng\u2026",
      "dialog.copied": "\u0110\xE3 sao ch\xE9p",
      "dialog.copy": "Sao ch\xE9p li\xEAn k\u1EBFt",
      "dialog.copyFailed": "Kh\xF4ng th\u1EC3 sao ch\xE9p li\xEAn k\u1EBFt. H\xE3y ch\u1ECDn li\xEAn k\u1EBFt chia s\u1EBB v\xE0 sao ch\xE9p th\u1EE7 c\xF4ng.",
      "dialog.create": "T\u1EA1o chia s\u1EBB",
      "dialog.creating": "\u0110ang t\u1EA1o\u2026",
      "dialog.deploymentAccess": "Danh t\xEDnh \u0111\u01B0\u1EE3c tri\u1EC3n khai c\u1EA5p quy\u1EC1n: {count}. L\u1EF1a ch\u1ECDn kh\xF4ng ph\u1EA3i quy t\u1EAFc truy c\u1EADp duy nh\u1EA5t.",
      "dialog.description": "T\u1EA1o li\xEAn k\u1EBFt Liveshare ch\u1EC9 \u0111\u1ECDc cho {title}",
      "dialog.diagnostics": "Chi ti\u1EBFt k\u1EBFt n\u1ED1i",
      "dialog.done": "Xong",
      "dialog.expiry": "H\u1EBFt h\u1EA1n",
      "dialog.expiry.clear": "Kh\xF4ng bao gi\u1EDD h\u1EBFt h\u1EA1n",
      "dialog.expiry.day": "Sau 24 gi\u1EDD",
      "dialog.expiry.hour": "Sau 1 gi\u1EDD",
      "dialog.expiry.never": "Kh\xF4ng bao gi\u1EDD",
      "dialog.expiry.until": "\u0110\u1EBFn {time}",
      "dialog.expiry.week": "Sau 7 ng\xE0y",
      "dialog.help": "Ch\u1EC9 chia s\u1EBB phi\xEAn n\xE0y; quy\u1EC1n c\u1EE7a phi\xEAn quy\u1EBFt \u0111\u1ECBnh ng\u01B0\u1EDDi xem \u0111\u01B0\u1EE3c l\xE0m g\xEC, v\xE0 b\u1EA1n c\xF3 th\u1EC3 d\u1EEBng b\u1EA5t c\u1EE9 l\xFAc n\xE0o trong Qu\u1EA3n l\xFD chia s\u1EBB.",
      "dialog.hostUnavailable": "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i d\u1ECBch v\u1EE5 chia s\u1EBB Liveshare c\u1EE7a DSH.",
      "dialog.identity.expired": "Phi\xEAn \u0111\u0103ng nh\u1EADp c\u1EE7a b\u1EA1n \u0111\xE3 h\u1EBFt h\u1EA1n. H\xE3y \u0111\u0103ng nh\u1EADp l\u1EA1i tr\u01B0\u1EDBc khi t\u1EA1o chia s\u1EBB.",
      "dialog.identity.expires": "C\xF3 hi\u1EC7u l\u1EF1c \u0111\u1EBFn {time}",
      "dialog.identity.loginBlocked": "Kh\xF4ng th\u1EC3 m\u1EDF c\u1EEDa s\u1ED5 \u0111\u0103ng nh\u1EADp (c\xF3 th\u1EC3 tr\xECnh duy\u1EC7t \u0111\xE3 ch\u1EB7n). H\xE3y cho ph\xE9p c\u1EEDa s\u1ED5 b\u1EADt l\xEAn v\xE0 th\u1EED l\u1EA1i.",
      "dialog.identity.loginCancelled": "\u0110\xE3 h\u1EE7y \u0111\u0103ng nh\u1EADp; kh\xF4ng c\xF3 th\xF4ng tin x\xE1c th\u1EF1c n\xE0o \u0111\u01B0\u1EE3c l\u01B0u.",
      "dialog.identity.loginDone": "\u0110\xE3 \u0111\u0103ng nh\u1EADp; \u0111ang \u0111\u1ECDc tr\u1EA1ng th\xE1i t\xE0i kho\u1EA3n.",
      "dialog.identity.loginExpired": "L\u1EA7n \u0111\u0103ng nh\u1EADp n\xE0y \u0111\xE3 h\u1EBFt h\u1EA1n; h\xE3y b\u1EAFt \u0111\u1EA7u l\u1EA1i.",
      "dialog.identity.loginFailed": "\u0110\u0103ng nh\u1EADp ch\u01B0a ho\xE0n t\u1EA5t. H\xE3y th\u1EED l\u1EA1i.",
      "dialog.identity.loginMismatch": "K\u1EBFt qu\u1EA3 \u0111\u0103ng nh\u1EADp kh\xF4ng thu\u1ED9c y\xEAu c\u1EA7u n\xE0y n\xEAn \u0111\xE3 b\u1ECB b\u1ECF qua.",
      "dialog.identity.loginOpening": "\u0110ang b\u1EAFt \u0111\u1EA7u \u0111\u0103ng nh\u1EADp\u2026",
      "dialog.identity.loginReplayed": "L\u1EA7n \u0111\u0103ng nh\u1EADp n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c d\xF9ng; h\xE3y b\u1EAFt \u0111\u1EA7u l\u1EA1i.",
      "dialog.identity.loginUnavailable": "Kh\xF4ng th\u1EC3 b\u1EAFt \u0111\u1EA7u \u0111\u0103ng nh\u1EADp: Relay kh\xF4ng kh\u1EA3 d\u1EE5ng ho\u1EB7c \u0111\u1ECBa ch\u1EC9 n\xE0y kh\xF4ng h\u1ED7 tr\u1EE3.",
      "dialog.identity.loginVerifying": "\u0110ang x\xE1c nh\u1EADn k\u1EBFt qu\u1EA3 \u0111\u0103ng nh\u1EADp\u2026",
      "dialog.identity.loginWaiting": "Ho\xE0n t\u1EA5t \u0111\u0103ng nh\u1EADp trong c\u1EEDa s\u1ED5 v\u1EEBa m\u1EDF.",
      "dialog.identity.relayChanged": "Phi\xEAn \u0111\u0103ng nh\u1EADp hi\u1EC7n t\u1EA1i thu\u1ED9c m\u1ED9t \u0111\u1ECBa ch\u1EC9 Relay kh\xE1c. H\xE3y \u0111\u0103ng nh\u1EADp l\u1EA1i tr\xEAn \u0111\u1ECBa ch\u1EC9 n\xE0y.",
      "dialog.identity.relayUnsupported": "Relay t\u1EA1i \u0111\u1ECBa ch\u1EC9 n\xE0y ch\u01B0a x\xE1c minh danh t\xEDnh. H\xE3y n\xE2ng c\u1EA5p tr\u01B0\u1EDBc khi t\u1EA1o chia s\u1EBB; trang n\xE0y s\u1EBD kh\xF4ng t\u1EA1o chia s\u1EBB \u1EA9n danh.",
      "dialog.identity.renewed": "\u0110\xE3 t\u1EF1 \u0111\u1ED9ng gia h\u1EA1n trong ph\u1EA1m vi quy\u1EC1n \u0111\u01B0\u1EE3c c\u1EA5p.",
      "dialog.identity.retry": "Th\u1EED l\u1EA1i",
      "dialog.identity.reverify": "\u0110\u0103ng nh\u1EADp l\u1EA1i",
      "dialog.identity.unknown": "Hi\u1EC7n kh\xF4ng th\u1EC3 xem tr\u1EA1ng th\xE1i \u0111\u0103ng nh\u1EADp. H\xE3y th\u1EED l\u1EA1i sau; kh\xF4ng chia s\u1EBB n\xE0o \u0111\u01B0\u1EE3c t\u1EA1o tr\u01B0\u1EDBc khi b\u1EA1n \u0111\u0103ng nh\u1EADp.",
      "dialog.identity.unverified": "B\u1EA1n ch\u01B0a \u0111\u0103ng nh\u1EADp n\xEAn kh\xF4ng th\u1EC3 t\u1EA1o chia s\u1EBB.",
      "dialog.identity.verify": "\u0110\u0103ng nh\u1EADp",
      "dialog.identity.verifyBlocked": "H\xE3y l\u01B0u \u0111\u1ECBa ch\u1EC9 v\xE0 x\xE1c nh\u1EADn n\xF3 ph\u1EA3n h\u1ED3i tr\u01B0\u1EDBc khi \u0111\u0103ng nh\u1EADp.",
      "dialog.linkHelp": "\u0110\xF3ng b\u1EA3ng n\xE0y kh\xF4ng d\u1EEBng chia s\u1EBB.",
      "dialog.linkSharing": "Chia s\u1EBB qua li\xEAn k\u1EBFt",
      "dialog.manage": "Qu\u1EA3n l\xFD chia s\u1EBB",
      "dialog.mode.open": "B\u1EA5t k\u1EF3 ai trong t\u1ED5 ch\u1EE9c c\xF3 li\xEAn k\u1EBFt",
      "dialog.mode.selected": "\u0110\u1ED3ng nghi\u1EC7p c\u1EE5 th\u1EC3",
      "dialog.noOutgoing": "Ch\u01B0a c\xF3 phi\xEAn \u0111\u01B0\u1EE3c chia s\u1EBB",
      "dialog.open": "M\u1EDF",
      "dialog.outgoing": "Chia s\u1EBB c\u1EE7a t\xF4i",
      "dialog.permissionChecking": "\u0110ang ki\u1EC3m tra host n\xE0y c\xF3 th\u1EC3 xu\u1EA5t b\u1EA3n t\u1EA1i \u0111\u1ECBa ch\u1EC9 n\xE0y kh\xF4ng\u2026",
      "dialog.permissionFailed": "Ki\u1EC3m tra quy\u1EC1n ch\u01B0a ho\xE0n t\u1EA5t (Host kh\xF4ng b\xE1o l\xFD do).",
      "dialog.permissionOk": "\u0110\xE3 \u0111\u0103ng nh\u1EADp; host n\xE0y c\xF3 th\u1EC3 xu\u1EA5t b\u1EA3n chia s\u1EBB.",
      "dialog.permissionPending": "Ph\u1EA3i ki\u1EC3m tra \u0111\u1ECBa ch\u1EC9 n\xE0y tr\u01B0\u1EDBc khi c\xF3 th\u1EC3 t\u1EA1o chia s\u1EBB.",
      "dialog.permissions": "Quy\u1EC1n chia s\u1EBB",
      "dialog.permissions.discard": "C\xF3 thay \u0111\u1ED5i ch\u01B0a l\u01B0u; ch\u1ECDn Xong l\u1EA7n n\u1EEFa s\u1EBD h\u1EE7y c\xE1c thay \u0111\u1ED5i \u0111\xF3.",
      "dialog.permissions.failed": "Quy\u1EC1n chia s\u1EBB ch\u01B0a \u0111\u01B0\u1EE3c l\u01B0u. H\xE3y th\u1EED l\u1EA1i.",
      "dialog.permissions.modeUnsupported": "Harness n\xE0y kh\xF4ng b\xE1o quy\u1EC1n c\u1EE7a phi\xEAn n\xEAn kh\xF4ng th\u1EC3 thay \u0111\u1ED5i \u1EDF \u0111\xE2y.",
      "dialog.permissions.partial": "Quy\u1EC1n c\u1EE7a phi\xEAn \u0111\xE3 \u0111\u01B0\u1EE3c c\u1EADp nh\u1EADt nh\u01B0ng endpoint plugin ch\u01B0a \u0111\u01B0\u1EE3c l\u01B0u. H\xE3y th\u1EED l\u1EA1i.",
      "dialog.permissions.save": "L\u01B0u thay \u0111\u1ED5i",
      "dialog.permissions.saved": "\u0110\xE3 l\u01B0u quy\u1EC1n chia s\u1EBB v\xE0 endpoint plugin.",
      "dialog.permissions.saving": "\u0110ang l\u01B0u\u2026",
      "dialog.permissions.unsaved": "C\xF3 thay \u0111\u1ED5i ch\u01B0a l\u01B0u.",
      "dialog.ptcSandboxWarning": "L\u01B0u \xFD: sandbox PTC c\u1EE7a LiveShare ch\u01B0a ho\xE0n thi\u1EC7n - ng\u01B0\u1EDDi xem c\xF3 th\u1EC3 \u0111\u1ECDc ho\u1EB7c ghi t\u1EC7p ngo\xE0i workspace \u0111\u01B0\u1EE3c chia s\u1EBB th\xF4ng qua run_code. Ch\u1EC9 chia s\u1EBB v\u1EDBi ng\u01B0\u1EDDi b\u1EA1n tin t\u01B0\u1EDFng.",
      "dialog.relay": "\u0110\u1ECBa ch\u1EC9 d\u1ECBch v\u1EE5 chia s\u1EBB",
      "dialog.relayCurrent": "\u0110\u1ECBa ch\u1EC9 hi\u1EC7n t\u1EA1i",
      "dialog.relayInvalid": "Nh\u1EADp \u0111\u1ECBa ch\u1EC9 \u0111\u1EA7y \u0111\u1EE7 b\u1EAFt \u0111\u1EA7u b\u1EB1ng http:// ho\u1EB7c https://.",
      "dialog.relayReverify": "\u0110\u1ECBa ch\u1EC9 \u0111\xE3 thay \u0111\u1ED5i; h\xE3y \u0111\u0103ng nh\u1EADp l\u1EA1i tr\xEAn \u0111\u1ECBa ch\u1EC9 m\u1EDBi.",
      "dialog.relaySaved": "\u0110\xE3 l\u01B0u. C\xE1c chia s\u1EBB m\u1EDBi s\u1EBD d\xF9ng \u0111\u1ECBa ch\u1EC9 n\xE0y.",
      "dialog.relaySource.saved": "\u0110\u1ECBa ch\u1EC9 \u0111\xE3 l\u01B0u",
      "dialog.relaySource.unset": "Ch\u01B0a \u0111\u1EB7t",
      "dialog.relayUnsavedHint": "\u0110\u1ECBa ch\u1EC9 n\xE0y ch\u01B0a \u0111\u01B0\u1EE3c l\u01B0u; h\xE3y l\u01B0u \u0111\u1EC3 \xE1p d\u1EE5ng.",
      "dialog.relayUnset": "Ch\u01B0a \u0111\u1EB7t \u0111\u1ECBa ch\u1EC9",
      "dialog.relayUnverified": "Ch\u01B0a x\xE1c minh tr\xEAn \u0111\u1ECBa ch\u1EC9 n\xE0y",
      "dialog.relayVerified": "\u0110\xE3 x\xE1c minh tr\xEAn \u0111\u1ECBa ch\u1EC9 n\xE0y",
      "dialog.selectedCount": "S\u1ED1 ng\u01B0\u1EDDi \u0111\xE3 ch\u1ECDn \u0111\u01B0\u1EE3c x\xE1c nh\u1EADn: {count}.",
      "dialog.selectedRetired": "Chia s\u1EBB n\xE0y gi\u1EEF ph\u1EA1m vi \u201C\u0111\u1ED3ng nghi\u1EC7p c\u1EE5 th\u1EC3\u201D c\u0169; c\xE1c chia s\u1EBB m\u1EDBi ch\u1EC9 c\xF3 hai ch\u1EBF \u0111\u1ED9 \u1EDF tr\xEAn.",
      "dialog.sessionMode": "Quy\u1EC1n c\u1EE7a phi\xEAn",
      "dialog.sessionMode.hint.view": "Ch\u1EC9 \u0111\u1ECDc: ng\u01B0\u1EDDi xem \u0111\u1ECDc t\u1EC7p v\xE0 b\u1EA3n ghi phi\xEAn trong ph\u1EA1m vi c\u1EE7a chia s\u1EBB v\xE0 c\xF3 th\u1EC3 nh\u1EAFn tin cho phi\xEAn, nh\u01B0ng m\u1ECDi c\xF4ng c\u1EE5 ch\u1EA1y trong sandbox ch\u1EC9 \u0111\u1ECDc v\xE0 kh\xF4ng th\u1EC3 ghi b\u1EA5t k\u1EF3 t\u1EC7p n\xE0o.",
      "dialog.sessionMode.hint.write": "Ghi v\xE0o workspace: ng\u01B0\u1EDDi xem l\xE0m vi\u1EC7c trong sandbox ghi c\xF3 gi\u1EDBi h\u1EA1n \u2014 h\u1ECD s\u1EEDa t\u1EC7p b\xEAn trong ph\u1EA1m vi c\u1EE7a chia s\u1EBB trong gi\u1EDBi h\u1EA1n ghi; m\u1ECDi thao t\xE1c \u0111\u1ECDc v\xE0 ghi ngo\xE0i ph\u1EA1m vi \u0111\xF3 \u0111\u1EC1u b\u1ECB t\u1EEB ch\u1ED1i, c\xF2n c\xE0i \u0111\u1EB7t to\xE0n c\u1EE5c, th\xF4ng tin x\xE1c th\u1EF1c v\xE0 c\xE1c phi\xEAn kh\xE1c c\u1EE7a b\u1EA1n v\u1EABn \u0111\xF3ng.",
      "dialog.sessionMode.notGranted": "Harness n\xE0y kh\xF4ng b\xE1o l\u1EA1i quy\u1EC1n c\u1EE7a phi\xEAn: b\u1EA3n build c\u1EE7a owner \u0111\xE3 c\u0169 c\u1EA7n \u0111\u01B0\u1EE3c n\xE2ng c\u1EA5p tr\u01B0\u1EDBc khi chia s\u1EBB c\xF3 th\u1EC3 mang quy\u1EC1n n\xE0y.",
      "dialog.sessionMode.view": "Ch\u1EC9 \u0111\u1ECDc",
      "dialog.sessionMode.write": "Ghi v\xE0o workspace",
      "dialog.share.offline": "Ngo\u1EA1i tuy\u1EBFn",
      "dialog.share.online": "Tr\u1EF1c tuy\u1EBFn",
      "dialog.shareLink": "Li\xEAn k\u1EBFt chia s\u1EBB",
      "dialog.stop": "D\u1EEBng chia s\u1EBB",
      "dialog.stopFailed": "Kh\xF4ng d\u1EEBng \u0111\u01B0\u1EE3c chia s\u1EBB. H\xE3y th\u1EED l\u1EA1i.",
      "dialog.testFail": "K\u1EBFt n\u1ED1i Relay th\u1EA5t b\u1EA1i (Host kh\xF4ng b\xE1o l\xFD do).",
      "dialog.testing": "\u0110ang k\u1EBFt n\u1ED1i d\u1ECBch v\u1EE5 chia s\u1EBB\u2026",
      "dialog.testOk": "K\u1EBFt n\u1ED1i Relay OK",
      "dialog.testWarn": "HTTP c\u1EE7a Relay truy c\u1EADp \u0111\u01B0\u1EE3c nh\u01B0ng \u0111\u0103ng k\xFD ch\u01B0a ho\xE0n t\u1EA5t v\xE0 Host kh\xF4ng b\xE1o l\xFD do. B\u1EA1n v\u1EABn c\xF3 th\u1EC3 t\u1EA1o chia s\u1EBB; gateway s\u1EBD th\u1EED l\u1EA1i.",
      "dialog.title": "Chia s\u1EBB phi\xEAn",
      "header.action": "Chia s\u1EBB",
      "inputOrigin.sharedSession": "T\u1EEB m\u1ED9t phi\xEAn \u0111\u01B0\u1EE3c chia s\u1EBB [{subjectId}]",
      "manage.allowsForkSwitch": "Ng\u01B0\u1EDDi xem c\xF3 \u0111\u01B0\u1EE3c fork \u201C{title}\u201D kh\xF4ng",
      "manage.audit.accessApproved": "\u0110\xE3 ph\xEA duy\u1EC7t y\xEAu c\u1EA7u",
      "manage.audit.accessGrant": "\u0110\xE3 c\u1EA5p quy\u1EC1n xem",
      "manage.audit.accessRequest": "\u0110\xE3 y\xEAu c\u1EA7u quy\u1EC1n xem",
      "manage.audit.accessRevoke": "\u0110\xE3 thu h\u1ED3i quy\u1EC1n xem",
      "manage.audit.shareCreate": "\u0110\xE3 t\u1EA1o chia s\u1EBB",
      "manage.audit.shareStop": "\u0110\xE3 d\u1EEBng chia s\u1EBB",
      "manage.cancelShare": "H\u1EE7y chia s\u1EBB",
      "manage.capabilities": "Endpoint plugin",
      "manage.description": "Xem tr\u1EA1ng th\xE1i tr\u1EF1c tuy\u1EBFn v\xE0 ph\u1EA1m vi truy c\u1EADp c\u1EE7a t\u1EEBng chia s\u1EBB.",
      "manage.done": "Xong",
      "manage.empty": "Ch\u01B0a c\xF3 phi\xEAn \u0111\u01B0\u1EE3c chia s\u1EBB.",
      "manage.expiredAt": "\u0110\xE3 h\u1EBFt h\u1EA1n {time}",
      "manage.expiresAt": "H\u1EBFt h\u1EA1n {time}",
      "manage.history": "L\u1ECBch s\u1EED",
      "manage.historyFailed": "Kh\xF4ng th\u1EC3 t\u1EA3i l\u1ECBch s\u1EED. H\xE3y th\u1EED l\u1EA1i.",
      "manage.historyLoading": "\u0110ang t\u1EA3i l\u1ECBch s\u1EED\u2026",
      "manage.identityExpired": "Phi\xEAn \u0111\u0103ng nh\u1EADp n\xE0y \u0111\xE3 h\u1EBFt h\u1EA1n, ch\u1EC9 ch\u1EB7n vi\u1EC7c t\u1EA1o chia s\u1EBB m\u1EDBi. C\xE1c chia s\u1EBB b\xEAn d\u01B0\u1EDBi kh\xF4ng b\u1ECB \u1EA3nh h\u01B0\u1EDFng: li\xEAn k\u1EBFt c\u1EE7a ch\xFAng v\u1EABn sao ch\xE9p v\xE0 qu\u1EA3n l\xFD \u0111\u01B0\u1EE3c.",
      "manage.loading": "\u0110ang t\u1EA3i chia s\u1EBB\u2026",
      "manage.open": "Qu\u1EA3n l\xFD",
      "manage.refresh": "T\u1EA3i l\u1EA1i",
      "manage.sessionMode": "Quy\u1EC1n c\u1EE7a phi\xEAn",
      "manage.sessionModeFailed": "Quy\u1EC1n c\u1EE7a phi\xEAn ch\u01B0a \u0111\u01B0\u1EE3c l\u01B0u. H\xE3y th\u1EED l\u1EA1i.",
      "manage.sessionModeSwitch": "Quy\u1EC1n c\u1EE7a phi\xEAn cho \u201C{title}\u201D",
      "manage.sessionModeUnsupported": "Harness n\xE0y kh\xF4ng b\xE1o quy\u1EC1n c\u1EE7a phi\xEAn n\xEAn kh\xF4ng th\u1EC3 \u0111\u1EB7t \u1EDF \u0111\xE2y.",
      "manage.stop.acknowledge": "T\xF4i hi\u1EC3u li\xEAn k\u1EBFt \u0111\xE3 c\xF4ng b\u1ED1 s\u1EBD ng\u1EEBng ho\u1EA1t \u0111\u1ED9ng ngay l\u1EADp t\u1EE9c",
      "manage.stop.description": "Li\xEAn k\u1EBFt \u0111\xE3 c\xF4ng b\u1ED1 s\u1EBD ng\u1EEBng ho\u1EA1t \u0111\u1ED9ng ngay l\u1EADp t\u1EE9c v\xE0 b\u1EA5t k\u1EF3 ai \u0111ang xem s\u1EBD m\u1EA5t quy\u1EC1n truy c\u1EADp.",
      "manage.stop.title": "D\u1EEBng chia s\u1EBB?",
      "manage.title": "Qu\u1EA3n l\xFD chia s\u1EBB",
      "manage.unavailable": "Kh\xF4ng th\u1EC3 t\u1EA3i chia s\u1EBB. \u0110ang hi\u1EC3n th\u1ECB tr\u1EA1ng th\xE1i bi\u1EBFt g\u1EA7n nh\u1EA5t.",
      "viewer.action.directory": "Quay l\u1EA1i chia s\u1EBB",
      "viewer.action.reload": "T\u1EA3i l\u1EA1i",
      "viewer.action.retry": "Th\u1EED l\u1EA1i",
      "viewer.action.signIn": "\u0110\u0103ng nh\u1EADp l\u1EA1i",
      "viewer.brand": "LiveShare",
      "viewer.dismiss": "B\u1ECF qua",
      "viewer.empty": "Phi\xEAn n\xE0y ch\u01B0a c\xF3 n\u1ED9i dung \u0111\u1EC3 hi\u1EC3n th\u1ECB.",
      "viewer.expired": "Chia s\u1EBB n\xE0y \u0111\xE3 h\u1EBFt h\u1EA1n v\xE0 kh\xF4ng c\xF2n c\u1EA5p quy\u1EC1n truy c\u1EADp. H\xE3y \u0111\u1EC1 ngh\u1ECB owner chia s\u1EBB l\u1EA1i.",
      "viewer.expiresAt": "Truy c\u1EADp \u0111\u1EBFn {time}",
      "viewer.home": "Quay l\u1EA1i trang ch\u1EE7 LiveShare",
      "viewer.loading": "\u0110ang k\u1EBFt n\u1ED1i phi\xEAn\u2026",
      "viewer.model.locked": "Ng\u01B0\u1EDDi xem kh\xF4ng th\u1EC3 \u0111\u1ED5i model",
      "viewer.model.title": "Model m\xE0 phi\xEAn n\xE0y ch\u1EA1y, do owner chia s\u1EBB ch\u1ECDn",
      "viewer.noAnswer": "kh\xF4ng c\xF3 ph\u1EA3n h\u1ED3i",
      "viewer.offline": "Chia s\u1EBB \u0111ang ngo\u1EA1i tuy\u1EBFn. N\xF3 s\u1EBD t\u1EF1 k\u1EBFt n\u1ED1i l\u1EA1i.",
      "viewer.permission.locked": "Ng\u01B0\u1EDDi xem kh\xF4ng th\u1EC3 t\u1EF1 thay \u0111\u1ED5i",
      "viewer.permission.title": "Quy\u1EC1n c\u1EE7a phi\xEAn m\xE0 chia s\u1EBB n\xE0y mang, do owner \u0111\u1EB7t",
      "viewer.permission.unconfirmed": "Ch\u01B0a x\xE1c nh\u1EADn",
      "viewer.picker.groupCount": "{count} chia s\u1EBB",
      "viewer.picker.historical": "L\u1ECBch s\u1EED ch\u01B0a x\xE1c minh",
      "viewer.picker.historicalNote": "C\xE1c chia s\u1EBB n\xE0y c\xF3 tr\u01B0\u1EDBc khi danh t\xEDnh \u0111\u01B0\u1EE3c x\xE1c minh; quy\u1EC1n truy c\u1EADp c\u1EE7a ch\xFAng kh\xF4ng thay \u0111\u1ED5i.",
      "viewer.picker.offline": "Ngo\u1EA1i tuy\u1EBFn",
      "viewer.picker.online": "Tr\u1EF1c tuy\u1EBFn",
      "viewer.picker.ownerUnknown": "Owner kh\xF4ng r\xF5",
      "viewer.picker.subjectLabel": "subject \u2026{label}",
      "viewer.picker.version": "DSH",
      "viewer.pluginUnsupported": "Plugin {plugin} kh\xF4ng kh\u1EA3 d\u1EE5ng trong chia s\u1EBB n\xE0y; m\u1ED9t s\u1ED1 t\xEDnh n\u0103ng kh\xF4ng d\xF9ng \u0111\u01B0\u1EE3c.",
      "viewer.readonlyNote": "Ch\u1EC9 \u0111\u1ECDc: b\u1EA1n c\xF3 th\u1EC3 \u0111i\u1EC1u khi\u1EC3n phi\xEAn n\xE0y, nh\u01B0ng ch\u1EC9 \u0111\u1ECDc t\u1EC7p trong ph\u1EA1m vi c\u1EE7a chia s\u1EBB v\xE0 kh\xF4ng s\u1EEDa g\xEC.",
      "viewer.reason.fork-ceiling-uninstalled": "Host n\xE0y ch\u01B0a c\xE0i c\xE1c gi\u1EDBi h\u1EA1n th\u1EF1c thi ch\u1EC9 \u0111\u1ECDc",
      "viewer.reason.fork-enforcement-failed": "Phi\xEAn nh\xE1nh \u0111\xE3 \u0111\u01B0\u1EE3c t\u1EA1o nh\u01B0ng kh\xF4ng th\u1EC3 c\xE0i gi\u1EDBi h\u1EA1n sandbox n\xEAn kh\xF4ng d\xF9ng \u0111\u01B0\u1EE3c",
      "viewer.reason.fork-not-implemented": "B\u1EA3n tri\u1EC3n khai n\xE0y ch\u01B0a h\u1ED7 tr\u1EE3 ph\xE2n nh\xE1nh",
      "viewer.reason.fork-not-permitted": "Owner kh\xF4ng cho ph\xE9p ph\xE2n nh\xE1nh phi\xEAn n\xE0y",
      "viewer.reason.fork-operation-conflict": "Y\xEAu c\u1EA7u nh\xE1nh n\xE0y ch\u1EC9 \u0111\u1ECBnh ti\u1EC1n t\u1ED1 kh\xE1c l\u1EA7n tr\u01B0\u1EDBc n\xEAn kh\xF4ng c\xF3 phi\xEAn m\u1EDBi n\xE0o \u0111\u01B0\u1EE3c t\u1EA1o",
      "viewer.reason.fork-prepare-failed": "Host kh\xF4ng th\u1EC3 chu\u1EA9n b\u1ECB nh\xE1nh n\xE0y n\xEAn thao t\xE1c \u0111\xE3 kh\xF4ng ch\u1EA1y",
      "viewer.reason.fork-source-revoked": "Chia s\u1EBB ngu\u1ED3n c\u1EE7a nh\xE1nh n\xE0y kh\xF4ng c\xF2n ho\u1EA1t \u0111\u1ED9ng",
      "viewer.reason.fork-unknown-child": "Phi\xEAn n\xE0y kh\xF4ng ph\u1EA3i nh\xE1nh c\u1EE7a m\u1ED9t chia s\u1EBB",
      "viewer.reason.fork-viewer-mismatch": "Nh\xE1nh \u0111\xF3 thu\u1ED9c v\u1EC1 ng\u01B0\u1EDDi xem kh\xE1c",
      "viewer.reason.fork-viewer-unknown": "Relay kh\xF4ng x\xE1c nh\u1EADn danh t\xEDnh c\u1EE7a b\u1EA1n n\xEAn kh\xF4ng th\u1EC3 t\u1EA1o nh\xE1nh",
      "viewer.reason.liveshare/read-only": "Phi\xEAn n\xE0y n\u1EB1m ngo\xE0i chia s\u1EBB b\u1EA1n c\xF3 n\xEAn kh\xF4ng \u0111\u01B0\u1EE3c ghi",
      "viewer.reason.mode-view": "Owner \u0111\u1EB7t chia s\u1EBB n\xE0y \u1EDF ch\u1EBF \u0111\u1ED9 ch\u1EC9 \u0111\u1ECDc",
      "viewer.reason.prompt-identity-missing": "L\u1EA7n g\u1EEDi n\xE0y kh\xF4ng mang danh t\xEDnh y\xEAu c\u1EA7u \u0111\u1EC3 quy tr\xE1ch nhi\u1EC7m n\xEAn Host \u0111\xE3 kh\xF4ng ch\u1EA1y",
      "viewer.reason.share-expired": "Chia s\u1EBB \u0111\xE3 h\u1EBFt h\u1EA1n",
      "viewer.reason.share-not-found": "Chia s\u1EBB \u0111\xF3 kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i",
      "viewer.reason.share-not-writable": "Owner kh\xF4ng cho ph\xE9p ghi v\xE0o phi\xEAn n\xE0y",
      "viewer.reason.share-stopped": "\u0110\xE3 d\u1EEBng chia s\u1EBB",
      "viewer.reason.source-session-mismatch": "Nh\xE1nh ch\u1EC9 \u0111\u1ECBnh m\u1ED9t phi\xEAn kh\xE1c v\u1EDBi phi\xEAn m\xE0 chia s\u1EBB mang",
      "viewer.reason.source-write-unavailable": "Host n\xE0y kh\xF4ng th\u1EC3 gi\u1EDBi h\u1EA1n phi\xEAn \u0111\u01B0\u1EE3c chia s\u1EBB n\xEAn kh\xF4ng th\u1EC3 \u0111i\u1EC1u khi\u1EC3n n\xF3",
      "viewer.reason.unconfirmed": "Kh\xF4ng th\u1EC3 x\xE1c nh\u1EADn tr\u1EA1ng th\xE1i hi\u1EC7n t\u1EA1i c\u1EE7a chia s\u1EBB n\xE0y; n\xF3 v\u1EABn ch\u1EC9 \u0111\u1ECDc cho \u0111\u1EBFn khi x\xE1c nh\u1EADn \u0111\u01B0\u1EE3c",
      "viewer.reason.viewer-not-authorized": "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n kh\xF4ng c\xF2n quy\u1EC1n truy c\u1EADp chia s\u1EBB n\xE0y",
      "viewer.reason.write-not-implemented": "B\u1EA3n tri\u1EC3n khai n\xE0y ch\u01B0a h\u1ED7 tr\u1EE3 ghi",
      "viewer.reauthenticate": "Phi\xEAn \u0111\u0103ng nh\u1EADp c\u1EE7a b\u1EA1n \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i.",
      "viewer.reauthenticateAction": "\u0110\u0103ng nh\u1EADp l\u1EA1i",
      "viewer.reconnecting": "M\u1EA5t k\u1EBFt n\u1ED1i, \u0111ang th\u1EED l\u1EA1i\u2026",
      "viewer.refused": "liveshare: {subject} b\u1ECB t\u1EEB ch\u1ED1i v\u1EDBi {status}",
      "viewer.relayAnswered": "liveshare: Relay tr\u1EA3 l\u1EDDi {status}",
      "viewer.relaySilent": "liveshare: Relay kh\xF4ng tr\u1EA3 l\u1EDDi g\xEC cho {subject}",
      "viewer.relayVersion": "relay {release}",
      "viewer.retry": "Th\u1EED l\u1EA1i ngay",
      "viewer.revoked": "Owner \u0111\xE3 d\u1EEBng chia s\u1EBB ho\u1EB7c thu h\u1ED3i quy\u1EC1n truy c\u1EADp c\u1EE7a b\u1EA1n.",
      "viewer.role.assistant": "Tr\u1EE3 l\xFD",
      "viewer.role.tool": "C\xF4ng c\u1EE5",
      "viewer.role.user": "Ng\u01B0\u1EDDi d\xF9ng",
      "viewer.row.branchRefused": "Kh\xF4ng th\u1EC3 ho\xE0n t\u1EA5t nh\xE1nh: {reason}",
      "viewer.row.fork": "Fork phi\xEAn",
      "viewer.row.forkSource": "\u0110\u01B0\u1EE3c fork t\u1EEB \u201C{title}\u201D",
      "viewer.sharedBy": "\u0110\u01B0\u1EE3c chia s\u1EBB b\u1EDFi {owner} \xB7 {title}",
      "viewer.sharedByShort": "\u0110\u01B0\u1EE3c chia s\u1EBB b\u1EDFi {owner}",
      "viewer.sharePath.unavailable": "Trang n\xE0y kh\xF4ng th\u1EC3 m\u1EDF t\u1EC7p trong workspace: chia s\u1EBB chuy\u1EC3n giao \u0111\u01B0\u1EDDng d\u1EABn t\u1EC7p, kh\xF4ng chuy\u1EC3n n\u1ED9i dung t\u1EC7p.",
      "viewer.status.connecting": "\u0110ang k\u1EBFt n\u1ED1i chia s\u1EBB\u2026",
      "viewer.status.expired": "Chia s\u1EBB n\xE0y \u0111\xE3 h\u1EBFt h\u1EA1n.",
      "viewer.status.expiredHint": "H\xE3y \u0111\u1EC1 ngh\u1ECB owner chia s\u1EBB l\u1EA1i phi\xEAn.",
      "viewer.status.invalid": "Li\xEAn k\u1EBFt n\xE0y kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c chia s\u1EBB \u0111\xF3 \u0111\xE3 b\u1ECB x\xF3a.",
      "viewer.status.invalidHint": "H\xE3y ki\u1EC3m tra li\xEAn k\u1EBFt c\xF3 \u0111\u1EA7y \u0111\u1EE7 kh\xF4ng, ho\u1EB7c xin owner li\xEAn k\u1EBFt m\u1EDBi.",
      "viewer.status.offline": "Owner hi\u1EC7n \u0111ang ngo\u1EA1i tuy\u1EBFn; trang n\xE0y s\u1EBD t\u1EF1 k\u1EBFt n\u1ED1i l\u1EA1i.",
      "viewer.status.offlineHint": "H\xE3y \u0111\u1EE3i m\u1ED9t ch\xFAt ho\u1EB7c ch\u1ECDn Th\u1EED l\u1EA1i; n\u1EBFu v\u1EABn ngo\u1EA1i tuy\u1EBFn, h\xE3y li\xEAn h\u1EC7 owner.",
      "viewer.status.reauthenticate": "Phi\xEAn \u0111\u0103ng nh\u1EADp c\u1EE7a b\u1EA1n \u0111\xE3 h\u1EBFt h\u1EA1n.",
      "viewer.status.stopped": "Owner \u0111\xE3 d\u1EEBng chia s\u1EBB n\xE0y.",
      "viewer.status.stoppedHint": "H\xE3y \u0111\u1EC1 ngh\u1ECB owner b\u1EADt l\u1EA1i n\u1EBFu b\u1EA1n v\u1EABn c\u1EA7n truy c\u1EADp.",
      "viewer.status.unavailable": "D\u1ECBch v\u1EE5 chia s\u1EBB hi\u1EC7n kh\xF4ng kh\u1EA3 d\u1EE5ng; \u0111ang th\u1EED l\u1EA1i.",
      "viewer.status.unavailableHint": "H\xE3y th\u1EED l\u1EA1i ngay sau; n\u1EBFu v\u1EABn kh\xF4ng kh\u1EA3 d\u1EE5ng, h\xE3y quay l\u1EA1i sau.",
      "viewer.title": "Phi\xEAn ch\u1EC9 \u0111\u1ECDc Liveshare",
      "viewer.transcriptLabel": "N\u1ED9i dung phi\xEAn (ch\u1EC9 \u0111\u1ECDc)",
      "viewer.unreachable": "liveshare: {subject} kh\xF4ng t\u1EDBi \u0111\u01B0\u1EE3c Relay, \u0111ang th\u1EED l\u1EA1i",
      "viewer.writeUnavailableNote": "Owner \u0111\xE3 c\u1EA5p quy\u1EC1n ghi, nh\u01B0ng hi\u1EC7n kh\xF4ng th\u1EC3 \u0111i\u1EC1u khi\u1EC3n phi\xEAn n\xE0y; b\u1EA1n c\xF3 th\u1EC3 g\u1EEDi khi phi\xEAn \u0111\u01B0\u1EE3c chu\u1EA9n b\u1ECB."
    },
    "messageQuotes": {
      "quote.add": "Tr\xEDch d\u1EABn v\u0103n b\u1EA3n"
    },
    "model": {
      "action.reload": "T\u1EA3i l\u1EA1i",
      "command.description": "Ch\u1ECDn model cho cu\u1ED9c tr\xF2 chuy\u1EC7n n\xE0y",
      "command.label": "Model",
      "effort.providerDefault": "M\u1EB7c \u0111\u1ECBnh",
      "empty.efforts": "Model n\xE0y kh\xF4ng cung c\u1EA5p m\u1EE9c suy lu\u1EADn n\xE0o.",
      "empty.models": "Kh\xF4ng c\xF3 model kh\u1EA3 d\u1EE5ng.",
      "error.action": "Thao t\xE1c model th\u1EA5t b\u1EA1i: {message}",
      "error.sessionInUse": "Phi\xEAn n\xE0y \u0111ang \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng, c\xF3 th\u1EC3 b\u1EDFi m\u1ED9t DSH instance kh\xE1c \u0111ang ch\u1EA1y (nh\u01B0 dsh web ho\u1EB7c \u1EE9ng d\u1EE5ng desktop). H\xE3y tho\xE1t c\xE1c DSH instance kh\xE1c r\u1ED3i th\u1EED l\u1EA1i.",
      "menu.aria": "Model v\xE0 m\u1EE9c suy lu\u1EADn",
      "menu.effort": "M\u1EE9c",
      "menu.model": "Model",
      "option.loadError": "T\u1EA3i danh m\u1EE5c th\u1EA5t b\u1EA1i: {message}",
      "provider.account": "T\xE0i kho\u1EA3n DeepSeek",
      "search.clear": "X\xF3a t\xECm ki\u1EBFm",
      "search.empty": "Kh\xF4ng c\xF3 model ph\xF9 h\u1EE3p.",
      "search.placeholder": "T\xECm model\u2026",
      "status.loading": "\u0110ang l\xE0m m\u1EDBi danh s\xE1ch model\u2026",
      "trigger.aria": "Ch\u1ECDn model, hi\u1EC7n t\u1EA1i {model}",
      "trigger.ariaEffort": "Ch\u1ECDn model, hi\u1EC7n t\u1EA1i {model}, m\u1EE9c suy lu\u1EADn {effort}",
      "trigger.fallback": "Ch\u1ECDn model",
      "trigger.loading": "\u0110ang t\u1EA3i model\u2026",
      "trigger.selectAria": "Ch\u1ECDn model",
      "warning.groupLoad": "T\u1EA3i {name} th\u1EA5t b\u1EA1i: {message}"
    },
    "open-in-app": {
      "app.androidstudio": "Android Studio",
      "app.cursor": "Cursor",
      "app.explorer": "File Explorer",
      "app.filemanager": "Files",
      "app.finder": "Finder",
      "app.fork": "Fork",
      "app.ghostty": "Ghostty",
      "app.gitbash": "Git Bash",
      "app.github": "GitHub Desktop",
      "app.gitkraken": "GitKraken",
      "app.gnometerminal": "GNOME Terminal",
      "app.goland": "GoLand",
      "app.intellij": "IntelliJ IDEA",
      "app.iterm": "iTerm2",
      "app.kitty": "kitty",
      "app.konsole": "Konsole",
      "app.phpstorm": "PhpStorm",
      "app.pycharm": "PyCharm",
      "app.rider": "Rider",
      "app.rustrover": "RustRover",
      "app.smartgit": "SmartGit",
      "app.sourcetree": "Sourcetree",
      "app.sublimemerge": "Sublime Merge",
      "app.sublimetext": "Sublime Text",
      "app.terminal": "Terminal",
      "app.tower": "Tower",
      "app.vscode": "VS Code",
      "app.vscodeinsiders": "VS Code Insiders",
      "app.warp": "Warp",
      "app.webstorm": "WebStorm",
      "app.windowsterminal": "Windows Terminal",
      "app.windsurf": "Windsurf",
      "app.xcode": "Xcode",
      "app.zed": "Zed",
      "menu.copied": "\u0110\xE3 sao ch\xE9p",
      "menu.copyDirectoryPath": "Sao ch\xE9p \u0111\u01B0\u1EDDng d\u1EABn th\u01B0 m\u1EE5c",
      "menu.copyFailed": "Kh\xF4ng th\u1EC3 sao ch\xE9p. H\xE3y ki\u1EC3m tra n\u1ED9i dung c\xF2n kh\u1EA3 d\u1EE5ng r\u1ED3i th\u1EED l\u1EA1i.",
      "menu.copyLink": "Sao ch\xE9p \u0111\u1ECBa ch\u1EC9 li\xEAn k\u1EBFt",
      "menu.copyPath": "Sao ch\xE9p \u0111\u01B0\u1EDDng d\u1EABn t\u1EC7p",
      "menu.defaultApp": "M\u1EDF b\u1EB1ng \u1EE9ng d\u1EE5ng m\u1EB7c \u0111\u1ECBnh",
      "menu.external": "M\u1EDF trong tr\xECnh duy\u1EC7t ngo\xE0i",
      "menu.finder": "Hi\u1EC7n trong Finder",
      "menu.openIn": "M\u1EDF b\u1EB1ng",
      "menu.openInFloat": "M\u1EDF trong b\u1EA3ng n\u1ED5i",
      "menu.openInSidebar": "M\u1EDF trong thanh b\xEAn",
      "menu.reveal": "Hi\u1EC7n trong th\u01B0 m\u1EE5c",
      "open.title": "M\u1EDF b\u1EB1ng {app}",
      "open.tooltip": "M\u1EDF c\u1EE5c b\u1ED9",
      "path.appDefault": "{app} (m\u1EB7c \u0111\u1ECBnh)",
      "path.appsError": "Kh\xF4ng th\u1EC3 t\u1EA3i \u1EE9ng d\u1EE5ng",
      "path.more": "C\xE1ch m\u1EDF kh\xE1c",
      "path.open": "M\u1EDF",
      "path.opened": "\u0110\xE3 m\u1EDF tr\xEAn thi\u1EBFt b\u1ECB kh\xE1c",
      "path.openError": "Kh\xF4ng th\u1EC3 m\u1EDF. H\xE3y th\u1EED l\u1EA1i.",
      "path.reveal": "Hi\u1EC7n v\u1ECB tr\xED t\u1EC7p",
      "path.revealed": "\u0110\xE3 hi\u1EC7n v\u1ECB tr\xED t\u1EC7p tr\xEAn thi\u1EBFt b\u1ECB kh\xE1c",
      "path.revealError": "Kh\xF4ng th\u1EC3 hi\u1EC7n v\u1ECB tr\xED t\u1EC7p. H\xE3y th\u1EED l\u1EA1i.",
      "shortcut.busy": "\u0110ang m\u1EDF workspace",
      "shortcut.unavailable": "Workspace hi\u1EC7n t\u1EA1i ho\u1EB7c \u1EE9ng d\u1EE5ng c\u1EE5c b\u1ED9 kh\xF4ng kh\u1EA3 d\u1EE5ng"
    },
    "permission.access": {
      "auto.badge": "EXP",
      "auto.confirm.acknowledge": "T\xF4i hi\u1EC3u nh\u1EEFng r\u1EE7i ro n\xE0y v\xE0 mu\u1ED1n ti\u1EBFp t\u1EE5c",
      "auto.confirm.description": "T\u1EF1 \u0111\u1ED9ng duy\u1EC7t ch\u1EA1y kh\xF4ng c\xF3 sandbox. Tr\u01B0\u1EDBc m\u1ED7i l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 g\u1ED1c v\xE0 l\u1EC7nh g\u1ECDi PTC b\xEAn trong, c\xF9ng m\xF4 h\xECnh v\u1EDBi agent hi\u1EC7n t\u1EA1i s\u1EBD \u0111\xE1nh gi\xE1 xem c\xF3 cho ph\xE9p hay kh\xF4ng; b\u1EA1n ph\xEA duy\u1EC7t ho\u1EB7c t\u1EEB ch\u1ED1i t\u1EEBng l\u1EC7nh g\u1ECDi b\u1ECB t\u1EEB ch\u1ED1i. T\xEDnh n\u0103ng n\xE0y \u0111ang th\u1EED nghi\u1EC7m, c\xF3 th\u1EC3 cho ph\xE9p ho\u1EB7c t\u1EEB ch\u1ED1i nh\u1EA7m v\xE0 d\xF9ng th\xEAm token.",
      "auto.confirm.enable": "B\u1EADt t\u1EF1 \u0111\u1ED9ng duy\u1EC7t",
      "auto.confirm.title": "B\u1EADt t\u1EF1 \u0111\u1ED9ng duy\u1EC7t (th\u1EED nghi\u1EC7m)?",
      "auto.description": "Ch\u1EA1y kh\xF4ng c\xF3 sandbox sau khi m\xF4 h\xECnh hi\u1EC7n t\u1EA1i t\u1EF1 \u0111\xE1nh gi\xE1 th\u1EED nghi\u1EC7m m\u1ECDi l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 g\u1ED1c v\xE0 l\u1EC7nh g\u1ECDi PTC b\xEAn trong.",
      "auto.label": "T\u1EF1 \u0111\u1ED9ng duy\u1EC7t",
      "close": "\u0110\xF3ng",
      "confirm.acknowledge": "T\xF4i hi\u1EC3u r\u1EE7i ro v\xE0 mu\u1ED1n ti\u1EBFp t\u1EE5c",
      "confirm.cancel": "H\u1EE7y",
      "confirm.description": "To\xE0n quy\u1EC1n truy c\u1EADp gi\u1EA3m c\xE1c b\u01B0\u1EDBc x\xE1c nh\u1EADn v\xE0 cho ph\xE9p agent th\u1EF1c hi\u1EC7n nhi\u1EC1u thao t\xE1c tr\u1EF1c ti\u1EBFp h\u01A1n, bao g\u1ED3m thao t\xE1c nh\u1EA1y c\u1EA3m, thay \u0111\u1ED5i t\u1EC7p ho\u1EB7c l\u1EC7nh b\xEAn ngo\xE0i. Ch\u1EC9 d\xF9ng khi b\u1EA1n tin t\u01B0\u1EDFng t\xE1c v\u1EE5 hi\u1EC7n t\u1EA1i.",
      "confirm.enable": "B\u1EADt to\xE0n quy\u1EC1n truy c\u1EADp",
      "confirm.title": "B\u1EADt to\xE0n quy\u1EC1n truy c\u1EADp?",
      "mode": "Ch\u1EBF \u0111\u1ED9 truy c\u1EADp, hi\u1EC7n t\u1EA1i: {name}",
      "preset.fullAccess": "To\xE0n quy\u1EC1n truy c\u1EADp",
      "preset.readOnly": "Ch\u1EC9 \u0111\u1ECDc",
      "preset.workspaceWrite": "Ghi trong workspace"
    },
    "plan": {
      "chip.exitFailed": "Kh\xF4ng th\u1EC3 tho\xE1t ch\u1EBF \u0111\u1ED9 k\u1EBF ho\u1EA1ch",
      "chip.label": "K\u1EBF ho\u1EA1ch",
      "chip.on.aria": "Ch\u1EBF \u0111\u1ED9 k\u1EBF ho\u1EA1ch \u0111ang b\u1EADt, nh\u1EA5n \u0111\u1EC3 t\u1EAFt",
      "chip.on.title": "Ch\u1EBF \u0111\u1ED9 k\u1EBF ho\u1EA1ch \u0111ang b\u1EADt \u2014 nh\u1EA5p \u0111\u1EC3 t\u1EAFt (/plan off)",
      "preview.action": "M\u1EDF",
      "preview.document": "K\u1EBF ho\u1EA1ch \xB7 Markdown",
      "preview.expired": "B\u1EA3n xem tr\u01B0\u1EDBc k\u1EBF ho\u1EA1ch t\u1EA1m th\u1EDDi n\xE0y \u0111\xE3 h\u1EBFt h\u1EA1n. H\xE3y m\u1EDF l\u1EA1i t\u1EEB th\u1EBB \u0111\xE1nh gi\xE1 \u0111ang ch\u1EDD.",
      "preview.failed": "Kh\xF4ng th\u1EC3 t\u1EA3i k\u1EBF ho\u1EA1ch",
      "preview.full": "Xem to\xE0n b\u1ED9 k\u1EBF ho\u1EA1ch",
      "preview.invalidAddress": "\u0110\u1ECBa ch\u1EC9 k\u1EBF ho\u1EA1ch kh\xF4ng h\u1EE3p l\u1EC7",
      "preview.loading": "\u0110ang t\u1EA3i k\u1EBF ho\u1EA1ch\u2026",
      "preview.notFound": "Kh\xF4ng t\xECm th\u1EA5y k\u1EBF ho\u1EA1ch n\xE0y",
      "preview.open": "M\u1EDF k\u1EBF ho\u1EA1ch trong thanh b\xEAn",
      "preview.openNamed": "M\u1EDF k\u1EBF ho\u1EA1ch: {title}",
      "preview.title": "K\u1EBF ho\u1EA1ch",
      "preview.unavailable": "Kh\xF4ng th\u1EC3 xem tr\u01B0\u1EDBc k\u1EBF ho\u1EA1ch"
    },
    "pluginManager": {
      "addPlugin": "Th\xEAm plugin",
      "applyingChange": "\u0110ang \xE1p d\u1EE5ng thay \u0111\u1ED5i cho {name}",
      "backToList": "Quay l\u1EA1i danh s\xE1ch plugin",
      "backToPackage": "Quay l\u1EA1i {name}",
      "basicTitle": "C\xE0i \u0111\u1EB7t plugin t\xEDch h\u1EE3p",
      "bundlesTitle": "Plugin \u0111\xE3 c\xE0i",
      "cancel": "H\u1EE7y",
      "chooseAddMethod": "Ch\u1ECDn c\xE1ch th\xEAm plugin",
      "close": "\u0110\xF3ng",
      "configureRow": "C\u1EA5u h\xECnh {name}",
      "confirmUninstall": "G\u1EE1 c\xE0i \u0111\u1EB7t",
      "confirmUninstallDescription": "Nh\u1EEFng g\xEC n\xF3 cung c\u1EA5p s\u1EBD bi\u1EBFn m\u1EA5t sau khi g\u1EE1 c\xE0i \u0111\u1EB7t.",
      "confirmUninstallTitle": 'G\u1EE1 c\xE0i \u0111\u1EB7t "{name}"?',
      "crumbRoot": "Plugin",
      "detailFailed": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc chi ti\u1EBFt.",
      "detailFootnotes": "Ch\xFA th\xEDch",
      "detailInvalid": "Plugin khai b\xE1o t\u1EC7p chi ti\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.",
      "detailLoading": "\u0110ang \u0111\u1ECDc chi ti\u1EBFt",
      "detailNetwork": "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i t\u1EDBi ngu\u1ED3n chi ti\u1EBFt.",
      "detailTitle": "Chi ti\u1EBFt",
      "detailTooLarge": "Chi ti\u1EBFt v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n k\xEDch th\u01B0\u1EDBc v\xE0 kh\xF4ng \u0111\u01B0\u1EE3c t\u1EA3i.",
      "empty": "Ch\u01B0a c\xF3 plugin n\xE0o \u0111\u01B0\u1EE3c c\xE0i \u0111\u1EB7t.",
      "enableToggle": "B\u1EADt {name}",
      "error": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc t\u1EA5t c\u1EA3 plugin, c\xF3 th\u1EC3 do s\u1EF1 c\u1ED1 m\u1EA1ng",
      "extensionsTitle": "Plugin th\u1EED nghi\u1EC7m",
      "failedDisable": "Kh\xF4ng th\u1EC3 t\u1EAFt: {reason}",
      "failedEnable": "Kh\xF4ng th\u1EC3 b\u1EADt: {reason}",
      "failedRowDisable": "Kh\xF4ng th\u1EC3 t\u1EAFt th\xE0nh ph\u1EA7n: {reason}",
      "failedRowEnable": "Kh\xF4ng th\u1EC3 b\u1EADt th\xE0nh ph\u1EA7n: {reason}",
      "failedUninstall": "Kh\xF4ng th\u1EC3 g\u1EE1 c\xE0i \u0111\u1EB7t: {reason}",
      "infoDescription": "C\u1EA5u h\xECnh plugin ch\xEDnh th\u1EE9c v\xE0 c\xE0i \u0111\u1EB7t ho\u1EB7c qu\u1EA3n l\xFD plugin kh\xE1c t\u1EA1i \u0111\xE2y. Xem danh s\xE1ch plugin t\xEDch h\u1EE3p v\xE0 tr\u1EA1ng th\xE1i runtime trong C\xE0i \u0111\u1EB7t \u2192 Plugin t\xEDch h\u1EE3p.",
      "infoLabel": "Gi\u1EDBi thi\u1EC7u v\u1EC1 plugin",
      "installApplying": "\u0110ang \xE1p d\u1EE5ng c\u1EA5u h\xECnh, vui l\xF2ng ch\u1EDD\u2026",
      "installApplyingCancellationError": "Ch\u01B0a x\xE1c nh\u1EADn h\u1EE7y. C\xE0i \u0111\u1EB7t \u0111ang \u0111\u01B0\u1EE3c \xE1p d\u1EE5ng; h\xE3y ch\u1EDD k\u1EBFt qu\u1EA3. {reason}",
      "installApprovalCaution": "Ch\u1EC9 cho ph\xE9p c\xE1c g\xF3i b\u1EA1n tin t\u01B0\u1EDFng.",
      "installApprovalConsequence": "Sau khi cho ph\xE9p, script s\u1EBD ch\u1EA1y \u1EDF \u0111\xE2y v\u1EDBi quy\u1EC1n c\u1EE7a b\u1EA1n, v\xE0 quy\u1EC1n n\xE0y \u0111\u01B0\u1EE3c l\u01B0u trong profile n\xE0y.",
      "installApprovalDescription": "C\xE1c g\xF3i n\xE0y c\xF3 script c\xE0i \u0111\u1EB7t m\xE0 pnpm kh\xF4ng ch\u1EA1y.",
      "installApprovalTitle": "Script c\xE0i \u0111\u1EB7t c\u1EA7n quy\u1EC1n",
      "installApproveAndRetry": "Cho ph\xE9p c\xE1c script n\xE0y v\xE0 th\u1EED l\u1EA1i",
      "installAttempt": "{previous} kh\xF4ng th\u1EC3 ph\u1EE5c v\u1EE5 g\xF3i; \u0111ang th\u1EED l\u1EA1i qua {registry} (registry {index} c\u1EE7a {total})",
      "installAttemptBadge": "L\u1EA7n th\u1EED {index} \xB7 {registry}",
      "installAwaitingAcceptance": "\u0110ang ch\u1EDD Host ch\u1EA5p nh\u1EADn c\xE0i \u0111\u1EB7t. Vi\u1EC7c h\u1EE7y s\u1EBD t\u1EF1 th\u1EED l\u1EA1i sau khi x\xE1c nh\u1EADn.",
      "installBackgroundApplying": "C\xE0i \u0111\u1EB7t \u0111ang \u0111\u01B0\u1EE3c \xE1p d\u1EE5ng v\xE0 kh\xF4ng th\u1EC3 h\u1EE7y. Xem ti\u1EBFn tr\xECnh c\xE0i \u0111\u1EB7t.",
      "installBackgroundDone": "C\xE0i \u0111\u1EB7t \u0111\xE3 xong. Xem chi ti\u1EBFt c\xE0i \u0111\u1EB7t.",
      "installBackgroundFailed": "C\xE0i \u0111\u1EB7t th\u1EA5t b\u1EA1i. Xem chi ti\u1EBFt c\xE0i \u0111\u1EB7t.",
      "installBackgroundUnconfirmed": "Tr\u1EA1ng th\xE1i c\xE0i \u0111\u1EB7t ch\u01B0a \u0111\u01B0\u1EE3c x\xE1c nh\u1EADn. Xem chi ti\u1EBFt c\xE0i \u0111\u1EB7t.",
      "installBackgroundUnknown": "Kh\xF4ng c\xF3 k\u1EBFt qu\u1EA3 c\xE0i \u0111\u1EB7t. H\xE3y ki\u1EC3m tra danh s\xE1ch plugin.",
      "installBundledDescription": "B\u1EADt n\xF3 m\xE0 kh\xF4ng c\u1EA7n t\u1EA3i th\xEAm b\u1EA3n sao",
      "installBundledTitle": "Plugin n\xE0y \u0111i k\xE8m DSH",
      "installCancel": "H\u1EE7y c\xE0i \u0111\u1EB7t",
      "installCancelAndEdit": "H\u1EE7y c\xE0i \u0111\u1EB7t v\xE0 quay l\u1EA1i ch\u1EC9nh s\u1EEDa",
      "installCancelled": "\u0110\xE3 h\u1EE7y c\xE0i \u0111\u1EB7t; plugin ch\u01B0a \u0111\u01B0\u1EE3c b\u1EADt, v\xE0 c\xE1c t\u1EC7p \u0111\xE3 t\u1EA3i c\xF3 th\u1EC3 c\xF2n l\u1EA1i",
      "installCancelledShort": "\u0110\xE3 h\u1EE7y",
      "installCancelling": "\u0110ang d\u1EEBng c\xE0i \u0111\u1EB7t\u2026",
      "installCancelUnconfirmed": "Ch\u01B0a x\xE1c nh\u1EADn c\xE0i \u0111\u1EB7t \u0111\xE3 d\u1EEBng. H\xE3y th\u1EED h\u1EE7y l\u1EA1i ho\u1EB7c ch\u1EDD k\u1EBFt qu\u1EA3 c\xE0i \u0111\u1EB7t. {reason}",
      "installChangeRegistry": "\u0110\u1ED5i registry",
      "installChecking": "\u0110ang ki\u1EC3m tra\u2026",
      "installClose": "Xong",
      "installCloseCancels": "H\u1EE7y c\xE0i \u0111\u1EB7t v\xE0 \u0111\xF3ng",
      "installConfirmedRefused": "Kh\xF4ng th\u1EC3 c\xE0i \u0111\u1EB7t plugin n\xE0y",
      "installConfirmedTitle": "C\xE0i \u0111\u1EB7t plugin",
      "installDescription": "Nh\u1EADp t\xEAn g\xF3i, \u0111\u1ECBa ch\u1EC9 kho GitHub ho\u1EB7c \u0111\u01B0\u1EDDng d\u1EABn th\u01B0 m\u1EE5c c\u1EE5c b\u1ED9 c\u1EE7a plugin.",
      "installDetailsHide": "\u1EA8n chi ti\u1EBFt c\xE0i \u0111\u1EB7t",
      "installDetailsNoOutput": "Kh\xF4ng c\xF3 \u0111\u1EA7u ra terminal n\xE0o t\u1EEB l\u1EA7n c\xE0i n\xE0y \u0111\u1EBFn ph\u1EA7n chi ti\u1EBFt",
      "installDetailsShow": "Hi\u1EC7n chi ti\u1EBFt c\xE0i \u0111\u1EB7t",
      "installDoneApproved": "\u0110\xE3 cho ph\xE9p script c\xE0i \u0111\u1EB7t cho {names}",
      "installDoneNothing": "C\xE0i \u0111\u1EB7t xong kh\xF4ng c\xF3 ph\u1EE5 thu\u1ED9c m\u1EDBi.",
      "installDoneOtherVersion": "Theo ch\xEDnh s\xE1ch b\u1EA3o m\u1EADt chu\u1ED7i cung \u1EE9ng c\u1EE7a pnpm (minimumReleaseAge), c\xE1c phi\xEAn b\u1EA3n \u0111\u01B0\u1EE3c ph\xE1t h\xE0nh g\u1EA7n \u0111\xE2y h\u01A1n \u0111\u1ED9 tu\u1ED5i y\xEAu c\u1EA7u kh\xF4ng \u0111\u01B0\u1EE3c c\xE0i t\u1EF1 \u0111\u1ED9ng, n\xEAn l\u1EA7n c\xE0i n\xE0y \u0111\xE3 d\xF9ng {installed} thay v\xEC phi\xEAn b\u1EA3n m\u1EDBi nh\u1EA5t {version}. Phi\xEAn b\u1EA3n m\u1EDBi ph\xE1t h\xE0nh ch\u01B0a ho\xE0n th\xE0nh th\u1EDDi gian ch\u1EDD n\xE0y v\xE0 c\xF3 th\u1EC3 ch\u1EE9a m\xE3 \u0111\u1ED9c ho\u1EB7c l\u1ED7i ch\u01B0a \u0111\u01B0\u1EE3c ph\xE1t hi\u1EC7n. N\u1EBFu b\u1EA1n c\u1EA7n {version}, h\xE3y g\u1EE1 phi\xEAn b\u1EA3n hi\u1EC7n t\u1EA1i r\u1ED3i c\xE0i {exact} \u0111\u1EC3 y\xEAu c\u1EA7u phi\xEAn b\u1EA3n \u0111\xF3.",
      "installDoneRestart": "\u0110\xE3 c\xE0i \u0111\u1EB7t; kh\u1EDFi \u0111\u1ED9ng l\u1EA1i DSH \u0111\u1EC3 t\u1EA3i n\xF3. {reason}",
      "installEdit": "S\u1EEDa",
      "installEditAria": "Quay l\u1EA1i ch\u1EC9nh s\u1EEDa",
      "installedTab": "\u0110\xE3 c\xE0i",
      "installedTitle": "\u0110\xE3 c\xE0i \u0111\u1EB7t",
      "installEnableNow": "B\u1EADt ngay",
      "installExisting": "C\xE0i \u0111\u1EB7t plugin b\xEAn th\u1EE9 ba",
      "installExistingDescription": "H\u1ED7 tr\u1EE3 g\xF3i npm, kho Git v\xE0 th\u01B0 m\u1EE5c c\u1EE5c b\u1ED9",
      "installFailedEnabling": "C\xE0i \u0111\u1EB7t \u0111\xE3 xong; b\u1EADt plugin l\xE0 b\u01B0\u1EDBc th\u1EA5t b\u1EA1i",
      "installFailedTitle": "Kh\xF4ng th\u1EC3 c\xE0i \u0111\u1EB7t plugin",
      "installFailureBuildBlocked": "Script c\xE0i \u0111\u1EB7t c\u1EE7a m\u1ED9t ph\u1EE5 thu\u1ED9c c\u1EA7n quy\u1EC1n c\u1EE7a b\u1EA1n tr\u01B0\u1EDBc khi c\xF3 th\u1EC3 ti\u1EBFp t\u1EE5c",
      "installFailureBuildBlockedManual": "pnpm \u0111\xE3 ch\u1EB7n script c\xE0i \u0111\u1EB7t; h\xE3y cho ph\xE9p ch\xFAng trong allowBuilds trong pnpm-workspace.yaml v\xE0 th\u1EED l\u1EA1i",
      "installFailureDiskFull": "\u0110\u0129a \u0111\xE3 \u0111\u1EA7y; c\xE0i \u0111\u1EB7t \u0111\xE3 d\u1EEBng",
      "installFailureGeneric": "L\u1EC7nh c\xE0i \u0111\u1EB7t th\u1EA5t b\u1EA1i; chi ti\u1EBFt cho bi\u1EBFt l\xFD do",
      "installFailureIntegrity": "G\xF3i \u0111\xE3 t\u1EA3i kh\xF4ng v\u01B0\u1EE3t qua ki\u1EC3m tra t\xEDnh to\xE0n v\u1EB9n",
      "installFailureNetwork": "K\u1EBFt n\u1ED1i m\u1EA1ng th\u1EA5t b\u1EA1i",
      "installFailureNetworkAll": "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i t\u1EDBi registry n\xE0o (\u0111\xE3 th\u1EED: {registries}). H\xE3y ki\u1EC3m tra m\u1EA1ng ho\u1EB7c c\xE0i \u0111\u1EB7t proxy, ho\u1EB7c \u0111\u1ED5i registry r\u1ED3i th\u1EED l\u1EA1i.",
      "installFailureNetworkHost": "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i t\u1EDBi {host}. \u0110\u1ECBa ch\u1EC9 GitHub ho\u1EB7c li\xEAn k\u1EBFt .tgz kh\xF4ng \u0111\u01B0\u1EE3c t\u1EA3i qua registry: m\xE1y n\xE0y ph\u1EA3i truy c\u1EADp tr\u1EF1c ti\u1EBFp ho\u1EB7c qua proxy. N\u1EBFu plugin c\u0169ng \u0111\u01B0\u1EE3c ph\xE1t h\xE0nh tr\xEAn npm, h\xE3y nh\u1EADp t\xEAn g\xF3i c\u1EE7a n\xF3.",
      "installFailureNoMatchingVersion": "Kh\xF4ng c\xF3 phi\xEAn b\u1EA3n n\xE0o kh\u1EDBp y\xEAu c\u1EA7u",
      "installFailureNotFound": "Kh\xF4ng t\xECm th\u1EA5y plugin nh\u01B0 v\u1EADy",
      "installFailurePermission": "Kh\xF4ng c\xF3 quy\u1EC1n ghi; kh\xF4ng th\u1EC3 c\xE0i \u0111\u1EB7t plugin",
      "installFailurePnpmMissing": "Kh\xF4ng t\xECm th\u1EA5y pnpm, n\xEAn kh\xF4ng th\u1EC3 c\xE0i \u0111\u1EB7t g\xEC",
      "installFailureTimeout": "C\xE0i \u0111\u1EB7t qu\xE1 th\u1EDDi gian ch\u1EDD",
      "installGithubFailedDescription": "H\xE3y th\u1EED ngu\u1ED3n c\xE0i \u0111\u1EB7t kh\xE1c.",
      "installGithubFailedTitle": "Kh\xF4ng th\u1EC3 truy c\u1EADp GitHub",
      "installGithubTimeoutTitle": "K\u1EBFt n\u1ED1i GitHub qu\xE1 th\u1EDDi gian ch\u1EDD",
      "installGitTemplateHint": "Thay b\u1EB1ng \u0111\u1ECBa ch\u1EC9 kho Git th\u1EF1c t\u1EBF.",
      "installGuideExampleLabel": "V\xED d\u1EE5: ",
      "installGuideFill": "D\xF9ng v\xED d\u1EE5",
      "installGuideFillAria": "D\xF9ng v\xED d\u1EE5 {example}",
      "installGuideHide": "\u1EA8n h\u01B0\u1EDBng d\u1EABn",
      "installGuideIdExample": "dsh-plugin-whale-pet",
      "installGuideIdHint": "T\xEAn g\xF3i plugin l\xE0 t\xEAn g\xF3i npm (nh\u01B0 dsh-xxx ho\u1EB7c @author/plugin): ph\u1EA7n sau dsh plugin add ho\u1EB7c pnpm add trong l\u1EC7nh c\xE0i \u0111\u1EB7t \u1EDF README c\u1EE7a plugin c\u1ED9ng \u0111\u1ED3ng.",
      "installGuideIdTitle": "Nh\u1EADp t\xEAn g\xF3i npm c\u1EE7a plugin",
      "installGuideSafety": "Ch\u1EC9 c\xE0i plugin b\u1EA1n tin t\u01B0\u1EDFng: ch\xFAng ch\u1EA1y v\u1EDBi quy\u1EC1n c\u1EE7a b\u1EA1n v\xE0 c\xF3 th\u1EC3 l\xE0m h\u1ECFng DeepSeek Harness ho\u1EB7c r\xF2 r\u1EC9 d\u1EEF li\u1EC7u.",
      "installGuideToggle": "H\u01B0\u1EDBng d\u1EABn c\xE0i \u0111\u1EB7t v\xE0 v\xED d\u1EE5",
      "installingTitle": "\u0110ang c\xE0i \u0111\u1EB7t plugin\u2026",
      "installLocation": "C\xE0i v\xE0o {dir}",
      "installLogPath": "Nh\u1EADt k\xFD \u0111\u1EA7y \u0111\u1EE7: {path}",
      "installPackageLabel": "T\xEAn g\xF3i plugin",
      "installPathTemplateHint": "Thay b\u1EB1ng \u0111\u01B0\u1EDDng d\u1EABn th\u1EF1c t\u1EBF t\u1EDBi th\u01B0 m\u1EE5c plugin c\u1EE5c b\u1ED9 c\u1EE7a b\u1EA1n.",
      "installProblemInstalled": "Plugin n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c c\xE0i \u0111\u1EB7t. \u0110\u1EC3 n\xE2ng c\u1EA5p, h\xE3y g\u1EE1 c\xE0i \u0111\u1EB7t r\u1ED3i c\xE0i l\u1EA1i",
      "installProblemInvalid": "\u0110\xE2y kh\xF4ng ph\u1EA3i t\xEAn g\xF3i ho\u1EB7c \u0111\u1ECBa ch\u1EC9 c\xF3 th\u1EC3 c\xE0i \u0111\u1EB7t: {reason}",
      "installProblemNetwork": "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i t\u1EDBi registry plugin; h\xE3y ki\u1EC3m tra m\u1EA1ng v\xE0 th\u1EED l\u1EA1i",
      "installProblemNetworkAll": "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i t\u1EDBi registry n\xE0o (\u0111\xE3 th\u1EED: {registries}); h\xE3y ki\u1EC3m tra m\u1EA1ng ho\u1EB7c c\xE0i \u0111\u1EB7t proxy, ho\u1EB7c \u0111\u1ED5i registry",
      "installProblemNotBundle": "G\xF3i n\xE0y kh\xF4ng khai b\xE1o bundle, n\xEAn kh\xF4ng th\u1EC3 c\xE0i nh\u01B0 plugin: {reason}",
      "installProblemNotFound": "Kh\xF4ng t\xECm th\u1EA5y plugin nh\u01B0 v\u1EADy",
      "installProblemNotPackage": "\u0110\u01B0\u1EDDng d\u1EABn kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c kh\xF4ng ph\u1EA3i g\xF3i plugin h\u1EE3p l\u1EC7",
      "installProblemShipped": "Plugin n\xE0y \u0111i k\xE8m DSH; n\xE2ng c\u1EA5p DSH s\u1EBD c\u1EADp nh\u1EADt n\xF3",
      "installProblemUnknown": "Kh\xF4ng th\u1EC3 tra c\u1EE9u plugin: {reason}",
      "installReconcile": "Ki\u1EC3m tra tr\u1EA1ng th\xE1i c\xE0i \u0111\u1EB7t",
      "installResultUnconfirmed": "Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c k\u1EBFt qu\u1EA3 c\xE0i \u0111\u1EB7t. H\xE3y ki\u1EC3m tra tr\u1EA1ng th\xE1i c\xE0i \u0111\u1EB7t. {reason}",
      "installRetry": "Th\u1EED l\u1EA1i",
      "installRun": "C\xE0i \u0111\u1EB7t",
      "installSpecLabel": "T\xEAn g\xF3i ho\u1EB7c \u0111\u1ECBa ch\u1EC9",
      "installSpecPlaceholder": "v\xED d\u1EE5 dsh-plugin-whale-pet",
      "installStarting": "\u0110ang chu\u1EA9n b\u1ECB c\xE0i \u0111\u1EB7t\u2026",
      "installSubjectGit": "Kho Git",
      "installSubjectPath": "Th\u01B0 m\u1EE5c c\u1EE5c b\u1ED9",
      "installSubjectTarball": "T\u1EC7p tarball",
      "installTitle": "Th\xEAm plugin",
      "installTryAnotherWay": "Th\u1EED c\xE1ch kh\xE1c",
      "installUnconfirmedTitle": "Ch\u01B0a x\xE1c nh\u1EADn tr\u1EA1ng th\xE1i c\xE0i \u0111\u1EB7t",
      "installUnknownDescription": "Host kh\xF4ng c\xF3 phi\xEAn c\xE0i \u0111\u1EB7t n\xE0o \u0111ang ho\u1EA1t \u0111\u1ED9ng v\u1EDBi id y\xEAu c\u1EA7u n\xE0y. H\xE3y ki\u1EC3m tra danh s\xE1ch plugin tr\u01B0\u1EDBc khi th\u1EED l\u1EA1i.",
      "installUnknownTitle": "Kh\xF4ng c\xF3 k\u1EBFt qu\u1EA3 c\xE0i \u0111\u1EB7t",
      "installUpgradeNotice": "Plugin ch\xEDnh th\u1EE9c theo y\xEAu c\u1EA7u c\xF3 n\xFAt C\u1EADp nh\u1EADt khi phi\xEAn b\u1EA3n kh\xE1c DSH. \u0110\u1EC3 c\u1EADp nh\u1EADt plugin kh\xE1c, h\xE3y g\u1EE1 c\xE0i \u0111\u1EB7t r\u1ED3i c\xE0i l\u1EA1i.",
      "installUseGithubMirror": "D\xF9ng g\u01B0\u01A1ng Trung Qu\u1ED1c \u0111\u1EA1i l\u1EE5c",
      "installVersion": "Phi\xEAn b\u1EA3n {version}",
      "installViewTask": "Xem c\xE0i \u0111\u1EB7t",
      "intro": "C\xE0i \u0111\u1EB7t, b\u1EADt v\xE0 c\u1EA5u h\xECnh plugin",
      "loading": "\u0110ang \u0111\u1ECDc plugin\u2026",
      "metadataError": "L\u1ED7i si\xEAu d\u1EEF li\u1EC7u g\xF3i: {error}",
      "moreAction": "Th\xEAm",
      "moreTitle": "Plugin th\u1EED nghi\u1EC7m",
      "openDetail": "Xem {name}",
      "overriddenNotice": "{name} \u0111\xE3 \u0111\u01B0\u1EE3c l\u01B0u, nh\u01B0ng c\u1EA5u h\xECnh c\xF3 \u0111\u1ED9 \u01B0u ti\xEAn cao h\u01A1n ghi \u0111\xE8 n\xF3, n\xEAn n\xF3 kh\xF4ng c\xF3 hi\u1EC7u l\u1EF1c",
      "panel": "Plugin",
      "partOff": "T\u1EAFt",
      "partsCountFailed": "{count} th\u1EA5t b\u1EA1i",
      "partsCountOff": "{count} t\u1EAFt",
      "partsCountRunning": "{count} \u0111ang ch\u1EA1y",
      "partsCountTotal": "T\u1ED5ng {count}",
      "partsEmpty": "G\xF3i plugin n\xE0y kh\xF4ng ch\u1EE9a th\xE0nh ph\u1EA7n n\xE0o.",
      "partsFilter": "L\u1ECDc th\xE0nh ph\u1EA7n",
      "partsFilterEmpty": "Kh\xF4ng c\xF3 th\xE0nh ph\u1EA7n n\xE0o kh\u1EDBp.",
      "partsLabel": "Th\xE0nh ph\u1EA7n",
      "partToggle": "B\u1EADt th\xE0nh ph\u1EA7n {name}",
      "reasonAlreadyInstalled": "G\xF3i n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c c\xE0i \u0111\u1EB7t; h\xE3y g\u1EE1 c\xE0i \u0111\u1EB7t tr\u01B0\u1EDBc khi c\xE0i phi\xEAn b\u1EA3n kh\xE1c.",
      "reasonAmbiguousInstall": "Kh\xF4ng th\u1EC3 x\xE1c \u0111\u1ECBnh g\xF3i n\xE0o \u0111\xE3 \u0111\u01B0\u1EE3c c\xE0i t\u1EEB thay \u0111\u1ED5i ph\u1EE5 thu\u1ED9c.",
      "reasonBundleInUse": "C\u1EA5u h\xECnh kh\xE1c v\u1EABn d\xF9ng c\xE1c th\xE0nh ph\u1EA7n c\u1EE7a bundle n\xE0y; h\xE3y t\u1EAFt ch\xFAng tr\u01B0\u1EDBc.",
      "reasonIncompatibleInstall": "H\xE3y c\xE0i phi\xEAn b\u1EA3n plugin t\u01B0\u01A1ng th\xEDch v\u1EDBi DSH n\xE0y.",
      "reasonIncompatibleInstalled": "H\xE3y g\u1EE1 c\xE0i \u0111\u1EB7t v\xE0 c\xE0i phi\xEAn b\u1EA3n t\u01B0\u01A1ng th\xEDch v\u1EDBi DSH n\xE0y.",
      "reasonIncompatibleVersion": "{plugin} kh\xF4ng t\u01B0\u01A1ng th\xEDch v\u1EDBi DSH {runtime} (y\xEAu c\u1EA7u {requirements}); ch\u1EA1y n\xF3 c\xF3 th\u1EC3 g\xE2y s\u1EADp ho\u1EB7c m\u1EA5t d\u1EEF li\u1EC7u.",
      "reasonIncompatibleVersionUnnamed": "Plugin n\xE0y kh\xF4ng t\u01B0\u01A1ng th\xEDch v\u1EDBi phi\xEAn b\u1EA3n DSH \u0111ang ch\u1EA1y; ch\u1EA1y n\xF3 c\xF3 th\u1EC3 g\xE2y s\u1EADp ho\u1EB7c m\u1EA5t d\u1EEF li\u1EC7u.",
      "reasonInvalidSpec": "Nh\u1EADp t\xEAn g\xF3i ho\u1EB7c \u0111\u1ECBa ch\u1EC9 h\u1EE3p l\u1EC7.",
      "reasonLabel": "L\xFD do",
      "reasonManagementRequired": "Qu\u1EA3n l\xFD plugin c\u1EA7n \u0111\u1EBFn n\xF3; kh\xF4ng th\u1EC3 t\u1EAFt ho\u1EB7c g\u1EE1 c\xE0i \u0111\u1EB7t.",
      "reasonNotBundle": "G\xF3i n\xE0y kh\xF4ng khai b\xE1o bundle, n\xEAn kh\xF4ng th\u1EC3 qu\u1EA3n l\xFD nh\u01B0 plugin.",
      "reasonNotRemovable": "G\xF3i n\xE0y kh\xF4ng thu\u1ED9c s\u1EDF h\u1EEFu c\u1EE7a profile, ho\u1EB7c qu\u1EA3n l\xFD plugin c\u1EA7n \u0111\u1EBFn n\xF3.",
      "reasonOperationError": "Host b\xE1o l\u1ED7i.",
      "reasonStaleApproval": "C\xE1c ph\xEA duy\u1EC7t script \u0111ang ch\u1EDD \u0111\xE3 thay \u0111\u1ED5i; h\xE3y c\xE0i l\u1EA1i \u0111\u1EC3 l\xE0m m\u1EDBi ch\xFAng.",
      "reasonStopProfile": "Profile n\xE0y ch\u1EA1y kh\xF4ng c\xF3 HMR; h\xE3y d\u1EEBng n\xF3 v\xE0 g\u1EE1 g\xF3i b\u1EB1ng dsh plugin.",
      "reasonUnaddressable": "B\u1EA3n v\xE1 profile kh\xF4ng th\u1EC3 nh\u1EAFm t\u1EDBi n\xF3 m\u1ED9t c\xE1ch duy nh\u1EA5t.",
      "reasonUnexpectedPackage": "Ngu\u1ED3n plugin \u0111\xE3 c\xE0i g\xF3i ho\u1EB7c phi\xEAn b\u1EA3n kh\xE1c v\u1EDBi y\xEAu c\u1EA7u; c\xE0i \u0111\u1EB7t \u0111\xE3 \u0111\u01B0\u1EE3c ho\xE0n t\xE1c. H\xE3y b\xE1o cho nh\xE0 ph\xE1t h\xE0nh plugin ho\u1EB7c ng\u01B0\u1EDDi duy tr\xEC ch\u1EC9 m\u1EE5c.",
      "reasonUnknownPlugin": "Kh\xF4ng c\xF3 plugin nh\u01B0 v\u1EADy.",
      "reasonUnsupportedPlatform": "Plugin n\xE0y kh\xF4ng h\u1ED7 tr\u1EE3 h\u1EC7 \u0111i\u1EC1u h\xE0nh \u0111ang ch\u1EA1y DSH.",
      "refresh": "L\xE0m m\u1EDBi",
      "refreshError": "L\xE0m m\u1EDBi th\u1EA5t b\u1EA1i. Vui l\xF2ng th\u1EED l\u1EA1i.",
      "registryCustom": "\u0110\u1ECBa ch\u1EC9 t\xF9y ch\u1EC9nh",
      "registryCustomHint": "Nh\u1EADp \u0111\u1ECBa ch\u1EC9 registry npm n\u1ED9i b\u1ED9 ho\u1EB7c ri\xEAng t\u01B0 b\u1EAFt \u0111\u1EA7u b\u1EB1ng http:// ho\u1EB7c https://. N\u1EBFu c\u1EA7n \u0111\u0103ng nh\u1EADp, h\xE3y l\u01B0u th\xF4ng tin x\xE1c th\u1EF1c trong ~/.npmrc tr\xEAn m\xE1y n\xE0y.",
      "registryCustomInvalid": "Nh\u1EADp \u0111\u1ECBa ch\u1EC9 b\u1EAFt \u0111\u1EA7u b\u1EB1ng http:// ho\u1EB7c https://",
      "registryCustomPlaceholder": "https://npm.example.com/",
      "registryDefault": "Registry m\u1EB7c \u0111\u1ECBnh",
      "registryLegend": "Registry npm m\xE0 plugin \u0111\u01B0\u1EE3c t\u1EA3i v\u1EC1 t\u1EEB \u0111\xF3",
      "registryListSeparator": ", ",
      "registryNpmmirror": "G\u01B0\u01A1ng Trung Qu\u1ED1c \u0111\u1EA1i l\u1EE5c",
      "registryOfficial": "Registry npm ch\xEDnh th\u1EE9c",
      "registryToggle": "Registry",
      "restartNotice": "Kh\u1EDFi \u0111\u1ED9ng l\u1EA1i DSH \u0111\u1EC3 \xE1p d\u1EE5ng thay \u0111\u1ED5i. {reason}",
      "restartReasonHostModule": "Thay \u0111\u1ED5i ch\u1EA1m t\u1EDBi c\xE1c m\xF4-\u0111un do ch\xEDnh DSH t\u1EA3i.",
      "restartReasonModuleComparison": "DSH kh\xF4ng th\u1EC3 so s\xE1nh c\xE1c plugin \u0111\xE3 t\u1EA3i v\u1EDBi t\u1EC7p c\u1EE7a ch\xFAng.",
      "restartReasonNoHmr": "Profile n\xE0y ch\u1EC9 \xE1p d\u1EE5ng thay \u0111\u1ED5i khi kh\u1EDFi \u0111\u1ED9ng.",
      "restartReasonPackageMoved": "M\u1ED9t g\xF3i \u0111\xE3 c\xE0i gi\u1EDD tr\u1ECF t\u1EDBi th\u01B0 m\u1EE5c kh\xE1c, ho\u1EB7c thay \u0111\u1ED5i thay th\u1EBF g\xF3i do b\u1EA3n c\xE0i DSH cung c\u1EA5p. H\xE3y g\u1EE1 c\xE0i \u0111\u1EB7t g\xF3i tr\u01B0\u1EDBc khi c\xE0i t\u1EEB v\u1ECB tr\xED kh\xE1c.",
      "restartReasonUnmanagedPlugin": "Thay \u0111\u1ED5i ch\u1EA1m t\u1EDBi m\u1ED9t plugin \u0111ang ch\u1EA1y ngo\xE0i danh s\xE1ch plugin.",
      "retry": "Th\u1EED l\u1EA1i",
      "rowPhaseActive": "\u0110ang ch\u1EA1y",
      "rowPhaseFailed": "S\u1EF1 c\u1ED1",
      "rowPhaseLoading": "\u0110ang t\u1EA3i",
      "rowPhasePending": "\u0110ang ch\u1EDD ph\u1EE5 thu\u1ED9c",
      "rowPhaseUnloading": "\u0110ang g\u1EE1 t\u1EA3i",
      "rowStateIdle": "Kh\xF4ng ch\u1EA1y",
      "sentenceSeparator": " ",
      "sourceBuiltIn": "T\xEDch h\u1EE3p",
      "sourceNotInstalled": "Ch\u01B0a c\xE0i \u0111\u1EB7t",
      "sourceSpec": "Ngu\u1ED3n m\xE3",
      "sourceTargetSpec": "Ngu\u1ED3n cho DSH n\xE0y",
      "sourceTargetVersion": "Phi\xEAn b\u1EA3n cho DSH n\xE0y",
      "sourceTitle": "Ngu\u1ED3n",
      "sourceVersion": "Phi\xEAn b\u1EA3n hi\u1EC7n t\u1EA1i",
      "statusBeta": "Th\u1EED nghi\u1EC7m",
      "statusMissingFiles": "G\xF3i kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "statusNotInstalled": "Ch\u01B0a c\xE0i \u0111\u1EB7t",
      "statusNotRunning": "Kh\xF4ng ch\u1EA1y",
      "statusProblem": "S\u1EF1 c\u1ED1",
      "statusUpdateAvailable": "C\xF3 b\u1EA3n c\u1EADp nh\u1EADt",
      "tabsLabel": "Ch\u1EBF \u0111\u1ED9 xem plugin",
      "terminalCollapse": "Thu g\u1ECDn",
      "terminalCollapseAria": "Thu g\u1ECDn \u0111\u1EA7u ra",
      "terminalCommandLine": "D\xF2ng l\u1EC7nh {n}",
      "terminalCopied": "\u0110\xE3 sao ch\xE9p",
      "terminalCopy": "Sao ch\xE9p",
      "terminalDone": "Xong",
      "terminalExitCode": "m\xE3 tho\xE1t {code}",
      "terminalExpand": "\u2026 {n} d\xF2ng n\u1EEFa",
      "terminalExpandAria": "M\u1EDF r\u1ED9ng {n} d\xF2ng \u0111\u1EA7u ra c\xF2n l\u1EA1i",
      "terminalFailed": "Th\u1EA5t b\u1EA1i",
      "terminalNoExitCode": "kh\xF4ng c\xF3 m\xE3 tho\xE1t",
      "terminalNoOutput": "Kh\xF4ng c\xF3 \u0111\u1EA7u ra",
      "terminalRunning": "\u0110ang ch\u1EA1y",
      "terminalSignal": "t\xEDn hi\u1EC7u {signal}",
      "title": "Plugin",
      "unavailable": "B\u1EA3n tri\u1EC3n khai n\xE0y ch\u1EA1y kh\xF4ng c\xF3 profile kh\u1EA3 qu\u1EA3n, n\xEAn kh\xF4ng th\u1EC3 c\xE0i \u0111\u1EB7t ho\u1EB7c chuy\u1EC3n plugin t\u1EA1i \u0111\xE2y.",
      "uninstall": "G\u1EE1 c\xE0i \u0111\u1EB7t",
      "uninstallLabel": "G\u1EE1 c\xE0i \u0111\u1EB7t {name}",
      "update": "C\u1EADp nh\u1EADt",
      "updateBroken": "C\u1EADp nh\u1EADt th\u1EA5t b\u1EA1i; plugin kh\xF4ng \u0111\u01B0\u1EE3c c\xE0i \u0111\u1EB7t",
      "updateBrokenDetail": "C\xE0i {to} th\u1EA5t b\u1EA1i, v\xE0 c\xE0i l\u1EA1i {from} c\u0169ng th\u1EA5t b\u1EA1i. H\xE3y c\xE0i l\u1EA1i {name} t\u1EEB Th\xEAm plugin.",
      "updateDescription": "B\u1EA3n c\u1EADp nh\u1EADt thay th\u1EBF {from} b\u1EB1ng {to}; plugin c\xF3 th\u1EC3 d\u1EEBng trong gi\xE2y l\xE1t. N\u1EBFu c\xE0i \u0111\u1EB7t th\u1EA5t b\u1EA1i, {from} \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i ho\u1EB7c c\xE0i l\u1EA1i.",
      "updateDone": "\u0110\xE3 c\u1EADp nh\u1EADt l\xEAn {version}",
      "updateDoneDetail": "Phi\xEAn b\u1EA3n m\u1EDBi \u0111ang ch\u1EA1y.",
      "updateFinish": "Xong",
      "updateKept": "Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt l\xEAn {version}",
      "updateKeptDetail": "{from} ch\u01B0a b\u1ECB g\u1EE1 v\xE0 v\u1EABn \u0111ang \u0111\u01B0\u1EE3c d\xF9ng. {reason}",
      "updateLabel": "C\u1EADp nh\u1EADt {name}",
      "updateLost": "Kh\xF4ng r\xF5 k\u1EBFt qu\u1EA3 c\u1EADp nh\u1EADt",
      "updateLostDetail": "K\u1EBFt n\u1ED1i t\u1EDBi DSH b\u1ECB gi\xE1n \u0111o\u1EA1n: {reason}. L\xE0m m\u1EDBi danh s\xE1ch plugin \u0111\u1EC3 xem phi\xEAn b\u1EA3n \u0111\xE3 c\xE0i.",
      "updateOutput": "Hi\u1EC7n \u0111\u1EA7u ra c\xE0i \u0111\u1EB7t",
      "updateRefused": "Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt l\xEAn {version}",
      "updateRemoveFailed": "Kh\xF4ng th\u1EC3 g\u1EE1 {version}",
      "updateRestart": "\u0110\xE3 c\xE0i {version}; c\xF3 hi\u1EC7u l\u1EF1c sau khi kh\u1EDFi \u0111\u1ED9ng l\u1EA1i",
      "updateRestored": "C\u1EADp nh\u1EADt th\u1EA5t b\u1EA1i; \u0111\xE3 kh\xF4i ph\u1EE5c {version}",
      "updateRestoredDetail": "C\xE0i {to} th\u1EA5t b\u1EA1i; {from} \u0111\xE3 \u0111\u01B0\u1EE3c c\xE0i l\u1EA1i.",
      "updateRunning": "\u0110ang c\u1EADp nh\u1EADt",
      "updatesAvailable": "C\xF3 c\u1EADp nh\u1EADt: {count}",
      "updatesFailed": "Kh\xF4ng th\u1EC3 ki\u1EC3m tra m\u1ED9t s\u1ED1 plugin",
      "updatesNone": "T\u1EA5t c\u1EA3 plugin \u0111\u1EC1u \u0111\xE3 c\u1EADp nh\u1EADt",
      "updateSource": "C\xE0i t\u1EEB",
      "updateStepChecking": "Ki\u1EC3m tra {version}",
      "updateStepInstalling": "C\xE0i {version} t\u1EEB {source}",
      "updateStepRemoving": "D\u1EEBng v\xE0 g\u1EE1 {version}",
      "updateStepRestoring": "C\xE0i l\u1EA1i {version}",
      "updateTitle": "C\u1EADp nh\u1EADt {name}",
      "versionsAvailable": "C\xF3 b\u1EA3n c\u1EADp nh\u1EADt l\xEAn {version}",
      "versionsBlocked": "Phi\xEAn b\u1EA3n m\u1EDBi h\u01A1n c\u1EA7n c\u1EADp nh\u1EADt DSH",
      "versionsBlockedDetail": "{version} c\u1EA7n {peers}; DSH n\xE0y l\xE0 {runtime}",
      "versionsCheckedAt": "Ki\u1EC3m tra l\u1EA7n cu\u1ED1i l\xFAc {time}",
      "versionsCheckedAtLabel": "Ki\u1EC3m tra l\xFAc",
      "versionsChecking": "\u0110ang ki\u1EC3m tra c\u1EADp nh\u1EADt",
      "versionsCollapse": "Thu g\u1ECDn",
      "versionsDeprecatedTag": "Ng\u1EEBng h\u1ED7 tr\u1EE3",
      "versionsDetails": "Chi ti\u1EBFt",
      "versionsFailedNetwork": "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i registry",
      "versionsFailedOther": "Kh\xF4ng th\u1EC3 ki\u1EC3m tra c\u1EADp nh\u1EADt",
      "versionsFallbackHint": "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i {registry}; danh s\xE1ch \u0111\u1EBFn t\u1EEB registry d\u1EF1 ph\xF2ng",
      "versionsFallbackTag": "D\u1EF1 ph\xF2ng",
      "versionsInstalledTag": "\u0110\xE3 c\xE0i",
      "versionsLatest": "\u0110\xE3 c\u1EADp nh\u1EADt",
      "versionsNeedsDsh": "C\u1EA7n {peers}",
      "versionsNewerCount": "{count} m\u1EDBi h\u01A1n",
      "versionsNoneInstallable": "Kh\xF4ng c\xF3 phi\xEAn b\u1EA3n m\u1EDBi h\u01A1n \u0111\u1EC3 c\xE0i tr\u1EF1c ti\u1EBFp",
      "versionsNoneInstallableDetail": "C\xE1c phi\xEAn b\u1EA3n m\u1EDBi h\u01A1n \u0111\xE3 b\u1ECB ng\u1EEBng h\u1ED7 tr\u1EE3, l\xE0 b\u1EA3n ti\u1EC1n ph\xE1t h\xE0nh, ho\u1EB7c kh\xF4ng khai b\xE1o bundle. M\u1EDF r\u1ED9ng \u0111\u1EC3 xem ch\xFAng",
      "versionsNotBundle": "Phi\xEAn b\u1EA3n n\xE0y kh\xF4ng khai b\xE1o bundle v\xE0 kh\xF4ng th\u1EC3 c\xE0i \u0111\u1EB7t",
      "versionsOmitted": "{count} phi\xEAn b\u1EA3n m\u1EDBi h\u01A1n b\u1EA3n \u0111\xE3 c\xE0i kh\xF4ng \u0111\u01B0\u1EE3c li\u1EC7t k\xEA",
      "versionsPrereleaseTag": "Ti\u1EC1n ph\xE1t h\xE0nh",
      "versionsPrimaryTag": "\u0110\u1EA7u ti\xEAn",
      "versionsProblemNetwork": "Kh\xF4ng k\u1EBFt n\u1ED1i \u0111\u01B0\u1EE3c",
      "versionsProblemNotFound": "Kh\xF4ng t\xECm th\u1EA5y",
      "versionsProblemUnknown": "Th\u1EA5t b\u1EA1i",
      "versionsPublished": "Ph\xE1t h\xE0nh {date}",
      "versionsRecheck": "Ki\u1EC3m tra l\u1EA1i",
      "versionsRegistry": "Registry",
      "versionsShowPrerelease": "Hi\u1EC7n b\u1EA3n ti\u1EC1n ph\xE1t h\xE0nh",
      "versionsTitle": "Phi\xEAn b\u1EA3n",
      "versionsUpdateLabel": "C\u1EADp nh\u1EADt l\xEAn {version}",
      "versionTag": "v{version}"
    },
    "pluginMarket": {
      "addFirstSource": "Th\xEAm ngu\u1ED3n ch\u1EC9 m\u1EE5c",
      "addSource": "Th\xEAm",
      "allCategories": "T\u1EA5t c\u1EA3",
      "backToList": "Kh\xE1m ph\xE1",
      "cancel": "H\u1EE7y",
      "categoriesLabel": "Danh m\u1EE5c",
      "close": "\u0110\xF3ng",
      "confirmTitle": 'C\xE0i \u0111\u1EB7t "{name}"?',
      "detailDenied": "Kh\xF4ng th\u1EC3 truy c\u1EADp kho m\xE3 c\u1EE7a chi ti\u1EBFt. H\xE3y ki\u1EC3m tra th\xF4ng tin \u0111\u0103ng nh\u1EADp Git c\u1EE7a b\u1EA1n.",
      "detailFailed": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc chi ti\u1EBFt.",
      "detailGitUnavailable": "Chi ti\u1EBFt n\u1EB1m trong m\u1ED9t kho m\xE3 ph\u1EA3i \u0111\u1ECDc b\u1EB1ng Git, v\xE0 Git kh\xF4ng th\u1EC3 ch\u1EA1y. H\xE3y c\xE0i Git r\u1ED3i th\u1EED l\u1EA1i.",
      "detailInvalid": "Plugin khai b\xE1o m\u1ED9t t\u1EC7p chi ti\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.",
      "detailLoading": "\u0110ang \u0111\u1ECDc chi ti\u1EBFt",
      "detailNetwork": "Kh\xF4ng th\u1EC3 truy c\u1EADp ngu\u1ED3n c\u1EE7a chi ti\u1EBFt.",
      "detailTitle": "Chi ti\u1EBFt",
      "detailTooLarge": "Chi ti\u1EBFt ho\u1EB7c kho m\xE3 c\u1EE7a n\xF3 v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n k\xEDch th\u01B0\u1EDBc v\xE0 kh\xF4ng \u0111\u01B0\u1EE3c t\u1EA3i.",
      "emptyDescription": "Th\xEAm m\u1ED9t ch\u1EC9 m\u1EE5c plugin \u0111\u1EC3 duy\u1EC7t v\xE0 c\xE0i \u0111\u1EB7t c\xE1c plugin c\u1EE7a ch\u1EC9 m\u1EE5c \u0111\xF3 t\u1EA1i \u0111\xE2y.",
      "emptyIndex": "Ch\u1EC9 m\u1EE5c n\xE0y kh\xF4ng li\u1EC7t k\xEA plugin n\xE0o.",
      "emptyTitle": "Ch\u01B0a c\xF3 ch\u1EC9 m\u1EE5c plugin n\xE0o",
      "entryMeta": "{version} \xB7 {date}",
      "entryMetaAuthor": "{version} \xB7 {author} \xB7 {date}",
      "exempted": "Phi\xEAn b\u1EA3n n\xE0y kh\xF4ng t\u01B0\u01A1ng th\xEDch v\u1EDBi DSH \u0111ang ch\u1EA1y, nh\u01B0ng b\u1EA1n \u0111\xE3 \u0111\u1EB7t mi\u1EC5n tr\u1EEB t\u01B0\u01A1ng th\xEDch cho n\xF3.",
      "factAuthor": "T\xE1c gi\u1EA3",
      "factCategory": "Danh m\u1EE5c",
      "factCommit": "Commit",
      "factDirectory": "Th\u01B0 m\u1EE5c",
      "factHomepage": "Trang ch\u1EE7",
      "factLabels": "Nh\xE3n",
      "factMarket": "Ch\u1EC9 m\u1EE5c plugin",
      "factPackage": "G\xF3i",
      "factPublished": "\u0110\xE3 xu\u1EA5t b\u1EA3n",
      "factRegistry": "Registry",
      "factRepository": "Kho m\xE3",
      "factSource": "Ngu\u1ED3n",
      "factSourceCode": "M\xE3 ngu\u1ED3n",
      "filter": "Nh\xE3n",
      "filterCount": "Nh\xE3n \xB7 {count}",
      "footnotes": "Ch\xFA th\xEDch",
      "incompatible": "Phi\xEAn b\u1EA3n n\xE0y kh\xF4ng t\u01B0\u01A1ng th\xEDch v\u1EDBi DSH {runtime} \u0111ang ch\u1EA1y; n\xF3 y\xEAu c\u1EA7u DSH {range}.",
      "install": "C\xE0i \u0111\u1EB7t",
      "installTitle": "C\xE0i \u0111\u1EB7t {name}",
      "installTrust": "Plugin ch\u1EA1y tr\xEAn m\xE1y n\xE0y v\u1EDBi quy\u1EC1n c\u1EE7a b\u1EA1n. H\xE3y ch\u1EAFc ch\u1EAFn b\u1EA1n tin t\u01B0\u1EDFng ngu\u1ED3n g\u1ED1c c\u1EE7a plugin n\xE0y.",
      "installVersionTitle": "C\xE0i \u0111\u1EB7t {name} {version}",
      "loading": "\u0110ang \u0111\u1ECDc ch\u1EC9 m\u1EE5c",
      "manageSources": "Qu\u1EA3n l\xFD ngu\u1ED3n ch\u1EC9 m\u1EE5c\u2026",
      "marketMenu": "Chuy\u1EC3n ch\u1EC9 m\u1EE5c plugin, hi\u1EC7n t\u1EA1i {market}",
      "noCompatibleVersion": "Kh\xF4ng c\xF3 phi\xEAn b\u1EA3n n\xE0o t\u01B0\u01A1ng th\xEDch v\u1EDBi DSH {runtime}",
      "noMatches": "Kh\xF4ng c\xF3 plugin n\xE0o kh\u1EDBp.",
      "openEntry": "Xem {name}",
      "openInstalled": "Xem {name} trong \u0110\xE3 c\xE0i \u0111\u1EB7t",
      "readChanged": "Ch\u1EC9 m\u1EE5c n\xE0y \u0111\xE3 thay \u0111\u1ED5i trong khi t\u1EA3i.",
      "readFailed": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc ch\u1EC9 m\u1EE5c n\xE0y.",
      "readInvalid": "Ch\u1EC9 m\u1EE5c n\xE0y kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng h\u1EE3p l\u1EC7.",
      "refresh": "L\xE0m m\u1EDBi",
      "removeSource": "X\xF3a",
      "removeSourceNamed": "X\xF3a {url}",
      "retry": "Th\u1EED l\u1EA1i",
      "search": "T\xECm plugin",
      "showMore": "Hi\u1EC7n th\xEAm",
      "sortBy": "S\u1EAFp x\u1EBFp: {sort}",
      "sortDefault": "Th\u1EE9 t\u1EF1 m\u1EB7c \u0111\u1ECBnh",
      "sortPublished": "Ng\xE0y xu\u1EA5t b\u1EA3n",
      "sortRelevance": "Ph\xF9 h\u1EE3p nh\u1EA5t",
      "sourceDuplicate": "Ngu\u1ED3n ch\u1EC9 m\u1EE5c n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c th\xEAm.",
      "sourceFailed": "Kh\xF4ng th\u1EC3 l\u01B0u c\xE1c ngu\u1ED3n ch\u1EC9 m\u1EE5c.",
      "sourceInvalid": "D\xF9ng \u0111\u1ECBa ch\u1EC9 http ho\u1EB7c https kh\xF4ng c\xF3 t\xEAn ng\u01B0\u1EDDi d\xF9ng, m\u1EADt kh\u1EA9u hay \u0111o\u1EA1n #.",
      "sourcePlaceholder": "https://example.com/index.json",
      "sourcesDescription": "M\u1ED9t ch\u1EC9 m\u1EE5c plugin \u0111\u01B0\u1EE3c xu\u1EA5t b\u1EA3n d\u01B0\u1EDBi d\u1EA1ng URL c\u1EE7a m\u1ED9t t\u1EC7p ch\u1EC9 m\u1EE5c. Kh\xE1m ph\xE1 duy\u1EC7t c\xE1c ch\u1EC9 m\u1EE5c \u0111\u01B0\u1EE3c li\u1EC7t k\xEA t\u1EA1i \u0111\xE2y.",
      "sourcesFailed": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc c\xE1c ngu\u1ED3n ch\u1EC9 m\u1EE5c.",
      "sourcesLabel": "Ngu\u1ED3n ch\u1EC9 m\u1EE5c \u0111\xE3 th\xEAm",
      "sourcesTitle": "Ngu\u1ED3n ch\u1EC9 m\u1EE5c",
      "sourcesTrust": "Ch\u1EC9 m\u1EE5c \u0111\u1EBFn t\u1EEB b\xEAn th\u1EE9 ba. Ch\u1EC9 th\xEAm nh\u1EEFng ngu\u1ED3n b\u1EA1n tin t\u01B0\u1EDFng: plugin c\u1EE7a h\u1ECD ch\u1EA1y v\u1EDBi quy\u1EC1n c\u1EE7a b\u1EA1n sau khi c\xE0i \u0111\u1EB7t.",
      "sourceUnavailable": "Kh\xF4ng th\u1EC3 l\u01B0u ngu\u1ED3n ch\u1EC9 m\u1EE5c t\u1EA1i \u0111\xE2y.",
      "sourceUrl": "URL ch\u1EC9 m\u1EE5c",
      "statusInstalled": "\u0110\xE3 c\xE0i \u0111\u1EB7t",
      "statusProvided": "Do DSH cung c\u1EA5p",
      "statusUpdate": "C\xF3 b\u1EA3n c\u1EADp nh\u1EADt",
      "switchToAscending": "S\u1EAFp x\u1EBFp t\u0103ng d\u1EA7n",
      "switchToDescending": "S\u1EAFp x\u1EBFp gi\u1EA3m d\u1EA7n",
      "title": "Kh\xE1m ph\xE1",
      "update": "C\u1EADp nh\u1EADt",
      "updateTitle": "C\u1EADp nh\u1EADt {name} l\xEAn {version}",
      "versionDefault": "\u0110\u1EC1 xu\u1EA5t",
      "versionExempted": "\u0110\u01B0\u1EE3c mi\u1EC5n tr\u1EEB",
      "versionIncompatible": "Kh\xF4ng t\u01B0\u01A1ng th\xEDch",
      "versionInstalled": "\u0110\xE3 c\xE0i \u0111\u1EB7t",
      "versionPrerelease": "B\u1EA3n th\u1EED nghi\u1EC7m",
      "versionsLabel": "C\xE1c phi\xEAn b\u1EA3n c\u1EE7a {name}",
      "versionsTitle": "Phi\xEAn b\u1EA3n"
    },
    "pluginRecommendations": {
      "access-denied": "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n thay \u0111\u1ED5i profile n\xE0y.",
      "already-enabled": "\u0110\xE3 \u0111\u01B0\u1EE3c ch\u1ECDn trong Plugin. M\u1EDF chi ti\u1EBFt \u0111\u1EC3 ki\u1EC3m tra tr\u1EA1ng th\xE1i ch\u1EA1y c\u1EE7a n\xF3.",
      "closing": "D\u1ECBch v\u1EE5 \u0111ang t\u1EA3i l\u1EA1i. H\xE3y th\u1EED l\u1EA1i sau \xEDt ph\xFAt.",
      "detailsFor": "Xem chi ti\u1EBFt: {title}",
      "dismiss": "\u0110\u1EC3 sau",
      "dismissed": "\u0110\xE3 b\u1ECF qua",
      "enable": "B\u1EADt",
      "enabled": "\u0110\xE3 b\u1EADt",
      "failed": "Kh\xF4ng th\u1EC3 b\u1EADt. Th\u1EED l\u1EA1i ho\u1EB7c ki\u1EC3m tra Plugin.",
      "heading": "Plugin \u0111\u1EC1 xu\u1EA5t",
      "lookup-failed": "Kh\xF4ng th\u1EC3 t\u1EA3i chi ti\u1EBFt c\u1EE7a plugin n\xE0y. H\xE3y th\u1EED l\u1EA1i.",
      "management-error": "Kh\xF4ng th\u1EC3 b\u1EADt plugin. M\u1EDF chi ti\u1EBFt c\u1EE7a n\xF3 \u0111\u1EC3 ki\u1EC3m tra l\u1ED7i v\xE0 th\u1EED l\u1EA1i.",
      "not-live-root": "H\xE3y d\xF9ng \u0111\u1EC1 xu\u1EA5t n\xE0y trong cu\u1ED9c tr\xF2 chuy\u1EC7n g\u1ED1c c\u1EE7a n\xF3.",
      "official": "Ch\xEDnh th\u1EE9c",
      "replaced": "\u0110\xE3 thay th\u1EBF",
      "restart-required": "\u0110\xE3 l\u01B0u. Kh\u1EDFi \u0111\u1ED9ng l\u1EA1i DSH \u0111\u1EC3 \xE1p d\u1EE5ng.",
      "retry": "Th\u1EED b\u1EADt l\u1EA1i",
      "retryLookup": "Th\u1EED l\u1EA1i",
      "scope": "Kh\u1EA3 d\u1EE5ng trong m\u1ECDi cu\u1ED9c tr\xF2 chuy\u1EC7n khi \u0111\u01B0\u1EE3c b\u1EADt",
      "transport": "Kh\xF4ng th\u1EC3 x\xE1c nh\u1EADn k\u1EBFt qu\u1EA3. H\xE3y l\xE0m m\u1EDBi v\xE0 th\u1EED l\u1EA1i.",
      "unavailable": "Plugin n\xE0y hi\u1EC7n kh\xF4ng th\u1EC3 b\u1EADt. H\xE3y ki\u1EC3m tra Plugin.",
      "unconfirmed": "Kh\xF4ng th\u1EC3 x\xE1c nh\u1EADn li\u1EC7u plugin \u0111\xE3 \u0111\u01B0\u1EE3c b\u1EADt. Th\u1EED l\u1EA1i \u0111\u1EC3 ki\u1EC3m tra.",
      "unknown": "\u0110\u1EC1 xu\u1EA5t n\xE0y kh\xF4ng kh\u1EA3 d\u1EE5ng. H\xE3y m\u1EDF l\u1EA1i cu\u1ED9c tr\xF2 chuy\u1EC7n.",
      "version-error": "Plugin n\xE0y kh\xF4ng t\u01B0\u01A1ng th\xEDch v\u1EDBi phi\xEAn b\u1EA3n DSH n\xE0y. H\xE3y c\u1EADp nh\u1EADt DSH v\xE0 th\u1EED l\u1EA1i.",
      "working": "\u0110ang x\u1EED l\xFD\u2026"
    },
    "question": {
      "action.next": "Ti\u1EBFp",
      "action.skip": "B\u1ECF qua",
      "custom.placeholder": "Nh\u1EADp c\xE2u tr\u1EA3 l\u1EDDi c\u1EE7a b\u1EA1n",
      "error.incomplete": "Vui l\xF2ng ho\xE0n th\xE0nh c\xE2u h\u1ECFi n\xE0y tr\u01B0\u1EDBc.",
      "error.resubmit": "C\xE2u tr\u1EA3 l\u1EDDi kh\xF4ng \u0111\u1EBFn tr\u01B0\u1EDBc khi c\xF4ng vi\u1EC7c ti\u1EBFp t\u1EE5c; h\xE3y g\u1EEDi l\u1EA1i.",
      "error.unanswered": "Vui l\xF2ng ch\u1ECDn m\u1ED9t t\xF9y ch\u1ECDn ho\u1EB7c nh\u1EADp c\xE2u tr\u1EA3 l\u1EDDi t\xF9y ch\u1EC9nh.",
      "error.unavailable": "Hi\u1EC7n kh\xF4ng th\u1EC3 g\u1EEDi; h\xE3y th\u1EED l\u1EA1i sau gi\xE2y l\xE1t.",
      "nav.cancel": "B\u1ECF qua t\u1EA5t c\u1EA3 c\xE2u h\u1ECFi",
      "nav.close": "\u0110\xF3ng b\u1EA3ng \u2014 m\u1EDF l\u1EA1i t\u1EEB l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5",
      "nav.maximize": "M\u1EDF r\u1ED9ng th\u1EBB c\xE2u h\u1ECFi",
      "nav.minimize": "Thu g\u1ECDn th\u1EBB c\xE2u h\u1ECFi",
      "nav.next": "C\xE2u h\u1ECFi ti\u1EBFp theo",
      "nav.prev": "C\xE2u h\u1ECFi tr\u01B0\u1EDBc",
      "option.recommended": "\u0110\u1EC1 xu\u1EA5t",
      "plan.approve": "Ph\xEA duy\u1EC7t",
      "plan.decline": "T\u1EEB ch\u1ED1i",
      "plan.discuss": "Y\xEAu c\u1EA7u thay \u0111\u1ED5i",
      "plan.header": "Xem x\xE9t k\u1EBF ho\u1EA1ch",
      "reply.answerLabel": "Tr\u1EA3 l\u1EDDi: ",
      "reply.label": "C\xE2u h\u1ECFi v\xE0 c\xE2u tr\u1EA3 l\u1EDDi",
      "reply.skipped": "\u0110\xE3 b\u1ECF qua",
      "review.skipped": "C\xE2u h\u1ECFi n\xE0y \u0111\xE3 b\u1ECB b\u1ECF qua.",
      "review.status": "\u0110\xE3 tr\u1EA3 l\u1EDDi",
      "status.sent": "\u0110\xE3 g\u1EEDi tr\u1EA3 l\u1EDDi; b\u1EA3ng kh\xF4ng th\u1EC3 \u0111\xF3ng.",
      "text.collapse": "Thu g\u1ECDn",
      "text.expand": "M\u1EDF r\u1ED9ng",
      "wait.continued": "C\xF4ng vi\u1EC7c \u0111\xE3 ti\u1EBFp t\u1EE5c \u2014 b\u1EA1n v\u1EABn c\xF3 th\u1EC3 tr\u1EA3 l\u1EDDi",
      "wait.countdown": "Ti\u1EBFp t\u1EE5c sau {seconds}s",
      "wait.held": "\u0110ang ch\u1EDD b\u1EA1n tr\u1EA3 l\u1EDDi",
      "wait.paused": "T\u1EA1m d\u1EEBng \xB7 c\xF2n {seconds}s",
      "wait.takeTime": "D\xE0nh th\u1EDDi gian"
    },
    "reference": {
      "candidate.noCwd": "(kh\xF4ng c\xF3 cwd)",
      "crumb.root": "Workspace",
      "fileOpen.close": "\u0110\xF3ng",
      "fileOpen.failed": "Kh\xF4ng th\u1EC3 m\u1EDF \u201C{path}\u201D. H\xE3y th\u1EED l\u1EA1i ho\u1EB7c \u0111\xF3ng tin nh\u1EAFn n\xE0y.",
      "fileOpen.retry": "Th\u1EED l\u1EA1i",
      "fileOpen.title": "Kh\xF4ng th\u1EC3 m\u1EDF t\u1EC7p",
      "section.files": "T\u1EC7p & th\u01B0 m\u1EE5c",
      "section.sessions": "Phi\xEAn",
      "section.subagents": "Subagent",
      "time.days": "{n} ng\xE0y",
      "time.hours": "{n} gi\u1EDD",
      "time.minutes": "{n} ph\xFAt",
      "time.months": "{n} th\xE1ng",
      "time.now": "b\xE2y gi\u1EDD",
      "time.years": "{n} n\u0103m"
    },
    "schedule.catalog": {
      "cron.day.both": "Ng\xE0y {days} h\xE0ng th\xE1ng ho\u1EB7c {weekdays}{months}",
      "cron.day.bothStarred": "Ng\xE0y {days} h\xE0ng th\xE1ng v\xE0 {weekdays}{months}",
      "cron.day.every": "M\u1ED7i ng\xE0y{months}",
      "cron.day.monthDays": "Ng\xE0y {days} h\xE0ng th\xE1ng{months}",
      "cron.day.weekdays": "{weekdays}{months}",
      "cron.hours.list": "{hours}",
      "cron.hours.range": "{from}\u2013{to}",
      "cron.list.join": ", ",
      "cron.months": " trong {months}",
      "cron.part.join": " ",
      "cron.time.at": "l\xFAc {times}",
      "cron.time.everyHour": "M\u1ED7i gi\u1EDD",
      "cron.time.everyMinute": "M\u1ED7i ph\xFAt",
      "cron.time.everyMinutes": "M\u1ED7i {step} ph\xFAt",
      "cron.time.everyNHours": "M\u1ED7i {count} gi\u1EDD",
      "cron.time.hourlyAt": "M\u1ED7i gi\u1EDD v\xE0o ph\xFAt {minutes}",
      "cron.time.hoursAt": "v\xE0o ph\xFAt {minutes} c\u1EE7a c\xE1c gi\u1EDD {hours}",
      "cron.time.hoursEveryMinute": "m\u1ED7i ph\xFAt trong c\xE1c gi\u1EDD {hours}",
      "cron.time.hoursEveryMinutes": "m\u1ED7i {step} ph\xFAt trong c\xE1c gi\u1EDD {hours}",
      "cron.time.joinedEveryHour": "m\u1ED7i gi\u1EDD",
      "cron.time.joinedEveryMinute": "m\u1ED7i ph\xFAt",
      "cron.time.joinedEveryMinutes": "m\u1ED7i {step} ph\xFAt",
      "cron.time.joinedEveryNHours": "m\u1ED7i {count} gi\u1EDD",
      "cron.time.joinedHourlyAt": "m\u1ED7i gi\u1EDD v\xE0o ph\xFAt {minutes}",
      "cron.weekday.name": "{weekday}",
      "cron.weekday.range": "{from}\u2013{to}",
      "delete.action": "X\xF3a",
      "delete.label": "X\xF3a t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng: {title}",
      "delete.pending": "\u0110ang x\xF3a\u2026",
      "frequency.cron": "T\xF9y ch\u1EC9nh ({timeZone})",
      "frequency.cronLocal": "T\xF9y ch\u1EC9nh",
      "frequency.cronRule": "{rule} ({timeZone})",
      "frequency.daily": "H\xE0ng ng\xE0y l\xFAc {time} ({timeZone})",
      "frequency.dailyLocal": "H\xE0ng ng\xE0y l\xFAc {time}",
      "frequency.every": "M\u1ED7i {value} {unit}",
      "frequency.hostCustom": "T\xF9y ch\u1EC9nh",
      "frequency.hostDailyInterval": "M\u1ED7i {interval} ng\xE0y l\xFAc {time}",
      "frequency.hostMonthly": "H\xE0ng th\xE1ng v\xE0o ng\xE0y {days} l\xFAc {time}, ho\u1EB7c cu\u1ED1i th\xE1ng",
      "frequency.hostMonthlyInterval": "M\u1ED7i {interval} th\xE1ng v\xE0o ng\xE0y {days} l\xFAc {time}, ho\u1EB7c cu\u1ED1i th\xE1ng",
      "frequency.hostWeeklyInterval": "M\u1ED7i {interval} tu\u1EA7n v\xE0o {weekdays} l\xFAc {time}",
      "frequency.hostZone": "{rule} ({timeZone})",
      "frequency.once": "M\u1ED9t l\u1EA7n",
      "frequency.weekday.1": "T2",
      "frequency.weekday.2": "T3",
      "frequency.weekday.3": "T4",
      "frequency.weekday.4": "T5",
      "frequency.weekday.5": "T6",
      "frequency.weekday.6": "T7",
      "frequency.weekday.7": "CN",
      "frequency.weekday.join": ", ",
      "frequency.weekly": "H\xE0ng tu\u1EA7n v\xE0o {weekdays} l\xFAc {time} ({timeZone})",
      "frequency.weeklyLocal": "H\xE0ng tu\u1EA7n v\xE0o {weekdays} l\xFAc {time}",
      "hover.more": "{count} m\u1EE5c n\u1EEFa",
      "list.aria": "T\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng \u0111\xE3 b\u1EADt",
      "list.error": "Kh\xF4ng th\u1EC3 t\u1EA3i t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng.",
      "list.loading": "\u0110ang t\u1EA3i t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng\u2026",
      "list.nextRun": "L\u1EA7n ch\u1EA1y ti\u1EBFp theo",
      "list.open": "M\u1EDF chi ti\u1EBFt t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng: {title}",
      "list.retry": "Th\u1EED l\u1EA1i",
      "mark.aria": "{count} t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng",
      "relative.future": "trong {value} {unit}",
      "relative.now": "\u0110\u1EBFn h\u1EA1n ngay",
      "relative.overdue": "Qu\xE1 h\u1EA1n {value} {unit}",
      "time.locale": "en",
      "time.utcPrefix": "UTC",
      "trigger.label": "T\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng",
      "trigger.one": "{count} t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng",
      "trigger.other": "{count} t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng",
      "unit.day.one": "ng\xE0y",
      "unit.day.other": "ng\xE0y",
      "unit.hour.one": "gi\u1EDD",
      "unit.hour.other": "gi\u1EDD",
      "unit.minute.one": "ph\xFAt",
      "unit.minute.other": "ph\xFAt",
      "unit.second.one": "gi\xE2y",
      "unit.second.other": "gi\xE2y"
    },
    "schedule.manager": {
      "card.deleted": "\u0110\xE3 x\xF3a",
      "card.open": "M\u1EDF",
      "card.openLabel": "M\u1EDF chi ti\u1EBFt t\xE1c v\u1EE5: {title}",
      "clear.action": "X\xF3a t\u1EA5t c\u1EA3 t\xE1c v\u1EE5 \u0111\xE3 k\u1EBFt th\xFAc",
      "clear.close": "\u0110\xF3ng x\xE1c nh\u1EADn x\xF3a",
      "clear.confirm": "X\xF3a t\xE1c v\u1EE5",
      "clear.description": "C\xE1c t\xE1c v\u1EE5 n\xE0y v\xE0 b\u1EA3n ghi g\u1EEDi \u0111\xE3 l\u01B0u s\u1EBD b\u1ECB x\xF3a v\u0129nh vi\u1EC5n. T\xE1c v\u1EE5 \u0111ang b\u1EADt, \u0111\xE3 t\u1EA1m d\u1EEBng, phi\xEAn g\u1ED1c v\xE0 tin nh\u1EAFn \u0111ang x\u1EBFp h\xE0ng kh\xF4ng b\u1ECB \u1EA3nh h\u01B0\u1EDFng.",
      "clear.pending": "\u0110ang x\xF3a\u2026",
      "clear.title": "X\xF3a c\xE1c t\xE1c v\u1EE5 \u0111\xE3 k\u1EBFt th\xFAc ({count})?",
      "cron.day.both": "Ng\xE0y {days} m\u1ED7i th\xE1ng ho\u1EB7c {weekdays}{months}",
      "cron.day.bothStarred": "Ng\xE0y {days} m\u1ED7i th\xE1ng v\xE0 {weekdays}{months}",
      "cron.day.every": "M\u1ED7i ng\xE0y{months}",
      "cron.day.monthDays": "Ng\xE0y {days} m\u1ED7i th\xE1ng{months}",
      "cron.day.weekdays": "{weekdays}{months}",
      "cron.hours.list": "{hours}",
      "cron.hours.range": "{from}\u2013{to}",
      "cron.list.join": ", ",
      "cron.months": " v\xE0o {months}",
      "cron.part.join": " ",
      "cron.time.at": "l\xFAc {times}",
      "cron.time.everyHour": "M\u1ED7i gi\u1EDD",
      "cron.time.everyMinute": "M\u1ED7i ph\xFAt",
      "cron.time.everyMinutes": "M\u1ED7i {step} ph\xFAt",
      "cron.time.everyNHours": "M\u1ED7i {count} gi\u1EDD",
      "cron.time.hourlyAt": "M\u1ED7i gi\u1EDD v\xE0o ph\xFAt {minutes}",
      "cron.time.hoursAt": "v\xE0o ph\xFAt {minutes} c\u1EE7a c\xE1c gi\u1EDD {hours}",
      "cron.time.hoursEveryMinute": "m\u1ED7i ph\xFAt trong c\xE1c gi\u1EDD {hours}",
      "cron.time.hoursEveryMinutes": "m\u1ED7i {step} ph\xFAt trong c\xE1c gi\u1EDD {hours}",
      "cron.time.joinedEveryHour": "m\u1ED7i gi\u1EDD",
      "cron.time.joinedEveryMinute": "m\u1ED7i ph\xFAt",
      "cron.time.joinedEveryMinutes": "m\u1ED7i {step} ph\xFAt",
      "cron.time.joinedEveryNHours": "m\u1ED7i {count} gi\u1EDD",
      "cron.time.joinedHourlyAt": "m\u1ED7i gi\u1EDD v\xE0o ph\xFAt {minutes}",
      "cron.weekday.name": "{weekday}",
      "cron.weekday.range": "{from}\u2013{to}",
      "delete.action": "X\xF3a t\xE1c v\u1EE5",
      "delete.cancel": "H\u1EE7y",
      "delete.close": "\u0110\xF3ng x\xE1c nh\u1EADn x\xF3a",
      "delete.confirm": "X\xE1c nh\u1EADn x\xF3a",
      "delete.description": "Thao t\xE1c n\xE0y d\u1EEBng t\xE1c v\u1EE5 k\xEDch ho\u1EA1t v\xE0 x\xF3a n\xF3 c\xF9ng c\xE1c b\u1EA3n ghi g\u1EEDi \u0111\xE3 l\u01B0u. Phi\xEAn g\u1ED1c v\xE0 c\xE1c tin nh\u1EAFn c\u1EE7a n\xF3 v\u1EABn c\xF2n; c\xE1c tin nh\u1EAFn \u0111ang x\u1EBFp h\xE0ng kh\xF4ng b\u1ECB thu h\u1ED3i.",
      "delete.pending": "\u0110ang x\xF3a\u2026",
      "delete.title": "X\xF3a t\xE1c v\u1EE5 n\xE0y?",
      "delivery.collapse": "Thu g\u1ECDn",
      "delivery.cursorError": "B\u1EA3n ghi \u0111\xE3 \u0111\u01B0\u1EE3c c\u1EADp nh\u1EADt.",
      "delivery.empty": "Kh\xF4ng c\xF3 b\u1EA3n ghi g\u1EEDi n\xE0o",
      "delivery.error": "Kh\xF4ng th\u1EC3 t\u1EA3i b\u1EA3n ghi g\u1EEDi.",
      "delivery.expand": "M\u1EDF r\u1ED9ng",
      "delivery.label": "B\u1EA3n ghi g\u1EEDi \u0111\xE3 l\u01B0u",
      "delivery.loading": "\u0110ang t\u1EA3i b\u1EA3n ghi g\u1EEDi\u2026",
      "delivery.loadMore": "T\u1EA3i th\xEAm",
      "delivery.notFound": "T\xE1c v\u1EE5 n\xE0y kh\xF4ng c\xF2n kh\u1EA3 d\u1EE5ng.",
      "delivery.pruned": "C\xE1c b\u1EA3n ghi g\u1EEDi tr\u01B0\u1EDBc \u0111\xF3 \u0111\xE3 b\u1ECB x\xF3a",
      "delivery.refresh": "L\xE0m m\u1EDBi",
      "delivery.retention": "Quy t\u1EAFc l\u01B0u gi\u1EEF",
      "delivery.retentionBounds": "M\u1ED7i t\xE1c v\u1EE5 l\u01B0u t\u1ED1i \u0111a {records} b\u1EA3n ghi g\u1EEDi trong {days} ng\xE0y g\u1EA7n nh\u1EA5t.",
      "delivery.retentionExplanation": "Khi m\u1ED9t b\u1EA3n ghi m\u1EDBi \u0111\u01B0\u1EE3c l\u01B0u, c\xE1c b\u1EA3n ghi c\u0169 v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n n\xE0y s\u1EBD t\u1EF1 \u0111\u1ED9ng b\u1ECB x\xF3a. Vi\u1EC7c x\xF3a b\u1EA3n ghi kh\xF4ng d\u1EEBng t\xE1c v\u1EE5.",
      "delivery.retry": "Th\u1EED l\u1EA1i",
      "detail.close": "\u0110\xF3ng chi ti\u1EBFt",
      "detail.instruction": "H\u01B0\u1EDBng d\u1EABn cho t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng h\xF3a",
      "detail.instructionPlaceholder": "M\xF4 t\u1EA3 t\xE1c v\u1EE5 v\xE0 k\u1EBFt qu\u1EA3.\nV\xED d\u1EE5: T\xF3m t\u1EAFt danh s\xE1ch \u0111\u1ECDc c\u1EE7a t\xF4i k\xE8m li\xEAn k\u1EBFt ngu\u1ED3n.",
      "detail.label": "Chi ti\u1EBFt t\xE1c v\u1EE5",
      "detail.missing": "T\xE1c v\u1EE5 kh\xF4ng kh\u1EA3 d\u1EE5ng. C\xF3 th\u1EC3 n\xF3 \u0111\xE3 b\u1ECB x\xF3a.",
      "detail.more": "H\xE0nh \u0111\u1ED9ng cho t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng h\xF3a",
      "detail.name": "T\xEAn t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng h\xF3a",
      "detail.namePlaceholder": "V\xED d\u1EE5: B\u1EA3n tin \u0111\u1ECDc h\xE0ng ng\xE0y",
      "detail.nextRun": "L\u1EA7n ch\u1EA1y ti\u1EBFp theo",
      "detail.openSession": "Phi\xEAn li\xEAn k\u1EBFt: m\u1EDF phi\xEAn li\xEAn k\u1EBFt",
      "detail.openSessionTitle": "Phi\xEAn li\xEAn k\u1EBFt {title}: m\u1EDF phi\xEAn li\xEAn k\u1EBFt",
      "detail.records": "B\u1EA3n ghi",
      "detail.rule": "Quy t\u1EAFc",
      "detail.session": "Phi\xEAn li\xEAn k\u1EBFt",
      "detail.sessionArchived": "Phi\xEAn li\xEAn k\u1EBFt \u0111\xE3 \u0111\u01B0\u1EE3c l\u01B0u tr\u1EEF.",
      "detail.sessionLoading": "\u0110ang t\u1EA3i th\xF4ng tin phi\xEAn li\xEAn k\u1EBFt.",
      "detail.sessionUnavailable": "Phi\xEAn li\xEAn k\u1EBFt kh\xF4ng kh\u1EA3 d\u1EE5ng.",
      "detail.tabs": "C\xE1c ch\u1EBF \u0111\u1ED9 xem chi ti\u1EBFt t\xE1c v\u1EE5",
      "empty.action": "T\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng h\xF3a m\u1EDBi",
      "frequency.cron": "T\xF9y ch\u1EC9nh ({timeZone})",
      "frequency.cronLocal": "T\xF9y ch\u1EC9nh",
      "frequency.cronRule": "{rule} ({timeZone})",
      "frequency.daily": "H\xE0ng ng\xE0y l\xFAc {time} ({timeZone})",
      "frequency.dailyLocal": "H\xE0ng ng\xE0y l\xFAc {time}",
      "frequency.every": "M\u1ED7i {value} {unit}",
      "frequency.hostCustom": "T\xF9y ch\u1EC9nh",
      "frequency.hostDailyInterval": "M\u1ED7i {interval} ng\xE0y l\xFAc {time}",
      "frequency.hostMonthly": "H\xE0ng th\xE1ng v\xE0o ng\xE0y {days} l\xFAc {time}, ho\u1EB7c cu\u1ED1i th\xE1ng",
      "frequency.hostMonthlyInterval": "M\u1ED7i {interval} th\xE1ng v\xE0o ng\xE0y {days} l\xFAc {time}, ho\u1EB7c cu\u1ED1i th\xE1ng",
      "frequency.hostWeeklyInterval": "M\u1ED7i {interval} tu\u1EA7n v\xE0o {weekdays} l\xFAc {time}",
      "frequency.hostZone": "{rule} ({timeZone})",
      "frequency.once": "M\u1ED9t l\u1EA7n",
      "frequency.weekday.1": "T2",
      "frequency.weekday.2": "T3",
      "frequency.weekday.3": "T4",
      "frequency.weekday.4": "T5",
      "frequency.weekday.5": "T6",
      "frequency.weekday.6": "T7",
      "frequency.weekday.7": "CN",
      "frequency.weekday.join": ", ",
      "frequency.weekly": "H\xE0ng tu\u1EA7n v\xE0o {weekdays} l\xFAc {time} ({timeZone})",
      "frequency.weeklyLocal": "H\xE0ng tu\u1EA7n v\xE0o {weekdays} l\xFAc {time}",
      "host.chatCreate": "T\u1EA1o trong m\u1ED9t phi\xEAn",
      "host.closeCreate": "\u0110\xF3ng bi\u1EC3u m\u1EABu t\u1EA1o",
      "host.conflict": "T\xE1c v\u1EE5 n\xE0y \u0111\xE3 thay \u0111\u1ED5i \u1EDF n\u01A1i kh\xE1c. H\xE3y xem l\u1EA1i gi\xE1 tr\u1ECB m\u1EDBi nh\u1EA5t c\xF9ng c\xE1c ch\u1EC9nh s\u1EEDa c\u1EE7a b\u1EA1n, ho\u1EB7c h\u1EE7y c\xE1c thay \u0111\u1ED5i.",
      "host.create": "T\u1EA1o",
      "host.createError": "Kh\xF4ng th\u1EC3 t\u1EA1o t\xE1c v\u1EE5. N\u1ED9i dung nh\u1EADp c\u1EE7a b\u1EA1n \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i; h\xE3y th\u1EED l\u1EA1i.",
      "host.createMethod": "Ch\u1ECDn c\xE1ch t\u1EA1o",
      "host.createPrompt": "H\xE3y t\u1EA1o m\u1ED9t t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng h\xF3a d\u1EF1a tr\xEAn y\xEAu c\u1EA7u.",
      "host.creating": "\u0110ang t\u1EA1o\u2026",
      "host.currentConversation": "Phi\xEAn li\xEAn k\u1EBFt hi\u1EC7n t\u1EA1i",
      "host.customRule": "T\xF9y ch\u1EC9nh",
      "host.defaultProject": "Workspace m\u1EB7c \u0111\u1ECBnh",
      "host.executionActive": "T\xE1c v\u1EE5 n\xE0y \u0111ang x\u1EBFp h\xE0ng ho\u1EB7c \u0111ang ch\u1EA1y. Qu\u1EA3n l\xFD n\xF3 trong phi\xEAn.",
      "host.executionPending": "T\xE1c v\u1EE5 n\xE0y \u0111ang x\u1EBFp h\xE0ng, \u0111ang ch\u1EA1y ho\u1EB7c v\u1EEBa \u0111\u01B0\u1EE3c g\u1EEDi. H\xE3y th\u1EED l\u1EA1i sau.",
      "host.frequency.advanced": "T\xF9y ch\u1EC9nh",
      "host.frequency.monthly": "H\xE0ng th\xE1ng",
      "host.interval": "Kho\u1EA3ng th\u1EDDi gian",
      "host.invalidRule": "Ki\u1EC3m tra quy t\u1EAFc v\xE0 m\xFAi gi\u1EDD",
      "host.latestConversation": "Phi\xEAn ch\u1EA1y g\u1EA7n nh\u1EA5t",
      "host.limitsError": "Kh\xF4ng th\u1EC3 t\u1EA3i gi\u1EDBi h\u1EA1n kho\u1EA3ng ch\u1EA1y. H\xE3y th\u1EED l\u1EA1i tr\u01B0\u1EDBc khi l\u01B0u.",
      "host.limitsLoading": "\u0110ang t\u1EA3i gi\u1EDBi h\u1EA1n kho\u1EA3ng ch\u1EA1y",
      "host.manualCreate": "T\u1EA1o th\u1EE7 c\xF4ng",
      "host.monthDay": "Ng\xE0y trong th\xE1ng",
      "host.newSessionInterval": "Kho\u1EA3ng ch\u1EA1y t\u1ED1i thi\u1EC3u: {interval}",
      "host.notFuture": "Ch\u1ECDn l\u1ECBch trong t\u01B0\u01A1ng lai; ch\u1EC9nh th\u1EDDi gian c\u1EE7a t\xE1c v\u1EE5 tr\u01B0\u1EDBc khi ti\u1EBFp t\u1EE5c",
      "host.openDeliverySession": "M\u1EDF phi\xEAn",
      "host.pause": "T\u1EA1m d\u1EEBng",
      "host.project": "Workspace li\xEAn k\u1EBFt",
      "host.reapply": "Xem l\u1EA1i v\u1EDBi ch\u1EC9nh s\u1EEDa c\u1EE7a t\xF4i",
      "host.resume": "Ti\u1EBFp t\u1EE5c",
      "host.run": "Ch\u1EA1y ngay",
      "host.runAfterInterval": "Ch\u01B0a qua kho\u1EA3ng ch\u1EA1y t\u1ED1i thi\u1EC3u. C\xF3 th\u1EC3 ch\u1EA1y ngay l\xFAc {time}.",
      "host.runError": "Kh\xF4ng th\u1EC3 x\u1EBFp h\xE0ng t\xE1c v\u1EE5. H\xE3y th\u1EED l\u1EA1i.",
      "host.saveError": "Kh\xF4ng th\u1EC3 l\u01B0u. Thay \u0111\u1ED5i c\u1EE7a b\u1EA1n \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i; h\xE3y th\u1EED l\u1EA1i.",
      "host.sessionAfterFirstRun": "Ch\u1EDD t\u1EA1o",
      "host.target": "Ch\u1EA1y trong",
      "host.targetNew": "Phi\xEAn m\u1EDBi cho m\u1ED7i l\u1EA7n ch\u1EA1y",
      "host.targetNewHelp": "T\u1EA1o m\u1ED9t phi\xEAn ri\xEAng cho m\u1ED7i l\u1EA7n ch\u1EA1y",
      "host.targetNewOnce": "T\u1EA1o m\u1ED9t phi\xEAn v\xE0 d\xF9ng l\u1EA1i",
      "host.targetNewOnceHelp": "T\u1EA1o \u1EDF l\u1EA7n ch\u1EA1y \u0111\u1EA7u ti\xEAn v\xE0 ti\u1EBFp t\u1EE5c d\xF9ng",
      "host.ungrouped": "Ch\u01B0a nh\xF3m",
      "list.empty": "Ch\u01B0a c\xF3 t\xE1c v\u1EE5 n\xE0o. C\xE1c t\xE1c v\u1EE5 \u0111\u01B0\u1EE3c t\u1EA1o trong phi\xEAn c\u1EE7a b\u1EA1n s\u1EBD hi\u1EC7n \u1EDF \u0111\xE2y.",
      "list.emptyActive": "Kh\xF4ng c\xF3 t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng h\xF3a \u0111ang b\u1EADt",
      "list.emptyInactive": "Kh\xF4ng c\xF3 t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng h\xF3a \u0111\xE3 k\u1EBFt th\xFAc",
      "list.emptyPaused": "Kh\xF4ng c\xF3 t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng h\xF3a \u0111\xE3 t\u1EA1m d\u1EEBng",
      "list.error": "Kh\xF4ng th\u1EC3 t\u1EA3i t\xE1c v\u1EE5.",
      "list.label": "Danh m\u1EE5c t\xE1c v\u1EE5",
      "list.loading": "\u0110ang t\u1EA3i t\xE1c v\u1EE5\u2026",
      "list.more": "Th\xEAm h\xE0nh \u0111\u1ED9ng cho t\xE1c v\u1EE5",
      "list.nextPrefix": "Th\u1EDDi gian theo l\u1ECBch ti\u1EBFp theo: ",
      "list.noMatches": "Kh\xF4ng c\xF3 t\xE1c v\u1EE5 kh\u1EDBp",
      "list.retry": "Th\u1EED l\u1EA1i",
      "new.action": "M\u1EDBi",
      "panel": "T\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng h\xF3a",
      "relative.future": "sau {value} {unit}",
      "relative.now": "\u0110\u1EBFn h\u1EA1n ngay",
      "relative.overdue": "qu\xE1 h\u1EA1n {value} {unit}",
      "rule.cancel": "H\u1EE7y thay \u0111\u1ED5i",
      "rule.daily": "H\xE0ng ng\xE0y",
      "rule.everyHours": "M\u1ED7i N gi\u1EDD",
      "rule.everyMinutes": "M\u1ED7i N ph\xFAt",
      "rule.invalid": "H\xE3y s\u1EEDa quy t\u1EAFc t\xF9y ch\u1EC9nh, ch\u1ECDn c\xE1ch l\u1EB7p kh\xE1c ho\u1EB7c y\xEAu c\u1EA7u agent s\u1EEDa l\u1EA1i.",
      "rule.invalidInterval": "Nh\u1EADp s\u1ED1 nguy\xEAn \xEDt nh\u1EA5t l\xE0 1 cho kho\u1EA3ng th\u1EDDi gian.",
      "rule.invalidMonthDay": "Nh\u1EADp ng\xE0y trong th\xE1ng t\u1EEB 1 \u0111\u1EBFn 31.",
      "rule.invalidTime": "Ch\u1ECDn ng\xE0y v\xE0 gi\u1EDD h\u1EE3p l\u1EC7 trong m\xFAi gi\u1EDD \u0111\xE3 ch\u1ECDn.",
      "rule.invalidTitle": "D\xF9ng t\xEAn t\xE1c v\u1EE5 d\xE0i 1\u2013120 k\xFD t\u1EF1.",
      "rule.invalidZone": "Ch\u1ECDn m\xFAi gi\u1EDD h\u1EE3p l\u1EC7.",
      "rule.once": "M\u1ED9t l\u1EA7n",
      "rule.repeat": "L\u1EB7p l\u1EA1i",
      "rule.requiredWeekday": "Ch\u1ECDn \xEDt nh\u1EA5t m\u1ED9t th\u1EE9 trong tu\u1EA7n.",
      "rule.save": "L\u01B0u thay \u0111\u1ED5i",
      "rule.saving": "\u0110ang l\u01B0u\u2026",
      "rule.title": "Th\u1EDDi gian ch\u1EA1y",
      "rule.tooComplex": "Quy t\u1EAFc n\xE0y qu\xE1 d\xE0y ho\u1EB7c qu\xE1 ph\u1EE9c t\u1EA1p. H\xE3y ch\u1ECDn m\u1ED9t c\xE1ch l\u1EB7p kh\xE1c ho\u1EB7c y\xEAu c\u1EA7u agent \u0111\u01A1n gi\u1EA3n h\xF3a.",
      "rule.unsaved": "Thay \u0111\u1ED5i ch\u01B0a l\u01B0u",
      "rule.weekday": "Th\u1EE9 trong tu\u1EA7n",
      "rule.weekdayOption": "Th\u1EE9 {weekday}",
      "rule.weekdays": "Th\u1EE9 Hai \u0111\u1EBFn Th\u1EE9 S\xE1u",
      "rule.weekly": "H\xE0ng tu\u1EA7n",
      "rule.zone.system": " (h\u1EC7 th\u1ED1ng)",
      "search.clear": "X\xF3a t\xECm ki\u1EBFm",
      "search.label": "T\xECm t\xE1c v\u1EE5",
      "search.placeholder": "T\xECm t\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng h\xF3a",
      "status.active": "\u0110ang b\u1EADt",
      "status.ended": "\u0110\xE3 k\u1EBFt th\xFAc",
      "status.paused": "\u0110\xE3 t\u1EA1m d\u1EEBng",
      "statusFilter.all": "T\u1EA5t c\u1EA3",
      "statusFilter.label": "Tr\u1EA1ng th\xE1i t\xE1c v\u1EE5",
      "time.locale": "en",
      "time.utcPrefix": "UTC",
      "timing.date": "Ng\xE0y",
      "timing.hour": "Gi\u1EDD",
      "timing.intervalDecrease": "Gi\u1EA3m kho\u1EA3ng th\u1EDDi gian",
      "timing.intervalIncrease": "T\u0103ng kho\u1EA3ng th\u1EDDi gian",
      "timing.minute": "Ph\xFAt",
      "timing.nextMonth": "Th\xE1ng sau",
      "timing.prevMonth": "Th\xE1ng tr\u01B0\u1EDBc",
      "timing.second": "Gi\xE2y",
      "timing.time": "Gi\u1EDD",
      "timing.zone": "M\xFAi gi\u1EDD",
      "timing.zoneNoResults": "Kh\xF4ng c\xF3 m\xFAi gi\u1EDD kh\u1EDBp",
      "timing.zoneSearch": "T\xECm theo \u0111\u1ED9 l\u1EC7ch UTC, m\xE3 IANA ho\u1EB7c th\xE0nh ph\u1ED1",
      "title": "T\xE1c v\u1EE5 t\u1EF1 \u0111\u1ED9ng h\xF3a",
      "toast.cleared.one": "\u0110\xE3 x\xF3a {count} t\xE1c v\u1EE5 \u0111\xE3 k\u1EBFt th\xFAc.",
      "toast.cleared.other": "\u0110\xE3 x\xF3a {count} t\xE1c v\u1EE5 \u0111\xE3 k\u1EBFt th\xFAc.",
      "toast.clearedNone": "Kh\xF4ng c\xF3 t\xE1c v\u1EE5 \u0111\xE3 k\u1EBFt th\xFAc \u0111\u1EC3 x\xF3a.",
      "toast.clearFailed": "Kh\xF4ng th\u1EC3 x\xF3a c\xE1c t\xE1c v\u1EE5.",
      "toast.deleted": "\u0110\xE3 x\xF3a t\xE1c v\u1EE5.",
      "toast.deleteFailed": "Kh\xF4ng th\u1EC3 x\xF3a t\xE1c v\u1EE5.",
      "unit.day.one": "ng\xE0y",
      "unit.day.other": "ng\xE0y",
      "unit.hour.one": "gi\u1EDD",
      "unit.hour.other": "gi\u1EDD",
      "unit.minute.one": "ph\xFAt",
      "unit.minute.other": "ph\xFAt",
      "unit.second.one": "gi\xE2y",
      "unit.second.other": "gi\xE2y"
    },
    "secretMask": {
      "secret.hide": "\u1EA8n b\xED m\u1EADt",
      "secret.reveal": "Hi\u1EC7n b\xED m\u1EADt"
    },
    "session-inspector": {
      "filter.apply": "\xC1p d\u1EE5ng b\u1ED9 l\u1ECDc",
      "filter.cancel": "H\u1EE7y",
      "filter.candidates": "G\u1EE3i \xFD lo\u1EA1i",
      "filter.clear": "X\xF3a",
      "filter.context": "Ng\u1EEF c\u1EA3nh cha c\u1EE7a b\u1EA3n ghi kh\u1EDBp",
      "filter.failed": "Kh\xF4ng th\u1EC3 t\u1EA3i g\u1EE3i \xFD lo\u1EA1i.",
      "filter.help": "Kh\u1EDBp theo ch\u1EE9a (*keyword*). Enter \u0111\u1EC3 x\xE1c nh\u1EADn; Esc \u0111\u1EC3 h\u1EE7y.",
      "filter.input": "Nh\u1EADp t\u1EEB kh\xF3a",
      "filter.loading": "\u0110ang t\xECm g\u1EE3i \xFD\u2026",
      "filter.noCandidates": "Kh\xF4ng c\xF3 g\u1EE3i \xFD. B\u1EA1n v\u1EABn c\xF3 th\u1EC3 \xE1p d\u1EE5ng t\u1EEB kh\xF3a n\xE0y.",
      "filter.placeholder": "Nh\u1EADp m\u1ED9t \u0111o\u1EA1n, v\xED d\u1EE5: delta",
      "filter.title": "L\u1ECDc theo lo\u1EA1i",
      "object.absent": "[V\u1ECB tr\xED tr\u1ED1ng]",
      "object.accessor": "[Getter / setter, ch\u01B0a \u0111\u01B0\u1EE3c \u0111\xE1nh gi\xE1]",
      "object.empty": "Tr\u1ED1ng",
      "object.group": "Nh\xF3m",
      "object.groupData": "D\u1EEF li\u1EC7u nh\xF3m",
      "object.more": "Hi\u1EC7n th\xEAm",
      "object.navigation": "\u0110i\u1EC1u h\u01B0\u1EDBng d\u1EEF li\u1EC7u th\xF4",
      "object.node": "N\xFAt",
      "object.nodeData": "D\u1EEF li\u1EC7u n\xFAt",
      "object.properties": "Thu\u1ED9c t\xEDnh kh\xE1c",
      "object.step": "B\u01B0\u1EDBc",
      "object.stepData": "D\u1EEF li\u1EC7u b\u01B0\u1EDBc",
      "object.turn": "L\u01B0\u1EE3t",
      "object.turnData": "D\u1EEF li\u1EC7u l\u01B0\u1EE3t",
      "picker.cancel": "H\u1EE7y ch\u1ECDn (Esc)",
      "picker.instructions": "Di chu\u1ED9t trong chat ch\xEDnh \u0111\u1EC3 xem tr\u01B0\u1EDBc, r\u1ED3i nh\u1EA5p \u0111\u1EC3 ch\u1ECDn. Esc \u0111\u1EC3 h\u1EE7y.",
      "picker.noChat": "M\u1EDF phi\xEAn n\xE0y trong chat ch\xEDnh tr\u01B0\u1EDBc khi ch\u1ECDn.",
      "picker.noMatch": "Kh\xF4ng c\xF3 b\u1EA3n ghi kh\u1EDBp trong b\u1EA3ng n\xE0y. H\xE3y ch\u1ECDn ph\u1EA7n t\u1EED kh\xE1c ho\u1EB7c nh\u1EA5n Esc \u0111\u1EC3 h\u1EE7y.",
      "picker.pick": "Ch\u1ECDn m\u1ED9t ph\u1EA7n t\u1EED trong ch\u1EBF \u0111\u1ED9 xem chat",
      "tab.description": "Ph\xE2n t\xEDch nh\u1EADt k\xFD th\xF4 v\xE0 tin nh\u1EAFn chat \u0111\xE3 nh\xF3m c\u1EE7a phi\xEAn hi\u1EC7n t\u1EA1i trong thanh b\xEAn.",
      "tab.title": "Nh\u1EADt k\xFD phi\xEAn",
      "table.close": "\u0110\xF3ng",
      "table.collapse": "Thu g\u1ECDn c\xE1c m\u1EE5c con",
      "table.data": "D\u1EEF li\u1EC7u",
      "table.empty": "Kh\xF4ng c\xF3 b\u1EA3n ghi",
      "table.expand": "M\u1EDF r\u1ED9ng c\xE1c m\u1EE5c con",
      "table.id": "Ch\u1EC9 s\u1ED1",
      "table.latest": "Theo d\xF5i m\u1EDBi nh\u1EA5t",
      "table.loading": "\u0110ang t\u1EA3i\u2026",
      "table.location": "T/S",
      "table.older": "T\u1EA3i ph\u1EA7n tr\u01B0\u1EDBc",
      "table.raw": "D\u1EEF li\u1EC7u th\xF4",
      "table.rawError": "Kh\xF4ng th\u1EC3 chuy\u1EC3n \u0111\u1ED5i b\u1EA3n ghi n\xE0y. H\xE3y ch\u1ECDn b\u1EA3n ghi kh\xE1c \u0111\u1EC3 ti\u1EBFp t\u1EE5c.",
      "table.removed": "B\u1EA3n ghi n\xE0y \u0111\xE3 b\u1ECB x\xF3a ho\u1EB7c k\u1EBFt th\xFAc. H\xE3y ch\u1ECDn b\u1EA3n ghi hi\u1EC7n t\u1EA1i.",
      "table.resizeDetails": "\u0110\u1ED5i k\xEDch th\u01B0\u1EDBc b\u1EA3ng d\u1EEF li\u1EC7u th\xF4",
      "table.time": "Th\u1EDDi gian (UTC)",
      "table.type": "Lo\u1EA1i",
      "view.chatNode": "Nh\xF3m chat",
      "view.presentation": "C\xE1ch hi\u1EC3n th\u1ECB",
      "view.sessionLog": "Nh\u1EADt k\xFD th\xF4"
    },
    "session-log-download": {
      "dialog.close": "\u0110\xF3ng",
      "dialog.commandFailed": "Kh\xF4ng th\u1EC3 b\u1EAFt \u0111\u1EA7u xu\u1EA5t phi\xEAn.",
      "dialog.errorTitle": "Xu\u1EA5t phi\xEAn th\u1EA5t b\u1EA1i",
      "dialog.preparingDescription": "\u0110ang chu\u1EA9n b\u1ECB t\u1EC7p ZIP ch\u1EE9a phi\xEAn \u0111\xE3 ch\u1ECDn, c\xE1c phi\xEAn con v\xE0 t\u1EC7p \u0111\xEDnh k\xE8m.",
      "dialog.preparingTitle": "\u0110ang xu\u1EA5t phi\xEAn",
      "dialog.session": "Phi\xEAn: {sessionId}",
      "dialog.successDescription": "Tr\xECnh duy\u1EC7t \u0111ang t\u1EA3i t\u1EC7p ZIP c\u1EE7a phi\xEAn.",
      "dialog.successTitle": "\u0110\xE3 b\u1EAFt \u0111\u1EA7u t\u1EA3i phi\xEAn",
      "menu.copyMarkdown": "Sao ch\xE9p phi\xEAn d\u01B0\u1EDBi d\u1EA1ng Markdown",
      "menu.download": "T\u1EA3i nh\u1EADt k\xFD phi\xEAn",
      "menu.feedback": "Ph\u1EA3n h\u1ED3i",
      "toast.clipboardFailed": "Kh\xF4ng th\u1EC3 ghi v\xE0o clipboard. H\xE3y ki\u1EC3m tra quy\u1EC1n clipboard v\xE0 th\u1EED l\u1EA1i.",
      "toast.copied": "\u0110\xE3 sao ch\xE9p phi\xEAn d\u01B0\u1EDBi d\u1EA1ng Markdown.",
      "toast.preparationFailed": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc phi\xEAn \u0111\u1EC3 sao ch\xE9p. H\xE3y th\u1EED l\u1EA1i."
    },
    "settings": {
      "close": "\u0110\xF3ng",
      "connection.connected": "\u0110\xE3 k\u1EBFt n\u1ED1i",
      "connection.connecting": "\u0110ang k\u1EBFt n\u1ED1i l\u1EA1i",
      "connection.error": "\u0110\xE3 ng\u1EAFt k\u1EBFt n\u1ED1i",
      "connection.reconnect": "\u0110\xE3 ng\u1EAFt k\u1EBFt n\u1ED1i, k\u1EBFt n\u1ED1i l\u1EA1i ngay",
      "connection.restart": "\u0110ang k\u1EBFt n\u1ED1i l\u1EA1i, k\u1EBFt n\u1ED1i l\u1EA1i ngay",
      "desktop.channel.description": "Stable ph\xF9 h\u1EE3p cho s\u1EED d\u1EE5ng h\u1EB1ng ng\xE0y. Development cung c\u1EA5p quy\u1EC1n d\xF9ng s\u1EDBm c\xE1c t\xEDnh n\u0103ng m\u1EDBi nh\u01B0ng c\xF3 th\u1EC3 kh\xF4ng \u1ED5n \u0111\u1ECBnh.",
      "desktop.channel.details": "Xem chi ti\u1EBFt",
      "desktop.channel.error": "Kh\xF4ng th\u1EC3 \xE1p d\u1EE5ng c\xE0i \u0111\u1EB7t c\u1EADp nh\u1EADt. M\u1EDF ch\u1EC9 b\xE1o c\u1EADp nh\u1EADt tr\xEAn desktop \u0111\u1EC3 xem chi ti\u1EBFt.",
      "desktop.channel.nightly": "Development",
      "desktop.channel.readError": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc k\xEAnh c\u1EADp nh\u1EADt. Kh\u1EDFi \u0111\u1ED9ng l\u1EA1i \u1EE9ng d\u1EE5ng.",
      "desktop.channel.result.applied": "\u0110\xE3 thay \u0111\u1ED5i k\xEAnh c\u1EADp nh\u1EADt",
      "desktop.channel.result.apply": "L\u1ED7i l\u01B0u c\xE0i \u0111\u1EB7t",
      "desktop.channel.result.configuration": "L\u1ED7i t\u1EC7p c\xE0i \u0111\u1EB7t; qu\xE1 tr\xECnh c\u1EADp nh\u1EADt \u0111\xE3 t\u1EA1m d\u1EEBng",
      "desktop.channel.result.format": "Kh\xF4ng th\u1EC3 l\u01B0u: t\u1EC7p c\xE0i \u0111\u1EB7t kh\xF4ng h\u1EE3p l\u1EC7",
      "desktop.channel.result.permission": "Kh\xF4ng th\u1EC3 l\u01B0u: quy\u1EC1n b\u1ECB t\u1EEB ch\u1ED1i",
      "desktop.channel.result.save": "Kh\xF4ng th\u1EC3 l\u01B0u",
      "desktop.channel.result.uncertain": "L\u1ED7i l\u01B0u c\xE0i \u0111\u1EB7t",
      "desktop.channel.stable": "Stable",
      "desktop.channel.title": "K\xEAnh c\u1EADp nh\u1EADt",
      "desktop.channel.unavailable": "Kh\xF4ng th\u1EC3 l\u1EA5y c\u1EA5u h\xECnh",
      "desktop.update.available": "C\u1EADp nh\u1EADt",
      "desktop.update.checkFailed": "Kh\xF4ng th\u1EC3 ki\u1EC3m tra c\u1EADp nh\u1EADt. Vui l\xF2ng th\u1EED l\u1EA1i sau.",
      "desktop.update.checking": "\u0110ang ki\u1EC3m tra c\u1EADp nh\u1EADt\u2026",
      "desktop.update.checkNetworkFailed": "Kh\xF4ng th\u1EC3 ki\u1EC3m tra c\u1EADp nh\u1EADt. Ki\u1EC3m tra k\u1EBFt n\u1ED1i v\xE0 th\u1EED l\u1EA1i.",
      "desktop.update.configuration.channel": "C\u1EADp nh\u1EADt \u0111\xE3 t\u1EA1m d\u1EEBng: k\xEAnh ph\u1EA3i l\xE0 nightly ho\u1EB7c stable",
      "desktop.update.configuration.cleanup": "C\u1EADp nh\u1EADt \u0111\xE3 t\u1EA1m d\u1EEBng: kh\xF4ng th\u1EC3 h\u1EE7y b\u1EA3n c\u1EADp nh\u1EADt tr\u01B0\u1EDBc; kh\u1EDFi \u0111\u1ED9ng l\u1EA1i \u1EE9ng d\u1EE5ng",
      "desktop.update.configuration.format": "C\u1EADp nh\u1EADt \u0111\xE3 t\u1EA1m d\u1EEBng: t\u1EC7p c\xE0i \u0111\u1EB7t kh\xF4ng h\u1EE3p l\u1EC7",
      "desktop.update.configuration.read": "C\u1EADp nh\u1EADt \u0111\xE3 t\u1EA1m d\u1EEBng: kh\xF4ng th\u1EC3 \u0111\u1ECDc t\u1EC7p c\xE0i \u0111\u1EB7t",
      "desktop.update.configurationFailed": "Kh\xF4ng th\u1EC3 \xE1p d\u1EE5ng c\xE0i \u0111\u1EB7t c\u1EADp nh\u1EADt. M\u1EDF ch\u1EC9 b\xE1o c\u1EADp nh\u1EADt tr\xEAn desktop \u0111\u1EC3 xem chi ti\u1EBFt.",
      "desktop.update.downloadBusyFailed": "M\u1ED9t t\u1EC7p c\u1EADp nh\u1EADt \u0111ang \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng. \u0110\xF3ng ch\u01B0\u01A1ng tr\xECnh \u0111ang d\xF9ng t\u1EC7p \u0111\xF3 r\u1ED3i th\u1EED l\u1EA1i.",
      "desktop.update.downloadDetail": "\u0110ang t\u1EA3i b\u1EA3n c\u1EADp nh\u1EADt: {percent}%\nPhi\xEAn b\u1EA3n \u0111\xEDch: {version}",
      "desktop.update.downloadFailed": "Kh\xF4ng th\u1EC3 t\u1EA3i b\u1EA3n c\u1EADp nh\u1EADt. Vui l\xF2ng th\u1EED l\u1EA1i.",
      "desktop.update.downloadNetworkFailed": "Kh\xF4ng th\u1EC3 t\u1EA3i b\u1EA3n c\u1EADp nh\u1EADt. Ki\u1EC3m tra k\u1EBFt n\u1ED1i v\xE0 th\u1EED l\u1EA1i.",
      "desktop.update.downloadPermissionFailed": "Kh\xF4ng th\u1EC3 ghi c\xE1c t\u1EC7p c\u1EADp nh\u1EADt. Ki\u1EC3m tra quy\u1EC1n c\u1EE7a th\u01B0 m\u1EE5c r\u1ED3i th\u1EED l\u1EA1i.",
      "desktop.update.downloadSpaceFailed": "Kh\xF4ng \u0111\u1EE7 dung l\u01B0\u1EE3ng \u0111\u0129a \u0111\u1EC3 t\u1EA3i b\u1EA3n c\u1EADp nh\u1EADt. Gi\u1EA3i ph\xF3ng dung l\u01B0\u1EE3ng r\u1ED3i th\u1EED l\u1EA1i.",
      "desktop.update.fullscreenTimeout": "Kh\xF4ng th\u1EC3 tho\xE1t ch\u1EBF \u0111\u1ED9 to\xE0n m\xE0n h\xECnh. Tho\xE1t to\xE0n m\xE0n h\xECnh r\u1ED3i th\u1EED l\u1EA1i c\u1EADp nh\u1EADt.",
      "desktop.update.installFailed": "Kh\xF4ng th\u1EC3 c\xE0i \u0111\u1EB7t b\u1EA3n c\u1EADp nh\u1EADt. Vui l\xF2ng th\u1EED l\u1EA1i sau.",
      "desktop.update.installing": "\u0110ang chu\u1EA9n b\u1ECB kh\u1EDFi \u0111\u1ED9ng l\u1EA1i\u2026",
      "desktop.update.installNetworkFailed": "Kh\xF4ng th\u1EC3 c\xE0i \u0111\u1EB7t b\u1EA3n c\u1EADp nh\u1EADt. Ki\u1EC3m tra k\u1EBFt n\u1ED1i v\xE0 th\u1EED l\u1EA1i.",
      "desktop.update.progress": "{percent}%",
      "desktop.update.ready": "C\xE0i \u0111\u1EB7t v\xE0 kh\u1EDFi \u0111\u1ED9ng l\u1EA1i",
      "desktop.update.retry": "Th\u1EED l\u1EA1i c\u1EADp nh\u1EADt",
      "desktop.update.stopFailed": "Kh\xF4ng th\u1EC3 d\u1EEBng c\xE1c t\xE1c v\u1EE5 m\u1ED9t c\xE1ch an to\xE0n. B\u1EA3n c\u1EADp nh\u1EADt ch\u01B0a \u0111\u01B0\u1EE3c c\xE0i \u0111\u1EB7t. Vui l\xF2ng th\u1EED l\u1EA1i sau.",
      "desktop.update.tasksChanged": "\u0110\xE3 c\xF3 t\xE1c v\u1EE5 m\u1EDBi b\u1EAFt \u0111\u1EA7u. X\xE1c nh\u1EADn l\u1EA1i \u0111\u1EC3 d\u1EEBng c\xE1c t\xE1c v\u1EE5 v\xE0 c\u1EADp nh\u1EADt.",
      "desktop.update.tasksUnavailable": "Kh\xF4ng c\xF3 tr\u1EA1ng th\xE1i t\xE1c v\u1EE5. Th\u1EED c\u1EADp nh\u1EADt l\u1EA1i khi workspace \u0111\xE3 s\u1EB5n s\xE0ng.",
      "desktop.update.verifying": "\u0110ang x\xE1c minh t\u1EC7p c\u1EADp nh\u1EADt\u2026",
      "desktop.update.versionDetail": "{label}: {version}",
      "developerTools.description": "Hi\u1EC7n qu\u1EF9 \u0111\u1EA1o, diff m\xE3 v\xE0 t\u1EA5t c\u1EA3 preset Agent",
      "developerTools.error": "Kh\xF4ng th\u1EC3 l\u01B0u. Vui l\xF2ng th\u1EED l\u1EA1i.",
      "developerTools.title": "Hi\u1EC7n ch\u1EBF \u0111\u1ED9 xem l\u1EADp tr\xECnh",
      "general.currentVersion": "Phi\xEAn b\u1EA3n hi\u1EC7n t\u1EA1i: {version}",
      "general.nav": "Chung",
      "hostRelease.description": "Phi\xEAn b\u1EA3n d\u1ECBch v\u1EE5 \u0111\xE3 thay \u0111\u1ED5i. Trang n\xE0y \u0111\xE3 t\u1EA1m d\u1EEBng c\u1EADp nh\u1EADt tr\u1EF1c ti\u1EBFp; t\u1EA3i l\u1EA1i \u0111\u1EC3 n\u1EA1p phi\xEAn b\u1EA3n m\u1EDBi.",
      "hostRelease.later": "\u0110\u1EC3 sau",
      "hostRelease.page": "Trang",
      "hostRelease.reload": "T\u1EA3i l\u1EA1i \u0111\u1EC3 n\u1EA1p phi\xEAn b\u1EA3n m\u1EDBi",
      "hostRelease.service": "D\u1ECBch v\u1EE5",
      "hostRelease.title": "Phi\xEAn b\u1EA3n d\u1ECBch v\u1EE5 \u0111\xE3 thay \u0111\u1ED5i",
      "hostRelease.unknown": "Kh\xF4ng r\xF5",
      "openDocument": "M\u1EDF t\u1EC7p c\u1EA5u h\xECnh",
      "openDocument.error": "Kh\xF4ng th\u1EC3 m\u1EDF t\u1EC7p c\u1EA5u h\xECnh",
      "shortcut.open": "M\u1EDF c\xE0i \u0111\u1EB7t",
      "title": "C\xE0i \u0111\u1EB7t",
      "trigger": "C\xE0i \u0111\u1EB7t"
    },
    "settings.account": {
      "accountInfo": "Th\xF4ng tin t\xE0i kho\u1EA3n kh\xE1c",
      "addApiKey": "Th\xEAm API Key",
      "backToHarness": "Quay l\u1EA1i DeepSeek Harness",
      "balance": "S\u1ED1 d\u01B0 \u0111\xE3 n\u1EA1p",
      "balanceSignedOut": "\u0110\u0103ng nh\u1EADp \u0111\u1EC3 xem",
      "balanceUnavailable": "Xem tr\xEAn Platform",
      "bonusBalance": "S\u1ED1 d\u01B0 \u0111\u01B0\u1EE3c c\u1EA5p",
      "browserDescription": ", r\u1ED3i m\u1EDF trong tr\xECnh duy\u1EC7t \u0111\u1EC3 ho\xE0n t\u1EA5t \u0111\u0103ng nh\u1EADp.",
      "browserPrompt": "Trang kh\xF4ng t\u1EF1 m\u1EDF? ",
      "browserTitle": "\u0110ang ch\u1EDD \u0111\u0103ng nh\u1EADp",
      "cancel": "H\u1EE7y",
      "close": "\u0110\xF3ng",
      "completing": "\u0110ang ho\xE0n t\u1EA5t \u0111\u0103ng nh\u1EADp\u2026",
      "contactUs": "Ph\u1EA3n h\u1ED3i",
      "copiedLink": "\u0110\xE3 sao ch\xE9p li\xEAn k\u1EBFt",
      "copyFailed": "Sao ch\xE9p th\u1EA5t b\u1EA1i",
      "copyLink": "Sao ch\xE9p li\xEAn k\u1EBFt \u0111\u0103ng nh\u1EADp",
      "expired": "\u0110\u0103ng nh\u1EADp \u0111\xE3 h\u1EBFt h\u1EA1n. Th\u1EED l\u1EA1i.",
      "failed": "Kh\xF4ng th\u1EC3 ho\xE0n t\u1EA5t thao t\xE1c. Th\u1EED l\u1EA1i.",
      "failureTitle": "Kh\xF4ng th\u1EC3 \u0111\u0103ng nh\u1EADp",
      "initializing": "\u0110ang b\u1EAFt \u0111\u1EA7u \u0111\u0103ng nh\u1EADp\u2026",
      "loading": "\u0110ang t\u1EA3i\u2026",
      "loginDescription": "\u0110\u0103ng nh\u1EADp t\xE0i kho\u1EA3n DeepSeek ho\u1EB7c th\xEAm API Key \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u. D\u1EF1 \xE1n v\xE0 t\u1EC7p c\u1EE7a b\u1EA1n \u0111\u01B0\u1EE3c l\u01B0u c\u1EE5c b\u1ED9.",
      "loginTitle": "B\u1EAFt \u0111\u1EA7u",
      "menu": "Menu t\xE0i kho\u1EA3n",
      "modelSignInRequired": "Model kh\xF4ng kh\u1EA3 d\u1EE5ng. Vui l\xF2ng \u0111\u0103ng nh\u1EADp v\xE0 th\u1EED l\u1EA1i.",
      "more": "Th\xEAm",
      "nav": "T\xE0i kho\u1EA3n",
      "noResponse": "\u0110\xE3 x\u1EA3y ra l\u1ED7i. Vui l\xF2ng ki\u1EC3m tra k\u1EBFt n\u1ED1i m\u1EA1ng v\xE0 th\u1EED l\u1EA1i.",
      "onboardingArtworkLocale": "en",
      "onboardingBack": "Quay l\u1EA1i",
      "onboardingBrand": "DeepSeek Harness",
      "onboardingCompact": "Ch\u1EC9 k\u1EBFt qu\u1EA3",
      "onboardingCompactDescription": "Ch\u1EC9 xem k\u1EBFt qu\u1EA3 trong giao di\u1EC7n g\u1ECDn g\xE0ng, \u0111\u01A1n gi\u1EA3n",
      "onboardingContinue": "Ti\u1EBFp t\u1EE5c",
      "onboardingCredit": "Th\xEAm credit",
      "onboardingCreditDescription": "DeepSeek Harness t\xEDnh credit d\u1EF1a tr\xEAn token m\xE0 model v\xE0 c\xF4ng c\u1EE5 s\u1EED d\u1EE5ng. H\xE3y th\xEAm credit tr\u01B0\u1EDBc \u0111\u1EC3 t\xE1c v\u1EE5 ch\u1EA1y li\xEAn t\u1EE5c kh\xF4ng b\u1ECB gi\xE1n \u0111o\u1EA1n. S\u1ED1 d\u01B0 c\u1EE7a b\u1EA1n ch\u1EC9 \u0111\u01B0\u1EE3c d\xF9ng khi agent \u0111ang l\xE0m vi\u1EC7c tr\xEAn m\u1ED9t t\xE1c v\u1EE5.",
      "onboardingDetailed": "\u0110\u1EA7y \u0111\u1EE7 chi ti\u1EBFt",
      "onboardingDetailedDescription": "Xem to\xE0n b\u1ED9 quy tr\xECnh \u0111\u1EC3 d\u1EC5 g\u1EE1 l\u1ED7i v\xE0 kh\u1EAFc ph\u1EE5c s\u1EF1 c\u1ED1",
      "onboardingDevelopment": "L\u1EADp tr\xECnh & ph\xE1t tri\u1EC3n",
      "onboardingDevelopmentDescription": "S\u1EEDa m\xE3, g\u1EE1 l\u1ED7i, ch\u1EA1y l\u1EC7nh, qu\u1EA3n l\xFD t\u1EC7p d\u1EF1 \xE1n, v.v.",
      "onboardingEnter": "M\u1EDF \u1EE9ng d\u1EE5ng",
      "onboardingFundedTopUp": "Th\xEAm credit",
      "onboardingGoTopUp": "Th\xEAm credit",
      "onboardingIntroduction": "DeepSeek Harness l\xE0m vi\u1EC7c trong m\u1ED9t th\u01B0 m\u1EE5c c\u1EE5c b\u1ED9 v\xE0 d\xF9ng c\xF4ng c\u1EE5 \u0111\u1EC3 \u0111\u1ECDc, ghi t\u1EC7p tr\xEAn m\xE1y t\xEDnh c\u1EE7a b\u1EA1n. N\xF3 c\xF3 th\u1EC3 gi\xFAp b\u1EA1n nghi\xEAn c\u1EE9u v\xE0 s\u1EAFp x\u1EBFp th\xF4ng tin, t\u1EA1o t\xE0i li\u1EC7u v\xE0 b\u1EA3ng t\xEDnh, vi\u1EBFt m\xE3, kh\u1EAFc ph\u1EE5c s\u1EF1 c\u1ED1, v.v.",
      "onboardingKeepSetting": "Ti\u1EBFp t\u1EE5c thi\u1EBFt l\u1EADp",
      "onboardingLater": "Ti\u1EBFp theo",
      "onboardingLoading": "\u0110ang t\u1EA3i c\xE0i \u0111\u1EB7t\u2026",
      "onboardingNoCreditDescription": "DeepSeek Harness kh\xF4ng th\u1EC3 b\u1EAFt \u0111\u1EA7u t\xE1c v\u1EE5 m\u1EDBi n\u1EBFu kh\xF4ng c\xF3 credit. B\u1EA1n c\xF3 th\u1EC3 th\xEAm sau trong C\xE0i \u0111\u1EB7t \u2192 T\xE0i kho\u1EA3n.",
      "onboardingNoCreditTitle": "B\u1ECF qua th\xEAm credit?",
      "onboardingOffice": "V\u0103n ph\xF2ng & c\xF4ng vi\u1EC7c s\xE1ng t\u1EA1o",
      "onboardingOfficeDescription": "Ch\u1EC9nh s\u1EEDa t\xE0i li\u1EC7u, s\u1EAFp x\u1EBFp d\u1EEF li\u1EC7u, t\u1EA1o b\xE0i thuy\u1EBFt tr\xECnh, v.v.",
      "onboardingProcess": "B\u1EA1n mu\u1ED1n xem chi ti\u1EBFt \u0111\u1EBFn m\u1EE9c n\xE0o?",
      "onboardingProcessDescription": "\u0110i\u1EC1u n\xE0y ch\u1EC9 thay \u0111\u1ED5i c\xE1ch hi\u1EC3n th\u1ECB ti\u1EBFn tr\xECnh, kh\xF4ng thay \u0111\u1ED5i nh\u1EEFng g\xEC DeepSeek Harness c\xF3 th\u1EC3 l\xE0m.",
      "onboardingPurposeDescription": "Ch\xFAng t\xF4i s\u1EBD \u0111i\u1EC1u ch\u1EC9nh giao di\u1EC7n v\xE0 c\xF4ng c\u1EE5 cho ph\xF9 h\u1EE3p v\u1EDBi c\xE1ch b\u1EA1n l\xE0m vi\u1EC7c.",
      "onboardingPurposePrefix": "B\u1EA1n mu\u1ED1n",
      "onboardingPurposeSuffix": "gi\xFAp vi\u1EC7c g\xEC?",
      "onboardingRetry": "Th\u1EED l\u1EA1i",
      "onboardingSaveFailed": "Kh\xF4ng th\u1EC3 l\u01B0u c\xE0i \u0111\u1EB7t. Th\u1EED l\u1EA1i.",
      "onboardingSkip": "B\u1ECF qua",
      "onboardingSkipDescription": "B\u1EA1n c\xF3 th\u1EC3 thay \u0111\u1ED5i c\xE1ch hi\u1EC3n th\u1ECB ti\u1EBFn tr\xECnh, hi\u1EC7u n\u0103ng v\xE0 m\u1EE9c s\u1EED d\u1EE5ng, ho\u1EB7c b\u1EADt Coding Tools, b\u1EA5t c\u1EE9 l\xFAc n\xE0o trong C\xE0i \u0111\u1EB7t \u2192 Chung.",
      "onboardingSkipTitle": "B\u1ECF qua thi\u1EBFt l\u1EADp?",
      "onboardingStandard": "Chi ti\u1EBFt ch\xEDnh",
      "onboardingStandardDescription": "T\u1EADp trung v\xE0o k\u1EBFt qu\u1EA3, ch\u1EC9 hi\u1EC3n th\u1ECB nh\u1EEFng b\u01B0\u1EDBc v\xE0 h\xE0nh \u0111\u1ED9ng quan tr\u1ECDng nh\u1EA5t",
      "onboardingStart": "B\u1EAFt \u0111\u1EA7u",
      "onboardingTopUp": "Th\xEAm credit",
      "onboardingUnderstood": "\u0110\xE3 hi\u1EC3u",
      "onboardingWelcome": "Ch\xE0o m\u1EEBng \u0111\u1EBFn v\u1EDBi",
      "open": "M\u1EDF tr\xECnh duy\u1EC7t",
      "platformFailed": "Kh\xF4ng th\u1EC3 ho\xE0n t\u1EA5t thao t\xE1c. Th\u1EED l\u1EA1i.",
      "platformRetry": "Th\u1EED l\u1EA1i",
      "profileUnavailable": "Th\xF4ng tin t\xE0i kho\u1EA3n ch\u01B0a c\xF3.",
      "quotaDescription": "DeepSeek Harness kh\xF4ng th\u1EC3 b\u1EAFt \u0111\u1EA7u t\xE1c v\u1EE5 m\u1EDBi v\u1EDBi t\xE0i kho\u1EA3n n\xE0y khi kh\xF4ng c\xF3 s\u1ED1 d\u01B0. B\u1EA1n c\xF3 mu\u1ED1n n\u1EA1p credit? B\u1EA1n c\u0169ng c\xF3 th\u1EC3 n\u1EA1p sau trong C\xE0i \u0111\u1EB7t \u2192 T\xE0i kho\u1EA3n.",
      "quotaTitle": "Kh\xF4ng c\xF3 s\u1ED1 d\u01B0",
      "quotaTopUp": "N\u1EA1p credit",
      "retry": "\u0110\u0103ng nh\u1EADp l\u1EA1i",
      "sessionExpired": "B\u1EA1n \u0111\xE3 \u0111\u0103ng xu\u1EA5t kh\u1ECFi t\xE0i kho\u1EA3n, vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i.",
      "settings": "C\xE0i \u0111\u1EB7t",
      "settingsSignedOutDescription": "\u0110\u0103ng nh\u1EADp DeepSeek Harness \u0111\u1EC3 nh\u1EADn API Key ri\xEAng c\u1EE7a b\u1EA1n",
      "settingsSignedOutTitle": "B\u1EA1n ch\u01B0a \u0111\u0103ng nh\u1EADp DeepSeek Harness",
      "signedIn": "\u0110\xE3 \u0111\u0103ng nh\u1EADp DeepSeek",
      "signedOut": "Ch\u01B0a \u0111\u0103ng nh\u1EADp",
      "signIn": "\u0110\u0103ng nh\u1EADp",
      "signInDescription": "D\xF9ng t\xE0i kho\u1EA3n DeepSeek \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u.",
      "signOut": "\u0110\u0103ng xu\u1EA5t",
      "signOutDescription": "\u0110\u0103ng xu\u1EA5t s\u1EBD kh\xF4ng x\xF3a d\u1EEF li\u1EC7u n\xE0o. B\u1EA1n c\xF3 th\u1EC3 \u0111\u0103ng nh\u1EADp l\u1EA1i v\xE0o t\xE0i kho\u1EA3n n\xE0y.",
      "signOutRunningDescription": "Hi\u1EC7n c\xF3 t\xE1c v\u1EE5 \u0111ang ch\u1EA1y. \u0110\u0103ng xu\u1EA5t s\u1EBD l\xE0m gi\xE1n \u0111o\u1EA1n ch\xFAng. \u0110\u0103ng xu\u1EA5t ngay?",
      "signOutUnknownDescription": "Kh\xF4ng th\u1EC3 ki\u1EC3m tra t\xE1c v\u1EE5 \u0111ang ch\u1EA1y. \u0110\u0103ng xu\u1EA5t c\xF3 th\u1EC3 l\xE0m gi\xE1n \u0111o\u1EA1n c\xE1c t\xE1c v\u1EE5 d\xF9ng t\xE0i kho\u1EA3n n\xE0y. \u0110\u0103ng xu\u1EA5t ngay?",
      "timeoutDescription": "\u0110\u0103ng nh\u1EADp l\u1EA1i \u0111\u1EC3 ti\u1EBFp t\u1EE5c.",
      "timeoutTitle": "\u0110\u0103ng nh\u1EADp \u0111\xE3 h\u1EBFt th\u1EDDi gian",
      "topUp": "N\u1EA1p credit",
      "usage": "Xem m\u1EE9c s\u1EED d\u1EE5ng",
      "waiting": "Ti\u1EBFp t\u1EE5c trong tr\xECnh duy\u1EC7t"
    },
    "settings.agentLoop": {
      "description": "Ki\u1EC3m so\xE1t c\xE1ch Agent \u0111i\u1EC1u ph\u1ED1i c\xE1c l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5.",
      "invalidNumber": "Nh\u1EADp m\u1ED9t s\u1ED1 ho\u1EB7c \u0111\u1EC3 tr\u1ED1ng \u0111\u1EC3 d\xF9ng m\u1EB7c \u0111\u1ECBnh.",
      "maxParallel": "L\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 song song",
      "maxParallelHint": "Gi\u1EDBi h\u1EA1n tr\xEAn s\u1ED1 l\u1EC7nh g\u1ECDi an to\xE0n song song ch\u1EA1y \u0111\u1ED3ng th\u1EDDi trong m\u1ED9t b\u01B0\u1EDBc.",
      "overridden": "\u0110\xE3 ghi \u0111\xE8",
      "readOnly": "Tri\u1EC3n khai n\xE0y l\u01B0u c\xE0i \u0111\u1EB7t \u1EDF ch\u1EBF \u0111\u1ED9 ch\u1EC9 \u0111\u1ECDc.",
      "reset": "\u0110\u1EB7t l\u1EA1i m\u1EB7c \u0111\u1ECBnh",
      "save": "L\u01B0u",
      "saveFailed": "Tri\u1EC3n khai kh\xF4ng ch\u1EA5p nh\u1EADn c\xE1c gi\xE1 tr\u1ECB n\xE0y; ch\xFAng \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i \u0111\u1EC3 b\u1EA1n s\u1EEDa.",
      "saving": "\u0110ang l\u01B0u\u2026",
      "title": "V\xF2ng l\u1EB7p agent",
      "unavailable": "Plugin n\xE0y ch\u01B0a \u0111\u01B0\u1EE3c n\u1EA1p n\xEAn hi\u1EC7n kh\xF4ng th\u1EC3 c\u1EA5u h\xECnh."
    },
    "settings.agentPreset": {
      "brokenBadge": "Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c",
      "builtInGroup": "T\xEDch h\u1EE3p s\u1EB5n",
      "close": "\u0110\xF3ng",
      "createPlugin": "\u0110\u1EC3 agent t\u1EA1o plugin",
      "createPluginChecking": "\u0110ang ki\u1EC3m tra ch\u1EBF \u0111\u1ED9 Creator c\xF3 kh\u1EA3 d\u1EE5ng kh\xF4ng",
      "createPluginDescription": "V\xE0o ch\u1EBF \u0111\u1ED9 Creator v\xE0 t\u1EA1o plugin DSH c\u1EE7a ri\xEAng b\u1EA1n",
      "createPluginMissing": "Ch\u1EBF \u0111\u1ED9 Creator kh\xF4ng c\xF3 trong c\u1EA5u h\xECnh n\xE0y",
      "createPluginUnavailable": "T\u1EA1m th\u1EDDi kh\xF4ng kh\u1EA3 d\u1EE5ng. M\u1EDF l\u1EA1i menu n\xE0y \u0111\u1EC3 th\u1EED l\u1EA1i",
      "creatorDraft": "\u0110\u1EC3 agent gi\xFAp t\xF4i t\u1EA1o preset",
      "customGroup": "T\xF9y ch\u1EC9nh",
      "guideCopied": "\u0110\xE3 sao ch\xE9p",
      "guideCopy": "Sao ch\xE9p",
      "guideCordisExplanation": "### B\u1EA1n c\xF3 th\u1EC3 t\u1EA1o g\xEC\n\nCh\u1EBF \u0111\u1ED9 Creator bao g\u1ED3m c\xE1c c\xF4ng c\u1EE5 t\xE1c v\u1EE5 chu\u1EA9n v\xE0 b\u1ED5 sung kh\u1EA3 n\u0103ng ki\u1EC3m tra runtime. Standard v\xE0 Creator d\xF9ng chung h\u01B0\u1EDBng d\u1EABn dsh-doc cho ph\xE1t tri\u1EC3n plugin v\xE0 preset. Agent c\xF3 th\u1EC3 t\u1EA1o plugin b\u1ED5 sung kh\u1EA3 n\u0103ng ho\u1EB7c giao di\u1EC7n, ho\u1EB7c m\u1ED9t preset k\u1EBFt h\u1EE3p c\xF4ng c\u1EE5 v\xE0 prompt cho m\u1ED9t c\xF4ng vi\u1EC7c c\u1EE5 th\u1EC3.\n\n### Plugin v\xE0 ch\u1EBF \u0111\u1ED9\n\nPlugin b\u1ED5 sung kh\u1EA3 n\u0103ng cho DSH, nh\u01B0 m\u1ED9t c\xF4ng c\u1EE5, k\u1EBFt n\u1ED1i d\u1ECBch v\u1EE5 ho\u1EB7c m\u1EE5c giao di\u1EC7n. Ch\u1EBF \u0111\u1ED9 l\xE0 m\u1ED9t preset agent ch\u1ECDn c\xF4ng c\u1EE5 v\xE0 \u0111\u1ECBnh ngh\u0129a c\xE1ch agent l\xE0m vi\u1EC7c trong t\xE1c v\u1EE5. M\u1ED9t plugin c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c \u0111\u01B0a v\xE0o preset t\xF9y ch\u1EC9nh.\n\n### C\xE1ch k\u1EBFt qu\u1EA3 c\xF3 hi\u1EC7u l\u1EF1c\n\nH\xE3y y\xEAu c\u1EA7u agent c\xE0i \u0111\u1EB7t v\xE0 x\xE1c minh k\u1EBFt qu\u1EA3, kh\xF4ng ch\u1EC9 t\u1EA1o m\xE3 ngu\u1ED3n. Plugin c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c n\u1EA1p ngay ho\u1EB7c c\u1EA7n kh\u1EDFi \u0111\u1ED9ng l\u1EA1i, t\xF9y v\xE0o nh\u1EEFng g\xEC n\xF3 thay \u0111\u1ED5i. Preset m\u1EDBi t\u1EA1o s\u1EBD \u0111\u01B0\u1EE3c ch\u1ECDn khi b\u1EAFt \u0111\u1EA7u t\xE1c v\u1EE5 m\u1EDBi.",
      "guideCordisIntro": "Ch\u1ECDn ch\u1EBF \u0111\u1ED9 Creator cho t\xE1c v\u1EE5 m\u1EDBi. M\xF4 t\u1EA3 kh\u1EA3 n\u0103ng b\u1EA1n mu\u1ED1n, n\u01A1i n\xF3 n\xEAn xu\u1EA5t hi\u1EC7n v\xE0 c\xE1ch b\u1EA1n s\u1EBD x\xE1c minh.",
      "guideCordisUsage": "### Th\xEAm giao di\u1EC7n\n\n> T\u1EA1o m\u1ED9t plugin DSH th\xEAm m\u1EE5c ghi ch\xFA d\u1EF1 \xE1n v\xE0o thanh b\xEAn. Cho t\xF4i duy\u1EC7t c\xE1c t\u1EC7p Markdown trong workspace n\xE0y v\xE0 xem tr\u01B0\u1EDBc m\u1ED9t ghi ch\xFA \u0111\u01B0\u1EE3c ch\u1ECDn. C\xE0i \u0111\u1EB7t v\xE0 x\xE1c minh r\u1EB1ng trang m\u1EDF \u0111\u01B0\u1EE3c.\n\nK\u1EBFt qu\u1EA3 mong \u0111\u1EE3i: plugin \u0111\xE3 c\xE0i v\u1EDBi m\u1EE5c v\xE0 trang xem tr\u01B0\u1EDBc ho\u1EA1t \u0111\u1ED9ng, c\xF9ng m\u1ECDi b\u01B0\u1EDBc k\xEDch ho\u1EA1t c\xF2n l\u1EA1i.\n\n### Th\xEAm c\xF4ng c\u1EE5\n\n> T\u1EA1o plugin v\u1EDBi c\xF4ng c\u1EE5 \u0111\u1ECDc b\xE1o c\xE1o ki\u1EC3m th\u1EED c\u1EE7a d\u1EF1 \xE1n n\xE0y v\xE0 t\xF3m t\u1EAFt c\xE1c ki\u1EC3m th\u1EED th\u1EA5t b\u1EA1i. \u0110\u0103ng k\xFD v\xE0 x\xE1c minh b\u1EB1ng m\u1ED9t b\xE1o c\xE1o m\u1EABu.\n\nK\u1EBFt qu\u1EA3 mong \u0111\u1EE3i: plugin c\xF3 c\xF4ng c\u1EE5 g\u1ECDi \u0111\u01B0\u1EE3c v\xE0 m\u1ED9t l\u1EC7nh g\u1ECDi m\u1EABu \u0111\xE3 x\xE1c minh.\n\n### T\u1EA1o ch\u1EBF \u0111\u1ED9 ri\xEAng\n\n> T\u1EA1o ch\u1EBF \u0111\u1ED9 \u201CCode review\u201D d\u1EF1a tr\xEAn ch\u1EBF \u0111\u1ED9 Standard. \u01AFu ti\xEAn c\xE1c l\u1ED7i ti\u1EC1m \u1EA9n v\xE0 l\u1ED7 h\u1ED5ng ki\u1EC3m th\u1EED, tr\xEDch d\u1EABn \u0111\u01B0\u1EDDng d\u1EABn t\u1EC7p v\xE0 s\u1ED1 d\xF2ng, v\xE0 h\u1ECFi tr\u01B0\u1EDBc khi s\u1EEDa t\u1EC7p. L\u01B0u th\xE0nh preset c\xF3 th\u1EC3 ch\u1ECDn.\n\nK\u1EBFt qu\u1EA3 mong \u0111\u1EE3i: preset t\xF9y ch\u1EC9nh cho t\xE1c v\u1EE5 m\u1EDBi. C\xE1c h\u01B0\u1EDBng d\u1EABn review n\xE0y \u0111\u1ECBnh h\u01B0\u1EDBng agent; c\xE0i \u0111\u1EB7t quy\u1EC1n quy\u1EBFt \u0111\u1ECBnh h\xE0nh \u0111\u1ED9ng n\xE0o agent c\xF3 th\u1EC3 th\u1EF1c hi\u1EC7n.",
      "guideExampleTask": "T\xE1c v\u1EE5 v\xED d\u1EE5",
      "guideFootnotes": "Ch\xFA th\xEDch",
      "guideMinimalExplanation": "### Nh\u1EEFng g\xEC \u0111\u01B0\u1EE3c bao g\u1ED3m\n\nM\u1ED9t c\xF4ng c\u1EE5 shell l\xE2u b\u1EC1n, read_image v\xE0 system prompt c\u1ED1 \u0111\u1ECBnh. \u0110\u1ECDc \u1EA3nh c\u1EA7n model c\xF3 kh\u1EA3 n\u0103ng x\u1EED l\xFD \u1EA3nh. L\u1ECBch s\u1EED c\u0169 \u0111\u01B0\u1EE3c n\xE9n t\u1EF1 \u0111\u1ED9ng khi ng\u1EEF c\u1EA3nh b\u1ECB \xE9p; d\xF9ng /compact khi agent r\u1EA3nh \u0111\u1EC3 n\xE9n th\u1EE7 c\xF4ng. Preset t\xEDch h\u1EE3p kh\xF4ng n\u1EA1p Skill, l\u1EADp k\u1EBF ho\u1EA1ch hay ng\u1EEF c\u1EA3nh runtime chu\u1EA9n.\n\n### Khi n\xE0o n\xEAn ch\u1ECDn\n\nD\xF9ng l\xE0m \u0111\u01B0\u1EDDng c\u01A1 s\u1EDF cho th\u1EED nghi\u1EC7m v\xE0 so s\xE1nh. N\xF3 v\u1EABn \u0111\u1ECDc \u0111\u01B0\u1EE3c t\u1EC7p v\xE0 ch\u1EA1y script qua l\u1EC7nh shell, nh\u01B0ng c\xF3 \xEDt c\xE1ch t\xEDch h\u1EE3p h\u01A1n \u0111\u1EC3 qu\u1EA3n l\xFD t\xE1c v\u1EE5 d\xE0i. \xCDt c\xF4ng c\u1EE5 h\u01A1n kh\xF4ng h\u1EB3n khi\u1EBFn ng\u01B0\u1EDDi m\u1EDBi d\u1EC5 d\xF9ng h\u01A1n.",
      "guideMinimalIntro": "Ch\u1ECDn ch\u1EBF \u0111\u1ED9 Minimal cho t\xE1c v\u1EE5 m\u1EDBi. \u0110\u1EC3 so s\xE1nh, h\xE3y gi\u1EEF nguy\xEAn model, quy\u1EC1n, \u0111\u1EA7u v\xE0o v\xE0 tr\u1EA1ng th\xE1i workspace ban \u0111\u1EA7u qua c\xE1c l\u1EA7n ch\u1EA1y.",
      "guideMinimalUsage": "### So s\xE1nh hi\u1EC7u n\u0103ng khi s\u1EEDa m\u1ED9t l\u1ED7i nh\u1ECF\n\n> Ch\u1EA1y ki\u1EC3m th\u1EED cho d\u1EF1 \xE1n n\xE0y, t\xECm nguy\xEAn nh\xE2n l\u1ED7i v\xE0 th\u1EF1c hi\u1EC7n b\u1EA3n s\u1EEDa nh\u1ECF nh\u1EA5t. Ch\u1EA1y l\u1EA1i c\xE1c ki\u1EC3m th\u1EED li\xEAn quan v\xE0 b\xE1o c\xE1o k\u1EBFt qu\u1EA3.\n\nCh\u1EA1y c\xF9ng t\xE1c v\u1EE5 ri\xEAng bi\u1EC7t \u1EDF ch\u1EBF \u0111\u1ED9 Standard v\xE0 Minimal t\u1EEB c\xF9ng tr\u1EA1ng th\xE1i ban \u0111\u1EA7u. So s\xE1nh m\u1EE9c ho\xE0n th\xE0nh t\xE1c v\u1EE5, s\u1ED1 l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 v\xE0 c\xE1c thay \u0111\u1ED5i t\u1EA1o ra. Ch\u1EBF \u0111\u1ED9 Minimal th\u1EF1c hi\u1EC7n c\xF4ng vi\u1EC7c qua l\u1EC7nh terminal.",
      "guidePtcExplanation": "### C\xE1ch g\u1ECDi c\xF4ng c\u1EE5\n\nPTC l\xE0 vi\u1EBFt t\u1EAFt c\u1EE7a Programmatic Tool Calling. Trong preset t\xEDch h\u1EE3p n\xE0y, agent d\xF9ng run_code \u0111\u1EC3 vi\u1EBFt ch\u01B0\u01A1ng tr\xECnh TypeScript g\u1ECDi c\xF4ng c\u1EE5 th\xF4ng qua SDK \u0111\u01B0\u1EE3c t\u1EA1o. Ch\u01B0\u01A1ng tr\xECnh c\xF3 th\u1EC3 d\xF9ng v\xF2ng l\u1EB7p, \u0111i\u1EC1u ki\u1EC7n, x\u1EED l\xFD l\u1ED7i v\xE0 c\xE1c l\u1EC7nh g\u1ECDi \u0111\u1ED3ng th\u1EDDi khi ph\xF9 h\u1EE3p.\n\n### Nh\u1EEFng g\xEC \u0111\u1EBFn v\u1EDBi model\n\nK\u1EBFt qu\u1EA3 c\xF4ng c\u1EE5 tr\u01B0\u1EDBc ti\xEAn \u0111\u1EBFn ch\u01B0\u01A1ng tr\xECnh, ch\u01B0\u01A1ng tr\xECnh c\xF3 th\u1EC3 l\u1ECDc v\xE0 k\u1EBFt h\u1EE3p ch\xFAng. Model nh\u1EADn nh\u1EEFng g\xEC ch\u01B0\u01A1ng tr\xECnh in ra ho\u1EB7c tr\u1EA3 v\u1EC1; k\u1EBFt qu\u1EA3 h\xECnh \u1EA3nh \u0111\u01B0\u1EE3c \u0111\xEDnh k\xE8m ri\xEAng. C\xE1c l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 l\u1ED3ng nhau v\u1EABn \u0111\u01B0\u1EE3c ghi l\u1EA1i v\xE0 v\u1EABn tu\xE2n theo quy\u1EC1n c\u1EE7a c\xF4ng c\u1EE5.\n\n### So v\u1EDBi ch\u1EBF \u0111\u1ED9 Standard\n\nC\u1EA3 hai ch\u1EBF \u0111\u1ED9 \u0111\u1EC1u x\u1EED l\xFD \u0111\u01B0\u1EE3c c\xF4ng vi\u1EC7c l\u1EADp tr\xECnh v\xE0 theo l\xF4. Ch\u1EBF \u0111\u1ED9 Standard hi\u1EC3n th\u1ECB t\u1EEBng c\xF4ng c\u1EE5 tr\u1EF1c ti\u1EBFp; PTC t\u1ED5 ch\u1EE9c c\xE1c l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 trong m\xE3. Preset PTC hi\u1EC7n t\u1EA1i \u0111\u1EC3 tool workflow v\xE0 qu\u1EA3n l\xFD plugin \u1EDF tr\u1EA1ng th\xE1i t\u1EAFt. T\u1ED1c \u0111\u1ED9 v\xE0 l\u01B0\u1EE3ng token d\xF9ng ph\u1EE5 thu\u1ED9c v\xE0o t\xE1c v\u1EE5 v\xE0 c\xE1ch ch\u01B0\u01A1ng tr\xECnh x\u1EED l\xFD k\u1EBFt qu\u1EA3.",
      "guidePtcIntro": "Ch\u1ECDn ch\u1EBF \u0111\u1ED9 PTC khi b\u1EAFt \u0111\u1EA7u t\xE1c v\u1EE5 m\u1EDBi. Ch\u1EC9 \u0111\u1ECBnh t\u1EC7p \u0111\u1EA7u v\xE0o, quy t\u1EAFc x\u1EED l\xFD v\xE0 \u0111\u1ECBnh d\u1EA1ng \u0111\u1EA7u ra. Agent s\u1EBD vi\u1EBFt m\xE3.",
      "guidePtcUsage": "### Ki\u1EC3m tra m\u1ED9t t\u1EADp t\u1EC7p c\u1EA5u h\xECnh\n\n> Ki\u1EC3m tra t\u1EA5t c\u1EA3 t\u1EC7p JSON trong configs/. Li\u1EC7t k\xEA c\xE1c tr\u01B0\u1EDDng b\u1EAFt bu\u1ED9c b\u1ECB thi\u1EBFu v\xE0 gi\xE1 tr\u1ECB kh\xF4ng h\u1EE3p l\u1EC7 so v\u1EDBi schema.json. L\u01B0u CSV v\u1EDBi m\u1ED9t d\xF2ng cho m\u1ED7i v\u1EA5n \u0111\u1EC1. \u0110\u01B0a c\xE1c t\u1EC7p kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c v\xE0o b\xE1o c\xE1o v\xE0 ti\u1EBFp t\u1EE5c ki\u1EC3m tra ph\u1EA7n c\xF2n l\u1EA1i. Gi\u1EEF nguy\xEAn c\xE1c t\u1EC7p g\u1ED1c.\n\nK\u1EBFt qu\u1EA3 mong \u0111\u1EE3i: b\u1EA3n t\xF3m t\u1EAFt v\u1EA5n \u0111\u1EC1 v\xE0 b\xE1o c\xE1o CSV. Ch\u01B0\u01A1ng tr\xECnh c\xF3 th\u1EC3 l\u1EB7p l\u1EA1i c\xF9ng c\xE1c ki\u1EC3m tra, x\u1EED l\xFD t\u1EEBng l\u1ED7i ri\xEAng l\u1EBB v\xE0 thu th\u1EADp k\u1EBFt qu\u1EA3.\n\n### T\xF3m t\u1EAFt nh\u1EADt k\xFD l\u1ED7i\n\n> Ph\xE2n t\xEDch c\xE1c t\u1EC7p log trong logs/. Nh\xF3m l\u1ED7i theo d\u1ECBch v\u1EE5 v\xE0 lo\u1EA1i l\u1ED7i. Hi\u1EC3n th\u1ECB m\u01B0\u1EDDi nh\xF3m ph\u1ED5 bi\u1EBFn nh\u1EA5t v\xE0 m\u1ED9t v\xED d\u1EE5 t\u1EEB m\u1ED7i nh\xF3m. L\u01B0u to\xE0n b\u1ED9 s\u1ED1 \u0111\u1EBFm v\xE0o CSV.\n\nK\u1EBFt qu\u1EA3 mong \u0111\u1EE3i: c\xE1c nh\xF3m l\u1ED7i h\xE0ng \u0111\u1EA7u v\xE0 b\u1EA3ng s\u1ED1 \u0111\u1EBFm \u0111\u1EA7y \u0111\u1EE7. D\u1EEF li\u1EC7u trung gian c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c t\u1ED5ng h\u1EE3p trong ch\u01B0\u01A1ng tr\xECnh tr\u01B0\u1EDBc khi b\u1EA3n t\xF3m t\u1EAFt \u0111\u1EBFn model.",
      "guideSections": "C\xE1c m\u1EE5c h\u01B0\u1EDBng d\u1EABn",
      "guideStandardExplanation": "### C\xE1ch ho\u1EA1t \u0111\u1ED9ng\n\nAgent g\u1ECDi c\xF4ng c\u1EE5 tr\u1EF1c ti\u1EBFp \u0111\u1EC3 \u0111\u1ECDc v\xE0 s\u1EEDa t\u1EC7p, t\xECm ki\u1EBFm v\xE0 ch\u1EA1y l\u1EC7nh terminal. N\xF3 bao g\u1ED3m Skill, l\u1EADp k\u1EBF ho\u1EA1ch, m\u1EE5c ti\xEAu, subagent, workflow, qu\u1EA3n l\xFD plugin v\xE0 n\xE9n ng\u1EEF c\u1EA3nh.\n\nV\u1EDBi c\xE1c c\xE2u h\u1ECFi v\u1EC1 DSH v\xE0 c\xF4ng vi\u1EC7c plugin ho\u1EB7c preset m\xE0 b\u1EA1n y\xEAu c\u1EA7u, skill dsh-doc s\u1EBD h\u01B0\u1EDBng d\u1EABn agent \u0111\u1EBFn t\xE0i li\u1EC7u v\xE0 m\xE3 ngu\u1ED3n \u0111\xE3 c\xE0i \u0111\u1EB7t. H\u01B0\u1EDBng d\u1EABn c\u1EE7a skill ch\u1EC9 \u0111\u01B0\u1EE3c n\u1EA1p khi \u0111\u01B0\u1EE3c y\xEAu c\u1EA7u ho\u1EB7c khi th\u1EA5y li\xEAn quan; vi\u1EC7c n\u1EA1p kh\xF4ng thay \u0111\u1ED5i t\u1EC7p, c\xF4ng c\u1EE5 hay profile.\n\n### Khi n\xE0o n\xEAn ch\u1ECDn\n\nH\xE3y b\u1EAFt \u0111\u1EA7u \u1EDF \u0111\xE2y cho c\xF4ng vi\u1EC7c l\u1EADp tr\xECnh, x\u1EED l\xFD t\u1EC7p v\xE0 nghi\xEAn c\u1EE9u h\u1EB1ng ng\xE0y. Ch\u1EBF \u0111\u1ED9 Standard c\u0169ng c\xF3 th\u1EC3 vi\u1EBFt script v\xE0 x\u1EED l\xFD t\u1EC7p theo l\xF4. PTC thay \u0111\u1ED5i c\xE1ch t\u1ED5 ch\u1EE9c c\xE1c l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5; n\xF3 kh\xF4ng b\u1EAFt bu\u1ED9c cho t\xE1c v\u1EE5 theo l\xF4.",
      "guideStandardIntro": "Ch\u1ECDn ch\u1EBF \u0111\u1ED9 Standard khi b\u1EAFt \u0111\u1EA7u t\xE1c v\u1EE5 m\u1EDBi. M\xF4 t\u1EA3 \u0111i\u1EC1u b\u1EA1n mu\u1ED1n ho\xE0n th\xE0nh, ch\u1EC9 ra c\xE1c t\u1EC7p li\xEAn quan v\xE0 gi\u1EA3i th\xEDch c\xE1ch ki\u1EC3m tra k\u1EBFt qu\u1EA3.",
      "guideStandardUsage": "### S\u1EEDa m\u1ED9t l\u1ED7i\n\n> T\xECm hi\u1EC3u v\xEC sao g\u1EEDi bi\u1EC3u m\u1EABu t\xECm ki\u1EBFm hai l\u1EA7n khi\u1EBFn k\u1EBFt qu\u1EA3 bi\u1EBFn m\u1EA5t. S\u1EEDa l\u1ED7i v\xE0 ch\u1EA1y c\xE1c ki\u1EC3m th\u1EED li\xEAn quan. Gi\u1EA3i th\xEDch nguy\xEAn nh\xE2n v\xE0 nh\u1EEFng g\xEC \u0111\xE3 thay \u0111\u1ED5i.\n\nK\u1EBFt qu\u1EA3 mong \u0111\u1EE3i: m\u1ED9t thay \u0111\u1ED5i m\xE3, k\u1EBFt qu\u1EA3 ki\u1EC3m th\u1EED li\xEAn quan v\xE0 gi\u1EA3i th\xEDch nguy\xEAn nh\xE2n.\n\n### S\u1EAFp x\u1EBFp ghi ch\xFA d\u1EF1 \xE1n\n\n> \u0110\u1ECDc c\xE1c ghi ch\xFA Markdown trong d\u1EF1 \xE1n n\xE0y. T\xF3m t\u1EAFt c\xE1c quy\u1EBFt \u0111\u1ECBnh \u0111\xE3 th\u1ED1ng nh\u1EA5t v\xE0 c\xE1c c\xE2u h\u1ECFi c\xF2n m\u1EDF, k\xE8m li\xEAn k\u1EBFt \u0111\u1EBFn c\xE1c t\u1EC7p ngu\u1ED3n.\n\nK\u1EBFt qu\u1EA3 mong \u0111\u1EE3i: b\u1EA3n t\xF3m t\u1EAFt c\xF3 tham chi\u1EBFu \u0111\u1EC3 b\u1EA1n c\xF3 th\u1EC3 \u0111\u1ED1i chi\u1EBFu v\u1EDBi ghi ch\xFA g\u1ED1c.",
      "headerHint": "Preset agent \u0111\u01B0\u1EE3c ch\u1ECDn khi t\xE1c v\u1EE5 n\xE0y b\u1EAFt \u0111\u1EA7u",
      "howToUse": "C\xE1ch s\u1EED d\u1EE5ng",
      "inUse": "M\u1EB7c \u0111\u1ECBnh cho t\xE1c v\u1EE5 m\u1EDBi",
      "modeExplanation": "Chi ti\u1EBFt ch\u1EBF \u0111\u1ED9",
      "nav": "Preset agent",
      "noDescription": "Kh\xF4ng c\xF3 m\xF4 t\u1EA3.",
      "presetCordisDescription": "T\xF9y ch\u1EC9nh DSH qua h\u1ED9i tho\u1EA1i. \u0110\u1EC3 agent vi\u1EBFt plugin b\u1ED5 sung t\xEDnh n\u0103ng ho\u1EB7c giao di\u1EC7n, ho\u1EB7c k\u1EBFt h\u1EE3p c\xF4ng c\u1EE5 v\xE0 prompt \u0111\u1EC3 t\u1EA1o ch\u1EBF \u0111\u1ED9 ri\xEAng.",
      "presetCordisName": "Ch\u1EBF \u0111\u1ED9 Creator",
      "presetMinimalDescription": "Agent d\xF9ng terminal v\xE0 \u0111\u1ECDc \u1EA3nh, k\xE8m n\xE9n ng\u1EEF c\u1EA3nh. H\u1EEFu \xEDch \u0111\u1EC3 ki\u1EC3m th\u1EED v\xE0 so s\xE1nh hi\u1EC7u n\u0103ng c\u01A1 b\u1EA3n.",
      "presetMinimalName": "Ch\u1EBF \u0111\u1ED9 Minimal",
      "presetPtcDescription": "Bao g\u1ED3m to\xE0n b\u1ED9 kh\u1EA3 n\u0103ng c\u1EE7a ch\u1EBF \u0111\u1ED9 Standard. Ph\xF9 h\u1EE3p h\u01A1n v\u1EDBi t\xE1c v\u1EE5 g\u1ECDi c\xF4ng c\u1EE5 theo l\xF4 r\u1ED3i l\u1ECDc, s\u1EAFp x\u1EBFp, lo\u1EA1i tr\xF9ng, \u0111\u1EBFm ho\u1EB7c t\xF3m t\u1EAFt k\u1EBFt qu\u1EA3.",
      "presetPtcName": "Ch\u1EBF \u0111\u1ED9 PTC",
      "presetStandardDescription": "L\xE0m vi\u1EC7c v\u1EDBi m\xE3, t\u1EC7p v\xE0 th\xF4ng tin. Ph\xF9 h\u1EE3p cho h\u1EA7u h\u1EBFt t\xE1c v\u1EE5, v\u1EDBi t\xECm ki\u1EBFm, ch\u1EC9nh s\u1EEDa, l\u1EC7nh terminal v\xE0 c\xE1c c\xF4ng c\u1EE5 kh\xE1c khi c\u1EA7n.",
      "presetStandardName": "Ch\u1EBF \u0111\u1ED9 Standard",
      "seatHint": "Ch\u1ECDn preset agent cho t\xE1c v\u1EE5 m\u1EDBi c\u1EE7a b\u1EA1n",
      "sectionIntro": "Ch\u1ECDn c\xF4ng c\u1EE5 c\u1EE7a agent v\xE0 c\xE1ch n\xF3 ho\u1EA1t \u0111\u1ED9ng. D\xF9ng ch\u1EBF \u0111\u1ED9 Standard cho c\xF4ng vi\u1EC7c h\u1EB1ng ng\xE0y, ho\u1EB7c ch\u1EBF \u0111\u1ED9 Creator \u0111\u1EC3 b\u1ED5 sung kh\u1EA3 n\u0103ng cho DSH.",
      "setDefault": "\u0110\u1EB7t l\xE0m m\u1EB7c \u0111\u1ECBnh cho t\xE1c v\u1EE5 m\u1EDBi",
      "standardUnavailable": "Ch\u1EBF \u0111\u1ED9 Standard kh\xF4ng kh\u1EA3 d\u1EE5ng. Kh\xF4i ph\u1EE5c ho\u1EB7c ch\u1ECDn ch\u1EBF \u0111\u1ED9 kh\xE1c \u0111ang c\xF3.",
      "switchRefused": "Kh\xF4ng th\u1EC3 chuy\u1EC3n sang {name}: {reason}",
      "view": "Xem c\u1EA5u h\xECnh"
    },
    "settings.locale": {
      "language.title": "Ng\xF4n ng\u1EEF"
    },
    "settings.models": {
      "accountSignedIn": "\u0110\xE3 \u0111\u0103ng nh\u1EADp",
      "add": "Th\xEAm nh\xE0 cung c\u1EA5p model",
      "addCatalog": "Nh\xE0 cung c\u1EA5p model b\xEAn th\u1EE9 ba",
      "addCatalogExhausted": "M\u1ECDi nh\xE0 cung c\u1EA5p trong danh m\u1EE5c \u0111\u1EC1u \u0111\xE3 \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh.",
      "addCatalogHint": "Ch\u1ECDn OpenAI, Anthropic, Kimi ho\u1EB7c nh\xE0 cung c\u1EA5p kh\xE1c trong danh m\u1EE5c t\xEDch h\u1EE3p v\xE0 nh\u1EADp kh\xF3a API c\u1EE7a n\xF3.",
      "addCustom": "API model t\xF9y ch\u1EC9nh",
      "addCustomHint": "K\u1EBFt n\u1ED1i relay, m\xE1y ch\u1EE7 t\u1EF1 l\u01B0u tr\u1EEF ho\u1EB7c b\u1EA5t k\u1EF3 endpoint t\u01B0\u01A1ng th\xEDch OpenAI, Anthropic hay Gemini n\xE0o b\u1EB1ng base URL, giao th\u1EE9c v\xE0 model c\u1EE7a n\xF3.",
      "addCustomUnavailable": "Kh\xF4ng c\xF3 giao th\u1EE9c API n\xE0o \u0111\u1EC3 khai b\xE1o.",
      "addMode": "C\xE1ch th\xEAm",
      "addModel": "Th\xEAm model",
      "advancedHint": "C\xE1c tr\u01B0\u1EDDng kh\xE1c n\u1EB1m trong cordis.patch.yml; h\xE3y s\u1EEDa tr\u1EF1c ti\u1EBFp ph\u1EA7n \u0111\xF3.",
      "apply": "\xC1p d\u1EE5ng",
      "applying": "\u0110ang \xE1p d\u1EE5ng\u2026",
      "authHelp": "Chi ti\u1EBFt x\xE1c th\u1EF1c",
      "baseUrl": "Base URL",
      "baseUrlConfigured": "Endpoint do nh\xE0 cung c\u1EA5p c\u1EA5u h\xECnh",
      "baseUrlDefault": "Kh\xF4ng c\xF3 endpoint m\u1EB7c \u0111\u1ECBnh",
      "baseUrlEnvironment": "C\u1EA5u h\xECnh endpoint c\u1EE7a nh\xE0 cung c\u1EA5p: {env}",
      "baseUrlPlaceholder": "{url}",
      "cancel": "H\u1EE7y",
      "close": "\u0110\xF3ng",
      "conflict": "Ng\u01B0\u1EDDi kh\xE1c \u0111\xE3 thay \u0111\u1ED5i c\xE1c c\xE0i \u0111\u1EB7t n\xE0y khi th\u1EBB n\xE0y \u0111ang m\u1EDF. H\xE3y \u0111\xF3ng v\xE0 m\u1EDF l\u1EA1i \u0111\u1EC3 s\u1EEDa c\xE1c gi\xE1 tr\u1ECB hi\u1EC7n t\u1EA1i.",
      "contextWindow": "C\u1EEDa s\u1ED5 ng\u1EEF c\u1EA3nh",
      "contextWindowPlaceholder": "D\xF9ng m\u1EB7c \u0111\u1ECBnh c\u1EE7a nh\xE0 cung c\u1EA5p",
      "create": "T\u1EA1o nh\xE0 cung c\u1EA5p",
      "creating": "\u0110ang t\u1EA1o\u2026",
      "credentialConfigured": "\u0110\xE3 c\u1EA5u h\xECnh kh\xF3a API",
      "credentialMissing": "Thi\u1EBFu kh\xF3a API",
      "customAnthropicBaseUrlPlaceholder": "https://gateway.example",
      "customApi": "Giao th\u1EE9c API",
      "customApiUnset": "Ch\u01B0a ch\u1ECDn",
      "customBaseUrlInvalid": "Nh\u1EADp URL HTTP ho\u1EB7c HTTPS h\u1EE3p l\u1EC7.",
      "customBaseUrlPlaceholder": "https://gateway.example/v1",
      "customDisplayName": "T\xEAn hi\u1EC3n th\u1ECB",
      "customGeminiBaseUrlPlaceholder": "https://gateway.example/v1beta",
      "customized": "C\xE0i \u0111\u1EB7t \u0111\xE3 t\xF9y ch\u1EC9nh",
      "customNeedsBaseUrl": "Nh\xE0 cung c\u1EA5p t\xF9y ch\u1EC9nh c\u1EA7n base URL.",
      "customNeedsModels": "Nh\xE0 cung c\u1EA5p t\xF9y ch\u1EC9nh c\u1EA7n \xEDt nh\u1EA5t m\u1ED9t model.",
      "customRoute": "ID nh\xE0 cung c\u1EA5p",
      "customRouteHint": "\u0110\u1ECBnh danh ch\u1EEF th\u01B0\u1EDDng, b\u1EAFt \u0111\u1EA7u b\u1EB1ng ch\u1EEF c\xE1i, \u0111\u1EB7t t\xEAn duy nh\u1EA5t cho nh\xE0 cung c\u1EA5p n\xE0y trong y\xEAu c\u1EA7u v\xE0 l\xE0m t\xEAn th\xF4ng tin x\xE1c th\u1EF1c c\u1EE7a n\xF3.",
      "customRouteInvalid": "B\u1EAFt \u0111\u1EA7u b\u1EB1ng ch\u1EEF c\xE1i th\u01B0\u1EDDng; sau \u0111\xF3 ch\u1EC9 g\u1ED3m ch\u1EEF c\xE1i th\u01B0\u1EDDng, ch\u1EEF s\u1ED1 v\xE0 d\u1EA5u g\u1EA1ch ngang.",
      "customRouteTaken": "\u0110\xE3 c\xF3 nh\xE0 cung c\u1EA5p d\xF9ng ID n\xE0y.",
      "customTag": "T\xF9y ch\u1EC9nh",
      "deepSeekAccount": "T\xE0i kho\u1EA3n DeepSeek",
      "deepSeekBaseUrl": "https://api.deepseek.com/anthropic (M\u1EB7c \u0111\u1ECBnh d\xF9ng DEEPSEEK_BASE_URL)",
      "deepSeekEndpointHint": "D\xF9ng endpoint API t\u01B0\u01A1ng th\xEDch v\u1EDBi Anthropic Messages.",
      "deleteConfirm": "X\xF3a {provider}",
      "deleteDescription": "X\xF3a {provider} s\u1EBD g\u1EE1 c\u1EA5u h\xECnh c\u1EE7a n\xF3. M\u1ECDi th\xF4ng tin x\xE1c th\u1EF1c m\xE0 n\xF3 d\xF9ng \u0111\u01B0\u1EE3c qu\u1EA3n l\xFD \u1EDF n\u01A1i kh\xE1c v\xE0 s\u1EBD \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i.",
      "deleteDescriptionWithCredential": "X\xF3a {provider} s\u1EBD g\u1EE1 c\u1EA5u h\xECnh v\xE0 kh\xF3a API \u0111\xE3 l\u01B0u c\u1EE7a n\xF3.",
      "deleteTitle": "X\xF3a {provider}?",
      "deleting": "\u0110ang x\xF3a {provider}\u2026",
      "edit": "S\u1EEDa",
      "editProvider": "S\u1EEDa {provider}",
      "fetchAdopt": "C\u1EADp nh\u1EADt danh s\xE1ch",
      "fetchDescription": "\u0110\xE2y l\xE0 c\xE1c model m\xE0 nh\xE0 cung c\u1EA5p n\xE0y c\xF3 s\u1EB5n. C\xE1c model \u0111\u01B0\u1EE3c ch\u1ECDn t\u1EA1o th\xE0nh danh s\xE1ch.",
      "fetchDeselectAll": "B\u1ECF ch\u1ECDn t\u1EA5t c\u1EA3",
      "fetchEmpty": "Nh\xE0 cung c\u1EA5p kh\xF4ng li\u1EC7t k\xEA model n\xE0o. H\xE3y th\xEAm th\u1EE7 c\xF4ng.",
      "fetching": "\u0110ang h\u1ECFi nh\xE0 cung c\u1EA5p\u2026",
      "fetchKeepOne": "Gi\u1EEF \xEDt nh\u1EA5t m\u1ED9t model \u0111\u01B0\u1EE3c ch\u1ECDn.",
      "fetchModels": "T\u1EA3i model kh\u1EA3 d\u1EE5ng",
      "fetchNeedsBaseUrl": "Nh\u1EADp base URL tr\u01B0\u1EDBc, r\u1ED3i t\u1EA3i.",
      "fetchNoMatches": "Kh\xF4ng c\xF3 model ph\xF9 h\u1EE3p.",
      "fetchSearch": "T\xECm model",
      "fetchSelectAll": "Ch\u1ECDn t\u1EA5t c\u1EA3",
      "fetchTitle": "Ch\u1ECDn model",
      "intro": "Nh\u1EADp kh\xF3a API c\u1EE7a b\u1EA1n \u0111\u1EC3 d\xF9ng model t\u1EEB c\xE1c nh\xE0 cung c\u1EA5p sau.",
      "keyBlank": "Nh\u1EADp kh\xF3a API, ho\u1EB7c \u0111\u1EC3 tr\u1ED1ng \u0111\u1EC3 gi\u1EEF kh\xF3a \u0111\xE3 l\u01B0u.",
      "keyBlankNew": "Nh\u1EADp kh\xF3a API, ho\u1EB7c \u0111\u1EC3 tr\u1ED1ng n\u1EBFu nh\xE0 cung c\u1EA5p n\xE0y x\xE1c th\u1EF1c theo c\xE1ch kh\xE1c.",
      "keyFallbackDetected": "\u0110\xE3 ph\xE1t hi\u1EC7n bi\u1EBFn m\xF4i tr\u01B0\u1EDDng. ({hint})",
      "keyFallbackDetectedHidden": "\u0110\xE3 ph\xE1t hi\u1EC7n bi\u1EBFn m\xF4i tr\u01B0\u1EDDng.",
      "keyFallbackMissing": "Kh\xF4ng ph\xE1t hi\u1EC7n bi\u1EBFn m\xF4i tr\u01B0\u1EDDng. Nh\u1EADp kh\xF3a API, ho\u1EB7c c\u1EA5u h\xECnh {hint} trong m\xF4i tr\u01B0\u1EDDng c\u1EE7a b\u1EA1n.",
      "keyFallbackUnchecked": "Ch\u01B0a x\xE1c nh\u1EADn tr\u1EA1ng th\xE1i th\xF4ng tin x\xE1c th\u1EF1c t\u1EEB m\xF4i tr\u01B0\u1EDDng.",
      "keyHelp": "Th\xF4ng tin x\xE1c th\u1EF1c \u0111\xE3 l\u01B0u \u0111\u01B0\u1EE3c d\xF9ng tr\u01B0\u1EDBc. C\xE1c ngu\u1ED3n d\u1EF1 ph\xF2ng t\u1EEB m\xF4i tr\u01B0\u1EDDng hi\u1EC3n th\u1ECB \u1EDF \u0111\xE2y, theo th\u1EE9 t\u1EF1: {env}. Ngu\u1ED3n g\u1ED3m m\xF4i tr\u01B0\u1EDDng kh\u1EDFi ch\u1EA1y, $cwd/.env, r\u1ED3i $DSH_HOME/.env.",
      "keyHide": "\u1EA8n b\xED m\u1EADt",
      "keyIllegalCharacters": "Kh\xF3a API n\xE0y kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng. Vui l\xF2ng ki\u1EC3m tra l\u1EA1i.",
      "keyInput": "Kh\xF3a API",
      "keyPlaceholder": "Nh\u1EADp kh\xF3a API c\u1EE7a b\u1EA1n",
      "keyPlaceholderFallback": "\u0110\u1EC3 tr\u1ED1ng \u0111\u1EC3 d\xF9ng bi\u1EBFn m\xF4i tr\u01B0\u1EDDng l\xE0m x\xE1c th\u1EF1c ({hint})",
      "keyRemoveApplied": "\u0110\xE3 x\xF3a kh\xF3a. \xC1p d\u1EE5ng l\u1EA1i \u0111\u1EC3 ho\xE0n t\u1EA5t c\xE0i \u0111\u1EB7t; thao t\xE1c x\xF3a n\xE0y kh\xF4ng th\u1EC3 ho\xE0n t\xE1c.",
      "keyRemovePending": "\xC1p d\u1EE5ng \u0111\u1EC3 x\xF3a kh\xF3a API \u0111\xE3 l\u01B0u v\xE0 d\xF9ng x\xE1c th\u1EF1c b\u1EB1ng bi\u1EBFn m\xF4i tr\u01B0\u1EDDng.",
      "keyRemovePendingEnvironment": "\xC1p d\u1EE5ng \u0111\u1EC3 x\xF3a kh\xF3a API \u0111\xE3 l\u01B0u. X\xE1c th\u1EF1c b\u1EB1ng bi\u1EBFn m\xF4i tr\u01B0\u1EDDng s\u1EBD \u0111\u01B0\u1EE3c d\xF9ng ({hint}).",
      "keyReplacePending": "\xC1p d\u1EE5ng \u0111\u1EC3 thay th\u1EBF kh\xF3a API \u0111\xE3 l\u01B0u.",
      "keyRequired": "Nh\u1EADp kh\xF3a API \u0111\u1EC3 ti\u1EBFp t\u1EE5c.",
      "keyReveal": "Hi\u1EC7n b\xED m\u1EADt",
      "keySaved": "D\xF9ng kh\xF3a API \u0111\xE3 l\u01B0u.",
      "loadFailed": "T\u1EA3i danh m\u1EE5c nh\xE0 cung c\u1EA5p th\u1EA5t b\u1EA1i",
      "maxTokens": "S\u1ED1 token \u0111\u1EA7u ra t\u1ED1i \u0111a",
      "maxTokensPlaceholder": "D\xF9ng m\u1EB7c \u0111\u1ECBnh c\u1EE7a nh\xE0 cung c\u1EA5p",
      "model": "Model",
      "modelAdvanced": "T\xF9y ch\u1ECDn model",
      "modelCapacityInvalid": "Dung l\u01B0\u1EE3ng ph\u1EA3i l\xE0 m\u1ED9t s\u1ED1, c\xF3 th\u1EC3 c\xF3 h\u1EADu t\u1ED1 K ho\u1EB7c M.",
      "modelContextInvalid": "C\u1EEDa s\u1ED5 ng\u1EEF c\u1EA3nh ph\u1EA3i l\xE0 m\u1ED9t s\u1ED1 d\u01B0\u01A1ng, nh\u01B0 131072, 256K ho\u1EB7c 1M.",
      "modelDuplicate": "M\u1ED7i ID model ch\u1EC9 \u0111\u01B0\u1EE3c xu\u1EA5t hi\u1EC7n m\u1ED9t l\u1EA7n.",
      "modelId": "ID model",
      "modelIdDuplicate": "ID model ph\u1EA3i l\xE0 duy nh\u1EA5t.",
      "modelIdRequired": "C\u1EA7n nh\u1EADp ID model.",
      "modelInputImage": "H\xECnh \u1EA3nh",
      "modelInputText": "V\u0103n b\u1EA3n",
      "modelInputTypes": "Lo\u1EA1i \u0111\u1EA7u v\xE0o",
      "modelMaxTokensInvalid": "S\u1ED1 token \u0111\u1EA7u ra t\u1ED1i \u0111a ph\u1EA3i l\xE0 m\u1ED9t s\u1ED1 d\u01B0\u01A1ng, nh\u01B0 8192, 64K ho\u1EB7c 1M.",
      "modelName": "T\xEAn hi\u1EC3n th\u1ECB",
      "modelNameInvalid": "T\xEAn hi\u1EC3n th\u1ECB kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng.",
      "modelNamePlaceholder": "D\xF9ng ID model khi \u0111\u1EC3 tr\u1ED1ng",
      "modelReasoning": "M\u1EE9c suy lu\u1EADn",
      "modelReasoningAdd": "Th\xEAm m\u1EE9c",
      "modelReasoningHelp": "V\u1EC1 c\xE1c m\u1EE9c suy lu\u1EADn",
      "modelReasoningHelpText": "Gi\xE1 tr\u1ECB API \u0111\u01B0\u1EE3c g\u1EEDi trong tr\u01B0\u1EDDng reasoning-effort c\u1EE7a y\xEAu c\u1EA7u, v\xED d\u1EE5 reasoning_effort c\u1EE7a OpenAI. M\u1EB7c \u0111\u1ECBnh l\xE0 t\xEAn m\u1EE9c; n\u1EBFu t\xE0i li\u1EC7u API c\u1EE7a nh\xE0 cung c\u1EA5p model ch\u1EC9 \u0111\u1ECBnh gi\xE1 tr\u1ECB kh\xE1c th\xEC h\xE3y l\xE0m theo. T\u1EAFt s\u1EBD t\u1EAFt suy lu\u1EADn v\xE0 kh\xF4ng c\u1EA7n gi\xE1 tr\u1ECB; gi\xE1 tr\u1ECB \u0111\xE3 ghi trong c\u1EA5u h\xECnh s\u1EBD \u0111\u01B0\u1EE3c gi\u1EEF v\xE0 g\u1EEDi \u0111i.",
      "modelReasoningLevel": "M\u1EE9c",
      "modelReasoningLevelsOnly": "Giao th\u1EE9c API n\xE0y ch\u1EC9 ch\u1EA5p nh\u1EADn c\xE1c m\u1EE9c minimal, low, medium v\xE0 high, m\u1ED7i m\u1EE9c d\xF9ng t\xEAn m\u1EE9c l\xE0m gi\xE1 tr\u1ECB API. H\xE3y \u0111\u1ED5i ho\u1EB7c x\xF3a c\xE1c m\u1EE9c kh\xE1c.",
      "modelReasoningNeedsLevel": "Th\xEAm \xEDt nh\u1EA5t m\u1ED9t m\u1EE9c ngo\xE0i T\u1EAFt, ho\u1EB7c t\u1EAFt c\xE1c m\u1EE9c suy lu\u1EADn.",
      "modelReasoningOffValuePlaceholder": "T\u1EAFt suy lu\u1EADn",
      "modelReasoningRemove": "X\xF3a m\u1EE9c",
      "modelReasoningValue": "Gi\xE1 tr\u1ECB API",
      "modelReasoningValueRequired": "M\u1ECDi m\u1EE9c ngo\xE0i T\u1EAFt \u0111\u1EC1u c\u1EA7n gi\xE1 tr\u1ECB API v\xE0 kh\xF4ng gi\xE1 tr\u1ECB n\xE0o \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng.",
      "models": "Model",
      "modelsCustomized": "Danh m\u1EE5c model t\xF9y ch\u1EC9nh",
      "modelsEmpty": "S\u1EBD kh\xF4ng c\xF3 model n\xE0o hi\u1EC3n th\u1ECB trong b\u1ED9 ch\u1ECDn. C\xE1c ID kh\xF4ng c\xF3 trong danh s\xE1ch v\u1EABn c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c g\u1EEDi tr\u1EF1c ti\u1EBFp.",
      "modelsInherited": "\u0110ang d\xF9ng m\u1EB7c \u0111\u1ECBnh c\u1EE7a adapter",
      "nav": "Model",
      "onboardingDescription": "C\u1EA5u h\xECnh nh\xE0 cung c\u1EA5p DeepSeek ch\xEDnh th\u1EE9c \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u x\xE2y d\u1EF1ng.",
      "onboardingLater": "C\u1EA5u h\xECnh sau",
      "onboardingSave": "L\u01B0u v\xE0 ti\u1EBFp t\u1EE5c",
      "onboardingSaving": "\u0110ang l\u01B0u\u2026",
      "onboardingTitle": "Th\xEAm kh\xF3a API \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u",
      "protocolAnthropicMessages": "Anthropic Messages",
      "protocolGemini": "Gemini API",
      "protocolOpenAiCompletions": "OpenAI Chat Completions",
      "protocolOpenAiResponses": "OpenAI Responses",
      "provider": "Nh\xE0 cung c\u1EA5p",
      "readOnly": "T\xE0i li\u1EC7u c\xE0i \u0111\u1EB7t \u1EDF ch\u1EBF \u0111\u1ED9 ch\u1EC9 \u0111\u1ECDc trong tri\u1EC3n khai n\xE0y.",
      "remove": "X\xF3a",
      "removeModel": "X\xF3a model",
      "removeProvider": "X\xF3a {provider}",
      "reorderModel": "S\u1EAFp x\u1EBFp l\u1EA1i model",
      "reorderModelHelp": "K\xE9o \u0111\u1EC3 s\u1EAFp x\u1EBFp l\u1EA1i, ho\u1EB7c d\xF9ng c\xE1c ph\xEDm m\u0169i t\xEAn l\xEAn v\xE0 xu\u1ED1ng.",
      "resetModels": "Kh\xF4i ph\u1EE5c m\u1EB7c \u0111\u1ECBnh",
      "retry": "Th\u1EED l\u1EA1i",
      "retryAlwaysHint": "Y\xEAu c\u1EA7u th\u1EA5t b\u1EA1i s\u1EBD \u0111\u01B0\u1EE3c th\u1EED l\u1EA1i cho \u0111\u1EBFn khi th\xE0nh c\xF4ng ho\u1EB7c l\u01B0\u1EE3t b\u1ECB d\u1EEBng.",
      "retryBackoff": "Backoff",
      "retryCodeAdd": "Th\xEAm",
      "retryCodeCustom": "M\xE3 l\u1ED7i t\xF9y ch\u1EC9nh",
      "retryCodeEmptyResponse": "Ph\u1EA3n h\u1ED3i r\u1ED7ng",
      "retryCodeMalformedResponse": "Ph\u1EA3n h\u1ED3i kh\xF4ng h\u1EE3p l\u1EC7",
      "retryCodeQuota": "V\u01B0\u1EE3t h\u1EA1n m\u1EE9c",
      "retryCodeRateLimit": "B\u1ECB gi\u1EDBi h\u1EA1n t\u1EA7n su\u1EA5t",
      "retryCodes": "M\xE3 l\u1ED7i",
      "retryCodesDuplicate": "M\u1ED7i m\xE3 l\u1ED7i ch\u1EC9 \u0111\u01B0\u1EE3c xu\u1EA5t hi\u1EC7n m\u1ED9t l\u1EA7n.",
      "retryCodeServer": "L\u1ED7i m\xE1y ch\u1EE7",
      "retryCodesInvalid": "M\xE3 l\u1ED7i ph\u1EA3i l\xE0 v\u0103n b\u1EA3n kh\xF4ng r\u1ED7ng.",
      "retryCodeStreamClosed": "Lu\u1ED3ng \u0111\xF3ng s\u1EDBm",
      "retryCodeTimeout": "H\u1EBFt th\u1EDDi gian ch\u1EDD",
      "retryCodeTransport": "L\u1ED7i m\u1EA1ng",
      "retryDelayOrder": "\u0110\u1ED9 tr\u1EC5 ban \u0111\u1EA7u kh\xF4ng \u0111\u01B0\u1EE3c v\u01B0\u1EE3t qu\xE1 \u0111\u1ED9 tr\u1EC5 t\u1ED1i \u0111a.",
      "retryInitialDelay": "\u0110\u1ED9 tr\u1EC5 ban \u0111\u1EA7u (ms)",
      "retryJitter": "T\u1EF7 l\u1EC7 jitter",
      "retryMaxDelay": "\u0110\u1ED9 tr\u1EC5 t\u1ED1i \u0111a (ms)",
      "retryMaxRetries": "S\u1ED1 l\u1EA7n th\u1EED l\u1EA1i t\u1ED1i \u0111a",
      "retryModeAlways": "M\u1ECDi l\u1ED7i",
      "retryModeDefault": "M\u1EB7c \u0111\u1ECBnh ({mode})",
      "retryModeNormal": "L\u1ED7i t\u1EA1m th\u1EDDi",
      "retryPolicy": "Ch\xEDnh s\xE1ch th\u1EED l\u1EA1i",
      "retryValueInteger": "Nh\u1EADp m\u1ED9t s\u1ED1 nguy\xEAn.",
      "retryValueMax": "Ph\u1EA3i nhi\u1EC1u nh\u1EA5t l\xE0 {max}.",
      "retryValueMin": "Ph\u1EA3i \xEDt nh\u1EA5t l\xE0 {min}.",
      "retryValueNumber": "Nh\u1EADp m\u1ED9t s\u1ED1.",
      "retryValuePositive": "Ph\u1EA3i l\u1EDBn h\u01A1n 0.",
      "savedProvider": "\u0110\xE3 l\u01B0u {provider}.",
      "settingsPathUnresolvable": "\u0111\u01B0\u1EDDng d\u1EABn c\xE0i \u0111\u1EB7t kh\xF4ng x\xE1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c",
      "title": "Model",
      "welcomeBody": "DeepSeek Harness 0.2 v\u1EABn \u0111ang trong giai \u0111o\u1EA1n xem tr\u01B0\u1EDBc v\xE0 nhi\u1EC1u khu v\u1EF1c c\u1EA7n ti\u1EBFp t\u1EE5c \u0111\u01B0\u1EE3c c\u1EA3i thi\u1EC7n, ho\xE0n thi\u1EC7n. Ch\xFAng t\xF4i hoan ngh\xEAnh ph\u1EA3n h\u1ED3i v\xE0 g\xF3p \xFD t\u1EEB t\u1EA5t c\u1EA3 nh\xE0 ph\xE1t tri\u1EC3n v\xE0 ng\u01B0\u1EDDi d\xF9ng. \u1EE8ng d\u1EE5ng desktop m\u1EDBi hi\u1EC7n h\u01B0\u1EDBng t\u1EDBi nhi\u1EC1u \u0111\u1ED1i t\u01B0\u1EE3ng ng\u01B0\u1EDDi d\xF9ng, trong khi c\xE1c t\xEDnh n\u0103ng n\xE2ng cao d\xE0nh cho nh\xE0 ph\xE1t tri\u1EC3n c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c b\u1EADt trong c\xE0i \u0111\u1EB7t. C\xE1c t\xEDnh n\u0103ng s\u1EA3n ph\u1EA9m v\xE0 API plugin c\u1EE7a DeepSeek Harness d\u1EF1 ki\u1EBFn s\u1EBD ti\u1EBFp t\u1EE5c l\u1EB7p v\xE0 ti\u1EBFn h\xF3a nhanh, v\xE0 s\u1EBD d\u1EA7n \u1ED5n \u0111\u1ECBnh theo th\u1EDDi gian.\n\nCh\xFAng t\xF4i mong \u0111\u01B0\u1EE3c c\xF9ng ng\u01B0\u1EDDi d\xF9ng v\xE0 nh\xE0 ph\xE1t tri\u1EC3n tr\xEAn kh\u1EAFp th\u1EBF gi\u1EDBi kh\xE1m ph\xE1 gi\u1EDBi h\u1EA1n c\u1EE7a tr\xED tu\u1EC7, d\u1EF1a tr\xEAn h\u1EA1 t\u1EA7ng m\xE3 ngu\u1ED3n m\u1EDF, c\xF3 th\u1EC3 t\xE1i s\u1EED d\u1EE5ng v\xE0 c\xF3 th\u1EC3 k\u1EBFt h\u1EE3p. Ch\xFAng t\xF4i ch\xE0o \u0111\xF3n m\u1ECDi ng\u01B0\u1EDDi hi\u1EC7n th\u1EF1c h\xF3a \xFD t\u01B0\u1EDFng c\u1EE7a m\xECnh v\u1EDBi DeepSeek Harness v\xE0 tham gia c\u1ED9ng \u0111\u1ED3ng \u0111\u1EC3 l\xE0m phong ph\xFA h\u1EC7 sinh th\xE1i plugin.",
      "welcomeContinue": "Ti\u1EBFp t\u1EE5c",
      "welcomeError": "Kh\xF4ng th\u1EC3 l\u01B0u x\xE1c nh\u1EADn. Vui l\xF2ng th\u1EED l\u1EA1i.",
      "welcomeTitle": "Th\xF4ng b\xE1o b\u1EA3n xem tr\u01B0\u1EDBc"
    },
    "settings.permission": {
      "confirm.acknowledge": "T\xF4i hi\u1EC3u r\u1EE7i ro v\xE0 mu\u1ED1n ti\u1EBFp t\u1EE5c",
      "confirm.cancel": "H\u1EE7y",
      "confirm.description": "To\xE0n quy\u1EC1n cho ph\xE9p phi\xEAn m\u1EDBi gi\u1EA3m c\xE1c b\u01B0\u1EDBc x\xE1c nh\u1EADn v\xE0 th\u1EF1c hi\u1EC7n tr\u1EF1c ti\u1EBFp nhi\u1EC1u thao t\xE1c h\u01A1n, bao g\u1ED3m c\u1EA3 thao t\xE1c nh\u1EA1y c\u1EA3m, thay \u0111\u1ED5i t\u1EC7p ho\u1EB7c l\u1EC7nh b\xEAn ngo\xE0i. Ch\u1EC9 d\xF9ng khi b\u1EA1n tin t\u01B0\u1EDFng c\xE1c t\xE1c v\u1EE5 ti\u1EBFp theo.",
      "confirm.enable": "B\u1EADt to\xE0n quy\u1EC1n",
      "confirm.title": "B\u1EADt to\xE0n quy\u1EC1n?",
      "description": "Ch\u1ECDn ch\u1EBF \u0111\u1ED9 quy\u1EC1n m\u1EB7c \u0111\u1ECBnh cho phi\xEAn m\u1EDBi",
      "loading": "\u0110ang t\u1EA3i",
      "preset.fullAccess": "To\xE0n quy\u1EC1n",
      "preset.readOnly": "Ch\u1EC9 \u0111\u1ECDc",
      "preset.workspaceWrite": "Ghi v\xE0o workspace",
      "title": "Quy\u1EC1n",
      "unavailable": "Kh\xF4ng kh\u1EA3 d\u1EE5ng"
    },
    "settings.pluginInventory": {
      "active": "\u0110ang ch\u1EA1y",
      "clientSyncFailed": "M\u1ED9t s\u1ED1 plugin kh\xF4ng th\u1EC3 \u0111\u1ED3ng b\u1ED9 tr\xEAn trang n\xE0y. Vi\u1EC7c b\u1EADt \u1EDF host kh\xF4ng thay \u0111\u1ED5i.",
      "clientSyncing": "\u0110ang \u0111\u1ED3ng b\u1ED9 plugin tr\xEAn trang n\xE0y\u2026",
      "clientSyncRetry": "Th\u1EED l\u1EA1i trang n\xE0y",
      "condition": "B\u1ECB t\u1EAFt khi",
      "conditionalTag": "C\xF3 \u0111i\u1EC1u ki\u1EC7n",
      "configuration": "C\u1EA5u h\xECnh",
      "disabledTag": "\u0110\xE3 t\u1EAFt",
      "empty": "Kh\xF4ng c\xF3 plugin n\xE0o.",
      "emptySearch": "Kh\xF4ng c\xF3 plugin ph\xF9 h\u1EE3p.",
      "enabledIn": "\u0110\u01B0\u1EE3c b\u1EADt trong",
      "enabledTag": "\u0110\xE3 b\u1EADt",
      "error": "Plugin t\u1EA1m th\u1EDDi kh\xF4ng kh\u1EA3 d\u1EE5ng.",
      "failed": "Kh\u1EDFi \u0111\u1ED9ng th\u1EA5t b\u1EA1i",
      "failedTag": "Th\u1EA5t b\u1EA1i",
      "fromPreset": "T\u1EEB",
      "globalSubtitle": "\u0110\u01B0\u1EE3c h\u1EC7 th\u1ED1ng v\xE0 m\u1ECDi phi\xEAn chia s\u1EBB",
      "globalTitle": "Plugin to\xE0n c\u1EE5c",
      "loading": "\u0110ang \u0111\u1ECDc plugin\u2026",
      "loadingPhase": "\u0110ang t\u1EA3i",
      "matchesInOtherPresets": "{count} k\u1EBFt qu\u1EA3 kh\xE1c trong preset kh\xE1c: ",
      "metadataError": "L\u1ED7i metadata g\xF3i: {error}",
      "moduleLabel": "M\xF4-\u0111un",
      "pending": "\u0110ang ch\u1EDD ph\u1EE5 thu\u1ED9c",
      "presetEnabledTag": "Qua preset",
      "presetOptionBroken": "{name} (t\u1EA3i th\u1EA5t b\u1EA1i)",
      "presetOptionDefault": "{name} (m\u1EB7c \u0111\u1ECBnh)",
      "presetProvidedDetail": "B\u1ECB t\u1EAFt to\xE0n c\u1EE5c; preset agent cung c\u1EA5p n\xF3 theo t\u1EEBng phi\xEAn",
      "presetSubtitle": "\u0110\u01B0\u1EE3c c\xE1c preset agent k\u1EBFt h\u1EE3p cho t\u1EEBng phi\xEAn",
      "presetTitle": "Plugin c\u1EE7a phi\xEAn",
      "retry": "Th\u1EED l\u1EA1i",
      "runtime": "Tr\u1EA1ng th\xE1i",
      "search": "T\xECm plugin",
      "switcherLabel": "Ch\u1ECDn preset agent \u0111\u1EC3 xem",
      "tab": "Danh s\xE1ch plugin",
      "unloading": "\u0110ang g\u1EE1 t\u1EA3i",
      "unobserved": "Kh\xF4ng ch\u1EA1y"
    },
    "settings.plugins": {
      "empty": "Tri\u1EC3n khai n\xE0y kh\xF4ng cung c\u1EA5p ch\u1EBF \u0111\u1ED9 xem plugin n\xE0o.",
      "intro": "Xem c\xE1c plugin m\xE0 tri\u1EC3n khai n\xE0y cung c\u1EA5p.",
      "nav": "Plugin t\xEDch h\u1EE3p",
      "tabs": "Ch\u1EBF \u0111\u1ED9 xem plugin",
      "title": "Plugin t\xEDch h\u1EE3p"
    },
    "settings.sessionLog": {
      "description": "Gi\xFAp c\u1EA3i thi\u1EC7n model v\xE0 s\u1EA3n ph\u1EA9m DeepSeek.",
      "failed": "Kh\xF4ng th\u1EC3 l\u01B0u t\xF9y ch\u1ECDn",
      "saved": "\u0110\xE3 l\u01B0u t\xF9y ch\u1ECDn",
      "title": "T\u1EA3i nh\u1EADt k\xFD phi\xEAn l\xEAn khi d\xF9ng API model ch\xEDnh th\u1EE9c"
    },
    "settings.shell": {
      "description": "Gi\u1EDBi h\u1EA1n th\u1EDDi gian ch\u1EA1y v\xE0 l\u01B0\u1EE3ng \u0111\u1EA7u ra c\u1EE7a m\u1ED7i l\u1EC7nh.",
      "invalidNumber": "Nh\u1EADp m\u1ED9t s\u1ED1, ho\u1EB7c \u0111\u1EC3 tr\u1ED1ng \u0111\u1EC3 d\xF9ng m\u1EB7c \u0111\u1ECBnh.",
      "maxOutputBytes": "Gi\u1EDBi h\u1EA1n \u0111\u1EA7u ra m\u1ED7i lu\u1ED3ng (byte)",
      "maxOutputBytesHint": "Ph\u1EA7n \u0111\u1EA7u ra v\u01B0\u1EE3t gi\u1EDBi h\u1EA1n s\u1EBD \u0111\u01B0\u1EE3c ghi ra t\u1EC7p t\u1EA1m thay v\xEC b\u1ECB m\u1EA5t.",
      "overridden": "\u0110\xE3 ghi \u0111\xE8",
      "readOnly": "Tri\u1EC3n khai n\xE0y l\u01B0u c\xE0i \u0111\u1EB7t \u1EDF ch\u1EBF \u0111\u1ED9 ch\u1EC9 \u0111\u1ECDc.",
      "reset": "\u0110\u1EB7t l\u1EA1i v\u1EC1 m\u1EB7c \u0111\u1ECBnh",
      "save": "L\u01B0u",
      "saveFailed": "Tri\u1EC3n khai kh\xF4ng ch\u1EA5p nh\u1EADn c\xE1c gi\xE1 tr\u1ECB n\xE0y; ch\xFAng \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i \u0111\u1EC3 b\u1EA1n s\u1EEDa.",
      "saving": "\u0110ang l\u01B0u\u2026",
      "timeoutMs": "Th\u1EDDi gian ch\u1EDD l\u1EC7nh (ms)",
      "timeoutMsHint": "Th\u1EDDi gian m\u1ED9t l\u1EC7nh \u0111\u01B0\u1EE3c ch\u1EA1y tr\u01B0\u1EDBc khi b\u1ECB ch\u1EA5m d\u1EE9t.",
      "title": "Shell",
      "unavailable": "Plugin n\xE0y ch\u01B0a \u0111\u01B0\u1EE3c t\u1EA3i n\xEAn hi\u1EC7n kh\xF4ng th\u1EC3 c\u1EA5u h\xECnh."
    },
    "settings.subagent": {
      "overridden": "\u0110\xE3 ghi \u0111\xE8",
      "readOnly": "Tri\u1EC3n khai n\xE0y l\u01B0u c\xE0i \u0111\u1EB7t \u1EDF ch\u1EBF \u0111\u1ED9 ch\u1EC9 \u0111\u1ECDc.",
      "reset": "\u0110\u1EB7t l\u1EA1i v\u1EC1 m\u1EB7c \u0111\u1ECBnh",
      "save": "L\u01B0u",
      "saveFailed": "Tri\u1EC3n khai kh\xF4ng ch\u1EA5p nh\u1EADn c\xE1c gi\xE1 tr\u1ECB n\xE0y; ch\xFAng \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i \u0111\u1EC3 b\u1EA1n s\u1EEDa.",
      "saving": "\u0110ang l\u01B0u\u2026",
      "subagentCapacityHelp": "T\u1ED5ng s\u1ED1 Subagent \u0111ang ho\u1EA1t \u0111\u1ED9ng d\u01B0\u1EDBi c\xF9ng m\u1ED9t agent ch\xEDnh, tr\xEAn m\u1ECDi c\u1EA5p \u0111\u1EC7 quy. Kh\xF4ng t\xEDnh agent ch\xEDnh. C\xE1c y\xEAu c\u1EA7u kh\u1EDFi ch\u1EA1y m\u1EDBi s\u1EBD b\u1ECB t\u1EEB ch\u1ED1i khi \u0111\u1EA1t gi\u1EDBi h\u1EA1n.",
      "subagentCapacityHelpLabel": "V\u1EC1 gi\u1EDBi h\u1EA1n s\u1ED1 Subagent song song",
      "subagentCapacityInvalid": "Nh\u1EADp m\u1ED9t s\u1ED1 nguy\xEAn t\u1EEB 1 tr\u1EDF l\xEAn.",
      "subagentDepthHelp": "Gi\u1EDBi h\u1EA1n s\u1ED1 c\u1EA5p Subagent m\xE0 m\u1ED9t agent c\xF3 th\u1EC3 t\u1EA1o.",
      "subagentDepthHelpLabel": "V\u1EC1 \u0111\u1ED9 s\xE2u \u0111\u1EC7 quy t\u1ED1i \u0111a",
      "subagentDepthInvalid": "Nh\u1EADp m\u1ED9t s\u1ED1 nguy\xEAn t\u1EEB 0 tr\u1EDF l\xEAn.",
      "subagentDepthOne": "Ch\u1EC9 agent ch\xEDnh m\u1EDBi c\xF3 th\u1EC3 t\u1EA1o Subagent",
      "subagentDepthOverride": "N\u1EBFu m\u1ED9t c\xF4ng c\u1EE5 t\u1EF1 \u0111\u1ECBnh ngh\u0129a \u0111\u1ED9 s\xE2u \u0111\u1EC7 quy t\u1ED1i \u0111a th\xEC c\xE0i \u0111\u1EB7t \u0111\xF3 s\u1EBD \u0111\u01B0\u1EE3c \u01B0u ti\xEAn.",
      "subagentDepthZero": "T\u1EAFt Subagent",
      "subagentDescription": "\u0110\u1EB7t \u0111\u1ED9 s\xE2u \u0111\u1EC7 quy, s\u1ED1 l\u01B0\u1EE3ng v\xE0 model cho Subagent.",
      "subagentLimitsTitle": "Gi\u1EDBi h\u1EA1n",
      "subagentMaxActive": "Gi\u1EDBi h\u1EA1n s\u1ED1 Subagent song song",
      "subagentMaxDepth": "\u0110\u1ED9 s\xE2u \u0111\u1EC7 quy t\u1ED1i \u0111a",
      "subagentModelSelectionAllowed": "Model m\xE0 agent \u0111\u01B0\u1EE3c ph\xE9p ch\u1ECDn",
      "subagentModelSelectionChoose": "Khi b\u1EADt, agent c\xF3 th\u1EC3 ch\u1ECDn nh\xE0 cung c\u1EA5p, model v\xE0 m\u1EE9c suy lu\u1EADn cho t\u1EEBng Subagent trong s\u1ED1 c\xE1c model \u0111\u01B0\u1EE3c c\u1EA5p quy\u1EC1n b\xEAn d\u01B0\u1EDBi. Ch\u1EC9 \xE1p d\u1EE5ng cho phi\xEAn m\u1EDBi.",
      "subagentModelSelectionConflict": "C\xE0i \u0111\u1EB7t \u0111\xE3 thay \u0111\u1ED5i \u1EDF n\u01A1i kh\xE1c. H\xE3y b\u1ECF b\u1EA3n nh\xE1p v\xE0 th\u1EED l\u1EA1i.",
      "subagentModelSelectionEmpty": "Hi\u1EC7n kh\xF4ng nh\xE0 cung c\u1EA5p model n\xE0o c\xF4ng b\u1ED1 model.",
      "subagentModelSelectionLoadFailed": "Kh\xF4ng th\u1EC3 t\u1EA3i model.",
      "subagentModelSelectionLoading": "\u0110ang t\u1EA3i model\u2026",
      "subagentModelSelectionOff": "Subagent d\xF9ng m\u1EB7c \u0111\u1ECBnh \u0111\xE3 c\u1EA5u h\xECnh ho\u1EB7c k\u1EBF th\u1EEBa model c\u1EE7a agent cha. C\xE1c l\u1EF1a ch\u1ECDn model \u0111\xE3 l\u01B0u \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i.",
      "subagentModelSelectionPartial": "M\u1ED9t s\u1ED1 nh\xE0 cung c\u1EA5p model kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c; c\xE1c l\u1EF1a ch\u1ECDn \u0111\xE3 l\u01B0u v\u1EABn c\xF3 th\u1EC3 x\xF3a.",
      "subagentModelSelectionRequired": "Ch\u1ECDn \xEDt nh\u1EA5t m\u1ED9t model tr\u01B0\u1EDBc khi l\u01B0u.",
      "subagentModelSelectionRetry": "Th\u1EED l\u1EA1i",
      "subagentModelSelectionTitle": "Ch\u1ECDn model",
      "subagentModelSelectionToggle": "Cho ph\xE9p agent ch\u1ECDn model cho Subagent",
      "subagentModelSelectionUnavailable": "Hi\u1EC7n kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "subagentModelSelectionUnavailableGroup": "\u0110\xE3 l\u01B0u nh\u01B0ng hi\u1EC7n kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "subagentTitle": "Subagent",
      "unavailable": "Plugin n\xE0y ch\u01B0a \u0111\u01B0\u1EE3c t\u1EA3i n\xEAn hi\u1EC7n kh\xF4ng th\u1EC3 c\u1EA5u h\xECnh."
    },
    "settings.theme": {
      "appearance.dark": "T\u1ED1i",
      "appearance.light": "S\xE1ng",
      "appearance.system": "H\u1EC7 th\u1ED1ng",
      "appearance.title": "Giao di\u1EC7n",
      "fontFamily.code.description": "D\xF9ng cho kh\u1ED1i m\xE3, m\xE3 n\u1ED9i tuy\u1EBFn v\xE0 \u0111\u1EA7u ra c\xF4ng c\u1EE5. Ph\xE2n t\xE1ch c\xE1c ph\xF4ng b\u1EB1ng d\u1EA5u ph\u1EA9y; \u0111\u1EC3 tr\u1ED1ng \u0111\u1EC3 d\xF9ng m\u1EB7c \u0111\u1ECBnh",
      "fontFamily.code.title": "Ph\xF4ng ch\u1EEF m\xE3",
      "fontFamily.placeholder": "M\u1EB7c \u0111\u1ECBnh",
      "fontFamily.terminal.description": "D\xF9ng cho terminal \u1EDF thanh b\xEAn. Ph\xE2n t\xE1ch c\xE1c ph\xF4ng b\u1EB1ng d\u1EA5u ph\u1EA9y; \u0111\u1EC3 tr\u1ED1ng \u0111\u1EC3 d\xF9ng m\u1EB7c \u0111\u1ECBnh",
      "fontFamily.terminal.title": "Ph\xF4ng ch\u1EEF terminal",
      "fontFamily.text.description": "D\xF9ng cho giao di\u1EC7n v\xE0 v\u0103n b\u1EA3n h\u1ED9i tho\u1EA1i. Ph\xE2n t\xE1ch c\xE1c ph\xF4ng b\u1EB1ng d\u1EA5u ph\u1EA9y; \u0111\u1EC3 tr\u1ED1ng \u0111\u1EC3 d\xF9ng m\u1EB7c \u0111\u1ECBnh",
      "fontFamily.text.title": "Ph\xF4ng ch\u1EEF v\u0103n b\u1EA3n",
      "fontSize.code.decrease": "Gi\u1EA3m c\u1EE1 ch\u1EEF m\xE3",
      "fontSize.code.description": "D\xF9ng cho kh\u1ED1i m\xE3, m\xE3 n\u1ED9i tuy\u1EBFn v\xE0 \u0111\u1EA7u ra c\xF4ng c\u1EE5",
      "fontSize.code.increase": "T\u0103ng c\u1EE1 ch\u1EEF m\xE3",
      "fontSize.code.title": "C\u1EE1 ch\u1EEF m\xE3",
      "fontSize.more": "Th\xEAm c\xE0i \u0111\u1EB7t ph\xF4ng ch\u1EEF",
      "fontSize.terminal.decrease": "Gi\u1EA3m c\u1EE1 ch\u1EEF terminal",
      "fontSize.terminal.description": "D\xF9ng cho terminal \u1EDF thanh b\xEAn",
      "fontSize.terminal.increase": "T\u0103ng c\u1EE1 ch\u1EEF terminal",
      "fontSize.terminal.title": "C\u1EE1 ch\u1EEF terminal",
      "fontSize.text.decrease": "Gi\u1EA3m c\u1EE1 ch\u1EEF",
      "fontSize.text.description": "Ch\u1EC9 \u1EA3nh h\u01B0\u1EDFng n\u1ED9i dung h\u1ED9i tho\u1EA1i",
      "fontSize.text.increase": "T\u0103ng c\u1EE1 ch\u1EEF",
      "fontSize.text.title": "C\u1EE1 ch\u1EEF",
      "fontSize.unit": "px"
    },
    "settings.webSearch": {
      "apiKeySet": "\u0110\xE3 c\u1EA5u h\xECnh key.",
      "apiKeyUnsetApi": "Ch\u01B0a c\u1EA5u h\xECnh key n\xE0o.",
      "baseUrl": "URL c\u01A1 s\u1EDF",
      "baseUrlHint": "Bao g\u1ED3m ti\u1EC1n t\u1ED1 API. \u0110\u1EC3 tr\u1ED1ng \u0111\u1EC3 d\xF9ng \u0111\u1ECBa ch\u1EC9 ch\xEDnh th\u1EE9c. Nh\xE0 cung c\u1EA5p s\u1EBD th\xEAm {path}.",
      "billing": "Thanh to\xE1n",
      "billingAccount": "T\xE0i kho\u1EA3n DeepSeek \u0111\xE3 \u0111\u0103ng nh\u1EADp",
      "billingAccountHint": "C\u1EA7n \u0111\u0103ng nh\u1EADp v\xE0o DeepSeek.",
      "billingAdvancedOverride": "B\u1ECB ghi \u0111\xE8 b\u1EDFi {fields}",
      "billingApiKey": "API key DeepSeek",
      "billingApiKeyHint": "D\xF9ng API key t\u1EEB trang Models; h\xE3y thi\u1EBFt l\u1EADp m\u1ED9t key tr\u01B0\u1EDBc.",
      "billingAuto": "T\u1EF1 \u0111\u1ED9ng",
      "billingAutoHint": "Theo t\xE0i kho\u1EA3n DeepSeek ho\u1EB7c API key c\u1EE7a cu\u1ED9c h\u1ED9i tho\u1EA1i; v\u1EDBi c\xE1c model kh\xE1c, d\xF9ng API key tr\u01B0\u1EDBc, r\u1ED3i \u0111\u1EBFn t\xE0i kho\u1EA3n \u0111\xE3 \u0111\u0103ng nh\u1EADp.",
      "count": "K\u1EBFt qu\u1EA3 m\u1ED7i l\u1EA7n t\xECm",
      "countHint": "S\u1ED1 k\u1EBFt qu\u1EA3 tr\u1EA3 v\u1EC1 m\u1ED7i l\u1EA7n t\xECm: 1 \u0111\u1EBFn 50, m\u1EB7c \u0111\u1ECBnh 10.",
      "credential": "API key",
      "description": "Ch\u1ECDn nh\xE0 cung c\u1EA5p d\xF9ng cho t\xECm ki\u1EBFm web v\xE0 t\u1EA3i web.",
      "fetchSection": "Nh\xE0 cung c\u1EA5p t\u1EA3i web",
      "invalidCount": "Nh\u1EADp s\u1ED1 nguy\xEAn t\u1EEB 1 \u0111\u1EBFn 50, ho\u1EB7c \u0111\u1EC3 tr\u1ED1ng \u0111\u1EC3 d\xF9ng m\u1EB7c \u0111\u1ECBnh.",
      "invalidMaxUses": "Nh\u1EADp m\u1ED9t s\u1ED1 nguy\xEAn d\u01B0\u01A1ng, ho\u1EB7c \u0111\u1EC3 tr\u1ED1ng \u0111\u1EC3 d\xF9ng m\u1EB7c \u0111\u1ECBnh.",
      "invalidNumber": "Nh\u1EADp m\u1ED9t s\u1ED1, ho\u1EB7c \u0111\u1EC3 tr\u1ED1ng \u0111\u1EC3 d\xF9ng m\u1EB7c \u0111\u1ECBnh.",
      "legacyKeyHint": "D\xF9ng t\xE0i kho\u1EA3n \u0111\xE3 \u0111\u0103ng nh\u1EADp cho c\xE1c y\xEAu c\u1EA7u model t\xE0i kho\u1EA3n; n\u1EBFu kh\xF4ng th\xEC d\xF9ng API key n\xE0y ({ref}), m\u1EB7c \u0111\u1ECBnh d\xF9ng chung v\u1EDBi Models.",
      "maxUses": "S\u1ED1 t\xECm ki\u1EBFm t\u1ED1i \u0111a m\u1ED7i y\xEAu c\u1EA7u",
      "maxUsesHint": "S\u1ED1 t\xECm ki\u1EBFm ph\xEDa m\xE1y ch\u1EE7 t\u1ED1i \u0111a m\u1ED7i y\xEAu c\u1EA7u Messages: m\u1ED9t s\u1ED1 nguy\xEAn d\u01B0\u01A1ng, m\u1EB7c \u0111\u1ECBnh 5.",
      "overridden": "\u0110\xE3 ghi \u0111\xE8",
      "pluginProviderHint": "\u0110\u1ECBnh c\u1EA5u h\xECnh nh\xE0 cung c\u1EA5p n\xE0y trong ph\u1EA7n c\xE0i \u0111\u1EB7t plugin c\u1EE7a n\xF3.",
      "providerAuto": "T\u1EF1 \u0111\u1ED9ng",
      "providerDeepSeek": "DeepSeek Search API",
      "providerDeepSeekFetch": "DeepSeek Fetch API",
      "providerLegacy": "T\xECm ki\u1EBFm ph\xEDa m\xE1y ch\u1EE7 DeepSeek",
      "providerLocal": "T\u1EA3i tr\u1EF1c ti\u1EBFp",
      "providerMissing": "{id} (ch\u01B0a t\u1EA3i)",
      "providersFailed": "Kh\xF4ng th\u1EC3 t\u1EA3i danh s\xE1ch nh\xE0 cung c\u1EA5p n\xEAn menu n\xE0y c\xF3 th\u1EC3 kh\xF4ng \u0111\u1EA7y \u0111\u1EE7.",
      "readOnly": "B\u1EA3n tri\u1EC3n khai n\xE0y l\u01B0u c\xE0i \u0111\u1EB7t \u1EDF ch\u1EBF \u0111\u1ED9 ch\u1EC9 \u0111\u1ECDc.",
      "reset": "\u0110\u1EB7t l\u1EA1i v\u1EC1 m\u1EB7c \u0111\u1ECBnh",
      "retry": "Th\u1EED l\u1EA1i",
      "save": "L\u01B0u",
      "saveFailed": "B\u1EA3n tri\u1EC3n khai kh\xF4ng ch\u1EA5p nh\u1EADn c\xE1c gi\xE1 tr\u1ECB n\xE0y; ch\xFAng \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i \u0111\u1EC3 b\u1EA1n s\u1EEDa.",
      "saving": "\u0110ang l\u01B0u\u2026",
      "searchAutoHint": "Theo model c\u1EE7a cu\u1ED9c h\u1ED9i tho\u1EA1i: model DeepSeek d\xF9ng t\xECm ki\u1EBFm ph\xEDa m\xE1y ch\u1EE7 DeepSeek, kh\xF4ng t\xEDnh ph\xED theo l\u01B0\u1EE3t t\xECm; c\xE1c model kh\xE1c d\xF9ng DeepSeek Search API.",
      "searchGuide": "H\u01B0\u1EDBng d\u1EABn T\xECm ki\u1EBFm & T\u1EA3i",
      "searchGuideUrl": "https://api-docs.deepseek.com/guides/search",
      "searchSection": "Nh\xE0 cung c\u1EA5p t\xECm ki\u1EBFm web",
      "title": "T\xECm ki\u1EBFm v\xE0 t\u1EA3i web",
      "unavailable": "Plugin n\xE0y ch\u01B0a \u0111\u01B0\u1EE3c t\u1EA3i n\xEAn hi\u1EC7n kh\xF4ng th\u1EC3 c\u1EA5u h\xECnh."
    },
    "shortcuts": {
      "application": "\u1EE8ng d\u1EE5ng",
      "approval": "Khu v\u1EF1c ph\xEA duy\u1EC7t",
      "cancel": "H\u1EE7y",
      "clear": "X\xF3a",
      "clear-search": "X\xF3a t\xECm ki\u1EBFm",
      "close": "\u0110\xF3ng ph\xEDm t\u1EAFt b\xE0n ph\xEDm",
      "close-confirmation": "\u0110\xF3ng x\xE1c nh\u1EADn",
      "conflict": "\u0110\xE3 \u0111\u01B0\u1EE3c d\xF9ng b\u1EDFi \u201C{commands}\u201D",
      "description": "Xem v\xE0 s\u1EEDa c\xE1c ph\xEDm t\u1EAFt v\xE0 h\xE0nh \u0111\u1ED9ng nh\u1EADp li\u1EC7u kh\u1EA3 d\u1EE5ng",
      "desktop-document": "userData/keybindings.json",
      "desktop-reload": "kh\u1EDFi \u0111\u1ED9ng l\u1EA1i Harness",
      "dismiss": "\u0110\xF3ng menu ho\u1EB7c h\u1ED9p tho\u1EA1i tr\xEAn c\xF9ng",
      "edit-label": "S\u1EEDa ph\xEDm t\u1EAFt cho {command}",
      "empty": "Kh\xF4ng c\xF3 ph\xEDm t\u1EAFt ph\xF9 h\u1EE3p",
      "future": "C\u1EA5u h\xECnh ph\xEDm t\u1EAFt trong {location} \u0111\u01B0\u1EE3c t\u1EA1o b\u1EDFi phi\xEAn b\u1EA3n m\u1EDBi h\u01A1n. H\xE3y n\xE2ng c\u1EA5p Harness v\xE0 th\u1EED l\u1EA1i.",
      "global-hint": "M\u1EDF t\u1EEB m\u1ECDi n\u01A1i",
      "input": "Nh\u1EADp tin nh\u1EAFn",
      "invalid": "C\u1EA5u h\xECnh ph\xEDm t\u1EAFt trong {location} b\u1ECB h\u1ECFng. H\xE3y sao l\u01B0u v\xE0 s\u1EEDa c\u1EA5u h\xECnh n\xE0y, r\u1ED3i {reload}.",
      "macos-web-help": "D\xF9ng Command+/, Command+,, Command+Backslash, Control+Backquote, Command+Option+ph\xEDm, ho\u1EB7c Command+Shift+ph\xEDm. C\xE1c t\u1ED5 h\u1EE3p v\u1EDBi ba ho\u1EB7c b\u1ED1n ph\xEDm b\u1ED5 tr\u1EE3 kh\xE1c nhau c\u0169ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3. Ph\xEDm t\u1EAFt c\u1EE7a tr\xECnh duy\u1EC7t ho\u1EB7c h\u1EC7 th\u1ED1ng c\xF3 th\u1EC3 kh\xF4ng \u0111\u1EBFn \u0111\u01B0\u1EE3c trang.",
      "menus": "Menu v\xE0 h\u1ED9p tho\u1EA1i",
      "modified-count": "{count} \u0111\xE3 t\xF9y ch\u1EC9nh",
      "modifier-required": "Bao g\u1ED3m Command, Ctrl ho\u1EB7c Alt trong t\u1ED5 h\u1EE3p.",
      "move": "Di chuy\u1EC3n l\u1EF1a ch\u1ECDn menu",
      "native-failed": "Kh\xF4ng th\u1EC3 b\u1EA3o v\u1EC7 vi\u1EC7c ghi ph\xEDm tr\xEAn desktop. H\xE3y tho\xE1t ghi ph\xEDm v\xE0 th\u1EED l\u1EA1i.",
      "not-ready": "Ph\xEDm t\u1EAFt ch\u01B0a s\u1EB5n s\xE0ng. Vui l\xF2ng th\u1EED l\u1EA1i.",
      "open": "M\u1EDF ph\xEDm t\u1EAFt b\xE0n ph\xEDm",
      "read": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc {location}. H\xE3y ki\u1EC3m tra quy\u1EC1n truy c\u1EADp, r\u1ED3i {reload}.",
      "record": "Nh\u1EA5n t\u1ED5 h\u1EE3p ph\xEDm",
      "record-help": "Th\u1EA3 c\xE1c ph\xEDm \u0111\u1EC3 l\u01B0u. Tab di chuy\u1EC3n gi\u1EEFa c\xE1c h\xE0nh \u0111\u1ED9ng; Esc h\u1EE7y.",
      "reserved": "T\u1ED5 h\u1EE3p n\xE0y \u0111\u01B0\u1EE3c d\xE0nh ri\xEAng cho c\xE1c h\xE0nh \u0111\u1ED9ng h\u1EC7 th\u1ED1ng ho\u1EB7c so\u1EA1n th\u1EA3o v\u0103n b\u1EA3n.",
      "reset": "Kh\xF4i ph\u1EE5c m\u1EB7c \u0111\u1ECBnh",
      "reset-all": "Kh\xF4i ph\u1EE5c t\u1EA5t c\u1EA3 m\u1EB7c \u0111\u1ECBnh",
      "reset-description": "Kh\xF4i ph\u1EE5c ph\xEDm t\u1EAFt m\u1EB7c \u0111\u1ECBnh cho n\u1EC1n t\u1EA3ng n\xE0y. M\u1ECDi ph\xEDm t\u1EAFt \u0111\xE3 s\u1EEDa ho\u1EB7c \u0111\xE3 x\xF3a s\u1EBD \u0111\u01B0\u1EE3c kh\xF4i ph\u1EE5c. C\xE1c n\u1EC1n t\u1EA3ng kh\xE1c kh\xF4ng b\u1ECB \u1EA3nh h\u01B0\u1EDFng.",
      "reset-failed": "Kh\xF4ng th\u1EC3 kh\xF4i ph\u1EE5c m\u1EB7c \u0111\u1ECBnh. Ph\xEDm t\u1EAFt c\u1EE7a b\u1EA1n kh\xF4ng thay \u0111\u1ED5i. Vui l\xF2ng th\u1EED l\u1EA1i.",
      "reset-saved": "\u0110\xE3 kh\xF4i ph\u1EE5c ph\xEDm t\u1EAFt m\u1EB7c \u0111\u1ECBnh",
      "reset-title": "Kh\xF4i ph\u1EE5c t\u1EA5t c\u1EA3 ph\xEDm t\u1EAFt m\u1EB7c \u0111\u1ECBnh?",
      "retry-save": "Th\u1EED l\u01B0u l\u1EA1i",
      "review": "T\xF4i \u0111\xE3 xem c\u1EA5u h\xECnh m\u1EDBi nh\u1EA5t",
      "saved": "\u0110\xE3 s\u1EEDa",
      "search": "T\xECm ph\xEDm t\u1EAFt",
      "select": "Ch\u1ECDn m\u1EE5c menu",
      "settings": "Ph\xEDm t\u1EAFt b\xE0n ph\xEDm",
      "stale": "C\u1EA5u h\xECnh ph\xEDm t\u1EAFt ho\u1EB7c c\xE1c l\u1EC7nh kh\u1EA3 d\u1EE5ng \u0111\xE3 thay \u0111\u1ED5i. H\xE3y xem l\u1EA1i li\xEAn k\u1EBFt m\u1EDBi nh\u1EA5t tr\u01B0\u1EDBc khi l\u01B0u.",
      "title": "Ph\xEDm t\u1EAFt b\xE0n ph\xEDm",
      "too-many-keys": "Ch\u1EC9 gi\u1EEF t\u1ED1i \u0111a hai ph\xEDm kh\xF4ng ph\u1EA3i ph\xEDm b\u1ED5 tr\u1EE3. Th\u1EA3 c\xE1c ph\xEDm \u0111\u1EC3 th\u1EED l\u1EA1i.",
      "unbound": "Kh\xF4ng c\xF3 ph\xEDm t\u1EAFt",
      "unsupported-browser": "Tr\xECnh duy\u1EC7t n\xE0y ch\u01B0a h\u1ED7 tr\u1EE3 t\u1ED5 h\u1EE3p n\xE0y.",
      "unsupported-key": "Ph\xEDm n\xE0y kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3.",
      "using-accepted": "Li\xEAn k\u1EBFt \u0111\u1ECDc th\xE0nh c\xF4ng g\u1EA7n nh\u1EA5t v\u1EABn \u0111ang \u0111\u01B0\u1EE3c d\xF9ng.",
      "using-defaults": "\u0110ang d\xF9ng li\xEAn k\u1EBFt m\u1EB7c \u0111\u1ECBnh.",
      "view": "S\u1EEDa ph\xEDm t\u1EAFt",
      "web-document": "m\u1EE5c localStorage dsh.keybindings.v1 c\u1EE7a trang n\xE0y",
      "web-help": "T\u1ED5 h\u1EE3p tr\xEAn tr\xECnh duy\u1EC7t: Mod+/, Mod+Shift+,, Mod+Shift+.. Mod l\xE0 Command tr\xEAn Mac v\xE0 Ctrl \u1EDF c\xE1c n\u01A1i kh\xE1c.",
      "web-reload": "t\u1EA3i l\u1EA1i trang",
      "windows-web-help": "D\xF9ng Ctrl+/, Ctrl+,, Ctrl+Alt+ph\xEDm, ho\u1EB7c Ctrl+Shift+ph\xEDm. C\xE1c t\u1ED5 h\u1EE3p v\u1EDBi ba ho\u1EB7c b\u1ED1n ph\xEDm b\u1ED5 tr\u1EE3 kh\xE1c nhau c\u0169ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3. Ph\xEDm t\u1EAFt c\u1EE7a tr\xECnh duy\u1EC7t ho\u1EB7c h\u1EC7 th\u1ED1ng c\xF3 th\u1EC3 kh\xF4ng \u0111\u1EBFn \u0111\u01B0\u1EE3c trang.",
      "write-failed": "Kh\xF4ng th\u1EC3 l\u01B0u. Ph\xEDm t\u1EAFt tr\u01B0\u1EDBc \u0111\xF3 v\xE0 b\u1EA3n nh\xE1p hi\u1EC7n t\u1EA1i v\u1EABn \u0111\u01B0\u1EE3c gi\u1EEF. Vui l\xF2ng th\u1EED l\u1EA1i."
    },
    "shortcuts.layout": {
      "toggle": "B\u1EADt/t\u1EAFt thanh b\xEAn tr\xE1i"
    },
    "sidebar": {
      "navigation.label": "\u0110i\u1EC1u h\u01B0\u1EDBng",
      "panels.label": "B\u1EA3ng \u0111i\u1EC1u khi\u1EC3n chung",
      "panels.more": "Th\xEAm",
      "panels.unpin": "B\u1ECF ghim {name} kh\u1ECFi thanh b\xEAn",
      "panels.unpinTooltip": "B\u1ECF ghim kh\u1ECFi thanh b\xEAn tr\xE1i",
      "session.new": "Phi\xEAn m\u1EDBi",
      "session.new.label": "Phi\xEAn m\u1EDBi",
      "toggle.collapse": "Thu g\u1ECDn thanh b\xEAn",
      "toggle.open": "M\u1EDF thanh b\xEAn",
      "version.copied": "\u0110\xE3 sao ch\xE9p phi\xEAn b\u1EA3n"
    },
    "sidebarBrowser": {
      "address.changed": "URL \u0111\xE3 thay \u0111\u1ED5i",
      "address.placeholder": "Nh\u1EADp \u0111\u1ECBa ch\u1EC9 HTTP(S)",
      "address.unknown": "Trang \u0111\xE3 \u0111i\u1EC1u h\u01B0\u1EDBng; khung nh\xFAng n\xE0y kh\xF4ng th\u1EC3 \u0111\u1ECDc URL m\u1EDBi c\u1EE7a n\xF3.",
      "back": "Quay l\u1EA1i",
      "error.application-origin": "Tr\xECnh duy\u1EC7t nh\xFAng kh\xF4ng th\u1EC3 m\u1EDF ch\xEDnh \u1EE9ng d\u1EE5ng DSH.",
      "error.credentials": "\u0110\u1ECBa ch\u1EC9 kh\xF4ng \u0111\u01B0\u1EE3c ch\u1EE9a t\xEAn ng\u01B0\u1EDDi d\xF9ng ho\u1EB7c m\u1EADt kh\u1EA9u.",
      "error.empty": "H\xE3y nh\u1EADp \u0111\u1ECBa ch\u1EC9.",
      "error.invalid": "\u0110\u1ECBa ch\u1EC9 \u0111\xF3 kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c qu\xE1 d\xE0i.",
      "error.protocol": "Ch\u1EC9 h\u1ED7 tr\u1EE3 \u0111\u1ECBa ch\u1EC9 HTTP v\xE0 HTTPS; d\xF9ng Xem tr\u01B0\u1EDBc T\xE0i li\u1EC7u cho t\u1EC7p c\u1EE5c b\u1ED9.",
      "external": "M\u1EDF trong tr\xECnh duy\u1EC7t h\u1EC7 th\u1ED1ng",
      "forward": "Ti\u1EBFn",
      "go": "\u0110i",
      "guide.description": "Duy\u1EC7t c\xE1c trang web",
      "guide.title": "Tr\xECnh duy\u1EC7t",
      "load.failed": "Kh\xF4ng th\u1EC3 t\u1EA3i trang; h\xE3y t\u1EA3i l\u1EA1i ho\u1EB7c m\u1EDF trong tr\xECnh duy\u1EC7t h\u1EC7 th\u1ED1ng.",
      "load.failed.detail": "T\u1EA3i trang th\u1EA5t b\u1EA1i ({code}): {description}",
      "loading": "\u0110ang m\u1EDF\u2026",
      "reload": "T\u1EA3i l\u1EA1i",
      "restore.action": "Kh\xF4i ph\u1EE5c trang",
      "restore.previous": "\u0110\xE3 m\u1EDF tr\u01B0\u1EDBc \u0111\xF3",
      "sandbox.disable": "T\u1EAFt h\u1EA1n ch\u1EBF sandbox",
      "sandbox.enable": "Kh\xF4i ph\u1EE5c h\u1EA1n ch\u1EBF sandbox",
      "sandbox.warning": "H\u1EA1n ch\u1EBF sandbox \u0111\xE3 b\u1ECB t\u1EAFt; trang c\xF3 th\u1EC3 \u0111i\u1EC1u h\u01B0\u1EDBng \u1EE9ng d\u1EE5ng c\u1EA5p cao nh\u1EA5t v\xE0 d\xF9ng t\u1EA3i xu\u1ED1ng, h\u1ED9p tho\u1EA1i modal v\xE0 kh\xF3a nh\u1EADp li\u1EC7u.",
      "shortcut.noSession": "H\xE3y m\u1EDF m\u1ED9t phi\xEAn tr\u01B0\u1EDBc",
      "start": "Nh\u1EADp \u0111\u1ECBa ch\u1EC9 HTTP(S) \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u duy\u1EC7t",
      "type.label": "Tr\xECnh duy\u1EC7t"
    },
    "sidebarCodePreview": {
      "copied": "\u0110\xE3 sao ch\xE9p",
      "copy": "Sao ch\xE9p",
      "title": "M\xE3"
    },
    "sidebarDocumentPreview": {
      "autoRefresh": "T\u1EF1 \u0111\u1ED9ng l\xE0m m\u1EDBi",
      "autoRefresh.disable": "T\u1EAFt t\u1EF1 \u0111\u1ED9ng l\xE0m m\u1EDBi",
      "autoRefresh.enable": "B\u1EADt t\u1EF1 \u0111\u1ED9ng l\xE0m m\u1EDBi",
      "changed": "T\u1EC7p \u0111\xE3 thay \u0111\u1ED5i, \u0111ang hi\u1EC3n th\u1ECB n\u1ED9i dung tr\u01B0\u1EDBc \u0111\xF3.",
      "error.notFound": "Kh\xF4ng t\xECm th\u1EA5y t\u1EC7p. C\xF3 th\u1EC3 t\u1EC7p \u0111\xE3 b\u1ECB di chuy\u1EC3n ho\u1EB7c x\xF3a.",
      "error.notRegularFile": "Kh\xF4ng ph\u1EA3i t\u1EC7p th\u01B0\u1EDDng, kh\xF4ng c\xF3 g\xEC \u0111\u1EC3 hi\u1EC3n th\u1ECB.",
      "error.notText": "Ch\u01B0a h\u1ED7 tr\u1EE3 xem tr\u01B0\u1EDBc cho lo\u1EA1i t\u1EC7p n\xE0y.",
      "error.tooLarge": "Trang n\xE0y v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n {limit} v\xE0 kh\xF4ng th\u1EC3 \u0111\u1ECDc.",
      "error.unavailable": "\u0110\u1ECDc th\u1EA5t b\u1EA1i: {message}",
      "loading": "\u0110ang hi\u1EC3n th\u1ECB t\xE0i li\u1EC7u...",
      "loadMore": "T\u1EA3i th\xEAm",
      "openWith": "M\u1EDF b\u1EB1ng",
      "reload": "\u0110\u1ECDc l\u1EA1i t\u1EC7p",
      "reloadNow": "T\u1EA3i l\u1EA1i",
      "rendererUnavailable": "T\xEDnh n\u0103ng xem tr\u01B0\u1EDBc {name} kh\xF4ng kh\u1EA3 d\u1EE5ng.",
      "resourceUnavailable": "D\u1ECBch v\u1EE5 t\xE0i nguy\xEAn t\u1EC7p kh\xF4ng kh\u1EA3 d\u1EE5ng.",
      "retry": "Th\u1EED l\u1EA1i",
      "unsupportedFile": "Ch\u01B0a h\u1ED7 tr\u1EE3 xem tr\u01B0\u1EDBc cho lo\u1EA1i t\u1EC7p n\xE0y.",
      "viewer.text": "V\u0103n b\u1EA3n thu\u1EA7n",
      "wrap.aria": "Ng\u1EAFt d\xF2ng",
      "wrap.disable": "T\u1EAFt ng\u1EAFt d\xF2ng",
      "wrap.enable": "B\u1EADt ng\u1EAFt d\xF2ng"
    },
    "sidebarExcel": {
      "charts": "bi\u1EC3u \u0111\u1ED3",
      "conditionalFormatting": "\u0111\u1ECBnh d\u1EA1ng c\xF3 \u0111i\u1EC1u ki\u1EC7n",
      "encoding": "Kh\xF4ng th\u1EC3 \u0111\u1ECDc b\u1EA3ng m\xE3 v\u0103n b\u1EA3n n\xE0y. H\xE3y l\u01B0u t\u1EC7p d\u01B0\u1EDBi d\u1EA1ng UTF-8 ho\u1EB7c UTF-16 c\xF3 BOM r\u1ED3i th\u1EED l\u1EA1i.",
      "featureSeparator": ", ",
      "formulaWarning": "S\u1ED5 l\xE0m vi\u1EC7c n\xE0y ch\u1EE9a c\xF4ng th\u1EE9c. K\u1EBFt qu\u1EA3 hi\u1EC3n th\u1ECB c\xF3 th\u1EC3 b\u1ECB thi\u1EBFu ho\u1EB7c kh\xF4ng ch\xEDnh x\xE1c.",
      "images": "h\xECnh \u1EA3nh",
      "invalid": "Kh\xF4ng th\u1EC3 m\u1EDF b\u1EA3ng t\xEDnh n\xE0y. H\xE3y ki\u1EC3m tra \u0111\u1ECBnh d\u1EA1ng, n\u1ED9i dung ho\u1EB7c m\u1EADt kh\u1EA9u b\u1EA3o v\u1EC7.",
      "language": "en",
      "loading": "\u0110ang hi\u1EC3n th\u1ECB t\xE0i li\u1EC7u...",
      "retry": "Th\u1EED l\u1EA1i",
      "shapes": "h\xECnh kh\u1ED1i",
      "timeout": "H\u1EBFt th\u1EDDi gian m\u1EDF s\u1ED5 l\xE0m vi\u1EC7c n\xE0y. H\xE3y th\u1EED t\u1EC7p nh\u1ECF h\u01A1n.",
      "title": "B\u1EA3ng t\xEDnh",
      "tooLarge": "S\u1ED5 l\xE0m vi\u1EC7c n\xE0y v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n k\xEDch th\u01B0\u1EDBc xem tr\u01B0\u1EDBc.",
      "unsupportedNotice": "B\u1EA3n xem tr\u01B0\u1EDBc n\xE0y kh\xF4ng h\u1ED7 tr\u1EE3 {features} trong s\u1ED5 l\xE0m vi\u1EC7c n\xE0y. H\xE3y m\u1EDF b\u1EB1ng \u1EE9ng d\u1EE5ng h\u1EC7 th\u1ED1ng \u0111\u1EC3 c\xF3 tr\u1EA3i nghi\u1EC7m \u0111\u1EA7y \u0111\u1EE7."
    },
    "sidebarFiles": {
      "autoRefresh": "T\u1EF1 \u0111\u1ED9ng l\xE0m m\u1EDBi",
      "autoRefresh.disable": "T\u1EAFt t\u1EF1 \u0111\u1ED9ng l\xE0m m\u1EDBi",
      "autoRefresh.enable": "B\u1EADt t\u1EF1 \u0111\u1ED9ng l\xE0m m\u1EDBi",
      "empty": "Th\u01B0 m\u1EE5c tr\u1ED1ng",
      "emptyHidden": "Kh\xF4ng hi\u1EC3n th\u1ECB c\xE1c m\u1EE5c \u1EA9n",
      "entry.noViewer": "Kh\xF4ng c\xF3 tr\xECnh xem n\xE0o m\u1EDF \u0111\u01B0\u1EE3c t\u1EC7p n\xE0y.",
      "entry.other": "Kh\xF4ng ph\u1EA3i t\u1EC7p hay th\u01B0 m\u1EE5c n\xEAn kh\xF4ng th\u1EC3 m\u1EDF.",
      "error.notDirectory": "\u0110\xF3 kh\xF4ng ph\u1EA3i l\xE0 th\u01B0 m\u1EE5c.",
      "error.notFound": "Th\u01B0 m\u1EE5c \u0111\xF3 kh\xF4ng c\xF2n. C\xF3 th\u1EC3 \u0111\xE3 b\u1ECB di chuy\u1EC3n ho\u1EB7c x\xF3a.",
      "error.outsideWorkspace": "Th\u01B0 m\u1EE5c \u0111\xF3 n\u1EB1m ngo\xE0i workspace n\xEAn thanh b\xEAn s\u1EBD kh\xF4ng \u0111\u1ECDc n\xF3.",
      "error.unavailable": "\u0110\u1ECDc th\u1EA5t b\u1EA1i: {message}",
      "guide.description": "Duy\u1EC7t t\u1EC7p trong workspace c\u1EE7a phi\xEAn n\xE0y",
      "guide.title": "T\u1EC7p trong workspace",
      "loading": "\u0110ang \u0111\u1ECDc\u2026",
      "navigator.hide": "\u1EA8n c\xE2y t\u1EC7p",
      "navigator.resize": "\u0110\u1ED5i k\xEDch th\u01B0\u1EDBc c\xE2y t\u1EC7p",
      "navigator.show": "Hi\u1EC7n c\xE2y t\u1EC7p",
      "noWorkspace": "Phi\xEAn n\xE0y kh\xF4ng c\xF3 th\u01B0 m\u1EE5c workspace.",
      "reload": "T\u1EA3i l\u1EA1i",
      "search.clear": "X\xF3a t\xECm ki\u1EBFm",
      "search.empty": "Kh\xF4ng c\xF3 k\u1EBFt qu\u1EA3 ph\xF9 h\u1EE3p",
      "search.emptyHint.all": "Kh\xF4ng hi\u1EC3n th\u1ECB c\xE1c m\u1EE5c \u1EA9n, c\xE1c t\u1EC7p v\xE0 th\u01B0 m\u1EE5c b\u1ECB lo\u1EA1i tr\u1EEB, v\xE0 nh\u1EEFng m\u1EE5c b\u1ECB b\u1ECF qua b\u1EDFi t\u1EC7p ignore nh\u01B0 .gitignore.",
      "search.emptyHint.both": "Kh\xF4ng hi\u1EC3n th\u1ECB c\xE1c m\u1EE5c \u1EA9n c\u0169ng nh\u01B0 c\xE1c t\u1EC7p v\xE0 th\u01B0 m\u1EE5c b\u1ECB lo\u1EA1i tr\u1EEB.",
      "search.emptyHint.excluded": "Kh\xF4ng hi\u1EC3n th\u1ECB c\xE1c t\u1EC7p v\xE0 th\u01B0 m\u1EE5c b\u1ECB lo\u1EA1i tr\u1EEB.",
      "search.emptyHint.excludedIgnored": "Kh\xF4ng hi\u1EC3n th\u1ECB c\xE1c t\u1EC7p v\xE0 th\u01B0 m\u1EE5c b\u1ECB lo\u1EA1i tr\u1EEB, v\xE0 nh\u1EEFng m\u1EE5c b\u1ECB b\u1ECF qua b\u1EDFi t\u1EC7p ignore nh\u01B0 .gitignore.",
      "search.emptyHint.hidden": "Kh\xF4ng hi\u1EC3n th\u1ECB c\xE1c m\u1EE5c \u1EA9n.",
      "search.emptyHint.hiddenIgnored": "Kh\xF4ng hi\u1EC3n th\u1ECB c\xE1c m\u1EE5c \u1EA9n v\xE0 c\xE1c t\u1EC7p, th\u01B0 m\u1EE5c b\u1ECB b\u1ECF qua b\u1EDFi t\u1EC7p ignore nh\u01B0 .gitignore.",
      "search.emptyHint.ignored": "Kh\xF4ng hi\u1EC3n th\u1ECB c\xE1c t\u1EC7p v\xE0 th\u01B0 m\u1EE5c b\u1ECB b\u1ECF qua b\u1EDFi t\u1EC7p ignore nh\u01B0 .gitignore.",
      "search.emptyHint.label": "L\xFD do kh\xF4ng c\xF3 k\u1EBFt qu\u1EA3 ph\xF9 h\u1EE3p",
      "search.failed": "T\xECm ki\u1EBFm th\u1EA5t b\u1EA1i: {message}",
      "search.incomplete": "T\xECm ki\u1EBFm \u0111\xE3 v\u01B0\u1EE3t gi\u1EDBi h\u1EA1n t\u1EC7p ho\u1EB7c kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c m\u1ED9t s\u1ED1 th\u01B0 m\u1EE5c n\xEAn k\u1EBFt qu\u1EA3 c\xF3 th\u1EC3 kh\xF4ng \u0111\u1EA7y \u0111\u1EE7.",
      "search.placeholder": "T\xECm t\u1EC7p",
      "search.results": "K\u1EBFt qu\u1EA3: {count}",
      "search.retry": "Th\u1EED l\u1EA1i",
      "search.settings": "C\xE0i \u0111\u1EB7t t\xECm ki\u1EBFm",
      "search.showHidden": "Hi\u1EC7n c\xE1c m\u1EE5c \u1EA9n",
      "search.truncated": "Ch\u1EC9 hi\u1EC3n th\u1ECB {count} k\u1EBFt qu\u1EA3 \u0111\u1EA7u ti\xEAn. H\xE3y thu h\u1EB9p t\xECm ki\u1EBFm \u0111\u1EC3 xem ph\u1EA7n c\xF2n l\u1EA1i.",
      "settings.add": "Th\xEAm t\u1EC7p ho\u1EB7c th\u01B0 m\u1EE5c",
      "settings.close": "\u0110\xF3ng",
      "settings.description": "Ch\u1EC9 \u1EA3nh h\u01B0\u1EDFng \u0111\u1EBFn k\u1EBFt qu\u1EA3 t\xECm ki\u1EBFm, kh\xF4ng \u1EA3nh h\u01B0\u1EDFng \u0111\u1EBFn c\xE2y t\u1EC7p.",
      "settings.invalid.absolute": "D\xF9ng \u0111\u01B0\u1EDDng d\u1EABn t\u01B0\u01A1ng \u0111\u1ED1i so v\u1EDBi workspace.",
      "settings.invalid.empty": "Nh\u1EADp t\xEAn ho\u1EB7c \u0111\u01B0\u1EDDng d\u1EABn t\u01B0\u01A1ng \u0111\u1ED1i.",
      "settings.invalid.glob": "\u0110\u01B0\u1EDDng d\u1EABn kh\xF4ng \u0111\u01B0\u1EE3c ch\u1EE9a k\xFD t\u1EF1 \u0111\u1EA1i di\u1EC7n * ? [ ] { } !.",
      "settings.invalid.nul": "\u0110\u01B0\u1EDDng d\u1EABn kh\xF4ng \u0111\u01B0\u1EE3c ch\u1EE9a k\xFD t\u1EF1 NUL.",
      "settings.invalid.parent": "\u0110\u01B0\u1EDDng d\u1EABn kh\xF4ng \u0111\u01B0\u1EE3c ch\u1EE9a \u0111o\u1EA1n . ho\u1EB7c ..",
      "settings.remove": "X\xF3a {path}",
      "settings.respectGitignore": "Tu\xE2n th\u1EE7 t\u1EC7p ignore (.gitignore, v.v.)",
      "settings.restore": "Kh\xF4i ph\u1EE5c danh s\xE1ch m\u1EB7c \u0111\u1ECBnh",
      "settings.title": "T\u1EC7p v\xE0 th\u01B0 m\u1EE5c b\u1ECB lo\u1EA1i tr\u1EEB",
      "settings.toggle": "Lo\u1EA1i tr\u1EEB {path}",
      "shortcut.noSession": "H\xE3y ch\u1ECDn m\u1ED9t phi\xEAn tr\u01B0\u1EDBc",
      "truncated": "Qu\xE1 nhi\u1EC1u m\u1EE5c, ch\u1EC9 hi\u1EC3n th\u1ECB m\u1ED9t ph\u1EA7n trong s\u1ED1 \u0111\xF3.",
      "type.label": "T\u1EC7p"
    },
    "sidebarImage": {
      "failed": "Kh\xF4ng th\u1EC3 hi\u1EC3n th\u1ECB h\xECnh \u1EA3nh n\xE0y.",
      "loading": "\u0110ang hi\u1EC3n th\u1ECB t\xE0i li\u1EC7u...",
      "preview": "Xem tr\u01B0\u1EDBc h\xECnh \u1EA3nh: {name}",
      "title": "H\xECnh \u1EA3nh",
      "unsupported": "Xem tr\u01B0\u1EDBc h\xECnh \u1EA3nh c\u1EA7n n\u1ED9i dung t\u1EC7p \u0111\u1EA7y \u0111\u1EE7.",
      "zoomControls": "\u0110i\u1EC1u khi\u1EC3n thu ph\xF3ng",
      "zoomFitWidth": "V\u1EEBa chi\u1EC1u r\u1ED9ng",
      "zoomIn": "Ph\xF3ng to",
      "zoomMenu": "Ch\u1ECDn m\u1EE9c thu ph\xF3ng",
      "zoomOut": "Thu nh\u1ECF",
      "zoomValue": "{percent}%"
    },
    "sidebarOffice": {
      "busy": "Xem tr\u01B0\u1EDBc Office \u0111ang b\u1EADn. H\xE3y th\u1EED l\u1EA1i sau gi\xE2y l\xE1t.",
      "changed": "T\u1EC7p \u0111\xE3 thay \u0111\u1ED5i trong khi \u0111ang \u0111\u1ECDc. H\xE3y m\u1EDF l\u1EA1i b\u1EA3n xem tr\u01B0\u1EDBc.",
      "closeDetails": "\u0110\xF3ng chi ti\u1EBFt ph\xF4ng ch\u1EEF",
      "failed": "Chuy\u1EC3n \u0111\u1ED5i Office kh\xF4ng t\u1EA1o ra PDF d\xF9ng \u0111\u01B0\u1EE3c. H\xE3y ki\u1EC3m tra t\u1EC7p v\xE0 th\u1EED l\u1EA1i.",
      "invalid": "Kh\xF4ng th\u1EC3 xem tr\u01B0\u1EDBc t\u1EC7p Office n\xE0y. T\u1EC7p c\xF3 th\u1EC3 b\u1ECB h\u1ECFng, c\xF3 m\u1EADt kh\u1EA9u b\u1EA3o v\u1EC7 ho\u1EB7c sai ph\u1EA7n m\u1EDF r\u1ED9ng.",
      "loading": "\u0110ang hi\u1EC3n th\u1ECB t\xE0i li\u1EC7u...",
      "missingFontsCount": "Ph\xF4ng ch\u1EEF: {count}",
      "missingFontsDescription": "C\xE1c ph\xF4ng ch\u1EEF n\xE0y kh\xF4ng kh\u1EA3 d\u1EE5ng cho b\u1EA3n xem tr\u01B0\u1EDBc. V\u0103n b\u1EA3n v\xE0 b\u1ED1 c\u1EE5c c\xF3 th\u1EC3 kh\xE1c t\xE0i li\u1EC7u g\u1ED1c.",
      "missingFontsTitle": "Ph\xF4ng ch\u1EEF b\u1ECB thi\u1EBFu",
      "retry": "Th\u1EED l\u1EA1i",
      "timeout": "Chuy\u1EC3n \u0111\u1ED5i Office h\u1EBFt th\u1EDDi gian. H\xE3y th\u1EED l\u1EA1i.",
      "title": "T\xE0i li\u1EC7u Office",
      "tooLarge": "T\u1EC7p Office ho\u1EB7c PDF \u0111\xE3 chuy\u1EC3n \u0111\u1ED5i v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n k\xEDch th\u01B0\u1EDBc xem tr\u01B0\u1EDBc. H\xE3y gi\u1EA3m k\xEDch th\u01B0\u1EDBc t\u1EC7p ho\u1EB7c \u0111i\u1EC1u ch\u1EC9nh c\u1EA5u h\xECnh xem tr\u01B0\u1EDBc.",
      "unavailable": "Xem tr\u01B0\u1EDBc Office kh\xF4ng kh\u1EA3 d\u1EE5ng. H\xE3y b\u1EADt d\u1ECBch v\u1EE5 xem tr\u01B0\u1EDBc t\xE0i li\u1EC7u tr\xEAn m\xE1y ch\u1EA1y DeepSeek Harness.",
      "viewMissingFonts": "Thi\u1EBFu ph\xF4ng ch\u1EEF: {count}. Nh\u1EA5n \u0111\u1EC3 xem."
    },
    "sidebarPdf": {
      "failed": "Kh\xF4ng th\u1EC3 hi\u1EC3n th\u1ECB PDF: {message}",
      "loading": "\u0110ang hi\u1EC3n th\u1ECB t\xE0i li\u1EC7u...",
      "pageImage": "Trang PDF {page}",
      "password": "PDF n\xE0y c\u1EA7n m\u1EADt kh\u1EA9u; kh\xF4ng h\u1ED7 tr\u1EE3 xem tr\u01B0\u1EDBc c\xF3 m\u1EADt kh\u1EA9u b\u1EA3o v\u1EC7.",
      "rendering": "\u0110ang k\u1EBFt xu\u1EA5t trang\u2026",
      "retry": "Th\u1EED l\u1EA1i",
      "title": "PDF",
      "unsupported": "Xem tr\u01B0\u1EDBc PDF c\u1EA7n n\u1ED9i dung t\u1EC7p \u0111\u1EA7y \u0111\u1EE7.",
      "workerFailed": "Ti\u1EBFn tr\xECnh k\u1EBFt xu\u1EA5t PDF kh\xF4ng th\u1EC3 ti\u1EBFp t\u1EE5c. Vui l\xF2ng th\u1EED l\u1EA1i.",
      "zoomControls": "\u0110i\u1EC1u khi\u1EC3n thu ph\xF3ng",
      "zoomFitWidth": "V\u1EEBa chi\u1EC1u r\u1ED9ng",
      "zoomIn": "Ph\xF3ng to",
      "zoomMenu": "Ch\u1ECDn m\u1EE9c thu ph\xF3ng",
      "zoomOut": "Thu nh\u1ECF",
      "zoomValue": "{percent}%"
    },
    "sidebarRight": {
      "chrome.collapse": "Thu g\u1ECDn thanh b\xEAn",
      "chrome.collapseAria": "Thu g\u1ECDn thanh b\xEAn ph\u1EA3i",
      "chrome.exitFullscreen": "Tho\xE1t to\xE0n m\xE0n h\xECnh",
      "chrome.expand": "M\u1EDF thanh b\xEAn",
      "chrome.expandAria": "M\u1EDF thanh b\xEAn ph\u1EA3i",
      "chrome.toFullscreen": "To\xE0n m\xE0n h\xECnh",
      "command.budget": "Gi\u1EDBi h\u1EA1n l\xE0 hai khung",
      "command.close": "\u0110\xF3ng trang ho\u1EB7c c\u1EEDa s\u1ED5 hi\u1EC7n t\u1EA1i",
      "command.collapsed": "H\xE3y m\u1EDF r\u1ED9ng thanh b\xEAn ph\u1EA3i tr\u01B0\u1EDBc",
      "command.empty": "H\xE3y m\u1EDF m\u1ED9t trang tr\u01B0\u1EDBc",
      "command.float": "H\xE0nh \u0111\u1ED9ng n\xE0y kh\xF4ng kh\u1EA3 d\u1EE5ng trong b\u1EA3ng n\u1ED5i",
      "command.fullscreen": "B\u1EADt/t\u1EAFt to\xE0n m\xE0n h\xECnh b\u1EA3ng \u0111i\u1EC1u khi\u1EC3n",
      "command.noFocus": "H\xE3y focus m\u1ED9t khung thanh b\xEAn ph\u1EA3i tr\u01B0\u1EDBc",
      "command.noRefresh": "Kh\xF4ng th\u1EC3 l\xE0m m\u1EDBi trang n\xE0y",
      "command.noSession": "H\xE3y ch\u1ECDn m\u1ED9t phi\xEAn tr\u01B0\u1EDBc",
      "command.refresh": "L\xE0m m\u1EDBi trang hi\u1EC7n t\u1EA1i",
      "command.stale": "Trang \u0111\xE3 thay \u0111\u1ED5i; h\xE3y focus l\u1EA1i",
      "command.toggle": "B\u1EADt/t\u1EAFt thanh b\xEAn ph\u1EA3i",
      "command.width": "Kh\xF4ng \u0111\u1EE7 chi\u1EC1u r\u1ED9ng \u0111\u1EC3 chia, h\xE3y m\u1EDF r\u1ED9ng thanh b\xEAn",
      "dock.addTab": "Tab m\u1EDBi",
      "dock.closeFloat": "\u0110\xF3ng",
      "dock.closeTab": "\u0110\xF3ng",
      "dock.dockFloat": "G\u1EEDi l\u1EA1i v\u1EC1 thanh b\xEAn",
      "dock.drop.bottom": "Th\xEAm chia d\u01B0\u1EDBi",
      "dock.drop.center": "Di chuy\u1EC3n \u0111\u1EBFn \u0111\xE2y",
      "dock.drop.left": "Th\xEAm chia tr\xE1i",
      "dock.drop.right": "Th\xEAm chia ph\u1EA3i",
      "dock.drop.top": "Th\xEAm chia tr\xEAn",
      "dock.emptyPane": "Khung tr\u1ED1ng",
      "dock.splitPane": "Chia",
      "dock.splitPaneDisabled": "Gi\u1EDBi h\u1EA1n l\xE0 hai khung",
      "dock.splitPaneNarrow": "Kh\xF4ng \u0111\u1EE7 chi\u1EC1u r\u1ED9ng \u0111\u1EC3 chia, h\xE3y m\u1EDF r\u1ED9ng thanh b\xEAn",
      "menu.close": "\u0110\xF3ng",
      "menu.closeOthers": "\u0110\xF3ng c\xE1c tab kh\xE1c",
      "menu.closeRight": "\u0110\xF3ng c\xE1c tab b\xEAn ph\u1EA3i",
      "tab.guide.more": "Th\xEAm c\xF4ng c\u1EE5",
      "tab.guide.title": "B\u1EAFt \u0111\u1EA7u",
      "tab.unavailable": "Ch\u01B0a c\xF3 g\xEC \u1EDF \u0111\xE2y xem \u0111\u01B0\u1EE3c lo\u1EA1i n\u1ED9i dung n\xE0y."
    },
    "sidebarTerminal": {
      "attachmentEnded": "K\u1EBFt n\u1ED1i terminal \u0111\xE3 k\u1EBFt th\xFAc. H\xE3y k\u1EBFt n\u1ED1i l\u1EA1i \u0111\u1EC3 ti\u1EBFp t\u1EE5c.",
      "badge.agent": "Agent",
      "badge.agentHint": "Do agent m\u1EDF. G\xF5 \u1EDF \u0111\xE2y s\u1EBD gi\xE0nh quy\u1EC1n \u0111i\u1EC1u khi\u1EC3n; sau \u0111\xF3 agent ch\u1EC9 c\xF3 th\u1EC3 \u0111\u1ECDc.",
      "badge.readOnlyHint": "C\xE1c l\u1EC7nh ch\u1EA1y trong sandbox ch\u1EC9 \u0111\u1ECDc c\u1EE7a agent, k\u1EC3 c\u1EA3 l\u1EC7nh b\u1EA1n g\xF5 \u1EDF \u0111\xE2y.",
      "badge.sandbox": "Sandbox",
      "badge.workspaceWriteHint": "C\xE1c l\u1EC7nh ch\u1EA1y trong sandbox workspace c\u1EE7a agent, k\u1EC3 c\u1EA3 l\u1EC7nh b\u1EA1n g\xF5 \u1EDF \u0111\xE2y.",
      "cleanupFailed": "Kh\xF4ng th\u1EC3 k\u1EBFt th\xFAc terminal \u201C{title}\u201D: {message}",
      "closed": "Terminal \u0111\xE3 \u0111\xF3ng.",
      "connecting": "\u0110ang k\u1EBFt n\u1ED1i\u2026",
      "control": "Gi\xE0nh quy\u1EC1n \u0111i\u1EC1u khi\u1EC3n",
      "creating": "\u0110ang kh\u1EDFi \u0111\u1ED9ng\u2026",
      "description": "Ch\u1EA1y l\u1EC7nh trong workspace c\u1EE7a phi\xEAn",
      "disconnected": "\u0110\xE3 ng\u1EAFt k\u1EBFt n\u1ED1i.",
      "exited": "Ti\u1EBFn tr\xECnh \u0111\xE3 tho\xE1t ({code})",
      "failed": "L\u1ED7i terminal: {message}",
      "inputFull": "B\u1ED9 \u0111\u1EC7m \u0111\u1EA7u v\xE0o \u0111\xE3 \u0111\u1EA7y. H\xE3y k\u1EBFt n\u1ED1i l\u1EA1i v\xE0 th\u1EED l\u1EA1i.",
      "invalidOutput": "Kh\xF4ng th\u1EC3 nh\u1EADn m\xE0n h\xECnh terminal. H\xE3y k\u1EBFt n\u1ED1i l\u1EA1i \u0111\u1EC3 kh\xF4i ph\u1EE5c.",
      "loading": "\u0110ang \u0111\u1ECDc m\xF4i tr\u01B0\u1EDDng terminal\u2026",
      "missingTerminal": "Terminal n\xE0y kh\xF4ng c\xF2n t\u1ED3n t\u1EA1i. H\xE3y m\u1EDF m\u1ED9t terminal m\u1EDBi.",
      "new": "Terminal m\u1EDBi",
      "readonly": "Ch\u1EBF \u0111\u1ED9 xem n\xE0y ch\u1EC9 \u0111\u1ECDc.",
      "reconnect": "K\u1EBFt n\u1ED1i l\u1EA1i",
      "recoveryFailed": "Kh\xF4i ph\u1EE5c terminal th\u1EA5t b\u1EA1i: {message}",
      "rename": "T\xEAn terminal",
      "retry": "Th\u1EED l\u1EA1i",
      "retryRecovery": "Th\u1EED l\u1EA1i kh\xF4i ph\u1EE5c terminal",
      "shell": "Ch\u1ECDn shell",
      "shellEmpty": "Kh\xF4ng c\xF3 shell n\xE0o kh\u1EA3 d\u1EE5ng",
      "shellLoading": "\u0110ang t\u1EA3i shell\u2026",
      "shortcut.noSession": "Ch\u1ECDn m\u1ED9t phi\xEAn tr\u01B0\u1EDBc",
      "terminalLimit": "\u0110\xE3 \u0111\u1EA1t gi\u1EDBi h\u1EA1n terminal. H\xE3y \u0111\xF3ng c\xE1c terminal kh\xF4ng d\xF9ng v\xE0 th\u1EED l\u1EA1i. Terminal \u0111\xE3 tho\xE1t c\u0169ng \u0111\u01B0\u1EE3c t\xEDnh v\xE0o gi\u1EDBi h\u1EA1n.",
      "title": "Terminal",
      "unavailable": "Kh\xF4ng kh\u1EA3 d\u1EE5ng"
    },
    "skill": {
      "menu.userOnly": "ch\u1EC9 ng\u01B0\u1EDDi d\xF9ng",
      "row.failed": "T\u1EA3i skill th\u1EA5t b\u1EA1i",
      "row.inspect": "Xem chi ti\u1EBFt",
      "row.instructions": "H\u01B0\u1EDBng d\u1EABn",
      "row.preparing": "\u0110ang chu\u1EA9n b\u1ECB t\u1EA3i skill",
      "row.running": "\u0110ang t\u1EA3i skill",
      "row.stopped": "\u0110\xE3 d\u1EEBng t\u1EA3i skill",
      "row.title": "Skill"
    },
    "slash.menu": {
      "command": "L\u1EC7nh",
      "crumbs.aria": "\u0110i\u1EC1u h\u01B0\u1EDBng th\u01B0 m\u1EE5c",
      "drill.aria": "Duy\u1EC7t th\u01B0 m\u1EE5c",
      "drill.hint": "Duy\u1EC7t th\u01B0 m\u1EE5c",
      "drill.key": "Tab",
      "loading": "\u0110ang t\u1EA3i\u2026",
      "skill": "Skill",
      "subagent": "Agent con",
      "suggestions.aria": "G\u1EE3i \xFD k\xEDch ho\u1EA1t"
    },
    "stats": {
      "bar.gap": "kho\u1EA3ng tr\u1ED1ng so v\u1EDBi b\u01B0\u1EDBc tr\u01B0\u1EDBc {value}",
      "bar.gen": "sinh {value}",
      "bar.rest": "kh\xE1c {value}",
      "bar.running": "ch\u01B0a ho\xE0n t\u1EA5t: \u0111\xE2y l\xE0 th\u1EDDi gian \u0111\xE3 tr\xF4i qua",
      "bar.start": "b\u1EAFt \u0111\u1EA7u {clock}",
      "bar.tool": "l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 {value}",
      "bar.ttft": "token \u0111\u1EA7u {value}",
      "bar.wall": "t\u1ED5ng {value}",
      "cache.detail": "\u0111\u1ECDc cache {read} \xB7 input {input} \xB7 ghi cache {write}",
      "collapse.all": "Thu g\u1ECDn t\u1EA5t c\u1EA3",
      "column.cache": "Tr\xFAng cache",
      "column.cache.title": "cache read \xF7 (input + cache read + cache write): t\u1EF7 l\u1EC7 l\u1EDDi nh\u1EAFc \u0111\u01B0\u1EE3c ph\u1EE5c v\u1EE5 t\u1EEB cache",
      "column.context": "Ng\u1EEF c\u1EA3nh",
      "column.context.title": "token \u0111\u1EA7u v\xE0o c\u1EE7a usage + cache read + cache write",
      "column.did": "Th\u1EF1c thi",
      "column.did.title": "C\xE1c c\xF4ng c\u1EE5 b\u01B0\u1EDBc n\xE0y \u0111\xE3 g\u1ECDi v\xE0 s\u1ED1 l\u1EA7n; b\u01B0\u1EDBc kh\xF4ng g\u1ECDi c\xF4ng c\u1EE5 s\u1EBD xem tr\u01B0\u1EDBc v\u0103n b\u1EA3n tr\u1EA3 l\u1EDDi",
      "column.model": "Th\u1EDDi gian model",
      "column.model.title": "t\u1EEB l\xFAc b\u01B0\u1EDBc b\u1EAFt \u0111\u1EA7u \u0111\u1EBFn ph\u1EA3n h\u1ED3i ho\xE0n t\u1EA5t (bao g\u1ED3m \u0111\u1ED9 tr\u1EC5 token \u0111\u1EA7u)",
      "column.output": "\u0110\u1EA7u ra",
      "column.output.title": "token \u0111\u1EA7u ra c\u1EE7a b\u01B0\u1EDBc theo usage",
      "column.prompt": "K\xEDch ho\u1EA1t",
      "column.prompt.title": "\u0110i\u1EC1u g\xEC \u0111\xE3 m\u1EDF l\u01B0\u1EE3t n\xE0y: l\u1EDDi nh\u1EAFc c\u1EE7a ng\u01B0\u1EDDi d\xF9ng hi\u1EC3n th\u1ECB v\u0103n b\u1EA3n, t\u1EF1 \u0111\u1ED9ng h\xF3a hi\u1EC3n th\u1ECB nh\xE3n ngu\u1ED3n",
      "column.scope": "L\u01B0\u1EE3t / b\u01B0\u1EDBc",
      "column.scope.title": "D\xF2ng l\u01B0\u1EE3t ch\u1EE9a t\u1ED5ng c\u1EE7a l\u01B0\u1EE3t; nh\u1EA5p v\xE0o d\xF2ng \u0111\u1EC3 m\u1EDF r\u1ED9ng ho\u1EB7c thu g\u1ECDn c\xE1c b\u01B0\u1EDBc",
      "column.time": "T\u1ED5ng th\u1EDDi gian",
      "column.time.title": "ph\xE2n t\xE1ch t\u1ED5ng: xanh nh\u1EA1t l\xE0 token \u0111\u1EA7u, xanh d\u01B0\u01A1ng l\xE0 sinh, cam l\xE0 l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5, x\xE1m l\xE0 ph\u1EA7n c\xF2n l\u1EA1i. \u0110\u1ED9 d\xE0i thanh d\xF9ng thang c\u0103n b\u1EADc hai; c\xE1c b\u01B0\u1EDBc ch\u1EC9 so s\xE1nh v\u1EDBi b\u01B0\u1EDBc trong c\xF9ng l\u01B0\u1EE3t, c\xE1c l\u01B0\u1EE3t so v\u1EDBi nhau",
      "column.tool": "Th\u1EDDi gian c\xF4ng c\u1EE5",
      "column.tool.title": "t\u1ED5ng th\u1EDDi gian c\u1EE7a m\u1ECDi l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 cho \u0111\u1EBFn khi c\xF3 k\u1EBFt qu\u1EA3 trong b\u01B0\u1EDBc; c\xE1c l\u1EC7nh g\u1ECDi kh\xF4ng c\xF3 k\u1EBFt qu\u1EA3 b\u1ECB lo\u1EA1i tr\u1EEB",
      "column.tps": "T\u1ED1c \u0111\u1ED9 \u0111\u1EA7u ra",
      "column.tps.title": "token \u0111\u1EA7u ra \xF7 s\u1ED1 gi\xE2y sinh (TPS, tok/s)",
      "column.ttft": "Token \u0111\u1EA7u",
      "column.ttft.title": "t\u1EEB l\xFAc b\u01B0\u1EDBc b\u1EAFt \u0111\u1EA7u \u0111\u1EBFn m\u1EA3nh \u0111\u1EA7u ra \u0111\u1EA7u ti\xEAn (TTFT)",
      "compaction.label": "N\xE9n",
      "compaction.running": "\u0110ang n\xE9n\u2026",
      "compaction.shadowed": "\u0110\xE3 l\u01B0\u1EE3c b\u1ECF {tokens} token l\u1ECBch s\u1EED",
      "compaction.summary": "B\u1EA3n t\xF3m t\u1EAFt {chars} k\xFD t\u1EF1",
      "compaction.title": "C\xE1c l\u1EA7n n\xE9n \u0111\u01B0\u1EE3c hi\u1EC3n th\u1ECB ri\xEAng v\xE0 kh\xF4ng t\xEDnh v\xE0o t\u1ED5ng c\xE1c b\u01B0\u1EDBc c\u1EE7a l\u01B0\u1EE3t",
      "context.delta.show": "Hi\u1EC7n ch\xEAnh l\u1EC7ch ng\u1EEF c\u1EA3nh",
      "context.delta.title": "Ch\xEAnh l\u1EC7ch l\u1EDDi nh\u1EAFc so v\u1EDBi b\u01B0\u1EDBc \u0111\u01B0\u1EE3c \u0111o tr\u01B0\u1EDBc \u0111\xF3 trong l\u01B0\u1EE3t; gi\xE1 tr\u1ECB \xE2m ngh\u0129a l\xE0 ng\u1EEF c\u1EA3nh \u0111\xE3 thu g\u1ECDn (v\xED d\u1EE5 sau khi n\xE9n)",
      "contextMode.cumulative": "T\xEDch l\u0169y",
      "contextMode.cumulative.title": "D\xF2ng l\u01B0\u1EE3t hi\u1EC3n th\u1ECB t\u1ED5ng k\xEDch th\u01B0\u1EDBc l\u1EDDi nh\u1EAFc c\u1EE7a c\xE1c b\u01B0\u1EDBc trong l\u01B0\u1EE3t (x\u1EED l\xFD t\xEDch l\u0169y); d\xF2ng t\u1ED5ng v\u1EABn l\xE0 t\xEDch l\u0169y",
      "contextMode.label": "C\u01A1 s\u1EDF ng\u1EEF c\u1EA3nh",
      "contextMode.latest": "M\u1EDBi nh\u1EA5t",
      "contextMode.latest.title": "D\xF2ng l\u01B0\u1EE3t hi\u1EC3n th\u1ECB k\xEDch th\u01B0\u1EDBc l\u1EDDi nh\u1EAFc c\u1EE7a b\u01B0\u1EDBc \u0111\u01B0\u1EE3c \u0111o g\u1EA7n nh\u1EA5t (ng\u1EEF c\u1EA3nh cu\u1ED1i); d\xF2ng t\u1ED5ng v\u1EABn l\xE0 t\xEDch l\u0169y",
      "detail.answer": "Tr\u1EA3 l\u1EDDi",
      "detail.answer.truncated": "Tr\u1EA3 l\u1EDDi d\xE0i; ch\u1EC9 gi\u1EEF 16,000 k\xFD t\u1EF1 \u0111\u1EA7u",
      "detail.args": "\u0111\u1ED1i s\u1ED1 th\xF4",
      "detail.calls": "{count} l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5",
      "detail.chars": "{chars} k\xFD t\u1EF1",
      "detail.code.title": "Kh\u1ED1i m\xE3",
      "detail.code.unwrap": "Kh\xF4ng ng\u1EAFt d\xF2ng",
      "detail.code.wrap": "Ng\u1EAFt d\xF2ng",
      "detail.copied": "\u0110\xE3 sao ch\xE9p",
      "detail.copy": "Sao ch\xE9p",
      "detail.copy.title": "Sao ch\xE9p v\u0103n b\u1EA3n n\xE0y",
      "detail.copyFailed": "Sao ch\xE9p th\u1EA5t b\u1EA1i",
      "detail.diff": "thay \u0111\u1ED5i",
      "detail.emptyBody": "L\u1EC7nh g\u1ECDi n\xE0y kh\xF4ng \u0111\u1EC3 l\u1EA1i v\u0103n b\u1EA3n",
      "detail.file": "t\u1EC7p",
      "detail.footnotes": "Ch\xFA th\xEDch",
      "detail.hidden": "{count} l\u1EC7nh g\u1ECDi kh\xE1c kh\xF4ng \u0111\u01B0\u1EE3c li\u1EC7t k\xEA (t\u1ED1i \u0111a {limit} m\u1ED7i b\u01B0\u1EDBc)",
      "detail.hide": "\u1EA9n",
      "detail.lineCap": "\u0110ang hi\u1EC7n {shown} d\xF2ng \u0111\u1EA7u trong {total} d\xF2ng",
      "detail.lines": "{lines} d\xF2ng",
      "detail.raw.title": "Hi\u1EC7n \u0111\u1ED1i s\u1ED1 JSON th\xF4",
      "detail.show": "chi ti\u1EBFt",
      "detail.title": "Nh\u1EA5p v\xE0o d\xF2ng n\xE0y \u0111\u1EC3 m\u1EDF r\u1ED9ng ho\u1EB7c thu g\u1ECDn chi ti\u1EBFt c\xF4ng c\u1EE5",
      "detail.truncated": "Qu\xE1 d\xE0i: ch\u1EC9 gi\u1EEF {chars} k\xFD t\u1EF1 \u0111\u1EA7u",
      "detail.wrap": "Ng\u1EAFt d\xF2ng",
      "detail.wrap.title": "Ng\u1EAFt c\xE1c d\xF2ng d\xE0i thay v\xEC cu\u1ED9n ngang",
      "did.aborted": "kh\xF4ng c\xF3 tr\u1EA3 l\u1EDDi",
      "did.answer": "tr\u1EA3 l\u1EDDi",
      "did.chars": "{chars} k\xFD t\u1EF1",
      "did.lines": "{lines} d\xF2ng",
      "did.lines.unit": "d\xF2ng",
      "did.more": "th\xEAm {count}",
      "did.output": "\u2192 {chars} k\xFD t\u1EF1",
      "did.rest": "th\xEAm {count} l\u1EC7nh g\u1ECDi",
      "did.retry": "th\u1EED l\u1EA1i {count}\xD7",
      "did.title": "{calls} l\u1EC7nh g\u1ECDi: {tools}",
      "did.total": "{chars} k\xFD t\u1EF1 \u0111\u1EA7u ra c\xF4ng c\u1EE5 trong b\u01B0\u1EDBc n\xE0y; ch\xFAng tr\u1EDF th\xE0nh m\u1ED9t ph\u1EA7n c\u1EE7a l\u1EDDi nh\u1EAFc ti\u1EBFp theo",
      "did.working": "\u0111ang sinh",
      "empty": "Kh\xF4ng c\xF3 b\u01B0\u1EDBc n\xE0o \u0111o \u0111\u01B0\u1EE3c trong c\u1EEDa s\u1ED5 hi\u1EC7n t\u1EA1i.",
      "event.approval": "Ph\xEA duy\u1EC7t",
      "event.approval.allowed": "cho ph\xE9p m\u1ED9t l\u1EA7n",
      "event.approval.asked": "\u0111ang ch\u1EDD",
      "event.approval.cancelled": "\u0111\xE3 h\u1EE7y",
      "event.approval.detail": "{tool} \xB7 {status}",
      "event.approval.rejected": "b\u1ECB t\u1EEB ch\u1ED1i",
      "event.approval.unavailable": "kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "event.attempt.detail": "L\u1EA7n th\u1EED model kh\xF4ng c\xF3 tin nh\u1EAFn \u0111\u01B0\u1EE3c ghi nh\u1EADn",
      "event.context-prune": "L\u01B0\u1EE3c b\u1ECF ng\u1EEF c\u1EA3nh",
      "event.context-refresh": "L\xE0m m\u1EDBi ng\u1EEF c\u1EA3nh",
      "event.context.detail": "{provider} / {model} \xB7 ch\u1EBF \u0111\u1ED9 l\u1EDDi nh\u1EAFc {mode}",
      "event.header.detail": "{reason} \xB7 {tools} c\xF4ng c\u1EE5",
      "event.model-attempt": "L\u1EA7n th\u1EED model",
      "event.model-retry": "Th\u1EED l\u1EA1i model",
      "event.prune.detail": "\u0111\xE3 l\u01B0\u1EE3c b\u1ECF {tokens} token",
      "event.reason.change": "thay \u0111\u1ED5i",
      "event.reason.initial": "ban \u0111\u1EA7u",
      "event.reason.resume": "ti\u1EBFp t\u1EE5c",
      "event.reason.series": "chu\u1ED7i m\u1EDBi",
      "event.refresh.detail": "{source} \xB7 {chars} k\xFD t\u1EF1",
      "event.request-context": "Ng\u1EEF c\u1EA3nh y\xEAu c\u1EA7u",
      "event.request-header": "Header y\xEAu c\u1EA7u",
      "event.retry.detail": "th\u1EED l\u1EA1i {retry} \xB7 ch\u1EDD {delay}",
      "event.series": "chu\u1ED7i m\u1EDBi",
      "event.show": "Hi\u1EC7n c\xE1c d\xF2ng s\u1EF1 ki\u1EC7n (g\u1ED3m n\xE9n)",
      "event.source.runtime": "ng\u1EEF c\u1EA3nh runtime",
      "event.source.time": "ng\u1EEF c\u1EA3nh th\u1EDDi gian",
      "event.system-prompt": "L\u1EDDi nh\u1EAFc h\u1EC7 th\u1ED1ng",
      "event.system.append": "n\u1ED1i th\xEAm",
      "event.system.clear": "x\xF3a",
      "event.system.detail": "{action} \xB7 {chars} k\xFD t\u1EF1",
      "event.system.replace": "thay th\u1EBF",
      "event.title": "C\xE1c d\xF2ng s\u1EF1 ki\u1EC7n kh\xF4ng ph\u1EA3i b\u01B0\u1EDBc: thay \u0111\u1ED5i y\xEAu c\u1EA7u, l\u1EDDi nh\u1EAFc, b\u1ED9 c\xF4ng c\u1EE5, th\u1EED l\u1EA1i, l\xE0m m\u1EDBi ng\u1EEF c\u1EA3nh, ph\xEA duy\u1EC7t v\xE0 l\u01B0\u1EE3c b\u1ECF, kh\xF4ng t\xEDnh v\xE0o t\u1ED5ng c\xE1c b\u01B0\u1EDBc c\u1EE7a l\u01B0\u1EE3t",
      "event.tool-set": "Thay \u0111\u1ED5i b\u1ED9 c\xF4ng c\u1EE5",
      "event.tools.added": "\u0111\xE3 th\xEAm {tools}",
      "event.tools.removed": "\u0111\xE3 b\u1ECF {tools}",
      "expand.all": "M\u1EDF r\u1ED9ng t\u1EA5t c\u1EA3",
      "imagePreview.alt": "H\xECnh \u1EA3nh {index}",
      "imagePreview.close": "\u0110\xF3ng xem tr\u01B0\u1EDBc h\xECnh \u1EA3nh",
      "imagePreview.dialog": "Xem tr\u01B0\u1EDBc h\xECnh \u1EA3nh",
      "imagePreview.failed": "T\u1EA3i h\xECnh \u1EA3nh th\u1EA5t b\u1EA1i",
      "imagePreview.hint": "Di chu\u1ED9t ho\u1EB7c \u0111\u1EB7t ti\xEAu \u0111i\u1EC3m \u0111\u1EC3 xem tr\u01B0\u1EDBc h\xECnh \u1EA3nh c\u1EE7a l\u01B0\u1EE3t n\xE0y; nh\u1EA5p \u0111\u1EC3 m\u1EDF \u1EA3nh \u0111\u1EA7y \u0111\u1EE7",
      "imagePreview.loading": "\u0110ang t\u1EA3i h\xECnh \u1EA3nh\u2026",
      "imagePreview.open": "Xem h\xECnh {index} tr\xEAn {count}",
      "imagePreview.retry": "Th\u1EED l\u1EA1i",
      "loadOlder": "T\u1EA3i l\u01B0\u1EE3t tr\u01B0\u1EDBc",
      "loadOlder.done": "\u0110\xE3 \u0111\u1EBFn \u0111\u1EA7u l\u1ECBch s\u1EED",
      "loadOlder.failed": "T\u1EA3i th\u1EA5t b\u1EA1i, th\u1EED l\u1EA1i",
      "loadOlder.loading": "\u0110ang t\u1EA3i c\xE1c l\u01B0\u1EE3t tr\u01B0\u1EDBc\u2026",
      "partial": "{count} l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 ch\u01B0a c\xF3 k\u1EBFt qu\u1EA3; \u0111\xE2y l\xE0 gi\u1EDBi h\u1EA1n d\u01B0\u1EDBi c\u1EE7a th\u1EDDi gian \u0111\xE3 bi\u1EBFt",
      "state.aborted": "ch\u01B0a ho\xE0n t\u1EA5t",
      "state.aborted.title": "B\u01B0\u1EDBc k\u1EBFt th\xFAc m\xE0 kh\xF4ng c\xF3 ph\u1EA3n h\u1ED3i ho\xE0n t\u1EA5t (th\u01B0\u1EDDng do b\u1ECB h\u1EE7y ho\u1EB7c g\u1EB7p l\u1ED7i)",
      "state.cacheMiss": "tr\u01B0\u1EE3t cache",
      "state.cacheMiss.title": "L\u1EDDi nh\u1EAFc h\u1EA7u nh\u01B0 kh\xF4ng tr\xFAng cache: th\u01B0\u1EDDng l\xE0 y\xEAu c\u1EA7u \u0111\u1EA7u ti\xEAn sau khi kh\u1EDFi \u0111\u1ED9ng l\u1EA1i ho\u1EB7c ti\u1EBFp t\u1EE5c phi\xEAn, b\u1ECB t\xEDnh gi\xE1 \u0111\u1EA7u v\xE0o \u0111\u1EA7y \u0111\u1EE7",
      "state.interrupted": "b\u1ECB ng\u1EAFt",
      "state.running": "\u0111ang ch\u1EA1y",
      "step.label": "B\u01B0\u1EDBc {step}",
      "step.partial": "kh\xF4ng r\xF5 \u0111i\u1EC3m b\u1EAFt \u0111\u1EA7u",
      "step.partial.title": "S\u1EF1 ki\u1EC7n b\u1EAFt \u0111\u1EA7u v\xE0 k\u1EBFt th\xFAc c\u1EE7a b\u01B0\u1EDBc n\xE0y kh\xF4ng c\xF3 trong c\u1EEDa s\u1ED5 s\u1EF1 ki\u1EC7n hi\u1EC7n t\u1EA1i (\u0111\xE3 b\u1ECB c\u1EAFt khi tab k\u1EBFt n\u1ED1i l\u1EA1i ho\u1EB7c c\u1EEDa s\u1ED5 \u0111\u01B0\u1EE3c d\u1EF1ng l\u1EA1i), n\xEAn token \u0111\u1EA7u, th\u1EDDi gian model v\xE0 t\u1ED5ng th\u1EDDi gian kh\xF4ng c\xF3 \u0111i\u1EC3m b\u1EAFt \u0111\u1EA7u \u0111\u1EC3 tr\u1EEB; t\u1EA3i l\u1EA1i tab s\u1EBD d\u1EF1ng l\u1EA1i t\u1EEB c\u1EEDa s\u1ED5 \u0111\u1EA7y \u0111\u1EE7",
      "step.started.title": "B\u01B0\u1EDBc b\u1EAFt \u0111\u1EA7u l\xFAc {time}",
      "step.toggle.aria": "M\u1EDF r\u1ED9ng ho\u1EB7c thu g\u1ECDn chi ti\u1EBFt c\xF4ng c\u1EE5 c\u1EE7a b\u01B0\u1EDBc {step}",
      "steps.all": "Hi\u1EC7n t\u1EA5t c\u1EA3 {total} b\u01B0\u1EDBc",
      "steps.clear": "X\xF3a b\u1ED9 l\u1ECDc",
      "steps.filter": "Ch\u1EC9 {tool}",
      "steps.matched": "{count} b\u01B0\u1EDBc \u0111\xE3 d\xF9ng {tool}",
      "steps.tail": "ch\u1EC9 {limit} b\u01B0\u1EDBc m\u1EDBi nh\u1EA5t",
      "steps.total": "{total} b\u01B0\u1EDBc",
      "summary": "{turns} l\u01B0\u1EE3t \xB7 {steps} b\u01B0\u1EDBc",
      "table.showTotals": "Hi\u1EC7n d\xF2ng t\u1ED5ng",
      "tool.failed": "{count} th\u1EA5t b\u1EA1i",
      "tool.failed.title": "{count} l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 trong b\u01B0\u1EDBc n\xE0y tr\u1EA3 v\u1EC1 k\u1EBFt qu\u1EA3 l\u1ED7i",
      "totals.full": "T\u1ED5ng to\xE0n phi\xEAn",
      "totals.full.title": "T\u1ED5ng cho to\xE0n b\u1ED9 phi\xEAn; t\u1ED5ng th\u1EDDi gian l\xE0 th\u1EDDi gian model + th\u1EDDi gian c\xF4ng c\u1EE5 (kh\xF4ng g\u1ED3m kho\u1EA3ng tr\u1ED1ng gi\u1EEFa c\xE1c l\u01B0\u1EE3t)",
      "totals.window": "T\u1ED5ng theo c\u1EEDa s\u1ED5",
      "totals.window.title": "T\u1ED5ng cho c\xE1c l\u01B0\u1EE3t \u0111\xE3 t\u1EA3i trong c\u1EEDa s\u1ED5 n\xE0y; \xF4 ng\u1EEF c\u1EA3nh l\xE0 t\xEDch l\u0169y qua c\xE1c b\u01B0\u1EDBc",
      "trigger.agent-message": "Tin nh\u1EAFn agent",
      "trigger.context": "\u0110\xE1nh th\u1EE9c ng\u1EEF c\u1EA3nh",
      "trigger.cordis-host-runner": "Ch\u1EA1y plugin",
      "trigger.goal": "V\xF2ng m\u1EE5c ti\xEAu",
      "trigger.other": "L\u01B0\u1EE3t t\u1EF1 \u0111\u1ED9ng",
      "trigger.schedule": "Theo l\u1ECBch",
      "trigger.subagent-settled": "Agent con ho\xE0n t\u1EA5t",
      "trigger.team-message": "Tin nh\u1EAFn nh\xF3m",
      "trigger.tool-jobs": "T\xE1c v\u1EE5 n\u1EC1n",
      "trigger.webhook": "Webhook",
      "turn.collapse": "\u1EA8n",
      "turn.expand": "Hi\u1EC7n",
      "turn.images": "{count} h\xECnh \u1EA3nh",
      "turn.label": "L\u01B0\u1EE3t {turn}",
      "turn.started": "l\u01B0\u1EE3t n\xE0y b\u1EAFt \u0111\u1EA7u l\xFAc {time}",
      "turn.toggle.aria": "M\u1EDF r\u1ED9ng ho\u1EB7c thu g\u1ECDn l\u01B0\u1EE3t {turn}",
      "turn.toggle.title": "M\u1EDF r\u1ED9ng ho\u1EB7c thu g\u1ECDn c\xE1c b\u01B0\u1EDBc c\u1EE7a l\u01B0\u1EE3t n\xE0y",
      "unknown": "kh\xF4ng \u0111\u01B0\u1EE3c ghi nh\u1EADn",
      "view.stats": "Th\u1ED1ng k\xEA"
    },
    "subagent": {
      "activity.completed": "\u0111\xE3 ho\xE0n t\u1EA5t",
      "activity.inactive": "kh\xF4ng ch\u1EA1y",
      "activity.running": "\u0111ang ch\u1EA1y",
      "branch.collapse": "Thu g\u1ECDn c\xE1c agent con c\u1EE7a {label}",
      "branch.expand": "M\u1EDF r\u1ED9ng c\xE1c agent con c\u1EE7a {label}",
      "count.running.one": "{count} agent con \u0111ang ch\u1EA1y",
      "count.running.other": "{count} agent con \u0111ang ch\u1EA1y",
      "count.total.one": "{count} agent con",
      "count.total.other": "{count} agent con",
      "duration.days": "{days} ng\xE0y",
      "duration.daysHours": "{days} ng\xE0y {hours} gi\u1EDD",
      "duration.exactDays": "{days} ng\xE0y {hours} gi\u1EDD {minutes} ph\xFAt {seconds} gi\xE2y",
      "duration.exactTitle": "T\u1ED5ng th\u1EDDi l\u01B0\u1EE3ng ho\u1EA1t \u0111\u1ED9ng: {duration}",
      "duration.hours": "{hours} gi\u1EDD {minutes} ph\xFAt {seconds} gi\xE2y",
      "duration.minutes": "{minutes} ph\xFAt {seconds} gi\xE2y",
      "duration.months": "~{months} th\xE1ng",
      "duration.monthsDays": "~{months} th\xE1ng {days} ng\xE0y",
      "duration.seconds": "{seconds} gi\xE2y",
      "duration.years": "~{years} n\u0103m",
      "duration.yearsMonths": "~{years} n\u0103m {months} th\xE1ng",
      "load.error": "Kh\xF4ng th\u1EC3 t\u1EA3i agent con",
      "load.idle": "Agent con ch\u01B0a \u0111\u01B0\u1EE3c t\u1EA3i",
      "loading.label": "\u0110ang t\u1EA3i agent con\u2026",
      "mode.continuable": "c\xF3 th\u1EC3 ti\u1EBFp t\u1EE5c",
      "mode.external": "T\xE1c v\u1EE5 b\xEAn ngo\xE0i",
      "mode.oneShot": "m\u1ED9t l\u1EA7n",
      "mode.unknown": "ch\u1EBF \u0111\u1ED9 kh\xF4ng r\xF5",
      "open.floatWindow": "M\u1EDF trong b\u1EA3ng n\u1ED5i",
      "open.sidebar": "M\u1EDF trong thanh b\xEAn",
      "open.sidebar.aria": "M\u1EDF {label} trong thanh b\xEAn",
      "progress.active": "{count} \u0111ang th\u1EF1c hi\u1EC7n",
      "progress.completed": "{count} \u0111\xE3 ho\xE0n t\u1EA5t",
      "progress.external": "{count} b\xEAn ngo\xE0i",
      "progress.inactive": "{count} kh\xF4ng ch\u1EA1y",
      "readonly.oneShot.body": "T\xE1c v\u1EE5 m\u1ED9t l\u1EA7n kh\xF4ng nh\u1EADn tin nh\u1EAFn ti\u1EBFp theo; h\xE3y xem to\xE0n b\u1ED9 b\u1EA3n ghi th\u1EF1c thi t\u1EA1i \u0111\xE2y.",
      "readonly.oneShot.title": "B\u1EA3n ghi agent con m\u1ED9t l\u1EA7n",
      "readonly.title": "Agent con n\xE0y hi\u1EC7n ch\u1EC9 \u0111\u1ECDc",
      "readonly.unknown.body": "\u0110\u1ECDc phi\xEAn con \u0111\u1EC3 x\xE1c \u0111\u1ECBnh xem c\xF3 th\u1EC3 ti\u1EBFp t\u1EE5c hay kh\xF4ng.",
      "retry": "Th\u1EED l\u1EA1i",
      "section.empty": "Kh\xF4ng c\xF3 agent con",
      "section.title": "Agent con",
      "sidebar.chat": "Chat",
      "switcher.aria": "Chuy\u1EC3n agent con: {title}",
      "tokens.million": "{value}M",
      "tokens.thousand": "{value}K",
      "tokens.total": "{value} tok",
      "tree.aria": "Phi\xEAn c\u1EE7a agent con"
    },
    "trajectory": {
      "attachment.imageName": "H\xECnh \u1EA3nh {index}",
      "attachment.list": "T\u1EC7p \u0111\xEDnh k\xE8m",
      "block.label": "Kh\u1ED1i #{index} {type}",
      "block.openSummary": "M\u1EDF t\xF3m t\u1EAFt l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 c\u1EE7a Kh\u1ED1i #{index}",
      "block.openSummaryTitle": "M\u1EDF t\xF3m t\u1EAFt l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5",
      "code.copyOutput": "Sao ch\xE9p \u0111\u1EA7u ra",
      "code.copySource": "Sao ch\xE9p m\xE3",
      "code.originalJson": "JSON g\u1ED1c",
      "code.output": "\u0110\u1EA7u ra",
      "code.running": "\u0110ang ch\u1EA1y\u2026",
      "code.source": "M\xE3",
      "column.input": "\u0110\u1EA7u v\xE0o",
      "column.model": "Model",
      "column.output": "\u0110\u1EA7u ra",
      "column.think": "Suy ngh\u0129",
      "column.time": "Th\u1EDDi gian",
      "column.tools": "C\xF4ng c\u1EE5",
      "details.assistantMessage": "Tin nh\u1EAFn tr\u1EE3 l\xFD",
      "details.close": "\u0110\xF3ng chi ti\u1EBFt",
      "details.compacted": "\u0110\xE3 n\xE9n",
      "details.error": "L\u1ED7i",
      "details.event": "Chi ti\u1EBFt s\u1EF1 ki\u1EC7n",
      "details.failure.auth": "API key kh\xF4ng h\u1EE3p l\u1EC7",
      "details.hierarchy": "Ph\xE2n c\u1EA5p",
      "details.lastAttemptError": "L\u1ED7i l\u1EA7n th\u1EED tr\u01B0\u1EDBc",
      "details.model": "Model",
      "details.provider": "Nh\xE0 cung c\u1EA5p",
      "details.purpose": "M\u1EE5c \u0111\xEDch",
      "details.resize": "\u0110\u1ED5i k\xEDch th\u01B0\u1EDBc chi ti\u1EBFt s\u1EF1 ki\u1EC7n",
      "details.resizeTitle": "K\xE9o \u0111\u1EC3 \u0111\u1ED5i k\xEDch th\u01B0\u1EDBc. Nh\u1EA5p \u0111\xFAp \u0111\u1EC3 \u0111\u1EB7t l\u1EA1i.",
      "details.result": "K\u1EBFt qu\u1EA3",
      "details.retry": "Th\u1EED l\u1EA1i",
      "details.retryDelay": "\u0110\u1ED9 tr\u1EC5 th\u1EED l\u1EA1i",
      "details.source": "Ngu\u1ED3n",
      "details.status": "Tr\u1EA1ng th\xE1i",
      "details.subtoolCalls": "L\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 con",
      "details.toolCall": "L\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5",
      "details.toolCalls": "L\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5",
      "group.compaction": "N\xE9n {seq}",
      "group.message": "Tin nh\u1EAFn",
      "group.step": "B\u01B0\u1EDBc {step}",
      "history.clickToLoadEarlier": "Nh\u1EA5p \u0111\u1EC3 t\u1EA3i l\u1ECBch s\u1EED tr\u01B0\u1EDBc \u0111\xF3",
      "history.loadEarlier": "T\u1EA3i l\u1ECBch s\u1EED tr\u01B0\u1EDBc \u0111\xF3",
      "history.loadingEarlier": "\u0110ang t\u1EA3i l\u1ECBch s\u1EED tr\u01B0\u1EDBc \u0111\xF3\u2026",
      "history.loadingEarlierAria": "\u0110ang t\u1EA3i l\u1ECBch s\u1EED tr\u01B0\u1EDBc \u0111\xF3\u2026",
      "history.loadingTrajectory": "\u0110ang t\u1EA3i di\u1EC5n bi\u1EBFn\u2026",
      "kind.assistant": "TR\u1EE2 L\xDD",
      "kind.compacted": "\u0110\xC3 N\xC9N",
      "kind.context": "NG\u1EEE C\u1EA2NH",
      "kind.message": "Tin nh\u1EAFn",
      "kind.sub": "Con",
      "kind.subtool": "C\xD4NG C\u1EE4 CON",
      "kind.system": "H\u1EC6 TH\u1ED0NG",
      "kind.tool": "C\xD4NG C\u1EE4",
      "kind.user": "NG\u01AF\u1EDCI D\xD9NG",
      "layout.compacted": "\u0110\xE3 n\xE9n ng\u1EEF c\u1EA3nh",
      "layout.compacting": "\u0110ang n\xE9n ng\u1EEF c\u1EA3nh\u2026",
      "layout.compactionFailed": "N\xE9n ng\u1EEF c\u1EA3nh th\u1EA5t b\u1EA1i",
      "layout.compactionInterrupted": "Qu\xE1 tr\xECnh n\xE9n \u0111\xE3 b\u1ECB gi\xE1n \u0111o\u1EA1n tr\u01B0\u1EDBc khi ho\xE0n t\u1EA5t.",
      "layout.fileAttachments": "T\u1EC7p \xD7{count}",
      "layout.imageCount": "H\xECnh \u1EA3nh \xD7{count}",
      "layout.initialSystemPrompt": "L\u1EDDi nh\u1EAFc h\u1EC7 th\u1ED1ng ban \u0111\u1EA7u",
      "layout.systemPromptAndToolsUpdated": "\u0110\xE3 c\u1EADp nh\u1EADt l\u1EDDi nh\u1EAFc h\u1EC7 th\u1ED1ng v\xE0 c\xF4ng c\u1EE5",
      "layout.systemPromptUpdated": "\u0110\xE3 c\u1EADp nh\u1EADt l\u1EDDi nh\u1EAFc h\u1EC7 th\u1ED1ng",
      "layout.toolAdded": "\u0110\xE3 th\xEAm c\xF4ng c\u1EE5: {name}",
      "layout.toolCallOnly": "Ch\u1EC9 l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5",
      "layout.toolRemoved": "\u0110\xE3 x\xF3a c\xF4ng c\u1EE5: {name}",
      "layout.toolsAdded": "\u0110\xE3 th\xEAm: {names}",
      "layout.toolsAddedCount": "\u0110\xE3 th\xEAm {count}",
      "layout.toolsChanged": "\u0110\xE3 th\xEAm {added}, \u0111\xE3 x\xF3a {removed}",
      "layout.toolsRemoved": "\u0110\xE3 x\xF3a: {names}",
      "layout.toolsRemovedCount": "\u0110\xE3 x\xF3a {count}",
      "layout.toolsUpdated": "\u0110\xE3 c\u1EADp nh\u1EADt c\xF4ng c\u1EE5",
      "layout.toolUpdateNotice": "\u0110\xE3 c\u1EADp nh\u1EADt c\xF4ng c\u1EE5",
      "options.json": "JSON t\xF9y ch\u1ECDn y\xEAu c\u1EA7u",
      "options.notRecorded": "Kh\xF4ng ghi l\u1EA1i t\xF9y ch\u1ECDn",
      "record.json": "JSON",
      "record.namedParametersJson": "JSON tham s\u1ED1 {name}",
      "record.noContent": "Kh\xF4ng c\xF3 n\u1ED9i dung",
      "record.noOutput": "Kh\xF4ng c\xF3 \u0111\u1EA7u ra",
      "record.noPayload": "Kh\xF4ng ghi nh\u1EADn payload",
      "record.noResult": "Kh\xF4ng ghi nh\u1EADn k\u1EBFt qu\u1EA3",
      "record.outputJson": "JSON k\u1EBFt qu\u1EA3",
      "record.parameters": "Tham s\u1ED1",
      "record.parametersJson": "JSON tham s\u1ED1",
      "record.payloadJson": "JSON payload",
      "record.rawResult": "K\u1EBFt qu\u1EA3 th\xF4",
      "record.rawResultUnavailable": "K\u1EBFt qu\u1EA3 th\xF4 ch\u1EC9 c\xF3 v\u1EDBi l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5 tr\u1EF1c ti\u1EBFp",
      "record.renderedResult": "K\u1EBFt qu\u1EA3 hi\u1EC3n th\u1ECB",
      "record.resultJson": "JSON k\u1EBFt qu\u1EA3",
      "record.schemaUnavailable": "Kh\xF4ng c\xF3 schema",
      "record.systemPrompt": "L\u1EDDi nh\u1EAFc h\u1EC7 th\u1ED1ng",
      "record.systemPromptMissing": "Kh\xF4ng c\xF3 l\u1EDDi nh\u1EAFc h\u1EC7 th\u1ED1ng trong y\xEAu c\u1EA7u n\xE0y",
      "record.thinking": "Suy ngh\u0129",
      "record.toolCallOnly": "(ch\u1EC9 l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5)",
      "record.tools": "C\xF4ng c\u1EE5",
      "record.toolsMissing": "Kh\xF4ng c\xF3 c\xF4ng c\u1EE5 trong y\xEAu c\u1EA7u n\xE0y",
      "record.wrapLines": "Xu\u1ED1ng d\xF2ng t\u1EF1 \u0111\u1ED9ng",
      "request.collapsedAssistant": "tr\u1EE3 l\xFD",
      "request.collapsedSummary": "T\xF3m t\u1EAFt {kind} \u0111\xE3 thu g\u1ECDn, {summary}",
      "request.collapsedTool": "l\u1EC7nh g\u1ECDi con",
      "request.collapsedTurn": "l\u01B0\u1EE3t",
      "request.compaction": "N\xE9n \xB7 {section}",
      "request.compactionPurpose": "N\xE9n",
      "request.label": "Y\xEAu c\u1EA7u #{request}",
      "request.labelCompaction": "Y\xEAu c\u1EA7u #{request} \xB7 N\xE9n",
      "request.noContent": "kh\xF4ng c\xF3 n\u1ED9i dung",
      "request.retryProgress": "{retry} tr\xEAn {maximum}",
      "request.rowAria": "{request}{kind}, {content}",
      "request.rowAriaCompaction": "Y\xEAu c\u1EA7u {request}, n\xE9n",
      "request.rowPrefix": "Y\xEAu c\u1EA7u {request}, ",
      "section.betweenTurns": "Gi\u1EEFa c\xE1c l\u01B0\u1EE3t",
      "source.goal": "M\u1EE5c ti\xEAu",
      "source.goalRound": "M\u1EE5c ti\xEAu \xB7 V\xF2ng {round}",
      "source.messageJson": "JSON ngu\u1ED3n tin nh\u1EAFn",
      "source.notRecorded": "Kh\xF4ng ghi l\u1EA1i ngu\u1ED3n",
      "source.plugin": "Plugin",
      "source.pluginNamed": "Plugin \xB7 {plugin}",
      "source.unknown": "Kh\xF4ng x\xE1c \u0111\u1ECBnh",
      "source.user": "Ng\u01B0\u1EDDi d\xF9ng",
      "status.completed": "Ho\xE0n t\u1EA5t",
      "status.failed": "Th\u1EA5t b\u1EA1i",
      "status.pending": "\u0110ang ch\u1EDD",
      "summary.steps.one": "{count} b\u01B0\u1EDBc",
      "summary.steps.other": "{count} b\u01B0\u1EDBc",
      "summary.toolCalls.one": "{count} l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5",
      "summary.toolCalls.other": "{count} l\u1EC7nh g\u1ECDi c\xF4ng c\u1EE5",
      "tab.diff": "Diff",
      "tab.options": "T\xF9y ch\u1ECDn",
      "tab.payload": "Payload",
      "tab.preview": "Xem tr\u01B0\u1EDBc",
      "tab.raw": "Th\xF4",
      "tab.rawOutput": "\u0110\u1EA7u ra th\xF4",
      "tab.result": "K\u1EBFt qu\u1EA3",
      "tab.schema": "Schema",
      "tab.source": "Ngu\u1ED3n",
      "tab.summary": "T\xF3m t\u1EAFt",
      "tab.systemPrompt": "L\u1EDDi nh\u1EAFc h\u1EC7 th\u1ED1ng",
      "tab.timing": "Th\u1EDDi gian",
      "tab.tools": "C\xF4ng c\u1EE5",
      "tab.usage": "M\u1EE9c s\u1EED d\u1EE5ng",
      "timeline.aria": "D\xF2ng th\u1EDDi gian di\u1EC5n bi\u1EBFn",
      "timeline.noTimingData": "Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u th\u1EDDi gian",
      "timeline.overviewAria": "T\u1ED5ng quan d\xF2ng th\u1EDDi gian; k\xE9o ngang \u0111\u1EC3 ch\u1ECDn s\u1EF1 ki\u1EC7n",
      "timeline.started": "B\u1EAFt \u0111\u1EA7u {time}",
      "timeline.total": "T\u1ED5ng {duration}",
      "timeline.ttftDecoding": "TTFT {ttft} \xB7 Gi\u1EA3i m\xE3 {decoding}",
      "timing.duration": "Th\u1EDDi l\u01B0\u1EE3ng",
      "timing.durationTooShort": "Th\u1EDDi l\u01B0\u1EE3ng qu\xE1 ng\u1EAFn",
      "timing.firstTokenUnavailable": "Kh\xF4ng c\xF3 token \u0111\u1EA7u ti\xEAn",
      "timing.generation": "Sinh",
      "timing.notAvailable": "Kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "timing.notRecorded": "Kh\xF4ng \u0111\u01B0\u1EE3c ghi l\u1EA1i",
      "timing.outputTokensUnavailable": "Kh\xF4ng c\xF3 token \u0111\u1EA7u ra",
      "timing.request": "Th\u1EDDi gian y\xEAu c\u1EA7u",
      "timing.sessionTimestamps": "M\u1ED1c th\u1EDDi gian phi\xEAn",
      "timing.sessionTimestampsRunning": "M\u1ED1c th\u1EDDi gian phi\xEAn (\u0111ang ch\u1EA1y)",
      "timing.showLocalTime": "Hi\u1EC7n gi\u1EDD \u0111\u1ECBa ph\u01B0\u01A1ng",
      "timing.showUnixTimestamp": "Hi\u1EC7n m\u1ED1c th\u1EDDi gian Unix",
      "timing.source": "Ngu\u1ED3n th\u1EDDi gian",
      "timing.started": "B\u1EAFt \u0111\u1EA7u",
      "timing.stepStartUnavailable": "Kh\xF4ng c\xF3 th\u1EDDi \u0111i\u1EC3m b\u1EAFt \u0111\u1EA7u b\u01B0\u1EDBc",
      "timing.throughput": "Th\xF4ng l\u01B0\u1EE3ng",
      "timing.totalDuration": "T\u1ED5ng th\u1EDDi l\u01B0\u1EE3ng",
      "timing.ttft": "TTFT",
      "timing.usageUnavailable": "Kh\xF4ng c\xF3 th\xF4ng tin s\u1EED d\u1EE5ng",
      "toolbar.actualTime": "Th\u1EDDi gian th\u1EF1c t\u1EBF",
      "toolbar.aria": "Thanh c\xF4ng c\u1EE5 di\u1EC5n bi\u1EBFn",
      "toolbar.calls": "L\u1EC7nh g\u1ECDi",
      "toolbar.collapseCalls": "Thu g\u1ECDn l\u1EC7nh g\u1ECDi",
      "toolbar.collapseSubCalls": "Thu g\u1ECDn l\u1EC7nh g\u1ECDi con",
      "toolbar.collapseTurns": "Thu g\u1ECDn l\u01B0\u1EE3t",
      "toolbar.duration": "Th\u1EDDi l\u01B0\u1EE3ng",
      "toolbar.expandCalls": "M\u1EDF r\u1ED9ng l\u1EC7nh g\u1ECDi",
      "toolbar.expandSubCalls": "M\u1EDF r\u1ED9ng l\u1EC7nh g\u1ECDi con",
      "toolbar.expandTurns": "M\u1EDF r\u1ED9ng l\u01B0\u1EE3t",
      "toolbar.search": "T\xECm ki\u1EBFm di\u1EC5n bi\u1EBFn",
      "toolbar.searchPlaceholder": "T\xECm ki\u1EBFm",
      "toolbar.subCalls": "L\u1EC7nh g\u1ECDi con",
      "toolbar.turns": "L\u01B0\u1EE3t",
      "toolbar.useActualDuration": "D\xF9ng th\u1EDDi l\u01B0\u1EE3ng th\u1EF1c t\u1EBF",
      "toolbar.useEqualWidth": "D\xF9ng \u0111\u1ED9 r\u1ED9ng \u0111\u1EC1u cho c\xE1c thao t\xE1c",
      "turn.label": "L\u01B0\u1EE3t {turn}",
      "unit.milliseconds": "{value} ms",
      "unit.seconds": "{value} s",
      "unit.tokens": "{value} tok",
      "unit.tokensPerSecond": "{value} tok/s",
      "usage.cacheCreated": "\u0110\xE3 t\u1EA1o b\u1ED9 \u0111\u1EC7m",
      "usage.cached": "\u0110\xE3 l\u01B0u \u0111\u1EC7m",
      "usage.content": "N\u1ED9i dung",
      "usage.input": "\u0110\u1EA7u v\xE0o",
      "usage.notReported": "Kh\xF4ng b\xE1o c\xE1o m\u1EE9c s\u1EED d\u1EE5ng",
      "usage.other": "Kh\xE1c",
      "usage.output": "\u0110\u1EA7u ra",
      "usage.reasoning": "Suy lu\u1EADn",
      "usage.sessionCumulative": "T\xEDch l\u0169y phi\xEAn",
      "usage.thisRequest": "Y\xEAu c\u1EA7u n\xE0y",
      "usage.tokens": "Token",
      "view.trajectory": "Di\u1EC5n bi\u1EBFn"
    },
    "voice-input": {
      "auto": "T\u1EF1 \u0111\u1ED9ng ph\xE1t hi\u1EC7n",
      "cancel": "H\u1EE7y",
      "cancelled": "\u0110\xE3 h\u1EE7y nh\u1EADp b\u1EB1ng gi\u1ECDng n\xF3i.",
      "cancelPrepare": "H\u1EE7y chu\u1EA9n b\u1ECB",
      "cloud": "\xC2m thanh s\u1EBD \u0111\u01B0\u1EE3c g\u1EEDi t\u1EDBi d\u1ECBch v\u1EE5 \u0111\xE1m m\xE2y \u0111\xE3 ch\u1ECDn.",
      "cloudReady": "Nh\u1EADn d\u1EA1ng gi\u1ECDng n\xF3i \u0111\xE1m m\xE2y \u0111\xE3 s\u1EB5n s\xE0ng.",
      "conflict": "B\u1EA3n nh\xE1p c\u1EE7a b\u1EA1n \u0111\xE3 thay \u0111\u1ED5i. B\u1EA3n ghi v\u1EABn \u0111\u01B0\u1EE3c gi\u1EEF v\xE0 c\xF3 th\u1EC3 ch\xE8n t\u1EA1i v\u1ECB tr\xED con tr\u1ECF hi\u1EC7n t\u1EA1i.",
      "de": "Ti\u1EBFng \u0110\u1EE9c",
      "deviceMissing": "Micro kh\xF4ng kh\u1EA3 d\u1EE5ng. Ch\u1ECDn thi\u1EBFt b\u1ECB \u0111\u1EA7u v\xE0o kh\xE1c.",
      "deviceUnavailable": "Kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "dictate": "\u0110\u1ECDc ch\xEDnh t\u1EA3",
      "discard": "B\u1ECF b\u1EA3n ghi",
      "download.certificate": "Kh\xF4ng th\u1EC3 t\u1EA3i {resource}: x\xE1c minh ch\u1EE9ng ch\u1EC9 th\u1EA5t b\u1EA1i.",
      "download.dns": "Kh\xF4ng th\u1EC3 t\u1EA3i {resource}: kh\xF4ng ph\xE2n gi\u1EA3i \u0111\u01B0\u1EE3c \u0111\u1ECBa ch\u1EC9 t\u1EA3i xu\u1ED1ng.",
      "download.http": "Kh\xF4ng th\u1EC3 t\u1EA3i {resource}: d\u1ECBch v\u1EE5 t\u1EA3i xu\u1ED1ng tr\u1EA3 v\u1EC1 HTTP {status}.",
      "download.integrity": "T\u1EA3i {resource} ch\u01B0a ho\xE0n t\u1EA5t ho\u1EB7c kh\xF4ng v\u01B0\u1EE3t qua x\xE1c minh.",
      "download.network": "Kh\xF4ng th\u1EC3 t\u1EA3i {resource}: k\u1EBFt n\u1ED1i t\u1EDBi d\u1ECBch v\u1EE5 t\u1EA3i xu\u1ED1ng th\u1EA5t b\u1EA1i.",
      "download.storage": "Kh\xF4ng th\u1EC3 l\u01B0u {resource}: kh\xF4ng \u0111\u1EE7 dung l\u01B0\u1EE3ng \u0111\u0129a ho\u1EB7c thi\u1EBFu quy\u1EC1n ghi.",
      "download.timeout": "T\u1EA3i {resource} \u0111\xE3 h\u1EBFt th\u1EDDi gian ch\u1EDD.",
      "download.unknown": "Kh\xF4ng th\u1EC3 chu\u1EA9n b\u1ECB {resource}.",
      "downloadAdvice.certificate": "Ki\u1EC3m tra \u0111\u1ED3ng h\u1ED3 h\u1EC7 th\u1ED1ng, ch\u1EE9ng ch\u1EC9 tin c\u1EADy v\xE0 c\xE0i \u0111\u1EB7t proxy tr\xEAn m\xE1y \u0111ang ch\u1EA1y DSH, r\u1ED3i th\u1EED l\u1EA1i.",
      "downloadAdvice.dns": "Ki\u1EC3m tra DNS v\xE0 c\xE0i \u0111\u1EB7t proxy tr\xEAn m\xE1y \u0111ang ch\u1EA1y DSH. X\xE1c nh\u1EADn r\u1EB1ng m\xE1y ph\xE2n gi\u1EA3i \u0111\u01B0\u1EE3c t\xEAn mi\u1EC1n ngu\u1ED3n t\u1EA3i xu\u1ED1ng, r\u1ED3i th\u1EED l\u1EA1i.",
      "downloadAdvice.http": "X\xE1c nh\u1EADn \u0111\u1ECBa ch\u1EC9 t\u1EA3i xu\u1ED1ng c\xF2n kh\u1EA3 d\u1EE5ng v\xE0 proxy c\xF3 th\u1EC3 truy c\u1EADp d\u1ECBch v\u1EE5 t\u1EA3i xu\u1ED1ng, ho\u1EB7c th\u1EED l\u1EA1i sau.",
      "downloadAdvice.integrity": "Th\u1EED t\u1EA3i l\u1EA1i. C\xE1c t\u1EC7p kh\xE1c \u0111\xE3 ho\xE0n t\u1EA5t v\xE0 x\xE1c minh s\u1EBD \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i.",
      "downloadAdvice.network": "Ki\u1EC3m tra xem m\xE1y \u0111ang ch\u1EA1y DSH c\xF3 truy c\u1EADp \u0111\u01B0\u1EE3c ngu\u1ED3n t\u1EA3i xu\u1ED1ng v\xE0 c\xE1c d\u1ECBch v\u1EE5 t\u1EA3i model c\u1EE7a ngu\u1ED3n \u0111\xF3 hay kh\xF4ng. C\u1EA5u h\xECnh proxy tr\xEAn m\xE1y \u0111\xF3 n\u1EBFu c\u1EA7n, r\u1ED3i th\u1EED l\u1EA1i.",
      "downloadAdvice.storage": "Ki\u1EC3m tra dung l\u01B0\u1EE3ng \u0111\u0129a c\xF2n tr\u1ED1ng v\xE0 quy\u1EC1n ghi cho th\u01B0 m\u1EE5c model tr\xEAn m\xE1y \u0111ang ch\u1EA1y DSH, r\u1ED3i th\u1EED l\u1EA1i.",
      "downloadAdvice.timeout": "Ki\u1EC3m tra k\u1EBFt n\u1ED1i m\u1EA1ng ho\u1EB7c proxy tr\xEAn m\xE1y \u0111ang ch\u1EA1y DSH, r\u1ED3i th\u1EED l\u1EA1i sau. C\xE1c t\u1EC7p \u0111\xE3 t\u1EA3i v\xE0 x\xE1c minh s\u1EBD \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i.",
      "downloadAdvice.unknown": "Ki\u1EC3m tra m\u1EA1ng, dung l\u01B0\u1EE3ng \u0111\u0129a v\xE0 quy\u1EC1n c\u1EE7a th\u01B0 m\u1EE5c model tr\xEAn m\xE1y \u0111ang ch\u1EA1y DSH, r\u1ED3i th\u1EED l\u1EA1i.",
      "downloadBytes": "T\u1EA3i xu\u1ED1ng: {completed} / {total} MB, {percent}%",
      "downloadCode": "M\xE3 l\u1ED7i: {code}",
      "downloadProgress": "Ti\u1EBFn \u0111\u1ED9 t\u1EA3i xu\u1ED1ng",
      "downloadSource": "Ngu\u1ED3n t\u1EA3i xu\u1ED1ng: {source}",
      "downloadUnknown": "\u0110\xE3 t\u1EA3i {completed} MB",
      "elapsed": "\u0110ang ch\u1EDD {seconds} gi\xE2y",
      "empty": "Kh\xF4ng nh\u1EADn d\u1EA1ng \u0111\u01B0\u1EE3c gi\u1ECDng n\xF3i",
      "en": "Ti\u1EBFng Anh",
      "es": "Ti\u1EBFng T\xE2y Ban Nha",
      "failed": "Nh\u1EADn d\u1EA1ng gi\u1ECDng n\xF3i th\u1EA5t b\u1EA1i: {message}",
      "fr": "Ti\u1EBFng Ph\xE1p",
      "inputDevice": "Thi\u1EBFt b\u1ECB \u0111\u1EA7u v\xE0o",
      "inputLevel": "M\u1EE9c \u0111\u1EA7u v\xE0o micro",
      "insert": "Ch\xE8n v\u0103n b\u1EA3n",
      "interrupted": "Ghi \xE2m b\u1ECB gi\xE1n \u0111o\u1EA1n. Vui l\xF2ng th\u1EED l\u1EA1i.",
      "ja": "Ti\u1EBFng Nh\u1EADt",
      "ko": "Ti\u1EBFng H\xE0n",
      "language": "Ng\xF4n ng\u1EEF nh\u1EADn d\u1EA1ng",
      "loading": "\u0110ang t\u1EA3i d\u1ECBch v\u1EE5 nh\u1EADn d\u1EA1ng\u2026",
      "local": "\xC2m thanh \u0111\u01B0\u1EE3c nh\u1EADn d\u1EA1ng tr\xEAn m\xE1y \u0111ang ch\u1EA1y DSH. N\u1EBFu c\u1EA7n t\u1EA3i model, m\xE1y \u0111\xF3 ph\u1EA3i truy c\u1EADp \u0111\u01B0\u1EE3c ngu\u1ED3n \u0111\xE3 ch\u1ECDn v\xE0 c\xE1c d\u1ECBch v\u1EE5 t\u1EC7p c\u1EE7a ngu\u1ED3n. C\u1EA5u h\xECnh proxy tr\xEAn m\xE1y \u0111\xF3 n\u1EBFu c\u1EA7n.",
      "permission": "Quy\u1EC1n truy c\u1EADp micro b\u1ECB t\u1EAFt. H\xE3y cho ph\xE9p trong c\xE0i \u0111\u1EB7t tr\xECnh duy\u1EC7t v\xE0 h\u1EC7 th\u1ED1ng.",
      "preparation.cancelled": "\u0110\xE3 h\u1EE7y chu\u1EA9n b\u1ECB. C\xE1c t\u1EC7p \u0111\xE3 t\u1EA3i xong \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i.",
      "preparation.cancelling": "\u0110ang h\u1EE7y chu\u1EA9n b\u1ECB\u2026",
      "preparation.checking": "\u0110ang ki\u1EC3m tra t\xE0i nguy\xEAn c\u1EE5c b\u1ED9\u2026",
      "preparation.loading": "\u0110ang t\u1EA3i {name}\u2026",
      "preparation.ready": "Nh\u1EADn d\u1EA1ng gi\u1ECDng n\xF3i c\u1EE5c b\u1ED9 \u0111\xE3 s\u1EB5n s\xE0ng.",
      "preparation.standby": "T\xE0i nguy\xEAn c\u1EE5c b\u1ED9 \u0111\xE3 s\u1EB5n s\xE0ng. Ghi \xE2m s\u1EBD \u0111\xE1nh th\u1EE9c b\u1ED9 nh\u1EADn d\u1EA1ng.",
      "preparation.unprepared": "L\u1EA7n d\xF9ng \u0111\u1EA7u ti\xEAn s\u1EBD t\u1EA3i c\xE1c model nh\u1EADn d\u1EA1ng c\u1EE5c b\u1ED9.",
      "preparation.waking": "\u0110ang \u0111\xE1nh th\u1EE9c nh\u1EADn d\u1EA1ng gi\u1ECDng n\xF3i c\u1EE5c b\u1ED9\u2026",
      "preparationFailed": "Chu\u1EA9n b\u1ECB th\u1EA5t b\u1EA1i: {message}",
      "preparationSteps": "C\xE1c b\u01B0\u1EDBc chu\u1EA9n b\u1ECB",
      "prepare": "T\u1EA3i xu\u1ED1ng v\xE0 chu\u1EA9n b\u1ECB",
      "provider": "D\u1ECBch v\u1EE5 nh\u1EADn d\u1EA1ng",
      "pt": "Ti\u1EBFng B\u1ED3 \u0110\xE0o Nha",
      "reconnecting": "\u0110ang k\u1EBFt n\u1ED1i t\u1EDBi nh\u1EADn d\u1EA1ng gi\u1ECDng n\xF3i\u2026",
      "recording": "\u0110ang ghi \xE2m\u2026",
      "requesting": "Cho ph\xE9p truy c\u1EADp micro \u0111\u1EC3 ti\u1EBFp t\u1EE5c\u2026",
      "retryPrepare": "Th\u1EED l\u1EA1i chu\u1EA9n b\u1ECB",
      "retryRecording": "Ghi \xE2m l\u1EA1i",
      "ru": "Ti\u1EBFng Nga",
      "setup.disk": "Dung l\u01B0\u1EE3ng \u0111\u0129a",
      "setup.diskValue": "C\u1EA7n kho\u1EA3ng {gb} GB cho model, runtime v\xE0 b\u1ED9 \u0111\u1EC7m t\u1EA3i xu\u1ED1ng",
      "setup.estimateNote": "\u0110\xE2y l\xE0 c\xE1c \u01B0\u1EDBc t\xEDnh; m\u1EA1ng ch\u1EADm c\xF3 th\u1EC3 l\xE2u h\u01A1n. C\xE1c t\u1EC7p \u0111\xE3 t\u1EA3i s\u1EBD \u0111\u01B0\u1EE3c d\xF9ng l\u1EA1i; model kh\xF4ng ho\u1EA1t \u0111\u1ED9ng s\u1EBD t\u1EF1 gi\u1EA3i ph\xF3ng b\u1ED9 nh\u1EDB theo m\u1EB7c \u0111\u1ECBnh.",
      "setup.local": "C\xE1c model c\u1EE5c b\u1ED9 s\u1EBD \u0111\u01B0\u1EE3c t\u1EA3i v\u1EC1 m\xE1y \u0111ang ch\u1EA1y DSH. Kh\xF4ng c\u1EA7n Python hay tr\xECnh bi\xEAn d\u1ECBch.",
      "setup.memory": "B\u1ED9 nh\u1EDB",
      "setup.memoryValue": "Kho\u1EA3ng {gb} GB khi \u0111\xE3 t\u1EA3i model; nh\u1EADn d\u1EA1ng c\xF3 th\u1EC3 d\xF9ng nhi\u1EC1u h\u01A1n",
      "setup.time": "Thi\u1EBFt l\u1EADp l\u1EA7n \u0111\u1EA7u",
      "setup.timeValue": "C\u1EA7n kho\u1EA3ng {min}\u2013{max} ph\xFAt, t\xF9y m\u1EA1ng v\xE0 m\xE1y",
      "setupPrompt.body": "Nh\u1EADp b\u1EB1ng gi\u1ECDng n\xF3i \u0111\xE3 \u0111\u01B0\u1EE3c b\u1EADt. L\u1EA7n s\u1EED d\u1EE5ng \u0111\u1EA7u ti\xEAn c\u1EA7n t\u1EA3i v\xE0 chu\u1EA9n b\u1ECB c\xE1c model nh\u1EADn d\u1EA1ng c\u1EE5c b\u1ED9. M\u1EDF chi ti\u1EBFt plugin \u0111\u1EC3 xem \u01B0\u1EDBc t\xEDnh dung l\u01B0\u1EE3ng \u0111\u0129a, b\u1ED9 nh\u1EDB v\xE0 th\u1EDDi gian tr\u01B0\u1EDBc khi b\u1EAFt \u0111\u1EA7u thi\u1EBFt l\u1EADp.",
      "setupPrompt.details": "M\u1EDF c\xE0i \u0111\u1EB7t plugin gi\u1ECDng n\xF3i",
      "setupPrompt.later": "\u0110\u1EC3 sau",
      "setupPrompt.open": "\u0110i t\u1EDBi thi\u1EBFt l\u1EADp",
      "setupPrompt.title": "Thi\u1EBFt l\u1EADp nh\u1EADp b\u1EB1ng gi\u1ECDng n\xF3i tr\u01B0\u1EDBc khi ghi \xE2m",
      "setupPrompt.trigger": "M\u1EDF thi\u1EBFt l\u1EADp nh\u1EADp b\u1EB1ng gi\u1ECDng n\xF3i",
      "setupPrompt.unavailableBody": "M\u1EDF chi ti\u1EBFt plugin gi\u1ECDng n\xF3i \u0111\u1EC3 ki\u1EC3m tra tr\u1EA1ng th\xE1i nh\u1EADn d\u1EA1ng, ti\u1EBFn \u0111\u1ED9 chu\u1EA9n b\u1ECB ho\u1EB7c l\u1ED7i.",
      "setupPrompt.unavailableTitle": "Nh\u1EADn d\u1EA1ng gi\u1ECDng n\xF3i ch\u01B0a s\u1EB5n s\xE0ng",
      "short.downloading": "\u0110ang t\u1EA3i xu\u1ED1ng",
      "short.failed": "Thi\u1EBFt l\u1EADp th\u1EA5t b\u1EA1i",
      "sourceAuto": "T\u1EF1 \u0111\u1ED9ng (khuy\u1EBFn ngh\u1ECB)",
      "sourceAutoHelp": "\u01AFu ti\xEAn ngu\u1ED3n ph\u1EA3n h\u1ED3i \u0111\u1EA7u ti\xEAn v\xE0 th\u1EED ngu\u1ED3n kh\xE1c n\u1EBFu t\u1EA3i xu\u1ED1ng th\u1EA5t b\u1EA1i.",
      "sourceChoice": "Ngu\u1ED3n t\u1EA3i model",
      "sourceHuggingFace": "Hugging Face",
      "sourceManualHelp": "Ch\u1EC9 t\u1EA3i t\u1EEB ngu\u1ED3n \u0111\xE3 ch\u1ECDn. C\xE1c t\u1EC7p \u0111\xE3 t\u1EA3i v\xE0 x\xE1c minh s\u1EBD \u0111\u01B0\u1EE3c d\xF9ng l\u1EA1i.",
      "sourceMirror": "HF-Mirror (b\u1EA3n g\u01B0\u01A1ng Trung Qu\u1ED1c)",
      "start": "B\u1EAFt \u0111\u1EA7u ghi \xE2m",
      "step.check": "Ki\u1EC3m tra t\xE0i nguy\xEAn c\u1EE5c b\u1ED9",
      "step.load": "T\u1EA3i {name}",
      "step.model": "Chu\u1EA9n b\u1ECB model nh\u1EADn d\u1EA1ng",
      "step.vad": "Chu\u1EA9n b\u1ECB model ph\xE1t hi\u1EC7n gi\u1ECDng n\xF3i",
      "step.verify": "X\xE1c minh t\u1EC7p model",
      "stepStatus.cancelled": "\u0110\xE3 h\u1EE7y",
      "stepStatus.complete": "Ho\xE0n t\u1EA5t",
      "stepStatus.failed": "Th\u1EA5t b\u1EA1i",
      "stepStatus.pending": "Ch\u01B0a b\u1EAFt \u0111\u1EA7u",
      "stepStatus.running": "\u0110ang th\u1EF1c hi\u1EC7n",
      "stop": "D\u1EEBng v\xE0 phi\xEAn \xE2m",
      "systemMicrophone": "M\u1EB7c \u0111\u1ECBnh h\u1EC7 th\u1ED1ng",
      "systemMicrophoneNamed": "M\u1EB7c \u0111\u1ECBnh h\u1EC7 th\u1ED1ng ({name})",
      "tooLarge": "B\u1EA3n ghi v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n c\u1EE7a d\u1ECBch v\u1EE5. H\xE3y ghi \xE2m ng\u1EAFn h\u01A1n.",
      "transcribingShort": "\u0110ang phi\xEAn \xE2m\u2026",
      "unavailable": "Tr\xECnh duy\u1EC7t n\xE0y kh\xF4ng th\u1EC3 ghi \xE2m. H\xE3y d\xF9ng tr\xECnh duy\u1EC7t h\u1ED7 tr\u1EE3 micro.",
      "unnamedMicrophone": "Micro {number}",
      "unnamedSelectedMicrophone": "Micro",
      "wakingShort": "\u0110ang \u0111\xE1nh th\u1EE9c\u2026",
      "yue": "Ti\u1EBFng Qu\u1EA3ng \u0110\xF4ng",
      "zh": "Ti\u1EBFng Trung"
    },
    "workflowRun": {
      "member.empty": "T\xEAn th\xE0nh vi\xEAn tr\u1ED1ng",
      "member.open": "M\u1EDF {name}",
      "phase.empty": "T\xEAn giai \u0111o\u1EA1n tr\u1ED1ng",
      "phase.unassigned": "Ch\u01B0a ph\xE2n giai \u0111o\u1EA1n",
      "run.empty": "Ch\u01B0a c\xF3 th\xE0nh vi\xEAn n\xE0o kh\u1EDFi ch\u1EA1y",
      "run.members.one": "{count} th\xE0nh vi\xEAn",
      "run.members.other": "{count} th\xE0nh vi\xEAn",
      "run.title": "{name}",
      "status.cancelled": "\u0110\xE3 h\u1EE7y",
      "status.completed": "Ho\xE0n th\xE0nh",
      "status.failed": "Th\u1EA5t b\u1EA1i",
      "status.interrupted": "B\u1ECB gi\xE1n \u0111o\u1EA1n",
      "status.running": "\u0110ang ch\u1EA1y",
      "statusCount.cancelled": "\u0110\xE3 h\u1EE7y {count}",
      "statusCount.completed": "\u0110\xE3 ho\xE0n th\xE0nh {count}",
      "statusCount.failed": "Th\u1EA5t b\u1EA1i {count}",
      "statusCount.interrupted": "B\u1ECB gi\xE1n \u0111o\u1EA1n {count}",
      "statusCount.running": "\u0110ang ch\u1EA1y {count}"
    },
    "workspace": {
      "actions.archive": "L\u01B0u tr\u1EEF",
      "actions.newSession": "Phi\xEAn m\u1EDBi",
      "actions.newSession.aria": "Phi\xEAn m\u1EDBi trong {name}",
      "actions.pin": "Ghim",
      "actions.session.aria": "Thao t\xE1c phi\xEAn cho {name}",
      "actions.unarchive": "B\u1ECF l\u01B0u tr\u1EEF",
      "actions.unpin": "B\u1ECF ghim",
      "actions.workspace.aria": "Thao t\xE1c workspace cho {name}",
      "archive.confirm.action": "D\u1EEBng v\xE0 l\u01B0u tr\u1EEF",
      "archive.confirm.activity": "C\xF4ng vi\u1EC7c s\u1EBD b\u1ECB d\u1EEBng",
      "archive.confirm.desc": "\u201C{title}\u201D v\u1EABn c\xF2n c\xF4ng vi\u1EC7c \u0111ang th\u1EF1c hi\u1EC7n. L\u01B0u tr\u1EEF s\u1EBD d\u1EEBng vi\u1EC7c \u0111\xF3 tr\u01B0\u1EDBc; b\u1EA1n c\xF3 th\u1EC3 kh\xF4i ph\u1EE5c phi\xEAn sau t\u1EEB b\u1ED9 l\u1ECDc \u201CT\u1EA5t c\u1EA3 h\u1ED9i tho\u1EA1i (hi\u1EC7n m\u1EE5c \u0111\xE3 l\u01B0u tr\u1EEF)\u201D \u1EDF thanh b\xEAn, v\xE0 c\xF4ng vi\u1EC7c \u0111\xE3 d\u1EEBng s\u1EBD kh\xF4ng t\u1EF1 ti\u1EBFp t\u1EE5c.",
      "archive.confirm.jobs.one": "{n} job n\u1EC1n: {names}",
      "archive.confirm.jobs.other": "{n} job n\u1EC1n: {names}",
      "archive.confirm.listSeparator": ", ",
      "archive.confirm.other.one": "{n} m\u1EE5c c\xF4ng vi\u1EC7c kh\xE1c ({kind})",
      "archive.confirm.other.other": "{n} m\u1EE5c c\xF4ng vi\u1EC7c kh\xE1c ({kind})",
      "archive.confirm.pending": "\u0110ang d\u1EEBng v\xE0 l\u01B0u tr\u1EEF\u2026",
      "archive.confirm.schedules.one": "{n} nh\u1EAFc nh\u1EDF \u0111\xE3 l\xEAn l\u1ECBch: {names}",
      "archive.confirm.schedules.other": "{n} nh\u1EAFc nh\u1EDF \u0111\xE3 l\xEAn l\u1ECBch: {names}",
      "archive.confirm.subagents.one": "{n} subagent \u0111ang ch\u1EA1y: {names}",
      "archive.confirm.subagents.other": "{n} subagent \u0111ang ch\u1EA1y: {names}",
      "archive.confirm.title": "D\u1EEBng v\xE0 l\u01B0u tr\u1EEF phi\xEAn n\xE0y?",
      "archive.confirm.turn": "L\u01B0\u1EE3t \u0111ang di\u1EC5n ra",
      "conflict.named": "\u0110\xE3 t\u1ED3n t\u1EA1i workspace t\xEAn \u201C{name}\u201D.",
      "date.ymd": "{y}-{m}-{d}",
      "defaultWorkspace.failed": "Kh\xF4ng th\u1EC3 t\u1EA1o workspace m\u1EB7c \u0111\u1ECBnh. D\xF9ng Ch\u1ECDn workspace \u0111\u1EC3 ch\u1ECDn m\u1ED9t th\u01B0 m\u1EE5c.",
      "delete.desc": "Thao t\xE1c n\xE0y x\xF3a \u201C{name}\u201D kh\u1ECFi danh s\xE1ch workspace. Th\u01B0 m\u1EE5c v\xE0 nh\u1EADt k\xFD phi\xEAn v\u1EABn \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i. C\xE1c phi\xEAn c\u1EE7a n\xF3 s\u1EBD xu\u1EA5t hi\u1EC7n d\u01B0\u1EDBi Ch\u01B0a nh\xF3m.",
      "delete.pending": "\u0110ang x\xF3a workspace\u2026",
      "delete.workspace": "X\xF3a workspace",
      "draft.initializationFailed": "Kh\xF4ng th\u1EC3 \u0111i\u1EC1n b\u1EA3n nh\xE1p. Vui l\xF2ng th\u1EED l\u1EA1i sau gi\xE2y l\xE1t.",
      "draft.workspaceRequired": "H\xE3y ch\u1ECDn workspace tr\u01B0\u1EDBc.",
      "empty.noMatches": "Kh\xF4ng c\xF3 k\u1EBFt qu\u1EA3 ph\xF9 h\u1EE3p",
      "empty.none": "Ch\u01B0a c\xF3 phi\xEAn n\xE0o",
      "empty.noneArchived": "Ch\u01B0a c\xF3 phi\xEAn l\u01B0u tr\u1EEF n\xE0o",
      "empty.viewOthers": "Xem c\xE1c phi\xEAn kh\xE1c",
      "field.sessionName": "T\xEAn phi\xEAn",
      "field.workspaceName": "T\xEAn workspace",
      "filterBy.label": "L\u1ECDc phi\xEAn",
      "folderError.retry": "Ch\u1ECDn l\u1EA1i",
      "folderError.title": "Kh\xF4ng th\u1EC3 m\u1EDF th\u01B0 m\u1EE5c",
      "group.ungrouped": "Ch\u01B0a nh\xF3m",
      "groupBy.flat": "Trong m\u1ED9t danh s\xE1ch",
      "groupBy.label": "Nh\xF3m theo",
      "groupBy.workspace": "Workspace",
      "groupBy.workspaceTree": "C\xE2y workspace",
      "hover.copied": "\u0110\xE3 sao ch\xE9p",
      "hover.created": "\u0110\xE3 t\u1EA1o {time}",
      "menu.addWorkspace": "Th\xEAm workspace\u2026",
      "menu.archiveSession": "L\u01B0u tr\u1EEF phi\xEAn",
      "menu.fork": "Fork phi\xEAn",
      "menu.pinSession": "Ghim phi\xEAn",
      "menu.sessionId": "Sao ch\xE9p ID phi\xEAn",
      "menu.unarchiveSession": "B\u1ECF l\u01B0u tr\u1EEF phi\xEAn",
      "menu.unpinSession": "B\u1ECF ghim phi\xEAn",
      "orderBy.label": "S\u1EAFp x\u1EBFp theo",
      "orderBy.manual": "Th\u1EE7 c\xF4ng",
      "orderBy.updated": "C\u1EADp nh\u1EADt g\u1EA7n nh\u1EA5t",
      "picker.loading": "\u0110ang t\u1EA3i workspace\u2026",
      "rename": "\u0110\u1ED5i t\xEAn",
      "rename.session.title": "\u0110\u1ED5i t\xEAn phi\xEAn",
      "rename.workspace.title": "\u0110\u1ED5i t\xEAn workspace",
      "row.archived": "\u0110\xE3 l\u01B0u tr\u1EEF",
      "row.pinned": "\u0110\xE3 ghim",
      "search.clear": "X\xF3a t\xECm ki\u1EBFm",
      "search.hasMore": "\u0110ang hi\u1EC7n {n} k\u1EBFt qu\u1EA3 \u0111\u1EA7u ti\xEAn. H\xE3y thu h\u1EB9p t\xECm ki\u1EBFm.",
      "search.noMatches": "Kh\xF4ng c\xF3 phi\xEAn ph\xF9 h\u1EE3p",
      "search.pending": "\u0110ang t\xECm trong l\u1ECBch s\u1EED phi\xEAn\u2026",
      "search.placeholder": "T\xECm t\xEAn phi\xEAn",
      "search.results.aria": "K\u1EBFt qu\u1EA3 t\xECm ki\u1EBFm",
      "search.sessions.aria": "T\xECm ki\u1EBFm phi\xEAn",
      "section.sessions": "Phi\xEAn",
      "section.workspaces": "Workspace",
      "session.new": "Phi\xEAn m\u1EDBi",
      "session.untitled": "Ch\u01B0a c\xF3 t\xEAn",
      "sessions.collapse": "Hi\u1EC7n \xEDt h\u01A1n",
      "sessions.count.one": "{n} phi\xEAn",
      "sessions.count.other": "{n} phi\xEAn",
      "sessions.expand": "Hi\u1EC7n th\xEAm {n} phi\xEAn",
      "shortcut.directoryBusy": "\u0110ang ch\u1ECDn ho\u1EB7c th\xEAm workspace",
      "shortcut.forkFailed": "Kh\xF4ng th\u1EC3 fork phi\xEAn. H\xE3y th\u1EED l\u1EA1i.",
      "shortcut.noCompletedTurn": "Phi\xEAn n\xE0y ch\u01B0a c\xF3 l\u01B0\u1EE3t n\xE0o ho\xE0n th\xE0nh",
      "shortcut.noPicker": "Tr\xECnh ch\u1ECDn th\u01B0 m\u1EE5c kh\xF4ng kh\u1EA3 d\u1EE5ng",
      "shortcut.noSession": "H\xE3y ch\u1ECDn m\u1ED9t phi\xEAn tr\u01B0\u1EDBc",
      "status.compact.answer": "Tr\u1EA3 l\u1EDDi",
      "status.compact.approval": "Ph\xEA duy\u1EC7t",
      "status.compact.planReview": "Xem x\xE9t k\u1EBF ho\u1EA1ch",
      "status.completed": "Ho\xE0n th\xE0nh",
      "status.idle": "R\u1EA3nh",
      "status.planReview": "K\u1EBF ho\u1EA1ch ch\u1EDD xem x\xE9t",
      "status.running": "\u0110ang ch\u1EA1y",
      "status.subagentsRunning.one": "{n} subagent \u0111ang ch\u1EA1y",
      "status.subagentsRunning.other": "{n} subagent \u0111ang ch\u1EA1y",
      "status.waitingAnswer": "\u0110ang ch\u1EDD tr\u1EA3 l\u1EDDi",
      "status.waitingApproval": "\u0110ang ch\u1EDD ph\xEA duy\u1EC7t",
      "time.ago": "{t} tr\u01B0\u1EDBc",
      "time.days": "{n} ng\xE0y",
      "time.hours": "{n} gi\u1EDD",
      "time.minutes": "{n} ph\xFAt",
      "time.months": "{n} th\xE1ng",
      "time.now": "b\xE2y gi\u1EDD",
      "time.years": "{n} n\u0103m",
      "toast.archived": "\u0110\xE3 l\u01B0u tr\u1EEF phi\xEAn. B\u1EA1n c\xF3 th\u1EC3 ",
      "toast.archivedFilter": "l\u1ECDc phi\xEAn \u0111\xE3 l\u01B0u tr\u1EEF",
      "toast.archivedNotOpenable": "Kh\xF4ng th\u1EC3 m\u1EDF phi\xEAn \u0111\xE3 l\u01B0u tr\u1EEF. H\xE3y b\u1ECF l\u01B0u tr\u1EEF \u0111\u1EC3 xem.",
      "toast.archivedOr": " ho\u1EB7c ",
      "toast.archivedUndo": "ho\xE0n t\xE1c",
      "toast.createFailed": "T\u1EA1o phi\xEAn m\u1EDBi th\u1EA5t b\u1EA1i: {message}",
      "toast.forkRequiresOpen": "M\u1EDF phi\xEAn g\u1ED1c \u0111\u1EC3 ho\xE0n t\u1EA5t vi\u1EC7c di chuy\u1EC3n tr\u01B0\u1EDBc khi t\u1EA1o nh\xE1nh.",
      "toast.openForkSource": "M\u1EDF phi\xEAn g\u1ED1c",
      "toast.pinFailed": "Ghim th\u1EA5t b\u1EA1i. H\xE3y th\u1EED l\u1EA1i sau.",
      "toast.sessionIdCopied": "\u0110\xE3 sao ch\xE9p ID phi\xEAn",
      "toast.sessionIdCopyFailed": "Sao ch\xE9p th\u1EA5t b\u1EA1i. H\xE3y th\u1EED l\u1EA1i.",
      "toast.stoppedAndArchived": "\u0110\xE3 d\u1EEBng v\xE0 l\u01B0u tr\u1EEF phi\xEAn. B\u1EA1n c\xF3 th\u1EC3 ",
      "toast.unpinFailed": "B\u1ECF ghim th\u1EA5t b\u1EA1i. H\xE3y th\u1EED l\u1EA1i sau.",
      "viewOptions.hideArchived": "\u1EA8n m\u1EE5c \u0111\xE3 l\u01B0u tr\u1EEF",
      "viewOptions.label": "T\xF9y ch\u1ECDn xem",
      "viewOptions.onlyArchived": "Ch\u1EC9 m\u1EE5c \u0111\xE3 l\u01B0u tr\u1EEF",
      "viewOptions.showArchived": "T\u1EA5t c\u1EA3 h\u1ED9i tho\u1EA1i (hi\u1EC7n m\u1EE5c \u0111\xE3 l\u01B0u tr\u1EEF)",
      "workspace.add": "Th\xEAm workspace"
    }
  };

  // src/client/vi-language-pack.ts
  var VI_LOCALE_ID = "vi";
  var VI_LOCALE_LABEL = "Ti\u1EBFng Vi\u1EC7t";
  var VI_LOCALE_FALLBACK = "en";
  function mountVietnamese(ctx) {
    const guarded = (label, register) => {
      ctx.effect(() => {
        try {
          return register();
        } catch (error) {
          console.warn(`[personal-hub] cannot register ${label}:`, error instanceof Error ? error.message : String(error));
          return () => {
          };
        }
      }, label);
    };
    guarded("personal-hub: Vietnamese language", () => ctx.locale.addLanguage({
      id: VI_LOCALE_ID,
      label: VI_LOCALE_LABEL,
      fallback: VI_LOCALE_FALLBACK
    }));
    for (const [namespace, dictionary] of Object.entries(VI_DICTIONARIES)) {
      guarded(`personal-hub: Vietnamese ${namespace}`, () => ctx.locale.register(namespace, VI_LOCALE_ID, dictionary));
    }
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
        WebRemoteCard,
        WebRemoteForm,
        MergeSettingsCard,
        AutoArchiveCard,
        AutoArchiveForm,
        WorktreeHero,
        WorktreeOption,
        WorktreeDock,
        WorktreeDockCard,
        GitPanel,
        GitHeaderButton,
        GitActions,
        DiffFileSection,
        CommitComposer,
        WorktreesView,
        WorktreeRow,
        MergeSettingsForm,
        Markdown,
        stateLabel,
        stateTone,
        countdownText,
        relayLooksValid,
        emptyCardState,
        draftOf,
        installStyles
      },
      apply(ctx) {
        const t = ctx.locale.bind(NS);
        ctx.effect(() => ctx.locale.register(NS, dictionaries), "personal-hub: dictionaries");
        mountVietnamese(ctx);
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
        const webRemote = createWebRemoteApi();
        const autoArchive = createAutoArchiveApi();
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
              api,
              webRemote,
              autoArchive
            })
          }, PersonalHubCard)),
          "personal-hub: row config card"
        );
        ctx.effect(
          () => ctx.slots.inject("conversation.hero.options", () => registerSlot(ctx, {
            name: "conversation.hero.options",
            id: "personal-hub-worktree",
            order: 20,
            label: () => t("wtAuto"),
            locale: NS,
            inject: () => ({ api, t })
          }, WorktreeHero)),
          "personal-hub: worktree option"
        );
        ctx.effect(
          () => ctx.slots.inject("conversation.input.dock", () => registerSlot(ctx, {
            name: "conversation.input.dock",
            id: "personal-hub-worktree-status",
            order: 20,
            label: () => t("wtDockLabel"),
            locale: NS,
            inject: () => ({ api, t })
          }, WorktreeDock)),
          "personal-hub: worktree status"
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
        h("span", { className: "ph-hint" }, t("webRemoteSummary")),
        h("span", { className: "ph-hint" }, t("gitSettingsSummary")),
        h("span", { className: "ph-hint" }, t("aaSummary"))
      );
    }
    return h(
      "div",
      { "data-personal-hub-card": true, style: { display: "flex", flexDirection: "column", gap: "16px" } },
      h(TelegramCard, props),
      h("div", { style: { borderTop: "1px solid var(--dsw-alias-border-l3)" } }),
      h(WebRemoteCard, { api: props.webRemote, t }),
      h("div", { style: { borderTop: "1px solid var(--dsw-alias-border-l3)" } }),
      h(MergeSettingsCard, { api: props.api, t }),
      h("div", { style: { borderTop: "1px solid var(--dsw-alias-border-l3)" } }),
      h(AutoArchiveCard, { api: props.autoArchive, t })
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
