import { ipcMain, dialog } from 'electron'
import { getDevices, watchDevices, runAdbCommand, initAdb, getDeviceInfo, runScrcpy, connectWifi, connectIp, pairDevice, getPackages, manageApp, extractApp, installApk, listDirectory, createDirectory, deleteFile, renameFile, pushFile, pullFile, getFileBase64, getStoragePoints, getBloatwareDb, getBloatwareWithStatus, debloatPackage, batchDebloat, getTweakStatus, applyTweak, getCurrentDpi, getCurrentResolution, setDpi, resetDpi, setResolution, resetResolution, setAnimationScale, SYSTEM_TWEAKS } from '../core/adbService'

export function registerIpcHandlers(mainWindow: Electron.BrowserWindow) {
  ipcMain.handle('adb:init', async () => {
    const success = await initAdb((msg) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', msg)
      }
    })

    if (success) {
      // Bắt đầu theo dõi thiết bị sau khi ADB đã cài đặt
      watchDevices((devices) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('adb:device-update', devices)
        }
      })
    }
    return success
  })

  ipcMain.handle('adb:get-info', async (event, deviceId) => {
    return await getDeviceInfo(deviceId)
  })

  ipcMain.handle('adb:get-devices', async () => {
    return await getDevices()
  })

  // Đăng ký channel chạy lệnh ADB stream
  ipcMain.handle('adb:run-command', async (event, { deviceId, command }) => {
    const output = await runAdbCommand(deviceId, command, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
    const isError = output.startsWith('ERROR:') || output.startsWith('CRITICAL ERROR:') || output === 'FAILED'
    return {
      success: !isError,
      output: output
    }
  })

  // Khởi chạy Scrcpy
  ipcMain.handle('adb:run-scrcpy', async (event, { deviceId, turnScreenOff }) => {
    return await runScrcpy(deviceId, turnScreenOff, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  // Kết nối WiFi
  ipcMain.handle('adb:connect-wifi', async (event, { deviceId, ip }) => {
    return await connectWifi(deviceId, ip, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  // Kết nối IP thủ công
  ipcMain.handle('adb:connect-ip', async (event, ip) => {
    return await connectIp(ip, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  // Ghép nối thiết bị
  ipcMain.handle('adb:pair-device', async (event, { ipPort, code }) => {
    return await pairDevice(ipPort, code, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  // App Manager: Lấy danh sách app
  ipcMain.handle('adb:get-packages', async (event, { deviceId, filter }) => {
    return await getPackages(deviceId, filter)
  })

  // App Manager: Quản lý app
  ipcMain.handle('adb:manage-app', async (event, { deviceId, pkgName, action }) => {
    return await manageApp(deviceId, pkgName, action, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  // App Manager: Trích xuất APK
  ipcMain.handle('adb:extract-app', async (event, { deviceId, pkgName, destPath }) => {
    return await extractApp(deviceId, pkgName, destPath, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  // Chọn file APK
  ipcMain.handle('dialog:open-apk', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Android Packages', extensions: ['apk'] }]
    })
    return result.filePaths[0]
  })

  // Cài đặt APK
  ipcMain.handle('adb:install-apk', async (event, { deviceId, apkPath }) => {
    return await installApk(deviceId, apkPath, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  // --- File Manager Handlers ---
  ipcMain.handle('adb:list-directory', async (event, { deviceId, remotePath }) => {
    return await listDirectory(deviceId, remotePath)
  })

  ipcMain.handle('adb:create-directory', async (event, { deviceId, remotePath }) => {
    return await createDirectory(deviceId, remotePath)
  })

  ipcMain.handle('adb:delete-file', async (event, { deviceId, remotePath }) => {
    return await deleteFile(deviceId, remotePath)
  })

  ipcMain.handle('adb:rename-file', async (event, { deviceId, oldPath, newPath }) => {
    return await renameFile(deviceId, oldPath, newPath)
  })

  ipcMain.handle('adb:push-file', async (event, { deviceId, localPath, remotePath }) => {
    return await pushFile(deviceId, localPath, remotePath, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  ipcMain.handle('adb:pull-file', async (_, { deviceId, remotePath, localPath }) => {
    return await pullFile(deviceId, remotePath, localPath, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  ipcMain.handle('adb:get-file-base64', async (_, { deviceId, remotePath }) => {
    return await getFileBase64(deviceId, remotePath)
  })

  ipcMain.handle('adb:get-storage-points', async (event, args) => {
    try {
      const { deviceId } = args || {}
      if (!deviceId) return []
      return await getStoragePoints(deviceId)
    } catch (err) {
      console.error('IPC Error (get-storage-points):', err)
      return []
    }
  })
  // ── Bloatware DB ─────────────────────────────────────────────────────────────

  ipcMain.handle('adb:get-bloatware-db', () => {
    return getBloatwareDb();
  });

  ipcMain.handle('adb:get-bloatware-with-status', async (_event, deviceId: string) => {
    return getBloatwareWithStatus(deviceId);
  });

  ipcMain.handle('adb:debloat-package', async (_event, deviceId: string, packageName: string, action: string, preferDisable: boolean) => {
    return debloatPackage(deviceId, packageName, action as any, preferDisable);
  });

  ipcMain.handle('adb:batch-debloat', async (event, deviceId: string, packages: Array<{ package: string; preferDisable?: boolean }>, action: string) => {
    return batchDebloat(
      deviceId,
      packages,
      action as any,
      (done, total) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('adb:batch-debloat-progress', { done, total });
        }
      }
    );
  });

  // ── System Tweaks ────────────────────────────────────────────────────────────

  ipcMain.handle('adb:get-tweaks-list', () => SYSTEM_TWEAKS);

  ipcMain.handle('adb:get-tweaks-status', async (_event, deviceId: string) => {
    const results: Record<string, boolean> = {};
    await Promise.all(
      SYSTEM_TWEAKS.map(async (tweak) => {
        results[tweak.id] = await getTweakStatus(deviceId, tweak);
      })
    );
    return results;
  });

  ipcMain.handle('adb:apply-tweak', async (_event, deviceId: string, tweakId: string, enable: boolean) => {
    const tweak = SYSTEM_TWEAKS.find((t) => t.id === tweakId);
    if (!tweak) return { success: false, message: `Tweak ${tweakId} không tồn tại` };
    return applyTweak(deviceId, tweak, enable);
  });

  // ── Display & DPI ────────────────────────────────────────────────────────────

  ipcMain.handle('adb:get-dpi', async (_event, deviceId: string) => getCurrentDpi(deviceId));
  ipcMain.handle('adb:get-resolution', async (_event, deviceId: string) => getCurrentResolution(deviceId));
  ipcMain.handle('adb:set-dpi', async (_event, deviceId: string, dpi: number) => setDpi(deviceId, dpi));
  ipcMain.handle('adb:reset-dpi', async (_event, deviceId: string) => resetDpi(deviceId));
  ipcMain.handle('adb:set-resolution', async (_event, deviceId: string, w: number, h: number) => setResolution(deviceId, w, h));
  ipcMain.handle('adb:reset-resolution', async (_event, deviceId: string) => resetResolution(deviceId));
  ipcMain.handle('adb:set-animation-scale', async (_event, deviceId: string, scale: 0 | 0.5 | 1.0) =>
    setAnimationScale(deviceId, scale)
  );

  ipcMain.handle('dialog:save-file', async (event, { defaultName }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName
    })
    return result.filePath
  })

  ipcMain.handle('dialog:open-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile']
    })
    return result.filePaths[0]
  })
}
