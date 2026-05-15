import React, { useState, useEffect, useMemo } from 'react'
import { Search, Trash2, PowerOff, RefreshCcw, ShieldAlert, Package, Loader2, Play, Undo2, CheckCircle2, ListFilter, CheckSquare, Square, Download, Sparkles, User, Settings, Ban, Upload, X, ChevronDown, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { FixedSizeList as List } from 'react-window'
import { AutoSizer } from 'react-virtualized-auto-sizer'
import { useDeviceStore } from '../../store/deviceStore'
import { BatchResultModal } from './BatchResultModal'

const CACHE_KEY_PREFIX = 'adb_pkg_cache_'

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
  const [filter, setFilter] = useState<'all' | 'system' | 'user' | 'disabled'>('all')
  
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
      loadPackages(false)
      setSelectedApps(new Set())
      setPresetFilter('none')
    }
  }, [activeDevice])

  const loadPackages = async (forceRefresh = false) => {
    if (!activeDevice) return
    const cacheKey = `${CACHE_KEY_PREFIX}${activeDevice}`
    
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          setPackages(JSON.parse(cached))
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }
    }

    if (forceRefresh || packages.length === 0) {
      setLoading(true)
    }

    try {
      // @ts-ignore
      const pkgs: AppInfo[] = await window.api.getPackages(activeDevice, 'all')
      setPackages(pkgs)
      localStorage.setItem(cacheKey, JSON.stringify(pkgs))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const systemCount = packages.filter(p => p.type?.toLowerCase() === 'system').length
  const userCount = packages.filter(p => p.type?.toLowerCase() === 'user').length
  const disabledCount = packages.filter(p => p.status?.toLowerCase() === 'disabled').length

  const filteredPackages = useMemo(() => {
    let list = packages
    if (filter === 'system') list = list.filter(app => app.type?.toLowerCase() === 'system')
    if (filter === 'user') list = list.filter(app => app.type?.toLowerCase() === 'user')
    if (filter === 'disabled') list = list.filter(app => app.status?.toLowerCase() === 'disabled')

    if (presetFilter !== 'none') {
      // @ts-ignore
      const presetList = BLOATWARE_PRESETS[presetFilter] || []
      list = list.filter(app => presetList.includes(app.pkg))
    }

    if (!debouncedSearch) return list
    const q = debouncedSearch.toLowerCase()
    return list.filter(app => {
      const friendlyName = FRIENDLY_NAMES[app.pkg] || ''
      return app.pkg.toLowerCase().includes(q) || friendlyName.toLowerCase().includes(q)
    })
  }, [packages, debouncedSearch, presetFilter, filter])

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
    setSelectedApps(new Set())
    if (presetKey !== 'none') {
      // @ts-ignore
      const presetList = BLOATWARE_PRESETS[presetKey] || []
      const toSelect = packages.filter(app => presetList.includes(app.pkg))
      setSelectedApps(new Set(toSelect.map(app => app.pkg)))
      setFilter('all')
    }
  }

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
      if (!window.confirm(`Vô hiệu hóa ứng dụng hệ thống (${pkg})?`)) return
    }
    if (action === 'uninstall' && app.type === 'system') {
      if (!window.confirm(`Gỡ cài đặt ứng dụng hệ thống (${pkg})?`)) return
    }

    setActionLoading(`${action}-${pkg}`)
    const res = await executeAction(pkg, action)
    if (res.success && (action === 'uninstall' || action === 'disable' || action === 'enable' || action === 'restore')) {
      if (action === 'uninstall') setPackages(prev => prev.filter(p => p.pkg !== pkg))
      else if (action === 'disable') setPackages(prev => prev.map(p => p.pkg === pkg ? { ...p, status: 'disabled' } : p))
      else if (action === 'enable' || action === 'restore') setPackages(prev => prev.map(p => p.pkg === pkg ? { ...p, status: 'enabled' } : p))
      alert(`Thành công: ${pkg}`)
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
      if (success) alert(`Đã trích xuất: D:\\Downloads\\${fileName}`)
      else alert('Trích xuất thất bại!')
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
        alert('Cài đặt thành công!')
        setTimeout(() => loadPackages(true), 2000)
      } else alert('Cài đặt thất bại!')
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
        if (!window.confirm(`CẢNH BÁO: Bạn đang thao tác trên app hệ thống. Tiếp tục?`)) return
      } else {
        if (!window.confirm(`Thực hiện trên ${selectedApps.size} ứng dụng?`)) return
      }
    }

    const appsToProcess = Array.from(selectedApps)
    setBatchProgress({ current: 0, total: appsToProcess.length, action })
    let successCount = 0, failCount = 0, lastError = ''
    let removedPkgs: string[] = [], modifiedPkgs: {pkg: string, status: 'enabled'|'disabled'}[] = []

    for (let i = 0; i < appsToProcess.length; i++) {
      const pkg = appsToProcess[i]
      setBatchProgress({ current: i + 1, total: appsToProcess.length, action })
      const res = await executeAction(pkg, action)
      if (res.success) {
        successCount++
        if (action === 'uninstall') removedPkgs.push(pkg)
        else if (action === 'disable') modifiedPkgs.push({pkg, status: 'disabled'})
        else if (action === 'enable' || action === 'restore') modifiedPkgs.push({pkg, status: 'enabled'})
      } else {
        failCount++, lastError = res.output
      }
    }

    setPackages(prev => {
      let next = prev
      if (removedPkgs.length > 0) next = next.filter(p => !removedPkgs.includes(p.pkg))
      if (modifiedPkgs.length > 0) {
        next = next.map(p => {
          const mod = modifiedPkgs.find(m => m.pkg === p.pkg)
          return mod ? { ...p, status: mod.status } : p
        })
      }
      return next
    })
    setBatchProgress(null); setSelectedApps(new Set())
    setBatchResult({ success: successCount, fail: failCount, skipped: 0, lastError, action })
  }

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
    <div className="flex-1 flex flex-col h-full animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
      <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 border border-white/50 shadow-xl shadow-blue-900/5 mb-6 shrink-0 relative z-10">
        <div className="flex flex-col gap-6">
          {/* Top Tabs */}
          <div className="flex justify-center">
            <div className="inline-flex bg-slate-200/30 p-1 rounded-[2rem] border border-slate-200/50 shadow-inner">
              <FilterBtn 
                active={filter === 'all'} 
                onClick={() => setFilter('all')} 
                label={`Tất cả (${loading ? '...' : packages.length})`} 
                icon={<Package size={14} />} 
              />
              <FilterBtn 
                active={filter === 'user'} 
                onClick={() => setFilter('user')} 
                label={`Người dùng (${loading ? '...' : userCount})`} 
                icon={<User size={14} />} 
              />
              <FilterBtn 
                active={filter === 'system'} 
                onClick={() => setFilter('system')} 
                label={`Hệ thống (${loading ? '...' : systemCount})`} 
                icon={<Settings size={14} />} 
                isWarning 
              />
              <FilterBtn 
                active={filter === 'disabled'} 
                onClick={() => setFilter('disabled')} 
                label={`Đã tắt (${loading ? '...' : disabledCount})`} 
                icon={<Ban size={14} />} 
              />
            </div>
          </div>

          {/* Stats Summary Area */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <StatCard label="Tổng ứng dụng" value={packages.length} icon={<Package size={14} className="text-blue-500" />} color="bg-blue-50/50" />
            <StatCard label="Bản vá rác" value={BLOATWARE_PRESETS.xiaomi.length + BLOATWARE_PRESETS.samsung.length + BLOATWARE_PRESETS.google.length} icon={<Sparkles size={14} className="text-amber-500" />} color="bg-amber-50/50" />
            <StatCard label="Ứng dụng gốc" value={systemCount} icon={<Settings size={14} className="text-red-500" />} color="bg-red-50/50" />
            <StatCard label="Ứng dụng cài" value={userCount} icon={<User size={14} className="text-emerald-500" />} color="bg-emerald-50/50" />
          </div>

          {/* Search & Actions Area */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative shrink-0">
              <select
                value={presetFilter}
                onChange={(e) => applyPreset(e.target.value)}
                className="pl-10 pr-10 py-3 bg-white/80 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none shadow-sm min-w-[200px] cursor-pointer"
              >
                <option value="none">Tất cả danh mục</option>
                <option value="xiaomi">Xiaomi Bloatware</option>
                <option value="samsung">Samsung Bloatware</option>
                <option value="google">Google Bloatware</option>
              </select>
              <ListFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="flex-1 relative group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên package hoặc ứng dụng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-inner"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={handleInstallApk}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
              >
                <Upload size={18} />
                Cài APK
              </button>
              <button
                onClick={() => loadPackages(true)}
                disabled={loading}
                className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm"
                title="Làm mới"
              >
                <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white/60 backdrop-blur-3xl rounded-3xl border border-white/50 shadow-xl shadow-blue-900/5 flex flex-col relative z-0 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0 items-center">
          <div className="col-span-6 flex items-center gap-3">
            <button onClick={selectAll} className={`p-1 -ml-1 rounded-md transition-colors ${allSelected ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'}`}>
              {allSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tên Package</span>
          </div>
          <div className="col-span-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Trạng thái</div>
          <div className="col-span-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 px-2 pb-2">
          {loading && packages.length === 0 ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-16 bg-slate-100/50 rounded-2xl animate-pulse"></div>)}
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Package className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Không tìm thấy ứng dụng</p>
            </div>
          ) : (
            <div className="flex-1 w-full overflow-y-auto custom-scrollbar">
              <div className="min-h-full pb-32">
                {filteredPackages.map((app, index) => {
                  const pkg = app.pkg, isBlacklisted = BLACKLIST.includes(pkg), isSelected = selectedApps.has(pkg), isSystem = app.type?.toLowerCase() === 'system', isDisabled = app.status?.toLowerCase() === 'disabled'
                  return (
                    <div key={pkg} className="px-2 py-1">
                      <div className={`flex items-center justify-between p-3 rounded-2xl transition-all h-[64px] ${isSelected ? 'bg-blue-50 border border-blue-200/50 shadow-sm' : 'hover:bg-slate-50 border border-transparent group'}`}>
                        <div className="flex items-center gap-3 truncate w-1/2">
                          <button onClick={() => toggleSelect(pkg)} className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-transparent hover:border-blue-400'}`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="truncate">
                            {FRIENDLY_NAMES[pkg] && <div className="text-[10px] font-black text-blue-600 uppercase tracking-tight mb-0.5">{FRIENDLY_NAMES[pkg]}</div>}
                            <div className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : isDisabled ? 'text-slate-400 line-through font-medium' : 'text-slate-700'}`}>{pkg}</div>
                          </div>
                        </div>
                        <div className="w-1/4 flex items-center justify-center gap-2">
                          {isSystem ? <span className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-tight border border-red-100/50">System</span> : <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-tight border border-blue-100/50">User</span>}
                          {isDisabled ? <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-tight border border-slate-200/50">Disabled</span> : <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-tight border border-emerald-100/50">Running</span>}
                        </div>
                        <div className="w-1/4 flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ActionBtn icon={<Play />} tooltip="Stop" onClick={() => handleSingleAction(app, 'stop')} loading={actionLoading === `stop-${pkg}`} color="hover:bg-amber-100 text-slate-400" />
                          <ActionBtn icon={<RefreshCcw />} tooltip="Clear" onClick={() => handleSingleAction(app, 'clear')} loading={actionLoading === `clear-${pkg}`} color="hover:bg-blue-100 text-slate-400" />
                          <ActionBtn icon={<Download />} tooltip="Backup" onClick={() => handleExtract(pkg)} loading={actionLoading === `extract-${pkg}`} color="hover:bg-emerald-100 text-slate-400" />
                          {isDisabled ? <ActionBtn icon={<Undo2 />} tooltip="Restore" onClick={() => handleSingleAction(app, 'restore')} loading={actionLoading === `restore-${pkg}`} color="hover:bg-emerald-100 text-slate-400" /> : <ActionBtn icon={<PowerOff />} tooltip="Disable" onClick={() => handleSingleAction(app, 'disable')} loading={actionLoading === `disable-${pkg}`} disabled={isBlacklisted} color="hover:bg-orange-100 text-slate-400" />}
                          {!isDisabled && <ActionBtn icon={<Trash2 />} tooltip="Uninstall" onClick={() => handleSingleAction(app, 'uninstall')} loading={actionLoading === `uninstall-${pkg}`} disabled={isBlacklisted} color="hover:bg-red-100 text-slate-400" />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {(selectedApps.size > 0 || batchProgress) && (
        <motion.div 
          initial={{ y: 100, opacity: 0, x: '-50%' }} 
          animate={{ y: 0, opacity: 1, x: '-50%' }} 
          exit={{ y: 100, opacity: 0, x: '-50%' }} 
          className="absolute bottom-10 left-1/2 bg-slate-900/90 backdrop-blur-2xl text-white px-2 py-2 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex items-center gap-2 z-50 border border-white/10 min-w-[500px]"
        >
          <div className="flex items-center gap-3 pl-6 pr-4 border-r border-white/10 shrink-0">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black">{selectedApps.size}</div>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Đã chọn</span>
          </div>

          <div className="flex-1 flex items-center justify-center px-4">
            {batchProgress ? (
              <div className="flex items-center gap-4">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Processing {batchProgress.current}/{batchProgress.total}</span>
                  <div className="w-32 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <BatchBtn icon={<Trash2 size={16} />} label="Gỡ bỏ" onClick={() => handleBatchAction('uninstall')} color="hover:bg-red-500 text-white" />
                <BatchBtn icon={<PowerOff size={16} />} label="Vô hiệu" onClick={() => handleBatchAction('disable')} color="hover:bg-orange-500 text-white" />
                <div className="w-px h-6 bg-white/10 mx-2" />
                <BatchBtn icon={<CheckCircle2 size={16} />} label="Bật lại" onClick={() => handleBatchAction('enable')} color="hover:bg-indigo-500 text-white" />
                <BatchBtn icon={<Undo2 size={16} />} label="Khôi phục" onClick={() => handleBatchAction('restore')} color="hover:bg-emerald-500 text-white" />
              </div>
            )}
          </div>

          {!batchProgress && (
            <button 
              onClick={() => setSelectedApps(new Set())} 
              className="mr-2 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <X size={18} />
            </button>
          )}
        </motion.div>
      )}
      <BatchResultModal result={batchResult} onClose={() => setBatchResult(null)} />
    </div>
  )
}

function FilterBtn({ active, onClick, label, icon, isWarning }: { active: boolean, onClick: () => void, label: string, icon?: React.ReactNode, isWarning?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-5 py-2 rounded-full transition-all duration-300 font-bold text-[12px] whitespace-nowrap ${
        active
          ? isWarning ? 'text-red-600' : 'text-blue-600'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {active && (
        <motion.div 
          layoutId="active-filter-bg"
          className={`absolute inset-0 rounded-full shadow-sm border ${isWarning ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200/50'}`}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  )
}

function StatCard({ label, value, icon, color }: { label: string, value: number | string, icon: React.ReactNode, color: string }) {
  return (
    <div className={`${color} px-3 py-1 rounded-full border border-white/50 flex items-center gap-2 transition-all hover:scale-105`}>
      <div className="shrink-0 opacity-80 scale-90">{icon}</div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-black text-slate-800 tracking-tight">{value}</span>
        <span className="text-[8px] font-black text-slate-500/80 uppercase tracking-tighter">{label}</span>
      </div>
    </div>
  )
}

function ActionBtn({ icon, tooltip, onClick, loading, disabled, color }: { icon: React.ReactElement, tooltip: string, onClick: () => void, loading: boolean, disabled?: boolean, color: string }) {
  return (
    <button title={tooltip} onClick={onClick} disabled={loading || disabled} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${disabled ? 'opacity-30 cursor-not-allowed text-slate-300' : color} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : React.cloneElement(icon, { className: 'w-4 h-4' })}
    </button>
  )
}

function BatchBtn({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color: string }) {
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
