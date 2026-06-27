import * as path from "path";
import {
  validateDeviceId,
  validatePackageName,
  validateRemotePath,
  validateApkPath,
  validateAppAction,
  validateDebloatAction,
  validateSettingsNamespace,
  validatePackageFilter,
  validateDpi,
  validateResolution,
  validateAnimationScale,
  validateBoolean,
  validateShellCommand,
  AppAction,
  DebloatAction,
  SettingsNamespace,
  PackageFilter,
  shellQuote,
  normalizeRemotePath,
  LOCAL_PATH_DANGEROUS_CHARS,
} from "../../shared/validation";

export type { AppAction, DebloatAction, SettingsNamespace, PackageFilter };
export { shellQuote, normalizeRemotePath };

export function assertValidDeviceId(id: unknown): asserts id is string {
  if (!validateDeviceId(id)) {
    throw new Error("Invalid deviceId");
  }
}

export function isValidDeviceId(id: unknown): id is string {
  return validateDeviceId(id);
}

export function assertValidPackageName(pkg: unknown): asserts pkg is string {
  if (!validatePackageName(pkg)) {
    throw new Error("Invalid package name");
  }
}

export function isValidPackageName(pkg: unknown): pkg is string {
  return validatePackageName(pkg);
}

export function assertValidRemotePath(remotePath: unknown): asserts remotePath is string {
  if (!validateRemotePath(remotePath)) {
    throw new Error("Invalid remote path");
  }
}

export function isValidRemotePath(remotePath: unknown): remotePath is string {
  return validateRemotePath(remotePath);
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
  if (!validateApkPath(apkPath)) {
    throw new Error("Invalid APK path");
  }
}

export function assertValidAppAction(action: unknown): asserts action is AppAction {
  if (!validateAppAction(action)) {
    throw new Error("Invalid app action");
  }
}

export function assertValidDebloatAction(action: unknown): asserts action is DebloatAction {
  if (!validateDebloatAction(action)) {
    throw new Error("Invalid debloat action");
  }
}

export function assertValidSettingsNamespace(namespace: unknown): asserts namespace is SettingsNamespace {
  if (!validateSettingsNamespace(namespace)) {
    throw new Error("Invalid settings namespace");
  }
}

export function assertValidPackageFilter(filter: unknown): asserts filter is PackageFilter {
  if (!validatePackageFilter(filter)) {
    throw new Error("Invalid package filter");
  }
}

export function assertValidDpi(dpi: unknown): asserts dpi is number {
  if (!validateDpi(dpi)) {
    throw new Error("Invalid DPI value");
  }
}

export function assertValidResolution(width: unknown, height: unknown): asserts width is number {
  if (!validateResolution(width, height)) {
    throw new Error("Invalid resolution");
  }
}

export function assertValidBoolean(value: unknown, label: string): asserts value is boolean {
  if (!validateBoolean(value)) {
    throw new Error(`Invalid ${label}`);
  }
}

export function assertValidAnimationScale(scale: unknown): asserts scale is 0 | 0.5 | 1 {
  if (!validateAnimationScale(scale)) {
    throw new Error("Invalid animation scale");
  }
}

export function assertValidShellCommand(command: unknown): asserts command is string {
  if (!validateShellCommand(command)) {
    throw new Error("Invalid shell command");
  }
}
