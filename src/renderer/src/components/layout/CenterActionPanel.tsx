import React from 'react'
import { Wifi, Battery, Maximize, FileEdit, Smartphone, PowerOff } from 'lucide-react'
import { useDeviceStore } from '../../store/deviceStore'

export function CenterActionPanel() {
  const { activeDevice } = useDeviceStore()

  const runAction = (cmd: string) => {
    if (!activeDevice) return
    // @ts-ignore
    window.api.runAdbCommand(activeDevice, cmd)
  }

  return (
    <div className="w-full bg-white/60 backdrop-blur-2xl rounded-3xl border border-white shadow-xl shadow-slate-200/50 p-6 mb-8">
      <h3 className="text-lg font-bold mb-4 text-slate-800">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-4">
        <ActionBtn icon={<Wifi />} label="Toggle WiFi" onClick={() => runAction('adb shell svc wifi enable')} color="bg-blue-50 text-blue-600" />
        <ActionBtn icon={<PowerOff />} label="Screen Off" onClick={() => runAction('adb shell input keyevent 26')} color="bg-slate-100 text-slate-700" />
        <ActionBtn icon={<Maximize />} label="Mirror" onClick={() => {}} color="bg-purple-50 text-purple-600" />
        <ActionBtn icon={<Battery />} label="Battery Info" onClick={() => runAction('adb shell dumpsys battery')} color="bg-green-50 text-green-600" />
        <ActionBtn icon={<FileEdit />} label="Build.prop" onClick={() => runAction('adb shell cat /system/build.prop')} color="bg-orange-50 text-orange-600" />
        <ActionBtn icon={<Smartphone />} label="Device Info" onClick={() => runAction('adb shell getprop ro.product.model')} color="bg-indigo-50 text-indigo-600" />
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick, color }: { icon: React.ReactElement, label: string, onClick: () => void, color: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 hover:scale-105 hover:shadow-md ${color} border border-white`}
    >
      {React.cloneElement(icon, { className: 'w-6 h-6 mb-2' })}
      <span className="text-sm font-semibold">{label}</span>
    </button>
  )
}
