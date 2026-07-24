import { ipcMain, app, dialog } from "electron";
import { initAdb, watchDevices, runAdbCommand } from "../core/adbCore";
import { registerDeviceHandlers } from "./deviceHandlers";
import { registerAppHandlers } from "./appHandlers";
import { registerFileHandlers } from "./fileHandlers";
import { registerSystemTweaksHandlers } from "./systemTweaksHandlers";
import { registerXiaomiExperienceHandlers } from "./xiaomiExperienceHandlers";
import { registerAdvancedAdbHandlers } from "./advancedAdbHandlers";
import { store } from "../store";
import { assertValidDeviceId, assertValidShellCommand } from "./validate";

export function registerIpcHandlers(mainWindow: Electron.BrowserWindow) {
  // ── Core ADB ──────────────────────────────────────────────────────────────
  ipcMain.handle("adb:init", async () => {
    const success = await initAdb((msg) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send("adb:log-stream", msg);
      }
    });

    if (success) {
      watchDevices((devices) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send("adb:device-update", devices);
        }
      });
    }
    return success;
  });

  ipcMain.handle("adb:run-command", async (_event, { deviceId, command }) => {
    try {
      assertValidDeviceId(deviceId);
      assertValidShellCommand(command);
      const output = (await runAdbCommand(deviceId, command, (log) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send("adb:log-stream", log);
        }
      })) as string;
      const isError =
        output.startsWith("ERROR:") ||
        output.startsWith("CRITICAL ERROR:") ||
        output === "FAILED" ||
        output.startsWith("[BLOCKED BY SAFETY LAYER]");
      return {
        success: !isError,
        output: output,
      };
    } catch (err: any) {
      return { success: false, output: err.message };
    }
  });

  // ── Sub-module Handlers ───────────────────────────────────────────────────
  registerDeviceHandlers(mainWindow);
  registerAppHandlers(mainWindow);
  registerFileHandlers(mainWindow);
  registerSystemTweaksHandlers(mainWindow);
  registerXiaomiExperienceHandlers(mainWindow);
  registerAdvancedAdbHandlers();

  // ── Store Handlers (whitelist key hợp lệ để tránh ghi đè nguy hiểm) ───────
  const ALLOWED_STORE_KEYS = new Set([
    "theme",
    "autoRefresh",
    "autoBackupApk",
    "downloadPath",
    "adbPath",
  ]);

  ipcMain.handle("store:get", (_event, key: string) => {
    if (typeof key !== "string") return undefined;
    return (store as any).get(key);
  });

  ipcMain.handle("store:set", (_event, key: string, val: any) => {
    if (typeof key !== "string" || !ALLOWED_STORE_KEYS.has(key)) {
      console.warn(`[STORE] Chặn ghi key không được phép: ${key}`);
      return;
    }
    // Validate adbPath — chỉ cho phép đường dẫn tuyệt đối, không chứa ký tự nguy hiểm
    if (key === "adbPath" && typeof val === "string" && val.length > 0) {
      if (/[;&|`$\n\r]/.test(val)) {
        console.warn(`[STORE] adbPath chứa ký tự nguy hiểm, từ chối.`);
        return;
      }
    }
    (store as any).set(key, val);
  });

  ipcMain.handle("store:delete", (_event, key: string) => {
    if (typeof key !== "string" || !ALLOWED_STORE_KEYS.has(key)) {
      console.warn(`[STORE] Chặn xóa key không được phép: ${key}`);
      return;
    }
    (store as any).delete(key);
  });

  // ── App Version & Update Handlers ─────────────────────────────────────────
  ipcMain.handle("app:get-version", () => {
    return app.getVersion();
  });

  ipcMain.handle("app:check-for-updates", async () => {
    try {
      const { checkForUpdates } = await import("../core/updateService");
      return await checkForUpdates();
    } catch (err) {
      return {
        available: false,
        version: app.getVersion(),
        changelog: "Bạn đang sử dụng phiên bản mới nhất.",
        downloadUrl: null,
      };
    }
  });

  ipcMain.handle("app:download-install-update", async (_event, downloadUrl: string) => {
    const { downloadAndInstallUpdate } = await import("../core/updateService");
    return downloadAndInstallUpdate(downloadUrl, (progress) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send("app:update-progress", progress);
      }
    });
  });

  ipcMain.on("app:fatal-error", (_event, { title, message }) => {
    dialog.showErrorBox(title || "Lỗi ứng dụng nghiêm trọng", message || "Lỗi không xác định");
  });
}
