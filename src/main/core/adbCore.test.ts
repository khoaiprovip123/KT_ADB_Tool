import { vi, describe, it, expect, beforeEach } from "vitest";
import { execFile } from "child_process";
import util from "util";

vi.mock("adbkit", () => {
  return {
    default: {
      createClient: () => ({
        shell: vi.fn(),
        listDevices: vi.fn(),
        trackDevices: vi.fn(),
      }),
    },
  };
});

vi.mock("electron", () => {
  return {
    app: {
      isPackaged: false,
    },
  };
});

vi.mock("child_process", () => {
  const utilModule = require("util");
  const execMock = vi.fn((_cmd, options, cb) => {
    const callback = typeof options === "function" ? options : cb;
    callback(null, "mock output", "");
  });

  (execMock as any)[utilModule.promisify.custom] = vi.fn(async () => {
    return { stdout: "mock output", stderr: "" };
  });

  const execFileMock = vi.fn((_file, _args, options, cb) => {
    const callback = typeof options === "function" ? options : cb;
    if (typeof callback === "function") callback(null, "mock output", "");
  });

  (execFileMock as any)[utilModule.promisify.custom] = vi.fn(async () => {
    return { stdout: "mock output", stderr: "" };
  });

  return {
    exec: execMock,
    execFile: execFileMock,
    spawn: vi.fn(),
  };
});

import {
  runAdbCommand,
  runAdbCommandDetailed,
  execAdb,
} from "./adbCore";

describe("adbCore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default implementation for the custom promisifier
    vi.mocked((execFile as any)[util.promisify.custom]).mockResolvedValue({
      stdout: "mock output",
      stderr: "",
    });
  });

  describe("runAdbCommand", () => {
    it("should block unsafe commands (e.g. rm -rf /)", async () => {
      const onLog = vi.fn();
      const result = await runAdbCommand("device-1", "rm -rf /data", onLog);
      expect(result).toContain("[BLOCKED BY SAFETY LAYER]");
      expect(onLog).toHaveBeenCalledWith(expect.stringContaining("[BLOCKED BY SAFETY LAYER]"));
      expect((execFile as any)[util.promisify.custom]).not.toHaveBeenCalled();
    });

    it("should clean command prefix and execute safe commands successfully", async () => {
      const onLog = vi.fn();
      vi.mocked((execFile as any)[util.promisify.custom]).mockResolvedValue({
        stdout: "mock output",
        stderr: "",
      });
      
      const result = await runAdbCommand("device-1", "adb shell getprop ro.product.model", onLog);
      expect(result).toBe("mock output");
      expect(onLog).toHaveBeenCalledWith("mock output");
      expect((execFile as any)[util.promisify.custom]).toHaveBeenCalledWith(
        "adb",
        ["-s", "device-1", "shell", "getprop ro.product.model"],
        expect.objectContaining({ timeout: 30_000 }),
      );
    });

    it("should preserve command failure details", async () => {
      const onLog = vi.fn();
      vi.mocked((execFile as any)[util.promisify.custom]).mockRejectedValue({
        code: 13,
        stdout: "",
        stderr: "SecurityException: denied",
      });
      
      const result = await runAdbCommand("device-1", "getprop", onLog);
      expect(result).toBe("ERROR: SecurityException: denied");
      expect(onLog).toHaveBeenCalledWith(result);
    });

    it("should treat semantic ADB failures as failed even with exit code 0", async () => {
      vi.mocked((execFile as any)[util.promisify.custom]).mockResolvedValue({
        stdout: "Failure [DELETE_FAILED_INTERNAL_ERROR]\n",
        stderr: "",
      });

      const result = await runAdbCommandDetailed(
        "device-1",
        "pm clear com.example.app",
      );
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("DELETE_FAILED_INTERNAL_ERROR");
    });
  });

  describe("execAdb", () => {
    it("should block unsafe commands and return block message", async () => {
      const result = await execAdb("device-1", "rm -rf /");
      expect(result).toContain("[BLOCKED BY SAFETY LAYER]");
      expect((execFile as any)[util.promisify.custom]).not.toHaveBeenCalled();
    });

    it("should execute safe shell command and resolve with output", async () => {
      vi.mocked((execFile as any)[util.promisify.custom]).mockResolvedValue({
        stdout: "shell output",
        stderr: "",
      });

      const result = await execAdb("device-1", "shell pm list packages");
      expect(result).toBe("shell output");
      expect((execFile as any)[util.promisify.custom]).toHaveBeenCalledWith(
        "adb",
        ["-s", "device-1", "shell", "pm list packages"],
        expect.objectContaining({ timeout: 30_000 }),
      );
    });

    it("should return error output string when command fails on all attempts", async () => {
      vi.mocked((execFile as any)[util.promisify.custom]).mockRejectedValue(
        new Error("Command failed")
      );

      const result = await execAdb("device-1", "getprop");
      expect(result).toContain("Command failed");
    });
  });
});
