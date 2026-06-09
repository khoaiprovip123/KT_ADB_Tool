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
import { runAdbCommand } from "./adbCore";
import type { XiaomiApplyResult } from "@shared/types/xiaomi";

export interface ExperienceItemStatus {
  item: XiaomiExperienceItem;
  status: CapabilityState;
  currentValue?: string;
}

/**
 * Đọc trạng thái chi tiết của từng tùy chọn Trải nghiệm người dùng
 */
export async function getExperienceCapabilities(
  deviceId: string,
): Promise<ExperienceItemStatus[]> {
  try {
    const profile = await getDeviceProfile(deviceId);
    const installedPkgs = await getInstalledPackageSet(deviceId);

    const [globalSettings, secureSettings, systemSettings] = await Promise.all([
      readSettingsSnapshot(deviceId, "global"),
      readSettingsSnapshot(deviceId, "secure"),
      readSettingsSnapshot(deviceId, "system"),
    ]);

    const result: ExperienceItemStatus[] = [];

    for (const item of XIAOMI_EXPERIENCE_ITEMS) {
      const { brand, minSdk, packages } = item.detectStrategy;

      // 1. Kiểm tra Brand
      if (brand && brand.length > 0) {
        const brandMatch = brand.some((b) =>
          profile.brand.toUpperCase().includes(b.toUpperCase()),
        );
        if (!brandMatch) {
          result.push({ item, status: "UNSUPPORTED" });
          continue;
        }
      }

      // 2. Kiểm tra Min SDK
      if (minSdk && profile.sdk < minSdk) {
        result.push({ item, status: "UNSUPPORTED" });
        continue;
      }

      // 3. Kiểm tra Packages yêu cầu
      if (packages && packages.length > 0) {
        const pkgsInstalled = packages.every((pkg) => installedPkgs.has(pkg));
        if (!pkgsInstalled) {
          result.push({ item, status: "UNSUPPORTED" });
          continue;
        }
      }

      // 4. Đọc giá trị hiện tại
      const readCmd = item.readCommand;
      const snapshot =
        readCmd.namespace === "global"
          ? globalSettings
          : readCmd.namespace === "secure"
            ? secureSettings
            : systemSettings;

      const currentValue = snapshot[readCmd.key];

      if (currentValue === undefined || currentValue === "null") {
        const isEnabled = item.activeValues
          ? item.activeValues.includes(item.defaultValue)
          : item.defaultValue === "1" || item.defaultValue === "120";
        result.push({
          item,
          status: isEnabled ? "SUPPORTED_ON" : "SUPPORTED_OFF",
          currentValue: item.defaultValue,
        });
      } else {
        const isEnabled = item.activeValues
          ? item.activeValues.includes(currentValue)
          : currentValue === "1" || currentValue === "120";
        result.push({
          item,
          status: isEnabled ? "SUPPORTED_ON" : "SUPPORTED_OFF",
          currentValue,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to get experience capabilities:", error);
    return XIAOMI_EXPERIENCE_ITEMS.map((item) => ({ item, status: "ERROR" }));
  }
}

/**
 * Đọc giá trị hiện tại của một item cụ thể
 */
export async function readExperienceItem(
  deviceId: string,
  itemId: string,
): Promise<string> {
  const item = XIAOMI_EXPERIENCE_ITEMS.find((i) => i.id === itemId);
  if (!item) throw new Error(`Không tìm thấy item tùy chỉnh với ID: ${itemId}`);

  const cmd = `settings get ${item.readCommand.namespace} ${item.readCommand.key}`;
  const res = await runAdbCommand(deviceId, cmd, () => {});
  return res.trim();
}

// ═══════════════════════════════════════════════════════════
// CƠ CHẾ TỰ ĐỘNG KIỂM SOÁT (Auto-Verify + Fallback Engine)
// ═══════════════════════════════════════════════════════════

/**
 * Thực thi một chuỗi lệnh (phân tách bằng &&).
 * Trả về true nếu không có lệnh con nào báo lỗi tường minh.
 */
async function executeCommandChain(
  deviceId: string,
  cmd: string,
): Promise<{ success: boolean; output: string }> {
  const subCmds = cmd.split("&&").map((s) => s.trim()).filter(Boolean);

  let success = true;
  let combinedOutput = "";

  for (const subCmd of subCmds) {
    const output = await runAdbCommand(deviceId, subCmd, () => {});
    const trimmed = output.trim();
    combinedOutput += (combinedOutput ? "\n" : "") + trimmed;

    if (
      trimmed.toLowerCase().includes("failed") ||
      trimmed.toLowerCase().includes("failure") ||
      trimmed.toLowerCase().includes("error") ||
      trimmed.includes("[BLOCKED BY SAFETY LAYER]") ||
      trimmed.toLowerCase().includes("not found") ||
      trimmed.toLowerCase().includes("exception")
    ) {
      success = false;
    }
  }

  return { success, output: combinedOutput.trim() };
}

/**
 * Đọc lại giá trị thực tế từ thiết bị sau khi áp dụng lệnh.
 * Xác minh bằng cách so sánh với activeValues hoặc defaultValue.
 */
async function verifyCommandEffect(
  deviceId: string,
  item: XiaomiExperienceItem,
  enable: boolean,
): Promise<boolean> {
  try {
    // Đợi 200ms cho settings ổn định trước khi đọc lại
    await new Promise((r) => setTimeout(r, 200));

    const cmd = `settings get ${item.readCommand.namespace} ${item.readCommand.key}`;
    const raw = await runAdbCommand(deviceId, cmd, () => {});
    const currentValue = raw.trim();

    // Xác minh thực tế cho lệnh pm (uninstall/disable) thay vì bỏ qua
    if (
      item.enableCommand.startsWith("pm ") ||
      item.disableCommand.startsWith("pm ")
    ) {
      const installedPkgs = await getInstalledPackageSet(deviceId);
      const targetPkg = item.detectStrategy.packages?.[0] || "";
      if (!targetPkg) return true;

      // Nếu đang bật (enable): ứng dụng quảng cáo phải được gỡ bỏ (không còn trong installedPkgs)
      // Nếu đang tắt (disable/restore): ứng dụng quảng cáo phải được khôi phục (nằm trong installedPkgs)
      return enable ? !installedPkgs.has(targetPkg) : installedPkgs.has(targetPkg);
    }

    // Giá trị "null" từ settings get = key chưa tồn tại
    if (currentValue === "null" || currentValue === "") {
      // Nếu đang bật mà key chưa tồn tại → lệnh chưa tác dụng
      return !enable;
    }

    if (enable) {
      // Khi bật: giá trị phải nằm trong activeValues
      if (item.activeValues) {
        return item.activeValues.includes(currentValue);
      }
      return currentValue === "1";
    } else {
      // Khi tắt: giá trị phải trùng defaultValue hoặc KHÔNG nằm trong activeValues
      if (item.activeValues) {
        return !item.activeValues.includes(currentValue);
      }
      return currentValue === item.defaultValue || currentValue === "0";
    }
  } catch {
    // Nếu không đọc được (thiết bị ngắt kết nối...) → coi như chưa xác minh
    return false;
  }
}

/**
 * Áp dụng cấu hình bật/tắt cho item tùy biến trải nghiệm.
 *
 * Cơ chế hoạt động (Execute → Verify → Fallback):
 * 1. Chạy lệnh chính
 * 2. Đọc lại giá trị từ thiết bị để xác minh thực sự có tác dụng
 * 3. Nếu chưa tác dụng → tự động chuyển sang lệnh fallback tiếp theo
 * 4. Lặp lại bước 2-3 cho đến khi thành công hoặc hết fallback
 */
export async function applyExperienceItem(
  deviceId: string,
  itemId: string,
  enable: boolean,
): Promise<XiaomiApplyResult> {
  const item = XIAOMI_EXPERIENCE_ITEMS.find((i) => i.id === itemId);
  if (!item) throw new Error(`Không tìm thấy item tùy chỉnh với ID: ${itemId}`);

  // Kiểm tra tính tương thích của thiết bị trước khi thực thi
  const profile = await getDeviceProfile(deviceId);
  const { brand, minSdk, packages } = item.detectStrategy;

  if (brand && brand.length > 0) {
    const brandMatch = brand.some((b) =>
      profile.brand.toUpperCase().includes(b.toUpperCase()),
    );
    if (!brandMatch) {
      return {
        success: false,
        output: `[UNSUPPORTED] Thiết bị thuộc thương hiệu "${profile.brand}" không hỗ trợ tính năng này (Yêu cầu: ${brand.join(", ")}).`,
        usedFallback: false,
      };
    }
  }

  if (minSdk && profile.sdk < minSdk) {
    return {
      success: false,
      output: `[UNSUPPORTED] Phiên bản Android hiện tại (SDK ${profile.sdk}) thấp hơn mức yêu cầu của tính năng này (Yêu cầu: SDK ${minSdk}).`,
      usedFallback: false,
    };
  }

  if (packages && packages.length > 0) {
    const installedPkgs = await getInstalledPackageSet(deviceId);
    const pkgsInstalled = packages.every((pkg) => installedPkgs.has(pkg));
    if (!pkgsInstalled) {
      return {
        success: false,
        output: `[UNSUPPORTED] Không tìm thấy các gói ứng dụng hệ thống bắt buộc: ${packages.join(", ")}.`,
        usedFallback: false,
      };
    }
  }

  let fullLog = "";

  // ── Bước 1: Thử lệnh chính ──
  const primaryCmd = enable ? item.enableCommand : item.disableCommand;
  const primaryResult = await executeCommandChain(deviceId, primaryCmd);
  fullLog += `[Primary] ${primaryResult.output}`;

  if (primaryResult.success) {
    // Xác minh lệnh chính có thực sự tác dụng
    const verified = await verifyCommandEffect(deviceId, item, enable);
    if (verified) {
      return { success: true, output: fullLog.trim(), usedFallback: false };
    }
    fullLog += "\n[Verify] Lệnh chính đã chạy nhưng giá trị chưa thay đổi trên thiết bị.";
  } else {
    fullLog += "\n[Primary] Lệnh chính thất bại.";
  }

  // ── Bước 2: Tự động thử từng lệnh fallback ──
  const fallbacks = enable
    ? item.fallbackEnableCommands
    : item.fallbackDisableCommands;

  if (fallbacks && fallbacks.length > 0) {
    for (let i = 0; i < fallbacks.length; i++) {
      const fallbackCmd = fallbacks[i];
      fullLog += `\n[Fallback ${i + 1}/${fallbacks.length}] Đang thử: ${fallbackCmd}`;

      const fallbackResult = await executeCommandChain(deviceId, fallbackCmd);
      fullLog += `\n[Fallback ${i + 1}] ${fallbackResult.output}`;

      if (fallbackResult.success) {
        // Xác minh fallback có thực sự tác dụng
        const verified = await verifyCommandEffect(deviceId, item, enable);
        if (verified) {
          fullLog += `\n[Verify] ✓ Fallback ${i + 1} đã xác minh thành công.`;
          return { success: true, output: fullLog.trim(), usedFallback: true };
        }
        fullLog += `\n[Verify] Fallback ${i + 1} đã chạy nhưng giá trị chưa thay đổi, thử lệnh tiếp...`;
      } else {
        fullLog += `\n[Fallback ${i + 1}] Thất bại, thử lệnh tiếp...`;
      }
    }
  }

  // ── Bước 3: Tất cả đều thất bại ──
  fullLog += "\n[Result] ✗ Tất cả lệnh (chính + fallback) đều không tác dụng trên thiết bị này.";
  return { success: false, output: fullLog.trim(), usedFallback: true };
}

/**
 * Khôi phục cấu hình mặc định (Rollback) của tùy chỉnh
 */
export async function rollbackExperienceItem(
  deviceId: string,
  itemId: string,
): Promise<{ success: boolean; output: string }> {
  return applyExperienceItem(deviceId, itemId, false);
}
