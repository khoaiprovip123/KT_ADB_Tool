import { ipcMain, dialog } from 'electron'
import { getDevices, watchDevices, runAdbCommand, initAdb, getDeviceInfo, runScrcpy, connectWifi, connectIp, pairDevice, getPackages, manageApp, extractApp, installApk } from '../core/adbService'

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
    return await runAdbCommand(deviceId, command, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
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
}
