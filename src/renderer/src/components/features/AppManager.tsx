import React, { useState, useEffect, useMemo } from 'react'
import { Search, Trash2, PowerOff, RefreshCcw, ShieldAlert, Package, Loader2, Play, Undo2, CheckCircle2, ListFilter, CheckSquare, Square, Download, Sparkles, User, Settings, Ban, Upload, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDeviceStore } from '../../store/deviceStore'
import { BatchResultModal } from './BatchResultModal'

const BLACKLIST = [
  'android',
  'com.android.systemui',
  'com.android.settings',
  'com.android.phone',
  'com.android.contacts',
  'com.miui.securitycenter'
]

// Các preset rác phổ biến
const BLOATWARE_PRESETS = {
  xiaomi: [
    'com.miui.analytics',
    'com.miui.msa.global',
    'com.xiaomi.joyose',
    'com.miui.daemon',
    'com.miui.bugreport',
    'com.xiaomi.mipicks',
    'com.miui.analytics', 'com.miui.msa.global', 'com.miui.systemAdSolution', 'com.miui.hybrid', 
    'com.miui.hybrid.accessory', 'com.miui.contentcatcher', 'com.miui.bugreport', 'com.xiaomi.joyose',
    'com.xiaomi.gamecenter.sdk.service', 'com.xiaomi.aiasst.service', 'com.xiaomi.aicr',
    'com.miui.personalassistant', 'com.mi.globalminusscreen', 'com.miui.voiceassist',
    'com.miui.videoplayer', 'com.miui.player', 'com.mi.globalbrowser', 'com.miui.cleanmaster',
    'com.miui.compass', 'com.miui.android.fashiongallery', 'com.miui.yellowpage',
    'com.miui.mishare.connectivity', 'com.mi.global.shop', 'com.xiaomi.mipicks',
    'com.miui.nextpay', 'com.mipay.wallet.id', 'com.mi.health', 'com.miui.miservice',
    'com.xiaomi.gamecenter', 'com.xiaomi.miplay_client', 'com.xiaomi.mirror',
    'com.xiaomi.powerchecker', 'cn.wps.xiaomi.abroad.lite', 'com.tencent.soter.soterserver'
  ],
  samsung: ['com.samsung.android.bixby.agent', 'com.samsung.android.app.spage', 'com.samsung.android.service.peoplestripe', 'com.samsung.android.app.routines', 'com.samsung.android.game.gamehome', 'com.samsung.android.game.gametools', 'com.samsung.android.aremoji', 'com.sec.android.app.sbrowser'],
  google: [
    'com.android.egg', 'com.android.bips', 'com.android.printspooler', 'com.android.stk',
    'com.android.wallpaper.livepicker', 'com.android.chrome', 'com.google.android.apps.tachyon',
    'com.google.android.apps.youtube.music', 'com.google.android.apps.docs',
    'com.google.android.apps.photos', 'com.google.android.apps.wellbeing',
    'com.google.android.marvin.talkback', 'com.google.android.videos', 'com.google.ar.lens',
    'com.google.android.as.oss'
  ]
}

const FRIENDLY_NAMES: Record<string, string> = {
  'com.miui.analytics': 'MIUI Analytics (Theo dõi)',
  'com.miui.msa.global': 'MSA (Quảng cáo hệ thống)',
  'com.miui.systemAdSolution': 'System Ad Solution',
  'com.miui.hybrid': 'Quick Apps (Data Mining)',
  'com.miui.hybrid.accessory': 'Quick Apps Accessory',
  'com.miui.contentcatcher': 'Content Catcher',
  'com.miui.bugreport': 'Bug Report App',
  'com.xiaomi.joyose': 'Joyose (Game Analytics)',
  'com.xiaomi.gamecenter.sdk.service': 'Game Center SDK',
  'com.xiaomi.aiasst.service': 'AI Assistant Service',
  'com.xiaomi.aicr': 'Xiaomi AI Engine',
  'com.miui.personalassistant': 'App Vault (Assistant)',
  'com.mi.globalminusscreen': 'App Vault (Minus Screen)',
  'com.miui.voiceassist': 'Voice Assistant',
  'com.miui.videoplayer': 'Mi Video',
  'com.miui.player': 'Mi Music',
  'com.mi.globalbrowser': 'Mi Browser',
  'com.miui.cleanmaster': 'System Cleaner (Rác)',
  'com.miui.compass': 'Mi Compass (La bàn)',
  'com.miui.android.fashiongallery': 'Wallpaper Carousel',
  'com.miui.yellowpage': 'Mi Yellow Pages',
  'com.miui.mishare.connectivity': 'Mi Share',
  'com.mi.global.shop': 'Mi Store',
  'com.xiaomi.mipicks': 'GetApps (Quảng cáo)',
  'com.miui.nextpay': 'Mi Pay',
  'com.mi.health': 'Mi Health / Fitness',
  'com.xiaomi.gamecenter': 'Game Center',
  'com.android.chrome': 'Google Chrome',
  'com.google.android.apps.photos': 'Google Photos',
  'com.google.android.apps.youtube.music': 'YouTube Music'
}

interface AppInfo {
  pkg: string;
  type: 'system' | 'user';
  status: 'enabled' | 'disabled';
}

export function AppManager() {
  const { activeDevice } = useDeviceStore()
  const [packages, setPackages] = useState<AppInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'system' | 'user' | 'disabled'>('user')
  
  // Selection States
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set())
  const [presetFilter, setPresetFilter] = useState<string>('none')
  
  // Progress States
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number, action: string} | null>(null)
  const [batchResult, setBatchResult] = useState<{success: number, fail: number, skipped: number, lastError?: string, action: string} | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (activeDevice) {
      loadPackages()
      setSelectedApps(new Set())
      setPresetFilter('none')
    }
  }, [activeDevice])

  const loadPackages = async () => {
    setLoading(true)
    try {
      // @ts-ignore
      const pkgs: AppInfo[] = await window.api.getPackages(activeDevice, 'all')
      setPackages(pkgs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Đếm số lượng cho các tab
  const systemCount = packages.filter(p => p.type === 'system').length
  const userCount = packages.filter(p => p.type === 'user').length
  const disabledCount = packages.filter(p => p.status === 'disabled').length

  const filteredPackages = useMemo(() => {
    let list = packages

    // 1. Lọc theo tab
    if (filter === 'system') list = list.filter(app => app.type === 'system')
    if (filter === 'user') list = list.filter(app => app.type === 'user')
    if (filter === 'disabled') list = list.filter(app => app.status === 'disabled')

    // 2. Lọc theo preset rác
    if (presetFilter !== 'none') {
      // @ts-ignore
      const presetList = BLOATWARE_PRESETS[presetFilter] || []
      list = list.filter(app => presetList.includes(app.pkg))
    }

    // 3. Lọc theo tìm kiếm text
    if (!debouncedSearch) return list
    const q = debouncedSearch.toLowerCase()
    return list.filter(app => {
      const friendlyName = FRIENDLY_NAMES[app.pkg] || ''
      return app.pkg.toLowerCase().includes(q) || friendlyName.toLowerCase().includes(q)
    })
  }, [packages, debouncedSearch, presetFilter, filter])

  // --- SELECTION LOGIC ---
  const toggleSelect = (pkg: string) => {
    if (BLACKLIST.includes(pkg)) return 
    const newSet = new Set(selectedApps)
    if (newSet.has(pkg)) newSet.delete(pkg)
    else newSet.add(pkg)
    setSelectedApps(newSet)
  }

  const selectAll = () => {
    const selectable = filteredPackages.filter(app => !BLACKLIST.includes(app.pkg))
    if (selectedApps.size === selectable.length && selectable.length > 0) {
      setSelectedApps(new Set())
    } else {
      setSelectedApps(new Set(selectable.map(a => a.pkg)))
    }
  }

  const applyPreset = (presetKey: string) => {
    setPresetFilter(presetKey)
    setSelectedApps(new Set()) // Reset selection first
    
    if (presetKey !== 'none') {
      // @ts-ignore
      const presetList = BLOATWARE_PRESETS[presetKey] || []
      const toSelect = packages.filter(app => presetList.includes(app.pkg))
      setSelectedApps(new Set(toSelect.map(app => app.pkg)))
      
      // Tự động chuyển sang tab "Tất cả" để người dùng thấy hết các app được chọn
      setFilter('all')
    }
  }

  // --- ACTION LOGIC ---
  const executeAction = async (pkg: string, action: 'uninstall' | 'disable' | 'enable' | 'clear' | 'stop' | 'restore') => {
    try {
      // @ts-ignore
      return await window.api.manageApp(activeDevice, pkg, action)
    } catch (err: any) {
      return { success: false, output: err.message }
    }
  }

  const handleSingleAction = async (app: AppInfo, action: 'uninstall' | 'disable' | 'enable' | 'clear' | 'stop' | 'restore') => {
    const pkg = app.pkg

    if (action === 'disable' && app.type === 'system') {
      if (!window.confirm(`Bạn có chắc chắn muốn vô hiệu hóa ứng dụng hệ thống (${pkg})?`)) return
    }
    if (action === 'uninstall' && app.type === 'system') {
      if (!window.confirm(`Gỡ cài đặt ứng dụng hệ thống (${pkg}) có thể gây lỗi nếu đây là app quan trọng. Bạn vẫn muốn tiếp tục?`)) return
    }

    setActionLoading(`${action}-${pkg}`)
    const res = await executeAction(pkg, action)
    
    if (res.success && (action === 'uninstall' || action === 'disable' || action === 'enable' || action === 'restore')) {
      if (action === 'uninstall') {
        setPackages(prev => prev.filter(p => p.pkg !== pkg))
      } else if (action === 'disable') {
        setPackages(prev => prev.map(p => p.pkg === pkg ? { ...p, status: 'disabled' } : p))
      } else if (action === 'enable' || action === 'restore') {
        setPackages(prev => prev.map(p => p.pkg === pkg ? { ...p, status: 'enabled' } : p))
      }
      alert(`Thao tác thành công trên ${pkg}`)
    } else if (!res.success) {
      alert(`Lỗi: ${res.output}`)
    }
    setActionLoading(null)
  }

  const handleExtract = async (pkg: string) => {
    setActionLoading(`extract-${pkg}`)
    try {
      const fileName = `${pkg}.apk`
      // @ts-ignore
      const success = await window.api.extractApp(activeDevice, pkg, `D:\\Downloads\\${fileName}`)
      if (success) {
        alert(`Đã trích xuất thành công file: D:\\Downloads\\${fileName}`)
      } else {
        alert('Trích xuất thất bại!')
      }
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleInstallApk = async () => {
    if (!activeDevice) return
    try {
      // @ts-ignore
      const apkPath = await window.api.openApkDialog()
      if (!apkPath) return

      setActionLoading('installing-apk')
      // @ts-ignore
      const success = await window.api.installApk(activeDevice, apkPath)
      if (success) {
        alert('Cài đặt ứng dụng thành công!')
        // Đợi 2s để Android cập nhật database app
        setTimeout(() => loadPackages(), 2000)
      } else {
        alert('Cài đặt thất bại! Kiểm tra lại file APK.')
      }
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleBatchAction = async (action: 'uninstall' | 'disable' | 'enable' | 'clear' | 'stop' | 'restore') => {
    if (selectedApps.size === 0) return
    
    const appsToProcessObj = packages.filter(p => selectedApps.has(p.pkg))
    
    if (action === 'uninstall' || action === 'disable') {
      const hasSystem = appsToProcessObj.some(a => a.type === 'system')
      if (hasSystem) {
        if (!window.confirm(`CẢNH BÁO NGUY HIỂM: Bạn đang chuẩn bị thao tác trên ứng dụng hệ thống! Việc này CÓ THỂ GÂY TREO MÁY nếu tắt nhầm file lõi. Bạn có CHẮC CHẮN không?`)) return
      } else {
        if (!window.confirm(`Thực hiện hành động này trên ${selectedApps.size} ứng dụng đã chọn?`)) return
      }
    }

    const appsToProcess = Array.from(selectedApps)
    setBatchProgress({ current: 0, total: appsToProcess.length, action })
    
    let successCount = 0
    let failCount = 0
    let skippedCount = 0
    let lastError = ''
    let removedPkgs: string[] = []
    let modifiedPkgs: {pkg: string, status: 'enabled'|'disabled'}[] = []

    for (let i = 0; i < appsToProcess.length; i++) {
      const pkg = appsToProcess[i]
      const appObj = appsToProcessObj.find(a => a.pkg === pkg)
      
      // Không skip system apps nữa, vì mục đích là debloat app hệ thống (trừ core blacklist đã cấm từ đầu)
      setBatchProgress({ current: i + 1, total: appsToProcess.length, action })
      const res = await executeAction(pkg, action)
      if (res.success) {
        successCount++
        if (action === 'uninstall') removedPkgs.push(pkg)
        if (action === 'disable') modifiedPkgs.push({pkg, status: 'disabled'})
        if (action === 'enable' || action === 'restore') modifiedPkgs.push({pkg, status: 'enabled'})
      } else {
        failCount++
        lastError = res.output
      }
    }

    setPackages(prev => {
      let next = prev
      if (removedPkgs.length > 0) {
        next = next.filter(p => !removedPkgs.includes(p.pkg))
      }
      if (modifiedPkgs.length > 0) {
        next = next.map(p => {
          const mod = modifiedPkgs.find(m => m.pkg === p.pkg)
          return mod ? { ...p, status: mod.status } : p
        })
      }
      return next
    })

    setBatchProgress(null)
    setSelectedApps(new Set())
    
    setBatchResult({
      success: successCount,
      fail: failCount,
      skipped: skippedCount,
      lastError,
      action
    })
  }

  // --- RENDERING ---
  if (!activeDevice) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-3xl m-8">
        <Package className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-700">Chưa có thiết bị</h3>
        <p className="text-slate-500 mt-2 text-center max-w-sm">Vui lòng kết nối thiết bị Android để quản lý ứng dụng.</p>
      </div>
    )
  }

  const selectableCount = filteredPackages.filter(app => !BLACKLIST.includes(app.pkg)).length
  const allSelected = selectedApps.size === selectableCount && selectableCount > 0

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-2rem)] animate-in fade-in zoom-in-95 duration-500 relative">
      
      {/* Header & Controls */}
      <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 border border-white/50 shadow-xl shadow-blue-900/5 mb-6 shrink-0 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs Navigation */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl shrink-0">
            <FilterBtn 
              active={filter === 'all'} 
              onClick={() => setFilter('all')} 
              label={`Tất cả (${loading ? '...' : packages.length})`} 
              icon={<Package className="w-3.5 h-3.5" />}
            />
            <FilterBtn 
              active={filter === 'user'} 
              onClick={() => setFilter('user')} 
              label={`Người dùng (${loading ? '...' : userCount})`} 
              icon={<User className="w-3.5 h-3.5" />}
            />
            <FilterBtn 
              active={filter === 'system'} 
              onClick={() => setFilter('system')} 
              label={`Hệ thống (${loading ? '...' : systemCount})`} 
              icon={<Settings className="w-3.5 h-3.5" />}
              isWarning 
            />
            <FilterBtn 
              active={filter === 'disabled'} 
              onClick={() => setFilter('disabled')} 
              label={`Đã tắt (${loading ? '...' : disabledCount})`} 
              icon={<Ban className="w-3.5 h-3.5" />}
            />
          </div>
        </div>

        {/* Stats Mini Dashboard */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Tổng ứng dụng" value={packages.length} icon={<Package className="text-blue-600" />} color="bg-blue-50/50" />
          <StatCard label="Bản vá rác" value={BLOATWARE_PRESETS.xiaomi.length + BLOATWARE_PRESETS.samsung.length + BLOATWARE_PRESETS.google.length} icon={<Sparkles className="text-amber-500" />} color="bg-amber-50/50" />
          <StatCard label="Ứng dụng gốc" value={systemCount} icon={<Settings className="text-red-500" />} color="bg-red-50/50" />
          <StatCard label="Ứng dụng cài" value={userCount} icon={<User className="text-emerald-500" />} color="bg-emerald-50/50" />
        </div>

        <div className="mt-6 flex flex-col md:flex-row items-center gap-4">
          <div className="relative shrink-0 w-full md:w-56">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <ListFilter className="w-4 h-4 text-slate-400" />
            </div>
            <select
              value={presetFilter}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full pl-10 pr-8 py-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-sm font-semibold text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="none">Lọc Rác (Mặc định)</option>
              <option value="xiaomi">🛡️ Xiaomi Bloatware</option>
              <option value="samsung">🛡️ Samsung Bloatware</option>
              <option value="google">🛡️ Google Apps</option>
            </select>
          </div>

          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên package hoặc tên ứng dụng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleInstallApk}
              disabled={loading || !!actionLoading}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 h-12"
            >
              {actionLoading === 'installing-apk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>Cài đặt APK</span>
            </button>
            <button 
              onClick={loadPackages} 
              disabled={loading}
              className="w-12 h-12 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-2xl flex items-center justify-center transition-all shadow-sm shrink-0"
              title="Làm mới"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white/60 backdrop-blur-3xl rounded-3xl border border-white/50 shadow-xl shadow-blue-900/5 flex flex-col relative z-0 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0 items-center">
          <div className="col-span-6 flex items-center gap-3">
            <button 
              onClick={selectAll}
              className={`p-1 -ml-1 rounded-md transition-colors ${allSelected ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'}`}
              title="Chọn tất cả"
            >
              {allSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tên Package</span>
          </div>
          <div className="col-span-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Phân loại / Trạng thái</div>
          <div className="col-span-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-16 bg-slate-100/50 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Package className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Không tìm thấy ứng dụng nào</p>
            </div>
          ) : (
            <div className="space-y-1 pb-24">
              <AnimatePresence mode="popLayout">
                {filteredPackages.map((app, index) => {
                  const pkg = app.pkg
                  const isBlacklisted = BLACKLIST.includes(pkg)
                  const isSelected = selectedApps.has(pkg)
                  const isSystem = app.type === 'system'
                  const isDisabled = app.status === 'disabled'
                  
                  return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.5) }}
                    key={pkg} 
                    className={`group flex items-center justify-between p-3 rounded-2xl transition-all ${isSelected ? 'bg-blue-50/80 border border-blue-200/50' : 'hover:bg-slate-50/80 border border-transparent'}`}
                  >
                  <div className="flex items-center gap-3 truncate w-1/2">
                    <button
                      onClick={() => toggleSelect(pkg)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-transparent hover:border-blue-400'}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="truncate">
                      {FRIENDLY_NAMES[pkg] && (
                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-tight mb-0.5">{FRIENDLY_NAMES[pkg]}</div>
                      )}
                      <div className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : isDisabled ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{pkg}</div>
                    </div>
                  </div>

                  <div className="w-1/4 flex items-center justify-center gap-2">
                    {isSystem ? (
                      <span className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100">Hệ thống</span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">Người dùng</span>
                    )}
                    
                    {isDisabled ? (
                      <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold border border-slate-200">Đã tắt</span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">Đang chạy</span>
                    )}
                  </div>

                  <div className={`w-1/4 flex items-center justify-end gap-1.5 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <ActionBtn 
                      icon={<Play />} tooltip="Force Stop" 
                      onClick={() => handleSingleAction(app, 'stop')} 
                      loading={actionLoading === `stop-${pkg}`}
                      color="hover:bg-amber-100 hover:text-amber-600 text-slate-400"
                    />
                    <ActionBtn 
                      icon={<RefreshCcw />} tooltip="Clear Data" 
                      onClick={() => handleSingleAction(app, 'clear')} 
                      loading={actionLoading === `clear-${pkg}`}
                      color="hover:bg-blue-100 hover:text-blue-600 text-slate-400"
                    />
                    <ActionBtn 
                      icon={<Download />} tooltip="Trích xuất APK (Backup)" 
                      onClick={() => handleExtract(pkg)} 
                      loading={actionLoading === `extract-${pkg}`}
                      color="hover:bg-emerald-100 hover:text-emerald-600 text-slate-400"
                    />
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>

                    {isDisabled ? (
                      <>
                        <ActionBtn 
                          icon={<Undo2 />} tooltip="Khôi phục" 
                          onClick={() => handleSingleAction(app, 'restore')} 
                          loading={actionLoading === `restore-${pkg}`}
                          color="hover:bg-emerald-100 hover:text-emerald-600 text-slate-400"
                        />
                        <ActionBtn 
                          icon={<CheckCircle2 />} tooltip="Bật" 
                          onClick={() => handleSingleAction(app, 'enable')} 
                          loading={actionLoading === `enable-${pkg}`}
                          color="hover:bg-indigo-100 hover:text-indigo-600 text-slate-400"
                        />
                      </>
                    ) : (
                      <>
                        <ActionBtn 
                          icon={<PowerOff />} tooltip={isBlacklisted ? "Không thể tắt app Core" : "Tắt (Disable)"} 
                          onClick={() => handleSingleAction(app, 'disable')} 
                          loading={actionLoading === `disable-${pkg}`} disabled={isBlacklisted}
                          color="hover:bg-orange-100 hover:text-orange-600 text-slate-400"
                        />
                        <ActionBtn 
                          icon={<Trash2 />} tooltip={isBlacklisted ? "Không xóa app Core" : "Gỡ (Uninstall)"} 
                          onClick={() => handleSingleAction(app, 'uninstall')} 
                          loading={actionLoading === `uninstall-${pkg}`} disabled={isBlacklisted}
                          color="hover:bg-red-100 hover:text-red-600 text-slate-400"
                        />
                      </>
                    )}
                  </div>
                </motion.div>
              )})}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {(selectedApps.size > 0 || batchProgress) && (
        <motion.div 
          initial={{ y: 100, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: 100, opacity: 0, x: '-50%' }}
          className="fixed bottom-10 left-1/2 bg-slate-900/95 backdrop-blur-xl text-white px-8 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex items-center gap-8 z-50 border border-white/10 ring-1 ring-black/20 min-w-[600px] justify-between"
        >
          <div className="flex items-center gap-4 pr-8 border-r border-white/10 shrink-0">
            <div className="relative w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-xs font-black shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              {selectedApps.size}
            </div>
            <span className="text-sm font-bold tracking-tight whitespace-nowrap">Đã chọn</span>
          </div>
          
          {batchProgress ? (
            <div className="flex items-center gap-4 px-4">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <Loader2 className="w-full h-full animate-spin text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">Đang xử lý {batchProgress.current}/{batchProgress.total}</span>
                <div className="w-32 h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <BatchBtn icon={<Trash2 className="w-4 h-4" />} label="Gỡ bỏ" onClick={() => handleBatchAction('uninstall')} color="hover:bg-red-500/10 hover:text-red-400 text-slate-300" />
              <BatchBtn icon={<PowerOff className="w-4 h-4" />} label="Vô hiệu" onClick={() => handleBatchAction('disable')} color="hover:bg-orange-500/10 hover:text-orange-400 text-slate-300" />
              <div className="w-px h-8 bg-white/10 mx-2"></div>
              <BatchBtn icon={<CheckCircle2 className="w-4 h-4" />} label="Bật lại" onClick={() => handleBatchAction('enable')} color="hover:bg-indigo-500/10 hover:text-indigo-400 text-slate-300" />
              <BatchBtn icon={<Undo2 className="w-4 h-4" />} label="Khôi phục" onClick={() => handleBatchAction('restore')} color="hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-300" />
            </div>
          )}
          
          {!batchProgress && (
            <button 
              onClick={() => setSelectedApps(new Set())}
              className="ml-2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-xl group"
              title="Hủy chọn"
            >
              <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          )}
        </motion.div>
      )}

      {/* Batch Result Modal */}
      <BatchResultModal 
        result={batchResult} 
        onClose={() => setBatchResult(null)} 
      />
    </div>
  )
}

function FilterBtn({ active, onClick, label, icon, isWarning }: { active: boolean, onClick: () => void, label: string, icon?: React.ReactNode, isWarning?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${
        active 
          ? isWarning 
            ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' 
            : 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border border-transparent'
      }`}
    >
      {icon}
      {isWarning && active && <ShieldAlert className="w-3.5 h-3.5 -mt-0.5" />}
      {label}
    </button>
  )
}

function StatCard({ label, value, icon, color }: { label: string, value: number | string, icon: React.ReactNode, color: string }) {
  return (
    <div className={`${color} p-4 rounded-2xl border border-white/50 flex items-center gap-4`}>
      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-lg font-black text-slate-800 leading-none mb-1">{value}</div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
      </div>
    </div>
  )
}

function ActionBtn({ icon, tooltip, onClick, loading, disabled, color }: { icon: React.ReactElement, tooltip: string, onClick: () => void, loading: boolean, disabled?: boolean, color: string }) {
  return (
    <button
      title={tooltip}
      onClick={onClick}
      disabled={loading || disabled}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${disabled ? 'opacity-30 cursor-not-allowed text-slate-300' : color} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : React.cloneElement(icon, { className: 'w-4 h-4' })}
    </button>
  )
}

function BatchBtn({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-2xl transition-all flex items-center gap-3 text-[11px] font-black tracking-widest uppercase group whitespace-nowrap ${color}`}
    >
      <div className="p-1 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors shrink-0">
        {icon}
      </div>
      <span>{label}</span>
    </button>
  )
}
