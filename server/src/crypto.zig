//! Hashing, HMAC, constant-time comparison, fingerprints, and Ed25519 `hello`
//! verification. Everything here is pure and unit-tested.

const std = @import("std");
const Ed25519 = std.crypto.sign.Ed25519;

/// Mixed into the `hello` signature so the device key cannot sign another
/// protocol message.
pub const hello_context = "dsh-remote-hello";

/// DER prefix of an Ed25519 SubjectPublicKeyInfo; Node exports this form, and
/// the plugin sends it base64-encoded.
pub const spki_ed25519_prefix = [_]u8{
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
};

pub const hex_len_sha256 = 64;
pub const fingerprint_len = 7 + 16 * 2 + 15;

pub fn sha256(data: []const u8) [32]u8 {
    var out: [32]u8 = undefined;
    std.crypto.hash.sha2.Sha256.hash(data, &out, .{});
    return out;
}

pub fn hexLower(out: []u8, bytes: []const u8) []u8 {
    std.debug.assert(out.len >= bytes.len * 2);
    const digits = "0123456789abcdef";
    for (bytes, 0..) |byte, i| {
        out[i * 2] = digits[byte >> 4];
        out[i * 2 + 1] = digits[byte & 0x0f];
    }
    return out[0 .. bytes.len * 2];
}

pub fn hmacSha256(key: []const u8, msg: []const u8) [32]u8 {
    var out: [32]u8 = undefined;
    std.crypto.auth.hmac.sha2.HmacSha256.create(&out, msg, key);
    return out;
}

/// Opaque tokens are stored as `HMAC-SHA256(pepper, token)` in hex, never in
/// plaintext. `out` must hold 64 bytes.
pub fn tokenHash(pepper: []const u8, token: []const u8, out: *[hex_len_sha256]u8) []const u8 {
    const mac = hmacSha256(pepper, token);
    return hexLower(out, &mac);
}

/// Same as `tokenHash`, used for pairing codes after normalization.
pub fn codeHash(pepper: []const u8, normalized_code: []const u8, out: *[hex_len_sha256]u8) []const u8 {
    return tokenHash(pepper, normalized_code, out);
}

pub fn timingSafeEqual(a: []const u8, b: []const u8) bool {
    if (a.len != b.len) return false;
    var diff: u8 = 0;
    for (a, b) |x, y| diff |= x ^ y;
    return diff == 0;
}

/// `SHA256:AB:CD:…` over the first 16 bytes of the digest of the SPKI DER,
/// matching the plugin exactly so a person can compare the two screens.
pub fn fingerprint(out: *[fingerprint_len]u8, spki_der: []const u8) []const u8 {
    const digest = sha256(spki_der);
    @memcpy(out[0..7], "SHA256:");
    const digits = "0123456789ABCDEF";
    var n: usize = 7;
    var i: usize = 0;
    while (i < 16) : (i += 1) {
        if (i != 0) {
            out[n] = ':';
            n += 1;
        }
        out[n] = digits[digest[i] >> 4];
        out[n + 1] = digits[digest[i] & 0x0f];
        n += 2;
    }
    return out[0..n];
}

pub const PublicKeyError = error{InvalidPublicKey};

/// Accepts the base64 SPKI DER the plugin sends, or a bare 32-byte key.
pub fn decodePublicKey(alloc: std.mem.Allocator, base64_text: []const u8) ![]u8 {
    const decoder = std.base64.standard.Decoder;
    const size = decoder.calcSizeForSlice(base64_text) catch return error.InvalidPublicKey;
    const out = try alloc.alloc(u8, size);
    errdefer alloc.free(out);
    decoder.decode(out, base64_text) catch return error.InvalidPublicKey;
    return out;
}

pub fn ed25519PublicKey(der_or_raw: []const u8) PublicKeyError!Ed25519.PublicKey {
    var raw: [32]u8 = undefined;
    if (der_or_raw.len == 44 and std.mem.eql(u8, der_or_raw[0..12], &spki_ed25519_prefix)) {
        @memcpy(&raw, der_or_raw[12..44]);
    } else if (der_or_raw.len == 32) {
        @memcpy(&raw, der_or_raw);
    } else {
        return error.InvalidPublicKey;
    }
    return Ed25519.PublicKey.fromBytes(raw) catch error.InvalidPublicKey;
}

/// The exact bytes an Ed25519 `hello` signature covers.
pub fn helloSigningText(out: []u8, version: u32, device_id: []const u8, ts: i64, nonce: []const u8) ![]const u8 {
    return std.fmt.bufPrint(out, "{s}|{d}|{s}|{d}|{s}", .{ hello_context, version, device_id, ts, nonce });
}

pub const HelloFields = struct {
    version: u32 = 1,
    device_id: []const u8,
    ts: i64,
    nonce: []const u8,
    signature: []const u8,
};

/// Verify a `hello` against a base64 SPKI key. Returns false for any malformed
/// input rather than surfacing an error to the caller.
pub fn verifyHello(public_key_b64: []const u8, fields: HelloFields) bool {
    var der_buf: [128]u8 = undefined;
    const der = decodeBase64Into(public_key_b64, &der_buf) catch return false;
    const public_key = ed25519PublicKey(der) catch return false;

    var sig_buf: [96]u8 = undefined;
    const sig_bytes = decodeBase64UrlInto(fields.signature, &sig_buf) catch return false;
    if (sig_bytes.len != Ed25519.Signature.encoded_length) return false;
    var sig_array: [Ed25519.Signature.encoded_length]u8 = undefined;
    @memcpy(&sig_array, sig_bytes);
    const signature = Ed25519.Signature.fromBytes(sig_array);

    var text_buf: [512]u8 = undefined;
    const text = helloSigningText(&text_buf, fields.version, fields.device_id, fields.ts, fields.nonce) catch return false;
    signature.verify(text, public_key) catch return false;
    return true;
}

fn decodeBase64Into(text: []const u8, out: []u8) ![]const u8 {
    const decoder = std.base64.standard.Decoder;
    const size = try decoder.calcSizeForSlice(text);
    if (size > out.len) return error.NoSpaceLeft;
    try decoder.decode(out[0..size], text);
    return out[0..size];
}

fn decodeBase64UrlInto(text: []const u8, out: []u8) ![]const u8 {
    const decoder = std.base64.url_safe_no_pad.Decoder;
    const size = try decoder.calcSizeForSlice(text);
    if (size > out.len) return error.NoSpaceLeft;
    try decoder.decode(out[0..size], text);
    return out[0..size];
}

test "hex and hmac are stable" {
    var hex: [64]u8 = undefined;
    try std.testing.expectEqualStrings(
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        hexLower(&hex, &sha256("abc")),
    );

    var pepper_hash: [64]u8 = undefined;
    const one = tokenHash("pepper", "at_abc", &pepper_hash);
    var other_buf: [64]u8 = undefined;
    const other = tokenHash("pepper", "at_abd", &other_buf);
    try std.testing.expect(!std.mem.eql(u8, one, other));
}

test "timing safe comparison agrees with equality" {
    try std.testing.expect(timingSafeEqual("abc", "abc"));
    try std.testing.expect(!timingSafeEqual("abc", "abd"));
    try std.testing.expect(!timingSafeEqual("abc", "ab"));
}

test "fingerprint matches the plugin's SHA256:AB:CD form" {
    var out: [fingerprint_len]u8 = undefined;
    const text = fingerprint(&out, "hello");
    try std.testing.expectEqual(@as(usize, 54), text.len);
    try std.testing.expect(std.mem.startsWith(u8, text, "SHA256:"));
    var it = std.mem.splitScalar(u8, text[7..], ':');
    var count: usize = 0;
    while (it.next()) |_| count += 1;
    try std.testing.expectEqual(@as(usize, 16), count);
}

test "hello signatures verify for SPKI and raw keys, and reject tampering" {
    var seed: [32]u8 = undefined;
    @memset(&seed, 7);
    const key_pair = try Ed25519.KeyPair.generateDeterministic(seed);

    var text_buf: [256]u8 = undefined;
    const text = try helloSigningText(&text_buf, 1, "dev_abc", 1_700_000_000_000, "nonce-1");
    const signature = try key_pair.sign(text, null);

    const public_bytes = key_pair.public_key.toBytes();
    var der: [44]u8 = undefined;
    @memcpy(der[0..12], &spki_ed25519_prefix);
    @memcpy(der[12..44], &public_bytes);

    var der_b64: [std.base64.standard.Encoder.calcSize(44)]u8 = undefined;
    const der_text = std.base64.standard.Encoder.encode(&der_b64, &der);

    const sig_bytes = signature.toBytes();
    var sig_b64: [std.base64.url_safe_no_pad.Encoder.calcSize(64)]u8 = undefined;
    const sig_text = std.base64.url_safe_no_pad.Encoder.encode(&sig_b64, &sig_bytes);

    try std.testing.expect(verifyHello(der_text, .{
        .device_id = "dev_abc",
        .ts = 1_700_000_000_000,
        .nonce = "nonce-1",
        .signature = sig_text,
    }));
    try std.testing.expect(!verifyHello(der_text, .{
        .device_id = "dev_abc",
        .ts = 1_700_000_000_001,
        .nonce = "nonce-1",
        .signature = sig_text,
    }));
    try std.testing.expect(!verifyHello(der_text, .{
        .device_id = "dev_abc",
        .ts = 1_700_000_000_000,
        .nonce = "nonce-2",
        .signature = sig_text,
    }));
}
