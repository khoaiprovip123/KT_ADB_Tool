import { ipcMain } from 'electron'
import { advancedAdbService } from '../core/advancedAdbService'

export function registerAdvancedAdbHandlers() {
  ipcMain.handle('advanced-adb:get-props', async (_event, deviceId: string) => {
    try {
      return await advancedAdbService.getProps(deviceId)
    } catch (error: any) {
      return { error: error.message }
    }
  })

  ipcMain.handle('advanced-adb:get-settings', async (_event, deviceId: string, namespace: string) => {
    try {
      return await advancedAdbService.getSettingsList(deviceId, namespace)
    } catch (error: any) {
      return { error: error.message }
    }
  })

  ipcMain.handle('advanced-adb:get-dumpsys', async (_event, deviceId: string, service: string) => {
    try {
      return await advancedAdbService.getDumpsys(deviceId, service)
    } catch (error: any) {
      return error.message
    }
  })

  ipcMain.handle('advanced-adb:execute-preset', async (
    _event,
    deviceId: string,
    commandId: string,
    params: Record<string, string | number>
  ) => {
    try {
      return await advancedAdbService.executePresetCommand(deviceId, commandId, params)
    } catch (error: any) {
      return { success: false, output: error.message }
    }
  })

  ipcMain.handle('advanced-adb:execute-raw', async (_event, deviceId: string, command: string) => {
    try {
      return await advancedAdbService.executeRawShell(deviceId, command)
    } catch (error: any) {
      return { success: false, output: error.message }
    }
  })
}
