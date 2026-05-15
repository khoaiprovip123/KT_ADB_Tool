import React from 'react'
import { Wifi, Battery, Maximize, Settings, Smartphone, PowerOff, Cast, RotateCcw } from 'lucide-react'
import { useDeviceStore } from '../../store/deviceStore'

export function ControlCenterModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { activeDevice } = useDeviceStore()

  const runAction = (cmd: string) => {
    if (!activeDevice) return
    // @ts-ignore
    window.api.runAdbCommand(activeDevice, cmd)
    onClose()
  }

  const runScrcpy = (turnScreenOff: boolean) => {
    if (!activeDevice) return
    // @ts-ignore
    window.api.runScrcpy(activeDevice, turnScreenOff)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      <div className="absolute top-16 right-8 w-80 bg-white/90 backdrop-blur-3xl rounded-3xl border border-white/50 shadow-2xl shadow-blue-900/10 p-6 z-50 animate-in fade-in slide-in-from-top-4">
        <h3 className="text-lg font-bold mb-4 text-slate-800 border-b border-slate-100 pb-2">Trung tâm Điều khiển</h3>
        
        {/* Scrcpy Screen Mirroring Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button 
            onClick={() => runScrcpy(false)}
            className="col-span-2 flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl transition-all shadow-md hover:shadow-lg"
          >
            <Cast className="w-5 h-5" />
            <div className="text-left">
              <span className="block font-semibold text-sm">Phản chiếu Màn hình</span>
              <span className="block text-xs text-blue-200">Bật Scrcpy (Bình thường)</span>
            </div>
          </button>
          
          <button 
            onClick={() => runScrcpy(true)}
            className="col-span-2 flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl transition-all shadow-md"
          >
            <Smartphone className="w-5 h-5" />
            <div className="text-left">
              <span className="block font-semibold text-sm">Phản chiếu Bí mật</span>
              <span className="block text-xs text-slate-400">Phản chiếu nhưng tắt màn hình điện thoại</span>
            </div>
          </button>
        </div>

        {/* Quick Settings Grid */}
        <div className="grid grid-cols-2 gap-3">
          <ActionBtn icon={<Wifi />} label="Bật/Tắt WiFi" onClick={() => runAction('adb shell svc wifi enable')} color="bg-blue-50 text-blue-600 hover:bg-blue-100" />
          <ActionBtn icon={<Wifi className="rotate-45" />} label="Phát WiFi" onClick={() => runAction('adb shell cmd tethering tether wifi')} color="bg-orange-50 text-orange-600 hover:bg-orange-100" />
          <ActionBtn icon={<RotateCcw />} label="Tự động Xoay" onClick={() => runAction('adb shell settings put system accelerometer_rotation 1')} color="bg-purple-50 text-purple-600 hover:bg-purple-100" />
          <ActionBtn icon={<Settings />} label="Cài đặt" onClick={() => runAction('adb shell am start -a android.settings.SETTINGS')} color="bg-slate-100 text-slate-700 hover:bg-slate-200" />
          <ActionBtn icon={<PowerOff />} label="Tắt màn hình" onClick={() => runAction('adb shell input keyevent 26')} color="bg-red-50 text-red-600 hover:bg-red-100 col-span-2" />
        </div>
      </div>
    </>
  )
}

function ActionBtn({ icon, label, onClick, color }: { icon: React.ReactElement, label: string, onClick: () => void, color: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 p-3 rounded-xl transition-all ${color} border border-transparent hover:border-black/5`}
    >
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
      <span className="text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
    </button>
  )
}
