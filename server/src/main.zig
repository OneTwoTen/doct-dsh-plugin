//! `dsh-relay` entry point: configuration, storage, hub, and the listener.

const std = @import("std");
const app_mod = @import("app.zig");
const clock = @import("clock.zig");
const config_mod = @import("config.zig");
const hub_mod = @import("hub.zig");
const ids = @import("ids.zig");
const server = @import("server.zig");
const store_mod = @import("store.zig");

const log = std.log.scoped(.relay);

const Options = struct {
    config_path: ?[]const u8 = null,
    host: ?[]const u8 = null,
    port: ?u16 = null,
    data_dir: ?[]const u8 = null,
    public_url: ?[]const u8 = null,
};

pub fn main(init: std.process.Init) !void {
    const arena = init.arena.allocator();
    const io = init.io;
    const args = try init.minimal.args.toSlice(arena);

    const options = parseArgs(args) catch |err| {
        if (err == error.HelpRequested) {
            printUsage();
            return;
        }
        if (err == error.VersionRequested) {
            std.debug.print("dsh-relay {s}\n", .{app_mod.App.version});
            return;
        }
        log.err("invalid arguments: {t}", .{err});
        printUsage();
        return;
    };

    var cfg = config_mod.Config{};
    if (options.config_path) |path| {
        cfg = config_mod.Config.load(arena, io, path) catch |err| {
            log.err("cannot load {s}: {t}", .{ path, err });
            return err;
        };
    }

    if (options.host) |host| cfg.listen_host = host;
    if (options.port) |port| cfg.listen_port = port;
    if (options.data_dir) |dir| cfg.data_dir = dir;
    if (options.public_url) |url| cfg.public_url = url;

    if (cfg.public_url.len == 0) {
        cfg.public_url = try std.fmt.allocPrint(arena, "http://{s}:{d}", .{
            cfg.listen_host, cfg.listen_port,
        });
    }
    try cfg.validate();

    if (cfg.auth.mode == .dev and cfg.auth.dev_token.len == 0) {
        cfg.auth.dev_token = try ids.token(arena, io, "dev_");
        log.warn("auth.dev_token is empty; using a one-run token: {s}", .{cfg.auth.dev_token});
    }

    std.Io.Dir.cwd().createDirPath(io, cfg.data_dir) catch |err| {
        log.err("cannot create data dir {s}: {t}", .{ cfg.data_dir, err });
        return err;
    };

    const db_path = try cfg.databasePath(arena);
    var store = store_mod.Store.open(arena, db_path) catch |err| {
        log.err("cannot open {s}: {t}", .{ db_path, err });
        return err;
    };

    const pepper = try store.pepper(io, arena);

    var hub = hub_mod.Hub.init(
        io,
        arena,
        &store,
        pepper,
        cfg.max_frame_bytes,
        cfg.max_streams_per_device,
        cfg.max_inflight_per_device,
        cfg.request_timeout_ms,
        cfg.heartbeat_ms,
    );

    var app = app_mod.App{
        .io = io,
        .gpa = arena,
        .arena = arena,
        .cfg = &cfg,
        .store = &store,
        .hub = &hub,
        .pepper = pepper,
        .started_at_ms = clock.nowMs(io),
    };

    log.info("dsh-relay {s} starting; data in {s}", .{ app_mod.App.version, cfg.data_dir });
    try server.run(&app);
}

fn parseArgs(args: []const []const u8) !Options {
    var options = Options{};
    var index: usize = 1;
    while (index < args.len) : (index += 1) {
        const arg = args[index];
        if (std.mem.eql(u8, arg, "--help") or std.mem.eql(u8, arg, "-h")) return error.HelpRequested;
        if (std.mem.eql(u8, arg, "--version")) return error.VersionRequested;
        if (std.mem.eql(u8, arg, "--config")) {
            index += 1;
            options.config_path = value(args, index) orelse return error.MissingValue;
        } else if (std.mem.eql(u8, arg, "--host")) {
            index += 1;
            options.host = value(args, index) orelse return error.MissingValue;
        } else if (std.mem.eql(u8, arg, "--port")) {
            index += 1;
            const text = value(args, index) orelse return error.MissingValue;
            options.port = std.fmt.parseInt(u16, text, 10) catch return error.BadPort;
        } else if (std.mem.eql(u8, arg, "--data-dir")) {
            index += 1;
            options.data_dir = value(args, index) orelse return error.MissingValue;
        } else if (std.mem.eql(u8, arg, "--public-url")) {
            index += 1;
            options.public_url = value(args, index) orelse return error.MissingValue;
        } else {
            return error.UnknownArgument;
        }
    }
    return options;
}

fn value(args: []const []const u8, index: usize) ?[]const u8 {
    if (index >= args.len) return null;
    return args[index];
}

fn printUsage() void {
    std.debug.print(
        \\dsh-relay {s} — Web Remote relay (protocol v1)
        \\
        \\Usage: dsh-relay [options]
        \\  --config <path>      JSON config file
        \\  --host <addr>        listen address (default 127.0.0.1)
        \\  --port <n>           listen port (default 8787)
        \\  --data-dir <path>    SQLite and state directory
        \\  --public-url <url>   origin used in verification_uri
        \\  --version            print the version
        \\  -h, --help           this message
        \\
    , .{app_mod.App.version});
}
