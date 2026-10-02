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
  openExternal: (url: string) => Promise<boolean>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  minimizeToTray: () => Promise<void>;
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
    timeoutMs?: number,
  ) => Promise<AdbCommandResult>;
  runScrcpy: (
    deviceId: string,
    turnScreenOff: boolean,
    borderless?: boolean,
    audio?: boolean,
  ) => Promise<any>;
  connectWifi: (deviceId: string, ip: string) => Promise<any>;
  connectIp: (ip: string) => Promise<any>;
  pairDevice: (ipPort: string, code: string) => Promise<any>;
  disconnectDevice: (
    deviceId: string,
  ) => Promise<{ success: boolean; message: string }>;
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
  deleteFiles: (
    deviceId: string,
    remotePaths: string[],
  ) => Promise<{ success: boolean; deletedCount: number; errors: string[] }>;
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
  scanNotificationApps: (
    deviceId: string,
  ) => Promise<
    Array<{
      packageName: string;
      name: string;
      category: "chat" | "banking" | "shopping" | "utility" | "other";
      isRecommended: boolean;
      dozeWhitelisted: boolean;
      standbyActive: boolean;
      postNotificationAllowed: boolean;
      appOps10008Allowed: boolean;
      appOps10053Allowed: boolean;
      backgroundAllowed: boolean;
      isFixed: boolean;
    }>
  >;
  fixSingleNotification: (
    deviceId: string,
    packageName: string,
  ) => Promise<{
    packageName: string;
    name: string;
    success: boolean;
    steps: {
      doze: boolean;
      standbyBucket: boolean;
      postNotification: boolean;
      appOps10008: boolean;
      appOps10053: boolean;
      backgroundOps: boolean;
    };
    message?: string;
  }>;
  fixBatchNotifications: (
    deviceId: string,
    targetPackages?: string[],
  ) => Promise<{
    success: boolean;
    count: number;
    total: number;
    results: Array<{
      packageName: string;
      name: string;
      success: boolean;
      steps: {
        doze: boolean;
        standbyBucket: boolean;
        postNotification: boolean;
        appOps10008: boolean;
        appOps10053: boolean;
        backgroundOps: boolean;
      };
      message?: string;
    }>;
    message: string;
  }>;
  restoreBatchNotifications: (
    deviceId: string,
    packageNames?: string[],
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

  // Fastboot ROM Flasher API
  openRomFolderDialog: () => Promise<string | null>;
  scanRomFolder: (folderPath: string) => Promise<{
    romPath: string;
    imagesDir: string;
    targetCodename?: string;
    targetCodenames?: string[];
    platformType?: "qualcomm" | "mediatek" | "tensor" | "universal";
    hasBootAlpha: boolean;
    hasBootFolkpatch: boolean;
    hasBootNonroot: boolean;
    hasBootStandard: boolean;
    hasInitBoot: boolean;
    hasSuper: boolean;
    hasFlashAllBat?: boolean;
    hasFlashAllExceptStorageBat?: boolean;
    hasFlashAllLockBat?: boolean;
    foundImages: Array<{
      name: string;
      partition: string;
      path: string;
      sizeBytes: number;
    }>;
    error?: string;
  }>;
  getFastbootDeviceInfo: (deviceId: string) => Promise<{
    product: string;
    board?: string;
    isUnlocked?: boolean;
    currentSlot?: string;
    hasSlots?: boolean;
    slotCount?: number;
    isUserspace?: boolean;
    maxDownloadSize?: string;
    error?: string;
  }>;
  flashFastbootRom: (options: {
    deviceId: string;
    romPath: string;
    rootOption: "none" | "alpha" | "folkpatch" | "custom";
    customBootPath?: string;
    wipeData: boolean;
    slotMode: "both" | "active" | "single";
    disableVerity: boolean;
    targetSlot?: "a" | "b";
    bypassCodenameCheck?: boolean;
    selectedPartitions?: string[];
    allowCriticalPartitions?: boolean;
    lockBootloader?: boolean;
  }) => Promise<{ success: boolean; message: string }>;
  cancelFastbootFlash: () => Promise<boolean>;
  onFastbootFlashProgress: (
    cb: (data: {
      step: number;
      totalSteps: number;
      currentPartition: string;
      message: string;
      percentage: number;
    }) => void,
  ) => () => void;
  onFastbootFlashLog: (cb: (log: string) => void) => () => void;
  selectWallpaper: () => Promise<{
    dataUrl: string;
    fileName: string;
  } | null>;
  getCustomWallpaper: () => Promise<string | null>;
  removeCustomWallpaper: () => Promise<boolean>;

  // Screen capture & recording
  takeScreenshot: (deviceId: string) => Promise<{
    success: boolean;
    filePath?: string;
    message?: string;
    error?: string;
  }>;
  startScreenRecord: (deviceId: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  stopScreenRecord: (deviceId: string) => Promise<{
    success: boolean;
    filePath?: string;
    message?: string;
    error?: string;
  }>;
  isScreenRecording: (deviceId: string) => Promise<boolean>;
  openCaptureFolder: (type: "screenshots" | "videos") => Promise<boolean>;

  // File drag & drop / selection utilities
  getPathForFile: (file: File) => string;
  openFilesDialog: () => Promise<string[]>;
}

declare global {
  interface Window {
    api: IADBAPI;
  }
}
