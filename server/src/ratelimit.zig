//! Fixed-window rate limiting. The hub owns the hash maps and the lock; this
//! file is only the pure decision.

const std = @import("std");

pub const Counter = struct {
    window_start_ms: i64 = 0,
    count: u32 = 0,

    /// One hit against a budget of `limit` per `window_ms`. The first hit opens
    /// the window; later hits in the same window are refused once the budget is
    /// spent.
    pub fn allow(self: *Counter, limit: u32, window_ms: i64, now_ms: i64) bool {
        // A clock that moved backwards must not lock a client out forever.
        if (self.window_start_ms == 0 or now_ms < self.window_start_ms or
            now_ms - self.window_start_ms >= window_ms)
        {
            self.* = .{ .window_start_ms = now_ms, .count = 1 };
            return true;
        }
        if (self.count >= limit) return false;
        self.count += 1;
        return true;
    }

    pub fn stale(self: *const Counter, window_ms: i64, now_ms: i64) bool {
        return self.window_start_ms == 0 or now_ms - self.window_start_ms >= window_ms * 2;
    }
};

test "a budget is spent then refilled by the next window" {
    var counter = Counter{};
    try std.testing.expect(counter.allow(3, 1000, 10_000));
    try std.testing.expect(counter.allow(3, 1000, 10_001));
    try std.testing.expect(counter.allow(3, 1000, 10_999));
    try std.testing.expect(!counter.allow(3, 1000, 10_999));
    // A new window starts at 11_000.
    try std.testing.expect(counter.allow(3, 1000, 11_000));
    try std.testing.expectEqual(@as(u32, 1), counter.count);
}

test "a clock going backwards resets rather than locking out" {
    var counter = Counter{};
    try std.testing.expect(counter.allow(1, 1000, 5_000));
    try std.testing.expect(!counter.allow(1, 1000, 5_100));
    try std.testing.expect(counter.allow(1, 1000, 4_000));
}

test "stale counters are recognisable for pruning" {
    var counter = Counter{};
    try std.testing.expect(counter.allow(10, 1000, 1_000));
    try std.testing.expect(!counter.stale(1000, 2_000));
    try std.testing.expect(counter.stale(1000, 3_000));
}
