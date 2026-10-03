import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./adbCore", () => ({
  runAdbCommandDetailed: vi.fn(),
}));

import { runAdbCommandDetailed, AdbCommandExecution } from "./adbCore";
import {
  navHome,
  navBack,
  navRecents,
  navScreenOff,
  navOpenSettings,
  navOpenDeveloperSettings,
  checkAdbInputPermission,
} from "./navigationService";

function mockExec(partial: Partial<AdbCommandExecution>): AdbCommandExecution {
  return {
    success: partial.success ?? true,
    output: partial.output ?? "",
    stdout: partial.stdout ?? partial.output ?? "",
    stderr: partial.stderr ?? "",
    exitCode: partial.exitCode ?? (partial.success === false ? 1 : 0),
  };
}

describe("navigationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("navHome", () => {
    it("should succeed with keyevent when permission is granted", async () => {
      vi.mocked(runAdbCommandDetailed).mockResolvedValueOnce(
        mockExec({ success: true, output: "" }),
      );

      const res = await navHome("device-1");
      expect(res.success).toBe(true);
      expect(res.method).toBe("keyevent");
      expect(res.usedFallback).toBe(false);
      expect(runAdbCommandDetailed).toHaveBeenCalledWith("device-1", "input keyevent 3");
    });

    it("should fallback to Intent when keyevent throws SecurityException (INJECT_EVENTS)", async () => {
      // First call (keyevent) fails with SecurityException
      vi.mocked(runAdbCommandDetailed)
        .mockResolvedValueOnce(
          mockExec({
            success: false,
            output: "Exception occurred while executing 'keyevent':\njava.lang.SecurityException: Injecting input events requires the caller to have the INJECT_EVENTS permission.",
            exitCode: 255,
          }),
        )
        // Second call (Intent fallback) succeeds
        .mockResolvedValueOnce(
          mockExec({
            success: true,
            output: "Starting: Intent { act=android.intent.action.MAIN cat=[android.intent.category.HOME] }",
            exitCode: 0,
          }),
        );

      const res = await navHome("device-1");
      expect(res.success).toBe(true);
      expect(res.method).toBe("intent");
      expect(res.usedFallback).toBe(true);
      expect(runAdbCommandDetailed).toHaveBeenCalledTimes(2);
      expect(runAdbCommandDetailed).toHaveBeenNthCalledWith(
        2,
        "device-1",
        "am start -a android.intent.action.MAIN -c android.intent.category.HOME",
      );
    });
  });

  describe("navBack", () => {
    it("should succeed when keyevent succeeds", async () => {
      vi.mocked(runAdbCommandDetailed).mockResolvedValueOnce(
        mockExec({ success: true, output: "" }),
      );

      const res = await navBack("device-1");
      expect(res.success).toBe(true);
      expect(res.output).toBe("");
    });

    it("should return INJECT_EVENTS_DENIED when permission denied", async () => {
      vi.mocked(runAdbCommandDetailed).mockResolvedValueOnce(
        mockExec({
          success: false,
          output: "java.lang.SecurityException: Injecting input events requires INJECT_EVENTS",
          exitCode: 255,
        }),
      );

      const res = await navBack("device-1");
      expect(res.success).toBe(false);
      expect(res.output).toBe("INJECT_EVENTS_DENIED");
    });
  });

  describe("navRecents", () => {
    it("should call input keyevent 187 and succeed", async () => {
      vi.mocked(runAdbCommandDetailed).mockResolvedValueOnce(
        mockExec({ success: true, output: "" }),
      );

      const res = await navRecents("device-1");
      expect(res.success).toBe(true);
      expect(runAdbCommandDetailed).toHaveBeenCalledWith("device-1", "input keyevent 187");
    });
  });

  describe("navScreenOff", () => {
    it("should succeed with KEYCODE_POWER (26) when granted", async () => {
      vi.mocked(runAdbCommandDetailed).mockResolvedValueOnce(
        mockExec({ success: true, output: "" }),
      );

      const res = await navScreenOff("device-1");
      expect(res.success).toBe(true);
      expect(res.usedFallback).toBe(false);
      expect(runAdbCommandDetailed).toHaveBeenCalledWith("device-1", "input keyevent 26");
    });

    it("should fallback to KEYCODE_SLEEP (223) when KEYCODE_POWER fails", async () => {
      vi.mocked(runAdbCommandDetailed)
        .mockResolvedValueOnce(
          mockExec({
            success: false,
            output: "SecurityException",
            exitCode: 255,
          }),
        )
        .mockResolvedValueOnce(
          mockExec({
            success: true,
            output: "",
            exitCode: 0,
          }),
        );

      const res = await navScreenOff("device-1");
      expect(res.success).toBe(true);
      expect(res.usedFallback).toBe(true);
      expect(runAdbCommandDetailed).toHaveBeenNthCalledWith(2, "device-1", "input keyevent 223");
    });
  });

  describe("navOpenSettings", () => {
    it("should launch SETTINGS intent", async () => {
      vi.mocked(runAdbCommandDetailed).mockResolvedValueOnce(
        mockExec({
          success: true,
          output: "Starting: Intent { act=android.settings.SETTINGS }",
        }),
      );

      const res = await navOpenSettings("device-1");
      expect(res.success).toBe(true);
      expect(res.method).toBe("intent");
      expect(runAdbCommandDetailed).toHaveBeenCalledWith(
        "device-1",
        "am start -a android.settings.SETTINGS",
      );
    });
  });

  describe("navOpenDeveloperSettings", () => {
    it("should launch APPLICATION_DEVELOPMENT_SETTINGS intent", async () => {
      vi.mocked(runAdbCommandDetailed).mockResolvedValueOnce(
        mockExec({
          success: true,
          output: "Starting: Intent { act=android.settings.APPLICATION_DEVELOPMENT_SETTINGS }",
        }),
      );

      const res = await navOpenDeveloperSettings("device-1");
      expect(res.success).toBe(true);
      expect(res.method).toBe("intent");
      expect(runAdbCommandDetailed).toHaveBeenCalledWith(
        "device-1",
        "am start -a android.settings.APPLICATION_DEVELOPMENT_SETTINGS",
      );
    });
  });

  describe("checkAdbInputPermission", () => {
    it("should return true when persist.security.adbinput is 1", async () => {
      vi.mocked(runAdbCommandDetailed).mockResolvedValueOnce(
        mockExec({
          success: true,
          output: "1\n",
        }),
      );

      const hasPerm = await checkAdbInputPermission("device-1");
      expect(hasPerm).toBe(true);
    });

    it("should return false when persist.security.adbinput is 0 or empty", async () => {
      vi.mocked(runAdbCommandDetailed).mockResolvedValueOnce(
        mockExec({
          success: true,
          output: "0\n",
        }),
      );

      const hasPerm = await checkAdbInputPermission("device-1");
      expect(hasPerm).toBe(false);
    });
  });
});
