import { beforeEach, describe, expect, it, vi } from "vitest";

const snapshotStore = vi.hoisted(() => new Map<string, unknown>());

vi.mock("../store", () => ({
  store: {
    get: (key: string, fallback: unknown) => snapshotStore.get(key) ?? fallback,
    set: (key: string, value: unknown) => snapshotStore.set(key, value),
  },
}));

vi.mock("./deviceProfileService", () => ({
  getDeviceProfile: vi.fn(),
  getInstalledPackageSet: vi.fn(),
  readSettingsSnapshot: vi.fn(),
}));

vi.mock("./adbCore", () => ({
  runAdbCommandDetailed: vi.fn(),
}));

import { runAdbCommandDetailed } from "./adbCore";
import {
  getDeviceProfile,
  getInstalledPackageSet,
  readSettingsSnapshot,
} from "./deviceProfileService";
import {
  applyExperienceItem,
  getExperienceCapabilities,
} from "./xiaomiExperienceService";
import { XIAOMI_EXPERIENCE_ITEMS } from "./xiaomiExperienceRegistry";

const adbResult = (output: string, success = true) => ({
  success,
  output,
  stdout: success ? output : "",
  stderr: success ? "" : output,
  exitCode: success ? 0 : 1,
});

describe("xiaomiExperienceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    snapshotStore.clear();
    vi.mocked(getDeviceProfile).mockResolvedValue({
      brand: "Xiaomi",
      manufacturer: "Xiaomi",
      model: "Test",
      device: "test-device",
      sdk: 34,
      release: "14",
      miuiVersionName: "V816",
      hyperOsVersionName: "2",
      incremental: "test-build",
    });
    vi.mocked(getInstalledPackageSet).mockResolvedValue(new Set());
    vi.mocked(readSettingsSnapshot).mockResolvedValue({});
    vi.mocked(runAdbCommandDetailed).mockResolvedValue(adbResult(""));
  });

  it("keeps community presets visible instead of filtering them out", () => {
    const ids = XIAOMI_EXPERIENCE_ITEMS.map((item) => item.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "show_refresh_rate",
        "speed_animations",
        "dark_mode",
        "touch_response_enhancement",
        "disable_miui_optimization",
        "disable_miui_daemon",
        "dc_dimming_xiaomi",
      ]),
    );
  });

  it("reports a missing OEM setting as an actionable experiment", async () => {
    const capabilities = await getExperienceCapabilities("device-1");
    const smartIsland = capabilities.find(
      ({ item }) => item.id === "smart_island",
    );

    expect(smartIsland?.status).toBe("EXPERIMENTAL");
    expect(smartIsland?.reason).toContain("Có thể thử tạo key");
  });

  it("creates and verifies all missing HyperOS advanced-texture keys", async () => {
    const values = new Map<string, string>();
    vi.mocked(runAdbCommandDetailed).mockImplementation(
      async (_deviceId, command) => {
        const get = command.match(
          /^settings get (global|secure|system) ([a-zA-Z0-9_.-]+)$/,
        );
        if (get) return adbResult(values.get(`${get[1]}:${get[2]}`) ?? "null");

        const put = command.match(
          /^settings put (global|secure|system) ([a-zA-Z0-9_.-]+) (.+)$/,
        );
        if (put) {
          values.set(`${put[1]}:${put[2]}`, put[3]);
          return adbResult("OK");
        }
        return adbResult("");
      },
    );

    const result = await applyExperienceItem(
      "device-1",
      "advanced_textures_hyperos",
      true,
    );

    expect(result.success).toBe(true);
    expect(result.output).toContain("[VERIFY]");
    expect(
      vi
        .mocked(runAdbCommandDetailed)
        .mock.calls.some(([, command]) => command.startsWith("settings put")),
    ).toBe(true);
    expect(values.get("system:deviceLevelList")).toBe("v:1,c:3,g:3");
    expect(values.get("global:advanced_visual_release")).toBe("3");
    expect(values.get("system:advanced_visual_release")).toBe("3");
  });

  it("uses the verified HyperOS RAM-in-recents key", async () => {
    vi.mocked(readSettingsSnapshot).mockImplementation(
      async (_deviceId, namespace) =>
        namespace === "system"
          ? { miui_recents_show_mem_info: "1" }
          : ({} as Record<string, string>),
    );

    const capabilities = await getExperienceCapabilities("device-1");
    const item = capabilities.find(
      ({ item: current }) => current.id === "memory_extension_display",
    );

    expect(item?.status).toBe("SUPPORTED_ON");
    expect(item?.resolvedReadCommand).toEqual({
      namespace: "system",
      key: "miui_recents_show_mem_info",
    });
  });

  it("treats Android custom night schedule as an enabled mode", async () => {
    vi.mocked(readSettingsSnapshot).mockImplementation(
      async (_deviceId, namespace) =>
        namespace === "secure"
          ? { ui_night_mode: "3" }
          : ({} as Record<string, string>),
    );

    const capabilities = await getExperienceCapabilities("device-1");
    const item = capabilities.find(
      ({ item: current }) => current.id === "cmd_uimode_night",
    );

    expect(item?.status).toBe("SUPPORTED_ON");
    expect(item?.currentValue).toBe("3");
  });
});
