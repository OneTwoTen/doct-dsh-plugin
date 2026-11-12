//! Web authentication for the relay's own endpoints:
//! - `dev` mode compares a shared token (Bearer header or `?token=`);
//! - `clerk` mode reads the relay session cookie, and exchanges a Clerk session
//!   JWT once at `POST /v1/auth/clerk`.

const std = @import("std");
const clerk = @import("clerk.zig");
const clock = @import("clock.zig");
const config_mod = @import("config.zig");
const crypto = @import("crypto.zig");
const http_util = @import("http_util.zig");
const ids = @import("ids.zig");
const repo = @import("repo.zig");
const store_mod = @import("store.zig");

pub const cookie_name = "dsh_session";

pub fn bearerToken(req: *const std.http.Server.Request) ?[]const u8 {
    const value = http_util.header(req, "authorization") orelse return null;
    if (value.len < 7 or !std.ascii.eqlIgnoreCase(value[0..7], "bearer ")) return null;
    return std.mem.trim(u8, value[7..], " \t");
}

/// Resolve the web user for a request, or null when unauthenticated.
pub fn webUser(
    cfg: *const config_mod.Config,
    store: *store_mod.Store,
    pepper: []const u8,
    io: std.Io,
    req: *const std.http.Server.Request,
    alloc: std.mem.Allocator,
) !?[]const u8 {
    switch (cfg.auth.mode) {
        .dev => {
            var query_buffer: [256]u8 = undefined;
            const token = bearerToken(req) orelse http_util.query(req, "token", &query_buffer) orelse return null;
            if (cfg.auth.dev_token.len == 0) return null;
            if (!crypto.timingSafeEqual(token, cfg.auth.dev_token)) return null;
            return try repo.ensureDevUser(store, io, alloc);
        },
        .clerk => {
            var cookie_buffer: [256]u8 = undefined;
            const token = http_util.cookie(req, cookie_name, &cookie_buffer) orelse return null;
            return sessionUser(store, pepper, token, io, alloc);
        },
    }
}

fn sessionUser(
    store: *store_mod.Store,
    pepper: []const u8,
    token: []const u8,
    io: std.Io,
    alloc: std.mem.Allocator,
) !?[]const u8 {
    var hash_buffer: [64]u8 = undefined;
    const hash = crypto.tokenHash(pepper, token, &hash_buffer);
    const session = (try repo.webSessionByHash(store, alloc, hash, clock.nowMs(io))) orelse return null;
    return session.user_id;
}

pub const Login = struct {
    user_id: []const u8,
    cookie: []const u8,
};

/// Exchange a Clerk session JWT for a relay session cookie.
pub fn loginClerk(
    cfg: *const config_mod.Config,
    store: *store_mod.Store,
    pepper: []const u8,
    io: std.Io,
    req: *std.http.Server.Request,
    alloc: std.mem.Allocator,
) !?Login {
    if (cfg.auth.mode != .clerk) return null;
    const jwt = bearerToken(req) orelse return null;

    const claims = clerk.decodeClaims(alloc, jwt) catch return null;
    const now_s = @divTrunc(clock.nowMs(io), 1000);
    clerk.validateClaims(claims, cfg.auth.clerk_issuer, cfg.auth.clerk_authorized_parties, now_s) catch return null;

    const session = clerk.fetchSession(io, alloc, cfg.auth.clerk_secret_key, claims.sid) catch return null;
    if (!std.mem.eql(u8, session.status, "active")) return null;
    if (!std.mem.eql(u8, session.user_id, claims.sub)) return null;

    const user_id = try repo.upsertClerkUser(store, io, alloc, claims.sub, null);

    const token = try ids.webSessionToken(alloc, io);
    var hash_buffer: [64]u8 = undefined;
    const hash = crypto.tokenHash(pepper, token, &hash_buffer);
    const expires_at = clock.nowMs(io) + cfg.webSessionTtlMs();
    _ = try repo.insertWebSession(store, io, alloc, user_id, hash, expires_at, http_util.header(req, "user-agent"), null);

    const cookie = try std.fmt.allocPrint(alloc, "{s}={s}; HttpOnly; Path=/; SameSite=Lax; Max-Age={d}{s}", .{
        cookie_name,
        token,
        cfg.web_session_ttl_seconds,
        if (cfg.auth.cookie_secure) "; Secure" else "",
    });
    return .{ .user_id = user_id, .cookie = cookie };}

/// Delete the session row behind a cookie, if any.
pub fn logout(
    store: *store_mod.Store,
    pepper: []const u8,
    io: std.Io,
    req: *const std.http.Server.Request,
) !void {
    var cookie_buffer: [256]u8 = undefined;
    const token = http_util.cookie(req, cookie_name, &cookie_buffer) orelse return;
    var hash_buffer: [64]u8 = undefined;
    const hash = crypto.tokenHash(pepper, token, &hash_buffer);
    _ = try repo.deleteWebSession(store, hash);
    _ = io;
}

pub fn clearCookie() []const u8 {
    return cookie_name ++ "=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0";
}

