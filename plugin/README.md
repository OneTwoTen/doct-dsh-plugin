# Personal hub — plugin cá nhân cho DeepSeek Harness

Một bundle duy nhất, nhiều tính năng. Tính năng đầu tiên: **điều khiển DSH từ xa qua Telegram**.

Gửi tin nhắn trong chat Telegram đã ghép nối → tin nhắn thành prompt cho một phiên DSH →
câu trả lời của trợ lý được sửa dần vào tin nhắn "⏳ Đang xử lý…" rồi gửi về chat.

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
```

## 5. Lệnh trong chat

| Lệnh | Tác dụng |
|---|---|
| `/new [thư-mục]` | Tạo phiên mới và gắn với chat |
| `/status` | Phiên đang gắn, thư mục, đang chạy, hàng đợi, chờ phê duyệt |
| `/cancel` | Dừng lượt đang chạy |
| `/unbind` | Bỏ gắn phiên |
| `/use <sessionId>` | Gắn chat với phiên có sẵn |
| `/whoami` | Chat id của bạn |
| `/help` | Danh sách lệnh |

Tin nhắn văn bản thường = prompt. Tin nhắn dài được chia thành nhiều tin ≤ 4096 ký tự.

## 6. Tệp dữ liệu

`%USERPROFILE%\.dsh\personal-hub\telegram-remote\` (hoặc `$DSH_HOME/personal-hub/telegram-remote/`):

- `token` — token bot, nếu bạn dùng cách tệp.
- `state.json` — `offset` của getUpdates, chat đã ghép nối, phiên đang gắn.
- `status.json` — trạng thái chạy: `waiting-token`, `polling`, `invalid-token`, `error`, `stopped`,
  bot đã kết nối, lỗi gần nhất. Đây là nơi kiểm tra khi bot im lặng.

## 7. Thêm tính năng mới

Tạo `features/<tên>.js` export `mount(ctx, config, deps)` trả về hàm dọn dẹp, rồi thêm một mục
vào mảng `FEATURES` trong `index.js` và một khoá cấu hình tương ứng trong `lib/config.js`.

## 8. Kiểm thử

```powershell
cd plugin
node --test
```

Bộ test dùng một `fetch` giả lập Telegram và một `sessionController` giả, nên chạy được khi
không có token thật.

## Giới hạn hiện tại

- Chỉ nhận tin nhắn văn bản; ảnh/tệp chưa được chuyển vào DSH.
- Chỉ chat riêng (private); nhóm bị từ chối.
- Phê duyệt và câu hỏi của DSH chỉ được báo về chat, chưa trả lời được từ Telegram.
- Chưa có lệnh liệt kê toàn bộ phiên.
