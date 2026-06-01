import { create } from "zustand";

export interface AppSettings {
  theme: "system" | "light" | "dark";
  autoRefresh: boolean;
  autoBackupApk: boolean;
  downloadPath: string;
  adbPath: string;
}

interface SettingsStore {
  settings: AppSettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  autoRefresh: true,
  autoBackupApk: false,
  downloadPath: "",
  adbPath: "",
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
      ];
      const loaded: Partial<AppSettings> = {};

      for (const key of keys) {
        const val = await window.api.storeGet(key);
        if (val !== undefined && val !== null) {
          loaded[key] = val as never;
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

    // Lưu xuống Electron Store vĩnh viễn
    try {
      for (const key of Object.keys(newSettings) as (keyof AppSettings)[]) {
        await window.api.storeSet(key, updated[key]);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  },
}));
