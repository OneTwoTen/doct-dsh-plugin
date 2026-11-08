//! Wall-clock helpers on top of `std.Io.Clock`.

const std = @import("std");

/// Unix milliseconds from the real-time clock.
pub fn nowMs(io: std.Io) i64 {
    return nowMsOf(std.Io.Clock.Timestamp.now(io, .real));
}

pub fn nowMsOf(stamp: std.Io.Clock.Timestamp) i64 {
    return @intCast(@divTrunc(stamp.raw.nanoseconds, std.time.ns_per_ms));
}

test "now produces a plausible unix millisecond stamp" {
    const now = nowMs(std.testing.io);
    // 2020-01-01 .. 2100-01-01, so a broken clock is obvious.
    try std.testing.expect(now > 1_577_836_800_000 and now < 4_102_444_800_000);
}
