import { ElectronAPI } from "@electron-toolkit/preload";

export interface IADBAPI {
  initAdb: () => Promise<boolean>;
  fixConnection: () => Promise<any>;
  getDeviceInfo: (deviceId: string) => Promise<any>;
  getDevices: () => Promise<any[]>;
  getStorageStats: (deviceId: string) => Promise<{
    total: number;
    used: number;
    free: number;
    percentage: number;
  } | null>;
  onDeviceUpdate: (callback: (devices: any[]) => void) => void;
  runAdbCommand: (
    deviceId: string,
    command: string,
  ) => Promise<{ success: boolean; output: string }>;
  runScrcpy: (deviceId: string, turnScreenOff: boolean) => Promise<any>;
  connectWifi: (deviceId: string, ip: string) => Promise<any>;
  connectIp: (ip: string) => Promise<any>;
  pairDevice: (ipPort: string, code: string) => Promise<any>;
  getPackages: (
    deviceId: string,
    filter: "all" | "system" | "third",
  ) => Promise<any>;
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
  listDirectory: (deviceId: string, remotePath: string) => Promise<any>;
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
  getBloatwareDb: () => Promise<any>;
  getBloatwareWithStatus: (deviceId: string) => Promise<any>;
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
  getDpi: (deviceId: string) => Promise<any>;
  getResolution: (deviceId: string) => Promise<any>;
  setDpi: (deviceId: string, dpi: number) => Promise<any>;
  resetDpi: (deviceId: string) => Promise<any>;
  setResolution: (deviceId: string, w: number, h: number) => Promise<any>;
  resetResolution: (deviceId: string) => Promise<any>;
  setAnimationScale: (deviceId: string, scale: 0 | 0.5 | 1.0) => Promise<any>;
  saveFileDialog: (defaultName: string) => Promise<any>;
  openFileDialog: () => Promise<any>;
  onLogStream: (callback: (log: string) => void) => void;

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
  ) => Promise<{ success: boolean; output: string }>;
  rollbackXiaomiItem: (
    deviceId: string,
    itemId: string,
  ) => Promise<{ success: boolean; output: string }>;

  // Advanced ADB
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
  ) => Promise<{ success: boolean; output: string }>;
  executeRawShell: (
    deviceId: string,
    command: string,
  ) => Promise<{ success: boolean; output: string }>;

  // Store
  storeGet: (key: string) => Promise<any>;
  storeSet: (key: string, val: any) => Promise<void>;
  storeDelete: (key: string) => Promise<void>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: IADBAPI;
  }
}
