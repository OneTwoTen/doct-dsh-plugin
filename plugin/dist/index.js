// src/lib/config.ts
var TELEGRAM_DEFAULTS = Object.freeze({
  enabled: true,
  token: "",
  tokenEnv: "DSH_TELEGRAM_BOT_TOKEN",
  tokenFile: "",
  allowedChatIds: [],
  cwd: "",
  pollTimeoutSec: 25,
  requestTimeoutMs: 9e5,
  progressIntervalMs: 1500,
  /** Push each intermediate assistant response into the chat. */
  pushResponses: true,
  /** Push the turn's changed-files summary into the chat. */
  pushChanges: true
});
var GIT_DEFAULTS = Object.freeze({
  enabled: true,
  /** `auto` detects the code host from the remote; `none` disables pull requests and issues. */
  forge: "auto",
  /** Remote to prefer; empty means the branch's upstream remote, then `origin`. */
  remote: "",
  /** Code host CLI to run (`gh`, `glab`, or an absolute path); empty picks by provider. */
  cliPath: "",
  /** Environment variable holding a GitHub token for the REST fallback. */
  tokenEnv: "GITHUB_TOKEN",
  commandTimeoutMs: 15e3,
  /** Longest `git fetch` or worktree command; the default command limit is too short for a network fetch. */
  worktreeTimeoutMs: 18e4,
  /** Bytes of diff text kept per file. */
  maxDiffBytes: 393216,
  /** Bytes read from one untracked file when it has no diff. */
  maxUntrackedBytes: 131072,
  /** Untracked files sized on one refresh; the rest are listed without line counts. */
  maxUntrackedFiles: 60,
  logLimit: 20,
  pullLimit: 20,
  issueLimit: 20,
  /** Milliseconds a code-host answer is reused. */
  cacheMs: 2e4,
  /** Suggested client refresh interval. */
  refreshMs: 3e4,
  /** Creating a change request with a model. */
  pull: Object.freeze({
    enabled: true,
    /** Base branch a new change request targets; empty asks the repository for its default. */
    base: "",
    /**
     * Route used to draft the title and description. Empty uses the Session's
     * current model with the lowest reasoning effort that route supports.
     */
    provider: "",
    model: "",
    /** Push the branch before creating the change request. */
    push: true,
    /** End-to-end deadline for the drafting request. */
    timeoutMs: 9e4,
    /** Model output-token cap for the draft. */
    maxOutputTokens: 4096,
    /** Bytes of diff text the draft prompt may carry. */
    contextBytes: 6e4,
    /** Commits the draft prompt lists. */
    commitLimit: 40
  }),
  /** Drafting a commit message with a model. */
  commit: Object.freeze({
    enabled: true,
    provider: "",
    model: "",
    timeoutMs: 6e4,
    maxOutputTokens: 512,
    contextBytes: 5e4,
    styleLimit: 12,
    maxSubjectLength: 72
  }),
  /** New Session worktrees. */
  worktree: Object.freeze({
    enabled: true,
    /** Directory inside the repository that holds created checkouts. */
    directory: ".agents/worktrees",
    /** Branch and directory name prefix. */
    namePrefix: "dsh",
    /** `id` keeps `dsh-<session digits>`; `semantic` renames the branch from the first message. */
    naming: "id",
    /** Extra instruction for the naming model, appended to its prompt. */
    nameInstructions: "",
    /** Branch the picker starts on; empty asks the repository for its default branch. */
    base: "",
    /** Where a new worktree starts: `local` (recent local branches) or `remote` (fetched remote branches). */
    source: "local",
    /** Remote used for `source: remote`; empty follows the selected remote, then `origin`. */
    remote: "",
    /** Removing checkouts nobody uses any more. */
    cleanup: Object.freeze({
      enabled: false,
      /** Milliseconds between cleanup passes. */
      checkMs: 36e5,
      /** Remove a checkout untouched for this many days; 0 turns the rule off. */
      inactiveDays: 7,
      /** Remove a checkout whose branch never gained a commit over its base. */
      whenNoCommits: true,
      /** Grace before the no-commit rule applies, so a fresh checkout survives its first hour. */
      noCommitsAfterHours: 6,
      /** `tracked` keeps a checkout with uncommitted tracked edits, `any` also keeps untracked files, `none` ignores both. */
      keepChanges: "tracked",
      /** Delete the branch together with its checkout. */
      deleteBranch: false
    })
  }),
  /** What happens once a Session's change request is merged. */
  merged: Object.freeze({
    enabled: false,
    /** Remove the worktree this Session created once its change request is merged. */
    removeWorktree: true,
    /** Delete the merged worktree branch too. */
    deleteBranch: false,
    /** Archive the Session so it leaves the active list. */
    archiveSession: true,
    /** Milliseconds between merge checks. */
    checkMs: 6e4
  })
});
function asRecord(value) {
  return value !== null && typeof value === "object" ? value : {};
}
function asBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}
function asPositiveInteger(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numeric = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}
function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function asChoice(value, choices, fallback) {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  return choices.includes(text) ? text : fallback;
}
function normalizeConfig(raw) {
  const root = asRecord(raw);
  const telegram = asRecord(root.telegram);
  const allowedChatIds = Array.isArray(telegram.allowedChatIds) ? telegram.allowedChatIds : [];
  const git = asRecord(root.git);
  const pull = asRecord(git.pull);
  const commit = asRecord(git.commit);
  const worktree = asRecord(git.worktree);
  const cleanup = asRecord(worktree.cleanup);
  const merged = asRecord(git.merged);
  return {
    telegram: {
      enabled: asBoolean(telegram.enabled, TELEGRAM_DEFAULTS.enabled),
      token: asString(telegram.token, TELEGRAM_DEFAULTS.token).trim(),
      tokenEnv: asString(telegram.tokenEnv, TELEGRAM_DEFAULTS.tokenEnv).trim(),
      tokenFile: asString(telegram.tokenFile, TELEGRAM_DEFAULTS.tokenFile).trim(),
      allowedChatIds: allowedChatIds.map((id) => String(id).trim()).filter((id) => id.length > 0),
      cwd: asString(telegram.cwd, TELEGRAM_DEFAULTS.cwd).trim(),
      pollTimeoutSec: asPositiveInteger(telegram.pollTimeoutSec, TELEGRAM_DEFAULTS.pollTimeoutSec, { min: 1, max: 50 }),
      requestTimeoutMs: asPositiveInteger(telegram.requestTimeoutMs, TELEGRAM_DEFAULTS.requestTimeoutMs, { min: 5e3 }),
      progressIntervalMs: asPositiveInteger(telegram.progressIntervalMs, TELEGRAM_DEFAULTS.progressIntervalMs, { min: 250 }),
      pushResponses: asBoolean(telegram.pushResponses, TELEGRAM_DEFAULTS.pushResponses),
      pushChanges: asBoolean(telegram.pushChanges, TELEGRAM_DEFAULTS.pushChanges)
    },
    git: {
      enabled: asBoolean(git.enabled, GIT_DEFAULTS.enabled),
      forge: asChoice(git.forge, ["auto", "github", "gitlab", "none"], GIT_DEFAULTS.forge),
      remote: asString(git.remote, GIT_DEFAULTS.remote).trim(),
      cliPath: asString(git.cliPath, GIT_DEFAULTS.cliPath).trim(),
      tokenEnv: asString(git.tokenEnv, GIT_DEFAULTS.tokenEnv).trim(),
      commandTimeoutMs: asPositiveInteger(git.commandTimeoutMs, GIT_DEFAULTS.commandTimeoutMs, { min: 1e3 }),
      maxDiffBytes: asPositiveInteger(git.maxDiffBytes, GIT_DEFAULTS.maxDiffBytes, { min: 4096 }),
      maxUntrackedBytes: asPositiveInteger(git.maxUntrackedBytes, GIT_DEFAULTS.maxUntrackedBytes, { min: 1024 }),
      maxUntrackedFiles: asPositiveInteger(git.maxUntrackedFiles, GIT_DEFAULTS.maxUntrackedFiles, { min: 1, max: 500 }),
      logLimit: asPositiveInteger(git.logLimit, GIT_DEFAULTS.logLimit, { min: 1, max: 200 }),
      pullLimit: asPositiveInteger(git.pullLimit, GIT_DEFAULTS.pullLimit, { min: 1, max: 100 }),
      issueLimit: asPositiveInteger(git.issueLimit, GIT_DEFAULTS.issueLimit, { min: 1, max: 100 }),
      cacheMs: asPositiveInteger(git.cacheMs, GIT_DEFAULTS.cacheMs, { min: 0, max: 6e5 }),
      refreshMs: asPositiveInteger(git.refreshMs, GIT_DEFAULTS.refreshMs, { min: 3e3, max: 6e5 }),
      worktreeTimeoutMs: asPositiveInteger(git.worktreeTimeoutMs, GIT_DEFAULTS.worktreeTimeoutMs, { min: 5e3, max: 18e5 }),
      pull: {
        enabled: asBoolean(pull.enabled, GIT_DEFAULTS.pull.enabled),
        base: asString(pull.base, GIT_DEFAULTS.pull.base).trim(),
        provider: asString(pull.provider, GIT_DEFAULTS.pull.provider).trim(),
        model: asString(pull.model, GIT_DEFAULTS.pull.model).trim(),
        push: asBoolean(pull.push, GIT_DEFAULTS.pull.push),
        timeoutMs: asPositiveInteger(pull.timeoutMs, GIT_DEFAULTS.pull.timeoutMs, { min: 5e3, max: 6e5 }),
        maxOutputTokens: asPositiveInteger(pull.maxOutputTokens, GIT_DEFAULTS.pull.maxOutputTokens, { min: 256, max: 32768 }),
        contextBytes: asPositiveInteger(pull.contextBytes, GIT_DEFAULTS.pull.contextBytes, { min: 1024 }),
        commitLimit: asPositiveInteger(pull.commitLimit, GIT_DEFAULTS.pull.commitLimit, { min: 1, max: 200 })
      },
      commit: {
        enabled: asBoolean(commit.enabled, GIT_DEFAULTS.commit.enabled),
        provider: asString(commit.provider, GIT_DEFAULTS.commit.provider).trim(),
        model: asString(commit.model, GIT_DEFAULTS.commit.model).trim(),
        timeoutMs: asPositiveInteger(commit.timeoutMs, GIT_DEFAULTS.commit.timeoutMs, { min: 5e3, max: 6e5 }),
        maxOutputTokens: asPositiveInteger(commit.maxOutputTokens, GIT_DEFAULTS.commit.maxOutputTokens, { min: 64, max: 8192 }),
        contextBytes: asPositiveInteger(commit.contextBytes, GIT_DEFAULTS.commit.contextBytes, { min: 1024 }),
        styleLimit: asPositiveInteger(commit.styleLimit, GIT_DEFAULTS.commit.styleLimit, { min: 0, max: 100 }),
        maxSubjectLength: asPositiveInteger(commit.maxSubjectLength, GIT_DEFAULTS.commit.maxSubjectLength, { min: 20, max: 200 })
      },
      worktree: {
        enabled: asBoolean(worktree.enabled, GIT_DEFAULTS.worktree.enabled),
        directory: asString(worktree.directory, GIT_DEFAULTS.worktree.directory).trim() || GIT_DEFAULTS.worktree.directory,
        namePrefix: asString(worktree.namePrefix, GIT_DEFAULTS.worktree.namePrefix).trim(),
        naming: asChoice(worktree.naming, ["id", "semantic"], GIT_DEFAULTS.worktree.naming),
        nameInstructions: asString(worktree.nameInstructions, GIT_DEFAULTS.worktree.nameInstructions).trim(),
        base: asString(worktree.base, GIT_DEFAULTS.worktree.base).trim(),
        source: asChoice(worktree.source, ["local", "remote"], GIT_DEFAULTS.worktree.source),
        remote: asString(worktree.remote, GIT_DEFAULTS.worktree.remote).trim(),
        cleanup: {
          enabled: asBoolean(cleanup.enabled, GIT_DEFAULTS.worktree.cleanup.enabled),
          checkMs: asPositiveInteger(cleanup.checkMs, GIT_DEFAULTS.worktree.cleanup.checkMs, { min: 3e5, max: 864e5 }),
          inactiveDays: asPositiveInteger(cleanup.inactiveDays, GIT_DEFAULTS.worktree.cleanup.inactiveDays, { min: 0, max: 3650 }),
          whenNoCommits: asBoolean(cleanup.whenNoCommits, GIT_DEFAULTS.worktree.cleanup.whenNoCommits),
          noCommitsAfterHours: asPositiveInteger(cleanup.noCommitsAfterHours, GIT_DEFAULTS.worktree.cleanup.noCommitsAfterHours, { min: 0, max: 8760 }),
          keepChanges: asChoice(cleanup.keepChanges, ["tracked", "any", "none"], GIT_DEFAULTS.worktree.cleanup.keepChanges),
          deleteBranch: asBoolean(cleanup.deleteBranch, GIT_DEFAULTS.worktree.cleanup.deleteBranch)
        }
      },
      merged: {
        enabled: asBoolean(merged.enabled, GIT_DEFAULTS.merged.enabled),
        removeWorktree: asBoolean(merged.removeWorktree, GIT_DEFAULTS.merged.removeWorktree),
        deleteBranch: asBoolean(merged.deleteBranch, GIT_DEFAULTS.merged.deleteBranch),
        archiveSession: asBoolean(merged.archiveSession, GIT_DEFAULTS.merged.archiveSession),
        checkMs: asPositiveInteger(merged.checkMs, GIT_DEFAULTS.merged.checkMs, { min: 15e3, max: 36e5 })
      }
    }
  };
}

// src/features/git.ts
import { randomUUID } from "node:crypto";
import { stat as stat4 } from "node:fs/promises";
import { isAbsolute as isAbsolute3, join as join4, resolve as resolve4 } from "node:path";

// src/lib/git-run.ts
import { execFile } from "node:child_process";
import { open, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

// src/lib/git-core.ts
var CONFLICT_CODES = /* @__PURE__ */ new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);
function nulFields(raw) {
  return String(raw ?? "").split("\0").filter((field2) => field2.length > 0);
}
function parseRemoteUrl(input) {
  const raw = typeof input === "string" ? input.trim() : "";
  if (raw.length === 0) return void 0;
  let host = "";
  let path = "";
  const scp = /^(?:[^@/\s]+@)?([^:/\s]+):(?!\/)(.+)$/.exec(raw);
  if (!raw.includes("://") && scp !== null) {
    host = scp[1];
    path = scp[2];
  } else {
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      return void 0;
    }
    if (parsed.protocol === "file:") return void 0;
    host = parsed.hostname;
    path = parsed.pathname;
  }
  const segments = path.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\.git$/i, "").split("/").filter((segment) => segment.length > 0);
  if (segments.length < 2) return void 0;
  const name2 = segments[segments.length - 1];
  const owner = segments.slice(0, -1).join("/");
  const lowered = host.toLowerCase();
  const provider = /(^|\.)github\.com$/.test(lowered) || lowered === "github.com" ? "github" : lowered.includes("gitlab") ? "gitlab" : "other";
  return {
    name: name2,
    url: raw,
    provider,
    host,
    owner,
    repository: name2,
    slug: `${owner}/${name2}`
  };
}
function parsePorcelainV2(raw) {
  const fields = String(raw ?? "").split("\0");
  const branch = {
    head: null,
    oid: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    detached: false,
    unborn: false
  };
  const files = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field2 = fields[index];
    if (field2.length === 0) continue;
    if (field2.startsWith("# ")) {
      readBranchHeader(branch, field2.slice(2));
      continue;
    }
    const type = field2[0];
    if (type === "1") {
      const parts = field2.split(" ");
      const codes = parts[1] ?? "..";
      files.push(fileEntry({ codes, path: parts.slice(8).join(" ") }));
      continue;
    }
    if (type === "2") {
      const parts = field2.split(" ");
      const codes = parts[1] ?? "..";
      const original = fields[index + 1];
      index += 1;
      files.push(fileEntry({ codes, path: parts.slice(9).join(" "), origPath: original }));
      continue;
    }
    if (type === "u") {
      const parts = field2.split(" ");
      files.push(fileEntry({ codes: parts[1] ?? "UU", path: parts.slice(10).join(" ") }));
      continue;
    }
    if (type === "?") {
      const path = field2.slice(2);
      files.push({
        path,
        origPath: void 0,
        index: "?",
        worktree: "?",
        kind: "untracked",
        staged: false,
        unstaged: true,
        untracked: true,
        conflicted: false,
        additions: 0,
        deletions: 0,
        binary: false
      });
      continue;
    }
  }
  return { branch, files };
}
function readBranchHeader(branch, text) {
  const space = text.indexOf(" ");
  const key = space < 0 ? text : text.slice(0, space);
  const value = space < 0 ? "" : text.slice(space + 1);
  switch (key) {
    case "branch.oid":
      branch.unborn = value === "(initial)";
      branch.oid = branch.unborn ? null : value;
      return;
    case "branch.head":
      branch.detached = value === "(detached)";
      branch.head = branch.detached ? null : value;
      return;
    case "branch.upstream":
      branch.upstream = value.length > 0 ? value : null;
      return;
    case "branch.ab": {
      const match = /^\+(\d+)\s+-(\d+)$/.exec(value.trim());
      if (match !== null) {
        branch.ahead = Number(match[1]);
        branch.behind = Number(match[2]);
      }
      return;
    }
    default:
  }
}
function fileEntry(input) {
  const index = input.codes[0] ?? ".";
  const worktree = input.codes[1] ?? ".";
  const conflicted = CONFLICT_CODES.has(input.codes);
  const staged = index !== "." && index !== " " && index !== "?";
  const unstaged = worktree !== "." && worktree !== " ";
  return {
    path: input.path,
    origPath: input.origPath !== void 0 && input.origPath.length > 0 ? input.origPath : void 0,
    index,
    worktree,
    kind: kindOf(index, worktree, conflicted),
    staged,
    unstaged,
    untracked: false,
    conflicted,
    additions: 0,
    deletions: 0,
    binary: false
  };
}
function kindOf(index, worktree, conflicted) {
  if (conflicted) return "conflicted";
  const staged = index !== "." && index !== " " && index !== "?";
  const primary = staged ? index : worktree;
  switch (primary) {
    case "A":
      return "added";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    case "C":
      return "copied";
    case "T":
      return "typechange";
    case "U":
      return "conflicted";
    default:
      return "modified";
  }
}
function parseNumstatZ(raw) {
  const fields = String(raw ?? "").split("\0");
  const entries = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field2 = fields[index];
    if (field2.length === 0) continue;
    const firstTab = field2.indexOf("	");
    const secondTab = firstTab < 0 ? -1 : field2.indexOf("	", firstTab + 1);
    if (firstTab < 0 || secondTab < 0) continue;
    const added = field2.slice(0, firstTab);
    const deleted = field2.slice(firstTab + 1, secondTab);
    let path = field2.slice(secondTab + 1);
    let origPath;
    if (path.length === 0) {
      origPath = fields[index + 1];
      path = fields[index + 2] ?? "";
      index += 2;
    }
    if (path === void 0 || path.length === 0) continue;
    const binary = added === "-" || deleted === "-";
    entries.push({
      path,
      ...origPath !== void 0 && origPath.length > 0 ? { origPath } : {},
      additions: binary ? 0 : Number.parseInt(added, 10) || 0,
      deletions: binary ? 0 : Number.parseInt(deleted, 10) || 0,
      binary
    });
  }
  return entries;
}
function mergeLineCounts(files, stats) {
  const byPath = /* @__PURE__ */ new Map();
  for (const entry of stats) {
    byPath.set(entry.path, entry);
    if (entry.origPath !== void 0) byPath.set(entry.origPath, entry);
  }
  return files.map((file) => {
    const hit = byPath.get(file.path);
    return {
      ...file,
      additions: hit?.additions ?? 0,
      deletions: hit?.deletions ?? 0,
      binary: hit?.binary === true
    };
  });
}
function parsePatch(raw) {
  const lines = String(raw ?? "").split("\n");
  const files = [];
  let file;
  let hunk;
  let oldNumber = 0;
  let newNumber = 0;
  const startFile = () => {
    const created = { path: null, oldPath: null, hunks: [], additions: 0, deletions: 0, binary: false, meta: [] };
    files.push(created);
    file = created;
    hunk = void 0;
    return created;
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === void 0) continue;
    if (line.startsWith("diff --git ")) {
      const created = startFile();
      const rest = line.slice("diff --git ".length);
      const split = rest.lastIndexOf(" b/");
      if (split > 0) {
        created.oldPath = unquotePath(rest.slice(0, split).replace(/^a\//, ""));
        created.path = unquotePath(rest.slice(split + 3));
      } else {
        created.path = rest;
      }
      continue;
    }
    if (line.startsWith("--- ") && lines[index + 1]?.startsWith("+++ ") && file !== void 0 && file.hunks.length === 0) {
      const oldPath = unquotePath(line.slice(4));
      const newPath = unquotePath(lines[index + 1].slice(4));
      if (file.path === null) {
        file.path = newPath === "/dev/null" ? oldPath : newPath;
        if (oldPath !== "/dev/null" && oldPath !== file.path) file.oldPath = oldPath;
      }
      index += 1;
      continue;
    }
    if (line.startsWith("@@")) {
      const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/.exec(line);
      if (header === null) continue;
      if (file === void 0) startFile();
      oldNumber = Number(header[1]);
      newNumber = Number(header[3]);
      const created = {
        header: line,
        section: header[5] ?? "",
        oldStart: oldNumber,
        oldLines: header[2] === void 0 ? 1 : Number(header[2]),
        newStart: newNumber,
        newLines: header[4] === void 0 ? 1 : Number(header[4]),
        lines: []
      };
      hunk = created;
      file.hunks.push(created);
      continue;
    }
    if (line.startsWith("Binary files ") || line === "GIT binary patch") {
      if (file === void 0) startFile();
      file.binary = true;
      continue;
    }
    if (line.length === 0) continue;
    if (hunk === void 0) {
      if (file === void 0) startFile();
      file.meta.push(line);
      continue;
    }
    const marker = line[0];
    if (marker === "\\") {
      hunk.lines.push({ type: "meta", text: line.slice(1).trim(), oldNumber: null, newNumber: null });
      continue;
    }
    if (marker === "+") {
      hunk.lines.push({ type: "add", text: line.slice(1), oldNumber: null, newNumber });
      newNumber += 1;
      file.additions += 1;
      continue;
    }
    if (marker === "-") {
      hunk.lines.push({ type: "del", text: line.slice(1), oldNumber, newNumber: null });
      oldNumber += 1;
      file.deletions += 1;
      continue;
    }
    if (marker === " ") {
      hunk.lines.push({ type: "context", text: line.slice(1), oldNumber, newNumber });
      oldNumber += 1;
      newNumber += 1;
      continue;
    }
    hunk.lines.push({ type: "meta", text: line, oldNumber: null, newNumber: null });
  }
  return files;
}
function unquotePath(text) {
  const trimmed = String(text ?? "").trim();
  if (trimmed.length < 2 || !trimmed.startsWith('"') || !trimmed.endsWith('"')) return trimmed;
  try {
    return JSON.parse(trimmed.replace(/\\"/g, '"'));
  } catch {
    return trimmed.slice(1, -1);
  }
}
function untrackedPatch(path, text, options = {}) {
  const content = String(text ?? "");
  const lines = content.length === 0 ? [] : content.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return [{
    path,
    oldPath: null,
    additions: lines.length,
    deletions: 0,
    binary: options.binary === true,
    truncated: options.truncated === true,
    meta: [],
    hunks: options.binary === true || lines.length === 0 ? [] : [{
      header: `@@ -0,0 +1,${lines.length} @@`,
      section: "",
      oldStart: 0,
      oldLines: 0,
      newStart: 1,
      newLines: lines.length,
      lines: lines.map((line, index) => ({ type: "add", text: line, oldNumber: null, newNumber: index + 1 }))
    }]
  }];
}
function parseLog(raw) {
  const commits = [];
  for (const entry of nulFields(raw)) {
    const fields = entry.split("");
    if (fields.length < 6) continue;
    commits.push({
      hash: fields[0],
      short: fields[1],
      author: fields[2],
      date: fields[3],
      refs: fields[4],
      subject: fields.slice(5).join("")
    });
  }
  return commits;
}
function parseBranchRefs(raw, defaultBranch) {
  const branches = [];
  for (const entry of String(raw ?? "").split("\n")) {
    if (entry.length === 0) continue;
    const fields = entry.split("");
    if (fields.length < 6) continue;
    const full = fields[0];
    const short = fields[1];
    const isRemote = full.startsWith("refs/remotes/");
    const remoteName = isRemote ? fields[6] || short.split("/")[0] || null : null;
    branches.push({
      name: short,
      short,
      upstream: fields[2] || null,
      date: fields[3],
      subject: fields[4],
      current: fields[5] === "*",
      isRemote,
      remoteName,
      isDefault: !isRemote && defaultBranch !== null && short === defaultBranch
    });
  }
  return branches;
}
function pickRemote(raw, options = {}) {
  const remotes = /* @__PURE__ */ new Map();
  for (const line of String(raw ?? "").split("\n")) {
    const match = /^(\S+)\t(\S+)\s+\((fetch|push)\)$/.exec(line);
    if (match === null) continue;
    const name3 = match[1];
    if (!remotes.has(name3)) remotes.set(name3, match[2]);
  }
  if (remotes.size === 0) return void 0;
  const preferred = options.preferred?.trim();
  if (preferred !== void 0 && preferred.length > 0) {
    const url2 = remotes.get(preferred);
    if (url2 !== void 0) return { name: preferred, url: url2 };
  }
  const upstream = options.upstream;
  if (typeof upstream === "string" && upstream.includes("/")) {
    const name3 = upstream.slice(0, upstream.indexOf("/"));
    const url2 = remotes.get(name3);
    if (url2 !== void 0) return { name: name3, url: url2 };
  }
  const origin = remotes.get("origin");
  if (origin !== void 0) return { name: "origin", url: origin };
  const [name2, url] = remotes.entries().next().value;
  return { name: name2, url };
}
function summarizeChanges(files) {
  const totals = {
    files: files.length,
    additions: 0,
    deletions: 0,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    conflicted: 0
  };
  for (const file of files) {
    totals.additions += Number(file.additions) || 0;
    totals.deletions += Number(file.deletions) || 0;
    if (file.untracked === true) totals.untracked += 1;
    else if (file.conflicted === true) totals.conflicted += 1;
    if (file.staged === true) totals.staged += 1;
    if (file.unstaged === true) totals.unstaged += 1;
  }
  return totals;
}
function parseAheadBehind(raw) {
  const [ahead, behind] = String(raw ?? "").trim().split(/\s+/);
  return {
    ahead: Number.parseInt(ahead ?? "", 10) || 0,
    behind: Number.parseInt(behind ?? "", 10) || 0
  };
}
function parseDefaultBranch(raw, remote = "origin") {
  const text = String(raw ?? "").trim();
  const prefix = `refs/remotes/${remote}/`;
  if (text.startsWith(prefix) && text.length > prefix.length) return text.slice(prefix.length);
  return text.length > 0 && !text.includes("/") ? text : null;
}
var BRANCH_FALLBACK = "update";
function sanitizeBranchFragment(raw) {
  const normalized = String(raw ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/['"`]/g, "").replace(/^[./\s_-]+|[./\s_-]+$/g, "");
  const fragment = normalized.replace(/[^a-z0-9/_-]+/g, "-").replace(/\/+/g, "/").replace(/-+/g, "-").replace(/^[./_-]+|[./_-]+$/g, "").slice(0, 64).replace(/[./_-]+$/g, "");
  return fragment.length > 0 ? fragment : BRANCH_FALLBACK;
}
function sanitizeFeatureBranchName(raw) {
  const sanitized = sanitizeBranchFragment(raw);
  return sanitized.includes("/") ? sanitized : `feature/${sanitized}`;
}
function resolveAutoFeatureBranchName(existingBranchNames, preferredBranch) {
  const preferred = preferredBranch?.trim();
  const resolvedBase = sanitizeFeatureBranchName(
    preferred !== void 0 && preferred.length > 0 ? preferred : BRANCH_FALLBACK
  );
  const existingNames = existingBranchNames.map((refName) => refName.toLowerCase());
  const existingRefs = new Set(existingNames);
  const parts = resolvedBase.split("/");
  let resolved = "";
  for (const [index, part] of parts.entries()) {
    const base = resolved ? `${resolved}/${part}` : part;
    let candidate = base;
    let suffix = 2;
    while (existingRefs.has(candidate) || index === parts.length - 1 && existingNames.some((refName) => refName.startsWith(`${candidate}/`))) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    resolved = candidate;
  }
  return resolved;
}

// src/lib/git-run.ts
var TERMINATE_GRACE_MS = 2e3;
var STDERR_BYTES = 16384;
var SNIFF_BYTES = 8e3;
var OUTPUT_POLL_MS = 150;
var GIT_ENV = Object.freeze({
  GIT_TERMINAL_PROMPT: "0",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_PAGER: "cat",
  LC_ALL: "C"
});
var CommandError = class extends Error {
  /** Stable failure code, such as `git/not-a-repository`. */
  code;
  /** Machine-readable extras for the panel. */
  details;
  constructor(code, message2, details = {}) {
    super(message2);
    this.name = "CommandError";
    this.code = code;
    this.details = details;
  }
};
function createCommandRunner(options) {
  const { ctx, logger } = options;
  const timeoutMs = options.timeoutMs ?? 15e3;
  const subprocess = ctx.get("subprocess");
  const resolved = /* @__PURE__ */ new Map();
  async function resolveExecutable(program) {
    const cached = resolved.get(program);
    if (cached !== void 0) return cached;
    let executable = program;
    if (subprocess !== void 0 && typeof subprocess.resolveExecutable === "function") {
      try {
        const found = await subprocess.resolveExecutable(program);
        if (typeof found === "string" && found.length > 0) executable = found;
      } catch (error) {
        throw new CommandError(
          "system/executable-missing",
          `${program} was not found on this computer: ${errorMessage(error)}`,
          { program }
        );
      }
    }
    resolved.set(program, executable);
    return executable;
  }
  async function run(program, args, runOptions = {}) {
    const executable = await resolveExecutable(program);
    const cwd = runOptions.cwd ?? process.cwd();
    const maxBytes = runOptions.maxBytes ?? 4 * 1024 * 1024;
    const env = { ...GIT_ENV, ...runOptions.env ?? {} };
    const limit = Math.max(1e3, Number(runOptions.timeoutMs) || timeoutMs);
    const deadline = AbortSignal.timeout(limit);
    const signal = runOptions.signal === void 0 ? deadline : AbortSignal.any([runOptions.signal, deadline]);
    const onLine = runOptions.onLine;
    if (subprocess !== void 0 && typeof subprocess.spawn === "function") {
      try {
        const handle = subprocess.spawn({
          argv: [executable, ...args],
          cwd,
          stdio: {
            stdin: runOptions.stdin === void 0 ? "ignore" : { data: runOptions.stdin },
            stdout: { maxBytes },
            stderr: { maxBytes: STDERR_BYTES }
          },
          graceMs: TERMINATE_GRACE_MS,
          signal,
          env
        });
        const offsets = { stdout: 0, stderr: 0 };
        const partial = { stdout: "", stderr: "" };
        const drain = () => {
          if (onLine === void 0) return;
          for (const stream of ["stdout", "stderr"]) {
            const collector = stream === "stdout" ? handle.collected?.stdout : handle.collected?.stderr;
            if (collector === void 0) continue;
            const chunk = collector.readFrom(offsets[stream]);
            offsets[stream] += (chunk.text ?? "").length;
            if (chunk.text === void 0 || chunk.text.length === 0) continue;
            const joined = partial[stream] + chunk.text;
            const lines = joined.split(/\r?\n/);
            partial[stream] = lines.pop() ?? "";
            for (const line of lines) {
              if (line.length > 0) onLine(stream, line);
            }
          }
        };
        const timer = onLine === void 0 ? void 0 : setInterval(drain, OUTPUT_POLL_MS);
        let outcome;
        try {
          outcome = await handle.done;
        } finally {
          if (timer !== void 0) clearInterval(timer);
          drain();
          if (onLine !== void 0) {
            for (const stream of ["stdout", "stderr"]) {
              if (partial[stream].length > 0) onLine(stream, partial[stream]);
              partial[stream] = "";
            }
          }
        }
        const stdout = handle.collected?.stdout?.readFrom(0) ?? { text: "", lossy: false };
        const stderr = handle.collected?.stderr?.readFrom(0)?.text ?? "";
        if (deadline.aborted && !runOptions.signal?.aborted) {
          throw new CommandError("system/timeout", `${program} did not answer within ${limit} ms`, { program });
        }
        return {
          code: typeof outcome?.exitCode === "number" ? outcome.exitCode : 1,
          stdout: stdout.text ?? "",
          stderr,
          truncated: stdout.lossy === true
        };
      } catch (error) {
        if (error instanceof CommandError) throw error;
        logger.warn("git: %s %s failed: %s", program, args[0] ?? "", errorMessage(error));
        throw new CommandError("system/exec-failed", `${program} could not run: ${errorMessage(error)}`, { program });
      }
    }
    return await new Promise((settle, rejectPromise) => {
      const child = execFile(
        executable,
        args,
        {
          cwd,
          env: { ...process.env, ...env },
          encoding: "utf8",
          maxBuffer: Math.max(64 * 1024, maxBytes),
          timeout: limit,
          windowsHide: true,
          ...runOptions.signal === void 0 ? {} : { signal: runOptions.signal }
        },
        (error, stdout, stderr) => {
          const code = error?.code;
          if (code === "ENOENT" || code === "EACCES") {
            rejectPromise(new CommandError(
              "system/executable-missing",
              `${program} was not found on this computer`,
              { program }
            ));
            return;
          }
          const truncated = code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
          const text = stdout ?? "";
          const err = stderr ?? "";
          if (onLine !== void 0) {
            for (const line of text.split(/\r?\n/)) if (line.length > 0) onLine("stdout", line);
            for (const line of err.split(/\r?\n/)) if (line.length > 0) onLine("stderr", line);
          }
          settle({
            code: truncated ? 0 : typeof code === "number" ? code : error ? 1 : 0,
            stdout: text,
            stderr: err,
            truncated
          });
        }
      );
      if (runOptions.stdin !== void 0 && child.stdin !== null) child.stdin.end(runOptions.stdin);
    });
  }
  return {
    run,
    backend: subprocess !== void 0 && typeof subprocess.spawn === "function" ? "subprocess" : "child_process"
  };
}
function classifyGitFailure(stderr) {
  const diagnostic = String(stderr ?? "").split(/\r?\n/).map((line) => line.trim()).filter((line) => /^(?:fatal|error):|^!\s|^\s+!\s/.test(line) || /Permission denied \((?:publickey|password|keyboard-interactive)\)|Permission denied, please try again|Host key verification failed/.test(line)).filter((line) => !line.startsWith("remote:")).join("\n").toLowerCase();
  if (diagnostic.length === 0) return null;
  if (diagnostic.includes("not a git repository")) return "not_a_repository";
  const table = [
    ["tag_would_be_clobbered", /would clobber existing tag/],
    ["branch_checked_out_in_worktree", /is already used by worktree at|is already checked out at/],
    ["branch_already_exists", /a branch named .+ already exists/],
    ["config_locked", /could not lock config file .+: file exists/],
    ["authentication_failed", /authentication failed|could not read username|could not read password|permission denied \((?:publickey|password|keyboard-interactive)\)|permission denied, please try again/],
    ["host_key_unverified", /host key verification failed/],
    ["remote_unreachable", /could not read from remote repository|does not appear to be a git repository|repository .+ not found/],
    ["path_already_exists", /fatal: '[^']+' already exists|destination path .+ already exists/],
    ["ref_not_found", /^fatal: (?:invalid reference: |not a valid object name|needed a single revision|bad revision |'.+' is not a commit)/m],
    ["push_rejected_by_remote", /^[ \t]*![ \t]+\[remote rejected\]/m],
    ["push_rejected_non_fast_forward", /\[rejected\].*\((?:non-fast-forward|fetch first)\)[\s\S]*error: failed to push some refs/]
  ];
  for (const [reason, pattern] of table) {
    if (pattern.test(diagnostic)) {
      if (reason === "ref_not_found" && /^error: .+(?:, not a commit|expected commit type)/m.test(diagnostic)) continue;
      return reason;
    }
  }
  return null;
}
function failureReasonMessage(reason) {
  switch (reason) {
    case "push_rejected_by_remote":
      return "The remote rejected the push. Push this branch from a terminal to see the server message.";
    case "push_rejected_non_fast_forward":
      return "The remote has commits this branch does not have. Pull or rebase, then push again.";
    case "config_locked":
      return "Another Git process kept the repository config locked. Wait for it to finish, then retry.";
    case "authentication_failed":
      return "Git could not authenticate with the remote. Sign in to the code host and retry.";
    case "host_key_unverified":
      return "The remote host key is not verified. Add it to your known hosts and retry.";
    case "remote_unreachable":
      return "Git could not reach the remote repository. Check the network and the remote URL.";
    case "branch_already_exists":
      return "A branch with that name already exists.";
    case "branch_checked_out_in_worktree":
      return "That branch is already checked out in another worktree.";
    case "not_a_repository":
      return "This folder is not a Git repository.";
    default:
      return null;
  }
}
async function readDefaultBranch(runner, options) {
  const { root, signal } = options;
  const candidates = [];
  if (options.remote !== void 0 && options.remote !== null && options.remote.length > 0) {
    candidates.push(`refs/remotes/${options.remote}/HEAD`);
  }
  candidates.push("refs/remotes/origin/HEAD");
  for (const ref of candidates) {
    const result = await runner.run("git", ["symbolic-ref", "--quiet", ref], { cwd: root, signal });
    if (result.code !== 0) continue;
    const remote = ref.split("/")[2] ?? "origin";
    const name2 = parseDefaultBranch(result.stdout, remote);
    if (name2 !== null) return { name: name2, comparisonRef: `${remote}/${name2}` };
  }
  const local = await runner.run("git", ["branch", "--list", "main", "master", "--format=%(refname:short)"], {
    cwd: root,
    signal
  });
  if (local.code === 0) {
    const name2 = String(local.stdout ?? "").split("\n").map((line) => line.trim()).find((line) => line.length > 0);
    if (name2 !== void 0) return { name: name2, comparisonRef: name2 };
  }
  return { name: null, comparisonRef: null };
}
async function readBranchChanges(runner, options) {
  const { root, branch, defaultBranch, signal } = options;
  if (branch === null || defaultBranch.name === null) return { aheadOfDefault: 0, branchChanges: null };
  if (branch === defaultBranch.name) return { aheadOfDefault: 0, branchChanges: null };
  const bases = [defaultBranch.comparisonRef, defaultBranch.name].filter(
    (value) => typeof value === "string" && value.length > 0
  );
  for (const base of bases) {
    const mergeBase = await runner.run("git", ["merge-base", base, "HEAD"], { cwd: root, signal });
    const sha = mergeBase.code === 0 ? String(mergeBase.stdout ?? "").trim() : "";
    if (sha.length === 0) continue;
    const [count, stats] = await Promise.all([
      runner.run("git", ["rev-list", "--count", `${sha}..HEAD`], { cwd: root, signal }),
      runner.run("git", ["diff", "--numstat", "-z", "-M", sha], { cwd: root, signal })
    ]);
    const ahead = count.code === 0 ? Number.parseInt(String(count.stdout ?? "").trim(), 10) || 0 : 0;
    let insertions = 0;
    let deletions = 0;
    if (stats.code === 0) {
      for (const entry of parseNumstatZ(stats.stdout)) {
        insertions += entry.additions;
        deletions += entry.deletions;
      }
    }
    return {
      aheadOfDefault: ahead,
      branchChanges: { baseRef: defaultBranch.name, insertions, deletions }
    };
  }
  return { aheadOfDefault: 0, branchChanges: null };
}
async function readOverview(runner, options) {
  const { root, config, signal } = options;
  const limit = Number(config.logLimit) || 20;
  const [status, remotes, stash, stagedStats, unstagedStats, log] = await Promise.all([
    runner.run("git", ["status", "--porcelain=v2", "--branch", "-z", "--untracked-files=all"], {
      cwd: root,
      signal,
      maxBytes: 8 * 1024 * 1024
    }),
    runner.run("git", ["remote", "-v"], { cwd: root, signal }),
    runner.run("git", ["stash", "list", "--format=%gd"], { cwd: root, signal }),
    runner.run("git", ["diff", "--cached", "--numstat", "-z", "-M"], { cwd: root, signal }),
    runner.run("git", ["diff", "--numstat", "-z", "-M"], { cwd: root, signal }),
    runner.run("git", [
      "log",
      "-n",
      String(limit),
      "--no-show-signature",
      "--date=iso-strict",
      "--format=%H%x1f%h%x1f%an%x1f%aI%x1f%D%x1f%s",
      "-z"
    ], { cwd: root, signal })
  ]);
  if (status.code !== 0) {
    throw new CommandError("git/failed", String(status.stderr ?? "").trim() || "git status failed");
  }
  const parsed = parsePorcelainV2(status.stdout);
  const staged = parseNumstatZ(stagedStats.code === 0 ? stagedStats.stdout : "");
  const unstaged = parseNumstatZ(unstagedStats.code === 0 ? unstagedStats.stdout : "");
  const numbered = mergeLineCounts(parsed.files, [...staged, ...unstaged]);
  const files = await attachUntrackedCounts(numbered, root, config);
  const remote = pickRemote(remotes.code === 0 ? remotes.stdout : "", {
    preferred: config.remote,
    upstream: parsed.branch.upstream
  });
  const forge = remote === void 0 ? void 0 : parseRemoteUrl(remote.url);
  const commits = log.code === 0 ? parseLog(log.stdout) : [];
  const defaultBranch = await readDefaultBranch(runner, {
    root,
    remote: remote?.name ?? null,
    signal
  });
  const isDefaultRef = parsed.branch.head !== null && (defaultBranch.name === null ? parsed.branch.head === "main" || parsed.branch.head === "master" : parsed.branch.head === defaultBranch.name);
  const relation = isDefaultRef ? { aheadOfDefault: 0, branchChanges: null } : await readBranchChanges(runner, {
    root,
    branch: parsed.branch.head,
    defaultBranch,
    signal
  });
  return {
    repo: {
      root,
      name: basename(root),
      branch: parsed.branch.head,
      detached: parsed.branch.detached,
      unborn: parsed.branch.unborn,
      oid: parsed.branch.oid,
      shortOid: typeof parsed.branch.oid === "string" ? parsed.branch.oid.slice(0, 8) : null,
      upstream: parsed.branch.upstream,
      ahead: parsed.branch.ahead,
      behind: parsed.branch.behind,
      hasUpstream: parsed.branch.upstream !== null,
      isDefaultRef,
      aheadOfDefault: relation.aheadOfDefault,
      defaultBranch: defaultBranch.name,
      remote: remote === void 0 ? null : {
        name: remote.name,
        url: remote.url,
        provider: forge?.provider ?? "other",
        host: forge?.host ?? null,
        owner: forge?.owner ?? null,
        repository: forge?.repository ?? null,
        slug: forge?.slug ?? null
      }
    },
    files,
    stats: summarizeChanges(files),
    commits,
    stash: stash.code === 0 ? parseLogLines(stash.stdout).length : 0,
    refreshMs: config.refreshMs,
    branchChanges: relation.branchChanges,
    aheadOfDefault: relation.aheadOfDefault
  };
}
async function readContext(runner, options) {
  const { root, config, signal } = options;
  const [remotes, head] = await Promise.all([
    runner.run("git", ["remote", "-v"], { cwd: root, signal }),
    runner.run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, signal })
  ]);
  const name2 = head.code === 0 ? String(head.stdout ?? "").trim() : "";
  const chosen = pickRemote(remotes.code === 0 ? remotes.stdout : "", { preferred: config.remote });
  const parsed = chosen === void 0 ? void 0 : parseRemoteUrl(chosen.url);
  return {
    branch: name2.length > 0 && name2 !== "HEAD" ? name2 : null,
    remote: chosen === void 0 ? null : {
      name: chosen.name,
      url: chosen.url,
      provider: parsed?.provider ?? "other",
      host: parsed?.host ?? null,
      owner: parsed?.owner ?? null,
      repository: parsed?.repository ?? null,
      slug: parsed?.slug ?? null
    }
  };
}
async function readFilePatch(runner, options) {
  const { root, config, signal } = options;
  const staged = options.staged === true;
  const untracked = options.untracked === true;
  const relativePath = normalizeRelativePath(root, options.path);
  const maxBytes = Number(config.maxDiffBytes) || 393216;
  if (untracked) {
    const preview = await readFilePreview(join(root, relativePath), Math.min(maxBytes, Number(config.maxUntrackedBytes) || 131072));
    return {
      path: relativePath,
      staged: false,
      untracked: true,
      binary: preview.binary,
      truncated: preview.truncated,
      tooLarge: preview.tooLarge === true,
      files: untrackedPatch(relativePath, preview.text, { binary: preview.binary, truncated: preview.truncated })
    };
  }
  const args = ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "--submodule=short", "--unified=3", "-M"];
  if (staged) args.push("--cached");
  args.push("--", relativePath);
  const result = await runner.run("git", args, {
    cwd: root,
    signal,
    env: { GIT_LITERAL_PATHSPECS: "1" },
    maxBytes
  });
  if (result.code !== 0) {
    throw new CommandError("git/failed", String(result.stderr ?? "").trim() || "git diff failed", { path: relativePath });
  }
  const files = parsePatch(result.stdout);
  return {
    path: relativePath,
    staged,
    untracked: false,
    binary: files.some((file) => file.binary === true),
    truncated: result.truncated === true,
    files
  };
}
async function readDiffBundle(runner, options) {
  const { root, config, signal } = options;
  const maxBytes = Number(config.maxDiffBytes) || 393216;
  let baseRef = null;
  let patchResult;
  if (options.scope === "branch") {
    const defaultBranch = await readDefaultBranch(runner, { root, remote: config.remote, signal });
    baseRef = defaultBranch.name;
    const bases = [defaultBranch.comparisonRef, defaultBranch.name].filter(
      (value) => typeof value === "string" && value.length > 0
    );
    let mergeBase = "";
    for (const base of bases) {
      const result = await runner.run("git", ["merge-base", base, "HEAD"], { cwd: root, signal });
      const sha = result.code === 0 ? String(result.stdout ?? "").trim() : "";
      if (sha.length > 0) {
        mergeBase = sha;
        break;
      }
    }
    if (mergeBase.length === 0) {
      throw new CommandError("diff/no-base", "Cannot compare this branch with its default branch");
    }
    patchResult = await runner.run("git", [
      "diff",
      "--no-color",
      "--no-ext-diff",
      "--no-textconv",
      "--submodule=short",
      "--unified=3",
      "-M",
      mergeBase
    ], { cwd: root, signal, maxBytes });
  } else {
    const head = await runner.run("git", ["rev-parse", "--verify", "--quiet", "HEAD"], { cwd: root, signal });
    const args = ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "--submodule=short", "--unified=3", "-M"];
    if (head.code === 0) {
      args.push("HEAD");
    }
    patchResult = await runner.run("git", args, { cwd: root, signal, maxBytes });
    if (head.code !== 0) {
      const [cached, worktree] = await Promise.all([
        runner.run("git", ["diff", "--cached", "--no-color", "--no-ext-diff", "--no-textconv", "--unified=3", "-M"], {
          cwd: root,
          signal,
          maxBytes
        }),
        runner.run("git", ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "--unified=3", "-M"], {
          cwd: root,
          signal,
          maxBytes
        })
      ]);
      patchResult = {
        code: cached.code === 0 ? 0 : cached.code,
        stdout: `${cached.stdout ?? ""}${worktree.stdout ?? ""}`,
        stderr: `${cached.stderr ?? ""}${worktree.stderr ?? ""}`,
        truncated: cached.truncated === true || worktree.truncated === true
      };
    }
  }
  if (patchResult.code !== 0) {
    throw new CommandError(
      "git/failed",
      String(patchResult.stderr ?? "").trim() || "git diff failed"
    );
  }
  const files = parsePatch(patchResult.stdout).filter((file) => file.path !== null).map((file) => ({
    path: file.path ?? "",
    staged: false,
    untracked: false,
    binary: file.binary,
    truncated: patchResult.truncated === true,
    files: [file]
  }));
  let truncated = patchResult.truncated === true;
  let totalFiles = files.length;
  if (options.includeUntracked !== false) {
    const untracked = await runner.run("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
      cwd: root,
      signal
    });
    const paths = untracked.code === 0 ? nulFields(untracked.stdout).slice(0, Math.max(0, Number(config.maxUntrackedFiles) || 0)) : [];
    totalFiles += untracked.code === 0 ? nulFields(untracked.stdout).length : 0;
    if (untracked.code === 0 && nulFields(untracked.stdout).length > paths.length) truncated = true;
    for (const path of paths) {
      try {
        const preview = await readFilePreview(join(root, path), Math.min(maxBytes, Number(config.maxUntrackedBytes) || 131072));
        files.push({
          path,
          staged: false,
          untracked: true,
          binary: preview.binary,
          truncated: preview.truncated,
          tooLarge: preview.tooLarge === true,
          files: untrackedPatch(path, preview.text, { binary: preview.binary, truncated: preview.truncated })
        });
      } catch {
      }
    }
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { scope: options.scope, baseRef, files, truncated, totalFiles };
}
async function readCommit(runner, options) {
  const { root, config, signal } = options;
  const revision = String(options.hash ?? "").trim();
  if (!/^[0-9a-fA-F]{4,64}$/.test(revision)) {
    throw new CommandError("input/invalid", "Invalid commit hash", { hash: revision });
  }
  const maxBytes = Number(config.maxDiffBytes) || 393216;
  const [meta, stats, patch] = await Promise.all([
    runner.run("git", ["show", "-s", "--no-show-signature", "--date=iso-strict", "--format=%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%b", revision], { cwd: root, signal }),
    runner.run("git", ["show", "--numstat", "-z", "-M", "--format=", revision], { cwd: root, signal }),
    runner.run("git", ["show", "--no-color", "--no-ext-diff", "--no-textconv", "--format=", "--unified=3", "-M", revision], {
      cwd: root,
      signal,
      maxBytes
    })
  ]);
  if (meta.code !== 0) {
    throw new CommandError("git/unknown-commit", String(meta.stderr ?? "").trim() || `Cannot read commit ${revision}`);
  }
  const fields = String(meta.stdout ?? "").trim().split("");
  const files = parseNumstatZ(stats.code === 0 ? stats.stdout : "").map((entry) => ({
    path: entry.path,
    origPath: entry.origPath,
    additions: entry.additions,
    deletions: entry.deletions,
    binary: entry.binary
  }));
  return {
    commit: {
      hash: fields[0] ?? revision,
      short: fields[1] ?? revision.slice(0, 8),
      author: fields[2] ?? "",
      email: fields[3] ?? "",
      date: fields[4] ?? "",
      subject: fields[5] ?? "",
      body: fields.slice(6).join("").trim()
    },
    files,
    patches: parsePatch(patch.code === 0 ? patch.stdout : ""),
    truncated: patch.truncated === true
  };
}
async function readBranchRefs(runner, options) {
  const { root, signal } = options;
  const limit = Math.min(200, Math.max(1, options.limit ?? 120));
  if (options.refresh === true) {
    const remote = options.remote !== void 0 && options.remote !== null && options.remote.length > 0 ? options.remote : void 0;
    await runner.run("git", remote === void 0 ? ["fetch", "--prune", "--no-tags"] : ["fetch", "--prune", "--no-tags", remote], {
      cwd: root,
      signal,
      timeoutMs: options.timeoutMs ?? 3e4,
      maxBytes: 256 * 1024
    }).catch(() => void 0);
  }
  const result = await runner.run("git", [
    "for-each-ref",
    `--count=${limit}`,
    "--sort=-committerdate",
    "--format=%(refname)%1f%(refname:short)%1f%(upstream:short)%1f%(committerdate:iso-strict)%1f%(contents:subject)%1f%(HEAD)%1f%(refname:strip=2)",
    "refs/heads",
    "refs/remotes"
  ], { cwd: root, signal });
  if (result.code !== 0) {
    throw new CommandError("git/failed", String(result.stderr ?? "").trim() || "git for-each-ref failed");
  }
  const defaultBranch = options.defaultBranch !== void 0 && options.defaultBranch !== null ? options.defaultBranch : (await readDefaultBranch(runner, { root, remote: options.remote ?? null, signal })).name;
  const branches = parseBranchRefs(result.stdout, defaultBranch).filter(
    (branch) => !branch.isRemote || !branch.name.endsWith("/HEAD")
  );
  return { branches, defaultBranch };
}
async function readLog(runner, options) {
  const { root, signal } = options;
  const limit = options.limit ?? 50;
  const result = await runner.run("git", [
    "log",
    "-n",
    String(limit),
    "--no-show-signature",
    "--date=iso-strict",
    "--format=%H%x1f%h%x1f%an%x1f%aI%x1f%D%x1f%s",
    "-z"
  ], { cwd: root, signal });
  if (result.code !== 0) {
    if (/(does not have any commits yet|bad default revision)/i.test(String(result.stderr ?? ""))) return [];
    throw new CommandError("git/failed", String(result.stderr ?? "").trim() || "git log failed");
  }
  return parseLog(result.stdout);
}
async function attachUntrackedCounts(files, root, config) {
  const budget = Math.max(0, Number(config.maxUntrackedFiles) || 0);
  const maxBytes = Number(config.maxUntrackedBytes) || 131072;
  const untracked = files.filter((file) => file.untracked === true).slice(0, budget);
  await Promise.all(untracked.map(async (file) => {
    try {
      const preview = await readFilePreview(join(root, file.path), maxBytes);
      file.additions = preview.binary ? 0 : countLines(preview.text);
      file.binary = preview.binary;
      file.tooLarge = preview.tooLarge === true;
    } catch {
    }
  }));
  return files;
}
async function readFilePreview(file, maxBytes) {
  const info = await stat(file);
  if (!info.isFile()) return { text: "", truncated: false, binary: true, tooLarge: false, size: 0 };
  const tooLarge = info.size > maxBytes;
  const length = Math.max(0, Math.min(info.size, maxBytes));
  const handle = await open(file, "r");
  try {
    const buffer = Buffer.alloc(length);
    let read = 0;
    while (read < length) {
      const chunk = await handle.read(buffer, read, length - read, read);
      if (chunk.bytesRead <= 0) break;
      read += chunk.bytesRead;
    }
    const bytes = buffer.subarray(0, read);
    const sniff = bytes.subarray(0, Math.min(SNIFF_BYTES, bytes.length));
    if (sniff.includes(0)) return { text: "", truncated: tooLarge, binary: true, tooLarge, size: info.size };
    return {
      text: bytes.toString("utf8"),
      truncated: tooLarge,
      binary: false,
      tooLarge,
      size: info.size
    };
  } finally {
    await handle.close();
  }
}
function countLines(text) {
  if (text.length === 0) return 0;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.length;
}
function normalizeRelativePath(root, path) {
  const text = String(path ?? "").trim();
  if (text.length === 0 || text.includes("\0") || isAbsolute(text)) {
    throw new CommandError("input/invalid", "Invalid file path", { path: text });
  }
  const normalized = text.split(sep).join("/").replace(/^\.\//, "");
  const target = resolve(root, normalized);
  const inside = relative(root, target);
  if (inside.startsWith("..") || isAbsolute(inside)) {
    throw new CommandError("input/invalid", "File path is outside the repository", { path: text });
  }
  return normalized;
}
function parseLogLines(raw) {
  return String(raw ?? "").split("\n").filter((line) => line.length > 0);
}
function basename(path) {
  const normalized = String(path).replace(/[\\/]+$/, "");
  const index = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  return index < 0 ? normalized : normalized.slice(index + 1);
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function firstLine(text) {
  return String(text ?? "").split("\n").map((line) => line.trim()).find((line) => line.length > 0) ?? "";
}
function literal(path) {
  return path;
}
function throwWriteFailure(operation, result, details = {}) {
  const reason = classifyGitFailure(result.stderr);
  const friendly = failureReasonMessage(reason);
  const detail = friendly ?? (firstLine(result.stderr) || `git exited with status ${result.code}`);
  throw new CommandError(`git/${operation}`, detail, {
    ...details,
    reason: reason ?? void 0,
    exitCode: result.code
  });
}
async function pushCurrentBranch(runner, options) {
  const { root, branch, signal, timeoutMs, onLine } = options;
  const upstreamRead = await runner.run("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], {
    cwd: root,
    signal
  });
  const upstream = upstreamRead.code === 0 ? String(upstreamRead.stdout ?? "").trim() : "";
  if (upstream.length > 0) {
    const divergence = await runner.run("git", ["rev-list", "--left-right", "--count", `HEAD...@{upstream}`], {
      cwd: root,
      signal
    });
    const counts = divergence.code === 0 ? parseAheadBehind(divergence.stdout) : { ahead: 1, behind: 0 };
    if (counts.ahead === 0 && counts.behind === 0) {
      return { status: "skipped_up_to_date", branch, upstream, setUpstream: false };
    }
    const remoteName = upstream.split("/")[0] ?? "origin";
    const upstreamBranch = upstream.slice(remoteName.length + 1);
    const result2 = await runner.run("git", ["push", remoteName, `HEAD:refs/heads/${upstreamBranch}`], {
      cwd: root,
      signal,
      timeoutMs,
      maxBytes: 1024 * 1024,
      onLine
    });
    if (result2.code !== 0) throwWriteFailure("push", result2, { branch, upstream });
    return { status: "pushed", branch, upstream, setUpstream: false };
  }
  const remote = typeof options.remote === "string" && options.remote.length > 0 ? options.remote : "origin";
  const result = await runner.run("git", ["push", "--set-upstream", remote, `HEAD:refs/heads/${branch}`], {
    cwd: root,
    signal,
    timeoutMs,
    maxBytes: 1024 * 1024,
    onLine
  });
  if (result.code !== 0) throwWriteFailure("push", result, { branch, remote });
  return { status: "pushed", branch, upstream: `${remote}/${branch}`, setUpstream: true };
}
async function pullCurrentBranch(runner, options) {
  const { root, branch, signal, timeoutMs, onLine } = options;
  const args = options.rebase === true ? ["pull", "--rebase"] : ["pull", "--ff-only"];
  const result = await runner.run("git", args, {
    cwd: root,
    signal,
    timeoutMs: timeoutMs ?? 18e4,
    maxBytes: 1024 * 1024,
    onLine
  });
  if (result.code !== 0) throwWriteFailure("pull", result, { branch });
  const text = `${result.stdout}
${result.stderr}`;
  const upToDate = /Already up to date\./i.test(text);
  return { status: upToDate ? "skipped_up_to_date" : "pulled", branch };
}
async function stagePaths(runner, options) {
  const { root, paths, signal } = options;
  if (paths.length === 0) return [];
  const result = await runner.run("git", ["add", "-A", "--", ...paths.map(literal)], {
    cwd: root,
    signal,
    env: { GIT_LITERAL_PATHSPECS: "1" },
    maxBytes: 256 * 1024
  });
  if (result.code !== 0) throwWriteFailure("stage", result, { paths });
  return paths;
}
async function unstagePaths(runner, options) {
  const { root, paths, signal } = options;
  if (paths.length === 0) return [];
  const result = await runner.run("git", ["restore", "--staged", "--", ...paths.map(literal)], {
    cwd: root,
    signal,
    env: { GIT_LITERAL_PATHSPECS: "1" },
    maxBytes: 256 * 1024
  });
  if (result.code === 0) return paths;
  const fallback = await runner.run("git", ["rm", "--cached", "-r", "-q", "--", ...paths.map(literal)], {
    cwd: root,
    signal,
    env: { GIT_LITERAL_PATHSPECS: "1" },
    maxBytes: 256 * 1024
  });
  if (fallback.code !== 0) throwWriteFailure("unstage", fallback, { paths });
  return paths;
}
async function discardPaths(runner, options) {
  const { root, paths, signal } = options;
  if (paths.length === 0) return [];
  const tracked = await runner.run("git", ["restore", "--worktree", "--", ...paths.map(literal)], {
    cwd: root,
    signal,
    env: { GIT_LITERAL_PATHSPECS: "1" },
    maxBytes: 256 * 1024
  });
  if (tracked.code !== 0) {
    const dropped = await runner.run("git", ["rm", "--cached", "-r", "-q", "--", ...paths.map(literal)], {
      cwd: root,
      signal,
      env: { GIT_LITERAL_PATHSPECS: "1" },
      maxBytes: 256 * 1024
    });
    if (dropped.code !== 0 && options.includeUntracked !== true) throwWriteFailure("discard", tracked, { paths });
  }
  if (options.includeUntracked === true) {
    const cleaned = await runner.run("git", ["clean", "-f", "-d", "--", ...paths.map(literal)], {
      cwd: root,
      signal,
      env: { GIT_LITERAL_PATHSPECS: "1" },
      maxBytes: 256 * 1024
    });
    if (cleaned.code !== 0) throwWriteFailure("discard", cleaned, { paths });
  }
  return paths;
}
async function commitChanges(runner, options) {
  const { root, signal, onLine } = options;
  const message2 = String(options.message ?? "").trim();
  if (message2.length === 0) throw new CommandError("commit/empty-message", "A commit message is required");
  const paths = (options.paths ?? []).filter((path) => typeof path === "string" && path.length > 0);
  if (paths.length > 0) {
    const mergeHead = await runner.run("git", ["rev-parse", "--verify", "--quiet", "MERGE_HEAD"], { cwd: root, signal });
    if (mergeHead.code === 0) {
      throw new CommandError(
        "commit/merge-in-progress",
        "A merge is in progress. Commit every file to finish the merge."
      );
    }
    await runner.run("git", ["reset", "-q"], { cwd: root, signal }).catch(() => void 0);
    const added = await runner.run("git", ["add", "-A", "--", ...paths.map(literal)], {
      cwd: root,
      signal,
      env: { GIT_LITERAL_PATHSPECS: "1" }
    });
    if (added.code !== 0) throwWriteFailure("stage", added, { paths });
  } else {
    const added = await runner.run("git", ["add", "-A"], { cwd: root, signal });
    if (added.code !== 0) throwWriteFailure("stage", added);
  }
  const [subjectLine, ...rest] = message2.split(/\r?\n/);
  const body = rest.join("\n").trim();
  const args = ["commit", "-m", subjectLine];
  if (body.length > 0) args.push("-m", body);
  if (options.amend === true) args.push("--amend");
  const result = await runner.run("git", args, {
    cwd: root,
    signal,
    timeoutMs: options.timeoutMs ?? 6e5,
    maxBytes: 16 * 1024 * 1024,
    env: { GIT_EDITOR: "true" },
    onLine
  });
  const combined = `${result.stdout}
${result.stderr}`;
  if (/nothing to commit|no changes added to commit|nothing added to commit/i.test(combined)) {
    return { status: "skipped_no_changes", sha: "", subject: subjectLine, branch: null };
  }
  if (result.code !== 0) throwWriteFailure("commit", result, { message: message2 });
  const head = await runner.run("git", ["rev-parse", "HEAD"], { cwd: root, signal });
  const branchRead = await runner.run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, signal });
  const branch = branchRead.code === 0 ? String(branchRead.stdout ?? "").trim() : null;
  return {
    status: "created",
    sha: head.code === 0 ? String(head.stdout ?? "").trim() : "",
    subject: subjectLine,
    branch: branch !== null && branch !== "HEAD" ? branch : null
  };
}
async function switchBranch(runner, options) {
  const { root, signal } = options;
  const name2 = String(options.name ?? "").trim();
  if (name2.length === 0) throw new CommandError("input/invalid", "A branch name is required");
  const local = await runner.run("git", ["show-ref", "--verify", "--quiet", `refs/heads/${name2}`], { cwd: root, signal });
  let args;
  if (local.code === 0) {
    args = ["switch", name2];
  } else {
    const remoteRef = await runner.run("git", ["show-ref", "--verify", "--quiet", `refs/remotes/${name2}`], { cwd: root, signal });
    if (remoteRef.code !== 0) throw new CommandError("branch/unknown", `There is no branch named ${name2}`, { name: name2 });
    const localName = name2.includes("/") ? name2.slice(name2.indexOf("/") + 1) : name2;
    args = ["switch", "-c", localName, "--track", name2];
  }
  const result = await runner.run("git", args, { cwd: root, signal, maxBytes: 256 * 1024 });
  if (result.code !== 0) throwWriteFailure("switch", result, { name: name2 });
  const head = await runner.run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, signal });
  const branch = head.code === 0 ? String(head.stdout ?? "").trim() : null;
  return { branch: branch !== null && branch !== "HEAD" ? branch : null };
}
async function createBranch(runner, options) {
  const { root, signal } = options;
  const name2 = String(options.name ?? "").trim();
  if (name2.length === 0) throw new CommandError("input/invalid", "A branch name is required");
  const args = ["switch", "-c", name2];
  if (typeof options.from === "string" && options.from.trim().length > 0) args.push(options.from.trim());
  const result = await runner.run("git", args, { cwd: root, signal, maxBytes: 256 * 1024 });
  if (result.code !== 0) throwWriteFailure("branch-create", result, { name: name2 });
  return { branch: name2 };
}
async function readCommitMessageFacts(runner, options) {
  const { root, config, signal } = options;
  const paths = (options.paths ?? []).filter((path) => typeof path === "string" && path.length > 0);
  const scoped = paths.length > 0;
  const maxBytes = Math.min(Number(config.maxDiffBytes) || 393216, 2e5);
  const pathspecs = scoped ? ["--", ...paths.map(literal)] : [];
  const diffArgs = scoped ? ["diff", "HEAD"] : ["diff", "--cached"];
  const [branchRead, stats, patch, style] = await Promise.all([
    runner.run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, signal }),
    runner.run("git", [...diffArgs, "--numstat", "-z", "-M", ...pathspecs], {
      cwd: root,
      signal,
      env: { GIT_LITERAL_PATHSPECS: "1" }
    }),
    runner.run("git", [...diffArgs, "--no-color", "--no-ext-diff", "--no-textconv", "--submodule=short", "--unified=3", "-M", ...pathspecs], {
      cwd: root,
      signal,
      env: { GIT_LITERAL_PATHSPECS: "1" },
      maxBytes
    }),
    runner.run("git", ["log", "-n", String(Math.max(0, config.commit.styleLimit) || 0), "--format=%s"], {
      cwd: root,
      signal
    })
  ]);
  const branch = branchRead.code === 0 ? String(branchRead.stdout ?? "").trim() : "";
  return {
    branch: branch.length > 0 && branch !== "HEAD" ? branch : "",
    files: parseNumstatZ(stats.code === 0 ? stats.stdout : "").map((entry) => ({
      path: entry.path,
      additions: entry.additions,
      deletions: entry.deletions
    })),
    recentSubjects: style.code === 0 ? String(style.stdout ?? "").split("\n").map((line) => line.trim()).filter((line) => line.length > 0) : [],
    diff: String(patch.stdout ?? ""),
    truncated: patch.truncated === true
  };
}
async function readChangeRequestFacts(runner, options) {
  const { root, base, config, signal } = options;
  const range = `${base}...HEAD`;
  const limit = Number(config.pull?.commitLimit) || 40;
  const maxBytes = Number(config.pull?.contextBytes) || 6e4;
  const [count, log, stats, patch] = await Promise.all([
    runner.run("git", ["rev-list", "--count", range], { cwd: root, signal }),
    runner.run("git", [
      "log",
      "-n",
      String(limit),
      "--no-show-signature",
      "--format=%an%x1f%aI%x1f%s",
      range
    ], { cwd: root, signal }),
    runner.run("git", ["diff", "--numstat", "-z", "-M", range], { cwd: root, signal }),
    runner.run("git", ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "--submodule=short", "-M", range], {
      cwd: root,
      signal,
      maxBytes
    })
  ]);
  if (count.code !== 0) {
    throw new CommandError("pr/unknown-base", String(count.stderr ?? "").trim() || `Cannot compare with ${base}`, { base });
  }
  const commits = [];
  for (const entry of String(log.stdout ?? "").split("\n")) {
    if (entry.length === 0) continue;
    const fields = entry.split("");
    if (fields.length < 3) continue;
    commits.push({ author: fields[0], date: fields[1], subject: fields.slice(2).join("") });
  }
  return {
    base,
    ahead: Number.parseInt(String(count.stdout ?? "").trim(), 10) || 0,
    commits,
    files: parseNumstatZ(stats.code === 0 ? stats.stdout : "").map((entry) => ({
      path: entry.path,
      additions: entry.additions,
      deletions: entry.deletions
    })),
    diff: String(patch.stdout ?? ""),
    truncated: patch.truncated === true
  };
}
async function locateRepository(runner, cwd, signal) {
  const result = await runner.run("git", ["rev-parse", "--show-toplevel"], { cwd, signal });
  if (result.code !== 0) {
    const stderr = String(result.stderr ?? "");
    if (/not a git repository/i.test(stderr)) return null;
    if (/cannot change to|does not exist|not a directory|No such file/i.test(stderr)) {
      throw new CommandError("git/no-directory", `Cannot open the folder ${cwd}`, { cwd });
    }
    throw new CommandError("git/failed", stderr.trim() || `git rev-parse failed (status ${result.code})`);
  }
  const root = String(result.stdout ?? "").trim().split("\n")[0];
  if (root.length === 0) return null;
  return resolve(cwd, root);
}

// src/lib/worktree.ts
import { mkdir, readFile, stat as stat2, writeFile } from "node:fs/promises";
import { dirname, isAbsolute as isAbsolute2, join as join2, relative as relative2, resolve as resolve2, sep as sep2 } from "node:path";
var POOL_IGNORE = ".gitignore";
var BRANCH_NAME = /^(?![-/.])(?!.*\.\.)(?!.*[/.]$)[A-Za-z0-9._/-]+$/;
function generatedWorktreeName(sessionId, prefix = "dsh") {
  const text = String(sessionId ?? "");
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.exec(text)?.[0];
  const head = uuid === void 0 ? randomHex(8) : uuid.slice(0, 8).toLowerCase();
  const tail = randomHex(4);
  const cleaned = String(prefix ?? "").trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  return cleaned.length > 0 ? `${cleaned}-${head}-${tail}` : `${head}-${tail}`;
}
function randomHex(length) {
  let text = "";
  while (text.length < length) text += Math.floor(Math.random() * 16).toString(16);
  return text.slice(0, length);
}
function poolDirectory(repoRoot, config) {
  const configured = String(config?.directory ?? ".agents/worktrees").trim() || ".agents/worktrees";
  return isAbsolute2(configured) ? configured : join2(repoRoot, configured.split("/").join(sep2));
}
function isInside(parent, child) {
  const from = resolve2(parent);
  const to = resolve2(child);
  if (from === to) return true;
  const path = relative2(from, to);
  return path.length > 0 && !path.startsWith("..") && !isAbsolute2(path);
}
function worktreePath(repoRoot, config, name2) {
  if (!BRANCH_NAME.test(String(name2 ?? ""))) {
    throw new CommandError("worktree/invalid-name", `T\xEAn worktree kh\xF4ng h\u1EE3p l\u1EC7: ${String(name2)}`, { name: name2 });
  }
  const path = join2(poolDirectory(repoRoot, config), name2);
  if (!isInside(poolDirectory(repoRoot, config), path) || resolve2(path) === resolve2(poolDirectory(repoRoot, config))) {
    throw new CommandError("worktree/invalid-name", "\u0110\u01B0\u1EDDng d\u1EABn worktree n\u1EB1m ngo\xE0i th\u01B0 m\u1EE5c worktree", { name: name2 });
  }
  return path;
}
function parseWorktreeList(raw) {
  const entries = [];
  let current;
  for (const line of String(raw ?? "").split("\n")) {
    if (line.startsWith("worktree ")) {
      current = {
        path: line.slice("worktree ".length),
        head: null,
        branch: null,
        bare: false,
        detached: false,
        locked: false,
        prunable: false
      };
      entries.push(current);
      continue;
    }
    if (current === void 0) continue;
    if (line.startsWith("HEAD ")) current.head = line.slice("HEAD ".length).trim() || null;
    else if (line.startsWith("branch ")) current.branch = line.slice("branch ".length).trim().replace(/^refs\/heads\//, "") || null;
    else if (line === "bare") current.bare = true;
    else if (line === "detached") current.detached = true;
    else if (line === "locked" || line.startsWith("locked ")) current.locked = true;
    else if (line === "prunable" || line.startsWith("prunable ")) current.prunable = true;
  }
  return entries;
}
async function readWorktrees(runner, { root, signal }) {
  const result = await runner.run("git", ["worktree", "list", "--porcelain"], { cwd: root, signal });
  if (result.code !== 0) {
    throw new CommandError("git/failed", String(result.stderr ?? "").trim() || "git worktree list th\u1EA5t b\u1EA1i");
  }
  return parseWorktreeList(result.stdout);
}
async function readBases(runner, { root, remote = "", limit = 40, signal }) {
  const [heads, remotes, head] = await Promise.all([
    runner.run("git", [
      "for-each-ref",
      `--count=${limit}`,
      "--sort=-committerdate",
      "--format=%(refname:short)%1f%(objectname:short)%1f%(committerdate:iso-strict)%1f%(contents:subject)%1f%(HEAD)",
      "refs/heads"
    ], { cwd: root, signal }),
    runner.run("git", [
      "for-each-ref",
      `--count=${limit * 2}`,
      "--sort=-committerdate",
      "--format=%(refname:short)%1f%(objectname:short)%1f%(committerdate:iso-strict)",
      "refs/remotes"
    ], { cwd: root, signal }),
    runner.run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, signal })
  ]);
  const local = parseLocalBases(heads.code === 0 ? heads.stdout : "");
  const remoteBranches = parseRemoteBases(remotes.code === 0 ? remotes.stdout : "").filter((branch) => remote.length === 0 || branch.remote === remote);
  const current = head.code === 0 ? head.stdout.trim() : "";
  return {
    local,
    remote: remoteBranches,
    defaultBase: await resolveDefaultBase(runner, { root, remote, signal }),
    current: current.length > 0 && current !== "HEAD" ? current : null
  };
}
function parseLocalBases(raw) {
  const branches = [];
  for (const line of String(raw ?? "").split("\n")) {
    if (line.length === 0) continue;
    const fields = line.split("");
    if (fields.length < 4) continue;
    branches.push({
      name: fields[0],
      short: fields[1],
      date: fields[2],
      subject: fields[3],
      current: fields[4] === "*",
      remote: null
    });
  }
  return branches;
}
function parseRemoteBases(raw) {
  const branches = [];
  for (const line of String(raw ?? "").split("\n")) {
    if (line.length === 0) continue;
    const fields = line.split("");
    if (fields.length < 2) continue;
    const name2 = fields[0];
    if (name2.endsWith("/HEAD")) continue;
    const slash = name2.indexOf("/");
    if (slash <= 0) continue;
    branches.push({
      name: name2,
      remote: name2.slice(0, slash),
      branch: name2.slice(slash + 1),
      short: fields[1],
      date: fields[2] ?? ""
    });
  }
  return branches;
}
async function resolveDefaultBase(runner, { root, remote = "", signal }) {
  const names = await remoteNames(runner, { root, signal });
  const preferred = remote.length > 0 ? [remote] : names;
  for (const name2 of preferred) {
    const symbolic = await runner.run("git", ["symbolic-ref", "--quiet", `refs/remotes/${name2}/HEAD`], { cwd: root, signal });
    const text = symbolic.code === 0 ? symbolic.stdout.trim().replace(`refs/remotes/${name2}/`, "") : "";
    if (text.length > 0) return text;
  }
  for (const name2 of preferred) {
    for (const candidate of ["main", "master"]) {
      const found = await runner.run("git", ["rev-parse", "--verify", "--quiet", `refs/remotes/${name2}/${candidate}`], { cwd: root, signal });
      if (found.code === 0) return candidate;
    }
  }
  for (const candidate of ["main", "master"]) {
    const found = await runner.run("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${candidate}`], { cwd: root, signal });
    if (found.code === 0) return candidate;
  }
  const head = await runner.run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, signal });
  const branch = head.code === 0 ? head.stdout.trim() : "";
  return branch.length > 0 && branch !== "HEAD" ? branch : null;
}
async function remoteNames(runner, { root, signal }) {
  const result = await runner.run("git", ["remote"], { cwd: root, signal });
  if (result.code !== 0) return [];
  return String(result.stdout ?? "").split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
}
async function fetchRemoteBranch(runner, { root, remote, branch, timeoutMs, signal }) {
  if (!BRANCH_NAME.test(String(branch ?? ""))) {
    throw new CommandError("worktree/invalid-branch", `T\xEAn nh\xE1nh kh\xF4ng h\u1EE3p l\u1EC7: ${String(branch)}`, { branch });
  }
  const result = await runner.run("git", ["fetch", "--prune", remote, `+refs/heads/${branch}:refs/remotes/${remote}/${branch}`], {
    cwd: root,
    signal,
    timeoutMs,
    maxBytes: 1024 * 1024
  });
  if (result.code !== 0) {
    throw new CommandError(
      "worktree/fetch-failed",
      `Kh\xF4ng l\u1EA5y \u0111\u01B0\u1EE3c nh\xE1nh ${branch} t\u1EEB ${remote}: ${firstLine2(result.stderr) || `m\xE3 ${result.code}`}`,
      { remote, branch, detail: String(result.stderr ?? "").slice(0, 2e3) }
    );
  }
  return `refs/remotes/${remote}/${branch}`;
}
async function branchIsTaken(runner, { root, branch, signal }) {
  const result = await runner.run("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], { cwd: root, signal });
  return result.code === 0;
}
async function renameWorktreeBranch(runner, { path, branch, signal }) {
  if (!BRANCH_NAME.test(String(branch ?? ""))) {
    throw new CommandError("worktree/invalid-name", `T\xEAn nh\xE1nh kh\xF4ng h\u1EE3p l\u1EC7: ${String(branch)}`, { branch });
  }
  const result = await runner.run("git", ["branch", "-m", branch], { cwd: path, signal });
  if (result.code !== 0) {
    throw new CommandError(
      "worktree/rename-failed",
      `Kh\xF4ng \u0111\u1ED5i \u0111\u01B0\u1EE3c t\xEAn nh\xE1nh: ${firstLine2(result.stderr) || `m\xE3 ${result.code}`}`,
      { branch, detail: String(result.stderr ?? "").slice(0, 2e3) }
    );
  }
  return branch;
}
async function uniqueBranchName(runner, { root, branch, signal }) {
  if (!await branchIsTaken(runner, { root, branch, signal })) return branch;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${branch}-${randomHex(4)}`;
    if (!await branchIsTaken(runner, { root, branch: candidate, signal })) return candidate;
  }
  throw new CommandError("worktree/branch-taken", `Nh\xE1nh ${branch} \u0111\xE3 t\u1ED3n t\u1EA1i`, { branch });
}
async function createWorktree(runner, { repoRoot, name: name2, base, source = "local", remote = "", config, timeoutMs, signal }) {
  const path = worktreePath(repoRoot, config, name2);
  const branch = name2;
  if (!BRANCH_NAME.test(branch)) {
    throw new CommandError("worktree/invalid-name", `T\xEAn nh\xE1nh worktree kh\xF4ng h\u1EE3p l\u1EC7: ${branch}`, { name: name2 });
  }
  const existing = await stat2(path).catch(() => void 0);
  if (existing !== void 0) {
    throw new CommandError("worktree/exists", `Th\u01B0 m\u1EE5c ${path} \u0111\xE3 t\u1ED3n t\u1EA1i`, { path });
  }
  let start;
  if (source === "remote") {
    if (remote.length === 0) {
      throw new CommandError("worktree/no-remote", "Kho m\xE3 ch\u01B0a c\xF3 remote \u0111\u1EC3 t\u1EA1o worktree t\u1EEB nh\xE1nh t\u1EEB xa");
    }
    start = await fetchRemoteBranch(runner, { root: repoRoot, remote, branch: base, timeoutMs, signal });
  } else {
    const verified = await runner.run("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${base}^{commit}`], { cwd: repoRoot, signal });
    if (verified.code !== 0) {
      throw new CommandError("worktree/unknown-base", `Kh\xF4ng th\u1EA5y nh\xE1nh ${base} trong kho m\xE3`, { base });
    }
    start = `refs/heads/${base}`;
  }
  await ensurePool(repoRoot, config);
  const result = await runner.run("git", ["worktree", "add", "-b", branch, path, start], {
    cwd: repoRoot,
    signal,
    timeoutMs,
    maxBytes: 1024 * 1024
  });
  if (result.code !== 0) {
    throw new CommandError(
      "worktree/failed",
      `Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c worktree: ${firstLine2(result.stderr) || `m\xE3 ${result.code}`}`,
      { path, branch, detail: String(result.stderr ?? "").slice(0, 4e3) }
    );
  }
  return { path, name: name2, branch, base, source, start, repositoryRoot: repoRoot };
}
async function ensurePool(repoRoot, config) {
  const pool = poolDirectory(repoRoot, config);
  const before = await stat2(pool).catch(() => void 0);
  await mkdir(pool, { recursive: true });
  if (before !== void 0) return;
  const ignore = join2(pool, POOL_IGNORE);
  const present = await readFile(ignore, "utf8").catch(() => void 0);
  if (present !== void 0) return;
  try {
    await writeFile(ignore, "*\n", "utf8");
  } catch {
  }
}
async function removeWorktree(runner, { repoRoot, path, branch, deleteBranch = false, force = false, timeoutMs, signal }) {
  const target = resolve2(String(path ?? ""));
  if (target.length === 0) {
    throw new CommandError("input/invalid", "Thi\u1EBFu \u0111\u01B0\u1EDDng d\u1EABn worktree");
  }
  const present = await stat2(target).catch(() => void 0);
  if (present !== void 0) {
    const result = await runner.run(
      "git",
      force ? ["worktree", "remove", "--force", target] : ["worktree", "remove", target],
      { cwd: repoRoot, signal, timeoutMs }
    );
    if (result.code !== 0) {
      const detail = String(result.stderr ?? "");
      if (/modified or untracked|contains modified/i.test(detail)) {
        throw new CommandError("worktree/dirty", "Worktree c\xF2n thay \u0111\u1ED5i ch\u01B0a commit n\xEAn ch\u01B0a xo\xE1", { path: target });
      }
      throw new CommandError("worktree/failed", `Kh\xF4ng xo\xE1 \u0111\u01B0\u1EE3c worktree: ${firstLine2(detail) || `m\xE3 ${result.code}`}`, {
        path: target,
        detail: detail.slice(0, 2e3)
      });
    }
  }
  await runner.run("git", ["worktree", "prune"], { cwd: repoRoot, signal, timeoutMs });
  let branchDeleted = false;
  const name2 = String(branch ?? "").trim();
  if (deleteBranch && BRANCH_NAME.test(name2)) {
    const deleted = await runner.run("git", ["branch", "-D", name2], { cwd: repoRoot, signal, timeoutMs });
    branchDeleted = deleted.code === 0;
  }
  return { removed: true, branchDeleted };
}
async function readCheckoutKind(runner, { path, signal }) {
  const [gitDir, commonDir] = await Promise.all([
    runner.run("git", ["rev-parse", "--path-format=absolute", "--git-dir"], { cwd: path, signal }),
    runner.run("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: path, signal })
  ]);
  const gitValue = gitDir.code === 0 ? resolve2(gitDir.stdout.trim()) : null;
  const commonValue = commonDir.code === 0 ? resolve2(commonDir.stdout.trim()) : null;
  return {
    gitDir: gitValue,
    commonDir: commonValue,
    linked: gitValue !== null && commonValue !== null && resolve2(gitValue) !== resolve2(commonValue)
  };
}
function firstLine2(text) {
  return String(text ?? "").split("\n").map((line) => line.trim()).find((line) => line.length > 0) ?? "";
}

// src/lib/forge-core.ts
var CHECK_OUTCOMES = /* @__PURE__ */ new Set(["success", "failure", "pending", "cancelled", "neutral"]);
function asRecord2(value) {
  return value !== null && typeof value === "object" ? value : {};
}
function asTimestamp(value) {
  return typeof value === "string" ? value : null;
}
function checkOutcome(entry) {
  if (entry === null || typeof entry !== "object") return "pending";
  const node = entry;
  const type = String(node.__typename ?? node.type ?? "");
  if (type === "StatusContext" || node.state !== void 0 && node.conclusion === void 0 && node.status === void 0) {
    switch (String(node.state ?? "").toUpperCase()) {
      case "SUCCESS":
        return "success";
      case "FAILURE":
      case "ERROR":
        return "failure";
      case "PENDING":
      case "EXPECTED":
        return "pending";
      default:
        return "pending";
    }
  }
  const status = String(node.status ?? "").toUpperCase();
  if (status.length > 0 && status !== "COMPLETED") return "pending";
  switch (String(node.conclusion ?? "").toUpperCase()) {
    case "SUCCESS":
      return "success";
    case "NEUTRAL":
    case "SKIPPED":
      return "neutral";
    case "CANCELLED":
      return "cancelled";
    case "FAILURE":
    case "TIMED_OUT":
    case "ACTION_REQUIRED":
    case "STARTUP_FAILURE":
    case "STALE":
      return "failure";
    case "":
      return status.length === 0 ? "neutral" : "pending";
    default:
      return "failure";
  }
}
function summarizeChecks(rollup) {
  const totals = { state: "none", total: 0, success: 0, failure: 0, pending: 0, neutral: 0, cancelled: 0 };
  if (!Array.isArray(rollup)) return totals;
  for (const entry of rollup) {
    const outcome = checkOutcome(entry);
    if (!CHECK_OUTCOMES.has(outcome)) continue;
    totals.total += 1;
    totals[outcome] += 1;
  }
  if (totals.failure > 0) totals.state = "failure";
  else if (totals.pending > 0) totals.state = "pending";
  else if (totals.success > 0) totals.state = "success";
  else if (totals.cancelled > 0) totals.state = "cancelled";
  else if (totals.neutral > 0) totals.state = "neutral";
  return totals;
}
function describeChecks(rollup) {
  if (!Array.isArray(rollup)) return [];
  return rollup.map((entry) => {
    const node = entry !== null && typeof entry === "object" ? entry : {};
    const name2 = String(node.name ?? node.context ?? node.title ?? "check");
    return {
      name: name2,
      state: checkOutcome(node),
      url: typeof node.detailsUrl === "string" ? node.detailsUrl : typeof node.targetUrl === "string" ? node.targetUrl : null,
      description: typeof node.description === "string" ? node.description : typeof node.workflowName === "string" ? node.workflowName : "",
      workflow: typeof node.workflowName === "string" ? node.workflowName : null,
      startedAt: typeof node.startedAt === "string" ? node.startedAt : null,
      completedAt: typeof node.completedAt === "string" ? node.completedAt : null
    };
  });
}
function normalizeReview(value) {
  switch (String(value ?? "").toUpperCase()) {
    case "APPROVED":
      return "approved";
    case "CHANGES_REQUESTED":
      return "changes_requested";
    case "REVIEW_REQUIRED":
      return "review_required";
    default:
      return "none";
  }
}
function pullState(state, isDraft, mergedAt) {
  if (typeof mergedAt === "string" && mergedAt.length > 0) return "merged";
  switch (String(state ?? "").toUpperCase()) {
    case "OPEN":
    case "OPENED":
      return isDraft === true ? "draft" : "open";
    case "DRAFT":
      return "draft";
    case "MERGED":
      return "merged";
    case "CLOSED":
      return "closed";
    default:
      return String(state ?? "open").toLowerCase();
  }
}
function labelsOf(labels) {
  if (!Array.isArray(labels)) return [];
  const result = [];
  for (const entry of labels) {
    if (typeof entry === "string") {
      result.push({ name: entry, color: null });
      continue;
    }
    if (entry === null || typeof entry !== "object") continue;
    const node = entry;
    const name2 = typeof node.name === "string" ? node.name : "";
    if (name2.length === 0) continue;
    result.push({ name: name2, color: typeof node.color === "string" ? node.color : null });
  }
  return result;
}
function normalizePull(raw) {
  const node = raw !== null && typeof raw === "object" ? raw : {};
  const author = asRecord2(node.author);
  return {
    number: Number(node.number) || 0,
    title: String(node.title ?? ""),
    state: pullState(node.state, node.isDraft, node.mergedAt),
    isDraft: node.isDraft === true,
    url: String(node.url ?? ""),
    author: String(author.login ?? author.name ?? ""),
    branch: String(node.headRefName ?? ""),
    base: String(node.baseRefName ?? ""),
    createdAt: asTimestamp(node.createdAt),
    updatedAt: asTimestamp(node.updatedAt),
    mergedAt: asTimestamp(node.mergedAt),
    closedAt: asTimestamp(node.closedAt),
    additions: Number(node.additions) || 0,
    deletions: Number(node.deletions) || 0,
    changedFiles: Number(node.changedFiles) || 0,
    mergeable: node.mergeable === "MERGEABLE" ? true : node.mergeable === "CONFLICTING" ? false : null,
    mergeState: typeof node.mergeStateStatus === "string" ? node.mergeStateStatus : null,
    review: normalizeReview(node.reviewDecision),
    checks: summarizeChecks(node.statusCheckRollup),
    commentCount: Array.isArray(node.comments) ? node.comments.length : Number(node.comments) || 0,
    labels: labelsOf(node.labels)
  };
}
function normalizeIssue(raw) {
  const node = raw !== null && typeof raw === "object" ? raw : {};
  const author = asRecord2(node.author);
  const state = String(node.state ?? "OPEN").toUpperCase();
  return {
    number: Number(node.number) || 0,
    title: String(node.title ?? ""),
    state: state === "CLOSED" ? "closed" : "open",
    url: String(node.url ?? ""),
    author: String(author.login ?? author.name ?? ""),
    createdAt: asTimestamp(node.createdAt),
    updatedAt: asTimestamp(node.updatedAt),
    closedAt: asTimestamp(node.closedAt),
    commentCount: Array.isArray(node.comments) ? node.comments.length : Number(node.comments) || 0,
    labels: labelsOf(node.labels)
  };
}
function normalizeComment(raw) {
  const node = raw !== null && typeof raw === "object" ? raw : {};
  const author = asRecord2(node.author);
  const user = asRecord2(node.user);
  return {
    author: String(author.login ?? user.login ?? ""),
    body: String(node.body ?? ""),
    createdAt: asTimestamp(node.createdAt),
    url: typeof node.url === "string" ? node.url : typeof node.html_url === "string" ? node.html_url : null
  };
}
function normalizeReviewEntry(raw) {
  const node = raw !== null && typeof raw === "object" ? raw : {};
  const author = asRecord2(node.author);
  const user = asRecord2(node.user);
  return {
    author: String(author.login ?? user.login ?? ""),
    state: String(node.state ?? "").toLowerCase(),
    body: String(node.body ?? ""),
    submittedAt: asTimestamp(node.submittedAt ?? node.submitted_at)
  };
}

// src/lib/forge.ts
var PULL_FIELDS = [
  "number",
  "title",
  "state",
  "isDraft",
  "url",
  "author",
  "createdAt",
  "updatedAt",
  "mergedAt",
  "closedAt",
  "headRefName",
  "baseRefName",
  "additions",
  "deletions",
  "changedFiles",
  "mergeable",
  "mergeStateStatus",
  "reviewDecision",
  "statusCheckRollup",
  "labels",
  "comments"
].join(",");
var PULL_DETAIL_FIELDS = `${PULL_FIELDS},body,reviews,files`;
var ISSUE_FIELDS = ["number", "title", "state", "url", "author", "createdAt", "updatedAt", "closedAt", "labels", "comments"].join(",");
var ISSUE_DETAIL_FIELDS = `${ISSUE_FIELDS},body`;
function createForge({ runner, config, logger, resolveToken, env = process.env }) {
  const cache = /* @__PURE__ */ new Map();
  const inflight = /* @__PURE__ */ new Map();
  const probes = /* @__PURE__ */ new Map();
  const ttl = Math.max(0, Number(config.cacheMs) || 0);
  const providerChoice = String(config.forge ?? "auto");
  let tokenCache;
  async function exec(program, args, options) {
    return await runner.run(program, args, {
      cwd: options.cwd,
      signal: options.signal,
      maxBytes: options.maxBytes ?? 4 * 1024 * 1024
    });
  }
  function cliFor(provider) {
    const configured = String(config.cliPath ?? "").trim();
    if (configured.length > 0) return configured;
    if (provider === "github") return "gh";
    if (provider === "gitlab") return "glab";
    return void 0;
  }
  async function probe(program, cwd, signal) {
    const key = program;
    const cached = probes.get(key);
    if (cached !== void 0 && Date.now() - cached.at < 3e4) return cached.value;
    const value = await (async () => {
      let version;
      try {
        version = await exec(program, ["--version"], { cwd, signal, maxBytes: 8192 });
      } catch (error) {
        if (signal?.aborted === true) throw error;
        return { installed: false, signedIn: false, login: null, reason: messageOf(error) };
      }
      if (version.code !== 0) {
        return { installed: false, signedIn: false, login: null, reason: "CLI kh\xF4ng ch\u1EA1y \u0111\u01B0\u1EE3c" };
      }
      let status;
      try {
        status = await exec(program, ["auth", "status"], { cwd, signal, maxBytes: 16384 });
      } catch (error) {
        if (signal?.aborted === true) throw error;
        return { installed: true, signedIn: false, login: null, reason: messageOf(error) };
      }
      const text = `${status.stdout}
${status.stderr}`;
      const login = /account\s+(\S+)|as\s+(\S+)/i.exec(text);
      return {
        installed: true,
        signedIn: status.code === 0,
        login: login?.[1] ?? login?.[2] ?? null,
        reason: status.code === 0 ? null : text.trim().split("\n").slice(-1)[0] ?? "Ch\u01B0a \u0111\u0103ng nh\u1EADp"
      };
    })();
    probes.set(key, { at: Date.now(), value });
    return value;
  }
  async function token() {
    if (tokenCache !== void 0 && Date.now() - tokenCache.at < 6e4) return tokenCache.value;
    const names = [String(config.tokenEnv ?? "").trim(), "GITHUB_TOKEN", "GH_TOKEN"].filter((name2) => name2.length > 0);
    let value = "";
    for (const name2 of names) {
      const candidate = env[name2];
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        value = candidate.trim();
        break;
      }
    }
    if (value.length === 0 && typeof resolveToken === "function") {
      try {
        const stored = await resolveToken();
        if (typeof stored === "string") value = stored.trim();
      } catch {
      }
    }
    tokenCache = { at: Date.now(), value };
    return value;
  }
  async function describe({ root, remote, signal }) {
    const provider = remote?.provider ?? "other";
    if (providerChoice === "none") {
      return { provider: "none", available: false, backend: null, reason: "\u0110\xE3 t\u1EAFt trong c\u1EA5u h\xECnh" };
    }
    if (remote === null || remote === void 0) {
      return { provider: "none", available: false, backend: null, reason: "Kho m\xE3 kh\xF4ng c\xF3 remote" };
    }
    if (provider !== "github" && provider !== "gitlab") {
      return { provider, available: false, backend: null, reason: `Ch\u01B0a h\u1ED7 tr\u1EE3 m\xE1y ch\u1EE7 ${remote.host ?? ""}`.trim() };
    }
    if (providerChoice !== "auto" && providerChoice !== provider) {
      return { provider: providerChoice, available: false, backend: null, reason: `C\u1EA5u h\xECnh ch\u1EC9 d\xF9ng ${providerChoice}` };
    }
    const program = cliFor(provider);
    if (program !== void 0) {
      const probeResult = await probe(program, root, signal);
      if (probeResult.installed && probeResult.signedIn) {
        return {
          provider,
          available: true,
          backend: "cli",
          cli: program,
          login: probeResult.login,
          slug: remote.slug ?? null,
          host: remote.host ?? null
        };
      }
      if (provider === "github") {
        const restToken = await token();
        return {
          provider,
          available: true,
          backend: "rest",
          cli: program,
          login: null,
          authenticated: restToken.length > 0,
          slug: remote.slug ?? null,
          host: remote.host ?? null,
          note: probeResult.installed ? `${program} ch\u01B0a \u0111\u0103ng nh\u1EADp (${probeResult.reason ?? "gh auth login"})` : `${program} kh\xF4ng c\xF3 tr\xEAn m\xE1y`
        };
      }
      return {
        provider,
        available: false,
        backend: null,
        reason: probeResult.installed ? `${program} ch\u01B0a \u0111\u0103ng nh\u1EADp` : `${program} kh\xF4ng c\xF3 tr\xEAn m\xE1y`
      };
    }
    return { provider, available: false, backend: null, reason: `Ch\u01B0a h\u1ED7 tr\u1EE3 ${provider}` };
  }
  async function remember(key, refresh, produce) {
    if (!refresh) {
      const hit = cache.get(key);
      if (hit !== void 0 && Date.now() - hit.at < ttl) return hit.value;
      const pending = inflight.get(key);
      if (pending !== void 0) return await pending;
    }
    const promise = produce().then((value) => {
      cache.set(key, { at: Date.now(), value });
      return value;
    }).finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, promise);
    return await promise;
  }
  async function ghJson(program, args, options) {
    const result = await exec(program, args, { cwd: options.cwd, signal: options.signal });
    if (result.code !== 0) throw ghFailure(result.stderr, program);
    const text = result.stdout.trim();
    if (text.length === 0) return [];
    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch {
      throw new CommandError("forge/failed", `${program} tr\u1EA3 v\u1EC1 d\u1EEF li\u1EC7u kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c`);
    }
  }
  function ghFailure(stderr, program) {
    const text = String(stderr ?? "").trim();
    if (/gh auth login|not logged in|authentication|authenticate|HTTP 401/i.test(text)) {
      return new CommandError("forge/not-signed-in", `Ch\u01B0a \u0111\u0103ng nh\u1EADp ${program}. Ch\u1EA1y: ${program} auth login`, { detail: text });
    }
    if (/Could not resolve to a Repository|not found|HTTP 404/i.test(text)) {
      return new CommandError("forge/unknown-repository", "Kh\xF4ng th\u1EA5y kho m\xE3 tr\xEAn m\xE1y ch\u1EE7", { detail: text });
    }
    if (/no git remotes|not a git repository/i.test(text)) {
      return new CommandError("forge/no-remote", "Kho m\xE3 ch\u01B0a c\xF3 remote", { detail: text });
    }
    if (/rate limit|API rate limit exceeded/i.test(text)) {
      return new CommandError("forge/rate-limited", "M\xE1y ch\u1EE7 t\u1EA1m gi\u1EDBi h\u1EA1n l\u01B0\u1EE3t g\u1ECDi, th\u1EED l\u1EA1i sau \xEDt ph\xFAt", { detail: text });
    }
    return new CommandError("forge/failed", text.length > 0 ? text.split("\n")[0] : `${program} th\u1EA5t b\u1EA1i`, { detail: text });
  }
  async function rest(path, options = {}) {
    const headers = {
      accept: "application/vnd.github+json",
      "user-agent": "dsh-personal-hub",
      "x-github-api-version": "2022-11-28"
    };
    const value = await token();
    if (value.length > 0) headers.authorization = `Bearer ${value}`;
    let response;
    try {
      response = await fetch(`https://api.github.com${path}`, { headers, ...options.signal === void 0 ? {} : { signal: options.signal } });
    } catch (error) {
      throw new CommandError("forge/offline", `Kh\xF4ng g\u1ECDi \u0111\u01B0\u1EE3c GitHub: ${messageOf(error)}`);
    }
    if (response.status === 404) {
      if (options.allow404 === true) return void 0;
      throw new CommandError("forge/unknown-repository", "Kh\xF4ng th\u1EA5y kho m\xE3 tr\xEAn GitHub");
    }
    if (response.status === 401) throw new CommandError("forge/not-signed-in", "Token GitHub kh\xF4ng h\u1EE3p l\u1EC7");
    if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
      throw new CommandError("forge/rate-limited", "GitHub t\u1EA1m gi\u1EDBi h\u1EA1n l\u01B0\u1EE3t g\u1ECDi, th\u1EED l\u1EA1i sau \xEDt ph\xFAt");
    }
    if (!response.ok) throw new CommandError("forge/failed", `GitHub tr\u1EA3 v\u1EC1 HTTP ${response.status}`);
    const payload = await response.json();
    return payload;
  }
  async function listPulls({ root, remote, state = "open", limit = 20, signal, refresh = false }) {
    const info = await describe({ root, remote, signal });
    if (info.available !== true) return { ...info, pulls: [] };
    const key = `pulls|${remote.slug}|${state}|${limit}`;
    return await remember(key, refresh, async () => {
      if (info.backend === "cli") {
        const raw2 = await ghJson(info.cli, [
          "pr",
          "list",
          "--repo",
          String(remote.slug),
          "--state",
          state,
          "--limit",
          String(limit),
          "--json",
          PULL_FIELDS
        ], { cwd: root, signal });
        return { ...info, pulls: asArray(raw2).map(normalizePull) };
      }
      const query = state === "merged" ? "closed" : state === "all" ? "all" : state;
      const raw = await rest(`/repos/${remote.slug}/pulls?state=${query}&per_page=${limit}&sort=updated&direction=desc`, { signal });
      let pulls = asArray(raw).map(restPull).map(normalizePull);
      if (state === "merged") pulls = pulls.filter((pull) => pull.state === "merged");
      return { ...info, checksUnavailable: true, pulls };
    });
  }
  async function pullDetail({ root, remote, number, signal, refresh = false }) {
    const info = await describe({ root, remote, signal });
    if (info.available !== true) return { ...info };
    const key = `pull|${remote.slug}|${number}`;
    return await remember(key, refresh, async () => {
      if (info.backend === "cli") {
        const raw = await ghJson(info.cli, [
          "pr",
          "view",
          String(number),
          "--repo",
          String(remote.slug),
          "--json",
          PULL_DETAIL_FIELDS
        ], { cwd: root, signal });
        const node2 = asRecord3(raw);
        return {
          ...info,
          pull: normalizePull(node2),
          body: String(node2.body ?? ""),
          checks: describeChecks(node2.statusCheckRollup),
          reviews: asArray(node2.reviews).map(normalizeReviewEntry),
          comments: asArray(node2.comments).map(normalizeComment),
          files: asArray(node2.files).map((file) => {
            const item = asRecord3(file);
            return {
              path: String(item.path ?? ""),
              additions: Number(item.additions) || 0,
              deletions: Number(item.deletions) || 0
            };
          })
        };
      }
      const node = asRecord3(await rest(`/repos/${remote.slug}/pulls/${number}`, { signal }));
      const [reviews, comments] = await Promise.all([
        rest(`/repos/${remote.slug}/pulls/${number}/reviews?per_page=30`, { signal, allow404: true }).catch(() => []),
        rest(`/repos/${remote.slug}/issues/${number}/comments?per_page=50`, { signal, allow404: true }).catch(() => [])
      ]);
      const pull = normalizePull(restPull(node));
      return {
        ...info,
        pull,
        body: String(node.body ?? ""),
        checks: [],
        reviews: asArray(reviews).map(normalizeReviewEntry),
        comments: asArray(comments).map(normalizeComment),
        files: [],
        checksUnavailable: true
      };
    });
  }
  async function pullForBranch({ root, remote, branch, signal, refresh = false }) {
    if (typeof branch !== "string" || branch.length === 0) return { pull: null };
    const info = await describe({ root, remote, signal });
    if (info.available !== true) return { ...info, pull: null };
    const key = `branch|${remote.slug}|${branch}`;
    return await remember(key, refresh, async () => {
      if (info.backend === "cli") {
        const raw2 = await ghJson(info.cli, [
          "pr",
          "list",
          "--repo",
          String(remote.slug),
          "--head",
          branch,
          "--state",
          "all",
          "--limit",
          "5",
          "--json",
          PULL_FIELDS
        ], { cwd: root, signal });
        const pulls2 = asArray(raw2).map(normalizePull);
        const preferred2 = pulls2.find((pull) => pull.state === "open") ?? pulls2.find((pull) => pull.state === "draft") ?? pulls2[0];
        return { ...info, pull: preferred2 ?? null };
      }
      const raw = await rest(`/repos/${remote.slug}/pulls?state=all&head=${encodeURIComponent(`${remote.owner}:${branch}`)}&per_page=5`, { signal });
      const pulls = asArray(raw).map(restPull).map(normalizePull);
      const preferred = pulls.find((pull) => pull.state === "open") ?? pulls[0];
      return { ...info, pull: preferred ?? null };
    });
  }
  async function listIssues({ root, remote, state = "open", limit = 20, signal, refresh = false }) {
    const info = await describe({ root, remote, signal });
    if (info.available !== true) return { ...info, issues: [] };
    const key = `issues|${remote.slug}|${state}|${limit}`;
    return await remember(key, refresh, async () => {
      if (info.backend === "cli") {
        const raw2 = await ghJson(info.cli, [
          "issue",
          "list",
          "--repo",
          String(remote.slug),
          "--state",
          state,
          "--limit",
          String(limit),
          "--json",
          ISSUE_FIELDS
        ], { cwd: root, signal });
        return { ...info, issues: asArray(raw2).map(normalizeIssue) };
      }
      const raw = await rest(`/repos/${remote.slug}/issues?state=${state}&per_page=${limit}&sort=updated&direction=desc`, { signal });
      return { ...info, issues: asArray(raw).filter((item) => item?.pull_request === void 0).map(restIssue).map(normalizeIssue) };
    });
  }
  async function issueDetail({ root, remote, number, signal, refresh = false }) {
    const info = await describe({ root, remote, signal });
    if (info.available !== true) return { ...info };
    const key = `issue|${remote.slug}|${number}`;
    return await remember(key, refresh, async () => {
      if (info.backend === "cli") {
        const raw = await ghJson(info.cli, [
          "issue",
          "view",
          String(number),
          "--repo",
          String(remote.slug),
          "--json",
          ISSUE_DETAIL_FIELDS
        ], { cwd: root, signal });
        const node2 = asRecord3(raw);
        return {
          ...info,
          issue: normalizeIssue(node2),
          body: String(node2.body ?? ""),
          comments: asArray(node2.comments).map(normalizeComment)
        };
      }
      const node = asRecord3(await rest(`/repos/${remote.slug}/issues/${number}`, { signal }));
      const comments = await rest(`/repos/${remote.slug}/issues/${number}/comments?per_page=50`, { signal, allow404: true }).catch(() => []);
      return {
        ...info,
        issue: normalizeIssue(restIssue(node)),
        body: String(node.body ?? ""),
        comments: asArray(comments).map(normalizeComment)
      };
    });
  }
  async function restWrite(path, body, options = {}) {
    const headers = {
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "dsh-personal-hub",
      "x-github-api-version": "2022-11-28"
    };
    const value = await token();
    if (value.length > 0) headers.authorization = `Bearer ${value}`;
    let response;
    try {
      response = await fetch(`https://api.github.com${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        ...options.signal === void 0 ? {} : { signal: options.signal }
      });
    } catch (error) {
      throw new CommandError("forge/offline", `Kh\xF4ng g\u1ECDi \u0111\u01B0\u1EE3c GitHub: ${messageOf(error)}`);
    }
    if (response.status === 401) throw new CommandError("forge/not-signed-in", "Token GitHub kh\xF4ng h\u1EE3p l\u1EC7");
    if (response.status === 422) {
      const detail = await response.text().catch(() => "");
      throw new CommandError("pr/rejected", "GitHub t\u1EEB ch\u1ED1i y\xEAu c\u1EA7u t\u1EA1o pull request", { detail: detail.slice(0, 2e3) });
    }
    if (!response.ok) throw new CommandError("forge/failed", `GitHub tr\u1EA3 v\u1EC1 HTTP ${response.status}`);
    const payload = await response.json();
    return payload !== null && typeof payload === "object" ? payload : {};
  }
  async function defaultBase({ root, remote, signal }) {
    return await resolveDefaultBase(runner, { root, remote: String(remote?.name ?? ""), signal });
  }
  async function createPull({ root, remote, head, base, title, body, signal }) {
    const info = await describe({ root, remote, signal });
    if (info.available !== true) {
      throw new CommandError("pr/forge-unavailable", info.reason ?? "M\xE1y ch\u1EE7 m\xE3 ngu\u1ED3n ch\u01B0a d\xF9ng \u0111\u01B0\u1EE3c");
    }
    if (info.backend === "cli") {
      const program = info.cli;
      const args = info.provider === "gitlab" ? [
        "mr",
        "create",
        "--repo",
        String(remote.slug),
        "--source-branch",
        head,
        "--target-branch",
        base,
        "--title",
        title,
        "--description",
        body,
        "--yes",
        "--no-editor"
      ] : [
        "pr",
        "create",
        "--repo",
        String(remote.slug),
        "--head",
        head,
        "--base",
        base,
        "--title",
        title,
        "--body",
        body
      ];
      const result = await exec(program, args, { cwd: root, signal });
      if (result.code !== 0) throw ghFailure(result.stderr, program);
      const url = firstUrl(result.stdout) ?? firstUrl(result.stderr) ?? "";
      return {
        number: numberFromUrl(url),
        url,
        provider: info.provider,
        backend: "cli",
        head,
        base
      };
    }
    const node = await restWrite(`/repos/${remote.slug}/pulls`, { title, head, base, body }, { signal });
    return {
      number: typeof node.number === "number" ? node.number : numberFromUrl(String(node.html_url ?? "")),
      url: String(node.html_url ?? ""),
      provider: info.provider,
      backend: "rest",
      head,
      base
    };
  }
  async function pullState2({ root, remote, number, signal }) {
    const info = await describe({ root, remote, signal });
    if (info.available !== true) return null;
    if (info.backend === "cli") {
      if (info.provider === "gitlab") {
        const raw2 = await ghJson(info.cli, [
          "api",
          `projects/${encodeURIComponent(String(remote.slug))}/merge_requests/${number}`
        ], { cwd: root, signal });
        const node3 = asRecord3(raw2);
        return {
          number,
          state: gitlabState(node3.state),
          url: String(node3.web_url ?? ""),
          mergedAt: typeof node3.merged_at === "string" ? node3.merged_at : null
        };
      }
      const raw = await ghJson(info.cli, [
        "pr",
        "view",
        String(number),
        "--repo",
        String(remote.slug),
        "--json",
        STATE_FIELDS
      ], { cwd: root, signal });
      const node2 = asRecord3(raw);
      const pull2 = normalizePull(node2);
      return {
        number: pull2.number,
        state: pull2.state,
        url: pull2.url,
        mergedAt: typeof node2.mergedAt === "string" ? node2.mergedAt : null
      };
    }
    const node = asRecord3(await rest(`/repos/${remote.slug}/pulls/${number}`, { signal }));
    const pull = normalizePull(restPull(node));
    return {
      number: pull.number,
      state: pull.state,
      url: pull.url,
      mergedAt: typeof node.merged_at === "string" ? node.merged_at : null
    };
  }
  return { describe, listPulls, pullDetail, pullForBranch, listIssues, issueDetail, defaultBase, createPull, pullState: pullState2 };
}
var STATE_FIELDS = ["number", "url", "state", "isDraft", "mergedAt", "headRefName", "baseRefName", "mergeable"].join(",");
function gitlabState(value) {
  switch (String(value ?? "")) {
    case "merged":
      return "merged";
    case "closed":
      return "closed";
    case "locked":
      return "open";
    default:
      return "open";
  }
}
function firstUrl(text) {
  const match = /https?:\/\/[^\s'"]+/.exec(String(text ?? ""));
  return match?.[0] ?? null;
}
function numberFromUrl(url) {
  const match = /\/(?:pull|pulls|merge_requests)\/(\d+)/.exec(String(url ?? ""));
  return match === null ? null : Number.parseInt(match[1], 10);
}
function restPull(item) {
  const node = asRecord3(item);
  const user = asRecord3(node.user);
  const head = asRecord3(node.head);
  const base = asRecord3(node.base);
  return {
    number: node.number,
    title: node.title,
    state: node.state,
    isDraft: node.draft === true,
    url: node.html_url,
    author: { login: user.login },
    headRefName: head.ref,
    baseRefName: base.ref,
    createdAt: node.created_at,
    updatedAt: node.updated_at,
    mergedAt: node.merged_at,
    closedAt: node.closed_at,
    additions: node.additions,
    deletions: node.deletions,
    changedFiles: node.changed_files,
    mergeable: node.mergeable === true ? "MERGEABLE" : node.mergeable === false ? "CONFLICTING" : void 0,
    reviewDecision: node.reviewDecision,
    comments: node.comments,
    labels: node.labels
  };
}
function restIssue(item) {
  const node = asRecord3(item);
  const user = asRecord3(node.user);
  return {
    number: node.number,
    title: node.title,
    state: node.state,
    url: node.html_url,
    author: { login: user.login },
    createdAt: node.created_at,
    updatedAt: node.updated_at,
    closedAt: node.closed_at,
    comments: node.comments,
    labels: node.labels
  };
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function asRecord3(value) {
  return value !== null && typeof value === "object" ? value : {};
}
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

// src/lib/pr-draft.ts
var MAX_TITLE_LENGTH = 140;
var MAX_BODY_LENGTH = 24e3;
var LANGUAGES = /* @__PURE__ */ new Map([
  ["vi", "Vietnamese"],
  ["en", "English"],
  ["zh", "Chinese"],
  ["ja", "Japanese"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["ru", "Russian"],
  ["pt", "Portuguese"]
]);
function changeRequestSystemPrompt(locale = "en") {
  const language = LANGUAGES.get(String(locale ?? "").slice(0, 2).toLowerCase()) ?? "English";
  return [
    "You write pull request titles and descriptions for a Git branch that is about to be opened against its base branch.",
    "You receive JSON describing the branch, its commits, its changed files, and a diff excerpt.",
    'Answer with one JSON object and nothing else: {"title": string, "body": string}.',
    'The title is one line under 90 characters, concrete, and names the change \u2014 never "Update files" or "Changes".',
    `The body is Markdown in ${language}: a short paragraph on what the change does and why, then a "## Changes" list of at most six bullets, and a "## Testing" section that says how it was verified or that it was not run.`,
    `Write the title in ${language} as well unless the commit subjects are clearly written in another language, in which case follow the commit subjects.`,
    "Describe only what the supplied diff and commits show. Never invent a file, a test, or a reason.",
    'Do not add a checklist, badges, or a "Generated by" line.'
  ].join("\n");
}
function buildChangeRequestInput(facts) {
  const payload = {
    branch: facts.branch,
    base: facts.base,
    commits: (facts.commits ?? []).map((commit) => ({
      subject: commit.subject,
      ...commit.author === void 0 ? {} : { author: commit.author }
    })),
    files: (facts.files ?? []).map((file) => ({
      path: file.path,
      additions: file.additions,
      deletions: file.deletions
    })),
    diffTruncated: facts.truncated === true,
    diff: facts.diff ?? ""
  };
  return [
    `Draft the change request for this branch against ${facts.base}:`,
    "```json",
    JSON.stringify(payload),
    "```",
    "Answer with the JSON object only."
  ].join("\n");
}
function parseChangeRequestDraft(text, options = {}) {
  const raw = String(text ?? "").trim();
  const fallbackTitle = normalizeTitle(options.fallbackTitle ?? "");
  if (raw.length === 0) {
    return { title: fallbackTitle, body: "", parsed: "fallback" };
  }
  const jsonText = extractJsonObject(raw);
  if (jsonText !== null) {
    try {
      const value = JSON.parse(jsonText);
      const record = value !== null && typeof value === "object" ? value : {};
      const title2 = normalizeTitle(String(record.title ?? ""));
      const body = normalizeBody(String(record.body ?? record.description ?? ""));
      if (title2.length > 0) return { title: title2, body, parsed: "json" };
    } catch {
    }
  }
  const lines = raw.split(/\r?\n/);
  const titleLine = lines.find((line) => line.trim().length > 0) ?? "";
  const title = normalizeTitle(stripMarkdown(titleLine));
  if (title.length === 0) {
    return { title: fallbackTitle, body: stripFence(raw), parsed: "fallback" };
  }
  const rest = lines.slice(lines.indexOf(titleLine) + 1).join("\n").trim();
  return { title, body: normalizeBody(stripFence(rest)), parsed: "text" };
}
function extractJsonObject(text) {
  const unwrapped = stripFence(text);
  const start = unwrapped.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < unwrapped.length; index += 1) {
    const character = unwrapped[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return unwrapped.slice(start, index + 1);
    }
  }
  return null;
}
function stripFence(text) {
  const trimmed = String(text ?? "").trim();
  const fenced = /^```[A-Za-z0-9_-]*\s*\n([\s\S]*?)\n?```$/.exec(trimmed);
  return fenced === null ? trimmed : fenced[1].trim();
}
function normalizeTitle(text) {
  const single = String(text ?? "").replace(/\s+/g, " ").replace(/^#+\s*/, "").replace(/^["'`]+|["'`]+$/g, "").replace(/^\*{1,3}(.*?)\*{1,3}$/, "$1").trim();
  return single.length <= MAX_TITLE_LENGTH ? single : `${single.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}\u2026`;
}
function normalizeBody(text) {
  const body = String(text ?? "").replace(/\r\n/g, "\n").trim();
  if (body.length <= MAX_BODY_LENGTH) return body;
  return `${body.slice(0, MAX_BODY_LENGTH - 1).trimEnd()}\u2026`;
}
function stripMarkdown(text) {
  return String(text ?? "").replace(/^[-*+]\s+/, "").replace(/^\*\*(.*)\*\*$/, "$1").trim();
}
function offlineDraft(facts) {
  const commits = facts.commits ?? [];
  const files = facts.files ?? [];
  const title = normalizeTitle(commits[0]?.subject ?? `Merge ${facts.branch} into ${facts.base}`);
  const lines = [
    commits.length === 0 ? `M\u1EDF thay \u0111\u1ED5i t\u1EEB \`${facts.branch}\` v\xE0o \`${facts.base}\`.` : `Nh\xE1nh \`${facts.branch}\` g\u1ED9p ${commits.length} commit v\xE0o \`${facts.base}\`.`,
    "",
    "## Changes",
    ...files.slice(0, 20).map((file) => `- \`${file.path}\` (+${file.additions} \u2212${file.deletions})`)
  ];
  if (files.length > 20) lines.push(`- \u2026 v\xE0 ${files.length - 20} t\u1EC7p kh\xE1c`);
  if (commits.length > 1) {
    lines.push("", "## Commits", ...commits.slice(0, 20).map((commit) => `- ${commit.subject}`));
  }
  return { title, body: normalizeBody(lines.join("\n")) };
}
async function draftChangeRequest({
  llm,
  route,
  sessionId = "",
  facts,
  branch,
  base,
  locale,
  config,
  signal,
  logger
}) {
  const fallback = {
    ...offlineDraft({ branch, base, commits: facts.commits ?? [], files: facts.files ?? [] }),
    source: "commits",
    model: null
  };
  if (llm === void 0 || typeof llm.prepareCall !== "function") return { ...fallback, error: "model-unavailable" };
  if (route === null || typeof route?.provider !== "string" || typeof route?.model !== "string") {
    return { ...fallback, error: "model-unavailable" };
  }
  const timeoutMs = Math.max(5e3, Number(config?.timeoutMs) || 9e4);
  const deadline = AbortSignal.timeout(timeoutMs);
  const combined = signal === void 0 ? deadline : AbortSignal.any([signal, deadline]);
  try {
    const call = await llm.prepareCall(
      { provider: route.provider, model: route.model, maxTokens: Number(config?.maxOutputTokens) || 4096 },
      combined,
      (controls, model) => {
        const efforts = model?.reasoning?.efforts;
        const effort = efforts?.[0]?.id;
        return effort === void 0 ? controls : { ...controls, reasoningEffort: effort };
      }
    );
    const system = changeRequestSystemPrompt(locale);
    const input = buildChangeRequestInput({
      branch,
      base,
      commits: facts.commits ?? [],
      files: facts.files ?? [],
      diff: facts.diff ?? "",
      truncated: facts.truncated === true
    });
    let streamed = "";
    const blocks = [];
    for await (const chunk of call.stream({
      ...call.config,
      messages: [{ role: "user", content: [{ type: "text", text: input }] }],
      system,
      ...sessionId.length === 0 ? {} : { sessionId },
      signal: combined
    })) {
      if (chunk?.type === "text-delta" && typeof chunk.text === "string") streamed += chunk.text;
      else if (chunk?.type === "block-end" && chunk.block?.type === "text" && typeof chunk.block.text === "string") {
        blocks.push(chunk.block.text);
      }
    }
    const draft = parseChangeRequestDraft(blocks.length > 0 ? blocks.join("\n") : streamed, { fallbackTitle: fallback.title });
    if (draft.parsed === "fallback") return { ...fallback, error: "unparsed-answer" };
    return {
      title: draft.title,
      body: draft.body.length > 0 ? draft.body : fallback.body,
      source: "model",
      model: `${route.provider}/${route.model}`,
      chosen: call.config?.reasoningEffort ?? null
    };
  } catch (error) {
    if (signal?.aborted === true) throw error;
    logger?.warn?.("pr: the change-request draft failed: %s", messageOf2(error));
    return { ...fallback, error: messageOf2(error) };
  }
}
function messageOf2(error) {
  return error instanceof Error ? error.message : String(error);
}

// src/lib/commit-draft.ts
var MAX_SUBJECT_LENGTH = 72;
var LANGUAGES2 = /* @__PURE__ */ new Map([
  ["vi", "Vietnamese"],
  ["en", "English"],
  ["zh", "Chinese"],
  ["ja", "Japanese"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["ru", "Russian"],
  ["pt", "Portuguese"]
]);
function commitSystemPrompt(locale = "en") {
  const language = LANGUAGES2.get(String(locale ?? "").slice(0, 2).toLowerCase()) ?? "English";
  return [
    "You write Git commit messages for the changes in a repository.",
    "You receive JSON describing the branch, the changed files, the recent commit subjects, and a diff excerpt.",
    'Answer with one JSON object and nothing else: {"subject": string, "body": string}.',
    `The subject is one imperative line under ${MAX_SUBJECT_LENGTH} characters, with no trailing period, naming what the commit does.`,
    'Do not add a conventional-commit prefix such as "feat:" or "fix:" unless the recent subjects in the repository use one.',
    "The body is optional plain text wrapped at 72 columns: it explains what changed and why, not how it was implemented.",
    `Write the message in ${language} unless the recent subjects are clearly written in another language, in which case follow the recent subjects.`,
    "Describe only what the supplied diff shows. Never invent a file, a test, or a reason."
  ].join("\n");
}
function buildCommitInput(facts) {
  const payload = {
    branch: facts.branch,
    files: (facts.files ?? []).map((file) => ({
      path: file.path,
      additions: file.additions,
      deletions: file.deletions
    })),
    recentSubjects: facts.recentSubjects ?? [],
    diffTruncated: facts.truncated === true,
    diff: facts.diff ?? ""
  };
  return [
    `Draft the commit message for the staged changes on ${facts.branch}:`,
    "```json",
    JSON.stringify(payload),
    "```",
    "Answer with the JSON object only."
  ].join("\n");
}
function parseCommitDraft(text, options = {}) {
  const raw = String(text ?? "").trim();
  const fallbackSubject = cleanSubjectLine(options.fallbackSubject ?? "");
  if (raw.length === 0) {
    return { subject: fallbackSubject, body: "", parsed: "fallback" };
  }
  const jsonText = extractJsonObject(raw);
  if (jsonText !== null) {
    try {
      const value = JSON.parse(jsonText);
      const record = value !== null && typeof value === "object" ? value : {};
      const subject2 = cleanSubjectLine(String(record.subject ?? record.title ?? ""));
      const body = normalizeCommitBody(String(record.body ?? record.description ?? ""));
      if (subject2.length > 0) return { subject: subject2, body, parsed: "json" };
    } catch {
    }
  }
  const lines = raw.split(/\r?\n/);
  const subjectLine = lines.find((line) => line.trim().length > 0) ?? "";
  const subject = cleanSubjectLine(subjectLine);
  if (subject.length === 0) {
    return { subject: fallbackSubject, body: stripFence(raw), parsed: "fallback" };
  }
  const rest = lines.slice(lines.indexOf(subjectLine) + 1).join("\n").trim();
  return { subject, body: normalizeCommitBody(stripFence(rest)), parsed: "text" };
}
function sanitizeCommitMessage(text, maxSubjectLength = MAX_SUBJECT_LENGTH) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").trim().split("\n");
  const subject = cleanSubjectLine(lines[0] ?? "", maxSubjectLength);
  const body = normalizeCommitBody(lines.slice(1).join("\n"));
  return { subject, body };
}
function fallbackCommitMessage(files) {
  const list = files ?? [];
  const subject = list.length === 0 ? "Update project files" : list.length === 1 ? `Update ${basenameOf(list[0].path)}` : `Update ${list.length} files`;
  const body = list.slice(0, 20).map((file) => `- ${file.path}`).join("\n");
  return { subject, body };
}
async function draftCommitMessage(options) {
  const {
    llm,
    route,
    sessionId = "",
    branch,
    files,
    diff,
    truncated = false,
    recentSubjects,
    locale,
    config,
    signal,
    logger
  } = options;
  const fallback = fallbackCommitMessage(files ?? []);
  const fallbackResult = {
    message: composeMessage(fallback),
    subject: fallback.subject,
    body: fallback.body,
    source: "fallback",
    model: null
  };
  if (!isLlmService(llm)) return { ...fallbackResult, error: "model-unavailable" };
  if (route === null || typeof route.provider !== "string" || typeof route.model !== "string") {
    return { ...fallbackResult, error: "model-unavailable" };
  }
  if (config?.enabled === false) return { ...fallbackResult, error: "model-unavailable" };
  const timeoutMs = Math.max(5e3, Number(config?.timeoutMs) || 6e4);
  const deadline = AbortSignal.timeout(timeoutMs);
  const combined = signal === void 0 ? deadline : AbortSignal.any([signal, deadline]);
  try {
    const call = await llm.prepareCall(
      { provider: route.provider, model: route.model, maxTokens: Number(config?.maxOutputTokens) || 512 },
      combined,
      (controls, model) => {
        const efforts = model?.reasoning?.efforts;
        const effort = efforts?.[0]?.id;
        return effort === void 0 ? controls : { ...controls, reasoningEffort: effort };
      }
    );
    const system = commitSystemPrompt(locale);
    const input = buildCommitInput({
      branch,
      files: files ?? [],
      recentSubjects: recentSubjects ?? [],
      diff: diff ?? "",
      truncated
    });
    let streamed = "";
    const blocks = [];
    for await (const chunk of call.stream({
      ...call.config,
      messages: [{ role: "user", content: [{ type: "text", text: input }] }],
      system,
      ...sessionId.length === 0 ? {} : { sessionId },
      signal: combined
    })) {
      if (chunk?.type === "text-delta" && typeof chunk.text === "string") streamed += chunk.text;
      else if (chunk?.type === "block-end" && chunk.block?.type === "text" && typeof chunk.block.text === "string") {
        blocks.push(chunk.block.text);
      }
    }
    const draft = parseCommitDraft(blocks.length > 0 ? blocks.join("\n") : streamed, { fallbackSubject: fallback.subject });
    if (draft.parsed === "fallback") return { ...fallbackResult, error: "unparsed-answer" };
    const cleaned = sanitizeCommitMessage(
      draft.body.length > 0 ? `${draft.subject}

${draft.body}` : draft.subject,
      config?.maxSubjectLength
    );
    const subject = cleaned.subject.length > 0 ? cleaned.subject : fallback.subject;
    const body = cleaned.body.length > 0 ? cleaned.body : fallback.body;
    return {
      message: composeMessage({ subject, body }),
      subject,
      body,
      source: "model",
      model: `${route.provider}/${route.model}`
    };
  } catch (error) {
    if (signal?.aborted === true) throw error;
    logger?.warn?.("git: the commit-message draft failed: %s", messageOf3(error));
    return { ...fallbackResult, error: messageOf3(error) };
  }
}
function cleanSubjectLine(text, maxSubjectLength = MAX_SUBJECT_LENGTH) {
  const single = String(text ?? "").replace(/^[-*+]\s+/, "").replace(/^\d+[.)]\s+/, "").replace(/^#+\s*/, "").replace(/\s+/g, " ").replace(/^["'`]+|["'`]+$/g, "").replace(/^\*{1,3}(.*?)\*{1,3}$/, "$1").trim().replace(/\.+$/, "").trim();
  const limit = Math.max(1, Math.trunc(maxSubjectLength));
  return single.length <= limit ? single : `${single.slice(0, limit - 1).trimEnd()}\u2026`;
}
function normalizeCommitBody(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").trim();
}
function composeMessage({ subject, body }) {
  return body.length > 0 ? `${subject}

${body}` : subject;
}
function basenameOf(path) {
  const normalized = String(path ?? "").replace(/[\\/]+$/, "");
  const index = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  return index < 0 ? normalized : normalized.slice(index + 1);
}
function isLlmService(value) {
  return value !== null && typeof value === "object" && typeof value.prepareCall === "function";
}
function messageOf3(error) {
  return error instanceof Error ? error.message : String(error);
}

// src/lib/merge-watch.ts
var MIN_CHECK_MS = 15e3;
function mergedCleanup(config, facts = {}) {
  const settings = config ?? {};
  const active = settings.enabled === true;
  const removeWorktree2 = active && settings.removeWorktree !== false && facts.hasWorktree === true;
  return {
    removeWorktree: removeWorktree2,
    deleteBranch: removeWorktree2 && settings.deleteBranch === true,
    archiveSession: active && settings.archiveSession !== false,
    active
  };
}
function createMergeWatcher({ config, logger, store, forge, runtime, now = Date.now }) {
  const merged = config.merged ?? {};
  const interval = Math.max(MIN_CHECK_MS, Number(merged.checkMs) || 6e4);
  let timer;
  let running = false;
  let disposed = false;
  async function track(sessionId, record) {
    if (typeof sessionId !== "string" || sessionId.length === 0) return;
    if (record === null || typeof record !== "object") return;
    const number = Number(record.number);
    if (!Number.isFinite(number) || number <= 0) return;
    await store.load();
    const existing = store.state.pulls?.[sessionId];
    if (existing !== void 0 && existing.number === number) return;
    await store.update((state) => {
      state.pulls ??= {};
      const previous = state.pulls[sessionId];
      state.pulls[sessionId] = {
        ...previous,
        ...record,
        number,
        sessionId,
        trackedAt: previous?.trackedAt ?? now(),
        done: false,
        checkedAt: now()
      };
    });
  }
  async function runOnce() {
    if (running || disposed) return;
    if (merged.enabled !== true) return;
    running = true;
    try {
      await store.load();
      const pulls = store.state.pulls ?? {};
      for (const [sessionId, record] of Object.entries(pulls)) {
        if (record === null || typeof record !== "object" || record.done === true) continue;
        try {
          await settle(sessionId, record);
        } catch (error) {
          logger.warn("git: merge check for %s failed: %s", sessionId, messageOf4(error));
        }
      }
    } finally {
      running = false;
    }
  }
  async function settle(sessionId, record) {
    const state = await forge.pullState({
      root: record.root,
      remote: record.remote,
      number: Number(record.number)
    });
    if (state === null) return;
    const next = String(state.state ?? "");
    if (next === "merged") {
      const worktrees = store.state.worktrees ?? {};
      const action = mergedCleanup(merged, { hasWorktree: worktrees[sessionId] !== void 0 });
      const outcome = { cleanedAt: now(), mergedUrl: state.url ?? record.url ?? "" };
      if (action.removeWorktree) {
        try {
          const removed = await runtime.removeSessionWorktree(worktrees[sessionId], sessionId);
          outcome.worktreeRemoved = removed.removed === true;
          outcome.branchDeleted = removed.branchDeleted === true;
          logger.info("git: removed the worktree of %s after its change request merged", sessionId);
        } catch (error) {
          outcome.worktreeError = messageOf4(error);
          logger.warn("git: could not remove the worktree of %s: %s", sessionId, messageOf4(error));
        }
      }
      if (action.archiveSession) {
        try {
          outcome.archived = await runtime.archiveSession(sessionId);
        } catch (error) {
          outcome.archiveError = messageOf4(error);
          logger.warn("git: could not archive %s: %s", sessionId, messageOf4(error));
        }
      }
      await store.update((value) => {
        value.pulls ??= {};
        value.pulls[sessionId] = { ...value.pulls[sessionId], ...outcome, state: "merged", done: true, checkedAt: now() };
      });
      return;
    }
    const settled = next === "closed";
    await store.update((value) => {
      value.pulls ??= {};
      value.pulls[sessionId] = {
        ...value.pulls[sessionId],
        state: next,
        checkedAt: now(),
        done: settled
      };
    });
  }
  return {
    track,
    runOnce,
    start() {
      if (timer !== void 0 || disposed) return;
      if (merged.enabled !== true) {
        logger.info("git: merge cleanup is off, so no change request is polled");
        return;
      }
      timer = setInterval(() => {
        void runOnce();
      }, interval);
      timer.unref?.();
      logger.info("git: merge cleanup polls every %d ms", interval);
      void runOnce();
    },
    stop() {
      disposed = true;
      if (timer !== void 0) clearInterval(timer);
      timer = void 0;
    }
  };
}
function messageOf4(error) {
  return error instanceof Error ? error.message : String(error);
}

// src/lib/paths.ts
import { homedir } from "node:os";
import { join as join3, resolve as resolve3 } from "node:path";
function expandHome(input) {
  if (typeof input !== "string" || input.length === 0) return input;
  const value = input.trim();
  if (value === "~") return homedir();
  if (value.startsWith("~/") || value.startsWith("~\\")) return join3(homedir(), value.slice(2));
  return value;
}
function dshHome(env = process.env) {
  const fromEnv = env.DSH_HOME;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) return resolve3(expandHome(fromEnv));
  return join3(homedir(), ".dsh");
}
function pluginDataDir(name2, env = process.env) {
  return join3(dshHome(env), name2);
}

// src/lib/state-store.ts
import { mkdir as mkdir2, readFile as readFile2, rename, writeFile as writeFile2 } from "node:fs/promises";
import { dirname as dirname2 } from "node:path";
async function writeJsonFile(file, value) {
  await mkdir2(dirname2(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${nextTempId()}.tmp`;
  await writeFile2(temporary, `${JSON.stringify(value, null, 2)}
`, "utf8");
  await rename(temporary, file);
}
var tempCounter = 0;
function nextTempId() {
  tempCounter = (tempCounter + 1) % 1e6;
  return `${tempCounter}-${Math.random().toString(36).slice(2, 8)}`;
}
async function readJsonFile(file) {
  try {
    return JSON.parse(await readFile2(file, "utf8"));
  } catch {
    return void 0;
  }
}
var JsonStateStore = class {
  #file;
  #defaults;
  #state;
  #loadPromise;
  #queue = Promise.resolve();
  constructor(file, defaults) {
    this.#file = file;
    this.#defaults = defaults;
  }
  async load() {
    this.#loadPromise ??= readJsonFile(this.#file).then((stored) => {
      const source = stored !== null && typeof stored === "object" ? stored : {};
      this.#state = { ...structuredClone(this.#defaults), ...source };
      return this.#state;
    });
    return this.#loadPromise;
  }
  get state() {
    if (this.#state === void 0) throw new Error("JsonStateStore.load() must be awaited first");
    return this.#state;
  }
  /**
   * Apply one mutation and persist the result. Mutations run in call order.
   * @param mutate the change to apply to the loaded state
   */
  update(mutate) {
    const next = this.#queue.then(async () => {
      await this.load();
      mutate(this.state);
      await writeJsonFile(this.#file, this.state);
      return this.state;
    });
    this.#queue = next;
    return next;
  }
};

// src/lib/worktree-cleanup.ts
import { stat as stat3 } from "node:fs/promises";
var MIN_CHECK_MS2 = 3e5;
var DAY_MS = 864e5;
var HOUR_MS = 36e5;
function cleanupDecision(settings, facts) {
  const config = settings ?? {};
  if (config.enabled !== true) return { remove: false, reason: "disabled" };
  if (facts.active === true) return { remove: false, reason: "session-active" };
  const keep = String(config.keepChanges ?? "tracked");
  if (keep === "any" && facts.localFiles > 0) return { remove: false, reason: "local-files" };
  if (keep === "tracked" && facts.trackedChanges > 0) return { remove: false, reason: "uncommitted-changes" };
  const inactiveDays = Number(config.inactiveDays) || 0;
  if (inactiveDays > 0 && facts.ageMs >= inactiveDays * DAY_MS) {
    return { remove: true, reason: "inactive" };
  }
  const noCommitsHours = Number(config.noCommitsAfterHours) || 0;
  if (config.whenNoCommits === true && facts.commitsAhead === 0 && noCommitsHours > 0 && facts.ageMs >= noCommitsHours * HOUR_MS) {
    return { remove: true, reason: "no-commits" };
  }
  return { remove: false, reason: "kept" };
}
async function inspectWorktree(runner, record, at = Date.now()) {
  const path = String(record?.path ?? "");
  const created = Number(record?.createdAt) || at;
  const info = await stat3(path).catch(() => void 0);
  if (info === void 0) {
    return { missing: true, ageMs: at - created, localFiles: 0, trackedChanges: 0, commitsAhead: 0 };
  }
  const status = await runner.run("git", ["status", "--porcelain=v1", "-z"], { cwd: path });
  const entries = status.code === 0 ? String(status.stdout ?? "").split("\0").filter((entry) => entry.length > 0) : [];
  const trackedChanges = entries.filter((entry) => !entry.startsWith("??")).length;
  const start = String(record?.start ?? "").length > 0 ? String(record.start) : String(record?.base ?? "").length > 0 ? `refs/heads/${String(record.base)}` : "HEAD";
  const count = await runner.run("git", ["rev-list", "--count", `${start}...HEAD`], { cwd: path });
  const commitsAhead = count.code === 0 ? Number.parseInt(String(count.stdout ?? "").trim(), 10) || 0 : 0;
  return {
    missing: false,
    ageMs: Math.max(at - created, at - info.mtimeMs),
    localFiles: entries.length,
    trackedChanges,
    commitsAhead
  };
}
function createWorktreeCleanup({ runner, config, logger, store, runtime, now = Date.now }) {
  const settings = config?.worktree?.cleanup ?? {};
  const timeoutMs = Number(config?.worktreeTimeoutMs) || 12e4;
  const interval = Math.max(MIN_CHECK_MS2, Number(settings.checkMs) || 36e5);
  let timer;
  let running = false;
  let disposed = false;
  async function runOnce() {
    if (disposed || running) return storedCleanup(store?.state?.cleanup);
    if (settings.enabled !== true) return storedCleanup(store?.state?.cleanup);
    running = true;
    const removed = [];
    const kept = [];
    try {
      await store.load();
      const records = worktreeRecords(store.state);
      for (const [sessionId, value] of Object.entries(records)) {
        if (value === null || typeof value !== "object") continue;
        const record = value;
        try {
          const facts = await inspectWorktree(runner, record, now());
          const decision = cleanupDecision(settings, {
            ...facts,
            active: runtime.isSessionActive(sessionId, record)
          });
          if (!decision.remove) {
            kept.push({ sessionId, branch: record.branch, reason: decision.reason });
            continue;
          }
          await removeWorktree(runner, {
            repoRoot: String(record.repositoryRoot ?? ""),
            path: String(record.path ?? ""),
            branch: record.branch,
            deleteBranch: settings.deleteBranch === true,
            timeoutMs
          });
          await store.update((state) => {
            const worktrees = state.worktrees ?? {};
            state.worktrees = worktrees;
            if (worktrees !== null && typeof worktrees === "object") {
              delete worktrees[sessionId];
            }
          });
          removed.push({ sessionId, branch: record.branch, reason: decision.reason });
          logger.info("git: cleanup removed %s (%s)", String(record.branch ?? ""), decision.reason);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          kept.push({ sessionId, branch: record?.branch, reason: "failed", error: reason });
          logger.warn("git: cleanup kept %s: %s", String(record?.branch ?? ""), reason);
        }
      }
      const result = { at: now(), removed, kept };
      await store.update((state) => {
        state.cleanup = result;
      });
      return result;
    } finally {
      running = false;
    }
  }
  return {
    runOnce,
    start() {
      if (timer !== void 0 || disposed) return;
      if (settings.enabled !== true) {
        logger.info("git: worktree cleanup is off");
        return;
      }
      timer = setInterval(() => {
        void runOnce();
      }, interval);
      timer.unref?.();
      logger.info("git: worktree cleanup runs every %d ms", interval);
    },
    stop() {
      disposed = true;
      if (timer !== void 0) clearInterval(timer);
      timer = void 0;
    }
  };
}
function worktreeRecords(state) {
  const value = state.worktrees ?? {};
  return value !== null && typeof value === "object" ? value : {};
}
function storedCleanup(value) {
  return value === void 0 || value === null ? null : value;
}

// src/lib/worktree-name.ts
var BRANCH_PREFIXES = Object.freeze(["feat", "fix", "chore", "docs", "refactor", "test", "perf", "build", "ci"]);
var MAX_SLUG_LENGTH = 40;
var MAX_SLUG_WORDS = 4;
function branchNamingPrompt(instructions = "") {
  const extra = String(instructions ?? "").trim();
  return [
    "You name a Git branch for one coding task inside an existing repository.",
    "You receive the first message of the task as JSON.",
    'Answer with one JSON object and nothing else: {"prefix": string, "slug": string}.',
    `"prefix" is one of: ${BRANCH_PREFIXES.join(", ")}.`,
    `"slug" is ${2}\u2013${MAX_SLUG_WORDS} lowercase English words joined by hyphens that describe the task, at most ${MAX_SLUG_LENGTH} characters.`,
    "Use ASCII letters, digits, and hyphens only. Never include the branch prefix in the slug.",
    extra.length === 0 ? "" : `Additional naming instructions: ${extra}`
  ].filter((line) => line.length > 0).join("\n");
}
function sanitizeBranchSlug(text, limits = {}) {
  const maxWords = Math.max(1, Number(limits.maxWords) || MAX_SLUG_WORDS);
  const maxLength = Math.max(4, Number(limits.maxLength) || MAX_SLUG_LENGTH);
  const folded = String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (folded.length === 0) return "";
  const words = folded.split("-").filter((word) => word.length > 0).slice(0, maxWords);
  let slug = words.join("-");
  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength).replace(/-+$/g, "");
  }
  return slug;
}
function semanticBranchName({ prefix, slug, fallbackPrefix = "dsh" }) {
  const clean = sanitizeBranchSlug(slug);
  if (clean.length === 0) return "";
  const chosen = String(prefix ?? "").trim().toLowerCase();
  const head = BRANCH_PREFIXES.includes(chosen) ? chosen : sanitizeBranchSlug(fallbackPrefix, { maxWords: 1, maxLength: 16 });
  return head.length > 0 ? `${head}/${clean}` : clean;
}
function parseBranchDraft(text, options = {}) {
  const raw = String(text ?? "").trim();
  if (raw.length === 0) return null;
  const fallbackPrefix = options.fallbackPrefix ?? "dsh";
  const jsonText = extractJsonObject(raw);
  if (jsonText !== null) {
    try {
      const value = JSON.parse(jsonText);
      const branch = semanticBranchName({
        prefix: String(field(value, "prefix") ?? ""),
        slug: String(field(value, "slug") ?? field(value, "name") ?? ""),
        fallbackPrefix
      });
      if (branch.length > 0) {
        return { branch, prefix: branch.split("/")[0], slug: branch.slice(branch.indexOf("/") + 1) };
      }
    } catch {
    }
  }
  const line = stripFence(raw).split(/\r?\n/).map((item) => item.trim()).find((item) => item.length > 0) ?? "";
  const direct = /^([a-z]+)\/([a-z0-9][a-z0-9-]*)$/i.exec(line);
  if (direct !== null) {
    const branch = semanticBranchName({ prefix: direct[1], slug: direct[2], fallbackPrefix });
    if (branch.length > 0) return { branch, prefix: branch.split("/")[0], slug: branch.slice(branch.indexOf("/") + 1) };
  }
  const colon = /^([a-z]+)\s*:\s*(.+)$/i.exec(line);
  if (colon !== null) {
    const branch = semanticBranchName({ prefix: colon[1], slug: colon[2], fallbackPrefix });
    if (branch.length > 0) return { branch, prefix: branch.split("/")[0], slug: branch.slice(branch.indexOf("/") + 1) };
  }
  if (/^[A-Za-z0-9._-]{2,60}$/.test(line)) {
    const bare = semanticBranchName({ prefix: "", slug: line, fallbackPrefix });
    if (bare.length > 0) {
      return { branch: bare, prefix: bare.split("/")[0], slug: bare.slice(bare.indexOf("/") + 1) };
    }
  }
  return null;
}
async function suggestBranchName({ llm, route, text, sessionId = "", instructions = "", fallbackPrefix = "dsh", config, signal, logger }) {
  const message2 = String(text ?? "").trim();
  if (llm === void 0 || typeof llm.prepareCall !== "function") return null;
  if (route === null || typeof route?.provider !== "string" || typeof route?.model !== "string") return null;
  if (message2.length === 0) return null;
  const timeoutMs = Math.max(5e3, Number(config?.timeoutMs) || 3e4);
  const deadline = AbortSignal.timeout(timeoutMs);
  const combined = signal === void 0 ? deadline : AbortSignal.any([signal, deadline]);
  try {
    const call = await llm.prepareCall(
      { provider: route.provider, model: route.model, maxTokens: Number(config?.maxOutputTokens) || 200 },
      combined,
      (controls, model) => {
        const effort = firstReasoningEffort(model);
        return effort === void 0 ? controls : { ...controls, reasoningEffort: effort };
      }
    );
    const input = `Name this task from its first message:
${JSON.stringify({ message: message2.slice(0, 2e3) })}`;
    let streamed = "";
    const blocks = [];
    for await (const chunk of call.stream({
      ...call.config,
      messages: [{ role: "user", content: [{ type: "text", text: input }] }],
      system: branchNamingPrompt(instructions),
      ...sessionId.length === 0 ? {} : { sessionId },
      signal: combined
    })) {
      if (chunk?.type === "text-delta" && typeof chunk.text === "string") streamed += chunk.text;
      else if (chunk?.type === "block-end" && chunk.block?.type === "text" && typeof chunk.block.text === "string") {
        blocks.push(chunk.block.text);
      }
    }
    return parseBranchDraft(blocks.length > 0 ? blocks.join("\n") : streamed, { fallbackPrefix });
  } catch (error) {
    if (signal?.aborted === true) throw error;
    logger?.warn?.("git: branch naming failed: %s", error instanceof Error ? error.message : String(error));
    return null;
  }
}
function field(value, name2) {
  return value !== null && typeof value === "object" ? value[name2] : void 0;
}
function firstReasoningEffort(model) {
  if (model === null || typeof model !== "object") return void 0;
  const reasoning = model.reasoning;
  if (reasoning === null || typeof reasoning !== "object") return void 0;
  const efforts = reasoning.efforts;
  if (!Array.isArray(efforts)) return void 0;
  const first = efforts[0];
  return first !== null && typeof first === "object" ? first.id : void 0;
}

// src/features/git.ts
var GIT_PATH_PREFIX = "/api/personal-hub-git";
var GITHUB_CREDENTIAL_REF = "DSH_GITHUB_TOKEN";
var ACTION_RETENTION_MS = 5 * 60 * 1e3;
var ACTION_OUTPUT_LINES = 40;
function mountGit(ctx, config, deps) {
  const logger = deps.logger;
  const connection = ctx.get("connection");
  if (connection !== void 0 && typeof connection.fetch?.register === "function") {
    return mountRoutes(ctx, connection, config, deps);
  }
  if (typeof ctx.inject !== "function") {
    logger.info("git: the connection service is absent, so the git panel has no bridge in this composition");
    return () => {
    };
  }
  let routeDisposer;
  let fiber;
  try {
    fiber = ctx.inject(["connection"], (scoped) => {
      const scopedConnection = scoped.get("connection");
      if (scopedConnection === void 0 || typeof scopedConnection.fetch?.register !== "function") {
        logger.warn("git: the connection service exposes no Fetch routes; the git panel has no bridge");
        return;
      }
      routeDisposer = mountRoutes(scoped, scopedConnection, config, deps);
    });
  } catch (error) {
    logger.warn("git: cannot wait for the connection service: %s", messageOf5(error));
    return () => {
    };
  }
  return () => {
    try {
      routeDisposer?.();
    } catch (error) {
      logger.warn("git: route disposal failed: %s", messageOf5(error));
    }
    routeDisposer = void 0;
    try {
      fiber?.dispose?.();
    } catch {
    }
  };
}
function mountRoutes(ctx, connection, config, deps) {
  const logger = deps.logger;
  const runner = createCommandRunner({ ctx, logger, timeoutMs: config.commandTimeoutMs });
  const forge = createForge({
    runner,
    config,
    logger,
    resolveToken: () => storedToken(ctx)
  });
  logger.info("git: mounted over %s, code host %s", runner.backend, config.forge);
  const store = new JsonStateStore(
    join4(pluginDataDir("personal-hub"), "git.json"),
    { worktrees: {}, pulls: {} }
  );
  async function state() {
    await store.load();
    return store.state;
  }
  function agentFor(sessionId) {
    if (typeof sessionId !== "string" || sessionId.length === 0) return void 0;
    const agents = ctx.get("agents");
    return typeof agents?.get === "function" ? agents.get(sessionId) : void 0;
  }
  async function preferredRemote(root, signal) {
    const names = await remoteNames(runner, { root, signal });
    for (const candidate of [config.worktree.remote, config.remote, "origin"]) {
      const name2 = String(candidate ?? "").trim();
      if (name2.length > 0 && names.includes(name2)) return name2;
    }
    return names[0] ?? "";
  }
  function pathKey(value) {
    const normalized = resolve4(String(value ?? ""));
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
  }
  async function mainWorktreeRoot(root, signal) {
    const entries = await readWorktrees(runner, { root, signal }).catch(() => []);
    return resolve4(entries[0]?.path ?? root);
  }
  async function countChangedFiles(path, signal) {
    const result = await runner.run("git", ["status", "--porcelain", "-z", "--untracked-files=normal"], {
      cwd: path,
      signal,
      maxBytes: 2 * 1024 * 1024
    }).catch(() => void 0);
    if (result === void 0 || result.code !== 0) return null;
    return String(result.stdout ?? "").split("\0").filter((field2) => field2.length > 0).length;
  }
  async function setSessionDirectory(sessionId, directory, signal) {
    const agent = agentFor(sessionId);
    if (agent === void 0) {
      throw new CommandError("worktree/no-agent", "This Session is not open, so its folder cannot change yet");
    }
    const workingDirectory = ctx.get("workingDirectory");
    if (typeof workingDirectory?.set !== "function") {
      throw new CommandError("worktree/no-working-directory", "This build cannot change a Session folder");
    }
    await workingDirectory.set(agent, directory, signal);
  }
  const watcher = createMergeWatcher({
    config,
    logger,
    store,
    forge,
    runtime: {
      async removeSessionWorktree(record, sessionId) {
        const target = typeof record?.path === "string" ? record.path : "";
        if (target.length === 0) return { removed: false, branchDeleted: false };
        const repoRoot = typeof record.repositoryRoot === "string" ? record.repositoryRoot : "";
        const result = await removeWorktree(runner, {
          repoRoot,
          path: target,
          branch: record.branch,
          deleteBranch: config.merged.deleteBranch === true,
          timeoutMs: config.worktreeTimeoutMs
        });
        await store.update((value) => {
          value.worktrees ??= {};
          delete value.worktrees[sessionId];
        });
        return result;
      },
      async archiveSession(sessionId) {
        const registry = ctx.get("workspaceRegistry");
        if (typeof registry?.archiveSession !== "function") return false;
        await registry.archiveSession(sessionId);
        return true;
      }
    }
  });
  const cleanup = createWorktreeCleanup({
    runner,
    config,
    logger,
    // The JSON store holds this feature's whole state; the cleanup pass reads
    // and writes only the keys it owns.
    store,
    runtime: {
      isSessionActive(sessionId, record) {
        const agent = agentFor(sessionId);
        if (agent === void 0) return false;
        const session = agent.session;
        const workingDirectory = ctx.get("workingDirectory");
        const directory = session !== void 0 && typeof workingDirectory?.get === "function" ? workingDirectory.get(session) : session?.header?.cwd;
        const target = typeof record?.path === "string" ? record.path : "";
        return directory !== void 0 && target.length > 0 && isInside(target, directory);
      }
    }
  });
  const naming = /* @__PURE__ */ new Set();
  async function nameWorktreeFromMessage(sessionId, message2) {
    if (config.worktree.naming !== "semantic") return;
    if (naming.has(sessionId)) return;
    const text = textOfUserMessage(message2);
    if (text.length === 0) return;
    const value = await state();
    const record = value.worktrees?.[sessionId];
    if (record === void 0 || typeof record !== "object") return;
    if (record.branch !== record.name) return;
    naming.add(sessionId);
    try {
      const draft = await suggestBranchName({
        llm: ctx.get("llm"),
        route: configuredRoute(sessionId),
        text,
        sessionId,
        instructions: config.worktree.nameInstructions,
        fallbackPrefix: config.worktree.namePrefix,
        config: { timeoutMs: 3e4, maxOutputTokens: 200 },
        logger
      });
      if (draft === null) {
        logger.info("git: no branch name for %s; the temporary name stays", sessionId);
        await store.update((current) => {
          const entry = current.worktrees?.[sessionId];
          if (entry !== void 0) entry.namingError = "model-unavailable";
        });
        return;
      }
      const repoRoot = String(record.repositoryRoot ?? "");
      const branch = await uniqueBranchName(runner, { root: repoRoot, branch: draft.branch });
      await renameWorktreeBranch(runner, { path: String(record.path ?? ""), branch });
      await store.update((current) => {
        const entry = current.worktrees?.[sessionId];
        if (entry !== void 0) {
          entry.branch = branch;
          entry.namedAt = Date.now();
        }
      });
      logger.info("git: renamed the worktree of %s to %s", sessionId, branch);
    } catch (error) {
      logger.warn("git: could not name the worktree of %s: %s", sessionId, messageOf5(error));
      await store.update((current) => {
        const entry = current.worktrees?.[sessionId];
        if (entry !== void 0) entry.namingError = messageOf5(error);
      }).catch(() => void 0);
    } finally {
      naming.delete(sessionId);
    }
  }
  async function draftChangeRequest2(options) {
    const { sessionId, payload, facts, branch, base, signal } = options;
    if (config.pull.enabled !== true) {
      return {
        ...offlineDraft({
          branch,
          base,
          commits: facts.commits ?? [],
          files: facts.files ?? []
        }),
        source: "commits",
        model: null
      };
    }
    return await draftChangeRequest({
      llm: ctx.get("llm"),
      route: configuredRoute(sessionId),
      sessionId,
      facts,
      branch,
      base,
      locale: typeof payload.locale === "string" ? payload.locale : "",
      config: config.pull,
      signal,
      logger
    });
  }
  function configuredRoute(sessionId) {
    if (config.pull.provider.length > 0 && config.pull.model.length > 0) {
      return { provider: config.pull.provider, model: config.pull.model };
    }
    const session = agentFor(sessionId)?.session;
    const projections = ctx.get("sessionProjections");
    if (session !== void 0 && typeof projections?.stateOf === "function") {
      try {
        const value = projections.stateOf(session, "modelSelection");
        const pick = value?.pending ?? value?.lastUsed ?? null;
        if (typeof pick?.provider === "string" && typeof pick?.model === "string") {
          return { provider: pick.provider, model: pick.model };
        }
      } catch {
      }
    }
    const defaults = ctx.get("agentDefaultModel");
    if (typeof defaults?.currentSelection === "function") {
      const pick = defaults.currentSelection();
      if (typeof pick?.provider === "string" && typeof pick?.model === "string") {
        return { provider: pick.provider, model: pick.model };
      }
    }
    return null;
  }
  const actions = /* @__PURE__ */ new Map();
  function pushOutput(progress, _stream, text) {
    const line = String(text ?? "").trim();
    if (line.length === 0) return;
    progress.output.push(line.slice(0, 500));
    if (progress.output.length > ACTION_OUTPUT_LINES) progress.output.shift();
  }
  function enterPhase(progress, phase, label) {
    progress.phase = phase;
    progress.label = label;
  }
  function buildToast(action, result, isDefaultRef) {
    const sha = result.commit.sha?.slice(0, 7) ?? "";
    const subject = result.commit.subject ?? "";
    if (result.pr.status === "created" || result.pr.status === "opened_existing") {
      const verb = result.pr.status === "created" ? "Created" : "Opened";
      return {
        title: `${verb} #${result.pr.number ?? "?"}`,
        ...result.pr.title === void 0 ? {} : { description: result.pr.title.slice(0, 72) },
        cta: result.pr.url === void 0 ? { kind: "none" } : { kind: "open_pr", label: "View pull request", url: result.pr.url }
      };
    }
    if (result.push.status === "pushed") {
      return {
        title: `Pushed ${sha} to ${result.push.branch ?? result.push.upstream ?? "the remote"}`,
        ...subject.length === 0 ? {} : { description: subject },
        cta: isDefaultRef ? { kind: "none" } : { kind: "run_action", label: "Create pull request", action: "create_pr" }
      };
    }
    if (result.commit.status === "created") {
      return {
        title: `Committed ${sha}`,
        ...subject.length === 0 ? {} : { description: subject },
        cta: action === "commit" ? { kind: "run_action", label: "Push", action: "push" } : { kind: "none" }
      };
    }
    return { title: "Done", cta: { kind: "none" } };
  }
  async function runStackedAction(progress, payload) {
    const signal = progress.controller.signal;
    const action = payload.action;
    const wantsCommit = action === "commit" || action === "commit_push" || action === "commit_push_pr";
    const wantsPush = action === "push" || action === "commit_push" || action === "commit_push_pr" || action === "create_pr";
    const wantsPr = action === "create_pr" || action === "commit_push_pr";
    progress.phases = [
      ...payload.featureBranch === true ? ["branch"] : [],
      ...wantsCommit ? ["commit"] : [],
      ...wantsPush ? ["push"] : [],
      ...wantsPr ? ["pr"] : []
    ];
    try {
      if (payload.featureBranch === true && !wantsCommit) {
        throw new CommandError(
          "action/feature-branch",
          "A feature branch is only supported for actions that commit."
        );
      }
      const { root } = await repository(payload, signal);
      const context = await readContext(runner, { root, config, signal });
      let branch = context.branch;
      if (branch === null && (wantsPush || wantsPr) && payload.featureBranch !== true) {
        throw new CommandError(
          "action/detached",
          wantsPr ? "Cannot create a pull request from a detached HEAD." : "Cannot push from a detached HEAD."
        );
      }
      const overview = await readOverview(runner, { root, config, signal });
      let message2 = String(payload.commitMessage ?? "").trim();
      if (payload.featureBranch === true) {
        enterPhase(progress, "branch", "Preparing feature branch\xE2\u20AC\xA6");
        if (message2.length === 0) {
          progress.label = "Generating commit message\xE2\u20AC\xA6";
          const facts = await readCommitMessageFacts(runner, {
            root,
            paths: payload.paths,
            config,
            signal
          });
          const draft = await draftCommitMessage({
            llm: ctx.get("llm"),
            route: configuredRoute(String(payload.sessionId ?? "")),
            sessionId: String(payload.sessionId ?? ""),
            branch: facts.branch,
            files: facts.files,
            diff: facts.diff,
            truncated: facts.truncated,
            recentSubjects: facts.recentSubjects,
            locale: payload.locale,
            config: config.commit,
            signal,
            logger
          });
          message2 = draft.message;
        }
        const subject = message2.split(/\r?\n/)[0] ?? "";
        const refs = await readBranchRefs(runner, { root, limit: 200, signal });
        const localNames = refs.branches.filter((item) => !item.isRemote).map((item) => item.name);
        const name2 = resolveAutoFeatureBranchName(localNames, sanitizeFeatureBranchName(subject));
        await createBranch(runner, { root, name: name2, signal });
        branch = name2;
        progress.result = progress.result ?? null;
      }
      let commit = { status: "skipped_not_requested" };
      if (wantsCommit) {
        enterPhase(progress, "commit", "Committing\xE2\u20AC\xA6");
        if (message2.length === 0) {
          progress.label = "Generating commit message\xE2\u20AC\xA6";
          const facts = await readCommitMessageFacts(runner, {
            root,
            paths: payload.paths,
            config,
            signal
          });
          const draft = await draftCommitMessage({
            llm: ctx.get("llm"),
            route: configuredRoute(String(payload.sessionId ?? "")),
            sessionId: String(payload.sessionId ?? ""),
            branch: facts.branch,
            files: facts.files,
            diff: facts.diff,
            truncated: facts.truncated,
            recentSubjects: facts.recentSubjects,
            locale: payload.locale,
            config: config.commit,
            signal,
            logger
          });
          message2 = draft.message;
          progress.label = "Committing\xE2\u20AC\xA6";
        }
        const outcome = await commitChanges(runner, {
          root,
          message: message2,
          paths: payload.paths,
          signal,
          timeoutMs: 6e5,
          onLine: (stream, text) => pushOutput(progress, stream, text)
        });
        commit = outcome.status === "created" ? { status: "created", sha: outcome.sha, subject: outcome.subject } : { status: "skipped_no_changes" };
        if (outcome.branch !== null) branch = outcome.branch;
      }
      let push = { status: "skipped_not_requested" };
      if (wantsPush && branch !== null) {
        enterPhase(progress, "push", "Pushing\xE2\u20AC\xA6");
        const outcome = await pushCurrentBranch(runner, {
          root,
          remote: context.remote?.name,
          branch,
          timeoutMs: config.worktreeTimeoutMs,
          signal,
          onLine: (stream, text) => pushOutput(progress, stream, text)
        });
        push = {
          status: outcome.status,
          branch: outcome.branch,
          ...outcome.upstream === null ? {} : { upstream: outcome.upstream },
          ...outcome.setUpstream ? { setUpstream: true } : {}
        };
      }
      let pr = { status: "skipped_not_requested" };
      if (wantsPr && branch !== null) {
        enterPhase(progress, "pr", "Creating pull request\xE2\u20AC\xA6");
        const created = await createPullForBranch({
          root,
          sessionId: String(payload.sessionId ?? ""),
          payload,
          branch,
          remote: context.remote,
          signal,
          onPhase: (label) => {
            progress.label = label;
          }
        });
        pr = created;
      }
      const partial = {
        action,
        branch: branch !== null && payload.featureBranch === true ? { status: "created", name: branch } : { status: "skipped_not_requested" },
        commit,
        push,
        pr
      };
      progress.result = {
        ...partial,
        // A branch created for this action is no longer the default branch, so
        // the toast can offer the change request it would otherwise hide.
        toast: buildToast(action, partial, payload.featureBranch === true ? false : overview.repo.isDefaultRef)
      };
      progress.status = "done";
      progress.label = "Done";
      progress.finishedAt = Date.now();
    } catch (error) {
      const failure2 = failureOf(error);
      progress.status = "failed";
      progress.error = failure2;
      progress.label = failure2.message;
      progress.finishedAt = Date.now();
      logger.warn("git: action %s failed: %s", action, failure2.message);
    }
  }
  async function createPullForBranch(options) {
    const { root, sessionId, payload, branch, remote, signal, onPhase } = options;
    if (remote === null) {
      throw new CommandError("pr/no-remote", "The repository has no remote, so it cannot open a change request.");
    }
    const forgeInfo = await forge.describe({ root, remote, signal });
    if (forgeInfo.available !== true) {
      throw new CommandError("pr/forge-unavailable", forgeInfo.reason ?? "The code host is not available.");
    }
    const existing = await forge.pullForBranch({ root, remote, branch, signal }).catch(() => null);
    if (existing !== null && typeof existing === "object" && existing.pull?.state === "open") {
      const pull = existing.pull;
      return {
        status: "opened_existing",
        number: pull.number,
        url: pull.url,
        base: pull.base,
        head: branch,
        title: pull.title
      };
    }
    const requested = typeof payload.base === "string" ? payload.base.trim() : "";
    const base = requested.length > 0 ? requested : config.pull.base.length > 0 ? config.pull.base : await forge.defaultBase({ root, remote, signal });
    if (base === null || base.length === 0) {
      throw new CommandError("pr/no-base", "Cannot determine the base branch for the change request.");
    }
    if (base === branch) {
      throw new CommandError("pr/same-branch", `Branch ${base} cannot be its own base branch.`);
    }
    const facts = await readChangeRequestFacts(runner, { root, base, config, signal });
    if (facts.ahead === 0) {
      throw new CommandError("pr/no-commits", `Branch ${branch} has no commits over ${base}.`, { base });
    }
    onPhase?.("Generating pull request content\xE2\u20AC\xA6");
    const draft = await draftChangeRequest2({
      sessionId,
      payload,
      facts: { ...facts, branch, base },
      branch,
      base,
      signal
    });
    onPhase?.("Creating pull request\xE2\u20AC\xA6");
    const created = await forge.createPull({
      root,
      remote,
      head: branch,
      base,
      title: draft.title,
      body: draft.body,
      signal
    });
    if (sessionId.length > 0 && created.number !== null) {
      await watcher.track(sessionId, {
        root,
        remote,
        number: created.number,
        url: created.url,
        branch,
        base
      });
    }
    return {
      status: "created",
      ...created.number === null ? {} : { number: created.number },
      url: created.url,
      base,
      head: branch,
      title: draft.title
    };
  }
  const handlers = {
    /**
     * Everything the header and the changes view need.
     */
    async overview(payload, signal) {
      const { root } = await repository(payload, signal);
      const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
      const read = await readOverview(runner, { root, config, signal });
      const value = {
        ...read,
        forge: await describeForge(read.repo.remote, root, signal),
        worktree: sessionId.length > 0 ? (await state()).worktrees?.[sessionId] ?? null : null,
        branchPull: null
      };
      if (value.forge.available === true && read.repo.branch !== null) {
        try {
          const found = await forge.pullForBranch({
            root,
            remote: read.repo.remote,
            branch: read.repo.branch,
            signal
          });
          value.branchPull = found.pull ?? null;
          if (sessionId.length > 0 && typeof found.pull?.number === "number") {
            await watcher.track(sessionId, {
              root,
              remote: read.repo.remote,
              number: found.pull.number,
              url: found.pull.url,
              branch: read.repo.branch,
              base: found.pull.base ?? ""
            });
          }
        } catch (error) {
          value.branchPullError = failureOf(error);
        }
      }
      return value;
    },
    /** One tracked file's diff, or an untracked file's content as an insertion. */
    async diff(payload, signal) {
      const { root } = await repository(payload, signal);
      const path = requiredString(payload.path, "path");
      return await readFilePatch(runner, {
        root,
        path,
        staged: payload.staged === true,
        untracked: payload.untracked === true,
        config,
        signal
      });
    },
    /** Every changed file's diff, for the stacked diff view. */
    async diffAll(payload, signal) {
      const { root } = await repository(payload, signal);
      return await readDiffBundle(runner, {
        root,
        scope: payload.scope === "branch" ? "branch" : "working",
        includeUntracked: payload.includeUntracked !== false,
        config,
        signal
      });
    },
    /** The commit log. */
    async commits(payload, signal) {
      const { root } = await repository(payload, signal);
      const limit = clampLimit(payload.limit, config.logLimit, 200);
      return { commits: await readLog(runner, { root, limit, signal }) };
    },
    /** One commit with its file statistics and patch. */
    async commit(payload, signal) {
      const { root } = await repository(payload, signal);
      return await readCommit(runner, { root, hash: requiredString(payload.hash, "hash"), config, signal });
    },
    /** Every ref the branch picker offers. */
    async branches(payload, signal) {
      const { root } = await repository(payload, signal);
      const limit = clampLimit(payload.limit, 120, 200);
      const read = await readBranchRefs(runner, {
        root,
        limit,
        refresh: payload.refresh === true,
        remote: config.remote.length > 0 ? config.remote : null,
        timeoutMs: config.worktreeTimeoutMs,
        signal
      });
      return {
        branches: read.branches,
        defaultBranch: read.defaultBranch,
        hasPrimaryRemote: read.branches.some((item) => item.isRemote)
      };
    },
    /** Check out an existing branch, or a remote ref as a new local branch. */
    async switchBranch(payload, signal) {
      const { root } = await repository(payload, signal);
      return await switchBranch(runner, { root, name: requiredString(payload.name, "name"), signal });
    },
    /** Create a branch and check it out. */
    async createBranch(payload, signal) {
      const { root } = await repository(payload, signal);
      return await createBranch(runner, {
        root,
        name: requiredString(payload.name, "name"),
        from: typeof payload.from === "string" ? payload.from : void 0,
        signal
      });
    },
    /** Stage exactly these paths. */
    async stage(payload, signal) {
      const { root } = await repository(payload, signal);
      return { staged: await stagePaths(runner, { root, paths: stringList(payload.paths, "paths"), signal }) };
    },
    /** Unstage exactly these paths. */
    async unstage(payload, signal) {
      const { root } = await repository(payload, signal);
      return { unstaged: await unstagePaths(runner, { root, paths: stringList(payload.paths, "paths"), signal }) };
    },
    /** Discard work-tree edits. */
    async discard(payload, signal) {
      const { root } = await repository(payload, signal);
      return {
        discarded: await discardPaths(runner, {
          root,
          paths: stringList(payload.paths, "paths"),
          includeUntracked: payload.includeUntracked === true,
          signal
        })
      };
    },
    /** Commit the selected paths with the message the dialog collected. */
    async commitChanges(payload, signal) {
      const { root } = await repository(payload, signal);
      const outcome = await commitChanges(runner, {
        root,
        message: requiredString(payload.message, "message"),
        paths: Array.isArray(payload.paths) ? payload.paths : void 0,
        amend: payload.amend === true,
        signal
      });
      if (outcome.status === "skipped_no_changes") {
        throw new CommandError("commit/nothing", "There is nothing to commit.");
      }
      return { sha: outcome.sha, subject: outcome.subject, branch: outcome.branch };
    },
    /** Push the checked-out branch. */
    async push(payload, signal) {
      const { root } = await repository(payload, signal);
      const context = await readContext(runner, { root, config, signal });
      const branch = typeof payload.branch === "string" && payload.branch.length > 0 ? payload.branch : context.branch;
      if (branch === null) throw new CommandError("push/detached", "Cannot push from a detached HEAD.");
      const outcome = await pushCurrentBranch(runner, {
        root,
        remote: payload.remote ?? context.remote?.name,
        branch,
        timeoutMs: config.worktreeTimeoutMs,
        signal
      });
      return { branch: outcome.branch, upstream: outcome.upstream };
    },
    /** Pull the checked-out branch. */
    async pull(payload, signal) {
      const { root } = await repository(payload, signal);
      const context = await readContext(runner, { root, config, signal });
      if (context.branch === null) throw new CommandError("pull/detached", "Cannot pull while detached.");
      const outcome = await pullCurrentBranch(runner, {
        root,
        branch: context.branch,
        rebase: payload.rebase === true,
        signal
      });
      return { status: outcome.status, branch: outcome.branch };
    },
    /** Draft a commit message for the dialog. */
    async draftMessage(payload, signal) {
      const { root } = await repository(payload, signal);
      const facts = await readCommitMessageFacts(runner, {
        root,
        paths: Array.isArray(payload.paths) ? payload.paths : void 0,
        config,
        signal
      });
      const draft = await draftCommitMessage({
        llm: ctx.get("llm"),
        route: configuredRoute(String(payload.sessionId ?? "")),
        sessionId: String(payload.sessionId ?? ""),
        branch: facts.branch,
        files: facts.files,
        diff: facts.diff,
        truncated: facts.truncated,
        recentSubjects: facts.recentSubjects,
        locale: payload.locale,
        config: config.commit,
        signal,
        logger
      });
      return {
        message: draft.message,
        source: draft.source,
        model: draft.model,
        ...draft.error === void 0 ? {} : { error: draft.error }
      };
    },
    /** Start one stacked action and answer its id. */
    async startAction(payload) {
      const action = payload.action;
      if (!["commit", "push", "create_pr", "commit_push", "commit_push_pr"].includes(action)) {
        throw new CommandError("input/invalid", `Unknown action "${String(action)}"`);
      }
      const now = Date.now();
      for (const [id, entry] of actions) {
        if (entry.finishedAt !== null && now - entry.finishedAt > ACTION_RETENTION_MS) actions.delete(id);
      }
      const actionId = randomUUID();
      const progress = {
        actionId,
        action,
        status: "running",
        phases: [],
        phase: null,
        label: "Starting\xE2\u20AC\xA6",
        startedAt: Date.now(),
        finishedAt: null,
        output: [],
        result: null,
        error: null,
        controller: new AbortController()
      };
      actions.set(actionId, progress);
      void runStackedAction(progress, payload).catch((error) => {
        progress.status = "failed";
        progress.error = failureOf(error);
        progress.finishedAt = Date.now();
      });
      return { actionId };
    },
    /** Where one action stands. */
    async actionState(payload) {
      const actionId = requiredString(payload.actionId, "actionId");
      const progress = actions.get(actionId);
      if (progress === void 0) {
        throw new CommandError("action/unknown", "That Git action is no longer running.");
      }
      if (progress.finishedAt !== null && Date.now() - progress.finishedAt > ACTION_RETENTION_MS) {
        actions.delete(actionId);
        throw new CommandError("action/expired", "That Git action finished a while ago.");
      }
      const { controller: _controller, ...view } = progress;
      return view;
    },
    /** What the code host can offer for this repository. */
    async forge(payload, signal) {
      const { root } = await repository(payload, signal);
      const context = await readContext(runner, { root, config, signal });
      return {
        branch: context.branch,
        remote: context.remote,
        forge: await describeForge(context.remote, root, signal)
      };
    },
    /** Open, closed, merged, or all change requests. */
    async pulls(payload, signal) {
      const { root } = await repository(payload, signal);
      const context = await readContext(runner, { root, config, signal });
      const state2 = ["open", "closed", "merged", "draft", "all"].includes(String(payload.state)) ? String(payload.state) : "open";
      const limit = clampLimit(payload.limit, config.pullLimit, 100);
      return await forge.listPulls({
        root,
        remote: context.remote,
        state: state2,
        limit,
        signal,
        refresh: payload.refresh === true
      });
    },
    /** One change request with checks, reviews, and comments. */
    async pullRequest(payload, signal) {
      const { root } = await repository(payload, signal);
      const context = await readContext(runner, { root, config, signal });
      return await forge.pullDetail({
        root,
        remote: context.remote,
        number: requiredNumber(payload.number, "number"),
        signal,
        refresh: payload.refresh === true
      });
    },
    /** The change request whose head is the checked-out branch. */
    async branchPull(payload, signal) {
      const { root } = await repository(payload, signal);
      const context = await readContext(runner, { root, config, signal });
      const branch = typeof payload.branch === "string" && payload.branch.length > 0 ? payload.branch : context.branch;
      return await forge.pullForBranch({
        root,
        remote: context.remote,
        branch: branch ?? "",
        signal,
        refresh: payload.refresh === true
      });
    },
    /** Open or closed issues. */
    async issues(payload, signal) {
      const { root } = await repository(payload, signal);
      const context = await readContext(runner, { root, config, signal });
      const state2 = ["open", "closed", "all"].includes(String(payload.state)) ? String(payload.state) : "open";
      const limit = clampLimit(payload.limit, config.issueLimit, 100);
      return await forge.listIssues({
        root,
        remote: context.remote,
        state: state2,
        limit,
        signal,
        refresh: payload.refresh === true
      });
    },
    /** One issue with its comments. */
    async issue(payload, signal) {
      const { root } = await repository(payload, signal);
      const context = await readContext(runner, { root, config, signal });
      return await forge.issueDetail({
        root,
        remote: context.remote,
        number: requiredNumber(payload.number, "number"),
        signal,
        refresh: payload.refresh === true
      });
    },
    /**
     * Create a change request for the checked-out branch: push it, draft the
     * title and description with the Session's model, then open it on the code
     * host and bind it to the Session for merge tracking.
     */
    async createPull(payload, signal) {
      const { root } = await repository(payload, signal);
      const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
      const context = await readContext(runner, { root, config, signal });
      if (context.branch === null) {
        throw new CommandError("pr/detached", "A detached HEAD cannot open a pull request.");
      }
      if (context.remote === null) {
        throw new CommandError("pr/no-remote", "The repository has no remote, so it cannot open a pull request.");
      }
      if (payload.push === true) {
        await pushCurrentBranch(runner, {
          root,
          remote: context.remote.name,
          branch: context.branch,
          timeoutMs: config.worktreeTimeoutMs,
          signal
        });
      }
      const pr = await createPullForBranch({
        root,
        sessionId,
        payload,
        branch: context.branch,
        remote: context.remote,
        signal
      });
      return {
        pull: {
          number: pr.number ?? null,
          url: pr.url ?? "",
          title: pr.title ?? "",
          base: pr.base ?? "",
          head: pr.head ?? context.branch
        },
        title: pr.title ?? "",
        body: "",
        draft: { source: "model", model: null, error: null },
        watched: sessionId.length > 0 && typeof pr.number === "number"
      };
    },
    /** Publish the repository to a code host, so it gains its first remote. */
    async publish(payload, signal) {
      const { root } = await repository(payload, signal);
      const provider = payload.provider === "gitlab" ? "gitlab" : "github";
      const repositoryName = requiredString(payload.repository, "repository");
      const visibility = payload.visibility === "public" ? "--public" : "--private";
      const program = config.cliPath.length > 0 ? config.cliPath : provider === "github" ? "gh" : "glab";
      if (provider === "github") {
        const result = await runner.run(program, [
          "repo",
          "create",
          repositoryName,
          "--source",
          root,
          "--remote",
          "origin",
          "--push",
          visibility
        ], { cwd: root, signal, timeoutMs: config.worktreeTimeoutMs, maxBytes: 256 * 1024 });
        if (result.code !== 0) throwWriteFailure2("publish", result);
        return { remote: "origin", url: firstUrl2(result.stdout), pushed: true };
      }
      const created = await runner.run(program, [
        "repo",
        "create",
        repositoryName,
        visibility.slice(2),
        "--remote",
        "origin"
      ], { cwd: root, signal, timeoutMs: config.worktreeTimeoutMs, maxBytes: 256 * 1024 });
      if (created.code !== 0) throwWriteFailure2("publish", created);
      const context = await readContext(runner, { root, config, signal });
      if (context.branch !== null) {
        await pushCurrentBranch(runner, {
          root,
          remote: "origin",
          branch: context.branch,
          timeoutMs: config.worktreeTimeoutMs,
          signal
        });
      }
      return { remote: "origin", url: firstUrl2(created.stdout), pushed: context.branch !== null };
    },
    /**
     * The New Session worktree option: the branches a checkout may start from,
     * and the checkout this Session already has.
     *
     * It answers "not supported" instead of failing, because the Hero renders
     * for every Session, including ones outside a repository.
     */
    async worktreeState(payload, signal) {
      const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
      const base = {
        enabled: config.worktree.enabled === true,
        supported: false,
        reason: null,
        sessionId,
        current: null,
        bases: null,
        project: null
      };
      let directory;
      try {
        directory = sessionDirectory(ctx, sessionId) ?? await directoryFromPayload(payload.cwd);
      } catch {
        return { ...base, reason: "no-directory" };
      }
      const root = await locateRepository(runner, directory, signal);
      if (root === null) return { ...base, reason: "not-a-repository" };
      const mainRoot = await mainWorktreeRoot(root, signal);
      const kind = await readCheckoutKind(runner, { path: mainRoot, signal });
      const remote = await preferredRemote(mainRoot, signal);
      const bases = await readBases(runner, { root: mainRoot, remote, signal });
      if (config.worktree.base.length > 0) bases.defaultBase = config.worktree.base;
      const value = await state();
      if (payload.probe === true) {
        await store.update((current) => {
          current.probe = { at: Date.now(), sessionId, directory, root: mainRoot, supported: true };
        });
      }
      return {
        ...base,
        supported: config.worktree.enabled === true && kind.linked !== true,
        reason: config.worktree.enabled === true ? kind.linked === true ? "linked-project" : null : "disabled",
        repositoryRoot: mainRoot,
        remote,
        sourceDefault: config.worktree.source,
        project: { directory, linked: kind.linked === true },
        bases,
        current: sessionId.length > 0 ? value.worktrees?.[sessionId] ?? null : null
      };
    },
    /**
     * Every checkout of this repository, with the facts the manager needs:
     * which one the Session is in, which the plugin created, and whether it
     * holds uncommitted work.
     */
    async worktrees(payload, signal) {
      const { root } = await repository(payload, signal);
      const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
      const currentPath = sessionDirectory(ctx, sessionId) ?? root;
      const [entries, value] = await Promise.all([
        readWorktrees(runner, { root, signal }),
        state()
      ]);
      const mainRoot = resolve4(entries[0]?.path ?? root);
      const records = /* @__PURE__ */ new Map();
      for (const record of Object.values(value.worktrees ?? {})) {
        if (typeof record?.path === "string") records.set(pathKey(record.path), record);
      }
      const pool = poolDirectory(mainRoot, config.worktree);
      const worktrees = await Promise.all(entries.map(async (entry) => {
        const record = records.get(pathKey(entry.path));
        const entryPath = resolve4(entry.path);
        const changedFiles = entry.bare || entry.prunable ? null : await countChangedFiles(entryPath, signal);
        return {
          path: entryPath,
          branch: entry.branch,
          head: entry.head,
          bare: entry.bare,
          detached: entry.detached,
          locked: entry.locked,
          prunable: entry.prunable,
          current: pathKey(entryPath) === pathKey(currentPath),
          isPool: pathKey(entryPath) !== pathKey(pool) && isInside(pool, entryPath),
          sessionId: record?.sessionId ?? null,
          createdAt: record?.createdAt ?? null,
          changedFiles
        };
      }));
      worktrees.sort((left, right) => {
        if (left.current !== right.current) return left.current ? -1 : 1;
        if (left.isPool !== right.isPool) return left.isPool ? -1 : 1;
        return left.path.localeCompare(right.path);
      });
      return { root: mainRoot, poolDirectory: pool, currentPath, worktrees };
    },
    /**
     * Create one checkout from the manager, optionally moving the Session into
     * it. Unlike the New Session option this accepts a name and a base branch,
     * so a checkout can be prepared before a chat exists.
     */
    async worktreeAdd(payload, signal) {
      const { root } = await repository(payload, signal);
      const mainRoot = await mainWorktreeRoot(root, signal);
      if (config.worktree.enabled !== true) {
        throw new CommandError("worktree/disabled", "The worktree feature is disabled in the configuration");
      }
      const kind = await readCheckoutKind(runner, { path: mainRoot, signal });
      if (kind.linked) {
        throw new CommandError("worktree/linked-project", "The open repository is itself a linked worktree", { root: mainRoot });
      }
      const remote = await preferredRemote(mainRoot, signal);
      const requestedBase = typeof payload.base === "string" ? payload.base.trim() : "";
      const base = requestedBase.length > 0 ? requestedBase : config.worktree.base.length > 0 ? config.worktree.base : await resolveDefaultBase(runner, { root: mainRoot, remote, signal });
      if (base === null) throw new CommandError("worktree/no-base", "Cannot determine the base branch for the worktree");
      const source = payload.source === "remote" ? "remote" : "local";
      const requested = typeof payload.name === "string" ? payload.name.trim() : "";
      const fragment = sanitizeBranchFragment(
        requested.length > 0 ? requested : generatedWorktreeName("", config.worktree.namePrefix)
      ).replace(/\//g, "-");
      if (fragment.length === 0) throw new CommandError("worktree/invalid-name", "A worktree name is required");
      const name2 = await uniqueBranchName(runner, { root: mainRoot, branch: fragment, signal });
      const created = await createWorktree(runner, {
        repoRoot: mainRoot,
        name: name2,
        base,
        source,
        remote: source === "remote" ? remote : "",
        config: config.worktree,
        timeoutMs: config.worktreeTimeoutMs,
        signal
      });
      const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
      const record = {
        ...created,
        base,
        source,
        remote: source === "remote" ? remote : null,
        sessionId,
        createdAt: Date.now()
      };
      let switched = false;
      if (sessionId.length > 0) {
        await store.update((current) => {
          current.worktrees ??= {};
          current.worktrees[sessionId] = record;
        });
        if (payload.switch !== false) {
          try {
            await setSessionDirectory(sessionId, created.path, signal);
            switched = true;
          } catch (error) {
            await removeWorktree(runner, {
              repoRoot: mainRoot,
              path: created.path,
              branch: created.branch,
              deleteBranch: true,
              timeoutMs: config.worktreeTimeoutMs
            }).catch(() => void 0);
            await store.update((current) => {
              if (current.worktrees !== void 0) delete current.worktrees[sessionId];
            }).catch(() => void 0);
            throw error;
          }
        }
      }
      logger.info("git: created worktree %s for %s", created.branch, sessionId.length > 0 ? sessionId : "no Session");
      return { worktree: record, switched };
    },
    /** Move one Session into an existing checkout, or back to the project. */
    async worktreeSwitch(payload, signal) {
      const sessionId = requiredString(payload.sessionId, "sessionId");
      const target = requiredString(payload.path, "path");
      const { root } = await repository(payload, signal);
      const mainRoot = await mainWorktreeRoot(root, signal);
      const entries = await readWorktrees(runner, { root, signal });
      const match = entries.find((entry) => pathKey(entry.path) === pathKey(target));
      if (match === void 0) {
        throw new CommandError("worktree/unknown-path", "That folder is not a worktree of this repository", { path: target });
      }
      if (match.bare) throw new CommandError("worktree/bare", "A bare repository cannot hold a Session");
      const matchPath = resolve4(match.path);
      await setSessionDirectory(sessionId, matchPath, signal);
      await store.update((current) => {
        current.worktrees ??= {};
        const existing = Object.values(current.worktrees).find(
          (record) => typeof record?.path === "string" && pathKey(record.path) === pathKey(matchPath)
        );
        if (existing !== void 0 && pathKey(matchPath) !== pathKey(mainRoot)) {
          current.worktrees[sessionId] = { ...existing, sessionId };
        } else {
          delete current.worktrees[sessionId];
        }
      });
      return { directory: matchPath, branch: match.branch };
    },
    /** Remove one checkout by path, never the main one. */
    async worktreeRemovePath(payload, signal) {
      const target = requiredString(payload.path, "path");
      const { root } = await repository(payload, signal);
      const mainRoot = await mainWorktreeRoot(root, signal);
      if (pathKey(target) === pathKey(mainRoot)) {
        throw new CommandError("worktree/main", "The main checkout cannot be removed");
      }
      const entries = await readWorktrees(runner, { root, signal });
      const match = entries.find((entry) => pathKey(entry.path) === pathKey(target));
      if (match === void 0) {
        throw new CommandError("worktree/unknown-path", "That folder is not a worktree of this repository", { path: target });
      }
      const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
      if (sessionId.length > 0) {
        const current = sessionDirectory(ctx, sessionId);
        if (current !== void 0 && isInside(match.path, current)) {
          await setSessionDirectory(sessionId, mainRoot, signal);
        }
      }
      const result = await removeWorktree(runner, {
        repoRoot: mainRoot,
        path: match.path,
        branch: match.branch,
        deleteBranch: payload.deleteBranch === true,
        force: payload.force === true,
        timeoutMs: config.worktreeTimeoutMs,
        signal
      });
      await store.update((current) => {
        if (current.worktrees === void 0) return;
        for (const [id, record] of Object.entries(current.worktrees)) {
          if (typeof record?.path === "string" && pathKey(record.path) === pathKey(match.path)) delete current.worktrees[id];
        }
      });
      return { removed: result.removed, branchDeleted: result.branchDeleted, directory: resolve4(match.path) };
    },
    /** Forget registrations whose checkout directory disappeared. */
    async worktreePrune(payload, signal) {
      const { root } = await repository(payload, signal);
      const result = await runner.run("git", ["worktree", "prune", "-v"], {
        cwd: root,
        signal,
        timeoutMs: config.worktreeTimeoutMs
      });
      if (result.code !== 0) {
        throw new CommandError("worktree/failed", String(result.stderr ?? "").trim() || "git worktree prune failed");
      }
      const output = `${result.stdout ?? ""}
${result.stderr ?? ""}`;
      const pruned = output.split("\n").filter((line) => /^\s*Removing\b/i.test(line)).length;
      return { pruned };
    },
    /**
     * Create one checkout for a Session and move that Session into it.
     *
     * The checkout starts from a local branch, or from a remote branch after
     * fetching it, so "remote" means the code host's commit rather than
     * whatever this computer last fetched.
     */
    async worktreeCreate(payload, signal) {
      const sessionId = requiredString(payload.sessionId, "sessionId");
      const { directory, root } = await repository(payload, signal);
      const mainRoot = await mainWorktreeRoot(root, signal);
      if (config.worktree.enabled !== true) {
        throw new CommandError("worktree/disabled", "The worktree feature is disabled in the configuration");
      }
      const agent = agentFor(sessionId);
      if (agent === void 0) {
        throw new CommandError("worktree/no-agent", "This Session is not open, so its folder cannot change yet");
      }
      const workingDirectory = ctx.get("workingDirectory");
      if (typeof workingDirectory?.set !== "function") {
        throw new CommandError("worktree/no-working-directory", "This build cannot change a Session folder");
      }
      if (isInside(poolDirectory(mainRoot, config.worktree), directory)) {
        throw new CommandError("worktree/already", "This Session already works in a worktree of this repository", { directory });
      }
      const value = await state();
      const previous = value.worktrees?.[sessionId];
      if (previous !== void 0) {
        throw new CommandError("worktree/already", `This Session already has worktree ${String(previous.branch)}`, { path: previous.path });
      }
      const kind = await readCheckoutKind(runner, { path: mainRoot, signal });
      if (kind.linked) {
        throw new CommandError("worktree/linked-project", "The open repository is itself a linked worktree, so no second one is created", { root: mainRoot });
      }
      const remote = await preferredRemote(mainRoot, signal);
      const requested = typeof payload.base === "string" ? payload.base.trim() : "";
      const base = requested.length > 0 ? requested : config.worktree.base.length > 0 ? config.worktree.base : await resolveDefaultBase(runner, { root: mainRoot, remote, signal });
      if (base === null) throw new CommandError("worktree/no-base", "Cannot determine the base branch for the worktree");
      const source = payload.source === "remote" ? "remote" : "local";
      const name2 = generatedWorktreeName(sessionId, config.worktree.namePrefix);
      const created = await createWorktree(runner, {
        repoRoot: mainRoot,
        name: name2,
        base,
        source,
        remote: source === "remote" ? remote : "",
        config: config.worktree,
        timeoutMs: config.worktreeTimeoutMs,
        signal
      });
      const record = {
        ...created,
        base,
        source,
        remote: source === "remote" ? remote : null,
        sessionId,
        createdAt: Date.now()
      };
      try {
        await workingDirectory.set(agent, created.path, signal);
      } catch (error) {
        await removeWorktree(runner, {
          repoRoot: mainRoot,
          path: created.path,
          branch: created.branch,
          deleteBranch: true,
          timeoutMs: config.worktreeTimeoutMs
        }).catch(() => void 0);
        throw error instanceof CommandError ? error : new CommandError("worktree/failed", `Cannot move the Session into the worktree: ${messageOf5(error)}`);
      }
      await store.update((current) => {
        current.worktrees ??= {};
        current.worktrees[sessionId] = record;
      });
      logger.info("git: %s now works in worktree %s", sessionId, created.branch);
      return { worktree: record };
    },
    /** Remove the checkout this plugin created for a Session and return it to the project. */
    async worktreeRemove(payload, signal) {
      const sessionId = requiredString(payload.sessionId, "sessionId");
      const value = await state();
      const record = value.worktrees?.[sessionId];
      if (record === void 0) {
        throw new CommandError("worktree/unknown", "This Session has no worktree created by the plugin");
      }
      const repoRoot = String(record.repositoryRoot ?? "");
      const result = await removeWorktree(runner, {
        repoRoot,
        path: String(record.path ?? ""),
        branch: record.branch,
        deleteBranch: payload.deleteBranch === true,
        timeoutMs: config.worktreeTimeoutMs,
        signal
      });
      const agent = agentFor(sessionId);
      const workingDirectory = ctx.get("workingDirectory");
      if (agent !== void 0 && repoRoot.length > 0 && typeof workingDirectory?.set === "function") {
        await workingDirectory.set(agent, repoRoot, signal).catch(() => void 0);
      }
      await store.update((current) => {
        current.worktrees ??= {};
        delete current.worktrees[sessionId];
      });
      return { removed: result.removed, branchDeleted: result.branchDeleted, directory: repoRoot };
    },
    /** The merge-cleanup settings this composition runs with. */
    async mergeSettings() {
      const value = await state();
      return {
        ...config.merged,
        cleanup: config.worktree.cleanup,
        cleanupLast: value.cleanup ?? null,
        writable: typeof ctx.get("configEditor")?.edit === "function"
      };
    },
    /**
     * Persist one merge-cleanup change into the profile's plugin row.
     *
     * The profile patch is written through the configuration editor, so the
     * change survives a restart and applies through the normal Loader path.
     */
    async mergeSettingsSet(payload) {
      const editor = ctx.get("configEditor");
      if (editor === void 0 || typeof editor.edit !== "function" || typeof editor.entries !== "function") {
        throw new CommandError("config/unavailable", "This build cannot edit configuration from the UI");
      }
      const entry = editor.entries().find((item) => item?.options?.name === "@local/personal-hub");
      if (entry === void 0) {
        throw new CommandError("config/unknown-entry", "The plugin row is missing from this profile configuration");
      }
      const next = {
        ...config.merged,
        ...typeof payload.enabled === "boolean" ? { enabled: payload.enabled } : {},
        ...typeof payload.removeWorktree === "boolean" ? { removeWorktree: payload.removeWorktree } : {},
        ...typeof payload.deleteBranch === "boolean" ? { deleteBranch: payload.deleteBranch } : {},
        ...typeof payload.archiveSession === "boolean" ? { archiveSession: payload.archiveSession } : {}
      };
      const requestedCleanup = payload.cleanup !== null && typeof payload.cleanup === "object" ? payload.cleanup : {};
      const nextCleanup = {
        ...config.worktree.cleanup,
        ...typeof requestedCleanup.enabled === "boolean" ? { enabled: requestedCleanup.enabled } : {},
        ...typeof requestedCleanup.whenNoCommits === "boolean" ? { whenNoCommits: requestedCleanup.whenNoCommits } : {},
        ...typeof requestedCleanup.deleteBranch === "boolean" ? { deleteBranch: requestedCleanup.deleteBranch } : {},
        ...Number.isFinite(Number(requestedCleanup.inactiveDays)) ? { inactiveDays: Number(requestedCleanup.inactiveDays) } : {},
        ...["tracked", "any", "none"].includes(String(requestedCleanup.keepChanges)) ? { keepChanges: String(requestedCleanup.keepChanges) } : {}
      };
      await editor.edit(entry, (current) => {
        const row = current !== null && typeof current === "object" ? current : {};
        const git = row.git !== null && typeof row.git === "object" ? row.git : {};
        const worktree = git.worktree !== null && typeof git.worktree === "object" ? git.worktree : {};
        return {
          ...row,
          git: {
            ...git,
            merged: {
              ...git.merged !== null && typeof git.merged === "object" ? git.merged : {},
              enabled: next.enabled === true,
              removeWorktree: next.removeWorktree !== false,
              deleteBranch: next.deleteBranch === true,
              archiveSession: next.archiveSession !== false
            },
            worktree: {
              ...worktree,
              cleanup: {
                ...worktree.cleanup !== null && typeof worktree.cleanup === "object" ? worktree.cleanup : {},
                enabled: nextCleanup.enabled === true,
                inactiveDays: nextCleanup.inactiveDays,
                whenNoCommits: nextCleanup.whenNoCommits === true,
                keepChanges: nextCleanup.keepChanges,
                deleteBranch: nextCleanup.deleteBranch === true
              }
            }
          }
        };
      });
      return { merged: next, cleanup: nextCleanup };
    },
    /** The worktree cleanup rules and what the last pass did. */
    async cleanupState() {
      const value = await state();
      return { settings: config.worktree.cleanup, last: value.cleanup ?? null };
    },
    /** Run one cleanup pass now, whatever the schedule says. */
    async cleanupRun() {
      const before = (await state()).cleanup ?? null;
      if (config.worktree.cleanup.enabled !== true) {
        return { ran: false, reason: "disabled", last: before };
      }
      const last = await cleanup.runOnce();
      return { ran: true, last: last ?? before };
    }
  };
  async function dispatch(endpoint, payload, signal) {
    const handler = handlers[endpoint];
    if (typeof handler !== "function") {
      return failure("input/unknown-endpoint", `Unknown Git action "${String(endpoint)}"`);
    }
    try {
      return { ok: true, value: await handler(payload, signal) };
    } catch (error) {
      if (error instanceof CommandError) {
        logger.warn("git: %s failed: %s", endpoint, error.message);
        return failure(error.code, error.message, error.details);
      }
      logger.error("git: %s crashed: %s", endpoint, messageOf5(error));
      return failure("system/failed", messageOf5(error));
    }
  }
  async function repository(payload, signal) {
    const directory = sessionDirectory(ctx, payload.sessionId) ?? await directoryFromPayload(payload.cwd);
    const root = await locateRepository(runner, directory, signal);
    if (root === null) {
      throw new CommandError("git/not-a-repository", `The folder ${directory} is not inside a Git repository`, { cwd: directory });
    }
    return { directory, root };
  }
  async function describeForge(remote, root, signal) {
    try {
      return await forge.describe({ root, remote, signal });
    } catch (error) {
      return {
        provider: remote?.provider ?? "none",
        available: false,
        backend: null,
        cli: null,
        reason: messageOf5(error)
      };
    }
  }
  const disposers = [];
  for (const endpoint of Object.keys(handlers)) {
    const route = {
      path: `${GIT_PATH_PREFIX}/${endpoint}`,
      methods: ["POST"],
      requestBody: "buffered",
      fetch: async (request) => {
        const payload = await readPayload(request);
        if (payload === void 0) {
          return jsonResponse({ ok: false, error: { code: "input/invalid", message: "The request body is not valid JSON" } });
        }
        return jsonResponse(await dispatch(endpoint, payload, request.signal));
      }
    };
    try {
      disposers.push(connection.fetch.register(route));
    } catch (error) {
      logger.error("git: cannot register %s: %s", route.path, messageOf5(error));
    }
  }
  if (disposers.length === 0) {
    logger.error("git: no route could be registered, so the git panel has no bridge");
  } else {
    logger.info("git: %d routes are open under %s for this browser", disposers.length, GIT_PATH_PREFIX);
  }
  watcher.start();
  cleanup.start();
  let stopNaming;
  if (typeof ctx.on === "function" && config.worktree.naming === "semantic") {
    try {
      stopNaming = ctx.on("agent/inbox/inserted", (payload) => {
        const inserted = payload;
        const sessionId = inserted?.agent?.session?.id;
        if (typeof sessionId !== "string" || sessionId.length === 0) return;
        void nameWorktreeFromMessage(sessionId, inserted.message).catch(() => void 0);
      });
    } catch (error) {
      logger.warn("git: cannot watch for the first message: %s", messageOf5(error));
    }
  }
  void store.update((value) => {
    value.runtime = { mountedAt: Date.now(), routes: disposers.length, backend: runner.backend };
  }).catch(() => void 0);
  return () => {
    watcher.stop();
    cleanup.stop();
    for (const progress of actions.values()) {
      try {
        progress.controller.abort();
      } catch {
      }
    }
    actions.clear();
    if (typeof stopNaming === "function") {
      try {
        stopNaming();
      } catch {
      }
    }
    for (const dispose of disposers.splice(0)) {
      try {
        dispose();
      } catch (error) {
        logger.warn("git: route disposal failed: %s", messageOf5(error));
      }
    }
  };
}
function throwWriteFailure2(operation, result) {
  const reason = classifyGitFailure(result.stderr);
  const friendly = failureReasonMessage(reason);
  throw new CommandError(`git/${operation}`, friendly ?? (firstLine3(result.stderr) || `git exited with status ${result.code}`), {
    reason: reason ?? void 0,
    exitCode: result.code
  });
}
function firstUrl2(text) {
  const match = /https?:\/\/[^\s]+/.exec(String(text ?? ""));
  return match === null ? null : match[0];
}
function firstLine3(text) {
  return String(text ?? "").split("\n").map((line) => line.trim()).find((line) => line.length > 0) ?? "";
}
async function readPayload(request) {
  let text;
  try {
    text = await request.text();
  } catch {
    return void 0;
  }
  if (text.trim().length === 0) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed !== null && typeof parsed === "object" ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
function sessionDirectory(ctx, sessionId) {
  if (typeof sessionId !== "string" || sessionId.length === 0) return void 0;
  const agents = ctx.get("agents");
  const agent = typeof agents?.get === "function" ? agents.get(sessionId) : void 0;
  const sessions = ctx.get("sessions");
  const session = agent?.session ?? (typeof sessions?.get === "function" ? sessions.get(sessionId) : void 0);
  const workingDirectory = ctx.get("workingDirectory");
  if (session !== void 0 && typeof workingDirectory?.get === "function") {
    try {
      const effective = workingDirectory.get(session);
      if (typeof effective === "string" && effective.length > 0) return effective;
    } catch {
    }
  }
  const fromAgent = agent?.session?.header?.cwd;
  if (typeof fromAgent === "string" && fromAgent.length > 0) return fromAgent;
  const fromSession = session?.header?.cwd;
  if (typeof fromSession === "string" && fromSession.length > 0) return fromSession;
  return void 0;
}
async function directoryFromPayload(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CommandError("git/no-directory", "Cannot determine this Session working folder");
  }
  const directory = value.trim();
  if (!isAbsolute3(directory)) {
    throw new CommandError("input/invalid", "The folder must be an absolute path", { cwd: directory });
  }
  try {
    const info = await stat4(directory);
    if (!info.isDirectory()) throw new CommandError("git/no-directory", `${directory} is not a folder`, { cwd: directory });
  } catch (error) {
    if (error instanceof CommandError) throw error;
    throw new CommandError("git/no-directory", `Cannot open the folder ${directory}`, { cwd: directory });
  }
  return directory;
}
async function storedToken(ctx) {
  const credentials = ctx.get("credentials");
  if (credentials === void 0 || typeof credentials.resolve !== "function") return void 0;
  const hit = await credentials.resolve(GITHUB_CREDENTIAL_REF);
  return typeof hit?.value === "string" ? hit.value : void 0;
}
function requiredString(value, name2) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CommandError("input/invalid", `Missing the ${name2} argument`);
  }
  return value.trim();
}
function stringList(value, name2) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CommandError("input/invalid", `The ${name2} argument must be a non-empty list`);
  }
  return value.map((item) => String(item)).filter((item) => item.length > 0);
}
function requiredNumber(value, name2) {
  const numeric = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new CommandError("input/invalid", `The ${name2} argument is not a positive number`);
  }
  return Math.round(numeric);
}
function clampLimit(value, configured, hard) {
  const fallback = Number(configured) || 20;
  const numeric = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.min(hard, Math.round(numeric));
}
function failure(code, message2, details) {
  return { ok: false, error: { code, message: message2, ...details === void 0 ? {} : { details } } };
}
function failureOf(error) {
  return error instanceof CommandError ? { code: error.code, message: error.message } : { code: "system/failed", message: messageOf5(error) };
}
function messageOf5(error) {
  return error instanceof Error ? error.message : String(error);
}
function textOfUserMessage(message2) {
  const content = message2?.content;
  if (!Array.isArray(content)) return "";
  return content.filter((block) => block?.type === "text" && typeof block.text === "string").map((block) => block.text).join(" ").trim();
}

// src/features/telegram-remote.ts
import { randomUUID as randomUUID2 } from "node:crypto";
import { mkdir as mkdir3, readFile as readFile3 } from "node:fs/promises";
import { join as join5 } from "node:path";

// src/lib/telegram-api.ts
var API_BASE = "https://api.telegram.org";
var TelegramError = class extends Error {
  /** Bot API method that failed. */
  method;
  /** HTTP status code. */
  status;
  /** Bot API description or transport message. */
  description;
  /** Seconds the Bot API asked the caller to wait. */
  retryAfter;
  constructor(method, status, description, retryAfter) {
    super(`${method} failed (${status}): ${description}`);
    this.name = "TelegramError";
    this.method = method;
    this.status = status;
    this.description = description;
    this.retryAfter = retryAfter;
  }
};
function isTokenFailure(error) {
  return error instanceof TelegramError && (error.status === 401 || error.status === 404);
}
var TelegramApi = class {
  #token;
  #fetch;
  /**
   * @param token Bot token from BotFather.
   * @param options `fetchImpl` overrides the platform `fetch`.
   */
  constructor(token, options = {}) {
    if (typeof token !== "string" || token.trim().length === 0) throw new Error("Telegram bot token is empty");
    this.#token = token.trim();
    const impl = options.fetchImpl ?? globalThis.fetch;
    if (typeof impl !== "function") throw new Error("This runtime provides no fetch implementation");
    this.#fetch = impl;
  }
  /** Masked bot identity for logs and status files. */
  get tokenFingerprint() {
    const [, id = "", secret = ""] = this.#token.split(":");
    return `bot${id}:${"*".repeat(Math.max(0, secret.length - 4))}${secret.slice(-4)}`;
  }
  async #call(method, params = {}, signal) {
    let response;
    try {
      response = await this.#fetch(`${API_BASE}/bot${this.#token}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(params),
        signal
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new TelegramError(method, 0, error instanceof Error ? error.message : String(error));
    }
    let body;
    try {
      body = await response.json();
    } catch {
      body = void 0;
    }
    if (!body || body.ok !== true) {
      const description = body?.description ?? `HTTP ${response.status}`;
      const retryAfter = body?.parameters?.retry_after;
      throw new TelegramError(method, response.status, description, retryAfter);
    }
    return body.result;
  }
  getMe(signal) {
    return this.#call("getMe", {}, signal);
  }
  /**
   * Long-poll for updates.
   * @param options offset, poll timeout, and the update kinds to receive
   */
  getUpdates(options = {}, signal) {
    const { offset, timeoutSeconds = 25, allowedUpdates = ["message", "callback_query"] } = options;
    return this.#call("getUpdates", {
      offset,
      timeout: timeoutSeconds,
      allowed_updates: allowedUpdates
    }, signal);
  }
  sendMessage(chatId, text, options = {}, signal) {
    const { replyToMessageId, disablePreview = true, keyboard } = options;
    return this.#call("sendMessage", {
      chat_id: chatId,
      text,
      disable_web_page_preview: disablePreview,
      ...replyToMessageId === void 0 ? {} : { reply_to_message_id: replyToMessageId },
      ...keyboard === void 0 ? {} : { reply_markup: keyboard }
    }, signal);
  }
  editMessageText(chatId, messageId, text, options = {}, signal) {
    const { disablePreview = true, keyboard } = options;
    return this.#call("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      disable_web_page_preview: disablePreview,
      ...keyboard === void 0 ? {} : { reply_markup: keyboard }
    }, signal);
  }
  /** Acknowledge a tapped inline button; the tap keeps spinning until this answers. */
  answerCallbackQuery(callbackQueryId, options = {}, signal) {
    const { text, showAlert = false } = options;
    return this.#call("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      ...text === void 0 ? {} : { text },
      ...showAlert ? { show_alert: true } : {}
    }, signal);
  }
  /** Remove a message; the status placeholder is deleted once the turn ends. */
  deleteMessage(chatId, messageId, signal) {
    return this.#call("deleteMessage", {
      chat_id: chatId,
      message_id: messageId
    }, signal);
  }
  sendChatAction(chatId, action = "typing", signal) {
    return this.#call("sendChatAction", { chat_id: chatId, action }, signal);
  }
  setMyCommands(commands, signal) {
    return this.#call("setMyCommands", { commands }, signal);
  }
};

// src/lib/text.ts
var SAFE_MESSAGE_LIMIT = 3800;
function chunkText(text, limit = SAFE_MESSAGE_LIMIT) {
  const source = typeof text === "string" ? text : String(text ?? "");
  if (source.trim().length === 0) return [];
  if (limit <= 0) throw new RangeError("limit must be positive");
  const chunks = [];
  let rest = source;
  while (rest.length > limit) {
    let cut = -1;
    const window = rest.slice(0, limit);
    for (const marker of ["\n\n", "\n", " "]) {
      const at = window.lastIndexOf(marker);
      if (at > limit * 0.5) {
        cut = at + marker.length;
        break;
      }
    }
    if (cut <= 0) cut = safeCut(rest, limit);
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.length > 0) chunks.push(rest);
  return chunks.filter((chunk) => chunk.length > 0);
}
function safeCut(text, limit) {
  const code = text.charCodeAt(limit - 1);
  return code >= 55296 && code <= 56319 ? limit - 1 : limit;
}
function parseCommand(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  const withoutSlash = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  const space = withoutSlash.search(/\s/);
  const head = (space < 0 ? withoutSlash : withoutSlash.slice(0, space)).split("@")[0].toLowerCase();
  const argument = space < 0 ? "" : withoutSlash.slice(space + 1).trim();
  return { name: head, argument };
}

// src/lib/turn-report.ts
var RESPONSE_LABEL = "\u{1F4AC}";
var CHANGES_LABEL = "\u{1F527} Thay \u0111\u1ED5i ch\xEDnh";
var FINAL_LABEL = "\u2705";
var MAX_CHANGE_ITEMS = 15;
var MAX_COMMAND_CHARS = 120;
var MAX_PATH_CHARS = 80;
var MAX_DIFF_CELLS = 25e4;
var SHELL_TOOL_NAMES = /* @__PURE__ */ new Set(["bash", "pwsh"]);
function assistantText(event) {
  const content = event?.data?.message?.content;
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const block of content) {
    if (block?.type === "text" && typeof block.text === "string" && block.text.trim().length > 0) {
      parts.push(block.text);
    }
  }
  return parts.join("\n").trim();
}
function isAppendEvent(event) {
  return event?.surfaceOp === void 0 || event.surfaceOp === "append";
}
function toolChangeEntry(event) {
  const data = event?.data;
  const name2 = typeof data?.name === "string" ? data.name : "";
  const callId = typeof data?.callId === "string" ? data.callId : "";
  if (name2.length === 0 || callId.length === 0) return null;
  const args = parseArguments(data?.arguments);
  if (name2 === "edit" || name2 === "write" || name2 === "str_replace_editor") {
    const path = firstString(args.file_path, args.path, args.file);
    if (path.length === 0) return null;
    return { callId, kind: "file", tool: name2, files: [{ path, added: 0, deleted: 0 }], failed: false };
  }
  if (name2 === "apply_patch") {
    const paths = patchPaths(firstString(args.input, args.patch));
    if (paths.length === 0) return null;
    return { callId, kind: "file", tool: name2, files: paths.map((path) => ({ path, added: 0, deleted: 0 })), failed: false };
  }
  if (SHELL_TOOL_NAMES.has(name2)) {
    const command = firstString(args.command, args.cmd, args.input).trim();
    if (command.length === 0) return null;
    return { callId, kind: "command", tool: name2, command, failed: false };
  }
  return null;
}
function applyToolResult(entry, event) {
  if (!entry) return;
  if (event?.data?.message?.isError === true) entry.failed = true;
  const diffs = event?.data?.meta?.diffs;
  if (entry.kind !== "file" || !Array.isArray(diffs)) return;
  const files = [];
  for (const diff of diffs) {
    const record = diff;
    if (!record || typeof record.path !== "string" || record.path.length === 0) continue;
    const stats = lineStats(record.oldText, record.newText);
    files.push({
      path: record.path,
      added: stats?.added ?? 0,
      deleted: stats?.removed ?? 0
    });
  }
  if (files.length > 0) entry.files = files;
}
function formatChangeSummary(summary) {
  const files = Array.isArray(summary?.files) ? summary.files : [];
  if (files.length === 0) return "";
  const reportedTotal = summary?.total;
  const total = isFiniteNumber(reportedTotal) ? reportedTotal : files.length;
  const reportedAdded = summary?.added;
  const added = isFiniteNumber(reportedAdded) ? reportedAdded : files.reduce((sum, file) => {
    const value = file?.added;
    return sum + (isFiniteNumber(value) ? value : 0);
  }, 0);
  const reportedDeleted = summary?.deleted;
  const deleted = isFiniteNumber(reportedDeleted) ? reportedDeleted : files.reduce((sum, file) => {
    const value = file?.deleted;
    return sum + (isFiniteNumber(value) ? value : 0);
  }, 0);
  const lines = [`${CHANGES_LABEL} \xB7 ${total} t\u1EC7p (+${added} \u2212${deleted})`];
  for (const file of files.slice(0, MAX_CHANGE_ITEMS)) {
    const path = displayPath(file?.display ?? file?.path);
    const fileAdded = file?.added;
    const fileDeleted = file?.deleted;
    const stats = file?.binary ? " (nh\u1ECB ph\xE2n)" : file?.oversized ? " (qu\xE1 l\u1EDBn)" : ` (+${isFiniteNumber(fileAdded) ? fileAdded : 0} \u2212${isFiniteNumber(fileDeleted) ? fileDeleted : 0})`;
    lines.push(`\u2022 ${path}${stats}`);
  }
  if (total > lines.length - 1) lines.push(`\u2026 v\xE0 ${total - (lines.length - 1)} t\u1EC7p kh\xE1c`);
  return lines.join("\n");
}
function formatFallbackChanges(entries, options = {}) {
  const files = /* @__PURE__ */ new Map();
  const commands = [];
  const commandKeys = /* @__PURE__ */ new Set();
  for (const entry of entries ?? []) {
    if (!entry) continue;
    if (entry.kind === "command") {
      const command = shortCommand(entry.command);
      const key = `${entry.failed ? "1" : "0"}:${command}`;
      if (commandKeys.has(key)) continue;
      commandKeys.add(key);
      commands.push({ command, failed: entry.failed === true });
      continue;
    }
    for (const file of entry.files ?? []) {
      if (typeof file?.path !== "string" || file.path.length === 0) continue;
      const key = file.path;
      const current = files.get(key) ?? { path: key, added: 0, deleted: 0, failed: false };
      current.added += Number.isFinite(file.added) ? file.added : 0;
      current.deleted += Number.isFinite(file.deleted) ? file.deleted : 0;
      current.failed = current.failed || entry.failed === true;
      files.set(key, current);
    }
  }
  const items = [];
  for (const file of files.values()) {
    const stats = file.added + file.deleted > 0 ? ` (+${file.added} \u2212${file.deleted})` : "";
    items.push(`\u2022 ${displayPath(file.path, options.cwd)}${stats}${file.failed ? " \u274C" : ""}`);
  }
  for (const command of commands) {
    items.push(`\u2022 \u25B6 ${command.command}${command.failed ? " \u274C" : ""}`);
  }
  if (items.length === 0) return "";
  const shown = items.slice(0, MAX_CHANGE_ITEMS);
  const lines = [CHANGES_LABEL, ...shown];
  if (items.length > shown.length) lines.push(`\u2026 v\xE0 ${items.length - shown.length} m\u1EE5c kh\xE1c`);
  return lines.join("\n");
}
function lineStats(before, after) {
  const hasBefore = typeof before === "string";
  const hasAfter = typeof after === "string";
  if (!hasBefore && !hasAfter) return { added: 0, removed: 0 };
  if (!hasBefore) return { added: countLines2(after), removed: 0 };
  if (!hasAfter) return { added: 0, removed: countLines2(before) };
  const oldLines = splitLines(before);
  const newLines = splitLines(after);
  if (oldLines.length === 0) return { added: newLines.length, removed: 0 };
  if (newLines.length === 0) return { added: 0, removed: oldLines.length };
  if (oldLines.length * newLines.length > MAX_DIFF_CELLS) return null;
  const common = commonLineCount(oldLines, newLines);
  return { added: newLines.length - common, removed: oldLines.length - common };
}
function createTurnReporter(options) {
  const {
    send,
    updateStatus = async () => {
    },
    resolveChanges,
    config = {},
    placeholder = "\u23F3 \u0110ang x\u1EED l\xFD\u2026",
    cwd = "",
    onError = () => {
    }
  } = options ?? {};
  const pushResponses = config.pushResponses !== false;
  const pushChanges = config.pushChanges !== false;
  const interval = Math.max(250, Number(config.progressIntervalMs) || 1500);
  const pending = [];
  const entries = /* @__PURE__ */ new Map();
  let latestSummary;
  let responses = 0;
  let lastStatus = placeholder;
  let statusAt = 0;
  async function safeSend(text) {
    try {
      await send(text);
      return true;
    } catch (error) {
      onError(error);
      return false;
    }
  }
  async function flush(keepLast) {
    if (pending.length === 0) return;
    const count = keepLast ? Math.max(0, pending.length - 1) : pending.length;
    const texts = pending.splice(0, count);
    if (!pushResponses) return;
    for (const text of texts) {
      if (await safeSend(`${RESPONSE_LABEL} ${text}`)) responses += 1;
    }
  }
  return {
    /** Fold one committed Session event into the turn's chat narration. */
    async handle(event) {
      if (!event || typeof event.type !== "string") return;
      if (event.type === "assistant/message") {
        if (!isAppendEvent(event)) return;
        const text = assistantText(event);
        if (text.length === 0) return;
        await flush(false);
        pending.push(text);
        return;
      }
      if (event.type === "tool/call") {
        await flush(false);
        const entry = toolChangeEntry(event);
        if (entry?.callId) entries.set(entry.callId, entry);
        return;
      }
      if (event.type === "tool/result") {
        const callId = event?.data?.message?.toolCallId;
        const entry = typeof callId === "string" ? entries.get(callId) : void 0;
        if (entry) applyToolResult(entry, event);
        return;
      }
      if (event.type === "workspace/changes") {
        if (!pushChanges) return;
        try {
          const summary = resolveChanges?.(event.seq);
          if (summary) latestSummary = summary;
        } catch (error) {
          onError(error);
        }
      }
    },
    /** Refresh the status placeholder with what the turn has produced so far. */
    async tick() {
      const changeCount = latestSummary?.total ?? latestSummary?.files?.length ?? entries.size;
      if (responses === 0 && changeCount === 0) return;
      if (Date.now() - statusAt < interval) return;
      const parts = [];
      if (responses > 0) parts.push(`${RESPONSE_LABEL} ${responses}`);
      if (changeCount > 0) parts.push(`\u{1F527} ${changeCount}`);
      const text = parts.length > 0 ? `${placeholder} \xB7 ${parts.join(" \xB7 ")}` : placeholder;
      if (text === lastStatus) return;
      statusAt = Date.now();
      lastStatus = text;
      try {
        await updateStatus(text);
      } catch (error) {
        onError(error);
      }
    },
    /**
     * Flush remaining responses and the change message, then return the final
     * answer for the caller to send after retiring the status placeholder.
     */
    async finish() {
      const finalText = pending.length > 0 ? pending.pop() : "";
      await flush(false);
      if (pushChanges) {
        const text = latestSummary !== void 0 ? formatChangeSummary(latestSummary) : formatFallbackChanges([...entries.values()], { cwd });
        if (text.length > 0) await safeSend(text);
      }
      return finalText.trim();
    }
  };
}
function parseArguments(raw) {
  if (raw && typeof raw === "object") return raw;
  if (typeof raw !== "string" || raw.trim().length === 0) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
}
function patchPaths(input) {
  if (input.length === 0) return [];
  const paths = [];
  const seen = /* @__PURE__ */ new Set();
  for (const line of input.split(/\r?\n/)) {
    const match = /^\*\*\* (?:Add|Update|Delete) File:\s*(.+)$/.exec(line) ?? /^\*\*\* Move to:\s*(.+)$/.exec(line);
    if (!match) continue;
    const path = match[1].trim();
    if (path.length === 0 || seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }
  return paths;
}
function displayPath(value, cwd) {
  let text = typeof value === "string" ? value : "";
  if (text.trim().length === 0) return "(kh\xF4ng r\xF5)";
  text = text.replaceAll("\\", "/");
  if (typeof cwd === "string" && cwd.trim().length > 0) {
    const base = cwd.replaceAll("\\", "/").replace(/\/+$/, "");
    if (base.length > 0 && text.toLowerCase().startsWith(`${base.toLowerCase()}/`)) {
      text = text.slice(base.length + 1);
    }
  }
  return shorten(text, MAX_PATH_CHARS);
}
function shortCommand(command) {
  const firstLine4 = String(command ?? "").split(/\r?\n/)[0].trim();
  return shorten(firstLine4, MAX_COMMAND_CHARS);
}
function shorten(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}\u2026`;
}
function countLines2(text) {
  return splitLines(text).length;
}
function splitLines(text) {
  const value = typeof text === "string" ? text : "";
  if (value.length === 0) return [];
  return (value.endsWith("\n") ? value.slice(0, -1) : value).split("\n");
}
function commonLineCount(oldLines, newLines) {
  let previous = new Uint32Array(newLines.length + 1);
  let current = new Uint32Array(newLines.length + 1);
  for (let i = 1; i <= oldLines.length; i += 1) {
    for (let j = 1; j <= newLines.length; j += 1) {
      current[j] = oldLines[i - 1] === newLines[j - 1] ? previous[j - 1] + 1 : Math.max(previous[j], current[j - 1]);
    }
    const swap = previous;
    previous = current;
    current = swap;
    current.fill(0);
  }
  return previous[newLines.length];
}
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// src/features/telegram-remote.ts
var DATA_DIR_NAME = "personal-hub";
var TELEGRAM_DATA_DIR = "telegram-remote";
var PLACEHOLDER = "\u23F3 \u0110ang x\u1EED l\xFD\u2026";
var SESSION_PAGE_SIZE = 8;
var TOKEN_CREDENTIAL_REF = "DSH_TELEGRAM_BOT_TOKEN";
var HELP_TEXT = [
  "\u0110i\u1EC1u khi\u1EC3n DeepSeek Harness t\u1EEB xa.",
  "",
  "G\u1EEDi tin nh\u1EAFn v\u0103n b\u1EA3n \u0111\u1EC3 chuy\u1EC3n th\xE0nh prompt cho phi\xEAn DSH \u0111ang g\u1EAFn v\u1EDBi chat n\xE0y.",
  "M\u1ED7i l\u01B0\u1EE3t tr\u1EA3 l\u1EDDi \u0111\u01B0\u1EE3c \u0111\u1EA9y v\u1EC1 chat th\xE0nh nhi\u1EC1u tin: \u{1F4AC} ph\u1EA3n h\u1ED3i trung gian, \u{1F527} thay \u0111\u1ED5i ch\xEDnh, \u2705 ph\u1EA3n h\u1ED3i cu\u1ED1i.",
  "",
  "/new [th\u01B0-m\u1EE5c] \u2013 t\u1EA1o phi\xEAn m\u1EDBi (m\u1EB7c \u0111\u1ECBnh d\xF9ng workspace ho\u1EB7c th\u01B0 m\u1EE5c \u0111ang ch\u1ECDn)",
  "/sessions [trang] \u2013 li\u1EC7t k\xEA phi\xEAn g\u1EA7n \u0111\xE2y, ch\u1EA1m \u0111\u1EC3 g\u1EAFn ho\u1EB7c l\u01B0u tr\u1EEF",
  "/session <s\u1ED1|sessionId> \u2013 g\u1EAFn chat n\xE0y v\xE0o m\u1ED9t phi\xEAn c\xF3 s\u1EB5n",
  "/archived [trang] \u2013 phi\xEAn \u0111\xE3 l\u01B0u tr\u1EEF, ch\u1EA1m \u0111\u1EC3 kh\xF4i ph\u1EE5c",
  "/archive [s\u1ED1|sessionId] \u2013 l\u01B0u tr\u1EEF phi\xEAn (m\u1EB7c \u0111\u1ECBnh phi\xEAn \u0111ang g\u1EAFn)",
  "/restore <s\u1ED1|sessionId> \u2013 kh\xF4i ph\u1EE5c phi\xEAn \u0111\xE3 l\u01B0u tr\u1EEF",
  "/workspaces \u2013 li\u1EC7t k\xEA workspace (c\xF3 n\xFAt b\u1EA5m \u0111\u1EC3 ch\u1ECDn)",
  "/workspace <s\u1ED1|id|\u0111\u01B0\u1EDDng-d\u1EABn> \u2013 ch\u1ECDn workspace cho phi\xEAn m\u1EDBi",
  "/models \u2013 li\u1EC7t k\xEA provider v\xE0 model (c\xF3 n\xFAt b\u1EA5m \u0111\u1EC3 ch\u1ECDn)",
  "/model <s\u1ED1|provider/model[@effort]> \u2013 \u0111\u1ED5i model cho phi\xEAn n\xE0y",
  "/status \u2013 phi\xEAn \u0111ang g\u1EAFn, workspace, model, tr\u1EA1ng th\xE1i ch\u1EA1y",
  "/cancel \u2013 d\u1EEBng l\u01B0\u1EE3t \u0111ang ch\u1EA1y",
  "/unbind \u2013 b\u1ECF g\u1EAFn phi\xEAn, tin nh\u1EAFn sau s\u1EBD t\u1EA1o phi\xEAn m\u1EDBi",
  "/use <sessionId> \u2013 g\u1EAFn chat n\xE0y v\xE0o m\u1ED9t phi\xEAn c\xF3 s\u1EB5n",
  "/whoami \u2013 id chat c\u1EE7a b\u1EA1n",
  "/help \u2013 danh s\xE1ch l\u1EC7nh"
].join("\n");
function mountTelegramRemote(ctx, config, deps) {
  const logger = deps.logger;
  const dataDir = deps.dataDir ?? join5(pluginDataDir(DATA_DIR_NAME), TELEGRAM_DATA_DIR);
  const stateFile = join5(dataDir, "state.json");
  const statusFile = join5(dataDir, "status.json");
  const store = new JsonStateStore(stateFile, {
    version: 1,
    offset: 0,
    allowedChatIds: [],
    bindings: {},
    prefs: {},
    lists: {}
  });
  const controller = new AbortController();
  const chatQueues = /* @__PURE__ */ new Map();
  const activeTurns = /* @__PURE__ */ new Map();
  const turnSinks = /* @__PURE__ */ new Map();
  let observeSessionEvents = typeof ctx.on === "function";
  const fetchImpl = deps.fetchImpl;
  const sessionController = requiredService(ctx, "sessionController");
  const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const staticAllowed = (Array.isArray(config.allowedChatIds) ? config.allowedChatIds : []).map((id) => String(id).trim()).filter((id) => id.length > 0);
  let stopped = false;
  let identity;
  let identityToken = "";
  let currentState = "starting";
  let lastStatusText = "";
  let published = {};
  let lastPollAt = 0;
  logger.info("telegram-remote: mounted, data directory %s", dataDir);
  let detachSessionEvents;
  if (observeSessionEvents) {
    try {
      const register = ctx.on;
      detachSessionEvents = register("session/event", (session, event) => {
        const sessionId = session?.id;
        if (typeof sessionId !== "string" || !event || typeof event.seq !== "number") return;
        const sinks = turnSinks.get(sessionId);
        if (!sinks || sinks.size === 0) return;
        for (const sink of [...sinks]) enqueueSinkEvent(sink, event);
      });
    } catch (error) {
      observeSessionEvents = false;
      logger.warn("telegram-remote: cannot observe session events, falling back to polling: %s", errorMessage2(error));
    }
  }
  async function publishStatus(patch) {
    const patchedState = patch?.state;
    if (typeof patchedState === "string") currentState = patchedState;
    const next = {
      ...published,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      state: currentState,
      tokenSource: published.tokenSource ?? "none",
      lastPollAt: lastPollAt > 0 ? new Date(lastPollAt).toISOString() : published.lastPollAt ?? null,
      lastError: published.lastError ?? null,
      bot: identity ? { id: identity.id, username: identity.username } : published.bot ?? null,
      allowedChatIds: staticAllowed.length > 0 ? staticAllowed : store.state.allowedChatIds ?? [],
      bindings: store.state.bindings ?? {},
      ...patch
    };
    const comparable = JSON.stringify({ ...next, updatedAt: "" });
    if (comparable === lastStatusText) return;
    lastStatusText = comparable;
    published = next;
    try {
      await writeJsonFile(statusFile, next);
    } catch (error) {
      logger.warn("telegram-remote: cannot write status file: %s", errorMessage2(error));
    }
  }
  function sleep(ms) {
    return new Promise((resolve5) => {
      const timer = setTimeout(done, ms);
      function done() {
        clearTimeout(timer);
        controller.signal.removeEventListener("abort", done);
        resolve5();
      }
      controller.signal.addEventListener("abort", done, { once: true });
    });
  }
  async function resolveToken() {
    const fromConfig = typeof config.token === "string" ? config.token.trim() : "";
    if (fromConfig.length > 0) return { token: fromConfig, source: "config" };
    const credentials = ctx.get("credentials");
    if (credentials) {
      try {
        const hit = await credentials.resolve(TOKEN_CREDENTIAL_REF);
        if (typeof hit?.value === "string" && hit.value.trim().length > 0) {
          return { token: hit.value.trim(), source: `credential:${TOKEN_CREDENTIAL_REF}` };
        }
      } catch (error) {
        logger.warn("telegram-remote: cannot read credential: %s", errorMessage2(error));
      }
    }
    const envName = typeof config.tokenEnv === "string" ? config.tokenEnv.trim() : "";
    const fromEnv = envName.length > 0 ? (process.env[envName] ?? "").trim() : "";
    if (fromEnv.length > 0) return { token: fromEnv, source: `env:${envName}` };
    const tokenFile = config.tokenFile ? expandHome(String(config.tokenFile)) : join5(dataDir, "token");
    try {
      const raw = (await readFile3(tokenFile, "utf8")).trim();
      if (raw.length > 0) return { token: raw, source: `file:${tokenFile}` };
    } catch (error) {
      if (error?.code !== "ENOENT") logger.warn("telegram-remote: cannot read token file: %s", errorMessage2(error));
    }
    return { token: "", source: "none", tokenFile };
  }
  function resolveCwd() {
    if (typeof config.cwd === "string" && config.cwd.trim().length > 0) return expandHome(config.cwd.trim());
    const workingDirectory = ctx.get("workingDirectory");
    const defaultDirectory = workingDirectory?.defaultDirectory;
    if (defaultDirectory) return defaultDirectory;
    return process.cwd();
  }
  function isAllowed(chatId) {
    if (staticAllowed.length > 0) return staticAllowed.includes(chatId);
    return (store.state.allowedChatIds ?? []).includes(chatId);
  }
  function canPair() {
    return staticAllowed.length === 0 && (store.state.allowedChatIds ?? []).length === 0;
  }
  async function reply(api, chatId, text, options = {}) {
    const { keyboard, ...rest } = options;
    const chunks = chunkText(text);
    for (let index = 0; index < chunks.length; index += 1) {
      const isLast = index === chunks.length - 1;
      await api.sendMessage(chatId, chunks[index], isLast && keyboard ? { ...rest, keyboard } : rest);
    }
  }
  function cachedList(chatId, kind) {
    return store.state.lists?.[chatId]?.[kind] ?? [];
  }
  async function saveListing(chatId, kind, items) {
    await store.update((state) => {
      const lists = state.lists ?? {};
      state.lists = { ...lists, [chatId]: { ...lists[chatId] ?? {}, [kind]: items } };
    });
  }
  function shorten2(value, max) {
    const text = String(value ?? "");
    return text.length <= max ? text : `${text.slice(0, max - 1)}\u2026`;
  }
  function workspaceKeyboard(chatId, workspaces) {
    const chosen = preferencesOf(chatId).workspaceId;
    return {
      inline_keyboard: workspaces.map((workspace, index) => [{
        text: `${workspace.id === chosen ? "\u2705 " : ""}${index + 1}. ${shorten2(workspace.title, 44)}`,
        callback_data: `w:${index}`
      }])
    };
  }
  function modelKeyboard(chatId, models) {
    const current = preferencesOf(chatId).model;
    const rows = [];
    let row = [];
    models.forEach((entry, index) => {
      const chosen = current?.provider === entry.provider && current?.model === entry.model;
      row.push({
        text: `${chosen ? "\u2705 " : ""}${shorten2(`${entry.provider} \xB7 ${entry.model}`, 46)}`,
        callback_data: `m:${index}`
      });
      if (row.length === 2) {
        rows.push(row);
        row = [];
      }
    });
    if (row.length > 0) rows.push(row);
    return { inline_keyboard: rows };
  }
  async function editQuietly(api, chatId, messageId, text, options = {}) {
    try {
      await api.editMessageText(chatId, messageId, text, options);
    } catch (error) {
      if (error instanceof TelegramError) {
        if (error.status === 400 && /not modified/i.test(error.description)) return;
        if (error.status === 429) {
          await sleep(Math.min(5e3, (error.retryAfter ?? 1) * 1e3));
          return;
        }
      }
      logger.warn("telegram-remote: edit failed: %s", errorMessage2(error));
    }
  }
  async function forgetBinding(chatId) {
    await store.update((state) => {
      if (state.bindings) delete state.bindings[chatId];
    });
  }
  function listWorkspaces() {
    const registry = ctx.get("workspaceRegistry");
    if (!registry || typeof registry.list !== "function") return [];
    try {
      return registry.list().map((workspace) => ({
        id: workspace.id,
        title: workspace.title ?? workspace.path,
        path: workspace.path
      }));
    } catch (error) {
      logger.warn("telegram-remote: cannot list workspaces: %s", errorMessage2(error));
      return [];
    }
  }
  function archiveRegistry() {
    const registry = ctx.get("workspaceRegistry");
    if (!registry) return void 0;
    if (typeof registry.archiveSession !== "function" || typeof registry.unarchiveSession !== "function") return void 0;
    return registry;
  }
  function canArchiveSessions() {
    return archiveRegistry() !== void 0;
  }
  function archivedSessionIds() {
    const registry = ctx.get("workspaceRegistry");
    const ids = registry?.archivedSessionIds;
    return new Set(Array.isArray(ids) ? ids.map((id) => String(id)) : []);
  }
  function shortSessionId(value) {
    const id = String(value ?? "");
    return id.length <= 12 ? id : `#${id.slice(-8)}`;
  }
  function fallbackSessionTitle(cwd, sessionId) {
    if (typeof cwd === "string" && cwd.length > 0) {
      const base = cwd.split(/[\\/]+/).filter((part) => part.length > 0).at(-1);
      if (base) return `Phi\xEAn \u1EDF ${base}`;
    }
    return `Phi\xEAn ${shortSessionId(sessionId)}`;
  }
  function sessionItemOf(summary) {
    const sessionId = String(summary.sessionId);
    const projected = summary.projections?.values?.title;
    const title = typeof projected === "string" ? projected.replace(/\s+/g, " ").trim() : "";
    const cwd = typeof summary.cwd === "string" ? summary.cwd : "";
    return {
      sessionId,
      title: title || fallbackSessionTitle(cwd, sessionId),
      cwd,
      updatedAt: Number.isFinite(summary.updatedAt) ? summary.updatedAt : 0,
      running: summary.running === true,
      blank: summary.blank === true
    };
  }
  async function loadSessionIndex() {
    if (typeof sessionController.list !== "function") {
      throw new Error("B\u1EA3n DSH n\xE0y kh\xF4ng h\u1ED7 tr\u1EE3 li\u1EC7t k\xEA phi\xEAn.");
    }
    let value;
    try {
      value = await sessionController.list({}, controller.signal);
    } catch (error) {
      throw new Error(`Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c danh s\xE1ch phi\xEAn: ${errorMessage2(error)}`);
    }
    const rows = Array.isArray(value?.items) ? value.items : [];
    return rows.filter((summary) => summary && String(summary.sessionId ?? "").length > 0 && summary.origin !== "subagent").map((summary) => sessionItemOf(summary));
  }
  function formatSessionWhen(ms) {
    if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) return "";
    try {
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: clientTimeZone
      }).format(new Date(ms));
    } catch {
      return new Date(ms).toISOString().slice(0, 16).replace("T", " ");
    }
  }
  function sessionPage(items, wanted) {
    const total = Math.max(1, Math.ceil(items.length / SESSION_PAGE_SIZE));
    const current = Math.min(Math.max(1, Number(wanted) || 1), total);
    const offset = (current - 1) * SESSION_PAGE_SIZE;
    return { current, total, offset, entries: items.slice(offset, offset + SESSION_PAGE_SIZE) };
  }
  async function sendOrEdit(api, chatId, text, keyboard, editMessageId) {
    if (editMessageId !== void 0) {
      await editQuietly(api, chatId, editMessageId, text, { keyboard: keyboard ?? { inline_keyboard: [] } });
      return;
    }
    await reply(api, chatId, text, keyboard ? { keyboard } : {});
  }
  function sessionRowKeyboard(chatId, entries, offset) {
    const bound = store.state.bindings?.[chatId]?.sessionId;
    const archive = canArchiveSessions();
    return entries.map((item, index) => {
      const globalIndex = offset + index;
      const marks = `${item.sessionId === bound ? "\u2705 " : ""}${item.running ? "\u25B6\uFE0F " : ""}`;
      const row = [{
        text: `${marks}${globalIndex + 1}. ${shorten2(item.title, 32)}`,
        callback_data: `s:${globalIndex}`
      }];
      if (archive) row.push({ text: "\u{1F4E6}", callback_data: `x:${globalIndex}` });
      return row;
    });
  }
  async function showSessionList(api, chatId, wantedPage = 1, options = {}) {
    const all = Array.isArray(options.items) ? options.items : cachedList(chatId, "sessions");
    if (all.length === 0) {
      await sendOrEdit(
        api,
        chatId,
        "Ch\u01B0a c\xF3 phi\xEAn DSH n\xE0o. G\u1EEDi m\u1ED9t tin nh\u1EAFn ho\u1EB7c /new \u0111\u1EC3 t\u1EA1o phi\xEAn m\u1EDBi.",
        void 0,
        options.editMessageId
      );
      return;
    }
    const page = sessionPage(all, wantedPage);
    const bound = store.state.bindings?.[chatId]?.sessionId;
    const lines = [`\u{1F5C2} Phi\xEAn DSH (trang ${page.current}/${page.total}, ${all.length} phi\xEAn):`, ""];
    page.entries.forEach((item, index) => {
      const globalIndex = page.offset + index;
      const marks = [];
      if (item.sessionId === bound) marks.push("\u2705 \u0111ang g\u1EAFn");
      if (item.running) marks.push("\u25B6\uFE0F \u0111ang ch\u1EA1y");
      if (item.blank) marks.push("tr\u1ED1ng");
      const suffix = marks.length > 0 ? ` \xB7 ${marks.join(" \xB7 ")}` : "";
      lines.push(`${globalIndex + 1}. ${shorten2(item.title, 64)}${suffix}`);
      const when = formatSessionWhen(item.updatedAt);
      lines.push(`   ${shortSessionId(item.sessionId)}${when ? ` \xB7 ${when}` : ""}`);
    });
    lines.push("", "Ch\u1EA1m s\u1ED1 \u0111\u1EC3 g\u1EAFn phi\xEAn n\xE0y; \u{1F4E6} \u0111\u1EC3 l\u01B0u tr\u1EEF.");
    if (!canArchiveSessions()) lines.push("B\u1EA3n DSH n\xE0y kh\xF4ng h\u1ED7 tr\u1EE3 l\u01B0u tr\u1EEF phi\xEAn.");
    const rows = sessionRowKeyboard(chatId, page.entries, page.offset);
    const navigation = [];
    if (page.current > 1) navigation.push({ text: "\u25C0\uFE0F Trang tr\u01B0\u1EDBc", callback_data: `p:${page.current - 1}` });
    if (page.current < page.total) navigation.push({ text: "Trang sau \u25B6\uFE0F", callback_data: `p:${page.current + 1}` });
    if (navigation.length > 0) rows.push(navigation);
    await sendOrEdit(api, chatId, lines.join("\n"), { inline_keyboard: rows }, options.editMessageId);
  }
  async function showArchivedList(api, chatId, wantedPage = 1, options = {}) {
    const all = Array.isArray(options.items) ? options.items : cachedList(chatId, "archived");
    if (all.length === 0) {
      await sendOrEdit(api, chatId, "\u{1F4E6} Kh\xF4ng c\xF3 phi\xEAn n\xE0o \u0111\xE3 l\u01B0u tr\u1EEF.", void 0, options.editMessageId);
      return;
    }
    const page = sessionPage(all, wantedPage);
    const lines = [`\u{1F4E6} Phi\xEAn \u0111\xE3 l\u01B0u tr\u1EEF (trang ${page.current}/${page.total}, ${all.length} phi\xEAn):`, ""];
    const rows = [];
    page.entries.forEach((item, index) => {
      const globalIndex = page.offset + index;
      lines.push(`${globalIndex + 1}. ${shorten2(item.title, 64)}`);
      const when = formatSessionWhen(item.updatedAt);
      lines.push(`   ${shortSessionId(item.sessionId)}${when ? ` \xB7 ${when}` : ""}`);
      rows.push([{
        text: `\u267B\uFE0F ${globalIndex + 1}. ${shorten2(item.title, 32)}`,
        callback_data: `u:${globalIndex}`
      }]);
    });
    lines.push("", "Ch\u1EA1m m\u1ED9t phi\xEAn \u0111\u1EC3 kh\xF4i ph\u1EE5c.");
    if (!canArchiveSessions()) lines.push("B\u1EA3n DSH n\xE0y kh\xF4ng h\u1ED7 tr\u1EE3 kh\xF4i ph\u1EE5c phi\xEAn.");
    const navigation = [];
    if (page.current > 1) navigation.push({ text: "\u25C0\uFE0F Trang tr\u01B0\u1EDBc", callback_data: `P:${page.current - 1}` });
    if (page.current < page.total) navigation.push({ text: "Trang sau \u25B6\uFE0F", callback_data: `P:${page.current + 1}` });
    if (navigation.length > 0) rows.push(navigation);
    await sendOrEdit(api, chatId, lines.join("\n"), { inline_keyboard: rows }, options.editMessageId);
  }
  async function bindSession(chatId, target) {
    if (archivedSessionIds().has(target.sessionId)) {
      throw new Error("Phi\xEAn n\xE0y \u0111ang \u0111\u01B0\u1EE3c l\u01B0u tr\u1EEF. G\u1EEDi /archived r\u1ED3i ch\u1EA1m \u0111\u1EC3 kh\xF4i ph\u1EE5c tr\u01B0\u1EDBc.");
    }
    await readSessionState(target.sessionId);
    await store.update((state) => {
      state.bindings = {
        ...state.bindings ?? {},
        [chatId]: {
          sessionId: target.sessionId,
          ...target.cwd ? { cwd: target.cwd } : {},
          createdAt: Date.now()
        }
      };
    });
  }
  function resolveSessionArgument(chatId, argument, kind) {
    const value = String(argument ?? "").trim();
    if (value.length === 0) return void 0;
    if (/^\d+$/.test(value)) return cachedList(chatId, kind)[Number(value) - 1];
    const normalized = value.replace(/^#/, "");
    const bySuffix = cachedList(chatId, kind).find((item) => item.sessionId.endsWith(normalized));
    return bySuffix ?? { sessionId: value.split(/\s+/)[0], title: "", cwd: "" };
  }
  async function archiveSessionById(sessionId) {
    const registry = archiveRegistry();
    if (!registry) throw new Error("B\u1EA3n DSH n\xE0y kh\xF4ng h\u1ED7 tr\u1EE3 l\u01B0u tr\u1EEF phi\xEAn.");
    try {
      await registry.archiveSession(sessionId);
    } catch (error) {
      if (error?.name === "WorkspaceActiveSessionError" || /session is active/i.test(errorMessage2(error))) {
        throw new Error("Phi\xEAn \u0111ang ch\u1EA1y. G\u1EEDi /cancel r\u1ED3i th\u1EED l\u1EA1i, ho\u1EB7c \u0111\u1EE3i l\u01B0\u1EE3t hi\u1EC7n t\u1EA1i xong.");
      }
      if (error?.name === "WorkspaceUnknownSessionError") {
        throw new Error("Kh\xF4ng t\xECm th\u1EA5y phi\xEAn n\xE0y trong DSH (c\xF3 th\u1EC3 phi\xEAn \u0111\xE3 b\u1ECB xo\xE1).");
      }
      throw error;
    }
  }
  async function unarchiveSessionById(sessionId) {
    const registry = archiveRegistry();
    if (!registry) throw new Error("B\u1EA3n DSH n\xE0y kh\xF4ng h\u1ED7 tr\u1EE3 kh\xF4i ph\u1EE5c phi\xEAn.");
    await registry.unarchiveSession(sessionId);
  }
  async function dropFromListing(chatId, kind, sessionId) {
    await store.update((state) => {
      const current = state.lists?.[chatId]?.[kind];
      if (!Array.isArray(current)) return;
      const remaining = current.filter((item) => {
        const entry = item;
        return entry?.sessionId !== sessionId;
      });
      if (remaining.length === current.length) return;
      const lists = state.lists ?? {};
      state.lists = {
        ...lists,
        [chatId]: { ...lists[chatId] ?? {}, [kind]: remaining }
      };
    });
  }
  function preferencesOf(chatId) {
    return store.state.prefs?.[chatId] ?? {};
  }
  async function savePreferences(chatId, patch) {
    await store.update((state) => {
      const prefs = state.prefs ?? {};
      state.prefs = { ...prefs, [chatId]: { ...prefs[chatId] ?? {}, ...patch } };
    });
  }
  async function applyModel(sessionId, selection) {
    const applied = await sessionController.selectModel({
      sessionId,
      provider: selection.provider,
      model: selection.model,
      ...selection.reasoningEffort ? { reasoningEffort: selection.reasoningEffort } : {}
    }, controller.signal);
    return applied?.selected ?? selection;
  }
  async function createSession(chatId, { cwd, workspaceId } = {}) {
    const prefs = preferencesOf(chatId);
    const wantedWorkspace = workspaceId ?? (cwd ? void 0 : prefs.workspaceId);
    let request;
    if (cwd) request = { cwd };
    else if (wantedWorkspace) request = { workspaceId: wantedWorkspace };
    else request = { cwd: resolveCwd() };
    let note;
    let created;
    try {
      created = await sessionController.create(request);
    } catch (error) {
      if (request.workspaceId === void 0) throw error;
      note = `\u26A0 Kh\xF4ng m\u1EDF \u0111\u01B0\u1EE3c workspace ${request.workspaceId} (${errorMessage2(error)}); \u0111\xE3 d\xF9ng th\u01B0 m\u1EE5c m\u1EB7c \u0111\u1ECBnh.`;
      request = { cwd: resolveCwd() };
      created = await sessionController.create(request);
    }
    const model = prefs.model;
    if (model) {
      try {
        await applyModel(created.sessionId, model);
      } catch (error) {
        note = `${note ? `${note}
` : ""}\u26A0 Kh\xF4ng \u0111\u1EB7t \u0111\u01B0\u1EE3c model ${model.provider}/${model.model}: ${errorMessage2(error)}`;
      }
    }
    const binding = {
      sessionId: created.sessionId,
      ...request.cwd ? { cwd: request.cwd } : {},
      ...request.workspaceId ? { workspaceId: request.workspaceId } : {},
      ...model ? { model } : {},
      createdAt: Date.now()
    };
    await store.update((state) => {
      state.bindings = { ...state.bindings ?? {}, [chatId]: binding };
    });
    return { binding, note };
  }
  function readSessionState(sessionId) {
    return sessionController.state({ sessionId }, controller.signal);
  }
  function flattenModels(catalog) {
    const groups = Array.isArray(catalog?.groups) ? catalog.groups : [];
    return groups.flatMap((group) => (group.models ?? []).map((model) => ({
      provider: group.id,
      providerName: group.name ?? group.id,
      model: model.id,
      modelName: model.name ?? model.id
    })));
  }
  function modelLabel(selection) {
    if (!selection?.provider || !selection?.model) return "m\u1EB7c \u0111\u1ECBnh c\u1EE7a DSH";
    const effort = selection.reasoningEffort ? `@${selection.reasoningEffort}` : "";
    return `${selection.provider}/${selection.model}${effort}`;
  }
  async function loadModelCatalog() {
    try {
      return await sessionController.modelCatalog();
    } catch (error) {
      logger.warn("telegram-remote: cannot read model catalog: %s", errorMessage2(error));
      return { groups: [], failures: [] };
    }
  }
  function resolveWorkspaceArgument(chatId, argument) {
    const all = listWorkspaces();
    const value = argument.trim();
    if (/^\d+$/.test(value)) {
      const cached = cachedList(chatId, "workspaces");
      const pool = cached.length > 0 ? cached : all;
      return pool[Number(value) - 1];
    }
    const lowered = value.toLowerCase();
    const expanded = expandHome(value).toLowerCase();
    return all.find((workspace) => workspace.id === value) ?? all.find((workspace) => workspace.path.toLowerCase() === expanded) ?? all.find((workspace) => workspace.path.toLowerCase().endsWith(lowered)) ?? { id: value, title: value, path: value };
  }
  function resolveModelArgument(chatId, argument, catalog) {
    const value = argument.trim();
    const flat = flattenModels(catalog);
    if (/^\d+$/.test(value)) {
      const cached = cachedList(chatId, "models");
      const pool = cached.length > 0 ? cached : flat;
      return pool[Number(value) - 1];
    }
    const at = value.indexOf("@");
    const head = at < 0 ? value : value.slice(0, at);
    const reasoningEffort = at < 0 ? void 0 : value.slice(at + 1);
    const slash = head.indexOf("/");
    if (slash > 0) {
      return {
        provider: head.slice(0, slash),
        model: head.slice(slash + 1),
        ...reasoningEffort ? { reasoningEffort } : {}
      };
    }
    const matches = flat.filter((entry) => entry.model === head);
    if (matches.length !== 1) return void 0;
    return {
      provider: matches[0].provider,
      model: matches[0].model,
      ...reasoningEffort ? { reasoningEffort } : {}
    };
  }
  function beginTurn(sessionId, startSeq, reporter) {
    const sink = { startSeq, reporter, chain: Promise.resolve(), seen: /* @__PURE__ */ new Set(), closed: false };
    if (observeSessionEvents) {
      const sinks = turnSinks.get(sessionId) ?? /* @__PURE__ */ new Set();
      sinks.add(sink);
      turnSinks.set(sessionId, sinks);
    }
    return sink;
  }
  async function endTurn(sessionId, sink) {
    sink.closed = true;
    const sinks = turnSinks.get(sessionId);
    if (sinks) {
      sinks.delete(sink);
      if (sinks.size === 0) turnSinks.delete(sessionId);
    }
    await sink.chain;
  }
  function enqueueSinkEvent(sink, event) {
    const seq = event.seq;
    if (sink.closed || seq <= sink.startSeq || sink.seen.has(seq)) return;
    sink.seen.add(seq);
    sink.chain = sink.chain.then(async () => {
      await sink.reporter.handle(event);
      await sink.reporter.tick();
    }).catch((error) => logger.warn("telegram-remote: cannot report session event: %s", errorMessage2(error)));
  }
  async function runPrompt(api, chatId, text) {
    let binding = store.state.bindings?.[chatId];
    if (!binding?.sessionId) {
      const created = await createSession(chatId, {});
      binding = created.binding;
      if (created.note) await reply(api, chatId, created.note);
    }
    const sessionId = binding.sessionId;
    const deadline = Date.now() + config.requestTimeoutMs;
    let before;
    try {
      before = await readSessionState(sessionId);
    } catch (error) {
      await forgetBinding(chatId);
      throw new Error(`Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c phi\xEAn ${sessionId}: ${errorMessage2(error)}`);
    }
    const placeholder = await api.sendMessage(chatId, PLACEHOLDER);
    activeTurns.set(chatId, sessionId);
    const reporter = createTurnReporter({
      send: (text2) => reply(api, chatId, text2),
      updateStatus: (statusText) => editQuietly(api, chatId, placeholder.message_id, statusText),
      resolveChanges: (seq) => {
        const changes = ctx.get("workspaceChanges");
        return typeof changes?.summary === "function" ? changes.summary(sessionId, seq) : void 0;
      },
      config,
      placeholder: PLACEHOLDER,
      cwd: binding.cwd ?? "",
      onError: (error) => logger.warn("telegram-remote: cannot push turn message: %s", errorMessage2(error))
    });
    const sink = beginTurn(sessionId, before.cursor, reporter);
    try {
      try {
        await api.sendChatAction(chatId, "typing").catch(() => {
        });
        await sessionController.prompt({
          requestId: randomUUID2(),
          sessionId,
          mode: "queue",
          content: [{ type: "text", text }],
          clientTimeZone
        }, controller.signal);
        const outcome = await pump(sessionId, before.cursor, deadline, reporter, sink);
        await endTurn(sessionId, sink);
        await finishTurn(api, chatId, placeholder.message_id, outcome);
      } catch (error) {
        await endTurn(sessionId, sink);
        await retirePlaceholder(api, chatId, placeholder.message_id);
        throw error;
      }
    } finally {
      activeTurns.delete(chatId);
    }
  }
  async function pump(sessionId, startSeq, deadline, reporter, sink) {
    let afterSeq = startSeq;
    while (!controller.signal.aborted) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) return { reporter, pendingInput: [], timedOut: true };
      const wait = await sessionController.wait({
        sessionId,
        timeoutMs: Math.min(15e3, Math.max(1e3, remaining)),
        afterSeq,
        maxMessages: 50
      }, controller.signal);
      if (observeSessionEvents) {
        await sink.chain;
        for (const record of [...wait.output?.records ?? []].reverse()) {
          if (record?.event) enqueueSinkEvent(sink, record.event);
        }
        await sink.chain;
      } else {
        const events = await readEventsSince(sessionId, afterSeq, wait.state?.cursor);
        if (events === void 0) {
          const records = [...wait.output?.records ?? []].reverse();
          for (const record of records) {
            const event = record?.event;
            if (!event || typeof event.seq !== "number" || event.seq <= afterSeq) continue;
            afterSeq = event.seq;
            await reporter.handle(event);
          }
        } else {
          for (const record of events) {
            const event = record?.event;
            if (!event || typeof event.seq !== "number" || event.seq <= afterSeq) continue;
            afterSeq = event.seq;
            await reporter.handle(event);
          }
        }
      }
      await reporter.tick();
      if (typeof wait.state?.cursor === "number") afterSeq = wait.state.cursor;
      const pendingInput = wait.state?.pendingInput ?? [];
      if (wait.reason === "idle") return { reporter, pendingInput, timedOut: false };
      if (wait.reason === "input-required") return { reporter, pendingInput, timedOut: false };
    }
    return { reporter, pendingInput: [], timedOut: true };
  }
  async function readEventsSince(sessionId, afterSeq, throughSeq) {
    if (typeof sessionController.events !== "function") return void 0;
    try {
      const pages = [];
      let beforeSeq;
      let cut = typeof throughSeq === "number" ? throughSeq : void 0;
      for (let page = 0; page < 4; page += 1) {
        const result = await sessionController.events({
          address: { kind: "session", sessionId },
          maxMessages: 100,
          ...cut === void 0 ? {} : { throughSeq: cut },
          ...beforeSeq === void 0 ? {} : { beforeSeq }
        }, controller.signal);
        const records = Array.isArray(result?.records) ? result.records : [];
        if (records.length === 0) break;
        pages.unshift(records);
        const oldest = records[0]?.event?.seq;
        if (typeof oldest !== "number" || oldest <= afterSeq + 1 || result?.hasMore !== true) break;
        beforeSeq = oldest;
        cut = void 0;
      }
      const seen = /* @__PURE__ */ new Set();
      return pages.flat().filter(isSequencedRecord).sort((left, right) => left.event.seq - right.event.seq).filter((record) => {
        if (record.event.seq <= afterSeq || seen.has(record.event.seq)) return false;
        seen.add(record.event.seq);
        return true;
      });
    } catch (error) {
      logger.warn("telegram-remote: cannot read session events: %s", errorMessage2(error));
      return void 0;
    }
  }
  async function finishTurn(api, chatId, placeholderId, outcome) {
    const notes = [];
    if (outcome.timedOut) notes.push("\u23F1 H\u1EBFt th\u1EDDi gian ch\u1EDD. L\u01B0\u1EE3t ch\u1EA1y c\xF3 th\u1EC3 v\u1EABn ti\u1EBFp t\u1EE5c trong DSH \u2013 g\u1EEDi /status \u0111\u1EC3 ki\u1EC3m tra.");
    if (outcome.pendingInput.length > 0) {
      notes.push("\u23F8 DSH \u0111ang ch\u1EDD b\u1EA1n ph\xEA duy\u1EC7t ho\u1EB7c tr\u1EA3 l\u1EDDi c\xE2u h\u1ECFi trong \u1EE9ng d\u1EE5ng.");
    }
    const finalText = await outcome.reporter.finish();
    const body = [
      finalText.length > 0 ? `${FINAL_LABEL} ${finalText}` : "",
      ...notes
    ].filter((part) => part.length > 0).join("\n\n") || "\u2705 Xong, nh\u01B0ng l\u01B0\u1EE3t n\xE0y kh\xF4ng sinh ra n\u1ED9i dung v\u0103n b\u1EA3n.";
    await retirePlaceholder(api, chatId, placeholderId);
    await reply(api, chatId, body);
  }
  async function retirePlaceholder(api, chatId, messageId) {
    try {
      await api.deleteMessage(chatId, messageId);
    } catch (error) {
      logger.warn("telegram-remote: cannot delete placeholder: %s", errorMessage2(error));
      await editQuietly(api, chatId, messageId, "\u2705 Xong");
    }
  }
  async function handleCommand(api, chatId, text) {
    const { name: name2, argument } = parseCommand(text);
    switch (name2) {
      case "start": {
        if (canPair()) {
          await store.update((state) => {
            state.allowedChatIds = [chatId];
            state.pairedAt = Date.now();
          });
          await reply(api, chatId, `\u2705 \u0110\xE3 gh\xE9p n\u1ED1i chat n\xE0y v\u1EDBi DSH.

${HELP_TEXT}`);
          return;
        }
        if (!isAllowed(chatId)) {
          await reply(api, chatId, `\u26D4 Chat ${chatId} kh\xF4ng n\u1EB1m trong danh s\xE1ch cho ph\xE9p.`);
          return;
        }
        await reply(api, chatId, HELP_TEXT);
        return;
      }
      case "help":
        await reply(api, chatId, HELP_TEXT);
        return;
      case "whoami":
        await reply(api, chatId, [
          `Chat id: ${chatId}`,
          `Bot: @${identity?.username ?? "?"}`,
          `Phi\xEAn \u0111ang g\u1EAFn: ${store.state.bindings?.[chatId]?.sessionId ?? "ch\u01B0a c\xF3"}`
        ].join("\n"));
        return;
      case "ping":
        await reply(api, chatId, "\u{1F3D3} pong");
        return;
      case "new": {
        const created = await createSession(chatId, argument.length > 0 ? { cwd: expandHome(argument) } : {});
        const lines = [`\u{1F195} Phi\xEAn m\u1EDBi: ${created.binding.sessionId}`];
        if (created.binding.cwd) lines.push(`\u{1F4C1} ${created.binding.cwd}`);
        if (created.binding.workspaceId) lines.push(`\u{1F5C2} workspace: ${created.binding.workspaceId}`);
        if (created.binding.model) lines.push(`\u{1F916} ${modelLabel(created.binding.model)}`);
        if (created.note) lines.push(created.note);
        await reply(api, chatId, lines.join("\n"));
        return;
      }
      case "sessions": {
        let items;
        try {
          const index = await loadSessionIndex();
          const archived = archivedSessionIds();
          items = index.filter((item) => !archived.has(item.sessionId));
          await saveListing(chatId, "sessions", items);
        } catch (error) {
          await reply(api, chatId, `\u274C ${errorMessage2(error)}`);
          return;
        }
        await showSessionList(api, chatId, argument, { items });
        return;
      }
      case "session": {
        const binding = store.state.bindings?.[chatId];
        if (argument.length === 0) {
          await reply(api, chatId, binding?.sessionId ? [
            `Phi\xEAn \u0111ang g\u1EAFn: ${binding.sessionId}`,
            ...binding.cwd ? [`\u{1F4C1} ${binding.cwd}`] : [],
            "G\u1EEDi /sessions \u0111\u1EC3 ch\u1ECDn phi\xEAn kh\xE1c."
          ].join("\n") : "Ch\u01B0a g\u1EAFn phi\xEAn n\xE0o. G\u1EEDi /sessions \u0111\u1EC3 ch\u1ECDn, ho\u1EB7c g\u1EEDi tin nh\u1EAFn \u0111\u1EC3 t\u1EA1o phi\xEAn m\u1EDBi.");
          return;
        }
        const target = resolveSessionArgument(chatId, argument, "sessions");
        if (!target) {
          await reply(api, chatId, `Kh\xF4ng t\xECm th\u1EA5y phi\xEAn "${argument}". G\u1EEDi /sessions \u0111\u1EC3 xem danh s\xE1ch.`);
          return;
        }
        try {
          await bindSession(chatId, target);
        } catch (error) {
          await reply(api, chatId, `\u274C ${errorMessage2(error)}`);
          return;
        }
        await reply(api, chatId, [
          `\u{1F517} \u0110\xE3 g\u1EAFn chat n\xE0y v\u1EDBi phi\xEAn ${target.sessionId}`,
          ...target.title ? [`\u{1F4DD} ${target.title}`] : [],
          "Tin nh\u1EAFn ti\u1EBFp theo s\u1EBD v\xE0o phi\xEAn n\xE0y."
        ].join("\n"));
        return;
      }
      case "archived": {
        let items;
        try {
          const index = await loadSessionIndex();
          const archived = archivedSessionIds();
          items = index.filter((item) => archived.has(item.sessionId));
          await saveListing(chatId, "archived", items);
        } catch (error) {
          await reply(api, chatId, `\u274C ${errorMessage2(error)}`);
          return;
        }
        await showArchivedList(api, chatId, argument, { items });
        return;
      }
      case "archive": {
        let target;
        if (argument.length === 0) {
          const binding = store.state.bindings?.[chatId];
          if (!binding?.sessionId) {
            await reply(api, chatId, "C\xFA ph\xE1p: /archive <s\u1ED1|sessionId>. G\u1EEDi /sessions \u0111\u1EC3 xem danh s\xE1ch.");
            return;
          }
          target = cachedList(chatId, "sessions").find((item) => item.sessionId === binding.sessionId) ?? { sessionId: binding.sessionId, title: "", cwd: binding.cwd ?? "" };
        } else {
          target = resolveSessionArgument(chatId, argument, "sessions");
          if (!target) {
            await reply(api, chatId, `Kh\xF4ng t\xECm th\u1EA5y phi\xEAn "${argument}". G\u1EEDi /sessions \u0111\u1EC3 xem danh s\xE1ch.`);
            return;
          }
        }
        const wasBound = store.state.bindings?.[chatId]?.sessionId === target.sessionId;
        try {
          await archiveSessionById(target.sessionId);
        } catch (error) {
          await reply(api, chatId, `\u274C Kh\xF4ng l\u01B0u tr\u1EEF \u0111\u01B0\u1EE3c: ${errorMessage2(error)}`);
          return;
        }
        if (wasBound) await forgetBinding(chatId);
        await dropFromListing(chatId, "sessions", target.sessionId);
        await reply(api, chatId, [
          `\u{1F4E6} \u0110\xE3 l\u01B0u tr\u1EEF phi\xEAn ${shortSessionId(target.sessionId)}${target.title ? ` \u2014 ${target.title}` : ""}.`,
          ...wasBound ? ["Chat \u0111\xE3 \u0111\u01B0\u1EE3c b\u1ECF g\u1EAFn."] : [],
          "D\xF9ng /archived \u0111\u1EC3 kh\xF4i ph\u1EE5c."
        ].join("\n"));
        return;
      }
      case "restore": {
        if (argument.length === 0) {
          await reply(api, chatId, "C\xFA ph\xE1p: /restore <s\u1ED1|sessionId>. G\u1EEDi /archived \u0111\u1EC3 xem danh s\xE1ch.");
          return;
        }
        const target = resolveSessionArgument(chatId, argument, "archived");
        if (!target) {
          await reply(api, chatId, `Kh\xF4ng t\xECm th\u1EA5y phi\xEAn "${argument}". G\u1EEDi /archived \u0111\u1EC3 xem danh s\xE1ch.`);
          return;
        }
        try {
          await unarchiveSessionById(target.sessionId);
        } catch (error) {
          await reply(api, chatId, `\u274C Kh\xF4ng kh\xF4i ph\u1EE5c \u0111\u01B0\u1EE3c: ${errorMessage2(error)}`);
          return;
        }
        await dropFromListing(chatId, "archived", target.sessionId);
        await reply(api, chatId, [
          `\u267B\uFE0F \u0110\xE3 kh\xF4i ph\u1EE5c phi\xEAn ${shortSessionId(target.sessionId)}${target.title ? ` \u2014 ${target.title}` : ""}.`,
          "D\xF9ng /sessions \u0111\u1EC3 ch\u1ECDn l\u1EA1i."
        ].join("\n"));
        return;
      }
      case "workspaces": {
        const workspaces = listWorkspaces();
        await saveListing(chatId, "workspaces", workspaces);
        if (workspaces.length === 0) {
          await reply(api, chatId, "DSH ch\u01B0a c\xF3 workspace n\xE0o. D\xF9ng /new <th\u01B0-m\u1EE5c> \u0111\u1EC3 m\u1EDF phi\xEAn trong m\u1ED9t th\u01B0 m\u1EE5c.");
          return;
        }
        const chosen = preferencesOf(chatId).workspaceId;
        const lines = ["\u{1F5C2} Workspace c\u1EE7a DSH:"];
        workspaces.forEach((workspace, index) => {
          const mark = workspace.id === chosen ? " \u2705" : "";
          lines.push(`${index + 1}. ${workspace.title} \u2014 ${workspace.path}${mark}`);
        });
        lines.push("", "Ch\u1EA1m n\xFAt b\xEAn d\u01B0\u1EDBi \u0111\u1EC3 ch\u1ECDn, ho\u1EB7c g\xF5 /workspace <s\u1ED1|id|\u0111\u01B0\u1EDDng-d\u1EABn>.");
        await reply(api, chatId, lines.join("\n"), { keyboard: workspaceKeyboard(chatId, workspaces) });
        return;
      }
      case "workspace": {
        if (argument.length === 0) {
          const chosen = preferencesOf(chatId).workspaceId;
          await reply(api, chatId, chosen ? `Workspace \u0111ang ch\u1ECDn: ${chosen}
G\u1EEDi /workspaces \u0111\u1EC3 xem danh s\xE1ch, /new \u0111\u1EC3 m\u1EDF phi\xEAn trong workspace n\xE0y.` : "Ch\u01B0a ch\u1ECDn workspace. G\u1EEDi /workspaces \u0111\u1EC3 xem danh s\xE1ch.");
          return;
        }
        const target = resolveWorkspaceArgument(chatId, argument);
        if (!target) {
          await reply(api, chatId, `Kh\xF4ng t\xECm th\u1EA5y workspace "${argument}". G\u1EEDi /workspaces \u0111\u1EC3 xem danh s\xE1ch.`);
          return;
        }
        await savePreferences(chatId, { workspaceId: target.id });
        await reply(api, chatId, [
          `\u{1F5C2} \u0110\xE3 ch\u1ECDn workspace: ${target.title} \u2014 ${target.path}`,
          `Id: ${target.id}`,
          "Phi\xEAn hi\u1EC7n t\u1EA1i kh\xF4ng \u0111\u1ED5i; g\u1EEDi /new \u0111\u1EC3 m\u1EDF phi\xEAn trong workspace n\xE0y."
        ].join("\n"));
        return;
      }
      case "models": {
        const catalog = await loadModelCatalog();
        const flat = flattenModels(catalog);
        await saveListing(chatId, "models", flat);
        if (flat.length === 0) {
          await reply(api, chatId, "Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c model n\xE0o \u0111ang d\xF9ng \u0111\u01B0\u1EE3c. Ki\u1EC3m tra provider trong DSH.");
          return;
        }
        const current = preferencesOf(chatId).model;
        const defaultSelection = catalog.default;
        const lines = ["\u{1F916} Model \u0111ang d\xF9ng \u0111\u01B0\u1EE3c:"];
        let lastProvider;
        flat.forEach((entry, index) => {
          if (entry.provider !== lastProvider) {
            lines.push(`
${entry.providerName} (${entry.provider})`);
            lastProvider = entry.provider;
          }
          const marks = [];
          if (defaultSelection?.provider === entry.provider && defaultSelection?.model === entry.model) marks.push("\u2B50 m\u1EB7c \u0111\u1ECBnh");
          if (current?.provider === entry.provider && current?.model === entry.model) marks.push("\u2705 \u0111ang ch\u1ECDn");
          const suffix = marks.length > 0 ? `  ${marks.join(" \xB7 ")}` : "";
          lines.push(`${index + 1}. ${entry.model}${suffix}`);
        });
        for (const failure2 of catalog.failures ?? []) {
          lines.push(`\u26A0 ${failure2.name ?? failure2.id}: ${failure2.message}`);
        }
        lines.push("", "Ch\u1EA1m n\xFAt b\xEAn d\u01B0\u1EDBi \u0111\u1EC3 ch\u1ECDn, ho\u1EB7c g\xF5 /model <s\u1ED1> hay /model provider/model[@effort].");
        await reply(api, chatId, lines.join("\n"), { keyboard: modelKeyboard(chatId, flat) });
        return;
      }
      case "model": {
        const current = preferencesOf(chatId).model;
        if (argument.length === 0) {
          await reply(api, chatId, [
            `Model \u0111ang ch\u1ECDn: ${modelLabel(current)}`,
            "G\u1EEDi /models \u0111\u1EC3 xem danh s\xE1ch, r\u1ED3i /model <s\u1ED1> ho\u1EB7c /model provider/model."
          ].join("\n"));
          return;
        }
        const catalog = await loadModelCatalog();
        const selection = resolveModelArgument(chatId, argument, catalog);
        if (!selection) {
          await reply(api, chatId, `Kh\xF4ng x\xE1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c model "${argument}". G\u1EEDi /models \u0111\u1EC3 xem danh s\xE1ch.`);
          return;
        }
        const binding = store.state.bindings?.[chatId];
        let applied = selection;
        if (binding?.sessionId) {
          try {
            applied = await applyModel(binding.sessionId, selection);
          } catch (error) {
            await reply(api, chatId, `\u274C Kh\xF4ng \u0111\u1ED5i \u0111\u01B0\u1EE3c model: ${errorMessage2(error)}`);
            return;
          }
        }
        await savePreferences(chatId, { model: applied });
        if (binding?.sessionId) {
          await store.update((state) => {
            state.bindings = { ...state.bindings ?? {}, [chatId]: { ...binding, model: applied } };
          });
        }
        await reply(api, chatId, `\u{1F916} \u0110\xE3 ch\u1ECDn ${modelLabel(applied)}${binding?.sessionId ? "" : " cho phi\xEAn k\u1EBF ti\u1EBFp"}`);
        return;
      }
      case "use": {
        if (argument.length === 0) {
          await reply(api, chatId, "C\xFA ph\xE1p: /use <sessionId>");
          return;
        }
        const sessionId = argument.split(/\s+/)[0];
        await readSessionState(sessionId);
        await store.update((state) => {
          state.bindings = {
            ...state.bindings ?? {},
            [chatId]: { sessionId, cwd: resolveCwd(), createdAt: Date.now() }
          };
        });
        await reply(api, chatId, `\u{1F517} \u0110\xE3 g\u1EAFn chat n\xE0y v\u1EDBi phi\xEAn ${sessionId}`);
        return;
      }
      case "unbind":
        await forgetBinding(chatId);
        await reply(api, chatId, "\u0110\xE3 b\u1ECF g\u1EAFn. Tin nh\u1EAFn ti\u1EBFp theo s\u1EBD t\u1EA1o phi\xEAn m\u1EDBi (gi\u1EEF workspace v\xE0 model \u0111\xE3 ch\u1ECDn).");
        return;
      case "cancel": {
        const sessionId = activeTurns.get(chatId) ?? store.state.bindings?.[chatId]?.sessionId;
        if (!sessionId) {
          await reply(api, chatId, "Ch\u01B0a c\xF3 phi\xEAn n\xE0o \u0111\u1EC3 d\u1EEBng.");
          return;
        }
        sessionController.cancel({ sessionId });
        await reply(api, chatId, `\u23F9 \u0110\xE3 y\xEAu c\u1EA7u d\u1EEBng ${sessionId}`);
        return;
      }
      case "status": {
        const binding = store.state.bindings?.[chatId];
        const prefs = preferencesOf(chatId);
        const lines = [];
        if (binding?.sessionId) {
          const state = await readSessionState(binding.sessionId);
          lines.push(`Phi\xEAn: ${binding.sessionId}`);
          if (binding.cwd) lines.push(`Th\u01B0 m\u1EE5c: ${binding.cwd}`);
          if (binding.workspaceId) lines.push(`Workspace: ${binding.workspaceId}`);
          lines.push(`Model: ${modelLabel(binding.model ?? prefs.model)}`);
          lines.push(`\u0110ang ch\u1EA1y: ${state.running ? "c\xF3" : "kh\xF4ng"}`);
          lines.push(`H\xE0ng \u0111\u1EE3i: ${state.queue?.length ?? 0}`);
          lines.push(`Ch\u1EDD ph\xEA duy\u1EC7t: ${(state.pendingInput ?? []).join(", ") || "kh\xF4ng"}`);
        } else {
          lines.push("Ch\u01B0a g\u1EAFn phi\xEAn n\xE0o. G\u1EEDi m\u1ED9t tin nh\u1EAFn ho\u1EB7c /new.");
          lines.push(`Workspace \u0111\xE3 ch\u1ECDn: ${prefs.workspaceId ?? "m\u1EB7c \u0111\u1ECBnh"}`);
          lines.push(`Model \u0111\xE3 ch\u1ECDn: ${modelLabel(prefs.model)}`);
        }
        await reply(api, chatId, lines.join("\n"));
        return;
      }
      default:
        await reply(api, chatId, `L\u1EC7nh /${name2} ch\u01B0a \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3. G\u1EEDi /help \u0111\u1EC3 xem danh s\xE1ch.`);
    }
  }
  async function handleMessage(api, message2) {
    if (!message2?.chat) return;
    const chatId = String(message2.chat.id);
    const text = typeof message2.text === "string" ? message2.text.trim() : "";
    if (message2.chat.type !== "private") {
      await api.sendMessage(chatId, "Bot n\xE0y ch\u1EC9 \u0111i\u1EC1u khi\u1EC3n DSH trong chat ri\xEAng.");
      return;
    }
    const command = text.startsWith("/") ? parseCommand(text) : void 0;
    if (!isAllowed(chatId) && !(command?.name === "start" && canPair())) {
      if (!command) return;
      await reply(api, chatId, canPair() ? `\u{1F44B} G\u1EEDi /start \u0111\u1EC3 gh\xE9p n\u1ED1i chat n\xE0y v\u1EDBi DSH (chat id ${chatId}).` : `\u26D4 Chat ${chatId} kh\xF4ng n\u1EB1m trong danh s\xE1ch cho ph\xE9p.`);
      return;
    }
    if (command) {
      await handleCommand(api, chatId, text);
      return;
    }
    if (text.length === 0) {
      await reply(api, chatId, "Hi\u1EC7n ch\u1EC9 h\u1ED7 tr\u1EE3 tin nh\u1EAFn v\u0103n b\u1EA3n.");
      return;
    }
    void enqueue(chatId, async () => {
      try {
        await runPrompt(api, chatId, text);
      } catch (error) {
        logger.error("telegram-remote: prompt failed: %s", errorMessage2(error));
        await reply(api, chatId, `\u274C ${errorMessage2(error)}`).catch(() => {
        });
      }
    });
  }
  async function handleCallback(api, query) {
    const message2 = query?.message;
    const data = typeof query?.data === "string" ? query.data : "";
    const answer = async (text, showAlert = false) => {
      try {
        await api.answerCallbackQuery(query.id, text ? { text, showAlert } : {});
      } catch (error) {
        logger.warn("telegram-remote: answerCallbackQuery failed: %s", errorMessage2(error));
      }
    };
    if (!message2?.chat) return;
    const chatId = String(message2.chat.id);
    if (message2.chat.type !== "private" || !isAllowed(chatId)) {
      await answer("Chat n\xE0y ch\u01B0a \u0111\u01B0\u1EE3c gh\xE9p n\u1ED1i v\u1EDBi DSH.");
      return;
    }
    if (data === "c") {
      await answer("\u0110\xE3 hu\u1EF7");
      await editQuietly(api, chatId, message2.message_id, "\u21A9\uFE0F \u0110\xE3 hu\u1EF7 l\u01B0u tr\u1EEF.", {
        keyboard: { inline_keyboard: [] }
      });
      return;
    }
    const match = /^([wmxsupPA]):(\d+)$/.exec(data);
    if (!match) {
      await answer();
      return;
    }
    const action = match[1];
    const index = Number(match[2]);
    const messageId = message2.message_id;
    if (action === "p" || action === "P") {
      const kind = action === "p" ? "sessions" : "archived";
      if (cachedList(chatId, kind).length === 0) {
        await answer("Danh s\xE1ch \u0111\xE3 c\u0169, g\u1EEDi l\u1EA1i l\u1EC7nh nh\xE9.", true);
        return;
      }
      if (kind === "sessions") await showSessionList(api, chatId, index, { editMessageId: messageId });
      else await showArchivedList(api, chatId, index, { editMessageId: messageId });
      await answer();
      return;
    }
    if (action === "w") {
      const target = cachedList(chatId, "workspaces")[index];
      if (!target) {
        await answer("Danh s\xE1ch \u0111\xE3 c\u0169, g\u1EEDi /workspaces l\u1EA1i nh\xE9.", true);
        return;
      }
      await savePreferences(chatId, { workspaceId: target.id });
      await answer("\u0110\xE3 ch\u1ECDn workspace");
      await editQuietly(api, chatId, messageId, [
        `\u{1F5C2} \u0110\xE3 ch\u1ECDn workspace: ${target.title} \u2014 ${target.path}`,
        `Id: ${target.id}`,
        "Phi\xEAn hi\u1EC7n t\u1EA1i kh\xF4ng \u0111\u1ED5i; g\u1EEDi /new \u0111\u1EC3 m\u1EDF phi\xEAn trong workspace n\xE0y."
      ].join("\n"), { keyboard: { inline_keyboard: [] } });
      return;
    }
    if (action === "s") {
      const target = cachedList(chatId, "sessions")[index];
      if (!target) {
        await answer("Danh s\xE1ch \u0111\xE3 c\u0169, g\u1EEDi /sessions l\u1EA1i nh\xE9.", true);
        return;
      }
      try {
        await bindSession(chatId, target);
      } catch (error) {
        await answer(errorMessage2(error), true);
        return;
      }
      await answer("\u0110\xE3 g\u1EAFn phi\xEAn");
      await editQuietly(api, chatId, messageId, [
        `\u{1F517} \u0110\xE3 g\u1EAFn chat n\xE0y v\u1EDBi phi\xEAn ${target.sessionId}`,
        ...target.title ? [`\u{1F4DD} ${target.title}`] : [],
        "Tin nh\u1EAFn ti\u1EBFp theo s\u1EBD v\xE0o phi\xEAn n\xE0y."
      ].join("\n"), { keyboard: { inline_keyboard: [] } });
      return;
    }
    if (action === "x") {
      const target = cachedList(chatId, "sessions")[index];
      if (!target) {
        await answer("Danh s\xE1ch \u0111\xE3 c\u0169, g\u1EEDi /sessions l\u1EA1i nh\xE9.", true);
        return;
      }
      if (!canArchiveSessions()) {
        await answer("B\u1EA3n DSH n\xE0y kh\xF4ng h\u1ED7 tr\u1EE3 l\u01B0u tr\u1EEF phi\xEAn.", true);
        return;
      }
      await answer();
      await editQuietly(api, chatId, messageId, [
        "\u{1F4E6} L\u01B0u tr\u1EEF phi\xEAn n\xE0y?",
        "",
        `${index + 1}. ${shorten2(target.title, 64)}`,
        shortSessionId(target.sessionId),
        "",
        "Phi\xEAn s\u1EBD \u1EA9n kh\u1ECFi danh s\xE1ch nh\u01B0ng d\u1EEF li\u1EC7u v\u1EABn c\xF2n; kh\xF4i ph\u1EE5c b\u1EB1ng /archived."
      ].join("\n"), {
        keyboard: {
          inline_keyboard: [[
            { text: "\u{1F4E6} L\u01B0u tr\u1EEF", callback_data: `A:${index}` },
            { text: "\u21A9\uFE0F Hu\u1EF7", callback_data: "c" }
          ]]
        }
      });
      return;
    }
    if (action === "A") {
      const target = cachedList(chatId, "sessions")[index];
      if (!target) {
        await answer("Danh s\xE1ch \u0111\xE3 c\u0169, g\u1EEDi /sessions l\u1EA1i nh\xE9.", true);
        return;
      }
      const wasBound = store.state.bindings?.[chatId]?.sessionId === target.sessionId;
      try {
        await archiveSessionById(target.sessionId);
      } catch (error) {
        await answer("Kh\xF4ng l\u01B0u tr\u1EEF \u0111\u01B0\u1EE3c", true);
        await editQuietly(api, chatId, messageId, `\u274C ${errorMessage2(error)}`, {
          keyboard: { inline_keyboard: [] }
        });
        return;
      }
      if (wasBound) await forgetBinding(chatId);
      await dropFromListing(chatId, "sessions", target.sessionId);
      await answer("\u0110\xE3 l\u01B0u tr\u1EEF");
      await editQuietly(api, chatId, messageId, [
        `\u{1F4E6} \u0110\xE3 l\u01B0u tr\u1EEF phi\xEAn ${shortSessionId(target.sessionId)}${target.title ? ` \u2014 ${target.title}` : ""}.`,
        ...wasBound ? ["Chat \u0111\xE3 \u0111\u01B0\u1EE3c b\u1ECF g\u1EAFn."] : [],
        "D\xF9ng /archived \u0111\u1EC3 kh\xF4i ph\u1EE5c."
      ].join("\n"), { keyboard: { inline_keyboard: [] } });
      return;
    }
    if (action === "u") {
      const target = cachedList(chatId, "archived")[index];
      if (!target) {
        await answer("Danh s\xE1ch \u0111\xE3 c\u0169, g\u1EEDi /archived l\u1EA1i nh\xE9.", true);
        return;
      }
      try {
        await unarchiveSessionById(target.sessionId);
      } catch (error) {
        await answer("Kh\xF4ng kh\xF4i ph\u1EE5c \u0111\u01B0\u1EE3c", true);
        await editQuietly(api, chatId, messageId, `\u274C ${errorMessage2(error)}`, {
          keyboard: { inline_keyboard: [] }
        });
        return;
      }
      await dropFromListing(chatId, "archived", target.sessionId);
      await answer("\u0110\xE3 kh\xF4i ph\u1EE5c");
      await editQuietly(api, chatId, messageId, [
        `\u267B\uFE0F \u0110\xE3 kh\xF4i ph\u1EE5c phi\xEAn ${shortSessionId(target.sessionId)}${target.title ? ` \u2014 ${target.title}` : ""}.`,
        "D\xF9ng /sessions \u0111\u1EC3 ch\u1ECDn l\u1EA1i."
      ].join("\n"), { keyboard: { inline_keyboard: [] } });
      return;
    }
    const entry = cachedList(chatId, "models")[index];
    if (!entry) {
      await answer("Danh s\xE1ch \u0111\xE3 c\u0169, g\u1EEDi /models l\u1EA1i nh\xE9.", true);
      return;
    }
    const binding = store.state.bindings?.[chatId];
    const selection = { provider: entry.provider, model: entry.model };
    let applied = selection;
    if (binding?.sessionId) {
      try {
        applied = await applyModel(binding.sessionId, selection);
      } catch (error) {
        await answer(`Kh\xF4ng \u0111\u1ED5i \u0111\u01B0\u1EE3c: ${errorMessage2(error)}`, true);
        return;
      }
    }
    await savePreferences(chatId, { model: applied });
    if (binding?.sessionId) {
      await store.update((state) => {
        state.bindings = { ...state.bindings ?? {}, [chatId]: { ...binding, model: applied } };
      });
    }
    await answer("\u0110\xE3 ch\u1ECDn model");
    await editQuietly(
      api,
      chatId,
      messageId,
      `\u{1F916} \u0110\xE3 ch\u1ECDn ${modelLabel(applied)}${binding?.sessionId ? "" : " cho phi\xEAn k\u1EBF ti\u1EBFp"}`,
      { keyboard: { inline_keyboard: [] } }
    );
  }
  function enqueue(chatId, task) {
    const previous = chatQueues.get(chatId) ?? Promise.resolve();
    const next = previous.then(task, task);
    chatQueues.set(chatId, next);
    const clear = () => {
      if (chatQueues.get(chatId) === next) chatQueues.delete(chatId);
    };
    next.then(clear, clear);
    return next;
  }
  async function probeCapabilities() {
    const workspaces = listWorkspaces().length;
    let providers = 0;
    let models = 0;
    let modelError;
    try {
      const catalog = await sessionController.modelCatalog();
      const flat = flattenModels(catalog);
      models = flat.length;
      providers = new Set(flat.map((entry) => entry.provider)).size;
    } catch (error) {
      modelError = errorMessage2(error);
    }
    await publishStatus({
      capabilities: {
        workspaces,
        ...modelError === void 0 ? { providers, models } : { modelError }
      }
    });
  }
  async function pollLoop() {
    await mkdir3(dataDir, { recursive: true });
    await store.load();
    let backoff = 1e3;
    let probed = false;
    while (!stopped) {
      const { token, source, tokenFile } = await resolveToken();
      if (token.length === 0) {
        await publishStatus({
          state: "waiting-token",
          tokenSource: source,
          hint: `\u0110\u1EB7t token v\xE0o ${tokenFile ?? join5(dataDir, "token")}, ho\u1EB7c \u0111\u1EB7t bi\u1EBFn m\xF4i tr\u01B0\u1EDDng ${config.tokenEnv}. T\u1EC7p token \u0111\u01B0\u1EE3c \u0111\u1ECDc l\u1EA1i m\u1ED7i v\xF2ng n\xEAn kh\xF4ng c\u1EA7n kh\u1EDFi \u0111\u1ED9ng l\u1EA1i.`
        });
        if (!probed) {
          probed = true;
          void probeCapabilities().catch(() => {
          });
        }
        await sleep(3e3);
        continue;
      }
      const api = new TelegramApi(token, { fetchImpl });
      if (identityToken !== token) {
        identity = void 0;
        identityToken = token;
      }
      try {
        if (!identity) {
          identity = await api.getMe(controller.signal);
          logger.info("telegram-remote: connected as @%s", identity.username);
          await api.setMyCommands([
            { command: "new", description: "T\u1EA1o phi\xEAn DSH m\u1EDBi" },
            { command: "sessions", description: "Li\u1EC7t k\xEA v\xE0 ch\u1ECDn phi\xEAn" },
            { command: "archived", description: "Phi\xEAn \u0111\xE3 l\u01B0u tr\u1EEF" },
            { command: "archive", description: "L\u01B0u tr\u1EEF phi\xEAn" },
            { command: "workspaces", description: "Li\u1EC7t k\xEA workspace" },
            { command: "workspace", description: "Ch\u1ECDn workspace cho phi\xEAn m\u1EDBi" },
            { command: "models", description: "Li\u1EC7t k\xEA provider v\xE0 model" },
            { command: "model", description: "\u0110\u1ED5i model cho phi\xEAn" },
            { command: "status", description: "Tr\u1EA1ng th\xE1i phi\xEAn \u0111ang g\u1EAFn" },
            { command: "cancel", description: "D\u1EEBng l\u01B0\u1EE3t \u0111ang ch\u1EA1y" },
            { command: "unbind", description: "B\u1ECF g\u1EAFn phi\xEAn" },
            { command: "help", description: "Danh s\xE1ch l\u1EC7nh" }
          ]).catch(() => {
          });
        }
        await publishStatus({ state: "polling", tokenSource: source, hint: null });
        if (!probed) {
          probed = true;
          void probeCapabilities().catch(() => {
          });
        }
        const updates = await api.getUpdates({
          offset: store.state.offset,
          timeoutSeconds: config.pollTimeoutSec
        }, controller.signal);
        backoff = 1e3;
        lastPollAt = Date.now();
        for (const update of updates) {
          await store.update((state) => {
            state.offset = update.update_id + 1;
          });
          if (update.callback_query) {
            void handleCallback(api, update.callback_query).catch((error) => {
              logger.error("telegram-remote: callback failed: %s", errorMessage2(error));
            });
            continue;
          }
          void handleMessage(api, update.message).catch((error) => {
            logger.error("telegram-remote: update failed: %s", errorMessage2(error));
          });
        }
        await publishStatus({
          state: "polling",
          lastPollAt: new Date(lastPollAt).toISOString(),
          lastError: null
        });
      } catch (error) {
        if (stopped || controller.signal.aborted) break;
        if (isTokenFailure(error)) {
          identity = void 0;
          logger.error("telegram-remote: token rejected: %s", errorMessage2(error));
          await publishStatus({ state: "invalid-token", tokenSource: source, lastError: errorMessage2(error) });
          await sleep(15e3);
          continue;
        }
        const wait = error instanceof TelegramError && error.retryAfter ? Math.min(6e4, error.retryAfter * 1e3) : backoff;
        logger.warn("telegram-remote: poll failed (%s), retrying in %dms", errorMessage2(error), wait);
        await publishStatus({ state: "error", tokenSource: source, lastError: errorMessage2(error) });
        await sleep(wait);
        backoff = Math.min(backoff * 2, 3e4);
      }
    }
    await publishStatus({ state: "stopped" });
    logger.info("telegram-remote: stopped");
  }
  const loopPromise = pollLoop();
  loopPromise.catch((error) => {
    logger.error("telegram-remote: loop crashed: %s", errorMessage2(error));
  });
  return () => {
    if (stopped) return;
    stopped = true;
    controller.abort();
    if (typeof detachSessionEvents === "function") detachSessionEvents();
    turnSinks.clear();
  };
}
function isSequencedRecord(record) {
  return record?.event !== void 0 && typeof record.event.seq === "number";
}
function requiredService(ctx, name2) {
  return ctx.get(name2);
}
function errorMessage2(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

// src/index.ts
var name = "personal-hub";
var inject = ["sessionController"];
var FEATURES = [
  {
    key: "telegram",
    label: "Telegram remote control",
    mount: mountTelegramRemote
  },
  {
    key: "git",
    label: "Git panel",
    mount: mountGit
  }
];
function apply(ctx, config) {
  const settings = normalizeConfig(config);
  const logger = makeLogger(ctx);
  if (ctx.get("sessionController") === void 0) {
    logger.warn("personal-hub: sessionController is absent; no feature can mount");
    return;
  }
  ctx.effect(() => {
    const disposers = [];
    for (const feature of FEATURES) {
      const featureConfig = settings[feature.key];
      if (featureConfig === void 0) continue;
      if (featureConfig.enabled === false) {
        logger.info("personal-hub: %s disabled by configuration", feature.label);
        continue;
      }
      try {
        disposers.push(feature.key === "telegram" ? feature.mount(ctx, settings.telegram, { logger }) : feature.mount(ctx, settings.git, { logger }));
        logger.info("personal-hub: %s mounted", feature.label);
      } catch (error) {
        logger.error("personal-hub: %s failed to mount: %s", feature.label, message(error));
      }
    }
    return () => {
      for (const dispose of disposers) {
        try {
          dispose();
        } catch (error) {
          logger.warn("personal-hub: feature dispose failed: %s", message(error));
        }
      }
    };
  });
}
function makeLogger(ctx) {
  if (typeof ctx.logger === "function") {
    const logger = ctx.logger("personal-hub");
    return {
      info: (...args) => logger.info(...args),
      warn: (...args) => logger.warn(...args),
      error: (...args) => logger.error(...args)
    };
  }
  return {
    info: (...args) => console.info("[personal-hub]", ...args),
    warn: (...args) => console.warn("[personal-hub]", ...args),
    error: (...args) => console.error("[personal-hub]", ...args)
  };
}
function message(error) {
  return error instanceof Error ? error.message : String(error);
}
export {
  apply,
  inject,
  name
};
