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
| [`plugin/`](plugin/) | Package cài được: `@local/personal-hub` (Host + Client + bundle patch + locale + icon + test); mã TypeScript trong `src/`, sản phẩm build trong `dist/` |
| [`tools/`](tools/) | Hai script đọc thông tin nội bộ của DSH khi phát triển plugin (xem bên dưới) |
| [`docs/`](docs/) | Nghiên cứu kiến trúc, đặc tả ghép cặp/xác thực, ADR bố trí repo |
| `protocol/`, `web/`, `server/`, `deploy/` | Kế hoạch Web Remote (chưa scaffold) — xem [ADR-001](docs/adr-001-repo-layout.md) |

`plugin/` là thư mục cài đặt; `tools/` và `docs/` không nằm trong package.

## Web Remote (kế hoạch)

Mục tiêu: điều khiển DSH từ điện thoại qua WebChat, không mở port trên máy cá nhân.

- Kiến trúc và so sánh phương án: [`docs/nghien-cuu-remote-webchat.md`](docs/nghien-cuu-remote-webchat.md)
- Ghép cặp thiết bị, Clerk, API, schema: [`docs/dac-ta-v1-pairing-va-xac-thuc.md`](docs/dac-ta-v1-pairing-va-xac-thuc.md)
- Bố trí repo (monorepo giai đoạn đầu): [`docs/adr-001-repo-layout.md`](docs/adr-001-repo-layout.md)

Trạng thái: mới ở mức thiết kế; `src/features/web-remote.ts` và relay chưa được viết.

## Cài đặt

Bundle được cài vào một profile của DSH bằng Plugin Manager với đường dẫn tuyệt đối tới `plugin/`.
Chạy `cd plugin && npm install && npm run build` trước, vì profile nạp `dist/index.js` và
`dist/client.js`.

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

Trải nghiệm theo **T3 Code**: một cụm nút thao tác thông minh ở đầu bảng, hộp commit chọn tệp,
diff xếp chồng, và đổi nhánh ngay trong bảng.

| Phần | Nội dung |
|---|---|
| Thao tác | nút chính nêu việc kế tiếp — Commit / Commit & push / Commit, push & PR / Push / Push & PR / Pull / Publish — kèm menu Commit, Push, Tạo PR, Publish; chạy có tiến trình, đồng hồ, output, dòng thành công 10 giây và toast lỗi |
| Commit | checkbox từng tệp quyết định phạm vi commit; thông điệp để trống thì model của phiên tự viết; **Commit** hoặc **Commit trên nhánh mới** |
| Diff | mọi tệp trong một khối cuộn, header dính, mở/thu từng tệp, một cột/hai cột, xuống dòng, ẩn thay đổi khoảng trắng, phạm vi Chưa commit hoặc Nhánh, sao chép đường dẫn |
| Nhánh | danh sách tìm kiếm local + remote, đánh dấu nhánh hiện tại/mặc định, tạo nhánh mới bằng cách gõ tên |
| Pull request | lọc Đang mở / Đã gộp / Đã đóng / Tất cả; trạng thái kiểm tra, đánh giá; chi tiết có checks, reviews, tệp, bình luận |
| Issue | lọc Đang mở / Đã đóng / Tất cả; chi tiết có nhãn, mô tả, bình luận |
| Commit | lịch sử gần nhất; bấm để xem mô tả, tệp và patch |

Ở **nhánh mặc định**, push và tạo PR hỏi xác nhận: tiếp tục trên nhánh mặc định, hoặc checkout nhánh
feature rồi chạy tiếp cùng thao tác. Kho chưa có remote thì nút chính là **Publish repository**.

Git chạy qua `subprocess` của DSH; PR/issue đọc qua **GitHub CLI** (`gh`) — hoặc `glab` cho GitLab —
nên dùng đúng phiên đăng nhập sẵn có. Không có CLI thì GitHub vẫn đọc được bằng REST công khai
(không có chi tiết checks). Cấu hình chi tiết ở [`plugin/README.md`](plugin/README.md#6-bảng-git-thanh-bên-phải).

## Phát triển

Mã plugin là TypeScript trong `plugin/src/`; `plugin/dist/` là sản phẩm build mà DSH nạp.

```powershell
cd plugin
npm install        # lần đầu: typescript, esbuild, @types/node
npm run build      # dist/index.js + dist/client.js
npm run typecheck  # tsc cho src/ và test/
npm test           # build rồi chạy toàn bộ test (Node 24 strip types)
```

Thêm tính năng mới: tạo `plugin/src/features/<tên>.ts` export `mount(ctx, config, deps)` trả về hàm
dọn dẹp, thêm một mục vào `FEATURES` trong `plugin/src/index.ts` và khoá cấu hình tương ứng trong
`plugin/src/lib/config.ts`. Nhớ chạy `npm run build` trước khi cài lại bundle.

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
- Bảng Git giờ **đọc và ghi**: commit (chọn tệp), push, pull, đổi/tạo nhánh, tạo PR, publish; diff
  dừng sau 4000 dòng mỗi tệp. Chưa có amend, rebase tương tác hay stage từng hunk.
  PR/issue cần remote GitHub/GitLab; thiếu CLI thì GitHub vẫn xem được nhưng không có chi tiết checks.

## Giấy phép

MIT — xem [LICENSE](LICENSE).
