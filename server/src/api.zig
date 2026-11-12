//! HTTP API of the relay (protocol v1): device pairing, token rotation, device
//! management, Clerk session exchange, and the minimal pairing page.

const std = @import("std");
const app_mod = @import("app.zig");
const auth = @import("auth.zig");
const clock = @import("clock.zig");
const codes = @import("codes.zig");
const crypto = @import("crypto.zig");
const http_util = @import("http_util.zig");
const ids = @import("ids.zig");
const repo = @import("repo.zig");

const App = app_mod.App;
const max_body = 64 * 1024;

pub fn route(app: *App, req: *std.http.Server.Request) !bool {
    var path_buffer: [512]u8 = undefined;
    const path = copyPath(req.head.target, &path_buffer);
    const method = req.head.method;

    if (method == .GET and std.mem.eql(u8, path, "/healthz")) {
        try health(app, req);
        return true;
    }
    if (method == .GET and std.mem.eql(u8, path, "/pair")) {
        try pairPage(app, req);
        return true;
    }
    if (method == .POST and std.mem.eql(u8, path, "/v1/device/authorize")) {
        try authorizeDevice(app, req);
        return true;
    }
    if (method == .POST and std.mem.eql(u8, path, "/v1/device/token")) {
        try pollDeviceToken(app, req);
        return true;
    }
    if (method == .POST and std.mem.eql(u8, path, "/v1/token/refresh")) {
        try refreshToken(app, req);
        return true;
    }
    if (method == .POST and std.mem.eql(u8, path, "/v1/auth/clerk")) {
        try clerkLogin(app, req);
        return true;
    }
    if (method == .POST and std.mem.eql(u8, path, "/v1/auth/logout")) {
        try clerkLogout(app, req);
        return true;
    }
    if (method == .GET and std.mem.eql(u8, path, "/v1/devices")) {
        try listDevices(app, req);
        return true;
    }
    if (method == .POST and std.mem.eql(u8, path, "/v1/pair/confirm")) {
        try confirmPairing(app, req);
        return true;
    }
    if (method == .POST and (std.mem.eql(u8, path, "/v1/pair/approve") or std.mem.eql(u8, path, "/v1/pair/deny"))) {
        try decidePairing(app, req, std.mem.endsWith(u8, path, "approve"));
        return true;
    }
    if (method == .POST and std.mem.startsWith(u8, path, "/v1/devices/")) {
        if (deviceAction(path)) |action| {
            try deviceCommand(app, req, action.id, action.command);
            return true;
        }
    }
    return false;
}

fn copyPath(target: []const u8, out: []u8) []const u8 {
    const end = std.mem.indexOfScalar(u8, target, '?') orelse target.len;
    const n = @min(end, out.len);
    @memcpy(out[0..n], target[0..n]);
    return out[0..n];
}

const DeviceAction = struct { id: []const u8, command: []const u8 };

fn deviceAction(path: []const u8) ?DeviceAction {
    const rest = path["/v1/devices/".len..];
    const slash = std.mem.indexOfScalar(u8, rest, '/') orelse return null;
    const id = rest[0..slash];
    const command = rest[slash + 1 ..];
    if (id.len == 0 or command.len == 0) return null;
    if (!std.mem.eql(u8, command, "revoke") and !std.mem.eql(u8, command, "approve") and
        !std.mem.eql(u8, command, "deny"))
    {
        return null;
    }
    return .{ .id = id, .command = command };
}

// ---------------------------------------------------------------- helpers --

fn escapeJson(alloc: std.mem.Allocator, text: []const u8) ![]const u8 {
    var list: std.ArrayList(u8) = .empty;
    for (text) |ch| {
        switch (ch) {
            '"' => try list.appendSlice(alloc, "\\\""),
            '\\' => try list.appendSlice(alloc, "\\\\"),
            '\n' => try list.appendSlice(alloc, "\\n"),
            '\r' => try list.appendSlice(alloc, "\\r"),
            '\t' => try list.appendSlice(alloc, "\\t"),
            else => {
                if (ch < 0x20) {
                    try list.appendSlice(alloc, "?");
                } else {
                    try list.append(alloc, ch);
                }
            },
        }
    }
    return list.toOwnedSlice(alloc);
}

fn deviceJson(app: *App, alloc: std.mem.Allocator, device: repo.Device, online: bool) ![]const u8 {
    _ = app;
    const name = try escapeJson(alloc, device.name);
    const platform = try escapeJson(alloc, device.platform);
    var fingerprint_buffer: [crypto.fingerprint_len]u8 = undefined;
    const der = crypto.decodePublicKey(alloc, device.pubkey) catch null;
    const fingerprint = if (der) |bytes| crypto.fingerprint(&fingerprint_buffer, bytes) else "SHA256:";
    return std.fmt.allocPrint(alloc,
        "{{\"id\":\"{s}\",\"name\":\"{s}\",\"platform\":\"{s}\",\"status\":\"{s}\"," ++
            "\"fingerprint\":\"{s}\",\"online\":{s},\"created_at\":{d},\"approved_at\":{?d}," ++
            "\"last_seen_at\":{?d}}}",
        .{
            device.id,
            name,
            platform,
            @tagName(device.status),
            fingerprint,
            if (online) "true" else "false",
            device.created_at,
            device.approved_at,
            device.last_seen_at,
        },
    );
}

fn summaryJson(app: *App, alloc: std.mem.Allocator, device: repo.Device) ![]const u8 {
    return deviceJson(app, alloc, device, false);
}

fn issueTokens(app: *App, alloc: std.mem.Allocator, device_id: []const u8, family: ?[]const u8) !struct {
    access: []const u8,
    refresh: []const u8,
    expires_in: u32,
} {
    const family_id = family orelse try ids.familyId(alloc, app.io);
    const access = try ids.accessToken(alloc, app.io);
    const refresh = try ids.refreshToken(alloc, app.io);
    const now = clock.nowMs(app.io);

    var hash_buffer: [64]u8 = undefined;
    const access_hash = crypto.tokenHash(app.pepper, access, &hash_buffer);
    _ = try repo.insertToken(app.store, app.io, alloc, device_id, .access, access_hash, family_id, now + app.cfg.accessTtlMs());
    const refresh_hash = crypto.tokenHash(app.pepper, refresh, &hash_buffer);
    _ = try repo.insertToken(app.store, app.io, alloc, device_id, .refresh, refresh_hash, family_id, now + app.cfg.refreshTtlMs());

    return .{ .access = access, .refresh = refresh, .expires_in = app.cfg.access_ttl_seconds };
}

fn webIdentity(app: *App, req: *std.http.Server.Request, alloc: std.mem.Allocator) !?[]const u8 {
    return auth.webUser(app.cfg, app.store, app.pepper, app.io, req, alloc);
}

// ----------------------------------------------------------------- routes --

fn health(app: *App, req: *std.http.Server.Request) !void {
    app.hub.lock();
    const devices = app.hub.devices.count();
    const webs = app.hub.webs.count();
    app.hub.unlock();

    var buffer: [256]u8 = undefined;
    const body = try std.fmt.bufPrint(&buffer, "{{\"ok\":true,\"version\":\"{s}\",\"devices\":{d},\"web\":{d},\"uptime\":{d}}}", .{
        App.version, devices, webs, app.uptimeSeconds(),
    });
    try http_util.json(req, .ok, body);
}

const AuthorizeBody = struct {
    name: []const u8 = "DSH device",
    platform: []const u8 = "unknown",
    pubkey: []const u8,
    scopes: ?[]const []const u8 = null,
    device_id: ?[]const u8 = null,
};

fn authorizeDevice(app: *App, req: *std.http.Server.Request) !void {
    var arena = std.heap.ArenaAllocator.init(app.gpa);
    defer arena.deinit();
    const alloc = arena.allocator();

    // Capture headers before the body reader invalidates the head buffer.
    const client_ip = http_util.clientIp(req);

    const body = http_util.readBody(req, alloc, max_body) catch {
        try http_util.sendError(req, .bad_request, "bad-request", "cannot read the request body");
        return;
    };
    const parsed = std.json.parseFromSliceLeaky(AuthorizeBody, alloc, body, .{ .ignore_unknown_fields = true }) catch {
        try http_util.sendError(req, .bad_request, "bad-frame", "the body must be JSON");
        return;
    };

    const der = crypto.decodePublicKey(alloc, parsed.pubkey) catch {
        try http_util.sendError(req, .bad_request, "pair/invalid-pubkey", "pubkey must be base64 SPKI");
        return;
    };
    _ = crypto.ed25519PublicKey(der) catch {
        try http_util.sendError(req, .bad_request, "pair/invalid-pubkey", "pubkey is not Ed25519");
        return;
    };

    const now = clock.nowMs(app.io);
    const rate_ip = client_ip;
    app.hub.lock();
    const allowed = app.hub.allowPairing(rate_ip, now);
    app.hub.unlock();
    if (!allowed) {
        try http_util.sendError(req, .too_many_requests, "rate/limited", "too many pairing requests");
        return;
    }

    const device_id = if (parsed.device_id) |candidate| blk: {
        if (!validDeviceId(candidate)) {
            try http_util.sendError(req, .bad_request, "pair/invalid-device-id", "device_id must look like dev_<hex>");
            return;
        }
        break :blk candidate;
    } else try ids.deviceId(alloc, app.io);

    const name = if (parsed.name.len > 120) parsed.name[0..120] else parsed.name;
    const platform = if (parsed.platform.len > 40) parsed.platform[0..40] else parsed.platform;

    var scopes_buffer: [512]u8 = undefined;
    const scopes = scopesJson(parsed.scopes, &scopes_buffer);

    app.store.lock(app.io);
    const stored = repo.upsertDevice(app.store, app.io, .{
        .id = device_id,
        .name = name,
        .platform = platform,
        .pubkey = parsed.pubkey,
        .scopes = scopes,
    }) catch |err| {
        app.store.unlock(app.io);
        try http_util.sendError(req, .internal_server_error, "internal", @errorName(err));
        return;
    };
    if (!stored) {
        app.store.unlock(app.io);
        try http_util.sendError(req, .conflict, "device/exists", "this device is already paired");
        return;
    }

    const code = codes.generateWithIo(app.io);
    const formatted = codes.formatted(code);
    var code_hash_buffer: [64]u8 = undefined;
    const code_hash = crypto.codeHash(app.pepper, &code, &code_hash_buffer);
    const device_code = try ids.deviceCode(alloc, app.io);
    var device_hash_buffer: [64]u8 = undefined;
    const device_hash = crypto.tokenHash(app.pepper, device_code, &device_hash_buffer);

    const pairing_id = repo.insertPairing(
        app.store,
        app.io,
        alloc,
        device_id,
        "device",
        code_hash,
        device_hash,
        now + app.cfg.pairingTtlMs(),
    ) catch |err| {
        app.store.unlock(app.io);
        try http_util.sendError(req, .internal_server_error, "internal", @errorName(err));
        return;
    };
    _ = repo.addAudit(app.store, app.io, null, device_id, "pairing.created", null) catch {};
    app.store.unlock(app.io);

    _ = pairing_id;
    var response_buffer: [512]u8 = undefined;
    const response = try std.fmt.bufPrint(&response_buffer,
        "{{\"device_code\":\"{s}\",\"user_code\":\"{s}\",\"verification_uri\":\"{s}/pair\"," ++
            "\"expires_in\":{d},\"interval\":5}}",
        .{ device_code, &formatted, app.cfg.public_url, app.cfg.pairing_ttl_seconds },
    );
    try http_util.json(req, .created, response);
}

fn scopesJson(scopes: ?[]const []const u8, out: []u8) []const u8 {
    var n: usize = 0;
    if (n < out.len) {
        out[n] = '[';
        n += 1;
    }
    var first = true;
    if (scopes) |items| {
        for (items) |item| {
            if (item.len == 0 or item.len > 32) continue;
            if (n + 2 >= out.len) break;
            if (!first) {
                out[n] = ',';
                n += 1;
            }
            first = false;
            out[n] = '"';
            n += 1;
            for (item) |ch| {
                if (n + 2 >= out.len) break;
                if (std.ascii.isAlphanumeric(ch) or ch == '-' or ch == '_' or ch == ':' or ch == '.') {
                    out[n] = ch;
                    n += 1;
                }
            }
            out[n] = '"';
            n += 1;
        }
    }
    if (n < out.len) {
        out[n] = ']';
        n += 1;
    }
    return out[0..n];
}

fn validDeviceId(candidate: []const u8) bool {
    if (!std.mem.startsWith(u8, candidate, "dev_")) return false;
    const rest = candidate[4..];
    if (rest.len < 8 or rest.len > 64) return false;
    for (rest) |ch| {
        if (!std.ascii.isHex(ch)) return false;
    }
    return true;
}

const TokenBody = struct { device_code: []const u8 };

fn pollDeviceToken(app: *App, req: *std.http.Server.Request) !void {
    var arena = std.heap.ArenaAllocator.init(app.gpa);
    defer arena.deinit();
    const alloc = arena.allocator();

    const body = http_util.readBody(req, alloc, max_body) catch {
        try http_util.sendError(req, .bad_request, "bad-request", "cannot read the request body");
        return;
    };
    const parsed = std.json.parseFromSliceLeaky(TokenBody, alloc, body, .{ .ignore_unknown_fields = true }) catch {
        try http_util.sendError(req, .bad_request, "bad-frame", "the body must be JSON");
        return;
    };

    const now = clock.nowMs(app.io);
    var hash_buffer: [64]u8 = undefined;
    const device_hash = crypto.tokenHash(app.pepper, parsed.device_code, &hash_buffer);

    app.store.lock(app.io);
    defer app.store.unlock(app.io);

    const pairing = (repo.pairingByDeviceCodeHash(app.store, alloc, device_hash) catch null) orelse {
        try http_util.json(req, .bad_request, "{\"error\":\"invalid_grant\"}");
        return;
    };

    if (pairing.status == .pending and now > pairing.expires_at) {
        _ = repo.expirePairings(app.store, app.io) catch {};
    }

    switch (pairing.status) {
        .pending => {
            try http_util.json(req, .ok, "{\"error\":\"authorization_pending\"}");
            return;
        },
        .denied => {
            try http_util.json(req, .bad_request, "{\"error\":\"access_denied\"}");
            return;
        },
        .expired => {
            try http_util.json(req, .gone, "{\"error\":\"expired_token\"}");
            return;
        },
        .consumed => {
            try http_util.json(req, .bad_request, "{\"error\":\"invalid_grant\"}");
            return;
        },
        .approved => {},
    }

    const device = (repo.deviceById(app.store, alloc, pairing.device_id) catch null) orelse {
        try http_util.json(req, .bad_request, "{\"error\":\"invalid_grant\"}");
        return;
    };
    const user_id = device.user_id orelse {
        try http_util.json(req, .bad_request, "{\"error\":\"invalid_grant\"}");
        return;
    };

    const tokens = issueTokens(app, alloc, device.id, null) catch |err| {
        try http_util.sendError(req, .internal_server_error, "internal", @errorName(err));
        return;
    };
    _ = repo.consumePairing(app.store, app.io, pairing.id) catch {};
    _ = repo.addAudit(app.store, app.io, user_id, device.id, "pairing.consumed", null) catch {};

    var response_buffer: [1024]u8 = undefined;
    const response = try std.fmt.bufPrint(&response_buffer,
        "{{\"access_token\":\"{s}\",\"refresh_token\":\"{s}\",\"token_type\":\"Bearer\"," ++
            "\"expires_in\":{d},\"device_id\":\"{s}\",\"account\":{{\"id\":\"{s}\",\"email\":null}}}}",
        .{ tokens.access, tokens.refresh, tokens.expires_in, device.id, user_id },
    );
    try http_util.json(req, .ok, response);
}

const RefreshBody = struct { refresh_token: []const u8 };

fn refreshToken(app: *App, req: *std.http.Server.Request) !void {
    var arena = std.heap.ArenaAllocator.init(app.gpa);
    defer arena.deinit();
    const alloc = arena.allocator();

    const body = http_util.readBody(req, alloc, max_body) catch {
        try http_util.sendError(req, .bad_request, "bad-request", "cannot read the request body");
        return;
    };
    const parsed = std.json.parseFromSliceLeaky(RefreshBody, alloc, body, .{ .ignore_unknown_fields = true }) catch {
        try http_util.sendError(req, .bad_request, "bad-frame", "the body must be JSON");
        return;
    };

    const now = clock.nowMs(app.io);
    var hash_buffer: [64]u8 = undefined;
    const hash = crypto.tokenHash(app.pepper, parsed.refresh_token, &hash_buffer);

    app.store.lock(app.io);
    defer app.store.unlock(app.io);

    const row = (repo.tokenRowByHash(app.store, alloc, hash) catch null);
    if (row) |token| {
        // Reuse of an already rotated refresh token revokes the whole family.
        if (token.revoked_at != null) {
            _ = repo.revokeFamily(app.store, app.io, token.family_id) catch {};
            try http_util.sendError(req, .unauthorized, "auth/invalid-token", "refresh token was already used");
            return;
        }
        if (token.kind != .refresh or token.expires_at <= now) {
            try http_util.sendError(req, .unauthorized, "auth/invalid-token", "refresh token is not usable");
            return;
        }
        _ = repo.revokeToken(app.store, app.io, token.id) catch {};

        const tokens = issueTokens(app, alloc, token.device_id, token.family_id) catch |err| {
            try http_util.sendError(req, .internal_server_error, "internal", @errorName(err));
            return;
        };
        var response_buffer: [512]u8 = undefined;
        const response = try std.fmt.bufPrint(&response_buffer,
            "{{\"access_token\":\"{s}\",\"refresh_token\":\"{s}\",\"token_type\":\"Bearer\",\"expires_in\":{d}}}",
            .{ tokens.access, tokens.refresh, tokens.expires_in },
        );
        try http_util.json(req, .ok, response);
        return;
    }

    try http_util.sendError(req, .unauthorized, "auth/invalid-token", "unknown refresh token");
}

fn clerkLogin(app: *App, req: *std.http.Server.Request) !void {
    var arena = std.heap.ArenaAllocator.init(app.gpa);
    defer arena.deinit();
    const alloc = arena.allocator();

    const maybe_login = auth.loginClerk(app.cfg, app.store, app.pepper, app.io, req, alloc) catch null;
    const login = maybe_login orelse {
        try http_util.sendError(req, .unauthorized, "auth/invalid-token", "Clerk session could not be verified");
        return;
    };

    const body = try std.fmt.allocPrint(alloc, "{{\"user\":{{\"id\":\"{s}\"}}}}", .{login.user_id});
    try http_util.json(req, .ok, body);
}

fn clerkLogout(app: *App, req: *std.http.Server.Request) !void {
    auth.logout(app.store, app.pepper, app.io, req) catch {};
    try http_util.json(req, .ok, "{\"ok\":true}");
}

fn listDevices(app: *App, req: *std.http.Server.Request) !void {
    var arena = std.heap.ArenaAllocator.init(app.gpa);
    defer arena.deinit();
    const alloc = arena.allocator();

    const user_id = (try webIdentity(app, req, alloc)) orelse {
        try http_util.sendError(req, .unauthorized, "auth/invalid-token", "web authentication is required");
        return;
    };

    app.store.lock(app.io);
    const devices = repo.devicesForUser(app.store, alloc, user_id) catch |err| {
        app.store.unlock(app.io);
        try http_util.sendError(req, .internal_server_error, "internal", @errorName(err));
        return;
    };
    app.store.unlock(app.io);

    var list: std.ArrayList(u8) = .empty;
    try list.appendSlice(alloc, "{\"items\":[");
    for (devices, 0..) |device, index| {
        if (index > 0) try list.appendSlice(alloc, ",");
        app.hub.lock();
        const online = app.hub.deviceOnline(device.id);
        app.hub.unlock();
        const item = try deviceJson(app, alloc, device, online);
        try list.appendSlice(alloc, item);
    }
    try list.appendSlice(alloc, "]}");
    try http_util.json(req, .ok, list.items);
}

const CodeBody = struct { code: ?[]const u8 = null, user_code: ?[]const u8 = null };

fn readCode(app: *App, req: *std.http.Server.Request, alloc: std.mem.Allocator) !?[]const u8 {
    // Headers must be read before the body: the body reader reuses the head buffer.
    const content_type = http_util.header(req, "content-type") orelse "";
    const body = http_util.readBody(req, alloc, max_body) catch return null;
    if (std.mem.indexOf(u8, content_type, "application/x-www-form-urlencoded") != null) {
        return formValue(body, "code");
    }
    const parsed = std.json.parseFromSliceLeaky(CodeBody, alloc, body, .{ .ignore_unknown_fields = true }) catch return null;
    _ = app;
    return parsed.code orelse parsed.user_code;
}

fn formValue(body: []const u8, name: []const u8) ?[]const u8 {
    var pairs = std.mem.splitScalar(u8, body, '&');
    while (pairs.next()) |pair| {
        const eq = std.mem.indexOfScalar(u8, pair, '=') orelse continue;
        if (std.mem.eql(u8, pair[0..eq], name)) return pair[eq + 1 ..];
    }
    return null;
}

fn normalizedHash(app: *App, alloc: std.mem.Allocator, input: []const u8, out: *[64]u8) !?[]const u8 {
    _ = alloc;
    var normalized: [16]u8 = undefined;
    const code = codes.normalizeInto(input, &normalized);
    if (!codes.valid(code)) return null;
    return crypto.codeHash(app.pepper, code, out);
}

fn confirmPairing(app: *App, req: *std.http.Server.Request) !void {
    var arena = std.heap.ArenaAllocator.init(app.gpa);
    defer arena.deinit();
    const alloc = arena.allocator();

    const user_id = (try webIdentity(app, req, alloc)) orelse {
        try http_util.sendError(req, .unauthorized, "auth/invalid-token", "web authentication is required");
        return;
    };
    const input = (try readCode(app, req, alloc)) orelse {
        try http_util.sendError(req, .bad_request, "pair/invalid-code", "a pairing code is required");
        return;
    };
    var hash_buffer: [64]u8 = undefined;
    const hash = (try normalizedHash(app, alloc, input, &hash_buffer)) orelse {
        try http_util.sendError(req, .bad_request, "pair/invalid-code", "the code is not a pairing code");
        return;
    };

    app.store.lock(app.io);
    defer app.store.unlock(app.io);

    const pairing = (repo.pairingByUserCodeHash(app.store, alloc, hash) catch null) orelse {
        try http_util.sendError(req, .not_found, "pair/invalid-code", "no pairing matches that code");
        return;
    };
    const now = clock.nowMs(app.io);
    if (pairing.status == .pending and now > pairing.expires_at) {
        try http_util.sendError(req, .gone, "pair/expired", "the code expired");
        return;
    }
    if (pairing.status != .pending) {
        try http_util.sendError(req, .conflict, "pair/used", "the code was already used");
        return;
    }
    const device = (repo.deviceById(app.store, alloc, pairing.device_id) catch null) orelse {
        try http_util.sendError(req, .not_found, "pair/invalid-code", "the device is gone");
        return;
    };

    var buffer: [1024]u8 = undefined;
    const body = try std.fmt.bufPrint(&buffer,
        "{{\"device\":{s},\"expires_at\":{d},\"user_id\":\"{s}\"}}",
        .{ try summaryJson(app, alloc, device), pairing.expires_at, user_id },
    );
    try http_util.json(req, .ok, body);
}

fn decidePairing(app: *App, req: *std.http.Server.Request, approve: bool) !void {
    var arena = std.heap.ArenaAllocator.init(app.gpa);
    defer arena.deinit();
    const alloc = arena.allocator();

    const content_type = http_util.header(req, "content-type") orelse "";
    const is_form = std.mem.indexOf(u8, content_type, "application/x-www-form-urlencoded") != null;

    const user_id = (try webIdentity(app, req, alloc)) orelse {
        if (is_form) {
            try http_util.html(req, .unauthorized, page("Thiếu quyền", "Hãy mở trang này kèm token hoặc đăng nhập trước."));
        } else {
            try http_util.sendError(req, .unauthorized, "auth/invalid-token", "web authentication is required");
        }
        return;
    };
    const input = (try readCode(app, req, alloc)) orelse {
        try http_util.sendError(req, .bad_request, "pair/invalid-code", "a pairing code is required");
        return;
    };
    var hash_buffer: [64]u8 = undefined;
    const hash = (try normalizedHash(app, alloc, input, &hash_buffer)) orelse {
        try http_util.sendError(req, .bad_request, "pair/invalid-code", "the code is not a pairing code");
        return;
    };

    app.store.lock(app.io);
    defer app.store.unlock(app.io);

    const pairing = (repo.pairingByUserCodeHash(app.store, alloc, hash) catch null) orelse {
        try http_util.sendError(req, .not_found, "pair/invalid-code", "no pairing matches that code");
        return;
    };
    const now = clock.nowMs(app.io);
    if (pairing.status == .pending and now > pairing.expires_at) {
        try http_util.sendError(req, .gone, "pair/expired", "the code expired");
        return;
    }
    if (pairing.status != .pending) {
        try http_util.sendError(req, .conflict, "pair/used", "the code was already used");
        return;
    }

    if (!approve) {
        _ = repo.denyPairing(app.store, app.io, pairing.id) catch {};
        _ = repo.addAudit(app.store, app.io, user_id, pairing.device_id, "pairing.denied", null) catch {};
        if (is_form) {
            try http_util.html(req, .ok, page("Đã từ chối", "Thiết bị đã bị từ chối ghép cặp."));
        } else {
            try http_util.json(req, .ok, "{\"ok\":true,\"status\":\"denied\"}");
        }
        return;
    }

    const approved = repo.approveDevice(app.store, app.io, pairing.device_id, user_id) catch false;
    if (!approved) {
        try http_util.sendError(req, .conflict, "device/not-pending", "the device is no longer waiting");
        return;
    }
    _ = repo.approvePairing(app.store, app.io, pairing.id, user_id) catch {};
    _ = repo.addAudit(app.store, app.io, user_id, pairing.device_id, "pairing.approved", null) catch {};

    if (is_form) {
        try http_util.html(req, .ok, page("Đã duyệt", "Thiết bị đã được ghép cặp. Quay lại DSH để xác nhận."));
        return;
    }
    const device = (repo.deviceById(app.store, alloc, pairing.device_id) catch null) orelse {
        try http_util.json(req, .ok, "{\"ok\":true}");
        return;
    };
    var buffer: [1024]u8 = undefined;
    const body = try std.fmt.bufPrint(&buffer, "{{\"ok\":true,\"device\":{s}}}", .{
        try summaryJson(app, alloc, device),
    });
    try http_util.json(req, .ok, body);
}

fn deviceCommand(app: *App, req: *std.http.Server.Request, device_id: []const u8, command: []const u8) !void {
    var arena = std.heap.ArenaAllocator.init(app.gpa);
    defer arena.deinit();
    const alloc = arena.allocator();

    const user_id = (try webIdentity(app, req, alloc)) orelse {
        try http_util.sendError(req, .unauthorized, "auth/invalid-token", "web authentication is required");
        return;
    };

    app.store.lock(app.io);
    const device = (repo.deviceById(app.store, alloc, device_id) catch null) orelse {
        app.store.unlock(app.io);
        try http_util.sendError(req, .not_found, "device/unknown", "no such device");
        return;
    };

    if (std.mem.eql(u8, command, "approve")) {
        const approved = repo.approveDevice(app.store, app.io, device.id, user_id) catch false;
        app.store.unlock(app.io);
        if (!approved) {
            try http_util.sendError(req, .conflict, "device/not-pending", "the device is not waiting");
            return;
        }
        try http_util.json(req, .ok, "{\"ok\":true,\"status\":\"active\"}");
        return;
    }
    if (std.mem.eql(u8, command, "deny")) {
        _ = repo.setDeviceStatus(app.store, app.io, device.id, .expired) catch {};
        app.store.unlock(app.io);
        try http_util.json(req, .ok, "{\"ok\":true,\"status\":\"expired\"}");
        return;
    }

    // revoke
    _ = repo.setDeviceStatus(app.store, app.io, device.id, .revoked) catch {};
    _ = repo.revokeDeviceTokens(app.store, app.io, device.id) catch 0;
    _ = repo.addAudit(app.store, app.io, user_id, device.id, "device.revoked", null) catch {};
    app.store.unlock(app.io);

    app.hub.lock();
    app.hub.disconnectDevice(device.id, 4003, "device was revoked");
    app.hub.unlock();

    try http_util.json(req, .ok, "{\"ok\":true,\"status\":\"revoked\"}");
}

// ------------------------------------------------------------- pair page --

fn pairPage(app: *App, req: *std.http.Server.Request) !void {
    var arena = std.heap.ArenaAllocator.init(app.gpa);
    defer arena.deinit();
    const alloc = arena.allocator();

    var token_buffer: [256]u8 = undefined;
    const token = http_util.query(req, "token", &token_buffer);

    const identity = try webIdentity(app, req, alloc);
    if (identity == null) {
        try http_util.html(req, .unauthorized, page("Cần xác thực", "Mở trang này từ WebChat đã đăng nhập, hoặc thêm token vào đường dẫn."));
        return;
    }

    var code_buffer: [32]u8 = undefined;
    const code = http_util.query(req, "code", &code_buffer) orelse {
        try http_util.html(req, .ok, pairForm(token));
        return;
    };

    var normalized: [16]u8 = undefined;
    const normalized_code = codes.normalizeInto(code, &normalized);
    if (!codes.valid(normalized_code)) {
        try http_util.html(req, .bad_request, pairFormWithError(token, "Mã không hợp lệ. Kiểm tra lại trên màn hình DSH."));
        return;
    }

    var hash_buffer: [64]u8 = undefined;
    const hash = crypto.codeHash(app.pepper, normalized_code, &hash_buffer);

    app.store.lock(app.io);
    defer app.store.unlock(app.io);

    const pairing = (repo.pairingByUserCodeHash(app.store, alloc, hash) catch null) orelse {
        try http_util.html(req, .not_found, pairFormWithError(token, "Không tìm thấy mã này. Mã có thể đã hết hạn."));
        return;
    };
    if (pairing.status != .pending or clock.nowMs(app.io) > pairing.expires_at) {
        try http_util.html(req, .conflict, pairFormWithError(token, "Mã đã dùng hoặc đã hết hạn. Tạo mã mới trên DSH."));
        return;
    }
    const device = (repo.deviceById(app.store, alloc, pairing.device_id) catch null) orelse {
        try http_util.html(req, .not_found, pairFormWithError(token, "Thiết bị không còn tồn tại."));
        return;
    };

    var fingerprint_buffer: [crypto.fingerprint_len]u8 = undefined;
    const der = crypto.decodePublicKey(alloc, device.pubkey) catch null;
    const fingerprint = if (der) |bytes| crypto.fingerprint(&fingerprint_buffer, bytes) else "SHA256:";

    try http_util.html(req, .ok, try pairConfirmPage(
        alloc,
        token,
        normalized_code,
        device.name,
        device.platform,
        fingerprint,
    ));
}

fn page(title: []const u8, message: []const u8) []const u8 {
    _ = title;
    _ = message;
    return "<!doctype html><meta charset=\"utf-8\"><title>DSH Web Remote</title>" ++
        "<body style=\"font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem\">" ++
        "<h1>DSH Web Remote</h1><p>Trang ghép cặp.</p></body>";
}

fn pairForm(token: ?[]const u8) []const u8 {
    _ = token;
    return "<!doctype html><meta charset=\"utf-8\"><title>DSH Web Remote</title>" ++
        "<body style=\"font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem\">" ++
        "<h1>Ghép cặp thiết bị</h1><p>Nhập mã hiển thị trên máy DSH.</p></body>";
}

fn pairFormWithError(token: ?[]const u8, message: []const u8) []const u8 {
    _ = token;
    _ = message;
    return pairForm(null);
}

fn pairConfirmPage(
    alloc: std.mem.Allocator,
    token: ?[]const u8,
    code: []const u8,
    name: []const u8,
    platform: []const u8,
    fingerprint: []const u8,
) ![]const u8 {
    const token_query = if (token) |value| try std.fmt.allocPrint(alloc, "?token={s}", .{value}) else "";
    const safe_name = try escapeJson(alloc, name);
    const safe_platform = try escapeJson(alloc, platform);
    const safe_code = try escapeJson(alloc, code);
    return std.fmt.allocPrint(alloc,
        "<!doctype html><meta charset=\"utf-8\"><title>Duyệt thiết bị</title>" ++
            "<body style=\"font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem\">" ++
            "<h1>Duyệt thiết bị</h1>" ++
            "<p><strong>{s}</strong> ({s})</p><p>Fingerprint: <code>{s}</code></p>" ++
            "<form method=\"post\" action=\"/v1/pair/approve{s}\">" ++
            "<input type=\"hidden\" name=\"code\" value=\"{s}\">" ++
            "<button type=\"submit\" style=\"font-size:1.1rem;padding:.6rem 1.2rem\">Duyệt thiết bị</button>" ++
            "</form>" ++
            "<form method=\"post\" action=\"/v1/pair/deny{s}\" style=\"margin-top:.5rem\">" ++
            "<input type=\"hidden\" name=\"code\" value=\"{s}\">" ++
            "<button type=\"submit\" style=\"font-size:1.1rem;padding:.6rem 1.2rem\">Từ chối</button>" ++
            "</form></body>",
        .{ safe_name, safe_platform, fingerprint, token_query, safe_code, token_query, safe_code },
    );
}



