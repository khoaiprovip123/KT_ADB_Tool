import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./adbCore", () => ({
  runAdbCommand: vi.fn(),
  runAdbCommandDetailed: vi.fn(),
}));

import { runAdbCommandDetailed } from "./adbCore";
import { AdvancedAdbService } from "./advancedAdbService";

const adbSuccess = (output = "OK") => ({
  success: true,
  output,
  stdout: output,
  stderr: "",
  exitCode: 0,
});

describe("AdvancedAdbService", () => {
  const service = new AdvancedAdbService();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runAdbCommandDetailed).mockResolvedValue(adbSuccess());
  });

  it.each([
    ["read", "appops get com.example.app RUN_IN_BACKGROUND"],
    ["apply", "appops set com.example.app RUN_IN_BACKGROUND ignore"],
    ["rollback", "appops set com.example.app RUN_IN_BACKGROUND allow"],
  ] as const)("routes the %s action to its matching template", async (action, expected) => {
    const result = await service.executePresetCommand(
      "device-1",
      "appops_run_background",
      { package: "com.example.app", value: "ignore" },
      action,
    );

    expect(result.success).toBe(true);
    expect(runAdbCommandDetailed).toHaveBeenCalledWith("device-1", expected);
  });

  it("restores the standard Android background-process limit", async () => {
    const result = await service.executePresetCommand(
      "device-1",
      "setting_process_limit",
      {},
      "rollback",
    );

    expect(result.success).toBe(true);
    expect(runAdbCommandDetailed).toHaveBeenCalledWith(
      "device-1",
      "settings put global background_process_limit -1",
    );
  });

  it("rejects actions that the preset does not support", async () => {
    const result = await service.executePresetCommand(
      "device-1",
      "diag_battery",
      {},
      "apply",
    );

    expect(result.success).toBe(false);
    expect(result.output).toContain("không hỗ trợ thao tác apply");
    expect(runAdbCommandDetailed).not.toHaveBeenCalled();
  });

  it("stops a chained preset at the first failed ADB command", async () => {
    vi.mocked(runAdbCommandDetailed)
      .mockResolvedValueOnce(adbSuccess())
      .mockResolvedValueOnce({
        success: false,
        output: "ERROR: permission denied",
        stdout: "",
        stderr: "permission denied",
        exitCode: 1,
      });

    const result = await service.executePresetCommand(
      "device-1",
      "net_fix_captive_portal",
      {},
      "apply",
    );

    expect(result.success).toBe(false);
    expect(result.output).toContain("permission denied");
    expect(runAdbCommandDetailed).toHaveBeenCalledTimes(2);
  });

  it("does not execute a preset with unresolved required parameters", async () => {
    const result = await service.executePresetCommand(
      "device-1",
      "appops_run_background",
      { value: "ignore" },
      "apply",
    );

    expect(result.success).toBe(false);
    expect(result.output).toContain("Thiếu tham số");
    expect(runAdbCommandDetailed).not.toHaveBeenCalled();
  });
});
