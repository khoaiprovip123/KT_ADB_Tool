import { create } from "zustand";

export interface AppSettings {
  theme: "system" | "light" | "dark";
  autoRefresh: boolean;
  autoBackupApk: boolean;
  downloadPath: string;
  adbPath: string;
  minimizeToTray: boolean;
  scrcpyBorderless: boolean;
  scrcpyAudio: boolean;
  wallpaperType: "none" | "preset" | "custom";
  wallpaperPreset: string;
  wallpaperCustomDataUrl?: string;
  wallpaperBlur: number;
  wallpaperOverlay: number;
}

interface SettingsStore {
  settings: AppSettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  autoRefresh: true,
  autoBackupApk: false,
  downloadPath: "",
  adbPath: "",
  minimizeToTray: true,
  scrcpyBorderless: false,
  scrcpyAudio: false,
  wallpaperType: "none",
  wallpaperPreset: "aurora",
  wallpaperCustomDataUrl: undefined,
  wallpaperBlur: 20,
  wallpaperOverlay: 35,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const keys: (keyof AppSettings)[] = [
        "theme",
        "autoRefresh",
        "autoBackupApk",
        "downloadPath",
        "adbPath",
        "minimizeToTray",
        "scrcpyBorderless",
        "scrcpyAudio",
        "wallpaperType",
        "wallpaperPreset",
        "wallpaperBlur",
        "wallpaperOverlay",
      ];
      const loaded: Partial<AppSettings> = {};

      for (const key of keys) {
        const val = await window.api.storeGet(key);
        if (val !== undefined && val !== null) {
          loaded[key] = val as never;
        }
      }

      if (window.api?.getCustomWallpaper) {
        const customUrl = await window.api.getCustomWallpaper();
        if (customUrl) {
          loaded.wallpaperCustomDataUrl = customUrl;
        }
      }

      set({
        settings: { ...DEFAULT_SETTINGS, ...loaded },
        isLoaded: true,
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
      set({ isLoaded: true });
    }
  },

  updateSettings: async (newSettings) => {
    const current = get().settings;
    const updated = { ...current, ...newSettings };

    // Lưu vào Zustand trước để UI react
    set({ settings: updated });

    // Lưu xuống Electron Store vĩnh viễn (ngoại trừ dataUrl của wallpaper tránh phình config)
    try {
      for (const key of Object.keys(newSettings) as (keyof AppSettings)[]) {
        if (key !== "wallpaperCustomDataUrl") {
          await window.api.storeSet(key, updated[key]);
        }
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  },
}));
