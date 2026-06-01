import * as fs from "fs";
import * as path from "path";
import { app } from "electron";
import { execAdb } from "./adbService";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type RiskLevel = "SAFE" | "RISKY" | "KEEP";
export type DebloatAction = "uninstall" | "disable" | "restore";
export type PkgStatus = "installed" | "disabled" | "uninstalled";
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
}

// ─── BLOATWARE DATABASE ───────────────────────────────────────────────────────

export function getBloatwareDb(): BloatwareEntry[] {
  const candidates = [
    path.join(app.getAppPath(), "xiaomi_bloatware_removal.json"),
    path.join(app.getAppPath(), "..", "xiaomi_bloatware_removal.json"),
    path.join(process.resourcesPath ?? "", "xiaomi_bloatware_removal.json"),
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
          if (e.classification === "RISKY") riskVal = "RISKY";
          if (e.classification === "KEEP") riskVal = "KEEP";
          return {
            package: e.package,
            name: e.name || e.package,
            description: e.side_effects || e.description || "",
            risk: riskVal,
            category: e.group || e.category || "Bloatware",
            preferDisable: e.method === "disable" || e.preferDisable,
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
  try {
    const [allOut, disabledOut] = await Promise.all([
      execAdb(deviceId, `shell pm list packages ${packageName}`),
      execAdb(deviceId, `shell pm list packages -d ${packageName}`),
    ]);

    if (disabledOut.includes(packageName)) return "disabled";
    if (allOut.includes(packageName)) return "installed";
    return "uninstalled";
  } catch {
    return "uninstalled";
  }
}

export async function getBloatwareWithStatus(
  deviceId: string,
): Promise<BloatwareWithStatus[]> {
  const db = getBloatwareDb();

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

export async function debloatPackage(
  deviceId: string,
  packageName: string,
  action: DebloatAction,
  preferDisable = false,
): Promise<{ success: boolean; message: string }> {
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

    const output = await execAdb(deviceId, cmd);
    const success =
      output.includes("Success") ||
      output.includes("success") ||
      action === "restore";
    return { success, message: output.trim() };
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
  },
  {
    id: "force_gpu",
    label: "Force GPU Rendering",
    description: "Ép toàn bộ 2D render qua GPU thay vì CPU",
    category: "performance",
    risk: "SAFE",
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
    disableCmd: "shell settings put global background_process_limit 0",
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
    risk: "SAFE",
    enableCmd: "shell pm disable-user --user 0 com.miui.analytics",
    disableCmd: "shell pm install-existing --user 0 com.miui.analytics",
    readCmd: "shell pm list packages -d com.miui.analytics",
    enabledValue: "package:com.miui.analytics",
    defaultEnabled: false,
  },
  {
    id: "disable_msa",
    label: "Vô hiệu hóa MSA (MIUI System Ads)",
    description: "Tắt dịch vụ quảng cáo hệ thống MIUI",
    category: "privacy",
    risk: "SAFE",
    enableCmd: "shell pm disable-user --user 0 com.miui.msa.global",
    disableCmd: "shell pm install-existing --user 0 com.miui.msa.global",
    readCmd: "shell pm list packages -d com.miui.msa.global",
    enabledValue: "package:com.miui.msa.global",
    defaultEnabled: false,
  },
  {
    id: "ad_id_limit",
    label: "Giới hạn Ad ID Tracking",
    description: "Bật giới hạn theo dõi quảng cáo (limit_ad_tracking)",
    category: "privacy",
    risk: "SAFE",
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
    disableCmd: "shell pm install-existing --user 0 com.xiaomi.joyose",
    readCmd: "shell pm list packages -d com.xiaomi.joyose",
    enabledValue: "package:com.xiaomi.joyose",
    defaultEnabled: false,
  },
  {
    id: "disable_daemon",
    label: "Tắt MIUI Daemon",
    description: "Tắt System Daemon (phân tích dữ liệu nền, không cần thiết)",
    category: "privacy",
    risk: "SAFE",
    enableCmd: "shell pm disable-user --user 0 com.miui.daemon",
    disableCmd: "shell pm install-existing --user 0 com.miui.daemon",
    readCmd: "shell pm list packages -d com.miui.daemon",
    enabledValue: "package:com.miui.daemon",
    defaultEnabled: false,
  },
  {
    id: "disable_quickapp",
    label: "Tắt Quick App Service (Hybrid)",
    description:
      "Tắt framework Quick App — nguồn gốc nhiều quảng cáo trong app system",
    category: "privacy",
    risk: "SAFE",
    enableCmd: "shell pm disable-user --user 0 com.miui.hybrid",
    disableCmd: "shell pm install-existing --user 0 com.miui.hybrid",
    readCmd: "shell pm list packages -d com.miui.hybrid",
    enabledValue: "package:com.miui.hybrid",
    defaultEnabled: false,
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
];

export async function getTweakStatus(
  deviceId: string,
  tweak: SystemTweak,
): Promise<boolean> {
  if (!tweak.readCmd) return tweak.defaultEnabled;
  try {
    const output = (await execAdb(deviceId, tweak.readCmd)).trim();
    return output === tweak.enabledValue;
  } catch {
    return tweak.defaultEnabled;
  }
}

export async function applyTweak(
  deviceId: string,
  tweak: SystemTweak,
  enable: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    const cmd = enable ? tweak.enableCmd : tweak.disableCmd;
    const output = await execAdb(deviceId, cmd);
    return { success: true, message: output.trim() || "OK" };
  } catch (err: any) {
    return { success: false, message: err.message };
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
  if (dpi < 100 || dpi > 640) {
    return { success: false, message: "DPI phải nằm trong khoảng 100–640" };
  }
  try {
    await execAdb(deviceId, `shell wm density ${dpi}`);
    return { success: true, message: `DPI đã đặt thành ${dpi}` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function resetDpi(
  deviceId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await execAdb(deviceId, "shell wm density reset");
    return { success: true, message: "DPI đã khôi phục về mặc định" };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function setResolution(
  deviceId: string,
  width: number,
  height: number,
): Promise<{ success: boolean; message: string }> {
  try {
    await execAdb(deviceId, `shell wm size ${width}x${height}`);
    return {
      success: true,
      message: `Độ phân giải đặt thành ${width}x${height}`,
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function resetResolution(
  deviceId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await execAdb(deviceId, "shell wm size reset");
    return { success: true, message: "Độ phân giải đã khôi phục về mặc định" };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function setAnimationScale(
  deviceId: string,
  scale: 0 | 0.5 | 1.0,
): Promise<void> {
  const keys = [
    "window_animation_scale",
    "transition_animation_scale",
    "animator_duration_scale",
  ];
  await Promise.all(
    keys.map((k) =>
      execAdb(deviceId, `shell settings put global ${k} ${scale}`),
    ),
  );
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
];
