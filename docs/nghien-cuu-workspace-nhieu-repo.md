# Nghiên cứu: một workspace, nhiều git repo (checkout theo nhu cầu)

**Ngày:** 2026-11-23  
**Trạng thái:** P0–P2 đã triển khai; P3 (change set/auto-merge multi) còn lại  
**Phạm vi:** `personal-hub` (plugin Git + worktree của DSH) trên DSH `0.2.2-rc.5` đang cài  
**Cách làm:** đọc mã plugin và mã DSH trong `app.asar`, đối chiếu tài liệu package, chạy thử
`git worktree` trên hai repo mẫu trong thư mục tạm.  
**Liên quan:** [`docs/README.md`](README.md), [`plugin/README.md`](../plugin/README.md).

> **Triển khai:** `plugin/src/lib/repo-set.ts` (khám phá/vai trò/manifest), `plugin/src/lib/context.ts`
> (context dir + materialize một repo), `plugin/src/features/git.ts` (route `repos`/`checkoutRepo`,
> write guard, system prompt, tool `checkout_repo`) và panel/client. Hành vi người dùng:
> [`plugin/README.md#workspace-nhiều-kho-multi-repo`](../plugin/README.md#workspace-nhiều-kho-multi-repo).
>
> Quy ước: `plugin/...` là repo này; `$AI/...` là
> `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/...`
> của bản đang chạy. Số dòng kiểm tra trên bản `0.2.2-rc.5`; nâng cấp DSH có thể dịch chuyển.

---

## 0. Kết luận trong 30 giây

**Bối cảnh:** không có một khuôn workspace cố định. `omni` với `be`/`fe`/`docs` chỉ là **một ví dụ**;
thực tế có thể là 1 repo, 3 repo, 10 repo, repo lồng theo nhóm, có thư mục tài liệu không phải Git,
v.v. Vì vậy thiết kế **không được giả định** tên repo, số repo, hay "repo chính".

Ba ràng buộc áp dụng cho mọi kiểu:

- Git **độc lập từng repo**: commit, push, PR riêng.
- **Chỉ repo nào thay đổi mới tạo worktree** — không nhân bản cả workspace cho mỗi chat.
- Một chat vẫn cần **context chung**: thấy được toàn bộ workspace và đọc được các repo.

**Khuyến nghị: "context dir + checkout theo nhu cầu", áp dụng cho mọi workspace thư mục thường**

1. Khi chat bắt đầu, plugin tạo một **thư mục context rỗng** (rất rẻ) và trỏ cwd của phiên vào đó.
   Không tạo worktree nào. Với workspace **một repo nằm ở gốc**, giữ nguyên đường worktree cũ.
2. Agent đọc mọi repo qua **đường dẫn tuyệt đối** (quyền đọc trong workspace là đủ).
3. Khi agent chuẩn bị **sửa** một repo, nó gọi tool `checkout_repo({ repo })`; plugin tạo worktree
   cho **đúng repo đó** trong context dir và trả về đường dẫn. Chỉ repo bị sửa mới tốn checkout.
4. Một **write guard** chặn mọi lần ghi vào cây chính của repo chưa checkout (và cả repo đã
   checkout nhưng ghi sai chỗ), kèm hướng dẫn "gọi `checkout_repo` trước". Đây là lưới an toàn để
   agent không vô tình sửa main tree.
5. Panel có **chip cho từng repo** (vai trò là tuỳ chọn), trạng thái `chưa checkout / đang tạo /
   đã checkout`. Commit/push/PR chạy **trên từng repo**, độc lập; tab "Tất cả" chỉ là tổng quan.
6. Không có "change set", không cùng nhánh bắt buộc, không PR liên kết, không gộp cả set. Đó là
   tính năng tuỳ chọn P3, ngoài đường tới hạn.

Ước lượng: **P0** repo set + panel theo repo (1–2 ngày); **P1** context dir + tool + guard +
context cho agent (3–5 ngày); **P2** dọn dẹp/Worktrees/archive (2–3 ngày). Tổng **6–10 ngày công**.
Đường một repo giữ nguyên hành vi, không migration bắt buộc.

**Điều kiện:** workspace là **thư mục thường** (không nằm trong repo). Kiểu thư mục cha chứa repo
ngang hàng (như `omni`) thoả tự nhiên; workspace là repo gốc vẫn đi đường một repo.

---

## 1. Hiện trạng

### 1.1 DSH: một phiên, một cwd hiệu lực

DSH `0.2.2-rc.5` không cấm một workspace chứa nhiều repo. Nó chỉ có **một `header.cwd` bất biến**,
**một cwd hiệu lực**, và sandbox lấy `header.cwd` làm biên:

| Thành phần | Dùng thư mục nào | Hệ quả cho thiết kế |
|---|---|---|
| `workspaceRegistry` | `header.cwd`; một project/đường dẫn canonical, một phiên thuộc một project (`$AI/dsh-workspace/src/entity.ts:117-136`) | Workspace cha là thư mục thường vẫn hợp lệ; sidebar nhóm đúng. Không cần sửa. |
| `SessionHeader.cwd` | Bất biến, "project gốc" (`$AI/dsh-working-directory/src/index.ts:54-60`) | Gốc để khám phá repo và là gốc sandbox. |
| `workingDirectory` | Cwd hiệu lực, ghi qua event, replay khi resume; `set()` chỉ cần thư mục tồn tại (`$AI/dsh-working-directory/src/index.ts:188-215`) | **Có thể trỏ vào thư mục context rỗng**; mất thì tự về `header.cwd`. |
| `sandboxPolicy` | `workspace-write` biên = `header.cwd` (`$AI/dsh-sandbox-policy/src/index.ts:208-230`) | Context dir và các checkout nằm trong `header.cwd` ⇒ ghi được, không cần cấp thêm quyền. |
| `workspaceChanges` | Recorder tạo một lần từ `header.cwd`, tìm repo một lần (`$AI/dsh-workspace-changes/src/index.ts:59-62,132-144`) | Context dir không phải repo ⇒ thẻ "tệp đã đổi" chỉ còn file-tool edits; panel Git là nguồn chính. |
| Agent instructions / skills | Cwd hiệu lực; project root = tổ tiên gần nhất có `.git`, **nếu không có thì chính cwd** (`$AI/dsh-agent-instructions/src/index.ts:126-128`; `$AI/dsh-agent-instructions/src/files.ts:224-268`) | Context dir không có `.git` ⇒ chỉ `AGENTS.md` trong context dir được nạp; xem cách bù §4.8. |
| Subagent | Thừa hưởng **cwd hiệu lực** của cha (`$AI/dsh-subagent/src/manager.ts:494-501`) | Subagent thấy context dir và các repo đã checkout; tốt. |
| Scheduled task (new session) | Copy `header.cwd` (`$AI/dsh-tool-schedule/src/index.ts:329-340`) | Phiên mới theo lịch bắt đầu ở workspace cha; chấp nhận. |
| Files sidebar | `header.cwd` (`$AI/dsh-api-session-controller/src/list.ts:375-380`) | Duyệt workspace cha; chat link dùng cwd hiệu lực. Không nhất quán nhẹ, giống worktree hiện nay. |
| Forge panel có sẵn | Cwd hiệu lực; ngoài Git checkout thì ẩn (`$AI/dsh-client-ui-forge/README.md:32,62`) | Trong context dir sẽ ẩn; panel của plugin là bề mặt chính. |
| `create_worktree` có sẵn | Cwd hiệu lực (`$AI/dsh-experimental-worktree/src/index.ts:258-264`) | Gọi trong context dir sẽ lỗi "not a git repository" (vô hại). |

**Điểm quan trọng cho thiết kế "theo nhu cầu":**

- `workingDirectory.set` chấp nhận **thư mục rỗng** (chỉ `fs.stat` là directory).
- File tool và bash ghi được mọi nơi trong `header.cwd`, kể cả cây chính của repo. Vì vậy "chỉ tạo
  worktree cho repo thay đổi" **không thể** dựa vào sandbox; cần một **guard ở tầng file tool**.
- DSH có sẵn waterfall `fs/write-intent`, `fs/edit-intent`, `fs/delete-intent`, chạy **trước** khi
  ghi/sửa/xoá (`$AI/dsh-fs/src/index.ts:65-83`; `$AI/dsh-tool-fs/src/write.ts:121`). Listener nhận
  `(target, actor, next)`; `actor.agent.session` cho biết phiên đang gọi — đúng cách
  `dsh-fs-observation-policy` xác định chủ sở hữu (`$AI/dsh-fs-observation-policy/src/index.ts:36-45`).
  Đây là chỗ để cài guard.
- DSH cho phép bundle Host đăng ký **tool** (`ctx.tools.register(defineTool(...))`,
  `$AI/dsh-tools/README.md:34,45`) và **system-prompt context**
  (`ctx.systemPrompt.context({ name, order, text })`, `$AI/dsh-system-prompt/README.md:28,56`;
  ví dụ `$AI/dsh-sandbox-policy/src/index.ts:182-193`). Đủ để thêm `checkout_repo` và mô tả
  workspace cho agent.
- `glob`/`grep` của DSH **bao gồm cả file ẩn/ignored**, chỉ trừ metadata VCS
  (`$AI/dsh-tool-fs-search/README.md`). Vì vậy nếu cwd là workspace cha, worktree nằm trong
  `.agents/` sẽ **xuất hiện trùng** trong kết quả tìm kiếm. Đây là lý do phải dùng **context dir
  riêng** làm cwd, không dùng workspace cha.

### 1.2 Plugin: mọi đường dẫn Git đi qua một repository

```text
POST /api/personal-hub-git/<endpoint>
  → dispatch (plugin/src/features/git.ts:2570-2591)
  → handler (vd. overview, :1379)
  → repository(payload)                      (:2638-2645)
  → sessionCheckout(...)                     (:2607-2631)
      live cwd / worktree record .git / payload.cwd / header.cwd
  → locateRepository(...)                    (plugin/src/lib/git-run.ts:1724-1741)
  → git rev-parse --show-toplevel            → MỘT root
  → readOverview/readContext/...             → mọi lệnh git với cwd = root
```

Worktree cũng chỉ có một đối tượng: `worktreeIntent()` (`:673-687`),
`createCheckoutForMessage()` (`:801-922`), bản ghi `worktrees[sessionId]` với `path` +
`repositoryRoot` duy nhất (`protocol.ts:378-392`, `git.ts:879-890`).

### 1.3 Các điểm gãy với workspace nhiều repo

| # | Tính năng | Hiện tại | Hậu quả |
|---|---|---|---|
| 1 | Bảng Git | `repository()` ném `git/not-a-repository` (`git.ts:2642`) | Không có repo nào để xem. |
| 2 | Ô Worktree ở New Session | `worktreeState()` trả `reason: 'not-a-repository'` (`git.ts:2053`); UI ẩn khi `supported` false (`client/worktree.tsx:44-48`) | **Biến mất im lặng** — đúng triệu chứng "không đồng nhất". |
| 3 | Worktree tự động | `createCheckoutForMessage()` không tìm được repo, xoá request (`git.ts:828-834`) | Tin đầu không có checkout, không thông báo. |
| 4 | Bản ghi checkout | Một `WorktreeRecord`/phiên | Không biểu diễn được N checkout độc lập. |
| 5 | Đường dẫn checkout | Pool = `<repo>/.agents/worktrees`; tên chỉ từ sessionId (`lib/worktree.ts:129-162`) | Hai repo dùng chung pool/tên ⇒ va chạm. |
| 6 | Nhánh | Một nhánh cho một repo | Repo khác không có chỗ làm việc. |
| 7 | Commit/action | `startAction` chạy một chuỗi trên một cây (`git.ts:1070-1250`) | Không chọn được repo B để commit. |
| 8 | PR/issue | `forge.*` nhận một `{root, remote}` (`lib/forge.ts:536-596`) | Chỉ thấy PR của repo đầu tiên. |
| 9 | Merge/archive | `pulls[sessionId]` là một `PullBinding` (`lib/merge-watch.ts:48-77`) | Chỉ theo dõi PR của một repo. |
| 10 | Dọn dẹp | `inspectWorktree` + `isInside(target, live)` trên một path (`git.ts:545-557`, `lib/worktree-cleanup.ts:157-194`) | Với thư mục cha, checkout bị coi là inactive ⇒ có thể xoá khi phiên đang chạy. |
| 11 | Turn report Telegram | Một `workspaceChanges.summary()` + một cwd (`features/telegram-remote.ts:219-222`, `lib/turn-report.ts:467-478`) | Báo cáo thiếu repo/đường dẫn tuyệt đối dài. |
| 12 | Worktrees tab | `readWorktrees(root)` + `mainWorktreeRoot(root)` (`git.ts:2134-2172`) | Chỉ liệt kê worktree của một repo. |

Lỗi im lặng/đánh lừa đáng sửa cùng lúc:

- `git/not-a-repository` khi thư mục **chứa** repo;
- `reason: 'not-a-repository'` làm UI ẩn thay vì giải thích;
- `normalizeRelativePath` báo "outside the repository" cho đường dẫn của repo khác
  (`lib/git-run.ts:1099-1111`);
- `worktree/already` chặn mọi repo khác sau checkout đầu tiên (`git.ts:2362-2368`).

### 1.4 Bốn trạng thái phiên hiện nay

| Trạng thái | Cwd hiệu lực | Bảng Git | Worktree tự động |
|---|---|---|---|
| Repo, không worktree | repo | đầy đủ | có (nếu bật) |
| Repo, có worktree | worktree | đầy đủ | đã có |
| Thư mục thường, 0 repo | thư mục | lỗi | không |
| Thư mục thường, N repo | thư mục | **lỗi** | **không** |

### 1.5 Đo trên workspace thực tế

`omni` (`be`, `fe`, `docs`) chỉ là **một kiểu** trong nhiều kiểu workspace. Trên máy này,
`~/Desktop/doct` là một ví dụ cùng hình dạng nhưng lệch kích thước:

| Repo | Nhánh hiện tại | Kích thước working tree |
|---|---|---|
| `deepseek-harness` | `master` | 2,6 GB |
| `doct-dsh-plugin` | `main` | 82 MB |
| `doctbase` | `main` | 507 MB |
| `doctmcp` | `main` | 135 MB |
| `your-invitations` | `codex/...diagnostics` | 2,9 GB |

Ba kết luận:

1. **Base branch phải giải theo từng repo** (`main`/`master` cùng tồn tại).
2. **Không thể nhân bản cả workspace mỗi chat** — đây chính là yêu cầu "chỉ repo thay đổi mới tạo
   worktree".
3. **Tạo checkout phải nhanh và cục bộ**: chỉ một repo mỗi lần, rollback riêng repo đó; không fetch
   N remote trước khi chat bắt đầu.

### 1.6 Các kiểu workspace và cách xử lý

Thiết kế phải chạy được mà **không cần khai báo trước** kiểu workspace. Bảng dưới là các kiểu gặp
thực tế; cột "xử lý" là hành vi mặc định, không cần manifest.

| Kiểu | Ví dụ | Xử lý |
|---|---|---|
| **1 repo ở gốc** | `repo/` (workspace = repo) | Đường cũ: worktree eager cho chat; **không đổi**. |
| **N repo ngang hàng** | `ws/{api,web,infra}` | Context dir + lazy; id = tên thư mục. |
| **Repo lồng theo nhóm** | `ws/{apps/fe, services/be, docs}` | Khám phá depth 2; id = đường dẫn tương đối (`apps/fe`); context mirror đúng cây. |
| **Repo + thư mục thường** | `ws/docs/*.md` không phải Git | Chỉ repo Git được materialize; thư mục thường đọc/ghi tại chỗ, không cách ly. |
| **Rất nhiều repo** | `ws/*` 10–20 repo | Lazy là bắt buộc; panel có ô lọc/tìm; không tự checkout repo nào. |
| **Repo gốc + repo con lồng** | `app/` là repo, `app/vendor/x` cũng là repo | Mặc định coi là **một repo** (nested bị bỏ qua); khuyến nghị mở workspace ở thư mục cha. |
| **Repo ngoài workspace** | `ws/api` + `../shared` | Không hỗ trợ ở P1; mở workspace ở thư mục cha chứa cả hai. |
| **Workspace không có repo** | thư mục chỉ có file | Direct mode; bảng Git hiện empty state; không có context dir. |
| **Con là linked worktree** | `ws/x` là worktree của repo khác | Mặc định bỏ qua + cảnh báo; tránh nhân bản chồng. |
| **Submodule trong repo** | `.git` file trong repo cha | Thuộc repo cha; không tạo checkout riêng. |

Hệ quả: **trọng lượng repo không còn là vấn đề của toàn workspace** — chat chỉ trả giá cho repo bị
sửa. Repo 2 GB không ảnh hưởng chat chỉ sửa repo 50 MB; nó chỉ ảnh hưởng đúng lần materialize repo
đó.

---

## 2. Yêu cầu và tiêu chí

### 2.1 Chức năng

| Mức | Yêu cầu |
|---|---|
| **Must** | Mọi kiểu workspace thư mục thường: hiển thị đủ repo (0..N), không cần khai báo trước; một chat có context chung đọc được mọi repo. |
| **Must** | **Chỉ repo bị sửa mới có worktree.** Repo chỉ đọc không tốn checkout. |
| **Must** | Commit/push/PR **độc lập từng repo**; không có repo chính, không cùng nhánh bắt buộc, không PR liên kết. |
| **Must** | Không để agent ghi nhầm vào cây chính của repo chưa checkout; đường dẫn do browser gửi lên phải được xác thực. |
| **Should** | Vai trò/mô tả repo là **tuỳ chọn** (`be`, `fe`, `docs` chỉ là ví dụ); không có thì dùng tên thư mục. Agent biết đọc tài liệu trước khi sửa code nếu có. |
| **Should** | Tạo checkout nhanh, có trạng thái `đang tạo`, lỗi rõ; không rollback dây chuyền sang repo khác. |
| **Could** | Tạo sẵn checkout theo yêu cầu (nút trong panel/New Session); change set xuyên repo (P3); tool `workspace_repos`. |

**Không** đặt làm yêu cầu: commit atomic xuyên repo, cùng tên nhánh, PR liên kết, gộp cả set,
archive khi một PR gộp.

### 2.2 Phi chức năng

- **Tương thích:** workspace một repo giữ nguyên hành vi/giao diện/API cũ.
- **Chi phí:** chat không sửa repo nào ⇒ **0 worktree**; chat sửa 1 repo ⇒ 1 worktree; context dir
  rỗng gần như miễn phí.
- **Hiệu năng:** tạo context dir < 50 ms; `checkout_repo` chỉ chạm một repo (fetch + worktree add);
  guard chạy trong < 5 ms/lần ghi (cache repo set trong bộ nhớ).
- **An toàn:** guard chặn ghi vào cây chính của repo thuộc workspace; mọi thao tác xoá chỉ trong
  context dir; phiên đang đứng trong checkout không bị dọn.
- **Đa nền tảng:** macOS/Linux/Windows; canonical hoá realpath; không dựa symlink.
- **Bảo trì:** tái dùng toàn bộ hàm git/forge/worktree hiện có; thêm seam repo + context + tool +
  guard.

### 2.3 Tiêu chí chấm điểm (dùng ở §3.7)

| Tiêu chí | Trọng số | Vì sao |
|---|---:|---|
| Chi phí mỗi chat (chỉ repo thay đổi) | 25 | Yêu cầu mới, quan trọng nhất. |
| Trải nghiệm agent thống nhất | 20 | Một cwd/context, thấy đủ repo. |
| Cách ly theo phiên | 15 | Nhiều chat không giẫm nhau. |
| Đúng đắn Git theo repo | 15 | Mỗi repo nhánh/PR riêng. |
| Rủi ro/hồi quy | 15 | Không phá đường một repo. |
| Đa nền tảng & bảo trì | 10 | Windows, nâng cấp DSH. |

---

## 3. Phương án

### 3.1 A — Gộp monorepo

Mất lịch sử/quyền/release độc lập; không phải quyết định của plugin. **Loại.**

### 3.2 B — Repo gốc + submodule

Ghim commit, worktree lồng nhau, hai PR cho một thay đổi, DSH vẫn thấy một repo. **Loại.**

### 3.3 C — Mỗi repo một workspace DSH

Rẻ (0 dòng code) nhưng không có context chung/cwd chứa đủ repo; phải chuyển N chat. **Loại làm
chính**, chỉ là cách dùng cho việc hoàn toàn độc lập.

### 3.4 D — Panel đa repo, không checkout

Chỉ khám phá và cho panel chọn repo; chat ghi thẳng cây chính. Rẻ nhưng mất cách ly, hai chat giẫm
nhau. **Chỉ là chế độ "không cách ly"** (tương đương worktree off hiện nay).

### 3.5 E — Context dir + checkout theo nhu cầu — **khuyến nghị**

- Cwd của chat là một **context dir rỗng** (`<workspace>/.agents/worktrees/<tên>`).
- Repo chỉ được **materialize** (tạo worktree) khi agent/user chuẩn bị sửa; mỗi repo một checkout
  độc lập trong context dir.
- Đọc mọi repo qua đường dẫn tuyệt đối; sau khi materialize, repo xuất hiện dưới cwd.
- Tool `checkout_repo` + write guard.

Hai biến thể:

| Biến thể | Cách làm | Đánh giá |
|---|---|---|
| **E2. Eager** | Tạo worktree cho mọi repo lúc bắt đầu chat | Đơn giản nhất, nhưng đúng thứ bạn muốn tránh: N worktree/chat dù chỉ sửa 1 repo. |
| **E3. Primary + writable roots** | Cwd = worktree repo chính; repo khác ngoài cwd + `registerWritableRoot` | Agent không thấy repo khác trong cwd; Windows bash bỏ qua extra root; không "các repo như nhau". |

### 3.6 F — Sửa lõi DSH thành nhiều gốc

Vi phạm bất biến một project/một cwd/một biên sandbox; phải sửa cả fs, bash, sidebar, snapshot.
Không làm được trong bundle; fork là gánh nặng. **Loại.**

### 3.7 Bảng so sánh

| Phương án | Chi phí (25) | Context (20) | Cách ly (15) | Git đúng (15) | Rủi ro (15) | Đa nền tảng (10) | Tổng |
|---|---:|---:|---:|---:|---:|---:|---:|
| A. Monorepo | 3 | 5 | 3 | 3 | 4 | 5 | **3,75** |
| B. Submodule | 3 | 3 | 3 | 2 | 2 | 3 | **2,7** |
| C. N workspace | 4 | 1 | 3 | 4 | 5 | 5 | **3,5** |
| D. Panel-only | 4 | 2 | 1 | 4 | 4 | 4 | **3,15** |
| **E. Lazy context** | **5** | **5** | **4** | **5** | **3** | **4** | **4,45** |
| E2. Eager | 2 | 5 | 4 | 5 | 4 | 4 | **3,85** |
| F. Sửa lõi | 1 | 5 | 4 | 5 | 2 | 3 | **3,2** |

E thắng nhờ chi phí gần 0 cho repo không sửa; điểm rủi ro thấp hơn vì phụ thuộc guard/tool (bù lại
bằng test và fallback).

### 3.8 Khi nào E không phù hợp

- Workspace là repo gốc chứa repo con (không phải thư mục thường) — khuyến nghị mở workspace ở cha.
- Repo quá lớn đến mức ngay cả một worktree cũng không muốn tạo: dùng chế độ "không cách ly" (D).
- Chỉ đọc nhiều repo, không sửa: D đủ; nhưng nếu vẫn muốn cách ly theo chat, E vẫn đúng.

---

## 4. Thiết kế chi tiết

### 4.1 Khái niệm

**Workspace repo set** — danh sách repo trong workspace, **bình đẳng**, kèm vai trò:

- Mặc định: **mọi repo khám phá được** đều thuộc set; không cần `core`.
- `core`/`available`/`excluded` là **tuỳ chọn** khi workspace có quá nhiều repo hoặc muốn ẩn bớt.
- `role`/`description` là **tuỳ chọn**; không có thì panel/context dùng tên thư mục. `be`/`fe`/`docs`
  chỉ là ví dụ.

**Context dir** — thư mục riêng của chat, cwd hiệu lực:

```text
<workspace>/.agents/worktrees/dsh-ad0ab5d0-1a2b/
├── .dsh/checkout.json      # manifest: workspace, session, các repo đã materialize
├── be/                     # chỉ xuất hiện sau khi checkout_repo('be')
└── docs/                   # chỉ xuất hiện khi repo docs được sửa
```

Lúc bắt đầu, thư mục **rỗng** (trừ manifest). Không có repo chính; thứ tự materialize không quan
trọng.

**Checkout (materialized repo)** — một worktree thật của một repo, nằm trong context dir, có nhánh
và base riêng. Chỉ tồn tại cho repo đã được yêu cầu sửa.

**Direct mode** — nếu người dùng tắt cách ly cho chat: không có context dir, cwd = workspace cha,
agent ghi thẳng cây chính; panel thao tác trên cây chính. Đây là đường tương thích với "worktree
off".

### 4.2 Cấu trúc và manifest

Manifest workspace `<workspace>/.dsh-workspace.json` là **tuỳ chọn**. Không có manifest, plugin vẫn
khám phá và chạy đúng; manifest chỉ để thêm vai trò/base/remote/ẩn bớt hoặc đổi chế độ:

```json
{
  "version": 1,
  "core": ["be", "fe", "docs"],
  "exclude": ["node_modules", "dist"],
  "roles": { "be": "Backend API", "fe": "Frontend", "docs": "Tài liệu và đặc tả" },
  "description": { "docs": "Đọc trước khi sửa BE/FE" },
  "base": { "be": "main", "fe": "main", "docs": "main" },
  "remote": { "be": "origin", "fe": "origin", "docs": "origin" },
  "checkout": { "mode": "lazy", "dirtyMain": "warn" }
}
```

- Không có manifest ⇒ mọi repo khám phá được; role = tên thư mục; base/remote = mặc định repo.
- `base`/`remote` theo từng repo; thiếu thì lấy mặc định của repo.
- `mode: 'lazy'` (mặc định cho multi-repo) hoặc `'eager'` (tạo trước các repo `core`, dùng khi muốn
  tiện hơn là tiết kiệm).
- `dirtyMain: 'warn' | 'abort'` — xử lý khi cây chính có thay đổi chưa commit lúc materialize.

Manifest của context dir `<context>/.dsh/checkout.json`:

```json
{
  "version": 1,
  "sessionId": "session-…",
  "workspaceRoot": "/Users/…/workspace/omni",
  "name": "dsh-ad0ab5d0-1a2b",
  "createdAt": 0,
  "repos": {
    "be": {
      "path": "…/dsh-ad0ab5d0-1a2b/be",
      "repositoryRoot": "/Users/…/workspace/omni/be",
      "branch": "feat/multi-repo-panel",
      "base": "main",
      "start": "<sha>",
      "materializedAt": 0
    }
  }
}
```

### 4.3 Khám phá repo và vai trò

`resolveRepoSet(workspaceRoot)`:

1. `workspaceRoot = session.header.cwd` cho phiên đã có; phiên nháp dùng `payload.cwd`.
   **Không** dùng cwd hiệu lực (context dir) làm workspace root.
2. `realpath` để canonical hoá (macOS `/tmp` → `/private/tmp`; home symlink).
3. Nếu workspace root **nằm trong** repo ⇒ `kind: 'single'`, hành vi cũ; chỉ gợi ý mở thư mục cha
   khi thư mục cha có manifest multi-repo.
4. Ngược lại, duyệt con tới `scanDepth` (mặc định 2), bỏ qua thư mục ẩn và `node_modules`, `dist`,
   `build`, `target`, `.venv`, `Pods`…; cắt theo 500 thư mục/300 ms.
5. Ứng viên = thư mục có `.git` (dir hoặc file); xác thực `git rev-parse --show-toplevel` = chính
   nó; loại repo lồng trong repo khác.
6. Sắp xếp theo manifest, rồi tên; id = đường dẫn tương đối dùng `/` (`be`, `fe`, `services/auth`),
   không chứa `..`, không bắt đầu `/`.
7. Cache 30 s theo `(workspaceRoot, manifest mtime)`; nút "Quét lại" xoá cache. Repo set là nguồn
   bền từ manifest/khám phá; `git.json` chỉ cache.

**Context dir cũng là nguồn nhận diện:** nếu `header.cwd` (subagent) hoặc record trỏ vào một thư
mục có `.dsh/checkout.json`, đọc `workspaceRoot` từ manifest để tìm repo set.

Trường hợp biên: repo bare (bỏ), detached HEAD (nhận, base lấy remote), `.git` là file (worktree/
submodule — nhận nếu top-level = chính nó), symlink tới repo ngoài (mặc định không theo), repo bị
xoá/đổi tên (`missing`), case-insensitive trên Windows.

### 4.4 Mô hình dữ liệu

**`git.json`** — thêm một record context, tương thích record cũ:

```jsonc
{
  "version": 2,
  "worktrees": {
    "session-…": {
      "kind": "context",              // record cũ không có kind = single
      "sessionId": "session-…",
      "workspaceRoot": "/Users/…/workspace/omni",
      "path": "/Users/…/workspace/omni/.agents/worktrees/dsh-ad0ab5d0-1a2b",
      "name": "dsh-ad0ab5d0-1a2b",
      "createdAt": 0,
      "repos": {                       // CHỈ các repo đã materialize
        "be": {
          "id": "be",
          "path": "…/be",
          "repositoryRoot": "/Users/…/workspace/omni/be",
          "branch": "feat/multi-repo-panel",
          "base": "main",
          "start": "<sha>",
          "materializedAt": 0
        }
      }
    }
  },
  "pulls": {
    "session-…": {
      "repos": {
        "be": {
          "root": "…", "remote": "origin", "branch": "feat/be-panel",
          "number": 12, "url": "…", "state": "open", "done": false
        }
      }
    }
  }
}
```

- **Migration:** record cũ (`path`, `repositoryRoot`, `branch`) → context với một repo id =
  `basename(repositoryRoot)`; mọi reader dùng helper `checkoutUnits(record)` để lấy từng repo.
- `pulls` cũ (một binding) → `{ repos: { primary: binding } }`.
- `worktreeRequests[sessionId]` → giữ, chỉ còn cờ bật/tắt context; không cần `repos[]`.
- `probe` → `probes[sessionId] = { at, workspaceRoot, repos: [...] }`.
- Record context tồn tại **kể cả khi `repos` rỗng** — đó là dấu hiệu chat đã có context dir.

**Protocol (`plugin/src/shared/protocol.ts`):**

- `GitTarget` (:626-630) thêm `repo?: string` (id server trả, không phải path tuyệt đối).
- `WorktreeRecord` (:378-392) thêm `kind?`, `workspaceRoot?`, `repos?: Record<string, RepoCheckout>`;
  record cũ vẫn đọc được.
- `WorktreeState` (:453-473) đổi thành trạng thái context: `{ kind, context, repos: RepoState[] }`,
  giữ trường cũ cho single.
- `WorktreeInfo` (:422-442) thêm `repoId`, `role`, `state`.
- `GitCounts` (:781-789) giữ hình dạng; `worktrees` = số repo đã materialize.
- Thêm route `repos` (danh sách + vai trò + trạng thái), `checkoutRepo` (panel gọi cùng materializer),
  `checkoutState` (poll trạng thái materialize).
- `checkout_repo` là **tool**, không phải route; dùng chung materializer với route.

### 4.5 Vòng đời: context rỗng → checkout theo nhu cầu

**A. Tin nhắn đầu tiên (nếu bật cách ly):**

```text
1. resolveRepoSet(header.cwd) → N repo (không tạo worktree)
2. name = generatedWorktreeName(sessionId)
3. mkdir <workspace>/.agents/worktrees/<name>/.dsh
4. ghi checkout.json: workspaceRoot, sessionId, repos = {}
5. workingDirectory.set(agent, <context>)     // cwd rỗng, rất nhanh
6. ghi record context (repos: {})
```

Không fetch, không `git worktree`, không rollback dây chuyền. Nếu bước 3–5 lỗi, tin nhắn chạy tiếp ở
workspace cha với lỗi rõ.

**B. Đọc (không tốn worktree):**

- System context liệt kê repo, vai trò, đường dẫn cây chính; agent `read`/`grep`/`glob` bằng đường
  dẫn tuyệt đối hoặc tham số `path` của tool (grep/glob nhận `path` — `$AI/dsh-tool-fs-search/src/grep.ts:290-292`).
- Context dir rỗng nên `glob`/`grep` mặc định (cwd) không thấy repo nào; agent phải truyền `path`
  cho tới khi repo được materialize.
- Không có guard cho đọc. Không tạo checkout khi chỉ đọc.

**C. Sửa một repo — `checkout_repo`:**

```text
checkout_repo({ repo: "be", base?: "main" })
1. xác thực repo thuộc set; nếu đã materialize → trả record hiện có (idempotent)
2. base = arg ?? manifest.base[id] ?? config.worktree.base (nếu có) ?? default của repo
3. kiểm tra cây chính:
     dirty = git status --porcelain  (cấu hình có tính untracked hay không)
     nếu dirty và dirtyMain = 'abort' → lỗi, yêu cầu commit/stash
     nếu dirty và 'warn' → tiếp tục, trả warning
4. fetch base (source=remote) với timeout; lỗi fetch → fallback base local + warning
5. ensure <context>/<repoId> parent
6. git -C <repoRoot> worktree add -b <branch> <ABS context>/<repoId> <base>
     (luôn đường dẫn TUYỆT ĐỐI; tạo parent trước)
7. ghi record + cập nhật manifest; trả { path, relative, branch, base, warning? }
```

- **Chỉ một repo**: lỗi/rollback chỉ ảnh hưởng repo đó; không có "tất cả hoặc không".
- **Idempotent + tuần tự**: gọi lại trả checkout cũ; hai lời gọi đồng thời cho cùng repo được
  serialize (một tạo, một chờ/trả kết quả), không tạo hai worktree.
- **Nhánh độc lập**: tên sinh từ session/task; nếu trùng trong repo, thêm `-2`; repo khác không bị
  ảnh hưởng. Có thể đổi tên theo nghĩa vụ việc bằng model; lỗi ghi `namingError` cho repo đó.
- **Dirty main**: worktree tạo từ **base đã fetch**, không mang thay đổi chưa commit của cây chính.
  Tool trả `warning` + `dirty: true`; agent phải đọc lại từ checkout; panel hiện badge. Đây là điểm
  cần nói rõ với người dùng.
- **Sau materialize**: agent phải **đọc lại file từ checkout** (nội dung có thể khác lần đọc cây
  chính). Tool result nói rõ.

**D. Write guard (lưới an toàn):**

Đăng ký `fs/write-intent`, `fs/edit-intent`, `fs/delete-intent`. Với mỗi target:

```text
session = actor.agent.session
nếu session không ở isolated mode / không có context → cho qua
repo = repo chứa target (so canonical path)
nếu target nằm trong context dir → cho qua
nếu target nằm trong cây chính của một repo thuộc set:
    nếu repo đang materialize:
        từ chối: "Checkout cho 'be' đang được tạo; chờ hoàn tất rồi ghi trong <context>/be/…"
    nếu repo chưa materialize:
        từ chối: "Repo 'be' chưa có checkout cho chat này. Gọi checkout_repo({repo:'be'})
                  trước, rồi ghi trong <context>/be/…"
    nếu đã materialize:
        từ chối: "Repo 'be' có checkout cách ly tại <context>/be; ghi ở đó, không ghi cây chính."
```

- Trả lỗi kiểu `FsError` với thông điệp model-đọc-được (dùng code `FS_PERMISSION_DENIED` hoặc lỗi
  có `code` tương thích; cần kiểm chứng mapping của `dsh-tool-fs`).
- Guard chỉ áp dụng cho **file tool** (`write`, `edit`, `apply_patch`, `str_replace_editor`…), chạy
  trước mutation. Bash đi đường khác — xem §7.
- Cache repo set/context trong bộ nhớ; guard không đọc đĩa mỗi lần ghi.
- Cấu hình `enforceIsolation: true` (mặc định); tắt được cho người muốn sửa main tree có chủ đích.

**E. Xoá:**

- Xoá một repo khỏi context: `worktree remove` repo đó (từ chối nếu bẩn, trừ `force`), xoá nhánh nếu
  cấu hình; cập nhật record/manifest; context dir vẫn còn (có thể materialize lại).
- Xoá cả context: chuyển phiên về `workspaceRoot` trước (nếu đang đứng trong context), xoá từng
  checkout, rồi xoá dir + record. Chỉ khi chat bị xoá/archive theo cấu hình hoặc người dùng bấm.
- Dọn dẹp: quyết định **theo từng checkout** (tuổi/bẩn/không commit), không xoá context dir khi
  chat còn sống; context dir rỗng gần như miễn phí. Khi xoá checkout, panel trở về `chưa checkout`.
- Active-check: context đang dùng nếu `live` nằm trong `path` hoặc bất kỳ checkout con; sửa
  `isInside(target, live)` hiện tại (`git.ts:545-557`) trước khi bật lazy.

**F. Sửa (repair):**

- Thiếu một checkout: materialize lại từ record/branch; nếu nhánh mất, tạo lại từ `start`.
- Thiếu context dir: DSH `ensure()` đã đưa phiên về workspace root; panel hiện "Context đã mất" +
  "Tạo lại". `checkout_repo` (hoặc nút panel) tạo lại context dir và `workingDirectory.set` lại;
  nếu không, chat chạy ở direct mode và guard tương ứng tắt.
- Repo (bất kỳ) đổi tên/xoá: đánh dấu `missing`, không tự đoán.

### 4.6 Panel và UX

**Thanh repo:**

```text
[ Tất cả ] [ be · Backend · chưa checkout ] [ fe · Frontend · chưa checkout ] [ docs · Tài liệu · 1 tệp ]   🔎  ⟳
```

- Chip hiện tên repo, vai trò (nếu có) + trạng thái + số tệp đổi (nếu đã checkout).
- Với 10+ repo, thanh chip có ô lọc/tìm và cuộn ngang; không ép hiện hết cùng lúc.
- Trạng thái: `chưa checkout` / `đang tạo` / `đã checkout` / `lỗi` / `missing`.
- Bấm chip ⇒ tab của repo đó. Repo chưa checkout: tab Changes hiện "Chưa có checkout cho chat này"
  + nút **Tạo checkout**; không hiện commit/push/PR.
- Tab "Tất cả" = tổng quan: repo đã checkout (nhóm changes), repo chưa checkout (danh sách + nút).
  Không có thao tác Git gộp.
- `＋ Kho khác`: repo ngoài `core`/đang ẩn; thêm vào panel, vẫn cần checkout khi sửa. Với workspace
  chỉ có repo, mục này không xuất hiện.
- Nếu model đã `cd` vào một checkout con, panel vẫn đọc context từ manifest, không suy từ cwd.

**Những gì giữ một repo:** toàn bộ thao tác Git — commit, push, pull, PR, merge, branch switch,
publish, diff, commit/PR/issue detail.

**Worktrees tab:**

- Một thẻ cho mỗi chat/context: đường dẫn, danh sách repo **đã materialize** (nhánh/base/bẩn),
  repo chưa checkout (nút tạo), "Xoá context".
- Mỗi dòng repo: "Mở repo", "Xoá checkout", "Đổi base"? (chỉ hiện khi cần).
- Bên dưới: worktree ngoài context theo từng repo (như hiện nay).

**New Session:**

- Ô **"Cách ly theo nhu cầu"** (mặc định bật): chỉ tạo context dir; worktree sinh khi sửa.
- Không cần chọn repo trước. Tuỳ chọn nâng cao: "Tạo sẵn checkout cho…" nếu người dùng biết trước.
- Base: "theo từng repo"; không cần chọn.
- Nếu tắt: chat ở workspace cha, ghi cây chính, panel như "worktree off".

**Trạng thái lỗi/empty:**

- 0 repo: "Thư mục này chưa có kho Git nào" + "Quét lại".
- Workspace nằm trong repo: gợi ý mở thư mục cha.
- Tạo checkout lỗi: lỗi từng repo, "Thử lại"; repo khác không bị ảnh hưởng.
- Cây chính bẩn: badge + warning trong tool result.

### 4.7 Git độc lập từng repo

- **Commit:** mỗi repo một commit, thông điệp từ diff repo đó; repo không có tệp chọn thì bỏ qua.
- **Push:** mỗi repo một lần, độc lập; nhánh mặc định xác nhận riêng.
- **PR:** mỗi repo một PR, tiêu đề/thân từ facts repo đó; base từ repo; không liên kết.
- **Merge:** gộp từng PR; không "gộp cả set".
- **Theo dõi/archive:** mặc định **không auto-archive** cho multi-repo. Watcher hiện chỉ giữ một
  binding/phiên, nên P2 **không track** PR của chat nhiều repo để tránh archive khi mới gộp một repo;
  set-aware tracking + archive khi tất cả gộp là P3. Một repo vẫn có thể merge/push thủ công bình
  thường.
- **Dọn dẹp:** theo từng checkout; context dir giữ lại.
- **Change set xuyên repo:** P3, tuỳ chọn; không ảnh hưởng P0–P2.

### 4.8 Trải nghiệm agent

**Cwd = context dir rỗng**, nên:

- Agent thấy các repo đã materialize như thư mục con; đọc/ghi tương đối sau khi checkout.
- Trước khi checkout, đọc/tìm repo qua đường dẫn tuyệt đối (context liệt kê); `grep`/`glob` truyền
  `path` là đường dẫn cây chính.
- Không có repo chính; thứ tự materialize không quan trọng.
- Subagent thừa hưởng context dir; nếu nó cần repo chưa checkout, gọi cùng tool (materialize vào
  context của chat cha, không tạo context riêng).

**System-prompt context** (bắt buộc, P1) — ví dụ với `be`/`fe`/`docs`:

```text
Workspace: /Users/…/workspace/omni
Repositories (equal; create a checkout only when you will modify one):
- be — Backend API — /…/omni/be — not checked out
- fe — Frontend — /…/omni/fe — not checked out
- docs — Tài liệu — /…/omni/docs — checked out at /…/dsh-…/docs (branch docs/…)
To modify a repo: call checkout_repo({repo}); then edit inside the returned path; re-read files from
that checkout. Never edit a repository's main checkout. Reading anywhere under the workspace is allowed.
```

**Tool** `checkout_repo`:

- Chỉ hiện với phiên multi-repo (conditional `when`); args `repo`, optional `base`.
- Trả `path`, `relative`, `branch`, `base`, `warning?`, `dirty?`.
- Idempotent; lỗi rõ nếu repo không tồn tại/đang tạo.

**Guard** là lưới an toàn; nếu model quên tool, lần ghi đầu bị từ chối với hướng dẫn, nó gọi tool
rồi thử lại. Chi phí: một tool call lỗi; đổi lại không bao giờ ghi nhầm main tree.

**Mất tự nạp instructions/skills:** giống mọi worktree hiện nay. Bù bằng (a) context ở trên,
(b) `AGENTS.md` sinh trong context dir trỏ tới `be/AGENTS.md`, `docs/…`, (c) tuỳ chọn marker
`.dsh-workspace.json` + `projectRootMarkers` cho row agent-instructions để `AGENTS.md` workspace tự
nạp; skills vẫn cần `customSkillDirs`.

**Bề mặt DSH khác:** thẻ "tệp đã đổi" chỉ còn file-tool edits (giống worktree hiện nay); sidebar
duyệt workspace cha; forge panel có sẵn ẩn trong context; scheduled task bắt đầu ở workspace cha.
Ghi rõ trong README.

### 4.9 An toàn và bất biến

1. `repo` là id; server resolve trong repo set; không nhận path tuyệt đối từ browser.
2. Guard chặn ghi cây chính của repo thuộc workspace (khi isolated mode); cho phép ghi trong
   context dir.
3. Mọi thao tác xoá kiểm tra `isInside(contextPath, path)` + record khớp session; không xoá cây
   chính.
4. Trước khi xoá context: `workingDirectory.set(agent, workspaceRoot)`; cân nhắc
   `working-directory/access` để chặn chen giữa (`$AI/dsh-working-directory/src/index.ts:22-35`).
5. Materialize chỉ tạo nhánh/worktree do chính lần gọi đó sinh ra; lỗi thì xoá phần đã tạo.
6. Không sửa `.git` cây chính ngoài việc tạo/xoá worktree và nhánh do plugin sở hữu.
7. Phân biệt `no-repos`, `not-a-directory`, `inside-a-repo`, `missing-repo`, `not-checked-out`.

### 4.10 Canonical và đa nền tảng

- `realpath` cho định danh; giữ spelling cho hiển thị (`/tmp` → `/private/tmp` trên macOS).
- **Luôn đường dẫn tuyệt đối** cho `git -C <repo> worktree add`: đường dẫn tương đối được git hiểu
  theo repo root (đã kiểm chứng; xem §9).
- Windows: lowercase khi so sánh; không dựa symlink; `context` nằm trong workspace nên không cần
  `additionalWritableRoots`.
- Guard dùng so sánh path đã canonical, không so chuỗi thô.

### 4.11 Hiệu năng

| Việc | Cách tối ưu |
|---|---|
| Bắt đầu chat | Chỉ `mkdir` + manifest + `workingDirectory.set`; không git. |
| Khám phá | readdir + stat, depth 2, cache 30 s; không quét khi chat không mở panel. |
| Materialize | Một repo/lần; fetch timeout; fallback local; không chặn repo khác. |
| Guard | Cache repo set/context theo session; chỉ so prefix; < 5 ms. |
| Panel | Chip đọc nhẹ (branch + status) cho repo đã checkout; repo chưa checkout chỉ hiện vai trò. |
| Context | TTL/không đổi trong suốt chat; cập nhật khi materialize/xoá. |

---

## 5. Kế hoạch triển khai

### 5.1 Pha

| Pha | Mục tiêu | Việc chính | File chính | Điều kiện ra |
|---|---|---|---|---|
| **P0** | Repo set + panel theo repo | `repo-set.ts`; `GitTarget.repo`; route `repos`; chip repo (vai trò tuỳ chọn); Changes/Commits/Pulls/Issues theo repo; All = tổng quan; empty state; sửa lỗi | `lib/repo-set.ts` (mới), `features/git.ts`, `shared/protocol.ts`, `client/git/*` | Workspace mẫu bất kỳ (0/1/N, flat/nested) hiện đủ repo; chọn repo xem/commit/push/PR; single-repo không đổi |
| **P1** | Context dir + lazy checkout | `context.ts` (tạo/xoá/manifest); sửa `sessionCheckout`/`repository`; model tool `checkout_repo`; write guard; system context; panel trạng thái + nút tạo; New Session toggle; sửa active-check | `lib/context.ts` (mới), `features/git.ts`, `client/worktree.tsx`, `client/git/*` | Chat bắt đầu với 0 worktree; sửa repo nào tạo đúng repo đó; guard chặn main tree; agent thấy vai trò/đường dẫn |
| **P2** | Hoàn thiện | Worktrees nhóm theo context; dọn dẹp từng checkout; archive đúng; xoá context; repair; `＋ Kho khác`; dirty-main UX | `features/git.ts`, `lib/merge-watch.ts`, `lib/worktree-cleanup.ts`, `client/git/worktrees.tsx` | Dọn dẹp an toàn; archive không sớm; thêm/xoá repo giữa chat |
| **P3** | Tuỳ chọn | Change set xuyên repo; eager mode; `workspace_repos` tool; marker instructions; setup hook | nhiều | Chỉ khi có nhu cầu |

**Phát hành:** P0 + P1 cùng bản; P2 tiếp theo. P3 sau.

**Ước lượng:** P0 1–2 ngày; P1 3–5; P2 2–3; P3 2–3 (tuỳ chọn). Đường tới hạn **6–10 ngày công**.

### 5.2 Bản đồ file

| File | Thay đổi |
|---|---|
| `plugin/src/lib/repo-set.ts` (mới) | Khám phá, manifest, role, id, cache, resolve repo từ target. |
| `plugin/src/lib/context.ts` (mới) | Tạo/xoá context dir + manifest; materialize một repo; record; trạng thái; repair. |
| `plugin/src/lib/worktree.ts` | Dùng `poolDirectory(workspaceRoot)`; `createWorktree` cho một repo; giữ nguyên hàm cũ. |
| `plugin/src/features/git.ts` | `repository()` nhận `repo`; context state; tool `checkout_repo`; fs guard; system context; route `repos`/`checkoutRepo`; worktreeState/Worktrees set-aware; sửa `isSessionActive` (:427, :545), `sessionCheckout` (:2607). |
| `plugin/src/lib/merge-watch.ts` | PR theo repo trong context; archive khi tất cả gộp (nếu bật). |
| `plugin/src/lib/worktree-cleanup.ts` | Quyết định theo từng checkout; active-check theo context. |
| `plugin/src/shared/protocol.ts` | Type/route ở §4.4. |
| `plugin/src/client/git/panel.tsx` | Chip repo + vai trò + trạng thái; All overview; không thao tác gộp. |
| `plugin/src/client/git/changes.tsx` | Repo chưa checkout → empty state + nút tạo. |
| `plugin/src/client/git/worktrees.tsx` | Nhóm theo context; từng repo; xoá. |
| `plugin/src/client/worktree.tsx` | Toggle "Cách ly theo nhu cầu"; dock trạng thái materialize. |
| `plugin/src/client/i18n.ts` | Khoá `gitRepo*`, `ctx*`, `wtRepo*` (en + vi). |
| `plugin/test/*` | repo-set, context, materialize, guard, rpc, protocol, panel. |

### 5.3 Cấu hình

```jsonc
{
  "git": {
    "workspace": { "scanDepth": 2 },
    "checkout": {
      "mode": "lazy",            // lazy | eager | off
      "enforceIsolation": true,
      "dirtyMain": "warn",       // warn | abort
      "fetchOnCheckout": true,
      "parallel": 2              // chỉ khi eager/materialize nhiều repo
    }
  }
}
```

- `off` = không cách ly (chat ở workspace cha, ghi cây chính) — hành vi "worktree off".
- `eager` = tạo trước các repo `core` lúc bắt đầu chat (E2, không khuyến nghị cho workspace nhiều
  repo lớn). Đây là **mặc định cho workspace một repo ở gốc**, để giữ hành vi cũ.
- `lazy` = **mặc định cho workspace nhiều repo**; chỉ context dir + materialize khi sửa. Có thể bật
  cho cả workspace một repo nếu muốn áp dụng quy tắc "chỉ tạo khi sửa" cho mọi chat.
- Thứ tự ưu tiên: manifest workspace > cấu hình plugin > mặc định. Mọi trường mới giữ hành vi một repo.

---

## 6. Kiểm thử

| Loại | Nội dung |
|---|---|
| Unit — khám phá | 2 repo ngang hàng, repo lồng, `node_modules`, symlink, `.git` file, bare, trùng tên, case; manifest `core`/`roles`; cache mtime. |
| Unit — context | Tạo context rỗng; manifest; record `repos: {}`; migration record cũ; resolve context từ subagent. |
| Unit — materialize | Idempotent; base/remote từng repo; branch trùng → suffix; dirty main warn/abort; lỗi `worktree add` → không còn dir/branch mồ côi; repo khác không đổi. |
| Unit — guard | Target trong cây chính chưa checkout → từ chối + hướng dẫn; đã checkout → từ chối và chỉ path; target trong context → cho qua; direct mode → cho qua; target ngoài repo → cho qua. |
| Integration — git thật | Ví dụ 3 repo + bare remote; chat 1 chỉ sửa repo A: chỉ 1 worktree; commit/push/PR A; chat 2 sửa repo C: 1 worktree; không đụng B. Lặp với 1 repo, 10 repo, repo lồng, thư mục không phải Git. |
| Integration — dirty | Cây chính `be` bẩn; materialize warn → checkout từ base + warning; abort → lỗi rõ; thay đổi cây chính còn nguyên. |
| RPC | `repos`, `checkoutRepo`, `overview` với `repo`; repo chưa checkout → lỗi `repo/not-checked-out`; `repo` ngoài set bị từ chối. |
| Protocol | Type mới; record cũ đọc/ghi được; state `materializing`. |
| Hồi quy | Toàn bộ test cũ; workspace một repo auto-worktree y hệt. |
| Thủ công | Ví dụ `omni`: chat đọc 3 repo (0 worktree); sửa A (1); sửa C (2); commit/push/PR từng repo; đóng/mở lại; dọn dẹp; subagent. Thêm workspace 1 repo, 10 repo, nested. |
| Windows | Đường dẫn, ổ đĩa, case, junction (không symlink). |

**Tiêu chí chấp nhận:**

1. Single-repo: không đổi hành vi/giao diện; test cũ xanh.
2. Chat chỉ đọc: **0 worktree**, context dir rỗng, không lỗi.
3. Chat sửa `be`: đúng 1 worktree (`be`); `fe`/`docs` không có; `git -C be` đúng nhánh/base.
4. Agent ghi cây chính: bị guard chặn với hướng dẫn; sau khi gọi `checkout_repo`, ghi được trong
   checkout.
5. Commit/push/PR `be` không đổi nhánh/PR `docs`; archive không xảy ra khi mới gộp một repo.
6. Resume: context dir + record còn; checkout thiếu được phát hiện; dọn dẹp không xoá checkout đang
   dùng.
7. Context dir mất: phiên về workspace cha, panel báo, tạo lại được.

---

## 7. Rủi ro và giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Guard/tool phụ thuộc API nội bộ DSH (fs intent, tool registry) | Trung bình | Kiểm tra capability lúc mount; nếu thiếu tool/guard, hạ cấp sang "nhắc trong context + nút panel"; test theo version. |
| Model quên `checkout_repo`, bị chặn lần ghi đầu | Trung bình | Context nêu rõ quy tắc; guard trả hướng dẫn chính xác; thử với model thật; có thể thêm chế độ auto-materialize trong guard. |
| Bash ghi thẳng cây chính (guard chỉ phủ file tool) | Trung bình | Context cấm; rà soát command; tương lai có thể thêm guard cho bash nếu cần. |
| Cây chính bẩn: checkout từ base không mang thay đổi chưa commit | Cao | `dirtyMain: warn` + tool warning + panel badge; tuỳ chọn `abort`; hướng dẫn commit/stash; agent đọc lại từ checkout. |
| Agent đọc cây chính rồi sửa checkout (nội dung khác) | Trung bình | Tool result nhắc đọc lại; context nêu rõ; commit/PR chỉ trên checkout. |
| Mất tự nạp `AGENTS.md`/skills | Cao → trung bình nếu marker | Context + `AGENTS.md` sinh; marker `.dsh-workspace.json` + `projectRootMarkers`; skills cần `customSkillDirs`. |
| Thẻ "tệp đã đổi" thiếu shell edits | Trung bình | Panel Git là nguồn chính; turn report dùng plugin; không hồi quy so với worktree. |
| Hai mô hình worktree (plugin + DSH có sẵn) | Trung bình | Khuyến nghị tắt bundle worktree có sẵn khi multi; tool có sẵn lỗi trong context (vô hại). |
| Cleanup xoá nhầm context/checkout đang dùng | Cao | Active-check đúng; test; chỉ xoá trong context + record khớp; giữ context dir khi chat sống. |
| Model bối rối vì cwd rỗng | Trung bình | Context liệt kê đường dẫn tuyệt đối + vai trò; tool trả path; thử UX. |
| Nâng cấp DSH đổi hành vi cwd/sandbox/fs | Trung bình | Capability check; test tích hợp theo version. |
| Windows (đường dẫn, junction) | Trung bình | Canonical, lowercase; không symlink; test. |
| Code phình trong `features/git.ts` | Trung bình | Tách `repo-set.ts`, `context.ts`; giữ handler mỏng. |

---

## 8. Giới hạn đã biết và câu hỏi cần chốt

**Giới hạn chấp nhận:**

- Cwd context dir làm DSH không tự nạp instructions/skills ngoài context; forge panel có sẵn ẩn;
  sidebar duyệt workspace cha; thẻ changes thiếu shell edits. Có cách bù, không sửa triệt để nếu
  không đổi DSH.
- Cách ly là quy ước + guard file tool, không phải sandbox tuyệt đối (bash có thể lách; Windows
  sandbox không hỗ trợ extra root — nhưng thiết kế này không cần).
- Không hỗ trợ workspace nằm trong repo.
- Không hỗ trợ repo ngoài workspace.
- Không có change set/gộp xuyên repo cho tới P3; auto-merge/archive cho multi cũng ở P3 (watcher
  chưa set-aware).
- Cây chính bẩn không được mang sang checkout; phải commit/stash hoặc chấp nhận đọc lại.

**Câu hỏi cần chốt:**

1. Ngoài các kiểu ở §1.6, bạn còn gặp kiểu workspace nào cần xử lý riêng không? (Không cần liệt kê
   repo cụ thể — plugin khám phá, manifest chỉ để thêm vai trò/base.)
2. Khi agent sửa lần đầu một repo: **từ chối + yêu cầu gọi `checkout_repo`** (rõ ràng, một lượt
   thêm) hay **guard tự tạo checkout rồi từ chối kèm path** (ít lượt hơn, lỗi đầu tiên trông lạ)?
   Tôi đề xuất cách đầu.
3. Cây chính bẩn: `warn` (tiếp tục, cảnh báo) hay `abort` (bắt commit/stash)? Tôi đề xuất `warn`.
4. Có bao giờ cần commit/push/PR gộp xuyên repo không? Nếu không, bỏ hẳn P3.
5. Triển khai P0 + P1 ngay hay dừng ở tài liệu?

---

## 9. Phụ lục: kiểm chứng

### 9.1 Thử nghiệm git (thư mục tạm, macOS)

Đã dựng 2 bare remote + 2 clone (`api`, `web`) trong thư mục cha thường, tạo
`.agents/worktrees/dsh-test-1234/{api,web}` bằng `git worktree add -b feat/x`, rồi:

- `git -C .agents/.../api status` ⇒ `## feat/x`;
- `git -C .agents/.../web rev-parse --show-toplevel` ⇒ đúng thư mục con;
- `git -C <context> status` ⇒ `fatal: not a git repository` (đúng: gốc context không phải repo);
- đổi tên nhánh ở cả hai ⇒ cùng tên; xoá worktree + nhánh ⇒ chỉ còn thư mục rỗng.

**Phát hiện quan trọng:** `git -C "$root/$r" worktree add ... ".agents/..."` lần đầu tạo checkout
**bên trong repo** vì đường dẫn tương đối được hiểu theo repo root. Luôn dùng đường dẫn tuyệt đối.

Ngoài ra `rev-parse` trả `/private/tmp/...` trong khi đường dẫn tạo là `/tmp/...` — cần `realpath`
khi so sánh/ghi record.

### 9.2 Nguồn DSH đã đọc (bản `0.2.2-rc.5`)

- `$AI/dsh-working-directory/src/index.ts` — cwd hiệu lực, validate `fs.stat`, replay, fallback.
- `$AI/dsh-sandbox-policy/src/index.ts` — biên `header.cwd`, `registerWritableRoot`.
- `$AI/dsh-workspace-changes/src/{index,recorder,git}.ts` — repo lấy từ `header.cwd`.
- `$AI/dsh-agent-instructions/src/{index,files}.ts` — projectRoot = `.git` gần nhất, else cwd.
- `$AI/dsh-subagent/src/manager.ts` — thừa hưởng cwd hiệu lực.
- `$AI/dsh-fs/src/index.ts` — `fs/*-intent` waterfalls.
- `$AI/dsh-tool-fs/src/write.ts` — dispatch `fs/write-intent` với `exec` (actor).
- `$AI/dsh-fs-observation-policy/src/index.ts` — actor → `agent.session`; listener mẫu.
- `$AI/dsh-tools/README.md`, `$AI/dsh-system-prompt/README.md` — tool + prompt context.
- `$AI/dsh-tool-fs-search/README.md` — search bao gồm file ẩn/ignored (lý do dùng context dir).
- `$AI/dsh-experimental-worktree/src/index.ts` — worktree có sẵn, pool `.agents/worktrees`.

### 9.3 Mã plugin đã đọc

- `plugin/src/features/git.ts` — `repository` (:2638), `sessionCheckout` (:2607), `worktreeState`
  (:2029), `worktreeIntent` (:673), `createCheckoutForMessage` (:801), `isSessionActive` (:427,
  :545).
- `plugin/src/lib/worktree.ts` — pool/tạo/xoá (:129-162, :543-668).
- `plugin/src/lib/worktree-cleanup.ts` — quyết định (:125-155), vòng dọn (:202-254).
- `plugin/src/lib/merge-watch.ts` — binding (:48-77), reconcile (:316-359), settle (:504-608).
- `plugin/src/shared/protocol.ts` — `GitTarget` (:626), `WorktreeRecord` (:378), `WorktreeInfo`
  (:422), `WorktreeState` (:453), `GitOverview` (:475).
- Client: `plugin/src/client/git/panel.tsx` (:69-111), `changes.tsx`, `actions.tsx`,
  `worktrees.tsx`; `plugin/src/client/worktree.tsx` (:44-48, :122-208).
