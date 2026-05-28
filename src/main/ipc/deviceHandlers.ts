import { ipcMain } from 'electron'
import { getDevices, getDeviceInfo, killAdbServer, initAdb } from '../core/adbService'
import { runScrcpy, connectWifi, connectIp, pairDevice } from '../core/deviceService'
import {
  getDeviceProfile,
  getInstalledPackageSet,
  readSettingsSnapshot,
  readDeviceConfigSnapshot
} from '../core/deviceProfileService'

export function registerDeviceHandlers(mainWindow: Electron.BrowserWindow) {
  ipcMain.handle('adb:fix-connection', async () => {
    try {
      await killAdbServer()
      await new Promise(r => setTimeout(r, 1000))
      const success = await initAdb(() => {})
      if (!success) throw new Error('Không khởi tạo được ADB client.')
      const devices = await getDevices()
      return { success: true, devices, message: 'Đã reset server ADB thành công!' }
    } catch (err: any) {
      return { success: false, message: `Lỗi: ${err.message}` }
    }
  })

  ipcMain.handle('adb:get-devices', async () => {
    return await getDevices()
  })

  ipcMain.handle('adb:get-info', async (_event, deviceId) => {
    return await getDeviceInfo(deviceId)
  })

  ipcMain.handle('adb:run-scrcpy', async (_event, { deviceId, turnScreenOff }) => {
    return await runScrcpy(deviceId, turnScreenOff, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  ipcMain.handle('adb:connect-wifi', async (_event, { deviceId, ip }) => {
    return await connectWifi(deviceId, ip, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  ipcMain.handle('adb:connect-ip', async (_event, ip) => {
    return await connectIp(ip, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  ipcMain.handle('adb:pair-device', async (_event, { ipPort, code }) => {
    return await pairDevice(ipPort, code, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  // Device Profile & Capability Detection
  ipcMain.handle('adb:get-device-profile', async (_event, deviceId) => {
    return await getDeviceProfile(deviceId)
  })

  ipcMain.handle('adb:get-installed-packages', async (_event, deviceId) => {
    const pkgSet = await getInstalledPackageSet(deviceId)
    return Array.from(pkgSet) // Chuyển đổi Set thành Array để serialize qua IPC
  })

  ipcMain.handle('adb:read-settings-snapshot', async (_event, { deviceId, namespace }) => {
    return await readSettingsSnapshot(deviceId, namespace)
  })

  ipcMain.handle('adb:read-device-config-snapshot', async (_event, deviceId) => {
    return await readDeviceConfigSnapshot(deviceId)
  })
}
