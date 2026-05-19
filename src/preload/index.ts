import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  initAdb: () => ipcRenderer.invoke('adb:init'),
  getDeviceInfo: (deviceId: string) => ipcRenderer.invoke('adb:get-info', deviceId),
  getDevices: () => ipcRenderer.invoke('adb:get-devices'),
  onDeviceUpdate: (callback: (devices: any[]) => void) => {
    ipcRenderer.removeAllListeners('adb:device-update')
    ipcRenderer.on('adb:device-update', (_event, devices) => callback(devices))
  },
  runAdbCommand: (deviceId: string, command: string) => ipcRenderer.invoke('adb:run-command', { deviceId, command }),
  runScrcpy: (deviceId: string, turnScreenOff: boolean) => ipcRenderer.invoke('adb:run-scrcpy', { deviceId, turnScreenOff }),
  connectWifi: (deviceId: string, ip: string) => ipcRenderer.invoke('adb:connect-wifi', { deviceId, ip }),
  connectIp: (ip: string) => ipcRenderer.invoke('adb:connect-ip', ip),
  pairDevice: (ipPort: string, code: string) => ipcRenderer.invoke('adb:pair-device', { ipPort, code }),
  getPackages: (deviceId: string, filter: 'all' | 'system' | 'third') => ipcRenderer.invoke('adb:get-packages', { deviceId, filter }),
  manageApp: (deviceId: string, pkgName: string, action: 'uninstall' | 'disable' | 'enable' | 'clear' | 'stop') => ipcRenderer.invoke('adb:manage-app', { deviceId, pkgName, action }),
  extractApp: (deviceId: string, pkgName: string, destPath: string) => ipcRenderer.invoke('adb:extract-app', { deviceId, pkgName, destPath }),
  installApk: (deviceId: string, apkPath: string) => ipcRenderer.invoke('adb:install-apk', { deviceId, apkPath }),
  openApkDialog: () => ipcRenderer.invoke('dialog:open-apk'),
  // File Manager
  listDirectory: (deviceId: string, remotePath: string) => ipcRenderer.invoke('adb:list-directory', { deviceId, remotePath }),
  createDirectory: (deviceId: string, remotePath: string) => ipcRenderer.invoke('adb:create-directory', { deviceId, remotePath }),
  deleteFile: (deviceId: string, remotePath: string) => ipcRenderer.invoke('adb:delete-file', { deviceId, remotePath }),
  renameFile: (deviceId: string, oldPath: string, newPath: string) => ipcRenderer.invoke('adb:rename-file', { deviceId, oldPath, newPath }),
  pushFile: (deviceId: string, localPath: string, remotePath: string) => ipcRenderer.invoke('adb:push-file', { deviceId, localPath, remotePath }),
  pullFile: (deviceId: string, remotePath: string, localPath: string) => ipcRenderer.invoke('adb:pull-file', { deviceId, remotePath, localPath }),
  getFileBase64: (deviceId: string, remotePath: string) => ipcRenderer.invoke('adb:get-file-base64', { deviceId, remotePath }),
  getStoragePoints: (deviceId: string) => ipcRenderer.invoke('adb:get-storage-points', { deviceId }),
  getBloatwareDb: () => ipcRenderer.invoke('adb:get-bloatware-db'),
  getBloatwareWithStatus: (deviceId: string) =>
    ipcRenderer.invoke('adb:get-bloatware-with-status', deviceId),
  debloatPackage: (deviceId: string, pkg: string, action: string, preferDisable: boolean) =>
    ipcRenderer.invoke('adb:debloat-package', deviceId, pkg, action, preferDisable),
  batchDebloat: (
    deviceId: string,
    packages: Array<{ package: string; preferDisable?: boolean }>,
    action: string
  ) => ipcRenderer.invoke('adb:batch-debloat', deviceId, packages, action),
  onBatchProgress: (cb: (data: { done: number; total: number }) => void) => {
    const listener = (_e: any, data: { done: number; total: number }) => cb(data);
    ipcRenderer.on('adb:batch-debloat-progress', listener);
    return () => ipcRenderer.removeListener('adb:batch-debloat-progress', listener);
  },

  // Tweaks
  getTweaksList: () => ipcRenderer.invoke('adb:get-tweaks-list'),
  getTweaksStatus: (deviceId: string) => ipcRenderer.invoke('adb:get-tweaks-status', deviceId),
  applyTweak: (deviceId: string, tweakId: string, enable: boolean) =>
    ipcRenderer.invoke('adb:apply-tweak', deviceId, tweakId, enable),

  // Display & DPI
  getDpi: (deviceId: string) => ipcRenderer.invoke('adb:get-dpi', deviceId),
  getResolution: (deviceId: string) => ipcRenderer.invoke('adb:get-resolution', deviceId),
  setDpi: (deviceId: string, dpi: number) => ipcRenderer.invoke('adb:set-dpi', deviceId, dpi),
  resetDpi: (deviceId: string) => ipcRenderer.invoke('adb:reset-dpi', deviceId),
  setResolution: (deviceId: string, w: number, h: number) =>
    ipcRenderer.invoke('adb:set-resolution', deviceId, w, h),
  resetResolution: (deviceId: string) => ipcRenderer.invoke('adb:reset-resolution', deviceId),
  setAnimationScale: (deviceId: string, scale: 0 | 0.5 | 1.0) =>
    ipcRenderer.invoke('adb:set-animation-scale', deviceId, scale),
  saveFileDialog: (defaultName: string) => ipcRenderer.invoke('dialog:save-file', { defaultName }),
  openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),
  onLogStream: (callback: (log: string) => void) => {
    ipcRenderer.removeAllListeners('adb:log-stream')
    ipcRenderer.on('adb:log-stream', (_event, log) => callback(log))
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
