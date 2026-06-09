import { ipcMain, dialog } from "electron";
import {
  getPackages,
  manageApp,
  extractApp,
  installApk,
} from "../core/appService";
import {
  assertValidApkPath,
  assertValidAppAction,
  assertValidDeviceId,
  assertValidLocalPath,
  assertValidPackageFilter,
  assertValidPackageName,
} from "./validate";

export function registerAppHandlers(mainWindow: Electron.BrowserWindow) {
  ipcMain.handle("adb:get-packages", async (_event, { deviceId, filter }) => {
    try {
      assertValidDeviceId(deviceId);
      assertValidPackageFilter(filter);
      return await getPackages(deviceId, filter);
    } catch (err) {
      console.warn("[SECURITY] adb:get-packages rejected:", err);
      return [];
    }
  });

  ipcMain.handle(
    "adb:manage-app",
    async (_event, { deviceId, pkgName, action }) => {
      try {
        assertValidDeviceId(deviceId);
        assertValidPackageName(pkgName);
        assertValidAppAction(action);
        return await manageApp(deviceId, pkgName, action, (log) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send("adb:log-stream", log);
          }
        });
      } catch (err: any) {
        console.warn("[SECURITY] adb:manage-app rejected:", err);
        return { success: false, output: err.message };
      }
    },
  );

  ipcMain.handle(
    "adb:extract-app",
    async (_event, { deviceId, pkgName, destPath }) => {
      try {
        assertValidDeviceId(deviceId);
        assertValidPackageName(pkgName);
        assertValidLocalPath(destPath);
        return await extractApp(deviceId, pkgName, destPath, (log) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send("adb:log-stream", log);
          }
        });
      } catch (err) {
        console.warn("[SECURITY] adb:extract-app rejected:", err);
        return false;
      }
    },
  );

  ipcMain.handle("dialog:open-apk", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "Android Packages", extensions: ["apk"] }],
    });
    return result.filePaths[0];
  });

  ipcMain.handle("adb:install-apk", async (_event, { deviceId, apkPath }) => {
    try {
      assertValidDeviceId(deviceId);
      assertValidApkPath(apkPath);
      return await installApk(deviceId, apkPath, (log) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send("adb:log-stream", log);
        }
      });
    } catch (err) {
      console.warn("[SECURITY] adb:install-apk rejected:", err);
      return false;
    }
  });
}
