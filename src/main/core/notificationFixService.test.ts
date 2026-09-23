import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildNotificationFixCommands,
  scanInstalledAppsForNotification,
  fixSingleAppNotification,
  fixBatchAppNotifications,
  restoreBatchAppNotifications,
} from "./notificationFixService";
import { execAdb, execAdbDetailed } from "./adbCore";
import { getDeviceProfile } from "./deviceProfileService";

vi.mock("./adbCore", () => ({
  execAdb: vi.fn(),
  execAdbDetailed: vi.fn(),
  isAdbFailureOutput: vi.fn((out: string) => /failed|error/i.test(out)),
}));

vi.mock("./deviceProfileService", () => ({
  getDeviceProfile: vi.fn(),
}));

describe("notificationFixService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDeviceProfile).mockResolvedValue({
      brand: "Xiaomi",
      model: "Redmi K70",
      manufacturer: "Xiaomi",
      androidVersion: "14",
      sdkInt: 34,
      miuiVersion: "HyperOS 1.0",
      isXiaomi: true,
      isHyperOS: true,
      isMIUI: false,
    } as any);
  });

  describe("buildNotificationFixCommands", () => {
    it("should include Doze, Standby, POST_NOTIFICATIONS, 10008, 10053 and Background ops", () => {
      const cmds = buildNotificationFixCommands("com.zing.zalo");
      expect(cmds).toContain("shell dumpsys deviceidle whitelist +com.zing.zalo");
      expect(cmds).toContain("shell am set-standby-bucket com.zing.zalo active");
      expect(cmds).toContain(
        "shell pm grant com.zing.zalo android.permission.POST_NOTIFICATIONS",
      );
      expect(cmds).toContain(
        "shell cmd appops set com.zing.zalo POST_NOTIFICATIONS allow",
      );
      expect(cmds).toContain("shell cmd appops set com.zing.zalo 10053 allow");
      expect(cmds).toContain("shell cmd appops set com.zing.zalo 10008 allow");
      expect(cmds).toContain(
        "shell cmd appops set com.zing.zalo RUN_IN_BACKGROUND allow",
      );
      expect(cmds).toContain(
        "shell cmd appops set com.zing.zalo RUN_ANY_IN_BACKGROUND allow",
      );
      expect(cmds).toContain("shell cmd appops set com.zing.zalo WAKE_LOCK allow");
    });
  });

  describe("scanInstalledAppsForNotification", () => {
    it("should scan apps and put recommended apps first", async () => {
      vi.mocked(execAdb).mockImplementation(async (_deviceId, cmd) => {
        if (cmd.includes("pm list packages --user 0")) {
          return "package:com.zing.zalo\npackage:com.shopee.vn\npackage:com.android.settings";
        }
        if (cmd.includes("pm list packages -3")) {
          return "package:com.zing.zalo\npackage:com.shopee.vn\npackage:com.custom.app";
        }
        if (cmd.includes("dumpsys deviceidle whitelist")) {
          return "com.google.android.gms\ncom.zing.zalo";
        }
        return "";
      });

      const apps = await scanInstalledAppsForNotification("device-1");
      expect(apps.length).toBeGreaterThan(0);

      const zalo = apps.find((a) => a.packageName === "com.zing.zalo");
      expect(zalo).toBeDefined();
      expect(zalo?.name).toBe("Zalo");
      expect(zalo?.category).toBe("chat");
      expect(zalo?.isRecommended).toBe(true);
      expect(zalo?.dozeWhitelisted).toBe(true);

      const shopee = apps.find((a) => a.packageName === "com.shopee.vn");
      expect(shopee).toBeDefined();
      expect(shopee?.name).toBe("Shopee");
      expect(shopee?.category).toBe("shopping");
      expect(shopee?.dozeWhitelisted).toBe(false);

      // Recommended apps should appear before non-recommended
      const firstNonRec = apps.findIndex((a) => !a.isRecommended);
      if (firstNonRec !== -1) {
        for (let i = 0; i < firstNonRec; i++) {
          expect(apps[i].isRecommended).toBe(true);
        }
      }
    });
  });

  describe("fixSingleAppNotification", () => {
    it("should execute all required commands and report step status", async () => {
      vi.mocked(execAdbDetailed).mockImplementation(async () => {
        return {
          success: true,
          output: "OK",
          stdout: "OK",
          stderr: "",
          exitCode: 0,
        };
      });

      const result = await fixSingleAppNotification("device-1", "com.zing.zalo");
      expect(result.success).toBe(true);
      expect(result.packageName).toBe("com.zing.zalo");
      expect(result.steps.doze).toBe(true);
      expect(result.steps.standbyBucket).toBe(true);
      expect(result.steps.postNotification).toBe(true);
      expect(result.steps.appOps10008).toBe(true);
      expect(result.steps.appOps10053).toBe(true);
      expect(result.steps.backgroundOps).toBe(true);
    });

    it("should reject invalid package names safely", async () => {
      const result = await fixSingleAppNotification(
        "device-1",
        "invalid_pkg; rm -rf /",
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain("không hợp lệ");
    });
  });

  describe("fixBatchAppNotifications", () => {
    it("should loop through target packages and track progress", async () => {
      vi.mocked(execAdbDetailed).mockResolvedValue({
        success: true,
        output: "OK",
        stdout: "OK",
        stderr: "",
        exitCode: 0,
      });

      const progressCalls: any[] = [];
      const summary = await fixBatchAppNotifications(
        "device-1",
        ["com.zing.zalo", "com.facebook.orca"],
        (current, total, pkg) => progressCalls.push({ current, total, pkg }),
      );

      expect(summary.success).toBe(true);
      expect(summary.count).toBe(2);
      expect(summary.results.length).toBe(2);
      expect(progressCalls.length).toBe(2);
      expect(progressCalls[0]).toEqual({
        current: 1,
        total: 2,
        pkg: "com.zing.zalo",
      });
    });
  });

  describe("restoreBatchAppNotifications", () => {
    it("should handle restore safely when snapshots exist or not", async () => {
      const res = await restoreBatchAppNotifications("device-1", ["com.zing.zalo"]);
      expect(res).toHaveProperty("success");
      expect(res).toHaveProperty("count");
    });
  });
});
