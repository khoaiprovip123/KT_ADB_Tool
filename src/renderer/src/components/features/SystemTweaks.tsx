import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trash2, PowerOff, RefreshCcw, SlidersHorizontal, 
  Undo2, CheckCircle2, ListFilter, CheckSquare, Square, X, 
  Smartphone, Eye, Monitor, ShieldCheck, Cpu, Shield, 
  Gamepad2, Wand2, Touchpad, Layers, AlertCircle,
  CloudOff, FolderLock, ShieldAlert
} from 'lucide-react'
import { useDeviceStore } from '../../store/deviceStore'
import { BatchResultModal } from './BatchResultModal'
import { validateDpi, validatePackageName, escapeShell } from '../../utils/validation'

type TweakCategory = 'debloat' | 'display' | 'security' | 'game' | 'animations' | 'controls' | 'multitasking'
type RiskLevel = 'SAFE' | 'RISKY' | 'KEEP'
type PkgStatus = 'installed' | 'disabled' | 'uninstalled'

interface BloatwareEntry {
  package: string;
  name: string;
  description: string;
  risk: RiskLevel;
  category: string;
  preferDisable?: boolean;
  status: PkgStatus;
}

declare const window: Window & {
  api: {
    getBloatwareWithStatus: (d: string) => Promise<BloatwareEntry[]>;
    getBloatwareDb: () => Promise<BloatwareEntry[]>;
    debloatPackage: (d: string, pkg: string, action: string, preferDisable: boolean) => Promise<{ success: boolean; message: string }>;
    batchDebloat: (
      d: string,
      pkgs: Array<{ package: string; preferDisable?: boolean }>,
      action: string
    ) => Promise<Array<{ package: string; success: boolean; message: string }>>;
    onBatchProgress: (cb: (data: { done: number; total: number }) => void) => () => void;
    getTweaksList: () => Promise<any[]>;
    getTweaksStatus: (d: string) => Promise<Record<string, boolean>>;
    applyTweak: (d: string, id: string, enable: boolean) => Promise<{ success: boolean; message: string }>;
    getDpi: (d: string) => Promise<number | null>;
    getResolution: (d: string) => Promise<{ width: number; height: number } | null>;
    setDpi: (d: string, dpi: number) => Promise<{ success: boolean; message: string }>;
    resetDpi: (d: string) => Promise<{ success: boolean; message: string }>;
    setResolution: (d: string, w: number, h: number) => Promise<{ success: boolean; message: string }>;
    resetResolution: (d: string) => Promise<{ success: boolean; message: string }>;
    setAnimationScale: (d: string, scale: 0 | 0.5 | 1.0) => Promise<void>;
    runAdbCommand: (d: string, command: string) => Promise<{ success: boolean; output: string }>;
  };
};

export function SystemTweaks() {
  const { activeDevice, addLog } = useDeviceStore()
  const [activeCategory, setActiveCategory] = useState<TweakCategory>('debloat')
  
  // Debloat States
  const [bloatListWithStatus, setBloatListWithStatus] = useState<BloatwareEntry[]>([])
  const [debloatSearch, setDebloatSearch] = useState('')

  const [selectedBloat, setSelectedBloat] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Batch progress
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; action: string } | null>(null)
  const [batchResult, setBatchResult] = useState<{ success: number; fail: number; skipped: number; lastError?: string; action: string } | null>(null)

  // Display/DPI States
  const [customDpi, setCustomDpi] = useState<number>(440)
  const [customW, setCustomW] = useState<number>(1080)
  const [customH, setCustomH] = useState<number>(2400)
  const [deviceDpi, setDeviceDpi] = useState<number | null>(null)
  const [deviceW, setDeviceW] = useState<number | null>(null)
  const [deviceH, setDeviceH] = useState<number | null>(null)

  // Speed States
  const [animScale, setAnimScale] = useState<number>(0.5)

  // Security / Privacy States
  const [telemetryBlocked, setTelemetryBlocked] = useState(false)
  const [developerOptionsEnabled, setDeveloperOptionsEnabled] = useState(true)
  const [usbDebuggingSafe, setUsbDebuggingSafe] = useState(true)
  const [unknownSourcesBlocked, setUnknownSourcesBlocked] = useState(false)
  const [cloudBackupBlocked, setCloudBackupBlocked] = useState(false)
  const [verifyAdbInstallsEnabled, setVerifyAdbInstallsEnabled] = useState(false)

  // Gaming / FPS States
  const [fpsOverlayEnabled, setFpsOverlayEnabled] = useState(false)
  const [gameModeEnabled, setGameModeEnabled] = useState(false)
  const [hwAccelerationEnabled, setHwAccelerationEnabled] = useState(false)

  // Interaction / Controls States
  const [showTouches, setShowTouches] = useState(false)
  const [pointerLocation, setPointerLocation] = useState(false)
  const [pointerSpeed, setPointerSpeed] = useState(0)

  // Multitasking & Notifications States
  const [bgLimit, setBgLimit] = useState<number>(-1)
  const [alwaysFinish, setAlwaysFinish] = useState<boolean>(false)
  const [phantomOptimizer, setPhantomOptimizer] = useState<boolean>(false)
  const [pkgNotifyInput, setPkgNotifyInput] = useState<string>('')
  const [pkgFreezeInput, setPkgFreezeInput] = useState<string>('')

  // Toast notification state
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; type: 'success' | 'error' }>>([])
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  // Utilities
  const withRetry = async <T,>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (err) {
        if (i === maxRetries - 1) throw err
        await new Promise(r => setTimeout(r, delay * (i + 1)))
      }
    }
    throw new Error('Max retries exceeded')
  }


  // Load all tweaks status and display metrics from actual device
  const loadData = useCallback(async () => {
    if (!activeDevice) return
    setLoading(true)
    try {
      // 1. Debloat Packages
      const bloatData = await window.api.getBloatwareWithStatus(activeDevice)
      setBloatListWithStatus(bloatData)

      // 2. Display Metrics
      const dpi = await window.api.getDpi(activeDevice)
      const res = await window.api.getResolution(activeDevice)
      if (dpi) {
        setCustomDpi(dpi)
        setDeviceDpi(dpi)
      }
      if (res) {
        setCustomW(res.width)
        setCustomH(res.height)
        setDeviceW(res.width)
        setDeviceH(res.height)
      }

      // 3. System Tweaks Status
      const tweakStatus = await window.api.getTweaksStatus(activeDevice)
      
      // Map security states
      setTelemetryBlocked(tweakStatus['disable_analytics'] && tweakStatus['disable_msa'])
      
      try {
        const sourcesRes = await window.api.runAdbCommand(activeDevice, 'shell settings get secure install_non_market_apps')
        if (sourcesRes.success) {
          setUnknownSourcesBlocked(sourcesRes.output.trim() === '0')
        }
      } catch {}

      try {
        const backupRes = await window.api.runAdbCommand(activeDevice, 'shell settings get secure backup_enabled')
        if (backupRes.success) {
          setCloudBackupBlocked(backupRes.output.trim() === '0')
        }
      } catch {}

      try {
        const verifyRes = await window.api.runAdbCommand(activeDevice, 'shell settings get global verifier_verify_adb_installs')
        if (verifyRes.success) {
          setVerifyAdbInstallsEnabled(verifyRes.output.trim() === '1')
        }
      } catch {}

      // Read current animation scale if any
      // Map other states
      setFpsOverlayEnabled(!!tweakStatus['fps_overlay'])
      setHwAccelerationEnabled(!!tweakStatus['force_gpu'])
      setGameModeEnabled(!!tweakStatus['miui_optimization'])

      // 4. Multitasking & Notification States
      try {
        const limitRes = await window.api.runAdbCommand(activeDevice, 'shell settings get global background_process_limit')
        if (limitRes.success) {
          const val = limitRes.output.trim()
          setBgLimit(val === 'null' || val === '' || val === '-1' ? -1 : Number(val))
        }
      } catch {}

      try {
        const finishRes = await window.api.runAdbCommand(activeDevice, 'shell settings get global always_finish_activities')
        if (finishRes.success) {
          setAlwaysFinish(finishRes.output.trim() === '1')
        }
      } catch {}

      try {
        const phantomRes = await window.api.runAdbCommand(activeDevice, 'shell device_config get activity_manager max_phantom_processes')
        if (phantomRes.success) {
          setPhantomOptimizer(phantomRes.output.trim() === '32')
        }
      } catch {}

    } catch (err) {
      console.error('Failed to load tweaks data:', err)
    } finally {
      setLoading(false)
    }
  }, [activeDevice])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Setup batch progress listener
  useEffect(() => {
    let unsub: (() => void) | null = null
    if (activeDevice) {
      unsub = window.api.onBatchProgress((data) => {
        setBatchProgress(prev => prev ? { ...prev, current: data.done, total: data.total } : null)
      })
    }
    return () => unsub?.()
  }, [activeDevice])

  // Filtered Debloat List
  const filteredBloat = useMemo(() => {
    let list = bloatListWithStatus
    
    // Search query
    if (debloatSearch) {
      const q = debloatSearch.toLowerCase()
      list = list.filter(p => 
        p.package.toLowerCase().includes(q) || 
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    }

    return list
  }, [bloatListWithStatus, debloatSearch])

  // Selection helpers
  const toggleSelect = (pkg: string, classification: string) => {
    if (classification === 'KEEP') return // Safety lock
    const newSet = new Set(selectedBloat)
    if (newSet.has(pkg)) newSet.delete(pkg)
    else newSet.add(pkg)
    setSelectedBloat(newSet)
  }

  const selectAllSelectable = () => {
    const selectable = filteredBloat.filter(p => p.risk !== 'KEEP')
    if (selectedBloat.size === selectable.length && selectable.length > 0) {
      setSelectedBloat(new Set())
    } else {
      setSelectedBloat(new Set(selectable.map(p => p.package)))
    }
  }

  // Single debloat operation
  const handleSingleDebloatAction = async (pkg: string, action: 'uninstall' | 'disable' | 'restore') => {
    const matched = bloatListWithStatus.find(p => p.package === pkg)
    if (!matched) return

    if (action === 'uninstall' && matched.risk === 'RISKY') {
      if (!window.confirm(`CẢNH BÁO: Gói ${pkg} được đánh giá ở mức RỦI RO (RISKY). Bạn vẫn muốn tiếp tục?`)) return
    }

    setActionLoading(`${action}-${pkg}`)
    try {
      const res = await window.api.debloatPackage(activeDevice!, pkg, action, matched.preferDisable ?? false)
      if (res.success) {
        alert(`Thao tác [${action}] thành công với gói: ${pkg}`)
        await loadData()
      } else {
        alert(`Lỗi: ${res.message}`)
      }
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Batch debloat operation
  const handleBatchDebloatAction = async (action: 'uninstall' | 'disable' | 'restore') => {
    if (selectedBloat.size === 0) return
    const count = selectedBloat.size
    
    if (action === 'uninstall') {
      const hasRisky = bloatListWithStatus.some(p => selectedBloat.has(p.package) && p.risk === 'RISKY')
      const msg = hasRisky 
        ? `CẢNH BÁO NGUY HIỂM: Một vài ứng dụng được chọn có phân loại RỦI RO (RISKY). Gỡ cài đặt có thể làm mất tính năng hệ thống. Tiếp tục gỡ ${count} ứng dụng?`
        : `Xác nhận gỡ cài đặt ${count} ứng dụng rác đã chọn?`
      if (!window.confirm(msg)) return
    } else {
      if (!window.confirm(`Xác nhận thực hiện [${action}] trên ${count} ứng dụng đã chọn?`)) return
    }

    const appsToProcess = Array.from(selectedBloat).map(pkg => {
      const matched = bloatListWithStatus.find(p => p.package === pkg)
      return { package: pkg, preferDisable: matched?.preferDisable }
    })

    setBatchProgress({ current: 0, total: appsToProcess.length, action })
    try {
      const results = await window.api.batchDebloat(activeDevice!, appsToProcess, action)
      const successCount = results.filter((r: { package: string; success: boolean; message: string }) => r.success).length
      const failCount = results.length - successCount
      
      setBatchResult({ success: successCount, fail: failCount, skipped: 0, lastError: failCount > 0 ? 'Một số package xử lý thất bại' : undefined, action })
      setSelectedBloat(new Set())
      await loadData()
    } catch (err: any) {
      alert(`Lỗi hàng loạt: ${err.message}`)
    } finally {
      setBatchProgress(null)
    }
  }

  // --- Display & DPI command execution ---
  const applyDpi = async (dpi: number) => {
    if (!activeDevice) return
    const validation = validateDpi(dpi)
    if (!validation.valid) {
      showToast(validation.error!, 'error')
      return
    }
    setActionLoading('apply-dpi')
    try {
      const res = await withRetry(() => window.api.setDpi(activeDevice, dpi))
      if (res.success) {
        setCustomDpi(dpi)
        setDeviceDpi(dpi)
        showToast(res.message)
      } else {
        showToast(`Thất bại: ${res.message}`, 'error')
      }
    } catch (e: any) {
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetDpi = async () => {
    if (!activeDevice) return
    setActionLoading('reset-dpi')
    try {
      const res = await window.api.resetDpi(activeDevice)
      if (res.success) {
        showToast(res.message)
        await loadData()
      } else {
        showToast(`Thất bại: ${res.message}`, 'error')
      }
    } catch (e: any) {
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const applyResolution = async () => {
    if (!activeDevice) return
    if (customW < 720 || customW > 3840 || customH < 1280 || customH > 3840) {
      showToast('Độ phân giải không hợp lệ (W: 720-3840, H: 1280-3840)', 'error')
      return
    }
    setActionLoading('apply-res')
    try {
      const res = await window.api.setResolution(activeDevice, customW, customH)
      if (res.success) {
        setDeviceW(customW)
        setDeviceH(customH)
        showToast(res.message)
      } else {
        showToast(`Thất bại: ${res.message}`, 'error')
      }
    } catch (e: any) {
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetResolution = async () => {
    if (!activeDevice) return
    setActionLoading('reset-res')
    try {
      const res = await window.api.resetResolution(activeDevice)
      if (res.success) {
        showToast(res.message)
        await loadData()
      } else {
        showToast(`Thất bại: ${res.message}`, 'error')
      }
    } catch (e: any) {
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // --- Animations Speed commands ---
  const applyAnimations = async (scale: number) => {
    if (!activeDevice) return
    setActionLoading('apply-anim')
    try {
      await window.api.setAnimationScale(activeDevice, scale as any)
      setAnimScale(scale)
      showToast(`Đã cấu hình hoạt ảnh hệ thống: ${scale}x.`)
    } catch (e: any) {
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // --- Security & Privacy Commands ---
  const toggleTelemetry = async (enable: boolean) => {
    if (!activeDevice) return
    setTelemetryBlocked(enable)
    setActionLoading('telemetry')
    try {
      await Promise.all([
        window.api.applyTweak(activeDevice, 'disable_analytics', enable),
        window.api.applyTweak(activeDevice, 'disable_msa', enable),
        window.api.applyTweak(activeDevice, 'ad_id_limit', enable),
        window.api.applyTweak(activeDevice, 'disable_daemon', enable),
        window.api.applyTweak(activeDevice, 'disable_quickapp', enable),
      ])
      showToast(enable ? 'Đã tắt thu thập dữ liệu & chặn ID quảng cáo.' : 'Đã bật lại theo dõi quảng cáo gốc.')
    } catch (e: any) {
      setTelemetryBlocked(!enable)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleDeveloperOptions = async (enable: boolean) => {
    if (!activeDevice) return
    setDeveloperOptionsEnabled(enable)
    setActionLoading('devoptions')
    try {
      await window.api.runAdbCommand(activeDevice, `settings put global development_settings_enabled ${enable ? '1' : '0'}`)
      showToast(enable ? 'Đã kích hoạt Tùy chọn nhà phát triển.' : 'Đã ẩn Tùy chọn nhà phát triển.')
    } catch (e: any) {
      setDeveloperOptionsEnabled(!enable)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleUsbDebuggingSafe = async (enable: boolean) => {
    if (!activeDevice) return
    setUsbDebuggingSafe(enable)
    setActionLoading('usbdebugsafe')
    try {
      await window.api.runAdbCommand(activeDevice, `settings put global adb_wifi_enabled ${enable ? '1' : '0'}`)
      showToast(enable ? 'Đã tối ưu hóa kết nối ADB không dây an toàn.' : 'Đã tắt tối ưu adb wifi.')
    } catch (e: any) {
      setUsbDebuggingSafe(!enable)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleUnknownSourcesBlocked = async (enable: boolean) => {
    if (!activeDevice) return
    setUnknownSourcesBlocked(enable)
    setActionLoading('unknownsources')
    try {
      await window.api.runAdbCommand(activeDevice, `settings put secure install_non_market_apps ${enable ? '0' : '1'}`)
      showToast(enable ? 'Đã khóa quyền cài đặt ứng dụng từ nguồn không xác định.' : 'Đã mở quyền cài đặt từ nguồn không xác định.')
    } catch (e: any) {
      setUnknownSourcesBlocked(!enable)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleCloudBackupBlocked = async (enable: boolean) => {
    if (!activeDevice) return
    setCloudBackupBlocked(enable)
    setActionLoading('cloudbackup')
    try {
      await window.api.runAdbCommand(activeDevice, `settings put secure backup_enabled ${enable ? '0' : '1'}`)
      showToast(enable ? 'Đã chặn tự động sao lưu dữ liệu ngầm lên Google Cloud.' : 'Đã bật lại sao lưu Google Cloud.')
    } catch (e: any) {
      setCloudBackupBlocked(!enable)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleVerifyAdbInstalls = async (enable: boolean) => {
    if (!activeDevice) return
    setVerifyAdbInstallsEnabled(enable)
    setActionLoading('verifyadb')
    try {
      await window.api.runAdbCommand(activeDevice, `settings put global verifier_verify_adb_installs ${enable ? '1' : '0'}`)
      showToast(enable ? 'Đã kích hoạt quét bảo mật ứng dụng cài qua USB.' : 'Đã tắt quét bảo mật ứng dụng cài qua USB.')
    } catch (e: any) {
      setVerifyAdbInstallsEnabled(!enable)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // --- Gaming & FPS Commands ---
  const toggleFpsOverlay = async (enable: boolean) => {
    if (!activeDevice) return
    setFpsOverlayEnabled(enable)
    setActionLoading('fps')
    try {
      await window.api.applyTweak(activeDevice, 'fps_overlay', enable)
      showToast(enable ? 'Đã hiển thị tần số quét / FPS lên màn hình.' : 'Đã ẩn tần số quét.')
    } catch (e: any) {
      setFpsOverlayEnabled(!enable)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleGameMode = async (enable: boolean) => {
    if (!activeDevice) return
    setGameModeEnabled(enable)
    setActionLoading('gamemode')
    try {
      await window.api.applyTweak(activeDevice, 'miui_optimization', !enable)
      showToast(enable ? 'Đã tối ưu RAM & phân bổ CPU tối đa cho chế độ Game.' : 'Đã tắt Game Mode.')
    } catch (e: any) {
      setGameModeEnabled(!enable)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleHwAcceleration = async (enable: boolean) => {
    if (!activeDevice) return
    setHwAccelerationEnabled(enable)
    setActionLoading('hwaccel')
    try {
      await window.api.applyTweak(activeDevice, 'force_gpu', enable)
      showToast(enable ? 'Đã kích hoạt ép buộc kết xuất GPU (Skia) 2D.' : 'Đã tắt ép buộc kết xuất GPU.')
    } catch (e: any) {
      setHwAccelerationEnabled(!enable)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // --- Controls & Touch Commands ---
  const toggleShowTouches = async (enable: boolean) => {
    if (!activeDevice) return
    setShowTouches(enable)
    setActionLoading('showtouches')
    try {
      await window.api.runAdbCommand(activeDevice, `settings put system show_touches ${enable ? '1' : '0'}`)
      showToast(enable ? 'Đã bật hiển thị điểm chạm khi nhấn màn hình.' : 'Đã ẩn điểm chạm.')
    } catch (e: any) {
      setShowTouches(!enable)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const togglePointerLocation = async (enable: boolean) => {
    if (!activeDevice) return
    setPointerLocation(enable)
    setActionLoading('pointerlocation')
    try {
      await window.api.runAdbCommand(activeDevice, `settings put system pointer_location ${enable ? '1' : '0'}`)
      showToast(enable ? 'Đã bật đường vẽ tọa độ con trỏ cảm ứng.' : 'Đã tắt đường vẽ tọa độ.')
    } catch (e: any) {
      setPointerLocation(!enable)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const applyPointerSpeed = async (speed: number) => {
    if (!activeDevice) return
    setActionLoading('pointerspeed')
    try {
      await window.api.runAdbCommand(activeDevice, `settings put system pointer_speed ${speed}`)
      setPointerSpeed(speed)
      showToast(`Đã đổi tốc độ con trỏ chuột/cảm ứng thành: ${speed}`)
    } catch (e: any) {
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }


  const fixNotificationDelay = async (pkg: string) => {
    if (!activeDevice || !pkg) return
    if (!validatePackageName(pkg)) {
      showToast('Tên gói ứng dụng không hợp lệ!', 'error')
      return
    }
    setActionLoading('fix_notify')
    addLog(`[ACTION] Bắt đầu sửa trễ thông báo cho gói ứng dụng: ${pkg}`)
    try {
      // 1. Whitelist from doze battery optimization
      const safePkg = escapeShell(pkg)
      addLog(`[EXEC] shell dumpsys deviceidle whitelist +${safePkg}`)
      const res1 = await withRetry(() => window.api.runAdbCommand(activeDevice, `shell dumpsys deviceidle whitelist +${safePkg}`))
      addLog(`[RESULT] ${res1.output.trim() || 'Success'}`)

      // 2. Allow run in background
      addLog(`[EXEC] shell cmd appops set ${safePkg} RUN_IN_BACKGROUND allow`)
      const res2 = await withRetry(() => window.api.runAdbCommand(activeDevice, `shell cmd appops set ${safePkg} RUN_IN_BACKGROUND allow`))
      addLog(`[RESULT] ${res2.output.trim() || 'Success'}`)

      // 3. Set standby bucket to active
      addLog(`[EXEC] shell am set-standby-bucket ${safePkg} active`)
      const res3 = await withRetry(() => window.api.runAdbCommand(activeDevice, `shell am set-standby-bucket ${safePkg} active`))
      addLog(`[RESULT] ${res3.output.trim() || 'Success'}`)

      addLog(`[SUCCESS] Đã hoàn tất cấu hình tối ưu thông báo & chạy nền cho ${pkg}`)
      showToast(`Đã tối ưu thông báo & chạy nền cho gói: ${pkg}`)
    } catch (e: any) {
      addLog(`[ERROR] Sửa trễ thông báo thất bại: ${e.message}`)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const freezeBackgroundApp = async (pkg: string) => {
    if (!activeDevice || !pkg) return
    if (!validatePackageName(pkg)) {
      showToast('Tên gói ứng dụng không hợp lệ!', 'error')
      return
    }
    setActionLoading('freeze_bg')
    addLog(`[ACTION] Chặn chạy ngầm (Đóng băng) gói ứng dụng: ${pkg}`)
    try {
      // 1. Disallow run in background
      const safePkg = escapeShell(pkg)
      addLog(`[EXEC] shell cmd appops set ${safePkg} RUN_IN_BACKGROUND ignore`)
      const res1 = await withRetry(() => window.api.runAdbCommand(activeDevice, `shell cmd appops set ${safePkg} RUN_IN_BACKGROUND ignore`))
      addLog(`[RESULT] ${res1.output.trim() || 'Success'}`)

      // 2. Set standby bucket to restricted
      addLog(`[EXEC] shell am set-standby-bucket ${safePkg} restricted`)
      const res2 = await withRetry(() => window.api.runAdbCommand(activeDevice, `shell am set-standby-bucket ${safePkg} restricted`))
      addLog(`[RESULT] ${res2.output.trim() || 'Success'}`)

      addLog(`[SUCCESS] Đã đóng băng thành công chạy ngầm của ${pkg}`)
      showToast(`Đã đóng băng chạy nền cho gói: ${pkg}`)
    } catch (e: any) {
      addLog(`[ERROR] Đóng băng thất bại: ${e.message}`)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const unfreezeBackgroundApp = async (pkg: string) => {
    if (!activeDevice || !pkg) return
    if (!validatePackageName(pkg)) {
      showToast('Tên gói ứng dụng không hợp lệ!', 'error')
      return
    }
    setActionLoading('unfreeze_bg')
    addLog(`[ACTION] Khôi phục chạy ngầm cho gói ứng dụng: ${pkg}`)
    try {
      // 1. Allow run in background
      const safePkg = escapeShell(pkg)
      addLog(`[EXEC] shell cmd appops set ${safePkg} RUN_IN_BACKGROUND allow`)
      const res1 = await withRetry(() => window.api.runAdbCommand(activeDevice, `shell cmd appops set ${safePkg} RUN_IN_BACKGROUND allow`))
      addLog(`[RESULT] ${res1.output.trim() || 'Success'}`)

      // 2. Set standby bucket to active
      addLog(`[EXEC] shell am set-standby-bucket ${safePkg} active`)
      const res2 = await withRetry(() => window.api.runAdbCommand(activeDevice, `shell am set-standby-bucket ${safePkg} active`))
      addLog(`[RESULT] ${res2.output.trim() || 'Success'}`)

      addLog(`[SUCCESS] Đã mở băng thành công cho ${pkg}`)
      showToast(`Đã khôi phục chạy nền cho gói: ${pkg}`)
    } catch (e: any) {
      addLog(`[ERROR] Mở băng thất bại: ${e.message}`)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const applyBgLimit = async (limit: number) => {
    if (!activeDevice) return
    setActionLoading('bg_limit')
    addLog(`[ACTION] Thiết lập giới hạn tiến trình nền về: ${limit === -1 ? 'Mặc định' : limit}`)
    try {
      if (limit === -1) {
        addLog(`[EXEC] shell settings delete global background_process_limit`)
        const res = await window.api.runAdbCommand(activeDevice, `shell settings delete global background_process_limit`)
        addLog(`[RESULT] ${res.output.trim() || 'Success'}`)
        showToast('Đã thiết lập giới hạn đa nhiệm về mặc định của Android.')
      } else {
        addLog(`[EXEC] shell settings put global background_process_limit ${limit}`)
        const res = await window.api.runAdbCommand(activeDevice, `shell settings put global background_process_limit ${limit}`)
        addLog(`[RESULT] ${res.output.trim() || 'Success'}`)
        showToast(`Đã giới hạn số tiến trình chạy nền tối đa: ${limit} tiến trình.`)
      }
      setBgLimit(limit)
      addLog(`[SUCCESS] Đồng bộ cài đặt giới hạn tiến trình nền thành công`)
    } catch (e: any) {
      addLog(`[ERROR] Thiết lập giới hạn chạy nền thất bại: ${e.message}`)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleAlwaysFinish = async (enable: boolean) => {
    if (!activeDevice) return
    setAlwaysFinish(enable)
    setActionLoading('always_finish')
    addLog(`[ACTION] ${enable ? 'Bật' : 'Tắt'} tính năng Không giữ hoạt động (always_finish_activities)`)
    try {
      addLog(`[EXEC] shell settings put global always_finish_activities ${enable ? '1' : '0'}`)
      const res = await window.api.runAdbCommand(activeDevice, `shell settings put global always_finish_activities ${enable ? '1' : '0'}`)
      addLog(`[RESULT] ${res.output.trim() || 'Success'}`)
      addLog(`[SUCCESS] Đã thay đổi trạng thái always_finish_activities thành ${enable}`)
      showToast(enable ? 'Đã bật chế độ hủy ngay tiến trình khi thoát (tiết kiệm RAM).' : 'Đã tắt chế độ hủy tiến trình (Đa nhiệm bình thường).')
    } catch (e: any) {
      setAlwaysFinish(!enable)
      addLog(`[ERROR] Cấu hình always_finish_activities thất bại: ${e.message}`)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const togglePhantomOptimizer = async (enable: boolean) => {
    if (!activeDevice) return
    setPhantomOptimizer(enable)
    setActionLoading('phantom')
    addLog(`[ACTION] ${enable ? 'Tối ưu hóa' : 'Khôi phục'} giới hạn Phantom Processes (Android 12+)`)
    try {
      if (enable) {
        addLog(`[EXEC] shell device_config put activity_manager max_phantom_processes 32`)
        const res1 = await window.api.runAdbCommand(activeDevice, `shell device_config put activity_manager max_phantom_processes 32`)
        addLog(`[RESULT] ${res1.output.trim() || 'Success'}`)
        addLog(`[EXEC] shell device_config set_sync_disabled_for_tests persistent`)
        const res2 = await window.api.runAdbCommand(activeDevice, `shell "/system/bin/device_config set_sync_disabled_for_tests persistent"`)
        addLog(`[RESULT] ${res2.output.trim() || 'Success'}`)
      } else {
        addLog(`[EXEC] shell device_config delete activity_manager max_phantom_processes`)
        const res1 = await window.api.runAdbCommand(activeDevice, `shell device_config delete activity_manager max_phantom_processes`)
        addLog(`[RESULT] ${res1.output.trim() || 'Success'}`)
        addLog(`[EXEC] shell device_config set_sync_disabled_for_tests none`)
        const res2 = await window.api.runAdbCommand(activeDevice, `shell "/system/bin/device_config set_sync_disabled_for_tests none"`)
        addLog(`[RESULT] ${res2.output.trim() || 'Success'}`)
      }
      addLog(`[SUCCESS] Cấu hình Phantom Processes thành công`)
      showToast(enable ? 'Đã tăng giới hạn phantom processes lên 32.' : 'Đã khôi phục giới hạn phantom processes mặc định.')
    } catch (e: any) {
      setPhantomOptimizer(!enable)
      addLog(`[ERROR] Cấu hình Phantom Processes thất bại: ${e.message}`)
      showToast(`Thất bại: ${e.message}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  if (!activeDevice) {
    return (
      <div className="absolute inset-4 lg:inset-6 flex flex-col items-center justify-center p-8 bg-[#f8fafc]/90 backdrop-blur-3xl rounded-[32px] border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)] text-slate-800">
        <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/55 rounded-full flex items-center justify-center shadow-inner mb-6 relative">
          <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-xl animate-pulse"></div>
          <SlidersHorizontal className="w-10 h-10 text-slate-500 animate-bounce" />
        </div>
        <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Chưa có thiết bị kết nối</h3>
        <p className="text-slate-500 text-center max-w-sm text-sm font-semibold leading-relaxed">Vui lòng kết nối thiết bị Android bằng cáp hoặc Wi-Fi và cấp quyền gỡ lỗi USB để tiếp tục tinh chỉnh hệ thống.</p>
      </div>
    )
  }

  // Quick stats for Debloat
  const safeCount = bloatListWithStatus.filter(p => p.risk === 'SAFE').length
  const riskyCount = bloatListWithStatus.filter(p => p.risk === 'RISKY').length
  const keepCount = bloatListWithStatus.filter(p => p.risk === 'KEEP').length
  
  const selectableCount = filteredBloat.filter(p => p.risk !== 'KEEP').length
  const allSelected = selectedBloat.size === selectableCount && selectableCount > 0

  return (
    <div className="absolute inset-4 lg:inset-6 flex flex-col overflow-hidden bg-[#f8fafc]/90 backdrop-blur-3xl rounded-[32px] p-5 lg:p-6 border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)] text-slate-800">
      
      {/* TOAST NOTIFICATIONS */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold backdrop-blur-xl pointer-events-auto max-w-xs ${
                t.type === 'error'
                  ? 'bg-red-500/90 text-white'
                  : 'bg-slate-800/90 text-white'
              }`}
            >
              {t.type === 'error'
                ? <AlertCircle className="w-4 h-4 shrink-0" />
                : <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />}
              <span>{t.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* HEADER BAR */}
      <div className="bg-white/80 border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center justify-between gap-4 shrink-0 mb-4 select-none">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 shrink-0 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5 text-blue-650" />
          </div>
          <div>
            <span className="text-[9px] font-black text-blue-650 uppercase tracking-widest block">SYSTEM TWEAKS</span>
            <h2 className="text-base font-black text-slate-800 tracking-tight leading-tight">Tinh chỉnh hệ thống</h2>
          </div>
        </div>
        
        <button 
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 hover:text-blue-600 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2 text-xs font-black"
        >
          <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
          <span>LÀM MỚI DỮ LIỆU</span>
        </button>
      </div>
      
      {/* BODY SECTION */}
      <div className="flex-1 flex min-h-0 gap-5 overflow-hidden">
        {/* LEFT COLUMN: CATEGORIES SIDEBAR */}
        <div className="w-64 bg-white/50 backdrop-blur-md rounded-[28px] p-3 border border-slate-200/60 shadow-sm flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh mục tinh chỉnh</div>
            <div className="space-y-1">
              <CategoryItem 
                active={activeCategory === 'debloat'} 
                onClick={() => setActiveCategory('debloat')} 
                icon={<Trash2 size={16} />} 
                title="Gỡ ứng dụng rác" 
              />
              <CategoryItem 
                active={activeCategory === 'display'} 
                onClick={() => setActiveCategory('display')} 
                icon={<Monitor size={16} />} 
                title="Màn hình & DPI" 
              />
              <CategoryItem 
                active={activeCategory === 'security'} 
                onClick={() => setActiveCategory('security')} 
                icon={<Shield size={16} />} 
                title="Bảo mật & Riêng tư" 
              />
              <CategoryItem 
                active={activeCategory === 'game'} 
                onClick={() => setActiveCategory('game')} 
                icon={<Gamepad2 size={16} />} 
                title="Tối ưu hóa Game" 
              />
              <CategoryItem 
                active={activeCategory === 'animations'} 
                onClick={() => setActiveCategory('animations')} 
                icon={<Wand2 size={16} />} 
                title="Hoạt ảnh & Tốc độ" 
              />
              <CategoryItem 
                active={activeCategory === 'controls'} 
                onClick={() => setActiveCategory('controls')} 
                icon={<Touchpad size={16} />} 
                title="Điều khiển & Chạm" 
              />
              <CategoryItem 
                active={activeCategory === 'multitasking'} 
                onClick={() => setActiveCategory('multitasking')} 
                icon={<Layers size={16} />} 
                title="Đa nhiệm & Thông báo" 
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RENDER CATEGORY DETAILS PANEL */}
        <div className="flex-1 bg-white/80 border border-slate-200/60 rounded-[28px] shadow-sm flex flex-col relative overflow-hidden">
          <AnimatePresence mode="wait">
            
            {/* DEBLOAT CATEGORY */}
            {activeCategory === 'debloat' && (
              <motion.div 
                key="debloat"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="flex-1 flex flex-col h-full min-h-0 relative"
              >
                <div className="p-4 border-b border-slate-100 bg-slate-50/10 shrink-0 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative group">
                      <ListFilter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input 
                        type="text"
                        placeholder="Tìm gói hoặc tên ứng dụng rác..."
                        value={debloatSearch}
                        onChange={e => setDebloatSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                      />
                    </div>
                    
                    <div className="hidden lg:flex items-center gap-2">
                      <StatCard label="An toàn" count={safeCount} color="bg-green-50 text-green-700 border-green-200/50" />
                      <StatCard label="Cân nhắc" count={riskyCount} color="bg-orange-50 text-orange-700 border-orange-200/50" />
                      <StatCard label="Giữ lại" count={keepCount} color="bg-red-50 text-red-700 border-red-200/50" />
                    </div>
                  </div>
                </div>

                {/* TABLE HEADER */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50/30 shrink-0 items-center">
                  <div className="col-span-5 flex items-center gap-3">
                    <button onClick={selectAllSelectable} className={`p-1 -ml-1 rounded-md transition-colors ${allSelected ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'}`}>
                      {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tên ứng dụng & Package</span>
                  </div>
                  <div className="col-span-2 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Độ an toàn</div>
                  <div className="col-span-2 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Nhóm/Chức năng</div>
                  <div className="col-span-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Trạng thái / Thao tác</div>
                </div>

                {/* LIST BODY */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 divide-y divide-slate-50/60 pb-4">
                  {loading && bloatListWithStatus.length === 0 ? (
                    <div className="p-6 space-y-3">
                      {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-14 bg-slate-100/50 rounded-2xl animate-pulse" />)}
                    </div>
                  ) : filteredBloat.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 min-h-[300px]">
                      <ShieldCheck className="w-16 h-16 text-emerald-400/80 mb-3 animate-pulse" />
                      <p className="text-sm font-black text-slate-700">Tuyệt vời! Thiết bị cực kỳ sạch sẽ.</p>
                      <p className="text-xs font-semibold text-slate-400 mt-1">Không tìm thấy ứng dụng rác nào phù hợp với bộ lọc hiện tại.</p>
                    </div>
                  ) : (
                    filteredBloat.map(item => {
                      const isSelected = selectedBloat.has(item.package)
                      const isKeep = item.risk === 'KEEP'
                      const isRisky = item.risk === 'RISKY'
                      
                      let classificationBadge = 'bg-green-50 text-green-600 border-green-200'
                      if (isRisky) classificationBadge = 'bg-orange-50 text-orange-600 border-orange-200'
                      if (isKeep) classificationBadge = 'bg-red-50 text-red-600 border-red-200'

                      let statusBadge = 'bg-slate-100 text-slate-550 border-slate-200'
                      let statusText = 'Chưa cài'
                      if (item.status === 'installed') {
                        statusBadge = 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        statusText = 'Đang chạy'
                      } else if (item.status === 'disabled') {
                        statusBadge = 'bg-amber-50 text-amber-600 border-amber-200'
                        statusText = 'Đã tắt'
                      }

                      return (
                        <div 
                          key={item.package}
                          className={`grid grid-cols-12 gap-4 px-4 py-3 items-center transition-all ${isSelected ? 'bg-blue-50/40 border-l-4 border-l-blue-600' : 'hover:bg-slate-50/40 border-l-4 border-l-transparent'} group h-[68px]`}
                        >
                          <div className="col-span-5 flex items-center gap-3 truncate">
                            <button 
                              disabled={isKeep}
                              onClick={() => toggleSelect(item.package, item.risk)} 
                              className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors shrink-0 ${isKeep ? 'opacity-20 cursor-not-allowed bg-slate-105 border-slate-300' : isSelected ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 hover:border-blue-400 text-transparent'}`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </button>
                            
                            <div className="truncate">
                              <div className="text-[10px] font-black text-blue-600 tracking-tight leading-none mb-1 group-hover:text-blue-700">{item.name}</div>
                              <div className={`text-xs font-bold truncate ${item.status === 'disabled' ? 'text-slate-400 line-through font-medium' : 'text-slate-750'}`}>{item.package}</div>
                            </div>
                          </div>

                          <div className="col-span-2 flex justify-center">
                            <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${classificationBadge}`}>
                              {item.risk}
                            </span>
                          </div>

                          <div className="col-span-2 text-center text-xs font-bold text-slate-500 uppercase tracking-tighter truncate">
                            {item.category}
                          </div>

                          <div className="col-span-3 flex items-center justify-end gap-2">
                            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${statusBadge}`}>
                              {statusText}
                            </span>
                            
                            <div className="hidden group-hover:flex items-center gap-1">
                              {item.status !== 'uninstalled' ? (
                                <>
                                  {item.status === 'installed' ? (
                                    <>
                                      <ActionButton 
                                        icon={<PowerOff size={13} />} 
                                        tooltip="Vô hiệu hóa"
                                        disabled={isKeep}
                                        onClick={() => handleSingleDebloatAction(item.package, 'disable')} 
                                        color="text-amber-600 hover:bg-amber-50"
                                        loading={actionLoading === `disable-${item.package}`}
                                      />
                                      <ActionButton 
                                        icon={<Trash2 size={13} />} 
                                        tooltip="Gỡ cài đặt"
                                        disabled={isKeep}
                                        onClick={() => handleSingleDebloatAction(item.package, 'uninstall')} 
                                        color="text-red-650 hover:bg-red-50"
                                        loading={actionLoading === `uninstall-${item.package}`}
                                      />
                                    </>
                                  ) : (
                                    <ActionButton 
                                      icon={<Undo2 size={13} />} 
                                      tooltip="Bật lại"
                                      onClick={() => handleSingleDebloatAction(item.package, 'restore')} 
                                      color="text-emerald-650 hover:bg-emerald-50"
                                      loading={actionLoading === `restore-${item.package}`}
                                    />
                                  )}
                                </>
                              ) : (
                                <ActionButton 
                                  icon={<Undo2 size={13} />} 
                                  tooltip="Cài lại ứng dụng gốc"
                                  onClick={() => handleSingleDebloatAction(item.package, 'restore')} 
                                  color="text-slate-600 hover:bg-slate-100"
                                  loading={actionLoading === `restore-${item.package}`}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* BOTTOM STICKY BAR FOR BATCH DEBLOAT */}
                <AnimatePresence>
                  {selectedBloat.size > 0 && (
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      className="sticky bottom-0 bg-white/95 border-t border-slate-200 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] flex items-center justify-between z-10 w-full rounded-b-3xl shrink-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-650 flex items-center justify-center text-[10px] font-black text-white">{selectedBloat.size}</div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Đã chọn</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {batchProgress ? (
                          <div className="flex items-center gap-3 bg-blue-50 border border-blue-150 px-4 py-2 rounded-xl">
                            <RefreshCcw className="w-4 h-4 animate-spin text-blue-650" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-650">Xử lý {batchProgress.current}/{batchProgress.total}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleBatchDebloatAction('uninstall')}
                              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5"
                            >
                              <Trash2 size={13} />
                              Gỡ bỏ
                            </button>
                            <button 
                              onClick={() => handleBatchDebloatAction('disable')}
                              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5"
                            >
                              <PowerOff size={13} />
                              Tắt chạy nền
                            </button>
                            <button 
                              onClick={() => handleBatchDebloatAction('restore')}
                              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-650 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5"
                            >
                              <Undo2 size={13} />
                              Khôi phục
                            </button>
                          </div>
                        )}

                        <button 
                          onClick={() => setSelectedBloat(new Set())}
                          className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-xl transition-all"
                          title="Hủy chọn tất cả"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* DISPLAY & DPI CATEGORY */}
            {activeCategory === 'display' && (
              <motion.div 
                key="display"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* DPI Density card */}
                  <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl"><Monitor size={20} /></div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Mật độ điểm ảnh (DPI)</h4>
                            <p className="text-xs text-slate-400 font-semibold">Tùy biến hiển thị toàn màn hình.</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                          <span>Mật độ mong muốn:</span>
                          <div className="flex items-center gap-2">
                            {deviceDpi && (
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded text-[10px] font-black">
                                Hiện tại: {deviceDpi} DPI
                              </span>
                            )}
                            <span className="text-blue-655 font-black">{customDpi} DPI</span>
                          </div>
                        </div>
                        
                        <input 
                          type="range" 
                          min="240"
                          max="600"
                          step="10"
                          value={customDpi}
                          onChange={e => setCustomDpi(Number(e.target.value))}
                          className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-650"
                        />

                        <div className="grid grid-cols-3 gap-2">
                          <PresetButton active={customDpi === 360} onClick={() => setCustomDpi(360)} label="Nhỏ (360)" />
                          <PresetButton active={customDpi === 440} onClick={() => setCustomDpi(440)} label="Mặc định" />
                          <PresetButton active={customDpi === 500} onClick={() => setCustomDpi(500)} label="Lớn (500)" />
                        </div>

                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                          ⚠️ Lưu ý: Việc đặt DPI quá nhỏ hoặc quá lớn có thể làm méo biểu tượng hoặc đè lớp UI hiển thị.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-100 mt-6 shrink-0">
                      <button 
                        onClick={() => applyDpi(customDpi)}
                        disabled={actionLoading === 'apply-dpi'}
                        className="flex-1 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
                      >
                        {actionLoading === 'apply-dpi' ? 'Đang áp dụng...' : 'Áp dụng DPI'}
                      </button>
                      <button 
                        onClick={handleResetDpi}
                        disabled={actionLoading === 'reset-dpi'}
                        className="px-5 py-3 bg-slate-100 border border-slate-200 text-slate-650 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-205 transition-all active:scale-95 disabled:opacity-50"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Resolution Changer card */}
                  <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl"><Smartphone size={20} /></div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Độ phân giải hiển thị</h4>
                            <p className="text-xs text-slate-400 font-semibold">Tự cấu hình lại kích thước màn hình.</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                          <span>Độ phân giải mong muốn:</span>
                          {deviceW && deviceH && (
                            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded text-[10px] font-black">
                              Hiện tại: {deviceW}x{deviceH} PX
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rộng (Width)</label>
                            <input 
                              type="number"
                              value={customW}
                              onChange={e => setCustomW(Number(e.target.value))}
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cao (Height)</label>
                            <input 
                              type="number"
                              value={customH}
                              onChange={e => setCustomH(Number(e.target.value))}
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <PresetButton active={customW === 1080 && customH === 2400} onClick={() => { setCustomW(1080); setCustomH(2400); }} label="FHD+ (1080x2400)" />
                          <PresetButton active={customW === 1440 && customH === 3200} onClick={() => { setCustomW(1440); setCustomH(3200); }} label="WQHD+ (1440x3200)" />
                        </div>

                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                          ⚠️ Lưu ý: Thay đổi độ phân giải sai tỷ lệ có thể khiến màn hình bị giãn hoặc mất cảm ứng tạm thời.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-100 mt-6 shrink-0">
                      <button 
                        onClick={applyResolution}
                        disabled={actionLoading === 'apply-res'}
                        className="flex-1 py-3 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
                      >
                        {actionLoading === 'apply-res' ? 'Đang cấu hình...' : 'Áp dụng phân giải'}
                      </button>
                      <button 
                        onClick={handleResetResolution}
                        disabled={actionLoading === 'reset-res'}
                        className="px-5 py-3 bg-slate-100 border border-slate-200 text-slate-655 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-205 transition-all active:scale-95 disabled:opacity-50"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SECURITY & PRIVACY CATEGORY */}
            {activeCategory === 'security' && (
              <motion.div 
                key="security"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar space-y-6"
              >
                <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden space-y-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Quyền riêng tư & Bảo mật hệ thống</h4>
                    <p className="text-xs text-slate-450 font-semibold">Tăng độ bảo mật dữ liệu cá nhân bằng cách khóa các tiến trình thu thập ẩn.</p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    <TweakSwitchRow 
                      icon={<ShieldCheck className="text-green-500" />}
                      title="Chặn Telemetry & Theo dõi người dùng"
                      desc="Khóa toàn bộ ID quảng cáo, logs phân tích hành vi và telemetry ngầm gửi về hãng sản xuất com.miui.analytics và com.miui.msa.global."
                      active={telemetryBlocked}
                      onToggle={toggleTelemetry}
                      loading={actionLoading === 'telemetry'}
                    />

                    <TweakSwitchRow 
                      icon={<SlidersHorizontal className="text-blue-500" />}
                      title="Cấu hình Tùy chọn nhà phát triển"
                      desc="Bật hoặc ẩn hoàn toàn menu Developer Options trong cài đặt của thiết bị để tránh người khác thay đổi."
                      active={developerOptionsEnabled}
                      onToggle={toggleDeveloperOptions}
                      loading={actionLoading === 'devoptions'}
                    />

                    <TweakSwitchRow 
                      icon={<Shield className="text-amber-500" />}
                      title="Xác thực an toàn ADB Wifi"
                      desc="Buộc thiết bị sử dụng cổng wifi được mã hóa khi mở gỡ lỗi adb từ xa."
                      active={usbDebuggingSafe}
                      onToggle={toggleUsbDebuggingSafe}
                      loading={actionLoading === 'usbdebugsafe'}
                    />

                    <TweakSwitchRow 
                      icon={<FolderLock className="text-rose-500" />}
                      title="Chặn cài đặt từ Nguồn không xác định"
                      desc="Khóa quyền cài đặt trực tiếp ứng dụng từ tệp tin APK ngoài Google Play (install_non_market_apps) để phòng chống mã độc."
                      active={unknownSourcesBlocked}
                      onToggle={toggleUnknownSourcesBlocked}
                      loading={actionLoading === 'unknownsources'}
                    />

                    <TweakSwitchRow 
                      icon={<CloudOff className="text-purple-500" />}
                      title="Khóa sao lưu Google Cloud ngầm"
                      desc="Chặn tính năng tự động đồng bộ và tải dữ liệu hệ thống, ứng dụng nhạy cảm lên máy chủ đám mây của Google."
                      active={cloudBackupBlocked}
                      onToggle={toggleCloudBackupBlocked}
                      loading={actionLoading === 'cloudbackup'}
                    />

                    <TweakSwitchRow 
                      icon={<ShieldAlert className="text-emerald-500" />}
                      title="Quét bảo mật ứng dụng cài qua USB"
                      desc="Kích hoạt chế độ tự động xác thực và quét bảo mật mọi ứng dụng cài đặt thông qua cổng kết nối ADB/USB."
                      active={verifyAdbInstallsEnabled}
                      onToggle={toggleVerifyAdbInstalls}
                      loading={actionLoading === 'verifyadb'}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* GAME OPTIMIZATION CATEGORY */}
            {activeCategory === 'game' && (
              <motion.div 
                key="game"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar space-y-6"
              >
                <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden space-y-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Chế độ tối ưu hóa Game & Ép xung phần cứng</h4>
                    <p className="text-xs text-slate-450 font-semibold">Tập trung tối đa xung nhịp phần cứng cho tác vụ chơi game.</p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    <TweakSwitchRow 
                      icon={<Gamepad2 className="text-purple-500" />}
                      title="Chế độ chơi game ẩn (Game Mode)"
                      desc="Giải phóng RAM trống tức thì, tối ưu phân bổ luồng CPU giúp hạn chế giật lag FPS khi chơi game nặng."
                      active={gameModeEnabled}
                      onToggle={toggleGameMode}
                      loading={actionLoading === 'gamemode'}
                    />

                    <TweakSwitchRow 
                      icon={<Eye className="text-blue-500" />}
                      title="Hiển thị tần số quét / FPS"
                      desc="Bật bộ đếm FPS thời gian thực của Android hiển thị trực tiếp góc trái màn hình."
                      active={fpsOverlayEnabled}
                      onToggle={toggleFpsOverlay}
                      loading={actionLoading === 'fps'}
                    />

                    <TweakSwitchRow 
                      icon={<Cpu className="text-emerald-500" />}
                      title="Ép buộc kết xuất GPU 2D (Force GPU Rendering)"
                      desc="Buộc hệ thống sử dụng nhân đồ họa GPU Skia để vẽ các phần tử giao diện 2D thay vì dùng CPU, giúp cuộn mượt hơn."
                      active={hwAccelerationEnabled}
                      onToggle={toggleHwAcceleration}
                      loading={actionLoading === 'hwaccel'}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ANIMATIONS & SPEED CATEGORY */}
            {activeCategory === 'animations' && (
              <motion.div 
                key="animations"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar space-y-6"
              >
                <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden space-y-6">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Hoạt ảnh & Tốc độ chuyển cảnh hệ thống</h4>
                    <p className="text-xs text-slate-450 font-semibold">Tăng hoặc giảm thời gian chờ của animation. Animation càng nhanh, cảm giác máy phản hồi càng tốc độ.</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    <AnimScaleCard 
                      label="Tắt hoạt ảnh" 
                      desc="Tối đa tốc độ chuyển tab" 
                      scale={0} 
                      active={animScale === 0} 
                      onClick={() => applyAnimations(0)} 
                      loading={actionLoading === 'apply-anim' && animScale === 0}
                    />
                    <AnimScaleCard 
                      label="Siêu mượt" 
                      desc="Nhẹ nhàng & Tốc độ (0.5x)" 
                      scale={0.5} 
                      active={animScale === 0.5} 
                      onClick={() => applyAnimations(0.5)} 
                      loading={actionLoading === 'apply-anim' && animScale === 0.5}
                    />
                    <AnimScaleCard 
                      label="Mặc định" 
                      desc="Tốc độ tiêu chuẩn (1.0x)" 
                      scale={1.0} 
                      active={animScale === 1.0} 
                      onClick={() => applyAnimations(1.0)} 
                      loading={actionLoading === 'apply-anim' && animScale === 1.0}
                    />
                    <AnimScaleCard 
                      label="Chậm rãi" 
                      desc="Chuyển động rõ nét (1.5x)" 
                      scale={1.5} 
                      active={animScale === 1.5} 
                      onClick={() => applyAnimations(1.5)} 
                      loading={actionLoading === 'apply-anim' && animScale === 1.5}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* CONTROLS & INTERACTION CATEGORY */}
            {activeCategory === 'controls' && (
              <motion.div 
                key="controls"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar space-y-6"
              >
                <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden space-y-6">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Điều khiển & Tương tác cảm biến chạm</h4>
                    <p className="text-xs text-slate-450 font-semibold">Tinh chỉnh độ nhạy điểm chạm và phản hồi con trỏ trên hệ điều hành.</p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    <TweakSwitchRow 
                      icon={<Touchpad className="text-indigo-500" />}
                      title="Hiển thị phản hồi điểm chạm (Show Touches)"
                      desc="Hiển thị một chấm tròn nhỏ màu trắng tại vị trí ngón tay chạm vào màn hình cảm ứng, hữu ích khi quay video màn hình."
                      active={showTouches}
                      onToggle={toggleShowTouches}
                      loading={actionLoading === 'touches'}
                    />

                    <TweakSwitchRow 
                      icon={<Monitor className="text-blue-500" />}
                      title="Hiển thị tọa độ con trỏ (Pointer Location)"
                      desc="Vẽ các đường kẻ trục XY thời gian thực và ghi lại vết cảm ứng trực tiếp trên đỉnh màn hình để test vùng chết cảm ứng."
                      active={pointerLocation}
                      onToggle={togglePointerLocation}
                      loading={actionLoading === 'pointerloc'}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest">Tốc độ con trỏ cảm ứng (Pointer Speed)</h5>
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Tùy chỉnh tốc độ di chuyển con trỏ (khi dùng chuột/bàn rê Bluetooth).</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <input 
                          type="range" 
                          min="-7"
                          max="7"
                          step="1"
                          value={pointerSpeed}
                          onChange={e => setPointerSpeed(Number(e.target.value))}
                          className="flex-1 h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-650"
                        />
                        <span className="w-12 text-center text-xs font-black text-indigo-650 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg">{pointerSpeed}</span>
                      </div>

                      <button
                        onClick={() => applyPointerSpeed(pointerSpeed)}
                        disabled={actionLoading === 'pointer_speed'}
                        className="w-full py-3 bg-indigo-650 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md disabled:opacity-50"
                      >
                        {actionLoading === 'pointer_speed' ? 'Đang cập nhật...' : 'Cập nhật tốc độ con trỏ'}
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest">Tốc độ phản ứng DPI ảo chuột</h5>
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Lưu ý: Tốc độ mặc định của hệ thống Android là 0.</p>
                      </div>
                      <div className="h-12 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-500">
                        Giá trị con trỏ hợp lệ: Từ -7 (Chậm nhất) đến +7 (Nhanh nhất).
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* MULTITASKING & NOTIFICATIONS CATEGORY */}
            {activeCategory === 'multitasking' && (
              <motion.div 
                key="multitasking"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar space-y-6"
              >
                {/* Part 1: RAM & Background limit */}
                <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden space-y-6">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Giới hạn Chạy ngầm & RAM Đa nhiệm</h4>
                    <p className="text-xs text-slate-450 font-semibold">Điều khiển cách hệ thống Android giữ tiến trình ngầm và giải phóng RAM.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest">Giới hạn số tiến trình chạy ngầm</h5>
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Giảm tiến trình chạy nền sẽ giải phóng nhiều RAM hơn cho app hiện tại.</p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <PresetButton active={bgLimit === -1} onClick={() => applyBgLimit(-1)} label="Tiêu chuẩn" />
                        <PresetButton active={bgLimit === 0} onClick={() => applyBgLimit(0)} label="Không có" />
                        <PresetButton active={bgLimit === 1} onClick={() => applyBgLimit(1)} label="1 tiến trình" />
                        <PresetButton active={bgLimit === 2} onClick={() => applyBgLimit(2)} label="2 tiến trình" />
                        <PresetButton active={bgLimit === 3} onClick={() => applyBgLimit(3)} label="3 tiến trình" />
                        <PresetButton active={bgLimit === 4} onClick={() => applyBgLimit(4)} label="4 tiến trình" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-[10px] text-slate-550 leading-relaxed font-semibold">
                        💡 **Lời khuyên**: Đối với các dòng máy yếu (RAM 3GB - 4GB), hãy đặt giới hạn ở mức **3 hoặc 4 tiến trình** để cải thiện đáng kể độ mượt của game mà không gây trễ tin nhắn Zalo/Messenger quá nặng.
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 pt-4 border-t border-slate-100">
                    {/* Don't Keep Activities */}
                    <TweakSwitchRow 
                      icon={<Layers className="text-rose-500" />}
                      title="Không giữ hoạt động (Don't Keep Activities)"
                      desc="Phá hủy lập tức mọi tác vụ/giao diện ứng dụng ngay khi người dùng nhấn Home hoặc chuyển sang ứng dụng khác."
                      active={alwaysFinish}
                      onToggle={toggleAlwaysFinish}
                      loading={actionLoading === 'always_finish'}
                    />

                    {/* Phantom Process Killer Optimizer */}
                    <TweakSwitchRow 
                      icon={<Cpu className="text-emerald-500" />}
                      title="Tối ưu hóa Tiến trình Ẩn (Phantom Processes)"
                      desc="Nâng giới hạn tiến trình phụ lên 32 (chỉ hỗ trợ Android 12 trở lên) nhằm ngăn ngừa tình trạng kill app chạy ngầm quá đà."
                      active={phantomOptimizer}
                      onToggle={togglePhantomOptimizer}
                      loading={actionLoading === 'phantom'}
                    />
                  </div>
                </div>

                {/* Part 2: Fix Notification & Background Autostart */}
                <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Sửa lỗi trễ thông báo & Cho phép tự khởi chạy</h4>
                    <p className="text-xs text-slate-450 font-semibold">Đưa ứng dụng vào danh sách loại trừ tối ưu pin (Doze Whitelist) để nhận thông báo tức thời.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <input 
                        type="text"
                        placeholder="Nhập tên gói ứng dụng (Ví dụ: com.whatsapp, com.facebook.orca...)"
                        value={pkgNotifyInput}
                        onChange={e => setPkgNotifyInput(e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black text-slate-700 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300"
                      />
                      <button
                        onClick={() => fixNotificationDelay(pkgNotifyInput)}
                        disabled={!pkgNotifyInput || actionLoading === 'fix_notify'}
                        className="px-5 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md disabled:opacity-50 shrink-0"
                      >
                        {actionLoading === 'fix_notify' ? 'Đang sửa...' : 'Sửa trễ thông báo'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                      💡 **Mẹo**: Lệnh này sẽ tự động loại bỏ ứng dụng khỏi chế độ ngủ tiết kiệm pin (Doze mode), cho phép chạy nền và nâng bucket ưu tiên lên hoạt động tích cực (standby-bucket active).
                    </p>
                  </div>
                </div>

                {/* Part 3: Freeze Background Applications */}
                <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Quản lý Đóng băng / Tắt chạy nền</h4>
                    <p className="text-xs text-slate-450 font-semibold">Khóa quyền chạy ngầm của các ứng dụng không cần thiết nhằm tiết kiệm năng lượng triệt để.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <input 
                        type="text"
                        placeholder="Nhập tên gói ứng dụng cần chặn chạy nền..."
                        value={pkgFreezeInput}
                        onChange={e => setPkgFreezeInput(e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black text-slate-700 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300"
                      />
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => freezeBackgroundApp(pkgFreezeInput)}
                          disabled={!pkgFreezeInput || actionLoading === 'freeze_bg'}
                          className="px-5 py-3 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                        >
                          {actionLoading === 'freeze_bg' ? 'Đang chặn...' : 'Đóng băng nền'}
                        </button>
                        <button
                          onClick={() => unfreezeBackgroundApp(pkgFreezeInput)}
                          disabled={!pkgFreezeInput || actionLoading === 'unfreeze_bg'}
                          className="px-5 py-3 bg-white border border-slate-200 text-slate-650 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                        >
                          {actionLoading === 'unfreeze_bg' ? 'Đang mở...' : 'Kích hoạt lại'}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                      ⚠️ **Lưu ý**: Đóng băng nền sẽ chặn quyền `RUN_IN_BACKGROUND` của gói thông qua AppOps và chuyển trạng thái standby thành `restricted`. Ứng dụng sẽ không thể gửi tin nhắn hoặc đẩy dịch vụ nền trừ khi được bạn mở trực tiếp.
                    </p>
                  </div>
                </div>

                {/* Part 4: Xiaomi Multitasking Lock Lock explanation */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-6 rounded-3xl border border-blue-100 shadow-sm space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-md shrink-0">
                      <AlertCircle size={22} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Hướng dẫn Khóa ứng dụng đa nhiệm (MIUI / HyperOS)</h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        Do cơ chế khóa ứng dụng đa nhiệm (Recent lock) nằm sâu trong ứng dụng bảo mật độc quyền của Xiaomi, **không có lệnh ADB công khai** nào có thể trực tiếp thực hiện tính năng này. Bạn có thể thiết lập bằng cách thủ công sau:
                      </p>
                    </div>
                  </div>

                  <div className="pl-14 space-y-2 text-xs text-slate-600 font-semibold list-decimal leading-relaxed">
                    <p>🔹 **Cách 1 (Từ ứng dụng Bảo mật - Khuyên dùng cho HyperOS):**</p>
                    <p className="pl-4">1. Mở ứng dụng **Bảo mật (Security)** mặc định trên điện thoại.</p>
                    <p className="pl-4">2. Nhấn vào biểu tượng **Cài đặt (Bánh răng)** ở góc trên bên phải.</p>
                    <p className="pl-4">3. Chọn mục **Tăng tốc (Boost speed)** → **Khóa ứng dụng (Lock apps)**.</p>
                    <p className="pl-4">4. Gạt bật công tắc cho các ứng dụng bạn muốn khóa lại.</p>

                    <p className="pt-2">🔹 **Cách 2 (Từ màn hình Đa nhiệm - Dành cho MIUI cũ):**</p>
                    <p className="pl-4">1. Vuốt lên giữ để mở màn hình Đa nhiệm gần đây.</p>
                    <p className="pl-4">2. Ấn giữ lâu vào thẻ xem trước của ứng dụng mong muốn.</p>
                    <p className="pl-4">3. Nhấn vào **biểu tượng Ổ khóa** để giữ ứng dụng chạy ngầm vĩnh viễn.</p>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Batch modal for Debloat results */}
      <BatchResultModal result={batchResult} onClose={() => setBatchResult(null)} />
    </div>
  )
}

function CategoryItem({ active, onClick, icon, title }: { active: boolean, onClick: () => void, icon: React.ReactNode, title: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full relative flex items-center gap-3 p-3 rounded-2xl text-left transition-all ${active ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' : 'text-slate-650 hover:bg-slate-100 hover:text-slate-900'}`}
    >
      <div className={`p-2 rounded-xl shrink-0 ${active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}>{icon}</div>
      <span className="text-xs font-black tracking-tight truncate">{title}</span>
    </button>
  )
}

function StatCard({ label, count, color }: { label: string, count: number, color: string }) {
  return (
    <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider ${color}`}>
      <span>{label}:</span>
      <span className="text-xs font-black">{count}</span>
    </div>
  )
}

function ActionButton({ icon, tooltip, disabled, onClick, color, loading }: { icon: React.ReactElement, tooltip: string, disabled?: boolean, onClick: () => void, color: string, loading?: boolean }) {
  return (
    <button
      title={tooltip}
      disabled={disabled || loading}
      onClick={onClick}
      className={`p-2 rounded-lg transition-all active:scale-90 flex items-center justify-center shrink-0 border border-slate-200/30 ${disabled ? 'opacity-30 cursor-not-allowed' : color} ${loading ? 'opacity-50' : ''}`}
    >
      {loading ? <RefreshCcw size={13} className="animate-spin" /> : icon}
    </button>
  )
}

function PresetButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`py-2 px-3 border rounded-xl text-center text-xs font-bold transition-all ${active ? 'bg-blue-600 border-blue-650 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
    >
      {label}
    </button>
  )
}

function AnimScaleCard({ label, desc, scale, active, onClick, loading }: { label: string, desc: string, scale: number, active: boolean, onClick: () => void, loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`relative p-5 rounded-2xl border text-left flex flex-col justify-between transition-all group overflow-hidden ${active ? 'bg-purple-600 border-purple-600 text-white shadow-xl shadow-purple-600/20' : 'bg-slate-50 border-slate-200 text-slate-655 hover:bg-slate-100 hover:border-purple-200'}`}
    >
      <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-purple-200' : 'text-slate-400'}`}>{label}</span>
        {loading ? (
          <RefreshCcw size={14} className="animate-spin text-purple-200" />
        ) : (
          <span className={`text-base font-black ${active ? 'text-white' : 'text-purple-600'}`}>{scale}x</span>
        )}
      </div>
      <p className={`text-[10px] font-bold ${active ? 'text-purple-100' : 'text-slate-500'}`}>{desc}</p>
    </button>
  )
}

function TweakSwitchRow({ icon, title, desc, active, onToggle, loading }: { icon: React.ReactNode, title: string, desc: string, active: boolean, onToggle: (enable: boolean) => void, loading?: boolean }) {
  return (
    <div className="flex items-center justify-between py-6 gap-6 transition-all hover:bg-slate-50/20 px-4 -mx-4 rounded-xl">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl shrink-0 mt-0.5 shadow-sm">{icon}</div>
        <div className="space-y-1">
          <h5 className="text-sm font-black text-slate-800 tracking-tight leading-none">{title}</h5>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-lg">{desc}</p>
        </div>
      </div>

      <button
        onClick={() => onToggle(!active)}
        disabled={loading}
        className={`relative w-14 h-8 rounded-full transition-colors flex items-center px-1 shrink-0 ${active ? 'bg-blue-600' : 'bg-slate-200'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <motion.div 
          animate={{ x: active ? 24 : 0 }}
          className="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center"
        >
          {loading && <RefreshCcw size={10} className="animate-spin text-blue-600" />}
        </motion.div>
      </button>
    </div>
  )
}
