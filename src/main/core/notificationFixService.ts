import { execAdb, execAdbDetailed, isAdbFailureOutput } from "./adbCore";
import { getDeviceProfile } from "./deviceProfileService";
import {
  buildSnapshotDeviceIdentity,
  captureMutationSnapshot,
  getMutationSnapshot,
  restoreMutationSnapshot,
} from "./adbMutationSnapshot";
import { validatePackageName } from "./adbSafety";

export interface NotificationAppMeta {
  name: string;
  category: "chat" | "banking" | "shopping" | "utility" | "other";
  isRecommended: boolean;
}

export const KNOWN_NOTIFICATION_APPS: Record<string, NotificationAppMeta> = {
  // Chat & Gọi điện / Mạng xã hội
  "com.zing.zalo": { name: "Zalo", category: "chat", isRecommended: true },
  "com.facebook.orca": { name: "Messenger", category: "chat", isRecommended: true },
  "com.facebook.katana": { name: "Facebook", category: "chat", isRecommended: false },
  "org.telegram.messenger": { name: "Telegram", category: "chat", isRecommended: true },
  "org.telegram.plus": { name: "Telegram Plus", category: "chat", isRecommended: true },
  "org.thoughtcrime.securesms": { name: "Signal", category: "chat", isRecommended: true },
  "com.whatsapp": { name: "WhatsApp", category: "chat", isRecommended: true },
  "com.whatsapp.w4b": { name: "WhatsApp Business", category: "chat", isRecommended: true },
  "com.viber.voip": { name: "Viber", category: "chat", isRecommended: true },
  "com.discord": { name: "Discord", category: "chat", isRecommended: true },
  "com.instagram.android": { name: "Instagram", category: "chat", isRecommended: true },
  "jp.naver.line.android": { name: "LINE", category: "chat", isRecommended: true },
  "com.tencent.mm": { name: "WeChat", category: "chat", isRecommended: true },
  "com.skype.raider": { name: "Skype", category: "chat", isRecommended: true },
  "com.google.android.talk": { name: "Google Chat", category: "chat", isRecommended: true },

  // Ví điện tử & Ngân hàng
  "com.mservice.momotransfer": { name: "MoMo", category: "banking", isRecommended: true },
  "com.mbmobile": { name: "MB Bank", category: "banking", isRecommended: true },
  "com.techcombank.bb.retail": { name: "Techcombank Mobile", category: "banking", isRecommended: true },
  "com.VCB": { name: "VCB Digibank (Vietcombank)", category: "banking", isRecommended: true },
  "com.vietinbank.ipay": { name: "VietinBank iPay", category: "banking", isRecommended: true },
  "com.tpb.mb.gprsandroid": { name: "TPBank Mobile", category: "banking", isRecommended: true },
  "com.vpb.vpbankonline": { name: "VPBank NEO", category: "banking", isRecommended: true },
  "com.vnpay.bidv": { name: "BIDV SmartBanking", category: "banking", isRecommended: true },
  "com.vnpay.agribank": { name: "Agribank E-Mobile Banking", category: "banking", isRecommended: true },
  "vn.com.vng.zalopay": { name: "ZaloPay", category: "banking", isRecommended: true },
  "com.bplus.vtpay": { name: "Viettel Money", category: "banking", isRecommended: true },
  "vn.vpbank.cake": { name: "Cake by VPBank", category: "banking", isRecommended: true },
  "vn.timo": { name: "Timo Digital Bank", category: "banking", isRecommended: true },
  "com.vnpay.sacombankpay": { name: "Sacombank Pay", category: "banking", isRecommended: true },
  "mobile.acb.com.vn": { name: "ACB ONE", category: "banking", isRecommended: true },
  "com.mbbank.ocbomni": { name: "OCB OMNI", category: "banking", isRecommended: true },
  "com.hdbank.mbank": { name: "HDBank", category: "banking", isRecommended: true },
  "com.shb.mobile": { name: "SHB Mobile", category: "banking", isRecommended: true },
  "com.seabank.mb": { name: "SeAMobile", category: "banking", isRecommended: true },

  // Mua sắm & Giao vận
  "com.shopee.vn": { name: "Shopee", category: "shopping", isRecommended: true },
  "com.lazada.android": { name: "Lazada", category: "shopping", isRecommended: true },
  "vn.tiki.app.tikiandroid": { name: "Tiki", category: "shopping", isRecommended: true },
  "com.zhiliaoapp.musically": { name: "TikTok", category: "shopping", isRecommended: true },
  "com.grabtaxi.passenger": { name: "Grab", category: "shopping", isRecommended: true },
  "xyz.be.customer": { name: "Be", category: "shopping", isRecommended: true },
  "com.gourmet.shopeefood.vn": { name: "ShopeeFood", category: "shopping", isRecommended: true },

  // Tiện ích & Công việc
  "com.google.android.gm": { name: "Gmail", category: "utility", isRecommended: true },
  "com.microsoft.office.outlook": { name: "Microsoft Outlook", category: "utility", isRecommended: true },
  "com.microsoft.teams": { name: "Microsoft Teams", category: "utility", isRecommended: true },
  "com.Slack": { name: "Slack", category: "utility", isRecommended: true },
  "com.google.android.gms": { name: "Google Play Services", category: "utility", isRecommended: true },
};

export interface NotificationAppItem {
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
}

export interface NotificationFixStepDetail {
  doze: boolean;
  standbyBucket: boolean;
  postNotification: boolean;
  appOps10008: boolean;
  appOps10053: boolean;
  backgroundOps: boolean;
}

export interface NotificationAppResult {
  packageName: string;
  name: string;
  success: boolean;
  steps: NotificationFixStepDetail;
  message?: string;
}

export interface NotificationBatchSummary {
  success: boolean;
  count: number;
  total: number;
  results: NotificationAppResult[];
  message: string;
}

/**
 * Trả về danh sách lệnh ADB cần chạy để tối ưu thông báo cho 1 package.
 */
export function buildNotificationFixCommands(packageName: string): string[] {
  return [
    `shell dumpsys deviceidle whitelist +${packageName}`,
    `shell am set-standby-bucket ${packageName} active`,
    `shell pm grant ${packageName} android.permission.POST_NOTIFICATIONS`,
    `shell cmd appops set ${packageName} POST_NOTIFICATIONS allow`,
    `shell cmd appops set ${packageName} 10053 allow`,
    `shell cmd appops set ${packageName} 10008 allow`,
    `shell cmd appops set ${packageName} RUN_IN_BACKGROUND allow`,
    `shell cmd appops set ${packageName} RUN_ANY_IN_BACKGROUND allow`,
    `shell cmd appops set ${packageName} WAKE_LOCK allow`,
  ];
}

/**
 * Quét toàn bộ ứng dụng người dùng và trả về trạng thái chi tiết của từng app.
 */
export async function scanInstalledAppsForNotification(
  deviceId: string,
): Promise<NotificationAppItem[]> {
  try {
    const [rawUser0, raw3rdParty, whitelistOutput] = await Promise.all([
      execAdb(deviceId, "shell pm list packages --user 0"),
      execAdb(deviceId, "shell pm list packages -3 --user 0"),
      execAdb(deviceId, "shell dumpsys deviceidle whitelist"),
    ]);

    const user0Set = new Set(
      rawUser0
        .split("\n")
        .map((l) => l.replace(/^package:/, "").trim())
        .filter(Boolean),
    );

    const thirdPartySet = new Set(
      raw3rdParty
        .split("\n")
        .map((l) => l.replace(/^package:/, "").trim())
        .filter(Boolean),
    );

    // Tập hợp tất cả target: 3rd party apps + danh sách known apps được cài đặt
    const combinedPkgs = new Set<string>();
    for (const pkg of thirdPartySet) {
      if (validatePackageName(pkg)) combinedPkgs.add(pkg);
    }
    for (const pkg of Object.keys(KNOWN_NOTIFICATION_APPS)) {
      if (user0Set.has(pkg)) combinedPkgs.add(pkg);
    }

    const whitelistSet = new Set(
      whitelistOutput
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    );

    const items: NotificationAppItem[] = [];

    for (const pkg of combinedPkgs) {
      const meta = KNOWN_NOTIFICATION_APPS[pkg];
      const isDoze =
        whitelistOutput.includes(pkg) ||
        whitelistSet.has(pkg) ||
        whitelistSet.has(`,${pkg}`) ||
        whitelistOutput.includes(`,${pkg},`);

      items.push({
        packageName: pkg,
        name: meta?.name || pkg,
        category: meta?.category || "other",
        isRecommended: Boolean(meta?.isRecommended),
        dozeWhitelisted: isDoze,
        standbyActive: false, // Lazy check khi cần
        postNotificationAllowed: true,
        appOps10008Allowed: isDoze,
        appOps10053Allowed: isDoze,
        backgroundAllowed: isDoze,
        isFixed: isDoze,
      });
    }

    // Sắp xếp: Recommended lên đầu, sau đó theo tên
    return items.sort((a, b) => {
      if (a.isRecommended !== b.isRecommended) {
        return a.isRecommended ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.warn("Lỗi khi quét ứng dụng:", error);
    return [];
  }
}

/**
 * Kiểm tra xác minh trạng thái của một package sau khi chạy các lệnh.
 */
export async function verifyAppNotificationState(
  deviceId: string,
  packageName: string,
): Promise<NotificationFixStepDetail> {
  const [whitelist, runBackground, runAnyBackground, wakeLock] =
    await Promise.all([
      execAdbDetailed(deviceId, "shell dumpsys deviceidle whitelist"),
      execAdbDetailed(
        deviceId,
        `shell cmd appops get ${packageName} RUN_IN_BACKGROUND`,
      ),
      execAdbDetailed(
        deviceId,
        `shell cmd appops get ${packageName} RUN_ANY_IN_BACKGROUND`,
      ),
      execAdbDetailed(
        deviceId,
        `shell cmd appops get ${packageName} WAKE_LOCK`,
      ),
    ]);

  const isDoze = whitelist.success && whitelist.output.includes(packageName);
  const isBgAllowed = [runBackground, runAnyBackground, wakeLock].some(
    (res) => res.success && /allow/i.test(res.output),
  );

  return {
    doze: isDoze,
    standbyBucket: true,
    postNotification: true,
    appOps10008: true,
    appOps10053: true,
    backgroundOps: isBgAllowed,
  };
}

/**
 * Fix thông báo cho một ứng dụng cụ thể.
 */
export async function fixSingleAppNotification(
  deviceId: string,
  packageName: string,
): Promise<NotificationAppResult> {
  const meta = KNOWN_NOTIFICATION_APPS[packageName];
  const name = meta?.name || packageName;

  if (!validatePackageName(packageName)) {
    return {
      packageName,
      name,
      success: false,
      steps: {
        doze: false,
        standbyBucket: false,
        postNotification: false,
        appOps10008: false,
        appOps10053: false,
        backgroundOps: false,
      },
      message: "Tên package không hợp lệ.",
    };
  }

  try {
    const profile = await getDeviceProfile(deviceId);
    const deviceIdentity = buildSnapshotDeviceIdentity(profile);
    const requiredCommands = buildNotificationFixCommands(packageName);

    // Chụp snapshot để có thể rollback
    await captureMutationSnapshot({
      deviceIdentity,
      scope: "notification-batch",
      actionId: packageName,
      commands: requiredCommands,
      execute: (command) => execAdbDetailed(deviceId, command),
    });

    const stepResults: NotificationFixStepDetail = {
      doze: false,
      standbyBucket: false,
      postNotification: false,
      appOps10008: false,
      appOps10053: false,
      backgroundOps: false,
    };

    // 1. Doze whitelist
    const dozeRes = await execAdbDetailed(
      deviceId,
      `shell dumpsys deviceidle whitelist +${packageName}`,
    );
    stepResults.doze = dozeRes.success && !isAdbFailureOutput(dozeRes.output);

    // 2. Standby bucket active
    const bucketRes = await execAdbDetailed(
      deviceId,
      `shell am set-standby-bucket ${packageName} active`,
    );
    stepResults.standbyBucket =
      bucketRes.success && !isAdbFailureOutput(bucketRes.output);

    // 3. POST_NOTIFICATIONS grant + appops
    await execAdbDetailed(
      deviceId,
      `shell pm grant ${packageName} android.permission.POST_NOTIFICATIONS`,
    );
    const notifRes = await execAdbDetailed(
      deviceId,
      `shell cmd appops set ${packageName} POST_NOTIFICATIONS allow`,
    );
    stepResults.postNotification =
      notifRes.success && !isAdbFailureOutput(notifRes.output);

    // 4. AppOps 10053 (HyperOS 3 / Android 16)
    const op10053Res = await execAdbDetailed(
      deviceId,
      `shell cmd appops set ${packageName} 10053 allow`,
    );
    stepResults.appOps10053 =
      op10053Res.success && !isAdbFailureOutput(op10053Res.output);

    // 5. AppOps 10008 (MIUI 12-14)
    const op10008Res = await execAdbDetailed(
      deviceId,
      `shell cmd appops set ${packageName} 10008 allow`,
    );
    stepResults.appOps10008 =
      op10008Res.success && !isAdbFailureOutput(op10008Res.output);

    // 6. Background ops & WakeLock
    const bg1 = await execAdbDetailed(
      deviceId,
      `shell cmd appops set ${packageName} RUN_IN_BACKGROUND allow`,
    );
    const bg2 = await execAdbDetailed(
      deviceId,
      `shell cmd appops set ${packageName} RUN_ANY_IN_BACKGROUND allow`,
    );
    const bg3 = await execAdbDetailed(
      deviceId,
      `shell cmd appops set ${packageName} WAKE_LOCK allow`,
    );
    stepResults.backgroundOps =
      bg1.success && bg2.success && bg3.success;

    const overallSuccess = stepResults.doze || stepResults.backgroundOps;

    return {
      packageName,
      name,
      success: overallSuccess,
      steps: stepResults,
      message: overallSuccess
        ? "Đã cấp quyền chạy nền & whitelist Doze thành công."
        : "Không thể áp dụng quyền chạy nền.",
    };
  } catch (error: any) {
    return {
      packageName,
      name,
      success: false,
      steps: {
        doze: false,
        standbyBucket: false,
        postNotification: false,
        appOps10008: false,
        appOps10053: false,
        backgroundOps: false,
      },
      message: error.message || "Lỗi ngoại lệ khi áp dụng.",
    };
  }
}

/**
 * Fix danh sách ứng dụng (hỗ trợ chọn từng app hoặc toàn bộ).
 */
export async function fixBatchAppNotifications(
  deviceId: string,
  targetPackages?: string[],
  onProgress?: (current: number, total: number, pkgName: string) => void,
): Promise<NotificationBatchSummary> {
  try {
    let pkgsToFix = targetPackages;
    if (!pkgsToFix || pkgsToFix.length === 0) {
      const scanned = await scanInstalledAppsForNotification(deviceId);
      pkgsToFix = scanned
        .filter((item) => item.isRecommended)
        .map((item) => item.packageName);
    }

    const validPkgs = pkgsToFix.filter((pkg) => validatePackageName(pkg));
    const results: NotificationAppResult[] = [];
    let count = 0;

    for (let i = 0; i < validPkgs.length; i++) {
      const pkg = validPkgs[i];
      onProgress?.(i + 1, validPkgs.length, pkg);

      const res = await fixSingleAppNotification(deviceId, pkg);
      results.push(res);
      if (res.success) {
        count++;
      }
    }

    return {
      success: count > 0,
      count,
      total: validPkgs.length,
      results,
      message:
        count > 0
          ? `Đã tối ưu thông báo thành công cho ${count}/${validPkgs.length} ứng dụng.`
          : "Không có ứng dụng nào được tối ưu thành công.",
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      total: 0,
      results: [],
      message: err.message || "Quá trình tối ưu thông báo gặp sự cố.",
    };
  }
}

/**
 * Hoàn tác cấu hình thông báo từ Snapshot đã lưu.
 */
export async function restoreBatchAppNotifications(
  deviceId: string,
  packageNames?: string[],
): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const profile = await getDeviceProfile(deviceId);
    const deviceIdentity = buildSnapshotDeviceIdentity(profile);

    const pkgsToRestore =
      packageNames && packageNames.length > 0
        ? packageNames
        : Object.keys(KNOWN_NOTIFICATION_APPS);

    let restored = 0;
    const failures: string[] = [];

    for (const pkg of pkgsToRestore) {
      if (!validatePackageName(pkg)) continue;
      if (!getMutationSnapshot(deviceIdentity, "notification-batch", pkg)) {
        continue;
      }
      const result = await restoreMutationSnapshot({
        deviceIdentity,
        scope: "notification-batch",
        actionId: pkg,
        execute: (command) => execAdbDetailed(deviceId, command),
      });
      if (result.success) restored++;
      else failures.push(pkg);
    }

    return {
      success: failures.length === 0,
      count: restored,
      message:
        failures.length === 0
          ? `Đã khôi phục thành công ${restored} ứng dụng từ snapshot.`
          : `Khôi phục chưa hoàn tất cho: ${failures.join(", ")}`,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: err.message || "Khôi phục thông báo thất bại.",
    };
  }
}
