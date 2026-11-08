# Đặc tả v1 — Ghép cặp & xác thực thiết bị

**Trạng thái:** draft v1 — đã chốt luồng pairing và Clerk; còn 3 câu hỏi vận hành ở mục 14  
**Phạm vi:** WebChat (Android-first PWA) ↔ Zig Relay ↔ DSH Plugin  
**Liên quan:** [Nghiên cứu kiến trúc](nghien-cuu-remote-webchat.md) · [ADR-001 — bố trí repo](adr-001-repo-layout.md)

---

## 1. Mục tiêu

- Người dùng chỉ cần **Host** và **một mã ngắn hạn**; `userId` do relay suy ra từ mã, **plugin không gửi và không cần biết** `userId`.
- Mỗi máy DSH là một `deviceId` có **khoá riêng**; credential bị đánh cắp không dùng lại được nếu không có private key.
- Ghép cặp có **xác nhận của chủ tài khoản** trên WebChat trước khi thiết bị được phép điều khiển DSH.
- Thu hồi tức thời từ Android; không cần thao tác trên máy DSH.
- Không lưu nội dung chat ở VPS; không lưu pairing code dạng plaintext ở bất kỳ đâu.
- **Đăng nhập WebChat do Clerk lo** (email/Google/passkey/MFA); relay không lưu mật khẩu, không tự gửi OTP.

## 2. Nguyên tắc bắt buộc

1. **`userId` không phải credential.** Nó chỉ là định danh công khai. Không dùng để xác thực, không dùng làm khoá tra cứu duy nhất, không gửi kèm mỗi message.
2. **Mỗi thiết bị có keypair Ed25519**, sinh tại máy DSH. Private key nằm trong credential store của HĐH (DPAPI/Keychain/libsecret) hoặc file `0600` nếu không có store.
3. **Credential luôn gắn với public key.** Relay cấp token cho `(account, deviceId, pubkey, scopes, exp)`; mỗi kết nối WS phải chứng minh sở hữu private key (challenge–response), không chỉ Bearer token.
4. **Mã ghép cặp: một lần, ngắn hạn, lưu hash.** TTL 5–10 phút; tối đa 3 lần thử; huỷ ngay sau khi dùng.
5. **Xác nhận hai phía.** Thiết bị không được `active` chỉ vì biết mã; chủ tài khoản phải bấm Approve trên WebChat.
6. **Relay không log payload**, không log mã, không log token; Caddy redact query string.
7. **Clerk chỉ xác thực người dùng web**, không thay thế credential thiết bị. Token Clerk hết hạn hay bị thu hồi không được phép mở khoá thiết bị.

## 3. Hai luồng ghép cặp

### 3.1 Luồng B — thiết bị khởi tạo (mặc định, khuyến nghị)

Mô hình RFC 8628 (OAuth 2.0 Device Authorization Grant), rút gọn cho relay nội bộ.

```
Plugin                         Relay                         WebChat (Android)
  |                              |                              |
  |-- POST /v1/device/authorize ->|                              |
  |   {name, platform, pubkey}   |                              |
  |<-- {device_code, user_code,  |                              |
  |     verification_uri,        |                              |
  |     expires_in: 600}         |                              |
  |                              |                              |
  |  hiển thị: mở chat.example.com/pair, nhập ABCD-EFGH         |
  |                              |<-- user đăng nhập ------------|
  |                              |<-- POST /v1/pair/confirm -----|
  |                              |    {user_code}                |
  |                              |--- hiện tên máy + fingerprint |
  |                              |<-- Approve -------------------|
  |                              |                              |
  |-- POST /v1/device/token ---->|  (poll mỗi 5s)               |
  |   {device_code}              |                              |
  |<-- {access, refresh,         |                              |
  |     device_id, account}      |                              |
```

Đặc điểm:

- `device_code` **không bao giờ hiển thị**; chỉ thiết bị giữ.
- `user_code` hiển thị trên máy DSH (và chỉ trên đó). Kẻ lừa đảo có `user_code` chỉ có thể xin chủ tài khoản duyệt **thiết bị của kẻ đó**, không chiếm được thiết bị nạn nhân.
- WebChat hiển thị **tên máy, platform, fingerprint, thời gian** trước khi Approve.
- Poll trả `authorization_pending` / `slow_down` / `access_denied` / `expired_token`.

**Ưu điểm:** ít trường nhất (chỉ Host), không có "mã mời" mang tính bearer, đúng chuẩn đã được kiểm chứng.

### 3.2 Luồng A — mã mời từ WebChat (dự phòng, khớp mục tiêu "Host + mã")

```
WebChat                        Relay                         Plugin
  |-- POST /v1/pair/invitations ->|                            |
  |<-- {code, expires_at}         |                            |
  |  (hiển thị code trên máy)     |                            |
  |                              |<-- POST /v1/pair/redeem ----|
  |                              |    {code, pubkey, name}     |
  |                              |--- tạo device pending ----->|
  |<-- danh sách thiết bị chờ ---|                            |
  |-- Approve ------------------>|                            |
  |                              |<-- GET /v1/devices/{id}/status (poll)
  |                              |--- {status: active, token} ->
```

Đặc điểm:

- Mã do WebChat sinh, **gắn với account**, TTL 10 phút, một lần.
- Plugin chỉ cần `Host + code`; **không nhập userId**.
- Sau khi redeem, thiết bị ở trạng thái `pending`; **chưa điều khiển được gì** cho tới khi Approve.
- Nếu quá TTL hoặc bị từ chối → `expired` / `denied`; plugin hiển thị lỗi và cho tạo lại.

**Rủi ro cần bù:** mã mời là bearer capability. Ai đọc được mã có thể tạo một thiết bị `pending` dưới tài khoản nạn nhân; chặn bằng (a) Approve thủ công, (b) thông báo "thiết bị mới đang chờ" trên WebChat, (c) rate limit + TTL ngắn, (d) fingerprint hiển thị rõ.

### 3.3 Chọn luồng nào

| | B (device flow) | A (invitation) |
|---|---|---|
| Trường phải nhập | 1 (Host) | 2 (Host + code) |
| Mã nằm ở đâu | màn hình DSH | màn hình WebChat |
| Ai khởi tạo | thiết bị | tài khoản |
| Rủi ro mã bị lộ | thấp (user_code không phải secret của thiết bị) | trung bình (bearer invitation) |
| Hợp với headless/Telegram | kém (khó đọc mã) | tốt |

**Chốt:** B là mặc định; A là fallback bật bằng config `pairing.allowInvitation: true`. Cả hai dùng chung bảng `devices`, `pairing_requests`.

## 4. Trạng thái thiết bị

```
(none) --authorize/redeem--> pending --approve--> active --revoke--> revoked
                                |                    |
                                +--expire--> expired +--rotate--> active (key mới)
```

- `pending`: đã có pubkey, chưa được duyệt; **không cấp token**, không nhận lệnh.
- `active`: được phép kết nối WS, nhận scope.
- `revoked`: từ chối mọi token/WS; giữ row để audit.
- `expired`: request hết hạn; có thể tạo request mới.

## 5. Credential và phiên

### 5.1 Cặp token

| Token | TTL | Lưu ở đâu | Dùng để |
|---|---|---|---|
| `access_token` | 15 phút | RAM plugin | `Authorization: Bearer` khi mở WS/HTTPS |
| `refresh_token` | 90 ngày, rotate mỗi lần dùng | credential store | lấy access mới |

- Refresh token **rotate**: mỗi lần refresh phát token mới, token cũ vô hiệu. Nếu token cũ được dùng lại → **revoke cả family** (phát hiện đánh cắp).
- Token là chuỗi ngẫu nhiên 32 byte, **lưu hash** (HMAC-SHA256 với pepper của server) trong DB.
- Không dùng JWT: relay là bên xác thực duy nhất, không cần chia sẻ công khai; opaque token dễ thu hồi hơn.

### 5.2 Bắt tay WebSocket (plugin)

```
GET /ws
Authorization: Bearer <access_token>
X-Device-Id: dev_...
```

Ngay sau upgrade:

```
plugin → relay: hello { v: 1, deviceId, ts, nonce, sig }
relay  → plugin: hello.ok { serverTime, limits: { maxFrameBytes, maxStreams } }
```

- `sig = Ed25519(privateKey, "hello|" + deviceId + "|" + ts + "|" + nonce)`.
- Relay kiểm tra: token hợp lệ, `deviceId` khớp token, chữ ký đúng, `|now - ts| ≤ 300s`, `nonce` chưa thấy (LRU 10k/device).
- Sai → đóng với code `4001` (auth) hoặc `4003` (revoked); không gửi chi tiết.

### 5.3 WebChat — đăng nhập bằng Clerk

- **Clerk lo toàn bộ đăng nhập** (email, Google, passkey, MFA nếu bật). Không tự làm mật khẩu/OTP.
- SPA static dùng `@clerk/clerk-js` + prebuilt UI mount (`clerk.mountSignIn(el)`), **không cần server SvelteKit**.
- Sau khi đăng nhập: `await clerk.session.getToken()` → `POST /v1/auth/clerk` → relay xác thực rồi cấp **cookie phiên riêng của relay**.
- Cookie: `HttpOnly; Secure; SameSite=Lax; Path=/`; CSRF token cho POST; TTL bằng session lifetime của Clerk (Hobby: 7 ngày).
- WS của web dùng cookie cùng origin (Caddy proxy `/ws`), không nhét token vào query.
- Token Clerk **chỉ dùng một lần** ở bước exchange; sau đó relay tự quản phiên, không gọi Clerk mỗi request.

**Ghi chú triển khai SPA (static, không SSR):**

- Clerk **không có SDK SvelteKit chính thức**; `svelte-clerk` là package cộng đồng (Svelte 5, Kit 2/3). Muốn ít phụ thuộc nhất thì dùng thẳng `@clerk/clerk-js`.
- Khởi tạo theo quickstart JS: `new Clerk(pubKey)` → load UI bundle từ Frontend API (`.../npm/@clerk/ui@1/dist/ui.browser.js`) → `clerk.load({ ui: { ClerkUI } })` → `clerk.mountSignIn(el)`.
- Lazy-load Clerk **chỉ ở `/login`** để không tăng bundle chat; sau exchange thì không cần Clerk nữa (trừ khi logout).
- Muốn còn đơn giản hơn nữa: dùng **Account Portal** (`clerk.redirectToSignIn()`) thay vì mount component — không phải load UI bundle, đổi lại UX ít liền mạch và khó tuỳ biến theo theme.
- CSP phải cho phép `script-src`/`connect-src`/`frame-src` tới Frontend API domain; Clerk dùng worker/blob trong một số luồng.
- Custom domain: production nên gắn `chat.example.com` vào Clerk (Hobby đã có custom domain) để `iss`/`azp` ổn định và tránh phụ thuộc `*.clerk.accounts.dev`.

### 5.4 Relay xác thực Clerk thế nào

Clerk phát **session token RS256** với các claim `iss`, `sub` (user), `sid` (session), `azp` (origin), `exp`, `nbf`. Relay có hai cách, chọn theo mức "đơn giản":

**Cách 1 — Backend API exchange (khuyến nghị cho MVP, ~1–2 ngày)**

```
SPA --POST /v1/auth/clerk (Bearer <clerk JWT>)--> Relay
Relay:
  1. decode payload (không cần verify chữ ký), kiểm iss/azp/exp/nbf
  2. GET https://api.clerk.com/v1/sessions/{sid}   (Authorization: Bearer sk_...)
  3. kiểm status == "active", user_id == sub, expire_at > now
  4. upsert users(clerk_user_id=sub); tạo web_session + cookie
```

- Không cần RSA trong Zig; `std.http.Client` đã có TLS client.
- Cache `sid → (user_id, exp)` 60 giây để không gọi Clerk mỗi lần login.
- **Đánh đổi:** relay giữ `sk_live_...` (quyền quản trị cả Clerk instance). Giảm thiểu: dùng Clerk instance riêng cho app này, file `0600`/systemd credential, chỉ cho egress tới `api.clerk.com`, không đưa vào repo.
- `iss` phải khớp Frontend API URL; `azp` phải nằm trong danh sách origin cho phép (chống CSRF).

**Cách 2 — Verify JWT cục bộ bằng JWKS (sạch hơn, ~3–5 ngày)**

- Lấy JWKS tại `https://<fapi>/.well-known/jwks.json` (hoặc `https://api.clerk.com/v1/jwks`), cache theo `kid`.
- Verify RS256 bằng public key; không cần `sk`, không phụ thuộc mạng mỗi lần login.
- **Vấn đề:** Zig 0.17.1 không có RSA trong std (`lib/std/crypto/Certificate/` chỉ có `Bundle`, `Chain`). Phải tự viết PKCS#1 v1.5 verify bằng `std.math.big.int`, hoặc link OpenSSL qua translate-c. Đây là chi phí thật, không phải "vài dòng".

**Chốt:** MVP dùng cách 1; nếu sau này không muốn giữ `sk` trên VPS thì nâng cấp cách 2. Cả hai đều phải kiểm `azp` và `exp`.

**Thu hồi:** cookie relay sống độc lập với Clerk session. Nếu xoá user/ban bên Clerk, cookie vẫn dùng được tới khi hết TTL. Với Hobby (7 ngày) rủi ro thấp; nếu cần thu hồi tức thì, thêm webhook `user.deleted` / `session.ended` (chữ ký Svix = HMAC-SHA256, Zig std có HMAC) để xoá `web_sessions`.

## 6. API

Tất cả dưới `/v1`, JSON, lỗi dạng `{ error: { code, message } }`.

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/clerk` | Clerk JWT | Đổi session token Clerk lấy cookie phiên relay |
| POST | `/auth/logout` | web | Huỷ phiên web |
| POST | `/device/authorize` | none | Bắt đầu luồng B; trả `device_code`, `user_code` |
| POST | `/device/token` | none (device_code) | Poll/đổi lấy token |
| POST | `/pair/invitations` | web | Tạo mã mời (luồng A) |
| POST | `/pair/redeem` | none (code) | Plugin đổi mã mời, tạo device `pending` |
| GET | `/devices/{id}/status` | none (device_code) | Poll trạng thái khi `pending` |
| POST | `/pair/confirm` | web | Nhập `user_code`, xem thông tin thiết bị |
| POST | `/devices/{id}/approve` | web | Duyệt thiết bị |
| POST | `/devices/{id}/deny` | web | Từ chối |
| GET | `/devices` | web | Danh sách thiết bị + trạng thái |
| POST | `/devices/{id}/revoke` | web | Thu hồi |
| POST | `/token/refresh` | device (refresh) | Rotate token |

### 6.1 Ví dụ

`POST /v1/auth/clerk`

```
Authorization: Bearer <clerk session JWT>
```

```json
{
  "user": { "id": "usr_8F2A91", "email": "caodo@example.com" },
  "devices": [
    { "id": "dev_01H...", "name": "PC-Caodo", "status": "active", "online": true }
  ]
}
```

Relay trả thêm `Set-Cookie: dsh_session=...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`.

`POST /v1/device/authorize`

```json
{ "name": "PC-Caodo", "platform": "windows", "pubkey": "base64-ed25519", "scopes": ["chat", "approval"] }
```

```json
{
  "device_code": "dc_9f2...",
  "user_code": "ABCD-EFGH",
  "verification_uri": "https://chat.example.com/pair",
  "expires_in": 600,
  "interval": 5
}
```

`POST /v1/device/token`

```json
{ "device_code": "dc_9f2..." }
```

```json
{
  "access_token": "at_...",
  "refresh_token": "rt_...",
  "token_type": "Bearer",
  "expires_in": 900,
  "device_id": "dev_01H...",
  "account": { "id": "usr_8F2A91", "email": "..." }
}
```

Lỗi: `authorization_pending` (200, tiếp tục poll), `slow_down` (tăng interval 5s), `access_denied`, `expired_token`, `invalid_grant`.

### 6.2 Mã lỗi chung

| Code | HTTP | Khi nào |
|---|---|---|
| `pair/invalid-code` | 400 | Sai mã / hết hạn / đã dùng |
| `pair/too-many-attempts` | 429 | Quá 3 lần thử cho một mã |
| `pair/expired` | 410 | Request hết TTL |
| `device/pending` | 409 | Thiết bị chưa được duyệt |
| `device/revoked` | 403 | Đã thu hồi |
| `auth/invalid-token` | 401 | Token sai/hết hạn |
| `auth/replay` | 401 | Nonce hoặc timestamp lặp |
| `rate/limited` | 429 | Vượt hạn mức |

## 7. SQLite schema

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id            TEXT PRIMARY KEY,          -- usr_... (nội bộ relay)
  clerk_user_id TEXT UNIQUE NOT NULL,      -- user_... (Clerk)
  email         TEXT,                      -- copy từ Clerk, có thể null
  created_at    INTEGER NOT NULL
);

CREATE TABLE devices (
  id            TEXT PRIMARY KEY,          -- dev_...
  user_id       TEXT NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  platform      TEXT NOT NULL,
  pubkey        TEXT NOT NULL,             -- base64 Ed25519
  scopes        TEXT NOT NULL,             -- JSON array
  status        TEXT NOT NULL,             -- pending|active|revoked|expired
  created_at    INTEGER NOT NULL,
  approved_at   INTEGER,
  last_seen_at  INTEGER,
  revoked_at    INTEGER
);
CREATE INDEX devices_user ON devices(user_id);

CREATE TABLE pairing_requests (
  id             TEXT PRIMARY KEY,
  user_id        TEXT REFERENCES users(id), -- NULL với luồng B trước khi xác nhận
  device_id      TEXT REFERENCES devices(id),
  flow           TEXT NOT NULL,             -- device|invitation
  user_code_hash TEXT,                      -- HMAC-SHA256(pepper, code)
  device_code_hash TEXT,                    -- chỉ luồng B
  attempts       INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL,             -- pending|approved|denied|expired|consumed
  created_at     INTEGER NOT NULL,
  expires_at     INTEGER NOT NULL,
  approved_at    INTEGER,
  consumed_at    INTEGER
);
CREATE INDEX pairing_code ON pairing_requests(user_code_hash);

CREATE TABLE tokens (
  id            TEXT PRIMARY KEY,
  device_id     TEXT NOT NULL REFERENCES devices(id),
  kind          TEXT NOT NULL,             -- access|refresh
  token_hash    TEXT NOT NULL,
  family_id     TEXT NOT NULL,             -- phát hiện reuse
  expires_at    INTEGER NOT NULL,
  revoked_at    INTEGER,
  created_at    INTEGER NOT NULL
);
CREATE INDEX tokens_hash ON tokens(token_hash);

CREATE TABLE web_sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  token_hash    TEXT NOT NULL,
  expires_at    INTEGER NOT NULL,
  ua            TEXT,
  ip_hash       TEXT,
  created_at    INTEGER NOT NULL
);

CREATE TABLE audit (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT,
  device_id  TEXT,
  event      TEXT NOT NULL,   -- pairing.created|redeemed|approved|revoked|login...
  meta       TEXT,            -- JSON, không chứa code/token/payload
  at         INTEGER NOT NULL
);
```

Ghi chú:

- `user_code` chuẩn hoá: uppercase, bỏ `-`/khoảng trắng trước khi hash.
- Không bao giờ `SELECT` code plaintext — chỉ so hash.
- Dọn dẹp định kỳ: `pairing_requests` hết hạn > 24h, `tokens` hết hạn > 30 ngày.

## 8. Giới hạn và rate limit

| Hạng mục | Giá trị |
|---|---|
| `user_code` | 8 ký tự Crockford base32 (bỏ I,L,O,U), ~40 bit |
| TTL mã | 10 phút (B), 10 phút (A) |
| Số lần thử / mã | 3, sau đó huỷ mã |
| Tạo mã / account | 10 / giờ |
| Tạo mã / IP | 20 / giờ |
| Poll `/device/token` | 1 / 5 giây / device_code |
| Kết nối WS / device | 1 (mở cái mới → đóng cái cũ) |
| Frame tối đa | 256 KiB |
| Stream đồng thời / device | 8 |
| Prompt / session | 1 / 2 giây, 20 / phút |
| Refresh token | 1 / phút / device |

Vượt → `429` + `Retry-After`.

## 9. Thu hồi và xoay khoá

- **Revoke từ Android:** `POST /devices/{id}/revoke` → set `revoked_at`, xoá token family, gửi frame `device.revoked` tới WS đang mở (nếu có), đóng với code `4003`.
- Plugin nhận `4003` → dừng reconnect, xoá credential, hiển thị "Thiết bị đã bị thu hồi".
- **Rotate key:** tạo keypair mới, `POST /devices/{id}/rotate {newPubkey, sig(oldKey)}`; token cũ thu hồi, token mới phát hành. Dùng khi nghi ngờ lộ file key.
- **Xoá tài khoản:** cascade devices + tokens + web_sessions; audit giữ lại 30 ngày.

## 10. UX WebChat (Android-first)

### Màn hình

1. **Đăng nhập** — Clerk prebuilt UI (email/Google/passkey), lazy-load ở `/login`.
2. **Thiết bị** — danh sách: tên, platform, trạng thái (online/offline/chờ duyệt), lần cuối; nút Thu hồi.
3. **Thêm thiết bị**
   - Luồng B: "Mở DSH trên máy tính → Web Remote → nhập mã hiển thị ở đó"; ô nhập mã; sau đó hiện card xác nhận (tên máy, fingerprint) → Duyệt.
   - Luồng A: hiện mã mời + nút "Sao chép"; dòng nhắc "Mã hết hạn sau 10 phút"; khi plugin redeem → card chờ duyệt.
4. **Chat** — chọn thiết bị (nếu nhiều), session list, chat.
5. **Pairing thành công** — "PC-Caodo đã kết nối" + nút vào chat.

### Copy tiếng Việt

- "Mã ghép cặp hết hạn sau 10 phút. Chỉ nhập mã trên máy bạn tin cậy."
- "Thiết bị mới đang chờ duyệt: PC-Caodo (Windows). Nếu không phải bạn, hãy Từ chối."
- "Thiết bị đã bị thu hồi. Plugin sẽ ngừng kết nối."

### Lưu ý Android

- Nút ≥ 44 px; không phụ thuộc hover.
- Bàn phím: input mã dùng `inputmode="text"`, `autocapitalize="characters"`, `autocomplete="one-time-code"`.
- PWA: không có WebSocket khi background; khi mở lại phải resume bằng `lastSeq`.

## 11. Telegram

Chỉ giữ lệnh **không nhận bí mật**:

```
/web status      -> thiết bị đang kết nối, session đang mở
/web disconnect  -> ngắt WS, giữ credential
/web pair        -> mở DSH UI ở trang Web Remote (không in mã)
```

- **Không nhận pairing code qua chat** mặc định. Lý do: Telegram lưu lịch sử, bot token bị lộ là lộ toàn bộ tin nhắn; xoá tin nhắn không đảm bảo (backup, client khác).
- Nếu buộc phải hỗ trợ: chỉ chat private đã ghép cặp, TTL 3 phút, xoá tin nhắn ngay sau khi xử lý, không echo mã, và cảnh báo trong UI.
- Token dài hạn **không** ghi vào `state.json`; dùng credential store của DSH.
- `/web disconnect` chỉ đóng kết nối, **không** thu hồi thiết bị (thu hồi phải từ Android).

## 12. Những điểm phải sửa so với bản nháp trước

1. **Không gửi `userId` từ plugin.** Mã ghép cặp quyết định account; `userId` chỉ để hiển thị.
2. **Mã mời không phải credential.** Luôn có bước Approve; thiết bị `pending` không nhận lệnh.
3. **Token phải gắn pubkey + proof-of-possession**, nếu không token bị đánh cắp là chiếm thiết bị.
4. **Không nhận mã qua Telegram** (mặc định).
5. **Mã 8 ký tự, 3 lần thử, TTL 10 phút**, lưu hash — không dùng mã 6 số.
6. **Rate limit theo IP + account + device_code**, không chỉ theo account.
7. **Approval là scope riêng** (`approval:answer`), và answer phải bind `(approvalId, sessionId, callId)`.
8. **Session namespace theo device**: `deviceId/sessionId`, không giả định session ID unique toàn hệ.

## 13. Checklist triển khai

**Relay**

- [ ] Bảng + migration SQLite; WAL; busy_timeout.
- [ ] `POST /device/authorize`, `/device/token` (RFC 8628 rút gọn).
- [ ] `POST /pair/invitations`, `/pair/redeem`, `/devices/{id}/approve`.
- [ ] Token opaque + hash + rotate + reuse detection.
- [ ] WS handshake: Bearer + Ed25519 challenge; nonce cache; clock skew.
- [ ] Rate limit + audit metadata.
- [ ] Revoke đẩy frame + đóng `4003`.

**Plugin**

- [ ] Sinh keypair, lưu credential store, không log.
- [ ] Luồng B: hiển thị mã + URL trong DSH UI; poll; lưu token.
- [ ] Luồng A: nhận `Host + code`, redeem, poll trạng thái.
- [ ] WS client: reconnect backoff 1→30s jitter, heartbeat 20s, resume `lastSeq`.
- [ ] Feature-detect `follow`/`page`/`wait`; ghi log phiên bản DSH.
- [ ] Approval answerer → forward web; timeout fail-closed.

**Web**

- [ ] Clerk: lazy-load `@clerk/clerk-js` + mountSignIn; `POST /auth/clerk`; cookie + CSRF.
- [ ] Màn hình thiết bị + thêm thiết bị + chờ duyệt + thu hồi.
- [ ] WS multiplex; resume; offline banner.
- [ ] PWA install; không cache API.

**Test**

- [ ] Mã hết hạn, sai 3 lần, dùng lại.
- [ ] Token hết hạn giữa phiên → refresh không mất stream.
- [ ] Revoke khi đang chạy prompt → agent dừng, web báo.
- [ ] Replay nonce/timestamp.
- [ ] Hai thiết bị cùng account, chọn đúng máy.
- [ ] Mất mạng 30s → reconnect, không mất event.

## 14. Câu hỏi mở

1. Dùng Clerk instance nào: development (`*.clerk.accounts.dev`) hay production gắn custom domain `chat.example.com`?
2. Có cần nhiều người dùng trên một relay (multi-tenant) ngay từ v1 không?
3. Chấp nhận gói Hobby (session 7 ngày, có branding Clerk) hay trả Pro $20/tháng để có custom session lifetime + MFA?
4. Có cần thu hồi tức thì khi user bị xoá/ban bên Clerk (webhook `user.deleted`) không, hay chấp nhận cookie hết hạn tự nhiên?
5. Refresh token thiết bị 90 ngày có phù hợp, hay ngắn hơn (30 ngày) cho an toàn?

---

## 15. Phụ lục — khung triển khai Clerk

### 15.1 SPA (SvelteKit static)

```ts
// src/lib/clerk.ts
import { Clerk } from '@clerk/clerk-js'

let instance: Clerk | undefined

export async function getClerk(): Promise<Clerk> {
  if (instance) return instance
  const pk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string
  const fapi = atob(pk.split('_')[2]).slice(0, -1)

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://${fapi}/npm/@clerk/ui@1/dist/ui.browser.js`
    script.async = true
    script.crossOrigin = 'anonymous'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Clerk UI bundle failed'))
    document.head.appendChild(script)
  })

  instance = new Clerk(pk)
  await instance.load({ ui: { ClerkUI: (window as any).__internal_ClerkUICtor } })
  return instance
}
```

```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { getClerk } from '#lib/clerk'

  let host: HTMLDivElement
  let stop: (() => void) | undefined

  onMount(() => {
    void (async () => {
      const clerk = await getClerk()
      if (clerk.isSignedIn) { await goto('/devices'); return }
      clerk.mountSignIn(host)

      stop = clerk.addListener(async ({ session }) => {
        if (!session) return
        const token = await session.getToken()
        if (!token) return
        const res = await fetch('/v1/auth/clerk', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        })
        if (res.ok) await goto('/devices')
      })
    })()
  })

  onDestroy(() => stop?.())
</script>

<div bind:this={host}></div>
```

> Lưu ý: `onMount` async không trả về hàm cleanup; phải giữ `stop` riêng và gọi trong `onDestroy` như trên.

### 15.2 Relay (Zig, giả mã)

> Đây là giả mã: chữ ký `std.http.Client` và `std.json` thay đổi giữa các bản Zig; đối chiếu docs 0.17.1 trước khi viết.

```zig
// POST /v1/auth/clerk
const claims = try decodeJwtPayload(auth_header);        // base64url + json
if (!std.mem.eql(u8, claims.iss, clerk_issuer)) return unauthorized();
if (!allowedAzp(claims.azp)) return unauthorized();
if (claims.exp <= now or claims.nbf > now + 300) return unauthorized();

// GET https://api.clerk.com/v1/sessions/{sid}
var client: std.http.Client = .{ .allocator = allocator };
const body = try client.fetch(.{
    .location = .{ .url = try sessionUrl(sid) },
    .method = .GET,
    .extra_headers = &.{.{ .name = "authorization", .value = clerk_secret }},
});
const session = try std.json.parseFromSlice(Session, allocator, body, .{});
if (!std.mem.eql(u8, session.status, "active")) return unauthorized();
if (!std.mem.eql(u8, session.user_id, claims.sub)) return unauthorized();

const user = try upsertUser(session.user_id);            // email: GET /v1/users/{sub} nếu cần
const cookie = try createWebSession(user.id);            // 32B opaque, hash trong DB
return setCookieAndJson(cookie, .{ .user = user });
```

### 15.3 Caddy

```caddyfile
chat.example.com {
    encode zstd gzip
    handle /v1/* {
        reverse_proxy 127.0.0.1:8080
    }
    handle /ws {
        reverse_proxy 127.0.0.1:8080 {
            stream_close_delay 5m
        }
    }
    handle {
        root * /srv/chat
        try_files {path} /200.html
        header /200.html Cache-Control "no-cache"
        file_server
    }
}
```

---

## Nguồn tham khảo

- RFC 8628 — OAuth 2.0 Device Authorization Grant: https://www.rfc-editor.org/rfc/rfc8628
- RFC 6750 — Bearer token (và lý do nên gắn proof-of-possession): https://www.rfc-editor.org/rfc/rfc6750
- WebAuthn: https://www.w3.org/TR/webauthn-3/
- OWASP — Credential Stuffing / Brute Force: https://owasp.org/www-community/attacks/Credential_stuffing
- Clerk — Manual JWT verification (RS256, JWKS, `azp`): https://clerk.com/docs/guides/sessions/manual-jwt-verification.md
- Clerk — Session token claims (`sid`, `sub`, `azp`, `iss`): https://clerk.com/docs/guides/sessions/session-tokens.md
- Clerk — JavaScript quickstart (`new Clerk` + `mountSignIn`): https://clerk.com/docs/js-frontend/getting-started/quickstart.md
- Clerk — Backend API (sessions): https://clerk.com/docs/reference/backend-api
- Clerk — Pricing (Hobby 50k MRU, session 7 ngày; Pro $20/tháng): https://clerk.com/pricing
- `svelte-clerk` (cộng đồng, không chính thức): https://github.com/clerk-community/svelte-clerk
- DSH approval (fail-closed): `docs/subsystems/approval.md`
