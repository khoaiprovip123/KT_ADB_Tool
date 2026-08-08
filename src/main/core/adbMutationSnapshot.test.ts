import { beforeEach, describe, expect, it, vi } from "vitest";

const snapshotStore = vi.hoisted(() => new Map<string, unknown>());

vi.mock("../store", () => ({
  store: {
    get: (key: string, fallback: unknown) => snapshotStore.get(key) ?? fallback,
    set: (key: string, value: unknown) => snapshotStore.set(key, value),
  },
}));

import {
  captureMutationSnapshot,
  extractSnapshotTargets,
  restoreMutationSnapshot,
} from "./adbMutationSnapshot";

describe("adbMutationSnapshot", () => {
  beforeEach(() => snapshotStore.clear());

  it("extracts settings, package, AppOps and whitelist targets", () => {
    const targets = extractSnapshotTargets([
      "settings put secure ui_night_mode 2 && pm disable-user --user 0 com.miui.analytics",
      "shell cmd appops set com.google.android.gms WAKE_LOCK allow ## shell dumpsys deviceidle whitelist +com.google.android.gms",
    ]);

    expect(targets.settings).toEqual([
      { namespace: "secure", key: "ui_night_mode" },
    ]);
    expect(targets.packages).toEqual(["com.miui.analytics"]);
    expect(targets.appOps).toEqual([
      { packageName: "com.google.android.gms", operation: "WAKE_LOCK" },
    ]);
    expect(targets.deviceIdleWhitelist).toEqual(["com.google.android.gms"]);
  });

  it("restores exact values, including a custom night schedule", async () => {
    const commands: string[] = [];
    const execute = vi.fn(async (command: string) => {
      commands.push(command);
      if (command === "settings get secure ui_night_mode") {
        return { success: true, output: "3" };
      }
      if (command === "settings get global policy_control") {
        return { success: true, output: "immersive.preconfirms=*" };
      }
      return { success: true, output: "OK" };
    });

    const captured = await captureMutationSnapshot({
      deviceIdentity: "device-hash",
      scope: "test",
      actionId: "dark-and-policy",
      commands: [
        "settings put secure ui_night_mode 2 && settings put global policy_control immersive.full=*",
      ],
      execute,
    });
    expect(captured.success).toBe(true);

    const restored = await restoreMutationSnapshot({
      deviceIdentity: "device-hash",
      scope: "test",
      actionId: "dark-and-policy",
      execute,
    });

    expect(restored.success).toBe(true);
    expect(commands).toContain("cmd uimode night custom");
    expect(commands).toContain(
      "settings put global policy_control immersive.preconfirms=*",
    );
  });

  it("blocks mutation when an existing value cannot be safely restored", async () => {
    const execute = vi.fn(async () => ({
      success: true,
      output: "unsafe;reboot",
    }));

    const captured = await captureMutationSnapshot({
      deviceIdentity: "device-hash",
      scope: "test",
      actionId: "unsafe-value",
      commands: ["settings put system sample_key 1"],
      execute,
    });

    expect(captured.success).toBe(false);
    expect(captured.error).toContain("không thể khôi phục");
  });

  it("blocks a changed target set until the old snapshot is restored", async () => {
    const execute = vi.fn(async () => ({ success: true, output: "null" }));

    const first = await captureMutationSnapshot({
      deviceIdentity: "device-hash",
      scope: "test",
      actionId: "versioned-action",
      commands: ["settings put system old_key 1"],
      execute,
    });
    const changed = await captureMutationSnapshot({
      deviceIdentity: "device-hash",
      scope: "test",
      actionId: "versioned-action",
      commands: ["settings put system new_key 1"],
      execute,
    });

    expect(first.success).toBe(true);
    expect(changed.success).toBe(false);
    expect(changed.error).toContain("tập lệnh cũ");
  });
});
