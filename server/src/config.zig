//! Relay configuration: JSON file with sane defaults, validated at startup.

const std = @import("std");
const Allocator = std.mem.Allocator;
const Io = std.Io;

pub const AuthMode = enum { dev, clerk };

pub const Auth = struct {
    /// `dev` accepts a shared token; `clerk` verifies Clerk session tokens.
    mode: AuthMode = .dev,
    /// Shared web token used in `dev` mode (`Authorization: Bearer` or `?token=`).
    dev_token: []const u8 = "",
    /// Clerk backend secret (`sk_...`); only used in `clerk` mode.
    clerk_secret_key: []const u8 = "",
    /// Expected `iss` claim, i.e. the Frontend API URL.
    clerk_issuer: []const u8 = "",
    /// Allowed `azp` values (origins).
    clerk_authorized_parties: []const []const u8 = &.{},
    /// Marks the session cookie `Secure`; set when the relay is behind TLS.
    cookie_secure: bool = false,
};

pub const Config = struct {
    listen_host: []const u8 = "127.0.0.1",
    listen_port: u16 = 8787,
    /// Public origin used in `verification_uri`; derived from the listen address
    /// when empty.
    public_url: []const u8 = "",
    data_dir: []const u8 = "data",
    db_file: []const u8 = "relay.sqlite",
    max_frame_bytes: usize = 256 * 1024,
    pairing_ttl_seconds: u32 = 600,
    pairing_max_attempts: u32 = 3,
    access_ttl_seconds: u32 = 900,
    refresh_ttl_seconds: u32 = 90 * 24 * 60 * 60,
    web_session_ttl_seconds: u32 = 7 * 24 * 60 * 60,
    max_streams_per_device: u32 = 8,
    max_inflight_per_device: u32 = 32,
    heartbeat_ms: u32 = 25000,
    request_timeout_ms: u32 = 60000,
    audit_retention_days: u32 = 30,
    auth: Auth = .{},

    /// Read and validate `path`. Strings are allocated from `alloc`, which is
    /// expected to live as long as the process (the arena in `main`).
    pub fn load(alloc: Allocator, io: Io, path: []const u8) !Config {
        const text = try std.Io.Dir.cwd().readFileAlloc(io, path, alloc, .limited(1024 * 1024));
        var cfg = try std.json.parseFromSliceLeaky(Config, alloc, text, .{
            .ignore_unknown_fields = true,
        });
        if (cfg.public_url.len == 0) {
            cfg.public_url = try std.fmt.allocPrint(alloc, "http://{s}:{d}", .{
                cfg.listen_host, cfg.listen_port,
            });
        }
        try cfg.validate();
        return cfg;
    }

    pub fn validate(self: *const Config) !void {
        if (self.max_frame_bytes < 1024 or self.max_frame_bytes > 4 * 1024 * 1024) {
            return error.InvalidMaxFrameBytes;
        }
        if (self.pairing_ttl_seconds == 0 or self.pairing_ttl_seconds > 3600) {
            return error.InvalidPairingTtl;
        }
        if (self.pairing_max_attempts == 0 or self.pairing_max_attempts > 20) {
            return error.InvalidPairingAttempts;
        }
        switch (self.auth.mode) {
            .dev => {},
            .clerk => {
                if (self.auth.clerk_secret_key.len == 0) return error.ClerkSecretMissing;
                if (self.auth.clerk_issuer.len == 0) return error.ClerkIssuerMissing;
            },
        }
    }

    /// Path of the SQLite file, allocated from `alloc`.
    pub fn databasePath(self: *const Config, alloc: Allocator) ![]const u8 {
        return std.fs.path.join(alloc, &.{ self.data_dir, self.db_file });
    }

    pub fn pairingTtlMs(self: *const Config) i64 {
        return @as(i64, self.pairing_ttl_seconds) * 1000;
    }

    pub fn accessTtlMs(self: *const Config) i64 {
        return @as(i64, self.access_ttl_seconds) * 1000;
    }

    pub fn refreshTtlMs(self: *const Config) i64 {
        return @as(i64, self.refresh_ttl_seconds) * 1000;
    }

    pub fn webSessionTtlMs(self: *const Config) i64 {
        return @as(i64, self.web_session_ttl_seconds) * 1000;
    }
};

test "defaults are internally consistent" {
    const cfg = Config{};
    try cfg.validate();
    try std.testing.expectEqual(@as(usize, 256 * 1024), cfg.max_frame_bytes);
    try std.testing.expectEqual(@as(i64, 600_000), cfg.pairingTtlMs());
}

test "clerk mode requires a secret and an issuer" {
    var cfg = Config{};
    cfg.auth.mode = .clerk;
    try std.testing.expectError(error.ClerkSecretMissing, cfg.validate());
    cfg.auth.clerk_secret_key = "sk_test";
    try std.testing.expectError(error.ClerkIssuerMissing, cfg.validate());
    cfg.auth.clerk_issuer = "https://clerk.example.com";
    try cfg.validate();
}
