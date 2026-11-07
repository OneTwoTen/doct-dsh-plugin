# Personal hub — plugin cá nhân cho DeepSeek Harness

Một bundle duy nhất, nhiều tính năng: **điều khiển DSH từ xa qua Telegram**, và **bảng Git** ở
thanh bên phải (thay đổi, diff từng tệp, commit, pull request kèm trạng thái, issue).

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

### Nguồn dữ liệu

Git chạy qua dịch vụ `subprocess` của DSH (có dự phòng `child_process`), với timeout và giới hạn
kích thước đầu ra cho mỗi lệnh. Pull request và issue đọc qua **GitHub CLI** (`gh`) vì nó dùng đúng
phiên đăng nhập của bạn. Nếu `gh` không có hoặc chưa đăng nhập, plugin dùng REST API công khai của
GitHub (60 lượt/giờ khi không có token; đặt token ở `GITHUB_TOKEN`, `GH_TOKEN` hoặc credential
`DSH_GITHUB_TOKEN` để tăng hạn mức). Với GitLab, plugin gọi `glab` nếu có.

```yaml
git:
  enabled: true          # tắt bảng Git mà vẫn giữ tính năng Telegram
  forge: auto            # auto | github | gitlab | none  (none = ẩn PR/issue)
  remote: ''             # remote ưu tiên; rỗng = remote của upstream, rồi origin
  cliPath: ''            # đường dẫn gh/glab; rỗng = tự chọn theo máy chủ
  tokenEnv: GITHUB_TOKEN
  commandTimeoutMs: 15000
  maxDiffBytes: 393216   # bytes diff giữ cho mỗi tệp
  maxUntrackedBytes: 131072
  maxUntrackedFiles: 60
  logLimit: 20
  pullLimit: 20
  issueLimit: 20
  cacheMs: 20000         # thời gian dùng lại câu trả lời của máy chủ mã nguồn
  refreshMs: 30000       # nhịp làm mới gợi ý cho bảng
```

## 7. Tệp dữ liệu

`%USERPROFILE%\.dsh\personal-hub\telegram-remote\` (hoặc `$DSH_HOME/personal-hub/telegram-remote/`):

- `token` — token bot, nếu bạn dùng cách tệp.
- `state.json` — `offset` của getUpdates, chat đã ghép nối, phiên đang gắn.
- `status.json` — trạng thái chạy: `waiting-token`, `polling`, `invalid-token`, `error`, `stopped`,
  bot đã kết nối, lỗi gần nhất. Đây là nơi kiểm tra khi bot im lặng.

## 8. Thêm tính năng mới

Tạo `features/<tên>.js` export `mount(ctx, config, deps)` trả về hàm dọn dẹp, rồi thêm một mục
vào mảng `FEATURES` trong `index.js` và một khoá cấu hình tương ứng trong `lib/config.js`.

## 9. Kiểm thử

```powershell
cd plugin
node --test
```

Bộ test dùng một `fetch` giả lập Telegram và một `sessionController` giả, nên chạy được khi
không có token thật. Test của bảng Git tạo một kho mã tạm thật (cần `git` trên máy) và gọi thẳng
kênh RPC của Host, nên không cần DSH đang chạy.

## Giới hạn hiện tại

- Chỉ nhận tin nhắn văn bản; ảnh/tệp chưa được chuyển vào DSH.
- Chỉ chat riêng (private); nhóm bị từ chối.
- Phê duyệt và câu hỏi của DSH chỉ được báo về chat, chưa trả lời được từ Telegram.
- Chưa có API xoá phiên: chỉ lưu trữ/khôi phục, không xoá tệp phiên.
- Phiên đang chạy phải dừng (`/cancel`) trước khi lưu trữ.
- Bảng Git là **chỉ đọc**: chưa stage/unstage, commit, checkout hay tạo PR từ bảng.
- Diff dừng sau 4000 dòng và bị cắt theo `maxDiffBytes` để giao diện giữ được nhịp.
- PR/issue cần remote GitHub/GitLab và `gh` (hoặc `glab`); thiếu CLI thì GitHub vẫn đọc được bằng
  REST công khai nhưng **không có chi tiết kiểm tra** và hạn mức thấp.
