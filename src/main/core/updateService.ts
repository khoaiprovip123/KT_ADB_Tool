import axios from "axios";
import { app } from "electron";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";

const REPO = "khoaiprovip123/KT_ADB_Tool";

export interface UpdateInfo {
  available: boolean;
  version: string;
  changelog: string;
  downloadUrl: string | null;
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  try {
    const currentVersion = app.getVersion();
    const url = `https://api.github.com/repos/${REPO}/releases/latest`;
    const response = await axios.get(url, {
      headers: { "Accept": "application/vnd.github+json" },
      timeout: 10000,
    });

    const release = response.data;
    const latestVersion = release.tag_name.replace(/^v/, "");

    // So sánh phiên bản đơn giản
    const available = latestVersion !== currentVersion;

    let downloadUrl: string | null = null;
    if (release.assets && Array.isArray(release.assets)) {
      const exeAsset = release.assets.find((asset: any) => asset.name.endsWith(".exe"));
      if (exeAsset) {
        downloadUrl = exeAsset.browser_download_url;
      }
    }

    return {
      available,
      version: latestVersion,
      changelog: release.body || "",
      downloadUrl,
    };
  } catch (error: any) {
    console.error("Check for updates failed:", error);
    throw new Error(`Kiểm tra cập nhật thất bại: ${error.message}`);
  }
}

export async function downloadAndInstallUpdate(
  downloadUrl: string,
  onProgress: (progress: number) => void,
): Promise<void> {
  const tempDir = os.tmpdir();
  const destPath = path.join(tempDir, "KT_ADB_Tool_Setup.exe");

  const writer = fs.createWriteStream(destPath);
  const response = await axios({
    url: downloadUrl,
    method: "GET",
    responseType: "stream",
  });

  const contentLength = response.headers["content-length"];
  const totalLength = parseInt(typeof contentLength === "string" ? contentLength : "0", 10);
  let downloadedLength = 0;

  response.data.on("data", (chunk: Buffer) => {
    downloadedLength += chunk.length;
    if (totalLength > 0) {
      onProgress(Math.round((downloadedLength / totalLength) * 100));
    }
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => {
      // Chạy trình cài đặt NSIS ở chế độ im lặng (/S)
      const child = spawn(destPath, ["/S"], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();

      // Thoát ứng dụng hiện tại để tránh file lock
      setTimeout(() => {
        app.quit();
      }, 500);

      resolve();
    });
    writer.on("error", (err) => {
      reject(err);
    });
  });
}
