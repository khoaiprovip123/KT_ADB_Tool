import { ipcMain, dialog } from "electron";
import {
  assertValidDeviceId,
  assertValidLocalPath,
  assertValidRemotePath,
  normalizeRemotePath,
} from "./validate";
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
      try {
        assertValidDeviceId(deviceId);
        assertValidRemotePath(remotePath);
        return await listDirectory(deviceId, normalizeRemotePath(remotePath));
      } catch (err) {
        console.warn("[SECURITY] adb:list-directory rejected:", err);
        return [];
      }
    },
  );

  ipcMain.handle(
    "adb:create-directory",
    async (_event, { deviceId, remotePath }) => {
      try {
        assertValidDeviceId(deviceId);
        assertValidRemotePath(remotePath);
        return await createDirectory(deviceId, normalizeRemotePath(remotePath));
      } catch (err) {
        console.warn("[SECURITY] adb:create-directory rejected:", err);
        return false;
      }
    },
  );

  ipcMain.handle(
    "adb:delete-file",
    async (_event, { deviceId, remotePath }) => {
      try {
        assertValidDeviceId(deviceId);
        assertValidRemotePath(remotePath);
        return await deleteFile(deviceId, normalizeRemotePath(remotePath));
      } catch (err) {
        console.warn("[SECURITY] adb:delete-file rejected:", err);
        return false;
      }
    },
  );

  ipcMain.handle(
    "adb:rename-file",
    async (_event, { deviceId, oldPath, newPath }) => {
      try {
        assertValidDeviceId(deviceId);
        assertValidRemotePath(oldPath);
        assertValidRemotePath(newPath);
        return await renameFile(
          deviceId,
          normalizeRemotePath(oldPath),
          normalizeRemotePath(newPath),
        );
      } catch (err) {
        console.warn("[SECURITY] adb:rename-file rejected:", err);
        return false;
      }
    },
  );

  ipcMain.handle(
    "adb:push-file",
    async (_event, { deviceId, localPath, remotePath }) => {
      try {
        assertValidDeviceId(deviceId);
        assertValidLocalPath(localPath);
        assertValidRemotePath(remotePath);
        return await pushFile(
          deviceId,
          localPath,
          normalizeRemotePath(remotePath),
          (log) => {
            if (!mainWindow.isDestroyed()) {
              mainWindow.webContents.send("adb:log-stream", log);
            }
          },
        );
      } catch (err) {
        console.warn("[SECURITY] adb:push-file rejected:", err);
        return false;
      }
    },
  );

  ipcMain.handle(
    "adb:pull-file",
    async (_event, { deviceId, remotePath, localPath }) => {
      try {
        assertValidDeviceId(deviceId);
        assertValidRemotePath(remotePath);
        assertValidLocalPath(localPath);
        return await pullFile(
          deviceId,
          normalizeRemotePath(remotePath),
          localPath,
          (log) => {
            if (!mainWindow.isDestroyed()) {
              mainWindow.webContents.send("adb:log-stream", log);
            }
          },
        );
      } catch (err) {
        console.warn("[SECURITY] adb:pull-file rejected:", err);
        return false;
      }
    },
  );

  ipcMain.handle(
    "adb:get-file-base64",
    async (_event, { deviceId, remotePath }) => {
      try {
        assertValidDeviceId(deviceId);
        assertValidRemotePath(remotePath);
        return await getFileBase64(deviceId, normalizeRemotePath(remotePath));
      } catch (err) {
        console.warn("[SECURITY] adb:get-file-base64 rejected:", err);
        return null;
      }
    },
  );

  ipcMain.handle("adb:get-storage-points", async (_event, args) => {
    try {
      const { deviceId } = args || {};
      assertValidDeviceId(deviceId);
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
