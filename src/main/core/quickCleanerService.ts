import { execAdb, execAdbDetailed, isAdbFailureOutput } from "./adbCore";
import { ScanResult, CleanOptions, CleanProgressData } from "../../shared/types";

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

export const TELEGRAM_SERIES_PACKAGES = [
  "org.telegram.messenger",
  "org.telegram.messenger.web",
  "tw.nekomimi.nekogram",
  "com.org.telegram.messenger",
  "org.telegram.BGraph",
  "org.telegram.plus",
  "com.iMe.android",
  "com.zing.zalo",
  "com.facebook.orca",
  "com.facebook.katana",
  "com.zhiliaoapp.musically",
  "com.ss.android.ugc.trill",
  "com.instagram.android",
];

async function executeRequired(deviceId: string, command: string): Promise<string> {
  const result = await execAdbDetailed(deviceId, command);
  if (!result.success || isAdbFailureOutput(result.output)) {
    throw new Error(result.output || `Lệnh thất bại: ${command}`);
  }
  return result.output;
}

async function getDataAvailableMb(deviceId: string): Promise<number> {
  const output = await execAdb(deviceId, "df -k /data");
  if (isAdbFailureOutput(output)) return 0;
  const line = output
    .split("\n")
    .map((value) => value.trim())
    .find((value) => value.endsWith(" /data") || value.includes(" /data "));
  if (!line) return 0;
  const parts = line.split(/\s+/);
  const availableKb = Number(parts[3]);
  return Number.isFinite(availableKb) ? Math.round(availableKb / 1024) : 0;
}

export async function getAndroidSdkVersion(deviceId: string): Promise<{ sdk: number; release: string }> {
  try {
    const sdkStr = await execAdb(deviceId, "getprop ro.build.version.sdk");
    const releaseStr = await execAdb(deviceId, "getprop ro.build.version.release");
    const sdk = parseInt(sdkStr.trim(), 10) || 30; // Default SDK 30 (Android 11)
    const release = releaseStr.trim() || "11";
    return { sdk, release };
  } catch {
    return { sdk: 30, release: "11" };
  }
}

export async function getRamInfo(deviceId: string): Promise<{
  memTotalMb: number;
  memFreeMb: number;
  memAvailableMb: number;
  usedPercentage: number;
}> {
  try {
    const meminfo = await execAdb(deviceId, "cat /proc/meminfo");
    let totalKb = 0;
    let freeKb = 0;
    let availKb = 0;

    const lines = meminfo.split("\n");
    for (const line of lines) {
      if (line.startsWith("MemTotal:")) {
        totalKb = parseInt(line.replace(/[^0-9]/g, ""), 10) || 0;
      } else if (line.startsWith("MemFree:")) {
        freeKb = parseInt(line.replace(/[^0-9]/g, ""), 10) || 0;
      } else if (line.startsWith("MemAvailable:")) {
        availKb = parseInt(line.replace(/[^0-9]/g, ""), 10) || 0;
      }
    }

    const memTotalMb = Math.round(totalKb / 1024);
    const memFreeMb = Math.round(freeKb / 1024);
    const memAvailableMb = Math.round((availKb || freeKb) / 1024);
    const usedMb = memTotalMb - memAvailableMb;
    const usedPercentage = memTotalMb > 0 ? Math.round((usedMb / memTotalMb) * 100) : 0;

    return { memTotalMb, memFreeMb, memAvailableMb, usedPercentage };
  } catch {
    return { memTotalMb: 0, memFreeMb: 0, memAvailableMb: 0, usedPercentage: 0 };
  }
}

export async function scanQuickCleaner(deviceId: string): Promise<ScanResult> {
  const { sdk, release } = await getAndroidSdkVersion(deviceId);
  const ramInfo = await getRamInfo(deviceId);

  // 1. Quét temp files & APK
  let tempFilesCount = 0;
  try {
    const tempOut = await execAdb(deviceId, "ls -1 /data/local/tmp");
    if (tempOut && !tempOut.includes("No such file")) {
      tempFilesCount = tempOut.split("\n").filter((f) => f.trim().length > 0).length;
    }
  } catch {
    tempFilesCount = 0;
  }

  const apkFiles: Array<{ name: string; path: string; sizeBytes: number }> = [];
  try {
    const lsApk = await execAdb(deviceId, "ls -l /sdcard/Download/*.apk");
    if (lsApk && !lsApk.includes("No such file") && !lsApk.includes("No match")) {
      const lines = lsApk.split("\n");
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const fileName = parts[parts.length - 1];
          if (fileName && fileName.endsWith(".apk")) {
            const size = parseInt(parts[4], 10) || 0;
            apkFiles.push({
              name: fileName.split("/").pop() || fileName,
              path: fileName.startsWith("/") ? fileName : `/sdcard/Download/${fileName}`,
              sizeBytes: size,
            });
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  // 2. Danh sách app đang chạy ngầm
  const runningApps: Array<{ packageName: string; isSystem: boolean }> = [];
  try {
    const psOut = await execAdb(deviceId, "ps -A");
    const packages3rdStr = await execAdb(deviceId, "pm list packages -3");
    const packages3rd = new Set(
      packages3rdStr
        .split("\n")
        .map((l) => l.replace("package:", "").trim())
        .filter(Boolean)
    );

    const detectedPkgs = new Set<string>();
    const psLines = psOut.split("\n");
    for (const line of psLines) {
      const parts = line.trim().split(/\s+/);
      const pkg = parts[parts.length - 1];
      if (pkg && pkg.includes(".") && !pkg.startsWith("/") && !pkg.startsWith("[")) {
        if (!detectedPkgs.has(pkg)) {
          detectedPkgs.add(pkg);
          runningApps.push({
            packageName: pkg,
            isSystem: !packages3rd.has(pkg),
          });
        }
      }
    }
  } catch {
    /* ignore */
  }

  // 3. Đếm số lượng package cài đặt
  let totalPackagesCount = 0;
  try {
    const packagesStr = await execAdb(deviceId, "pm list packages");
    totalPackagesCount = packagesStr.split("\n").filter((l) => l.includes("package:")).length;
  } catch {
    totalPackagesCount = 0;
  }

  return {
    sdkVersion: sdk,
    androidRelease: release,
    junk: {
      logcatSizeEst: "Không thể đo chính xác khi không có root",
      tempFilesCount,
      apkFiles,
    },
    cache: {
      totalPackagesCount,
      estimatedCacheMb: 0,
    },
    runningApps,
    ramInfo,
  };
}

export async function executeQuickCleaner(
  deviceId: string,
  options: CleanOptions,
  whitelist: string[],
  onProgress: (data: CleanProgressData) => void
): Promise<{
  freedRamMb: number;
  freedStorageMb: number;
  closedAppsCount: number;
  completedTasksCount: number;
  failedTasksCount: number;
}> {
  const initialRam = await getRamInfo(deviceId);
  const initialDataAvailableMb = await getDataAvailableMb(deviceId);
  const { sdk } = await getAndroidSdkVersion(deviceId);
  const userWhitelist = new Set([...DEFAULT_WHITELIST_PACKAGES, ...whitelist]);

  const tasks: Array<{ name: string; fn: () => Promise<{ log: string; storageFreed?: number; appsClosed?: number }> }> = [];

  // Tác vụ 1: Dọn dẹp Logcat buffer
  if (options.cleanLogcat) {
    tasks.push({
      name: "Xóa logcat buffer hệ thống",
      fn: async () => {
        const res = await executeRequired(deviceId, "logcat -c");
        return { log: `[Logcat] Xóa nhật ký đệm logcat thành công (${res.trim() || "OK"})` };
      },
    });
  }

  // Tác vụ 2: Xóa file tạm /data/local/tmp
  if (options.cleanTemp) {
    tasks.push({
      name: "Dọn dẹp thư mục file tạm (/data/local/tmp)",
      fn: async () => {
        const res = await executeRequired(deviceId, "rm -rf /data/local/tmp/*");
        return { log: `[Temp] Đã dọn dẹp thư mục tạm hệ thống (${res.trim() || "Cleaned"})` };
      },
    });
  }

  // Tác vụ 3: Xóa file APK cài đặt dư thừa
  if (options.cleanApk) {
    tasks.push({
      name: "Quét và xóa bộ cài APK rác trong /sdcard/Download/",
      fn: async () => {
        await executeRequired(deviceId, "rm -rf /sdcard/Download/*.apk");
        return { log: `[APK] Đã xóa file cài đặt .apk trong thư mục Download` };
      },
    });
  }

  // Tác vụ 4: Xóa Trim Caches tiêu chuẩn (Tương thích Android 11 -> 17)
  if (options.cleanTrimCaches) {
    tasks.push({
      name: `Giải phóng bộ nhớ tạm Trim Caches (Android SDK ${sdk})`,
      fn: async () => {
        let cmd = "pm trim-caches 1000G";
        if (sdk >= 35) {
          // Android 15+ hỗ trợ cmd package trim-caches
          cmd = "cmd package trim-caches 1000G";
        }
        const res = await executeRequired(deviceId, cmd);
        return { log: `[TrimCache] Thực thi trim-caches thành công: ${res.trim() || "Success"}` };
      },
    });
  }

  // Tác vụ 4.5: Dọn Cache Telegram, Nekogram & MXH
  if (options.cleanTelegramCache || options.cleanAppCache) {
    tasks.push({
      name: "Dọn dẹp bộ nhớ cache Telegram, Nekogram & MXH",
      fn: async () => {
        const installedRaw = await executeRequired(
          deviceId,
          "pm list packages -3",
        );
        const installed = new Set(
          installedRaw
            .split("\n")
            .map((line) => line.replace("package:", "").trim())
            .filter(Boolean),
        );
        let cleanedCount = 0;
        for (const pkg of TELEGRAM_SERIES_PACKAGES.filter((name) => installed.has(name))) {
          const cache = await execAdbDetailed(
            deviceId,
            `rm -rf /sdcard/Android/data/${pkg}/cache/*`,
          );
          const codeCache = await execAdbDetailed(
            deviceId,
            `rm -rf /sdcard/Android/data/${pkg}/code_cache/*`,
          );
          if (cache.success && codeCache.success) cleanedCount++;
        }
        return { log: `[SocialCache] Đã dọn dẹp bộ nhớ đệm Telegram, Nekogram & MXH (${cleanedCount} ứng dụng đã cài)` };
      },
    });
  }

  // Tác vụ 5: Đóng ứng dụng chạy ngầm (Fast App Killer Đa Tầng)
  let closedCount = 0;
  if (options.killApps) {
    tasks.push({
      name: "Triệt hạ toàn bộ ứng dụng ngầm (--user 0 force-stop)",
      fn: async () => {
        const packages3rdStr = await execAdb(deviceId, "pm list packages -3");
        const apps3rd = packages3rdStr
          .split("\n")
          .map((l) => l.replace("package:", "").trim())
          .filter((pkg) => pkg.length > 0 && !userWhitelist.has(pkg));

        for (const pkg of apps3rd) {
          const stopped = await execAdbDetailed(
            deviceId,
            `am force-stop --user 0 ${pkg}`,
          );
          if (stopped.success) {
            await execAdbDetailed(deviceId, `am kill --user 0 ${pkg}`);
            closedCount++;
          }
        }
        await execAdbDetailed(deviceId, "am kill-all");
        return { log: `[AppKiller] Đã gửi force-stop thành công cho ${closedCount} ứng dụng của User 0.`, appsClosed: closedCount };
      },
    });
  }

  // Tác vụ 6: Tăng tốc & Giải phóng RAM (RAM Booster & Compaction)
  if (options.boostRam) {
    tasks.push({
      name: "Tối ưu, thu hồi & Nén bộ nhớ RAM (ART Memory Compaction)",
      fn: async () => {
        const packages3rdStr = await execAdb(deviceId, "pm list packages -3");
        const apps3rd = packages3rdStr
          .split("\n")
          .map((l) => l.replace("package:", "").trim())
          .filter((pkg) => pkg.length > 0 && !userWhitelist.has(pkg));

        let successfulOps = 0;
        for (const pkg of apps3rd) {
          const trim = await execAdbDetailed(
            deviceId,
            `am send-trim-memory ${pkg} RUNNING_CRITICAL`,
          );
          if (trim.success) successfulOps++;
          const compact = await execAdbDetailed(
            deviceId,
            `am compact full ${pkg}`,
          );
          if (compact.success) successfulOps++;
        }
        const killAll = await execAdbDetailed(deviceId, "am kill-all");
        if (killAll.success) successfulOps++;
        if (successfulOps === 0) {
          throw new Error("Thiết bị không chấp nhận lệnh thu hồi bộ nhớ.");
        }
        return { log: `[RAMBooster] ${successfulOps} thao tác thu hồi bộ nhớ được hệ thống chấp nhận.` };
      },
    });
  }

  const totalSteps = tasks.length;
  let totalFreedStorageMb = 0;
  let completedTasksCount = 0;
  let failedTasksCount = 0;

  for (let i = 0; i < totalSteps; i++) {
    const task = tasks[i];
    const currentStep = i + 1;
    const percentage = Math.round((currentStep / totalSteps) * 100);

    onProgress({
      step: currentStep,
      totalSteps,
      message: task.name,
      percentage,
      logLine: `-> Đang thực hiện: ${task.name}...`,
    });

    try {
      const result = await task.fn();
      if (result.storageFreed) {
        totalFreedStorageMb += result.storageFreed;
      }
      completedTasksCount++;
      onProgress({
        step: currentStep,
        totalSteps,
        message: task.name,
        percentage,
        logLine: result.log,
      });
    } catch (err: any) {
      failedTasksCount++;
      onProgress({
        step: currentStep,
        totalSteps,
        message: task.name,
        percentage,
        logLine: `[LỖI] ${task.name}: ${err.message || "Bị qua mặt/Thất bại"}`,
      });
    }
  }

  // Đo đạc lại thông số RAM sau dọn dẹp
  await new Promise((r) => setTimeout(r, 1000));
  const finalRam = await getRamInfo(deviceId);
  const finalDataAvailableMb = await getDataAvailableMb(deviceId);
  const freedRamMb = Math.max(0, finalRam.memAvailableMb - initialRam.memAvailableMb);

  const summary = {
    freedRamMb,
    freedStorageMb:
      initialDataAvailableMb > 0 && finalDataAvailableMb > 0
        ? Math.max(0, finalDataAvailableMb - initialDataAvailableMb)
        : totalFreedStorageMb,
    closedAppsCount: closedCount,
    completedTasksCount,
    failedTasksCount,
  };

  onProgress({
    step: totalSteps,
    totalSteps,
    message:
      failedTasksCount === 0
        ? "Hoàn tất dọn dẹp!"
        : `Hoàn tất một phần (${failedTasksCount} tác vụ thất bại)`,
    percentage: 100,
    logLine: `=== HOÀN TẤT DỌN DẸP ===\n- Tác vụ thành công: ${summary.completedTasksCount}/${totalSteps}\n- Tác vụ thất bại: ${summary.failedTasksCount}\n- RAM giải phóng đo được: ${summary.freedRamMb} MB\n- Dung lượng dọn dẹp đo được: ${summary.freedStorageMb} MB\n- Ứng dụng đã đóng: ${summary.closedAppsCount}`,
    isComplete: true,
    summary,
  });

  return summary;
}
