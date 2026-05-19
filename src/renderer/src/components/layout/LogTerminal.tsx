import { useEffect, useRef } from 'react'
import { TerminalSquare, Trash2, X, Download } from 'lucide-react'
import { useDeviceStore } from '../../store/deviceStore'

export function LogTerminal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { logs, clearLogs } = useDeviceStore()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const downloadLogs = (format: 'txt' | 'json') => {
    if (logs.length === 0) {
      alert('Không có dữ liệu nhật ký để xuất!')
      return
    }

    let content = ''
    let mimeType = 'text/plain'
    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')
    let filename = `adb_system_logs_${dateStr}`

    if (format === 'json') {
      content = JSON.stringify({
        exportedAt: new Date().toISOString(),
        totalLogs: logs.length,
        logs: logs
      }, null, 2)
      mimeType = 'application/json'
      filename += '.json'
    } else {
      content = logs.join('\n')
      filename += '.txt'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div 
      className={`fixed top-20 right-0 h-[calc(100vh-5rem)] w-96 bg-white/90 backdrop-blur-2xl border-l border-white/40 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] transition-transform duration-300 z-30 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 bg-slate-50/50">
        <div className="flex items-center gap-2 text-slate-700 font-semibold shrink-0">
          <TerminalSquare className="w-5 h-5 text-blue-600" />
          <span>Nhật ký</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => downloadLogs('txt')} 
            className="flex items-center gap-1 px-2 py-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors" 
            title="Xuất file .TXT"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[9px] font-extrabold text-slate-600">TXT</span>
          </button>
          
          <button 
            onClick={() => downloadLogs('json')} 
            className="flex items-center gap-1 px-2 py-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors" 
            title="Xuất file .JSON"
          >
            <Download className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-[9px] font-extrabold text-slate-600">JSON</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

          <button onClick={clearLogs} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors" title="Xóa nhật ký">
            <Trash2 className="w-4 h-4 text-rose-500" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors" title="Đóng panel">
            <X className="w-4 h-4 text-slate-400" />
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
