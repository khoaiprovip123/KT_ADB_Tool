import {
  XIAOMI_EXPERIENCE_ITEMS,
  XiaomiExperienceItem,
} from "./xiaomiExperienceRegistry";
import {
  getDeviceProfile,
  getInstalledPackageSet,
  readSettingsSnapshot,
  CapabilityState,
} from "./deviceProfileService";
import { runAdbCommandDetailed } from "./adbCore";
import type { XiaomiApplyResult } from "@shared/types/xiaomi";
import {
  buildSnapshotDeviceIdentity,
  captureMutationSnapshot,
  deleteMutationSnapshot,
  extractSnapshotTargets,
  restoreMutationSnapshot,
} from "./adbMutationSnapshot";

type SettingsNamespace = "system" | "secure" | "global";
type ReadCommand = { namespace: SettingsNamespace; key: string };

export interface ExperienceItemStatus {
  item: XiaomiExperienceItem;
  status: CapabilityState;
  currentValue?: string;
  reason?: string;
  resolvedReadCommand?: ReadCommand;
}

const KNOWN_PLATFORM_SETTINGS = new Set([
  "global:window_animation_scale",
  "global:transition_animation_scale",
  "global:animator_duration_scale",
  "global:low_power",
  "global:policy_control",
  "system:min_refresh_rate",
  "system:peak_refresh_rate",
  "system:show_refresh_rate",
  "secure:ui_night_mode",
  "secure:long_press_timeout",
  "system:haptic_feedback_enabled",
  "system:show_touches",
  "system:pointer_location",
]);

interface PackageMutation {
  verb: "uninstall" | "disable-user" | "install-existing" | "enable";
  packageName: string;
}

function settingId(command: ReadCommand): string {
  return `${command.namespace}:${command.key}`;
}

function candidateReadCommands(item: XiaomiExperienceItem): ReadCommand[] {
  const candidates = [
    item.readCommand,
    ...(item.detectStrategy.settingsKeys ?? []),
  ];
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const id = settingId(candidate);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function readSnapshotValue(
  command: ReadCommand,
  snapshots: Record<SettingsNamespace, Record<string, string>>,
): string | undefined {
  return snapshots[command.namespace][command.key];
}

function extractPackageMutations(command: string): PackageMutation[] {
  const result: PackageMutation[] = [];
  const regex =
    /pm\s+(uninstall|disable-user|install-existing|enable)\b[^&]*?\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(command)) !== null) {
    result.push({
      verb: match[1] as PackageMutation["verb"],
      packageName: match[2],
    });
  }
  return result;
}

function exactPackageSet(output: string): Set<string> {
  return new Set(
    output
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^package:/, ""))
      .filter(Boolean),
  );
}

function matchesActiveValue(
  item: XiaomiExperienceItem,
  value: string,
): boolean {
  if (item.activeValues) return item.activeValues.includes(value);
  return value === "1";
}

async function getMaximumRefreshRate(deviceId: string): Promise<string | null> {
  const result = await runAdbCommandDetailed(deviceId, "dumpsys display");
  if (!result.success) return null;
  const values = [
    ...result.output.matchAll(/(?:fps|refreshRate)\s*=\s*(\d+(?:\.\d+)?)/gi),
  ]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= 30 && value <= 240);
  if (values.length === 0) return null;
  return String(Math.round(Math.max(...values)));
}

async function materializeCommand(
  deviceId: string,
  command: string,
): Promise<{ success: boolean; command: string; error?: string }> {
  if (!command.includes("{maxRefreshRate}")) {
    return { success: true, command };
  }
  const maximum = await getMaximumRefreshRate(deviceId);
  if (!maximum) {
    return {
      success: false,
      command,
      error: "Không xác định được tần số quét tối đa được phần cứng công bố.",
    };
  }
  return {
    success: true,
    command: command.replaceAll("{maxRefreshRate}", maximum),
  };
}

/**
 * Key OEM chưa tồn tại không đồng nghĩa framework không hỗ trợ. Đánh dấu là
 * EXPERIMENTAL để người dùng có thể chủ động tạo key với snapshot/rollback.
 */
export async function getExperienceCapabilities(
  deviceId: string,
): Promise<ExperienceItemStatus[]> {
  try {
    const profile = await getDeviceProfile(deviceId);
    const [
      installedPkgs,
      globalSettings,
      secureSettings,
      systemSettings,
      disabled,
    ] = await Promise.all([
      getInstalledPackageSet(deviceId),
      readSettingsSnapshot(deviceId, "global"),
      readSettingsSnapshot(deviceId, "secure"),
      readSettingsSnapshot(deviceId, "system"),
      runAdbCommandDetailed(deviceId, "pm list packages --user 0 -d"),
    ]);
    const disabledPkgs = disabled.success
      ? exactPackageSet(disabled.output)
      : new Set<string>();
    const snapshots = {
      global: globalSettings,
      secure: secureSettings,
      system: systemSettings,
    };

    const result: ExperienceItemStatus[] = [];
    for (const item of XIAOMI_EXPERIENCE_ITEMS) {
      const { brand, minSdk, packages } = item.detectStrategy;
      if (
        brand?.length &&
        !brand.some((value) =>
          `${profile.brand} ${profile.manufacturer}`
            .toUpperCase()
            .includes(value.toUpperCase()),
        )
      ) {
        result.push({
          item,
          status: "UNSUPPORTED",
          reason: "Không đúng hãng thiết bị.",
        });
        continue;
      }
      if (minSdk && profile.sdk < minSdk) {
        result.push({
          item,
          status: "UNSUPPORTED",
          reason: `Yêu cầu SDK ${minSdk}+.`,
        });
        continue;
      }
      if (item.id === "hyperos_super_clipboard") {
        const hasCrossDevice =
          installedPkgs.has("com.milink.service") ||
          installedPkgs.has("com.miui.crossdevice") ||
          installedPkgs.has("com.xiaomi.mirror");
        if (!hasCrossDevice) {
          result.push({
            item,
            status: "UNSUPPORTED",
            reason:
              "⚠️ CHƯA CÀI APK BẮT BUỘC: Thiết bị chưa cài Mi Connectivity Service / HyperOS Interconnectivity (com.milink.service). Vui lòng tải APK tại https://memeosupdates.com/apps/com.milink.service và cài đặt trước!",
          });
          continue;
        }
      }

      if (
        packages?.length &&
        !packages.every((pkg) => installedPkgs.has(pkg))
      ) {
        const missing = packages.filter((pkg) => !installedPkgs.has(pkg));
        result.push({
          item,
          status: "UNSUPPORTED",
          reason: `Thiếu package hệ thống bắt buộc (${missing.join(", ")}).`,
        });
        continue;
      }

      const candidates = candidateReadCommands(item);
      const resolvedReadCommand = candidates.find((candidate) => {
        const value = readSnapshotValue(candidate, snapshots);
        return value !== undefined && value !== "null";
      });

      if (resolvedReadCommand) {
        const currentValue = readSnapshotValue(resolvedReadCommand, snapshots)!;
        let isEnabled = matchesActiveValue(item, currentValue);
        if (item.dynamicActiveValue === "max-refresh-rate") {
          const maximum = await getMaximumRefreshRate(deviceId);
          isEnabled =
            maximum !== null && Number(currentValue) >= Number(maximum);
        }
        result.push({
          item,
          status: isEnabled ? "SUPPORTED_ON" : "SUPPORTED_OFF",
          currentValue,
          resolvedReadCommand,
        });
        continue;
      }

      const packageMutations = extractPackageMutations(item.enableCommand);
      if (packageMutations.length > 0) {
        const targetPackages = [
          ...new Set(packageMutations.map((entry) => entry.packageName)),
        ];
        const existingTargets = targetPackages.filter((pkg) =>
          installedPkgs.has(pkg),
        );
        if (existingTargets.length === 0) {
          result.push({
            item,
            status: "UNSUPPORTED",
            reason: "Không có package mục tiêu trên ROM.",
          });
        } else {
          result.push({
            item,
            status: existingTargets.every((pkg) => disabledPkgs.has(pkg))
              ? "SUPPORTED_ON"
              : "SUPPORTED_OFF",
            currentValue: existingTargets.every((pkg) => disabledPkgs.has(pkg))
              ? "disabled"
              : "enabled",
          });
        }
        continue;
      }

      const knownCandidate = candidates.find((candidate) =>
        KNOWN_PLATFORM_SETTINGS.has(settingId(candidate)),
      );
      if (knownCandidate) {
        result.push({
          item,
          status: "SUPPORTED_OFF",
          currentValue: "default",
          resolvedReadCommand: knownCandidate,
          reason: "Key đang dùng giá trị mặc định của Android.",
        });
      } else {
        result.push({
          item,
          status: "EXPERIMENTAL",
          currentValue: "not-set",
          resolvedReadCommand: candidates[0],
          reason:
            "ROM chưa có key tương ứng. Có thể thử tạo key; tool sẽ sao lưu, đọc lại và tự hoàn tác nếu ghi thất bại. Hiệu ứng thực tế phụ thuộc framework của ROM.",
        });
      }
    }
    return result;
  } catch (error) {
    console.error("Failed to get experience capabilities:", error);
    return XIAOMI_EXPERIENCE_ITEMS.map((item) => ({ item, status: "ERROR" }));
  }
}

export async function readExperienceItem(
  deviceId: string,
  itemId: string,
): Promise<string> {
  const status = (await getExperienceCapabilities(deviceId)).find(
    ({ item }) => item.id === itemId,
  );
  if (!status)
    throw new Error(`Không tìm thấy item tùy chỉnh với ID: ${itemId}`);
  if (!status.resolvedReadCommand) return "null";
  const result = await runAdbCommandDetailed(
    deviceId,
    `settings get ${status.resolvedReadCommand.namespace} ${status.resolvedReadCommand.key}`,
  );
  if (!result.success) throw new Error(result.output);
  return result.output.trim();
}

async function executeCommandChain(
  deviceId: string,
  command: string,
): Promise<{ success: boolean; output: string }> {
  const subCommands = command
    .split("&&")
    .map((value) => value.trim())
    .filter(Boolean);
  const logs: string[] = [];
  for (const subCommand of subCommands) {
    const execution = await runAdbCommandDetailed(deviceId, subCommand);
    logs.push(execution.output.trim() || "OK");
    if (!execution.success) return { success: false, output: logs.join("\n") };
  }
  return { success: true, output: logs.join("\n") };
}

async function verifyCommandEffect(
  deviceId: string,
  command: string,
): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const subCommands = command
    .split("&&")
    .map((value) => value.trim())
    .filter(Boolean);
  let verifiedTargets = 0;

  for (const subCommand of subCommands) {
    const put = subCommand.match(
      /^settings put (global|secure|system) ([a-zA-Z0-9_.-]+) ([a-zA-Z0-9_.,:+*\-/=]+)$/,
    );
    if (put) {
      const result = await runAdbCommandDetailed(
        deviceId,
        `settings get ${put[1]} ${put[2]}`,
      );
      if (!result.success || result.output.trim() !== put[3]) return false;
      verifiedTargets++;
      continue;
    }
    const deletion = subCommand.match(
      /^settings delete (global|secure|system) ([a-zA-Z0-9_.-]+)$/,
    );
    if (deletion) {
      const result = await runAdbCommandDetailed(
        deviceId,
        `settings get ${deletion[1]} ${deletion[2]}`,
      );
      if (!result.success || !["", "null"].includes(result.output.trim()))
        return false;
      verifiedTargets++;
      continue;
    }
    const setpropMatch = subCommand.match(/^setprop ([a-zA-Z0-9_.-]+) (.*)$/);
    if (setpropMatch) {
      const result = await runAdbCommandDetailed(
        deviceId,
        `getprop ${setpropMatch[1]}`,
      );
      if (!result.success || result.output.trim() !== setpropMatch[2])
        return false;
      verifiedTargets++;
      continue;
    }
  }

  const packageMutations = extractPackageMutations(command);
  if (packageMutations.length > 0) {
    const [installedResult, disabledResult] = await Promise.all([
      runAdbCommandDetailed(deviceId, "pm list packages --user 0"),
      runAdbCommandDetailed(deviceId, "pm list packages --user 0 -d"),
    ]);
    if (!installedResult.success || !disabledResult.success) return false;
    const installed = exactPackageSet(installedResult.output);
    const disabled = exactPackageSet(disabledResult.output);
    for (const mutation of packageMutations) {
      const valid =
        mutation.verb === "uninstall"
          ? !installed.has(mutation.packageName)
          : mutation.verb === "disable-user"
            ? disabled.has(mutation.packageName)
            : installed.has(mutation.packageName) &&
              !disabled.has(mutation.packageName);
      if (!valid) return false;
      verifiedTargets++;
    }
  }
  return verifiedTargets > 0;
}

async function assertSettingsReadable(
  deviceId: string,
  commands: string[],
): Promise<{ success: boolean; error?: string }> {
  const targets = extractSnapshotTargets(commands).settings;
  for (const target of targets) {
    const result = await runAdbCommandDetailed(
      deviceId,
      `settings get ${target.namespace} ${target.key}`,
    );
    if (!result.success) {
      return {
        success: false,
        error: `Không đọc được namespace ${target.namespace} trước khi ghi key ${target.key}.`,
      };
    }
  }
  return { success: true };
}

export async function applyExperienceItem(
  deviceId: string,
  itemId: string,
  enable: boolean,
): Promise<XiaomiApplyResult> {
  const item = XIAOMI_EXPERIENCE_ITEMS.find(
    (candidate) => candidate.id === itemId,
  );
  if (!item) throw new Error(`Không tìm thấy item tùy chỉnh với ID: ${itemId}`);

  const [profile, capabilities] = await Promise.all([
    getDeviceProfile(deviceId),
    getExperienceCapabilities(deviceId),
  ]);
  const capability = capabilities.find(
    ({ item: value }) => value.id === itemId,
  );
  if (
    !capability ||
    ["UNSUPPORTED", "UNKNOWN", "ERROR"].includes(capability.status)
  ) {
    return {
      success: false,
      output: `[UNSUPPORTED] ${capability?.reason ?? "Không xác minh được capability trên thiết bị."}`,
      usedFallback: false,
    };
  }

  const rawCommands = [
    enable ? item.enableCommand : item.disableCommand,
    ...(enable
      ? (item.fallbackEnableCommands ?? [])
      : (item.fallbackDisableCommands ?? [])),
  ];
  const materialized = await Promise.all(
    rawCommands.map((command) => materializeCommand(deviceId, command)),
  );
  const materializeError = materialized.find((entry) => !entry.success);
  if (materializeError) {
    return {
      success: false,
      output: `[BLOCKED] ${materializeError.error}`,
      usedFallback: false,
    };
  }
  const commands = materialized.map((entry) => entry.command);

  const preflight = await assertSettingsReadable(deviceId, [commands[0]]);
  if (!preflight.success) {
    return {
      success: false,
      output: `[UNSUPPORTED] ${preflight.error}`,
      usedFallback: false,
    };
  }

  const deviceIdentity = buildSnapshotDeviceIdentity(profile);
  const snapshot = await captureMutationSnapshot({
    deviceIdentity,
    scope: "xiaomi-experience",
    actionId: item.id,
    commands,
    execute: (command) => runAdbCommandDetailed(deviceId, command),
  });
  if (!snapshot.success) {
    return {
      success: false,
      output: `[BLOCKED] ${snapshot.error}`,
      usedFallback: false,
    };
  }

  const logs: string[] = [];
  for (let index = 0; index < commands.length; index++) {
    const commandPreflight = await assertSettingsReadable(deviceId, [
      commands[index],
    ]);
    if (!commandPreflight.success) {
      logs.push(
        `[${index === 0 ? "Primary" : `Fallback ${index}`}] Bỏ qua: ${commandPreflight.error}`,
      );
      continue;
    }
    const execution = await executeCommandChain(deviceId, commands[index]);
    logs.push(
      `[${index === 0 ? "Primary" : `Fallback ${index}`}] ${execution.output}`,
    );
    if (
      execution.success &&
      (await verifyCommandEffect(deviceId, commands[index]))
    ) {
      logs.push("[VERIFY] Đã xác minh toàn bộ giá trị/package bị tác động.");
      if (item.id === "hyperos_super_clipboard" && enable) {
        logs.push(
          "[THÔNG BÁO KHỞI ĐỘNG LAỊ] Đã bật tính năng thành công! Vui lòng KHỞI ĐỘNG LẠI THIẾT BỊ (hoặc khởi động lại ứng dụng Bàn phím) để hệ thống áp dụng HyperOS Super Clipboard.",
        );
      }
      return {
        success: true,
        output: logs.join("\n"),
        usedFallback: index > 0,
      };
    }
  }

  const rollback = await restoreMutationSnapshot({
    deviceIdentity,
    scope: "xiaomi-experience",
    actionId: item.id,
    execute: (command) => runAdbCommandDetailed(deviceId, command),
  });
  if (rollback.success) {
    deleteMutationSnapshot(deviceIdentity, "xiaomi-experience", item.id);
  }
  logs.push(
    "[FAIL-SAFE] Không xác minh được tác dụng; đã chạy hoàn tác tự động.",
  );
  logs.push(rollback.output);
  return {
    success: false,
    output: logs.join("\n"),
    usedFallback: commands.length > 1,
  };
}

export async function rollbackExperienceItem(
  deviceId: string,
  itemId: string,
): Promise<{ success: boolean; output: string }> {
  const item = XIAOMI_EXPERIENCE_ITEMS.find(
    (candidate) => candidate.id === itemId,
  );
  if (!item) throw new Error(`Không tìm thấy item tùy chỉnh với ID: ${itemId}`);
  const profile = await getDeviceProfile(deviceId);
  return restoreMutationSnapshot({
    deviceIdentity: buildSnapshotDeviceIdentity(profile),
    scope: "xiaomi-experience",
    actionId: item.id,
    execute: (command) => runAdbCommandDetailed(deviceId, command),
  });
}
