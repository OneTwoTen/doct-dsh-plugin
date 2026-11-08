# doct-dsh-plugin

Plugin cá nhân cho **DeepSeek Harness**: một bundle, nhiều tính năng.

- **Telegram** — điều khiển DSH từ xa: tin nhắn trong chat đã ghép nối trở thành prompt cho một
  phiên, câu trả lời được gửi ngược về chat.
- **Git** — bảng Git ở thanh bên phải: thay đổi cục bộ kèm diff từng tệp, lịch sử commit,
  pull request với trạng thái kiểm tra/đánh giá, và issue.
- **Pull request bằng AI** — nút trong tab Pull request: đẩy nhánh, để model hiện tại của phiên
  (effort thấp nhất) viết tiêu đề/mô tả, rồi mở PR.
- **Worktree cho phiên mới** — chọn ở màn hình New Session: worktree riêng, bắt đầu từ nhánh local
  hoặc nhánh remote đã fetch.
- **Dọn dẹp sau khi gộp** — tùy chọn trong cấu hình: PR của phiên được gộp thì xoá worktree, ẩn phiên.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| [`plugin/`](plugin/) | Package cài được: `@local/personal-hub` (Host + Client + bundle patch + locale + icon + test) |
| [`tools/`](tools/) | Hai script đọc thông tin nội bộ của DSH khi phát triển plugin (xem bên dưới) |

`plugin/` là thư mục cài đặt; `tools/` không nằm trong package.

## Cài đặt

Bundle được cài vào một profile của DSH bằng Plugin Manager với đường dẫn tuyệt đối tới `plugin/`:

```text
plugin_manager install_bundle  →  <đường dẫn tuyệt đối>/plugin
```

Cài xong, hàng `personal-hub` xuất hiện trong profile và cả hai tính năng tự chạy
(Telegram ở trạng thái chờ token cho tới khi bạn cấu hình; bảng Git đọc kho mã của phiên đang mở).

## Cấu hình token

1. Tạo bot với [@BotFather](https://t.me/BotFather), lấy token `123456789:AA…`.
2. Trong DSH: **Plugins** → **Personal hub** → nút cấu hình hàng `personal-hub` → dán token → **Lưu token**.

Token lưu trong credential store của DSH (không ghi vào tệp cấu hình, không nằm trong repo này).

Hai cách khác nếu cần: tệp `%USERPROFILE%\.dsh\personal-hub\telegram-remote\token`,
hoặc biến môi trường `DSH_TELEGRAM_BOT_TOKEN`.
Thứ tự ưu tiên: `telegram.token` → credential `DSH_TELEGRAM_BOT_TOKEN` → biến môi trường → tệp token.

## Dùng trong Telegram

| Lệnh | Tác dụng |
|---|---|
| `/start` | Ghép nối chat đầu tiên (các chat khác bị từ chối) |
| `/new [thư-mục]` | Tạo phiên DSH mới và gắn với chat |
| `/sessions [trang]` | Liệt kê phiên gần đây; chạm số để gắn, chạm 📦 để lưu trữ |
| `/session <số\|sessionId>` | Gắn chat với một phiên có sẵn |
| `/archived [trang]` | Liệt kê phiên đã lưu trữ; chạm để khôi phục |
| `/archive [số\|sessionId]` | Lưu trữ phiên (mặc định phiên đang gắn) |
| `/restore <số\|sessionId>` | Khôi phục phiên đã lưu trữ |
| `/workspaces` | Liệt kê workspace, kèm nút bấm để chọn |
| `/workspace <số\|id\|đường-dẫn>` | Chọn workspace cho phiên mới |
| `/models` | Liệt kê provider và model, kèm nút bấm để chọn |
| `/model <số\|provider/model[@effort]>` | Đổi model cho phiên hiện tại |
| `/status` | Phiên đang gắn, workspace, model, đang chạy, hàng đợi, chờ phê duyệt |
| `/cancel` | Dừng lượt đang chạy |
| `/unbind` | Bỏ gắn phiên |
| `/use <sessionId>` | Gắn chat với phiên có sẵn |
| `/whoami` | Chat id của bạn |
| `/help` | Danh sách lệnh |

Một lượt trả lời được đẩy về chat thành nhiều tin:

| Tin | Nội dung |
|---|---|
| 💬 | từng phản hồi trung gian của trợ lý (phần nó nói trước khi gọi công cụ) |
| 🔧 Thay đổi chính | các tệp đã đổi trong lượt, kèm số dòng thêm/xoá — đọc từ `workspaceChanges` của DSH; nếu profile không có dịch vụ này thì tóm tắt từ công cụ sửa tệp và lệnh đã chạy |
| ✅ | phản hồi cuối cùng |

Tin `⏳ Đang xử lý…` hiển thị tiến độ và được xoá khi lượt xong. Câu trả lời dài được chia thành nhiều tin ≤ 4096 ký tự.
Tắt bớt bằng `telegram.pushResponses: false` hoặc `telegram.pushChanges: false` trong cấu hình.

Trạng thái runtime: `%USERPROFILE%\.dsh\personal-hub\telegram-remote\status.json`
(`waiting-token`, `polling`, `invalid-token`, `error`, `stopped` + lỗi gần nhất).

## Bảng Git

Tab **Git** trong thanh bên phải (cạnh Files/Browser/Terminal), mở bằng nút Git ở tiêu đề phiên,
thẻ Git ở trang bắt đầu của thanh bên phải, hoặc dấu **+** trong dải tab. Bảng đọc kho mã của thư
mục làm việc của phiên đang xem và tự làm mới mỗi 30 giây.

| Phần | Nội dung |
|---|---|
| Thay đổi | nhóm Đã stage / Chưa stage / Chưa theo dõi / Xung đột, nhãn A/M/D/R/C, `+n −m`, bấm để xem diff từng dòng có số dòng và nền xanh/đỏ |
| Đầu bảng | nhánh, `↑ahead ↓behind`, remote, thanh tỉ lệ thêm/bớt, stash, chip PR của nhánh |
| Pull request | lọc Đang mở / Đã gộp / Đã đóng / Tất cả; trạng thái kiểm tra, đánh giá; chi tiết có checks, reviews, tệp, bình luận |
| Issue | lọc Đang mở / Đã đóng / Tất cả; chi tiết có nhãn, mô tả, bình luận |
| Commit | lịch sử gần nhất; bấm để xem mô tả, tệp và patch |

Git chạy qua `subprocess` của DSH; PR/issue đọc qua **GitHub CLI** (`gh`) — hoặc `glab` cho GitLab —
nên dùng đúng phiên đăng nhập sẵn có. Không có CLI thì GitHub vẫn đọc được bằng REST công khai
(không có chi tiết checks). Cấu hình chi tiết ở [`plugin/README.md`](plugin/README.md#6-bảng-git-thanh-bên-phải).

## Phát triển

```powershell
cd plugin
node --test        # hàm thuần, kênh RPC của bảng Git trên kho mã tạm, và bridge Telegram giả lập
```

Thêm tính năng mới: tạo `plugin/features/<tên>.js` export `mount(ctx, config, deps)` trả về hàm dọn dẹp,
thêm một mục vào `FEATURES` trong `plugin/index.js` và khoá cấu hình tương ứng trong `plugin/lib/config.js`.

### `tools/`

Hai script chỉ dùng khi phát triển, cần đường dẫn tới `app.asar` của bản cài DSH:

- `asar-extract.mjs` — trích package trong `app.asar` ra thư mục để đọc mã và README.
- `schema.mjs` — in JSON Schema của một endpoint Remote trong `lib/typert.host.js`.

Ví dụ:

```powershell
node tools/asar-extract.mjs "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\app.asar" C:\tmp\dsh-asar dsh-api-session-controller
node tools/schema.mjs C:\tmp\dsh-asar\dsh\node_modules\@deepseek-ai\dsh-api-session-controller\lib\typert.host.js session/prompt
```

## Giới hạn hiện tại

- Chỉ nhận tin nhắn văn bản; ảnh/tệp chưa chuyển vào DSH.
- Chỉ chat riêng (private).
- Phê duyệt và câu hỏi của DSH được báo về chat nhưng chưa trả lời được từ Telegram.
- DSH chưa có API xoá phiên; plugin chỉ **lưu trữ** (ẩn khỏi danh sách, dữ liệu vẫn còn) và **khôi phục**.
  Phiên đang chạy phải `/cancel` hoặc đợi xong trước khi lưu trữ.
- Bảng Git là chỉ đọc (chưa stage/unstage, commit hay tạo PR từ bảng); diff dừng sau 4000 dòng.
  PR/issue cần remote GitHub/GitLab; thiếu CLI thì GitHub vẫn xem được nhưng không có chi tiết checks.

## Giấy phép

MIT — xem [LICENSE](LICENSE).
