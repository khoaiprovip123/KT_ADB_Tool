import { ipcMain, dialog, BrowserWindow } from "electron";
import {
  scanRomFolder,
  getFastbootDeviceInfo,
  flashFastbootRom,
  FlashRomOptions,
} from "../core/fastbootRomService";
import { assertValidDeviceId } from "./validate";

let isFlashingCancelled = false;

export function registerFastbootRomHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle("dialog:open-rom-folder", async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Chọn thư mục chứa ROM Fastboot",
    });
    if (res.canceled || res.filePaths.length === 0) {
      return null;
    }
    return res.filePaths[0];
  });

  ipcMain.handle("fastboot:scan-rom-folder", async (_event, folderPath: string) => {
    try {
      if (!folderPath || typeof folderPath !== "string") {
        throw new Error("Đường dẫn thư mục không hợp lệ");
      }
      return await scanRomFolder(folderPath);
    } catch (err: any) {
      return { error: err.message || "Không thể quét thư mục ROM" };
    }
  });

  ipcMain.handle("fastboot:get-device-info", async (_event, deviceId: string) => {
    try {
      assertValidDeviceId(deviceId);
      return await getFastbootDeviceInfo(deviceId);
    } catch (err: any) {
      return { product: "unknown", error: err.message };
    }
  });

  ipcMain.handle("fastboot:flash-rom", async (_event, options: FlashRomOptions) => {
    try {
      assertValidDeviceId(options.deviceId);
      isFlashingCancelled = false;

      const result = await flashFastbootRom(
        options,
        (progressEvent) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send("fastboot:flash-progress", progressEvent);
          }
        },
        (logMsg) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send("adb:log-stream", logMsg);
            mainWindow.webContents.send("fastboot:flash-log", logMsg);
          }
        },
        () => isFlashingCancelled
      );

      return result;
    } catch (err: any) {
      return { success: false, message: err.message || "Thao tác nạp ROM bị lỗi." };
    }
  });

  ipcMain.handle("fastboot:cancel-flash", () => {
    isFlashingCancelled = true;
    return true;
  });
}
