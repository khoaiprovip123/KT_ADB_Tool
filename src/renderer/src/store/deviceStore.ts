import { create } from 'zustand'

interface DeviceState {
  devices: any[]
  activeDevice: string | null
  logs: string[]
  setDevices: (devices: any[]) => void
  setActiveDevice: (id: string) => void
  addLog: (log: string) => void
  clearLogs: () => void
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  activeDevice: null,
  logs: ['KT ADB Tool Started. Waiting for commands...'],
  setDevices: (devices) => set((state) => ({ 
    devices,
    // Auto-select first device if none selected
    activeDevice: state.activeDevice && devices.find(d => d.id === state.activeDevice) 
      ? state.activeDevice 
      : (devices[0]?.id || null)
  })),
  setActiveDevice: (id) => set({ activeDevice: id }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log].slice(-1000) })), // Giữ 1000 dòng gần nhất
  clearLogs: () => set({ logs: [] })
}))
