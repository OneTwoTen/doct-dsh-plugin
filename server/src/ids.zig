//! Identifiers and opaque tokens. Randomness comes from `io.random`, the
//! process-wide CSPRNG, so no thread-local state is shared.

const std = @import("std");

pub const device_id_bytes = 8;
pub const token_bytes = 32;

fn randomBytes(io: std.Io, buffer: []u8) void {
    io.random(buffer);
}

/// `prefix` + hex bytes, e.g. `dev_9f2a…`.
pub fn hexId(alloc: std.mem.Allocator, io: std.Io, prefix: []const u8, count: usize) ![]u8 {
    const raw = try alloc.alloc(u8, count);
    defer alloc.free(raw);
    randomBytes(io, raw);

    const digits = "0123456789abcdef";
    const out = try alloc.alloc(u8, prefix.len + count * 2);
    @memcpy(out[0..prefix.len], prefix);
    for (raw, 0..) |byte, i| {
        out[prefix.len + i * 2] = digits[byte >> 4];
        out[prefix.len + i * 2 + 1] = digits[byte & 0x0f];
    }
    return out;
}

/// `prefix` + 32 random bytes, URL-safe base64 without padding.
pub fn token(alloc: std.mem.Allocator, io: std.Io, prefix: []const u8) ![]u8 {
    var raw: [token_bytes]u8 = undefined;
    randomBytes(io, &raw);
    const encoded_len = std.base64.url_safe_no_pad.Encoder.calcSize(token_bytes);
    const out = try alloc.alloc(u8, prefix.len + encoded_len);
    @memcpy(out[0..prefix.len], prefix);
    _ = std.base64.url_safe_no_pad.Encoder.encode(out[prefix.len..], &raw);
    return out;
}

pub fn deviceCode(alloc: std.mem.Allocator, io: std.Io) ![]u8 {
    return token(alloc, io, "dc_");
}

pub fn accessToken(alloc: std.mem.Allocator, io: std.Io) ![]u8 {
    return token(alloc, io, "at_");
}

pub fn refreshToken(alloc: std.mem.Allocator, io: std.Io) ![]u8 {
    return token(alloc, io, "rt_");
}

pub fn webSessionToken(alloc: std.mem.Allocator, io: std.Io) ![]u8 {
    return token(alloc, io, "ws_");
}

pub fn deviceId(alloc: std.mem.Allocator, io: std.Io) ![]u8 {
    return hexId(alloc, io, "dev_", device_id_bytes);
}

pub fn userId(alloc: std.mem.Allocator, io: std.Io) ![]u8 {
    return hexId(alloc, io, "usr_", 6);
}

pub fn pairingId(alloc: std.mem.Allocator, io: std.Io) ![]u8 {
    return hexId(alloc, io, "pr_", 8);
}

pub fn tokenRowId(alloc: std.mem.Allocator, io: std.Io) ![]u8 {
    return hexId(alloc, io, "tk_", 8);
}

pub fn sessionRowId(alloc: std.mem.Allocator, io: std.Io) ![]u8 {
    return hexId(alloc, io, "se_", 8);
}

pub fn familyId(alloc: std.mem.Allocator, io: std.Io) ![]u8 {
    return hexId(alloc, io, "fam_", 8);
}

test "identifiers carry their prefix and the expected length" {
    const alloc = std.testing.allocator;
    const io = std.testing.io;

    const device = try deviceId(alloc, io);
    defer alloc.free(device);
    try std.testing.expect(std.mem.startsWith(u8, device, "dev_"));
    try std.testing.expectEqual(@as(usize, 4 + device_id_bytes * 2), device.len);

    const access = try accessToken(alloc, io);
    defer alloc.free(access);
    try std.testing.expect(std.mem.startsWith(u8, access, "at_"));
    try std.testing.expectEqual(@as(usize, 3 + 43), access.len);
}

test "two identifiers never collide" {
    const alloc = std.testing.allocator;
    const io = std.testing.io;

    const a = try token(alloc, io, "x_");
    defer alloc.free(a);
    const b = try token(alloc, io, "x_");
    defer alloc.free(b);
    try std.testing.expect(!std.mem.eql(u8, a, b));
}
