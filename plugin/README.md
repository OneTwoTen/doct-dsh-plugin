# Personal hub — plugin cá nhân cho DeepSeek Harness

Một bundle duy nhất, nhiều tính năng: **điều khiển DSH từ xa qua Telegram**, và **bảng Git** ở
thanh bên phải với trải nghiệm theo T3 Code: một nút thao tác thông minh (commit, push, pull, tạo
PR, publish), hộp commit chọn tệp với thông điệp do model viết, diff xếp chồng có header dính,
đổi nhánh, lịch sử commit, pull request kèm trạng thái, và issue.
Bảng Git còn **tạo pull request bằng model của phiên** (effort thấp nhất), **worktree riêng cho
phiên mới** (bắt đầu từ nhánh local hoặc nhánh remote đã fetch), và **dọn dẹp sau khi PR được gộp**.

Toàn bộ mã là TypeScript trong `src/`; `npm run build` tạo `dist/` mà Host và trình duyệt nạp.

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

### Thanh thao tác Git

Đầu bảng là **một cụm nút giống T3 Code**: nút chính nêu việc nên làm tiếp, mũi tên bên phải mở menu.

| Nút chính | Khi nào |
|---|---|
| **Commit** | có thay đổi và nhánh đang chậm hơn upstream (hoặc kho chưa có remote) |
| **Commit & push** | có thay đổi, nhánh đã có PR đang mở hoặc đang ở nhánh mặc định |
| **Commit, push & pull request** | có thay đổi, nhánh riêng, chưa có PR |
| **Push** / **Push & tạo pull request** | cây sạch, có commit local chưa đẩy |
| **Pull** | nhánh chậm hơn upstream |
| **Publish repository** | kho chưa có remote |
| **Sync branch** (khoá) | nhánh đã tách khỏi upstream — rebase/merge trước |

Bấm nút chính là chạy ngay; nếu ô thông điệp đang trống thì model của phiên tự viết. Menu liệt kê
**Commit**, **Push**, **Tạo pull request** và **Publish repository**; mục nào không dùng được thì có
lý do khi rê chuột. Commit trong menu mở hộp commit thay vì chạy ngay.

Trong lúc chạy, cả cụm nút đổi thành dòng tiến trình: nhãn pha (`Đang commit…`, `Đang push…`,
`Đang tạo pull request…`, `Đang chạy <hook>…`), đồng hồ đếm giây, và dòng output cuối của lệnh.
Xong thì dòng đó thành **dòng thành công 10 giây** (ví dụ `Đã push 1a2b3c4 lên origin/feat`) kèm nút
**Xem pull request**; lỗi hiện thành toast đỏ giữ tới khi bạn đóng.

Ở **nhánh mặc định**, push và tạo PR hỏi xác nhận trước: tiếp tục trên nhánh mặc định, hoặc
**checkout nhánh feature rồi chạy tiếp** — cùng một thao tác, không phải làm lại từ đầu.

### Hộp commit

Cuối ngăn **Changes** là hộp commit:

- **Checkbox ở từng tệp** (và ở đầu danh sách) quyết định tệp nào vào commit. Chọn một phần tệp là
  commit đúng phần đó: plugin reset index rồi `git add` đúng các tệp đã chọn.
- **Ô thông điệp để trống** → model của phiên viết subject/body từ diff đã chọn (effort thấp nhất).
  Nút **Tự sinh** gọi lại bất cứ lúc nào; `Ctrl/Cmd+Enter` để commit.
- **Commit** chạy commit; **Commit trên nhánh mới** tạo nhánh `feature/…` từ thông điệp rồi commit
  trên đó (giống *Commit on new branch* của T3 Code).
- Khi đang merge, commit chọn tệp bị từ chối (`commit/merge-in-progress`) vì Git cần mọi tệp đã
  giải quyết xung đột.

### Diff

Ngăn Changes là **một khối cuộn gồm mọi tệp thay đổi**, mỗi tệp một mục:

- **Header dính** khi cuộn: checkbox chọn commit, mũi tên mở/thu, nhãn A/M/D/R/C/!/U, đường dẫn
  (thư mục mờ, tên tệp sáng), `+n −m`, nút sao chép đường dẫn.
- **Một cột / Hai cột** (unified/split), **xuống dòng**, **ẩn thay đổi khoảng trắng**, **mở tất cả**,
  **thu gọn tất cả**. Lựa chọn được nhớ trong trình duyệt.
- **Phạm vi**: **Chưa commit** (`git diff HEAD` cộng tệp chưa theo dõi) hoặc **Nhánh** (so với
  merge-base của nhánh mặc định) — giống hai chế độ *Uncommitted* và *Changes* của T3 Code.
- Tệp nhị phân, tệp quá lớn, và diff dài hơn 4000 dòng đều có ghi chú riêng thay vì làm treo bảng.

### Đổi nhánh

Nút nhánh cạnh tên kho mở danh sách tìm kiếm gồm **nhánh local và nhánh remote**:

- nhánh hiện tại, nhánh mặc định và nhánh remote được đánh dấu;
- chọn một nhánh remote sẽ tạo nhánh local tracking rồi checkout;
- gõ tên chưa có trong danh sách → dòng **Tạo nhánh "<tên>"**.

Lỗi checkout (cây bẩn, nhánh đã bị checkout ở worktree khác) hiện nguyên văn trong hộp thoại.

### Pull request và issue

- Danh sách PR lọc theo Đang mở / Đã gộp / Đã đóng / Tất cả, kèm trạng thái kiểm tra
  (`x lỗi`, `x đang chạy`, `x đạt`), quyết định đánh giá, và nhánh nguồn.
- Trang chi tiết PR: mô tả, danh sách kiểm tra có thời lượng và liên kết, đánh giá, danh sách tệp,
  bình luận, và nút mở trên web.
- Issue: danh sách lọc Đang mở / Đã đóng / Tất cả; chi tiết có nhãn, mô tả và bình luận.
- Tab **Commit**: lịch sử gần nhất; bấm một commit để xem mô tả, tệp thay đổi và toàn bộ patch.

### Tạo pull request bằng AI

Tạo PR là một bước trong chuỗi thao tác (`commit_push_pr`, `create_pr`) hoặc mục **Tạo pull request**
trong menu:

1. Plugin đẩy nhánh hiện tại lên remote nếu cần (`git.push --set-upstream`); đặt
   `git.pull.push: false` nếu bạn tự đẩy trước.
2. Nếu nhánh đã có PR đang mở, plugin dùng lại PR đó (`opened_existing`) thay vì tạo trùng.
3. Model **đang dùng cho phiên này** viết tiêu đề và mô tả từ các commit cùng diff của nhánh, với
   **effort suy luận thấp nhất** mà route đó hỗ trợ (`reasoning.efforts[0]`). Có thể ghim route
   khác bằng `git.pull.provider` + `git.pull.model`.
4. Pull request được mở bằng `gh pr create` (GitLab: `glab mr create`), hoặc REST API GitHub khi
   không có CLI đã đăng nhập.
5. Pull request vừa tạo được **gắn với phiên** để theo dõi việc gộp.

Nếu không gọi được model (chưa có LLM, model lỗi, timeout) thì plugin vẫn tạo PR bằng bản nháp dựng
từ commit và tên tệp, và ghi lý do vào `draft.error` trong câu trả lời — không chặn thao tác.
Nhánh chưa có commit mới so với nhánh nền sẽ bị từ chối với `pr/no-commits`.

### Publish repository

Kho chưa có remote thì nút chính là **Publish repository**. Hộp thoại hỏi máy chủ (GitHub/GitLab,
chỉ bật khi CLI tương ứng đã đăng nhập), tên `owner/repo`, và chế độ **Riêng tư** / **Công khai**.
Plugin chạy `gh repo create --source . --remote origin --push` (GitLab: `glab repo create` rồi push),
sau đó bảng tự làm mới và remote mới xuất hiện ở header.

### Quản lý worktree (tab Worktree)

Tab **Worktree** trong bảng Git là nơi quản lý mọi checkout của kho mã, không chỉ checkout do
phiên tạo:

- **Danh sách** gồm checkout chính, các worktree trong pool `.agents/worktrees/`, và cả worktree
  liên kết bên ngoài. Mỗi dòng có nhánh, đường dẫn, chip `hiện tại` / `chính` / `HEAD rời` /
  `đang khoá` / `mất thư mục`, số tệp đang thay đổi, chat đang dùng, và thời điểm tạo.
- **Worktree mới**: đặt tên nhánh (để trống thì tự sinh `dsh-…`), chọn nhánh nền từ local hoặc
  remote đã fetch, và tuỳ chọn **Chuyển chat này sang đây**. Checkout có nhánh riêng nên không đụng
  checkout chính.
- **Làm việc ở đây**: chuyển thư mục làm việc của chat hiện tại sang checkout đó (kể cả quay về
  checkout chính).
- **Mở chat**: tạo một chat mới ngay trong checkout đó, để hai chat cùng làm một nhánh.
- **Xoá**: xoá checkout (kèm tuỳ chọn xoá nhánh). Checkout còn thay đổi chưa commit sẽ bị Git giữ
  lại; bật **Vẫn xoá** để buộc. Checkout chính không bao giờ bị xoá.
- **Dọn đăng ký** (`prune`): quên những worktree có thư mục đã biến mất.

Khi chat đang làm ngoài checkout chính, header hiện thêm chip thư mục; bấm vào là mở tab Worktree.
Xoá checkout đang dùng sẽ đưa chat về checkout chính trước, nên không có phiên nào trỏ vào thư mục
đã mất.

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
`POST /api/personal-hub-git/<thao-tác>` cho 37 thao tác — đọc (`overview`, `diff`, `diffAll`,
`commits`, `commit`, `branches`, `forge`, `pulls`, `pullRequest`, `branchPull`, `issues`, `issue`,
`draftMessage`, `actionState`, `mergeSettings`, `cleanupState`), ghi (`stage`, `unstage`, `discard`,
`commitChanges`, `push`, `pull`, `switchBranch`, `createBranch`, `createPull`, `publish`,
`mergeSettingsSet`, `cleanupRun`, `startAction`) và worktree (`worktrees`, `worktreeState`,
`worktreeAdd`, `worktreeSwitch`, `worktreeCreate`, `worktreeRemovePath`, `worktreeRemove`,
`worktreePrune`) — đăng ký bằng `connection.fetch.register()`. Mọi route đi qua hàng rào Host/Origin
và bước xác thực Peer của Connection, nên chỉ trang loopback đã đăng nhập mới đọc được kho mã trên
máy này.

Một thao tác chuỗi (`startAction`) trả về `actionId` ngay rồi chạy nền; giao diện hỏi
`actionState` mỗi 300 ms để lấy pha, nhãn, output và kết quả. Nhờ vậy một commit + push + tạo PR
không bị cắt khi bạn đổi tab, và tiến trình vẫn hiện đúng như T3 Code.

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

  commit:                # viết thông điệp commit bằng AI
    enabled: true
    provider: ''         # ghim route; rỗng = model hiện tại của phiên
    model: ''
    timeoutMs: 60000
    maxOutputTokens: 512
    contextBytes: 50000  # bytes diff đưa vào prompt
    styleLimit: 12       # số commit gần nhất làm mẫu giọng văn
    maxSubjectLength: 72

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
máy chạy DSH không mở port nào. Phần đã xong là **bridge Host**, **giao thức v1**
([`protocol/`](../protocol/README.md)) và **thẻ Web Remote** trong hàng plugin (trạng thái, mã ghép
cặp, ngắt ghép nối). Relay Zig là Phase 2 và web client SvelteKit là Phase 3; để chạy thử ngay, repo
có relay phát triển bằng Node tại [`tools/dev-relay/`](../tools/dev-relay/).

```powershell
node tools/dev-relay/index.mjs --port 8787
# rồi bật Web Remote trong thẻ của hàng personal-hub và đặt relayUrl: 'http://127.0.0.1:8787'
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

Bật bằng **Plugins** → thẻ cấu hình hàng `personal-hub` → **Web Remote** → tick **Bật Web Remote** →
**Lưu** (hoặc sửa `cordis.patch.yml` của profile). Sửa `relayUrl` của một thiết bị đã ghép cặp sẽ xoá
credential cũ: thiết bị phải ghép cặp lại với relay mới.

### Thẻ Web Remote trong DSH

Hàng `personal-hub` trong **Plugins** có thẻ **Web Remote** nằm giữa thẻ Telegram và phần thiết lập
Git; thẻ này là chỗ duy nhất thấy mã ghép cặp mà không phải đọc log.

- **Bật/tắt Web Remote** — `webRemote.enabled`. Khi tắt, feature không mở socket và không đọc/tạo khoá
  thiết bị, nhưng thẻ vẫn sống để bật lại; bật lên thì Harness tải lại hàng plugin và tự ghép cặp nếu
  chưa có credential.
- **Thiết lập relay** — địa chỉ relay, tên thiết bị, tự ghép cặp. Lưu bằng configuration editor của
  profile, nên Harness tải lại hàng plugin và thay đổi áp dụng ngay; đổi relay xoá credential cũ.
- **Trạng thái** — cùng các giá trị `state` trong bảng dưới, tự làm mới mỗi 2 giây khi thẻ đang mở.
- **Mã ghép cặp** — hiện to, kèm liên kết tới trang duyệt, nút sao chép và đếm ngược hết hạn;
  **Huỷ ghép cặp** dừng lượt đang chờ mà không cần khởi động lại DSH.
- **Thiết bị** — tên, fingerprint `SHA256:…`, số phiên web đang theo dõi, lỗi gần nhất.
- **Ghép cặp ngay / Ghép cặp lại** và **Ngắt ghép nối** (xoá credential đã lưu rồi đóng socket).

Thẻ gọi các route POST `/api/personal-hub-web-remote/{state,settingsSet,pair,pairCancel,unpair}` trên
Connection service; không route nào mở thêm cổng. Mã và trạng thái vẫn được ghi ra `status.json` cho
script đọc.

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
| `disabled` | `webRemote.enabled: false`; không mở socket, không đọc/tạo khoá (thẻ vẫn bật được) |
| `waiting-relay` | chưa cấu hình `relayUrl` |
| `pairing` | đang chờ duyệt; `pairing.code`/`pairing.uri` để nhập |
| `pairing-required` | chưa có credential và `autoPair: false`, hoặc ghép cặp thất bại/bị huỷ/đã ngắt |
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

## 9. Mã nguồn TypeScript và thêm tính năng mới

Toàn bộ mã nằm trong `src/` và viết bằng TypeScript:

| Đường dẫn | Nội dung |
|---|---|
| `src/index.ts` | Host entry: `name`, `inject`, `apply`, danh sách `FEATURES` |
| `src/features/git.ts` | 37 route `/api/personal-hub-git/*`, thao tác chuỗi, quản lý worktree |
| `src/features/telegram-remote.ts` | Bot Telegram, lệnh, đẩy phản hồi về chat |
| `src/features/web-remote.ts` | Bridge Web Remote: ghép cặp, transport, answerer |
| `src/lib/remote-*.ts` | Giao thức v1, identity Ed25519, pairing, WebSocket transport |
| `src/lib/` | Phần thuần: đọc Git, forge, soạn PR/commit, worktree, text, state store |
| `src/shared/protocol.ts` | Kiểu dữ liệu dùng chung giữa Host và trình duyệt |
| `src/client/` | Giao diện: panel Git, hành động, diff, worktree, thẻ cấu hình |
| `src/host/dsh.ts` | Kiểu structural của API Harness mà plugin gọi |
| `dist/index.js`, `dist/client.js` | Sản phẩm build (Host ESM và bundle trình duyệt) |
| `test/*.test.ts` | Test chạy bằng `node --test` (Node 24 strip types) |

Build bằng esbuild; `dist/` là thứ được cài, nên **build lại sau mỗi lần sửa**:

```powershell
cd plugin
npm install          # lần đầu: typescript, esbuild, @types/node
npm run build        # dist/index.js + dist/client.js
npm run typecheck    # tsc cho src/ và test/
npm test             # build rồi chạy toàn bộ test
```

Thêm tính năng mới: tạo `src/features/<tên>.ts` export `mount(ctx, config, deps)` trả về hàm dọn
dẹp, thêm một mục vào `FEATURES` trong `src/index.ts` và một khoá cấu hình trong `src/lib/config.ts`.

## 10. Kiểm thử

```powershell
cd plugin
npm test
```

Bộ test dùng một `fetch` giả lập Telegram và một `sessionController` giả, nên chạy được khi
không có token thật. Test của bảng Git tạo một kho mã tạm thật (cần `git` trên máy), mount Host
trên một Connection giả rồi gọi thẳng các route `/api/personal-hub-git/<thao-tác>`, kể cả
`startAction`/`actionState` với một remote `--bare` cục bộ. Test giao diện nạp `dist/client.js`
bằng một React giả nên kiểm được cây render mà không cần trình duyệt. Phần logic thuần (chọn hành
động, diff hai cột, ẩn khoảng trắng) có test riêng trong `test/action-logic.test.ts` và
`test/diff-model.test.ts`.

Test Web Remote dùng fixture trong `protocol/fixtures/`: codec frame, chữ ký Ed25519, pairing qua
`fetch` giả, transport trên WebSocket giả (hello, heartbeat, backoff, stream), và bridge với
`sessionController` giả. Thẻ Web Remote có test riêng: mount Host trên Connection giả rồi gọi các
route `/api/personal-hub-web-remote/*` (trạng thái, lưu thiết lập, ghép cặp, huỷ, ngắt) và render
thẻ bằng React giả. Không có test nào cần relay hay mạng thật.

## Giới hạn hiện tại

- Chỉ nhận tin nhắn văn bản; ảnh/tệp chưa được chuyển vào DSH.
- Chỉ chat riêng (private); nhóm bị từ chối.
- Phê duyệt và câu hỏi của DSH chỉ được báo về chat, chưa trả lời được từ Telegram.
- Chưa có API xoá phiên: chỉ lưu trữ/khôi phục, không xoá tệp phiên.
- Phiên đang chạy phải dừng (`/cancel`) trước khi lưu trữ.
- Bảng Git giờ **đọc và ghi**: commit (chọn tệp), push, pull, đổi/tạo nhánh, tạo PR, publish. Chưa
  có amend, rebase tương tác, hay stage từng hunk; discard chỉ hoàn tác tệp đã theo dõi (và xoá tệp
  chưa theo dõi khi bật `includeUntracked`).
- Worktree được tạo **ngay khi bấm Tạo**, trước tin nhắn đầu tiên, nên phiên chưa mở hoặc kho mã là
  worktree liên kết sẽ bị từ chối thay vì chờ. Worktree đã tạo không tự xoá khi bạn đổi ý: dùng nút ✕.
- Tạo pull request cần đẩy được nhánh lên remote và `gh`/`glab` đã đăng nhập (GitHub không có CLI
  vẫn tạo được bằng REST nếu có token, nhưng không đọc được chi tiết kiểm tra).
- Dọn dẹp sau khi gộp chỉ chạy khi PR đó đã được plugin nhìn thấy (do chính nó tạo, hoặc đọc được ở
  chip PR của nhánh lúc bảng làm mới) và khi `git.merged.enabled` bật.
- Diff dừng sau 4000 dòng và bị cắt theo `maxDiffBytes` để giao diện giữ được nhịp.
- PR/issue cần remote GitHub/GitLab và `gh` (hoặc `glab`); thiếu CLI thì GitHub vẫn đọc được bằng
  REST công khai nhưng **không có chi tiết kiểm tra** và hạn mức thấp.
- Web Remote có bridge, thẻ cấu hình/ghép cặp trong DSH UI và relay phát triển; chưa có relay
  production (Zig) và web client SvelteKit, chỉ nhận prompt văn bản. Xem mục 7.
