import { ipcMain } from "electron";
import {
  scanQuickCleaner,
  executeQuickCleaner,
} from "../core/quickCleanerService";
import { CleanOptions } from "../../shared/types";
import { assertValidDeviceId } from "./validate";
import { store } from "../store";

export function registerQuickCleanerHandlers(mainWindow: Electron.BrowserWindow) {
  ipcMain.handle("cleaner:scan", async (_event, deviceId: string) => {
    try {
      assertValidDeviceId(deviceId);
      return await scanQuickCleaner(deviceId);
    } catch (err: any) {
      console.error("[CLEANER] Scan failed:", err);
      throw err;
    }
  });

  ipcMain.handle(
    "cleaner:execute",
    async (_event, { deviceId, options, whitelist }: { deviceId: string; options: CleanOptions; whitelist: string[] }) => {
      try {
        assertValidDeviceId(deviceId);
        return await executeQuickCleaner(deviceId, options, whitelist || [], (progressData) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send("cleaner:progress", progressData);
          }
        });
      } catch (err: any) {
        console.error("[CLEANER] Execute failed:", err);
        throw err;
      }
    }
  );

  ipcMain.handle("cleaner:get-whitelist", () => {
    return (store as any).get("cleanerWhitelist") || [];
  });

  ipcMain.handle("cleaner:save-whitelist", (_event, whitelist: string[]) => {
    if (Array.isArray(whitelist)) {
      (store as any).set("cleanerWhitelist", whitelist);
      return true;
    }
    return false;
  });
}
