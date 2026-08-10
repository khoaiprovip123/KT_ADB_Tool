import { adbState } from "./adbCore";
import batteryProfiles from "./data/battery_profiles.json";
import xiaomiCodenames from "./data/xiaomi_codenames.json";

function extractValidDeviceIp(text: string): string | null {
  if (!text) return null;
  const matches = Array.from(
    text.matchAll(
      /(?:inet\s+|src\s+|addr:)?\b((?:192\.168|10\.|172\.(?:1[6-9]|2[0-9]|3[01]))\.\d+\.\d+)\b/g,
    ),
  );
  for (const m of matches) {
    const ip = m[1];
    if (
      ip &&
      ip !== "127.0.0.1" &&
      !ip.startsWith("0.") &&
      !ip.startsWith("169.254")
    ) {
      return ip;
    }
  }

  const allIps = Array.from(
    text.matchAll(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g),
  );
  for (const m of allIps) {
    const ip = m[1];
    if (
      ip &&
      ip !== "127.0.0.1" &&
      !ip.startsWith("0.") &&
      !ip.startsWith("127.") &&
      !ip.startsWith("169.254") &&
      !ip.startsWith("255.")
    ) {
      return ip;
    }
  }
  return null;
}

export async function getDeviceInfo(deviceId: string) {
  try {
    // 1. Kiểm tra trạng thái thiết bị trong danh sách
    const devices = await adbState.client.listDevices();
    const device = devices.find((d: any) => d.id === deviceId);

    if (!device) {
      throw new Error("Device not found");
    }

    if (device.type === "unauthorized") {
      return {
        id: deviceId,
        model: "Thiết bị chưa cấp quyền",
        brand: "Vui lòng cho phép gỡ lỗi USB (USB Debugging) trên màn hình điện thoại.",
        codename: "unauthorized",
        osVersion: "Unknown",
        sdkVersion: "Unknown",
        cpuAbi: "Unknown",
        ipAddress: "Unknown",
        batteryLevel: 0,
        batteryStatus: "Unknown",
        batteryTemp: 0,
        batteryHealth: "Unknown",
        ramTotal: "0 GB",
        ramUsed: "0 GB",
        ramFree: "0 GB",
        ramUsagePercent: 0,
        storageInternal: { total: "0 GB", used: "0 GB", free: "0 GB", percent: 0 },
        storageSdcard: null,
        screenResolution: "Unknown",
        screenDpi: 0,
        uptime: "Unknown",
        selinux: "Unknown",
        isRooted: false,
        cryptoState: "Unknown",
        isUnauthorized: true,
        isOffline: false,
      };
    }

    if (device.type === "offline") {
      return {
        id: deviceId,
        model: "Thiết bị ngoại tuyến",
        brand: "Vui lòng kiểm tra lại cáp kết nối hoặc Driver USB.",
        codename: "offline",
        osVersion: "Unknown",
        sdkVersion: "Unknown",
        cpuAbi: "Unknown",
        ipAddress: "Unknown",
        batteryLevel: 0,
        batteryStatus: "Unknown",
        batteryTemp: 0,
        batteryHealth: "Unknown",
        ramTotal: "0 GB",
        ramUsed: "0 GB",
        ramFree: "0 GB",
        ramUsagePercent: 0,
        storageInternal: { total: "0 GB", used: "0 GB", free: "0 GB", percent: 0 },
        storageSdcard: null,
        screenResolution: "Unknown",
        screenDpi: 0,
        uptime: "Unknown",
        selinux: "Unknown",
        isRooted: false,
        cryptoState: "Unknown",
        isUnauthorized: false,
        isOffline: true,
      };
    }

    const safeShell = (cmd: string): Promise<string> => {
      return new Promise<string>((resolve) => {
        adbState.client
          .shell(deviceId, cmd)
          .then((s: any) => {
            let data = "";
            s.on("data", (c: any) => (data += c));
            s.on("end", () => resolve(data));
            s.on("error", () => resolve(""));
          })
          .catch(() => resolve(""));
      });
    };

    // Chạy song song 6 lệnh shell cơ bản ngay từ đầu để tăng tốc độ nhận diện
    const [getPropRaw, wmSizeRaw, uptimeRaw, storageRaw, selinuxRaw, suRaw] = await Promise.all([
      safeShell("getprop"),
      safeShell("wm size"),
      safeShell("uptime"),
      safeShell("df"),
      safeShell("getenforce"),
      safeShell("which su"),
    ]);

    const deviceName = getPropRaw.match(
      /\[persist\.sys\.device_name\]: \[(.*?)\]/,
    )?.[1];
    const marketName = getPropRaw.match(
      /\[ro\.product\.marketname\]: \[(.*?)\]/,
    )?.[1];
    const modelProp =
      getPropRaw.match(/\[ro\.product\.model\]: \[(.*?)\]/)?.[1] ||
      "Unknown Device";
    const brand =
      getPropRaw.match(/\[ro\.product\.brand\]: \[(.*?)\]/)?.[1] || "Unknown";

    const vendorDevice = getPropRaw.match(/\[ro\.product\.vendor\.device\]: \[(.*?)\]/)?.[1];
    const vendorProductDevice = getPropRaw.match(/\[ro\.vendor\.product\.device\]: \[(.*?)\]/)?.[1];
    const odmDevice = getPropRaw.match(/\[ro\.product\.odm\.device\]: \[(.*?)\]/)?.[1];
    const odmProductDevice = getPropRaw.match(/\[ro\.odm\.product\.device\]: \[(.*?)\]/)?.[1];
    const vendorName = getPropRaw.match(/\[ro\.product\.vendor\.name\]: \[(.*?)\]/)?.[1];
    const vendorProductName = getPropRaw.match(/\[ro\.vendor\.product\.name\]: \[(.*?)\]/)?.[1];
    const bootHw =
      getPropRaw.match(/\[ro\.boot\.product\.hardware\]: \[(.*?)\]/)?.[1] ||
      getPropRaw.match(/\[ro\.boot\.hardware\]: \[(.*?)\]/)?.[1];
    const productDevice = getPropRaw.match(/\[ro\.product\.device\]: \[(.*?)\]/)?.[1];
    const buildProduct = getPropRaw.match(/\[ro\.build\.product\]: \[(.*?)\]/)?.[1];
    const systemDevice = getPropRaw.match(/\[ro\.product\.system\.device\]: \[(.*?)\]/)?.[1];
    const bootDevice = getPropRaw.match(/\[ro\.boot\.device\]: \[(.*?)\]/)?.[1];
    const modDevice = getPropRaw.match(/\[ro\.product\.mod_device\]: \[(.*?)\]/)?.[1];

    const codenameCandidates = [
      vendorDevice,
      vendorProductDevice,
      odmDevice,
      odmProductDevice,
      vendorName,
      vendorProductName,
      bootHw,
      productDevice,
      buildProduct,
      systemDevice,
      bootDevice,
      modDevice,
    ].filter((c): c is string => Boolean(c && c.trim() && c.trim() !== "Unknown"));

    const codenameDict = xiaomiCodenames as Record<string, string>;

    const sanitizeCodename = (raw: string): string => {
      let clean = raw
        .trim()
        .replace(/_(xiaomieu|global|eea|in|ru|id|tr|tw|jp|cn|kr|la|mx|pro|pre|demo|dev|beta|alpha|test).*/i, "");
      if (!codenameDict[clean] && clean.includes("_")) {
        const baseCandidate = clean.split("_")[0];
        if (codenameDict[baseCandidate]) {
          clean = baseCandidate;
        }
      }
      return clean;
    };

    let selectedCodename = "Unknown";
    let selectedFriendlyName = "";

    // 1. Tìm candidate nào khớp trong DB (ưu tiên theo thứ tự phần cứng vendor/odm trước system)
    for (const cand of codenameCandidates) {
      const cleaned = sanitizeCodename(cand);
      if (codenameDict[cleaned]) {
        selectedCodename = cleaned;
        selectedFriendlyName = codenameDict[cleaned];
        break;
      }
    }

    // 2. Fallback nếu không có candidate nào nằm trong DB
    if (selectedCodename === "Unknown" && codenameCandidates.length > 0) {
      selectedCodename = sanitizeCodename(codenameCandidates[0]);
    }

    let friendlyName = selectedFriendlyName;
    if (friendlyName && friendlyName.includes("|")) {
      const names = friendlyName.split("|").map((s) => s.trim());
      friendlyName =
        names.find(
          (s) =>
            s.toLowerCase().includes("xiaomi") ||
            s.toLowerCase().includes("redmi") ||
            s.toLowerCase().includes("poco"),
        ) || names[0];
    }
    const codename = selectedCodename;
    const displayCodename = codename;

    let model = deviceName || marketName;
    if (!model) {
      if (friendlyName) {
        model = friendlyName;
      } else {
        model = `${brand.toUpperCase()} ${modelProp}`;
      }
    }

    const osVer =
      getPropRaw.match(/\[ro\.build\.version\.release\]: \[(.*?)\]/)?.[1] ||
      "Unknown";
    const sdkVer =
      getPropRaw.match(/\[ro\.build\.version\.sdk\]: \[(.*?)\]/)?.[1] ||
      "Unknown";
    const cpuAbi =
      getPropRaw.match(/\[ro\.product\.cpu\.abi\]: \[(.*?)\]/)?.[1] ||
      "Unknown";

    // Lấy IP address chuẩn xác qua các nguồn mạng
    let ipAddr = "Not Connected";
    const deviceIpMatch = deviceId.match(/^(\d+\.\d+\.\d+\.\d+)/);
    if (deviceIpMatch) {
      ipAddr = deviceIpMatch[1];
    } else {
      const propIp =
        getPropRaw.match(/\[dhcp\.wlan0\.ipaddress\]: \[(.*?)\]/)?.[1] ||
        getPropRaw.match(/\[dhcp\.wlan1\.ipaddress\]: \[(.*?)\]/)?.[1];

      if (propIp && propIp !== "127.0.0.1" && !propIp.startsWith("0.")) {
        ipAddr = propIp;
      } else {
        const ipRaw = await safeShell(
          "ip addr show dev wlan0 2>/dev/null || ip addr show dev wlan1 2>/dev/null || ifconfig wlan0 2>/dev/null || ifconfig wlan1 2>/dev/null || ip route show 2>/dev/null || ip addr show 2>/dev/null",
        );
        const extracted = extractValidDeviceIp(ipRaw);
        if (extracted) {
          ipAddr = extracted;
        }
      }
    }

    // Additional OS info
    const board =
      getPropRaw.match(/\[ro\.board\.platform\]: \[(.*?)\]/)?.[1] ||
      getPropRaw.match(/\[ro\.hardware\]: \[(.*?)\]/)?.[1] ||
      "Unknown";
    const buildId =
      getPropRaw.match(/\[ro\.build\.display\.id\]: \[(.*?)\]/)?.[1] ||
      "Unknown";
    const socModel =
      getPropRaw.match(/\[ro\.soc\.model\]: \[(.*?)\]/)?.[1] || "";

    // Process CPU Name
    let cpuName = socModel || board.toUpperCase();
    // Map common codenames to readable Snapdragon/MediaTek names
    const cpuMap: Record<string, string> = {
      sm7325: "Snapdragon 778G",
      sm8450: "Snapdragon 8 Gen 1",
      sm8550: "Snapdragon 8 Gen 2",
      sm8650: "Snapdragon 8 Gen 3",
      lahaina: "Snapdragon 888",
      taro: "Snapdragon 8 Gen 1",
      kalama: "Snapdragon 8 Gen 2",
      pineapple: "Snapdragon 8 Gen 3",
      sm8150: "Snapdragon 855",
      sm8250: "Snapdragon 865",
      lisa: "Snapdragon 778G",
      yupik: "Snapdragon 778G",
      renoir: "Snapdragon 780G",
      kona: "Snapdragon 865",
      lito: "Snapdragon 765G",
      mt6893: "Dimensity 1200",
      mt6895: "Dimensity 8100",
      mt6983: "Dimensity 9000",
    };

    if (socModel && cpuMap[socModel.toLowerCase()]) {
      cpuName = cpuMap[socModel.toLowerCase()];
    } else if (cpuMap[board.toLowerCase()]) {
      cpuName = cpuMap[board.toLowerCase()];
    }

    const resolutionMatch = wmSizeRaw.match(/Physical size: (.*)/);
    const resolution = resolutionMatch ? resolutionMatch[1].trim() : "Unknown";
    const uptimeStr = uptimeRaw.trim();

    // Parse MIUI / HyperOS
    const miuiVer = getPropRaw.match(
      /\[ro\.miui\.ui\.version\.name\]: \[(.*?)\]/,
    )?.[1];
    const hyperVer = getPropRaw.match(
      /\[ro\.mi\.os\.version\.name\]: \[(.*?)\]/,
    )?.[1];
    const incVer =
      getPropRaw.match(/\[ro\.build\.version\.incremental\]: \[(.*?)\]/)?.[1] ||
      "Unknown";

    let customOs = "Stock/Other";
    if (hyperVer) {
      const cleanVer = incVer.replace(/^OS/, "");
      customOs = `HyperOS ${cleanVer}`;
    } else if (miuiVer) {
      customOs = `MIUI ${miuiVer} (${incVer})`;
    } else {
      customOs = incVer;
    }

    // Lấy thông số Storage
    let storageTotal = "0GB";
    let storageUsed = "0GB";
    let storagePercent = 0;
    const storageLines = storageRaw.split("\n");
    for (const line of storageLines) {
      if (line.trim().endsWith("/data")) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const total1K = parseInt(parts[1]) || 0;
          const avail1K = parseInt(parts[3]) || 0;

          const totalGB = total1K / 1024 / 1024;
          const availGB = avail1K / 1024 / 1024;

          const standardSizes = [32, 64, 128, 256, 512, 1024];
          let physicalGB = 32;
          for (const size of standardSizes) {
            if (totalGB <= size * 0.95) {
              physicalGB = size;
              break;
            }
          }
          if (totalGB > 1024 * 0.95)
            physicalGB = Math.ceil(totalGB / 128) * 128;

          const usedGB = physicalGB - availGB;

          storageTotal = `${physicalGB}GB`;
          storageUsed = `${usedGB.toFixed(1)}GB`;
          storagePercent = Math.round((usedGB / physicalGB) * 100);
          break;
        }
      }
    }

    // Security & Boot Info
    const verifiedBootRaw =
      getPropRaw.match(/\[ro\.boot\.verifiedbootstate\]: \[(.*?)\]/)?.[1] ||
      "unknown";
    let bootloaderStatus = "Locked";
    if (verifiedBootRaw === "orange") bootloaderStatus = "Unlocked";
    else if (verifiedBootRaw === "yellow") bootloaderStatus = "Custom Key";

    const cryptoStateRaw =
      getPropRaw.match(/\[ro\.crypto\.state\]: \[(.*?)\]/)?.[1] ||
      "unencrypted";
    const cryptoState =
      cryptoStateRaw.charAt(0).toUpperCase() + cryptoStateRaw.slice(1);

    const selinux = selinuxRaw.trim() || "Unknown";

    const suExists = suRaw.trim().length > 0;
    const isRooted = suExists;

    // Lấy thông số pin nâng cao, dumpsys power và dumpsys batteryproperties song song
    const [batteryRaw, powerRaw, propertiesRaw] = await Promise.all([
      safeShell("dumpsys battery"),
      safeShell("dumpsys power"),
      safeShell("dumpsys batteryproperties"),
    ]);

    const levelMatch = batteryRaw.match(/level:\s*(\d+)/i);
    const tempMatch = batteryRaw.match(/temperature:\s*(\d+)/i);
    const techMatch = batteryRaw.match(/technology:\s*(.*)/i);
    // Regex đa dòng để tránh match nhầm
    const voltMatch =
      batteryRaw.match(/^\s*voltage:\s*(\d+)/im) ||
      propertiesRaw.match(/voltage:\s*(\d+)/i);
    const statusMatch = batteryRaw.match(/status:\s*(\d+)/i);
    const chargeCounterMatch =
      batteryRaw.match(/charge counter:\s*(\d+)/i) ||
      propertiesRaw.match(/charge_counter:\s*(\d+)/i);

    const batteryLevel = levelMatch ? parseInt(levelMatch[1]) : 0;
    const batteryTemp = tempMatch
      ? (parseInt(tempMatch[1]) / 10).toFixed(1)
      : "0";
    const batteryTech = techMatch ? techMatch[1].trim() : "Li-ion";
    // Đảm bảo chia cho 1000 để chuyển đổi mV sang V
    const batteryVoltOut = voltMatch
      ? (parseInt(voltMatch[1]) / 1000).toFixed(2)
      : "3.80";

    const chargeStatus = statusMatch ? parseInt(statusMatch[1]) : 1;
    const isCharging = chargeStatus === 2 || chargeStatus === 5;

    // Đọc dung lượng thiết kế & thực tế qua sysfs uevent (Chính xác nhất và hỗ trợ mọi dòng máy)
    const ueventRaw = await safeShell(
      "cat /sys/class/power_supply/*/uevent 2>/dev/null",
    );

    const extractUevent = (key: string): number => {
      // Tìm key trong uevent, lấy value
      const match = ueventRaw.match(new RegExp(`^${key}=(\\d+)`, "m"));
      if (match) {
        const val = parseInt(match[1]);
        // Nếu giá trị là micro (e.g. 4250000), chuyển về milli
        return val > 100000 ? Math.round(val / 1000) : val;
      }
      return 0;
    };

    const specDesignFull = extractUevent("POWER_SUPPLY_CHARGE_FULL_DESIGN");
    const specActualFull = extractUevent("POWER_SUPPLY_CHARGE_FULL");
    const specChargeCounter = extractUevent("POWER_SUPPLY_CHARGE_COUNTER");
    const specUsbVolt = extractUevent("POWER_SUPPLY_VOLTAGE_NOW"); // Điện áp
    const specSoh = extractUevent("POWER_SUPPLY_SOH"); // Health trực tiếp từ kernel
    const specCycleCount = extractUevent("POWER_SUPPLY_CYCLE_COUNT");
    const specCapacity = extractUevent("POWER_SUPPLY_CAPACITY") || batteryLevel;

    let designCap = 0;

    // 0. Lấy từ JSON database (Chính xác tuyệt đối từ nhà sản xuất)
    try {
      const modelProp =
        getPropRaw.match(/\[ro\.product\.model\]:\s*\[(.*?)\]/)?.[1] || "";
      const marketName =
        getPropRaw.match(/\[ro\.product\.marketname\]:\s*\[(.*?)\]/)?.[1] || "";
      const deviceName =
        getPropRaw.match(/\[ro\.product\.device\]:\s*\[(.*?)\]/)?.[1] || "";

      const db: any = batteryProfiles;
      for (const brand in db) {
        const match =
          db[brand][modelProp] ||
          db[brand][marketName] ||
          db[brand][deviceName];
        if (match) {
          if (Array.isArray(match)) {
            designCap = match[0];
            if (match[1]) cpuName = match[1];
          } else {
            designCap = match;
          }
          break;
        }
      }
    } catch (e) {
      console.error("Failed to parse battery_profiles.json", e);
    }

    // 1. Sysfs (Chính xác tuyệt đối nếu có)
    if (!designCap && specDesignFull > 0) {
      designCap = specDesignFull;
    }

    // 2. Lấy dung lượng thiết kế từ dumpsys batteryproperties
    if (!designCap) {
      const propDesignCapMatch =
        propertiesRaw.match(/design_capacity:\s*(\d+)/) ||
        propertiesRaw.match(/charge_full_design:\s*(\d+)/);
      if (propDesignCapMatch) {
        const val = parseInt(propDesignCapMatch[1]);
        designCap = val > 10000 ? Math.round(val / 1000) : val;
      }
    }

    // 3. Lấy dung lượng thiết kế từ getprop
    if (!designCap) {
      const propCapMatch =
        getPropRaw.match(/\[ro\.boot\.battery\.capacity\]:\s*\[(\d+)\]/) ||
        getPropRaw.match(
          /\[ro\.product\.battery\.design_capacity\]:\s*\[(\d+)\]/,
        ) ||
        getPropRaw.match(/\[persist\.vendor\.battery\.capacity\]:\s*\[(\d+)\]/);
      designCap = propCapMatch ? parseInt(propCapMatch[1]) : 0;
    }

    // 4. Lấy dung lượng thiết kế từ dumpsys power
    if (!designCap) {
      const capPowerMatch =
        powerRaw.match(/mBatteryCapacity\s*=\s*([\d.]+)/i) ||
        powerRaw.match(/Battery\s+Capacity:\s*([\d.]+)/i);
      designCap = capPowerMatch ? Math.round(parseFloat(capPowerMatch[1])) : 0;
    }

    // Fallback nếu hoàn toàn không tìm thấy
    if (!designCap || designCap < 1000) {
      designCap = 4250; // Fallback mặc định
    }

    // Hàm chuẩn hoá dung lượng pin để xử lý các máy trả về đơn vị quá lớn (gấp 100, 1000 lần bình thường)
    const normalizeCap = (val: number): number => {
      if (!val || val <= 0) return 0;
      let temp = val;
      while (temp > 30000) {
        temp = temp / 10;
      }
      return Math.round(temp);
    };

    // Dung lượng thực tế hiện tại (charge_counter)
    let currentCharge = 0;
    if (specChargeCounter > 0) {
      currentCharge = normalizeCap(specChargeCounter);
    } else if (chargeCounterMatch) {
      const ccVal = parseInt(chargeCounterMatch[1]);
      currentCharge = normalizeCap(ccVal);
    }

    // Dung lượng thực tế tối đa (Full charge capacity)
    let actualFullCap = normalizeCap(specActualFull);

    // Tính toán Tình trạng pin (Sức khỏe) - CÔNG THỨC CHUẨN
    let healthPercent = 100;

    // Ưu tiên 1: Dùng công thức toán học từ Charge Counter (Dung lượng thực tế hiện tại)
    let computedFullFromCounter = 0;
    if (currentCharge > 0 && specCapacity > 0) {
      // Công thức: Dung lượng tối đa = Dung lượng hiện tại / Phần trăm pin hiện tại
      computedFullFromCounter = Math.round(
        (currentCharge / specCapacity) * 100,
      );
    }

    if (computedFullFromCounter > 0) {
      // Ưu tiên công thức Charge Counter
      actualFullCap = computedFullFromCounter;
      if (designCap > 0) {
        healthPercent = Math.min(
          100,
          Math.round((actualFullCap / designCap) * 100),
        );
      }
    } else if (actualFullCap > 0 && designCap > 0) {
      // Ưu tiên 2: Dùng sysfs charge_full
      healthPercent = Math.min(
        100,
        Math.round((actualFullCap / designCap) * 100),
      );
    } else if (specSoh > 0 && specSoh <= 100) {
      // Ưu tiên 3: Dùng SOH trực tiếp từ chip
      healthPercent = specSoh;
    } else if (specCycleCount > 0) {
      // Ưu tiên 4: Ước tính qua chu kỳ sạc
      healthPercent = Math.max(60, 100 - Math.round(specCycleCount * 0.035));
    }

    let wearPercent = 100 - healthPercent;
    if (wearPercent < 0) wearPercent = 0;

    // Cập nhật lại actualFullCap nếu chưa có
    if (!actualFullCap && designCap > 0) {
      actualFullCap = Math.round((designCap * healthPercent) / 100);
    }

    // Nếu cảm biến sai khiến dung lượng thực tế > 115% thiết kế -> quy về 100%
    if (actualFullCap > designCap * 1.15) {
      actualFullCap = designCap;
    }

    let batteryVoltIn = "0.00";
    if (isCharging) {
      if (specUsbVolt > 0) {
        batteryVoltIn =
          specUsbVolt > 10000
            ? (specUsbVolt / 1000000).toFixed(2)
            : (specUsbVolt / 1000).toFixed(2);
        if (parseFloat(batteryVoltIn) < 1.0) batteryVoltIn = "5.00";
      } else {
        batteryVoltIn = "5.00";
      }
    }

    // Lấy thông số RAM qua /proc/meminfo (nhanh hơn dumpsys meminfo)
    const memInfoRaw = await safeShell("cat /proc/meminfo");
    const memTotalMatch = memInfoRaw.match(/MemTotal:\s+(\d+)\s+kB/);
    const memAvailableMatch = memInfoRaw.match(/MemAvailable:\s+(\d+)\s+kB/);
    const memFreeMatch = memInfoRaw.match(/MemFree:\s+(\d+)\s+kB/);

    const totalRam = memTotalMatch
      ? parseInt(memTotalMatch[1], 10) / 1024
      : 0;
    
    // Ưu tiên MemAvailable vì phản ánh đúng lượng RAM thực tế hệ thống có thể cấp phát
    const freeRam = memAvailableMatch
      ? parseInt(memAvailableMatch[1], 10) / 1024
      : memFreeMatch
        ? parseInt(memFreeMatch[1], 10) / 1024
        : 0;

    // Lấy thông tin Dual IMEI qua getprop hoặc dumpsys iphonesubinfo
    let imei1 =
      getPropRaw.match(/\[gsm\.baseband\.imei1?\]: \[(.*?)\]/)?.[1] ||
      getPropRaw.match(/\[persist\.radio\.imei1?\]: \[(.*?)\]/)?.[1] ||
      getPropRaw.match(/\[ro\.ril\.oem\.imei\]: \[(.*?)\]/)?.[1];

    let imei2 =
      getPropRaw.match(/\[gsm\.baseband\.imei2\]: \[(.*?)\]/)?.[1] ||
      getPropRaw.match(/\[persist\.radio\.imei2\]: \[(.*?)\]/)?.[1] ||
      getPropRaw.match(/\[ro\.ril\.oem\.imei2\]: \[(.*?)\]/)?.[1];

    const imeiList: string[] = [];

    if (imei1 && imei1.includes(",")) {
      const splitList = imei1.split(",").map((s) => s.trim()).filter((s) => /^\d{14,15}$/.test(s));
      imeiList.push(...splitList);
    } else {
      if (imei1 && /^\d{14,15}$/.test(imei1.trim())) imeiList.push(imei1.trim());
      if (imei2 && /^\d{14,15}$/.test(imei2.trim())) imeiList.push(imei2.trim());
    }

    if (imeiList.length === 0) {
      const [subInfoRaw, subInfoSlot1, subInfoSlot2] = await Promise.all([
        safeShell("dumpsys iphonesubinfo 2>/dev/null"),
        safeShell("dumpsys iphonesubinfo 1 2>/dev/null"),
        safeShell("dumpsys iphonesubinfo 2 2>/dev/null"),
      ]);

      const combinedSubInfo = `${subInfoRaw}\n${subInfoSlot1}\n${subInfoSlot2}`;
      const matches = Array.from(
        combinedSubInfo.matchAll(/(?:Device ID|IMEI|slot\s*\d+)\s*(?:\([^)]*\))?\s*[:=]\s*(\d{14,15})/gi)
      );

      for (const m of matches) {
        if (m[1] && !imeiList.includes(m[1])) {
          imeiList.push(m[1]);
        }
      }

      if (imeiList.length === 0) {
        const digitsOnly = combinedSubInfo.match(/\b\d{14,15}\b/g);
        if (digitsOnly) {
          for (const d of digitsOnly) {
            if (!imeiList.includes(d)) imeiList.push(d);
          }
        }
      }
    }

    let imei = imeiList.length > 0 ? imeiList.join(" / ") : "Không thể lấy";

    const serial =
      getPropRaw.match(/\[ro\.serialno\]: \[(.*?)\]/)?.[1] ||
      getPropRaw.match(/\[ro\.boot\.serialno\]: \[(.*?)\]/)?.[1] ||
      "Không xác định";

    const securityPatch =
      getPropRaw.match(/\[ro\.build\.version\.security_patch\]: \[(.*?)\]/)?.[1] ||
      "Không xác định";

    const fingerprint =
      getPropRaw.match(/\[ro\.build\.fingerprint\]: \[(.*?)\]/)?.[1] ||
      getPropRaw.match(/\[ro\.vendor\.build\.fingerprint\]: \[(.*?)\]/)?.[1] ||
      "Không xác định";

    const wifiMac =
      getPropRaw.match(/\[ro\.boot\.wifimacaddr\]: \[(.*?)\]/)?.[1] ||
      getPropRaw.match(/\[wifi\.interface\.mac\]: \[(.*?)\]/)?.[1] ||
      "Bảo mật Android";

    const kernelVerRaw = await safeShell("uname -r 2>/dev/null");
    const kernelVer = kernelVerRaw.trim() || "Linux Kernel";

    return {
      model: model,
      brand: brand.toUpperCase(),
      osVer: `Android ${osVer}`,
      sdkVer: `API ${sdkVer}`,
      cpuAbi,
      ipAddr,
      bootloaderStatus,
      cryptoState: cryptoState.charAt(0).toUpperCase() + cryptoState.slice(1),
      selinux,
      isRooted,
      resolution,
      uptimeStr,
      batteryLevel,
      batteryTemp,
      batteryTech,
      batteryVoltIn,
      batteryVoltOut,
      batteryDesignCap: designCap,
      batteryActualCap: actualFullCap,
      batteryCurrentCap: currentCharge,
      batteryWearPercent: wearPercent,
      batteryHealthPercent: healthPercent,
      batteryIsCharging: isCharging,
      ramTotal: Math.round(totalRam),
      ramFree: Math.round(freeRam),
      storageTotal,
      storageUsed,
      storagePercent,
      customOs,
      codename: displayCodename,
      board: board.toUpperCase(),
      cpuName,
      buildId,
      imei,
      serial,
      securityPatch,
      fingerprint,
      wifiMac,
      kernelVer,
    };
  } catch (err) {
    console.error("Failed to get device info:", err);
    return null;
  }
}
