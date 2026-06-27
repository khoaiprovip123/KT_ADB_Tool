import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./adbCore", () => {
  return {
    execAdb: vi.fn(),
  };
});

vi.mock("electron", () => {
  return {
    app: {
      getAppPath: () => ".",
    },
  };
});

import { execAdb } from "./adbCore";
import { debloatPackage, batchDebloat } from "./systemTweaksService";

describe("systemTweaksService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("debloatPackage", () => {
    it("should block invalid package name", async () => {
      const res = await debloatPackage("dev-1", "invalid_pkg_name!!!", "uninstall");
      expect(res.success).toBe(false);
      expect(res.message).toContain("Tên package không hợp lệ");
      expect(execAdb).not.toHaveBeenCalled();
    });

    it("should block core system package (e.g. com.android.phone)", async () => {
      const res = await debloatPackage("dev-1", "com.android.phone", "uninstall");
      expect(res.success).toBe(false);
      expect(res.message).toContain("package hệ thống cốt lõi");
      expect(execAdb).not.toHaveBeenCalled();
    });

    it("should execute uninstall command successfully", async () => {
      vi.mocked(execAdb).mockResolvedValue("Success\n");
      const res = await debloatPackage("dev-1", "com.example.bloatware", "uninstall");
      expect(res.success).toBe(true);
      expect(res.message).toBe("Success");
      expect(execAdb).toHaveBeenCalledWith("dev-1", "shell pm uninstall --user 0 com.example.bloatware");
    });

    it("should fallback to uninstall if disable command throws SecurityException", async () => {
      // First call to disable (or uninstall with preferDisable) returns SecurityException
      vi.mocked(execAdb).mockResolvedValueOnce("SecurityException: Cannot disable package");
      // Fallback call to uninstall returns Success
      vi.mocked(execAdb).mockResolvedValueOnce("Success");

      const res = await debloatPackage("dev-1", "com.example.bloatware", "uninstall", true);
      expect(res.success).toBe(true);
      expect(execAdb).toHaveBeenNthCalledWith(1, "dev-1", "shell pm disable-user --user 0 com.example.bloatware");
      expect(execAdb).toHaveBeenNthCalledWith(2, "dev-1", "shell pm uninstall --user 0 com.example.bloatware");
    });

    it("should treat missing package as success on uninstall", async () => {
      vi.mocked(execAdb).mockResolvedValue("Unknown package: com.example.bloatware");
      const res = await debloatPackage("dev-1", "com.example.bloatware", "uninstall");
      expect(res.success).toBe(true);
      expect(res.message).toContain("Unknown package");
    });

    it("should handle restore action", async () => {
      vi.mocked(execAdb).mockResolvedValue("Package com.example.bloatware installed\n");
      const res = await debloatPackage("dev-1", "com.example.bloatware", "restore");
      expect(res.success).toBe(true);
      expect(execAdb).toHaveBeenCalledWith("dev-1", "shell pm install-existing --user 0 com.example.bloatware");
    });
  });

  describe("batchDebloat", () => {
    it("should process packages in batch and call progress callback", async () => {
      vi.mocked(execAdb).mockResolvedValue("Success");
      const onProgress = vi.fn();
      const packages = [
        { package: "com.example.bloat1" },
        { package: "com.example.bloat2", preferDisable: true },
      ];

      const results = await batchDebloat("dev-1", packages, "uninstall", onProgress);
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
    });
  });
});
