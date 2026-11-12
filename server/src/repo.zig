//! Repository: every SQL statement the relay runs, behind small typed helpers.
//!
//! Callers own the lock: take `store.lock(io)` around a logical operation that
//! must be atomic (approve the pairing *and* read the device, issue the token
//! *and* mark the pairing consumed). Strings are allocated from `alloc`, which
//! is a request arena in the API layer and the process arena for the hub.

const std = @import("std");
const clock = @import("clock.zig");
const ids = @import("ids.zig");
const store_mod = @import("store.zig");

const Store = store_mod.Store;
const Stmt = store_mod.Stmt;

pub const DeviceStatus = enum { pending, active, revoked, expired };
pub const PairingStatus = enum { pending, approved, denied, expired, consumed };
pub const TokenKind = enum { access, refresh };

pub const Device = struct {
    id: []const u8,
    user_id: ?[]const u8,
    name: []const u8,
    platform: []const u8,
    pubkey: []const u8,
    scopes: []const u8,
    status: DeviceStatus,
    created_at: i64,
    approved_at: ?i64,
    last_seen_at: ?i64,
    revoked_at: ?i64,
};

pub const Pairing = struct {
    id: []const u8,
    user_id: ?[]const u8,
    device_id: []const u8,
    status: PairingStatus,
    attempts: u32,
    created_at: i64,
    expires_at: i64,
};

pub const Token = struct {
    id: []const u8,
    device_id: []const u8,
    kind: TokenKind,
    family_id: []const u8,
    expires_at: i64,
    revoked_at: ?i64 = null,
};

pub const WebSession = struct {
    id: []const u8,
    user_id: []const u8,
    expires_at: i64,
};

pub const NewDevice = struct {
    id: []const u8,
    name: []const u8,
    platform: []const u8,
    pubkey: []const u8,
    scopes: []const u8,
};

const device_columns =
    "id, user_id, name, platform, pubkey, scopes, status, created_at, approved_at, last_seen_at, revoked_at";

fn dupText(alloc: std.mem.Allocator, stmt: *const Stmt, column: c_int) ![]const u8 {
    return alloc.dupe(u8, stmt.text(column) orelse "");
}

fn dupOpt(alloc: std.mem.Allocator, stmt: *const Stmt, column: c_int) !?[]const u8 {
    if (stmt.isNull(column)) return null;
    return @as(?[]const u8, try alloc.dupe(u8, stmt.text(column) orelse ""));
}

fn optInt(stmt: *const Stmt, column: c_int) ?i64 {
    return if (stmt.isNull(column)) null else stmt.int(column);
}

fn deviceStatus(text: []const u8) !DeviceStatus {
    if (std.mem.eql(u8, text, "pending")) return .pending;
    if (std.mem.eql(u8, text, "active")) return .active;
    if (std.mem.eql(u8, text, "revoked")) return .revoked;
    if (std.mem.eql(u8, text, "expired")) return .expired;
    return error.UnknownStatus;
}

fn pairingStatus(text: []const u8) !PairingStatus {
    if (std.mem.eql(u8, text, "pending")) return .pending;
    if (std.mem.eql(u8, text, "approved")) return .approved;
    if (std.mem.eql(u8, text, "denied")) return .denied;
    if (std.mem.eql(u8, text, "expired")) return .expired;
    if (std.mem.eql(u8, text, "consumed")) return .consumed;
    return error.UnknownStatus;
}

fn tokenKind(text: []const u8) !TokenKind {
    if (std.mem.eql(u8, text, "access")) return .access;
    if (std.mem.eql(u8, text, "refresh")) return .refresh;
    return error.UnknownKind;
}

// ------------------------------------------------------------------ users --

pub fn ensureDevUser(store: *Store, io: std.Io, alloc: std.mem.Allocator) ![]const u8 {
    var find = try store.prepare("SELECT id FROM users WHERE clerk_user_id = 'dev:local'");
    defer find.finalize();
    if (try find.step()) return alloc.dupe(u8, find.text(0).?);

    const id = try ids.userId(alloc, io);
    var insert = try store.prepare(
        "INSERT INTO users(id, clerk_user_id, email, created_at) VALUES(?1, 'dev:local', NULL, ?2)",
    );
    defer insert.finalize();
    try insert.bindText(1, id);
    try insert.bindInt(2, clock.nowMs(io));
    try insert.done();
    return id;
}

pub fn upsertClerkUser(
    store: *Store,
    io: std.Io,
    alloc: std.mem.Allocator,
    clerk_user_id: []const u8,
    email: ?[]const u8,
) ![]const u8 {
    const fresh = try ids.userId(alloc, io);
    var stmt = try store.prepare(
        "INSERT INTO users(id, clerk_user_id, email, created_at) VALUES(?1, ?2, ?3, ?4) " ++
            "ON CONFLICT(clerk_user_id) DO UPDATE SET email = COALESCE(excluded.email, users.email) " ++
            "RETURNING id",
    );
    defer stmt.finalize();
    try stmt.bindText(1, fresh);
    try stmt.bindText(2, clerk_user_id);
    if (email) |value| {
        try stmt.bindText(3, value);
    } else {
        try stmt.bindNull(3);
    }
    try stmt.bindInt(4, clock.nowMs(io));
    if (!try stmt.step()) return error.UserMissing;
    return alloc.dupe(u8, stmt.text(0).?);
}

// ---------------------------------------------------------------- devices --

pub fn insertDevice(store: *Store, io: std.Io, new: NewDevice) !void {
    var stmt = try store.prepare(
        "INSERT INTO devices(id, user_id, name, platform, pubkey, scopes, status, created_at) " ++
            "VALUES(?1, NULL, ?2, ?3, ?4, ?5, 'pending', ?6)",
    );
    defer stmt.finalize();
    try stmt.bindText(1, new.id);
    try stmt.bindText(2, new.name);
    try stmt.bindText(3, new.platform);
    try stmt.bindText(4, new.pubkey);
    try stmt.bindText(5, new.scopes);
    try stmt.bindInt(6, clock.nowMs(io));
    try stmt.done();
}

/// Create a pending device, or reuse the row when it is not active yet (the
/// plugin derives the same device id from the same key, so a retry must work).
/// Returns false when the device is already paired.
pub fn upsertDevice(store: *Store, io: std.Io, new: NewDevice) !bool {
    var stmt = try store.prepare(
        "INSERT INTO devices(id, user_id, name, platform, pubkey, scopes, status, created_at) " ++
            "VALUES(?1, NULL, ?2, ?3, ?4, ?5, 'pending', ?6) " ++
            "ON CONFLICT(id) DO UPDATE SET name = excluded.name, platform = excluded.platform, " ++
            "pubkey = excluded.pubkey, scopes = excluded.scopes, status = 'pending', revoked_at = NULL " ++
            "WHERE devices.status <> 'active'",
    );
    defer stmt.finalize();
    try stmt.bindText(1, new.id);
    try stmt.bindText(2, new.name);
    try stmt.bindText(3, new.platform);
    try stmt.bindText(4, new.pubkey);
    try stmt.bindText(5, new.scopes);
    try stmt.bindInt(6, clock.nowMs(io));
    try stmt.done();
    return storeChanged(store) > 0;
}

pub fn deviceById(store: *Store, alloc: std.mem.Allocator, id: []const u8) !?Device {    var stmt = try store.prepare("SELECT " ++ device_columns ++ " FROM devices WHERE id = ?1");
    defer stmt.finalize();
    try stmt.bindText(1, id);
    if (!try stmt.step()) return null;
    return .{
        .id = try dupText(alloc, &stmt, 0),
        .user_id = try dupOpt(alloc, &stmt, 1),
        .name = try dupText(alloc, &stmt, 2),
        .platform = try dupText(alloc, &stmt, 3),
        .pubkey = try dupText(alloc, &stmt, 4),
        .scopes = try dupText(alloc, &stmt, 5),
        .status = try deviceStatus(stmt.text(6) orelse ""),
        .created_at = stmt.int(7),
        .approved_at = optInt(&stmt, 8),
        .last_seen_at = optInt(&stmt, 9),
        .revoked_at = optInt(&stmt, 10),
    };
}

pub fn devicesForUser(store: *Store, alloc: std.mem.Allocator, user_id: []const u8) ![]Device {
    var list: std.ArrayList(Device) = .empty;
    var stmt = try store.prepare(
        "SELECT " ++ device_columns ++ " FROM devices WHERE user_id = ?1 ORDER BY created_at DESC",
    );
    defer stmt.finalize();
    try stmt.bindText(1, user_id);
    while (try stmt.step()) {
        try list.append(alloc, .{
            .id = try dupText(alloc, &stmt, 0),
            .user_id = try dupOpt(alloc, &stmt, 1),
            .name = try dupText(alloc, &stmt, 2),
            .platform = try dupText(alloc, &stmt, 3),
            .pubkey = try dupText(alloc, &stmt, 4),
            .scopes = try dupText(alloc, &stmt, 5),
            .status = try deviceStatus(stmt.text(6) orelse ""),
            .created_at = stmt.int(7),
            .approved_at = optInt(&stmt, 8),
            .last_seen_at = optInt(&stmt, 9),
            .revoked_at = optInt(&stmt, 10),
        });
    }
    return list.toOwnedSlice(alloc);
}

/// Mark a device active and bind it to the approving account.
pub fn approveDevice(store: *Store, io: std.Io, device_id: []const u8, user_id: []const u8) !bool {
    var stmt = try store.prepare(
        "UPDATE devices SET user_id = ?1, status = 'active', approved_at = ?2, revoked_at = NULL " ++
            "WHERE id = ?3 AND status = 'pending'",
    );
    defer stmt.finalize();
    try stmt.bindText(1, user_id);
    try stmt.bindInt(2, clock.nowMs(io));
    try stmt.bindText(3, device_id);
    try stmt.done();
    return storeChanged(store) > 0;
}

pub fn setDeviceStatus(store: *Store, io: std.Io, device_id: []const u8, status: DeviceStatus) !bool {
    var stmt = try store.prepare(
        "UPDATE devices SET status = ?1, " ++
            "revoked_at = CASE WHEN ?1 = 'revoked' THEN ?2 ELSE revoked_at END WHERE id = ?3",
    );
    defer stmt.finalize();
    try stmt.bindText(1, @tagName(status));
    try stmt.bindInt(2, clock.nowMs(io));
    try stmt.bindText(3, device_id);
    try stmt.done();
    return storeChanged(store) > 0;
}

pub fn touchDevice(store: *Store, io: std.Io, device_id: []const u8) !void {
    var stmt = try store.prepare("UPDATE devices SET last_seen_at = ?1 WHERE id = ?2");
    defer stmt.finalize();
    try stmt.bindInt(1, clock.nowMs(io));
    try stmt.bindText(2, device_id);
    try stmt.done();
}

// --------------------------------------------------------------- pairings --

pub fn insertPairing(
    store: *Store,
    io: std.Io,
    alloc: std.mem.Allocator,
    device_id: []const u8,
    flow: []const u8,
    user_code_hash: []const u8,
    device_code_hash: []const u8,
    expires_at: i64,
) ![]const u8 {
    const id = try ids.pairingId(alloc, io);
    var stmt = try store.prepare(
        "INSERT INTO pairing_requests(id, user_id, device_id, flow, user_code_hash, device_code_hash, " ++
            "attempts, status, created_at, expires_at) VALUES(?1, NULL, ?2, ?3, ?4, ?5, 0, 'pending', ?6, ?7)",
    );
    defer stmt.finalize();
    try stmt.bindText(1, id);
    try stmt.bindText(2, device_id);
    try stmt.bindText(3, flow);
    try stmt.bindText(4, user_code_hash);
    try stmt.bindText(5, device_code_hash);
    try stmt.bindInt(6, clock.nowMs(io));
    try stmt.bindInt(7, expires_at);
    try stmt.done();
    return id;
}

fn readPairing(alloc: std.mem.Allocator, stmt: *Stmt) !Pairing {
    return .{
        .id = try dupText(alloc, stmt, 0),
        .user_id = try dupOpt(alloc, stmt, 1),
        .device_id = try dupText(alloc, stmt, 2),
        .status = try pairingStatus(stmt.text(3) orelse ""),
        .attempts = @intCast(stmt.int(4)),
        .created_at = stmt.int(5),
        .expires_at = stmt.int(6),
    };
}

const pairing_columns = "id, user_id, device_id, status, attempts, created_at, expires_at";

pub fn pairingByUserCodeHash(store: *Store, alloc: std.mem.Allocator, hash: []const u8) !?Pairing {
    var stmt = try store.prepare(
        "SELECT " ++ pairing_columns ++ " FROM pairing_requests WHERE user_code_hash = ?1 ORDER BY created_at DESC LIMIT 1",
    );
    defer stmt.finalize();
    try stmt.bindText(1, hash);
    if (!try stmt.step()) return null;
    return try readPairing(alloc, &stmt);
}

pub fn pairingByDeviceCodeHash(store: *Store, alloc: std.mem.Allocator, hash: []const u8) !?Pairing {
    var stmt = try store.prepare(
        "SELECT " ++ pairing_columns ++ " FROM pairing_requests WHERE device_code_hash = ?1 ORDER BY created_at DESC LIMIT 1",
    );
    defer stmt.finalize();
    try stmt.bindText(1, hash);
    if (!try stmt.step()) return null;
    return try readPairing(alloc, &stmt);
}

pub fn pairingById(store: *Store, alloc: std.mem.Allocator, id: []const u8) !?Pairing {
    var stmt = try store.prepare("SELECT " ++ pairing_columns ++ " FROM pairing_requests WHERE id = ?1");
    defer stmt.finalize();
    try stmt.bindText(1, id);
    if (!try stmt.step()) return null;
    return try readPairing(alloc, &stmt);
}

/// Count one failed code attempt and return the new total.
pub fn incrementPairingAttempts(store: *Store, id: []const u8) !u32 {
    var update = try store.prepare("UPDATE pairing_requests SET attempts = attempts + 1 WHERE id = ?1");
    defer update.finalize();
    try update.bindText(1, id);
    try update.done();

    var select = try store.prepare("SELECT attempts FROM pairing_requests WHERE id = ?1");
    defer select.finalize();
    try select.bindText(1, id);
    if (!try select.step()) return 0;
    return @intCast(select.int(0));
}

pub fn approvePairing(store: *Store, io: std.Io, id: []const u8, user_id: []const u8) !bool {
    var stmt = try store.prepare(
        "UPDATE pairing_requests SET status = 'approved', user_id = ?1, approved_at = ?2 " ++
            "WHERE id = ?3 AND status = 'pending'",
    );
    defer stmt.finalize();
    try stmt.bindText(1, user_id);
    try stmt.bindInt(2, clock.nowMs(io));
    try stmt.bindText(3, id);
    try stmt.done();
    return storeChanged(store) > 0;
}

pub fn denyPairing(store: *Store, io: std.Io, id: []const u8) !bool {
    var stmt = try store.prepare(
        "UPDATE pairing_requests SET status = 'denied' WHERE id = ?1 AND status = 'pending'",
    );
    defer stmt.finalize();
    _ = io;
    try stmt.bindText(1, id);
    try stmt.done();
    return storeChanged(store) > 0;
}

pub fn consumePairing(store: *Store, io: std.Io, id: []const u8) !bool {
    var stmt = try store.prepare(
        "UPDATE pairing_requests SET status = 'consumed', consumed_at = ?1 WHERE id = ?2 AND status = 'approved'",
    );
    defer stmt.finalize();
    try stmt.bindInt(1, clock.nowMs(io));
    try stmt.bindText(2, id);
    try stmt.done();
    return storeChanged(store) > 0;
}

/// Expire every pending pairing whose deadline passed; returns the count.
pub fn expirePairings(store: *Store, io: std.Io) !usize {
    var stmt = try store.prepare(
        "UPDATE pairing_requests SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?1",
    );
    defer stmt.finalize();
    try stmt.bindInt(1, clock.nowMs(io));
    try stmt.done();
    return storeChanged(store);
}

// ----------------------------------------------------------------- tokens --

pub fn insertToken(
    store: *Store,
    io: std.Io,
    alloc: std.mem.Allocator,
    device_id: []const u8,
    kind: TokenKind,
    token_hash: []const u8,
    family_id: []const u8,
    expires_at: i64,
) ![]const u8 {
    const id = try ids.tokenRowId(alloc, io);
    var stmt = try store.prepare(
        "INSERT INTO tokens(id, device_id, kind, token_hash, family_id, expires_at, created_at) " ++
            "VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    );
    defer stmt.finalize();
    try stmt.bindText(1, id);
    try stmt.bindText(2, device_id);
    try stmt.bindText(3, @tagName(kind));
    try stmt.bindText(4, token_hash);
    try stmt.bindText(5, family_id);
    try stmt.bindInt(6, expires_at);
    try stmt.bindInt(7, clock.nowMs(io));
    try stmt.done();
    return id;
}

pub fn tokenByHash(
    store: *Store,
    alloc: std.mem.Allocator,
    kind: TokenKind,
    token_hash: []const u8,
    now: i64,
) !?Token {
    var stmt = try store.prepare(
        "SELECT id, device_id, kind, family_id, expires_at FROM tokens " ++
            "WHERE token_hash = ?1 AND kind = ?2 AND revoked_at IS NULL AND expires_at > ?3",
    );
    defer stmt.finalize();
    try stmt.bindText(1, token_hash);
    try stmt.bindText(2, @tagName(kind));
    try stmt.bindInt(3, now);
    if (!try stmt.step()) return null;
    return .{
        .id = try dupText(alloc, &stmt, 0),
        .device_id = try dupText(alloc, &stmt, 1),
        .kind = try tokenKind(stmt.text(2) orelse ""),
        .family_id = try dupText(alloc, &stmt, 3),
        .expires_at = stmt.int(4),
    };
}

/// Any token row by hash, including revoked ones (used to detect refresh-token
/// reuse).
pub fn tokenRowByHash(store: *Store, alloc: std.mem.Allocator, token_hash: []const u8) !?Token {
    var stmt = try store.prepare(
        "SELECT id, device_id, kind, family_id, expires_at, revoked_at FROM tokens " ++
            "WHERE token_hash = ?1 ORDER BY created_at DESC LIMIT 1",
    );
    defer stmt.finalize();
    try stmt.bindText(1, token_hash);
    if (!try stmt.step()) return null;
    return .{
        .id = try dupText(alloc, &stmt, 0),
        .device_id = try dupText(alloc, &stmt, 1),
        .kind = try tokenKind(stmt.text(2) orelse ""),
        .family_id = try dupText(alloc, &stmt, 3),
        .expires_at = stmt.int(4),
        .revoked_at = optInt(&stmt, 5),
    };
}

pub fn revokeToken(store: *Store, io: std.Io, id: []const u8) !bool {
    var stmt = try store.prepare("UPDATE tokens SET revoked_at = ?1 WHERE id = ?2 AND revoked_at IS NULL");
    defer stmt.finalize();
    try stmt.bindInt(1, clock.nowMs(io));
    try stmt.bindText(2, id);
    try stmt.done();
    return storeChanged(store) > 0;
}

/// Resolve an access token straight to its active device (used by the WS
/// handshake).
pub fn deviceForAccessToken(
    store: *Store,
    alloc: std.mem.Allocator,
    token_hash: []const u8,
    now: i64,
) !?Device {
    var stmt = try store.prepare(
        "SELECT d.id, d.user_id, d.name, d.platform, d.pubkey, d.scopes, d.status, d.created_at, " ++
            "d.approved_at, d.last_seen_at, d.revoked_at FROM tokens t JOIN devices d ON d.id = t.device_id " ++
            "WHERE t.token_hash = ?1 AND t.kind = 'access' AND t.revoked_at IS NULL AND t.expires_at > ?2 " ++
            "AND d.status = 'active'",
    );
    defer stmt.finalize();
    try stmt.bindText(1, token_hash);
    try stmt.bindInt(2, now);
    if (!try stmt.step()) return null;
    return .{
        .id = try dupText(alloc, &stmt, 0),
        .user_id = try dupOpt(alloc, &stmt, 1),
        .name = try dupText(alloc, &stmt, 2),
        .platform = try dupText(alloc, &stmt, 3),
        .pubkey = try dupText(alloc, &stmt, 4),
        .scopes = try dupText(alloc, &stmt, 5),
        .status = try deviceStatus(stmt.text(6) orelse ""),
        .created_at = stmt.int(7),
        .approved_at = optInt(&stmt, 8),
        .last_seen_at = optInt(&stmt, 9),
        .revoked_at = optInt(&stmt, 10),
    };
}

pub fn revokeFamily(store: *Store, io: std.Io, family_id: []const u8) !usize {
    var stmt = try store.prepare(
        "UPDATE tokens SET revoked_at = ?1 WHERE family_id = ?2 AND revoked_at IS NULL",
    );
    defer stmt.finalize();
    try stmt.bindInt(1, clock.nowMs(io));
    try stmt.bindText(2, family_id);
    try stmt.done();
    return storeChanged(store);
}

pub fn revokeDeviceTokens(store: *Store, io: std.Io, device_id: []const u8) !usize {
    var stmt = try store.prepare(
        "UPDATE tokens SET revoked_at = ?1 WHERE device_id = ?2 AND revoked_at IS NULL",
    );
    defer stmt.finalize();
    try stmt.bindInt(1, clock.nowMs(io));
    try stmt.bindText(2, device_id);
    try stmt.done();
    return storeChanged(store);
}

pub fn purgeExpiredTokens(store: *Store, io: std.Io) !usize {
    var stmt = try store.prepare("DELETE FROM tokens WHERE expires_at <= ?1");
    defer stmt.finalize();
    try stmt.bindInt(1, clock.nowMs(io));
    try stmt.done();
    return storeChanged(store);
}

// ---------------------------------------------------------- web sessions --

pub fn insertWebSession(
    store: *Store,
    io: std.Io,
    alloc: std.mem.Allocator,
    user_id: []const u8,
    token_hash: []const u8,
    expires_at: i64,
    ua: ?[]const u8,
    ip_hash: ?[]const u8,
) ![]const u8 {
    const id = try ids.sessionRowId(alloc, io);
    var stmt = try store.prepare(
        "INSERT INTO web_sessions(id, user_id, token_hash, expires_at, ua, ip_hash, created_at) " ++
            "VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    );
    defer stmt.finalize();
    try stmt.bindText(1, id);
    try stmt.bindText(2, user_id);
    try stmt.bindText(3, token_hash);
    try stmt.bindInt(4, expires_at);
    if (ua) |value| try stmt.bindText(5, value) else try stmt.bindNull(5);
    if (ip_hash) |value| try stmt.bindText(6, value) else try stmt.bindNull(6);
    try stmt.bindInt(7, clock.nowMs(io));
    try stmt.done();
    return id;
}

pub fn webSessionByHash(
    store: *Store,
    alloc: std.mem.Allocator,
    token_hash: []const u8,
    now: i64,
) !?WebSession {
    var stmt = try store.prepare(
        "SELECT id, user_id, expires_at FROM web_sessions WHERE token_hash = ?1 AND expires_at > ?2",
    );
    defer stmt.finalize();
    try stmt.bindText(1, token_hash);
    try stmt.bindInt(2, now);
    if (!try stmt.step()) return null;
    return .{
        .id = try dupText(alloc, &stmt, 0),
        .user_id = try dupText(alloc, &stmt, 1),
        .expires_at = stmt.int(2),
    };
}

pub fn deleteWebSession(store: *Store, token_hash: []const u8) !usize {
    var stmt = try store.prepare("DELETE FROM web_sessions WHERE token_hash = ?1");
    defer stmt.finalize();
    try stmt.bindText(1, token_hash);
    try stmt.done();
    return storeChanged(store);
}

pub fn purgeWebSessions(store: *Store, io: std.Io) !usize {
    var stmt = try store.prepare("DELETE FROM web_sessions WHERE expires_at <= ?1");
    defer stmt.finalize();
    try stmt.bindInt(1, clock.nowMs(io));
    try stmt.done();
    return storeChanged(store);
}

// ------------------------------------------------------------------ audit --

pub fn addAudit(
    store: *Store,
    io: std.Io,
    user_id: ?[]const u8,
    device_id: ?[]const u8,
    event: []const u8,
    meta: ?[]const u8,
) !void {
    var stmt = try store.prepare(
        "INSERT INTO audit(user_id, device_id, event, meta, at) VALUES(?1, ?2, ?3, ?4, ?5)",
    );
    defer stmt.finalize();
    if (user_id) |value| try stmt.bindText(1, value) else try stmt.bindNull(1);
    if (device_id) |value| try stmt.bindText(2, value) else try stmt.bindNull(2);
    try stmt.bindText(3, event);
    if (meta) |value| try stmt.bindText(4, value) else try stmt.bindNull(4);
    try stmt.bindInt(5, clock.nowMs(io));
    try stmt.done();
}

fn storeChanged(store: *Store) usize {
    const sqlite = @import("sqlite");
    return @intCast(sqlite.sqlite3_changes(store.db));
}

// ------------------------------------------------------------------- test --

test "the repository round-trips a pairing, a device, tokens and a session" {
    const io = std.testing.io;
    var arena_state = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena_state.deinit();
    const alloc = arena_state.allocator();

    var store = try Store.open(std.testing.allocator, ":memory:");
    defer store.close();
    store.lock(io);
    defer store.unlock(io);
    const user = try ensureDevUser(&store, io, alloc);
    try std.testing.expect(std.mem.startsWith(u8, user, "usr_"));

    const device_id = try ids.deviceId(alloc, io);
    try insertDevice(&store, io, .{
        .id = device_id,
        .name = "PC test",
        .platform = "windows",
        .pubkey = "pk",
        .scopes = "[\"chat\"]",
    });

    var pair_hash: [64]u8 = undefined;
    const code_hash = @import("crypto.zig").codeHash("pepper", "ABCDEFGH", &pair_hash);
    const pairing_id = try insertPairing(&store, io, alloc, device_id, "device", code_hash, "dc_hash", clock.nowMs(io) + 60_000);

    const found = (try pairingByUserCodeHash(&store, alloc, code_hash)).?;
    try std.testing.expectEqualStrings(pairing_id, found.id);
    try std.testing.expectEqual(PairingStatus.pending, found.status);

    try std.testing.expect(try approveDevice(&store, io, device_id, user));
    try std.testing.expect(try approvePairing(&store, io, pairing_id, user));
    try std.testing.expect(try consumePairing(&store, io, pairing_id));

    const device = (try deviceById(&store, alloc, device_id)).?;
    try std.testing.expectEqual(DeviceStatus.active, device.status);
    try std.testing.expectEqualStrings(user, device.user_id.?);

    var token_hash: [64]u8 = undefined;
    const access_hash = @import("crypto.zig").tokenHash("pepper", "at_secret", &token_hash);
    _ = try insertToken(&store, io, alloc, device_id, .access, access_hash, "fam_1", clock.nowMs(io) + 900_000);

    const resolved = (try deviceForAccessToken(&store, alloc, access_hash, clock.nowMs(io))).?;
    try std.testing.expectEqualStrings(device_id, resolved.id);

    var session_hash: [64]u8 = undefined;
    const session_token_hash = @import("crypto.zig").tokenHash("pepper", "ws_secret", &session_hash);
    _ = try insertWebSession(&store, io, alloc, user, session_token_hash, clock.nowMs(io) + 60_000, "test", null);
    const session = (try webSessionByHash(&store, alloc, session_token_hash, clock.nowMs(io))).?;
    try std.testing.expectEqualStrings(user, session.user_id);

    try addAudit(&store, io, user, device_id, "pairing.approved", null);

    // Revoking the family makes the access token unusable.
    _ = try revokeFamily(&store, io, "fam_1");
    try std.testing.expect((try deviceForAccessToken(&store, alloc, access_hash, clock.nowMs(io))) == null);
}


