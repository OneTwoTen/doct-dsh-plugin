# Nghiên cứu: Zig + SvelteKit + DSH Plugin cho Remote WebChat

**Ngày:** 2026-11-08  
**Phạm vi:** kiến trúc `SvelteKit SPA/PWA ↔ Zig Relay ↔ doct-dsh-plugin ↔ DSH Host`  
**Cách làm:** đọc mã nguồn DSH trên máy, đối chiếu bản DSH đang cài, và tra cứu web cho Zig/SvelteKit/Caddy (số liệu có nguồn ở cuối).  
**Quyết định repo:** monorepo — xem [ADR-001](adr-001-repo-layout.md).

> Quy ước đường dẫn: các đường dẫn dạng `packages/...` trỏ tới checkout DSH tại `C:\space\doct\deepseek-harness` (bản `0.2.1-alpha.2`). Bản đang chạy thực tế trên máy là `0.2.2-rc.1` (đọc từ `app.asar`), nên khi hai bản khác nhau tôi ghi rõ.

---

## 0. Kết luận trong 30 giây

Stack bạn đề xuất **chạy được về mặt kỹ thuật**, nhưng bản thiết kế hiện tại đang **dựng lại ba thứ DSH đã có sẵn**:

1. **Transport WebSocket có xác thực** — DSH có mux `/api/remote.mux`, cookie phiên ký, fence Host/Origin, TLS tùy chọn, và tài liệu chính thức cho reverse proxy.
2. **Giao thức stream có snapshot/cursor/seq/backpressure/cancel** — `sessionController.follow()` đã trả đúng mô hình "snapshot → replay → live" mà mục 5 của bạn mô tả, kèm `page()` để vá gap và `control()` cho trạng thái chạy.
3. **UI cho approval, câu hỏi, tool call** — client DSH trả lời approval qua waterfall Remote Event; một client SvelteKit tự viết sẽ phải làm lại toàn bộ, nếu không agent sẽ **fail-closed** (mọi tool cần duyệt bị từ chối).

Vì vậy câu hỏi không phải "stack này có khả thi không" mà là **"cái gì đáng xây thêm"**. Có bốn phương án, xếp theo chi phí:

| # | Phương án | MVP | UX mobile | Giữ approval/tool UI | Bề mặt tấn công | Chạy với Desktop app | NAT/đa thiết bị |
|---|---|---|---|---|---|---|---|
| **A** | Dùng Web UI sẵn có + TLS/proxy/tunnel | **0–1 ngày** | Trung bình (layout desktop, có responsive một phần) | Nguyên vẹn | Rộng (toàn bộ API DSH) | Một phần (phải chạy `dsh web` riêng hoặc tunnel tới port desktop) | Có, qua tunnel |
| **B** | Trang mobile-first viết như **client plugin** trong DSH Web (React/slots) | 2–4 tuần | Tốt | Tái dùng component | Rộng | Có (nếu remote bật được) | Cần tunnel/proxy |
| **C** | **Đề xuất của bạn**: SvelteKit + Zig relay + bridge plugin | 8–16 tuần | Tốt nhất | **Phải làm lại** | **Hẹp** (chỉ vài thao tác chat) | Có (plugin outbound) | Có, native |
| **D** | Zig làm **tunnel byte-level** cho Web UI sẵn có | 3–7 ngày | = A | Nguyên vẹn | Rộng | Có (plugin lấy URL có token) | Có |

**Khuyến nghị:**

- **Làm Phase 0 bằng A trong 1–2 ngày** để biết UI DSH trên điện thoại có đủ dùng không. Nếu đủ, dừng ở A/D, tiết kiệm 2–4 tháng.
- Nếu cần UI riêng: **B rẻ hơn C khoảng 5–8 lần** và giữ được approval/tool call. Chỉ chọn C khi mục tiêu thật sự là (a) UI mobile riêng biệt, (b) relay đa người dùng/đa máy sau NAT, (c) thu hẹp bề mặt tấn công — và chấp nhận tự làm lại approval.
- Nếu vẫn đi C: **đừng tự chế "JSON v1" như bản nháp**. Hoặc bọc nguyên frame Typert mux như ống dẫn mù, hoặc định nghĩa protocol bám đúng ngữ nghĩa `follow/page/control` của DSH (mục 2.3).

---

## 1. Bằng chứng: DSH đã có gì

### 1.1 Transport, xác thực, TLS

- `sessionController` **không phải service nội bộ đơn thuần** — nó kế thừa `TypertRemoteService` và công bố một Remote namespace (`packages/api/session-controller/src/index.ts:105`, `:143`). Nghĩa là mọi method đều đã có descriptor, codec, validation, cancellation và stream framing.
- Gateway mở WebSocket tại `/api/remote.mux`, có heartbeat Ping/Pong (mặc định 2 giây), giới hạn inbox uplink 256 KiB mỗi stream, và cơ chế reconnect theo "generation" (`packages/api/gateway/README.md:35`, `:39`).
- Xác thực: URL khởi động mang **process token**, đổi thành **cookie phiên đã ký**; mọi API call và WebSocket stream đều đi qua bước này. Kèm fence `Host`/`Origin`, `--trusted-host`, `--public-url` (`docs/user/guide/public-deployments.md:5`, `:17–27`; `docs/subsystems/web-server.md:80`).
- TLS: `--tls-cert` + `--tls-key`, hoặc để proxy terminate. Không có ACME, không tự renew (`packages/bundle/web-app/README.md:63–65`).
- Bind: **từ chối địa chỉ wildcard** (`0.0.0.0`/`::`) vì "would expose remote code execution to the network"; chỉ nhận một IP cụ thể (`packages/host/webserver/src/index.ts:263–267`). Đây là quyết định bảo mật có chủ đích, không phải thiếu sót.

Hệ quả: **"Zig chỉ lo kết nối, xác thực, định tuyến"** — phần xác thực và TLS đã có sẵn ở tầng DSH. Cái bạn cần thêm thật sự chỉ là **NAT traversal** (kết nối outbound) và **pairing đa thiết bị**.

### 1.2 Giao thức stream: `follow` chính là mục 5 trong bản nháp của bạn

`sessionController.follow()` trả về một `AsyncIterable` gồm (`packages/api/session-controller/src/types.ts:560–571`):

1. **`snapshot`**: header, `cursor`, `records` (trang đuôi), `hasMore`, `projections`, và `assistantStream` (baseline của lượt đang chạy).
2. **`event`**: từng event durable, có `seq` tăng dần.
3. **`assistant-stream`**: frame process-local của lượt đang chạy (start/chunk/end).

Kèm theo:

- `page()` đọc lùi history theo `throughSeq`/`beforeSeq` — dùng để vá gap sau reconnect (`types.ts:479–499`).
- `control()` trả baseline + cập nhật projection (running, model, title…) cho toàn Host (`types.ts:573–589`).
- Mỗi event có `seq`, `surfaceOp` (append/replace), `sourceEventSeqs` — tức là **không phải mọi thứ đều append**; event thay thế phải xử lý như replace (`types.ts:453–476`).

So với bản nháp của bạn:

| Bản nháp | DSH đã có |
|---|---|
| `session.subscribe` + snapshot + replay sau cursor | `follow()` (opening snapshot + cursor + frames) |
| `session.history` | `page()` |
| `session.event` (chỉ gửi khi có subscriber) | `follow()` mở per-session; không broadcast toàn bộ |
| Dedupe `(sessionId, seq)` | `seq` + validate range + `page()` gap repair |
| `session.state` | `control()` |
| `session.prompt` / `cancel` | `prompt()` / `cancel()` (có `requestId`, `mode: 'queue'`) |

**Kết luận:** phần khó nhất của đồng bộ Desktop ↔ Web (đăng ký buffer trước khi chụp snapshot, replay phần chênh lệch, chống mất event) **đã được DSH giải quyết**. Nếu bridge tự làm lại bằng `ctx.on('session/event')`, bạn sẽ dễ mắc đúng những lỗi mà `follow()` đã xử lý: race giữa snapshot và subscribe, event replace, assistant-stream không durable.

### 1.3 Approval và câu hỏi: điểm chặn cứng

- Approval là waterfall `approval/request`; outcome đóng và **fail-closed**: `allowed-once | rejected | cancelled | unavailable`, và `unavailable` bị coi là từ chối (`docs/subsystems/approval.md:21`).
- Client DSH trả lời approval **qua scoped Remote Event waterfall** — tức là browser từ xa (đã đăng nhập) trả lời được (`packages/client/ui-approval/src/client/index.ts:1`).
- Câu hỏi người dùng cũng là waterfall, và tài liệu nói rõ "including listeners relayed to a connected client" (`docs/subsystems/user-questions.md:5`).

Điều này có nghĩa:

- **Phương án A/B** giữ nguyên khả năng duyệt tool.
- **Phương án C** phải tự dựng lại: hiển thị tool call (để người dùng biết đang duyệt cái gì), gửi answer về Host đúng `callId`/`sessionId`, timeout → `unavailable`. Nếu không, agent sẽ bị chặn ở mọi tool cần approval — hoặc tệ hơn, bạn sẽ bị dụ bật `approval policy = never`/auto-approve, phá luôn mô hình an toàn.

Plugin hiện tại cũng đang dừng ở mức "thông báo": README ghi rõ "Phê duyệt và câu hỏi của DSH chỉ được báo về chat, chưa trả lời được từ Telegram" (`plugin/README.md:367`). Đây chính là phần việc mà bản nháp của bạn xếp vào Phase 4 — nhưng nó là **điều kiện tiên quyết**, không phải phần tối ưu.

### 1.4 Giới hạn thực tế của remote DSH

Ba điểm cần biết trước khi chọn A/B:

1. **Desktop app hardcode loopback.** Tiến trình host của app desktop chạy với `--host 127.0.0.1 --port 0` (`apps/desktop-host/src/index.ts:30`). Bạn không thể bật `--host 0.0.0.0` cho app desktop bằng config. Muốn dùng remote kiểu A, phải chạy `dsh --profile web` như một tiến trình riêng (cùng `DSH_HOME`) — cần kiểm chứng chuyện hai host cùng mở một profile có xung đột lock/JSONL hay không.
2. **Một số tính năng bị khoá theo loopback.** `isLoopback` quyết định settings có được lưu bền hay chỉ trong bộ nhớ (`packages/client/ui-settings/src/client/index.ts:39`), directory picker chuyển sang chế độ browse, và các tính năng "desktop-only" biến mất. Remote browser là công dân hạng hai — đúng như thiết kế.
3. **UI DSH là desktop-first.** Có `@media (pointer: coarse)` và vài breakpoint 480/560/720/760 px, nhưng layout chính vẫn là sidebar + trajectory table. Chưa có bằng chứng nó thoải mái trên điện thoại; đây là lý do chính đáng để làm UI riêng (B hoặc C).
4. **API drift là rủi ro thật, có bằng chứng.** Plugin hiện tại gọi `sessionController.wait()` và `events()`; bản cài `0.2.2-rc.1` có cả hai, còn checkout `0.2.1-alpha.2` **không có** — tức là API đã đổi giữa các bản. README plugin cũng ghi nhận `connection.rpc.handle()` hỏng trên `0.2.2-rc.1` và phải chuyển sang route Fetch (`plugin/README.md:261–265`). Vì vậy bridge phải **feature-detect** (`follow`/`page`/`wait`/`events`) và ghi rõ dải phiên bản DSH hỗ trợ; đừng giả định API cố định.

---

## 2. Đánh giá bản nháp kiến trúc

### 2.1 Phần đúng

- **Tách vai trò rõ**: Zig không hiểu DSH; plugin là thành phần duy nhất chạm Host. Đúng.
- **Plugin chủ động kết nối ra ngoài**, không mở port trên máy cá nhân. Đúng và quan trọng.
- **Không lưu history trên VPS**; SQLite chỉ giữ user/device/pairing. Đúng hướng.
- **SQLite cho VPS giai đoạn đầu**. Hợp lý.
- **Caddy terminate TLS**. Bắt buộc, vì Zig std **không có TLS server** (xem 3.4).
- **SvelteKit build static, không Node trên VPS**. Đúng.
- **Dedupe theo `(sessionId, seq)`**. Đúng, nhưng thiếu xử lý `surfaceOp: replace`.

### 2.2 Phần thiếu hoặc sai

**(a) Envelope quá mỏng cho một hệ stream.**
`{v,id,type,deviceId,sessionId,payload}` không có: `streamId`, `seq` ở tầng frame, `ack`, `cancel`, `end`, phân biệt unary vs stream, và mã lỗi có cấu trúc. Khi một prompt chạy 10 phút sinh hàng nghìn event, bạn cần biết frame nào thuộc stream nào, stream nào bị huỷ, và ai đang chậm.

**(b) `deviceId` trên mọi message là thừa và nguy hiểm.**
Routing phải theo **connection đã xác thực**, không theo field client tự khai. Giữ `deviceId` trong envelope mở ra lớp lỗi "tin deviceId client gửi" — đúng loại lỗi dẫn tới IDOR.

**(c) "Zig không cần phân tích nội dung" — đúng, nhưng vẫn phải hiểu vòng đời stream.**
Muốn resume sau reconnect, relay phải biết stream nào còn mở, seq cuối, và buffer bao nhiêu. Nếu relay hoàn toàn mù, client phải tự mở lại `follow` và validate snapshot — khả thi, nhưng khi đó relay chỉ là ống dẫn, và bạn nên nói rõ điều đó trong spec.

**(d) Thiếu approval round-trip.** Như mục 1.3.

**(e) Thiếu spec pairing và khoá.** "Mã ngắn hạn, xác nhận trên desktop" chưa đủ: ai hiển thị mã, mã sống bao lâu, chống brute-force thế nào, device key lưu ở đâu, thu hồi ra sao, relay có thấy plaintext không.

**(f) `session.event` broadcast là bẫy.** Nếu plugin đẩy mọi event của mọi session lên relay, bạn vừa tốn băng thông vừa tạo kênh rò rỉ metadata. Chỉ mở stream khi có subscriber, và đóng khi subscriber cuối rời đi.

**(g) Nhầm `assistant-stream` là durable.** Frame chunk của lượt đang chạy là process-local; sau reconnect nó được thay bằng baseline trong snapshot. Nếu client lưu chunk vào history như event thường, lịch sử sẽ hỏng.

### 2.3 Protocol v2 đề xuất (nếu vẫn đi C)

Mục tiêu: đủ chặt để làm client, đủ mỏng để Zig không phải hiểu DSH.

**Handshake**

```
device → relay:  hello { v, deviceKey, ts, nonce, sig }
relay  → device: hello.ok { serverTime, resumeToken, limits }
web    → relay:  web.hello { v, userToken }        // cookie hoặc ticket ngắn hạn
relay  → web:    web.ok { devices: [{ id, name, online }] }
```

**Unary** (có `requestId`, timeout, idempotent):

```
{ t: "req", id, op: "session.list" | "session.create" | "session.prompt" | "session.cancel" | "session.page", args }
{ t: "res", id, ok: true, value } | { t: "res", id, ok: false, error: { code, message, retryable } }
```

**Stream** (một writer, một reader):

```
{ t: "open",  id, op: "session.follow" | "session.control", args }
{ t: "item",  id, seq?, item }        // item = đúng frame của DSH
{ t: "end",   id, reason }
{ t: "cancel",id }
```

**Quy tắc bắt buộc**

- `seq` đơn điệu theo `(sessionId)`; client bỏ item trùng, và **reset toàn bộ window** khi gặp snapshot mới.
- Xử lý `surfaceOp: "replace"` (xoá/ghi đè range) — không chỉ append.
- Frame tối đa 256 KiB; queue mỗi stream tối đa 256 KiB; vượt → đóng stream với `overflow` (giống DSH).
- Heartbeat 20–30 giây; client coi `pagehide`/`freeze` là "socket đã chết".
- Resume: client gửi `lastSeq`; nếu relay/plugin không còn buffer → mở `follow` mới và thay window.
- Lỗi có mã ổn định: `auth/*`, `device/*`, `session/not-found`, `stream/overflow`, `approval/expired`, `rate-limited`.

**Điểm quan trọng:** các `item` nên là **nguyên frame của DSH** (`event`, `assistant-stream`, projection update), không phải bản diễn giải lại. Như vậy bridge chỉ là adapter, và khi DSH thêm event type, client cũ vẫn bỏ qua được event lạ thay vì crash.

---

## 3. Zig: hiện trạng tháng 11/2026

### 3.1 Phiên bản và độ ổn định

- **Stable mới nhất: 0.17.1 (2026-11-02)**; trước đó 0.17.0 (2026-10-01), 0.16.0 (2026-04-13), 0.15.2 (2025-10-11). Master đang là 0.18.0-dev.
- Nhịp phát hành ~2 bản minor/năm; vá trong vài tuần.
- **Vẫn pre-1.0, chưa có ngày 1.0.** 0.17 xoá hẳn `@cImport`, deprecate `@intFromEnum`/`@enumFromInt`, và đổi nghĩa `@bitCast` theo cách mà release notes nói "has the potential to break existing code without triggering a compile error".
- Build system bị làm lại mạnh trong 0.17 (tách maker/configurer, cache mới, Build Server Protocol).

**Hệ quả thực tế:** mỗi lần nâng Zig là một đợt migration. Phải pin chính xác compiler + vendor dependency theo hash, và CI chỉ chạy trên đúng phiên bản đó.

### 3.2 `std.http.Server`: dùng được, nhưng không phải relay-grade

Đã kiểm tra trực tiếp source tại tag 0.17.1:

- Có `Server` xử lý vòng đời một connection: `receiveHead`, `respond`, `respondStreaming`, keep-alive, chunked, `100-continue`, HEAD.
- **Chỉ HTTP/1.0 và 1.1** — không HTTP/2, không HTTP/3.
- **Không có TLS server** (xem 3.4).
- Header phải nằm gọn trong buffer đọc, nếu không `HttpHeadersOversize`.
- Không có timeout, connection limit, hay `Date` header — bạn tự lo accept loop.

Đáng chú ý: 0.17.1 **có sẵn WebSocket helper** (`respondWebSocket`, `readSmallMessage`, `writeMessage`, opcode, masking). Nhưng đọc source cho thấy giới hạn cứng:

- `readSmallMessage` yêu cầu **một frame FIN duy nhất nằm trọn trong buffer**; quá lớn → `MessageOversize`.
- Không reassembly fragmentation (`continuation` → `UnexpectedOpCode`).
- Không permessage-deflate.
- Chỉ tự bỏ qua pong; ping/close do caller xử lý.

Kết luận: helper này đủ cho handshake và message điều khiển nhỏ, **không đủ cho dữ liệu chat** (token stream, ảnh, diff).

### 3.3 Thư viện WebSocket

| Thư viện | Zig | Hoạt động cuối | Vai trò | TLS | Deflate | Ghi chú |
|---|---|---|---|---|---|---|
| `karlseguin/websocket.zig` | 0.17.0 | 2026-10-04 | server + client | client, TLS 1.3 | có | MIT, epoll/kqueue, `max_conn` 16 384, `max_message_size` 64 KiB mặc định |
| `karlseguin/http.zig` | 0.17.0 | 2026-10-29 | HTTP/1.1 server | không | qua ws.zig | thiết kế để chạy sau reverse proxy |
| `zigzap/zap` | — | 2026-09-06 | server | qua facil.io | — | **đã archive** (`archived: true`) |
| `std` 0.17.1 | — | 2026-11-02 | server | không | không | helper tối giản, xem 3.2 |

**Chọn: `websocket.zig` làm transport, Caddy làm TLS.** Đây là profile đúng cho relay nhiều connection idle. Không chọn zap (đã archive). Không dùng std WS cho data frame.

### 3.4 TLS

`lib/std/crypto/tls/` tại tag 0.17.1 **chỉ có `Client.zig`** — không có TLS server. Client cũng chỉ TLS 1.3. Vì vậy:

- Hoặc terminate TLS ở Caddy/nginx (khuyến nghị: được thêm HTTP/2, ALPN, timeout, OCSP).
- Hoặc link mbedTLS/BoringSSL — nhưng từ 0.17 `@cImport` đã bị xoá, phải dùng package `translate-c` hoặc `addCSourceFile`, tăng đáng kể công bảo trì.

### 3.5 SQLite

- **`zqlite`** (karlseguin): wrapper mỏng, bundle SQLite 3.53.0, pool + busyTimeout + transaction helper. **Đang target Zig 0.16.0 — chậm một bản so với stable.** Không tự bật WAL; phải tự `PRAGMA journal_mode=WAL`.
- **C trực tiếp**: kiểm soát tốt nhất, nhưng 0.17 bỏ `@cImport` nên phải qua `translate-c` và tự giữ danh sách flag (`SQLITE_DQS=0`, `SQLITE_THREADSAFE=1`, `SQLITE_OMIT_LOAD_EXTENSION`…).
- WAL vẫn chỉ cho **một writer**: pool N reader + 1 writer, transaction ngắn.

Với dữ liệu user/device/pairing (nhỏ, ghi ít), cả hai đều ổn. Rủi ro chính là **zqlite lệch phiên bản Zig**, không phải SQLite.

### 3.6 Async và mô hình đồng thời

- 0.16 giới thiệu "I/O as an Interface": `std.Io` là vtable cho I/O + concurrency (`Threaded`, `Uring`, `Kqueue`, `Dispatch`).
- Nhưng source 0.17.1 vẫn ghi `Evented = if (fiber.supported) ... else void` với ghi chú "context-switching code not implemented yet"; `std.Thread.Pool` đã bị xoá từ 0.16.
- **Kết luận thiết kế:** dùng thread-per-core + epoll/kqueue (websocket.zig/http.zig đã làm sẵn), **không đưa async vào kiến trúc** cho đến khi 1.0.

### 3.7 Vận hành

- Cross-compile `-Dtarget=x86_64-linux-musl` cho binary tĩnh, không cần toolchain ngoài. Đây là điểm mạnh thật sự.
- `build.zig` churn mạnh ở 0.17; pin compiler.
- Package manager vẫn là `build.zig.zon` + `zig fetch`; không có PM độc lập.
- Debug: DWARF mới, linker mới còn thiếu DWARF của Zig → dùng LLD cho release.
- Chưa có case study công khai về relay WebSocket Zig quy mô lớn (chưa kiểm chứng).

### 3.8 Ước lượng cho relay

Giả định 1 dev, đã quen Zig:

| Hạng mục | Thời gian |
|---|---|
| Khung server + accept loop + TLS sau Caddy | 3–5 ngày |
| Auth device (Ed25519), pairing, SQLite | 5–8 ngày |
| Routing + presence + giới hạn tài nguyên | 5–8 ngày |
| Resume/backpressure/heartbeat + test tải | 5–10 ngày |
| Vận hành (systemd, log, metric, nâng cấp) | 3–5 ngày |
| **Tổng MVP** | **3–5 tuần** |

Nếu đang học Zig: nhân 2–3. Rủi ro lớn nhất không phải code mà là **nâng cấp compiler 6 tháng/lần**.

---

## 4. SvelteKit: hiện trạng tháng 11/2026

### 4.1 Phiên bản

| Package | Bản | Ngày |
|---|---|---|
| `svelte` | 5.57.3 | 2026-10-26 |
| `@sveltejs/kit` | **3.1.1** | 2026-10-29 |
| `@sveltejs/adapter-static` | 4.0.1 | 2026-10-29 |
| `@vite-pwa/sveltekit` | 2.0.1 | 2026-11-07 |

**SvelteKit 3 đã ra (2026-10-01)**, không còn là "sắp". Breaking changes ảnh hưởng trực tiếp:

- Bỏ `svelte.config.js` — config vào `sveltekit({...})` trong `vite.config.js`.
- `$lib` → `#lib` (khai báo trong `package.json#imports`).
- `$app/stores` → `$app/state`; `$app/environment` → `$app/env`; bỏ `$service-worker`.
- Yêu cầu Node ≥ 22.17, Vite ≥ 8, TypeScript 6.

Có migration chính thức (`sv migrate sveltekit-3`), nhưng hệ sinh thái plugin PWA vừa bị viết lại (`@vite-pwa/sveltekit` 2.0.0 → `@unplugin-pwa/*`, mới vài ngày) — rủi ro thật nếu chọn PWA ngay.

### 4.2 SPA với adapter-static

- `fallback: '200.html'`, **không dùng `index.html`** (xung đột với trang chủ prerender).
- `ssr = false`; không được có `+page.server.js`, `+layout.server.js`, `+server.js`, form actions, `hooks.server.js`.
- Fallback phát asset path tuyệt đối kể cả khi `paths.relative`.
- Caddy phải trả fallback cho mọi path không phải asset: `try_files {path} /200.html`.
- Cache: `/_app/immutable/*` immutable 1 năm; `200.html` + `sw.js` no-cache.

### 4.3 PWA và vòng đời mobile

- Service worker **không thấy WebSocket** — không thể proxy/giữ socket. Khi app bị background, iOS/Android giết socket **không có sự kiện `close` đáng tin**.
- Cách đúng: coi `pagehide`/`freeze` là "đã chết"; khi `pageshow`/`visibilitychange → visible` thì probe ngay + resume bằng `lastSeq`.
- Push: iOS vẫn **bắt buộc add to Home Screen**, cần `userVisibleOnly: true`; không có silent push. Declarative Web Push có từ iOS 18.4.
- Kết luận: muốn "có tin nhắn mới khi app đóng" thì phải có **push server** — thêm một hệ thống nữa, không nằm trong bản nháp.

### 4.4 WebSocket trong SPA

- Một socket duy nhất, multiplex bằng `id`; `Map<id, {resolve, reject, timer}>`.
- Auth: **cookie HttpOnly/SameSite=Lax cùng origin** là tốt nhất (Caddy proxy `/ws`). Cross-origin thì trình duyệt không cho set header — phải dùng **ticket ngắn hạn (30–60 giây) qua `Sec-WebSocket-Protocol`**, không nhét token vào query string (lộ access log, Referer, history).
- Luôn kiểm `Origin` phía server; CORS không áp dụng cho WS.
- Heartbeat 25–30 giây; backoff full-jitter 1→30 giây; reset khi mở thành công.

### 4.5 Caddy

```caddyfile
chat.example.com {
    encode zstd gzip
    handle /ws* {
        reverse_proxy 127.0.0.1:8080 {
            stream_close_delay 5m
        }
    }
    handle {
        root * /srv/chat
        try_files {path} /200.html
        @immutable path /_app/immutable/*
        header @immutable Cache-Control "public, max-age=31536000, immutable"
        header /200.html Cache-Control "no-cache"
        file_server
    }
}
```

- `reverse_proxy` tự xử lý WebSocket upgrade, không cần cấu hình header.
- Mặc định Caddy **đóng WS khi reload config**; `stream_close_delay` tránh bão reconnect.
- `encode` không phá SSE/WS.
- Đặt `/ws` trong `handle` riêng để fallback SPA không nuốt mất.

### 4.6 Chi phí thật của một client SvelteKit

Danh sách tối thiểu để ngang một phần UI DSH:

1. Session list + tạo/đổi tên/lưu trữ.
2. Chat streaming (markdown, code block, scroll anchoring).
3. Tool call cards (bash/read/edit/search), diff view.
4. Approval dialog + câu hỏi + plan review.
5. Model picker, reasoning effort, permission preset.
6. Attachment/ảnh, cancel, queue.
7. Reconnect banner + resume + offline cache.
8. PWA install + push (nếu cần).

Ước lượng: **4–8 tuần** cho một UI "đủ dùng", chưa tính thời gian học đặc thù event của DSH.

---

## 5. Bảo mật

### 5.1 Mô hình mối đe doạ

| Thành phần | Thấy được gì | Ghi chú |
|---|---|---|
| Người dùng web hợp lệ | Toàn bộ chat + tool call + kết quả lệnh | Đúng thiết kế |
| Operator VPS/relay | Metadata + **plaintext** nếu TLS terminate ở Caddy | Muốn chống: E2E |
| Kẻ tấn công mạng | Nội dung nếu không TLS; token nếu URL lộ | Bắt buộc WSS |
| Điện thoại bị mất | Cookie/token → toàn quyền | Cần revoke + PIN |
| Web origin độc hại | CSRF/WS hijack nếu thiếu Origin fence | Kiểm Origin + SameSite |
| Prompt injection từ file/web | Agent tự chạy lệnh | Approval là hàng rào cuối |

Điểm cần nói thẳng: **relay thấy plaintext** nếu không E2E. Với một hệ có quyền chạy lệnh và sửa source trên máy người dùng, đây là quyết định phải chốt trước khi viết code.

### 5.2 Pairing đề xuất

1. Plugin sinh **Ed25519 keypair** lần đầu; private key lưu trong `%USERPROFILE%\.dsh\personal-hub\web-remote\device.key` (quyền 600).
2. Plugin hiển thị **mã 8 ký tự** + fingerprint trong DSH UI; mã TTL 5 phút, one-time.
3. Web nhập mã → relay xác thực mã, nhận device public key, bind vào account.
4. Relay phát **device-scoped token** cho web (không phải token của device).
5. Mọi message device→relay ký bằng private key + `nonce` + `ts` (chống replay).
6. Thu hồi: xoá binding ở relay + rotate key ở plugin; web mất quyền ngay.

Chống brute-force: mã 8 ký tự ~ 40 bit nếu base32; giới hạn 5 lần/phút/IP + 20 lần/giờ/account; mã gắn với device cụ thể.

> Chi tiết đầy đủ (hai luồng ghép cặp, API, schema SQLite, token, rate limit, UX): [Đặc tả v1 — Ghép cặp & xác thực](dac-ta-v1-pairing-va-xac-thuc.md).

### 5.3 E2E (tuỳ chọn, Phase 4)

- Dùng **SPAKE2/PAKE** với mã pairing làm pre-shared key → hai bên derive khoá phiên, relay không biết khoá.
- Sau đó mã hoá từng frame bằng AEAD (XChaCha20-Poly1305), nonce tăng dần.
- Relay chỉ thấy `streamId`, kích thước, thời điểm.
- Chi phí: +2–3 tuần, thêm phức tạp cho multi-device (mỗi thiết bị một khoá), và **không bảo vệ metadata**.

Khuyến nghị: **không làm E2E ở MVP**. TLS + relay không log payload là đủ cho giai đoạn đầu; ghi rõ giới hạn trong tài liệu.

### 5.4 Approval và prompt injection

- Web **phải render tool call + args** trước khi hỏi duyệt; approval chỉ có `callId`, args nằm trong event đã stream.
- Answer phải bind `(approvalId, sessionId, callId)`; sai bind → `unavailable`.
- Timeout (ví dụ 5 phút) → `unavailable` (fail-closed), không auto-allow.
- Rate limit prompt: 1 prompt/2 giây/session, 20 prompt/phút/device.
- Không bao giờ tự bật `approval policy = never` để "cho tiện".

### 5.5 Log

- Relay: chỉ log metadata (deviceId, streamId, byte count, error code). **Không log payload, prompt, tool result.**
- Caddy: tắt hoặc redact query string (token/ticket).
- Plugin: không ghi nội dung chat ra file; chỉ trạng thái kết nối.

---

## 6. Lộ trình đề xuất

### Phase 0 — Kiểm chứng nhu cầu (1–2 ngày)

Chạy `dsh --profile web --host <tailscale-ip> --tls-cert ... --tls-key ...` hoặc Cloudflare Tunnel, mở trên điện thoại, dùng thử 1 ngày. Trả lời: UI DSH có đủ dùng không? Nếu có → dừng, chỉ cần D (tunnel) hoặc A.

### Phase 1 — Bridge plugin (1–2 tuần)

- Tất cả nằm trong **monorepo này** (`plugin/`, `protocol/`), xem [ADR-001](adr-001-repo-layout.md).
- Thêm `features/web-remote.js`, `lib/remote-protocol.js`, `lib/remote-transport.js`.
- Dùng `follow()` thay vì `ctx.on('session/event')`; feature-detect `follow`/`page`/`wait`.
- Protocol v2 (mục 2.3), chạy với relay giả lập bằng Node để test trước.
- Approval: đăng ký waterfall answerer, forward request, chờ answer có timeout.
- Test: prompt/cancel/list/follow/reconnect/approval.

### Phase 2 — Zig relay (3–5 tuần)

- Zig 0.17.1 pinned + `websocket.zig` + Caddy TLS + SQLite WAL.
- Auth device (Ed25519), pairing, presence, routing, giới hạn tài nguyên.
- Load test: 1 000 connection idle + 50 stream đồng thời; đo RSS, CPU, reconnect storm.

### Phase 3 — SvelteKit (4–8 tuần)

- Kit 3.1.1 + adapter-static + fallback `200.html`.
- Một socket, protocol v2, resume bằng `lastSeq`.
- UI: list, chat, tool call, approval, question, model picker.
- PWA: chỉ app shell + cache asset; **không** cache API.

### Phase 4 — Production

- E2E (nếu chốt), push notification, multi-device, audit, rate limit, metric, backup SQLite.

### Tổng

| | Thời gian | Ghi chú |
|---|---|---|
| A (dùng ngay) | 0–1 ngày | Rủi ro thấp nhất |
| B (client plugin) | 2–4 tuần | Giữ approval, không cần Zig |
| C (đề xuất) | 8–16 tuần | Cần 1 dev full-time; +50% nếu học Zig |
| D (Zig tunnel) | 3–7 ngày | Chỉ nên làm nếu thích sở hữu hạ tầng |

---

## 7. Quyết định cần chốt

1. **Mục tiêu**: dùng cá nhân, hay sản phẩm cho nhiều người/nhiều máy?
2. **Quyền riêng tư**: chấp nhận VPS đọc plaintext, hay bắt buộc E2E ngay từ đầu?
3. **Desktop app hay `dsh web`**: có sẵn sàng chạy thêm tiến trình `dsh web` (cùng profile) không?
4. **UI mobile riêng**: có thật sự cần, hay UI DSH responsive là đủ?
5. **Ai vận hành relay**: bạn tự quản VPS, hay thuê/managed?

Nếu (1) = cá nhân, (2) = không E2E, (3) = có thể, (4) = chưa chắc → **làm Phase 0 trước, đừng viết Zig**.
Nếu (1) = sản phẩm, (2) = E2E, (4) = cần UI riêng → đi C, nhưng theo protocol v2 và bám `follow()`.

---

## 8. Những điểm chưa kiểm chứng

- UI DSH Web trên điện thoại thực tế thoải mái đến đâu (chưa chạy thử trên thiết bị thật).
- Hai tiến trình DSH cùng `DSH_HOME` (desktop app + `dsh web`) có xung đột lock/JSONL không.
- Desktop profile có nhận `trustedHosts`/`tls` qua `cordis.patch.yml` để phục vụ tunnel không.
- Số liệu hiệu năng relay Zig ở quy mô 1 000+ connection (chưa có benchmark công khai).
- `@vite-pwa/sveltekit` 2.0.x vừa viết lại; độ ổn định thực tế chưa kiểm chứng.

---

## 9. Nguồn

**Mã nguồn DSH trên máy** (checkout `C:\space\doct\deepseek-harness`, bản 0.2.1-alpha.2):

- `packages/api/session-controller/src/index.ts` — Remote service, `follow`, `page`, `control`, `prompt`, `cancel`.
- `packages/api/session-controller/src/types.ts` — frame types, `seq`, `surfaceOp`, `SessionFollowFrame`.
- `packages/api/gateway/README.md` — mux `/api/remote.mux`, heartbeat, backpressure, reconnect.
- `docs/subsystems/web-server.md`, `docs/user/guide/public-deployments.md` — auth, TLS, proxy, `--trusted-host`.
- `packages/bundle/web-app/README.md` — token URL, TLS, public deployment.
- `docs/subsystems/approval.md`, `docs/subsystems/user-questions.md`, `packages/client/ui-approval/src/client/index.ts` — waterfall, fail-closed.
- `apps/desktop-host/src/index.ts:30` — desktop hardcode `127.0.0.1`.
- `plugin/features/telegram-remote.js`, `plugin/README.md` — cách plugin hiện tại dùng `wait`/`events`, giới hạn approval.

**Web:**

- Zig downloads & versions: https://ziglang.org/download/
- Zig 0.17.0 release notes: https://ziglang.org/download/0.17.0/release-notes.html
- `std.http.Server` tại tag 0.17.1: https://codeberg.org/ziglang/zig/raw/tag/0.17.1/lib/std/http/Server.zig
- `std.crypto.tls` (chỉ có Client): https://codeberg.org/api/v1/repos/ziglang/zig/contents/lib/std/crypto/tls?ref=0.17.1
- `websocket.zig`: https://github.com/karlseguin/websocket.zig
- `http.zig`: https://github.com/karlseguin/http.zig
- `zqlite`: https://github.com/karlseguin/zqlite.zig
- `zap` (archived): https://github.com/zigzap/zap
- SvelteKit 3: https://svelte.dev/blog/sveltekit-3-is-here ; migration: https://svelte.dev/docs/kit/migrating-to-sveltekit-3
- `adapter-static`: https://svelte.dev/docs/kit/adapter-static
- SPA: https://svelte.dev/docs/kit/single-page-apps
- `@vite-pwa/sveltekit`: https://github.com/vite-pwa/sveltekit/releases/tag/v2.0.0
- Declarative Web Push (WebKit): https://webkit.org/blog/16535/meet-declarative-web-push/
- Caddy `reverse_proxy`: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy `try_files`: https://caddyserver.com/docs/caddyfile/directives/try_files
