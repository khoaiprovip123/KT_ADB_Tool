import { app, BrowserWindow, Menu, nativeImage, Tray } from "electron";
import { join } from "path";
import { stopAllScrcpy, isScrcpyActive, runScrcpy } from "./core/deviceService";
import { getDevices } from "./core/adbCore";
import { store } from "./store";

let tray: Tray | null = null;
let hasShownBalloon = false;
let isQuitting = false;
let cachedDevices: any[] = [];

export function getIsQuitting(): boolean {
  return isQuitting;
}

export function setIsQuitting(val: boolean): void {
  isQuitting = val;
}

export function setTrayDevices(devices: any[], mainWindow?: BrowserWindow): void {
  cachedDevices = Array.isArray(devices) ? devices : [];
  if (mainWindow && !mainWindow.isDestroyed()) {
    updateTrayMenu(mainWindow);
  }
}

function getTrayIcon(): Electron.NativeImage {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, "icon.png")
    : join(__dirname, "../../resources/icon.png");

  let img = nativeImage.createFromPath(iconPath);
  if (img.isEmpty()) {
    img = nativeImage.createFromPath(join(__dirname, "../../resources/icon.png"));
  }
  return img.resize({ width: 16, height: 16 });
}

export function buildTrayContextMenu(mainWindow: BrowserWindow): Menu {
  const mirroring = isScrcpyActive();
  const onlineDevices = cachedDevices.filter(
    (d) => d.status === "device" || d.type === "device",
  );
  const hasDevice = onlineDevices.length > 0;
  const firstDevice = onlineDevices[0];

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "KT ADB Tool Pro",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Hiện giao diện chính",
      click: () => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "Ẩn xuống khay hệ thống",
      click: () => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.hide();
        }
      },
    },
    { type: "separator" },
  ];

  if (mirroring) {
    template.push({
      label: "🛑 Dừng chiếu màn hình (Scrcpy)",
      click: () => {
        stopAllScrcpy();
        updateTrayMenu(mainWindow);
      },
    });
  } else if (hasDevice) {
    const useBorderless = (store.get("scrcpyBorderless") as boolean) ?? false;
    template.push({
      label: `📱 Chiếu màn hình (Tắt màn hình ĐT)${onlineDevices.length === 1 ? ` - ${firstDevice.id}` : ""}`,
      click: async () => {
        await runScrcpy(
          firstDevice.id,
          true,
          (log) => {
            if (!mainWindow.isDestroyed()) {
              mainWindow.webContents.send("adb:log-stream", log);
            }
          },
          useBorderless,
        );
        updateTrayMenu(mainWindow);
      },
    });

    if (onlineDevices.length > 1) {
      template.push({
        label: "📱 Chiếu màn hình (Tắt màn hình ĐT) - Chọn máy",
        submenu: onlineDevices.map((dev) => ({
          label: `${dev.id} (${dev.model || "Thiết bị"})`,
          click: async () => {
            await runScrcpy(
              dev.id,
              true,
              (log) => {
                if (!mainWindow.isDestroyed()) {
                  mainWindow.webContents.send("adb:log-stream", log);
                }
              },
              useBorderless,
            );
            updateTrayMenu(mainWindow);
          },
        })),
      });
    }

    template.push({
      label: "🖥️ Chiếu màn hình (Màn hình ĐT vẫn bật)",
      click: async () => {
        await runScrcpy(
          firstDevice.id,
          false,
          (log) => {
            if (!mainWindow.isDestroyed()) {
              mainWindow.webContents.send("adb:log-stream", log);
            }
          },
          useBorderless,
        );
        updateTrayMenu(mainWindow);
      },
    });
  } else {
    template.push({
      label: "📱 Chiếu màn hình (Chưa kết nối ĐT)",
      enabled: false,
    });
  }

  template.push(
    { type: "separator" },
    {
      label: "Thoát hoàn toàn",
      click: () => {
        setIsQuitting(true);
        app.quit();
      },
    },
  );

  return Menu.buildFromTemplate(template);
}

export function updateTrayMenu(mainWindow: BrowserWindow): void {
  if (!tray || tray.isDestroyed()) return;
  const contextMenu = buildTrayContextMenu(mainWindow);
  tray.setContextMenu(contextMenu);

  const mirroring = isScrcpyActive();
  tray.setToolTip(
    mirroring
      ? "KT ADB Tool Pro (Đang phản chiếu màn hình)"
      : "KT ADB Tool Pro",
  );
}

export function notifyMinimizedToTray(): void {
  if (!tray || tray.isDestroyed() || hasShownBalloon) return;
  hasShownBalloon = true;
  try {
    tray.displayBalloon({
      title: "KT ADB Tool Pro",
      content: "Ứng dụng đang chạy ngầm trong khay hệ thống. Bấm vào biểu tượng để mở lại.",
    });
  } catch {
    /* ignore balloon errors on unsupported platforms */
  }
}

export function setupTray(mainWindow: BrowserWindow): Tray {
  if (tray && !tray.isDestroyed()) {
    return tray;
  }

  const icon = getTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip("KT ADB Tool Pro");

  updateTrayMenu(mainWindow);

  // Click chuột trái: Bật / tắt hiển thị cửa sổ
  tray.on("click", () => {
    if (mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Double click: Luôn khôi phục và đưa cửa sổ lên trên cùng
  tray.on("double-click", () => {
    if (mainWindow.isDestroyed()) return;
    mainWindow.show();
    mainWindow.focus();
  });

  // Right-click: Cập nhật menu động trước khi popup
  tray.on("right-click", async () => {
    if (!mainWindow.isDestroyed()) {
      try {
        const devs = await getDevices();
        cachedDevices = Array.isArray(devs) ? devs : [];
      } catch {
        /* ignore */
      }
      updateTrayMenu(mainWindow);
    }
  });

  return tray;
}

export function destroyTray(): void {
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
  }
}
