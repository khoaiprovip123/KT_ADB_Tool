import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, AlertCircle, Info, Trash2, ArrowRight } from 'lucide-react'

interface BatchResult {
  success: number
  fail: number
  skipped: number
  lastError?: string
  action: string
}

interface Props {
  result: BatchResult | null
  onClose: () => void
}

export function BatchResultModal({ result, onClose }: Props) {
  if (!result) return null

  const isDisableFailedOnSystem = result.action === 'disable' && 
    (result.lastError?.includes('Cannot disable system packages') || 
     result.lastError?.includes('SecurityException'))

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/20"
        >
          {/* Header */}
          <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              Hoàn tất thao tác
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center">
                <div className="text-2xl font-black text-emerald-600 leading-none mb-1">{result.success}</div>
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Thành công</div>
              </div>
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-center">
                <div className="text-2xl font-black text-red-600 leading-none mb-1">{result.fail}</div>
                <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Thất bại</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-center">
                <div className="text-2xl font-black text-amber-600 leading-none mb-1">{result.skipped}</div>
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Bỏ qua</div>
              </div>
            </div>

            {/* Error Detail */}
            {result.fail > 0 && result.lastError && (
              <div className="mb-6">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Chi tiết lỗi gần nhất</span>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 overflow-x-auto custom-scrollbar">
                  <pre className="text-red-400 text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                    {result.lastError}
                  </pre>
                </div>
              </div>
            )}

            {/* Smart Recommendation */}
            {isDisableFailedOnSystem && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-600/20"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Info className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1 tracking-tight">Gợi ý từ Chuyên gia (AI)</h4>
                    <p className="text-xs text-blue-50/80 leading-relaxed font-medium">
                      Điện thoại chặn việc **Vô hiệu hóa** app này. 
                      Nhưng bạn vẫn có thể gỡ nó bằng cách dùng nút **Thùng rác (Uninstall)**.
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-white bg-white/10 px-3 py-1.5 rounded-lg w-fit">
                      <Trash2 className="w-3 h-3" />
                      THỬ GỠ CÀI ĐẶT
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <button 
              onClick={onClose}
              className="w-full mt-8 py-4 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
            >
              ĐÃ HIỂU
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
