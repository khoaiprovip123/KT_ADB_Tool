import { vi, describe, it, expect, beforeEach } from "vitest";
import { Readable } from "stream";

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

import { runAdbCommand, execAdb, adbState } from "./adbCore";

function createMockStream(content: string, triggerError = false) {
  const stream = new Readable({
    read() {}
  });
  if (triggerError) {
    process.nextTick(() => {
      stream.emit("error", new Error("Stream read error"));
    });
  } else {
    process.nextTick(() => {
      stream.push(content);
      stream.push(null);
    });
  }
  return stream;
}

describe("adbCore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runAdbCommand", () => {
    it("should block unsafe commands (e.g. rm -rf /)", async () => {
      const onLog = vi.fn();
      const result = await runAdbCommand("device-1", "rm -rf /data", onLog);
      expect(result).toContain("[BLOCKED BY SAFETY LAYER]");
      expect(onLog).toHaveBeenCalledWith(expect.stringContaining("[BLOCKED BY SAFETY LAYER]"));
      expect(adbState.client.shell).not.toHaveBeenCalled();
    });

    it("should clean command prefix and execute safe commands successfully", async () => {
      const onLog = vi.fn();
      vi.mocked(adbState.client.shell).mockResolvedValue(createMockStream("mock output") as any);
      
      const result = await runAdbCommand("device-1", "adb shell getprop ro.product.model", onLog);
      expect(result).toBe("mock output");
      expect(onLog).toHaveBeenCalledWith("mock output");
      expect(adbState.client.shell).toHaveBeenCalledWith("device-1", "getprop ro.product.model");
    });

    it("should return error message when stream emits error", async () => {
      const onLog = vi.fn();
      vi.mocked(adbState.client.shell).mockResolvedValue(createMockStream("", true) as any);
      
      const result = await runAdbCommand("device-1", "getprop", onLog);
      expect(result).toBe("ERROR: Stream read error");
      expect(adbState.client.shell).toHaveBeenCalledWith("device-1", "getprop");
    });

    it("should handle exceptions thrown by adb client", async () => {
      const onLog = vi.fn();
      vi.mocked(adbState.client.shell).mockRejectedValue(new Error("ADB Connection lost") as any);
      
      const result = await runAdbCommand("device-1", "getprop", onLog);
      expect(result).toBe("FAILED");
      expect(onLog).toHaveBeenCalledWith("CRITICAL ERROR: ADB Connection lost");
    });
  });

  describe("execAdb", () => {
    it("should block unsafe commands and return block message", async () => {
      const result = await execAdb("device-1", "rm -rf /");
      expect(result).toContain("[BLOCKED BY SAFETY LAYER]");
      expect(adbState.client.shell).not.toHaveBeenCalled();
    });

    it("should execute safe shell command and resolve with output", async () => {
      vi.mocked(adbState.client.shell).mockResolvedValue(createMockStream("shell output") as any);
      const result = await execAdb("device-1", "shell pm list packages");
      expect(result).toBe("shell output");
      expect(adbState.client.shell).toHaveBeenCalledWith("device-1", "pm list packages");
    });

    it("should reject when stream error occurs", async () => {
      vi.mocked(adbState.client.shell).mockResolvedValue(createMockStream("", true) as any);
      await expect(execAdb("device-1", "getprop")).rejects.toThrow("Stream read error");
    });
  });
});
