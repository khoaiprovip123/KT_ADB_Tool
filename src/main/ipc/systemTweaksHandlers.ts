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
} from "../core/systemTweaksService";
import {
  assertValidAnimationScale,
  assertValidBoolean,
  assertValidDebloatAction,
  assertValidDeviceId,
  assertValidDpi,
  assertValidPackageName,
  assertValidResolution,
  isValidDeviceId,
} from "./validate";

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
      try {
        assertValidDeviceId(deviceId);
        return getBloatwareWithStatus(deviceId);
      } catch (err) {
        console.warn("[SECURITY] adb:get-bloatware-with-status rejected:", err);
        return [];
      }
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
      try {
        assertValidDeviceId(deviceId);
        assertValidPackageName(packageName);
        assertValidDebloatAction(action);
        assertValidBoolean(preferDisable, "preferDisable");
        return debloatPackage(deviceId, packageName, action, preferDisable);
      } catch (err: any) {
        console.warn("[SECURITY] adb:debloat-package rejected:", err);
        return { success: false, message: err.message };
      }
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
      try {
        assertValidDeviceId(deviceId);
        assertValidDebloatAction(action);
        if (!Array.isArray(packages) || packages.length > 500) {
          throw new Error("Invalid package list");
        }
        packages.forEach((entry) => {
          assertValidPackageName(entry?.package);
          if (
            entry.preferDisable !== undefined &&
            typeof entry.preferDisable !== "boolean"
          ) {
            throw new Error("Invalid preferDisable");
          }
        });
        return batchDebloat(deviceId, packages, action, (done, total) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send("adb:batch-debloat-progress", {
              done,
              total,
            });
          }
        });
      } catch (err) {
        console.warn("[SECURITY] adb:batch-debloat rejected:", err);
        return [];
      }
    },
  );

  // ── System Tweaks ──────────────────────────────────────────────────────────
  ipcMain.handle("adb:get-tweaks-list", () => SYSTEM_TWEAKS);

  ipcMain.handle("adb:get-tweaks-status", async (_event, deviceId: string) => {
    try {
      assertValidDeviceId(deviceId);
    } catch {
      return {};
    }
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
      try {
        assertValidDeviceId(deviceId);
        assertValidBoolean(enable, "enable");
        const tweak = SYSTEM_TWEAKS.find((t) => t.id === tweakId);
        if (!tweak)
          return { success: false, message: `Tweak ${tweakId} không tồn tại` };
        return applyTweak(deviceId, tweak, enable);
      } catch (err: any) {
        console.warn("[SECURITY] adb:apply-tweak rejected:", err);
        return { success: false, message: err.message };
      }
    },
  );

  // ── Display & DPI ──────────────────────────────────────────────────────────
  ipcMain.handle("adb:get-dpi", async (_event, deviceId: string) => {
    if (!isValidDeviceId(deviceId)) return null;
    return getCurrentDpi(deviceId);
  });
  ipcMain.handle("adb:get-resolution", async (_event, deviceId: string) => {
    if (!isValidDeviceId(deviceId)) return null;
    return getCurrentResolution(deviceId);
  });
  ipcMain.handle("adb:set-dpi", async (_event, deviceId: string, dpi: number) => {
    try {
      assertValidDeviceId(deviceId);
      assertValidDpi(dpi);
      return setDpi(deviceId, dpi);
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  });
  ipcMain.handle("adb:reset-dpi", async (_event, deviceId: string) => {
    if (!isValidDeviceId(deviceId))
      return { success: false, message: "Invalid deviceId" };
    return resetDpi(deviceId);
  });
  ipcMain.handle(
    "adb:set-resolution",
    async (_event, deviceId: string, w: number, h: number) => {
      try {
        assertValidDeviceId(deviceId);
        assertValidResolution(w, h);
        return setResolution(deviceId, w, h);
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
  );
  ipcMain.handle("adb:reset-resolution", async (_event, deviceId: string) => {
    if (!isValidDeviceId(deviceId))
      return { success: false, message: "Invalid deviceId" };
    return resetResolution(deviceId);
  });
  ipcMain.handle(
    "adb:set-animation-scale",
    async (_event, deviceId: string, scale: 0 | 0.5 | 1.0) => {
      try {
        assertValidDeviceId(deviceId);
        assertValidAnimationScale(scale);
        await setAnimationScale(deviceId, scale);
        return { success: true, message: "OK" };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
  );
}
