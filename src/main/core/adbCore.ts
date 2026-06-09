import adb from "adbkit";
import { ensureAdb } from "./adbDownloader";
import { ensureScrcpy } from "./scrcpyDownloader";
import * as path from "path";
import { app } from "electron";
import { exec } from "child_process";
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

    await killAdbServer();
    await new Promise((r) => setTimeout(r, 1000));

    await new Promise<void>((resolve) => {
      exec(`"${adbExe}" start-server`, () => resolve());
    });
    await new Promise((r) => setTimeout(r, 500));

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

export async function runAdbCommand(
  deviceId: string,
  command: string,
  onLog: (log: string) => void,
): Promise<string> {
  try {
    const shellCommand = cleanAdbPrefix(command);

    const safety = evaluateCommand(shellCommand);
    if (!safety.allowed) {
      const blockedMsg = `[BLOCKED BY SAFETY LAYER] Lệnh bị chặn vì lý do bảo mật: ${safety.reason || "Không an toàn"}`;
      onLog(blockedMsg);
      return blockedMsg;
    }

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

/**
 * execAdb — Hàm thực thi lệnh ADB chung với lớp an toàn evaluateCommand.
 */
export async function execAdb(
  deviceId: string,
  command: string,
): Promise<string> {
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
