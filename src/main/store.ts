import Store from "electron-store";

export const store = new Store({
  defaults: {
    theme: "system",
    autoRefresh: true,
    autoBackupApk: false,
    downloadPath: "",
    adbPath: "",
    minimizeToTray: true,
    scrcpyBorderless: false,
    scrcpyAudio: false,
    wallpaperType: "none",
    wallpaperPreset: "aurora",
    wallpaperBlur: 20,
    wallpaperOverlay: 35,
  },
});
