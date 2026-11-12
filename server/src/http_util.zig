//! Small helpers over `std.http.Server.Request`: responses, bodies, headers,
//! cookies, query strings, and the client IP.

const std = @import("std");

pub const max_header_count = 4;

pub fn respond(
    req: *std.http.Server.Request,
    status: std.http.Status,
    content_type: []const u8,
    body: []const u8,
    extra: []const std.http.Header,
) !void {
    var headers: [max_header_count]std.http.Header = undefined;
    var count: usize = 0;
    headers[count] = .{ .name = "content-type", .value = content_type };
    count += 1;
    headers[count] = .{ .name = "cache-control", .value = "no-store" };
    count += 1;
    for (extra) |item| {
        if (count == headers.len) break;
        headers[count] = item;
        count += 1;
    }
    try req.respond(body, .{ .status = status, .extra_headers = headers[0..count] });
}

pub fn json(req: *std.http.Server.Request, status: std.http.Status, body: []const u8) !void {
    try respond(req, status, "application/json; charset=utf-8", body, &.{});
}

pub fn html(req: *std.http.Server.Request, status: std.http.Status, body: []const u8) !void {
    try respond(req, status, "text/html; charset=utf-8", body, &.{});
}

pub fn text(req: *std.http.Server.Request, status: std.http.Status, body: []const u8) !void {
    try respond(req, status, "text/plain; charset=utf-8", body, &.{});
}

/// `{"error":{"code":"…","message":"…"}}` in the caller's buffer.
pub fn errorBody(buf: []u8, code: []const u8, message: []const u8) []const u8 {
    return std.fmt.bufPrint(buf, "{{\"error\":{{\"code\":\"{s}\",\"message\":\"{s}\"}}}}", .{ code, message }) catch
        "{\"error\":{\"code\":\"internal\",\"message\":\"error\"}}";
}

pub fn sendError(req: *std.http.Server.Request, status: std.http.Status, code: []const u8, message: []const u8) !void {
    var buf: [512]u8 = undefined;
    try json(req, status, errorBody(&buf, code, message));
}

/// Read the whole request body, refusing anything above `limit`.
pub fn readBody(req: *std.http.Server.Request, alloc: std.mem.Allocator, limit: usize) ![]const u8 {
    var buffer: [8192]u8 = undefined;
    const reader = try req.readerExpectContinue(&buffer);
    return reader.allocRemaining(alloc, .limited(limit));
}

pub fn header(req: *const std.http.Server.Request, name: []const u8) ?[]const u8 {
    var it = req.iterateHeaders();
    while (it.next()) |entry| {
        if (std.ascii.eqlIgnoreCase(entry.name, name)) return entry.value;
    }
    return null;
}

/// Value of one query parameter from the request target, copied into `out`.
pub fn query(req: *const std.http.Server.Request, name: []const u8, out: []u8) ?[]const u8 {
    const target = req.head.target;
    const mark = std.mem.indexOfScalar(u8, target, '?') orelse return null;
    var pairs = std.mem.splitScalar(u8, target[mark + 1 ..], '&');
    while (pairs.next()) |pair| {
        const eq = std.mem.indexOfScalar(u8, pair, '=') orelse continue;
        if (!std.mem.eql(u8, pair[0..eq], name)) continue;
        const value = pair[eq + 1 ..];
        const n = @min(value.len, out.len);
        @memcpy(out[0..n], value[0..n]);
        return out[0..n];
    }
    return null;
}

/// Value of one cookie, copied into `out`.
pub fn cookie(req: *const std.http.Server.Request, name: []const u8, out: []u8) ?[]const u8 {
    const header_value = header(req, "cookie") orelse return null;
    var parts = std.mem.splitScalar(u8, header_value, ';');
    while (parts.next()) |part| {
        const trimmed = std.mem.trim(u8, part, " \t");
        const eq = std.mem.indexOfScalar(u8, trimmed, '=') orelse continue;
        if (!std.mem.eql(u8, trimmed[0..eq], name)) continue;
        const value = trimmed[eq + 1 ..];
        const n = @min(value.len, out.len);
        @memcpy(out[0..n], value[0..n]);
        return out[0..n];
    }
    return null;
}

/// First hop of `x-forwarded-for` (Caddy sets it); `local` otherwise.
pub fn clientIp(req: *const std.http.Server.Request) []const u8 {
    const forwarded = header(req, "x-forwarded-for") orelse return "local";
    const comma = std.mem.indexOfScalar(u8, forwarded, ',') orelse return std.mem.trim(u8, forwarded, " \t");
    return std.mem.trim(u8, forwarded[0..comma], " \t");
}

test "query and cookie parsing" {
    _ = std.http;
}

