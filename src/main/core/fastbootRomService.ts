import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import util from "util";
import { currentAdbExe } from "./adbCore";

const execPromise = util.promisify(exec);

export const DEVICE_ALIASES: Record<string, string[]> = {
  lisa: ["lisa", "lisa_global", "lisa_in", "lisa_eea", "lisa_ru"],
  sweet: ["sweet", "sweetin", "sweet_global", "sweet_eea", "sweet_in"],
  alioth: ["alioth", "aliothin", "alioth_global", "alioth_eea", "alioth_in"],
  munch: ["munch", "munch_in", "munch_global", "munch_eea"],
  marble: ["marble", "marblein", "marble_global", "marble_eea"],
  garnet: ["garnet", "garnet_in", "garnet_global", "garnet_eea"],
  mondrian: ["mondrian", "mondrian_global"],
  socrates: ["socrates", "socrates_global"],
  duchamp: ["duchamp", "duchamp_global", "duchamp_in"],
  manet: ["manet", "manet_global"],
  peridot: ["peridot", "peridot_global", "peridot_in"],
  houji: ["houji", "houji_global", "houji_eea"],
  shennong: ["shennong", "shennong_global"],
  aurora: ["aurora", "aurora_global"],
  cmi: ["cmi", "umi", "cmi_global", "umi_global"],
  umi: ["umi", "cmi", "umi_global", "cmi_global"],
  apollo: ["apollo", "apollopro", "apollo_global", "apollo_eea"],
  vayu: ["vayu", "bhima", "vayu_global", "vayu_eea", "bhima_in"],
  bhima: ["bhima", "vayu", "bhima_in", "vayu_global"],
  surya: ["surya", "karna", "surya_global", "surya_eea", "karna_in"],
  karna: ["karna", "surya", "karna_in", "surya_global"],
  veux: ["veux", "peux", "veux_global", "veux_eea", "peux_in"],
  pipa: ["pipa", "liuqin", "pipa_global"],
  liuqin: ["liuqin", "pipa", "liuqin_global"],
  diting: ["diting", "mayfly", "diting_global"],
  mayfly: ["mayfly", "diting", "mayfly_global"],
  plato: ["plato", "plato_global", "plato_eea"],
  ingres: ["ingres", "ingres_global", "ingres_eea"],
  corot: ["corot", "corot_global", "corot_eea"],
  aristotle: ["aristotle", "aristotle_global", "aristotle_eea"],
  nuwa: ["nuwa", "nuwa_global", "nuwa_eea"],
  fuxi: ["fuxi", "fuxi_global", "fuxi_eea"],
  ishtar: ["ishtar", "ishtar_global", "ishtar_eea"],
  spes: ["spes", "spesn", "spes_global", "spesn_global"],
  spesn: ["spesn", "spes", "spesn_global", "spes_global"],
  topaz: ["topaz", "tapas", "topaz_global", "tapas_global"],
  tapas: ["tapas", "topaz", "tapas_global", "topaz_global"],
  sunstone: ["sunstone", "sunstone_global", "sunstone_in"],
  sea: ["sea", "ocean", "sea_global"],
  ocean: ["ocean", "sea", "ocean_global"],
  cupid: ["cupid", "cupid_global", "cupid_eea"],
  zeus: ["zeus", "zeus_global", "zeus_eea"],
  thor: ["thor", "thor_global"],
  loki: ["loki", "loki_global"],
  toco: ["toco", "toco_global"],
  davinci: ["davinci", "davinciin", "davinci_global"],
  raphael: ["raphael", "raphaelin", "raphael_global"],
};

export interface RomScanResult {
  romPath: string;
  imagesDir: string;
  targetCodename?: string;
  targetCodenames: string[];
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
    isCritical?: boolean;
    isProtected?: boolean;
  }>;
}

export interface FlashRomOptions {
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
}

export interface FlashProgressEvent {
  step: number;
  totalSteps: number;
  currentPartition: string;
  message: string;
  percentage: number;
}

export interface FastbootDeviceInfo {
  product: string;
  board?: string;
  isUnlocked?: boolean;
  currentSlot?: string;
  hasSlots?: boolean;
  slotCount?: number;
  isUserspace?: boolean;
  maxDownloadSize?: string;
  error?: string;
}

function getFastbootExe(): string {
  const fastbootExe = path.join(
    path.dirname(currentAdbExe),
    process.platform === "win32" ? "fastboot.exe" : "fastboot"
  );
  if (!fs.existsSync(fastbootExe)) {
    throw new Error("Không tìm thấy tệp thực thi fastboot");
  }
  return fastbootExe;
}

/**
 * Kiểm tra xem codename của thiết bị có khớp với danh sách codename của ROM không (hỗ trợ alias/prefix/suffix).
 */
export function isCodenameMatch(deviceProduct: string, romCodenames: string[]): boolean {
  if (!deviceProduct || deviceProduct === "unknown" || romCodenames.length === 0) {
    return true;
  }
  const cleanDev = deviceProduct.trim().toLowerCase().replace(/[\r\n]/g, "");

  for (const rc of romCodenames) {
    const cleanRom = rc.trim().toLowerCase().replace(/[\r\n]/g, "");
    if (!cleanRom) continue;
    if (cleanDev === cleanRom) return true;

    // So khớp prefix/suffix (ví dụ: lisa khớp với lisa_global, lisa_in, lisa_eea)
    if (cleanDev.startsWith(cleanRom) || cleanRom.startsWith(cleanDev)) return true;

    // So khớp qua bảng ánh xạ Alias
    const devAliases = DEVICE_ALIASES[cleanDev] || [cleanDev];
    const romAliases = DEVICE_ALIASES[cleanRom] || [cleanRom];
    const hasAliasMatch = devAliases.some(
      (da) =>
        romAliases.includes(da) ||
        da.startsWith(cleanRom) ||
        cleanRom.startsWith(da) ||
        devAliases.some((x) => cleanRom.startsWith(x) || x.startsWith(cleanRom))
    );
    if (hasAliasMatch) return true;
  }

  return false;
}

/**
 * Quét thư mục ROM để tự động phát hiện các file .img và thông tin cấu hình ROM đa nền tảng.
 */
export async function scanRomFolder(folderPath: string): Promise<RomScanResult> {
  if (!fs.existsSync(folderPath)) {
    throw new Error("Thư mục ROM không tồn tại");
  }

  let imagesDir = folderPath;
  const subImages = path.join(folderPath, "images");
  if (fs.existsSync(subImages) && fs.statSync(subImages).isDirectory()) {
    imagesDir = subImages;
  }

  const files = fs.readdirSync(imagesDir);
  const imgFiles = files.filter((f) => f.endsWith(".img"));

  const detectedCodenames = new Set<string>();

  // 1. Quét từ tất cả các script .bat, .cmd, .sh trong folder ROM
  const rootFiles = fs.readdirSync(folderPath);
  const scriptFiles = rootFiles.filter((f) => /\.(bat|cmd|sh|txt|prop)$/i.test(f));

  for (const sFile of scriptFiles) {
    const sPath = path.join(folderPath, sFile);
    try {
      const content = fs.readFileSync(sPath, "utf-8");

      // Regex 1: product:\s*([a-zA-Z0-9_-]+)
      const pMatches = content.matchAll(/product:\s*([a-zA-Z0-9_-]+)/gi);
      for (const m of pMatches) {
        if (m[1] && m[1].length > 1 && !/^(error|unknown|getvar)$/i.test(m[1])) {
          detectedCodenames.add(m[1].toLowerCase());
        }
      }

      // Regex 2: require product=([a-zA-Z0-9_,-]+)
      const reqMatches = content.matchAll(/require\s+product=([a-zA-Z0-9_,-]+)/gi);
      for (const m of reqMatches) {
        if (m[1]) {
          m[1].split(",").forEach((item) => {
            const trimmed = item.trim().toLowerCase();
            if (trimmed.length > 1) detectedCodenames.add(trimmed);
          });
        }
      }

      // Regex 3: findstr.*product:\s*\*([a-zA-Z0-9_-]+)
      const findstrMatches = content.matchAll(/findstr.*product:\s*\*([a-zA-Z0-9_-]+)/gi);
      for (const m of findstrMatches) {
        if (m[1] && m[1].length > 1) detectedCodenames.add(m[1].toLowerCase());
      }

      // Regex 4: ro.(product|build).(device|product|name)=([a-zA-Z0-9_-]+)
      const propMatches = content.matchAll(/ro\.(?:product|build)\.(?:device|product|name)=([a-zA-Z0-9_-]+)/gi);
      for (const m of propMatches) {
        if (m[1] && m[1].length > 1) detectedCodenames.add(m[1].toLowerCase());
      }
    } catch {
      // Bỏ qua lỗi đọc file
    }
  }

  const targetCodenames = Array.from(detectedCodenames);
  const targetCodename = targetCodenames.length > 0 ? targetCodenames[0] : undefined;

  // Danh mục phân vùng Critical (Bootloader & Firmware) đa nền tảng
  const CRITICAL_PARTITIONS = new Set([
    // Qualcomm
    "xbl",
    "xbl_config",
    "abl",
    "tz",
    "hyp",
    "keymaster",
    "uefisecapp",
    "devcfg",
    "cpucp",
    "aop",
    "featenabler",
    "qupfw",
    "shrm",
    "dsp",
    "bluetooth",
    "modem",
    // MediaTek (MTK)
    "preloader",
    "lk",
    "tee",
    "scp",
    "sspm",
    "gz",
    "md1img",
    "cam_vpu",
    "dpm",
    "mcupm",
    "pi_img",
    "spmfw",
    "vboot",
    // Google Tensor
    "bootloader",
    "pbl",
    "bl31",
    "ldfw",
    "gsa",
    "tzsw",
    // Samsung / UniSoc
    "sboot",
    "param",
    "up_param",
    "cm",
    "keystorage",
    "spl",
    "sml",
    "tos",
    "fboot",
  ]);

  // Danh mục phân vùng Protected (Bảo vệ tuyệt đối để không mất IMEI / Calibration)
  const PROTECTED_PARTITIONS = new Set([
    "persist",
    "keystore",
    "fsg",
    "modemst1",
    "modemst2",
    "sec",
    "nvram",
    "nvdata",
    "nvcfg",
    "protect_f",
    "protect_s",
    "proinfo",
    "efs",
    "sec_efs",
    "devinfo",
  ]);

  // Tự động phát hiện Platform Type (Qualcomm / MediaTek / Tensor)
  let platformType: "qualcomm" | "mediatek" | "tensor" | "universal" = "universal";
  if (imgFiles.some((f) => /^(xbl|abl|tz|hyp)/i.test(f))) {
    platformType = "qualcomm";
  } else if (imgFiles.some((f) => /^(preloader|lk|md1img|scp)/i.test(f))) {
    platformType = "mediatek";
  } else if (imgFiles.some((f) => /^(gsa|bl31|ldfw)/i.test(f))) {
    platformType = "tensor";
  }

  const hasBootAlpha = imgFiles.includes("boot_alpha.img");
  const hasBootFolkpatch = imgFiles.includes("boot_folkpatch.img");
  const hasBootNonroot = imgFiles.includes("boot_nonroot.img");
  const hasBootStandard = imgFiles.includes("boot.img");
  const hasInitBoot = imgFiles.includes("init_boot.img");
  const hasSuper = imgFiles.includes("super.img");

  const foundImages = imgFiles.map((filename) => {
    const filePath = path.join(imagesDir, filename);
    const stat = fs.statSync(filePath);
    const partitionName = filename.replace(/\.img$/i, "");
    const basePName = partitionName.replace(/_[ab]$/i, "").toLowerCase();

    return {
      name: filename,
      partition: partitionName,
      path: filePath,
      sizeBytes: stat.size,
      isCritical: CRITICAL_PARTITIONS.has(basePName),
      isProtected: PROTECTED_PARTITIONS.has(basePName),
    };
  });

  const hasFlashAllBat =
    fs.existsSync(path.join(folderPath, "flash_all.bat")) ||
    fs.existsSync(path.join(folderPath, "flash_all.sh")) ||
    fs.existsSync(path.join(folderPath, "fastboot_flash.bat"));
  const hasFlashAllExceptStorageBat =
    fs.existsSync(path.join(folderPath, "flash_all_except_data_storage.bat")) ||
    fs.existsSync(path.join(folderPath, "flash_all_except_data_storage.sh")) ||
    fs.existsSync(path.join(folderPath, "flash_all_except_storage.bat")) ||
    fs.existsSync(path.join(folderPath, "flash_all_except_storage.sh"));
  const hasFlashAllLockBat =
    fs.existsSync(path.join(folderPath, "flash_all_lock.bat")) ||
    fs.existsSync(path.join(folderPath, "flash_all_lock.sh"));

  return {
    romPath: folderPath,
    imagesDir,
    targetCodename,
    targetCodenames,
    platformType,
    hasBootAlpha,
    hasBootFolkpatch,
    hasBootNonroot,
    hasBootStandard,
    hasInitBoot,
    hasSuper,
    hasFlashAllBat,
    hasFlashAllExceptStorageBat,
    hasFlashAllLockBat,
    foundImages,
  };
}

/**
 * Lấy codename và thông tin slot của thiết bị Fastboot (kèm fallback thông minh qua ADB).
 */
export async function getFastbootDeviceInfo(deviceId: string): Promise<FastbootDeviceInfo> {
  const fastbootExe = getFastbootExe();
  const adbExe = currentAdbExe;

  // 1. Thử đọc thông tin qua Fastboot getvar all (với timeout 2500ms chống treo)
  try {
    const { stdout, stderr } = await execPromise(
      `"${fastbootExe}" -s ${deviceId} getvar all`,
      { timeout: 2500 }
    );
    const output = `${stdout}\n${stderr}`;

    const productMatch = output.match(/product:\s*([^\s\r\n]+)/i);
    const boardMatch = output.match(/board:\s*([^\s\r\n]+)/i);
    const slotMatch = output.match(/current-slot:\s*([^\s\r\n]+)/i);
    const hasSlotMatch = output.match(/has-slot:boot:\s*([^\s\r\n]+)/i);
    const slotCountMatch = output.match(/slot-count:\s*([0-9]+)/i);
    const unlockedMatch = output.match(/unlocked:\s*([^\s\r\n]+)/i);
    const userspaceMatch = output.match(/is-userspace:\s*([^\s\r\n]+)/i);
    const maxDownloadMatch = output.match(/max-download-size:\s*([^\s\r\n]+)/i);

    const isUnlocked = unlockedMatch ? unlockedMatch[1].toLowerCase() === "yes" : undefined;
    const hasSlots = hasSlotMatch
      ? hasSlotMatch[1].toLowerCase() === "yes"
      : slotCountMatch
      ? parseInt(slotCountMatch[1], 10) > 1
      : undefined;

    const prod = productMatch ? productMatch[1] : boardMatch ? boardMatch[1] : undefined;
    if (prod && prod.toLowerCase() !== "unknown") {
      return {
        product: prod,
        board: boardMatch ? boardMatch[1] : undefined,
        isUnlocked,
        currentSlot: slotMatch ? slotMatch[1] : undefined,
        hasSlots,
        slotCount: slotCountMatch ? parseInt(slotCountMatch[1], 10) : undefined,
        isUserspace: userspaceMatch ? userspaceMatch[1].toLowerCase() === "yes" : undefined,
        maxDownloadSize: maxDownloadMatch ? maxDownloadMatch[1] : undefined,
      };
    }
  } catch {
    // Fastboot getvar all không phản hồi
  }

  // 2. Thử chạy fastboot getvar product đơn lẻ (timeout 2000ms)
  try {
    const { stdout: pOut, stderr: pErr } = await execPromise(
      `"${fastbootExe}" -s ${deviceId} getvar product`,
      { timeout: 2000 }
    );
    const pCombined = `${pOut}\n${pErr}`;
    const pMatch = pCombined.match(/product:\s*([^\s\r\n]+)/i);
    if (pMatch && pMatch[1] && pMatch[1].toLowerCase() !== "unknown") {
      return { product: pMatch[1] };
    }
  } catch {
    // Tiếp tục fallback sang ADB
  }

  // 3. Fallback sang ADB (khi thiết bị đang ở hệ điều hành Android bình thường)
  try {
    const { stdout: adbOut } = await execPromise(
      `"${adbExe}" -s ${deviceId} shell "getprop ro.product.device; getprop ro.product.board; getprop ro.boot.slot_suffix; getprop ro.boot.flash.locked"`,
      { timeout: 2500 }
    );
    const lines = adbOut.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const adbDevice = lines[0];
    const adbBoard = lines[1];
    const slotSuffix = lines[2]; // "_a", "_b" hoặc rỗng
    const flashLocked = lines[3]; // "1" (locked), "0" (unlocked)

    if (adbDevice && adbDevice.length > 0 && !adbDevice.includes("error")) {
      return {
        product: adbDevice,
        board: adbBoard && adbBoard !== adbDevice ? adbBoard : undefined,
        currentSlot: slotSuffix ? slotSuffix.replace(/^_/, "") : undefined,
        hasSlots: Boolean(slotSuffix && slotSuffix !== ""),
        isUnlocked: flashLocked === "0" ? true : flashLocked === "1" ? false : undefined,
      };
    }
  } catch {
    // Thiết bị không phản hồi ADB
  }

  return { product: "unknown" };
}

/**
 * Thực thi nạp ROM Fastboot với tiến trình và phát log thời gian thực.
 */
export async function flashFastbootRom(
  options: FlashRomOptions,
  onProgress: (event: FlashProgressEvent) => void,
  onLog: (log: string) => void,
  checkCancelled: () => boolean
): Promise<{ success: boolean; message: string }> {
  const fastbootExe = getFastbootExe();
  const {
    deviceId,
    romPath,
    rootOption,
    customBootPath,
    wipeData,
    slotMode,
    disableVerity,
    targetSlot = "a",
    bypassCodenameCheck,
    selectedPartitions,
    allowCriticalPartitions = true,
    lockBootloader = false,
  } = options;

  onLog(`[FASTBOOT ROM] Bắt đầu kiểm tra cấu hình ROM tại: ${romPath}`);

  // 1. Quét thông tin ROM
  const scan = await scanRomFolder(romPath);
  if (scan.foundImages.length === 0) {
    throw new Error("Không tìm thấy file .img nào trong thư mục ROM!");
  }

  // 2. Kiểm tra kết nối và codename thiết bị (Lớp bảo vệ Anti-Brick #1)
  onLog(`[FASTBOOT ROM] Đang kiểm tra thiết bị ${deviceId}...`);
  const devInfo = await getFastbootDeviceInfo(deviceId);
  onLog(`[FASTBOOT ROM] Thiết bị nhận diện: Product = [${devInfo.product}], Board = [${devInfo.board || "N/A"}], Slots = [${devInfo.hasSlots ? "A/B" : "Single"}], Unlocked = [${devInfo.isUnlocked !== undefined ? (devInfo.isUnlocked ? "YES" : "NO") : "N/A"}]`);

  const romList = scan.targetCodenames.length > 0 ? scan.targetCodenames : (scan.targetCodename ? [scan.targetCodename] : []);
  if (
    romList.length > 0 &&
    !bypassCodenameCheck &&
    devInfo.product !== "unknown" &&
    !isCodenameMatch(devInfo.product, romList)
  ) {
    throw new Error(
      `[ANTI-BRICK SAFEGUARD] Mã thiết bị không khớp! ROM tương thích [${romList.join(", ")}] nhưng thiết bị đang nối là [${devInfo.product}]. Đã chặn nạp tự động để tránh brick máy. (Bật 'Bypass Codename' nếu bạn chắc chắn muốn ép nạp).`
    );
  }

  if (devInfo.isUnlocked === false) {
    onLog("[FASTBOOT WARNING] ⚠️ CẢNH BÁO: Bootloader thiết bị đang ở trạng thái KHÓA (LOCKED). Fastboot có thể từ chối ghi dữ liệu!");
  }

  // Tự động thích ứng nếu thiết bị là Single Slot mà người dùng chọn Both
  const effectiveSlotMode = (devInfo.hasSlots === false || devInfo.slotCount === 1) ? "single" : slotMode;
  if (effectiveSlotMode !== slotMode) {
    onLog("[FASTBOOT ROM] Thiết bị chỉ có 1 Slot (Single Slot). Tự động chuyển sang chế độ nạp trực tiếp phân vùng.");
  }

  // Set các phân vùng người dùng chọn nạp (nếu chọn)
  const selectedSet = selectedPartitions && selectedPartitions.length > 0
    ? new Set(selectedPartitions.map((p) => p.toLowerCase()))
    : null;

  const isPartitionSelected = (pName: string): boolean => {
    if (!selectedSet) return true;
    const basePName = pName.replace(/_[ab]$/i, "").toLowerCase();
    return selectedSet.has(pName.toLowerCase()) || selectedSet.has(basePName);
  };

  // 3. Chuẩn bị danh sách lệnh nạp
  const flashTasks: Array<{
    partition: string;
    imgPath: string;
    extraArgs?: string[];
  }> = [];

  // 3.1 Nạp Boot Image theo tùy chọn Root
  if (isPartitionSelected("boot")) {
    let bootImgToFlash: string | null = null;
    if (rootOption === "alpha" && scan.hasBootAlpha) {
      bootImgToFlash = path.join(scan.imagesDir, "boot_alpha.img");
      onLog("[FASTBOOT ROM] Đã chọn nạp Magisk Alpha Boot.");
    } else if (rootOption === "folkpatch" && scan.hasBootFolkpatch) {
      bootImgToFlash = path.join(scan.imagesDir, "boot_folkpatch.img");
      onLog("[FASTBOOT ROM] Đã chọn nạp FolkPatch Boot.");
    } else if (rootOption === "custom" && customBootPath && fs.existsSync(customBootPath)) {
      bootImgToFlash = customBootPath;
      onLog(`[FASTBOOT ROM] Đã chọn nạp Custom Boot: ${customBootPath}`);
    } else if (scan.hasBootNonroot) {
      bootImgToFlash = path.join(scan.imagesDir, "boot_nonroot.img");
      onLog("[FASTBOOT ROM] Đã chọn nạp Standard Non-root Boot.");
    } else if (scan.hasBootStandard) {
      bootImgToFlash = path.join(scan.imagesDir, "boot.img");
      onLog("[FASTBOOT ROM] Đã chọn nạp Boot tiêu chuẩn.");
    }

    if (bootImgToFlash) {
      if (effectiveSlotMode === "both") {
        flashTasks.push({ partition: "boot_ab", imgPath: bootImgToFlash });
      } else if (effectiveSlotMode === "active") {
        flashTasks.push({ partition: "boot", imgPath: bootImgToFlash });
      } else {
        flashTasks.push({ partition: `boot_${targetSlot}`, imgPath: bootImgToFlash });
      }
    }
  }

  // Nạp init_boot nếu có và được chọn (Android 13+)
  if (scan.hasInitBoot && isPartitionSelected("init_boot")) {
    const initBootPath = path.join(scan.imagesDir, "init_boot.img");
    if (effectiveSlotMode === "both") {
      flashTasks.push({ partition: "init_boot_a", imgPath: initBootPath });
      flashTasks.push({ partition: "init_boot_b", imgPath: initBootPath });
    } else {
      flashTasks.push({ partition: "init_boot", imgPath: initBootPath });
    }
  }

  // 3.2 Lập danh sách các phân vùng khác trong ROM
  const skipPartitionNames = new Set([
    "boot",
    "boot_alpha",
    "boot_folkpatch",
    "boot_nonroot",
    "init_boot",
    "super",
  ]);

  for (const imgItem of scan.foundImages) {
    if (skipPartitionNames.has(imgItem.partition.toLowerCase())) continue;

    // Lớp bảo vệ Anti-Brick #2: Chặn tuyệt đối phân vùng protected (persist, keystore, nvram)
    if (imgItem.isProtected) {
      onLog(`[ANTI-BRICK SAFEGUARD] Bỏ qua phân vùng nhạy cảm ${imgItem.partition} để bảo vệ IMEI / Calibration.`);
      continue;
    }

    // Lớp bảo vệ Anti-Brick #3: Kiểm tra phân vùng bootloader critical nếu người dùng chọn tắt
    if (imgItem.isCritical && !allowCriticalPartitions) {
      onLog(`[ANTI-BRICK SAFEGUARD] Bỏ qua phân vùng Bootloader firmware ${imgItem.partition} (chế độ bảo vệ an toàn).`);
      continue;
    }

    // Kiểm tra tệp 0 byte
    if (imgItem.sizeBytes === 0) {
      onLog(`[WARNING] Bỏ qua ${imgItem.name} vì tệp có kích thước 0 bytes.`);
      continue;
    }

    // Kiểm tra nếu phân vùng được người dùng chọn
    if (!isPartitionSelected(imgItem.partition)) {
      continue;
    }

    const pName = imgItem.partition;
    const isVbmeta = /^vbmeta/i.test(pName);
    const extraArgs = isVbmeta && disableVerity
      ? ["--disable-verity", "--disable-verification"]
      : undefined;

    if (effectiveSlotMode === "both") {
      if (!/_a$/i.test(pName) && !/_b$/i.test(pName)) {
        flashTasks.push({ partition: `${pName}_a`, imgPath: imgItem.path, extraArgs });
        flashTasks.push({ partition: `${pName}_b`, imgPath: imgItem.path, extraArgs });
      } else {
        flashTasks.push({ partition: pName, imgPath: imgItem.path, extraArgs });
      }
    } else {
      flashTasks.push({ partition: pName, imgPath: imgItem.path, extraArgs });
    }
  }

  // 3.3 Nạp Super image nếu được chọn
  if (scan.hasSuper && isPartitionSelected("super")) {
    const superPath = path.join(scan.imagesDir, "super.img");
    flashTasks.push({ partition: "super", imgPath: superPath });
  }

  if (flashTasks.length === 0) {
    throw new Error("Không có phân vùng nào được chọn để nạp!");
  }

  // 4. Bắt đầu nạp tuần tự
  const totalTasks = flashTasks.length + (wipeData ? 3 : 0) + (lockBootloader ? 1 : 0) + 2;
  let stepIndex = 0;

  for (const task of flashTasks) {
    if (checkCancelled()) {
      throw new Error("Quá trình nạp ROM đã bị hủy bởi người dùng!");
    }

    stepIndex++;
    const progressPercent = Math.round((stepIndex / totalTasks) * 100);

    onProgress({
      step: stepIndex,
      totalSteps: totalTasks,
      currentPartition: task.partition,
      message: `Đang nạp phân vùng ${task.partition}...`,
      percentage: progressPercent,
    });

    onLog(`[FASTBOOT] [${stepIndex}/${totalTasks}] Flash ${task.partition} <= ${path.basename(task.imgPath)}`);

    const args = ["-s", deviceId];
    if (task.extraArgs && task.extraArgs.length > 0) {
      args.push(...task.extraArgs);
    }
    args.push("flash", task.partition, task.imgPath);

    try {
      const { stdout, stderr } = await execPromise(`"${fastbootExe}" ${args.map(a => `"${a}"`).join(" ")}`);
      if (stdout) onLog(stdout.trim());
      if (stderr) onLog(stderr.trim());
    } catch (err: any) {
      const errDetail = err.stderr || err.message || "Lỗi không xác định";
      onLog(`[ERROR] Flash ${task.partition} thất bại: ${errDetail}`);
      throw new Error(`Lỗi khi nạp phân vùng ${task.partition}: ${errDetail}`);
    }
  }

  // 5. Xóa dữ liệu nếu chọn Clean Flash
  if (wipeData) {
    const erasePartitions = ["userdata", "metadata", "frp"];
    for (const erasePart of erasePartitions) {
      if (checkCancelled()) throw new Error("Quá trình nạp ROM đã bị hủy!");
      stepIndex++;
      const progressPercent = Math.round((stepIndex / totalTasks) * 100);

      onProgress({
        step: stepIndex,
        totalSteps: totalTasks,
        currentPartition: erasePart,
        message: `Đang xóa phân vùng ${erasePart}...`,
        percentage: progressPercent,
      });

      onLog(`[FASTBOOT] Erase ${erasePart}...`);
      try {
        const { stdout, stderr } = await execPromise(`"${fastbootExe}" -s "${deviceId}" erase "${erasePart}"`);
        if (stdout) onLog(stdout.trim());
        if (stderr) onLog(stderr.trim());
      } catch (err: any) {
        onLog(`[WARNING] Erase ${erasePart} bỏ qua hoặc không hỗ trợ: ${err.message}`);
      }
    }
  }

  // 6. Set Active Slot
  stepIndex++;
  onProgress({
    step: stepIndex,
    totalSteps: totalTasks,
    currentPartition: "set_active",
    message: `Đang kích hoạt slot ${targetSlot}...`,
    percentage: Math.round((stepIndex / totalTasks) * 100),
  });

  onLog(`[FASTBOOT] Switching active slot to ${targetSlot}...`);
  try {
    await execPromise(`"${fastbootExe}" -s "${deviceId}" set_active ${targetSlot}`);
  } catch (err: any) {
    onLog(`[NOTE] set_active ${targetSlot}: ${err.message}`);
  }

  // 7. Khóa lại Bootloader (nếu người dùng đã xác nhận kích hoạt)
  if (lockBootloader) {
    if (checkCancelled()) throw new Error("Quá trình nạp ROM đã bị hủy!");
    stepIndex++;
    onProgress({
      step: stepIndex,
      totalSteps: totalTasks,
      currentPartition: "lock_bootloader",
      message: "⚠️ Đang thực thi Khóa lại Bootloader (Relock)...",
      percentage: Math.round((stepIndex / totalTasks) * 100),
    });

    onLog("[FASTBOOT] [CRITICAL] >>> Đang khóa Bootloader thiết bị (fastboot oem lock)... <<<");
    try {
      const { stdout, stderr } = await execPromise(`"${fastbootExe}" -s "${deviceId}" oem lock`);
      if (stdout) onLog(stdout.trim());
      if (stderr) onLog(stderr.trim());
    } catch (err: any) {
      onLog(`[NOTE] fastboot oem lock: ${err.message}. Thử flashing lock...`);
      try {
        const { stdout: fOut, stderr: fErr } = await execPromise(`"${fastbootExe}" -s "${deviceId}" flashing lock`);
        if (fOut) onLog(fOut.trim());
        if (fErr) onLog(fErr.trim());
      } catch (fError: any) {
        onLog(`[WARNING] Không thể khóa Bootloader tự động: ${fError.message}`);
      }
    }
  }

  stepIndex++;
  onProgress({
    step: stepIndex,
    totalSteps: totalTasks,
    currentPartition: "reboot",
    message: "Hoàn tất! Đang khởi động lại thiết bị...",
    percentage: 100,
  });

  onLog("[FASTBOOT] Rebooting device into system...");
  try {
    await execPromise(`"${fastbootExe}" -s "${deviceId}" reboot`);
  } catch (err: any) {
    onLog(`[NOTE] Reboot: ${err.message}`);
  }

  onLog("[FASTBOOT ROM] >>> Nạp ROM Fastboot thành công rực rỡ! <<<");
  return {
    success: true,
    message: "Nạp ROM Fastboot thành công!",
  };
}
