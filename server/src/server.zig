//! Listener, accept loop, and the periodic sweeper.

const std = @import("std");
const app_mod = @import("app.zig");
const clock = @import("clock.zig");
const peer = @import("peer.zig");

const log = std.log.scoped(.relay);

pub fn run(app: *app_mod.App) !void {
    const address = try std.Io.net.IpAddress.parse(app.cfg.listen_host, app.cfg.listen_port);
    var listener = try address.listen(app.io, .{ .reuse_address = true });
    defer listener.deinit(app.io);

    log.info("listening on {s}:{d} (public {s})", .{
        app.cfg.listen_host, app.cfg.listen_port, app.cfg.public_url,
    });

    const sweeper = try std.Thread.spawn(.{}, sweepLoop, .{app});
    sweeper.detach();

    while (true) {
        const stream = listener.accept(app.io) catch |err| {
            log.warn("accept failed: {t}", .{err});
            continue;
        };
        const thread = std.Thread.spawn(.{}, peer.handle, .{ app, stream }) catch {
            stream.close(app.io);
            continue;
        };
        thread.detach();
    }
}

fn sweepLoop(app: *app_mod.App) void {
    while (true) {
        std.Io.sleep(app.io, std.Io.Duration.fromMilliseconds(5000), .awake) catch {};
        app.hub.lock();
        app.hub.sweep(clock.nowMs(app.io));
        app.hub.unlock();
    }
}

