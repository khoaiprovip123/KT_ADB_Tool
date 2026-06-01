import * as fs from "fs";
import { adbState } from "./adbService";

export interface AppInfo {
  pkg: string;
  type: "system" | "user";
  status: "enabled" | "disabled";
}

const BLACKLIST = [
  "android",
  "com.android.systemui",
  "com.android.settings",
  "com.android.phone",
  "com.android.contacts",
  "com.miui.securitycenter",
];

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

export async function extractApp(
  deviceId: string,
  pkgName: string,
  destPath: string,
  onLog: (log: string) => void,
) {
  try {
    onLog(`Đang trích xuất APK của ${pkgName}...`);

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

    const transfer = await adbState.client.pull(deviceId, apkPath);
    return new Promise((resolve, reject) => {
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

export async function installApk(
  deviceId: string,
  apkPath: string,
  onLog: (log: string) => void,
) {
  try {
    onLog(`Đang cài đặt APK: ${apkPath}...`);
    const remotePath = `/data/local/tmp/${Date.now()}.apk`;
    const transfer = await adbState.client.push(deviceId, apkPath, remotePath);
    await new Promise((resolve, reject) => {
      transfer.on("end", resolve);
      transfer.on("error", reject);
    });

    const output = await new Promise<string>((resolve) => {
      let data = "";
      adbState.client
        .shell(deviceId, `pm install -r -d -t -g "${remotePath}"`)
        .then((s: any) => {
          s.on("data", (c: any) => (data += c));
          s.on("end", () => resolve(data.trim()));
        });
    });

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
