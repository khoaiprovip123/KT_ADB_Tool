import { vi, describe, it, expect, beforeEach } from "vitest";
import { Readable } from "stream";

vi.mock("adbkit", () => {
  return {
    default: {
      createClient: () => ({
        shell: vi.fn(),
        push: vi.fn(),
        pull: vi.fn(),
      }),
    },
  };
});

import { manageApp, getPackages } from "./appService";
import { adbState } from "./adbCore";

function createMockStream(content: string) {
  const stream = new Readable({
    read() {}
  });
  process.nextTick(() => {
    stream.push(content);
    stream.push(null);
  });
  return stream;
}

describe("appService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("manageApp", () => {
    it("should reject invalid package name", async () => {
      const onLog = vi.fn();
      const res = await manageApp("dev-1", "invalid-pkg-name!!", "uninstall", onLog);
      expect(res.success).toBe(false);
      expect(res.output).toBe("Invalid app command parameters");
    });

    it("should block uninstall of a blacklisted package", async () => {
      const onLog = vi.fn();
      const res = await manageApp("dev-1", "com.android.settings", "uninstall", onLog);
      expect(res.success).toBe(false);
      expect(res.output).toContain("Bị chặn");
      expect(onLog).toHaveBeenCalledWith(expect.stringContaining("[CRITICAL]"));
      expect(adbState.client.shell).not.toHaveBeenCalled();
    });

    it("should block disable of a blacklisted package", async () => {
      const onLog = vi.fn();
      const res = await manageApp("dev-1", "com.miui.securitycenter", "disable", onLog);
      expect(res.success).toBe(false);
      expect(res.output).toContain("Bị chặn");
      expect(adbState.client.shell).not.toHaveBeenCalled();
    });

    it("should allow enable of a blacklisted package", async () => {
      const onLog = vi.fn();
      vi.mocked(adbState.client.shell).mockResolvedValue(createMockStream("Success") as any);
      
      const res = await manageApp("dev-1", "com.android.settings", "enable", onLog);
      expect(res.success).toBe(true);
      expect(adbState.client.shell).toHaveBeenCalledWith("dev-1", "pm enable com.android.settings");
    });

    it("should execute uninstall command for non-blacklisted package", async () => {
      const onLog = vi.fn();
      vi.mocked(adbState.client.shell).mockResolvedValue(createMockStream("Success") as any);
      
      const res = await manageApp("dev-1", "com.example.thirdparty", "uninstall", onLog);
      expect(res.success).toBe(true);
      expect(adbState.client.shell).toHaveBeenCalledWith("dev-1", "pm uninstall -k --user 0 com.example.thirdparty");
    });

    it("should fail when command execution output contains Failure", async () => {
      const onLog = vi.fn();
      vi.mocked(adbState.client.shell).mockResolvedValue(createMockStream("Failure [DELETE_FAILED_INTERNAL_ERROR]") as any);
      
      const res = await manageApp("dev-1", "com.example.thirdparty", "uninstall", onLog);
      expect(res.success).toBe(false);
      expect(res.output).toBe("Failure [DELETE_FAILED_INTERNAL_ERROR]");
    });
  });

  describe("getPackages", () => {
    it("should list and classify packages correctly", async () => {
      // Mock different responses for system, third-party, and disabled packages
      let shellCallIndex = 0;
      vi.mocked(adbState.client.shell).mockImplementation(async (_deviceId: string, cmd: string) => {
        shellCallIndex++;
        if (cmd === "pm list packages -s") {
          return createMockStream("package:com.android.settings\npackage:com.android.phone\n") as any;
        } else if (cmd === "pm list packages -3") {
          return createMockStream("package:com.example.app1\n") as any;
        } else if (cmd === "pm list packages -d") {
          return createMockStream("package:com.android.phone\n") as any;
        } else {
          return createMockStream("package:com.android.settings\npackage:com.android.phone\npackage:com.example.app1\n") as any;
        }
      });

      const apps = await getPackages("dev-1", "all");
      expect(apps).toHaveLength(3);
      
      const settings = apps.find(a => a.pkg === "com.android.settings");
      expect(settings).toBeDefined();
      expect(settings?.type).toBe("system");
      expect(settings?.status).toBe("enabled");

      const phone = apps.find(a => a.pkg === "com.android.phone");
      expect(phone).toBeDefined();
      expect(phone?.type).toBe("system");
      expect(phone?.status).toBe("disabled"); // listed in -d output

      const app1 = apps.find(a => a.pkg === "com.example.app1");
      expect(app1).toBeDefined();
      expect(app1?.type).toBe("user");
      expect(app1?.status).toBe("enabled");
    });
  });
});
