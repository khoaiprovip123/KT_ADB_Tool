import { contextBridge, ipcRenderer } from "electron";

// Validate input before sending to main process
const validateCommand = (deviceId: string, command: string): boolean => {
  // Basic checks
  if (!deviceId || typeof deviceId !== "string") return false;
  if (!command || typeof command !== "string") return false;
  if (deviceId.length > 255 || command.length > 10000) return false;

  // Check for suspicious patterns
  if (
    deviceId.includes(";") ||
    deviceId.includes("|") ||
    deviceId.includes("&")
  )
    return false;
  if (command.includes("$(") || command.includes("`")) return false;

  return true;
};

// Custom APIs for renderer
const api = {
  minimizeWindow: () => ipcRenderer.invoke("win:minimize"),
  maximizeWindow: () => ipcRenderer.invoke("win:maximize"),
  closeWindow: () => ipcRenderer.invoke("win:close"),
  initAdb: () => ipcRenderer.invoke("adb:init"),
  fixConnection: () => ipcRenderer.invoke("adb:fix-connection"),
  getDeviceInfo: (deviceId: string) =>
    ipcRenderer.invoke("adb:get-info", deviceId),
  getDevices: () => ipcRenderer.invoke("adb:get-devices"),
  fastbootReboot: (deviceId: string, target?: "bootloader" | "recovery") => {
    if (!deviceId || typeof deviceId !== "string" || deviceId.includes(";") || deviceId.includes("|") || deviceId.includes("&")) {
      return Promise.reject(new Error("Invalid device ID"));
    }
    return ipcRenderer.invoke("fastboot:reboot", { deviceId, target });
  },
  onDeviceUpdate: (callback: (devices: any[]) => void) => {
    const listener = (_event: any, devices: any[]) => callback(devices);
    ipcRenderer.on("adb:device-update", listener);
    return () => ipcRenderer.removeListener("adb:device-update", listener);
  },
  getStorageStats: (deviceId: string) =>
    ipcRenderer.invoke("adb:get-storage-stats", deviceId),
  runAdbCommand: (deviceId: string, command: string) => {
    if (!validateCommand(deviceId, command)) {
      return Promise.reject(new Error("Invalid command parameters"));
    }
    return ipcRenderer.invoke("adb:run-command", { deviceId, command });
  },
  runScrcpy: (deviceId: string, turnScreenOff: boolean) =>
    ipcRenderer.invoke("adb:run-scrcpy", { deviceId, turnScreenOff }),
  connectWifi: (deviceId: string, ip: string) =>
    ipcRenderer.invoke("adb:connect-wifi", { deviceId, ip }),
  connectIp: (ip: string) => ipcRenderer.invoke("adb:connect-ip", ip),
  pairDevice: (ipPort: string, code: string) =>
    ipcRenderer.invoke("adb:pair-device", { ipPort, code }),
  getLocalIp: () => ipcRenderer.invoke("adb:get-local-ip"),
  getPackages: (deviceId: string, filter: "all" | "system" | "third") =>
    ipcRenderer.invoke("adb:get-packages", { deviceId, filter }),
  manageApp: (
    deviceId: string,
    pkgName: string,
    action: "uninstall" | "disable" | "enable" | "clear" | "stop" | "restore",
  ) => {
    if (!/^[a-zA-Z0-9._-]+$/.test(pkgName)) {
      return Promise.reject(new Error("Invalid package name"));
    }
    if (
      !["uninstall", "disable", "enable", "clear", "stop", "restore"].includes(
        action,
      )
    ) {
      return Promise.reject(new Error("Invalid action"));
    }
    return ipcRenderer.invoke("adb:manage-app", { deviceId, pkgName, action });
  },
  extractApp: (deviceId: string, pkgName: string, destPath: string) => {
    if (!/^[a-zA-Z0-9._-]+$/.test(pkgName)) {
      return Promise.reject(new Error("Invalid package name"));
    }
    if (destPath.includes("..") || destPath.includes("\0")) {
      return Promise.reject(new Error("Invalid destination path"));
    }
    return ipcRenderer.invoke("adb:extract-app", {
      deviceId,
      pkgName,
      destPath,
    });
  },
  installApk: (deviceId: string, apkPath: string) =>
    ipcRenderer.invoke("adb:install-apk", { deviceId, apkPath }),
  openApkDialog: () => ipcRenderer.invoke("dialog:open-apk"),
  // File Manager
  listDirectory: (deviceId: string, remotePath: string) =>
    ipcRenderer.invoke("adb:list-directory", { deviceId, remotePath }),
  createDirectory: (deviceId: string, remotePath: string) =>
    ipcRenderer.invoke("adb:create-directory", { deviceId, remotePath }),
  deleteFile: (deviceId: string, remotePath: string) =>
    ipcRenderer.invoke("adb:delete-file", { deviceId, remotePath }),
  renameFile: (deviceId: string, oldPath: string, newPath: string) =>
    ipcRenderer.invoke("adb:rename-file", { deviceId, oldPath, newPath }),
  pushFile: (deviceId: string, localPath: string, remotePath: string) =>
    ipcRenderer.invoke("adb:push-file", { deviceId, localPath, remotePath }),
  pullFile: (deviceId: string, remotePath: string, localPath: string) =>
    ipcRenderer.invoke("adb:pull-file", { deviceId, remotePath, localPath }),
  getFileBase64: (deviceId: string, remotePath: string) =>
    ipcRenderer.invoke("adb:get-file-base64", { deviceId, remotePath }),
  getStoragePoints: (deviceId: string) =>
    ipcRenderer.invoke("adb:get-storage-points", { deviceId }),
  getBloatwareDb: (brand?: string) => ipcRenderer.invoke("adb:get-bloatware-db", brand),
  getBloatwareWithStatus: (deviceId: string, brand?: string) =>
    ipcRenderer.invoke("adb:get-bloatware-with-status", deviceId, brand),
  debloatPackage: (
    deviceId: string,
    pkg: string,
    action: string,
    preferDisable: boolean,
  ) =>
    ipcRenderer.invoke(
      "adb:debloat-package",
      deviceId,
      pkg,
      action,
      preferDisable,
    ),
  batchDebloat: (
    deviceId: string,
    packages: Array<{ package: string; preferDisable?: boolean }>,
    action: string,
  ) => ipcRenderer.invoke("adb:batch-debloat", deviceId, packages, action),
  onBatchProgress: (cb: (data: { done: number; total: number }) => void) => {
    const listener = (_e: any, data: { done: number; total: number }) =>
      cb(data);
    ipcRenderer.on("adb:batch-debloat-progress", listener);
    return () =>
      ipcRenderer.removeListener("adb:batch-debloat-progress", listener);
  },

  // Tweaks
  getTweaksList: () => ipcRenderer.invoke("adb:get-tweaks-list"),
  getTweaksStatus: (deviceId: string) =>
    ipcRenderer.invoke("adb:get-tweaks-status", deviceId),
  applyTweak: (deviceId: string, tweakId: string, enable: boolean) =>
    ipcRenderer.invoke("adb:apply-tweak", deviceId, tweakId, enable),
  fixAllNotifications: (deviceId: string) =>
    ipcRenderer.invoke("adb:fix-all-notifications", deviceId),
  onFixNotificationsProgress: (
    cb: (data: { current: number; total: number; pkgName: string }) => void,
  ) => {
    const listener = (
      _e: any,
      data: { current: number; total: number; pkgName: string },
    ) => cb(data);
    ipcRenderer.on("adb:fix-notifications-progress", listener);
    return () =>
      ipcRenderer.removeListener("adb:fix-notifications-progress", listener);
  },

  // Display & DPI
  getDpi: (deviceId: string) => ipcRenderer.invoke("adb:get-dpi", deviceId),
  getResolution: (deviceId: string) =>
    ipcRenderer.invoke("adb:get-resolution", deviceId),
  setDpi: (deviceId: string, dpi: number) => {
    // Validate DPI
    if (!Number.isInteger(dpi) || dpi < 160 || dpi > 640) {
      return Promise.reject(new Error("Invalid DPI value"));
    }
    return ipcRenderer.invoke("adb:set-dpi", deviceId, dpi);
  },
  resetDpi: (deviceId: string) => ipcRenderer.invoke("adb:reset-dpi", deviceId),
  setResolution: (deviceId: string, w: number, h: number) => {
    // Validate resolution
    if (!Number.isInteger(w) || !Number.isInteger(h)) {
      return Promise.reject(new Error("Resolution must be integers"));
    }
    if (w < 480 || w > 3840 || h < 800 || h > 3840) {
      return Promise.reject(new Error("Resolution out of valid range"));
    }
    return ipcRenderer.invoke("adb:set-resolution", deviceId, w, h);
  },
  resetResolution: (deviceId: string) =>
    ipcRenderer.invoke("adb:reset-resolution", deviceId),
  setAnimationScale: (deviceId: string, scale: 0 | 0.5 | 1.0) =>
    ipcRenderer.invoke("adb:set-animation-scale", deviceId, scale),
  saveFileDialog: (defaultName: string) =>
    ipcRenderer.invoke("dialog:save-file", { defaultName }),
  openFileDialog: () => ipcRenderer.invoke("dialog:open-file"),
  onLogStream: (callback: (log: string) => void) => {
    const listener = (_event: any, log: string) => callback(log);
    ipcRenderer.on("adb:log-stream", listener);
    return () => ipcRenderer.removeListener("adb:log-stream", listener);
  },

  // Device Profile & Capability Detection
  getDeviceProfile: (deviceId: string) =>
    ipcRenderer.invoke("adb:get-device-profile", deviceId),
  getInstalledPackages: (deviceId: string) =>
    ipcRenderer.invoke("adb:get-installed-packages", deviceId),
  readSettingsSnapshot: (
    deviceId: string,
    namespace: "system" | "secure" | "global",
  ) =>
    ipcRenderer.invoke("adb:read-settings-snapshot", { deviceId, namespace }),
  readDeviceConfigSnapshot: (deviceId: string) =>
    ipcRenderer.invoke("adb:read-device-config-snapshot", deviceId),

  // Xiaomi Experience Customizations
  getXiaomiCapabilities: (deviceId: string) =>
    ipcRenderer.invoke("xiaomi:get-experience-capabilities", deviceId),
  readXiaomiItem: (deviceId: string, itemId: string) =>
    ipcRenderer.invoke("xiaomi:read-experience-item", { deviceId, itemId }),
  applyXiaomiItem: (deviceId: string, itemId: string, enable: boolean) =>
    ipcRenderer.invoke("xiaomi:apply-experience-item", {
      deviceId,
      itemId,
      enable,
    }),
  rollbackXiaomiItem: (deviceId: string, itemId: string) =>
    ipcRenderer.invoke("xiaomi:rollback-experience-item", { deviceId, itemId }),

  // Advanced ADB
  getProps: (deviceId: string) =>
    ipcRenderer.invoke("advanced-adb:get-props", deviceId),
  getSettings: (deviceId: string, namespace: string) =>
    ipcRenderer.invoke("advanced-adb:get-settings", deviceId, namespace),
  getDumpsys: (deviceId: string, service: string) =>
    ipcRenderer.invoke("advanced-adb:get-dumpsys", deviceId, service),
  executePreset: (
    deviceId: string,
    commandId: string,
    params: Record<string, string | number>,
  ) =>
    ipcRenderer.invoke(
      "advanced-adb:execute-preset",
      deviceId,
      commandId,
      params,
    ),
  executeRawShell: (deviceId: string, command: string) =>
    ipcRenderer.invoke("advanced-adb:execute-raw", deviceId, command),

  // Store
  storeGet: (key: string) => ipcRenderer.invoke("store:get", key),
  storeSet: (key: string, val: any) =>
    ipcRenderer.invoke("store:set", key, val),
  storeDelete: (key: string) => ipcRenderer.invoke("store:delete", key),

  // App Version & Auto-update
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  checkForUpdates: () => ipcRenderer.invoke("app:check-for-updates"),
  downloadAndInstallUpdate: (downloadUrl: string) =>
    ipcRenderer.invoke("app:download-install-update", downloadUrl),
  onUpdateProgress: (cb: (progress: number) => void) => {
    const listener = (_e: any, progress: number) => cb(progress);
    ipcRenderer.on("app:update-progress", listener);
    return () => ipcRenderer.removeListener("app:update-progress", listener);
  },
  onUpdateAvailable: (cb: (info: any) => void) => {
    const listener = (_e: any, info: any) => cb(info);
    ipcRenderer.on("app:update-available", listener);
    return () => ipcRenderer.removeListener("app:update-available", listener);
  },

  // Quick Cleaner API
  cleanerScan: (deviceId: string) => ipcRenderer.invoke("cleaner:scan", deviceId),
  cleanerExecute: (deviceId: string, options: any, whitelist: string[]) =>
    ipcRenderer.invoke("cleaner:execute", { deviceId, options, whitelist }),
  onCleanerProgress: (cb: (data: any) => void) => {
    const listener = (_e: any, data: any) => cb(data);
    ipcRenderer.on("cleaner:progress", listener);
    return () => ipcRenderer.removeListener("cleaner:progress", listener);
  },
  getCleanerWhitelist: () => ipcRenderer.invoke("cleaner:get-whitelist"),
  saveCleanerWhitelist: (whitelist: string[]) =>
    ipcRenderer.invoke("cleaner:save-whitelist", whitelist),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error("Preload Error:", error);
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api;
}
