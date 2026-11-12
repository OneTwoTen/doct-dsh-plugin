//! Clerk session exchange: decode the session JWT, check the claims the relay
//! cares about, then ask Clerk's Backend API whether that session is still
//! active. This is the "cách 1" from the design document (no RSA in-process).

const std = @import("std");

pub const Claims = struct {
    iss: []const u8 = "",
    sub: []const u8 = "",
    sid: []const u8 = "",
    azp: []const u8 = "",
    exp: i64 = 0,
    nbf: i64 = 0,
};

pub const Session = struct {
    status: []const u8,
    user_id: []const u8,
    expire_at: i64 = 0,
};

pub const Error = error{
    BadJwt,
    BadIssuer,
    BadAuthorizedParty,
    Expired,
    NotYetValid,
    SessionInactive,
    SessionLookupFailed,
    OutOfMemory,
};

fn base64UrlDecode(alloc: std.mem.Allocator, text: []const u8) ![]u8 {
    const decoder = std.base64.url_safe_no_pad.Decoder;
    const size = decoder.calcSizeForSlice(text) catch return error.BadJwt;
    const out = try alloc.alloc(u8, size);
    decoder.decode(out, text) catch {
        alloc.free(out);
        return error.BadJwt;
    };
    return out;
}

/// Decode the payload of a Clerk session token. The signature is not verified
/// here: the Backend API lookup below is what proves the session is real.
pub fn decodeClaims(alloc: std.mem.Allocator, jwt: []const u8) Error!Claims {
    var parts = std.mem.splitScalar(u8, jwt, '.');
    _ = parts.next() orelse return error.BadJwt;
    const payload = parts.next() orelse return error.BadJwt;

    const json = base64UrlDecode(alloc, payload) catch return error.BadJwt;
    // The claims borrow slices from `json`, so it must outlive them; callers
    // pass a request arena.
    return std.json.parseFromSliceLeaky(Claims, alloc, json, .{
        .ignore_unknown_fields = true,
    }) catch error.BadJwt;
}

/// The claim checks that do not need the network.
pub fn validateClaims(
    claims: Claims,
    issuer: []const u8,
    authorized_parties: []const []const u8,
    now_s: i64,
) Error!void {
    if (!std.mem.eql(u8, claims.iss, issuer)) return error.BadIssuer;
    if (claims.exp != 0 and claims.exp <= now_s) return error.Expired;
    if (claims.nbf != 0 and claims.nbf > now_s + 60) return error.NotYetValid;
    if (authorized_parties.len > 0) {
        var allowed = false;
        for (authorized_parties) |candidate| {
            if (std.mem.eql(u8, claims.azp, candidate)) {
                allowed = true;
                break;
            }
        }
        if (!allowed) return error.BadAuthorizedParty;
    }
    if (claims.sid.len == 0 or claims.sub.len == 0) return error.BadJwt;
}

/// `GET https://api.clerk.com/v1/sessions/{sid}` with the instance secret.
pub fn fetchSession(
    io: std.Io,
    alloc: std.mem.Allocator,
    secret: []const u8,
    sid: []const u8,
) Error!Session {
    var client = std.http.Client{ .allocator = alloc, .io = io };
    defer client.deinit();

    const url = std.fmt.allocPrint(alloc, "https://api.clerk.com/v1/sessions/{s}", .{sid}) catch
        return error.OutOfMemory;
    defer alloc.free(url);
    const authorization = std.fmt.allocPrint(alloc, "Bearer {s}", .{secret}) catch
        return error.OutOfMemory;
    defer alloc.free(authorization);

    var body_buffer: [16 * 1024]u8 = undefined;
    var body_writer = std.Io.Writer.fixed(&body_buffer);

    const result = client.fetch(.{
        .location = .{ .url = url },
        .method = .GET,
        .extra_headers = &.{
            .{ .name = "authorization", .value = authorization },
            .{ .name = "accept", .value = "application/json" },
        },
        .response_writer = &body_writer,
    }) catch return error.SessionLookupFailed;

    if (result.status != .ok) return error.SessionLookupFailed;
    return std.json.parseFromSliceLeaky(Session, alloc, body_writer.buffered(), .{
        .ignore_unknown_fields = true,
    }) catch error.SessionLookupFailed;
}

test "claims decode from a JWT payload" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const alloc = arena.allocator();

    const payload = "{\"iss\":\"https://clerk.example.com\",\"sub\":\"user_1\",\"sid\":\"sess_1\",\"azp\":\"https://chat.example.com\",\"exp\":2000000000,\"nbf\":1600000000}";
    var encoded: [512]u8 = undefined;
    const payload_b64 = std.base64.url_safe_no_pad.Encoder.encode(&encoded, payload);
    const jwt = try std.fmt.allocPrint(alloc, "header.{s}.sig", .{payload_b64});

    const claims = try decodeClaims(alloc, jwt);
    try std.testing.expectEqualStrings("sess_1", claims.sid);
    try validateClaims(claims, "https://clerk.example.com", &.{"https://chat.example.com"}, 1_700_000_000);
    try std.testing.expectError(error.BadIssuer, validateClaims(claims, "https://other.example.com", &.{}, 1_700_000_000));
    try std.testing.expectError(error.BadAuthorizedParty, validateClaims(claims, "https://clerk.example.com", &.{"https://evil.example.com"}, 1_700_000_000));
}
