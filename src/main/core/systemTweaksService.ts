import * as fs from "fs";
import * as path from "path";
import { app } from "electron";
import { execAdb, execAdbDetailed, isAdbFailureOutput } from "./adbCore";
import { validatePackageName } from "./adbSafety";
import { CapabilityState, getDeviceProfile } from "./deviceProfileService";
import {
  buildSnapshotDeviceIdentity,
  captureMutationSnapshot,
  extractSnapshotTargets,
  getMutationSnapshot,
  restoreMutationSnapshot,
} from "./adbMutationSnapshot";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type RiskLevel = "SAFE" | "RISKY" | "KEEP";
export type DebloatAction = "uninstall" | "disable" | "restore";
export type PkgStatus = "installed" | "disabled" | "uninstalled" | "unknown";
export type TweakType =
  | "settings_global"
  | "settings_system"
  | "settings_secure"
  | "pm_disable"
  | "wm";

export interface BloatwareEntry {
  package: string;
  name: string;
  description: string;
  risk: RiskLevel;
  category: string;
  preferDisable?: boolean;
}

export interface BloatwareWithStatus extends BloatwareEntry {
  status: PkgStatus;
}

export interface SystemTweak {
  id: string;
  label: string;
  description: string;
  category: "performance" | "privacy" | "display" | "battery";
  risk: RiskLevel;
  enableCmd: string;
  disableCmd: string;
  readCmd?: string;
  enabledValue?: string;
  defaultEnabled: boolean;
  brands?: string[];
}

export interface SystemTweakStatus {
  status: CapabilityState;
  currentValue?: string;
  reason?: string;
}

// ─── BLOATWARE DATABASE ───────────────────────────────────────────────────────

export function getBloatwareDb(brand?: string): BloatwareEntry[] {
  let jsonFileName = "xiaomi_bloatware_removal.json";
  const lowerBrand = (brand || "").toLowerCase();

  if (lowerBrand.includes("samsung")) {
    jsonFileName = "samsung_bloatware.json";
  } else if (
    lowerBrand.includes("oppo") ||
    lowerBrand.includes("realme") ||
    lowerBrand.includes("coloros")
  ) {
    jsonFileName = "coloros_bloatware.json";
  } else if (
    lowerBrand.includes("vivo") ||
    lowerBrand.includes("funtouch") ||
    lowerBrand.includes("origin")
  ) {
    jsonFileName = "funtouch_bloatware.json";
  }

  const candidates = [
    path.join(app.getAppPath(), jsonFileName),
    path.join(app.getAppPath(), "..", jsonFileName),
    path.join(app.getAppPath(), "src/main/core/data", jsonFileName),
    path.join(process.resourcesPath ?? "", jsonFileName),
    path.join(__dirname, "data", jsonFileName),
    path.join(__dirname, "../../xiaomi_bloatware_removal.json"),
    path.join(__dirname, "../../../xiaomi_bloatware_removal.json"),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, "utf-8");
        const json = JSON.parse(raw);
        const packages = Array.isArray(json) ? json : (json.packages ?? []);

        const mapped: BloatwareEntry[] = packages.map((e: any) => {
          let riskVal: RiskLevel = "SAFE";
          if (
            e.classification === "RISKY" ||
            e.recommendation === "Khuyên dùng"
          )
            riskVal = "RISKY";
          if (e.classification === "KEEP") riskVal = "KEEP";
          return {
            package: e.package,
            name: e.name || e.package,
            description: e.side_effects || e.description || "",
            risk: riskVal,
            category: e.group || e.category || "Bloatware",
            preferDisable:
              e.method === "disable" || e.preferDisable || e.safeToRemove,
          };
        });

        return mapped.filter((e) => e.package && e.risk !== "KEEP");
      }
    } catch {
      // thử path kế
    }
  }

  return BUILTIN_BLOATWARE_DB;
}

export async function getPackageStatus(
  deviceId: string,
  packageName: string,
): Promise<PkgStatus> {
  if (!validatePackageName(packageName)) {
    return "uninstalled";
  }

  try {
    const [allResult, disabledResult] = await Promise.all([
      execAdbDetailed(deviceId, `shell pm list packages ${packageName}`),
      execAdbDetailed(deviceId, `shell pm list packages -d ${packageName}`),
    ]);

    if (!allResult.success || !disabledResult.success) return "unknown";

    if (disabledResult.output.includes(packageName)) return "disabled";
    if (allResult.output.includes(packageName)) return "installed";
    return "uninstalled";
  } catch {
    return "unknown";
  }
}

export async function getBloatwareWithStatus(
  deviceId: string,
  brand?: string,
): Promise<BloatwareWithStatus[]> {
  const db = getBloatwareDb(brand);

  const [allRaw, disabledRaw] = await Promise.all([
    execAdb(deviceId, "shell pm list packages"),
    execAdb(deviceId, "shell pm list packages -d"),
  ]);

  const allPkgs = new Set(
    allRaw
      .split("\n")
      .map((l) => l.replace("package:", "").trim())
      .filter(Boolean),
  );
  const disabledPkgs = new Set(
    disabledRaw
      .split("\n")
      .map((l) => l.replace("package:", "").trim())
      .filter(Boolean),
  );

  return db.map((entry): BloatwareWithStatus => {
    let status: PkgStatus = "uninstalled";
    if (disabledPkgs.has(entry.package)) status = "disabled";
    else if (allPkgs.has(entry.package)) status = "installed";
    return { ...entry, status };
  });
}

// ─── DEBLOAT ACTIONS ──────────────────────────────────────────────────────────

const PROTECTED_PACKAGES = new Set([
  "com.android.phone",
  "com.android.settings",
  "com.android.systemui",
  "com.android.launcher3",
  "com.miui.home",
  "com.miui.core",
  "com.android.contacts",
  "com.android.dialer",
  "android",
  "com.android.inputmethod.latin",
  "com.android.server.telecom",
  "com.qualcomm.qti.telephony.vodafoneplugin",
]);

const KNOWN_PLATFORM_SETTING_KEYS = new Set([
  "global:window_animation_scale",
  "global:transition_animation_scale",
  "global:animator_duration_scale",
  "global:background_process_limit",
  "secure:screensaver_enabled",
  "system:show_refresh_rate",
]);

export async function debloatPackage(
  deviceId: string,
  packageName: string,
  action: DebloatAction,
  preferDisable = false,
): Promise<{ success: boolean; message: string }> {
  if (!validatePackageName(packageName)) {
    return {
      success: false,
      message: "[BLOCKED] Tên package không hợp lệ.",
    };
  }

  if (PROTECTED_PACKAGES.has(packageName)) {
    return {
      success: false,
      message: `[BLOCKED] ${packageName} là package hệ thống cốt lõi — không thể can thiệp.`,
    };
  }

  try {
    let cmd: string;
    switch (action) {
      case "uninstall":
        cmd = preferDisable
          ? `shell pm disable-user --user 0 ${packageName}`
          : `shell pm uninstall --user 0 ${packageName}`;
        break;
      case "disable":
        cmd = `shell pm disable-user --user 0 ${packageName}`;
        break;
      case "restore":
        cmd = `shell pm install-existing --user 0 ${packageName}`;
        break;
    }

    let execution = await execAdbDetailed(deviceId, cmd);
    let output = execution.output;
    if (output.includes("[BLOCKED BY SAFETY LAYER]")) {
      return { success: false, message: output.trim() };
    }

    // Auto-fallback: Nếu disable-user bị chặn bởi SecurityException (Android 14+ / HyperOS), tự động chạy pm uninstall --user 0
    if (
      (action === "uninstall" || action === "disable") &&
      (output.includes("SecurityException") ||
        output.includes("Cannot disable"))
    ) {
      const fallbackCmd = `shell pm uninstall --user 0 ${packageName}`;
      execution = await execAdbDetailed(deviceId, fallbackCmd);
      output = execution.output;
    }

    const outLower = output.toLowerCase();
    const isUnknown =
      outLower.includes("unknown package") ||
      outLower.includes("not installed") ||
      outLower.includes("failure [not installed");

    if (isUnknown) {
      return {
        success: action !== "restore",
        message: `Hiện tại không tìm thấy ứng dụng ${packageName} trong hệ thống của bạn, vui lòng kiểm tra lại.`,
      };
    }

    if (!execution.success) {
      return { success: false, message: output.trim() };
    }

    const status = await getPackageStatus(deviceId, packageName);
    const success =
      action === "restore"
        ? status === "installed"
        : action === "disable" || preferDisable
          ? status === "disabled" || status === "uninstalled"
          : status === "uninstalled";

    return {
      success,
      message: success
        ? output.trim() || `Đã xác minh trạng thái: ${status}`
        : `${output.trim()}\nKhông xác minh được trạng thái mong muốn (hiện tại: ${status}).`.trim(),
    };
  } catch (err: any) {
    return { success: false, message: err.message ?? "Unknown error" };
  }
}

export async function batchDebloat(
  deviceId: string,
  packages: Array<{ package: string; preferDisable?: boolean }>,
  action: DebloatAction,
  onProgress?: (done: number, total: number) => void,
): Promise<Array<{ package: string; success: boolean; message: string }>> {
  const results = [];
  for (let i = 0; i < packages.length; i++) {
    const { package: pkg, preferDisable } = packages[i];
    const result = await debloatPackage(
      deviceId,
      pkg,
      action,
      preferDisable ?? false,
    );
    results.push({ package: pkg, ...result });
    onProgress?.(i + 1, packages.length);
  }
  return results;
}

// ─── SYSTEM TWEAKS ────────────────────────────────────────────────────────────

export const SYSTEM_TWEAKS: SystemTweak[] = [
  {
    id: "anim_window",
    label: "Window Animation Scale",
    description: "Đặt tốc độ hoạt ảnh cửa sổ về 0.5x",
    category: "performance",
    risk: "SAFE",
    enableCmd: "shell settings put global window_animation_scale 0.5",
    disableCmd: "shell settings put global window_animation_scale 1.0",
    readCmd: "shell settings get global window_animation_scale",
    enabledValue: "0.5",
    defaultEnabled: false,
  },
  {
    id: "anim_transition",
    label: "Transition Animation Scale",
    description: "Giảm hoạt ảnh chuyển màn hình xuống 0.5x",
    category: "performance",
    risk: "SAFE",
    enableCmd: "shell settings put global transition_animation_scale 0.5",
    disableCmd: "shell settings put global transition_animation_scale 1.0",
    readCmd: "shell settings get global transition_animation_scale",
    enabledValue: "0.5",
    defaultEnabled: false,
  },
  {
    id: "anim_animator",
    label: "Animator Duration Scale",
    description: "Tăng tốc thời gian chạy animator",
    category: "performance",
    risk: "SAFE",
    enableCmd: "shell settings put global animator_duration_scale 0.5",
    disableCmd: "shell settings put global animator_duration_scale 1.0",
    readCmd: "shell settings get global animator_duration_scale",
    enabledValue: "0.5",
    defaultEnabled: false,
  },
  {
    id: "miui_optimization",
    label: "Tắt MIUI Optimization",
    description: "Stock Android experience, tắt MIUI app lifecycle management",
    category: "performance",
    risk: "RISKY",
    enableCmd: "shell settings put secure miui_optimization 0",
    disableCmd: "shell settings put secure miui_optimization 1",
    readCmd: "shell settings get secure miui_optimization",
    enabledValue: "0",
    defaultEnabled: false,
    brands: ["XIAOMI", "REDMI", "POCO"],
  },
  {
    id: "force_gpu",
    label: "Force GPU Rendering",
    description:
      "Thử tạo key force_hw_ui để yêu cầu ROM ưu tiên GPU cho kết xuất 2D.",
    category: "performance",
    risk: "RISKY",
    enableCmd: "shell settings put system force_hw_ui 1",
    disableCmd: "shell settings put system force_hw_ui 0",
    readCmd: "shell settings get system force_hw_ui",
    enabledValue: "1",
    defaultEnabled: false,
  },
  {
    id: "bg_process_limit",
    label: "Giới hạn Background Process",
    description: "Giới hạn số app chạy nền xuống 4 (tiết kiệm RAM)",
    category: "battery",
    risk: "RISKY",
    enableCmd: "shell settings put global background_process_limit 4",
    disableCmd: "shell settings put global background_process_limit -1",
    readCmd: "shell settings get global background_process_limit",
    enabledValue: "4",
    defaultEnabled: false,
  },
  {
    id: "disable_analytics",
    label: "Vô hiệu hóa MIUI Analytics",
    description:
      "Tắt package thu thập dữ liệu com.miui.analytics qua pm disable",
    category: "privacy",
    risk: "RISKY",
    enableCmd: "shell pm disable-user --user 0 com.miui.analytics",
    disableCmd: "shell pm enable com.miui.analytics",
    readCmd: "shell pm list packages -d com.miui.analytics",
    enabledValue: "package:com.miui.analytics",
    defaultEnabled: false,
    brands: ["XIAOMI", "REDMI", "POCO"],
  },
  {
    id: "disable_msa",
    label: "Vô hiệu hóa MSA (MIUI System Ads)",
    description: "Tắt dịch vụ quảng cáo hệ thống MIUI",
    category: "privacy",
    risk: "RISKY",
    enableCmd: "shell pm disable-user --user 0 com.miui.msa.global",
    disableCmd: "shell pm enable com.miui.msa.global",
    readCmd: "shell pm list packages -d com.miui.msa.global",
    enabledValue: "package:com.miui.msa.global",
    defaultEnabled: false,
    brands: ["XIAOMI", "REDMI", "POCO"],
  },
  {
    id: "ad_id_limit",
    label: "Giới hạn Ad ID Tracking",
    description:
      "Thử bật key limit_ad_tracking; hiệu lực phụ thuộc dịch vụ quảng cáo của ROM.",
    category: "privacy",
    risk: "RISKY",
    enableCmd: "shell settings put secure limit_ad_tracking 1",
    disableCmd: "shell settings put secure limit_ad_tracking 0",
    readCmd: "shell settings get secure limit_ad_tracking",
    enabledValue: "1",
    defaultEnabled: false,
  },
  {
    id: "disable_joyose",
    label: "Tắt Joyose (Thermal Controller)",
    description:
      "Tắt Xiaomi Joyose — giải phóng throttle CPU/GPU. CẢNH BÁO: có thể gây nóng máy khi gaming nặng",
    category: "performance",
    risk: "RISKY",
    enableCmd: "shell pm disable-user --user 0 com.xiaomi.joyose",
    disableCmd: "shell pm enable com.xiaomi.joyose",
    readCmd: "shell pm list packages -d com.xiaomi.joyose",
    enabledValue: "package:com.xiaomi.joyose",
    defaultEnabled: false,
    brands: ["XIAOMI", "REDMI", "POCO"],
  },
  {
    id: "disable_daemon",
    label: "Tắt MIUI Daemon",
    description: "Tắt System Daemon (phân tích dữ liệu nền, không cần thiết)",
    category: "privacy",
    risk: "RISKY",
    enableCmd: "shell pm disable-user --user 0 com.miui.daemon",
    disableCmd: "shell pm enable com.miui.daemon",
    readCmd: "shell pm list packages -d com.miui.daemon",
    enabledValue: "package:com.miui.daemon",
    defaultEnabled: false,
    brands: ["XIAOMI", "REDMI", "POCO"],
  },
  {
    id: "disable_quickapp",
    label: "Tắt Quick App Service (Hybrid)",
    description:
      "Tắt framework Quick App — nguồn gốc nhiều quảng cáo trong app system",
    category: "privacy",
    risk: "RISKY",
    enableCmd: "shell pm disable-user --user 0 com.miui.hybrid",
    disableCmd: "shell pm enable com.miui.hybrid",
    readCmd: "shell pm list packages -d com.miui.hybrid",
    enabledValue: "package:com.miui.hybrid",
    defaultEnabled: false,
    brands: ["XIAOMI", "REDMI", "POCO"],
  },
  {
    id: "fps_overlay",
    label: "Hiển thị tần số quét trên màn hình",
    description: "Hiện số Hz (tần số quét) ở góc màn hình (MIUI/HyperOS)",
    category: "display",
    risk: "SAFE",
    enableCmd: "shell settings put system show_refresh_rate 1",
    disableCmd: "shell settings put system show_refresh_rate 0",
    readCmd: "shell settings get system show_refresh_rate",
    enabledValue: "1",
    defaultEnabled: false,
  },
  {
    id: "screensaver_off",
    label: "Tắt Screensaver khi sạc",
    description: "Tắt Daydream/Screensaver khi thiết bị cắm sạc",
    category: "display",
    risk: "SAFE",
    enableCmd: "shell settings put secure screensaver_enabled 0",
    disableCmd: "shell settings put secure screensaver_enabled 1",
    readCmd: "shell settings get secure screensaver_enabled",
    enabledValue: "0",
    defaultEnabled: false,
  },
  {
    id: "xiaomi_notification_fix",
    label: "Thông báo ứng dụng (HyperOS/MIUI)",
    description:
      "Quản lý tập trung nền tảng FCM và quyền chạy nền để ứng dụng nhận thông báo kịp thời khi tắt màn hình.",
    category: "performance",
    risk: "RISKY",
    enableCmd:
      "shell dumpsys deviceidle whitelist +com.google.android.gms ## shell dumpsys deviceidle whitelist +com.google.android.gsf ## shell cmd appops set com.google.android.gms WAKE_LOCK allow ## shell cmd appops set com.google.android.gms RUN_ANY_IN_BACKGROUND allow ## shell cmd appops set com.google.android.gsf RUN_ANY_IN_BACKGROUND allow",
    disableCmd:
      "shell dumpsys deviceidle whitelist -com.google.android.gms ## shell dumpsys deviceidle whitelist -com.google.android.gsf ## shell cmd appops set com.google.android.gms WAKE_LOCK default ## shell cmd appops set com.google.android.gms RUN_ANY_IN_BACKGROUND default ## shell cmd appops set com.google.android.gsf RUN_ANY_IN_BACKGROUND default",
    readCmd: "shell dumpsys deviceidle whitelist",
    enabledValue: "whitelist",
    defaultEnabled: false,
    brands: ["XIAOMI", "REDMI", "POCO"],
  },
];

export async function getTweakStatus(
  deviceId: string,
  tweak: SystemTweak,
): Promise<SystemTweakStatus> {
  if (!tweak.readCmd) {
    return {
      status: "UNKNOWN",
      reason: "Tweak không có lệnh xác minh trạng thái.",
    };
  }
  try {
    if (tweak.id === "xiaomi_notification_fix") {
      const [gms, gsf, whitelist, wakeLock, gmsBackground, gsfBackground] =
        await Promise.all([
          execAdbDetailed(
            deviceId,
            "shell pm list packages com.google.android.gms",
          ),
          execAdbDetailed(
            deviceId,
            "shell pm list packages com.google.android.gsf",
          ),
          execAdbDetailed(deviceId, "shell dumpsys deviceidle whitelist"),
          execAdbDetailed(
            deviceId,
            "shell cmd appops get com.google.android.gms WAKE_LOCK",
          ),
          execAdbDetailed(
            deviceId,
            "shell cmd appops get com.google.android.gms RUN_ANY_IN_BACKGROUND",
          ),
          execAdbDetailed(
            deviceId,
            "shell cmd appops get com.google.android.gsf RUN_ANY_IN_BACKGROUND",
          ),
        ]);
      if (
        !gms.success ||
        !gsf.success ||
        !gms.output.includes("com.google.android.gms") ||
        !gsf.output.includes("com.google.android.gsf")
      ) {
        return {
          status: "UNSUPPORTED",
          reason: "Thiết bị không có đầy đủ GMS/GSF.",
        };
      }
      const checks = [whitelist, wakeLock, gmsBackground, gsfBackground];
      if (checks.some((result) => !result.success)) {
        return {
          status: "ERROR",
          reason: "Không đọc được whitelist hoặc AppOps.",
        };
      }
      const enabled =
        whitelist.output.includes("com.google.android.gms") &&
        whitelist.output.includes("com.google.android.gsf") &&
        [wakeLock, gmsBackground, gsfBackground].every((result) =>
          /:\s*allow\b/i.test(result.output),
        );
      return enabled
        ? { status: "SUPPORTED_ON", currentValue: "verified" }
        : { status: "SUPPORTED_OFF", currentValue: "not-fully-applied" };
    }

    const packageMatch = tweak.enableCmd.match(
      /pm\s+(?:disable-user|uninstall)\b[^\n\r]*?\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+)/,
    );
    if (packageMatch) {
      const packageName = packageMatch[1];
      const systemImage = await execAdbDetailed(
        deviceId,
        `shell pm list packages -u ${packageName}`,
      );
      if (!systemImage.success) {
        return { status: "ERROR", reason: "Không đọc được package hệ thống." };
      }
      if (!systemImage.output.includes(`package:${packageName}`)) {
        return {
          status: "UNSUPPORTED",
          reason: "Package không tồn tại trong system image.",
        };
      }
      const packageStatus = await getPackageStatus(deviceId, packageName);
      if (packageStatus === "unknown") {
        return {
          status: "ERROR",
          reason: "Không xác minh được trạng thái package.",
        };
      }
      return {
        status:
          packageStatus === "disabled" || packageStatus === "uninstalled"
            ? "SUPPORTED_ON"
            : "SUPPORTED_OFF",
        currentValue: packageStatus,
      };
    }

    const result = await execAdbDetailed(deviceId, tweak.readCmd);
    if (!result.success) {
      return { status: "ERROR", reason: result.output.trim() };
    }
    const output = result.output.trim();
    const settingMatch = tweak.readCmd.match(
      /settings\s+get\s+(global|system|secure)\s+([a-zA-Z0-9_.-]+)/,
    );
    if (["", "null"].includes(output)) {
      const id = settingMatch ? `${settingMatch[1]}:${settingMatch[2]}` : "";
      return KNOWN_PLATFORM_SETTING_KEYS.has(id)
        ? { status: "SUPPORTED_OFF", currentValue: "default" }
        : {
            status: "EXPERIMENTAL",
            currentValue: "not-set",
            reason:
              "ROM chưa có settings key này. Có thể thử tạo key với snapshot và xác minh read-back.",
          };
    }
    return {
      status: output === tweak.enabledValue ? "SUPPORTED_ON" : "SUPPORTED_OFF",
      currentValue: output,
    };
  } catch (err: any) {
    console.error(
      `Error in getTweakStatus for tweak ${tweak.id}:`,
      err.message || err,
    );
    return {
      status: "ERROR",
      reason: err.message || "Không đọc được trạng thái.",
    };
  }
}

export async function applyTweak(
  deviceId: string,
  tweak: SystemTweak,
  enable: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    const status = await getTweakStatus(deviceId, tweak);
    if (["UNSUPPORTED", "UNKNOWN", "ERROR"].includes(status.status)) {
      return {
        success: false,
        message: `[BLOCKED] ${status.reason ?? "Không xác minh được capability."}`,
      };
    }

    const profile = await getDeviceProfile(deviceId);
    const deviceIdentity = buildSnapshotDeviceIdentity(profile);
    const scope = "system-tweak";
    const existingSnapshot = getMutationSnapshot(
      deviceIdentity,
      scope,
      tweak.id,
    );
    if (!enable && existingSnapshot) {
      const rollback = await restoreMutationSnapshot({
        deviceIdentity,
        scope,
        actionId: tweak.id,
        execute: (command) => execAdbDetailed(deviceId, command),
      });
      return { success: rollback.success, message: rollback.output };
    }

    const command = enable ? tweak.enableCmd : tweak.disableCmd;
    const allMutationCommands = [tweak.enableCmd, tweak.disableCmd];
    const targets = extractSnapshotTargets([command]);
    for (const target of targets.settings) {
      const before = await execAdbDetailed(
        deviceId,
        `settings get ${target.namespace} ${target.key}`,
      );
      if (!before.success)
        return { success: false, message: before.output.trim() };
    }

    const snapshot = await captureMutationSnapshot({
      deviceIdentity,
      scope,
      actionId: tweak.id,
      commands: allMutationCommands,
      execute: (value) => execAdbDetailed(deviceId, value),
    });
    if (!snapshot.success) {
      return { success: false, message: `[BLOCKED] ${snapshot.error}` };
    }

    const logs: string[] = [];
    for (const subCommand of command
      .split(" ## ")
      .map((value) => value.trim())) {
      const execution = await execAdbDetailed(deviceId, subCommand);
      logs.push(execution.output.trim() || "OK");
      if (!execution.success || isAdbFailureOutput(execution.output)) {
        const rollback = await restoreMutationSnapshot({
          deviceIdentity,
          scope,
          actionId: tweak.id,
          execute: (value) => execAdbDetailed(deviceId, value),
        });
        return {
          success: false,
          message: `${logs.join("\n")}\n[FAIL-SAFE] ${rollback.output}`,
        };
      }
    }

    const verified = await getTweakStatus(deviceId, tweak);
    const expected = enable ? "SUPPORTED_ON" : "SUPPORTED_OFF";
    if (verified.status !== expected) {
      const rollback = await restoreMutationSnapshot({
        deviceIdentity,
        scope,
        actionId: tweak.id,
        execute: (value) => execAdbDetailed(deviceId, value),
      });
      return {
        success: false,
        message: `${logs.join("\n")}\n[VERIFY FAILED] ${rollback.output}`,
      };
    }
    return {
      success: true,
      message: `${logs.join("\n")}\n[VERIFY] Đã xác minh trạng thái sau thao tác.`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || "Unknown error" };
  }
}

const NOTIFICATION_TARGET_PACKAGES = [
  "com.google.android.gms",
  "com.zing.zalo",
  "com.facebook.orca",
  "org.telegram.messenger",
  "org.telegram.plus",
  "com.whatsapp",
  "com.instagram.android",
  "com.discord",
  "com.viber.voip",
  "jp.naver.line.android",
  "com.tencent.mm",
  "com.skype.raider",
];

function notificationCommands(packageName: string): string[] {
  return [
    `shell dumpsys deviceidle whitelist +${packageName}`,
    `shell cmd appops set ${packageName} RUN_IN_BACKGROUND allow`,
    `shell cmd appops set ${packageName} RUN_ANY_IN_BACKGROUND allow`,
    `shell cmd appops set ${packageName} WAKE_LOCK allow`,
  ];
}

async function verifyNotificationPackage(
  deviceId: string,
  packageName: string,
): Promise<boolean> {
  const [whitelist, runBackground, runAnyBackground, wakeLock] =
    await Promise.all([
      execAdbDetailed(deviceId, "shell dumpsys deviceidle whitelist"),
      execAdbDetailed(
        deviceId,
        `shell cmd appops get ${packageName} RUN_IN_BACKGROUND`,
      ),
      execAdbDetailed(
        deviceId,
        `shell cmd appops get ${packageName} RUN_ANY_IN_BACKGROUND`,
      ),
      execAdbDetailed(
        deviceId,
        `shell cmd appops get ${packageName} WAKE_LOCK`,
      ),
    ]);
  return (
    whitelist.success &&
    whitelist.output.includes(packageName) &&
    [runBackground, runAnyBackground, wakeLock].every(
      (result) => result.success && /:\s*allow\b/i.test(result.output),
    )
  );
}

export async function fixAllNotifications(
  deviceId: string,
  onProgress?: (current: number, total: number, pkgName: string) => void,
): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const [rawUser0, profile] = await Promise.all([
      execAdb(deviceId, "shell pm list packages --user 0"),
      getDeviceProfile(deviceId),
    ]);

    const installedUser0 = new Set(
      rawUser0
        .split("\n")
        .map((l) => l.replace("package:", "").trim())
        .filter(Boolean),
    );

    const allTargets = NOTIFICATION_TARGET_PACKAGES.filter((packageName) =>
      installedUser0.has(packageName),
    );
    const deviceIdentity = buildSnapshotDeviceIdentity(profile);

    let count = 0;
    for (let i = 0; i < allTargets.length; i++) {
      const pkg = allTargets[i];
      if (!validatePackageName(pkg)) continue;

      onProgress?.(i + 1, allTargets.length, pkg);

      try {
        const requiredCommands = notificationCommands(pkg);
        const snapshot = await captureMutationSnapshot({
          deviceIdentity,
          scope: "notification-batch",
          actionId: pkg,
          commands: requiredCommands,
          execute: (command) => execAdbDetailed(deviceId, command),
        });
        if (!snapshot.success) continue;

        let requiredSucceeded = true;
        for (const command of requiredCommands) {
          const result = await execAdbDetailed(deviceId, command);
          if (!result.success || isAdbFailureOutput(result.output)) {
            requiredSucceeded = false;
            break;
          }
        }

        const verified =
          requiredSucceeded && (await verifyNotificationPackage(deviceId, pkg));
        if (verified) {
          count++;
        } else {
          await restoreMutationSnapshot({
            deviceIdentity,
            scope: "notification-batch",
            actionId: pkg,
            execute: (command) => execAdbDetailed(deviceId, command),
          });
        }
      } catch (e) {
        console.warn(`Lỗi bỏ qua cho ${pkg}:`, e);
      }
    }

    return {
      success: count > 0,
      count,
      message:
        count > 0
          ? `Đã áp dụng có snapshot và xác minh ${count}/${allTargets.length} ứng dụng nhắn tin được hỗ trợ.`
          : "Không có ứng dụng nhắn tin hỗ trợ nào được tối ưu thành công.",
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: err.message || "Tối ưu thông báo thất bại.",
    };
  }
}

export async function restoreAllNotifications(
  deviceId: string,
): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const profile = await getDeviceProfile(deviceId);
    const deviceIdentity = buildSnapshotDeviceIdentity(profile);
    let restored = 0;
    const failures: string[] = [];

    for (const packageName of NOTIFICATION_TARGET_PACKAGES) {
      if (
        !getMutationSnapshot(deviceIdentity, "notification-batch", packageName)
      ) {
        continue;
      }
      const result = await restoreMutationSnapshot({
        deviceIdentity,
        scope: "notification-batch",
        actionId: packageName,
        execute: (command) => execAdbDetailed(deviceId, command),
      });
      if (result.success) restored++;
      else failures.push(packageName);
    }

    return {
      success: failures.length === 0,
      count: restored,
      message:
        failures.length === 0
          ? `Đã khôi phục và xác minh ${restored} snapshot thông báo.`
          : `Khôi phục chưa hoàn tất cho: ${failures.join(", ")}`,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: err.message || "Khôi phục thông báo thất bại.",
    };
  }
}

// ─── DISPLAY TWEAKS ───────────────────────────────────────────────────────────

export async function getCurrentDpi(deviceId: string): Promise<number | null> {
  try {
    const out = await execAdb(deviceId, "shell wm density");
    const match =
      out.match(/Override density:\s*(\d+)/) ??
      out.match(/Physical density:\s*(\d+)/);
    return match ? parseInt(match[1]) : null;
  } catch {
    return null;
  }
}

export async function getCurrentResolution(
  deviceId: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const out = await execAdb(deviceId, "shell wm size");
    const match =
      out.match(/Override size:\s*(\d+)x(\d+)/) ??
      out.match(/Physical size:\s*(\d+)x(\d+)/);
    return match
      ? { width: parseInt(match[1]), height: parseInt(match[2]) }
      : null;
  } catch {
    return null;
  }
}

export async function setDpi(
  deviceId: string,
  dpi: number,
): Promise<{ success: boolean; message: string }> {
  if (!Number.isInteger(dpi) || dpi < 160 || dpi > 640) {
    return { success: false, message: "DPI phải nằm trong khoảng 160–640" };
  }
  try {
    const execution = await execAdbDetailed(
      deviceId,
      `shell wm density ${dpi}`,
    );
    if (!execution.success) {
      return { success: false, message: execution.output };
    }
    const actual = await getCurrentDpi(deviceId);
    return actual === dpi
      ? { success: true, message: `DPI đã đặt và xác minh ở ${dpi}` }
      : {
          success: false,
          message: `DPI đọc lại là ${actual ?? "không xác định"}, không khớp ${dpi}.`,
        };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function resetDpi(
  deviceId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const execution = await execAdbDetailed(deviceId, "shell wm density reset");
    return execution.success
      ? { success: true, message: "DPI đã khôi phục về mặc định" }
      : { success: false, message: execution.output };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function setResolution(
  deviceId: string,
  width: number,
  height: number,
): Promise<{ success: boolean; message: string }> {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 480 ||
    width > 3840 ||
    height < 800 ||
    height > 3840
  ) {
    return { success: false, message: "Độ phân giải không hợp lệ" };
  }

  try {
    const execution = await execAdbDetailed(
      deviceId,
      `shell wm size ${width}x${height}`,
    );
    if (!execution.success) {
      return { success: false, message: execution.output };
    }
    const actual = await getCurrentResolution(deviceId);
    return actual?.width === width && actual?.height === height
      ? {
          success: true,
          message: `Độ phân giải đã đặt và xác minh ở ${width}x${height}`,
        }
      : {
          success: false,
          message: `Độ phân giải đọc lại là ${actual ? `${actual.width}x${actual.height}` : "không xác định"}.`,
        };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function resetResolution(
  deviceId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const execution = await execAdbDetailed(deviceId, "shell wm size reset");
    return execution.success
      ? { success: true, message: "Độ phân giải đã khôi phục về mặc định" }
      : { success: false, message: execution.output };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function setAnimationScale(
  deviceId: string,
  scale: 0 | 0.5 | 1.0,
): Promise<{ success: boolean; message: string }> {
  const keys = [
    "window_animation_scale",
    "transition_animation_scale",
    "animator_duration_scale",
  ];
  const executions = await Promise.all(
    keys.map((k) =>
      execAdbDetailed(deviceId, `shell settings put global ${k} ${scale}`),
    ),
  );
  const failed = executions.find((result) => !result.success);
  if (failed) return { success: false, message: failed.output };

  const reads = await Promise.all(
    keys.map((k) => execAdb(deviceId, `shell settings get global ${k}`)),
  );
  const expected = String(scale);
  const verified = reads.every(
    (value) => Number(value.trim()) === Number(expected),
  );
  return verified
    ? { success: true, message: `Đã đặt và xác minh hoạt ảnh ${scale}x` }
    : { success: false, message: "Giá trị hoạt ảnh đọc lại không khớp." };
}

// ─── BUILT-IN BLOATWARE DB (Fallback) ────────────────────────────────────────

const BUILTIN_BLOATWARE_DB: BloatwareEntry[] = [
  {
    package: "com.miui.analytics",
    name: "MIUI Analytics",
    description: "Thu thập dữ liệu sử dụng gửi về Xiaomi",
    risk: "SAFE",
    category: "Telemetry",
  },
  {
    package: "com.miui.msa.global",
    name: "MSA (MIUI System Ads)",
    description: "Dịch vụ quảng cáo hệ thống MIUI",
    risk: "SAFE",
    category: "Ads",
  },
  {
    package: "com.xiaomi.joyose",
    name: "Joyose",
    description: "Thermal controller",
    risk: "RISKY",
    category: "System Service",
    preferDisable: true,
  },
  {
    package: "com.miui.daemon",
    name: "MIUI Daemon",
    description: "System Daemon phân tích dữ liệu nền",
    risk: "SAFE",
    category: "Telemetry",
    preferDisable: true,
  },
  {
    package: "com.miui.hybrid",
    name: "Quick App Service",
    description: "Framework Quick App — nguồn gốc quảng cáo trong app system",
    risk: "SAFE",
    category: "Ads",
    preferDisable: true,
  },
  {
    package: "com.mi.globalminusscreen",
    name: "App Vault / Minus Screen",
    description: "Màn hình gạt trái trên Launcher",
    risk: "SAFE",
    category: "Bloatware",
  },
  {
    package: "com.miui.videoplayer",
    name: "Mi Video",
    description: "Trình phát video Xiaomi có quảng cáo",
    risk: "SAFE",
    category: "Media",
  },
  {
    package: "com.miui.player",
    name: "Mi Music",
    description: "Ứng dụng nghe nhạc Xiaomi có quảng cáo",
    risk: "SAFE",
    category: "Media",
  },
  {
    package: "com.miui.yellowpage",
    name: "Xiaomi Yellow Pages",
    description: "Danh bạ vàng Xiaomi — ít dùng",
    risk: "SAFE",
    category: "Bloatware",
  },
  {
    package: "com.miui.miservice",
    name: "Mi Service Framework",
    description: "Framework dịch vụ Xiaomi",
    risk: "RISKY",
    category: "System Service",
    preferDisable: true,
  },
  {
    package: "com.xiaomi.payment",
    name: "Mi Payment Center",
    description: "Trung tâm thanh toán Xiaomi",
    risk: "SAFE",
    category: "Finance",
  },
  {
    package: "com.xiaomi.aicr",
    name: "Xiaomi AI Engine",
    description: "AI engine nền của Xiaomi",
    risk: "RISKY",
    category: "AI Service",
    preferDisable: true,
  },
  {
    package: "com.miui.cloudservice",
    name: "MIUI Cloud Service",
    description: "Đồng bộ dữ liệu lên Xiaomi Cloud",
    risk: "SAFE",
    category: "Cloud",
  },
  {
    package: "com.miui.cloudbackup",
    name: "MIUI Cloud Backup",
    description: "Sao lưu lên Xiaomi Cloud",
    risk: "SAFE",
    category: "Cloud",
  },
  {
    package: "com.miui.compass",
    name: "Mi Compass",
    description: "La bàn Xiaomi",
    risk: "SAFE",
    category: "Preinstalled App",
  },
  {
    package: "com.miui.calculator",
    name: "Mi Calculator",
    description: "Máy tính Xiaomi",
    risk: "SAFE",
    category: "Preinstalled App",
  },
  {
    package: "cn.wps.xiaomi.abroad.lite",
    name: "Xiaomi WPS Reader",
    description: "Ứng dụng đọc tài liệu WPS Lite",
    risk: "SAFE",
    category: "Preinstalled App",
  },
  {
    package: "com.miui.bugreport",
    name: "Bug Report Tool",
    description: "Công cụ báo lỗi Xiaomi",
    risk: "SAFE",
    category: "System Tool",
  },
  {
    package: "com.android.egg",
    name: "Android Easter Egg",
    description: "Easter Egg ẩn của Android",
    risk: "SAFE",
    category: "Bloatware",
  },
  {
    package: "com.android.traceur",
    name: "Android Traceur",
    description: "Công cụ trace hệ thống",
    risk: "SAFE",
    category: "System Tool",
  },
  {
    package: "com.android.stk",
    name: "SIM Toolkit",
    description: "SIM Toolkit",
    risk: "RISKY",
    category: "Carrier",
  },
  {
    package: "com.android.carrierdefaultapp",
    name: "Carrier Default App",
    description: "App mặc định nhà mạng",
    risk: "RISKY",
    category: "Carrier",
  },
  {
    package: "com.android.managedprovisioning",
    name: "Managed Provisioning",
    description: "Dự phòng quản lý doanh nghiệp",
    risk: "SAFE",
    category: "Enterprise",
  },
  {
    package: "com.google.android.as.oss",
    name: "Google Private Compute Services",
    description: "Service AI của Google chạy nền",
    risk: "RISKY",
    category: "Google",
    preferDisable: true,
  },
  {
    package: "com.miui.browser",
    name: "Mi Browser",
    description:
      "Trình duyệt mặc định Xiaomi bảo mật kém, chứa quảng cáo. Hãy cài sẵn Chrome/Edge trước khi gỡ.",
    risk: "RISKY",
    category: "Browser",
  },
];
