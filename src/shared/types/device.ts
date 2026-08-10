export interface AdbDevice {
  id: string;
  type: "device" | "unauthorized" | "offline" | "bootloader" | "recovery";
  status: string;
  model?: string;
}

export interface DeviceInfo {
  model: string;
  brand: string;
  osVer: string;
  sdkVer: string;
  cpuAbi: string;
  ipAddr: string;
  bootloaderStatus: string;
  cryptoState: string;
  selinux: string;
  isRooted: boolean;
  resolution: string;
  uptimeStr: string;
  batteryLevel: number;
  batteryTemp: string;
  batteryTech: string;
  batteryVoltIn: string;
  batteryVoltOut: string;
  batteryDesignCap: number;
  batteryActualCap: number;
  batteryCurrentCap: number;
  batteryWearPercent: number;
  batteryHealthPercent: number;
  batteryIsCharging: boolean;
  ramTotal: number;
  ramFree: number;
  storageTotal: number;
  storageUsed: number;
  storagePercent: number;
  customOs: string;
  codename: string;
  board: string;
  cpuName: string;
  buildId: string;
  imei: string;
  serial?: string;
  wifiMac?: string;
  securityPatch?: string;
  kernelVer?: string;
  fingerprint?: string;
}

export interface StorageStats {
  total: number;
  used: number;
  free: number;
  percentage: number;
}

export interface StoragePoint {
  name: string;
  path: string;
  type: "internal" | "external";
  total: number;
  used: number;
  percent: number;
}

export interface AppInfo {
  pkg: string;
  type: "system" | "user";
  status: "enabled" | "disabled";
}

export interface FileInfo {
  name: string;
  size: number;
  mtime: Date;
  mode: number;
  isDir: boolean;
  isFile: boolean;
}

export interface AdbCommandResult {
  success: boolean;
  output: string;
}
