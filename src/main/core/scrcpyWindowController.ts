import { adbState } from "./adbCore";

// ScrcpyContainer.exe quản lý lifecycle scrcpy trực tiếp.
// File này chỉ còn các helper lấy thông tin thiết bị và compatibility stubs.

/**
 * Lấy kích thước màn hình thực tế của thiết bị qua adb wm size
 */
export async function getDeviceAspectRatio(
  deviceId: string,
): Promise<{ width: number; height: number; aspectRatio: number }> {
  try {
    const client = adbState.client;
    if (!client) {
      return { width: 1080, height: 2400, aspectRatio: 1080 / 2400 };
    }

    const output = await new Promise<string>((resolve) => {
      client
        .shell(deviceId, "wm size")
        .then((stream: any) => {
          let data = "";
          stream.on("data", (chunk: any) => (data += chunk.toString()));
          stream.on("end", () => resolve(data));
          stream.on("error", () => resolve(""));
        })
        .catch(() => resolve(""));
    });

    const overrideMatch = output.match(/Override size:\s*(\d+)x(\d+)/i);
    const physicalMatch = output.match(/Physical size:\s*(\d+)x(\d+)/i);
    const match = overrideMatch || physicalMatch;
    if (match) {
      const w = parseInt(match[1], 10);
      const h = parseInt(match[2], 10);
      if (w > 0 && h > 0) {
        return { width: w, height: h, aspectRatio: w / h };
      }
    }
  } catch {
    /* fallback */
  }
  return { width: 1080, height: 2400, aspectRatio: 1080 / 2400 };
}

// =========================================================================
// Compatibility stubs
// =========================================================================

export function stopScrcpyWindowController(_deviceId: string) {
  /* no-op */
}

export function cleanupAllWindowControllers() {
  /* no-op */
}
