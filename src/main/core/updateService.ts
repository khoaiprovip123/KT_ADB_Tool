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
      headers: {
        "Accept": "application/vnd.github+json",
        "User-Agent": `KT_ADB_Tool/${currentVersion}`,
      },
      timeout: 10000,
    });

    const release = response.data;
    const latestVersion = release.tag_name.replace(/^v/, "");

    // So sánh phiên bản bằng semver
    const available = isNewerVersion(latestVersion, currentVersion);

    let downloadUrl: string | null = null;
    if (release.assets && Array.isArray(release.assets)) {
      const exeAsset =
        release.assets.find(
          (asset: any) =>
            asset.name.endsWith(".exe") &&
            !asset.name.includes("blockmap"),
        ) ||
        release.assets.find((asset: any) => asset.name.endsWith(".exe"));
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
    const status = error.response?.status;
    if (status === 404 || status === 403) {
      return {
        available: false,
        version: currentVersion,
        changelog: "Bạn đang sử dụng phiên bản mới nhất.",
        downloadUrl: null,
      };
    }
    console.warn("Check for updates warning:", error.message || error);
    return {
      available: false,
      version: currentVersion,
      changelog: "Chưa kết nối máy chủ cập nhật.",
      downloadUrl: null,
    };
  }
}

export async function downloadAndInstallUpdate(
  downloadUrl: string,
  onProgress: (progress: number) => void,
): Promise<void> {
  const tempDir = os.tmpdir();
  const destPath = path.join(tempDir, "KT_ADB_Tool_Setup.exe");

  // Xóa file cũ nếu đã tồn tại
  if (fs.existsSync(destPath)) {
    try {
      fs.unlinkSync(destPath);
    } catch (e) {      console.warn("Không thể xóa file setup cũ:", e);
    }
  }

  const response = await axios({
    url: downloadUrl,
    method: "GET",
    responseType: "stream",
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 300000, // 5 phút timeout cho file lớn
    headers: {
      "User-Agent": `KT_ADB_Tool/${app.getVersion()}`,
      "Accept": "application/octet-stream",
    },
  });

  const contentLength =
    response.headers["content-length"] ||
    response.headers["x-decompressed-content-length"];
  const totalLength = parseInt(
    typeof contentLength === "string" ? contentLength : "0",
    10,
  );
  let downloadedLength = 0;

  const writer = fs.createWriteStream(destPath);

  return new Promise((resolve, reject) => {
    response.data.on("data", (chunk: Buffer) => {
      downloadedLength += chunk.length;
      if (totalLength > 0) {
        const pct = Math.min(
          99,
          Math.round((downloadedLength / totalLength) * 100),
        );
        onProgress(pct);
      } else {
        // Nếu không có header content-length, giả lập tiến trình tăng dần
        onProgress(Math.min(95, Math.floor(downloadedLength / 1024 / 1024)));
      }
    });

    response.data.on("error", (err: any) => {
      writer.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });

    response.data.pipe(writer);

    writer.on("finish", () => {
      writer.close(() => {
        onProgress(100);
        resolve();

        // Tự động kích hoạt cài đặt ngầm (/S) và thoát ứng dụng
        setTimeout(async () => {
          try {
            const child = spawn(`"${destPath}"`, ["/S"], {
              detached: true,
              stdio: "ignore",
              shell: true,
            });
            child.unref();
          } catch (err: any) {
            console.error("Lỗi khi tự động chạy installer:", err);
            const { shell } = await import("electron");
            await shell.openPath(destPath);
          } finally {
            setTimeout(() => {
              app.quit();
            }, 500);
          }
        }, 300);
      });
    });

    writer.on("error", (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}
