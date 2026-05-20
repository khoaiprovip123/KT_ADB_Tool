import { ipcMain, dialog } from 'electron'
import { getPackages, manageApp, extractApp, installApk } from '../core/appService'

export function registerAppHandlers(mainWindow: Electron.BrowserWindow) {
  ipcMain.handle('adb:get-packages', async (_event, { deviceId, filter }) => {
    return await getPackages(deviceId, filter)
  })

  ipcMain.handle('adb:manage-app', async (_event, { deviceId, pkgName, action }) => {
    return await manageApp(deviceId, pkgName, action, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  ipcMain.handle('adb:extract-app', async (_event, { deviceId, pkgName, destPath }) => {
    return await extractApp(deviceId, pkgName, destPath, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })

  ipcMain.handle('dialog:open-apk', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Android Packages', extensions: ['apk'] }]
    })
    return result.filePaths[0]
  })

  ipcMain.handle('adb:install-apk', async (_event, { deviceId, apkPath }) => {
    return await installApk(deviceId, apkPath, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })
  })
}
