# Giao thức Web Remote v1

Hợp đồng giữa ba thành phần:

```
WebChat (SPA)  ──WS──▶  Relay (VPS)  ◀──WS outbound──  Plugin (DSH Host)
```

- **Relay không hiểu nội dung DSH.** Nó xác thực thiết bị, định tuyến frame và giữ metadata stream.
- **Plugin là bên duy nhất chạm Host.** Mọi thao tác phiên đi qua `sessionController`, approval đi qua
  waterfall `approval/request`.
- **`item` là frame gốc của DSH**, không phải bản diễn giải lại. Relay và WebChat coi frame lạ là opaque.

Mọi số liệu dưới đây là chuẩn tắc cho v1. Đổi cấu trúc frame phải sửa đồng thời `protocol/schema`,
`plugin/lib/remote-protocol.js` và fixture.

## 1. Khung truyền

Một kết nối WebSocket, text frame, JSON UTF-8. Frame tối đa **256 KiB** (`maxFrameBytes`); vượt thì
đóng stream hoặc trả lỗi `stream/overflow`, không cắt frame.

Mọi frame có trường `t`. Trường lạ được bỏ qua để tiến hoá tương thích.

| `t` | Chiều | Mục đích |
|---|---|---|
| `hello` | device → relay | Chứng minh sở hữu private key ngay sau upgrade |
| `hello.ok` | relay → device | Chấp nhận, trả giới hạn và giờ server |
| `ping` / `pong` | hai chiều | Heartbeat 25 giây; quá 2,5 nhịp không có frame → coi như chết |
| `req` / `res` | hai chiều | Unary có `id`, timeout, idempotent theo `id` |
| `open` | web → relay → device | Mở stream |
| `item` | device → relay → web | Một frame của DSH |
| `end` | hai chiều | Kết thúc stream kèm lý do |
| `cancel` | hai chiều | Huỷ stream |
| `error` | hai chiều | Lỗi mức kết nối (không có `id`) |

### 1.1 Handshake

```json
{ "t": "hello", "v": 1, "deviceId": "dev_...", "ts": 1762560000000,
  "nonce": "b64url-16-bytes", "sig": "b64url-ed25519" }
```

`sig = Ed25519(privateKey, "dsh-remote-hello|1|" + deviceId + "|" + ts + "|" + nonce)`.
Relay kiểm tra token, `deviceId` khớp token, chữ ký, `|now - ts| ≤ 300s`, `nonce` chưa thấy.

```json
{ "t": "hello.ok", "v": 1, "serverTime": 1762560000123,
  "limits": { "maxFrameBytes": 262144, "maxStreams": 8, "maxInflight": 32 } }
```

Sai xác thực: đóng WS với code `4001` (token) hoặc `4003` (thiết bị bị thu hồi); không gửi chi tiết.

### 1.2 Unary

```json
{ "t": "req", "id": "d_1f0c…", "op": "session.prompt", "args": { "sessionId": "…", "text": "xin chào" } }
{ "t": "res", "id": "d_1f0c…", "ok": true, "value": { "accepted": true } }
{ "t": "res", "id": "d_1f0c…", "ok": false,
  "error": { "code": "session/not-found", "message": "…", "retryable": false } }
```

`id` do bên gửi sinh, duy nhất trong kết nối; bên nhận trả đúng `id`. Timeout mặc định 60 giây
(riêng approval/question: 300 giây). Request trùng `id` sau khi đã trả lời bị bỏ qua.

### 1.3 Stream

```json
{ "t": "open", "id": "r_9ab…", "op": "session.follow", "args": { "sessionId": "…" } }
{ "t": "item", "id": "r_9ab…", "seq": 42, "item": { "type": "event", "event": { "seq": 42 } } }
{ "t": "end",  "id": "r_9ab…", "reason": "complete" }
{ "t": "cancel", "id": "r_9ab…" }
```

- `seq` chỉ có trên frame durable của DSH; client bỏ item trùng và **thay toàn bộ window** khi nhận
  `snapshot` mới.
- `surfaceOp: "replace"` phải xử lý như thay thế, không chỉ append.
- Mỗi thiết bị tối đa 8 stream đồng thời; vượt → `end` với `reason: "overflow"`.
- Khi web đóng tab, relay gửi `cancel`; plugin huỷ `AbortController` của stream đó.

Lý do `end` ổn định: `complete`, `cancelled`, `overflow`, `error`, `revoked`, `shutdown`.

## 2. Toán tử

### 2.1 Web → thiết bị

| `op` | `args` | `value` |
|---|---|---|
| `session.list` | `{}` | `SessionListValue` của DSH |
| `session.state` | `{ sessionId }` | `SessionState` |
| `session.create` | `{ cwd?, workspaceId?, agentPreset?, sessionId? }` | `{ sessionId, agentPreset? }` |
| `session.rename` | `{ sessionId, title }` | `{ sessionId, title }` |
| `session.prompt` | `{ sessionId, text, requestId?, mode? }` | `{ accepted: true }` |
| `session.cancel` | `{ sessionId }` | `{ accepted: true }` |
| `session.events` | `{ sessionId, beforeSeq?, throughSeq?, maxMessages? }` | `SessionEventsPage` |
| `session.modelCatalog` | `{}` | `ModelCatalog` |
| `session.selectModel` | `{ sessionId, provider, model, reasoningEffort? }` | `{ selected }` |

`session.prompt` chỉ nhận văn bản ở v1; `mode` là `queue` (mặc định) hoặc `steer`.
`requestId` do web sinh để chống gửi trùng; plugin chuyển nguyên vào `sessionController.prompt`.

Stream:

| `op` | `args` | `item` |
|---|---|---|
| `session.follow` | `{ sessionId, activate?, assistantStream?, maxMessages? }` | `SessionFollowFrame` |
| `session.control` | `{}` | `SessionControlFrame` |

### 2.2 Thiết bị → web

Approval và câu hỏi là **request do thiết bị khởi tạo**, web trả lời bằng `res`:

| `op` | `args` | `value` |
|---|---|---|
| `approval.ask` | `{ approvalId, sessionId, toolName, callId?, reason?, displayReason? }` | `{ outcome }` |
| `question.ask` | `{ questionId, sessionId, callId?, questions }` | `{ answers }` |
| `relay.ping` | `{}` | `{ time }` |

`outcome` ∈ `allowed-once | rejected | cancelled | unavailable`.
`answers` ∈ `[{ id, selected: string[], custom? }]`, đúng một entry cho mỗi câu hỏi.
Web trả lời sai bind hoặc quá hạn → thiết bị coi là `unavailable` (fail-closed) và chuyển tiếp cho
answerer kế tiếp (giao diện desktop).

## 3. Mã lỗi

| Code | Retryable | Khi nào |
|---|---|---|
| `bad-frame` | không | JSON hỏng, sai `t`, thiếu trường bắt buộc |
| `bad-request` | không | `args` sai kiểu/giá trị |
| `unsupported` | không | `op` không hỗ trợ ở bản này |
| `internal` | có | lỗi không lường trước |
| `auth/invalid-token` | không | Token sai/hết hạn, cần refresh |
| `auth/expired` | có | Access token hết hạn, thử refresh rồi lại |
| `auth/replay` | không | Nonce hoặc timestamp lặp |
| `device/pending` | có | Thiết bị chưa được duyệt |
| `device/revoked` | không | Thiết bị bị thu hồi, dừng reconnect |
| `session/not-found` | không | Phiên không tồn tại hoặc không còn hiển thị |
| `stream/limit` | không | Vượt 8 stream |
| `stream/overflow` | không | Vượt 256 KiB |
| `approval/expired` | không | Hết hạn chờ duyệt |
| `rate/limited` | có | Vượt hạn mức; tôn trọng `Retry-After` |
| `transport/not-ready` | có | Chưa sẵn sàng, thử lại sau |
| `transport/timeout` | có | Không có phản hồi trong hạn |
| `transport/closed` | có | Kết nối đóng giữa chừng |

## 4. Pairing (luồng B — thiết bị khởi tạo)

```
POST /v1/device/authorize   { name, platform, pubkey, scopes }
 → { device_code, user_code, verification_uri, expires_in, interval }
POST /v1/device/token       { device_code }   (poll mỗi interval)
 → { access_token, refresh_token, expires_in, device_id, account }
```

- `device_code` không bao giờ hiển thị; `user_code` hiển thị trên máy DSH.
- Web mở `verification_uri`, nhập `user_code`, xem tên máy + fingerprint rồi Duyệt.
- Chưa duyệt: `200 { error: "authorization_pending" }`; chậm lại: `slow_down`; hết hạn: `expired_token`;
  bị từ chối: `access_denied`.
- Refresh: `POST /v1/token/refresh { refresh_token }` → cặp token mới (rotate; dùng lại token cũ →
  thu hồi cả family).

WebSocket của thiết bị mang token qua **subprotocol**, không qua query string:

```
Sec-WebSocket-Protocol: dsh-remote.v1, bearer.<access_token>, device.<device_id>
```

## 5. Giới hạn

| Hạng mục | Giá trị |
|---|---|
| Frame | 256 KiB |
| Stream / thiết bị | 8 |
| Request chờ / thiết bị | 32 |
| Heartbeat | 25 giây (chết sau 62,5 giây) |
| Timeout unary | 60 giây |
| Timeout approval/question | 300 giây |
| Prompt / phiên | 1 / 2 giây (relay) |
| Kết nối / thiết bị | 1 (mở mới đóng cũ) |

## 6. Fixture

`fixtures/*.json` là golden message dùng chung cho test plugin, relay và web:

| Tệp | Nội dung |
|---|---|
| `hello.json` | hello + hello.ok hợp lệ |
| `unary.json` | req/res thành công và res lỗi |
| `stream.json` | open/item/end/cancel |
| `approval.json` | approval.ask + câu trả lời |

Fixture chỉ minh hoạ cấu trúc; giá trị `sig`, `id`, timestamp được thay khi test.
