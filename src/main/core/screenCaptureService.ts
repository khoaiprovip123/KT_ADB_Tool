import * as path from "path";
import * as fs from "fs";
import { app, clipboard, nativeImage, shell } from "electron";
import { spawn } from "child_process";
import { currentAdbExe } from "./adbCore";

function getAdbExe(): string {
  if (currentAdbExe && currentAdbExe !== "adb") return currentAdbExe;
  const binPath = app.isPackaged
    ? path.join(process.resourcesPath, "bin")
    : path.join(__dirname, "../../resources/bin");
  return path.join(binPath, "adb.exe");
}

function getTimestampString(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function sanitizeDevice(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

interface RecordingSession {
  process: any;
  remotePath: string;
  startTime: number;
}

const activeRecordings = new Map<string, RecordingSession>();

/**
 * 1-Click Screenshot:
 * Chụp ảnh màn hình điện thoại qua ADB, lưu vào thư mục Pictures/KT_ADB_Screenshots,
 * đồng thời nạp trực tiếp vào Clipboard Windows để dán ngay lập tức (Ctrl + V).
 */
export async function captureDeviceScreenshot(deviceId: string): Promise<{
  success: boolean;
  filePath?: string;
  message?: string;
  error?: string;
}> {
  try {
    const adbExe = getAdbExe();
    const picDir = path.join(app.getPath("pictures"), "KT_ADB_Screenshots");
    if (!fs.existsSync(picDir)) {
      fs.mkdirSync(picDir, { recursive: true });
    }

    const fileName = `Screenshot_${getTimestampString()}_${sanitizeDevice(deviceId)}.png`;
    const targetFile = path.join(picDir, fileName);

    // Cách 1: Nhanh nhất qua exec-out (không cần lưu tạm trên bộ nhớ máy)
    const pngBuffer = await new Promise<Buffer | null>((resolve) => {
      const chunks: Buffer[] = [];
      const proc = spawn(adbExe, ["-s", deviceId, "exec-out", "screencap", "-p"], {
        windowsHide: true,
      });

      proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      proc.on("error", () => resolve(null));
      proc.on("close", (code) => {
        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          resolve(null);
        }
      });
    });

    let finalBuffer = pngBuffer;

    // Fallback nếu exec-out không thành công
    if (!finalBuffer || finalBuffer.length < 1000) {
      const remoteTemp = `/sdcard/kt_temp_${Date.now()}.png`;
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(adbExe, ["-s", deviceId, "shell", "screencap", "-p", remoteTemp], {
          windowsHide: true,
        });
        proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error("screencap failed"))));
      });

      await new Promise<void>((resolve, reject) => {
        const proc = spawn(adbExe, ["-s", deviceId, "pull", remoteTemp, targetFile], {
          windowsHide: true,
        });
        proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error("pull failed"))));
      });

      // Dọn dẹp file tạm trên điện thoại
      spawn(adbExe, ["-s", deviceId, "shell", "rm", remoteTemp], { windowsHide: true });

      if (fs.existsSync(targetFile)) {
        finalBuffer = fs.readFileSync(targetFile);
      }
    } else {
      // Ghi buffer vào file
      fs.writeFileSync(targetFile, finalBuffer);
    }

    if (!finalBuffer || finalBuffer.length === 0) {
      return { success: false, error: "Không chụp được ảnh màn hình từ thiết bị" };
    }

    // Sao chép ảnh vào Clipboard của hệ điều hành
    try {
      const img = nativeImage.createFromBuffer(finalBuffer);
      clipboard.writeImage(img);
    } catch (e) {
      console.warn("Không thể copy ảnh vào clipboard:", e);
    }

    return {
      success: true,
      filePath: targetFile,
      message: `Đã lưu ảnh và sao chép vào bộ nhớ tạm: ${fileName}`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi chụp ảnh màn hình" };
  }
}

/**
 * Bắt đầu quay video màn hình điện thoại
 */
export async function startDeviceRecording(deviceId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  if (activeRecordings.has(deviceId)) {
    return { success: false, error: "Thiết bị này đang trong quá trình quay màn hình." };
  }

  const adbExe = getAdbExe();
  const remotePath = `/sdcard/kt_rec_${Date.now()}.mp4`;

  try {
    // Android screenrecord tối đa 3 phút / lần chạy, bitrate 6Mbps mượt mà
    const proc = spawn(adbExe, ["-s", deviceId, "shell", "screenrecord", "--bit-rate", "6000000", remotePath], {
      windowsHide: true,
    });

    activeRecordings.set(deviceId, {
      process: proc,
      remotePath,
      startTime: Date.now(),
    });

    proc.on("close", () => {
      activeRecordings.delete(deviceId);
    });

    return { success: true, message: "Đang quay màn hình thiết bị..." };
  } catch (err: any) {
    return { success: false, error: err.message || "Không thể bắt đầu quay video" };
  }
}

/**
 * Dừng quay video màn hình và kéo file .mp4 về máy tính
 */
export async function stopDeviceRecording(deviceId: string): Promise<{
  success: boolean;
  filePath?: string;
  message?: string;
  error?: string;
}> {
  const session = activeRecordings.get(deviceId);
  const adbExe = getAdbExe();

  if (!session) {
    return { success: false, error: "Không tìm thấy phiên quay video nào đang hoạt động." };
  }

  try {
    // 1. Dừng tiến trình screenrecord (gửi signal kết thúc để Android chốt file MP4 atom)
    try {
      session.process.kill("SIGINT");
    } catch {
      /* ignore */
    }

    // Đảm bảo lệnh trên thiết bị đã nhận được tín hiệu ngắt SIGINT (2)
    await new Promise<void>((resolve) => {
      const pkill = spawn(adbExe, ["-s", deviceId, "shell", "pkill", "-2", "screenrecord"], {
        windowsHide: true,
      });
      pkill.on("close", () => resolve());
      setTimeout(resolve, 1200);
    });

    // Chờ 1 giây để Android ghi xong container MP4
    await new Promise((r) => setTimeout(r, 1200));

    // 2. Thư mục đích trên máy tính
    const vidDir = path.join(app.getPath("videos"), "KT_ADB_Recordings");
    if (!fs.existsSync(vidDir)) {
      fs.mkdirSync(vidDir, { recursive: true });
    }

    const fileName = `Record_${getTimestampString()}_${sanitizeDevice(deviceId)}.mp4`;
    const localFile = path.join(vidDir, fileName);

    // 3. Kéo file từ /sdcard về máy tính
    await new Promise<void>((resolve, reject) => {
      const pullProc = spawn(adbExe, ["-s", deviceId, "pull", session.remotePath, localFile], {
        windowsHide: true,
      });
      pullProc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error("Không thể kéo video từ thiết bị về máy tính"));
      });
    });

    // 4. Xóa file tạm trên thiết bị
    spawn(adbExe, ["-s", deviceId, "shell", "rm", session.remotePath], { windowsHide: true });
    activeRecordings.delete(deviceId);

    return {
      success: true,
      filePath: localFile,
      message: `Đã lưu video quay màn hình: ${fileName}`,
    };
  } catch (err: any) {
    activeRecordings.delete(deviceId);
    return { success: false, error: err.message || "Lỗi khi lưu video quay màn hình" };
  }
}

/**
 * Kiểm tra trạng thái đang quay video
 */
export function isScreenRecording(deviceId: string): boolean {
  return activeRecordings.has(deviceId);
}

/**
 * Mở thư mục chứa ảnh hoặc video trên máy tính
 */
export async function openCaptureFolder(type: "screenshots" | "videos"): Promise<boolean> {
  try {
    const dir =
      type === "screenshots"
        ? path.join(app.getPath("pictures"), "KT_ADB_Screenshots")
        : path.join(app.getPath("videos"), "KT_ADB_Recordings");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await shell.openPath(dir);
    return true;
  } catch {
    return false;
  }
}
