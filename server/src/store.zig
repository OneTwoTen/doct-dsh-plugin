//! Thin, opinionated wrapper over the vendored SQLite C API.
//!
//! One connection is shared by every thread (`SQLITE_OPEN_FULLMUTEX`); callers
//! take `store.lock(io)` around multi-statement work so a pairing decision and
//! its token issuance stay atomic. Strings returned from a statement are only
//! valid until the next `step`/`reset`, so the repository copies what it keeps.

const std = @import("std");
const sqlite = @import("sqlite");
const schema = @import("schema.zig");

const c = sqlite;

pub const Destructor = ?*const fn (?*anyopaque) callconv(.c) void;

/// `SQLITE_TRANSIENT`: SQLite copies the bound text before returning.
fn transientDestructor() Destructor {
    return @ptrFromInt(std.math.maxInt(usize));
}

/// Hands out a null-terminated copy of `sql` for the C API.
fn cstr(buf: []u8, sql: []const u8) ![*c]const u8 {
    if (sql.len + 1 > buf.len) return error.SqlTooLong;
    @memcpy(buf[0..sql.len], sql);
    buf[sql.len] = 0;
    return @ptrCast(buf.ptr);
}

pub const Store = struct {
    db: *c.sqlite3,
    mutex: std.Io.Mutex = .init,

    pub const OpenError = error{
        OpenFailed,
        NoMemory,
    };

    /// Open (or create) the database and apply the schema.
    pub fn open(alloc: std.mem.Allocator, path: []const u8) !Store {
        const path_z = try alloc.dupeSentinel(u8, path, 0);
        defer alloc.free(path_z);

        var db: ?*c.sqlite3 = null;
        const flags = c.SQLITE_OPEN_READWRITE | c.SQLITE_OPEN_CREATE | c.SQLITE_OPEN_FULLMUTEX;
        if (c.sqlite3_open_v2(path_z.ptr, &db, flags, null) != c.SQLITE_OK) {
            if (db) |handle| _ = c.sqlite3_close(handle);
            return error.OpenFailed;
        }

        var store = Store{ .db = db.? };
        errdefer store.close();
        try store.exec("PRAGMA journal_mode=WAL");
        try store.exec("PRAGMA synchronous=NORMAL");
        try store.exec("PRAGMA busy_timeout=5000");
        try store.exec("PRAGMA foreign_keys=ON");
        try store.exec(schema.ddl);
        return store;
    }

    pub fn close(self: *Store) void {
        _ = c.sqlite3_close_v2(self.db);
        self.db = undefined;
    }

    pub fn lock(self: *Store, io: std.Io) void {
        self.mutex.lockUncancelable(io);
    }

    pub fn unlock(self: *Store, io: std.Io) void {
        self.mutex.unlock(io);
    }

    pub fn lastError(self: *const Store) []const u8 {
        const msg = c.sqlite3_errmsg(self.db);
        if (msg == null) return "unknown sqlite error";
        return std.mem.span(msg);
    }

    /// Run one or more statements with no parameters.
    pub fn exec(self: *Store, sql: []const u8) !void {
        var buf: [8192]u8 = undefined;
        const text = try cstr(&buf, sql);
        var err: [*c]u8 = null;
        const rc = c.sqlite3_exec(self.db, text, null, null, &err);
        if (err != null) c.sqlite3_free(err);
        if (rc != c.SQLITE_OK) return error.ExecFailed;
    }

    pub fn prepare(self: *Store, sql: []const u8) !Stmt {
        var buf: [4096]u8 = undefined;
        const text = try cstr(&buf, sql);
        var handle: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db, text, -1, &handle, null) != c.SQLITE_OK) {
            return error.PrepareFailed;
        }
        return .{ .handle = handle.? };
    }

    // ------------------------------------------------------------- meta ----

    /// Read a `meta` row into `out`, returning the written slice.
    pub fn metaGet(self: *Store, key: []const u8, out: []u8) !?[]const u8 {
        var stmt = try self.prepare("SELECT value FROM meta WHERE key = ?1");
        defer stmt.finalize();
        try stmt.bindText(1, key);
        if (!try stmt.step()) return null;
        const value = stmt.text(0) orelse return null;
        if (value.len > out.len) return error.BufferTooSmall;
        @memcpy(out[0..value.len], value);
        return out[0..value.len];
    }

    pub fn metaSet(self: *Store, key: []const u8, value: []const u8) !void {
        var stmt = try self.prepare(
            "INSERT INTO meta(key, value) VALUES(?1, ?2) " ++
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        );
        defer stmt.finalize();
        try stmt.bindText(1, key);
        try stmt.bindText(2, value);
        try stmt.done();
    }

    /// Read the token/code pepper, creating it on first run.
    pub fn pepper(self: *Store, io: std.Io, alloc: std.mem.Allocator) ![]const u8 {
        self.lock(io);
        defer self.unlock(io);

        var buf: [128]u8 = undefined;
        if (try self.metaGet("pepper", &buf)) |existing| {
            return alloc.dupe(u8, existing);
        }
        const ids = @import("ids.zig");
        const fresh = try ids.token(alloc, io, "pp_");
        try self.metaSet("pepper", fresh);
        return fresh;
    }
};

pub const Stmt = struct {
    handle: *c.sqlite3_stmt,

    pub fn finalize(self: *Stmt) void {
        _ = c.sqlite3_finalize(self.handle);
        self.handle = undefined;
    }

    pub fn bindText(self: Stmt, index: c_int, value: []const u8) !void {
        if (c.sqlite3_bind_text(self.handle, index, @ptrCast(value.ptr), @intCast(value.len), transientDestructor()) != c.SQLITE_OK) {
            return error.BindFailed;
        }
    }

    pub fn bindInt(self: Stmt, index: c_int, value: i64) !void {
        if (c.sqlite3_bind_int64(self.handle, index, value) != c.SQLITE_OK) {
            return error.BindFailed;
        }
    }

    pub fn bindNull(self: Stmt, index: c_int) !void {
        if (c.sqlite3_bind_null(self.handle, index) != c.SQLITE_OK) {
            return error.BindFailed;
        }
    }

    /// True when a row is ready, false on `SQLITE_DONE`.
    pub fn step(self: *Stmt) !bool {
        return switch (c.sqlite3_step(self.handle)) {
            c.SQLITE_ROW => true,
            c.SQLITE_DONE => false,
            else => error.StepFailed,
        };
    }

    /// Run a statement that must not return rows.
    pub fn done(self: *Stmt) !void {
        if (try self.step()) return error.UnexpectedRow;
    }

    pub fn text(self: *const Stmt, column: c_int) ?[]const u8 {
        const ptr = c.sqlite3_column_text(self.handle, column);
        if (ptr == null) return null;
        const len: usize = @intCast(c.sqlite3_column_bytes(self.handle, column));
        return ptr[0..len];
    }

    pub fn int(self: *const Stmt, column: c_int) i64 {
        return c.sqlite3_column_int64(self.handle, column);
    }

    pub fn isNull(self: *const Stmt, column: c_int) bool {
        return c.sqlite3_column_type(self.handle, column) == c.SQLITE_NULL;
    }
};

test "the schema applies and meta round-trips" {
    var store = try Store.open(std.testing.allocator, ":memory:");
    defer store.close();

    try store.metaSet("schema_version", "1");
    var buf: [32]u8 = undefined;
    const value = try store.metaGet("schema_version", &buf);
    try std.testing.expectEqualStrings("1", value.?);

    // The tables the relay relies on all exist.
    var stmt = try store.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    defer stmt.finalize();
    var seen_devices = false;
    var seen_tokens = false;
    while (try stmt.step()) {
        const name = stmt.text(0) orelse continue;
        if (std.mem.eql(u8, name, "devices")) seen_devices = true;
        if (std.mem.eql(u8, name, "tokens")) seen_tokens = true;
    }
    try std.testing.expect(seen_devices and seen_tokens);
}
