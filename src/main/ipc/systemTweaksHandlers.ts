import { ipcMain } from "electron";
import {
  getBloatwareDb,
  getBloatwareWithStatus,
  debloatPackage,
  batchDebloat,
  SYSTEM_TWEAKS,
  getTweakStatus,
  applyTweak,
  getCurrentDpi,
  getCurrentResolution,
  setDpi,
  resetDpi,
  setResolution,
  resetResolution,
  setAnimationScale,
  type DebloatAction,
} from "../core/systemTweaksService";

export function registerSystemTweaksHandlers(
  mainWindow: Electron.BrowserWindow,
) {
  // ── Bloatware DB ───────────────────────────────────────────────────────────
  ipcMain.handle("adb:get-bloatware-db", () => {
    return getBloatwareDb();
  });

  ipcMain.handle(
    "adb:get-bloatware-with-status",
    async (_event, deviceId: string) => {
      return getBloatwareWithStatus(deviceId);
    },
  );

  ipcMain.handle(
    "adb:debloat-package",
    async (
      _event,
      deviceId: string,
      packageName: string,
      action: string,
      preferDisable: boolean,
    ) => {
      return debloatPackage(
        deviceId,
        packageName,
        action as DebloatAction,
        preferDisable,
      );
    },
  );

  ipcMain.handle(
    "adb:batch-debloat",
    async (
      _event,
      deviceId: string,
      packages: Array<{ package: string; preferDisable?: boolean }>,
      action: string,
    ) => {
      return batchDebloat(
        deviceId,
        packages,
        action as DebloatAction,
        (done, total) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send("adb:batch-debloat-progress", {
              done,
              total,
            });
          }
        },
      );
    },
  );

  // ── System Tweaks ──────────────────────────────────────────────────────────
  ipcMain.handle("adb:get-tweaks-list", () => SYSTEM_TWEAKS);

  ipcMain.handle("adb:get-tweaks-status", async (_event, deviceId: string) => {
    const results: Record<string, boolean> = {};
    await Promise.all(
      SYSTEM_TWEAKS.map(async (tweak) => {
        results[tweak.id] = await getTweakStatus(deviceId, tweak);
      }),
    );
    return results;
  });

  ipcMain.handle(
    "adb:apply-tweak",
    async (_event, deviceId: string, tweakId: string, enable: boolean) => {
      const tweak = SYSTEM_TWEAKS.find((t) => t.id === tweakId);
      if (!tweak)
        return { success: false, message: `Tweak ${tweakId} không tồn tại` };
      return applyTweak(deviceId, tweak, enable);
    },
  );

  // ── Display & DPI ──────────────────────────────────────────────────────────
  ipcMain.handle("adb:get-dpi", async (_event, deviceId: string) =>
    getCurrentDpi(deviceId),
  );
  ipcMain.handle("adb:get-resolution", async (_event, deviceId: string) =>
    getCurrentResolution(deviceId),
  );
  ipcMain.handle("adb:set-dpi", async (_event, deviceId: string, dpi: number) =>
    setDpi(deviceId, dpi),
  );
  ipcMain.handle("adb:reset-dpi", async (_event, deviceId: string) =>
    resetDpi(deviceId),
  );
  ipcMain.handle(
    "adb:set-resolution",
    async (_event, deviceId: string, w: number, h: number) =>
      setResolution(deviceId, w, h),
  );
  ipcMain.handle("adb:reset-resolution", async (_event, deviceId: string) =>
    resetResolution(deviceId),
  );
  ipcMain.handle(
    "adb:set-animation-scale",
    async (_event, deviceId: string, scale: 0 | 0.5 | 1.0) =>
      setAnimationScale(deviceId, scale),
  );
}
