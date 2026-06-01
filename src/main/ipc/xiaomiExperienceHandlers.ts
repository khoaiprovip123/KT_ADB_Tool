import { ipcMain } from "electron";
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
      return await getExperienceCapabilities(deviceId);
    },
  );

  ipcMain.handle(
    "xiaomi:read-experience-item",
    async (_event, { deviceId, itemId }) => {
      return await readExperienceItem(deviceId, itemId);
    },
  );

  ipcMain.handle(
    "xiaomi:apply-experience-item",
    async (_event, { deviceId, itemId, enable }) => {
      return await applyExperienceItem(deviceId, itemId, enable);
    },
  );

  ipcMain.handle(
    "xiaomi:rollback-experience-item",
    async (_event, { deviceId, itemId }) => {
      return await rollbackExperienceItem(deviceId, itemId);
    },
  );
}
