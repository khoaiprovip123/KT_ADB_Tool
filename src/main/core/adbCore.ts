import adb from "adbkit";
import { ensureAdb } from "./adbDownloader";
import { ensureScrcpy } from "./scrcpyDownloader";
import * as path from "path";
import { app } from "electron";
import { exec, execFile, spawn } from "child_process";
import { evaluateCommand, cleanAdbPrefix } from "./adbSafety";
import * as fs from "fs";

export const adbState = {
  client: adb.createClient(),
};

export let currentAdbExe = "adb";

export interface AdbCommandExecution {
  success: boolean;
  output: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export function isAdbFailureOutput(output: string): boolean {
  const normalized = output.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.startsWith("error:") ||
    normalized.startsWith("critical error:") ||
    normalized === "failed" ||
    normalized.startsWith("[blocked by safety layer]") ||
    /(^|\n)(unknown command|failure\b|failed\b|securityexception\b|permission denied\b|not found:|.*inaccessible or not found)/i.test(
      normalized,
    )
  );
}

function failedExecution(error: any): AdbCommandExecution {
  const stdout = String(error?.stdout ?? "");
  const stderr = String(error?.stderr ?? "");
  const detail = `${stdout}${stderr}`.trim() || error?.message || "ADB command failed";
  const output = `ERROR: ${detail}`;
  const exitCode =
    typeof error?.code === "number"
      ? error.code
      : typeof error?.exitCode === "number"
        ? error.exitCode
        : null;
  return { success: false, output, stdout, stderr, exitCode };
}

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

    currentAdbExe = await ensureAdb(binPath, onProgress);

    await killAdbServer();
    await new Promise((r) => setTimeout(r, 1000));

    await new Promise<void>((resolve) => {
      const child = spawn(currentAdbExe, ["start-server"]);
      const timer = setTimeout(() => {
        child.kill();
        resolve();
      }, 5000);
      child.on("close", () => {
        clearTimeout(timer);
        resolve();
      });
      child.on("error", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    await new Promise((r) => setTimeout(r, 2000));

    adbState.client = adb.createClient({ bin: currentAdbExe });
    onProgress("ADB Client connected successfully.");

    ensureScrcpy(binPath, onProgress).catch(() => {});

    return true;
  } catch (err: any) {
    onProgress(`Init failed: ${err.message}`);
    return false;
  }
}

import util from "util";
const execPromise = util.promisify(exec);
const execFilePromise = util.promisify(execFile);

export async function getDevices() {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 1. Quét thiết bị ADB
      const { stdout } = await execPromise(`"${currentAdbExe}" devices`);
      const lines = stdout.split('\n');
      const devices: any[] = [];
      for (const line of lines) {
        if (line.includes('List of devices attached')) continue;
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          devices.push({ id: parts[0], type: parts[1], status: parts[1] });
        }
      }

      // 2. Quét thiết bị Fastboot (nếu có fastboot.exe)
      try {
        const fastbootExe = path.join(
          path.dirname(currentAdbExe),
          process.platform === "win32" ? "fastboot.exe" : "fastboot"
        );
        if (fs.existsSync(fastbootExe)) {
          const { stdout: fbOut } = await execPromise(`"${fastbootExe}" devices`);
          const fbLines = fbOut.split('\n');
          for (const line of fbLines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              // Nếu thiết bị chưa được nhận dạng ở ADB mode thì thêm vào dạng bootloader
              if (!devices.some((d) => d.id === parts[0])) {
                devices.push({
                  id: parts[0],
                  type: "bootloader",
                  status: "fastboot",
                  model: "Thiết bị Fastboot",
                });
              }
            }
          }
        }
      } catch (fbErr) {
        console.warn("[FASTBOOT] Lỗi quét thiết bị:", fbErr);
      }

      return devices;
    } catch (error: any) {
      if (attempt < maxRetries) {
        console.warn(`[ADB] getDevices attempt ${attempt} failed, retrying in 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        console.error("[ADB] getDevices failed after all retries:", error.message || error);
        return [];
      }
    }
  }
  return [];
}

export function watchDevices(onUpdate: (devices: any[]) => void): () => void {
  let isTracking = false;
  let currentTracker: any = null;
  let active = true;
  let retryTimer: any = null;
  let lastDevsJson = "";

  const cleanupTracker = () => {
    isTracking = false;
    if (currentTracker) {
      try {
        currentTracker.end();
      } catch { /* ignore */ }
      try {
        currentTracker.removeAllListeners();
      } catch { /* ignore */ }
      currentTracker = null;
    }
  };

  const refresh = async () => {
    const devs = await getDevices();
    const devsJson = JSON.stringify(devs);
    if (devsJson !== lastDevsJson) {
      lastDevsJson = devsJson;
      onUpdate(devs);
    }
  };

  const pollInterval = setInterval(refresh, 4000);

  const startTracking = async () => {
    if (isTracking || !active) return;
    isTracking = true;

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    try {
      const tracker = await adbState.client.trackDevices();
      currentTracker = tracker;

      await refresh();

      tracker.on("add", refresh);
      tracker.on("remove", refresh);
      tracker.on("change", refresh);

      tracker.on("end", () => {
        console.log("Tracking ended, restarting in 5s...");
        cleanupTracker();
        if (active && !retryTimer) {
          retryTimer = setTimeout(startTracking, 5000);
        }
      });

      tracker.on("error", (err: any) => {
        console.warn("Tracking error (safe to ignore if reconnecting):", err.message || err);
        cleanupTracker();
        if (active && !retryTimer) {
          retryTimer = setTimeout(startTracking, 5000);
        }
      });
    } catch (error) {
      console.warn("Error starting device tracking, retrying in 5s...");
      cleanupTracker();
      if (active && !retryTimer) {
        retryTimer = setTimeout(startTracking, 5000);
      }
    }
  };

  startTracking();

  return () => {
    active = false;
    clearInterval(pollInterval);
    if (retryTimer) {
      clearTimeout(retryTimer);
    }
    cleanupTracker();
  };
}

export async function runAdbCommand(
  deviceId: string,
  command: string,
  onLog: (log: string) => void,
): Promise<string> {
  const result = await runAdbCommandDetailed(deviceId, command);
  onLog(result.output);
  return result.output;
}

export async function runAdbCommandDetailed(
  deviceId: string,
  command: string,
): Promise<AdbCommandExecution> {
  try {
    const shellCommand = cleanAdbPrefix(command);

    const safety = evaluateCommand(shellCommand);
    if (!safety.allowed) {
      const blockedMsg = `[BLOCKED BY SAFETY LAYER] Lệnh bị chặn vì lý do bảo mật: ${safety.reason || "Không an toàn"}`;
      return {
        success: false,
        output: blockedMsg,
        stdout: "",
        stderr: blockedMsg,
        exitCode: null,
      };
    }

    const res = await execFilePromise(
      currentAdbExe,
      ["-s", deviceId, "shell", shellCommand],
      { windowsHide: true, timeout: 30_000, maxBuffer: 10 * 1024 * 1024 },
    );
    const stdout = String(res.stdout ?? "");
    const stderr = String(res.stderr ?? "");
    const output = [stdout.trimEnd(), stderr.trimEnd()]
      .filter(Boolean)
      .join("\n");
    return {
      success: !isAdbFailureOutput(output),
      output,
      stdout,
      stderr,
      exitCode: 0,
    };
  } catch (error: any) {
    return failedExecution(error);
  }
}

/**
 * execAdb — Hàm thực thi lệnh ADB chung với lớp an toàn evaluateCommand.
 * Sử dụng CLI (child_process) thay vì adbkit để tránh ECONNRESET.
 */
export async function execAdb(
  deviceId: string,
  command: string,
): Promise<string> {
  return (await execAdbDetailed(deviceId, command)).output;
}

export async function execAdbDetailed(
  deviceId: string,
  command: string,
): Promise<AdbCommandExecution> {
  let cleanCmd = command;
  if (cleanCmd.startsWith("shell ")) {
    cleanCmd = cleanCmd.substring(6);
  }
  cleanCmd = cleanCmd.trim();

  if (cleanCmd) {
    const safety = evaluateCommand(cleanCmd);
    if (!safety.allowed) {
      const output = `[BLOCKED BY SAFETY LAYER] ${safety.reason || "Lệnh không được phép thực thi."} [${safety.risk}]`;
      return {
        success: false,
        output,
        stdout: "",
        stderr: output,
        exitCode: null,
      };
    }
  }

  try {
    const res = await execFilePromise(
      currentAdbExe,
      ["-s", deviceId, "shell", cleanCmd],
      { windowsHide: true, timeout: 30_000, maxBuffer: 10 * 1024 * 1024 },
    );
    const stdout = String(res.stdout ?? "");
    const stderr = String(res.stderr ?? "");
    const output = [stdout.trimEnd(), stderr.trimEnd()]
      .filter(Boolean)
      .join("\n");
    return {
      success: !isAdbFailureOutput(output),
      output,
      stdout,
      stderr,
      exitCode: 0,
    };
  } catch (error: any) {
    return failedExecution(error);
  }
}

/**
 * Thực thi lệnh Fastboot cho thiết bị đang ở chế độ Bootloader/Fastboot.
 */
export async function execFastboot(
  deviceId: string,
  args: string[],
): Promise<string> {
  try {
    const fastbootExe = path.join(
      path.dirname(currentAdbExe),
      process.platform === "win32" ? "fastboot.exe" : "fastboot"
    );
    if (!fs.existsSync(fastbootExe)) {
      throw new Error("Không tìm thấy tệp thực thi fastboot");
    }
    const { stdout, stderr } = await execPromise(
      `"${fastbootExe}" -s ${deviceId} ${args.join(" ")}`
    );
    return stdout || stderr || "OK";
  } catch (error: any) {
    throw new Error(error.stderr || error.message);
  }
}

/**
 * Gửi lệnh reboot qua Fastboot.
 */
export async function fastbootReboot(
  deviceId: string,
  target?: "bootloader" | "recovery" | "edl",
): Promise<{ success: boolean; message: string }> {
  try {
    const args = ["reboot"];
    if (target) {
      args.push(target);
    }
    const output = await execFastboot(deviceId, args);
    return { success: true, message: output.trim() || "OK" };
  } catch (err: any) {
    console.error(`[FASTBOOT] reboot failed:`, err);
    return { success: false, message: err.message };
  }
}

/**
 * Thực thi xóa phân vùng FRP / Config qua Fastboot để Bypass Google Account (Yêu cầu Unlocked Bootloader).
 */
export async function fastbootBypassFrp(
  deviceId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const partitions = ["frp", "config", "persistent"];
    const results: string[] = [];

    for (const part of partitions) {
      try {
        await execFastboot(deviceId, ["erase", part]);
        results.push(`• Erase ${part}: Thành công`);
      } catch (err: any) {
        results.push(`• Erase ${part}: ${err.message || "Thất bại (Cần Unlocked Bootloader)"}`);
      }
    }

    return {
      success: true,
      message: results.join("\n"),
    };
  } catch (err: any) {
    console.error(`[FASTBOOT] Bypass FRP failed:`, err);
    return { success: false, message: err.message };
  }
}
