/**
 * navigationService.ts
 *
 * Cung cấp API điều hướng thông minh cho thiết bị Android.
 *
 * Cơ chế Fallback 2 tầng:
 *   Tầng 1: Thử lệnh `input keyevent <code>` (yêu cầu INJECT_EVENTS)
 *   Tầng 2: Nếu bị SecurityException, tự động chuyển sang Android Intent
 *           (am start) — không cần bất kỳ quyền đặc biệt nào.
 */

import { runAdbCommandDetailed } from "./adbCore";

/** Kết quả trả về từ các hàm điều hướng */
export interface NavActionResult {
  success: boolean;
  method: "keyevent" | "intent" | "error";
  output: string;
  /** true nếu đã phải dùng fallback Intent */
  usedFallback: boolean;
}

/**
 * Kiểm tra xem output có chứa lỗi SecurityException / INJECT_EVENTS không.
 * Hàm này không phụ thuộc vào isAdbFailureOutput để giữ tách biệt logic.
 */
function isInputPermissionDenied(output: string): boolean {
  const lower = output.toLowerCase();
  return (
    lower.includes("inject_events") ||
    /securityexception\b/i.test(lower) ||
    lower.startsWith("exception occurred")
  );
}

/**
 * Điều hướng về màn hình chính (Home).
 *
 * Fallback: Nếu `input keyevent 3` bị chặn quyền, tự động gọi Intent HOME
 * — hoạt động 100% trên mọi dòng máy kể cả Xiaomi chưa bật bảo mật ADB.
 */
export async function navHome(deviceId: string): Promise<NavActionResult> {
  // Tầng 1: input keyevent HOME (3)
  const r1 = await runAdbCommandDetailed(deviceId, "input keyevent 3");
  if (r1.success && !isInputPermissionDenied(r1.output)) {
    return { success: true, method: "keyevent", output: r1.output, usedFallback: false };
  }

  // Tầng 2: Android Intent — hoạt động không cần INJECT_EVENTS
  if (isInputPermissionDenied(r1.output) || !r1.success) {
    const r2 = await runAdbCommandDetailed(
      deviceId,
      "am start -a android.intent.action.MAIN -c android.intent.category.HOME",
    );
    return {
      success: r2.success,
      method: "intent",
      output: r2.output,
      usedFallback: true,
    };
  }

  return { success: false, method: "error", output: r1.output, usedFallback: false };
}

/**
 * Điều hướng Quay lại (Back).
 *
 * Back không có Intent fallback hoàn hảo nên trả về lỗi có hướng dẫn.
 */
export async function navBack(deviceId: string): Promise<NavActionResult> {
  const r = await runAdbCommandDetailed(deviceId, "input keyevent 4");
  const denied = isInputPermissionDenied(r.output);
  return {
    success: r.success && !denied,
    method: "keyevent",
    output: denied ? "INJECT_EVENTS_DENIED" : r.output,
    usedFallback: false,
  };
}

/**
 * Điều hướng Đa nhiệm / Recent Apps (Recents).
 */
export async function navRecents(deviceId: string): Promise<NavActionResult> {
  const r = await runAdbCommandDetailed(deviceId, "input keyevent 187");
  const denied = isInputPermissionDenied(r.output);
  return {
    success: r.success && !denied,
    method: "keyevent",
    output: denied ? "INJECT_EVENTS_DENIED" : r.output,
    usedFallback: false,
  };
}

/**
 * Tắt màn hình (Power / Sleep).
 *
 * Fallback: KEYCODE_POWER (26) -> KEYCODE_SLEEP (223).
 * Nếu cả 2 đều bị chặn quyền, trả về lỗi có hướng dẫn mở cài đặt.
 */
export async function navScreenOff(deviceId: string): Promise<NavActionResult> {
  // Tầng 1: KEYCODE_POWER
  const r1 = await runAdbCommandDetailed(deviceId, "input keyevent 26");
  if (r1.success && !isInputPermissionDenied(r1.output)) {
    return { success: true, method: "keyevent", output: r1.output, usedFallback: false };
  }

  // Tầng 2: KEYCODE_SLEEP
  if (isInputPermissionDenied(r1.output) || !r1.success) {
    const r2 = await runAdbCommandDetailed(deviceId, "input keyevent 223");
    const denied2 = isInputPermissionDenied(r2.output);
    return {
      success: r2.success && !denied2,
      method: "keyevent",
      output: denied2 ? "INJECT_EVENTS_DENIED" : r2.output,
      usedFallback: true,
    };
  }

  return { success: false, method: "error", output: r1.output, usedFallback: false };
}

/**
 * Mở ứng dụng Cài đặt Android.
 */
export async function navOpenSettings(deviceId: string): Promise<NavActionResult> {
  const r = await runAdbCommandDetailed(
    deviceId,
    "am start -a android.settings.SETTINGS",
  );
  return { success: r.success, method: "intent", output: r.output, usedFallback: false };
}

/**
 * Mở thẳng màn hình Tùy chọn nhà phát triển (Developer Options).
 * Dùng để hướng dẫn người dùng bật "Gỡ lỗi USB (Cài đặt bảo mật)" 1-Click.
 */
export async function navOpenDeveloperSettings(deviceId: string): Promise<NavActionResult> {
  const r = await runAdbCommandDetailed(
    deviceId,
    "am start -a android.settings.APPLICATION_DEVELOPMENT_SETTINGS",
  );
  return { success: r.success, method: "intent", output: r.output, usedFallback: false };
}

/**
 * Kiểm tra trạng thái quyền INJECT_EVENTS trên Xiaomi (persist.security.adbinput).
 * Trả về true nếu quyền đã được cấp.
 */
export async function checkAdbInputPermission(deviceId: string): Promise<boolean> {
  const r = await runAdbCommandDetailed(
    deviceId,
    "getprop persist.security.adbinput",
  );
  if (!r.success) return false;
  return r.output.trim() === "1";
}
