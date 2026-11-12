//! Process-wide handles passed to every request handler and peer thread.

const std = @import("std");
const config_mod = @import("config.zig");
const hub_mod = @import("hub.zig");
const store_mod = @import("store.zig");

pub const App = struct {
    io: std.Io,
    /// Long-lived allocations (config strings, hub state).
    gpa: std.mem.Allocator,
    /// Process-lifetime arena used where "leak until exit" is the right default.
    arena: std.mem.Allocator,
    cfg: *const config_mod.Config,
    store: *store_mod.Store,
    hub: *hub_mod.Hub,
    /// HMAC pepper for token and pairing-code hashes.
    pepper: []const u8,
    started_at_ms: i64,

    pub const version = "0.1.0";

    pub fn uptimeSeconds(self: *const App) i64 {
        const now = @import("clock.zig").nowMs(self.io);
        return @divTrunc(now - self.started_at_ms, 1000);
    }
};
