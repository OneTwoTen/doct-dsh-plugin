//! One WebSocket connection, server side. Frames are read into an exact-size
//! allocation and written unmasked; masking from clients is mandatory.
//!
//! Writes are not internally locked: the hub serialises every write to a
//! connection under its mutex, which also makes closing a connection race-free.

const std = @import("std");
const ws_frame = @import("ws_frame.zig");

pub const Conn = struct {
    input: *std.Io.Reader,
    output: *std.Io.Writer,
    stream: std.Io.net.Stream,
    max_frame_bytes: usize,
    closed: bool = false,

    pub const Error = error{
        UnmaskedClientFrame,
        ReservedBitsSet,
        BadControlFrame,
        ControlPayloadTooLarge,
        FrameTooLarge,
        Incomplete,
        Closed,
    } || std.Io.Reader.Error || std.mem.Allocator.Error;

    pub const Frame = struct {
        opcode: ws_frame.Opcode,
        payload: []u8,
    };

    /// Read one client frame. `alloc` owns the payload.
    pub fn readFrame(self: *Conn, alloc: std.mem.Allocator) Error!Frame {
        if (self.closed) return error.Closed;
        const in = self.input;

        var header_bytes: [14]u8 = undefined;
        const first = try in.takeArray(2);
        header_bytes[0] = first[0];
        header_bytes[1] = first[1];

        // Every client-to-server frame carries a mask (RFC 6455 §5.1).
        if (first[1] & 0x80 == 0) return error.UnmaskedClientFrame;

        const short_len = first[1] & 0x7f;
        var rest: usize = 4; // mask
        if (short_len == 126) rest += 2;
        if (short_len == 127) rest += 8;

        const tail = try in.take(rest);
        @memcpy(header_bytes[2 .. 2 + rest], tail);

        const header = try ws_frame.parseHeader(header_bytes[0 .. 2 + rest], self.max_frame_bytes);
        const payload = try in.readAllocAll(alloc, header.len);
        ws_frame.unmask(payload, header.mask);
        return .{ .opcode = header.opcode, .payload = payload };
    }

    /// Write one unmasked text frame.
    pub fn writeText(self: *Conn, payload: []const u8) !void {
        if (self.closed) return error.Closed;
        var header: [10]u8 = undefined;
        const head = ws_frame.writeServerHeader(&header, .text, payload.len);
        try self.output.writeAll(head);
        try self.output.writeAll(payload);
        try self.output.flush();
    }

    /// Stop the peer's read loop; the peer thread still owns closing the socket.
    pub fn shutdown(self: *Conn, io: std.Io) void {
        self.stream.shutdown(io, .both) catch {};
    }

    pub fn writePing(self: *Conn) !void {
        if (self.closed) return error.Closed;
        var header: [10]u8 = undefined;
        const head = ws_frame.writeServerHeader(&header, .ping, 0);
        try self.output.writeAll(head);
        try self.output.flush();
    }

    pub fn writePong(self: *Conn, payload: []const u8) !void {
        if (self.closed) return error.Closed;
        var header: [10]u8 = undefined;
        const head = ws_frame.writeServerHeader(&header, .pong, payload.len);
        try self.output.writeAll(head);
        try self.output.writeAll(payload);
        try self.output.flush();
    }

    /// Best-effort close frame; the caller closes the socket afterwards.
    pub fn writeClose(self: *Conn, code: u16, reason: []const u8) void {
        if (self.closed) return;
        self.closed = true;
        var payload_buf: [130]u8 = undefined;
        const payload = ws_frame.closePayload(&payload_buf, code, reason);
        var header: [10]u8 = undefined;
        const head = ws_frame.writeServerHeader(&header, .close, payload.len);
        self.output.writeAll(head) catch return;
        self.output.writeAll(payload) catch return;
        self.output.flush() catch return;
    }
};

test "a conn reads a masked frame and writes an unmasked one" {
    const alloc = std.testing.allocator;

    // Masked "hi" from a client.
    const mask = [4]u8{ 1, 2, 3, 4 };
    var raw: [8]u8 = .{ 0x81, 0x82, 1, 2, 3, 4, 0, 0 };
    @memcpy(raw[6..8], "hi");
    ws_frame.unmask(raw[6..8], mask);

    var in = std.Io.Reader.fixed(&raw);
    var out_buf: [64]u8 = undefined;
    var out = std.Io.Writer.fixed(&out_buf);
    var conn = Conn{
        .input = &in,
        .output = &out,
        .stream = undefined,
        .max_frame_bytes = 1024,
    };

    const frame = try conn.readFrame(alloc);
    defer alloc.free(frame.payload);
    try std.testing.expectEqual(ws_frame.Opcode.text, frame.opcode);
    try std.testing.expectEqualStrings("hi", frame.payload);

    try conn.writeText("ok");
    try std.testing.expectEqualSlices(u8, &[_]u8{ 0x81, 0x02, 'o', 'k' }, out_buf[0..4]);
}

