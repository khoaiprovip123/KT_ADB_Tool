import { createHash } from "crypto";
import { store } from "../store";

export interface SnapshotDeviceProfile {
  identity?: string;
  manufacturer: string;
  model: string;
  device: string;
  incremental: string;
}

export interface CommandResult {
  success: boolean;
  output: string;
}

export type SnapshotExecutor = (command: string) => Promise<CommandResult>;

interface SettingMutation {
  namespace: "global" | "secure" | "system";
  key: string;
}

interface SettingSnapshot extends SettingMutation {
  existed: boolean;
  value?: string;
}

interface PackageSnapshot {
  packageName: string;
  installedForUser: boolean;
  disabledForUser: boolean;
}

interface AppOpMutation {
  packageName: string;
  operation: string;
}

interface AppOpSnapshot extends AppOpMutation {
  mode: "allow" | "deny" | "ignore" | "default" | "foreground";
}

interface WhitelistSnapshot {
  packageName: string;
  whitelisted: boolean;
}

export interface AdbMutationSnapshot {
  version: 1;
  createdAt: string;
  deviceIdentity: string;
  scope: string;
  actionId: string;
  settings: SettingSnapshot[];
  packages: PackageSnapshot[];
  appOps: AppOpSnapshot[];
  deviceIdleWhitelist: WhitelistSnapshot[];
}

const STORE_KEY = "adbMutationSnapshotsV1";
const SAFE_SETTING_VALUE = /^[a-zA-Z0-9_.,:+*\-/=]*$/;
const PACKAGE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+$/;
const APP_OP = /^[A-Z][A-Z0-9_]{1,63}$/;
const APP_OP_MODES = new Set([
  "allow",
  "deny",
  "ignore",
  "default",
  "foreground",
]);

function normalizeCommand(command: string): string {
  return command
    .trim()
    .replace(/^shell\s+/i, "")
    .trim();
}

function exactPackageMatch(output: string, packageName: string): boolean {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === `package:${packageName}`);
}

function getSnapshotMap(): Record<string, AdbMutationSnapshot> {
  const value = store.get(STORE_KEY, {});
  return value && typeof value === "object"
    ? (value as Record<string, AdbMutationSnapshot>)
    : {};
}

function snapshotStorageKey(
  deviceIdentity: string,
  scope: string,
  actionId: string,
): string {
  return `${deviceIdentity}:${scope}:${actionId}`;
}

export function buildSnapshotDeviceIdentity(
  profile: SnapshotDeviceProfile,
): string {
  if (profile.identity) return profile.identity;
  const material = [
    profile.manufacturer,
    profile.model,
    profile.device,
    profile.incremental,
  ].join("|");
  return createHash("sha256").update(material).digest("hex");
}

export function extractSnapshotTargets(commands: string[]): {
  settings: SettingMutation[];
  packages: string[];
  appOps: AppOpMutation[];
  deviceIdleWhitelist: string[];
} {
  const settingMap = new Map<string, SettingMutation>();
  const packageNames = new Set<string>();
  const appOpMap = new Map<string, AppOpMutation>();
  const whitelistPackages = new Set<string>();

  for (const commandChain of commands) {
    const subCommands = commandChain
      .split(/&&|##/)
      .map(normalizeCommand)
      .filter(Boolean);

    for (const command of subCommands) {
      const settingMatch = command.match(
        /^settings\s+(?:put|delete)\s+(global|secure|system)\s+([a-zA-Z0-9_.-]+)(?:\s+.*)?$/,
      );
      if (settingMatch) {
        const target: SettingMutation = {
          namespace: settingMatch[1] as SettingMutation["namespace"],
          key: settingMatch[2],
        };
        settingMap.set(`${target.namespace}:${target.key}`, target);
        continue;
      }

      const packageMatch = command.match(
        /^pm\s+(?:disable-user|enable|uninstall|install-existing)\b.*?\s+([a-zA-Z_][a-zA-Z0-9_.-]+)$/,
      );
      if (packageMatch && PACKAGE_NAME.test(packageMatch[1])) {
        packageNames.add(packageMatch[1]);
        continue;
      }

      const appOpMatch = command.match(
        /^cmd\s+appops\s+set\s+([a-zA-Z_][a-zA-Z0-9_.-]+)\s+([A-Z][A-Z0-9_]+)\s+(?:allow|deny|ignore|default|foreground)$/,
      );
      if (
        appOpMatch &&
        PACKAGE_NAME.test(appOpMatch[1]) &&
        APP_OP.test(appOpMatch[2])
      ) {
        const target = {
          packageName: appOpMatch[1],
          operation: appOpMatch[2],
        };
        appOpMap.set(`${target.packageName}:${target.operation}`, target);
        continue;
      }

      const whitelistMatch = command.match(
        /^dumpsys\s+deviceidle\s+whitelist\s+[+-]([a-zA-Z_][a-zA-Z0-9_.-]+)$/,
      );
      if (whitelistMatch && PACKAGE_NAME.test(whitelistMatch[1])) {
        whitelistPackages.add(whitelistMatch[1]);
      }
    }
  }

  return {
    settings: [...settingMap.values()],
    packages: [...packageNames],
    appOps: [...appOpMap.values()],
    deviceIdleWhitelist: [...whitelistPackages],
  };
}

export function getMutationSnapshot(
  deviceIdentity: string,
  scope: string,
  actionId: string,
): AdbMutationSnapshot | undefined {
  return getSnapshotMap()[snapshotStorageKey(deviceIdentity, scope, actionId)];
}

function targetSignature(
  targets: ReturnType<typeof extractSnapshotTargets>,
): string {
  return JSON.stringify({
    settings: targets.settings
      .map(({ namespace, key }) => `${namespace}:${key}`)
      .sort(),
    packages: [...targets.packages].sort(),
    appOps: targets.appOps
      .map(({ packageName, operation }) => `${packageName}:${operation}`)
      .sort(),
    deviceIdleWhitelist: [...targets.deviceIdleWhitelist].sort(),
  });
}

function snapshotTargetSignature(snapshot: AdbMutationSnapshot): string {
  return targetSignature({
    settings: snapshot.settings ?? [],
    packages: (snapshot.packages ?? []).map(({ packageName }) => packageName),
    appOps: snapshot.appOps ?? [],
    deviceIdleWhitelist: (snapshot.deviceIdleWhitelist ?? []).map(
      ({ packageName }) => packageName,
    ),
  });
}

export async function captureMutationSnapshot(options: {
  deviceIdentity: string;
  scope: string;
  actionId: string;
  commands: string[];
  execute: SnapshotExecutor;
}): Promise<{
  success: boolean;
  snapshot?: AdbMutationSnapshot;
  error?: string;
}> {
  const targets = extractSnapshotTargets(options.commands);
  const existing = getMutationSnapshot(
    options.deviceIdentity,
    options.scope,
    options.actionId,
  );
  if (existing) {
    if (snapshotTargetSignature(existing) !== targetSignature(targets)) {
      return {
        success: false,
        error:
          "Snapshot hiện có thuộc tập lệnh cũ. Hãy khôi phục snapshot trước khi áp dụng phiên bản thao tác mới.",
      };
    }
    return { success: true, snapshot: existing };
  }
  if (
    targets.settings.length === 0 &&
    targets.packages.length === 0 &&
    targets.appOps.length === 0 &&
    targets.deviceIdleWhitelist.length === 0
  ) {
    return {
      success: false,
      error: "Không xác định được trạng thái cần sao lưu; thao tác đã bị chặn.",
    };
  }

  const settings: SettingSnapshot[] = [];
  for (const target of targets.settings) {
    const result = await options.execute(
      `settings get ${target.namespace} ${target.key}`,
    );
    if (!result.success) {
      return {
        success: false,
        error: `Không đọc được ${target.namespace}:${target.key} để tạo điểm khôi phục.`,
      };
    }
    const value = result.output.trim();
    const existed = value !== "" && value !== "null";
    if (existed && !SAFE_SETTING_VALUE.test(value)) {
      return {
        success: false,
        error: `Giá trị hiện tại của ${target.namespace}:${target.key} không thể khôi phục bằng lệnh an toàn.`,
      };
    }
    settings.push({ ...target, existed, value: existed ? value : undefined });
  }

  const packages: PackageSnapshot[] = [];
  for (const packageName of targets.packages) {
    const [installedResult, disabledResult] = await Promise.all([
      options.execute(`pm list packages --user 0 ${packageName}`),
      options.execute(`pm list packages --user 0 -d ${packageName}`),
    ]);
    if (!installedResult.success || !disabledResult.success) {
      return {
        success: false,
        error: `Không đọc được trạng thái package ${packageName} để tạo điểm khôi phục.`,
      };
    }
    packages.push({
      packageName,
      installedForUser: exactPackageMatch(installedResult.output, packageName),
      disabledForUser: exactPackageMatch(disabledResult.output, packageName),
    });
  }

  const appOps: AppOpSnapshot[] = [];
  for (const target of targets.appOps) {
    const result = await options.execute(
      `cmd appops get ${target.packageName} ${target.operation}`,
    );
    if (!result.success) {
      return {
        success: false,
        error: `Không đọc được AppOp ${target.packageName}:${target.operation}.`,
      };
    }
    const modeMatch = result.output.match(
      /:\s*(allow|deny|ignore|default|foreground)\b/i,
    );
    const mode = (modeMatch?.[1]?.toLowerCase() ??
      "default") as AppOpSnapshot["mode"];
    if (!APP_OP_MODES.has(mode)) {
      return { success: false, error: `AppOp mode không an toàn: ${mode}` };
    }
    appOps.push({ ...target, mode });
  }

  const deviceIdleWhitelist: WhitelistSnapshot[] = [];
  if (targets.deviceIdleWhitelist.length > 0) {
    const result = await options.execute("dumpsys deviceidle whitelist");
    if (!result.success) {
      return { success: false, error: "Không đọc được Device Idle whitelist." };
    }
    for (const packageName of targets.deviceIdleWhitelist) {
      deviceIdleWhitelist.push({
        packageName,
        whitelisted: result.output
          .split(/\r?\n/)
          .some((line) => line.trim().endsWith(packageName)),
      });
    }
  }

  const snapshot: AdbMutationSnapshot = {
    version: 1,
    createdAt: new Date().toISOString(),
    deviceIdentity: options.deviceIdentity,
    scope: options.scope,
    actionId: options.actionId,
    settings,
    packages,
    appOps,
    deviceIdleWhitelist,
  };
  const snapshots = getSnapshotMap();
  snapshots[
    snapshotStorageKey(options.deviceIdentity, options.scope, options.actionId)
  ] = snapshot;
  store.set(STORE_KEY, snapshots);
  return { success: true, snapshot };
}

async function restoreNightMode(
  value: string,
  execute: SnapshotExecutor,
): Promise<CommandResult> {
  const mode =
    value === "0"
      ? "auto"
      : value === "1"
        ? "no"
        : value === "2"
          ? "yes"
          : value === "3"
            ? "custom"
            : "";
  if (!mode) {
    return {
      success: false,
      output: `Giá trị ui_night_mode không hợp lệ: ${value}`,
    };
  }
  return execute(`cmd uimode night ${mode}`);
}

export async function restoreMutationSnapshot(options: {
  deviceIdentity: string;
  scope: string;
  actionId: string;
  execute: SnapshotExecutor;
  deleteOnSuccess?: boolean;
}): Promise<{ success: boolean; output: string }> {
  const snapshot = getMutationSnapshot(
    options.deviceIdentity,
    options.scope,
    options.actionId,
  );
  if (!snapshot) {
    return {
      success: false,
      output: "Không có điểm khôi phục an toàn cho thao tác này.",
    };
  }

  const logs: string[] = [];
  let success = true;

  for (const setting of [...snapshot.settings].reverse()) {
    let result: CommandResult;
    if (
      setting.namespace === "secure" &&
      setting.key === "ui_night_mode" &&
      setting.existed &&
      setting.value
    ) {
      result = await restoreNightMode(setting.value, options.execute);
    } else {
      const command = setting.existed
        ? `settings put ${setting.namespace} ${setting.key} ${setting.value}`
        : `settings delete ${setting.namespace} ${setting.key}`;
      result = await options.execute(command);
    }
    let verified = result.success;
    if (result.success) {
      const readBack = await options.execute(
        `settings get ${setting.namespace} ${setting.key}`,
      );
      const current = readBack.output.trim();
      verified =
        readBack.success &&
        (setting.existed
          ? current === setting.value
          : current === "" || current === "null");
    }
    logs.push(
      `${setting.namespace}:${setting.key}: ${verified ? "verified" : result.output || "FAILED"}`,
    );
    success = success && verified;
  }

  for (const pkg of [...snapshot.packages].reverse()) {
    const current = await options.execute(
      `pm list packages --user 0 ${pkg.packageName}`,
    );
    let installedForUser =
      current.success && exactPackageMatch(current.output, pkg.packageName);

    if (pkg.installedForUser && !installedForUser) {
      const install = await options.execute(
        `pm install-existing --user 0 ${pkg.packageName}`,
      );
      logs.push(
        `${pkg.packageName}: ${install.output || (install.success ? "restored" : "FAILED")}`,
      );
      success = success && install.success;
      installedForUser = install.success;
    } else if (!pkg.installedForUser && installedForUser) {
      const uninstall = await options.execute(
        `pm uninstall -k --user 0 ${pkg.packageName}`,
      );
      logs.push(
        `${pkg.packageName}: ${uninstall.output || (uninstall.success ? "removed for user" : "FAILED")}`,
      );
      success = success && uninstall.success;
      installedForUser = !uninstall.success;
    }

    if (installedForUser) {
      const stateCommand = pkg.disabledForUser
        ? `pm disable-user --user 0 ${pkg.packageName}`
        : `pm enable ${pkg.packageName}`;
      const stateResult = await options.execute(stateCommand);
      logs.push(
        `${pkg.packageName}: ${stateResult.output || (stateResult.success ? "state restored" : "FAILED")}`,
      );
      success = success && stateResult.success;
    }

    const [installedCheck, disabledCheck] = await Promise.all([
      options.execute(`pm list packages --user 0 ${pkg.packageName}`),
      options.execute(`pm list packages --user 0 -d ${pkg.packageName}`),
    ]);
    const packageVerified =
      installedCheck.success &&
      disabledCheck.success &&
      exactPackageMatch(installedCheck.output, pkg.packageName) ===
        pkg.installedForUser &&
      exactPackageMatch(disabledCheck.output, pkg.packageName) ===
        (pkg.installedForUser && pkg.disabledForUser);
    logs.push(
      `${pkg.packageName}: ${packageVerified ? "verified" : "verification failed"}`,
    );
    success = success && packageVerified;
  }

  for (const appOp of [...(snapshot.appOps ?? [])].reverse()) {
    const result = await options.execute(
      `cmd appops set ${appOp.packageName} ${appOp.operation} ${appOp.mode}`,
    );
    const readBack = result.success
      ? await options.execute(
          `cmd appops get ${appOp.packageName} ${appOp.operation}`,
        )
      : { success: false, output: "" };
    const verified =
      readBack.success &&
      new RegExp(`:\\s*${appOp.mode}\\b`, "i").test(readBack.output);
    logs.push(
      `${appOp.packageName}:${appOp.operation}: ${verified ? "verified" : result.output || "FAILED"}`,
    );
    success = success && verified;
  }

  for (const entry of [...(snapshot.deviceIdleWhitelist ?? [])].reverse()) {
    const sign = entry.whitelisted ? "+" : "-";
    const result = await options.execute(
      `dumpsys deviceidle whitelist ${sign}${entry.packageName}`,
    );
    const readBack = result.success
      ? await options.execute("dumpsys deviceidle whitelist")
      : { success: false, output: "" };
    const isListed = readBack.output
      .split(/\r?\n/)
      .some((line) => line.trim().endsWith(entry.packageName));
    const verified = readBack.success && isListed === entry.whitelisted;
    logs.push(
      `${entry.packageName}: ${verified ? "verified" : result.output || "FAILED"}`,
    );
    success = success && verified;
  }

  if (success && options.deleteOnSuccess !== false) {
    const snapshots = getSnapshotMap();
    delete snapshots[
      snapshotStorageKey(
        options.deviceIdentity,
        options.scope,
        options.actionId,
      )
    ];
    store.set(STORE_KEY, snapshots);
  }

  return {
    success,
    output: success
      ? `[ROLLBACK VERIFIED] Đã khôi phục đúng snapshot ${snapshot.createdAt}.\n${logs.join("\n")}`
      : `[ROLLBACK INCOMPLETE] Có giá trị chưa khôi phục được.\n${logs.join("\n")}`,
  };
}

export function deleteMutationSnapshot(
  deviceIdentity: string,
  scope: string,
  actionId: string,
): void {
  const snapshots = getSnapshotMap();
  delete snapshots[snapshotStorageKey(deviceIdentity, scope, actionId)];
  store.set(STORE_KEY, snapshots);
}
