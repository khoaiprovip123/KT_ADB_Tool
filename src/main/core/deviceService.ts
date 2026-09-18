import * as path from "path";
import util from "util";
import { app } from "electron";
import { exec, spawn } from "child_process";
import { adbState } from "./adbCore";

const execPromise = util.promisify(exec);

export { getDeviceInfo } from "./deviceInfoService";

function getAdbExe(): string {
  const binPath = app.isPackaged
    ? path.join(process.resourcesPath, "bin")
    : path.join(__dirname, "../../resources/bin");
  return path.join(binPath, "adb.exe");
}

import {
  getDeviceAspectRatio,
  stopScrcpyWindowController,
  cleanupAllWindowControllers,
} from "./scrcpyWindowController";

const activeScrcpyProcesses = new Map<string, any>();
const IP_REGEX = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?::[0-9]{1,5})?$/;
const PAIR_CODE_REGEX = /^\d{6}$/;

/**
 * Phân giải target cho Scrcpy:
 * Scrcpy 2.4 (C-code) gặp lỗi phân tích khi serial trong `adb devices` chứa khoảng trắng
 * (ví dụ thiết bị mDNS Android 11+ bị trùng tên: `adb-... (2)._adb-tls-connect._tcp`).
 * Khi phát hiện serial dạng mDNS hoặc chứa khoảng trắng, hàm này tự động:
 * 1. Tra cứu IP:Port thực tế từ `adb mdns services`.
 * 2. Kết nối sẵn sàng qua `adb connect <ip:port>`.
 * 3. Trả về `<ip:port>` chuẩn để Scrcpy kết nối trực tiếp, triệt tiêu hoàn toàn lỗi crash/exit 0.
 */
async function resolveScrcpyTarget(
  deviceId: string,
  onLog: (log: string) => void,
): Promise<string> {
  if (!deviceId.includes(" ") && !deviceId.includes("._tcp")) {
    return deviceId;
  }

  const adbExe = getAdbExe();

  // 1. Thử tra cứu từ `adb mdns services`
  try {
    const { stdout } = await execPromise(`"${adbExe}" mdns services`, {
      windowsHide: true,
      timeout: 3000,
    });
    const lines = stdout.split("\n");
    for (const line of lines) {
      const parts = line.trim().split(/\t+|\s{2,}/);
      if (parts.length >= 3) {
        const svcName = parts[0].trim();
        const svcType = parts[1].trim();
        const ipPort = parts[2].trim();
        const fullName = `${svcName}.${svcType}`;

        if (
          deviceId === fullName ||
          deviceId.includes(svcName) ||
          svcName.includes(deviceId.replace(/\._tcp.*$/, ""))
        ) {
          if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(ipPort)) {
            onLog(`[Scrcpy] Phát hiện thiết bị mDNS, tự động kết nối IP: ${ipPort}`);
            try {
              await execPromise(`"${adbExe}" connect ${ipPort}`, {
                windowsHide: true,
                timeout: 3000,
              });
            } catch {
              /* ignore */
            }
            return ipPort;
          }
        }
      }
    }
  } catch (err: any) {
    onLog(`[Scrcpy Warning] Lỗi tra cứu mDNS: ${err.message}`);
  }

  // 2. Thử tra cứu IP qua ip route của thiết bị
  try {
    const { stdout: routeOut } = await execPromise(
      `"${adbExe}" -s "${deviceId}" shell ip route`,
      { windowsHide: true, timeout: 3000 },
    );
    const match = routeOut.match(/src\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (match) {
      const ip = match[1];
      const { stdout: devOut } = await execPromise(`"${adbExe}" devices`, {
        windowsHide: true,
        timeout: 3000,
      });
      const ipMatch = devOut.match(new RegExp(`(${ip.replace(/\./g, "\\.")}:\\d+)`));
      if (ipMatch) {
        onLog(`[Scrcpy] Sử dụng IP đã kết nối: ${ipMatch[1]}`);
        return ipMatch[1];
      }
    }
  } catch {
    /* ignore */
  }

  return deviceId;
}

/**
 * Lấy tên hiển thị đẹp của thiết bị để làm tiêu đề cửa sổ phản chiếu:
 * Ưu tiên: Tên thương mại (ro.product.marketname) + Model -> Hãng + Model -> Model -> Serial
 * Ví dụ: "Redmi Note 11 Pro (2201116TG)" hoặc "Samsung Galaxy S23"
 */
async function getDeviceDisplayName(
  serial: string,
  adbExe: string,
): Promise<string> {
  try {
    const { stdout } = await execPromise(
      `"${adbExe}" -s "${serial}" shell "getprop ro.product.marketname; getprop ro.product.brand; getprop ro.product.model"`,
      { windowsHide: true, timeout: 3000 },
    );
    const lines = stdout.split("\n").map((l) => l.trim()).filter(Boolean);
    const marketName = lines[0] || "";
    const brand = lines[1] || "";
    const model = lines[2] || "";

    if (marketName) {
      return model && !marketName.includes(model)
        ? `${marketName} (${model})`
        : marketName;
    }
    if (brand && model) {
      return model.toLowerCase().startsWith(brand.toLowerCase())
        ? model
        : `${brand} ${model}`;
    }
    if (model) return model;
  } catch {
    /* ignore */
  }
  return serial;
}

// Bật tính năng phản chiếu màn hình qua ScrcpyContainer.exe (native Win32)
export async function runScrcpy(
  deviceId: string,
  turnScreenOff: boolean,
  onLog: (log: string) => void,
) {
  try {
    // Dừng tiến trình cũ nếu có
    const existing = activeScrcpyProcesses.get(deviceId);
    if (existing) {
      try { existing.kill(); } catch { /* ignore */ }
      activeScrcpyProcesses.delete(deviceId);
    }
    stopScrcpyWindowController(deviceId);

    const binPath = app.isPackaged
      ? path.join(process.resourcesPath, "bin")
      : path.join(__dirname, "../../resources/bin");
    const scrcpyDir = path.join(binPath, "scrcpy");
    const scrcpyExe = path.join(scrcpyDir, "scrcpy.exe");
    const containerExe = path.join(scrcpyDir, "ScrcpyContainer.exe");

    // Phân giải target: nếu là thiết bị mDNS có khoảng trắng thì chuyển sang IP:Port tương ứng
    const targetSerial = await resolveScrcpyTarget(deviceId, onLog);

    // Lấy tên hiển thị đẹp của thiết bị để đặt làm tiêu đề cửa sổ phản chiếu
    const deviceDisplayName = await getDeviceDisplayName(targetSerial, getAdbExe());

    // Lấy aspect ratio thiết bị
    const aspectData = await getDeviceAspectRatio(targetSerial);

    // ––– Khởi động ScrcpyContainer.exe (snap-only helper, không can thiệp phím) –––
    // Điện thoại dùng bàn phím mặc định hệ thống (Gboard, Xiaomi IME...)
    const containerArgs = [
      "--serial", targetSerial,
      "--ratio", aspectData.aspectRatio.toFixed(6),
      "--scrcpy", scrcpyExe,
      "--keyboard", "sdk",
      "--title", deviceDisplayName,
    ];
    if (turnScreenOff) containerArgs.push("--turn-screen-off");

    onLog(`[Scrcpy] Khởi động "${deviceDisplayName}" (target=${targetSerial}, ratio=${aspectData.aspectRatio.toFixed(3)}, keyboard=sdk)`);
    const containerProcess = spawn(containerExe, containerArgs, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    activeScrcpyProcesses.set(deviceId, containerProcess);
    if (targetSerial !== deviceId) {
      activeScrcpyProcesses.set(targetSerial, containerProcess);
    }

    containerProcess.stdout?.on("data", (data) => onLog(`[Scrcpy] ${data}`));
    containerProcess.stderr?.on("data", (data) => onLog(`[Scrcpy Warning] ${data}`));
    containerProcess.on("error", (err) => {
      activeScrcpyProcesses.delete(deviceId);
      onLog(`[Scrcpy Error] ${err.message}`);
    });
    containerProcess.on("close", (code) => {
      activeScrcpyProcesses.delete(deviceId);
      onLog(`[Scrcpy] Exited with code ${code}`);
    });

    return "STARTED";
  } catch (error: any) {
    onLog(`CRITICAL ERROR (Scrcpy): ${error.message}`);
    return "FAILED";
  }
}

export function cleanupAllProcesses() {
  for (const proc of activeScrcpyProcesses.values()) {
    try {
      proc.kill();
    } catch {
      /* ignore */
    }
  }
  activeScrcpyProcesses.clear();
  cleanupAllWindowControllers();
}

export function stopAllScrcpy(): void {
  cleanupAllProcesses();
}

export function isScrcpyActive(): boolean {
  return activeScrcpyProcesses.size > 0;
}

// Bật tính năng kết nối không dây
export async function connectWifi(
  deviceId: string,
  ip: string,
  onLog: (log: string) => void,
) {
  try {
    if (!IP_REGEX.test(ip)) {
      onLog(`Lỗi: Địa chỉ IP không hợp lệ: ${ip}`);
      return false;
    }

    const adbExe = getAdbExe();

    onLog("Đang chuyển đổi sang chế độ Wireless (TCPIP 5555)...");
    await new Promise<void>((resolve, reject) => {
      const tcpip = spawn(adbExe, ["-s", deviceId, "tcpip", "5555"], {
        windowsHide: true,
      });
      tcpip.on("error", (err) => reject(err));
      tcpip.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error("TCP IP switch failed"));
      });
    });

    await new Promise((r) => setTimeout(r, 2000));

    onLog(`Đang kết nối tới ${ip}:5555 ...`);
    await new Promise<void>((resolve, reject) => {
      const connect = spawn(adbExe, ["connect", `${ip}:5555`], {
        windowsHide: true,
      });
      connect.stdout.on("data", (d) => onLog(d.toString()));
      connect.on("error", (err) => reject(err));
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

// Kết nối IP trực tiếp
export async function connectIp(ip: string, onLog: (log: string) => void) {
  try {
    if (!IP_REGEX.test(ip)) {
      onLog(`Lỗi: Địa chỉ IP không hợp lệ: ${ip}`);
      return false;
    }

    const adbExe = getAdbExe();
    const targetIp = ip.includes(":") ? ip : `${ip}:5555`;

    onLog(`Đang kết nối tới ${targetIp} ...`);
    await new Promise<void>((resolve, reject) => {
      const connect = spawn(adbExe, ["connect", targetIp], {
        windowsHide: true,
      });

      const timeout = setTimeout(() => {
        try { connect.kill(); } catch { /* ignore */ }
        reject(
          new Error(
            "Timeout: Thiết bị không phản hồi sau 10s. Vui lòng kiểm tra lại mạng hoặc IP.",
          ),
        );
      }, 10000);

      connect.stdout.on("data", (d) => onLog(d.toString()));
      connect.stderr.on("data", (d) => onLog(d.toString()));
      connect.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
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
    if (!IP_REGEX.test(ipPort)) {
      onLog(`Lỗi: Địa chỉ IP:Port không hợp lệ: ${ipPort}`);
      return false;
    }
    if (!PAIR_CODE_REGEX.test(code)) {
      onLog(`Lỗi: Mã Pairing Code không hợp lệ (phải gồm 6 chữ số): ${code}`);
      return false;
    }

    const adbExe = getAdbExe();

    onLog(`Đang ghép nối với ${ipPort} bằng mã ${code} ...`);
    await new Promise<void>((resolve, reject) => {
      const pair = spawn(adbExe, ["pair", ipPort, code], {
        windowsHide: true,
      });

      const timeout = setTimeout(() => {
        try { pair.kill(); } catch { /* ignore */ }
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
      pair.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
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

export interface StorageStats {
  total: number;
  used: number;
  free: number;
  percentage: number;
}

export async function getStorageStats(
  deviceId: string,
): Promise<StorageStats | null> {
  try {
    const output = await adbState.client.shell(deviceId, "df -k /data");
    const chunks = [];
    for await (const chunk of output) {
      chunks.push(chunk);
    }
    const text = Buffer.concat(chunks).toString();
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.includes("/data") && !line.includes("tmpfs")) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          // df -k returns values in 1K-blocks
          const total = parseInt(parts[1]) * 1024;
          const used = parseInt(parts[2]) * 1024;
          let free = parseInt(parts[3]) * 1024;
          if (isNaN(free) && parts.length >= 6 && !parts[4].includes("%")) {
            free = parseInt(parts[4]) * 1024;
          }
          const percentageStr = parts.find((p) => p.includes("%")) || "0%";
          const percentage = parseInt(percentageStr.replace("%", ""));

          if (!isNaN(total) && !isNaN(used) && !isNaN(percentage)) {
            const finalFree = isNaN(free) ? total - used : free;
            return { total, used, free: finalFree, percentage };
          }
        }
      }
    }
    return null;
  } catch (err) {
    console.error("getStorageStats error:", err);
    return null;
  }
}

// Ngắt kết nối thiết bị mạng / Wi-Fi
export async function disconnectDevice(
  deviceId: string,
  onLog?: (log: string) => void,
): Promise<{ success: boolean; message: string }> {
  try {
    // Dừng tiến trình scrcpy nếu đang chạy cho thiết bị này
    const existingScrcpy = activeScrcpyProcesses.get(deviceId);
    if (existingScrcpy) {
      try {
        existingScrcpy.kill();
      } catch {
        /* ignore */
      }
      activeScrcpyProcesses.delete(deviceId);
    }
    stopScrcpyWindowController(deviceId);

    const adbExe = getAdbExe();
    onLog?.(`Đang ngắt kết nối thiết bị: ${deviceId}...`);

    const tryDisconnect = (target: string) =>
      new Promise<{ success: boolean; message: string }>((resolve) => {
        const proc = spawn(adbExe, target ? ["disconnect", target] : ["disconnect"], {
          windowsHide: true,
        });
        let output = "";
        proc.stdout?.on("data", (d) => (output += d.toString()));
        proc.stderr?.on("data", (d) => (output += d.toString()));
        proc.on("error", (err) => {
          resolve({ success: false, message: err.message });
        });
        proc.on("close", (code) => {
          const msg = output.trim();
          const isSuccess =
            code === 0 &&
            !msg.toLowerCase().includes("error") &&
            !msg.toLowerCase().includes("failed");
          resolve({
            success: isSuccess,
            message: msg || (isSuccess ? "Ngắt kết nối thành công" : "Ngắt kết nối thất bại"),
          });
        });
      });

    // 1. Thử ngắt kết nối trực tiếp với deviceId chính xác
    let res = await tryDisconnect(deviceId);
    if (res.success) {
      onLog?.(`[ADB Disconnect] ${res.message}`);
      return res;
    }

    // 2. Nếu deviceId chứa định dạng IP:Port, thử ngắt bằng IP:Port
    const ipPortMatch = deviceId.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+)/);
    if (ipPortMatch) {
      res = await tryDisconnect(ipPortMatch[1]);
      if (res.success) {
        onLog?.(`[ADB Disconnect] ${res.message}`);
        return res;
      }
    }

    // 3. Fallback: Nếu là thiết bị không dây (chứa ':' hoặc '._tcp') bị kẹt, gọi 'adb disconnect' không tham số
    const isNetworkDevice = deviceId.includes(":") || deviceId.includes("._tcp");
    if (isNetworkDevice) {
      const fallbackAll = await tryDisconnect("");
      if (fallbackAll.success) {
        onLog?.(`[ADB Disconnect] ${fallbackAll.message}`);
        return { success: true, message: "Đã ngắt kết nối thiết bị không dây thành công" };
      }
    }

    onLog?.(`[ADB Disconnect] ${res.message}`);
    return res;
  } catch (err: any) {
    onLog?.(`Lỗi ngắt kết nối: ${err.message}`);
    return { success: false, message: err.message };
  }
}

