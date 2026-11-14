# doct-dsh-plugin

Plugin cá nhân cho **DeepSeek Harness**: một bundle, nhiều tính năng.

- **Telegram** — điều khiển DSH từ xa: tin nhắn trong chat đã ghép nối trở thành prompt cho một
  phiên, câu trả lời được gửi ngược về chat.
- **Git** — bảng Git ở thanh bên phải theo mô hình T3 Code: một nút thao tác thông minh (commit,
  push, pull, tạo PR, publish), hộp commit chọn tệp với thông điệp do model viết, diff xếp chồng có
  stage/unstage/huỷ thay đổi từng tệp, đổi nhánh, lịch sử commit, pull request kèm trạng thái kiểm tra/
  đánh giá và **gộp PR (merge/squash/rebase)** ngay trong panel, và issue. Dải tab hiện số thật.
- **Quản lý worktree** — tab Worktree trong bảng Git: liệt kê mọi checkout, tạo worktree mới, chuyển
  chat sang checkout, mở chat trong checkout, xoá và dọn đăng ký mồ côi.
- **Pull request bằng AI** — một bước trong chuỗi thao tác: model hiện tại của phiên (effort thấp nhất)
  viết tiêu đề/mô tả, bạn **xem và sửa trong hộp thoại** (hoặc bấm Viết lại) rồi mới đẩy nhánh và mở PR.
  Mô tả mơ hồ được hỏi lại một lần; ngôn ngữ bám theo UI (vi/en).
- **Worktree cho phiên mới** — chọn ở màn hình New Session: worktree riêng, bắt đầu từ nhánh local
  hoặc nhánh remote đã fetch.
- **Dọn dẹp sau khi gộp** — tùy chọn trong cấu hình: PR của phiên được gộp thì xoá worktree, ẩn phiên.
- **Web Remote** — điều khiển DSH từ điện thoại qua WebChat: plugin nối ra ngoài tới relay, không
  mở port trên máy. Phase 1 (bridge Host + giao thức v1 + thẻ cấu hình/ghép cặp trong DSH) và dev
  relay đã có; relay Zig và web client đang triển khai.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| [`plugin/`](plugin/) | Package cài được: `@local/personal-hub` (Host + Client + bundle patch + locale + icon + test); mã TypeScript trong `src/`, sản phẩm build trong `dist/` |
| [`protocol/`](protocol/) | Giao thức Web Remote v1: schema, fixture dùng chung, đặc tả frame/thao tác/lỗi |
| [`tools/`](tools/) | Hai script đọc thông tin nội bộ của DSH, và **dev relay** Web Remote (`tools/dev-relay/`) |
| [`docs/`](docs/) | Nghiên cứu kiến trúc, đặc tả ghép cặp/xác thực, ADR bố trí repo |
| `web/`, `server/`, `deploy/` | Kế hoạch Web Remote (chưa scaffold) — xem [ADR-001](docs/adr-001-repo-layout.md) |

`plugin/` là thư mục cài đặt; `tools/` và `docs/` không nằm trong package.

## Web Remote

Mục tiêu: điều khiển DSH từ điện thoại qua WebChat, không mở port trên máy cá nhân.

- Kiến trúc và so sánh phương án: [`docs/nghien-cuu-remote-webchat.md`](docs/nghien-cuu-remote-webchat.md)
- Ghép cặp thiết bị, Clerk, API, schema: [`docs/dac-ta-v1-pairing-va-xac-thuc.md`](docs/dac-ta-v1-pairing-va-xac-thuc.md)
- Bố trí repo (monorepo giai đoạn đầu): [`docs/adr-001-repo-layout.md`](docs/adr-001-repo-layout.md)
- Giao thức v1: [`protocol/README.md`](protocol/README.md)

| Hạng mục | Trạng thái |
|---|---|
| Bridge Host (`src/features/web-remote.ts`) | đã có: identity Ed25519, pairing luồng B, transport WS, 9 thao tác phiên, 2 stream, approval/question |
| Thẻ Web Remote (`src/client/web-remote.tsx`) | đã có: trạng thái, mã ghép cặp kèm đếm ngược, ghép cặp lại, ngắt ghép nối, sửa relay/tên thiết bị |
| Giao thức v1 + fixture | đã có: schema, golden frame, test codec |
| Relay phát triển (Node) | đã có trong [`tools/dev-relay/`](tools/dev-relay/) — chạy thử end-to-end, không dùng production |
| Relay (Zig) | chưa có — Phase 2 |
| Web client (SvelteKit) | chưa có — Phase 3; dev relay có WebChat tối giản để thử |

Cấu hình, trạng thái và giới hạn: [`plugin/README.md#7-web-remote-phase-1--bridge`](plugin/README.md#7-web-remote-phase-1--bridge).

### Chạy thử nhanh

```powershell
# 1. Relay + WebChat (in ra URL có token)
node tools/dev-relay/index.mjs --port 8787

# 2. Plugins → hàng personal-hub → thẻ Web Remote: tick "Bật Web Remote",
#    nhập relayUrl 'http://127.0.0.1:8787' rồi Lưu

# 3. Mã ghép cặp hiện ngay trong thẻ đó; bấm liên kết trang duyệt, nhập mã, bấm Duyệt
# 4. Mở link WebChat trên điện thoại (cùng LAN thì chạy relay với --host 0.0.0.0)
```

Chi tiết dev relay: [`tools/dev-relay/README.md`](tools/dev-relay/README.md).

## Cài đặt

Bundle được cài vào một profile của DSH bằng Plugin Manager với đường dẫn tuyệt đối tới `plugin/`.
Chạy `cd plugin && npm install && npm run build` trước, vì profile nạp `dist/index.js` và
`dist/client.js`.

```text
plugin_manager install_bundle  →  <đường dẫn tuyệt đối>/plugin
```

Cài xong, hàng `personal-hub` xuất hiện trong profile và các tính năng tự chạy
(Telegram ở trạng thái chờ token cho tới khi bạn cấu hình; bảng Git đọc kho mã của phiên đang mở;
Web Remote chờ `relayUrl`).

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
| Worktree | tab quản lý mọi checkout: danh sách kèm trạng thái, tạo worktree mới (tên + nhánh nền local/remote), chuyển chat sang checkout, mở chat trong checkout, xoá (kèm nhánh hoặc buộc xoá), dọn đăng ký mồ côi |
| Nhánh | danh sách tìm kiếm local + remote, đánh dấu nhánh hiện tại/mặc định, tạo nhánh mới bằng cách gõ tên |
| Pull request | lọc Đang mở / Đã gộp / Đã đóng / Tất cả; trạng thái kiểm tra, đánh giá; chi tiết có checks, reviews, tệp, bình luận; **gộp PR** kiểu Merge / Squash / Rebase kèm tuỳ chọn xoá nhánh nguồn |
| Issue | lọc Đang mở / Đã đóng / Tất cả; chi tiết có nhãn, mô tả, bình luận |
| Commit | lịch sử gần nhất; bấm để xem mô tả, tệp và patch |

Ở **nhánh mặc định**, push và tạo PR hỏi xác nhận: tiếp tục trên nhánh mặc định, hoặc checkout nhánh
feature rồi chạy tiếp cùng thao tác. Kho chưa có remote thì nút chính là **Publish repository**.

Git chạy qua `subprocess` của DSH; PR/issue đọc qua **GitHub CLI** (`gh`) — hoặc `glab` cho GitLab —
nên dùng đúng phiên đăng nhập sẵn có. GitLab.com được nhận diện tự động; GitLab tự host chỉ cần thêm
hostname vào `git.gitlabHosts` (hoặc chọn GitLab trong thẻ cấu hình plugin). Không có `glab` thì GitLab
vẫn đọc được bằng REST khi có token `GITLAB_TOKEN`/`DSH_GITLAB_TOKEN`. GitHub không có CLI thì vẫn đọc
được bằng REST công khai (không có chi tiết checks). Cấu hình chi tiết ở
[`plugin/README.md`](plugin/README.md#6-bảng-git-thanh-bên-phải).

## Phát triển

Mã plugin là TypeScript trong `plugin/src/`; `plugin/dist/` là sản phẩm build mà DSH nạp.

```powershell
cd plugin
npm install        # lần đầu: typescript, esbuild, @types/node
npm run build      # dist/index.js + dist/client.js
npm run typecheck  # tsc cho src/ và test/
npm test           # build rồi chạy toàn bộ test (Node 24 strip types)
```

Test Web Remote đọc fixture trong `protocol/fixtures/` và dùng WebSocket giả, nên không cần relay
hay mạng thật. Khi đổi frame, sửa đồng thời `protocol/schema`, `protocol/fixtures` và
`plugin/src/lib/remote-protocol.ts` (xem [`protocol/README.md`](protocol/README.md)).

Thêm tính năng mới: tạo `plugin/src/features/<tên>.ts` export `mount(ctx, config, deps)` trả về hàm
dọn dẹp, thêm một mục vào `FEATURES` trong `plugin/src/index.ts` và khoá cấu hình tương ứng trong
`plugin/src/lib/config.ts`. Nhớ chạy `npm run build` trước khi cài lại bundle.

### `tools/`

Hai script chỉ dùng khi phát triển, cần đường dẫn tới `app.asar` của bản cài DSH:

- `asar-extract.mjs` — trích package trong `app.asar` ra thư mục để đọc mã và README.
- `schema.mjs` — in JSON Schema của một endpoint Remote trong `lib/typert.host.js`.

Và [`tools/dev-relay/`](tools/dev-relay/) — relay + WebChat tối giản để thử Web Remote:

```powershell
node tools/dev-relay/index.mjs --port 8787
cd tools/dev-relay; node --test
```

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
- Bảng Git giờ **đọc và ghi**: commit (chọn tệp), stage/unstage/huỷ thay đổi từng tệp, push, pull,
  đổi/tạo nhánh, tạo PR, gộp PR (merge/squash/rebase), publish; diff dừng sau 4000 dòng mỗi tệp.
  Chưa có amend, rebase tương tác hay stage từng hunk.
  PR/issue cần remote GitHub/GitLab; thiếu CLI thì GitHub vẫn xem được (không có chi tiết checks), còn
  GitLab cần `glab` hoặc token `GITLAB_TOKEN`/`DSH_GITLAB_TOKEN` để dùng REST. GitLab tự host phải khai
  báo host trong `git.gitlabHosts`. GitLab không hỗ trợ rebase-merge nên nút đó không hiện.
- Web Remote mới có bridge Host, giao thức, và thẻ cấu hình/ghép cặp trong DSH UI: chưa có relay
  Zig hay web client SvelteKit (dev relay có WebChat tối giản); chỉ nhận prompt văn bản và chưa có
  E2E (relay thấy plaintext — cần TLS và relay tự quản).

## Giấy phép

MIT — xem [LICENSE](LICENSE).
