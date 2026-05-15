import React, { useState } from 'react'
import { Zap, RefreshCcw, Wrench, PackageOpen } from 'lucide-react'
import { useDeviceStore } from '../../store/deviceStore'

export function FloatingQuickBoot() {
  const [open, setOpen] = useState(false)
  const { activeDevice } = useDeviceStore()

  const reboot = (mode: string) => {
    if (!activeDevice) return
    // @ts-ignore
    window.api.runAdbCommand(activeDevice, `adb reboot ${mode}`)
  }

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex flex-col gap-3 mb-2 animate-in slide-in-from-bottom-5">
          <BootBtn icon={<RefreshCcw />} label="Khởi động lại" onClick={() => reboot('')} />
          <BootBtn icon={<Wrench />} label="Vào Recovery" onClick={() => reboot('recovery')} />
          <BootBtn icon={<Zap />} label="Vào Fastboot" onClick={() => reboot('bootloader')} />
          <BootBtn icon={<PackageOpen />} label="Vào EDL" onClick={() => reboot('edl')} />
        </div>
      )}
      <button 
        onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 transition-transform hover:scale-105"
      >
        <Zap className="w-6 h-6" />
      </button>
    </div>
  )
}

function BootBtn({ icon, label, onClick }: { icon: React.ReactElement, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-colors group"
    >
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
        {React.cloneElement(icon, { className: 'w-4 h-4' })}
      </div>
    </button>
  )
}
