/**
 * Shared Validation — dùng cho cả main process và renderer.
 * KHÔNG import module Node.js nào (phải chạy được ở browser).
 */

// Regex
export const DEVICE_ID_REGEX = /^[a-zA-Z0-9_.:-]+$/;
export const PACKAGE_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/;
export const SETTINGS_KEY_REGEX = /^[a-zA-Z0-9_.-]+$/;
export const REMOTE_PATH_DANGEROUS_CHARS = /[\0"';&|`$\n\r\\*?\[\]{}<>]/;
export const LOCAL_PATH_DANGEROUS_CHARS = /[\0;&|`$\n\r]/;

const REMOTE_PATH_ROOTS = ["/sdcard", "/storage", "/data/local/tmp"];

// Types
export type AppAction = "uninstall" | "disable" | "enable" | "clear" | "stop" | "restore";
export type DebloatAction = "uninstall" | "disable" | "restore";
export type SettingsNamespace = "system" | "secure" | "global";
export type PackageFilter = "all" | "system" | "third";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Validate functions (return boolean, không throw)
export function validateDeviceId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 100 && DEVICE_ID_REGEX.test(id);
}

export function validatePackageName(pkg: unknown): pkg is string {
  return typeof pkg === "string" && pkg.length > 0 && pkg.length <= 128 && PACKAGE_NAME_REGEX.test(pkg);
}

export function validateRemotePath(p: unknown): p is string {
  if (typeof p !== "string" || p.length === 0 || p.length > 512) return false;
  const norm = normalizeRemotePath(p);
  if (REMOTE_PATH_DANGEROUS_CHARS.test(norm) || norm.includes("..")) return false;
  return REMOTE_PATH_ROOTS.some((r) => norm === r || norm.startsWith(`${r}/`));
}

export function validateLocalPath(p: unknown): p is string {
  if (typeof p !== "string" || p.length === 0 || p.length > 1024) return false;
  if (LOCAL_PATH_DANGEROUS_CHARS.test(p)) return false;
  return /^[A-Za-z]:\\/.test(p) || p.startsWith("/");
}

export function validateApkPath(p: unknown): p is string {
  if (!validateLocalPath(p)) return false;
  const lower = (p as string).toLowerCase();
  return (
    lower.endsWith(".apk") ||
    lower.endsWith(".xapk") ||
    lower.endsWith(".apks") ||
    lower.endsWith(".zip")
  );
}

export function validateAppAction(a: unknown): a is AppAction {
  return (
    typeof a === "string" &&
    ["uninstall", "disable", "enable", "clear", "stop", "restore"].includes(a)
  );
}

export function validateDebloatAction(a: unknown): a is DebloatAction {
  return typeof a === "string" && ["uninstall", "disable", "restore"].includes(a);
}

export function validateSettingsNamespace(n: unknown): n is SettingsNamespace {
  return typeof n === "string" && ["system", "secure", "global"].includes(n);
}

export function validatePackageFilter(f: unknown): f is PackageFilter {
  return typeof f === "string" && ["all", "system", "third"].includes(f);
}

export function validateDpi(d: unknown): d is number {
  return Number.isInteger(d) && (d as number) >= 160 && (d as number) <= 640;
}

export function validateResolution(w: unknown, h: unknown): boolean {
  return (
    Number.isInteger(w) &&
    Number.isInteger(h) &&
    (w as number) >= 480 &&
    (w as number) <= 3840 &&
    (h as number) >= 800 &&
    (h as number) <= 3840
  );
}

export function validateAnimationScale(s: unknown): s is 0 | 0.5 | 1 {
  return s === 0 || s === 0.5 || s === 1;
}

export function validateBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

export function validateShellCommand(c: unknown): c is string {
  return typeof c === "string" && c.trim().length > 0 && c.length <= 10000;
}

// Utilities
export function normalizeRemotePath(p: string): string {
  return p.trim().replace(/\/+/g, "/");
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function escapeShell(str: string): string {
  if (!str || str.length === 0) throw new Error("Invalid input: empty string");
  return `'${str.replace(/'/g, "'\\''")}'`;
}

// UI-only validators
export function validatePointerSpeed(s: number): ValidationResult {
  if (!Number.isInteger(s)) return { valid: false, error: "Phải là số nguyên" };
  if (s < -7 || s > 7) return { valid: false, error: "Phải từ -7 đến 7" };
  return { valid: true };
}

export function validateBgLimit(l: number): ValidationResult {
  if (l !== -1 && (l < 0 || l > 32)) return { valid: false, error: "Phải từ 0-32 hoặc -1" };
  return { valid: true };
}
