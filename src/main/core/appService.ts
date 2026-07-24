import * as fs from "fs";
import { app } from "electron";
import { adbState } from "./adbCore";
import { validatePackageName } from "./adbSafety";
import { shellQuote } from "../../shared/validation";

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

const APP_ACTIONS = new Set([
  "uninstall",
  "disable",
  "enable",
  "clear",
  "stop",
  "restore",
]);

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
            s.on("error", () => resolve(data));
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
    if (!validatePackageName(pkgName) || !APP_ACTIONS.has(action)) {
      return { success: false, output: "Invalid app command parameters" };
    }

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

    let output = await new Promise<string>((resolve) => {
      let data = "";
      adbState.client.shell(deviceId, cmd).then((s: any) => {
        s.on("data", (c: any) => (data += c));
        s.on("end", () => resolve(data));
        s.on("error", () => resolve(data));
      }).catch(() => resolve(""));
    });

    // Auto-fallback nếu pm disable-user bị Android 14+ / HyperOS chặn (SecurityException)
    if (
      action === "disable" &&
      (output.includes("SecurityException") || output.includes("Cannot disable"))
    ) {
      const fallbackCmd = `pm uninstall -k --user 0 ${pkgName}`;
      onLog(`Lỗi SecurityException với disable-user. Chuyển sang fallback: ${fallbackCmd}`);
      output = await new Promise<string>((resolve) => {
        let data = "";
        adbState.client.shell(deviceId, fallbackCmd).then((s: any) => {
          s.on("data", (c: any) => (data += c));
          s.on("end", () => resolve(data));
          s.on("error", () => resolve(data));
        }).catch(() => resolve(""));
      });
    }

    const outLower = output.toLowerCase();
    const isUnknown =
      outLower.includes("unknown package") ||
      outLower.includes("not installed") ||
      outLower.includes("failure [not installed");

    if (isUnknown) {
      const msg = `Hiện tại không tìm thấy ứng dụng ${pkgName} trong hệ thống của bạn, vui lòng kiểm tra lại.`;
      onLog(`Kết quả: ${msg}`);
      return { success: false, output: msg };
    }

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
    if (!validatePackageName(pkgName)) {
      throw new Error("Tên package không hợp lệ");
    }

    onLog(`Đang trích xuất APK của ${pkgName}...`);

    const pathOutput = await new Promise<string>((resolve) => {
      let data = "";
      adbState.client.shell(deviceId, `pm path ${pkgName}`).then((s: any) => {
        s.on("data", (c: any) => (data += c));
        s.on("end", () => resolve(data.trim()));
        s.on("error", () => resolve(data.trim()));
      }).catch(() => resolve(""));
    });

    const lines = pathOutput
      .split("\n")
      .map((l) => l.replace("package:", "").trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) throw new Error("Không tìm thấy đường dẫn APK");

    onLog(`Tìm thấy ${lines.length} file APK (base/split)`);

    const isZipDest = destPath.endsWith(".zip") || destPath.endsWith(".apks");

    if (lines.length === 1 && !isZipDest) {
      const apkPath = lines[0];
      onLog(`Đường dẫn: ${apkPath}`);
      const transfer = await adbState.client.pull(deviceId, apkPath);
      await new Promise((resolve, reject) => {
        const outStream = fs.createWriteStream(destPath);
        transfer.on("progress", (stats: any) => {
          onLog(
            `Đang tải: ${(stats.bytesTransferred / 1024 / 1024).toFixed(2)} MB...`,
          );
        });
        transfer.on("end", () => resolve(true));
        transfer.on("error", (err: any) => reject(err));
        transfer.pipe(outStream);
      });
      onLog(`Trích xuất thành công: ${destPath}`);
      return true;
    } else {
      // Trường hợp ứng dụng có nhiều split APK hoặc chọn nén ZIP/APKS
      const pathModule = await import("path");
      const AdmZip = (await import("adm-zip")).default;
      const zip = new AdmZip();

      for (let i = 0; i < lines.length; i++) {
        const remoteApk = lines[i];
        const filename = pathModule.basename(remoteApk);
        onLog(`[${i + 1}/${lines.length}] Đang pull ${filename}...`);

        const tempLocal = pathModule.join(
          app.getPath("temp"),
          `extract_${Date.now()}_${filename}`
        );
        const transfer = await adbState.client.pull(deviceId, remoteApk);
        await new Promise((resolve, reject) => {
          const outStream = fs.createWriteStream(tempLocal);
          transfer.on("end", resolve);
          transfer.on("error", reject);
          transfer.pipe(outStream);
        });

        if (isZipDest) {
          zip.addLocalFile(tempLocal, "", filename);
        } else {
          // Lưu thành các file riêng trong cùng thư mục
          const targetFile = pathModule.join(
            pathModule.dirname(destPath),
            `${pkgName}_${filename}`
          );
          fs.copyFileSync(tempLocal, targetFile);
        }

        try {
          fs.unlinkSync(tempLocal);
        } catch {
          /* ignore */
        }
      }

      if (isZipDest) {
        zip.writeZip(destPath);
        onLog(`Đã đóng gói bundle thành công: ${destPath}`);
      } else {
        onLog(`Đã trích xuất ${lines.length} file APK thành công!`);
      }

      return true;
    }
  } catch (err: any) {
    onLog(`Lỗi trích xuất: ${err.message}`);
    return false;
  }
}

export async function installSplitApks(
  deviceId: string,
  bundlePath: string,
  onLog: (log: string) => void,
) {
  try {
    const pathModule = await import("path");
    const AdmZip = (await import("adm-zip")).default;
    onLog(`Đang xử lý gói ứng dụng nén (Split APKs): ${bundlePath}...`);

    const tempExtractDir = pathModule.join(
      app.getPath("temp"),
      `split_extract_${Date.now()}`
    );
    if (!fs.existsSync(tempExtractDir)) {
      fs.mkdirSync(tempExtractDir, { recursive: true });
    }

    const zip = new AdmZip(bundlePath);
    zip.extractAllTo(tempExtractDir, true);

    // Lọc danh sách các file .apk
    const files = fs.readdirSync(tempExtractDir);
    const apkFiles = files.filter((f) => f.toLowerCase().endsWith(".apk"));

    if (apkFiles.length === 0) {
      onLog("Lỗi: Không tìm thấy file .apk nào trong gói nén!");
      return false;
    }

    onLog(`Tìm thấy ${apkFiles.length} file APK split. Đang đẩy lên thiết bị...`);

    const remoteDir = `/data/local/tmp/split_${Date.now()}`;
    await adbState.client.shell(deviceId, `mkdir -p ${remoteDir}`);

    const remoteApkPaths: string[] = [];
    for (const apkName of apkFiles) {
      const localApk = pathModule.join(tempExtractDir, apkName);
      const remoteApk = `${remoteDir}/${apkName}`;
      onLog(`Pushing ${apkName}...`);
      const transfer = await adbState.client.push(deviceId, localApk, remoteApk);
      await new Promise((resolve, reject) => {
        transfer.on("end", resolve);
        transfer.on("error", reject);
      });
      remoteApkPaths.push(remoteApk);
    }

    onLog("Đang thực thi pm install-multiple...");
    const quotedPaths = remoteApkPaths.map((p) => shellQuote(p)).join(" ");
    const output = await new Promise<string>((resolve) => {
      let data = "";
      adbState.client
        .shell(deviceId, `pm install-multiple -r -d -t -g ${quotedPaths}`)
        .then((s: any) => {
          s.on("data", (c: any) => (data += c));
          s.on("end", () => resolve(data.trim()));
          s.on("error", () => resolve(data.trim()));
        })
        .catch(() => resolve(""));
    });

    // Cleanup remote & temp
    await adbState.client.shell(deviceId, `rm -rf ${remoteDir}`);
    fs.rmSync(tempExtractDir, { recursive: true, force: true });

    if (output.toLowerCase().includes("success")) {
      onLog("Cài đặt gói Split APKs (XAPK/APKS) hoàn tất thành công!");
      return true;
    } else {
      onLog(`Lỗi cài đặt Split APKs: ${output}`);
      return false;
    }
  } catch (err: any) {
    onLog(`Lỗi hệ thống khi cài Split APKs: ${err.message}`);
    return false;
  }
}

export async function installApk(
  deviceId: string,
  apkPath: string,
  onLog: (log: string) => void,
) {
  try {
    const ext = apkPath.toLowerCase();
    if (ext.endsWith(".xapk") || ext.endsWith(".apks") || ext.endsWith(".zip")) {
      return await installSplitApks(deviceId, apkPath, onLog);
    }

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
        .shell(deviceId, `pm install -r -d -t -g ${shellQuote(remotePath)}`)
        .then((s: any) => {
          s.on("data", (c: any) => (data += c));
          s.on("end", () => resolve(data.trim()));
          s.on("error", () => resolve(data.trim()));
        }).catch(() => resolve(""));
    });

    await adbState.client.shell(deviceId, `rm ${shellQuote(remotePath)}`);

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

