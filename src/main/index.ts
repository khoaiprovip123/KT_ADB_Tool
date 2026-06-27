import { app, BrowserWindow, dialog } from "electron";
import { join } from "path";
import { registerIpcHandlers } from "./ipc";

// Ngăn chặn popup lỗi JavaScript và hiển thị dialog cảnh báo lỗi hệ thống nghiêm trọng
process.on("uncaughtException", (error) => {
  console.error("[Uncaught Exception Alert]:", error);
  dialog.showErrorBox(
    "Lỗi hệ thống nghiêm trọng",
    `Ứng dụng gặp lỗi không mong muốn:\n${error.stack || error.message}`
  );
});

process.on("unhandledRejection", (reason: any) => {
  console.error("[Unhandled Rejection Alert]:", reason);
  const errMsg = reason instanceof Error ? reason.stack || reason.message : String(reason);
  dialog.showErrorBox(
    "Lỗi hệ thống nghiêm trọng (Promise Rejection)",
    `Xảy ra lỗi bất đồng bộ chưa được xử lý:\n${errMsg}`
  );
});

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: true,
    backgroundColor: "#f4f7fb",
    icon: join(__dirname, "../../resources/icon.png"),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();

    // Tự động kiểm tra cập nhật sau 3 giây khi khởi động
    setTimeout(async () => {
      try {
        const { checkForUpdates } = await import("./core/updateService");
        const updateInfo = await checkForUpdates();
        if (updateInfo.available) {
          const { response } = await dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "Phát hiện bản cập nhật mới",
            message: `Phiên bản mới v${updateInfo.version} đã sẵn sàng!`,
            detail: `Nội dung cập nhật:\n${updateInfo.changelog || "Không có chi tiết."}\n\nBạn có muốn tải xuống và nâng cấp tự động không?`,
            buttons: ["Nâng cấp ngay", "Để sau"],
            defaultId: 0,
            cancelId: 1,
          });

          if (response === 0 && updateInfo.downloadUrl) {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Đang tải bản cập nhật",
              message: "Bản cập nhật đang được tải xuống ở chế độ nền. Ứng dụng sẽ tự động đóng và cài đặt lại khi hoàn tất.",
              buttons: ["OK"],
            });
            const { downloadAndInstallUpdate } = await import("./core/updateService");
            downloadAndInstallUpdate(updateInfo.downloadUrl, () => {}).catch((err: any) => {
              dialog.showErrorBox("Lỗi cập nhật", `Quá trình tải bản cập nhật gặp lỗi:\n${err.message}`);
            });
          }
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

  mainWindow.webContents.on(
    "console-message",
    (_event, level, message, line, sourceId) => {
      console.log(`[Renderer][${level}] ${message} (${sourceId}:${line})`);
    },
  );

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
  if (process.platform !== "darwin") {
    app.quit();
  }
});
