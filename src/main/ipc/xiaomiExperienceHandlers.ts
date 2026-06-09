import { ipcMain } from "electron";
import { assertValidBoolean, isValidDeviceId } from "./validate";
import {
  getExperienceCapabilities,
  readExperienceItem,
  applyExperienceItem,
  rollbackExperienceItem,
} from "../core/xiaomiExperienceService";

export function registerXiaomiExperienceHandlers(
  _mainWindow: Electron.BrowserWindow,
) {
  ipcMain.handle(
    "xiaomi:get-experience-capabilities",
    async (_event, deviceId) => {
      if (!isValidDeviceId(deviceId)) return [];
      return await getExperienceCapabilities(deviceId);
    },
  );

  ipcMain.handle(
    "xiaomi:read-experience-item",
    async (_event, { deviceId, itemId }) => {
      if (!isValidDeviceId(deviceId)) return "";
      return await readExperienceItem(deviceId, itemId);
    },
  );

  ipcMain.handle(
    "xiaomi:apply-experience-item",
    async (_event, { deviceId, itemId, enable }) => {
      if (!isValidDeviceId(deviceId)) {
        return { success: false, output: "Invalid deviceId" };
      }
      try {
        assertValidBoolean(enable, "enable");
      } catch (err: any) {
        return { success: false, output: err.message };
      }
      return await applyExperienceItem(deviceId, itemId, enable);
    },
  );

  ipcMain.handle(
    "xiaomi:rollback-experience-item",
    async (_event, { deviceId, itemId }) => {
      if (!isValidDeviceId(deviceId)) {
        return { success: false, output: "Invalid deviceId" };
      }
      return await rollbackExperienceItem(deviceId, itemId);
    },
  );
}
