import { motion } from 'framer-motion'
import { Trash2, PowerOff, CheckCircle2, Undo2, X } from 'lucide-react'

interface BatchBtnProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  color: string
}

function BatchBtn({ icon, label, onClick, color }: BatchBtnProps) {
  return (
    <button 
      onClick={onClick} 
      className={`px-5 py-2.5 rounded-full transition-all flex items-center gap-2 text-[10px] font-black tracking-widest uppercase group whitespace-nowrap ${color}`}
    >
      <div className="shrink-0 group-hover:scale-110 transition-transform">{icon}</div>
      <span>{label}</span>
    </button>
  )
}

interface BatchActionBarProps {
  selectedCount: number
  batchProgress: { current: number, total: number, action: string } | null
  onBatchAction: (action: 'uninstall' | 'disable' | 'enable' | 'clear' | 'stop' | 'restore') => void
  onClearSelection: () => void
}

export function BatchActionBar({ selectedCount, batchProgress, onBatchAction, onClearSelection }: BatchActionBarProps) {
  if (selectedCount === 0 && !batchProgress) return null

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }} 
      animate={{ y: 0, opacity: 1 }} 
      exit={{ y: 100, opacity: 0 }} 
      className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] shadow-2xl flex items-center gap-4 z-50 overflow-hidden min-w-[400px]"
    >
      <div className="px-5 py-2 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-sm">
          {selectedCount}
        </div>
        <span className="text-white font-medium text-sm whitespace-nowrap">Đã chọn</span>
      </div>

      <div className="flex-1 flex justify-end">
        {batchProgress ? (
          <div className="flex-1 px-4 py-2">
            <div className="flex justify-between text-xs text-white/70 mb-2 font-medium">
              <span>Đang xử lý ({batchProgress.action})...</span>
              <span>{batchProgress.current} / {batchProgress.total}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300" 
                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <BatchBtn icon={<Trash2 size={16} />} label="Gỡ bỏ" onClick={() => onBatchAction('uninstall')} color="hover:bg-red-500 text-white" />
            <BatchBtn icon={<PowerOff size={16} />} label="Vô hiệu" onClick={() => onBatchAction('disable')} color="hover:bg-orange-500 text-white" />
            <div className="w-px h-6 bg-white/10 mx-2" />
            <BatchBtn icon={<CheckCircle2 size={16} />} label="Bật lại" onClick={() => onBatchAction('enable')} color="hover:bg-indigo-500 text-white" />
            <BatchBtn icon={<Undo2 size={16} />} label="Khôi phục" onClick={() => onBatchAction('restore')} color="hover:bg-emerald-500 text-white" />
          </div>
        )}
      </div>

      {!batchProgress && (
        <button 
          onClick={onClearSelection} 
          className="mr-2 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
        >
          <X size={18} />
        </button>
      )}
    </motion.div>
  )
}
