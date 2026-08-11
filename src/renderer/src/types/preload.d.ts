import type {
  XiaomiApplyResult,
  XiaomiRollbackResult,
  AdbDevice,
  DeviceInfo,
  StorageStats,
  AppInfo,
  FileInfo,
  AdbCommandResult,
} from "@shared/types";

export interface IADBAPI {
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  initAdb: () => Promise<boolean>;
  fixConnection: () => Promise<any>;
  getDeviceInfo: (deviceId: string) => Promise<DeviceInfo>;
  getDevices: () => Promise<AdbDevice[]>;
  fastbootReboot: (
    deviceId: string,
    target?: "bootloader" | "recovery" | "edl",
  ) => Promise<{ success: boolean; message: string }>;
  fastbootBypassFrp: (
    deviceId: string,
  ) => Promise<{ success: boolean; message: string }>;
  getStorageStats: (deviceId: string) => Promise<StorageStats | null>;
  onDeviceUpdate: (callback: (devices: AdbDevice[]) => void) => () => void;
  runAdbCommand: (
    deviceId: string,
    command: string,
  ) => Promise<AdbCommandResult>;
  runScrcpy: (deviceId: string, turnScreenOff: boolean) => Promise<any>;
  connectWifi: (deviceId: string, ip: string) => Promise<any>;
  connectIp: (ip: string) => Promise<any>;
  pairDevice: (ipPort: string, code: string) => Promise<any>;
  getLocalIp: () => Promise<string>;
  getPackages: (
    deviceId: string,
    filter: "all" | "system" | "third",
  ) => Promise<AppInfo[]>;
  manageApp: (
    deviceId: string,
    pkgName: string,
    action: "uninstall" | "disable" | "enable" | "clear" | "stop" | "restore",
  ) => Promise<any>;
  extractApp: (
    deviceId: string,
    pkgName: string,
    destPath: string,
  ) => Promise<any>;
  installApk: (deviceId: string, apkPath: string) => Promise<any>;
  openApkDialog: () => Promise<any>;
  listDirectory: (deviceId: string, remotePath: string) => Promise<FileInfo[]>;
  createDirectory: (deviceId: string, remotePath: string) => Promise<any>;
  deleteFile: (deviceId: string, remotePath: string) => Promise<any>;
  renameFile: (
    deviceId: string,
    oldPath: string,
    newPath: string,
  ) => Promise<any>;
  pushFile: (
    deviceId: string,
    localPath: string,
    remotePath: string,
  ) => Promise<any>;
  pullFile: (
    deviceId: string,
    remotePath: string,
    localPath: string,
  ) => Promise<any>;
  getFileBase64: (deviceId: string, remotePath: string) => Promise<any>;
  getStoragePoints: (deviceId: string) => Promise<any>;
  getBloatwareDb: (brand?: string) => Promise<any>;
  getBloatwareWithStatus: (deviceId: string, brand?: string) => Promise<any>;
  debloatPackage: (
    deviceId: string,
    pkg: string,
    action: string,
    preferDisable: boolean,
  ) => Promise<any>;
  batchDebloat: (
    deviceId: string,
    packages: Array<{ package: string; preferDisable?: boolean }>,
    action: string,
  ) => Promise<any>;
  onBatchProgress: (
    cb: (data: { done: number; total: number }) => void,
  ) => () => void;
  getTweaksList: () => Promise<any>;
  getTweaksStatus: (deviceId: string) => Promise<any>;
  applyTweak: (
    deviceId: string,
    tweakId: string,
    enable: boolean,
  ) => Promise<any>;
  fixAllNotifications: (
    deviceId: string,
  ) => Promise<{ success: boolean; count: number; message: string }>;
  restoreAllNotifications: (
    deviceId: string,
  ) => Promise<{ success: boolean; count: number; message: string }>;
  onFixNotificationsProgress: (
    cb: (data: { current: number; total: number; pkgName: string }) => void,
  ) => () => void;
  getDpi: (deviceId: string) => Promise<any>;
  getResolution: (deviceId: string) => Promise<any>;
  setDpi: (deviceId: string, dpi: number) => Promise<any>;
  resetDpi: (deviceId: string) => Promise<any>;
  setResolution: (deviceId: string, w: number, h: number) => Promise<any>;
  resetResolution: (deviceId: string) => Promise<any>;
  setAnimationScale: (deviceId: string, scale: 0 | 0.5 | 1.0) => Promise<any>;
  saveFileDialog: (defaultName: string) => Promise<any>;
  openFileDialog: () => Promise<any>;
  onLogStream: (callback: (log: string) => void) => () => void;

  // Device Profile & Capability Detection
  getDeviceProfile: (deviceId: string) => Promise<any>;
  getInstalledPackages: (deviceId: string) => Promise<string[]>;
  readSettingsSnapshot: (
    deviceId: string,
    namespace: "system" | "secure" | "global",
  ) => Promise<Record<string, string>>;
  readDeviceConfigSnapshot: (
    deviceId: string,
  ) => Promise<Record<string, Record<string, string>>>;

  // Xiaomi Experience Customizations
  getXiaomiCapabilities: (deviceId: string) => Promise<any[]>;
  readXiaomiItem: (deviceId: string, itemId: string) => Promise<string>;
  applyXiaomiItem: (
    deviceId: string,
    itemId: string,
    enable: boolean,
  ) => Promise<XiaomiApplyResult>;
  rollbackXiaomiItem: (
    deviceId: string,
    itemId: string,
  ) => Promise<XiaomiRollbackResult>;

  // Advanced ADB
  getAdvancedCommands: () => Promise<
    import("../features/advanced-adb/types").AdvancedCommandDefinition[]
  >;
  getProps: (
    deviceId: string,
  ) => Promise<Array<{ key: string; value: string }>>;
  getSettings: (
    deviceId: string,
    namespace: string,
  ) => Promise<Array<{ key: string; value: string }>>;
  getDumpsys: (deviceId: string, service: string) => Promise<string>;
  executePreset: (
    deviceId: string,
    commandId: string,
    params: Record<string, string | number>,
    action: "read" | "apply" | "rollback",
  ) => Promise<AdbCommandResult>;
  executeRawShell: (
    deviceId: string,
    command: string,
  ) => Promise<AdbCommandResult>;

  // Store
  storeGet: (key: string) => Promise<any>;
  storeSet: (key: string, val: any) => Promise<void>;
  storeDelete: (key: string) => Promise<void>;

  // App Version & Auto-update
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<{
    available: boolean;
    version: string;
    changelog: string;
    downloadUrl: string | null;
    expectedSize?: number;
  }>;
  downloadAndInstallUpdate: (
    downloadUrl: string,
    expectedSize?: number,
  ) => Promise<void>;
  onUpdateProgress: (cb: (progress: number) => void) => () => void;
  onUpdateAvailable: (
    cb: (info: {
      available: boolean;
      version: string;
      changelog: string;
      downloadUrl: string | null;
    }) => void,
  ) => () => void;

  // Quick Cleaner API
  cleanerScan: (deviceId: string) => Promise<any>;
  cleanerExecute: (
    deviceId: string,
    options: any,
    whitelist: string[],
  ) => Promise<any>;
  onCleanerProgress: (cb: (data: any) => void) => () => void;
  getCleanerWhitelist: () => Promise<string[]>;
  saveCleanerWhitelist: (whitelist: string[]) => Promise<boolean>;
}

declare global {
  interface Window {
    api: IADBAPI;
  }
}
