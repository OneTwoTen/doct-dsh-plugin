# Tài liệu

Bộ tài liệu thiết kế cho Web Remote (điều khiển DSH từ xa qua WebChat).

| Tài liệu | Nội dung | Trạng thái |
|---|---|---|
| [Nghiên cứu kiến trúc](nghien-cuu-remote-webchat.md) | Đối chiếu DSH hiện có, đánh giá Zig 0.17.1 / SvelteKit 3, so sánh 4 phương án, protocol v2, lộ trình | hoàn tất |
| [Đặc tả v1 — Ghép cặp & xác thực](dac-ta-v1-pairing-va-xac-thuc.md) | Hai luồng pairing, Clerk, API `/v1`, schema SQLite, rate limit, UX, phụ lục code | draft |
| [ADR-001 — Bố trí repo](adr-001-repo-layout.md) | Monorepo giai đoạn đầu, cấu trúc thư mục, CI, điều kiện tách repo | đã chấp nhận |
| [`protocol/README.md`](../protocol/README.md) | Giao thức v1: frame, thao tác, mã lỗi, giới hạn, fixture | đã có (Phase 1) |

Triển khai hiện tại: bridge Host trong `plugin/src/features/web-remote.ts` + `plugin/src/lib/remote-*.ts`
theo Phase 1, thẻ **Web Remote** trong hàng plugin (`plugin/src/client/web-remote.tsx` +
`plugin/src/features/web-remote-routes.ts`) để xem mã ghép cặp và trạng thái, kèm **dev relay +
WebChat tối giản** trong `tools/dev-relay/` để chạy thử end-to-end. Relay Zig (Phase 2) và web
client SvelteKit (Phase 3) chưa viết. Trạng thái cấu hình/ghép cặp nằm trong
[`plugin/README.md`](../plugin/README.md#7-web-remote-phase-1--bridge).

## Thứ tự đọc

1. **Nghiên cứu** — để biết vì sao chọn kiến trúc này và những gì DSH đã có sẵn.
2. **Đặc tả v1** — hợp đồng dữ liệu và luồng ghép cặp để ba thành phần triển khai song song.
3. **ADR-001** — nơi đặt code và khi nào tách repo.

## Quy ước

- Đường dẫn `packages/...` trong tài liệu trỏ tới checkout DSH, không phải repo này.
- Số liệu phiên bản (Zig, SvelteKit, Clerk) được kiểm tra ngày 2026-11-08; cập nhật khi nâng cấp.
- Tài liệu bằng tiếng Việt; thuật ngữ kỹ thuật giữ nguyên tiếng Anh khi cần.

