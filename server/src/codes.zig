//! Short human-facing pairing codes (Crockford base32, no I, L, O, U).
//!
//! The relay only ever stores a hash of the normalized code; the dashed form is
//! what a person reads off the DSH screen and types into the web page.

const std = @import("std");

/// Crockford base32: digits plus consonants that survive being read aloud.
pub const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
pub const code_len = 8;
pub const formatted_len = 9;

/// Eight random characters, normalized (no dash).
pub fn generate(random: std.Random) [code_len]u8 {
    var out: [code_len]u8 = undefined;
    for (&out) |*ch| ch.* = alphabet[random.uintLessThan(usize, alphabet.len)];
    return out;
}

/// `ABCDEFGH` -> `ABCD-EFGH`.
pub fn formatted(code: [code_len]u8) [formatted_len]u8 {
    var out: [formatted_len]u8 = undefined;
    @memcpy(out[0..4], code[0..4]);
    out[4] = '-';
    @memcpy(out[5..9], code[4..8]);
    return out;
}

/// Uppercase, drop separators, and repair the confusable characters Crockford
/// leaves out (I/L -> 1, O -> 0). Unknown characters are dropped.
pub fn normalizeInto(input: []const u8, out: []u8) []const u8 {
    var n: usize = 0;
    for (input) |raw| {
        var ch = std.ascii.toUpper(raw);
        switch (ch) {
            'I', 'L' => ch = '1',
            'O' => ch = '0',
            '-', ' ', '\t', '_', '.' => continue,
            else => {},
        }
        if (std.mem.indexOfScalar(u8, alphabet, ch) == null) continue;
        if (n == out.len) break;
        out[n] = ch;
        n += 1;
    }
    return out[0..n];
}

/// A normalized code must be exactly eight alphabet characters.
pub fn valid(normalized: []const u8) bool {
    if (normalized.len != code_len) return false;
    for (normalized) |ch| {
        if (std.mem.indexOfScalar(u8, alphabet, ch) == null) return false;
    }
    return true;
}

test "generated codes use the alphabet and format with a dash" {
    var prng = std.Random.DefaultPrng.init(0x5eed);
    const random = prng.random();
    var i: usize = 0;
    while (i < 64) : (i += 1) {
        const code = generate(random);
        try std.testing.expect(valid(&code));
        const text = formatted(code);
        try std.testing.expectEqual(@as(usize, 9), text.len);
        try std.testing.expectEqual(@as(u8, '-'), text[4]);
        var round: [16]u8 = undefined;
        try std.testing.expectEqualSlices(u8, &code, normalizeInto(&text, &round));
    }
}

test "normalization repairs lowercase and confusable characters" {
    var buf: [16]u8 = undefined;
    // Lowercase is folded, I/L become 1, O becomes 0, separators disappear.
    try std.testing.expectEqualStrings("110ABCDEFGH", normalizeInto("i-l_o abcdefgh", &buf));
    try std.testing.expectEqualStrings("ABCDEFGH", normalizeInto("ab-cd ef gh", &buf));
    try std.testing.expectEqualStrings("01234567", normalizeInto("ol 234 567", &buf));
}

test "the normalized form validates only on eight alphabet characters" {
    var buf: [16]u8 = undefined;
    try std.testing.expect(valid(normalizeInto("ABCD-EFGH", &buf)));
    try std.testing.expect(!valid(normalizeInto("ABCD-EFG", &buf)));
    try std.testing.expect(!valid("ABCDEFGU"));
}

