import { ipcMain, app, dialog } from "electron";
import * as path from "path";
import * as fs from "fs";
import { initAdb, watchDevices, runAdbCommandDetailed } from "../core/adbCore";
import { setTrayDevices } from "../tray";
import { registerDeviceHandlers } from "./deviceHandlers";
import { registerAppHandlers } from "./appHandlers";
import { registerFileHandlers } from "./fileHandlers";
import { registerSystemTweaksHandlers } from "./systemTweaksHandlers";
import { registerXiaomiExperienceHandlers } from "./xiaomiExperienceHandlers";
import { registerAdvancedAdbHandlers } from "./advancedAdbHandlers";
import { registerQuickCleanerHandlers } from "./quickCleanerHandlers";
import { registerFastbootRomHandlers } from "./fastbootRomHandlers";
import {
  captureDeviceScreenshot,
  startDeviceRecording,
  stopDeviceRecording,
  isScreenRecording,
  openCaptureFolder,
} from "../core/screenCaptureService";
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
  ipcMain.handle("win:minimize-to-tray", () => {
    if (!mainWindow.isDestroyed()) mainWindow.hide();
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
        setTrayDevices(devices, mainWindow);
      });
    }
    return success;
  });

  ipcMain.handle(
    "adb:run-command",
    async (_event, { deviceId, command, timeoutMs }) => {
      try {
        assertValidDeviceId(deviceId);
        assertValidShellCommand(command);
        const result = await runAdbCommandDetailed(
          deviceId,
          command,
          timeoutMs,
        );
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
    },
  );

  // ── Sub-module Handlers ───────────────────────────────────────────────────
  registerDeviceHandlers(mainWindow);
  registerAppHandlers(mainWindow);
  registerFileHandlers(mainWindow);
  registerSystemTweaksHandlers(mainWindow);
  registerXiaomiExperienceHandlers(mainWindow);
  registerAdvancedAdbHandlers();
  registerQuickCleanerHandlers(mainWindow);
  registerFastbootRomHandlers(mainWindow);

  // ── Store Handlers (whitelist key hợp lệ để tránh ghi đè nguy hiểm) ───────
  const ALLOWED_STORE_KEYS = new Set([
    "theme",
    "autoRefresh",
    "autoBackupApk",
    "downloadPath",
    "adbPath",
    "cleanerWhitelist",
    "minimizeToTray",
    "scrcpyBorderless",
    "scrcpyAudio",
    "wallpaperType",
    "wallpaperPreset",
    "wallpaperBlur",
    "wallpaperOverlay",
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

  // ── Wallpaper Handlers ───────────────────────────────────────────────────
  ipcMain.handle("wallpaper:select", async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Chọn hình nền",
        filters: [
          {
            name: "Hình ảnh (JPG, PNG, WebP, BMP)",
            extensions: ["jpg", "jpeg", "png", "webp", "bmp"],
          },
        ],
        properties: ["openFile"],
      });

      if (result.canceled || !result.filePaths[0]) return null;
      const sourcePath = result.filePaths[0];
      const ext = path.extname(sourcePath).toLowerCase();
      const userData = app.getPath("userData");
      const destPath = path.join(userData, `custom_wallpaper${ext}`);

      // Dọn dẹp wallpaper cũ
      const exts = [".jpg", ".jpeg", ".png", ".webp", ".bmp"];
      for (const e of exts) {
        const oldFile = path.join(userData, `custom_wallpaper${e}`);
        if (fs.existsSync(oldFile)) {
          try {
            fs.unlinkSync(oldFile);
          } catch {
            /* ignore */
          }
        }
      }

      await fs.promises.copyFile(sourcePath, destPath);
      const buffer = await fs.promises.readFile(destPath);
      const mime =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";
      const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

      return {
        dataUrl,
        fileName: path.basename(sourcePath),
      };
    } catch (err: any) {
      console.error("Lỗi chọn hình nền:", err);
      return null;
    }
  });

  ipcMain.handle("wallpaper:get-custom", async () => {
    try {
      const userData = app.getPath("userData");
      const exts = [".jpg", ".jpeg", ".png", ".webp", ".bmp"];
      for (const e of exts) {
        const p = path.join(userData, `custom_wallpaper${e}`);
        if (fs.existsSync(p)) {
          const buffer = await fs.promises.readFile(p);
          const mime =
            e === ".png"
              ? "image/png"
              : e === ".webp"
                ? "image/webp"
                : "image/jpeg";
          return `data:${mime};base64,${buffer.toString("base64")}`;
        }
      }
      return null;
    } catch (err) {
      return null;
    }
  });

  ipcMain.handle("wallpaper:remove-custom", async () => {
    try {
      const userData = app.getPath("userData");
      const exts = [".jpg", ".jpeg", ".png", ".webp", ".bmp"];
      for (const e of exts) {
        const p = path.join(userData, `custom_wallpaper${e}`);
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
          } catch {
            /* ignore */
          }
        }
      }
      return true;
    } catch {
      return false;
    }
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

  ipcMain.handle("app:open-external", async (_event, url: string) => {
    try {
      if (typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://"))) {
        const { shell } = await import("electron");
        await shell.openExternal(url);
        return true;
      }
    } catch (err) {
      console.error("Lỗi mở URL bên ngoài:", err);
    }
    return false;
  });

  ipcMain.on("app:fatal-error", (_event, { title, message }) => {
    dialog.showErrorBox(title || "Lỗi ứng dụng nghiêm trọng", message || "Lỗi không xác định");
  });

  // ── Screen Capture & Recording Handlers ────────────────────────────────
  ipcMain.handle("screen:screenshot", async (_event, { deviceId }: { deviceId: string }) => {
    assertValidDeviceId(deviceId);
    return await captureDeviceScreenshot(deviceId);
  });

  ipcMain.handle("screen:start-record", async (_event, { deviceId }: { deviceId: string }) => {
    assertValidDeviceId(deviceId);
    return await startDeviceRecording(deviceId);
  });

  ipcMain.handle("screen:stop-record", async (_event, { deviceId }: { deviceId: string }) => {
    assertValidDeviceId(deviceId);
    return await stopDeviceRecording(deviceId);
  });

  ipcMain.handle("screen:is-recording", (_event, { deviceId }: { deviceId: string }) => {
    assertValidDeviceId(deviceId);
    return isScreenRecording(deviceId);
  });

  ipcMain.handle("screen:open-folder", async (_event, { type }: { type: "screenshots" | "videos" }) => {
    return await openCaptureFolder(type);
  });
}
