# `server/` — relay Web Remote (Zig)

Relay production cho Web Remote, viết bằng **Zig 0.17.1**, chạy được trên Linux
và Windows. Đây là Phase 2 của [lộ trình](../docs/nghien-cuu-remote-webchat.md#6-lộ-trình-đề-xuất).

- Máy DSH **chỉ nối ra ngoài** (`wss://…/ws`); relay không cần mở cổng vào máy bạn.
- Trạng thái nằm trong **SQLite** (WAL), không mất khi khởi động lại.
- Giao thức theo [`protocol/README.md`](../protocol/README.md) — cùng frame, cùng mã lỗi
  với bridge trong `plugin/` và với dev relay ở `tools/dev-relay/`.

## Trạng thái

| Hạng mục | Đã có |
|---|---|
| Pairing luồng B | `POST /v1/device/authorize`, `/v1/device/token`, trang `/pair`, duyệt/từ chối |
| Token | access 15 phút + refresh 90 ngày, **lưu hash HMAC**, xoay vòng, phát hiện dùng lại → thu hồi cả family |
| Thiết bị | danh sách, thu hồi (đóng WS `4003`), duyệt/từ chối theo id |
| Xác thực web | `dev` (token dùng chung) và `clerk` (JWT + Clerk Backend API, cookie phiên) |
| Thiết bị (WS) | `hello` ký Ed25519, chống replay nonce, lệch giờ ±300 giây, subprotocol `dsh-remote.v1` + `bearer.` + `device.` |
| Định tuyến | `req`/`res`, `open`/`item`/`end`/`cancel`, `ping`/`pong`, approval/câu hỏi hai chiều |
| Giới hạn | frame 256 KiB, 8 stream/thiết bị, 32 request chờ, heartbeat 25 giây, timeout request 60 giây |
| Rate limit | tạo mã 20/giờ/IP, poll 1/5 giây/`device_code`, prompt 1/2 giây + 20/phút/phiên |
| Vận hành | `/healthz`, audit ghi SQLite, dọn phiên hết hạn mỗi 5 giây |

Chưa có: TLS trong tiến trình (Caddy lo), luồng A (mã mời), xoay khoá chủ động,
Clerk webhook thu hồi tức thì, nhiều người dùng trên một relay (mỗi relay một chủ).

## Build và chạy

Cần **Zig 0.17.1** (ghim đúng bản; `build.zig.zon` khai báo `minimum_zig_version`).

```powershell
cd server
zig build                 # ra zig-out/bin/dsh-relay
zig build test            # unit test
zig build run -- --config config.example.json
```

`config.example.json` là mẫu; sửa `auth.dev_token`, `public_url`, `data_dir` trước khi dùng.
Khi `auth.mode = dev` và `dev_token` rỗng, relay sinh token một lần và in ra log.

Trên Windows, nếu chính sách Application Control chặn tệp `.exe` mới build, chạy trong Docker:

```powershell
docker run --rm -v "${PWD}:/work" -w /work doctbase/dev-toolchain:0.17.1 sh -c 'zig build test'
```

## Cấu hình

| Khoá | Mặc định | Ý nghĩa |
|---|---|---|
| `listen_host` / `listen_port` | `127.0.0.1` / `8787` | Địa chỉ relay nghe; sau Caddy nên giữ loopback |
| `public_url` | suy ra từ listen | Gốc URL trong `verification_uri` |
| `data_dir` | `data` | Nơi đặt SQLite; tạo nếu chưa có |
| `db_file` | `relay.sqlite` | Tên tệp DB trong `data_dir` |
| `max_frame_bytes` | `262144` | Frame tối đa (khớp protocol) |
| `pairing_ttl_seconds` | `600` | TTL mã ghép cặp |
| `pairing_max_attempts` | `3` | Số lần thử cho một mã (dự phòng cho UI) |
| `access_ttl_seconds` | `900` | TTL access token |
| `refresh_ttl_seconds` | `7776000` | TTL refresh token (90 ngày) |
| `web_session_ttl_seconds` | `604800` | TTL cookie phiên web (7 ngày) |
| `max_streams_per_device` | `8` | Stream đồng thời |
| `max_inflight_per_device` | `32` | Request chờ tối đa |
| `heartbeat_ms` | `25000` | Chu kỳ ping |
| `request_timeout_ms` | `60000` | Hết hạn request/web work |
| `auth.mode` | `dev` | `dev` hoặc `clerk` |
| `auth.dev_token` | rỗng | Token web dùng chung khi `mode: dev` |
| `auth.clerk_secret_key` | rỗng | `sk_...`; chỉ dùng khi `mode: clerk` |
| `auth.clerk_issuer` | rỗng | `iss` mong đợi (Frontend API URL) |
| `auth.clerk_authorized_parties` | `[]` | Danh sách `azp` được phép |
| `auth.cookie_secure` | `false` | Bật khi chạy sau TLS |

`pepper` cho HMAC-SHA256 của token/mã được sinh lần đầu và lưu trong bảng `meta`.

## API

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/healthz` | none | `{ok, version, devices, web, uptime}` |
| GET | `/pair` | web | Trang duyệt thiết bị (nhận `?code=` và `?token=` khi `dev`) |
| POST | `/v1/device/authorize` | none | `{name, platform, pubkey, scopes?, device_id?}` → `201` + mã |
| POST | `/v1/device/token` | `device_code` | `authorization_pending` → `200`; duyệt xong trả token |
| POST | `/v1/token/refresh` | refresh token | Xoay vòng; dùng lại token cũ → thu hồi family |
| POST | `/v1/auth/clerk` | Clerk JWT | Đổi lấy cookie `dsh_session` |
| POST | `/v1/auth/logout` | cookie | Xoá phiên web |
| GET | `/v1/devices` | web | Danh sách thiết bị + `online` |
| POST | `/v1/pair/confirm` | web | `{code}` → tên máy, fingerprint |
| POST | `/v1/pair/approve` / `/v1/pair/deny` | web | Duyệt/từ chối theo mã |
| POST | `/v1/devices/{id}/approve` / `deny` / `revoke` | web | Theo id; revoke đóng WS `4003` |
| WS | `/ws` | subprotocol | `dsh-remote.v1` + `bearer.`/`device.` (thiết bị) hoặc `webbearer.`/cookie (web) |

Web auth: `Authorization: Bearer <dev_token>` hoặc `?token=` (dev), cookie `dsh_session` (clerk).

## Kiểm thử

```powershell
zig build test                       # unit: codec, crypto, store, hub, router
```

Hai bài end-to-end cần relay đang chạy (ví dụ trong Docker):

```powershell
docker run --rm -d --name dsh-relay-test -p 18787:8787 `
  -v "${PWD}:/work" -w /work doctbase/dev-toolchain:0.17.1 `
  sh -c '/work/zig-out/bin/dsh-relay --config /etc/dsh-relay.json'

$env:RELAY_E2E='1'; $env:RELAY_HTTP='http://127.0.0.1:18787'
$env:RELAY_DEV_TOKEN='dev_test_token_123'
node test/protocol-e2e.mjs            # HTTP + WS thuần
node --test test/bridge-e2e.test.js   # bridge thật trong plugin/
```

`bridge-e2e` dựng `RemoteTransport` + `WebRemoteBridge` thật, ghép cặp, chat,
theo dõi phiên và trả lời approval qua relay Zig.

## Bảo mật và vận hành

- Relay **thấy plaintext**; chỉ dùng TLS (Caddy) và relay do bạn kiểm soát. E2E là Phase 4.
- Token và mã ghép cặp chỉ lưu **hash**; log không in token, không in mã.
- `x-forwarded-for` được dùng cho rate limit theo IP — chỉ tin cậy khi relay nằm sau Caddy.
- `dev` mode chỉ hợp cho máy cá nhân; production dùng `clerk` và `cookie_secure: true`.
- SQLite: một kết nối chung (`FULLMUTEX`), WAL, `busy_timeout` 5 giây; dọn token/phiên hết hạn mỗi 5 giây.
- Deploy: [`deploy/Caddyfile`](../deploy/Caddyfile) và
  [`deploy/systemd/dsh-relay.service`](../deploy/systemd/dsh-relay.service). Tệp cấu hình chứa
  `clerk_secret_key` phải là `0600`, không commit.

## Khác biệt so với đặc tả v1

| Điểm | Trong relay này |
|---|---|
| `devices.user_id` | Cho phép `NULL` đến khi pairing được duyệt (đặc tả ghi NOT NULL) |
| Clerk | Xác thực chữ ký bằng Clerk Backend API (`/v1/sessions/{sid}`), không verify RS256 cục bộ |
| `pairing_max_attempts` | Chưa đếm theo từng mã; chống dò bằng rate limit theo IP + TTL ngắn |
| Luồng A (mã mời) | Chưa triển khai |
| `POST /v1/devices/{id}/rotate` | Chưa triển khai (thu hồi rồi ghép lại thay thế) |
| `GET /v1/devices/{id}/status` | Không cần: thiết bị poll `/v1/device/token` |
