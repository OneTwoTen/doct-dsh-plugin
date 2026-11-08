//! RFC 6455 frame codec, server side only.
//!
//! Clients must mask; server frames are never masked. Control frames are never
//! fragmented and never longer than 125 bytes. Payloads above
//! `max_payload_bytes` are refused before any allocation happens.

const std = @import("std");

pub const Opcode = enum(u4) {
    continuation = 0x0,
    text = 0x1,
    binary = 0x2,
    close = 0x8,
    ping = 0x9,
    pong = 0xa,
    _,
};

pub const max_control_payload = 125;
pub const max_header_len = 14;

pub const Header = struct {
    fin: bool,
    opcode: Opcode,
    masked: bool,
    len: usize,
    mask: [4]u8,
    /// Bytes of the header, leaving `len` masked bytes of payload after it.
    size: usize,
};

pub const ParseError = error{
    Incomplete,
    ReservedBitsSet,
    UnmaskedClientFrame,
    BadControlFrame,
    ControlPayloadTooLarge,
    FrameTooLarge,
};

pub fn parseHeader(data: []const u8, max_payload_bytes: usize) ParseError!Header {
    if (data.len < 2) return error.Incomplete;
    const b0 = data[0];
    const b1 = data[1];
    if (b0 & 0x70 != 0) return error.ReservedBitsSet;

    const fin = b0 & 0x80 != 0;
    const opcode: Opcode = @enumFromInt(b0 & 0x0f);
    const masked = b1 & 0x80 != 0;

    var payload_len: usize = b1 & 0x7f;
    var offset: usize = 2;
    if (payload_len == 126) {
        if (data.len < 4) return error.Incomplete;
        payload_len = std.mem.readInt(u16, data[2..4], .big);
        offset = 4;
    } else if (payload_len == 127) {
        if (data.len < 10) return error.Incomplete;
        const wide = std.mem.readInt(u64, data[2..10], .big);
        if (wide > max_payload_bytes) return error.FrameTooLarge;
        payload_len = @intCast(wide);
        offset = 10;
    }
    if (payload_len > max_payload_bytes) return error.FrameTooLarge;

    const control = switch (opcode) {
        .close, .ping, .pong => true,
        else => false,
    };
    if (control) {
        if (!fin) return error.BadControlFrame;
        if (payload_len > max_control_payload) return error.ControlPayloadTooLarge;
    }

    // Every client-to-server frame must be masked (RFC 6455 §5.1).
    if (!masked) return error.UnmaskedClientFrame;
    if (data.len < offset + 4) return error.Incomplete;
    const mask: [4]u8 = data[offset..][0..4].*;
    offset += 4;

    return .{
        .fin = fin,
        .opcode = opcode,
        .masked = masked,
        .len = payload_len,
        .mask = mask,
        .size = offset,
    };
}

pub fn unmask(payload: []u8, mask: [4]u8) void {
    for (payload, 0..) |*byte, i| byte.* ^= mask[i & 3];
}

pub fn headerSizeFor(payload_len: usize) usize {
    return if (payload_len < 126) 2 else if (payload_len <= 0xffff) 4 else 10;
}

/// Write a server frame header and return the slice written.
pub fn writeServerHeader(out: []u8, opcode: Opcode, payload_len: usize) []const u8 {
    std.debug.assert(out.len >= 10);
    out[0] = 0x80 | @as(u8, @intCast(@intFromEnum(opcode)));
    if (payload_len < 126) {
        out[1] = @intCast(payload_len);
        return out[0..2];
    }
    if (payload_len <= 0xffff) {
        out[1] = 126;
        std.mem.writeInt(u16, out[2..4], @intCast(payload_len), .big);
        return out[0..4];
    }
    out[1] = 127;
    std.mem.writeInt(u64, out[2..10], payload_len, .big);
    return out[0..10];
}

/// Close frame payload: a two-byte code followed by a short reason.
pub fn closePayload(out: []u8, code: u16, reason: []const u8) []const u8 {
    std.debug.assert(out.len >= 2);
    const n = @min(reason.len, max_control_payload - 2);
    std.mem.writeInt(u16, out[0..2], code, .big);
    @memcpy(out[2 .. 2 + n], reason[0..n]);
    return out[0 .. 2 + n];
}

test "a small masked text frame parses" {
    const mask = [4]u8{ 0x01, 0x02, 0x03, 0x04 };
    var frame: [11]u8 = .{ 0x81, 0x85, 0x01, 0x02, 0x03, 0x04, 0, 0, 0, 0, 0 };
    @memcpy(frame[6..11], "hello");
    unmask(frame[6..11], mask);

    const header = try parseHeader(&frame, 1024);
    try std.testing.expect(header.fin);
    try std.testing.expectEqual(Opcode.text, header.opcode);
    try std.testing.expect(header.masked);
    try std.testing.expectEqual(@as(usize, 5), header.len);
    try std.testing.expectEqual(@as(usize, 6), header.size);

    var payload: [5]u8 = undefined;
    @memcpy(&payload, frame[6..11]);
    unmask(&payload, header.mask);
    try std.testing.expectEqualStrings("hello", &payload);
}

test "sixteen-bit and sixty-four-bit lengths parse" {
    const big = [_]u8{ 0x81, 0xfe, 0x01, 0x00, 1, 2, 3, 4 };
    const header = try parseHeader(&big, 1024);
    try std.testing.expectEqual(@as(usize, 256), header.len);
    try std.testing.expectEqual(@as(usize, 8), header.size);

    const huge = [_]u8{ 0x81, 0xff, 0, 0, 0, 0, 0, 1, 0, 0, 1, 2, 3, 4 };
    const huge_header = try parseHeader(&huge, 512 * 1024);
    try std.testing.expectEqual(@as(usize, 65536), huge_header.len);
    try std.testing.expectEqual(@as(usize, 14), huge_header.size);
}

test "oversize payloads are refused" {
    const frame = [_]u8{ 0x81, 0xfe, 0x10, 0x00, 1, 2, 3, 4 };
    try std.testing.expectError(error.FrameTooLarge, parseHeader(&frame, 1024));
}

test "unmasked client frames and reserved bits are refused" {
    try std.testing.expectError(error.UnmaskedClientFrame, parseHeader(&[_]u8{ 0x81, 0x02, 'h', 'i' }, 1024));
    try std.testing.expectError(error.ReservedBitsSet, parseHeader(&[_]u8{ 0xc1, 0x82, 1, 2, 3, 4, 'h', 'i' }, 1024));
}

test "control frames must be short and unfragmented" {
    try std.testing.expectError(error.BadControlFrame, parseHeader(&[_]u8{ 0x09, 0x80, 1, 2, 3, 4 }, 1024));
    try std.testing.expectError(error.ControlPayloadTooLarge, parseHeader(&[_]u8{ 0x89, 0xfe, 0x00, 0x7e, 1, 2, 3, 4 }, 1024));
}

test "server headers use the minimal length form" {
    var out: [10]u8 = undefined;
    try std.testing.expectEqualSlices(u8, &[_]u8{ 0x81, 5 }, writeServerHeader(&out, .text, 5));
    try std.testing.expectEqualSlices(u8, &[_]u8{ 0x81, 126, 0x01, 0x00 }, writeServerHeader(&out, .text, 256));
    const wide = writeServerHeader(&out, .text, 70000);
    try std.testing.expectEqual(@as(usize, 10), wide.len);
    try std.testing.expectEqual(@as(u8, 127), wide[1]);
}

test "close payloads carry the code and a shortened reason" {
    var out: [130]u8 = undefined;
    const payload = closePayload(&out, 4001, "auth failed");
    try std.testing.expectEqual(@as(usize, 13), payload.len);
    try std.testing.expectEqual(@as(u16, 4001), std.mem.readInt(u16, payload[0..2], .big));

    var long_reason: [300]u8 = undefined;
    @memset(&long_reason, 'x');
    const clipped = closePayload(&out, 1008, &long_reason);
    try std.testing.expectEqual(@as(usize, 125), clipped.len);
}
