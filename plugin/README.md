# Personal hub — plugin cá nhân cho DeepSeek Harness

Một bundle duy nhất, nhiều tính năng: **điều khiển DSH từ xa qua Telegram**, và **bảng Git** ở
thanh bên phải (thay đổi, diff từng tệp, commit, pull request kèm trạng thái, issue).
Bảng Git còn **tạo pull request bằng model của phiên** (effort thấp nhất), **worktree riêng cho
phiên mới** (bắt đầu từ nhánh local hoặc nhánh remote đã fetch), và **dọn dẹp sau khi PR được gộp**.

Gửi tin nhắn trong chat Telegram đã ghép nối → tin nhắn thành prompt cho một phiên DSH →
câu trả lời được đẩy về chat thành các tin riêng: phản hồi trung gian, tóm tắt thay đổi chính,
rồi phản hồi cuối.

## 1. Tạo bot Telegram

1. Mở Telegram, chat với [@BotFather](https://t.me/BotFather).
2. Gửi `/newbot`, đặt tên và username cho bot.
3. BotFather trả về token dạng `123456789:AA...`.

## 2. Đưa token cho plugin

Cách 1 — trong giao diện DSH (khuyến nghị): mở **Plugins** ở thanh bên → **Personal hub** →
nút cấu hình của hàng `personal-hub` → dán token vào ô **Token bot** → **Lưu token**.
Token được lưu trong kho bí mật của DSH (credential store), không ghi vào tệp cấu hình.
Nếu vừa cài plugin, tải lại trang một lần (F5) để giao diện cấu hình xuất hiện.

Cách 2 — tệp token: tạo `%USERPROFILE%\.dsh\personal-hub\telegram-remote\token` với nội dung
duy nhất là token. Cách 3 — biến môi trường `DSH_TELEGRAM_BOT_TOKEN` rồi khởi động lại DSH.

Thứ tự ưu tiên: `telegram.token` trong cấu hình → credential `DSH_TELEGRAM_BOT_TOKEN` →
biến môi trường `telegram.tokenEnv` → tệp token.

Tệp token và credential được đọc lại mỗi vòng poll, nên token mới có hiệu lực trong vài giây.
Nếu token sai, trạng thái là `invalid-token` và plugin thử lại mỗi 15 giây.

## 3. Ghép nối chat đầu tiên

Nhắn `/start` cho bot. Chat đầu tiên gửi `/start` sẽ được ghép nối và ghi vào
`state.json`; mọi chat khác bị từ chối. Muốn đổi chủ, sửa `allowedChatIds` trong cấu hình
hoặc xoá `allowedChatIds` trong `state.json`.

## 4. Cấu hình

Cấu hình nằm ở hàng `personal-hub` trong bundle patch của profile:

```yaml
telegram:
  enabled: true          # tắt tính năng mà không cần gỡ bundle
  token: ''              # token trực tiếp (không khuyến nghị)
  tokenEnv: DSH_TELEGRAM_BOT_TOKEN
  tokenFile: ''          # mặc định <DSH_HOME>/personal-hub/telegram-remote/token
  allowedChatIds: []     # rỗng = cho phép chat đầu tiên ghép nối
  cwd: ''                # thư mục cho phiên mới; rỗng = thư mục làm việc mặc định của DSH
  pollTimeoutSec: 25     # thời gian long-poll mỗi vòng
  requestTimeoutMs: 900000
  progressIntervalMs: 1500
  pushResponses: true    # đẩy từng phản hồi trung gian vào chat
  pushChanges: true      # đẩy tóm tắt thay đổi chính của lượt
```

### Phản hồi trong chat

Mỗi lượt trả lời được đẩy về chat thành nhiều tin:

- 💬 từng phản hồi trung gian (phần trợ lý nói trước khi gọi công cụ);
- 🔧 **Thay đổi chính** — các tệp đã đổi trong lượt kèm số dòng thêm/xoá, đọc từ dịch vụ
  `workspaceChanges` của DSH; nếu profile không mount dịch vụ này thì plugin tóm tắt từ
  công cụ sửa tệp và lệnh đã chạy;
- ✅ phản hồi cuối cùng.

Tin `⏳ Đang xử lý…` hiển thị tiến độ (số phản hồi, số tệp) và bị xoá khi lượt xong.
Đặt `pushResponses: false` hoặc `pushChanges: false` để tắt từng loại tin.

## 5. Lệnh trong chat

| Lệnh | Tác dụng |
|---|---|
| `/new [thư-mục]` | Tạo phiên mới và gắn với chat |
| `/sessions [trang]` | Liệt kê phiên gần đây; chạm số để gắn, chạm 📦 để lưu trữ |
| `/session <số\|sessionId>` | Gắn chat với một phiên có sẵn |
| `/archived [trang]` | Liệt kê phiên đã lưu trữ; chạm để khôi phục |
| `/archive [số\|sessionId]` | Lưu trữ phiên (mặc định phiên đang gắn) |
| `/restore <số\|sessionId>` | Khôi phục phiên đã lưu trữ |
| `/workspaces` | Liệt kê workspace của DSH, kèm nút bấm để chọn |
| `/workspace <số\|id\|đường-dẫn>` | Chọn workspace cho phiên mới (dùng khi không bấm nút) |
| `/models` | Liệt kê provider và model đang dùng được, kèm nút bấm để chọn |
| `/model <số\|provider/model[@effort]>` | Đổi model cho phiên hiện tại (dùng khi không bấm nút) |
| `/status` | Phiên đang gắn, thư mục/workspace, model, đang chạy, hàng đợi, chờ phê duyệt |
| `/cancel` | Dừng lượt đang chạy |
| `/unbind` | Bỏ gắn phiên (giữ workspace và model đã chọn) |
| `/use <sessionId>` | Gắn chat với phiên có sẵn |
| `/whoami` | Chat id của bạn |
| `/help` | Danh sách lệnh |

Workspace và model đã chọn được lưu theo chat trong `state.json` (`prefs`) và áp dụng cho mọi
phiên mới của chat đó; `/workspace` chỉ đổi phiên kế tiếp, không di chuyển phiên đang mở.
`/model` áp dụng ngay cho phiên đang gắn và đồng thời cập nhật model mặc định của DSH
giống như bộ chọn model trong giao diện.

`/sessions` đọc danh sách phiên từ `sessionController.list()` và hiển thị theo trang (8 phiên/trang).
Mỗi dòng có nút chọn phiên và nút 📦 để lưu trữ; lưu trữ là thao tác của `workspaceRegistry`
nên phiên vẫn giữ nguyên dữ liệu và có thể khôi phục bằng `/archived`. Lưu trữ phiên đang gắn sẽ
tự bỏ gắn chat; phiên đang chạy phải `/cancel` trước. DSH hiện chưa có API xoá phiên, nên plugin
không xoá tệp phiên.

Tin nhắn văn bản thường = prompt. Tin nhắn dài được chia thành nhiều tin ≤ 4096 ký tự.

## 6. Bảng Git (thanh bên phải)

Tab **Git** nằm trong thanh bên phải của DSH, cạnh Files/Browser/Terminal. Mở bằng một trong ba cách:

- nút **Git** ở góc phải tiêu đề phiên — mở tab cho phiên đang xem;
- trang bắt đầu của thanh bên phải → thẻ **Git**;
- dấu **+** trong dải tab của thanh bên phải.

Tab đọc kho mã của **thư mục làm việc của phiên**: Host tự tra từ phiên nên không cần cấu hình gì
thêm. Bảng tự làm mới theo `git.refreshMs` (mặc định 30 giây), khi bấm nút ⟳, và khi bạn quay lại
cửa sổ DSH.

### Thay đổi

- Nhóm **Đã stage**, **Chưa stage**, **Chưa theo dõi**, **Xung đột**.
- Mỗi tệp có nhãn A/M/D/R/C/!/U theo màu, thư mục mờ phía trước tên tệp, và `+n −m` theo số dòng.
- Bấm một tệp → diff từng dòng: số dòng hai bên, nền xanh/đỏ, dòng `@@` của hunk, tự cắt khi diff
  quá dài, và ghi chú riêng cho tệp nhị phân.
- Đầu bảng có nhánh hiện tại (`↑ahead ↓behind`), remote, thanh tỉ lệ thêm/bớt, số tệp đang stash,
  và chip PR của nhánh nếu nhánh đã có pull request.

### Pull request và issue

- Danh sách PR lọc theo Đang mở / Đã gộp / Đã đóng / Tất cả, kèm trạng thái kiểm tra
  (`x lỗi`, `x đang chạy`, `x đạt`), quyết định đánh giá, và nhánh nguồn.
- Trang chi tiết PR: mô tả, danh sách kiểm tra có thời lượng và liên kết, đánh giá, danh sách tệp,
  bình luận, và nút mở trên web.
- Issue: danh sách lọc Đang mở / Đã đóng / Tất cả; chi tiết có nhãn, mô tả và bình luận.
- Tab **Commit**: lịch sử gần nhất; bấm một commit để xem mô tả, tệp thay đổi và toàn bộ patch.

### Tạo pull request bằng AI

Trong tab **Pull request** có nút **Tạo pull request**. Bấm lần thứ nhất để xem xác nhận (nhánh
nguồn → nhánh nền, chọn được nhánh nền), bấm **Tạo** để chạy:

1. Plugin đẩy nhánh hiện tại lên remote (`git push --set-upstream`); đặt `git.pull.push: false` nếu
   bạn tự đẩy trước.
2. Model **đang dùng cho phiên này** viết tiêu đề và mô tả từ các commit cùng diff của nhánh, với
   **effort suy luận thấp nhất** mà route đó hỗ trợ (`reasoning.efforts[0]`). Có thể ghim route
   khác bằng `git.pull.provider` + `git.pull.model`.
3. Pull request được mở bằng `gh pr create` (GitLab: `glab mr create`), hoặc REST API GitHub khi
   không có CLI đã đăng nhập.
4. Pull request vừa tạo được **gắn với phiên** để theo dõi việc gộp.

Nếu không gọi được model (chưa có LLM, model lỗi, timeout) thì plugin vẫn tạo PR bằng bản nháp dựng
từ commit và tên tệp, và ghi lý do vào `draft.error` trong câu trả lời — không chặn thao tác.
Nhánh chưa có commit mới so với nhánh nền sẽ bị từ chối với `pr/no-commits`.

### Worktree cho phiên mới

Ở màn hình **New Session**, cạnh bộ chọn workspace có một hàng giống T3 Code: nút **Worktree mới**,
ông chọn **nhánh nền** (mặc định là nhánh mặc định của kho, hoặc `git.worktree.base`), và hai nút
**Nhánh local** / **Nhánh remote**.

- Bấm **Worktree mới** là checkout được tạo ngay: `<kho>/.agents/worktrees/dsh-<8 ký tự id>-<4 ký
  tự>` trên nhánh mới cùng tên, rồi **thư mục làm việc của phiên** chuyển sang đó. Hàng đổi thành
  chip tên nhánh kèm ✕ để xoá và quay về dự án.
- Đổi nhánh nền (hoặc nguồn local/remote) khi đã tạo thì checkout được tạo lại từ nhánh mới — an
  toàn vì phiên chưa chạy lượt nào.
- Với nguồn remote, plugin chạy `git fetch <remote> <nhánh>` trước, nên worktree bắt đầu từ đúng
  commit trên máy chủ mã nguồn, không phải bản fetch cũ trên máy.
- Thư mục `.agents/worktrees/` tự sinh `.gitignore` chứa `*` nên checkout không hiện trong
  `git status` của dự án.

Tính năng cần một git checkout thường (không phải worktree liên kết), phiên đã mở, và
`git.worktree.enabled: true`. Các lý do từ chối đều có mã riêng: `worktree/no-agent`,
`worktree/already`, `worktree/linked-project`, `worktree/unknown-base`, `worktree/fetch-failed`,
`worktree/dirty` (xoá khi còn thay đổi chưa commit).

**Vì sao tạo ngay khi bật, không phải lúc gửi tin nhắn:** T3 Code tạo worktree khi bạn gửi tin đầu
tiên và giữ tin đó lại cho tới khi xong. Trên DSH, prompt của một bước được lắp (`systemPrompt.assemble`)
**trước** hook `agent/pre-step` — hook duy nhất mà plugin có thể `await` — nên nếu tạo lúc gửi thì
bước đầu tiên vẫn được mô tả thư mục cũ. Vì vậy plugin tạo ngay khi bạn bật, để thư mục đúng trước
khi model chạy.

#### Đặt tên nhánh theo việc đang làm

`git.worktree.naming: semantic` đổi cách đặt tên nhánh: checkout vẫn bắt đầu bằng tên tạm
`dsh-<id phiên>`, nhưng khi tin nhắn đầu tiên vào phiên, model (model hiện tại của phiên, effort thấp
nhất) đọc tin nhắn đó và đổi nhánh thành `feat/<việc>`, `fix/<việc>`… (`feat/add-login-guard`).

- Thư mục checkout **giữ nguyên tên tạm** — chỉ nhánh đổi, khớp cách T3 Code làm.
- Nếu tên đã tồn tại thì thêm hậu tố 4 ký tự hex; nếu model lỗi hoặc trả lời không dùng được thì
  **giữ nguyên tên tạm** và ghi lý do vào `namingError` của bản ghi trong `git.json`.
- Tiền tố hợp lệ: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`. Thêm
  `git.worktree.nameInstructions` để lái cách đặt tên (ví dụ bắt đầu bằng mã issue).
- Slug được chuyển sang ASCII không dấu, nên tin nhắn tiếng Việt vẫn ra nhánh đọc được
  (`sửa lỗi đăng nhập` → `fix/sua-loi-dang-nhap`).

#### Chat mới trong worktree hiện có

Khi phiên đang làm trong worktree của plugin, đầu bảng Git có nút **Chat mới trong worktree này**
(cạnh chip nhánh). Bấm là một phiên mới được tạo với cùng thư mục checkout — giống *New thread in
this worktree* của T3 Code — nên hai chat làm chung một nhánh; chat mới xuất hiện ở thanh bên.

#### Dọn worktree không dùng

Ngoài việc dọn khi PR được gộp, plugin có policy dọn riêng, mặc định tắt:

```yaml
git:
  worktree:
    cleanup:
      enabled: false
      inactiveDays: 7           # xoá sau N ngày không đụng tới; 0 = tắt quy tắc này
      whenNoCommits: true       # xoá khi nhánh chưa có commit nào mới so với nhánh nền
      noCommitsAfterHours: 6    # ân hạn cho checkout vừa tạo
      keepChanges: tracked      # tracked | any | none
      deleteBranch: false
      checkMs: 3600000
```

Chỉ xoá checkout do plugin tạo. Phiên đang mở luôn được giữ; `keepChanges: tracked` giữ khi còn
thay đổi chưa commit của tệp được theo dõi, `any` giữ cả khi chỉ có tệp chưa theo dõi, `none` bỏ qua
cả hai. "Không hoạt động" đo bằng thời điểm tạo checkout và mtime thư mục. Kết quả mỗi lượt được ghi
vào `cleanup` trong `git.json`, và thẻ cấu hình có nút **Dọn ngay** cùng dòng tóm tắt lần gần nhất.

### Dọn dẹp sau khi PR được gộp

Bật trong cấu hình (hoặc trong thẻ cấu hình của plugin ở trang **Plugins**):

```yaml
git:
  merged:
    enabled: true          # mặc định tắt
    removeWorktree: true   # xoá worktree plugin đã tạo cho phiên
    deleteBranch: false    # xoá luôn nhánh đã gộp
    archiveSession: true   # ẩn phiên khỏi danh sách đang hoạt động
    checkMs: 60000         # nhịp kiểm tra trạng thái PR
```

Plugin giữ liên kết phiên ↔ pull request trong `git.json` và hỏi máy chủ mã nguồn theo
`checkMs`. Khi PR **đã gộp**: xoá worktree (và nhánh nếu bật), rồi lưu trữ phiên — phiên biến khỏi
danh sách đang hoạt động nhưng vẫn khôi phục được. PR **đã đóng** thì ngừng theo dõi mà không dọn.
Mỗi liên kết chỉ xử lý một lần, nên khởi động lại DSH không lặp lại thao tác. Nếu worktree còn thay
đổi chưa commit, plugin **không** xoá: nó ghi lý do vào `git.json` và để bạn quyết định.

### Nguồn dữ liệu

Git chạy qua dịch vụ `subprocess` của DSH (có dự phòng `child_process`), với timeout và giới hạn
kích thước đầu ra cho mỗi lệnh. Pull request và issue đọc qua **GitHub CLI** (`gh`) vì nó dùng đúng
phiên đăng nhập của bạn. Nếu `gh` không có hoặc chưa đăng nhập, plugin dùng REST API công khai của
GitHub (60 lượt/giờ khi không có token; đặt token ở `GITHUB_TOKEN`, `GH_TOKEN` hoặc credential
`DSH_GITHUB_TOKEN` để tăng hạn mức). Với GitLab, plugin gọi `glab` nếu có.

### Cầu nối với Host (lưu ý khi nâng cấp DSH)

Giao diện gọi Host qua **route Fetch chính xác** dưới kênh dùng chung của Connection:
`POST /api/personal-hub-git/<thao-tác>` cho 19 thao tác (`overview`, `diff`, `commits`, `commit`,
`branches`, `forge`, `pulls`, `pull`, `branchPull`, `issues`, `issue`, `createPull`,
`worktreeState`, `worktreeCreate`, `worktreeRemove`, `mergeSettings`, `mergeSettingsSet`,
`cleanupState`, `cleanupRun`), đăng ký
bằng `connection.fetch.register()`. Mọi route đi qua hàng rào Host/Origin và bước xác thực Peer của
Connection, nên chỉ trang loopback đã đăng nhập mới đọc được kho mã trên máy này.

Không dùng `connection.rpc.handle()` nữa: trên DSH 0.2.2-rc.1, hàm đăng ký đó đọc `ctx.webServer`
trong context của chính plugin Connection — context này không `inject` `webServer` — nên mọi lần
đăng ký kênh đều ném `cannot get property "webServer" without inject`; bảng Git khi đó báo
`connection/failed` kèm `HTTP 405` dù Host đã nạp. Nếu DSH sửa lỗi này ở bản sau, có thể quay lại
kênh RPC riêng, nhưng route Fetch vẫn hợp lệ và ổn định.

```yaml
git:
  enabled: true          # tắt bảng Git mà vẫn giữ tính năng Telegram
  forge: auto            # auto | github | gitlab | none  (none = ẩn PR/issue)
  remote: ''             # remote ưu tiên; rỗng = remote của upstream, rồi origin
  cliPath: ''            # đường dẫn gh/glab; rỗng = tự chọn theo máy chủ
  tokenEnv: GITHUB_TOKEN
  commandTimeoutMs: 15000
  worktreeTimeoutMs: 180000   # thời gian cho git fetch / git worktree
  maxDiffBytes: 393216   # bytes diff giữ cho mỗi tệp
  maxUntrackedBytes: 131072
  maxUntrackedFiles: 60
  logLimit: 20
  pullLimit: 20
  issueLimit: 20
  cacheMs: 20000         # thời gian dùng lại câu trả lời của máy chủ mã nguồn
  refreshMs: 30000       # nhịp làm mới gợi ý cho bảng

  pull:                  # tạo pull request bằng AI
    enabled: true
    base: ''             # nhánh nền mặc định; rỗng = nhánh mặc định của kho
    provider: ''         # ghim route; rỗng = model hiện tại của phiên
    model: ''
    push: true           # đẩy nhánh trước khi tạo PR
    timeoutMs: 90000
    maxOutputTokens: 4096
    contextBytes: 60000  # bytes diff đưa vào prompt
    commitLimit: 40

  worktree:              # worktree cho phiên mới
    enabled: true
    directory: .agents/worktrees
    namePrefix: dsh
    base: ''             # nhánh bắt đầu; rỗng = nhánh mặc định của kho
    naming: id           # id | semantic (đổi nhánh theo tin nhắn đầu)
    nameInstructions: '' # dặn thêm cho model đặt tên nhánh
    source: local        # local | remote  (lựa chọn ban đầu trên giao diện)
    remote: ''           # remote dùng cho nguồn remote; rỗng = remote của bảng, rồi origin
    cleanup:             # dọn checkout không dùng (mặc định tắt)
      enabled: false
      checkMs: 3600000
      inactiveDays: 7
      whenNoCommits: true
      noCommitsAfterHours: 6
      keepChanges: tracked   # tracked | any | none
      deleteBranch: false

  merged:                # dọn dẹp sau khi PR của phiên được gộp
    enabled: false
    removeWorktree: true
    deleteBranch: false
    archiveSession: true
    checkMs: 60000
```

Các mục `pull`, `worktree`, `merged` có thể đổi ngay trong giao diện: trang **Plugins** → thẻ cấu
hình của hàng `personal-hub` → phần **Worktree và pull request đã gộp** → **Lưu**. Thao tác này ghi
vào `cordis.patch.yml` của profile qua `configEditor`, nên giá trị còn sau khi khởi động lại DSH.

## 7. Web Remote (Phase 1 — bridge)

Điều khiển DSH từ điện thoại qua một relay WebSocket. Plugin là bên **chủ động nối ra ngoài**;
máy chạy DSH không mở port nào. Phần đã xong là **bridge Host** và **giao thức v1**
([`protocol/`](../protocol/README.md)). Relay Zig là Phase 2 và web client SvelteKit là Phase 3;
để chạy thử ngay, repo có relay phát triển bằng Node tại [`tools/dev-relay/`](../tools/dev-relay/).

```powershell
node tools/dev-relay/index.mjs --port 8787
# rồi đặt relayUrl: 'http://127.0.0.1:8787' và bật webRemote
```

### Cấu hình

```yaml
webRemote:
  enabled: false         # bật tính năng; cần relayUrl hợp lệ
  relayUrl: ''           # https://chat.example.com hoặc wss://host/ws
  deviceName: ''         # tên hiện trên màn hình duyệt; rỗng = hostname máy
  dataDir: ''            # mặc định <DSH_HOME>/personal-hub/web-remote
  autoPair: true         # chưa có token thì tự chạy luồng ghép cặp
  scopes: [chat, approval]
  approvalTimeoutMs: 300000
  questionTimeoutMs: 300000
  requestTimeoutMs: 60000
  heartbeatMs: 25000
  reconnectMinMs: 1000
  reconnectMaxMs: 30000
```

Bật bằng **Plugins** → thẻ cấu hình hàng `personal-hub` → `webRemote` → **Lưu** (hoặc sửa
`cordis.patch.yml` của profile). Sửa `relayUrl` của một thiết bị đã ghép cặp sẽ xoá credential cũ:
thiết bị phải ghép cặp lại với relay mới.

### Ghép cặp (luồng B)

1. Plugin tạo (hoặc đọc) khoá Ed25519 tại `<dataDir>/device.key`, quyền `0600`.
2. Nó gọi `POST /v1/device/authorize` và nhận `user_code` + `verification_uri`.
3. Mã và URL được ghi vào `status.json` và log Host:
   `web-remote: open https://…/pair and enter code ABCD-EFGH (expires in 10 minutes)`.
4. Người dùng đăng nhập WebChat, nhập mã, xem tên máy + fingerprint rồi bấm **Duyệt**.
5. Plugin poll `POST /v1/device/token`, lưu refresh token vào credential store
   (`DSH_WEB_REMOTE_REFRESH_TOKEN`; fallback `<dataDir>/refresh-token.json`), rồi mở WebSocket.
6. Mọi lần kết nối lại đều ký `hello` bằng khoá riêng (nonce + timestamp), không dùng Bearer trần.

Token được gửi qua **subprotocol** (`dsh-remote.v1`, `bearer.<access>`, `device.<id>`), không nằm
trong query string.

### Trạng thái và lỗi

`<dataDir>/status.json` (mặc định `%USERPROFILE%\.dsh\personal-hub\web-remote\status.json`):

| `state` | Nghĩa |
|---|---|
| `waiting-relay` | chưa cấu hình `relayUrl` |
| `pairing` | đang chờ duyệt; `pairing.code`/`pairing.uri` để nhập |
| `pairing-required` | chưa có credential và `autoPair: false`, hoặc ghép cặp thất bại |
| `connecting` / `reconnecting` | đang mở hoặc mở lại WebSocket (backoff 1→30 giây, full jitter) |
| `connected` | đã `hello.ok`; `watching` là các phiên đang được web theo dõi |
| `auth-required` | relay từ chối token; plugin xoá credential và ghép cặp lại (tối đa 2 lần) |
| `revoked` | thiết bị bị thu hồi từ web; dừng kết nối |
| `error` | lỗi gần nhất nằm ở `lastError` |

### Phê duyệt và câu hỏi

- Plugin đăng ký answerer cho `approval/request` và `user-questions/request`.
- Chỉ chuyển tiếp khi **có web client đang `session.follow` đúng phiên đó**; phiên không được theo
  dõi vẫn do giao diện desktop trả lời.
- Web trả lời qua `approval.ask` / `question.ask`; bind `(approvalId, sessionId, callId)`.
- Quá hạn, mất kết nối, hoặc câu trả lời sai bind → plugin gọi `next()` để answerer desktop xử lý;
  **không bao giờ tự cho phép**. Câu trả lời hợp lệ duy nhất cho một lần duyệt là `allowed-once`.
- Vì waterfall chạy tuần tự, trong lúc chờ web (tối đa `approvalTimeoutMs`), hộp thoại desktop của
  phiên đó không được hỏi. Đặt timeout ngắn hơn nếu muốn desktop làm dự phòng nhanh.

### Thao tác đã hỗ trợ

`session.list`, `session.state`, `session.create`, `session.rename`, `session.prompt`,
`session.cancel`, `session.events`, `session.modelCatalog`, `session.selectModel`;
stream `session.follow` (snapshot → event → assistant-stream) và `session.control`.
Chi tiết frame: [`protocol/README.md`](../protocol/README.md).

### Giới hạn Phase 1

- Relay Zig và web client SvelteKit chưa có. Relay Node trong `tools/dev-relay/` chỉ để phát triển
  (RAM, một người dùng, không TLS); không dùng cho dữ liệu thật.
- Chỉ prompt văn bản; ảnh/tệp, xoá phiên, đổi workspace chưa có trong giao thức.
- Chưa có màn hình hiển thị mã ghép cặp trong DSH UI; mã nằm ở log Host và `status.json`.
- Chưa có E2E: relay thấy plaintext. Chỉ dùng TLS và relay do bạn kiểm soát.

## 8. Tệp dữ liệu

`%USERPROFILE%\.dsh\personal-hub\telegram-remote\` (hoặc `$DSH_HOME/personal-hub/telegram-remote/`):

- `token` — token bot, nếu bạn dùng cách tệp.
- `state.json` — `offset` của getUpdates, chat đã ghép nối, phiên đang gắn.
- `status.json` — trạng thái chạy: `waiting-token`, `polling`, `invalid-token`, `error`, `stopped`,
  bot đã kết nối, lỗi gần nhất. Đây là nơi kiểm tra khi bot im lặng.

`%USERPROFILE%\.dsh\personal-hub\web-remote\` (hoặc `$DSH_HOME/personal-hub/web-remote/`):

- `device.key` — khoá riêng Ed25519, `0600`; **không** sao lưu lên relay.
- `state.json` — `deviceId`, `relayUrl`, `pairedAt`.
- `refresh-token.json` — chỉ dùng khi credential store không khả dụng.
- `status.json` — trạng thái kết nối/ghép cặp như bảng ở mục 7.

`%USERPROFILE%\.dsh\personal-hub\git.json` giữ trạng thái của bảng Git:

- `worktrees` — worktree plugin đã tạo cho từng phiên: `path`, `name` (tên thư mục), `branch`
  (đổi được khi bật `naming: semantic`), `base`, `source`, `repositoryRoot`, `createdAt`, và
  `namedAt`/`namingError` khi có đổi tên;
- `pulls` — pull request đang theo dõi của từng phiên: `number`, `url`, `state`, `done`, cùng kết
  quả dọn dẹp (`worktreeRemoved`, `archived`, `worktreeError`);
- `cleanup` — kết quả lượt dọn worktree gần nhất: `at`, `removed`, `kept` (kèm lý do);
- `probe` — lần cuối giao diện New Session hỏi trạng thái worktree (dùng để kiểm tra bridge).

## 9. Thêm tính năng mới

Tạo `features/<tên>.js` export `mount(ctx, config, deps)` trả về hàm dọn dẹp, rồi thêm một mục
vào mảng `FEATURES` trong `index.js` và một khoá cấu hình tương ứng trong `lib/config.js`.

## 10. Kiểm thử

```powershell
cd plugin
node --test
```

Bộ test dùng một `fetch` giả lập Telegram và một `sessionController` giả, nên chạy được khi
không có token thật. Test của bảng Git tạo một kho mã tạm thật (cần `git` trên máy), mount Host
trên một Connection giả rồi gọi thẳng 19 route `/api/personal-hub-git/<thao-tác>`, nên không cần
DSH đang chạy. Test worktree tạo một remote `--bare` cục bộ nên kiểm được cả nhánh local, nhánh
remote sau `fetch`, và trường hợp worktree còn thay đổi chưa commit.

Test Web Remote dùng fixture trong `protocol/fixtures/`: codec frame, chữ ký Ed25519, pairing qua
`fetch` giả, transport trên WebSocket giả (hello, heartbeat, backoff, stream), và bridge với
`sessionController` giả. Không có test nào cần relay hay mạng thật.

## Giới hạn hiện tại

- Chỉ nhận tin nhắn văn bản; ảnh/tệp chưa được chuyển vào DSH.
- Chỉ chat riêng (private); nhóm bị từ chối.
- Phê duyệt và câu hỏi của DSH chỉ được báo về chat, chưa trả lời được từ Telegram.
- Chưa có API xoá phiên: chỉ lưu trữ/khôi phục, không xoá tệp phiên.
- Phiên đang chạy phải dừng (`/cancel`) trước khi lưu trữ.
- Bảng Git chỉ đọc với thay đổi và commit: chưa stage/unstage, commit hay checkout. Thao tác ghi duy
  nhất là tạo pull request, tạo/xoá worktree, và đổi thiết lập dọn dẹp.
- Worktree được tạo **ngay khi bấm Tạo**, trước tin nhắn đầu tiên, nên phiên chưa mở hoặc kho mã là
  worktree liên kết sẽ bị từ chối thay vì chờ. Worktree đã tạo không tự xoá khi bạn đổi ý: dùng nút ✕.
- Tạo pull request cần đẩy được nhánh lên remote và `gh`/`glab` đã đăng nhập (GitHub không có CLI
  vẫn tạo được bằng REST nếu có token, nhưng không đọc được chi tiết kiểm tra).
- Dọn dẹp sau khi gộp chỉ chạy khi PR đó đã được plugin nhìn thấy (do chính nó tạo, hoặc đọc được ở
  chip PR của nhánh lúc bảng làm mới) và khi `git.merged.enabled` bật.
- Diff dừng sau 4000 dòng và bị cắt theo `maxDiffBytes` để giao diện giữ được nhịp.
- PR/issue cần remote GitHub/GitLab và `gh` (hoặc `glab`); thiếu CLI thì GitHub vẫn đọc được bằng
  REST công khai nhưng **không có chi tiết kiểm tra** và hạn mức thấp.
- Web Remote có bridge + relay phát triển; chưa có relay production (Zig) và web client SvelteKit,
  chưa hiển thị mã ghép cặp trong DSH UI, chỉ nhận prompt văn bản. Xem mục 7.
