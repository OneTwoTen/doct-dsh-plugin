//! The relay's SQLite schema (spec §7), verbatim where it does not conflict
//! with flow B: a device is created *before* its owner is known, so
//! `devices.user_id` is nullable until the pairing is approved.

const std = @import("std");

pub const version = 1;

pub const ddl: []const u8 =
    \\
    \\CREATE TABLE IF NOT EXISTS meta (
    \\  key   TEXT PRIMARY KEY,
    \\  value TEXT NOT NULL
    \\);
    \\
    \\CREATE TABLE IF NOT EXISTS users (
    \\  id            TEXT PRIMARY KEY,
    \\  clerk_user_id TEXT UNIQUE NOT NULL,
    \\  email         TEXT,
    \\  created_at    INTEGER NOT NULL
    \\);
    \\
    \\CREATE TABLE IF NOT EXISTS devices (
    \\  id           TEXT PRIMARY KEY,
    \\  user_id      TEXT REFERENCES users(id),
    \\  name         TEXT NOT NULL,
    \\  platform     TEXT NOT NULL,
    \\  pubkey       TEXT NOT NULL,
    \\  scopes       TEXT NOT NULL DEFAULT '[]',
    \\  status       TEXT NOT NULL,
    \\  created_at   INTEGER NOT NULL,
    \\  approved_at  INTEGER,
    \\  last_seen_at INTEGER,
    \\  revoked_at   INTEGER
    \\);
    \\CREATE INDEX IF NOT EXISTS devices_user ON devices(user_id);
    \\CREATE INDEX IF NOT EXISTS devices_status ON devices(status);
    \\
    \\CREATE TABLE IF NOT EXISTS pairing_requests (
    \\  id               TEXT PRIMARY KEY,
    \\  user_id          TEXT REFERENCES users(id),
    \\  device_id        TEXT NOT NULL REFERENCES devices(id),
    \\  flow             TEXT NOT NULL,
    \\  user_code_hash   TEXT,
    \\  device_code_hash TEXT,
    \\  attempts         INTEGER NOT NULL DEFAULT 0,
    \\  status           TEXT NOT NULL,
    \\  created_at       INTEGER NOT NULL,
    \\  expires_at       INTEGER NOT NULL,
    \\  approved_at      INTEGER,
    \\  consumed_at      INTEGER
    \\);
    \\CREATE INDEX IF NOT EXISTS pairing_user_code ON pairing_requests(user_code_hash);
    \\CREATE INDEX IF NOT EXISTS pairing_device_code ON pairing_requests(device_code_hash);
    \\CREATE INDEX IF NOT EXISTS pairing_status ON pairing_requests(status);
    \\
    \\CREATE TABLE IF NOT EXISTS tokens (
    \\  id         TEXT PRIMARY KEY,
    \\  device_id  TEXT NOT NULL REFERENCES devices(id),
    \\  kind       TEXT NOT NULL,
    \\  token_hash TEXT NOT NULL,
    \\  family_id  TEXT NOT NULL,
    \\  expires_at INTEGER NOT NULL,
    \\  revoked_at INTEGER,
    \\  created_at INTEGER NOT NULL
    \\);
    \\CREATE INDEX IF NOT EXISTS tokens_hash ON tokens(token_hash);
    \\CREATE INDEX IF NOT EXISTS tokens_device ON tokens(device_id);
    \\CREATE INDEX IF NOT EXISTS tokens_family ON tokens(family_id);
    \\
    \\CREATE TABLE IF NOT EXISTS web_sessions (
    \\  id         TEXT PRIMARY KEY,
    \\  user_id    TEXT NOT NULL REFERENCES users(id),
    \\  token_hash TEXT NOT NULL,
    \\  expires_at INTEGER NOT NULL,
    \\  ua         TEXT,
    \\  ip_hash    TEXT,
    \\  created_at INTEGER NOT NULL
    \\);
    \\CREATE INDEX IF NOT EXISTS web_sessions_hash ON web_sessions(token_hash);
    \\
    \\CREATE TABLE IF NOT EXISTS audit (
    \\  id        INTEGER PRIMARY KEY AUTOINCREMENT,
    \\  user_id   TEXT,
    \\  device_id TEXT,
    \\  event     TEXT NOT NULL,
    \\  meta      TEXT,
    \\  at        INTEGER NOT NULL
    \\);
    \\CREATE INDEX IF NOT EXISTS audit_at ON audit(at);
    \\
;

test "the schema text mentions every table" {
    for ([_][]const u8{
        "users",      "devices",       "pairing_requests",
        "tokens",     "web_sessions",  "audit",
        "meta",
    }) |table| {
        try std.testing.expect(std.mem.indexOf(u8, ddl, table) != null);
    }
}
