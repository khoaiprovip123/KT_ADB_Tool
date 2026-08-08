import { adbState } from "./adbCore";
import { createHash } from "crypto";

export interface DeviceProfile {
  /** Mã băm cục bộ, không làm lộ serial thật của thiết bị. */
  identity?: string;
  brand: string;
  manufacturer: string;
  model: string;
  device: string;
  release: string;
  sdk: number;
  miuiVersionName?: string;
  miuiVersionCode?: string;
  hyperOsVersionName?: string;
  incremental: string;
}

export type CapabilityState =
  | "SUPPORTED_ON"
  | "SUPPORTED_OFF"
  | "EXPERIMENTAL"
  | "UNSUPPORTED"
  | "UNKNOWN"
  | "ERROR";

/**
 * Thực thi câu lệnh shell ADB và trả về kết quả dạng chuỗi
 */
async function execShell(deviceId: string, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`ADB command timeout: ${command}`));
    }, 5000); // 5 seconds timeout

    adbState.client
      .shell(deviceId, command)
      .then((stream: any) => {
        let output = "";
        stream.on("data", (chunk: Buffer) => {
          output += chunk.toString();
        });
        stream.on("end", () => {
          clearTimeout(timeout);
          resolve(output.trim());
        });
        stream.on("error", (err: any) => {
          clearTimeout(timeout);
          reject(err);
        });
      })
      .catch((err: any) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

/**
 * Lấy profile chi tiết của thiết bị Android qua getprop
 */
export async function getDeviceProfile(
  deviceId: string,
): Promise<DeviceProfile> {
  try {
    const rawProps = await execShell(deviceId, "getprop");

    const getPropValue = (propName: string): string => {
      const regex = new RegExp(
        `\\[${propName.replace(/\./g, "\\.")}\\]:\\s*\\[(.*?)\\]`,
      );
      const match = rawProps.match(regex);
      return match ? match[1].trim() : "";
    };

    const brand = getPropValue("ro.product.brand") || "Unknown";
    const manufacturer = getPropValue("ro.product.manufacturer") || "Unknown";
    const model = getPropValue("ro.product.model") || "Unknown";
    const device = getPropValue("ro.product.device") || "Unknown";
    const release = getPropValue("ro.build.version.release") || "Unknown";
    const sdk = parseInt(getPropValue("ro.build.version.sdk")) || 0;
    const miuiVersionName =
      getPropValue("ro.miui.ui.version.name") || undefined;
    const miuiVersionCode =
      getPropValue("ro.miui.ui.version.code") || undefined;
    const hyperOsVersionName =
      getPropValue("ro.mi.os.version.name") || undefined;
    const incremental =
      getPropValue("ro.build.version.incremental") || "Unknown";
    const rawIdentity =
      getPropValue("ro.serialno") ||
      getPropValue("ro.boot.serialno") ||
      // Fail safe: ưu tiên ID phiên ADB thay vì ghép model/build, vì hai thiết
      // bị cùng mẫu có thể trùng nhau và tuyệt đối không được dùng chung snapshot.
      deviceId;
    const identity = createHash("sha256").update(rawIdentity).digest("hex");

    return {
      identity,
      brand,
      manufacturer,
      model,
      device,
      release,
      sdk,
      miuiVersionName,
      miuiVersionCode,
      hyperOsVersionName,
      incremental,
    };
  } catch (error) {
    console.error("Failed to get device profile:", error);
    throw error;
  }
}

/**
 * Lấy danh sách package đã cài đặt trên thiết bị (gồm cả package đang bị disable)
 */
export async function getInstalledPackageSet(
  deviceId: string,
): Promise<Set<string>> {
  try {
    const rawPackages = await execShell(deviceId, "pm list packages -a");
    const packages = rawPackages
      .split("\n")
      .map((line) => line.replace("package:", "").trim())
      .filter((pkg) => pkg.length > 0);
    return new Set(packages);
  } catch (error) {
    console.error("Failed to get installed package set:", error);
    return new Set();
  }
}

/**
 * Đọc snapshot các key-value trong settings (system, secure, global)
 */
export async function readSettingsSnapshot(
  deviceId: string,
  namespace: "system" | "secure" | "global",
): Promise<Record<string, string>> {
  try {
    const rawSettings = await execShell(deviceId, `settings list ${namespace}`);
    const snapshot: Record<string, string> = {};

    rawSettings.split("\n").forEach((line) => {
      const idx = line.indexOf("=");
      if (idx !== -1) {
        const key = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim();
        if (key) snapshot[key] = value;
      }
    });

    return snapshot;
  } catch (error) {
    console.error(`Failed to read settings snapshot for ${namespace}:`, error);
    return {};
  }
}

/**
 * Đọc snapshot device_config nếu được hỗ trợ (Android 10+)
 */
export async function readDeviceConfigSnapshot(
  deviceId: string,
): Promise<Record<string, Record<string, string>>> {
  try {
    // device_config list xuất ra toàn bộ config theo từng namespace
    const rawConfig = await execShell(deviceId, "device_config list");
    const config: Record<string, Record<string, string>> = {};

    const currentNamespace = "global";
    rawConfig.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Kiểm tra xem dòng có phải chỉ namespace mới không (ví dụ: namespace/key=value)
      const slashIdx = trimmed.indexOf("/");
      const eqIdx = trimmed.indexOf("=");

      if (slashIdx !== -1 && (eqIdx === -1 || slashIdx < eqIdx)) {
        const ns = trimmed.substring(0, slashIdx).trim();
        const keyVal = trimmed.substring(slashIdx + 1);
        const keyEqIdx = keyVal.indexOf("=");
        if (keyEqIdx !== -1) {
          const key = keyVal.substring(0, keyEqIdx).trim();
          const val = keyVal.substring(keyEqIdx + 1).trim();
          if (!config[ns]) config[ns] = {};
          config[ns][key] = val;
        }
      } else if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        if (!config[currentNamespace]) config[currentNamespace] = {};
        config[currentNamespace][key] = val;
      }
    });

    return config;
  } catch (error) {
    // Fallback nếu lệnh không được hỗ trợ hoặc không có quyền root/system
    console.warn(
      "device_config list not supported or failed, returning empty:",
      error,
    );
    return {};
  }
}
