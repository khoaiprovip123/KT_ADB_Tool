import { app, BrowserWindow, dialog, shell } from "electron";
import { join } from "path";
import { registerIpcHandlers } from "./ipc";
import { cleanupAllProcesses } from "./core/deviceService";

function isIgnorableError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  const code = String(error.code || "").toLowerCase();
  return (
    code === "econnreset" ||
    msg.includes("econnreset") ||
    msg.includes("connection reset") ||
    code === "epipe" ||
    msg.includes("epipe") ||
    msg.includes("broken pipe") ||
    code === "econnrefused" ||
    msg.includes("econnrefused") ||
    code === "etimedout" ||
    msg.includes("etimedout") ||
    code === "ebadf" ||
    msg.includes("device offline") ||
    msg.includes("device not found") ||
    msg.includes("premature close") ||
    msg.includes("socket closed") ||
    msg.includes("stream destroyed") ||
    msg.includes("spawn")
  );
}

// Ngăn chặn popup lỗi JavaScript và hiển thị dialog cảnh báo lỗi hệ thống nghiêm trọng
process.on("uncaughtException", (error) => {
  if (isIgnorableError(error)) {
    // console.warn("[ADB Connection Reset Ignored]:", error.message || error);
    return;
  }
  console.error("[Uncaught Exception Alert]:", error);
  dialog.showErrorBox(
    "Lỗi hệ thống nghiêm trọng",
    `Ứng dụng gặp lỗi không mong muốn:\n${error.stack || error.message}`,
  );
});

process.on("unhandledRejection", (reason: any) => {
  if (isIgnorableError(reason)) {
    // console.warn("[ADB Connection Reset Rejection Ignored]:", reason?.message || reason);
    return;
  }
  console.error("[Unhandled Rejection Alert]:", reason);
  const errMsg =
    reason instanceof Error ? reason.stack || reason.message : String(reason);
  dialog.showErrorBox(
    "Lỗi hệ thống nghiêm trọng (Promise Rejection)",
    `Xảy ra lỗi bất đồng bộ chưa được xử lý:\n${errMsg}`,
  );
});

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    transparent: true,
    backgroundColor: "#00000000",
    icon: join(__dirname, "../../resources/icon.png"),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        void shell.openExternal(parsed.toString());
      }
    } catch {
      // URL không hợp lệ luôn bị từ chối.
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    const currentUrl = mainWindow.webContents.getURL();
    if (targetUrl !== currentUrl) event.preventDefault();
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();

    // Tự động kiểm tra cập nhật sau 3 giây khi khởi động
    setTimeout(async () => {
      try {
        const { checkForUpdates } = await import("./core/updateService");
        const updateInfo = await checkForUpdates();
        if (updateInfo.available && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("app:update-available", updateInfo);
        }
      } catch (err) {
        console.error("Auto-update check failed:", err);
      }
    }, 3000);
  });

  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.webContents.on("console-message", (_event, level, message, lineNumber, sourceId) => {
    console.log(
      `[Renderer][${level}] ${message} (${sourceId}:${lineNumber})`,
    );
  });

  // Đăng ký toàn bộ IPC listener
  registerIpcHandlers(mainWindow);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  cleanupAllProcesses();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  cleanupAllProcesses();
});
