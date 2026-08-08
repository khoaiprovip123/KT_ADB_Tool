import { vi, describe, it, expect, beforeEach } from "vitest";

const snapshotStore = vi.hoisted(() => new Map<string, unknown>());

vi.mock("../store", () => ({
  store: {
    get: (key: string, fallback: unknown) => snapshotStore.get(key) ?? fallback,
    set: (key: string, value: unknown) => snapshotStore.set(key, value),
  },
}));

vi.mock("./deviceProfileService", () => ({
  getDeviceProfile: vi.fn(async () => ({
    identity: "test-device-hash",
    manufacturer: "Xiaomi",
    model: "Test",
    device: "test",
    incremental: "1",
  })),
}));

vi.mock("./adbCore", () => {
  return {
    execAdb: vi.fn(),
    execAdbDetailed: vi.fn(),
    isAdbFailureOutput: vi.fn((output: string) =>
      /^(ERROR:|FAILED|SecurityException)/i.test(output),
    ),
  };
});

vi.mock("electron", () => {
  return {
    app: {
      getAppPath: () => ".",
    },
  };
});

import { execAdb, execAdbDetailed } from "./adbCore";
import {
  SYSTEM_TWEAKS,
  applyTweak,
  debloatPackage,
  batchDebloat,
  fixAllNotifications,
  restoreAllNotifications,
} from "./systemTweaksService";

const adbResult = (output: string, success = true) => ({
  success,
  output,
  stdout: success ? output : "",
  stderr: success ? "" : output,
  exitCode: success ? 0 : 1,
});

describe("systemTweaksService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    snapshotStore.clear();
    vi.mocked(execAdbDetailed).mockResolvedValue(adbResult(""));
  });

  describe("debloatPackage", () => {
    it("should block invalid package name", async () => {
      const res = await debloatPackage(
        "dev-1",
        "invalid_pkg_name!!!",
        "uninstall",
      );
      expect(res.success).toBe(false);
      expect(res.message).toContain("Tên package không hợp lệ");
      expect(execAdbDetailed).not.toHaveBeenCalled();
    });

    it("should block core system package (e.g. com.android.phone)", async () => {
      const res = await debloatPackage(
        "dev-1",
        "com.android.phone",
        "uninstall",
      );
      expect(res.success).toBe(false);
      expect(res.message).toContain("package hệ thống cốt lõi");
      expect(execAdbDetailed).not.toHaveBeenCalled();
    });

    it("should execute uninstall command successfully", async () => {
      vi.mocked(execAdbDetailed)
        .mockResolvedValueOnce(adbResult("Success\n"))
        .mockResolvedValueOnce(adbResult(""))
        .mockResolvedValueOnce(adbResult(""));
      const res = await debloatPackage(
        "dev-1",
        "com.example.bloatware",
        "uninstall",
      );
      expect(res.success).toBe(true);
      expect(res.message).toBe("Success");
      expect(execAdbDetailed).toHaveBeenCalledWith(
        "dev-1",
        "shell pm uninstall --user 0 com.example.bloatware",
      );
    });

    it("should fallback to uninstall if disable command throws SecurityException", async () => {
      // First call to disable (or uninstall with preferDisable) returns SecurityException
      vi.mocked(execAdbDetailed).mockResolvedValueOnce(
        adbResult("ERROR: SecurityException: Cannot disable package", false),
      );
      // Fallback call to uninstall returns Success
      vi.mocked(execAdbDetailed)
        .mockResolvedValueOnce(adbResult("Success"))
        .mockResolvedValueOnce(adbResult(""))
        .mockResolvedValueOnce(adbResult(""));

      const res = await debloatPackage(
        "dev-1",
        "com.example.bloatware",
        "uninstall",
        true,
      );
      expect(res.success).toBe(true);
      expect(execAdbDetailed).toHaveBeenNthCalledWith(
        1,
        "dev-1",
        "shell pm disable-user --user 0 com.example.bloatware",
      );
      expect(execAdbDetailed).toHaveBeenNthCalledWith(
        2,
        "dev-1",
        "shell pm uninstall --user 0 com.example.bloatware",
      );
    });

    it("should treat missing package as success on uninstall", async () => {
      vi.mocked(execAdbDetailed).mockResolvedValue(
        adbResult("ERROR: Unknown package: com.example.bloatware", false),
      );
      const res = await debloatPackage(
        "dev-1",
        "com.example.bloatware",
        "uninstall",
      );
      expect(res.success).toBe(true);
      expect(res.message).toContain("Hiện tại không tìm thấy ứng dụng");
    });

    it("should handle restore action", async () => {
      vi.mocked(execAdbDetailed)
        .mockResolvedValueOnce(
          adbResult("Package com.example.bloatware installed\n"),
        )
        .mockResolvedValueOnce(adbResult("package:com.example.bloatware\n"))
        .mockResolvedValueOnce(adbResult(""));
      const res = await debloatPackage(
        "dev-1",
        "com.example.bloatware",
        "restore",
      );
      expect(res.success).toBe(true);
      expect(execAdbDetailed).toHaveBeenCalledWith(
        "dev-1",
        "shell pm install-existing --user 0 com.example.bloatware",
      );
    });
  });

  describe("batchDebloat", () => {
    it("should process packages in batch and call progress callback", async () => {
      vi.mocked(execAdbDetailed).mockImplementation(
        async (_deviceId, command) => {
          if (command.includes("pm list packages -d com.example.bloat2")) {
            return adbResult("package:com.example.bloat2");
          }
          return adbResult(
            command.includes("pm list packages") ? "" : "Success",
          );
        },
      );
      const onProgress = vi.fn();
      const packages = [
        { package: "com.example.bloat1" },
        { package: "com.example.bloat2", preferDisable: true },
      ];

      const results = await batchDebloat(
        "dev-1",
        packages,
        "uninstall",
        onProgress,
      );
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
    });
  });

  describe("applyTweak", () => {
    it("keeps the restored experimental system tweaks in the catalog", () => {
      const ids = SYSTEM_TWEAKS.map((item) => item.id);
      expect(ids).toEqual(expect.arrayContaining(["force_gpu", "ad_id_limit"]));
    });

    it("creates a missing OEM settings key experimentally and can restore absence", async () => {
      const tweak = SYSTEM_TWEAKS.find(
        (item) => item.id === "miui_optimization",
      )!;
      let value: string | undefined;
      vi.mocked(execAdbDetailed).mockImplementation(
        async (_deviceId, command) => {
          if (command.includes("settings get secure miui_optimization")) {
            return adbResult(value ?? "null");
          }
          const put = command.match(
            /settings put secure miui_optimization ([a-zA-Z0-9_.-]+)/,
          );
          if (put) {
            value = put[1];
            return adbResult("OK");
          }
          if (command.includes("settings delete secure miui_optimization")) {
            value = undefined;
            return adbResult("Deleted 1 rows");
          }
          return adbResult("");
        },
      );

      const enabled = await applyTweak("dev-1", tweak, true);
      const restored = await applyTweak("dev-1", tweak, false);

      expect(enabled.success).toBe(true);
      expect(enabled.message).toContain("[VERIFY]");
      expect(restored.success).toBe(true);
      expect(restored.message).toContain("ROLLBACK VERIFIED");
      expect(value).toBeUndefined();
    });

    it("persists and restores the exact previous settings value", async () => {
      const tweak = SYSTEM_TWEAKS.find((item) => item.id === "anim_window")!;
      let value = "1.0";
      vi.mocked(execAdbDetailed).mockImplementation(
        async (_deviceId, command) => {
          if (command.includes("settings get global window_animation_scale")) {
            return adbResult(value);
          }
          if (command.includes("settings put global window_animation_scale")) {
            value = command.trim().split(/\s+/).at(-1)!;
            return adbResult("OK");
          }
          return adbResult("");
        },
      );

      const enabled = await applyTweak("dev-1", tweak, true);
      expect(enabled.success).toBe(true);
      expect(value).toBe("0.5");

      const restored = await applyTweak("dev-1", tweak, false);
      expect(restored.success).toBe(true);
      expect(value).toBe("1.0");
      expect(restored.message).toContain("ROLLBACK VERIFIED");
    });

    it("disables an installed package without uninstall fallback", async () => {
      const tweak = SYSTEM_TWEAKS.find(
        (item) => item.id === "disable_analytics",
      )!;
      let disabled = false;
      vi.mocked(execAdbDetailed).mockImplementation(
        async (_deviceId, command) => {
          if (command.includes("pm list packages -u com.miui.analytics")) {
            return adbResult("package:com.miui.analytics");
          }
          if (
            command.includes("pm list packages --user 0 com.miui.analytics")
          ) {
            return adbResult("package:com.miui.analytics");
          }
          if (command.includes("pm list packages -d com.miui.analytics")) {
            return adbResult(disabled ? "package:com.miui.analytics" : "");
          }
          if (command.includes("pm list packages com.miui.analytics")) {
            return adbResult("package:com.miui.analytics");
          }
          if (command.includes("pm disable-user")) {
            disabled = true;
            return adbResult("Package disabled");
          }
          return adbResult("");
        },
      );

      const result = await applyTweak("dev-1", tweak, true);

      expect(result.success).toBe(true);
      expect(disabled).toBe(true);
      expect(
        vi
          .mocked(execAdbDetailed)
          .mock.calls.some(([, command]) => command.includes("pm uninstall")),
      ).toBe(false);
    });
  });

  describe("notification batch safety", () => {
    it("only touches allowlisted messaging packages and restores their snapshot", async () => {
      vi.mocked(execAdb).mockResolvedValue(
        "package:com.zing.zalo\npackage:com.random.untrusted",
      );
      const whitelist = new Set<string>();
      const appOps = new Map<string, string>();
      vi.mocked(execAdbDetailed).mockImplementation(async (_deviceId, raw) => {
        const command = raw.replace(/^shell\s+/, "");
        if (command === "dumpsys deviceidle whitelist") {
          return adbResult([...whitelist].join("\n"));
        }
        const whitelistMutation = command.match(
          /^dumpsys deviceidle whitelist ([+-])(.+)$/,
        );
        if (whitelistMutation) {
          if (whitelistMutation[1] === "+") whitelist.add(whitelistMutation[2]);
          else whitelist.delete(whitelistMutation[2]);
          return adbResult("OK");
        }
        const getAppOp = command.match(/^cmd appops get (\S+) (\S+)$/);
        if (getAppOp) {
          const key = `${getAppOp[1]}:${getAppOp[2]}`;
          return adbResult(`${getAppOp[2]}: ${appOps.get(key) ?? "default"}`);
        }
        const setAppOp = command.match(
          /^cmd appops set (\S+) (\S+) (allow|default)$/,
        );
        if (setAppOp) {
          appOps.set(`${setAppOp[1]}:${setAppOp[2]}`, setAppOp[3]);
          return adbResult("OK");
        }
        return adbResult("");
      });

      const optimized = await fixAllNotifications("dev-1");
      expect(optimized).toMatchObject({ success: true, count: 1 });
      expect(whitelist.has("com.zing.zalo")).toBe(true);
      expect(
        vi
          .mocked(execAdbDetailed)
          .mock.calls.some(([, command]) =>
            command.includes("com.random.untrusted"),
          ),
      ).toBe(false);

      const restored = await restoreAllNotifications("dev-1");
      expect(restored).toMatchObject({ success: true, count: 1 });
      expect(whitelist.has("com.zing.zalo")).toBe(false);
      expect(appOps.get("com.zing.zalo:WAKE_LOCK")).toBe("default");
    });
  });
});
