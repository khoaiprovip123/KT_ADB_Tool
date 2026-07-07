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

function parseVersion(v: string): number[] {
  const clean = v.replace(/^v/, "").split("-")[0];
  const parts = clean.split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = parseVersion(latest);
  const currentParts = parseVersion(current);
  for (let i = 0; i < 3; i++) {
    if (latestParts[i] > currentParts[i]) return true;
    if (latestParts[i] < currentParts[i]) return false;
  }
  return false;
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion();
  try {
    const url = `https://api.github.com/repos/${REPO}/releases/latest`;
    const response = await axios.get(url, {
      headers: { "Accept": "application/vnd.github+json" },
      timeout: 10000,
    });

    const release = response.data;
    const latestVersion = release.tag_name.replace(/^v/, "");

    // So sánh phiên bản bằng semver
    const available = isNewerVersion(latestVersion, currentVersion);

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
    if (error.response?.status === 404) {
      return {
        available: false,
        version: currentVersion,
        changelog: "Chưa có bản phát hành (release) nào trên GitHub hoặc repo ở chế độ riêng tư.",
        downloadUrl: null,
      };
    }
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
  return new Promise((resolve, reject) => {
    response.data.on("data", (chunk: Buffer) => {
      downloadedLength += chunk.length;
      if (totalLength > 0) {
        onProgress(Math.round((downloadedLength / totalLength) * 100));
      }
    });

    response.data.on("error", (err: any) => {
      writer.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });

    response.data.pipe(writer);

    writer.on("finish", () => {
      // Chạy trình cài đặt NSIS với shell: false để tránh Command Injection
      const child = spawn(destPath, ["/S"], {
        detached: true,
        stdio: "ignore",
        shell: false,
      });

      child.on("error", (spawnErr) => {
        console.error("Lỗi kích hoạt bộ cài:", spawnErr);
        reject(new Error(`Không thể khởi chạy bộ cài đặt: ${spawnErr.message}`));
      });

      child.unref();

      // Thoát ứng dụng hiện tại sau khi kích hoạt bộ cài để giải phóng file lock
      setTimeout(() => {
        app.quit();
      }, 800);

      resolve();
    });

    writer.on("error", (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}
