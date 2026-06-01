import adb from "adbkit";
import { ensureAdb } from "./adbDownloader";
import { ensureScrcpy } from "./scrcpyDownloader";
import * as path from "path";
import { app } from "electron";
import { spawn, exec } from "child_process";
import * as fs from "fs";
import batteryProfiles from "./data/battery_profiles.json";
import { evaluateCommand, cleanAdbPrefix } from "./adbSafety";

export const adbState = {
  client: adb.createClient(),
};

export async function killAdbServer(): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd =
      process.platform === "win32" ? "taskkill /F /IM adb.exe" : "killall adb";
    exec(cmd, () => {
      resolve(true);
    });
  });
}

export async function initAdb(onProgress: (msg: string) => void) {
  try {
    const binPath = app.isPackaged
      ? path.join(process.resourcesPath, "bin")
      : path.join(__dirname, "../../resources/bin");

    const adbExe = await ensureAdb(binPath, onProgress);

    // Kill existing adb processes to prevent socket conflicts (port 5037)
    await killAdbServer();
    await new Promise((r) => setTimeout(r, 1000)); // Đợi kỹ một chút cho process chết hẳn

    // Chủ động start-server ngay lập tức để tránh trackDevices bị timeout hoặc lỗi Daemon
    await new Promise<void>((resolve) => {
      exec(`"${adbExe}" start-server`, () => resolve());
    });
    await new Promise((r) => setTimeout(r, 500)); // Chờ server khởi động xong

    // Update the client in our state object
    adbState.client = adb.createClient({ bin: adbExe });
    onProgress("ADB Client connected successfully.");

    ensureScrcpy(binPath, onProgress).catch(() => {});

    return true;
  } catch (err: any) {
    onProgress(`Init failed: ${err.message}`);
    return false;
  }
}

export async function getDevices() {
  try {
    const devices = await adbState.client.listDevices();
    return devices;
  } catch (error) {
    console.error("Error listing devices:", error);
    return [];
  }
}

export async function watchDevices(onUpdate: (devices: any[]) => void) {
  let isTracking = false;

  const startTracking = async () => {
    if (isTracking) return;
    try {
      const tracker = await adbState.client.trackDevices();
      isTracking = true;

      const refresh = async () => {
        const devs = await getDevices();
        onUpdate(devs);
      };

      // Lấy danh sách thiết bị ngay khi vừa bật tracker (Dành cho máy đã cắm sẵn từ trước)
      refresh();

      tracker.on("add", refresh);
      tracker.on("remove", refresh);
      tracker.on("change", refresh);

      tracker.on("end", () => {
        console.log("Tracking ended, restarting...");
        isTracking = false;
        setTimeout(startTracking, 2000);
      });

      tracker.on("error", (err: any) => {
        console.error("Tracking error:", err);
        isTracking = false;
        setTimeout(startTracking, 2000);
      });
    } catch (error) {
      console.error("Error tracking devices:", error);
      isTracking = false;
      setTimeout(startTracking, 2000);
    }
  };

  startTracking();
}

// Hàm thực thi lệnh Shell bất đồng bộ và trả Stream về UI
export async function runAdbCommand(
  deviceId: string,
  command: string,
  onLog: (log: string) => void,
): Promise<string> {
  try {
    let shellCommand = cleanAdbPrefix(command);

    // Đánh giá mức độ an toàn của câu lệnh shell
    const safety = evaluateCommand(shellCommand);
    if (!safety.allowed) {
      const blockedMsg = `[BLOCKED BY SAFETY LAYER] Lệnh bị chặn vì lý do bảo mật: ${safety.reason || "Không an toàn"}`;
      onLog(blockedMsg);
      return blockedMsg;
    }

    // Bọc qua adbkit hoặc child_process
    const stream = await adbState.client.shell(deviceId, shellCommand);

    return new Promise((resolve) => {
      let output = "";
      stream.on("data", (data: Buffer) => {
        const text = data.toString();
        output += text;
        onLog(text);
      });
      stream.on("end", () => resolve(output));
      stream.on("error", (err: any) => resolve(`ERROR: ${err.message}`));
    });
  } catch (error: any) {
    onLog(`CRITICAL ERROR: ${error.message}`);
    return "FAILED";
  }
}

// Chạy Scrcpy
export async function runScrcpy(
  deviceId: string,
  turnScreenOff: boolean,
  onLog: (log: string) => void,
) {
  try {
    const binPath = app.isPackaged
      ? path.join(process.resourcesPath, "bin")
      : path.join(__dirname, "../../resources/bin");
    const scrcpyExe = path.join(binPath, "scrcpy", "scrcpy.exe");

    // Thêm --no-audio để tránh lỗi văng app khi PC không cắm loa/tai nghe (WASAPI error)
    const args = ["-s", deviceId, "--no-audio"];
    if (turnScreenOff) args.push("--turn-screen-off");

    const scrcpyProcess = spawn(scrcpyExe, args);

    scrcpyProcess.stdout.on("data", (data) => onLog(`[Scrcpy] ${data}`));
    scrcpyProcess.stderr.on("data", (data) =>
      onLog(`[Scrcpy Warning] ${data}`),
    );
    scrcpyProcess.on("close", (code) =>
      onLog(`[Scrcpy] Exited with code ${code}`),
    );

    return "STARTED";
  } catch (error: any) {
    onLog(`CRITICAL ERROR (Scrcpy): ${error.message}`);
    return "FAILED";
  }
}

// Bật tính năng kết nối không dây
export async function connectWifi(
  deviceId: string,
  ip: string,
  onLog: (log: string) => void,
) {
  try {
    const binPath = app.isPackaged
      ? path.join(process.resourcesPath, "bin")
      : path.join(__dirname, "../../resources/bin");
    const adbExe = path.join(binPath, "adb.exe");

    onLog("Đang chuyển đổi sang chế độ Wireless (TCPIP 5555)...");
    await new Promise<void>((resolve, reject) => {
      const tcpip = spawn(adbExe, ["-s", deviceId, "tcpip", "5555"]);
      tcpip.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error("TCP IP switch failed"));
      });
    });

    // Đợi 2s để adbd khởi động lại trên điện thoại
    await new Promise((r) => setTimeout(r, 2000));

    onLog(`Đang kết nối tới ${ip}:5555 ...`);
    await new Promise<void>((resolve, reject) => {
      const connect = spawn(adbExe, ["connect", `${ip}:5555`]);
      connect.stdout.on("data", (d) => onLog(d.toString()));
      connect.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error("Connect failed"));
      });
    });

    return true;
  } catch (err: any) {
    onLog(`Lỗi kết nối WiFi: ${err.message}`);
    return false;
  }
}

// Kết nối IP trực tiếp (không cần USB)
export async function connectIp(ip: string, onLog: (log: string) => void) {
  try {
    const binPath = app.isPackaged
      ? path.join(process.resourcesPath, "bin")
      : path.join(__dirname, "../../resources/bin");
    const adbExe = path.join(binPath, "adb.exe");

    // Nếu ip không có port thì mặc định thêm :5555
    const targetIp = ip.includes(":") ? ip : `${ip}:5555`;

    onLog(`Đang kết nối tới ${targetIp} ...`);
    await new Promise<void>((resolve, reject) => {
      const connect = spawn(adbExe, ["connect", targetIp]);

      const timeout = setTimeout(() => {
        connect.kill();
        reject(
          new Error(
            "Timeout: Thiết bị không phản hồi sau 10s. Vui lòng kiểm tra lại mạng hoặc IP.",
          ),
        );
      }, 10000);

      connect.stdout.on("data", (d) => onLog(d.toString()));
      connect.stderr.on("data", (d) => onLog(d.toString()));
      connect.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0) resolve();
        else reject(new Error("Connect failed"));
      });
    });

    return true;
  } catch (err: any) {
    onLog(`Lỗi kết nối IP: ${err.message}`);
    return false;
  }
}

// Ghép nối thiết bị qua Android 11+ Pairing Code
export async function pairDevice(
  ipPort: string,
  code: string,
  onLog: (log: string) => void,
) {
  try {
    const binPath = app.isPackaged
      ? path.join(process.resourcesPath, "bin")
      : path.join(__dirname, "../../resources/bin");
    const adbExe = path.join(binPath, "adb.exe");

    onLog(`Đang ghép nối với ${ipPort} bằng mã ${code} ...`);
    await new Promise<void>((resolve, reject) => {
      const pair = spawn(adbExe, ["pair", ipPort, code]);

      const timeout = setTimeout(() => {
        pair.kill();
        reject(
          new Error(
            "Timeout: Thiết bị không phản hồi sau 10s. Vui lòng kiểm tra lại mạng, IP hoặc Port.",
          ),
        );
      }, 10000);

      let output = "";
      pair.stdout.on("data", (d) => {
        const text = d.toString();
        output += text;
        onLog(text);
      });
      pair.stderr.on("data", (d) => {
        const text = d.toString();
        output += text;
        onLog(text);
      });

      pair.on("close", (exitCode) => {
        clearTimeout(timeout);
        if (
          exitCode === 0 &&
          output.toLowerCase().includes("successfully paired")
        ) {
          resolve();
        } else if (exitCode === 0 && output.toLowerCase().includes("failed")) {
          reject(
            new Error(
              "Pairing failed: Sai mã code hoặc hết thời gian ghép nối.",
            ),
          );
        } else if (exitCode === 0) {
          resolve();
        } else {
          reject(new Error("Pairing failed"));
        }
      });
    });

    return true;
  } catch (err: any) {
    onLog(`Lỗi ghép nối: ${err.message}`);
    return false;
  }
}

export async function getDeviceInfo(deviceId: string) {
  try {
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

    const getPropRaw = await safeShell("getprop");

    const wmSizeRaw = await safeShell("wm size");

    const uptimeRaw = await safeShell("uptime");

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

    let model = deviceName || marketName;
    if (!model) {
      model = `${brand.toUpperCase()} ${modelProp}`;
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
    const ipRaw = await new Promise<string>((resolve) => {
      let data = "";
      adbState.client
        .shell(
          deviceId,
          "ip route show dev wlan0 2>/dev/null || ip route show dev wlan1 2>/dev/null || ip route 2>/dev/null",
        )
        .then((s: any) => {
          s.on("data", (c: any) => (data += c));
          s.on("end", () => resolve(data));
        })
        .catch(() => resolve(""));
    });

    let ipAddr = "Not Connected";
    const wlan0Match =
      ipRaw.match(/wlan0.*src\s+(\d+\.\d+\.\d+\.\d+)/) ||
      ipRaw.match(/src\s+(\d+\.\d+\.\d+\.\d+).*wlan0/);
    const wlan1Match =
      ipRaw.match(/wlan1.*src\s+(\d+\.\d+\.\d+\.\d+)/) ||
      ipRaw.match(/src\s+(\d+\.\d+\.\d+\.\d+).*wlan1/);

    if (wlan0Match) {
      ipAddr = wlan0Match[1];
    } else if (wlan1Match) {
      ipAddr = wlan1Match[1];
    } else {
      // Thử dùng ip address show wlan0 / wlan1
      const ipAddrRaw = await new Promise<string>((resolve) => {
        let data = "";
        adbState.client
          .shell(
            deviceId,
            "ip address show dev wlan0 2>/dev/null || ip address show dev wlan1 2>/dev/null",
          )
          .then((s: any) => {
            s.on("data", (c: any) => (data += c));
            s.on("end", () => resolve(data));
          })
          .catch(() => resolve(""));
      });

      const inetMatch = ipAddrRaw.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
      if (inetMatch) {
        ipAddr = inetMatch[1];
      } else {
        const propIp =
          getPropRaw.match(/\[dhcp\.wlan0\.ipaddress\]: \[(.*?)\]/)?.[1] ||
          getPropRaw.match(/\[dhcp\.wlan1\.ipaddress\]: \[(.*?)\]/)?.[1];
        if (propIp && propIp !== "127.0.0.1" && !propIp.startsWith("0.")) {
          ipAddr = propIp;
        }
      }
    }

    // Additional OS info
    const codename =
      getPropRaw.match(/\[ro\.build\.product\]: \[(.*?)\]/)?.[1] ||
      getPropRaw.match(/\[ro\.product\.device\]: \[(.*?)\]/)?.[1] ||
      "Unknown";
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
    const storageRaw = await safeShell("df");

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

    const selinuxRaw = await safeShell("getenforce");
    const selinux = selinuxRaw.trim() || "Unknown";

    const suRaw = await safeShell("which su");
    const suExists = suRaw.trim().length > 0;
    const isRooted = suExists ? "Yes" : "No";

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

    // Lấy thông số RAM
    const ramRaw = await safeShell("dumpsys meminfo");

    const totalRamMatch = ramRaw.match(/Total RAM: ([\d,]+)K/);
    const freeRamMatch = ramRaw.match(/Free RAM: ([\d,]+)K/);
    const totalRam = totalRamMatch
      ? parseInt(totalRamMatch[1].replace(/,/g, "")) / 1024
      : 0;
    const freeRam = freeRamMatch
      ? parseInt(freeRamMatch[1].replace(/,/g, "")) / 1024
      : 0;

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
      codename,
      board: board.toUpperCase(),
      cpuName,
      buildId,
    };
  } catch (err) {
    console.error("Failed to get device info:", err);
    return null;
  }
}

export interface AppInfo {
  pkg: string;
  type: "system" | "user";
  status: "enabled" | "disabled";
}

export async function getPackages(
  deviceId: string,
  filter: "all" | "system" | "third" = "all",
) {
  try {
    const execCmd = async (cmd: string): Promise<string[]> => {
      const output = await new Promise<string>((resolve) => {
        let data = "";
        adbState.client
          .shell(deviceId, cmd)
          .then((s: any) => {
            s.on("data", (c: any) => (data += c));
            s.on("end", () => resolve(data));
          })
          .catch(() => resolve(""));
      });
      return output
        .split("\n")
        .filter((line) => line.includes("package:"))
        .map((line) => line.replace("package:", "").trim())
        .filter((pkg) => pkg.length > 0);
    };

    const [systemPkgs, thirdPkgs, disabledPkgs] = await Promise.all([
      execCmd("pm list packages -s"),
      execCmd("pm list packages -3"),
      execCmd("pm list packages -d"),
    ]);

    const sysSet = new Set(systemPkgs);
    const disabledSet = new Set(disabledPkgs);

    const allPkgs = new Set<string>();
    if (filter === "all" || filter === "system")
      systemPkgs.forEach((p) => allPkgs.add(p));
    if (filter === "all" || filter === "third")
      thirdPkgs.forEach((p) => allPkgs.add(p));

    if (filter === "all") {
      const allList = await execCmd("pm list packages");
      allList.forEach((p) => allPkgs.add(p));
    }

    const result: AppInfo[] = [];
    allPkgs.forEach((pkg) => {
      result.push({
        pkg,
        type: sysSet.has(pkg) ? "system" : "user",
        status: disabledSet.has(pkg) ? "disabled" : "enabled",
      });
    });

    return result;
  } catch (err) {
    console.error("Failed to get packages:", err);
    return [];
  }
}

const BLACKLIST = [
  "android",
  "com.android.systemui",
  "com.android.settings",
  "com.android.phone",
  "com.android.contacts",
  "com.miui.securitycenter",
];

export async function manageApp(
  deviceId: string,
  pkgName: string,
  action: "uninstall" | "disable" | "enable" | "clear" | "stop" | "restore",
  onLog: (log: string) => void,
) {
  try {
    if (
      (action === "uninstall" || action === "disable") &&
      BLACKLIST.includes(pkgName)
    ) {
      onLog(
        `[CRITICAL] Ứng dụng ${pkgName} là gói hệ thống cốt lõi. Đã CHẶN thao tác để tránh hard-brick!`,
      );
      return {
        success: false,
        output: "Bị chặn bởi hệ thống bảo vệ (Blacklist).",
      };
    }

    let cmd = "";
    switch (action) {
      case "uninstall":
        cmd = `pm uninstall -k --user 0 ${pkgName}`;
        break;
      case "disable":
        cmd = `pm disable-user --user 0 ${pkgName}`;
        break;
      case "enable":
        cmd = `pm enable ${pkgName}`;
        break;
      case "restore":
        cmd = `cmd package install-existing ${pkgName}`;
        break;
      case "clear":
        cmd = `pm clear ${pkgName}`;
        break;
      case "stop":
        cmd = `am force-stop ${pkgName}`;

        break;
    }

    onLog(`Đang thực thi: ${cmd}`);

    const output = await new Promise<string>((resolve) => {
      let data = "";
      adbState.client.shell(deviceId, cmd).then((s: any) => {
        s.on("data", (c: any) => (data += c));
        s.on("end", () => resolve(data));
      });
    });

    const outLower = output.toLowerCase();
    const isSuccess =
      !outLower.includes("failure") &&
      !outLower.includes("error") &&
      !outLower.includes("exception") &&
      !outLower.includes("denied");

    onLog(`Kết quả: ${output.trim()}`);
    return { success: isSuccess, output: output.trim() };
  } catch (err: any) {
    onLog(`Lỗi khi ${action} ứng dụng ${pkgName}: ${err.message}`);
    return { success: false, output: err.message };
  }
}

// Trích xuất APK
export async function extractApp(
  deviceId: string,
  pkgName: string,
  destPath: string,
  onLog: (log: string) => void,
) {
  try {
    onLog(`Đang trích xuất APK của ${pkgName}...`);

    // 1. Lấy đường dẫn APK trên thiết bị
    const pathOutput = await new Promise<string>((resolve) => {
      let data = "";
      adbState.client.shell(deviceId, `pm path ${pkgName}`).then((s: any) => {
        s.on("data", (c: any) => (data += c));
        s.on("end", () => resolve(data.trim()));
      });
    });

    const apkPath = pathOutput.replace("package:", "").trim();
    if (!apkPath) throw new Error("Không tìm thấy đường dẫn APK");

    onLog(`Đường dẫn: ${apkPath}`);

    // 2. Pull file về PC
    const transfer = await adbState.client.pull(deviceId, apkPath);
    return new Promise((resolve, reject) => {
      const fs = require("fs");
      const outStream = fs.createWriteStream(destPath);
      transfer.on("progress", (stats: any) => {
        onLog(
          `Đang tải: ${(stats.bytesTransferred / 1024 / 1024).toFixed(2)} MB...`,
        );
      });
      transfer.on("end", () => {
        onLog(`Trích xuất thành công: ${destPath}`);
        resolve(true);
      });
      transfer.on("error", (err: any) => {
        onLog(`Lỗi pull file: ${err.message}`);
        reject(err);
      });
      transfer.pipe(outStream);
    });
  } catch (err: any) {
    onLog(`Lỗi trích xuất: ${err.message}`);
    return false;
  }
}

// Cài đặt APK
export async function installApk(
  deviceId: string,
  apkPath: string,
  onLog: (log: string) => void,
) {
  try {
    onLog(`Đang cài đặt APK: ${apkPath}...`);
    // Đẩy file lên thiết bị trước
    const remotePath = `/data/local/tmp/${Date.now()}.apk`;
    const transfer = await adbState.client.push(deviceId, apkPath, remotePath);
    await new Promise((resolve, reject) => {
      transfer.on("end", resolve);
      transfer.on("error", reject);
    });

    // Cài đặt bằng pm install với các flag mạnh mẽ
    const output = await new Promise<string>((resolve) => {
      let data = "";
      // -r: Reinstall, -d: Allow downgrade, -t: Allow test packages, -g: Grant all permissions
      adbState.client
        .shell(deviceId, `pm install -r -d -t -g "${remotePath}"`)
        .then((s: any) => {
          s.on("data", (c: any) => (data += c));
          s.on("end", () => resolve(data.trim()));
        });
    });

    // Xoá file tạm
    await adbState.client.shell(deviceId, `rm "${remotePath}"`);

    if (output.toLowerCase().includes("success")) {
      onLog("Cài đặt hoàn tất thành công!");
      return true;
    } else {
      onLog(`Lỗi cài đặt: ${output}`);
      return false;
    }
  } catch (err: any) {
    onLog(`Lỗi hệ thống: ${err.message}`);
    return false;
  }
}
// --- File Manager Operations ---

export async function listDirectory(deviceId: string, remotePath: string) {
  try {
    if (!deviceId) throw new Error("Device ID is required");

    // Timeout for readdir
    const files = await Promise.race([
      adbState.client.readdir(deviceId, remotePath),
      new Promise<any[]>((_, reject) =>
        setTimeout(() => reject(new Error("Read Directory Timeout")), 8000),
      ),
    ]);

    return files
      .map((file: any) => ({
        name: file.name,
        size: file.size,
        mtime: file.mtime,
        mode: file.mode,
        isDir: (file.mode & 0o040000) === 0o040000,
        isFile: (file.mode & 0o100000) === 0o100000,
      }))
      .sort((a: any, b: any) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
      });
  } catch (err: any) {
    console.error(`Failed to list directory ${remotePath}:`, err);
    throw err;
  }
}

export async function createDirectory(deviceId: string, remotePath: string) {
  try {
    await adbState.client.shell(deviceId, `mkdir -p "${remotePath}"`);
    return true;
  } catch (err) {
    console.error(`Failed to create directory ${remotePath}:`, err);
    return false;
  }
}

export async function deleteFile(deviceId: string, remotePath: string) {
  try {
    // rm -rf for both files and directories
    await adbState.client.shell(deviceId, `rm -rf "${remotePath}"`);
    return true;
  } catch (err) {
    console.error(`Failed to delete ${remotePath}:`, err);
    return false;
  }
}

export async function renameFile(
  deviceId: string,
  oldPath: string,
  newPath: string,
) {
  try {
    await adbState.client.shell(deviceId, `mv "${oldPath}" "${newPath}"`);
    return true;
  } catch (err) {
    console.error(`Failed to rename ${oldPath} to ${newPath}:`, err);
    return false;
  }
}

export async function pushFile(
  deviceId: string,
  localPath: string,
  remotePath: string,
  onLog: (log: string) => void,
) {
  try {
    onLog(`Đang tải lên: ${path.basename(localPath)} -> ${remotePath}`);
    const transfer = await adbState.client.push(
      deviceId,
      localPath,
      remotePath,
    );
    return new Promise((resolve, reject) => {
      transfer.on("progress", (stats: any) => {
        onLog(
          `Đang đẩy file: ${(stats.bytesTransferred / 1024 / 1024).toFixed(2)} MB...`,
        );
      });
      transfer.on("end", () => {
        onLog(`Tải lên thành công!`);
        resolve(true);
      });
      transfer.on("error", (err: any) => {
        onLog(`Lỗi tải lên: ${err.message}`);
        reject(err);
      });
    });
  } catch (err: any) {
    onLog(`Lỗi hệ thống khi đẩy file: ${err.message}`);
    return false;
  }
}

export async function pullFile(
  deviceId: string,
  remotePath: string,
  localPath: string,
  onLog: (log: string) => void,
) {
  try {
    onLog(`Đang tải về: ${remotePath} -> ${localPath}`);
    const transfer = await adbState.client.pull(deviceId, remotePath);
    return new Promise((resolve, reject) => {
      const fs = require("fs");
      const outStream = fs.createWriteStream(localPath);
      transfer.on("progress", (stats: any) => {
        onLog(
          `Đang kéo file: ${(stats.bytesTransferred / 1024 / 1024).toFixed(2)} MB...`,
        );
      });
      transfer.on("end", () => {
        onLog(`Tải về thành công!`);
        resolve(true);
      });
      transfer.on("error", (err: any) => {
        onLog(`Lỗi tải về: ${err.message}`);
        reject(err);
      });
      transfer.pipe(outStream);
    });
  } catch (err: any) {
    onLog(`Lỗi hệ thống khi kéo file: ${err.message}`);
    return false;
  }
}

export async function getFileBase64(deviceId: string, remotePath: string) {
  try {
    const transfer = await adbState.client.pull(deviceId, remotePath);
    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      transfer.on("data", (chunk: Buffer) => chunks.push(chunk));
      transfer.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString("base64"));
      });
      transfer.on("error", (err: any) => {
        console.error("Transfer error:", err);
        reject(err);
      });
    });
  } catch (err: any) {
    console.error(`getFileBase64 Error: ${err.message}`);
    throw err;
  }
}

export async function getStoragePoints(deviceId: string) {
  // Clean deviceId (remove any parentheses or extra info)
  const cleanId = deviceId.split(" ")[0].trim();

  try {
    const output = await Promise.race([
      new Promise<string>((resolve, reject) => {
        let data = "";
        adbState.client
          .shell(cleanId, "df")
          .then((s: any) => {
            s.on("data", (c: any) => (data += c));
            s.on("end", () => resolve(data));
            s.on("error", reject);
          })
          .catch(reject);
      }),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("ADB Timeout")), 4000),
      ),
    ]);

    console.log(`Raw DF Output: ${output}`);
    const lines = output.split("\n");
    const storagePoints: any[] = [];

    const getPhysicalSize = (totalGB: number) => {
      const standards = [8, 16, 32, 64, 128, 256, 512, 1024];
      for (const s of standards) {
        if (totalGB <= s * 0.95) return s;
      }
      return Math.ceil(totalGB / 128) * 128;
    };

    // Parse Internal Storage (/data or /sdcard or /storage/emulated/0)
    const internalLine =
      lines.find((l) => l.includes(" /data")) ||
      lines.find((l) => l.includes("/storage/emulated")) ||
      lines.find((l) => l.includes("/sdcard"));

    if (internalLine) {
      const parts = internalLine.trim().split(/\s+/);
      if (parts.length >= 4) {
        const total1K = parseInt(parts[1]) || 0;
        const avail1K = parseInt(parts[3]) || 0;
        const totalGB = total1K / 1024 / 1024;
        const availGB = avail1K / 1024 / 1024;
        const physicalGB = getPhysicalSize(totalGB);
        const usedGB = Math.max(0, physicalGB - availGB);

        storagePoints.push({
          name: "Bộ nhớ trong",
          path: "/sdcard",
          type: "internal",
          total: physicalGB * 1024 * 1024 * 1024,
          used: usedGB * 1024 * 1024 * 1024,
          percent: Math.max(
            0,
            Math.min(100, Math.round((usedGB / physicalGB) * 100)),
          ),
        });
      }
    }

    // Parse External Storage
    lines.forEach((line) => {
      if (
        line.includes("/storage/") &&
        !line.includes("/emulated") &&
        !line.includes("self")
      ) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const mountPath = parts[parts.length - 1];
          const id = mountPath.split("/").pop();
          const total1K = parseInt(parts[1]) || 0;
          const avail1K = parseInt(parts[3]) || 0;
          if (total1K > 0) {
            storagePoints.push({
              name: `Thẻ nhớ (${id})`,
              path: mountPath,
              type: "external",
              total: total1K * 1024,
              used: (total1K - avail1K) * 1024,
              percent: Math.max(
                0,
                Math.min(
                  100,
                  Math.round(((total1K - avail1K) / total1K) * 100),
                ),
              ),
            });
          }
        }
      }
    });

    // Fallback: If no storage points found, at least provide /sdcard
    if (storagePoints.length === 0) {
      storagePoints.push({
        name: "Bộ nhớ trong",
        path: "/sdcard",
        type: "internal",
        total: 0,
        used: 0,
        percent: 0,
      });
    }

    return storagePoints;
  } catch (err) {
    console.error("getStoragePoints Error:", err);
    return [
      {
        name: "Bộ nhớ trong",
        path: "/sdcard",
        type: "internal",
        total: 0,
        used: 0,
        percent: 0,
      },
    ];
  }
}

/**
 * execAdb — Hàm thực thi lệnh ADB chung.
 * Bây giờ có tích hợp lớp an toàn (evaluateCommand) để chặn lệnh nguy hiểm.
 */
export async function execAdb(
  deviceId: string,
  command: string,
): Promise<string> {
  // ── Kiểm tra an toàn ─────────────────────────────────────────────────────
  // Loại bỏ tiền tố "shell " để đánh giá lệnh thực tế
  let cleanCmd = command;
  if (cleanCmd.startsWith("shell ")) {
    cleanCmd = cleanCmd.substring(6);
  }
  cleanCmd = cleanCmd.trim();

  if (cleanCmd) {
    const safety = evaluateCommand(cleanCmd);
    if (!safety.allowed) {
      return `[BLOCKED BY SAFETY LAYER] ${safety.reason || "Lệnh không được phép thực thi."} [${safety.risk}]`;
    }
  }

  return new Promise<string>((resolve, reject) => {
    let data = "";
    adbState.client
      .shell(deviceId, cleanCmd)
      .then((stream: any) => {
        stream.on("data", (c: any) => {
          data += c.toString();
        });
        stream.on("end", () => {
          resolve(data);
        });
        stream.on("error", (err: any) => {
          reject(err);
        });
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type RiskLevel = "SAFE" | "RISKY" | "KEEP";
export type DebloatAction = "uninstall" | "disable" | "restore";
export type PkgStatus = "installed" | "disabled" | "uninstalled";
export type TweakType =
  | "settings_global"
  | "settings_system"
  | "settings_secure"
  | "pm_disable"
  | "wm";

export interface BloatwareEntry {
  package: string;
  name: string;
  description: string;
  risk: RiskLevel;
  category: string;
  /** true = dùng pm disable-user (giữ APK), false = pm uninstall --user 0 */
  preferDisable?: boolean;
}

export interface BloatwareWithStatus extends BloatwareEntry {
  status: PkgStatus;
}

export interface SystemTweak {
  id: string;
  label: string;
  description: string;
  category: "performance" | "privacy" | "display" | "battery";
  risk: RiskLevel;
  /** Lệnh để BẬT tweak */
  enableCmd: string;
  /** Lệnh để TẮT/khôi phục */
  disableCmd: string;
  /** Lệnh đọc trạng thái hiện tại, trả về string */
  readCmd?: string;
  /** Giá trị khi đang BẬT */
  enabledValue?: string;
  defaultEnabled: boolean;
}

// ─── BLOATWARE DATABASE ───────────────────────────────────────────────────────

/**
 * Đọc xiaomi_bloatware_removal.json từ thư mục gốc app (resources/).
 * Trả về danh sách BloatwareEntry. Không bao giờ trả null — fallback = [].
 */
export function getBloatwareDb(): BloatwareEntry[] {
  const candidates = [
    path.join(app.getAppPath(), "xiaomi_bloatware_removal.json"),
    path.join(app.getAppPath(), "..", "xiaomi_bloatware_removal.json"),
    path.join(process.resourcesPath ?? "", "xiaomi_bloatware_removal.json"),
    path.join(__dirname, "../../xiaomi_bloatware_removal.json"),
    path.join(__dirname, "../../../xiaomi_bloatware_removal.json"),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, "utf-8");
        const parsed = JSON.parse(raw) as BloatwareEntry[];
        return parsed.filter((e) => e.package && e.risk !== "KEEP");
      }
    } catch {
      // thử path kế
    }
  }

  // Fallback nội tuyến — danh sách curated SAFE + RISKY đã được verify
  return BUILTIN_BLOATWARE_DB;
}

/**
 * Kiểm tra trạng thái một package trên thiết bị.
 */
export async function getPackageStatus(
  deviceId: string,
  packageName: string,
): Promise<PkgStatus> {
  try {
    const [allOut, disabledOut] = await Promise.all([
      execAdb(deviceId, `shell pm list packages ${packageName}`),
      execAdb(deviceId, `shell pm list packages -d ${packageName}`),
    ]);

    const inDisabled = disabledOut.includes(packageName);
    const inAll = allOut.includes(packageName);

    if (inDisabled) return "disabled";
    if (inAll) return "installed";
    return "uninstalled";
  } catch {
    return "uninstalled";
  }
}

/**
 * Lấy trạng thái hàng loạt — batch để tránh gọi ADB quá nhiều lần.
 */
export async function getBloatwareWithStatus(
  deviceId: string,
): Promise<BloatwareWithStatus[]> {
  const db = getBloatwareDb();

  // Lấy tất cả packages + disabled packages trong 2 lệnh
  const [allRaw, disabledRaw] = await Promise.all([
    execAdb(deviceId, "shell pm list packages"),
    execAdb(deviceId, "shell pm list packages -d"),
  ]);

  const allPkgs = new Set(
    allRaw
      .split("\n")
      .map((l) => l.replace("package:", "").trim())
      .filter(Boolean),
  );
  const disabledPkgs = new Set(
    disabledRaw
      .split("\n")
      .map((l) => l.replace("package:", "").trim())
      .filter(Boolean),
  );

  return db.map((entry): BloatwareWithStatus => {
    let status: PkgStatus = "uninstalled";
    if (disabledPkgs.has(entry.package)) status = "disabled";
    else if (allPkgs.has(entry.package)) status = "installed";
    return { ...entry, status };
  });
}

// ─── DEBLOAT ACTIONS ──────────────────────────────────────────────────────────

/** Danh sách package tuyệt đối không được chạm vào */
const PROTECTED_PACKAGES = new Set([
  "com.android.phone",
  "com.android.settings",
  "com.android.systemui",
  "com.android.launcher3",
  "com.miui.home",
  "com.miui.core",
  "com.android.contacts",
  "com.android.dialer",
  "android",
  "com.android.inputmethod.latin",
  "com.android.server.telecom",
  "com.qualcomm.qti.telephony.vodafoneplugin",
]);

export async function debloatPackage(
  deviceId: string,
  packageName: string,
  action: DebloatAction,
  preferDisable = false,
): Promise<{ success: boolean; message: string }> {
  // SAFETY: chặn package cốt lõi
  if (PROTECTED_PACKAGES.has(packageName)) {
    return {
      success: false,
      message: `[BLOCKED] ${packageName} là package hệ thống cốt lõi — không thể can thiệp.`,
    };
  }

  try {
    let cmd: string;
    switch (action) {
      case "uninstall":
        cmd = preferDisable
          ? `shell pm disable-user --user 0 ${packageName}`
          : `shell pm uninstall --user 0 ${packageName}`;
        break;
      case "disable":
        cmd = `shell pm disable-user --user 0 ${packageName}`;
        break;
      case "restore":
        cmd = `shell pm install-existing --user 0 ${packageName}`;
        break;
    }

    const output = await execAdb(deviceId, cmd);
    const success =
      output.includes("Success") ||
      output.includes("success") ||
      action === "restore";
    return { success, message: output.trim() };
  } catch (err: any) {
    return { success: false, message: err.message ?? "Unknown error" };
  }
}

/** Batch debloat — trả về mảng kết quả cho mỗi package */
export async function batchDebloat(
  deviceId: string,
  packages: Array<{ package: string; preferDisable?: boolean }>,
  action: DebloatAction,
  onProgress?: (done: number, total: number) => void,
): Promise<Array<{ package: string; success: boolean; message: string }>> {
  const results = [];
  for (let i = 0; i < packages.length; i++) {
    const { package: pkg, preferDisable } = packages[i];
    const result = await debloatPackage(
      deviceId,
      pkg,
      action,
      preferDisable ?? false,
    );
    results.push({ package: pkg, ...result });
    onProgress?.(i + 1, packages.length);
  }
  return results;
}

// ─── SYSTEM TWEAKS ────────────────────────────────────────────────────────────

export const SYSTEM_TWEAKS: SystemTweak[] = [
  // ── Animation ────────────────────────────────────────────────────────────
  {
    id: "anim_window",
    label: "Window Animation Scale",
    description: "Đặt tốc độ hoạt ảnh cửa sổ về 0.5x",
    category: "performance",
    risk: "SAFE",
    enableCmd: "shell settings put global window_animation_scale 0.5",
    disableCmd: "shell settings put global window_animation_scale 1.0",
    readCmd: "shell settings get global window_animation_scale",
    enabledValue: "0.5",
    defaultEnabled: false,
  },
  {
    id: "anim_transition",
    label: "Transition Animation Scale",
    description: "Giảm hoạt ảnh chuyển màn hình xuống 0.5x",
    category: "performance",
    risk: "SAFE",
    enableCmd: "shell settings put global transition_animation_scale 0.5",
    disableCmd: "shell settings put global transition_animation_scale 1.0",
    readCmd: "shell settings get global transition_animation_scale",
    enabledValue: "0.5",
    defaultEnabled: false,
  },
  {
    id: "anim_animator",
    label: "Animator Duration Scale",
    description: "Tăng tốc thời gian chạy animator",
    category: "performance",
    risk: "SAFE",
    enableCmd: "shell settings put global animator_duration_scale 0.5",
    disableCmd: "shell settings put global animator_duration_scale 1.0",
    readCmd: "shell settings get global animator_duration_scale",
    enabledValue: "0.5",
    defaultEnabled: false,
  },

  // ── MIUI/HyperOS Specific ────────────────────────────────────────────────
  {
    id: "miui_optimization",
    label: "Tắt MIUI Optimization",
    description:
      "Stock Android experience, tắt MIUI app lifecycle management (có thể ảnh hưởng một số tính năng Xiaomi)",
    category: "performance",
    risk: "RISKY",
    enableCmd: "shell settings put secure miui_optimization 0",
    disableCmd: "shell settings put secure miui_optimization 1",
    readCmd: "shell settings get secure miui_optimization",
    enabledValue: "0",
    defaultEnabled: false,
  },
  {
    id: "force_gpu",
    label: "Force GPU Rendering",
    description:
      "Ép toàn bộ 2D render qua GPU thay vì CPU (cải thiện UI trên một số thiết bị)",
    category: "performance",
    risk: "SAFE",
    enableCmd: "shell settings put system force_hw_ui 1",
    disableCmd: "shell settings put system force_hw_ui 0",
    readCmd: "shell settings get system force_hw_ui",
    enabledValue: "1",
    defaultEnabled: false,
  },
  {
    id: "bg_process_limit",
    label: "Giới hạn Background Process",
    description: "Giới hạn số app chạy nền xuống 4 (tiết kiệm RAM)",
    category: "battery",
    risk: "RISKY",
    enableCmd: "shell settings put global background_process_limit 4",
    disableCmd: "shell settings put global background_process_limit 0",
    readCmd: "shell settings get global background_process_limit",
    enabledValue: "4",
    defaultEnabled: false,
  },

  // ── Privacy & Telemetry ──────────────────────────────────────────────────
  {
    id: "disable_analytics",
    label: "Vô hiệu hóa MIUI Analytics",
    description:
      "Tắt package thu thập dữ liệu com.miui.analytics qua pm disable",
    category: "privacy",
    risk: "SAFE",
    enableCmd: "shell pm disable-user --user 0 com.miui.analytics",
    disableCmd: "shell pm install-existing --user 0 com.miui.analytics",
    readCmd: "shell pm list packages -d com.miui.analytics",
    enabledValue: "package:com.miui.analytics",
    defaultEnabled: false,
  },
  {
    id: "disable_msa",
    label: "Vô hiệu hóa MSA (MIUI System Ads)",
    description: "Tắt dịch vụ quảng cáo hệ thống MIUI",
    category: "privacy",
    risk: "SAFE",
    enableCmd: "shell pm disable-user --user 0 com.miui.msa.global",
    disableCmd: "shell pm install-existing --user 0 com.miui.msa.global",
    readCmd: "shell pm list packages -d com.miui.msa.global",
    enabledValue: "package:com.miui.msa.global",
    defaultEnabled: false,
  },
  {
    id: "ad_id_limit",
    label: "Giới hạn Ad ID Tracking",
    description: "Bật giới hạn theo dõi quảng cáo (limit_ad_tracking)",
    category: "privacy",
    risk: "SAFE",
    enableCmd: "shell settings put secure limit_ad_tracking 1",
    disableCmd: "shell settings put secure limit_ad_tracking 0",
    readCmd: "shell settings get secure limit_ad_tracking",
    enabledValue: "1",
    defaultEnabled: false,
  },
  {
    id: "disable_joyose",
    label: "Tắt Joyose (Thermal Controller)",
    description:
      "Tắt Xiaomi Joyose — giải phóng throttle CPU/GPU. CẢNH BÁO: có thể gây nóng máy khi gaming nặng",
    category: "performance",
    risk: "RISKY",
    enableCmd: "shell pm disable-user --user 0 com.xiaomi.joyose",
    disableCmd: "shell pm install-existing --user 0 com.xiaomi.joyose",
    readCmd: "shell pm list packages -d com.xiaomi.joyose",
    enabledValue: "package:com.xiaomi.joyose",
    defaultEnabled: false,
  },
  {
    id: "disable_daemon",
    label: "Tắt MIUI Daemon",
    description: "Tắt System Daemon (phân tích dữ liệu nền, không cần thiết)",
    category: "privacy",
    risk: "SAFE",
    enableCmd: "shell pm disable-user --user 0 com.miui.daemon",
    disableCmd: "shell pm install-existing --user 0 com.miui.daemon",
    readCmd: "shell pm list packages -d com.miui.daemon",
    enabledValue: "package:com.miui.daemon",
    defaultEnabled: false,
  },
  {
    id: "disable_quickapp",
    label: "Tắt Quick App Service (Hybrid)",
    description:
      "Tắt framework Quick App — nguồn gốc nhiều quảng cáo trong app system",
    category: "privacy",
    risk: "SAFE",
    enableCmd: "shell pm disable-user --user 0 com.miui.hybrid",
    disableCmd: "shell pm install-existing --user 0 com.miui.hybrid",
    readCmd: "shell pm list packages -d com.miui.hybrid",
    enabledValue: "package:com.miui.hybrid",
    defaultEnabled: false,
  },

  // ── Display ───────────────────────────────────────────────────────────────
  {
    id: "fps_overlay",
    label: "Hiển thị tần số quét trên màn hình",
    description: "Hiện số Hz (tần số quét) ở góc màn hình (MIUI/HyperOS)",
    category: "display",
    risk: "SAFE",
    enableCmd: "shell settings put system show_refresh_rate 1",
    disableCmd: "shell settings put system show_refresh_rate 0",
    readCmd: "shell settings get system show_refresh_rate",
    enabledValue: "1",
    defaultEnabled: false,
  },
  {
    id: "screensaver_off",
    label: "Tắt Screensaver khi sạc",
    description: "Tắt Daydream/Screensaver khi thiết bị cắm sạc",
    category: "display",
    risk: "SAFE",
    enableCmd: "shell settings put secure screensaver_enabled 0",
    disableCmd: "shell settings put secure screensaver_enabled 1",
    readCmd: "shell settings get secure screensaver_enabled",
    enabledValue: "0",
    defaultEnabled: false,
  },
];

/**
 * Đọc trạng thái thực tế của một tweak trực tiếp từ thiết bị.
 */
export async function getTweakStatus(
  deviceId: string,
  tweak: SystemTweak,
): Promise<boolean> {
  if (!tweak.readCmd) return tweak.defaultEnabled;
  try {
    const output = (await execAdb(deviceId, tweak.readCmd)).trim();
    return output === tweak.enabledValue;
  } catch {
    return tweak.defaultEnabled;
  }
}

/** Áp dụng một tweak (bật hoặc tắt) */
export async function applyTweak(
  deviceId: string,
  tweak: SystemTweak,
  enable: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    const cmd = enable ? tweak.enableCmd : tweak.disableCmd;
    const output = await execAdb(deviceId, cmd);
    return { success: true, message: output.trim() || "OK" };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// ─── DISPLAY TWEAKS ───────────────────────────────────────────────────────────

export async function getCurrentDpi(deviceId: string): Promise<number | null> {
  try {
    const out = await execAdb(deviceId, "shell wm density");
    const match =
      out.match(/Override density:\s*(\d+)/) ??
      out.match(/Physical density:\s*(\d+)/);
    return match ? parseInt(match[1]) : null;
  } catch {
    return null;
  }
}

export async function getCurrentResolution(
  deviceId: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const out = await execAdb(deviceId, "shell wm size");
    const match =
      out.match(/Override size:\s*(\d+)x(\d+)/) ??
      out.match(/Physical size:\s*(\d+)x(\d+)/);
    return match
      ? { width: parseInt(match[1]), height: parseInt(match[2]) }
      : null;
  } catch {
    return null;
  }
}

export async function setDpi(
  deviceId: string,
  dpi: number,
): Promise<{ success: boolean; message: string }> {
  if (dpi < 100 || dpi > 640) {
    return { success: false, message: "DPI phải nằm trong khoảng 100–640" };
  }
  try {
    await execAdb(deviceId, `shell wm density ${dpi}`);
    return { success: true, message: `DPI đã đặt thành ${dpi}` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function resetDpi(
  deviceId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await execAdb(deviceId, "shell wm density reset");
    return { success: true, message: "DPI đã khôi phục về mặc định" };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function setResolution(
  deviceId: string,
  width: number,
  height: number,
): Promise<{ success: boolean; message: string }> {
  try {
    await execAdb(deviceId, `shell wm size ${width}x${height}`);
    return {
      success: true,
      message: `Độ phân giải đặt thành ${width}x${height}`,
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function resetResolution(
  deviceId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await execAdb(deviceId, "shell wm size reset");
    return { success: true, message: "Độ phân giải đã khôi phục về mặc định" };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/** Đặt animation scales theo preset */
export async function setAnimationScale(
  deviceId: string,
  scale: 0 | 0.5 | 1.0,
): Promise<void> {
  const keys = [
    "window_animation_scale",
    "transition_animation_scale",
    "animator_duration_scale",
  ];
  await Promise.all(
    keys.map((k) =>
      execAdb(deviceId, `shell settings put global ${k} ${scale}`),
    ),
  );
}

// ─── BUILT-IN BLOATWARE DB (Fallback) ────────────────────────────────────────

const BUILTIN_BLOATWARE_DB: BloatwareEntry[] = [
  // ── Ad & Analytics ─────────────────────────────────────────────────────
  {
    package: "com.miui.analytics",
    name: "MIUI Analytics",
    description: "Thu thập dữ liệu sử dụng gửi về Xiaomi",
    risk: "SAFE",
    category: "Telemetry",
  },
  {
    package: "com.miui.msa.global",
    name: "MSA (MIUI System Ads)",
    description: "Dịch vụ quảng cáo hệ thống MIUI",
    risk: "SAFE",
    category: "Ads",
  },
  {
    package: "com.xiaomi.joyose",
    name: "Joyose",
    description:
      "Thermal controller, giới hạn CPU/GPU — tắt sẽ tăng hiệu năng nhưng có thể gây nóng máy",
    risk: "RISKY",
    category: "System Service",
    preferDisable: true,
  },
  {
    package: "com.miui.daemon",
    name: "MIUI Daemon",
    description: "System Daemon phân tích dữ liệu nền",
    risk: "SAFE",
    category: "Telemetry",
    preferDisable: true,
  },
  {
    package: "com.miui.hybrid",
    name: "Quick App Service",
    description: "Framework Quick App — nguồn gốc quảng cáo trong app system",
    risk: "SAFE",
    category: "Ads",
    preferDisable: true,
  },
  // ── Xiaomi Ecosystem ────────────────────────────────────────────────────
  {
    package: "com.mi.globalminusscreen",
    name: "App Vault / Minus Screen",
    description: "Màn hình gạt trái trên Launcher hiển thị news & quảng cáo",
    risk: "SAFE",
    category: "Bloatware",
  },
  {
    package: "com.miui.videoplayer",
    name: "Mi Video",
    description: "Trình phát video Xiaomi có quảng cáo",
    risk: "SAFE",
    category: "Media",
  },
  {
    package: "com.miui.player",
    name: "Mi Music",
    description: "Ứng dụng nghe nhạc Xiaomi có quảng cáo",
    risk: "SAFE",
    category: "Media",
  },
  {
    package: "com.miui.yellowpage",
    name: "Xiaomi Yellow Pages",
    description: "Danh bạ vàng Xiaomi — ít dùng",
    risk: "SAFE",
    category: "Bloatware",
  },
  {
    package: "com.miui.miservice",
    name: "Mi Service Framework",
    description: "Framework dịch vụ Xiaomi cho các app phụ trợ",
    risk: "RISKY",
    category: "System Service",
    preferDisable: true,
  },
  {
    package: "com.xiaomi.payment",
    name: "Mi Payment Center",
    description: "Trung tâm thanh toán Xiaomi — không cần nếu không dùng",
    risk: "SAFE",
    category: "Finance",
  },
  {
    package: "com.xiaomi.aicr",
    name: "Xiaomi AI Engine",
    description: "AI engine nền của Xiaomi",
    risk: "RISKY",
    category: "AI Service",
    preferDisable: true,
  },
  // ── Cloud & Backup ──────────────────────────────────────────────────────
  {
    package: "com.miui.cloudservice",
    name: "MIUI Cloud Service",
    description: "Đồng bộ dữ liệu lên Xiaomi Cloud",
    risk: "SAFE",
    category: "Cloud",
  },
  {
    package: "com.miui.cloudbackup",
    name: "MIUI Cloud Backup",
    description: "Sao lưu lên Xiaomi Cloud",
    risk: "SAFE",
    category: "Cloud",
  },
  // ── Preinstalled Apps ───────────────────────────────────────────────────
  {
    package: "com.miui.compass",
    name: "Mi Compass",
    description: "La bàn Xiaomi",
    risk: "SAFE",
    category: "Preinstalled App",
  },
  {
    package: "com.miui.calculator",
    name: "Mi Calculator",
    description: "Máy tính Xiaomi (có thể thay bằng Google Calculator)",
    risk: "SAFE",
    category: "Preinstalled App",
  },
  {
    package: "cn.wps.xiaomi.abroad.lite",
    name: "Xiaomi WPS Reader",
    description: "Ứng dụng đọc tài liệu WPS Lite",
    risk: "SAFE",
    category: "Preinstalled App",
  },
  {
    package: "com.miui.bugreport",
    name: "Bug Report Tool",
    description:
      "Công cụ báo lỗi Xiaomi — không cần với người dùng thông thường",
    risk: "SAFE",
    category: "System Tool",
  },
  {
    package: "com.android.egg",
    name: "Android Easter Egg",
    description: "Easter Egg ẩn của Android — hoàn toàn không cần thiết",
    risk: "SAFE",
    category: "Bloatware",
  },
  {
    package: "com.android.traceur",
    name: "Android Traceur",
    description:
      "Công cụ trace hệ thống cho developer — không cần với user thường",
    risk: "SAFE",
    category: "System Tool",
  },
  {
    package: "com.android.stk",
    name: "SIM Toolkit",
    description: "SIM Toolkit — chỉ cần nếu nhà mạng yêu cầu",
    risk: "RISKY",
    category: "Carrier",
  },
  {
    package: "com.android.carrierdefaultapp",
    name: "Carrier Default App",
    description: "App mặc định nhà mạng",
    risk: "RISKY",
    category: "Carrier",
  },
  {
    package: "com.android.managedprovisioning",
    name: "Managed Provisioning",
    description:
      "Dự phòng quản lý doanh nghiệp — không cần với thiết bị cá nhân",
    risk: "SAFE",
    category: "Enterprise",
  },
  // ── Google Bloatware ────────────────────────────────────────────────────
  {
    package: "com.google.android.as.oss",
    name: "Google Private Compute Services",
    description: "Service AI của Google chạy nền — có thể tắt để tiết kiệm RAM",
    risk: "RISKY",
    category: "Google",
    preferDisable: true,
  },
];
