import { ipcMain } from 'electron'
import { initAdb, watchDevices, runAdbCommand } from '../core/adbService'
import { registerDeviceHandlers } from './deviceHandlers'
import { registerAppHandlers } from './appHandlers'
import { registerFileHandlers } from './fileHandlers'
import { registerSystemTweaksHandlers } from './systemTweaksHandlers'

export function registerIpcHandlers(mainWindow: Electron.BrowserWindow) {
  // ── Core ADB ──────────────────────────────────────────────────────────────
  ipcMain.handle('adb:init', async () => {
    const success = await initAdb((msg) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', msg)
      }
    })

    if (success) {
      watchDevices((devices) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('adb:device-update', devices)
        }
      })
    }
    return success
  })

  ipcMain.handle('adb:run-command', async (_event, { deviceId, command }) => {
    const output = (await runAdbCommand(deviceId, command, (log) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adb:log-stream', log)
      }
    })) as string
    const isError = output.startsWith('ERROR:') || output.startsWith('CRITICAL ERROR:') || output === 'FAILED'
    return {
      success: !isError,
      output: output
    }
  })

  // ── Sub-module Handlers ───────────────────────────────────────────────────
  registerDeviceHandlers(mainWindow)
  registerAppHandlers(mainWindow)
  registerFileHandlers(mainWindow)
  registerSystemTweaksHandlers(mainWindow)
}
