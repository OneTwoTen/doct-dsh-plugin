# SQLite (vendored)

Bản C amalgamation của SQLite, commit vào repo để `zig build` không cần mạng và
mọi máy build ra cùng một kết quả.

| | |
|---|---|
| Phiên bản | 3.54.1 (amalgamation `3540100`) |
| Nguồn | <https://www.sqlite.org/2026/sqlite-amalgamation-3540100.zip> |
| `sqlite3.c` SHA-256 | `0c657666d819f261cc4007526ad57e1669de9949df7a8ea847aa284a2bf0ee52` |
| Giấy phép | Public domain (<https://www.sqlite.org/copyright.html>) |

`build.zig` chạy `translate-c` trên `sqlite3.h` và biên dịch `sqlite3.c` với:

- `SQLITE_THREADSAFE=1` — relay dùng một kết nối chung cho nhiều thread;
- `SQLITE_OMIT_LOAD_EXTENSION` — không nạp extension;
- `SQLITE_DQS=0` — không chấp nhận chuỗi trong dấu nháy kép;
- `SQLITE_DEFAULT_FOREIGN_KEYS=1` — bật khoá ngoại mặc định.

Nâng cấp: tải amalgamation mới, thay hai tệp, cập nhật bảng trên, chạy lại
`zig build test`.
