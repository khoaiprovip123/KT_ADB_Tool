import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, SlidersHorizontal, Loader2, CheckCircle2, AlertTriangle, Terminal, Download, X, RefreshCw } from 'lucide-react'
import { useDeviceStore } from '../../store/deviceStore'

export function SystemOptimization() {
  const { activeDevice, addLog } = useDeviceStore()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Modal Popup States
  const [showModal, setShowModal] = useState<boolean>(false)
  const [modalStatus, setModalStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle')
  const [modalProgress, setModalProgress] = useState<number>(0)
  const [modalLogs, setModalLogs] = useState<string[]>([])

  const modalTerminalEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showModal) {
      modalTerminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [modalLogs, showModal])

  // Optimization Category States
  // Column 1: Hiệu ứng & Cảm ứng
  const [optAnimDuration, setOptAnimDuration] = useState<number>(650)
  const [optAnimDurationEnabled, setOptAnimDurationEnabled] = useState<boolean>(true)
  const [optMultiTouch, setOptMultiTouch] = useState<boolean>(true)
  const [optLongPress, setOptLongPress] = useState<number>(400)
  const [optLongPressEnabled, setOptLongPressEnabled] = useState<boolean>(true)
  const [optTransitionScale, setOptTransitionScale] = useState<number>(0.95)
  const [optTransitionScaleEnabled, setOptTransitionScaleEnabled] = useState<boolean>(true)
  const [optAnimatorDurationScale, setOptAnimatorDurationScale] = useState<number>(0.95)
  const [optAnimatorDurationScaleEnabled, setOptAnimatorDurationScaleEnabled] = useState<boolean>(true)
  const [optWindowAnimationScale, setOptWindowAnimationScale] = useState<number>(0.95)
  const [optWindowAnimationScaleEnabled, setOptWindowAnimationScaleEnabled] = useState<boolean>(true)

  // Column 2: Dọn dẹp & Tối ưu Pin
  const [optBattery, setOptBattery] = useState<boolean>(true)
  const [optCleanTelegram, setOptCleanTelegram] = useState<boolean>(true)
  const [optClearAllCache, setOptClearAllCache] = useState<boolean>(true)
  const [optOverclock, setOptOverclock] = useState<boolean>(true)
  const [optCleanArt, setOptCleanArt] = useState<boolean>(true)

  // Column 3: Tối ưu Biên dịch & Hệ thống
  const [optCompileAll, setOptCompileAll] = useState<boolean>(true)
  const [optCompileDaily, setOptCompileDaily] = useState<boolean>(true)
  const [optCompileBoot, setOptCompileBoot] = useState<boolean>(false)
  const [optCompileOta, setOptCompileOta] = useState<boolean>(false)
  const [optCompileGoogle, setOptCompileGoogle] = useState<boolean>(false)
  const [optSmoothSystemUI, setOptSmoothSystemUI] = useState<boolean>(false)
  const [optAutoReboot, setOptAutoReboot] = useState<boolean>(false)

  const downloadModalLogs = (format: 'txt' | 'json') => {
    if (modalLogs.length === 0) {
      alert('Không có dữ liệu nhật ký để xuất!')
      return
    }

    let content = ''
    let mimeType = 'text/plain'
    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')
    let filename = `KT_Optimization_Log_${dateStr}`

    if (format === 'json') {
      content = JSON.stringify({
        device: activeDevice,
        exportedAt: new Date().toISOString(),
        totalLogs: modalLogs.length,
        logs: modalLogs
      }, null, 2)
      mimeType = 'application/json'
      filename += '.json'
    } else {
      content = modalLogs.join('\n')
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

  const runOptimizationBatch = async () => {
    if (!activeDevice) return
    setActionLoading('optimization_batch')
    
    // Reset and show modal
    setModalLogs([])
    setModalProgress(0)
    setModalStatus('running')
    setShowModal(true)

    const localLogs: string[] = []
    const logAndPush = (msg: string) => {
      addLog(msg)
      localLogs.push(msg)
      setModalLogs([...localLogs])
    }

    logAndPush('🚀 [BATCH] Khởi động động cơ Siêu Tối Ưu Hóa hệ thống...')

    // Calculate total steps
    let totalSteps = 0
    if (optAnimDurationEnabled) totalSteps++
    if (optMultiTouch) totalSteps++
    if (optLongPressEnabled) totalSteps++
    if (optTransitionScaleEnabled) totalSteps++
    if (optAnimatorDurationScaleEnabled) totalSteps++
    if (optWindowAnimationScaleEnabled) totalSteps++
    if (optBattery) totalSteps++
    if (optCleanTelegram) totalSteps++
    if (optClearAllCache) totalSteps++
    if (optOverclock) totalSteps++
    if (optCleanArt) totalSteps++
    if (optCompileAll) totalSteps++
    if (optCompileDaily) totalSteps++
    if (optCompileBoot) totalSteps++
    if (optCompileOta) totalSteps++
    if (optCompileGoogle) totalSteps++
    if (optSmoothSystemUI) totalSteps++
    if (optAutoReboot) totalSteps++

    if (totalSteps === 0) {
      logAndPush('⚠️ [WARN] Không có mục tối ưu nào được chọn!')
      setModalStatus('success')
      setModalProgress(100)
      setActionLoading(null)
      return
    }

    let completedSteps = 0
    const stepDone = () => {
      completedSteps++
      setModalProgress(Math.round((completedSteps / totalSteps) * 100))
    }

    try {
      // Column 1: Hiệu ứng & Cảm ứng
      if (optAnimDurationEnabled) {
        logAndPush(`[EXEC] Tối ưu độ mượt hiệu ứng (animator_duration_scale): ${optAnimDuration}ms`)
        const scaleVal = (optAnimDuration / 1000).toFixed(2)
        await (window as any).api.runAdbCommand(activeDevice, `settings put system animator_duration_scale ${scaleVal}`)
        stepDone()
      }

      if (optMultiTouch) {
        logAndPush('[EXEC] Kích hoạt tối ưu phản hồi đa chạm (multi_touch_enabled & touch_responsiveness)')
        await (window as any).api.runAdbCommand(activeDevice, `settings put system multi_touch_enabled 1`)
        await (window as any).api.runAdbCommand(activeDevice, `settings put system touch_responsiveness 1`)
        stepDone()
      }

      if (optLongPressEnabled) {
        logAndPush(`[EXEC] Đặt độ trễ nhấn giữ (long_press_timeout): ${optLongPress}ms`)
        await (window as any).api.runAdbCommand(activeDevice, `settings put secure long_press_timeout ${optLongPress}`)
        stepDone()
      }

      if (optTransitionScaleEnabled) {
        logAndPush(`[EXEC] Đặt tỷ lệ thời gian chuyển tiếp (transition_animation_scale): ${optTransitionScale}`)
        await (window as any).api.runAdbCommand(activeDevice, `settings put global transition_animation_scale ${optTransitionScale}`)
        stepDone()
      }

      if (optAnimatorDurationScaleEnabled) {
        logAndPush(`[EXEC] Đặt tốc độ khung hình chuyển cảnh (animator_duration_scale): ${optAnimatorDurationScale}`)
        await (window as any).api.runAdbCommand(activeDevice, `settings put global animator_duration_scale ${optAnimatorDurationScale}`)
        stepDone()
      }

      if (optWindowAnimationScaleEnabled) {
        logAndPush(`[EXEC] Đặt tốc độ hiệu ứng cửa sổ (window_animation_scale): ${optWindowAnimationScale}`)
        await (window as any).api.runAdbCommand(activeDevice, `settings put global window_animation_scale ${optWindowAnimationScale}`)
        stepDone()
      }

      // Column 2: Dọn dẹp & Hiệu suất
      if (optBattery) {
        logAndPush('[EXEC] Kích hoạt tối ưu hóa Pin hệ thống (Power Save / Doze Modes)')
        await (window as any).api.runAdbCommand(activeDevice, `cmd power set-mode 1`)
        stepDone()
      }

      if (optCleanTelegram) {
        logAndPush('[EXEC] Dọn dẹp file rác & Cache của Telegram...')
        await (window as any).api.runAdbCommand(activeDevice, `rm -rf /sdcard/Android/data/org.telegram.messenger/cache/*`)
        stepDone()
      }

      if (optClearAllCache) {
        logAndPush('[EXEC] Giải phóng bộ nhớ đệm (Cache) của tất cả ứng dụng...')
        await (window as any).api.runAdbCommand(activeDevice, `pm trim-caches 999G`)
        stepDone()
      }

      if (optOverclock) {
        logAndPush('[EXEC] Ép xung hệ thống & Tăng cường đa nhiệm (Performance Mode)')
        await (window as any).api.runAdbCommand(activeDevice, `settings put global performance_mode 1`)
        stepDone()
      }

      if (optCleanArt) {
        logAndPush('[EXEC] Dọn dẹp file rác ART Compiler (Cleanup dex files)...')
        await (window as any).api.runAdbCommand(activeDevice, `cmd package cleanup-dex-files`)
        stepDone()
      }

      // Column 3: Tối ưu Biên dịch & Hệ thống
      if (optCompileAll) {
        logAndPush('[EXEC] Biên dịch tối ưu hóa toàn bộ ứng dụng (dexopt speed)...')
        await (window as any).api.runAdbCommand(activeDevice, `cmd package compile -m speed -f -a`)
        stepDone()
      }

      if (optCompileDaily) {
        logAndPush('[EXEC] Biên dịch cho nhu cầu sử dụng hàng ngày (speed-profile)...')
        await (window as any).api.runAdbCommand(activeDevice, `cmd package compile -m speed-profile -a`)
        stepDone()
      }

      if (optCompileBoot) {
        logAndPush('[EXEC] Biên dịch cho lần khởi động đầu tiên (extract)...')
        await (window as any).api.runAdbCommand(activeDevice, `cmd package compile -m extract -a`)
        stepDone()
      }

      if (optCompileOta) {
        logAndPush('[EXEC] Biên dịch lại sau khi cập nhật ROM (speed)...')
        await (window as any).api.runAdbCommand(activeDevice, `cmd package compile -m speed -a`)
        stepDone()
      }

      if (optCompileGoogle) {
        logAndPush('[EXEC] Biên dịch sau khi cập nhật Google Play (quick-profile)...')
        await (window as any).api.runAdbCommand(activeDevice, `cmd package compile -m quick-profile -a`)
        stepDone()
      }

      if (optSmoothSystemUI) {
        logAndPush('[EXEC] Tăng độ ưu tiên rendering cho SystemUI...')
        await (window as any).api.runAdbCommand(activeDevice, `service call activity 134 i32 1`)
        stepDone()
      }

      logAndPush('✅ [SUCCESS] Quy trình Siêu Tối Ưu Hóa đã hoàn tất thành công!')
      setModalStatus('success')

      if (optAutoReboot) {
        logAndPush('🔄 [REBOOT] Đang khởi động lại thiết bị theo cài đặt...')
        await (window as any).api.runAdbCommand(activeDevice, `reboot`)
        stepDone()
      }
    } catch (e: any) {
      logAndPush(`❌ [ERROR] Lỗi trong quá trình tối ưu: ${e.message}`)
      setModalStatus('failed')
    } finally {
      setActionLoading(null)
    }
  }

  if (!activeDevice) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-3xl m-8">
        <SlidersHorizontal className="w-16 h-16 text-slate-300 mb-4 animate-bounce" />
        <h3 className="text-xl font-bold text-slate-700">Chưa có thiết bị</h3>
        <p className="text-slate-500 mt-2 text-center max-w-sm">Vui lòng kết nối thiết bị Android để thực hiện quy trình tối ưu.</p>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="flex-1 bg-white/60 backdrop-blur-3xl rounded-3xl border border-white/50 shadow-xl shadow-blue-900/5 flex flex-col overflow-hidden h-full p-8"
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between min-h-0">
        <div className="space-y-6">
          <div>
            <h4 className="text-base font-black text-slate-800">Siêu tối ưu hóa hệ thống</h4>
            <p className="text-xs text-slate-400 font-semibold">Tăng tốc phần cứng, dọn dẹp phân mảnh ART compiler và tối ưu hiệu năng toàn diện.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Hiệu ứng & Cảm ứng */}
            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4">
              <h5 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Hiệu ứng & Cảm ứng</h5>
              <div className="flex flex-col">
                {/* Tối ưu độ mượt hiệu ứng */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Tối ưu độ mượt hiệu ứng (Slider Duration)</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <input 
                      type="number" 
                      value={optAnimDuration} 
                      onChange={e => setOptAnimDuration(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white border border-slate-200 text-center text-xs font-bold rounded-lg outline-none"
                    />
                    <button 
                      onClick={() => setOptAnimDurationEnabled(!optAnimDurationEnabled)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${optAnimDurationEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optAnimDurationEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* Tăng tốc độ phản hồi đa chạm */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Tăng tốc độ phản hồi đa chạm</span>
                  <button 
                    onClick={() => setOptMultiTouch(!optMultiTouch)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${optMultiTouch ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optMultiTouch ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Độ trễ nhấn giữ */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Độ trễ nhấn giữ (Long Press)</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <input 
                      type="number" 
                      value={optLongPress} 
                      onChange={e => setOptLongPress(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white border border-slate-200 text-center text-xs font-bold rounded-lg outline-none"
                    />
                    <button 
                      onClick={() => setOptLongPressEnabled(!optLongPressEnabled)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${optLongPressEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optLongPressEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* Tỷ lệ thời gian chuyển tiếp */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Tỷ lệ thời gian chuyển tiếp</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <input 
                      type="number" 
                      step="0.05"
                      value={optTransitionScale} 
                      onChange={e => setOptTransitionScale(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white border border-slate-200 text-center text-xs font-bold rounded-lg outline-none"
                    />
                    <button 
                      onClick={() => setOptTransitionScaleEnabled(!optTransitionScaleEnabled)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${optTransitionScaleEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optTransitionScaleEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* Tốc độ khung hình chuyển cảnh */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Tốc độ khung hình chuyển cảnh</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <input 
                      type="number" 
                      step="0.05"
                      value={optAnimatorDurationScale} 
                      onChange={e => setOptAnimatorDurationScale(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white border border-slate-200 text-center text-xs font-bold rounded-lg outline-none"
                    />
                    <button 
                      onClick={() => setOptAnimatorDurationScaleEnabled(!optAnimatorDurationScaleEnabled)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${optAnimatorDurationScaleEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optAnimatorDurationScaleEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* Tốc độ hiệu ứng cửa sổ */}
                <div className="flex items-center justify-between gap-4 py-2 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Tốc độ hiệu ứng cửa sổ</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <input 
                      type="number" 
                      step="0.05"
                      value={optWindowAnimationScale} 
                      onChange={e => setOptWindowAnimationScale(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white border border-slate-200 text-center text-xs font-bold rounded-lg outline-none"
                    />
                    <button 
                      onClick={() => setOptWindowAnimationScaleEnabled(!optWindowAnimationScaleEnabled)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${optWindowAnimationScaleEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optWindowAnimationScaleEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Dọn dẹp & Tối ưu Pin */}
            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4">
              <h5 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Dọn dẹp & Tối ưu Pin</h5>
              <div className="flex flex-col">
                {/* Kích hoạt tối ưu hóa Pin hệ thống */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Kích hoạt tối ưu hóa Pin hệ thống</span>
                  <button 
                    onClick={() => setOptBattery(!optBattery)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${optBattery ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optBattery ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Dọn dẹp rác & Cache Telegram */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Dọn dẹp rác & Cache Telegram</span>
                  <button 
                    onClick={() => setOptCleanTelegram(!optCleanTelegram)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${optCleanTelegram ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optCleanTelegram ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Xóa bộ nhớ đệm (Cache) toàn bộ App */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Xóa bộ nhớ đệm (Cache) toàn bộ App</span>
                  <button 
                    onClick={() => setOptClearAllCache(!optClearAllCache)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${optClearAllCache ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optClearAllCache ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Ép xung & Tăng cường đa nhiệm */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Ép xung & Tăng cường đa nhiệm</span>
                  <button 
                    onClick={() => setOptOverclock(!optOverclock)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${optOverclock ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optOverclock ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Dọn dẹp file rác ART Compiler */}
                <div className="flex items-center justify-between gap-4 py-2 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Dọn dẹp file rác ART Compiler</span>
                  <button 
                    onClick={() => setOptCleanArt(!optCleanArt)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${optCleanArt ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optCleanArt ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Column 3: Tối ưu Biên dịch & Hệ thống */}
            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4">
              <h5 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Tối ưu Biên dịch & Hệ thống</h5>
              <div className="flex flex-col">
                {/* Biên dịch tối ưu hóa tất cả ứng dụng */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Biên dịch tối ưu hóa tất cả ứng dụng</span>
                  <button 
                    onClick={() => setOptCompileAll(!optCompileAll)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${optCompileAll ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optCompileAll ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Biên dịch cho nhu cầu sử dụng hàng ngày */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Biên dịch cho nhu cầu sử dụng hàng ngày</span>
                  <button 
                    onClick={() => setOptCompileDaily(!optCompileDaily)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${optCompileDaily ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optCompileDaily ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Biên dịch cho lần khởi động đầu tiên */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Biên dịch cho lần khởi động đầu tiên</span>
                  <button 
                    onClick={() => setOptCompileBoot(!optCompileBoot)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${optCompileBoot ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optCompileBoot ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Biên dịch lại sau khi cập nhật ROM (OTA) */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Biên dịch lại sau khi cập nhật ROM (OTA)</span>
                  <button 
                    onClick={() => setOptCompileOta(!optCompileOta)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${optCompileOta ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optCompileOta ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Biên dịch sau khi cập nhật Google Play */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Biên dịch sau khi cập nhật Google Play</span>
                  <button 
                    onClick={() => setOptCompileGoogle(!optCompileGoogle)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${optCompileGoogle ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optCompileGoogle ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Làm mượt giao diện (SystemUI) */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Làm mượt giao diện (SystemUI)</span>
                  <button 
                    onClick={() => setOptSmoothSystemUI(!optSmoothSystemUI)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${optSmoothSystemUI ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optSmoothSystemUI ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Tự động khởi động lại sau khi hoàn tất */}
                <div className="flex items-center justify-between gap-4 py-2 min-h-[48px]">
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed pr-2">Tự động khởi động lại sau khi hoàn tất</span>
                  <button 
                    onClick={() => setOptAutoReboot(!optAutoReboot)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shrink-0 ${optAutoReboot ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${optAutoReboot ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 right-8 z-40 flex items-center gap-3">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={runOptimizationBatch}
          disabled={actionLoading === 'optimization_batch'}
          className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3.5 rounded-full shadow-lg shadow-indigo-600/35 transition-all border border-indigo-500/20 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 group font-black"
          title="Bắt đầu tối ưu"
        >
          <span className="text-[10px] tracking-widest uppercase">Bắt đầu tối ưu</span>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/20 transition-colors">
            <Cpu className={`w-4 h-4 ${actionLoading === 'optimization_batch' ? 'animate-spin' : ''}`} />
          </div>
        </motion.button>
      </div>

      {/* Modal Popup Overlay */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-2xl border border-white/50 w-[600px] max-w-full rounded-3xl shadow-2xl p-6 flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                    <Cpu className={`w-6 h-6 ${modalStatus === 'running' ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Siêu Tối Ưu Hóa</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Thiết bị: {activeDevice}</p>
                  </div>
                </div>
                {modalStatus !== 'running' && (
                  <button 
                    onClick={() => setShowModal(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Progress & Status */}
              <div className="py-6 space-y-4 shrink-0">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-2">
                    {modalStatus === 'running' && (
                      <>
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        <span className="text-indigo-600">Đang chạy các tác vụ tối ưu...</span>
                      </>
                    )}
                    {modalStatus === 'success' && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-600">Hoàn tất quy trình tối ưu thành công!</span>
                      </>
                    )}
                    {modalStatus === 'failed' && (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span className="text-rose-600">Quy trình tối ưu có lỗi xảy ra!</span>
                      </>
                    )}
                  </span>
                  <span className="font-mono text-indigo-600">{modalProgress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${modalProgress}%` }}
                    transition={{ duration: 0.3 }}
                    className={`h-full bg-gradient-to-r ${
                      modalStatus === 'failed' 
                        ? 'from-rose-500 to-red-600' 
                        : modalStatus === 'success'
                        ? 'from-emerald-500 to-green-600'
                        : 'from-indigo-600 to-purple-600'
                    }`}
                  />
                </div>
              </div>

              {/* Terminal Logs */}
              <div className="flex-1 min-h-[200px] bg-slate-950 text-emerald-400 font-mono text-[11px] p-4 rounded-2xl overflow-hidden border border-slate-900 shadow-inner flex flex-col">
                <div className="text-slate-500 text-[10px] pb-2 border-b border-slate-900 mb-2 flex items-center gap-1.5 shrink-0">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>OUTPUT TERMINAL (STDOUT)</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                  {modalLogs.map((log, i) => (
                    <div key={i} className="leading-relaxed break-all">
                      {log.startsWith('❌') ? (
                        <span className="text-red-400">{log}</span>
                      ) : log.startsWith('✅') ? (
                        <span className="text-emerald-400 font-bold">{log}</span>
                      ) : log.startsWith('⚠️') ? (
                        <span className="text-amber-400">{log}</span>
                      ) : log.startsWith('🔄') ? (
                        <span className="text-sky-400">{log}</span>
                      ) : (
                        log
                      )}
                    </div>
                  ))}
                  <div ref={modalTerminalEndRef} />
                </div>
              </div>

              {/* Footer controls */}
              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadModalLogs('txt')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] font-black uppercase">TXT</span>
                  </button>
                  <button
                    onClick={() => downloadModalLogs('json')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-[10px] font-black uppercase">JSON</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  {modalStatus === 'failed' && (
                    <button
                      onClick={runOptimizationBatch}
                      className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-black uppercase tracking-wider rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Thử lại
                    </button>
                  )}
                  {modalStatus !== 'running' && (
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95"
                    >
                      Xác nhận
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
