import { ipcMain } from 'electron'
import { getDevices, getDeviceInfo } from '../core/adbService'
import { runScrcpy, connectWifi, connectIp, pairDevice } from '../core/deviceService'

export function registerDeviceHandlers(mainWindow: Electron.BrowserWindow) {
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
}
