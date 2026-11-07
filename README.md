# doct-dsh-plugin

Plugin cá nhân cho **DeepSeek Harness**: một bundle, nhiều tính năng.
Tính năng đầu tiên — điều khiển DSH từ xa qua **Telegram**.

Gửi tin nhắn trong chat Telegram đã ghép nối, tin nhắn trở thành prompt cho một phiên DSH;
câu trả lời của trợ lý được gửi ngược về chat.

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

Cài xong, hàng `personal-hub` xuất hiện trong profile và tính năng Telegram tự chạy
(trạng thái chờ token cho tới khi bạn cấu hình).

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
| `/workspaces` | Liệt kê workspace của DSH |
| `/workspace <số\|id\|đường-dẫn>` | Chọn workspace cho phiên mới |
| `/models` | Liệt kê provider và model đang dùng được |
| `/model <số\|provider/model[@effort]>` | Đổi model cho phiên hiện tại |
| `/status` | Phiên đang gắn, workspace, model, đang chạy, hàng đợi, chờ phê duyệt |
| `/cancel` | Dừng lượt đang chạy |
| `/unbind` | Bỏ gắn phiên |
| `/use <sessionId>` | Gắn chat với phiên có sẵn |
| `/whoami` | Chat id của bạn |
| `/help` | Danh sách lệnh |

Tin nhắn văn bản thường là prompt; câu trả lời dài được chia thành nhiều tin ≤ 4096 ký tự.

Trạng thái runtime: `%USERPROFILE%\.dsh\personal-hub\telegram-remote\status.json`
(`waiting-token`, `polling`, `invalid-token`, `error`, `stopped` + lỗi gần nhất).

## Phát triển

```powershell
cd plugin
node --test        # 15 test: hàm thuần + bridge với Telegram và sessionController giả lập
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
- Chưa có lệnh liệt kê toàn bộ phiên.

## Giấy phép

MIT — xem [LICENSE](LICENSE).
