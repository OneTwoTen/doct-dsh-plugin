//! One accepted TCP connection: the HTTP API loop, or the WebSocket session
//! after an upgrade. The peer thread owns the socket and frees its state; the
//! hub only writes to connections while holding its mutex.

const std = @import("std");
const api = @import("api.zig");
const app_mod = @import("app.zig");
const auth = @import("auth.zig");
const clock = @import("clock.zig");
const conn_mod = @import("conn.zig");
const crypto = @import("crypto.zig");
const http_util = @import("http_util.zig");
const hub_mod = @import("hub.zig");
const repo = @import("repo.zig");

const App = app_mod.App;
const Conn = conn_mod.Conn;
const Envelope = hub_mod.Envelope;

const Role = union(enum) {
    web: []const u8,
    device: repo.Device,
};

pub fn handle(app: *App, stream: std.Io.net.Stream) void {
    defer stream.close(app.io);

    var read_buffer: [16 * 1024]u8 = undefined;
    var write_buffer: [16 * 1024]u8 = undefined;
    var reader = stream.reader(app.io, &read_buffer);
    var writer = stream.writer(app.io, &write_buffer);
    var server: std.http.Server = .init(&reader.interface, &writer.interface);

    while (true) {
        var request = server.receiveHead() catch return;
        const keep_alive = request.head.keep_alive;
        const target = request.head.target;

        if (std.mem.startsWith(u8, target, "/ws") and (target.len == 3 or target[3] == '?')) {
            serveWebSocket(app, stream, &request) catch {};
            return;
        }

        const handled = api.route(app, &request) catch |err| {
            http_util.sendError(&request, .internal_server_error, "internal", @errorName(err)) catch {};
            return;
        };
        if (!handled) {
            http_util.sendError(&request, .not_found, "relay/not-found", "not found") catch return;
        }
        if (!keep_alive) return;
    }
}

fn parseProtocols(value: []const u8, out: *[8][]const u8, count: *usize) void {
    var parts = std.mem.splitScalar(u8, value, ',');
    while (parts.next()) |part| {
        if (count.* == out.len) return;
        out[count.*] = std.mem.trim(u8, part, " \t");
        count.* += 1;
    }
}

fn findPrefix(protocols: []const []const u8, prefix: []const u8) ?[]const u8 {
    for (protocols) |protocol| {
        if (std.mem.startsWith(u8, protocol, prefix)) return protocol[prefix.len..];
    }
    return null;
}

fn contains(protocols: []const []const u8, wanted: []const u8) bool {
    for (protocols) |protocol| {
        if (std.mem.eql(u8, protocol, wanted)) return true;
    }
    return false;
}

fn serveWebSocket(app: *App, stream: std.Io.net.Stream, request: *std.http.Server.Request) !void {
    var protocol_storage: [8][]const u8 = undefined;
    var protocol_count: usize = 0;
    if (http_util.header(request, "sec-websocket-protocol")) |value| {
        parseProtocols(value, &protocol_storage, &protocol_count);
    }
    const protocols = protocol_storage[0..protocol_count];
    if (!contains(protocols, "dsh-remote.v1")) {
        try http_util.sendError(request, .bad_request, "bad-frame", "dsh-remote.v1 subprotocol is required");
        return;
    }

    var role: Role = undefined;
    var cookie_buffer: [256]u8 = undefined;

    if (findPrefix(protocols, "webbearer.")) |token| {
        if (app.cfg.auth.mode != .dev or app.cfg.auth.dev_token.len == 0 or
            !crypto.timingSafeEqual(token, app.cfg.auth.dev_token))
        {
            try http_util.sendError(request, .unauthorized, "auth/invalid-token", "invalid web token");
            return;
        }
        const user_id = try repo.ensureDevUser(app.store, app.io, app.gpa);
        role = .{ .web = user_id };
    } else if (http_util.cookie(request, auth.cookie_name, &cookie_buffer)) |session_token| {
        var hash_buffer: [64]u8 = undefined;
        const hash = crypto.tokenHash(app.pepper, session_token, &hash_buffer);
        const session = (try repo.webSessionByHash(app.store, app.gpa, hash, clock.nowMs(app.io))) orelse {
            try http_util.sendError(request, .unauthorized, "auth/invalid-token", "session is not valid");
            return;
        };
        role = .{ .web = session.user_id };
    } else if (findPrefix(protocols, "bearer.")) |access_token| {
        const device_id = findPrefix(protocols, "device.") orelse {
            try http_util.sendError(request, .unauthorized, "auth/invalid-token", "device id is required");
            return;
        };
        var hash_buffer: [64]u8 = undefined;
        const hash = crypto.tokenHash(app.pepper, access_token, &hash_buffer);
        const device = (try repo.deviceForAccessToken(app.store, app.gpa, hash, clock.nowMs(app.io))) orelse {
            try http_util.sendError(request, .unauthorized, "auth/invalid-token", "access token is not valid");
            return;
        };
        if (!std.mem.eql(u8, device.id, device_id)) {
            try http_util.sendError(request, .unauthorized, "auth/invalid-token", "device id does not match the token");
            return;
        }
        role = .{ .device = device };
    } else {
        try http_util.sendError(request, .unauthorized, "auth/invalid-token", "no credentials on the upgrade");
        return;
    }

    const key = switch (request.upgradeRequested()) {
        .websocket => |value| value orelse {
            try http_util.sendError(request, .bad_request, "bad-frame", "missing sec-websocket-key");
            return;
        },
        else => {
            try http_util.sendError(request, .bad_request, "bad-frame", "not a websocket upgrade");
            return;
        },
    };

    var socket = try request.respondWebSocket(.{
        .key = key,
        .extra_headers = &.{.{ .name = "sec-websocket-protocol", .value = "dsh-remote.v1" }},
    });
    try socket.flush();

    var conn = Conn{
        .input = socket.input,
        .output = socket.output,
        .stream = stream,
        .max_frame_bytes = app.cfg.max_frame_bytes,
    };

    switch (role) {
        .web => |user_id| {
            app.hub.lock();
            app.hub.registerWeb(&conn, user_id) catch {
                app.hub.unlock();
                return;
            };
            app.hub.unlock();
            defer {
                app.hub.lock();
                app.hub.unregister(&conn);
                app.hub.unlock();
            }
            app.hub.lock();
            app.hub.sendHelloOk(&conn);
            app.hub.unlock();
            frameLoop(app, &conn, .web, null);
        },
        .device => |device| {
            app.hub.lock();
            app.hub.registerDevice(&conn, device) catch {
                app.hub.unlock();
                return;
            };
            app.hub.unlock();
            defer {
                app.hub.lock();
                app.hub.unregister(&conn);
                app.hub.unlock();
            }
            frameLoop(app, &conn, .device, device.id);
        },
    }
}

fn frameLoop(app: *App, conn: *Conn, role: std.meta.Tag(Role), device_id: ?[]const u8) void {
    var authenticated = role == .web;
    while (true) {
        var arena = std.heap.ArenaAllocator.init(app.gpa);
        defer arena.deinit();
        const alloc = arena.allocator();

        const frame = conn.readFrame(alloc) catch |err| {
            conn.writeClose(closeCode(err), @errorName(err));
            return;
        };
        defer alloc.free(frame.payload);

        switch (frame.opcode) {
            .ping => {
                app.hub.lock();
                conn.writePong(frame.payload) catch {};
                app.hub.unlock();
                continue;
            },
            .pong => continue,
            .close => return,
            .text => {},
            else => {
                conn.writeClose(1003, "binary frames are not supported");
                return;
            },
        }

        const envelope = std.json.parseFromSliceLeaky(Envelope, alloc, frame.payload, .{
            .ignore_unknown_fields = true,
        }) catch {
            conn.writeClose(1002, "bad frame");
            return;
        };

        if (role == .device and !authenticated) {
            if (!std.mem.eql(u8, envelope.t, "hello")) {
                conn.writeClose(4001, "hello must be the first frame");
                return;
            }
            app.hub.lock();
            const outcome = app.hub.authenticateHello(conn, device_id.?, &envelope);
            app.hub.unlock();
            outcome catch |err| {
                conn.writeClose(4001, @errorName(err));
                return;
            };
            authenticated = true;
            continue;
        }

        app.hub.lock();
        defer app.hub.unlock();
        if (role == .web) {
            app.hub.handleWebFrame(conn, &envelope, frame.payload, clock.nowMs(app.io)) catch {};
        } else {
            app.hub.handleDeviceFrame(conn, device_id.?, &envelope, frame.payload, clock.nowMs(app.io)) catch {};
        }
    }
}

fn closeCode(err: anyerror) u16 {
    return switch (err) {
        error.FrameTooLarge => 1009,
        error.UnmaskedClientFrame, error.ReservedBitsSet, error.BadControlFrame, error.ControlPayloadTooLarge => 1002,
        error.Closed => 1000,
        else => 1001,
    };
}
