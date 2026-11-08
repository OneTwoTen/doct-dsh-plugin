# ADR-001 — Bố trí repo cho Web Remote

**Trạng thái:** đã chấp nhận (2026-11-08)  
**Ngày:** 2026-11-08  
**Liên quan:** [Nghiên cứu kiến trúc](nghien-cuu-remote-webchat.md), [Đặc tả v1](dac-ta-v1-pairing-va-xac-thuc.md)

---

## 1. Bối cảnh

Hệ thống gồm ba artifact với ba toolchain khác nhau:

| Artifact | Toolchain | Nhịp phát hành | Ai dùng |
|---|---|---|---|
| `plugin/` (bridge Web Remote) | Node ESM, không dependency, `node --test` | Theo bản DSH (API drift) | Cá nhân, cài vào profile DSH |
| `web/` (SvelteKit SPA) | pnpm + Vite + Kit 3 | Độc lập, deploy tĩnh | Điện thoại/desktop |
| `server/` (Zig relay) | Zig 0.17.1 + Caddy | Độc lập, deploy binary | VPS |

Điểm ràng buộc chung duy nhất là **protocol** (`protocol/`): schema, frame, mã lỗi, fixture. Trong 2–3 tháng tới protocol sẽ còn đổi liên tục.

## 2. Quyết định

**Giai đoạn 1–3 dùng monorepo** trên chính repo này; **tách ra khi protocol đã đóng băng** (điều kiện ở mục 6).

Lý do:

1. **Protocol đang churn.** Mỗi lần đổi frame phải sửa cả ba nơi; monorepo cho phép một commit/PR đi xuyên suốt, không lệch phiên bản.
2. **Cần test xuyên thành phần.** Fixture chung + e2e (plugin ↔ relay ↔ web) chỉ thực sự chạy được khi ba phần nằm cạnh nhau.
3. **Một người làm.** Chi phí vận hành hai repo (CI, version, submodule/package registry) lớn hơn lợi ích.
4. **Plugin vẫn sạch.** `plugin/` giữ nguyên zero-dependency; thêm thư mục khác không ảnh hưởng gói cài (`files` whitelist).

## 3. Cấu trúc đề xuất

```
doct-dsh-plugin/                 # repo root (không publish)
├── plugin/                      # giữ nguyên: @local/personal-hub
│   ├── src/index.ts
│   ├── src/features/telegram-remote.ts
│   ├── src/features/web-remote.ts        # mới
│   ├── src/lib/remote-protocol.ts        # mới (adapter sang protocol/)
│   ├── dist/                             # build: index.js + client.js
│   └── scripts/build.mjs
├── protocol/                    # nguồn sự thật duy nhất
│   ├── schema/*.json            # JSON Schema cho frame/API
│   ├── fixtures/*.json          # golden message dùng cho cả 3 test suite
│   └── package.json             # private, sinh TS types
├── web/                         # SvelteKit SPA (pnpm workspace)
│   ├── src/
│   └── package.json
├── server/                      # Zig relay
│   ├── build.zig
│   ├── src/
│   └── build.zig.zon
├── deploy/                      # mẫu, KHÔNG chứa secret
│   ├── Caddyfile
│   └── systemd/dsh-relay.service
├── docs/                        # nghiên cứu, đặc tả, ADR
├── tools/                       # giữ nguyên
├── pnpm-workspace.yaml
└── .github/workflows/{plugin,web,server}.yml
```

Quy ước:

- **`plugin/` không nằm trong pnpm workspace.** Nó không có dependency runtime (chỉ devDependencies cho TypeScript/esbuild); thêm vào workspace chỉ tạo `node_modules` thừa và làm bẩn gói cài. Test chạy bằng `node --test` trên TypeScript như hiện tại.
- **`protocol/` là nguồn duy nhất.** TS types sinh từ schema; Zig dùng validator viết tay + fixture; plugin import schema/fixture khi test.
- **`deploy/` chỉ chứa mẫu.** Token, `sk_live_...`, certificate thật nằm ngoài repo (systemd credential / file 0600).
- **Tag theo artifact:** `plugin-v0.5.0`, `web-v0.1.0`, `server-v0.1.0`; không ép một version chung.

## 4. CI

- `plugin.yml`: Node 24 (DSH yêu cầu `>=24.9.0`), `node --test`, chỉ chạy khi `plugin/**` đổi.
- `web.yml`: Node 24 + pnpm, `svelte-check` + `vite build`, chỉ khi `web/**` hoặc `protocol/**` đổi.
- `server.yml`: Zig 0.17.1 pinned, `zig build test`, `-Dtarget=x86_64-linux-musl`, chỉ khi `server/**` đổi.
- `protocol.yml`: validate schema + fixture, chạy khi `protocol/**` đổi; là job bắt buộc cho hai job còn lại.

## 5. Hệ quả

**Được:**

- Đổi protocol một lần, sửa cả ba nơi trong một PR.
- Fixture chung, e2e thật, không lệch "web hiểu A, plugin hiểu B".
- Một chỗ cho docs/ADR; onboarding đơn giản.

**Mất:**

- CI đa ngôn ngữ (Zig + Node) nặng hơn; phải path-filter.
- Repo to hơn; checkout chậm hơn không đáng kể.
- Nếu repo plugin được chia sẻ công khai, code relay cũng công khai theo — chỉ là vấn đề nếu muốn giấu hạ tầng.

## 6. Khi nào tách

Tách `server/` + `web/` + `protocol/` sang repo `dsh-remote` khi **một trong** các điều kiện sau đúng:

1. Protocol v1 đã đóng băng ≥ 2 tuần, không còn commit đổi frame.
2. Relay đã chạy production ổn định ≥ 1 tháng.
3. Plugin được publish cho người khác dùng (npm hoặc bundle public).
4. Có consumer thứ hai (TUI, client khác) cần protocol nhưng không cần web.
5. CI monorepo vượt ~10 phút hoặc bắt đầu block nhau.

Cơ chế tách: `git filter-repo --path web --path server --path protocol` (giữ history), rồi publish `protocol` thành package private hoặc vendor bằng `git subtree`. Không dùng submodule.

## 7. Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| Tách ngay từ đầu (như bản nháp ban đầu) | Protocol còn đổi; mỗi thay đổi thành 2 PR + bump version + sync thủ công |
| Submodule `protocol` | Cập nhật thủ công, dễ lệch, khó CI |
| Publish `protocol` lên npm private ngay | Thêm auth/registry, chậm vòng lặp khi protocol chưa ổn định |
| Monorepo mãi mãi | Nhịp release khác nhau, CI phình, khó phân quyền khi có người thứ hai |

## 8. Việc cần làm ngay

- [x] `protocol/` với schema, fixture và đặc tả v1.
- [x] `plugin/src/features/web-remote.ts` + `plugin/src/lib/remote-*.ts` (Phase 1 bridge).
- [x] Thẻ Web Remote trong hàng plugin (`src/client/web-remote.tsx` + `src/features/web-remote-routes.ts`):
      trạng thái, mã ghép cặp, huỷ/ghép lại, ngắt ghép nối, sửa relay/tên thiết bị.
- [x] `tools/dev-relay/` — relay Node + WebChat tối giản để thử end-to-end (không phải `server/`).
- [ ] Tạo `pnpm-workspace.yaml` chỉ gồm `web`, `protocol` (khi scaffold web).
- [ ] Thêm `server/`, `web/` vào `.gitignore` cho artifact build (`zig-out/`, `.zig-cache/`, `web/build/`, `web/.svelte-kit/`).
- [ ] Relay Zig (Phase 2), web SvelteKit (Phase 3).
- [ ] Thêm ba workflow path-filter.
- [ ] Ghi quy ước tag vào README.

