import * as fs from "fs";
import * as path from "path";
import { adbState, execAdb } from "./adbCore";
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

export async function listDirectoryShell(deviceId: string, remotePath: string) {
  try {
    const output = await execAdb(deviceId, `ls -al ${shellQuote(remotePath)}`);
    const lines = output.split(/\r?\n/);
    const result: any[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("total ")) continue;

      // Định dạng drwxrwxrwx 4 owner group size date time name
      const match = trimmed.match(/^([d-])\S*\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(.+?)\s+(.+)$/);
      if (match) {
        const isDir = match[1] === "d";
        const size = parseInt(match[2], 10);
        const mtimeStr = match[3];
        const name = match[4];

        if (name === "." || name === "..") continue;

        let mtimeMs = Date.now();
        try {
          const parsedDate = new Date(mtimeStr);
          if (!isNaN(parsedDate.getTime())) {
            mtimeMs = parsedDate.getTime();
          }
        } catch {
          // Bỏ qua
        }

        result.push({
          name,
          size,
          mtime: new Date(mtimeMs),
          mode: isDir ? 0o040000 : 0o100000,
          isDir,
          isFile: !isDir,
        });
      } else {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 7) {
          const perm = parts[0];
          const isDir = perm.startsWith("d");
          const size = parseInt(parts[4]) || 0;
          const name = parts.slice(8).join(" ");
          if (name === "." || name === "..") continue;
          result.push({
            name,
            size,
            mtime: new Date(),
            mode: isDir ? 0o040000 : 0o100000,
            isDir,
            isFile: !isDir,
          });
        }
      }
    }

    return result.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (err: any) {
    console.error(`Failed to list directory via shell ${remotePath}:`, err);
    throw err;
  }
}

export async function listDirectory(deviceId: string, remotePath: string) {
  try {
    if (!deviceId) throw new Error("Device ID is required");
    assertSafeRemotePath(remotePath);

    const isAndroidStorageSilo =
      remotePath.includes("/Android/data") ||
      remotePath.includes("/Android/obb");

    if (isAndroidStorageSilo) {
      return await listDirectoryShell(deviceId, remotePath);
    }

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
    console.warn(`Failed to list directory ${remotePath} via sync API, fallback to shell:`, err.message || err);
    try {
      return await listDirectoryShell(deviceId, remotePath);
    } catch (fallbackErr) {
      console.error(`Fallback listDirectoryShell failed for ${remotePath}:`, fallbackErr);
      throw err;
    }
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

export async function deleteFile(deviceId: string, remotePath: string): Promise<boolean> {
  try {
    assertSafeRemotePath(remotePath, false);
    return await new Promise<boolean>((resolve, reject) => {
      let output = "";
      adbState.client
        .shell(deviceId, `rm -rf ${shellQuote(remotePath)}`)
        .then((stream: any) => {
          stream.on("data", (chunk: any) => {
            output += chunk?.toString() || "";
          });
          stream.on("end", () => {
            if (output.trim() && /permission denied|read-only/i.test(output)) {
              // Thử lại với su nếu máy đã root
              adbState.client
                .shell(deviceId, `su -c "rm -rf ${shellQuote(remotePath)}"`)
                .then((suStream: any) => {
                  suStream.on("data", () => {});
                  suStream.on("end", () => resolve(true));
                  suStream.on("error", () => resolve(false));
                })
                .catch(() => resolve(false));
            } else {
              // Cập nhật lại media scanner để Android xóa cache ảnh/video
              adbState.client
                .shell(deviceId, `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file://${shellQuote(remotePath)}"`)
                .then((s: any) => s.on("data", () => {}))
                .catch(() => {});
              resolve(true);
            }
          });
          stream.on("error", reject);
        })
        .catch(reject);
    });
  } catch (err) {
    console.error(`Failed to delete ${remotePath}:`, err);
    return false;
  }
}

export async function deleteFiles(
  deviceId: string,
  remotePaths: string[],
): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
  const validPaths: string[] = [];
  const errors: string[] = [];

  for (const p of remotePaths) {
    try {
      assertSafeRemotePath(p, false);
      validPaths.push(p);
    } catch (e: any) {
      errors.push(`${p}: ${e.message}`);
    }
  }

  if (validPaths.length === 0) {
    return { success: false, deletedCount: 0, errors };
  }

  let deletedCount = 0;
  const CHUNK_SIZE = 50;

  for (let i = 0; i < validPaths.length; i += CHUNK_SIZE) {
    const chunk = validPaths.slice(i, i + CHUNK_SIZE);
    const quoted = chunk.map((p) => shellQuote(p)).join(" ");
    const cmd = `rm -rf ${quoted}`;

    try {
      await new Promise<void>((resolve, reject) => {
        let output = "";
        adbState.client
          .shell(deviceId, cmd)
          .then((stream: any) => {
            stream.on("data", (data: any) => {
              output += data?.toString() || "";
            });
            stream.on("end", () => {
              if (output.trim() && /permission denied|read-only/i.test(output)) {
                adbState.client
                  .shell(deviceId, `su -c "rm -rf ${quoted}"`)
                  .then((suStream: any) => {
                    suStream.on("data", () => {});
                    suStream.on("end", () => {
                      deletedCount += chunk.length;
                      resolve();
                    });
                    suStream.on("error", () => {
                      errors.push(output.trim());
                      resolve();
                    });
                  })
                  .catch(() => {
                    errors.push(output.trim());
                    resolve();
                  });
              } else {
                deletedCount += chunk.length;
                resolve();
              }
            });
            stream.on("error", reject);
          })
          .catch(reject);
      });

      for (const p of chunk) {
        adbState.client
          .shell(deviceId, `am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file://${shellQuote(p)}"`)
          .then((s: any) => s.on("data", () => {}))
          .catch(() => {});
      }
    } catch (err: any) {
      errors.push(err?.message || String(err));
    }
  }

  return {
    success: errors.length === 0,
    deletedCount,
    errors,
  };
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
    const fileName = path.basename(localPath);
    let targetRemote = remotePath.replace(/\\/g, "/");
    if (targetRemote.endsWith("/") || !path.posix.basename(targetRemote).includes(".")) {
      targetRemote = targetRemote.replace(/\/+$/, "") + "/" + fileName;
    }
    assertSafeRemotePath(targetRemote, false);
    onLog(`Đang tải lên: ${fileName} -> ${targetRemote}`);
    const transfer = await adbState.client.push(
      deviceId,
      localPath,
      targetRemote,
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
        outStream.destroy();
        onLog(`Lỗi tải về: ${err.message}`);
        reject(err);
      });
      outStream.on("error", (err: any) => {
        outStream.destroy();
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
