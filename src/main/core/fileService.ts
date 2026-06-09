import * as fs from "fs";
import * as path from "path";
import { adbState } from "./adbCore";
import { shellQuote, validateRemotePath } from "./adbSafety";

const NON_MODIFIABLE_REMOTE_ROOTS = [
  "/sdcard",
  "/storage",
  "/storage/emulated",
  "/storage/emulated/0",
  "/data/local/tmp",
];

function assertSafeRemotePath(remotePath: string, allowRoot = true) {
  if (!validateRemotePath(remotePath)) {
    throw new Error("Unsafe remote path");
  }
  const normalizedPath = remotePath.trim().replace(/\/+/g, "/");
  if (!allowRoot && NON_MODIFIABLE_REMOTE_ROOTS.includes(normalizedPath)) {
    throw new Error("Refusing to modify storage root");
  }
}

export async function listDirectory(deviceId: string, remotePath: string) {
  try {
    if (!deviceId) throw new Error("Device ID is required");
    assertSafeRemotePath(remotePath);

    const files = await Promise.race([
      adbState.client.readdir(deviceId, remotePath),
      new Promise<any[]>((_, reject) =>
        setTimeout(() => reject(new Error("Read Directory Timeout")), 8000),
      ),
    ]);

    return files
      .map((file: any) => ({
        name: file.name,
        size: file.size,
        mtime: file.mtime,
        mode: file.mode,
        isDir: (file.mode & 0o040000) === 0o040000,
        isFile: (file.mode & 0o100000) === 0o100000,
      }))
      .sort((a: any, b: any) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
      });
  } catch (err: any) {
    console.error(`Failed to list directory ${remotePath}:`, err);
    throw err;
  }
}

export async function createDirectory(deviceId: string, remotePath: string) {
  try {
    assertSafeRemotePath(remotePath, false);
    await new Promise<void>((resolve, reject) => {
      adbState.client
        .shell(deviceId, `mkdir -p ${shellQuote(remotePath)}`)
        .then((stream: any) => {
          stream.on("data", () => {});
          stream.on("end", resolve);
          stream.on("error", reject);
        })
        .catch(reject);
    });
    return true;
  } catch (err) {
    console.error(`Failed to create directory ${remotePath}:`, err);
    return false;
  }
}

export async function deleteFile(deviceId: string, remotePath: string) {
  try {
    assertSafeRemotePath(remotePath, false);
    await new Promise<void>((resolve, reject) => {
      adbState.client
        .shell(deviceId, `rm -rf ${shellQuote(remotePath)}`)
        .then((stream: any) => {
          stream.on("data", () => {});
          stream.on("end", resolve);
          stream.on("error", reject);
        })
        .catch(reject);
    });
    return true;
  } catch (err) {
    console.error(`Failed to delete ${remotePath}:`, err);
    return false;
  }
}

export async function renameFile(
  deviceId: string,
  oldPath: string,
  newPath: string,
) {
  try {
    assertSafeRemotePath(oldPath, false);
    assertSafeRemotePath(newPath, false);
    await new Promise<void>((resolve, reject) => {
      adbState.client
        .shell(deviceId, `mv ${shellQuote(oldPath)} ${shellQuote(newPath)}`)
        .then((stream: any) => {
          stream.on("data", () => {});
          stream.on("end", resolve);
          stream.on("error", reject);
        })
        .catch(reject);
    });
    return true;
  } catch (err) {
    console.error(`Failed to rename ${oldPath} to ${newPath}:`, err);
    return false;
  }
}

export async function pushFile(
  deviceId: string,
  localPath: string,
  remotePath: string,
  onLog: (log: string) => void,
) {
  try {
    assertSafeRemotePath(remotePath, false);
    onLog(`Đang tải lên: ${path.basename(localPath)} -> ${remotePath}`);
    const transfer = await adbState.client.push(
      deviceId,
      localPath,
      remotePath,
    );
    return new Promise((resolve, reject) => {
      transfer.on("progress", (stats: any) => {
        onLog(
          `Đang đẩy file: ${(stats.bytesTransferred / 1024 / 1024).toFixed(2)} MB...`,
        );
      });
      transfer.on("end", () => {
        onLog(`Tải lên thành công!`);
        resolve(true);
      });
      transfer.on("error", (err: any) => {
        onLog(`Lỗi tải lên: ${err.message}`);
        reject(err);
      });
    });
  } catch (err: any) {
    onLog(`Lỗi hệ thống khi đẩy file: ${err.message}`);
    return false;
  }
}

export async function pullFile(
  deviceId: string,
  remotePath: string,
  localPath: string,
  onLog: (log: string) => void,
) {
  try {
    assertSafeRemotePath(remotePath, false);
    onLog(`Đang tải về: ${remotePath} -> ${localPath}`);
    const transfer = await adbState.client.pull(deviceId, remotePath);
    return new Promise((resolve, reject) => {
      const outStream = fs.createWriteStream(localPath);
      transfer.on("progress", (stats: any) => {
        onLog(
          `Đang kéo file: ${(stats.bytesTransferred / 1024 / 1024).toFixed(2)} MB...`,
        );
      });
      transfer.on("end", () => {
        onLog(`Tải về thành công!`);
        resolve(true);
      });
      transfer.on("error", (err: any) => {
        onLog(`Lỗi tải về: ${err.message}`);
        reject(err);
      });
      transfer.pipe(outStream);
    });
  } catch (err: any) {
    onLog(`Lỗi hệ thống khi kéo file: ${err.message}`);
    return false;
  }
}

export async function getFileBase64(deviceId: string, remotePath: string) {
  try {
    assertSafeRemotePath(remotePath, false);
    const transfer = await adbState.client.pull(deviceId, remotePath);
    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      transfer.on("data", (chunk: Buffer) => chunks.push(chunk));
      transfer.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString("base64"));
      });
      transfer.on("error", (err: any) => {
        console.error("Transfer error:", err);
        reject(err);
      });
    });
  } catch (err: any) {
    console.error(`getFileBase64 Error: ${err.message}`);
    throw err;
  }
}

export async function getStoragePoints(deviceId: string) {
  const cleanId = deviceId.split(" ")[0].trim();

  try {
    const output = await Promise.race([
      new Promise<string>((resolve, reject) => {
        let data = "";
        adbState.client
          .shell(cleanId, "df")
          .then((s: any) => {
            s.on("data", (c: any) => (data += c));
            s.on("end", () => resolve(data));
            s.on("error", reject);
          })
          .catch(reject);
      }),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("ADB Timeout")), 4000),
      ),
    ]);

    const lines = output.split("\n");
    const storagePoints: any[] = [];

    const getPhysicalSize = (totalGB: number) => {
      const standards = [8, 16, 32, 64, 128, 256, 512, 1024];
      for (const s of standards) {
        if (totalGB <= s * 0.95) return s;
      }
      return Math.ceil(totalGB / 128) * 128;
    };

    const internalLine =
      lines.find((l) => l.includes(" /data")) ||
      lines.find((l) => l.includes("/storage/emulated")) ||
      lines.find((l) => l.includes("/sdcard"));

    if (internalLine) {
      const parts = internalLine.trim().split(/\s+/);
      if (parts.length >= 4) {
        const total1K = parseInt(parts[1]) || 0;
        const avail1K = parseInt(parts[3]) || 0;
        const totalGB = total1K / 1024 / 1024;
        const availGB = avail1K / 1024 / 1024;
        const physicalGB = getPhysicalSize(totalGB);
        const usedGB = Math.max(0, physicalGB - availGB);

        storagePoints.push({
          name: "Bộ nhớ trong",
          path: "/sdcard",
          type: "internal",
          total: physicalGB * 1024 * 1024 * 1024,
          used: usedGB * 1024 * 1024 * 1024,
          percent: Math.max(
            0,
            Math.min(100, Math.round((usedGB / physicalGB) * 100)),
          ),
        });
      }
    }

    lines.forEach((line) => {
      if (
        line.includes("/storage/") &&
        !line.includes("/emulated") &&
        !line.includes("self")
      ) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const mountPath = parts[parts.length - 1];
          const id = mountPath.split("/").pop();
          const total1K = parseInt(parts[1]) || 0;
          const avail1K = parseInt(parts[3]) || 0;
          if (total1K > 0) {
            storagePoints.push({
              name: `Thẻ nhớ (${id})`,
              path: mountPath,
              type: "external",
              total: total1K * 1024,
              used: (total1K - avail1K) * 1024,
              percent: Math.max(
                0,
                Math.min(
                  100,
                  Math.round(((total1K - avail1K) / total1K) * 100),
                ),
              ),
            });
          }
        }
      }
    });

    if (storagePoints.length === 0) {
      storagePoints.push({
        name: "Bộ nhớ trong",
        path: "/sdcard",
        type: "internal",
        total: 0,
        used: 0,
        percent: 0,
      });
    }

    return storagePoints;
  } catch (err) {
    console.error("getStoragePoints Error:", err);
    return [
      {
        name: "Bộ nhớ trong",
        path: "/sdcard",
        type: "internal",
        total: 0,
        used: 0,
        percent: 0,
      },
    ];
  }
}
