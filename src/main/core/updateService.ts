import axios from "axios";
import { app } from "electron";
import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";

const REPOS = ["thanhlongts2k/KT_ADB_Tool", "khoaiprovip123/KT_ADB_Tool"];

export interface UpdateInfo {
  available: boolean;
  version: string;
  changelog: string;
  downloadUrl: string | null;
  expectedSize?: number;
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

  for (const repo of REPOS) {
    try {
      const url = `https://api.github.com/repos/${repo}/releases/latest`;
      const response = await axios.get(url, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": `KT_ADB_Tool/${currentVersion}`,
        },
        timeout: 10000,
      });

      const release = response.data;
      if (!release || !release.tag_name) continue;

      const latestVersion = release.tag_name.replace(/^v/, "");
      const available = isNewerVersion(latestVersion, currentVersion);

      let downloadUrl: string | null = null;
      let expectedSize: number | undefined = undefined;

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
          expectedSize = exeAsset.size;
        }
      }

      return {
        available,
        version: latestVersion,
        changelog: release.body || "",
        downloadUrl,
        expectedSize,
      };
    } catch (error: any) {
      console.warn(`Check for updates warning on ${repo}:`, error.message || error);
    }
  }

  return {
    available: false,
    version: currentVersion,
    changelog: "Bạn đang sử dụng phiên bản mới nhất.",
    downloadUrl: null,
  };
}

/**
 * Kiểm tra tính toàn vẹn của tệp exe cài đặt chống lỗi NSIS Error
 */
function validateInstallerFile(filePath: string, expectedSize?: number): void {
  if (!fs.existsSync(filePath)) {
    throw new Error("Không tìm thấy tệp cài đặt sau khi tải về.");
  }

  const stats = fs.statSync(filePath);
  const fileSize = stats.size;

  // 1. Kiểm tra kích thước file
  if (expectedSize && expectedSize > 0) {
    if (fileSize !== expectedSize) {
      throw new Error(
        `Tệp cài đặt tải về chưa đầy đủ (${(fileSize / 1024 / 1024).toFixed(1)}MB / ${(expectedSize / 1024 / 1024).toFixed(1)}MB). Vui lòng thử lại.`,
      );
    }
  } else if (fileSize < 10 * 1024 * 1024) {
    throw new Error(
      `Tệp cài đặt bị hỏng hoặc kích thước quá nhỏ (${(fileSize / 1024 / 1024).toFixed(1)}MB). Vui lòng thử lại.`,
    );
  }

  // 2. Kiểm tra Header PE Windows Executable (Magic Bytes 'MZ')
  const fd = fs.openSync(filePath, "r");
  const buffer = Buffer.alloc(2);
  fs.readSync(fd, buffer, 0, 2, 0);
  fs.closeSync(fd);

  if (buffer[0] !== 0x4d || buffer[1] !== 0x5a) {
    throw new Error(
      "Tệp cài đặt tải về bị lỗi định dạng (không phải Windows Executable hợp lệ - NSIS Error). Vui lòng thử lại.",
    );
  }
}

export async function downloadAndInstallUpdate(
  downloadUrl: string,
  onProgress: (progress: number) => void,
  expectedSize?: number,
): Promise<void> {
  // Đổi vị trí lưu tệp về userData để tránh lỗi Windows Memory Locking (%TEMP% - Error 998 Invalid access to memory location)
  const updateDir = path.join(app.getPath("userData"), "updates");
  if (!fs.existsSync(updateDir)) {
    fs.mkdirSync(updateDir, { recursive: true });
  }

  const destPath = path.join(updateDir, "KT_ADB_Tool_Setup.exe");

  // Xóa file cũ nếu đã tồn tại
  if (fs.existsSync(destPath)) {
    try {
      fs.unlinkSync(destPath);
    } catch (e) {
      console.warn("Không thể xóa file setup cũ:", e);
    }
  }

  const response = await axios({
    url: downloadUrl,
    method: "GET",
    responseType: "stream",
    maxRedirects: 10,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 600000, // 10 phút timeout cho file lớn
    headers: {
      "User-Agent": `KT_ADB_Tool/${app.getVersion()}`,
      Accept: "application/octet-stream, */*",
    },
  });

  const headerLength =
    response.headers["content-length"] ||
    response.headers["x-decompressed-content-length"];
  const headerTotal = parseInt(
    typeof headerLength === "string" ? headerLength : "0",
    10,
  );

  const totalLength = expectedSize && expectedSize > 0 ? expectedSize : headerTotal;
  let downloadedLength = 0;

  const writer = fs.createWriteStream(destPath, { autoClose: true });

  await new Promise<void>((resolve, reject) => {
    response.data.on("data", (chunk: Buffer) => {
      downloadedLength += chunk.length;
      if (totalLength > 0) {
        const pct = Math.min(
          99,
          Math.round((downloadedLength / totalLength) * 100),
        );
        onProgress(pct);
      } else {
        onProgress(Math.min(95, Math.floor(downloadedLength / 1024 / 1024)));
      }
    });

    response.data.on("error", (err: any) => {
      writer.destroy();
      if (fs.existsSync(destPath)) {
        try {
          fs.unlinkSync(destPath);
        } catch (_) {}
      }
      reject(new Error(`Lỗi mạng khi tải bản cập nhật: ${err.message}`));
    });

    writer.on("error", (err) => {
      writer.destroy();
      if (fs.existsSync(destPath)) {
        try {
          fs.unlinkSync(destPath);
        } catch (_) {}
      }
      reject(new Error(`Lỗi ghi tệp cài đặt: ${err.message}`));
    });

    writer.on("finish", () => {
      writer.close(() => {
        resolve();
      });
    });

    response.data.pipe(writer);
  });

  // Kiểm tra tính toàn vẹn tệp cài đặt trước khi kích hoạt
  try {
    validateInstallerFile(destPath, expectedSize);
  } catch (valErr: any) {
    if (fs.existsSync(destPath)) {
      try {
        fs.unlinkSync(destPath);
      } catch (_) {}
    }
    throw valErr;
  }

  onProgress(100);

  // Chờ 1.5s để hệ thống giải phóng toàn bộ luồng ghi file
  await new Promise((r) => setTimeout(r, 1500));

  // Khởi chạy bộ cài bằng lệnh CMD Detached độc lập (Tránh lỗi Windows Memory Locking Error 998 khi gọi qua Electron)
  try {
    const child = spawn(`"${destPath}"`, [], {
      detached: true,
      shell: true,
      stdio: "ignore",
    });
    child.unref();
  } catch (err: any) {
    console.error("Lỗi spawn installer:", err);
    try {
      const { shell } = await import("electron");
      await shell.openPath(destPath);
    } catch (openErr) {
      console.error("Lỗi shell openPath:", openErr);
    }
  }

  setTimeout(() => {
    app.quit();
  }, 1000);
}
