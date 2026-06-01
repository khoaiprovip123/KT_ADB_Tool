import { ipcMain, dialog } from "electron";
import {
  listDirectory,
  createDirectory,
  deleteFile,
  renameFile,
  pushFile,
  pullFile,
  getFileBase64,
  getStoragePoints,
} from "../core/fileService";

export function registerFileHandlers(mainWindow: Electron.BrowserWindow) {
  ipcMain.handle(
    "adb:list-directory",
    async (_event, { deviceId, remotePath }) => {
      return await listDirectory(deviceId, remotePath);
    },
  );

  ipcMain.handle(
    "adb:create-directory",
    async (_event, { deviceId, remotePath }) => {
      return await createDirectory(deviceId, remotePath);
    },
  );

  ipcMain.handle(
    "adb:delete-file",
    async (_event, { deviceId, remotePath }) => {
      return await deleteFile(deviceId, remotePath);
    },
  );

  ipcMain.handle(
    "adb:rename-file",
    async (_event, { deviceId, oldPath, newPath }) => {
      return await renameFile(deviceId, oldPath, newPath);
    },
  );

  ipcMain.handle(
    "adb:push-file",
    async (_event, { deviceId, localPath, remotePath }) => {
      return await pushFile(deviceId, localPath, remotePath, (log) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send("adb:log-stream", log);
        }
      });
    },
  );

  ipcMain.handle(
    "adb:pull-file",
    async (_event, { deviceId, remotePath, localPath }) => {
      return await pullFile(deviceId, remotePath, localPath, (log) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send("adb:log-stream", log);
        }
      });
    },
  );

  ipcMain.handle(
    "adb:get-file-base64",
    async (_event, { deviceId, remotePath }) => {
      return await getFileBase64(deviceId, remotePath);
    },
  );

  ipcMain.handle("adb:get-storage-points", async (_event, args) => {
    try {
      const { deviceId } = args || {};
      if (!deviceId) return [];
      return await getStoragePoints(deviceId);
    } catch (err) {
      console.error("IPC Error (get-storage-points):", err);
      return [];
    }
  });

  ipcMain.handle("dialog:save-file", async (_event, { defaultName }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
    });
    return result.filePath;
  });

  ipcMain.handle("dialog:open-file", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
    });
    return result.filePaths[0];
  });
}
