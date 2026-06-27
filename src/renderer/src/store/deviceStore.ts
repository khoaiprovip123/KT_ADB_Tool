import { create } from "zustand";
import { AdbDevice, DeviceInfo } from "../../../shared/types";

interface DeviceState {
  devices: AdbDevice[];
  activeDevice: string | null;
  deviceInfo: DeviceInfo | null;
  logs: string[];
  setDevices: (devices: AdbDevice[]) => void;
  setActiveDevice: (id: string) => void;
  addLog: (log: string) => void;
  clearLogs: () => void;
  refreshDeviceInfo: () => Promise<void>;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  activeDevice: null,
  deviceInfo: null,
  logs: ["KT ADB Tool Started. Waiting for commands..."],
  setDevices: (devices) =>
    set((state) => {
      const nextActive =
        state.activeDevice && devices.find((d) => d.id === state.activeDevice)
          ? state.activeDevice
          : devices[0]?.id || null;
      return {
        devices,
        activeDevice: nextActive,
      };
    }),
  setActiveDevice: (id) => {
    set({ activeDevice: id });
    get().refreshDeviceInfo();
  },
  addLog: (log) =>
    set((state) => ({ logs: [...state.logs, log].slice(-1000) })), // Giữ 1000 dòng gần nhất
  clearLogs: () => set({ logs: [] }),
  refreshDeviceInfo: async () => {
    const { activeDevice } = get();
    if (!activeDevice) {
      set({ deviceInfo: null });
      return;
    }
    try {
      const info = await window.api.getDeviceInfo(activeDevice);
      set({ deviceInfo: info });
    } catch (e) {
      console.error("Lỗi khi nạp thông tin thiết bị:", e);
      set({ deviceInfo: null });
    }
  },
}));
