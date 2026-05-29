import React from 'react'
import { Play, RefreshCcw, Download, PowerOff, Undo2, Trash2, CheckCircle2 } from 'lucide-react'
import { AppInfo } from '../types'
import { BLACKLIST, FRIENDLY_NAMES } from '../constants'

interface ActionBtnProps {
  icon: React.ReactElement
  tooltip: string
  onClick: () => void
  loading: boolean
  disabled?: boolean
  color: string
}

function ActionBtn({ icon, tooltip, onClick, loading, disabled, color }: ActionBtnProps) {
  return (
    <button title={tooltip} onClick={onClick} disabled={loading || disabled} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${disabled ? 'opacity-30 cursor-not-allowed text-slate-300' : color} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : React.cloneElement(icon, { className: 'w-4 h-4' })}
    </button>
  )
}

interface AppRowProps {
  app: AppInfo
  isSelected: boolean
  actionLoading: string | null
  onToggleSelect: (pkg: string) => void
  onAction: (app: AppInfo, action: 'uninstall' | 'disable' | 'enable' | 'clear' | 'stop' | 'restore') => void
  onExtract: (pkg: string) => void
}

export function AppRow({ app, isSelected, actionLoading, onToggleSelect, onAction, onExtract }: AppRowProps) {
  const pkg = app.pkg
  const isBlacklisted = BLACKLIST.includes(pkg)
  const isSystem = app.type?.toLowerCase() === 'system'
  const isDisabled = app.status?.toLowerCase() === 'disabled'

  return (
    <div className="px-2 py-1">
      <div className={`flex items-center justify-between p-3 rounded-2xl transition-all h-[64px] ${isSelected ? 'bg-blue-50 border border-blue-200/50 shadow-sm' : 'hover:bg-slate-50 border border-transparent group'}`}>
        <div className="flex items-center gap-3 truncate w-1/2">
          <button onClick={() => onToggleSelect(pkg)} className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-transparent hover:border-blue-400'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
          <div className="truncate">
            {FRIENDLY_NAMES[pkg] && <div className="text-[10px] font-black text-blue-600 uppercase tracking-tight mb-0.5">{FRIENDLY_NAMES[pkg]}</div>}
            <div className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : isDisabled ? 'text-slate-400 line-through font-medium' : 'text-slate-700'}`}>{pkg}</div>
          </div>
        </div>
        
        <div className="w-1/4 flex items-center justify-center gap-2">
          {isSystem ? 
            <span className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-tight border border-red-100/50">System</span> : 
            <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-tight border border-blue-100/50">User</span>
          }
          {isDisabled ? 
            <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-tight border border-slate-200/50">Disabled</span> : 
            <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-tight border border-emerald-100/50">Running</span>
          }
        </div>
        
        <div className="w-1/4 flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionBtn icon={<Play />} tooltip="Stop" onClick={() => onAction(app, 'stop')} loading={actionLoading === `stop-${pkg}`} color="hover:bg-amber-100 text-slate-400" />
          <ActionBtn icon={<RefreshCcw />} tooltip="Clear" onClick={() => onAction(app, 'clear')} loading={actionLoading === `clear-${pkg}`} color="hover:bg-blue-100 text-slate-400" />
          <ActionBtn icon={<Download />} tooltip="Backup" onClick={() => onExtract(pkg)} loading={actionLoading === `extract-${pkg}`} color="hover:bg-emerald-100 text-slate-400" />
          {isDisabled ? 
            <ActionBtn icon={<Undo2 />} tooltip="Restore" onClick={() => onAction(app, 'restore')} loading={actionLoading === `restore-${pkg}`} color="hover:bg-emerald-100 text-slate-400" /> : 
            <ActionBtn icon={<PowerOff />} tooltip="Disable" onClick={() => onAction(app, 'disable')} loading={actionLoading === `disable-${pkg}`} disabled={isBlacklisted} color="hover:bg-orange-100 text-slate-400" />
          }
          {!isDisabled && <ActionBtn icon={<Trash2 />} tooltip="Uninstall" onClick={() => onAction(app, 'uninstall')} loading={actionLoading === `uninstall-${pkg}`} disabled={isBlacklisted} color="hover:bg-red-100 text-slate-400" />}
        </div>
      </div>
    </div>
  )
}
