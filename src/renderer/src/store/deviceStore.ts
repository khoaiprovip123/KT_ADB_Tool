import { create } from "zustand";
import { AdbDevice, DeviceInfo } from "../../../shared/types";

interface DeviceState {
  devices: AdbDevice[];
  activeDevice: string | null;
  selectedDeviceIds: string[];
  deviceInfo: DeviceInfo | null;
  logs: string[];
  setDevices: (devices: AdbDevice[]) => void;
  setActiveDevice: (id: string) => void;
  toggleSelectDevice: (id: string) => void;
  selectAllDevices: () => void;
  clearSelectedDevices: () => void;
  executeOnSelectedDevices: (
    fn: (deviceId: string) => Promise<any>
  ) => Promise<{ deviceId: string; result: any; success: boolean }[]>;
  addLog: (log: string) => void;
  clearLogs: () => void;
  refreshDeviceInfo: () => Promise<void>;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  activeDevice: null,
  selectedDeviceIds: [],
  deviceInfo: null,
  logs: ["KT ADB Tool Started. Waiting for commands..."],
  setDevices: (devices) =>
    set((state) => {
      const nextActive =
        state.activeDevice && devices.find((d) => d.id === state.activeDevice)
          ? state.activeDevice
          : devices[0]?.id || null;
      const validSelected = state.selectedDeviceIds.filter((id) =>
        devices.some((d) => d.id === id)
      );
      return {
        devices,
        activeDevice: nextActive,
        selectedDeviceIds:
          validSelected.length > 0 ? validSelected : nextActive ? [nextActive] : [],
      };
    }),
  setActiveDevice: (id) => {
    set((state) => ({
      activeDevice: id,
      selectedDeviceIds: state.selectedDeviceIds.includes(id)
        ? state.selectedDeviceIds
        : [...state.selectedDeviceIds, id],
    }));
    get().refreshDeviceInfo();
  },
  toggleSelectDevice: (id) =>
    set((state) => {
      const exists = state.selectedDeviceIds.includes(id);
      const updated = exists
        ? state.selectedDeviceIds.filter((d) => d !== id)
        : [...state.selectedDeviceIds, id];
      return { selectedDeviceIds: updated };
    }),
  selectAllDevices: () =>
    set((state) => ({
      selectedDeviceIds: state.devices.map((d) => d.id),
    })),
  clearSelectedDevices: () =>
    set((state) => ({
      selectedDeviceIds: state.activeDevice ? [state.activeDevice] : [],
    })),
  executeOnSelectedDevices: async (fn) => {
    const { selectedDeviceIds, activeDevice } = get();
    const targets =
      selectedDeviceIds.length > 0
        ? selectedDeviceIds
        : activeDevice
        ? [activeDevice]
        : [];

    const results = await Promise.allSettled(
      targets.map(async (id) => {
        const res = await fn(id);
        return { deviceId: id, result: res, success: true };
      })
    );

    return results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return {
        deviceId: targets[i],
        result: r.reason,
        success: false,
      };
    });
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
