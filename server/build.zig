const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // SQLite is vendored as the C amalgamation; translate-c gives Zig the
    // declarations, and the C file is compiled into the same binary.
    const sqlite = b.addTranslateC(.{
        .root_source_file = b.path("vendor/sqlite/sqlite3.h"),
        .target = target,
        .optimize = optimize,
    });
    const sqlite_mod = sqlite.createModule();

    const sqlite_flags: []const []const u8 = &.{
        "-DSQLITE_THREADSAFE=1",
        "-DSQLITE_OMIT_LOAD_EXTENSION",
        "-DSQLITE_DQS=0",
        "-DSQLITE_DEFAULT_FOREIGN_KEYS=1",
    };

    const relay_mod = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
        .link_libc = true,
    });
    relay_mod.addImport("sqlite", sqlite_mod);
    relay_mod.addCSourceFile(.{ .file = b.path("vendor/sqlite/sqlite3.c"), .flags = sqlite_flags });
    relay_mod.addIncludePath(b.path("vendor/sqlite"));

    const exe = b.addExecutable(.{
        .name = "dsh-relay",
        .root_module = relay_mod,
    });
    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    run_cmd.addPassthruArgs();
    const run_step = b.step("run", "Run the relay");
    run_step.dependOn(&run_cmd.step);

    const test_mod = b.createModule(.{
        .root_source_file = b.path("src/tests.zig"),
        .target = target,
        .optimize = optimize,
        .link_libc = true,
    });
    test_mod.addImport("sqlite", sqlite_mod);
    test_mod.addCSourceFile(.{ .file = b.path("vendor/sqlite/sqlite3.c"), .flags = sqlite_flags });
    test_mod.addIncludePath(b.path("vendor/sqlite"));

    const tests = b.addTest(.{ .root_module = test_mod });
    const run_tests = b.addRunArtifact(tests);
    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_tests.step);
}
