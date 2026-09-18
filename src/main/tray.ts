import { app, BrowserWindow, Menu, nativeImage, Tray } from "electron";
import { join } from "path";
import { stopAllScrcpy, isScrcpyActive } from "./core/deviceService";

let tray: Tray | null = null;
let hasShownBalloon = false;
let isQuitting = false;

export function getIsQuitting(): boolean {
  return isQuitting;
}

export function setIsQuitting(val: boolean): void {
  isQuitting = val;
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

  return Menu.buildFromTemplate([
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
    {
      label: mirroring
        ? "Tắt phản chiếu màn hình (Scrcpy)"
        : "Không có phản chiếu đang chạy",
      enabled: mirroring,
      click: () => {
        stopAllScrcpy();
        updateTrayMenu(mainWindow);
      },
    },
    { type: "separator" },
    {
      label: "Thoát hoàn toàn",
      click: () => {
        setIsQuitting(true);
        app.quit();
      },
    },
  ]);
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
  tray.on("right-click", () => {
    if (!mainWindow.isDestroyed()) {
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
