export interface ScanResult {
  sdkVersion: number;
  androidRelease: string;
  junk: {
    logcatSizeEst: string;
    tempFilesCount: number;
    apkFiles: Array<{ name: string; path: string; sizeBytes: number }>;
  };
  cache: {
    totalPackagesCount: number;
    estimatedCacheMb: number;
  };
  runningApps: Array<{
    packageName: string;
    appName?: string;
    isSystem: boolean;
  }>;
  ramInfo: {
    memTotalMb: number;
    memFreeMb: number;
    memAvailableMb: number;
    usedPercentage: number;
  };
}

export interface CleanOptions {
  cleanLogcat: boolean;
  cleanTemp: boolean;
  cleanApk: boolean;
  cleanTrimCaches: boolean;
  cleanAppCache: boolean;
  cleanTelegramCache: boolean;
  killApps: boolean;
  boostRam: boolean;
}

export interface CleanProgressData {
  step: number;
  totalSteps: number;
  message: string;
  percentage: number;
  logLine: string;
  isComplete?: boolean;
  summary?: {
    freedRamMb: number;
    freedStorageMb: number;
    closedAppsCount: number;
  };
}

export const DEFAULT_WHITELIST_PACKAGES = [
  "com.android.systemui",
  "com.android.phone",
  "com.android.providers.telephony",
  "com.android.dialer",
  "com.google.android.dialer",
  "com.miui.home",
  "com.sec.android.app.launcher",
  "com.google.android.apps.nexuslauncher",
  "com.oppo.launcher",
  "com.vivo.launcher",
  "com.zing.zalo",
  "com.facebook.orca",
  "org.telegram.messenger",
  "com.whatsapp",
  "com.viber.voip",
  "com.google.android.gms",
  "com.google.android.gsf",
];
