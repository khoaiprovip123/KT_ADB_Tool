import { ipcMain, app, dialog } from "electron";
import { initAdb, watchDevices, runAdbCommandDetailed } from "../core/adbCore";
import { registerDeviceHandlers } from "./deviceHandlers";
import { registerAppHandlers } from "./appHandlers";
import { registerFileHandlers } from "./fileHandlers";
import { registerSystemTweaksHandlers } from "./systemTweaksHandlers";
import { registerXiaomiExperienceHandlers } from "./xiaomiExperienceHandlers";
import { registerAdvancedAdbHandlers } from "./advancedAdbHandlers";
import { registerQuickCleanerHandlers } from "./quickCleanerHandlers";
import { store } from "../store";
import { assertValidDeviceId, assertValidShellCommand } from "./validate";

export function registerIpcHandlers(mainWindow: Electron.BrowserWindow) {
  // ── Window Controls ──────────────────────────────────────────────────────
  ipcMain.handle("win:minimize", () => {
    if (!mainWindow.isDestroyed()) mainWindow.minimize();
  });
  ipcMain.handle("win:maximize", () => {
    if (!mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  ipcMain.handle("win:close", () => {
    if (!mainWindow.isDestroyed()) mainWindow.close();
  });

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
      const result = await runAdbCommandDetailed(deviceId, command);
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send("adb:log-stream", result.output);
      }
      return {
        success: result.success,
        output: result.output,
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
  registerQuickCleanerHandlers(mainWindow);

  // ── Store Handlers (whitelist key hợp lệ để tránh ghi đè nguy hiểm) ───────
  const ALLOWED_STORE_KEYS = new Set([
    "theme",
    "autoRefresh",
    "autoBackupApk",
    "downloadPath",
    "adbPath",
    "cleanerWhitelist",
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

  ipcMain.handle(
    "app:download-install-update",
    async (_event, downloadUrl: string, expectedSize?: number) => {
      const { downloadAndInstallUpdate } = await import("../core/updateService");
      return downloadAndInstallUpdate(
        downloadUrl,
        (progress) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send("app:update-progress", progress);
          }
        },
        expectedSize,
      );
    },
  );

  ipcMain.on("app:fatal-error", (_event, { title, message }) => {
    dialog.showErrorBox(title || "Lỗi ứng dụng nghiêm trọng", message || "Lỗi không xác định");
  });
}
