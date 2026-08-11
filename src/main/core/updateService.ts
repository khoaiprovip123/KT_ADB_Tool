import axios from "axios";
import { app, shell } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";
import { exec } from "child_process";
import { URL } from "url";

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
              asset.name.endsWith(".exe") && !asset.name.includes("blockmap"),
          ) || release.assets.find((asset: any) => asset.name.endsWith(".exe"));

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
      console.warn(
        `Check for updates warning on ${repo}:`,
        error.message || error,
      );
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
 * Download file dùng Node.js native https/http module — đảm bảo byte-perfect, không có axios transformation layer.
 * Hỗ trợ tự động follow redirect (GitHub Releases redirect nhiều lần).
 */
function nativeDownload(
  downloadUrl: string,
  destPath: string,
  totalSize: number,
  onProgress: (progress: number) => void,
  redirectCount = 0,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 10) {
      return reject(new Error("Quá nhiều redirect khi tải bản cập nhật."));
    }

    const parsedUrl = new URL(downloadUrl);
    const transport = parsedUrl.protocol === "https:" ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: "GET",
      headers: {
        "User-Agent": `KT_ADB_Tool/${app.getVersion()}`,
        Accept: "application/octet-stream",
        // Không gửi Accept-Encoding để server trả về raw binary
      },
    };

    const req = transport.request(options, (res) => {
      // Follow redirect (301, 302, 303, 307, 308)
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        res.resume(); // Drain response
        return nativeDownload(
          res.headers.location,
          destPath,
          totalSize,
          onProgress,
          redirectCount + 1,
        )
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(
          new Error(`Lỗi HTTP ${res.statusCode} khi tải bản cập nhật.`),
        );
      }

      const writer = fs.createWriteStream(destPath);
      let downloaded = 0;

      res.on("data", (chunk: Buffer) => {
        downloaded += chunk.length;
        if (totalSize > 0) {
          onProgress(Math.min(99, Math.round((downloaded / totalSize) * 100)));
        }
      });

      res.on("error", (err) => {
        writer.destroy();
        reject(new Error(`Lỗi mạng khi tải bản cập nhật: ${err.message}`));
      });

      writer.on("error", (err) => {
        writer.destroy();
        reject(new Error(`Lỗi ghi tệp cài đặt: ${err.message}`));
      });

      writer.on("finish", () => {
        resolve();
      });

      res.pipe(writer);
    });

    req.on("error", (err) => {
      reject(new Error(`Lỗi kết nối khi tải bản cập nhật: ${err.message}`));
    });

    req.setTimeout(600000, () => {
      req.destroy();
      reject(new Error("Hết thời gian chờ khi tải bản cập nhật (10 phút)."));
    });

    req.end();
  });
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
  // Thư mục lưu tệp cập nhật
  const updateDir = path.join(app.getPath("userData"), "updates");
  if (!fs.existsSync(updateDir)) {
    fs.mkdirSync(updateDir, { recursive: true });
  } else {
    // Thử xóa các file installer cũ bị lock hoặc dư thừa
    try {
      const existingFiles = fs.readdirSync(updateDir);
      for (const f of existingFiles) {
        if (f.endsWith(".exe")) {
          try {
            fs.unlinkSync(path.join(updateDir, f));
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  // Tạo tên file độc lập theo Timestamp
  const uniqueName = `KT_ADB_Tool_Setup_${Date.now()}.exe`;
  const destPath = path.join(updateDir, uniqueName);

  // Download bằng Node.js native https — không có axios transformation layer
  await nativeDownload(
    downloadUrl,
    destPath,
    expectedSize ?? 0,
    onProgress,
  );

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

  // Chờ 1s để hệ thống giải phóng toàn bộ luồng ghi file
  await new Promise((r) => setTimeout(r, 1000));

  // Khởi chạy bộ cài bằng Electron shell.openPath (Windows Shell native)
  try {
    const openErr = await shell.openPath(destPath);
    if (openErr) {
      console.warn(
        "shell.openPath warning, fallback to cmd start:",
        openErr,
      );
      exec(`cmd /c start "" "${destPath}"`);
    }
  } catch (err: any) {
    console.error("Lỗi khi chạy installer:", err);
    try {
      exec(`cmd /c start "" "${destPath}"`);
    } catch (_) {}
  }

  // Thoát app cũ sau 1s để nhả lock file cho installer thay thế
  setTimeout(() => {
    app.quit();
  }, 1000);
}
