import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToastStore, Toast } from '../../store/toastStore'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'

const toastIcons = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />
}

const toastBg = {
  success: 'bg-emerald-50 border-emerald-200/50',
  error: 'bg-red-50 border-red-200/50',
  info: 'bg-blue-50 border-blue-200/50',
  warning: 'bg-amber-50 border-amber-200/50'
}

export function ToastProvider() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t: Toast) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 pr-10 rounded-2xl shadow-xl shadow-slate-900/5 border backdrop-blur-xl min-w-[300px] max-w-[400px] relative overflow-hidden ${toastBg[t.type]}`}
          >
            <div className="shrink-0 mt-0.5">{toastIcons[t.type]}</div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 break-words">{t.message}</span>
            </div>
            <button 
              onClick={() => removeToast(t.id)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:bg-slate-200/50 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
