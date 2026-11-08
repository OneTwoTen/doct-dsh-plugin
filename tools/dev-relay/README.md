# Dev relay — Web Remote

Relay WebSocket **chỉ dùng khi phát triển**. Nó cho phép chạy thử toàn bộ luồng
`DSH Host ↔ relay ↔ WebChat` trước khi relay Zig (Phase 2) và web client SvelteKit (Phase 3) ra đời.

Cái đã có:

- pairing luồng B (`/v1/device/authorize`, `/v1/device/token`, `/v1/token/refresh`);
- trang duyệt thiết bị `/pair` hiển thị tên máy, nền tảng, fingerprint;
- WebSocket server nhận cả device và web, xác thực bằng subprotocol + chữ ký `hello`;
- định tuyến unary `req/res`, stream `open/item/end/cancel`, approval/question device → web;
- WebChat tối giản (vanilla JS, mobile-first): danh sách phiên, chat, prompt, cancel, duyệt tool,
  trả lời câu hỏi.

**Không dùng cho production:** state nằm trong RAM, một người dùng, không TLS, không rate limit,
không lưu hash token. Relay Zig sẽ thay thế.

## Chạy

```powershell
node tools/dev-relay/index.mjs --port 8787
```

In ra:

```text
Relay URL   : http://127.0.0.1:8787
WebChat     : http://127.0.0.1:8787/?token=at_…
Pair page   : http://127.0.0.1:8787/pair
```

Mở WebChat trên điện thoại (cùng mạng LAN thì dùng `--host 0.0.0.0`; CLI in thêm URL LAN), sau đó
cấu hình hàng `personal-hub` trong DSH:

```yaml
webRemote:
  enabled: true
  relayUrl: 'http://127.0.0.1:8787'
```

Khi plugin khởi động, nó gọi `/v1/device/authorize`; relay in ra:

```text
[relay] yêu cầu ghép cặp: PC-Caodo (win32)
[relay] mở http://127.0.0.1:8787/pair?code=ABCD-EFGH để duyệt
```

Mở link đó, kiểm tra fingerprint, bấm **Duyệt thiết bị**. Plugin nhận token, mở WebSocket, và
WebChat hiện danh sách phiên.

## Tham số

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `--port` | `8787` | cổng (0 = OS chọn) |
| `--host` | `127.0.0.1` | địa chỉ bind; `0.0.0.0` để thử trên điện thoại trong LAN |
| `--web-token` | ngẫu nhiên | token WebChat cố định |
| `--public-url` | | URL công khai khi chạy sau proxy; cũng dùng cho `verification_uri` |

WebChat không dùng `crypto.randomUUID` khi mở qua HTTP LAN (không phải secure context); trang tự
sinh id bằng `getRandomValues`. Token nằm trong query lần đầu rồi được chuyển vào `sessionStorage`
và xoá khỏi thanh địa chỉ.

## API

| Method | Path | Auth |
|---|---|---|
| POST | `/v1/device/authorize` | none |
| POST | `/v1/device/token` | `device_code` |
| POST | `/v1/token/refresh` | refresh token |
| GET | `/pair?code=…` | none (chỉ bind loopback) |
| POST | `/v1/pair/approve`, `/v1/pair/deny` | mã ghép cặp |
| GET | `/v1/devices` | web token |
| POST | `/v1/devices/{id}/revoke` | web token |
| GET | `/healthz` | none |

Web token nhận qua `Authorization: Bearer` hoặc `?token=` (chỉ dùng trong dev).

## Test

```powershell
cd tools/dev-relay
node --test
```

Bộ test dùng WebSocket và `fetch` thật trên cổng ngẫu nhiên, gồm một bài end-to-end dựng
`RemoteTransport + WebRemoteBridge` thật rồi chat và duyệt approval qua relay.

## Giới hạn

- Một thiết bị online; web luôn nói chuyện với thiết bị đầu tiên đang kết nối.
- Không lưu gì qua lần chạy lại: restart relay là phải ghép cặp lại.
- Chưa có Clerk, nhiều người dùng, rate limit, TLS, audit, thu hồi theo tài khoản.
- WebChat bỏ qua assistant-stream (chỉ hiện tin cuối mỗi bước) và chưa hiển thị diff/tool result.
