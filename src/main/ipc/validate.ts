import * as path from "path";

export type AppAction =
  | "uninstall"
  | "disable"
  | "enable"
  | "clear"
  | "stop"
  | "restore";
export type DebloatAction = "uninstall" | "disable" | "restore";
export type SettingsNamespace = "system" | "secure" | "global";
export type PackageFilter = "all" | "system" | "third";

const DEVICE_ID_REGEX = /^[a-zA-Z0-9_.:-]+$/;
const PACKAGE_NAME_REGEX =
  /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/;
const REMOTE_PATH_ROOTS = ["/sdcard", "/storage", "/data/local/tmp"];
const REMOTE_PATH_DANGEROUS_CHARS = /[\0"';&|`$\n\r\\*?[\]{}<>]/;
const LOCAL_PATH_DANGEROUS_CHARS = /[\0;&|`$\n\r]/;
const APP_ACTIONS = new Set<AppAction>([
  "uninstall",
  "disable",
  "enable",
  "clear",
  "stop",
  "restore",
]);
const DEBLOAT_ACTIONS = new Set<DebloatAction>([
  "uninstall",
  "disable",
  "restore",
]);
const SETTINGS_NAMESPACES = new Set<SettingsNamespace>([
  "system",
  "secure",
  "global",
]);
const PACKAGE_FILTERS = new Set<PackageFilter>(["all", "system", "third"]);

export function assertValidDeviceId(id: unknown): asserts id is string {
  if (
    typeof id !== "string" ||
    id.length === 0 ||
    id.length > 100 ||
    !DEVICE_ID_REGEX.test(id)
  ) {
    throw new Error("Invalid deviceId");
  }
}

export function isValidDeviceId(id: unknown): id is string {
  try {
    assertValidDeviceId(id);
    return true;
  } catch {
    return false;
  }
}

export function assertValidPackageName(pkg: unknown): asserts pkg is string {
  if (
    typeof pkg !== "string" ||
    pkg.length === 0 ||
    pkg.length > 128 ||
    !PACKAGE_NAME_REGEX.test(pkg)
  ) {
    throw new Error("Invalid package name");
  }
}

export function isValidPackageName(pkg: unknown): pkg is string {
  try {
    assertValidPackageName(pkg);
    return true;
  } catch {
    return false;
  }
}

export function normalizeRemotePath(remotePath: string): string {
  return remotePath.trim().replace(/\/+/g, "/");
}

export function assertValidRemotePath(
  remotePath: unknown,
): asserts remotePath is string {
  if (
    typeof remotePath !== "string" ||
    remotePath.length === 0 ||
    remotePath.length > 512
  ) {
    throw new Error("Invalid remote path");
  }

  const normalized = normalizeRemotePath(remotePath);
  if (
    REMOTE_PATH_DANGEROUS_CHARS.test(normalized) ||
    normalized.includes("..")
  ) {
    throw new Error("Invalid remote path");
  }

  const isAllowedRoot = REMOTE_PATH_ROOTS.some(
    (root) => normalized === root || normalized.startsWith(`${root}/`),
  );
  if (!isAllowedRoot) {
    throw new Error("Remote path is outside allowed storage roots");
  }
}

export function isValidRemotePath(remotePath: unknown): remotePath is string {
  try {
    assertValidRemotePath(remotePath);
    return true;
  } catch {
    return false;
  }
}

export function assertValidLocalPath(localPath: unknown): asserts localPath is string {
  if (
    typeof localPath !== "string" ||
    localPath.length === 0 ||
    localPath.length > 1024 ||
    LOCAL_PATH_DANGEROUS_CHARS.test(localPath) ||
    !path.isAbsolute(localPath)
  ) {
    throw new Error("Invalid local path");
  }
}

export function assertValidApkPath(apkPath: unknown): asserts apkPath is string {
  assertValidLocalPath(apkPath);
  if (!apkPath.toLowerCase().endsWith(".apk")) {
    throw new Error("Invalid APK path");
  }
}

export function assertValidAppAction(action: unknown): asserts action is AppAction {
  if (typeof action !== "string" || !APP_ACTIONS.has(action as AppAction)) {
    throw new Error("Invalid app action");
  }
}

export function assertValidDebloatAction(
  action: unknown,
): asserts action is DebloatAction {
  if (
    typeof action !== "string" ||
    !DEBLOAT_ACTIONS.has(action as DebloatAction)
  ) {
    throw new Error("Invalid debloat action");
  }
}

export function assertValidSettingsNamespace(
  namespace: unknown,
): asserts namespace is SettingsNamespace {
  if (
    typeof namespace !== "string" ||
    !SETTINGS_NAMESPACES.has(namespace as SettingsNamespace)
  ) {
    throw new Error("Invalid settings namespace");
  }
}

export function assertValidPackageFilter(
  filter: unknown,
): asserts filter is PackageFilter {
  if (
    typeof filter !== "string" ||
    !PACKAGE_FILTERS.has(filter as PackageFilter)
  ) {
    throw new Error("Invalid package filter");
  }
}

export function assertValidDpi(dpi: unknown): asserts dpi is number {
  if (!Number.isInteger(dpi) || (dpi as number) < 160 || (dpi as number) > 640) {
    throw new Error("Invalid DPI value");
  }
}

export function assertValidResolution(
  width: unknown,
  height: unknown,
): asserts width is number {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    (width as number) < 480 ||
    (width as number) > 3840 ||
    (height as number) < 800 ||
    (height as number) > 3840
  ) {
    throw new Error("Invalid resolution");
  }
}

export function assertValidBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid ${label}`);
  }
}

export function assertValidAnimationScale(
  scale: unknown,
): asserts scale is 0 | 0.5 | 1 {
  if (scale !== 0 && scale !== 0.5 && scale !== 1) {
    throw new Error("Invalid animation scale");
  }
}

export function assertValidShellCommand(command: unknown): asserts command is string {
  if (
    typeof command !== "string" ||
    command.trim().length === 0 ||
    command.length > 10000
  ) {
    throw new Error("Invalid shell command");
  }
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
