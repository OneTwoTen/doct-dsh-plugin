//! The relay's runtime state: who is connected, which streams and requests are
//! in flight, and how frames are routed between a device and its web client.
//!
//! Every method that touches a connection must be called while holding `mutex`.
//! That is what makes closing a connection safe: the peer thread removes itself
//! from the maps under the lock, and no other thread can be writing at the same
//! time. Reads happen off-lock in the peer thread.

const std = @import("std");
const clock = @import("clock.zig");
const conn_mod = @import("conn.zig");
const crypto = @import("crypto.zig");
const ratelimit = @import("ratelimit.zig");
const repo = @import("repo.zig");
const store_mod = @import("store.zig");
const ws_frame = @import("ws_frame.zig");

const Conn = conn_mod.Conn;
const Store = store_mod.Store;

pub const Envelope = struct {
    t: []const u8,
    id: ?[]const u8 = null,
    op: ?[]const u8 = null,
    v: ?u32 = null,
    deviceId: ?[]const u8 = null,
    ts: ?i64 = null,
    nonce: ?[]const u8 = null,
    sig: ?[]const u8 = null,
    reason: ?[]const u8 = null,
    args: ?std.json.Value = null,
};

pub const PeerError = error{
    NotAuthenticated,
    BadFrame,
    UnknownFrame,
    ClockSkew,
    DeviceUnknown,
    ReplayedNonce,
    BadSignature,
    StreamLimit,
    RateLimited,
} || std.mem.Allocator.Error;

const Direction = enum { web, device };

const DevicePeer = struct {
    conn: *Conn,
    device_id: []const u8,
    user_id: ?[]const u8,
    authenticated: bool = false,
    last_seen_ms: i64 = 0,
};

const WebPeer = struct {
    conn: *Conn,
    user_id: []const u8,
    last_seen_ms: i64 = 0,
};

const StreamEntry = struct {
    web: *Conn,
    device_id: []const u8,
    session_id: []const u8,
    at_ms: i64,
};

const PendingEntry = struct {
    /// Where the response must go.
    to: Direction,
    conn: *Conn,
    device_id: []const u8,
    at_ms: i64,
};

const PromptWindow = struct {
    last_ms: i64 = 0,
    window_start_ms: i64 = 0,
    count: u32 = 0,
};

pub const Hub = struct {
    io: std.Io,
    gpa: std.mem.Allocator,
    store: *Store,
    pepper: []const u8,
    max_frame_bytes: usize,
    max_streams: u32,
    max_inflight: u32,
    request_timeout_ms: i64,
    heartbeat_ms: i64,
    mutex: std.Io.Mutex = .init,

    devices: std.StringHashMap(*DevicePeer),
    webs: std.StringHashMap(*WebPeer),
    streams: std.StringHashMap(StreamEntry),
    pending: std.StringHashMap(PendingEntry),
    polls: std.StringHashMap(i64),
    pairing_limits: std.StringHashMap(ratelimit.Counter),
    prompt_limits: std.StringHashMap(PromptWindow),
    nonces: std.StringHashMap(i64),
    counter: u64 = 0,

    pub fn init(
        io: std.Io,
        gpa: std.mem.Allocator,
        store: *Store,
        pepper: []const u8,
        max_frame_bytes: usize,
        max_streams: u32,
        max_inflight: u32,
        request_timeout_ms: i64,
        heartbeat_ms: i64,
    ) Hub {
        return .{
            .io = io,
            .gpa = gpa,
            .store = store,
            .pepper = pepper,
            .max_frame_bytes = max_frame_bytes,
            .max_streams = max_streams,
            .max_inflight = max_inflight,
            .request_timeout_ms = request_timeout_ms,
            .heartbeat_ms = heartbeat_ms,
            .devices = std.StringHashMap(*DevicePeer).init(gpa),
            .webs = std.StringHashMap(*WebPeer).init(gpa),
            .streams = std.StringHashMap(StreamEntry).init(gpa),
            .pending = std.StringHashMap(PendingEntry).init(gpa),
            .polls = std.StringHashMap(i64).init(gpa),
            .pairing_limits = std.StringHashMap(ratelimit.Counter).init(gpa),
            .prompt_limits = std.StringHashMap(PromptWindow).init(gpa),
            .nonces = std.StringHashMap(i64).init(gpa),
        };
    }

    pub fn lock(self: *Hub) void {
        self.mutex.lockUncancelable(self.io);
    }

    pub fn unlock(self: *Hub) void {
        self.mutex.unlock(self.io);
    }


    pub fn registerDevice(self: *Hub, conn: *Conn, device: repo.Device) !void {
        if (self.devices.get(device.id)) |old| {
            old.conn.writeClose(4001, "replaced by a newer connection");
            old.conn.shutdown(self.io);
        }
        const peer = try self.gpa.create(DevicePeer);
        peer.* = .{
            .conn = conn,
            .device_id = try self.gpa.dupe(u8, device.id),
            .user_id = if (device.user_id) |id| try self.gpa.dupe(u8, id) else null,
            .last_seen_ms = clock.nowMs(self.io),
        };
        try self.devices.put(peer.device_id, peer);
    }

    pub fn registerWeb(self: *Hub, conn: *Conn, user_id: []const u8) !void {
        const peer = try self.gpa.create(WebPeer);
        peer.* = .{
            .conn = conn,
            .user_id = try self.gpa.dupe(u8, user_id),
            .last_seen_ms = clock.nowMs(self.io),
        };
        const key = try self.newConnKey();
        try self.webs.put(key, peer);
    }

    fn newConnKey(self: *Hub) ![]const u8 {
        self.counter += 1;
        return std.fmt.allocPrint(self.gpa, "w{d}", .{self.counter});
    }

    /// Remove the connection and fail any work that pointed at it.
    pub fn unregister(self: *Hub, conn: *Conn) void {
        var device_key: ?[]const u8 = null;
        var device_it = self.devices.iterator();
        while (device_it.next()) |entry| {
            if (entry.value_ptr.*.conn == conn) {
                device_key = entry.key_ptr.*;
                break;
            }
        }
        if (device_key) |key| {
            const peer = self.devices.get(key).?;
            self.devices.remove(key);
            self.gpa.destroy(peer);
            // Web work for this device cannot finish.
            var pending_it = self.pending.iterator();
            while (pending_it.next()) |entry| {
                if (entry.value_ptr.*.device_id.len > 0 and
                    std.mem.eql(u8, entry.value_ptr.*.device_id, key))
                {
                    if (entry.value_ptr.*.to == .web) {
                        sendError(entry.value_ptr.*.conn, entry.key_ptr.*, "transport/closed", "the device disconnected", true);
                    }
                    _ = self.pending.remove(entry.key_ptr.*);
                }
            }
            var stream_it = self.streams.iterator();
            while (stream_it.next()) |entry| {
                if (!std.mem.eql(u8, entry.value_ptr.*.device_id, key)) continue;
                sendEnd(entry.value_ptr.*.web, entry.key_ptr.*, "error");
                _ = self.streams.remove(entry.key_ptr.*);
            }
            return;
        }

        var web_key: ?[]const u8 = null;
        var web_it = self.webs.iterator();
        while (web_it.next()) |entry| {
            if (entry.value_ptr.*.conn == conn) {
                web_key = entry.key_ptr.*;
                break;
            }
        }
        if (web_key) |key| {
            const peer = self.webs.get(key).?;
            self.webs.remove(key);
            // Cancel the device-side streams this web client owned.
            var stream_it = self.streams.iterator();
            while (stream_it.next()) |entry| {
                if (entry.value_ptr.*.web != conn) continue;
                if (self.devices.get(entry.value_ptr.*.device_id)) |device| {
                    sendCancel(device.conn, entry.key_ptr.*);
                }
                _ = self.streams.remove(entry.key_ptr.*);
            }
            var pending_it = self.pending.iterator();
            while (pending_it.next()) |entry| {
                if (entry.value_ptr.*.to != .device or entry.value_ptr.*.conn != conn) continue;
                if (self.devices.get(entry.value_ptr.*.device_id)) |device| {
                    sendError(device.conn, entry.key_ptr.*, "transport/closed", "the web client disconnected", true);
                }
                _ = self.pending.remove(entry.key_ptr.*);
            }
            self.gpa.free(peer.user_id);
            self.gpa.destroy(peer);
            self.gpa.free(key);
            return;
        }
    }

    pub fn deviceOnline(self: *Hub, device_id: []const u8) bool {
        return self.devices.contains(device_id);
    }

    pub fn webCount(self: *Hub) usize {
        return self.webs.count();
    }

    // ----------------------------------------------------------- handshake --

    /// Validate the first `hello` from a device connection.
    pub fn authenticateHello(self: *Hub, conn: *Conn, device_id: []const u8, env: *const Envelope) !void {
        const ts = env.ts orelse return error.BadFrame;
        const nonce = env.nonce orelse return error.BadFrame;
        const sig = env.sig orelse return error.BadFrame;

        const now = clock.nowMs(self.io);
        if (@abs(now - ts) > 300_000) return error.ClockSkew;

        const nonce_key = try std.fmt.allocPrint(self.gpa, "{s}|{d}|{s}", .{ device_id, ts, nonce });
        if (self.nonces.contains(nonce_key)) {
            self.gpa.free(nonce_key);
            return error.ReplayedNonce;
        }

        const device = (try repo.deviceById(self.store, self.gpa, device_id)) orelse return error.DeviceUnknown;
        if (device.status != .active) return error.NotAuthenticated;
        if (!crypto.verifyHello(device.pubkey, .{
            .version = env.v orelse 1,
            .device_id = device_id,
            .ts = ts,
            .nonce = nonce,
            .signature = sig,
        })) return error.BadSignature;

        try self.nonces.put(nonce_key, now);
        if (self.devices.get(device_id)) |peer| {
            peer.authenticated = true;
            peer.last_seen_ms = now;
        }

        var buf: [512]u8 = undefined;
        const body = std.fmt.bufPrint(&buf, "{{\"t\":\"hello.ok\",\"v\":1,\"serverTime\":{d}," ++
            "\"limits\":{{\"maxFrameBytes\":{d},\"maxStreams\":{d},\"maxInflight\":{d}}}}}", .{
            now, self.max_frame_bytes, self.max_streams, self.max_inflight,
        }) catch return error.BadFrame;
        conn.writeText(body) catch {};
    }

    pub fn deviceByIdForAuth(self: *Hub, device_id: []const u8) !?repo.Device {
        return repo.deviceById(self.store, self.gpa, device_id);
    }

    // ------------------------------------------------------ frame routing --

    /// Route one frame that arrived from a device connection.
    pub fn handleDeviceFrame(
        self: *Hub,
        conn: *Conn,
        device_id: []const u8,
        env: *const Envelope,
        raw: []const u8,
        now: i64,
    ) PeerError!void {
        if (self.devices.get(device_id)) |peer| peer.last_seen_ms = now;

        if (std.mem.eql(u8, env.t, "hello")) {
            // Re-authentication is a protocol error after the first hello.
            sendError(conn, env.id orelse "hello", "bad-frame", "hello already accepted", false);
            return;
        }

        if (std.mem.eql(u8, env.t, "pong")) return;
        if (std.mem.eql(u8, env.t, "ping")) {
            sendPong(conn, env.nonce orelse "");
            return;
        }

        if (std.mem.eql(u8, env.t, "res")) {
            const id = env.id orelse {
                sendError(conn, "res", "bad-frame", "res without id", false);
                return;
            };
            const entry = self.pending.get(id) orelse return;
            if (entry.to != .web) return;
            _ = self.pending.remove(id);
            entry.conn.writeText(raw) catch {
                sendError(conn, id, "transport/closed", "the web client is gone", true);
            };
            return;
        }

        if (std.mem.eql(u8, env.t, "item")) {
            const id = env.id orelse return;
            const stream = self.streams.get(id) orelse return;
            stream.web.writeText(raw) catch {
                sendEnd(conn, id, "overflow");
                _ = self.streams.remove(id);
            };
            return;
        }

        if (std.mem.eql(u8, env.t, "end")) {
            const id = env.id orelse return;
            if (self.streams.get(id)) |stream| {
                stream.web.writeText(raw) catch {};
                _ = self.streams.remove(id);
            } else {
                conn.writeText(raw) catch {};
            }
            return;
        }

        if (std.mem.eql(u8, env.t, "req")) {
            const id = env.id orelse return;
            if (self.pending.count() >= 4 * self.max_inflight) {
                sendError(conn, id, "rate/limited", "too many pending requests", true);
                return;
            }
            const target = self.webForRequest(env) orelse {
                sendError(conn, id, "transport/not-ready", "no web client is connected", true);
                return;
            };
            try self.pending.put(id, .{
                .to = .device,
                .conn = conn,
                .device_id = device_id,
                .at_ms = now,
            });
            target.writeText(raw) catch {
                _ = self.pending.remove(id);
                sendError(conn, id, "transport/closed", "the web client is gone", true);
            };
            return;
        }

        sendError(conn, env.id orelse "relay", "unsupported", "cannot route this frame from a device", false);
    }

    /// Route one frame that arrived from a web connection.
    pub fn handleWebFrame(
        self: *Hub,
        conn: *Conn,
        env: *const Envelope,
        raw: []const u8,
        now: i64,
    ) PeerError!void {
        var web_it = self.webs.iterator();
        while (web_it.next()) |entry| {
            if (entry.value_ptr.*.conn == conn) entry.value_ptr.*.last_seen_ms = now;
        }

        if (std.mem.eql(u8, env.t, "pong")) return;
        if (std.mem.eql(u8, env.t, "ping")) {
            sendPong(conn, env.nonce orelse "");
            return;
        }

        if (std.mem.eql(u8, env.t, "req")) {
            const id = env.id orelse return;
            const device = self.anyDevice() orelse {
                sendError(conn, id, "transport/not-ready", "no device is connected", true);
                return;
            };
            if (std.mem.eql(u8, env.op orelse "", "session.prompt")) {
                if (!self.allowPrompt(env, now)) {
                    sendError(conn, id, "rate/limited", "prompt rate limit", true);
                    return;
                }
            }
            if (self.pending.count() >= 4 * self.max_inflight) {
                sendError(conn, id, "rate/limited", "too many pending requests", true);
                return;
            }
            try self.pending.put(id, .{
                .to = .web,
                .conn = conn,
                .device_id = device.device_id,
                .at_ms = now,
            });
            device.conn.writeText(raw) catch {
                _ = self.pending.remove(id);
                sendError(conn, id, "transport/closed", "the device disconnected", true);
            };
            return;
        }

        if (std.mem.eql(u8, env.t, "open")) {
            const id = env.id orelse return;
            const device = self.anyDevice() orelse {
                sendEnd(conn, id, "error");
                return;
            };
            if (self.streamsForDevice(device.device_id) >= self.max_streams) {
                sendEnd(conn, id, "overflow");
                return;
            }
            const session_id = stringArg(env, "sessionId") orelse "";
            try self.streams.put(id, .{
                .web = conn,
                .device_id = device.device_id,
                .session_id = try self.gpa.dupe(u8, session_id),
                .at_ms = now,
            });
            device.conn.writeText(raw) catch {
                _ = self.streams.remove(id);
                sendEnd(conn, id, "error");
            };
            return;
        }

        if (std.mem.eql(u8, env.t, "cancel")) {
            const id = env.id orelse return;
            if (self.streams.get(id)) |stream| {
                if (self.devices.get(stream.device_id)) |device| {
                    device.conn.writeText(raw) catch {};
                }
                _ = self.streams.remove(id);
            }
            return;
        }

        if (std.mem.eql(u8, env.t, "res")) {
            const id = env.id orelse return;
            const entry = self.pending.get(id) orelse return;
            if (entry.to != .device) return;
            _ = self.pending.remove(id);
            if (self.devices.get(entry.device_id)) |device| {
                device.conn.writeText(raw) catch {};
            }
            return;
        }

        sendError(conn, env.id orelse "relay", "unsupported", "cannot route this frame from the web", false);
    }

    fn webForRequest(self: *Hub, env: *const Envelope) ?*Conn {
        // Prefer the web client following the same session, else any.
        if (stringArg(env, "sessionId")) |session_id| {
            var it = self.streams.iterator();
            while (it.next()) |entry| {
                if (std.mem.eql(u8, entry.value_ptr.*.session_id, session_id)) {
                    return entry.value_ptr.*.web;
                }
            }
        }
        var web_it = self.webs.iterator();
        if (web_it.next()) |entry| return entry.value_ptr.*.conn;
        return null;
    }

    fn anyDevice(self: *Hub) ?*DevicePeer {
        var it = self.devices.iterator();
        while (it.next()) |entry| {
            if (entry.value_ptr.*.authenticated) return entry.value_ptr.*;
        }
        return null;
    }

    fn streamsForDevice(self: *Hub, device_id: []const u8) u32 {
        var count: u32 = 0;
        var it = self.streams.iterator();
        while (it.next()) |entry| {
            if (std.mem.eql(u8, entry.value_ptr.*.device_id, device_id)) count += 1;
        }
        return count;
    }

    fn allowPrompt(self: *Hub, env: *const Envelope, now: i64) bool {
        const session_id = stringArg(env, "sessionId") orelse return true;
        const entry = self.prompt_limits.getPtr(session_id) orelse {
            const fresh = PromptWindow{ .last_ms = now, .window_start_ms = now, .count = 1 };
            self.prompt_limits.put(session_id, fresh) catch return true;
            return true;
        };
        if (now - entry.last_ms < 2000) return false;
        if (now - entry.window_start_ms >= 60_000) {
            entry.window_start_ms = now;
            entry.count = 0;
        }
        if (entry.count >= 20) return false;
        entry.last_ms = now;
        entry.count += 1;
        return true;
    }

    // ----------------------------------------------------- pairing limits --

    /// Rate limit pairing creation per client IP (20/hour).
    pub fn allowPairing(self: *Hub, client_ip: []const u8, now: i64) bool {
        const entry = self.pairing_limits.getPtr(client_ip) orelse {
            var fresh = ratelimit.Counter{};
            _ = fresh.allow(20, 3_600_000, now);
            self.pairing_limits.put(self.gpa.dupe(u8, client_ip) catch return true, fresh) catch return true;
            return true;
        };
        return entry.allow(20, 3_600_000, now);
    }

    /// Poll pacing for `/v1/device/token`: one poll every five seconds.
    pub fn allowPoll(self: *Hub, device_code_hash: []const u8, now: i64) bool {
        if (self.polls.get(device_code_hash)) |last| {
            if (now - last < 5000) return false;
            _ = self.polls.put(device_code_hash, now);
            return true;
        }
        self.polls.put(self.gpa.dupe(u8, device_code_hash) catch return true, now) catch return true;
        return true;
    }

    // ------------------------------------------------------------- sweep ----

    /// Periodic maintenance: request timeouts, heartbeat, expiry.
    pub fn sweep(self: *Hub, now: i64) void {
        var pending_it = self.pending.iterator();
        while (pending_it.next()) |entry| {
            if (now - entry.value_ptr.*.at_ms < self.request_timeout_ms) continue;
            if (entry.value_ptr.*.to == .web) {
                sendError(entry.value_ptr.*.conn, entry.key_ptr.*, "transport/timeout", "no answer from the device", true);
            } else if (self.devices.get(entry.value_ptr.*.device_id)) |device| {
                sendError(device.conn, entry.key_ptr.*, "transport/timeout", "no answer from the web client", true);
            }
            _ = self.pending.remove(entry.key_ptr.*);
        }

        var stream_it = self.streams.iterator();
        while (stream_it.next()) |entry| {
            if (now - entry.value_ptr.*.at_ms < 3_600_000) continue;
            sendEnd(entry.value_ptr.*.web, entry.key_ptr.*, "overflow");
            _ = self.streams.remove(entry.key_ptr.*);
        }

        var device_it = self.devices.iterator();
        while (device_it.next()) |entry| {
            const peer = entry.value_ptr.*;
            peer.conn.writePing() catch {
                peer.conn.closed = true;
                peer.conn.shutdown(self.io);
            };
        }
        var web_it = self.webs.iterator();
        while (web_it.next()) |entry| {
            const peer = entry.value_ptr.*;
            peer.conn.writePing() catch {
                peer.conn.closed = true;
                peer.conn.shutdown(self.io);
            };
        }

        // Prune old nonces (kept twice the ±300s window).
        var nonce_it = self.nonces.iterator();
        while (nonce_it.next()) |entry| {
            if (now - entry.value_ptr.* > 600_000) _ = self.nonces.remove(entry.key_ptr.*);
        }
        // Prune rate-limit counters that have been idle for two windows.
        var limit_it = self.pairing_limits.iterator();
        while (limit_it.next()) |entry| {
            if (entry.value_ptr.stale(3_600_000, now)) _ = self.pairing_limits.remove(entry.key_ptr.*);
        }
        var poll_it = self.polls.iterator();
        while (poll_it.next()) |entry| {
            if (now - entry.value_ptr.* > 3_600_000) _ = self.polls.remove(entry.key_ptr.*);
        }
        var prompt_it = self.prompt_limits.iterator();
        while (prompt_it.next()) |entry| {
            if (now - entry.value_ptr.window_start_ms > 600_000) _ = self.prompt_limits.remove(entry.key_ptr.*);
        }

        _ = repo.expirePairings(self.store, self.io) catch {};
        _ = repo.purgeExpiredTokens(self.store, self.io) catch {};
        _ = repo.purgeWebSessions(self.store, self.io) catch {};
    }
};

fn stringArg(env: *const Envelope, key: []const u8) ?[]const u8 {
    const args = env.args orelse return null;
    switch (args) {
        .object => |object| {
            const value = object.get(key) orelse return null;
            return switch (value) {
                .string => |text| text,
                else => null,
            };
        },
        else => return null,
    }
}

pub fn sendError(conn: *Conn, id: []const u8, code: []const u8, message: []const u8, retryable: bool) void {
    var buf: [512]u8 = undefined;
    const body = std.fmt.bufPrint(&buf, "{{\"t\":\"res\",\"id\":\"{s}\",\"ok\":false," ++
        "\"error\":{{\"code\":\"{s}\",\"message\":\"{s}\",\"retryable\":{s}}}}}", .{
        id, code, message, if (retryable) "true" else "false",
    }) catch return;
    conn.writeText(body) catch {};
}

pub fn sendEnd(conn: *Conn, id: []const u8, reason: []const u8) void {
    var buf: [256]u8 = undefined;
    const body = std.fmt.bufPrint(&buf, "{{\"t\":\"end\",\"id\":\"{s}\",\"reason\":\"{s}\"}}", .{ id, reason }) catch return;
    conn.writeText(body) catch {};
}

fn sendCancel(conn: *Conn, id: []const u8) void {
    var buf: [256]u8 = undefined;
    const body = std.fmt.bufPrint(&buf, "{{\"t\":\"cancel\",\"id\":\"{s}\"}}", .{id}) catch return;
    conn.writeText(body) catch {};
}

fn sendPong(conn: *Conn, nonce: []const u8) void {
    var buf: [256]u8 = undefined;
    const body = std.fmt.bufPrint(&buf, "{{\"t\":\"pong\",\"nonce\":\"{s}\"}}", .{nonce}) catch return;
    conn.writeText(body) catch {};
}

test "a web request is routed to the device and the response comes back" {
    const io = std.testing.io;
    var arena_state = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena_state.deinit();
    const alloc = arena_state.allocator();

    var store = try Store.open(std.testing.allocator, ":memory:");
    defer store.close();
    var hub = Hub.init(io, alloc, &store, "pepper", 256 * 1024, 8, 32, 60_000, 25_000);

    defer {
        hub.devices.deinit();
        hub.webs.deinit();
        hub.streams.deinit();
        hub.pending.deinit();
        hub.polls.deinit();
        hub.pairing_limits.deinit();
        hub.prompt_limits.deinit();
        hub.nonces.deinit();
    }

    // Two in-memory connections: one device, one web.
    var device_in = std.Io.Reader.fixed("");
    var device_out_buf: [4096]u8 = undefined;
    var device_out = std.Io.Writer.fixed(&device_out_buf);
    var device_conn = Conn{ .input = &device_in, .output = &device_out, .max_frame_bytes = 1024, .stream = undefined };

    var web_in = std.Io.Reader.fixed("");
    var web_out_buf: [4096]u8 = undefined;
    var web_out = std.Io.Writer.fixed(&web_out_buf);
    var web_conn = Conn{ .input = &web_in, .output = &web_out, .max_frame_bytes = 1024, .stream = undefined };

    const device = repo.Device{
        .id = "dev_test",
        .user_id = null,
        .name = "test",
        .platform = "linux",
        .pubkey = "pk",
        .scopes = "[]",
        .status = .active,
        .created_at = 0,
        .approved_at = null,
        .last_seen_at = null,
        .revoked_at = null,
    };

    hub.lock();
    defer hub.unlock();
    try hub.registerDevice(&device_conn, device);
    try hub.registerWeb(&web_conn, "usr_test");
    if (hub.devices.get("dev_test")) |peer| peer.authenticated = true;

    const request = "{\"t\":\"req\",\"id\":\"r1\",\"op\":\"session.list\",\"args\":{}}";
    var request_arena = std.heap.ArenaAllocator.init(alloc);
    defer request_arena.deinit();
    const parsed = try std.json.parseFromSlice(Envelope, request_arena.allocator(), request, .{ .ignore_unknown_fields = true });
    try hub.handleWebFrame(&web_conn, &parsed.value, request, 1000);

    // The device received the exact request.
    try std.testing.expect(std.mem.indexOf(u8, device_out_buf[0..device_out.end], "session.list") != null);

    const response = "{\"t\":\"res\",\"id\":\"r1\",\"ok\":true,\"value\":{}}";
    const parsed_response = try std.json.parseFromSlice(Envelope, request_arena.allocator(), response, .{ .ignore_unknown_fields = true });
    try hub.handleDeviceFrame(&device_conn, "dev_test", &parsed_response.value, response, 1001);

    try std.testing.expect(std.mem.indexOf(u8, web_out_buf[0..web_out.end], "\"ok\":true") != null);
}

