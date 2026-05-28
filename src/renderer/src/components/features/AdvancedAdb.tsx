import React, { useEffect, useState, useRef } from 'react'
import {
  Sliders,
  Smartphone,
  Info,
  Terminal,
  History,
  Search,
  Play,
  RotateCcw,
  ShieldAlert,
  Download,
  SearchCode,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Bell,
  RefreshCw,
  Maximize2,
  Minimize2,
  Lock,
  Settings,
  Wifi,
  Zap,
  Cpu,
  Globe
} from 'lucide-react'
import { useDeviceStore } from '../../store/deviceStore'

interface AdvancedCommandDefinition {
  id: string
  title: string
  description: string
  category: 'diagnostics' | 'appops' | 'permissions' | 'settings' | 'components' | 'network'
  risk: 'SAFE' | 'MEDIUM' | 'RISKY' | 'DANGEROUS'
  mode: 'READ_ONLY' | 'WRITE_SETTING' | 'PACKAGE_OP' | 'FILE_OP' | 'REBOOT_OP' | 'RAW_SHELL'
  readTemplate?: string
  applyTemplate?: string
  rollbackTemplate?: string
  needsConfirmText?: string
}

interface CommandHistoryItem {
  timestamp: string
  command: string
  risk: string
  success: boolean
  output: string
}

interface ToastMessage {
  id: number
  msg: string
  type: 'success' | 'error' | 'info' | 'warning'
}

export function AdvancedAdb() {
  const { activeDevice, devices } = useDeviceStore()
  
  // Phát hiện trạng thái thiết bị thực tế
  const currentDevice = devices.find((d) => d.id === activeDevice)
  const isUnauthorized = currentDevice?.type === 'unauthorized'
  const isOffline = currentDevice?.type === 'offline'

  // Tab con hiện tại
  const [subTab, setSubTab] = useState<'profile' | 'catalog' | 'shell' | 'history'>('profile')
  
  // Trạng thái chung
  const [loading, setLoading] = useState(false)
  const [deviceProfile, setDeviceProfile] = useState<any>(null)
  
  // --- SUB-TAB: DEVICE PROFILE STATE ---
  const [activeProfileTab, setActiveProfileTab] = useState<'props' | 'settings_global' | 'settings_secure' | 'settings_system'>('props')
  const [profileSearch, setProfileSearch] = useState('')
  const [debouncedProfileSearch, setDebouncedProfileSearch] = useState('')
  const [propsList, setPropsList] = useState<Array<{ key: string; value: string }>>([])
  const [settingsList, setSettingsList] = useState<Array<{ key: string; value: string }>>([])
  
  // Debounce search profile
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProfileSearch(profileSearch)
    }, 250)
    return () => clearTimeout(timer)
  }, [profileSearch])
  
  // --- SUB-TAB: COMMAND CATALOG STATE ---
  const [commands, setCommands] = useState<AdvancedCommandDefinition[]>([])
  const [catalogSearch, setCatalogSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [commandParams, setCommandParams] = useState<Record<string, string>>({})
  const [catalogProcessingId, setCatalogProcessingId] = useState<string | null>(null)
  const [catalogOutput, setCatalogOutput] = useState<string>('')
  const [isCatalogTerminalMaximized, setIsCatalogTerminalMaximized] = useState(false)
  
  // --- SUB-TAB: RAW SHELL STATE ---
  const [shellInput, setShellInput] = useState('')
  const [shellLogs, setShellLogs] = useState<Array<{ type: 'input' | 'output' | 'error' | 'system'; text: string }>>([])
  const [rawShellUnlocked, setRawShellUnlocked] = useState(false)
  const [slideValue, setSlideValue] = useState(0)
  const [isShellTerminalMaximized, setIsShellTerminalMaximized] = useState(false)
  const [typedCommands, setTypedCommands] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // --- SUB-TAB: HISTORY STATE ---
  const [historyItems, setHistoryItems] = useState<CommandHistoryItem[]>([])

  // State Toast & Copy Info
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // State Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    risk: 'SAFE' | 'MEDIUM' | 'RISKY' | 'DANGEROUS'
    commandText: string
    onConfirm: () => void
  } | null>(null)

  // Giả lập dữ liệu chẩn đoán pin và mạng cho HUD
  const [hudBattery, setHudBattery] = useState({ level: 85, temp: 36.4, charging: true })
  const [hudNetwork, setHudNetwork] = useState({ ip: '192.168.1.15', signal: 'Tuyệt vời', type: 'WIFI' })

  // Toast trigger
  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, msg, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  // Copy to clipboard helper
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(text)
    showToast(`Đã sao chép: ${label}`, 'success')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Tải danh sách command registry động
  useEffect(() => {
    const commandList: AdvancedCommandDefinition[] = [
      {
        id: 'diag_battery',
        title: 'Thông tin pin chi tiết',
        description: 'Chẩn đoán sức khỏe pin, dung lượng hiện tại, nhiệt độ và dòng sạc qua dumpsys battery.',
        category: 'diagnostics',
        risk: 'SAFE',
        mode: 'READ_ONLY',
        readTemplate: 'dumpsys battery'
      },
      {
        id: 'diag_power',
        title: 'Thông tin nguồn & thời lượng pin',
        description: 'Xem trạng thái WakeLocks, độ sáng màn hình hiện tại và các yếu tố tiêu thụ điện năng.',
        category: 'diagnostics',
        risk: 'SAFE',
        mode: 'READ_ONLY',
        readTemplate: 'dumpsys power'
      },
      {
        id: 'diag_activity_top',
        title: 'Lấy hoạt cảnh hiển thị (Top Activity)',
        description: 'Xác định nhanh ứng dụng và activity đang chạy trên màn hình hiện tại.',
        category: 'diagnostics',
        risk: 'SAFE',
        mode: 'READ_ONLY',
        readTemplate: 'dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity"'
      },
      {
        id: 'perm_write_secure_settings',
        title: 'Cấp quyền WRITE_SECURE_SETTINGS',
        description: 'Cấp quyền can thiệp settings hệ thống bảo mật cao cho ứng dụng (thường dùng cho SetEdit, Tasker, v.v.).',
        category: 'permissions',
        risk: 'RISKY',
        mode: 'PACKAGE_OP',
        applyTemplate: 'pm grant {package} android.permission.WRITE_SECURE_SETTINGS',
        rollbackTemplate: 'pm revoke {package} android.permission.WRITE_SECURE_SETTINGS',
        needsConfirmText: 'Quyền WRITE_SECURE_SETTINGS cho phép ứng dụng can thiệp trực tiếp vào cài đặt hệ thống sâu và bảo mật. Chỉ cấp cho ứng dụng đáng tin cậy!'
      },
      {
        id: 'perm_grant_runtime',
        title: 'Cấp quyền Runtime nâng cao',
        description: 'Ép buộc cấp quyền chạy (như đọc ảnh, định vị, máy ảnh...) mà không cần hỏi trên màn hình.',
        category: 'permissions',
        risk: 'MEDIUM',
        mode: 'PACKAGE_OP',
        applyTemplate: 'pm grant {package} {permission}',
        rollbackTemplate: 'pm revoke {package} {permission}'
      },
      {
        id: 'net_fix_captive_portal',
        title: 'Sửa lỗi WiFi chấm than (Captive Portal)',
        description: 'Đổi máy chủ kiểm tra kết nối mạng sang Apple/Google để loại bỏ dấu chấm than hoặc thông báo "Không có Internet" phiền toái bên cạnh biểu tượng WiFi tại Việt Nam.',
        category: 'network',
        risk: 'SAFE',
        mode: 'WRITE_SETTING',
        readTemplate: 'settings get global captive_portal_http_url',
        applyTemplate: 'settings put global captive_portal_mode 1 && settings put global captive_portal_http_url http://captive.apple.com/hotspot-detect.html && settings put global captive_portal_https_url https://captive.apple.com/hotspot-detect.html',
        rollbackTemplate: 'settings put global captive_portal_mode 1 && settings put global captive_portal_http_url http://connectivitycheck.gstatic.com/generate_204 && settings put global captive_portal_https_url https://connectivitycheck.gstatic.com/generate_204'
      },
      {
        id: 'appops_run_background',
        title: 'Bật/Tắt chạy ngầm (RUN_IN_BACKGROUND)',
        description: 'Kiểm soát khả năng hoạt động ngầm của ứng dụng để tiết kiệm pin.',
        category: 'appops',
        risk: 'MEDIUM',
        mode: 'PACKAGE_OP',
        readTemplate: 'appops get {package} RUN_IN_BACKGROUND',
        applyTemplate: 'appops set {package} RUN_IN_BACKGROUND {value}',
        rollbackTemplate: 'appops set {package} RUN_IN_BACKGROUND allow',
        needsConfirmText: 'Thao tác chặn chạy ngầm có thể khiến ứng dụng không nhận được thông báo kịp thời.'
      },
      {
        id: 'appops_wake_lock',
        title: 'Chặn WakeLock (WAKE_LOCK)',
        description: 'Chặn ứng dụng tự động đánh thức màn hình hoặc giữ thiết bị hoạt động ở chế độ chờ.',
        category: 'appops',
        risk: 'RISKY',
        mode: 'PACKAGE_OP',
        readTemplate: 'appops get {package} WAKE_LOCK',
        applyTemplate: 'appops set {package} WAKE_LOCK {value}',
        rollbackTemplate: 'appops set {package} WAKE_LOCK allow',
        needsConfirmText: 'Chặn WakeLock có thể gây ngắt quãng hoặc lỗi chạy ngầm của các ứng dụng nghe nhạc/GPS.'
      },
      {
        id: 'appops_draw_overlay',
        title: 'Quyền hiển thị trên ứng dụng khác',
        description: 'Bật/Tắt trực tiếp quyền hiển thị cửa sổ nổi (SYSTEM_ALERT_WINDOW) của ứng dụng.',
        category: 'appops',
        risk: 'RISKY',
        mode: 'PACKAGE_OP',
        readTemplate: 'appops get {package} SYSTEM_ALERT_WINDOW',
        applyTemplate: 'appops set {package} SYSTEM_ALERT_WINDOW {value}',
        rollbackTemplate: 'appops set {package} SYSTEM_ALERT_WINDOW allow'
      },
      {
        id: 'setting_process_limit',
        title: 'Giới hạn tiến trình nền (Background Process Limit)',
        description: 'Cấu hình tối đa số lượng tiến trình được chạy ngầm trong RAM (mặc định: standard).',
        category: 'settings',
        risk: 'RISKY',
        mode: 'WRITE_SETTING',
        readTemplate: 'settings get global background_process_limit',
        applyTemplate: 'settings put global background_process_limit {value}',
        rollbackTemplate: 'settings put global background_process_limit 0',
        needsConfirmText: 'Giới hạn quá nghiêm ngặt có thể làm đóng ứng dụng chạy ngầm liên tục, tốn pin khi khởi động lại.'
      },
      {
        id: 'component_force_stop',
        title: 'Buộc dừng ứng dụng lập tức',
        description: 'Đóng băng và giải phóng toàn bộ RAM của ứng dụng được chọn (force-stop).',
        category: 'components',
        risk: 'MEDIUM',
        mode: 'PACKAGE_OP',
        applyTemplate: 'am force-stop {package}'
      },
      {
        id: 'component_clear_data',
        title: 'Xóa toàn bộ dữ liệu ứng dụng',
        description: 'Khôi phục ứng dụng về trạng thái mới cài đặt (Clear Data). Toàn bộ dữ liệu của ứng dụng sẽ bị xóa sạch.',
        category: 'components',
        risk: 'DANGEROUS',
        mode: 'PACKAGE_OP',
        applyTemplate: 'pm clear {package}',
        needsConfirmText: 'Hành động này sẽ XÓA SẠCH toàn bộ dữ liệu, tài khoản đăng nhập của ứng dụng này và không thể phục hồi!'
      },
      {
        id: 'net_ip_addr',
        title: 'Xem địa chỉ IP mạng',
        description: 'Hiển thị các giao diện mạng Wi-Fi/4G và địa chỉ IP cục bộ hiện tại.',
        category: 'network',
        risk: 'SAFE',
        mode: 'READ_ONLY',
        readTemplate: 'ip addr show'
      },
      {
        id: 'net_ss_connections',
        title: 'Liệt kê các kết nối mạng hoạt động',
        description: 'Liệt kê các socket mạng đang mở hoặc đang trao đổi dữ liệu ra internet.',
        category: 'network',
        risk: 'SAFE',
        mode: 'READ_ONLY',
        readTemplate: 'netstat -anp || ss -an'
      }
    ]
    setCommands(commandList)
  }, [])

  // Auto-scroll terminal
  useEffect(() => {
    if (subTab === 'shell' && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [shellLogs, subTab])

  // Tải profile thiết bị và thông tin getprop/settings
  const loadDeviceProfile = async () => {
    if (!activeDevice) return
    
    if (isUnauthorized || isOffline) {
      setDeviceProfile(null)
      return
    }

    setLoading(true)
    try {
      const profile = await window.api.getDeviceProfile(activeDevice)
      setDeviceProfile(profile)
      await loadProfileData()
      await loadHudInfo()
    } catch (error) {
      console.error('Lỗi khi tải thông tin nâng cao thiết bị:', error)
      showToast('Không thể kết nối nâng cao với thiết bị', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadHudInfo = async () => {
    if (!activeDevice) return
    try {
      // Đọc dumpsys battery để điền dữ liệu thực tế vào HUD
      const batteryRes = await window.api.executeRawShell(activeDevice, 'dumpsys battery')
      if (batteryRes.success && batteryRes.output) {
        const lines = batteryRes.output.split('\n')
        let level = 85
        let temp = 36.2
        let charging = false

        lines.forEach(line => {
          if (line.includes('level:')) {
            level = parseInt(line.split(':')[1].trim()) || 85
          }
          if (line.includes('temperature:')) {
            // dumpsys temp có đơn vị 0.1 độ C (ví dụ 364 là 36.4 độ C)
            temp = (parseInt(line.split(':')[1].trim()) || 360) / 10
          }
          if (line.includes('status:')) {
            const status = parseInt(line.split(':')[1].trim())
            charging = (status === 2 || status === 5)
          }
        })
        setHudBattery({ level, temp, charging })
      }

      // Đọc địa chỉ IP để điền mạng
      const ipRes = await window.api.executeRawShell(activeDevice, 'ip route get 1.1.1.1 || ip address show wlan0')
      if (ipRes.success && ipRes.output) {
        const ipMatch = ipRes.output.match(/src\s+([0-9.]+)/) || ipRes.output.match(/inet\s+([0-9.]+)/)
        if (ipMatch && ipMatch[1]) {
          setHudNetwork(prev => ({ ...prev, ip: ipMatch[1] }))
        }
      }
    } catch (e) {
      console.error('Lỗi load HUD:', e)
    }
  }

  const loadProfileData = async () => {
    if (!activeDevice || isUnauthorized || isOffline) return
    try {
      if (activeProfileTab === 'props') {
        const props = await window.api.getProps(activeDevice)
        if (Array.isArray(props)) {
          setPropsList(props)
        }
      } else {
        const namespace = activeProfileTab.replace('settings_', '') as 'global' | 'secure' | 'system'
        const settings = await window.api.getSettings(activeDevice, namespace)
        if (Array.isArray(settings)) {
          setSettingsList(settings)
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu profile:', err)
    }
  }

  useEffect(() => {
    loadDeviceProfile()
  }, [activeDevice, isUnauthorized, isOffline])

  useEffect(() => {
    loadProfileData()
  }, [activeProfileTab, activeDevice])

  const addHistory = (command: string, risk: string, success: boolean, output: string) => {
    const newItem: CommandHistoryItem = {
      timestamp: new Date().toLocaleTimeString(),
      command,
      risk,
      success,
      output
    }
    setHistoryItems((prev) => [newItem, ...prev])
  }

  // --- CATALOG ACTIONS ---
  const handleParamChange = (key: string, val: string) => {
    setCommandParams((prev) => ({ ...prev, [key]: val }))
  }

  const handleExecutePreset = async (cmdId: string, actionType: 'read' | 'apply' | 'rollback') => {
    if (!activeDevice) return
    const cmd = commands.find((c) => c.id === cmdId)
    if (!cmd) return

    let finalParams = { ...commandParams }
    
    if (cmdId.includes('background') && actionType === 'apply') {
      finalParams.value = finalParams.value || '4' 
    }
    if (cmdId.includes('background') && actionType === 'rollback') {
      finalParams.value = '0'
    }

    const template = actionType === 'apply' 
      ? (cmd.applyTemplate || cmd.readTemplate) 
      : actionType === 'rollback' 
        ? (cmd.rollbackTemplate || cmd.readTemplate) 
        : cmd.readTemplate
    
    let previewCommand = template || ''
    for (const [k, v] of Object.entries(finalParams)) {
      previewCommand = previewCommand.replace(`{${k}}`, v)
    }

    const executeAction = async () => {
      setCatalogProcessingId(cmdId)
      setCatalogOutput('')
      showToast(`Đang chạy: ${cmd.title}...`, 'info')

      try {
        const res = await window.api.executePreset(activeDevice, cmdId, finalParams)
        setCatalogOutput(res.output)
        if (res.success) {
          showToast(`Thực thi thành công: ${cmd.title}`, 'success')
          await loadHudInfo()
        } else {
          showToast(`Lỗi: ${cmd.title}`, 'error')
        }
        addHistory(previewCommand, cmd.risk, res.success, res.output)
      } catch (error: any) {
        setCatalogOutput(`Thất bại: ${error.message}`)
        showToast(`Thất bại: ${error.message}`, 'error')
        addHistory(previewCommand, cmd.risk, false, error.message)
      } finally {
        setCatalogProcessingId(null)
      }
    }

    if (actionType === 'apply' && cmd.risk !== 'SAFE') {
      const msg = cmd.needsConfirmText 
        ? cmd.needsConfirmText
        : `Lệnh này được đánh giá ở mức độ rủi ro ${cmd.risk}. Bạn có chắc chắn muốn áp dụng thay đổi này lên thiết bị?`
      
      setConfirmModal({
        isOpen: true,
        title: cmd.title,
        message: msg,
        risk: cmd.risk,
        commandText: `adb shell ${previewCommand}`,
        onConfirm: () => {
          setConfirmModal(null)
          executeAction()
        }
      })
    } else {
      executeAction()
    }
  }

  // --- RAW SHELL RUNNER ---
  const handleShellSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeDevice || !shellInput.trim()) return

    const cmd = shellInput.trim()
    setShellInput('')
    setTypedCommands((prev) => {
      if (prev[prev.length - 1] === cmd) return prev
      return [...prev, cmd]
    })
    setHistoryIndex(-1)
    
    setShellLogs((prev) => [...prev, { type: 'input', text: `$ adb shell ${cmd}` }])

    try {
      const res = await window.api.executeRawShell(activeDevice, cmd)
      
      if (res.success) {
        setShellLogs((prev) => [...prev, { type: 'output', text: res.output || '(Không có kết quả trả về)' }])
        showToast('Thực thi thành công', 'success')
        addHistory(cmd, 'RAW_SHELL', true, res.output)
        await loadHudInfo()
      } else {
        setShellLogs((prev) => [...prev, { type: 'error', text: res.output }])
        showToast('Lỗi hoặc lệnh bị từ chối', 'error')
        addHistory(cmd, 'RAW_SHELL', false, res.output)
      }
    } catch (error: any) {
      setShellLogs((prev) => [...prev, { type: 'error', text: error.message }])
      showToast(error.message, 'error')
      addHistory(cmd, 'RAW_SHELL', false, error.message)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typedCommands.length === 0) return

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const nextIndex = historyIndex === -1 ? typedCommands.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(nextIndex)
      setShellInput(typedCommands[nextIndex])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex === -1) return
      const nextIndex = historyIndex + 1
      if (nextIndex >= typedCommands.length) {
        setHistoryIndex(-1)
        setShellInput('')
      } else {
        setHistoryIndex(nextIndex)
        setShellInput(typedCommands[nextIndex])
      }
    }
  }

  // --- SLIDE TO UNLOCK LOGIC ---
  const handleSlideChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value)
    setSlideValue(val)
    if (val >= 100) {
      setRawShellUnlocked(true)
      showToast('Cảnh báo: Đã truy cập lõi Shell hệ thống!', 'warning')
    }
  }

  const handleSlideEnd = () => {
    if (slideValue < 100) {
      let current = slideValue
      const interval = setInterval(() => {
        current -= 8
        if (current <= 0) {
          current = 0
          clearInterval(interval)
        }
        setSlideValue(current)
      }, 15)
    }
  }

  const filteredProps = propsList.filter(
    (p) =>
      p.key.toLowerCase().includes(debouncedProfileSearch.toLowerCase()) ||
      p.value.toLowerCase().includes(debouncedProfileSearch.toLowerCase())
  )

  const filteredSettings = settingsList.filter(
    (s) =>
      s.key.toLowerCase().includes(debouncedProfileSearch.toLowerCase()) ||
      s.value.toLowerCase().includes(debouncedProfileSearch.toLowerCase())
  )

  const filteredCommands = commands.filter((cmd) => {
    const matchesSearch =
      cmd.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      cmd.description.toLowerCase().includes(catalogSearch.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || cmd.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getRiskBadgeStyles = (risk: string) => {
    switch (risk) {
      case 'SAFE':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'RISKY':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      case 'DANGEROUS':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20 font-black animate-pulse'
      default:
        return 'bg-slate-500/10 text-slate-650 border-slate-500/20'
    }
  }

  return (
    <div className="absolute inset-4 lg:inset-6 flex flex-col overflow-hidden bg-[#f8fafc]/90 backdrop-blur-3xl rounded-[32px] p-5 lg:p-6 border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)] text-slate-800">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes warning-red-glow {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.25; }
        }
        @keyframes core-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      ` }} />

      {!activeDevice ? (
        <div className="text-center p-12 bg-white/60 backdrop-blur-2xl rounded-[32px] border border-slate-200/60 shadow-md flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-28 h-28 bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/50 rounded-full mx-auto mb-6 flex items-center justify-center shadow-inner relative select-none">
            <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-xl animate-pulse"></div>
            <Smartphone className="text-slate-500 w-12 h-12 relative z-10 animate-bounce" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2 select-none">Chưa kết nối thiết bị</h3>
          <p className="text-slate-500 max-w-sm text-sm font-medium">Kết nối thiết bị Android bằng cáp hoặc Wi-Fi và cấp quyền Gỡ lỗi USB để kích hoạt bảng điều khiển nâng cao.</p>
        </div>
      ) : isUnauthorized || isOffline ? (
        <div className="text-center p-12 bg-white/60 backdrop-blur-3xl rounded-[32px] border border-slate-200/60 shadow-md flex-1 flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>
          
          <div className="w-24 h-24 bg-gradient-to-tr from-rose-500/10 to-amber-500/10 border border-rose-500/20 rounded-[28px] mx-auto mb-6 flex items-center justify-center shadow-md relative animate-pulse select-none">
            <ShieldAlert className="text-rose-550 w-11 h-11 relative z-10" />
          </div>
          
          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2 select-none">
            {isUnauthorized ? 'Thiết bị chưa được xác thực' : 'Thiết bị đang ngoại tuyến'}
          </h3>
          <p className="text-slate-500 max-w-md text-sm mb-8 leading-relaxed font-semibold">
            {isUnauthorized 
              ? 'Vui lòng kiểm tra màn hình điện thoại của bạn và xác nhận quyền gỡ lỗi USB để kích hoạt các tính năng ADB nâng cao.' 
              : 'Thiết bị đã ngắt kết nối hoặc phản hồi chậm. Vui lòng kiểm tra lại cáp USB hoặc trạng thái kết nối.'}
          </p>

          {isUnauthorized && (
            <div className="w-full max-w-md bg-slate-55 border border-slate-200/60 rounded-2xl p-5 mb-8 text-left space-y-3.5 shadow-sm">
              <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-widest block mb-1">HƯỚNG DẪN XỬ LÝ NHANH</span>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">Mở khóa màn hình điện thoại Android của bạn.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  Một hộp thoại yêu cầu cấp quyền <strong className="text-slate-800">"Cho phép gỡ lỗi USB?"</strong> sẽ xuất hiện.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  Tích chọn <strong className="text-slate-800">"Luôn cho phép từ máy tính này"</strong> và nhấn <strong className="text-indigo-600">Cho phép (OK)</strong>.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={loadDeviceProfile}
            disabled={loading}
            className="px-6 py-3.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 active:scale-97 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-rose-500/15 flex items-center gap-2 border border-rose-500/10"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Tôi đã cấp quyền - Quét lại ngay</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-4">
          {/* ── TOP HEADER BAR: Horizontal Menu & Connected Device Info ── */}
          <div className="bg-white/80 border border-slate-200/80 p-4 rounded-[28px] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 select-none">
            <div className="flex items-center gap-4.5">
              {deviceProfile ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-2.5 shrink-0 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-indigo-650" />
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 shrink-0 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-slate-450" />
                </div>
              )}
              
              <div>
                <span className="text-[9px] font-black text-indigo-650 uppercase tracking-widest block">ADVANCED PANEL</span>
                <h2 className="text-base font-black text-slate-800 tracking-tight leading-tight">
                  {deviceProfile ? `${deviceProfile.manufacturer} ${deviceProfile.model}` : 'Đang nạp thiết bị...'}
                </h2>
                {deviceProfile && (
                  <p className="text-[10px] font-bold text-slate-450 mt-0.5">
                    Android {deviceProfile.release} • SDK {deviceProfile.sdk} • Serial: {activeDevice}
                  </p>
                )}
              </div>
            </div>

            {/* Horizontal Nav Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200/60 max-w-full overflow-x-auto custom-scrollbar">
              <button
                onClick={() => setSubTab('profile')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 ${
                  subTab === 'profile'
                    ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/30'
                    : 'text-slate-500 hover:text-slate-850 hover:bg-white/50'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Device Explorer</span>
              </button>

              <button
                onClick={() => setSubTab('catalog')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 ${
                  subTab === 'catalog'
                    ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/30'
                    : 'text-slate-500 hover:text-slate-850 hover:bg-white/50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Command Catalog</span>
              </button>

              <button
                onClick={() => setSubTab('shell')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 ${
                  subTab === 'shell'
                    ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/30'
                    : 'text-slate-500 hover:text-slate-850 hover:bg-white/50'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Raw Shell Runner</span>
              </button>

              <button
                onClick={() => setSubTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 ${
                  subTab === 'history'
                    ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/30'
                    : 'text-slate-500 hover:text-slate-850 hover:bg-white/50'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Lịch sử lệnh</span>
              </button>
            </div>
          </div>

          {/* ── SECOND HEADER BAR: Ultra-compact Horizontal HUD Status ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-white border border-slate-200/60 rounded-[22px] shadow-sm select-none shrink-0">
            <div className="flex items-center gap-6 flex-wrap">
              {/* Core status */}
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">LÕI ADB:</span>
                <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-550 animate-ping"></span>
                  Active
                </span>
              </div>

              {/* Battery */}
              <div className="flex items-center gap-2">
                <Zap className={`w-4 h-4 ${hudBattery.charging ? 'text-amber-500 animate-bounce' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">PIN:</span>
                <span className="text-[10px] font-mono font-extrabold text-slate-700">
                  {hudBattery.level}% <span className="text-[9px] text-slate-450 font-sans font-bold">({hudBattery.temp}°C)</span>
                </span>
              </div>

              {/* IP LAN */}
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-600" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">IP LAN:</span>
                <span className="text-[10px] font-mono font-extrabold text-slate-650 bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 rounded-lg">
                  {hudNetwork.ip}
                </span>
              </div>
            </div>

            <button
              onClick={loadDeviceProfile}
              disabled={loading}
              className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:scale-95 text-slate-600 hover:text-slate-800 disabled:opacity-50 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Quét lại toàn bộ</span>
            </button>
          </div>

          {/* ── BOTTOM DYNAMIC CONTENT PANEL ── */}
          <div className="flex-1 min-h-0 bg-white backdrop-blur-2xl rounded-[32px] border border-slate-200 p-5 lg:p-6 flex flex-col overflow-hidden shadow-sm relative">
            
            {/* 1. DEVICE EXPLORER (PROFILE) PANEL */}
            {subTab === 'profile' && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                  <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar select-none">
                    {['props', 'settings_global', 'settings_secure', 'settings_system'].map((pTab) => (
                      <button
                        key={pTab}
                        onClick={() => {
                          setActiveProfileTab(pTab as any)
                          setProfileSearch('')
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] lg:text-[11px] font-black transition-all whitespace-nowrap border ${
                          activeProfileTab === pTab
                            ? 'bg-indigo-600 border-indigo-600/10 text-white shadow-md shadow-indigo-500/20'
                            : 'bg-slate-50 border-slate-200/60 text-slate-650 hover:bg-slate-100 hover:text-slate-850'
                        }`}
                      >
                        {pTab === 'props' ? 'System Properties (getprop)' : pTab.replace('settings_', 'Settings ')}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm key hoặc value..."
                      value={profileSearch}
                      onChange={(e) => setProfileSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400 font-semibold shadow-inner"
                    />
                  </div>
                </div>

                {/* Flat Table List for Key-Values Explorer */}
                <div className="flex-1 overflow-y-auto mt-4 custom-scrollbar rounded-2xl border border-slate-200/60 bg-slate-50/20">
                  {loading ? (
                    <div className="py-24 text-center animate-pulse text-slate-550 font-extrabold text-sm flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                      <span>Đang trích xuất dữ liệu nâng cao...</span>
                    </div>
                  ) : activeProfileTab === 'props' ? (
                    filteredProps.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 font-bold select-none">Không tìm thấy bản ghi nào khớp.</div>
                    ) : (
                      <div className="divide-y divide-slate-200/60">
                        {filteredProps.map((p, idx) => (
                          <div 
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-indigo-50/20 transition-colors gap-3 group"
                          >
                            <div className="font-mono text-xs font-black text-indigo-650 break-all select-all flex-1 pr-4">
                              {p.key}
                            </div>
                            <div className="flex items-center gap-2 max-w-full sm:max-w-[65%] shrink-0">
                              <span className="font-mono text-[11px] text-slate-650 bg-white border border-slate-200 rounded-xl px-3 py-1.5 break-all select-all shadow-sm">
                                {p.value}
                              </span>
                              <button 
                                onClick={() => handleCopyToClipboard(p.value, p.key)}
                                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                                title="Copy giá trị"
                              >
                                {copiedKey === p.value ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    filteredSettings.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 font-bold select-none">Không tìm thấy bản ghi nào khớp.</div>
                    ) : (
                      <div className="divide-y divide-slate-200/60">
                        {filteredSettings.map((s, idx) => (
                          <div 
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-cyan-50/15 transition-colors gap-3 group"
                          >
                            <div className="font-mono text-xs font-black text-cyan-700 break-all select-all flex-1 pr-4">
                              {s.key}
                            </div>
                            <div className="flex items-center gap-2 max-w-full sm:max-w-[65%] shrink-0">
                              <span className="font-mono text-[11px] text-slate-650 bg-white border border-slate-200 rounded-xl px-3 py-1.5 break-all select-all shadow-sm">
                                {s.value}
                              </span>
                              <button 
                                onClick={() => handleCopyToClipboard(s.value, s.key)}
                                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-cyan-700 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                                title="Copy giá trị"
                              >
                                {copiedKey === s.value ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* 2. COMMAND CATALOG PANEL */}
            {subTab === 'catalog' && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* Category selectors */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                  <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar select-none">
                    {['all', 'diagnostics', 'appops', 'permissions', 'settings', 'components', 'network'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 border rounded-xl text-[10px] lg:text-[11px] font-black transition-all capitalize whitespace-nowrap ${
                          selectedCategory === cat
                            ? 'bg-indigo-600 border-indigo-650/10 text-white shadow-md shadow-indigo-500/10'
                            : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        {cat === 'all' ? 'Tất cả' : cat}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm preset..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400 font-semibold shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-5 overflow-hidden mt-4 relative">
                  {/* Left: Command Card List */}
                  <div className={`overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-4 transition-all duration-300 lg:col-span-3 ${isCatalogTerminalMaximized ? 'hidden lg:hidden' : ''}`}>
                    {filteredCommands.length === 0 ? (
                      <div className="text-center py-20 text-slate-500 font-bold select-none">Không tìm thấy câu lệnh phù hợp.</div>
                    ) : (
                      filteredCommands.map((cmd) => {
                        const hasPackageParam = (cmd.applyTemplate || cmd.readTemplate || '').includes('{package}')
                        const hasPermParam = (cmd.applyTemplate || cmd.readTemplate || '').includes('{permission}')
                        const hasValueParam = (cmd.applyTemplate || cmd.readTemplate || '').includes('{value}')
                        
                        return (
                          <div
                            key={cmd.id}
                            className={`rounded-2xl p-4.5 border transition-all duration-300 flex flex-col justify-between group shadow-sm ${
                              cmd.risk === 'DANGEROUS'
                                ? 'bg-gradient-to-br from-rose-500/[0.02] to-transparent border-rose-250 hover:border-rose-450'
                                : cmd.risk === 'RISKY'
                                ? 'bg-gradient-to-br from-amber-500/[0.02] to-transparent border-amber-250 hover:border-amber-450'
                                : 'bg-white hover:bg-slate-50 border-slate-200/60 hover:border-indigo-500/30'
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-center mb-3 select-none">
                                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450">
                                  {cmd.category}
                                </span>
                                <span
                                  className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border tracking-wider uppercase ${getRiskBadgeStyles(
                                    cmd.risk
                                  )}`}
                                >
                                  Risk: {cmd.risk}
                                </span>
                              </div>
                              <h4 className="font-extrabold text-[14px] leading-snug text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                                {cmd.id === 'net_fix_captive_portal' && <Wifi className="w-4 h-4 text-emerald-500" />}
                                {cmd.id === 'perm_write_secure_settings' && <Settings className="w-4 h-4 text-amber-500" />}
                                <span>{cmd.title}</span>
                              </h4>
                              <p className="text-[11px] text-slate-500 leading-relaxed mt-2">{cmd.description}</p>
                              
                              {/* Parameters inputs */}
                              {(hasPackageParam || hasPermParam || hasValueParam) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100">
                                  {hasPackageParam && (
                                    <div>
                                      <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">Package Name</label>
                                      <input
                                        type="text"
                                        placeholder="com.example.app"
                                        value={commandParams.package || ''}
                                        onChange={(e) => handleParamChange('package', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-mono focus:border-indigo-500 focus:bg-white text-slate-850 transition-all font-semibold shadow-inner"
                                      />
                                    </div>
                                  )}
                                  {hasPermParam && (
                                    <div>
                                      <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">Permission</label>
                                      <input
                                        type="text"
                                        placeholder="android.permission.CAMERA"
                                        value={commandParams.permission || ''}
                                        onChange={(e) => handleParamChange('permission', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-mono focus:border-indigo-500 focus:bg-white text-slate-850 transition-all font-semibold shadow-inner"
                                      />
                                    </div>
                                  )}
                                  {hasValueParam && (
                                    <div>
                                      <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">Value</label>
                                      <input
                                        type="text"
                                        placeholder="allow/ignore"
                                        value={commandParams.value || ''}
                                        onChange={(e) => handleParamChange('value', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-mono focus:border-indigo-500 focus:bg-white text-slate-850 transition-all font-semibold shadow-inner"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 justify-end border-t border-slate-100 pt-3 mt-4 shrink-0 select-none">
                              {cmd.readTemplate && (
                                <button
                                  onClick={() => handleExecutePreset(cmd.id, 'read')}
                                  disabled={catalogProcessingId === cmd.id}
                                  className="px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1"
                                >
                                  <SearchCode className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Đọc giá trị</span>
                                </button>
                              )}
                              
                              {cmd.applyTemplate && (
                                <button
                                  onClick={() => handleExecutePreset(cmd.id, 'apply')}
                                  disabled={catalogProcessingId === cmd.id}
                                  className="px-3.5 py-1.5 text-[11px] font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1 shadow-md shadow-indigo-500/10"
                                >
                                  <Play className="w-3.5 h-3.5 text-white" />
                                  <span>Áp dụng</span>
                                </button>
                              )}

                              {cmd.rollbackTemplate && (
                                <button
                                  onClick={() => handleExecutePreset(cmd.id, 'rollback')}
                                  disabled={catalogProcessingId === cmd.id}
                                  className="px-3 py-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100/50 border border-amber-200 rounded-xl flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Khôi phục</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Right: Console Output with Clean Light Border */}
                  <div className={`border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden bg-slate-950 relative shadow-inner transition-all duration-300 ${isCatalogTerminalMaximized ? 'col-span-5 h-full' : 'col-span-1 lg:col-span-2'}`}>
                    {/* Dynamic Simulated Scanline */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                      <div className="w-full h-0.5 bg-indigo-500/10 shadow-[0_0_8px_rgba(99,102,241,0.3)] animate-scanline"></div>
                    </div>
                    {/* Ambient Glow */}
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent pointer-events-none z-10"></div>
                    
                    <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 flex items-center justify-between shrink-0 border-b border-slate-950 z-20 select-none">
                      <div className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-black text-slate-300 font-mono tracking-widest">CONSOLE OUTPUT</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setCatalogOutput('')}
                          className="text-[9px] font-extrabold text-slate-500 hover:text-white font-mono tracking-wider transition-colors"
                        >
                          Clear
                        </button>
                        
                        <button
                          onClick={() => setIsCatalogTerminalMaximized(!isCatalogTerminalMaximized)}
                          className="p-1 text-slate-500 hover:text-white rounded transition-colors"
                          title={isCatalogTerminalMaximized ? "Thu nhỏ Console" : "Phóng to Console"}
                        >
                          {isCatalogTerminalMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 p-4 font-mono text-[11px] text-emerald-400 overflow-y-auto whitespace-pre-wrap select-text custom-scrollbar z-20 leading-relaxed font-semibold">
                      {catalogOutput || (
                        <span className="text-slate-500 italic select-none">
                          * Chưa có dữ liệu đầu ra.
                          <br />
                          * Chọn "Đọc giá trị" hoặc "Áp dụng" từ danh sách preset để chạy và hiển thị kết quả chẩn đoán tại đây.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. RAW SHELL RUNNER PANEL */}
            {subTab === 'shell' && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {!rawShellUnlocked ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto min-h-[350px]">
                    <div className="w-16 h-16 bg-rose-50/80 border border-rose-100 rounded-[22px] flex items-center justify-center mb-6 shadow-sm relative select-none animate-pulse">
                      <ShieldAlert className="w-8 h-8 text-rose-600" />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight select-none">Khu Vực Kiểm Thử Cấp Cao</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed font-semibold">
                      Sử dụng Raw ADB Shell cho phép bạn can thiệp trực tiếp vào phần cứng thiết bị. Các câu lệnh sai có thể gây lỗi hệ thống nghiêm trọng, Bootloop (treo logo), hoặc mất dữ liệu.
                    </p>
                    
                    {/* CUSTOM SLIDE TO UNLOCK WIDGET */}
                    <div className="w-full mt-6 select-none">
                      <div className="relative w-full h-12 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner">
                        {/* Gradient Track Background */}
                        <div 
                          className="absolute inset-0 bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-500 opacity-20 pointer-events-none transition-all duration-150"
                          style={{ clipPath: `inset(0 ${100 - slideValue}% 0 0)` }}
                        ></div>
                        {/* Shimmer text */}
                        <span className="absolute text-[9px] font-extrabold text-slate-500 tracking-widest animate-pulse z-0 select-none">
                          {slideValue > 5 ? '' : 'VUỐT ĐỂ MỞ KHÓA DANGER ZONE ➔'}
                        </span>
                        
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={slideValue}
                          onChange={handleSlideChange}
                          onMouseUp={handleSlideEnd}
                          onTouchEnd={handleSlideEnd}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-grab active:cursor-grabbing z-10"
                        />
                        
                        {/* Slider Handle */}
                        <div 
                          className={`absolute left-1 top-1 bottom-1 w-10 rounded-xl flex items-center justify-center shadow-lg pointer-events-none z-20 transition-all ease-out bg-gradient-to-br ${
                            slideValue < 40 
                              ? 'from-rose-600 to-rose-700 shadow-rose-500/30' 
                              : slideValue < 80 
                                ? 'from-amber-500 to-amber-600 shadow-amber-500/30' 
                                : 'from-emerald-500 to-emerald-600 shadow-emerald-500/30'
                          }`}
                          style={{ left: `calc(${slideValue}% - ${slideValue * 0.44}px)` }}
                        >
                          <Lock className="w-3.5 h-3.5 text-white animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 rounded-2xl border border-slate-900 shadow-2xl relative">
                    {/* Dynamic Simulated Scanline */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                      <div className="w-full h-0.5 bg-cyan-500/10 shadow-[0_0_8px_rgba(34,211,238,0.3)] animate-scanline"></div>
                    </div>
                    {/* Ambient Glow */}
                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none z-10"></div>

                    {/* Header bar */}
                    <div className="bg-slate-900/90 border-b border-slate-950 px-5 py-2.5 flex justify-between items-center shrink-0 z-20 select-none">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-[10px] font-extrabold font-mono text-slate-300 ml-2 tracking-wider">KT-ADB-SHELL:~#</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShellLogs([])}
                          className="text-[9px] font-extrabold text-slate-500 hover:text-white font-mono tracking-wide transition-colors"
                        >
                          Clear Terminal
                        </button>
                        
                        <button
                          onClick={() => setIsShellTerminalMaximized(!isShellTerminalMaximized)}
                          className="p-1 text-slate-500 hover:text-white rounded transition-colors"
                          title={isShellTerminalMaximized ? "Thu nhỏ Console" : "Phóng to Console"}
                        >
                          {isShellTerminalMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Logs screen */}
                    <div className="flex-1 p-5 font-mono text-xs overflow-y-auto custom-scrollbar select-text flex flex-col gap-2 z-20 leading-relaxed">
                      <div className="text-slate-500 mb-2 border-b border-white/5 pb-2 select-none text-[11px]">
                        * Gõ các câu lệnh adb shell trực tiếp bên dưới (ví dụ: pm list packages, dumpsys battery).
                        <br />
                        * Hệ thống tích hợp cơ chế bảo vệ nâng cao chống lại các câu lệnh phá hoại hệ thống.
                      </div>
                      
                      {shellLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`whitespace-pre-wrap font-semibold ${
                            log.type === 'input'
                              ? 'text-cyan-400'
                              : log.type === 'error'
                              ? 'text-rose-450'
                              : log.type === 'system'
                              ? 'text-purple-400 italic'
                              : 'text-emerald-400'
                          }`}
                        >
                          {log.text}
                        </div>
                      ))}
                      <div ref={terminalEndRef} />
                    </div>

                    {/* Footer input form */}
                    <form
                      onSubmit={handleShellSubmit}
                      className="bg-slate-900 border-t border-slate-950 p-3.5 flex gap-3 shrink-0 z-20"
                    >
                      <span className="font-mono text-cyan-400 self-center font-black select-none text-sm">$</span>
                      <input
                        type="text"
                        placeholder="Nhập lệnh adb shell tại đây... (Ví dụ: pm list packages -e)"
                        value={shellInput}
                        onChange={(e) => setShellInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent text-slate-100 font-mono text-xs outline-none border-none caret-cyan-400 font-semibold"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black transition-all active:scale-95 shadow-md shadow-indigo-500/10"
                      >
                        Thực thi
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* 4. HISTORY PANEL */}
            {subTab === 'history' && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0 select-none">
                  <div>
                    <h3 className="font-black text-slate-800 text-base tracking-tight flex items-center gap-1.5">
                      <History className="w-5 h-5 text-indigo-650" />
                      <span>Nhật Ký Phiên Bản</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">Theo dõi lịch sử câu lệnh ADB nâng cao đã được thực thi.</p>
                  </div>
                  {historyItems.length > 0 && (
                    <button
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(historyItems, null, 2)], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `adb_history_${Date.now()}.json`
                        a.click()
                        showToast('Đã xuất lịch sử lệnh thành công', 'success')
                      }}
                      className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Xuất Logs JSON</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto mt-4 custom-scrollbar pr-1">
                  {historyItems.length === 0 ? (
                    <div className="text-center py-24 text-slate-500">
                      <History className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-pulse" />
                      <p className="text-xs font-semibold">Chưa có lịch sử câu lệnh nào được ghi nhận trong phiên làm việc này.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {historyItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="border border-slate-200/60 rounded-2xl p-4 hover:shadow-md hover:bg-slate-50/50 transition-all duration-305 bg-white shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-3 select-none">
                            <span className="text-[10px] font-bold text-slate-500 font-mono">{item.timestamp}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border font-mono ${getRiskBadgeStyles(
                                item.risk
                              )}`}>
                                {item.risk}
                              </span>
                              {item.success ? (
                                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> HOÀN TẤT
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20">
                                  <XCircle className="w-3.5 h-3.5 text-rose-650" /> THẤT BẠI
                                </span>
                              )}
                            </div>
                          </div>
                          <div 
                            onClick={() => handleCopyToClipboard(item.command, 'câu lệnh')}
                            className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono text-[11px] text-indigo-750 select-all cursor-pointer hover:bg-slate-100 transition-colors flex justify-between items-center group"
                            title="Nhấp để copy lệnh"
                          >
                            <span className="break-all">{item.command}</span>
                            <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-slate-550 shrink-0 ml-3 transition-opacity" />
                          </div>
                          
                          {item.output && (
                            <details className="mt-3">
                              <summary className="text-[10px] font-black text-slate-450 cursor-pointer select-none hover:text-indigo-650 transition-colors uppercase tracking-wider">
                                Xem nhật ký trả về ({item.output.length} ký tự)
                              </summary>
                              <div className="bg-slate-950 text-slate-400 border border-slate-900 font-mono text-[10px] p-4 rounded-xl mt-2 whitespace-pre-wrap select-all max-h-48 overflow-y-auto custom-scrollbar leading-relaxed">
                                {item.output}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TOAST MESSAGES SYSTEM ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none select-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4.5 py-3 rounded-2xl border backdrop-blur-xl shadow-xl transition-all duration-300 pointer-events-auto flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-white/95 text-emerald-600 border-slate-200 shadow-emerald-500/5'
                : toast.type === 'error'
                ? 'bg-white/95 text-rose-600 border-slate-200 shadow-rose-500/5'
                : toast.type === 'warning'
                ? 'bg-white/95 text-amber-600 border-slate-200 shadow-amber-500/5'
                : 'bg-white/95 text-indigo-650 border-slate-200 shadow-indigo-500/5'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold text-slate-850 leading-tight">{toast.msg}</span>
          </div>
        ))}
      </div>

      {/* ── RISK CONFIRM DIALOG ── */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300 animate-fade-in">
          <div className="bg-white border border-slate-200/80 rounded-[32px] w-full max-w-lg p-6 shadow-2xl shadow-slate-900/25 transform scale-100 transition-all">
            {/* Top Risk Header Icon */}
            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-slate-100 select-none">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                confirmModal.risk === 'DANGEROUS'
                  ? 'bg-rose-500/10 text-rose-600'
                  : confirmModal.risk === 'RISKY'
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-indigo-500/10 text-indigo-600'
              }`}>
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border select-none tracking-widest ${
                  confirmModal.risk === 'DANGEROUS'
                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 font-black'
                    : confirmModal.risk === 'RISKY'
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    : 'bg-indigo-500/10 text-indigo-650 border-indigo-500/20'
                }`}>
                  {confirmModal.risk} RISK LEVEL
                </span>
                <h3 className="font-black text-slate-800 text-[17px] mt-1 tracking-tight">{confirmModal.title}</h3>
              </div>
            </div>

            {/* Warning Message */}
            <div className="mb-5">
              <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                {confirmModal.message}
              </p>
            </div>

            {/* Target Command Details */}
            <div className="mb-6 select-none">
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5">
                CÂU LỆNH ADB SẼ CHẠY
              </span>
              <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl font-mono text-[11px] text-cyan-400 select-all break-all shadow-inner leading-relaxed">
                {confirmModal.commandText}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end select-none">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 transition-all duration-200 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 active:scale-95"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-5 py-3 text-white text-xs font-extrabold rounded-2xl shadow-lg transition-all duration-200 active:scale-95 ${
                  confirmModal.risk === 'DANGEROUS'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                    : confirmModal.risk === 'RISKY'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                }`}
              >
                Tôi xác nhận và tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedAdb
