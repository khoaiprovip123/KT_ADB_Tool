import React, { useEffect, useRef } from 'react'
import { TerminalSquare, Trash2, X } from 'lucide-react'
import { useDeviceStore } from '../../store/deviceStore'

export function LogTerminal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { logs, clearLogs } = useDeviceStore()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div 
      className={`fixed top-20 right-0 h-[calc(100vh-5rem)] w-96 bg-white/90 backdrop-blur-2xl border-l border-white/40 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] transition-transform duration-300 z-30 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 bg-slate-50/50">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <TerminalSquare className="w-5 h-5 text-blue-600" />
          <span>Nhật ký hệ thống</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearLogs} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors" title="Xóa nhật ký">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors" title="Đóng panel">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs bg-slate-900 text-green-400">
        {logs.map((log, i) => (
          <div key={i} className="mb-1 break-words">{log}</div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
