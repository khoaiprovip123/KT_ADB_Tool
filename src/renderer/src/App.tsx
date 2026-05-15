import React, { useState, useEffect } from 'react'
import { Monitor, Cpu, Settings as SettingsIcon, Smartphone, LayoutGrid, Terminal, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDeviceStore } from './store/deviceStore'
import { LogTerminal } from './components/layout/LogTerminal'
import { FloatingQuickBoot } from './components/layout/FloatingQuickBoot'
import { Dashboard } from './components/features/Dashboard'
import { AppManager } from './components/features/AppManager'
import Settings from './features/settings/Settings'
import { ControlCenterModal } from './components/layout/ControlCenterModal'
import { ConnectionManagerModal } from './components/layout/ConnectionManagerModal'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [isCcOpen, setIsCcOpen] = useState(false)
  const [isConnManagerOpen, setIsConnManagerOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const { devices, activeDevice, setDevices, addLog } = useDeviceStore()

  useEffect(() => {
    // Khởi tạo ADB và tải Platform-tools tự động
    // @ts-ignore
    window.api.initAdb().then(() => {
      // @ts-ignore
      window.api.getDevices().then(setDevices)
    })

    // Lắng nghe thiết bị cắm/rút
    // @ts-ignore
    window.api.onDeviceUpdate((updatedDevices) => {
      setDevices(updatedDevices)
    })

    // Lắng nghe stream Log từ lệnh ADB
    // @ts-ignore
    window.api.onLogStream((log) => {
      addLog(log)
    })
  }, [setDevices, addLog])

  return (
    <div className="flex h-screen w-full bg-[#f4f7fb] text-slate-800 overflow-hidden font-sans">
      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out flex flex-col justify-between bg-white/80 backdrop-blur-xl border-r border-glass-border shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-9 bg-white border border-slate-200 shadow-sm rounded-full p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors z-20"
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className={`p-6 ${!isSidebarOpen ? 'px-4' : ''}`}>
          <div className={`flex items-center ${isSidebarOpen ? 'gap-3' : 'justify-center'} mb-10 overflow-hidden`}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <Smartphone className="text-white w-6 h-6" />
            </div>
            {isSidebarOpen && (
              <div className="whitespace-nowrap transition-opacity duration-300">
                <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">KT ADB Tool</h1>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Enterprise Edition</p>
              </div>
            )}
          </div>

          <nav className="space-y-2">
            <NavItem icon={<LayoutGrid />} label="Tổng quan" active={activeTab === 'dashboard'} isExpanded={isSidebarOpen} onClick={() => setActiveTab('dashboard')} />
            <NavItem icon={<Cpu />} label="Quản lý ứng dụng" active={activeTab === 'system'} isExpanded={isSidebarOpen} onClick={() => setActiveTab('system')} />
            <NavItem icon={<Monitor />} label="Phản chiếu màn hình" active={activeTab === 'mirror'} isExpanded={isSidebarOpen} onClick={() => setActiveTab('mirror')} />
          </nav>
        </div>

        <div className={`p-6 ${!isSidebarOpen ? 'px-4' : ''}`}>
          <NavItem icon={<SettingsIcon />} label="Cài đặt" active={activeTab === 'settings'} isExpanded={isSidebarOpen} onClick={() => setActiveTab('settings')} />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative z-0">
        <header className="h-20 bg-white/50 backdrop-blur-md border-b border-white/40 px-8 flex items-center justify-between sticky top-0 z-20">
          <h2 className="text-xl font-semibold capitalize text-slate-800">
            {activeTab === 'dashboard' ? 'Tổng quan' :
              activeTab === 'system' ? 'Quản lý ứng dụng' :
                activeTab === 'mirror' ? 'Phản chiếu màn hình' :
                  activeTab === 'settings' ? 'Cài đặt' : activeTab}
          </h2>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setIsCcOpen(!isCcOpen)}
                className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Điều khiển</span>
              </button>
              <ControlCenterModal isOpen={isCcOpen} onClose={() => setIsCcOpen(false)} />
            </div>

            <button
              onClick={() => setIsLogOpen(!isLogOpen)}
              className="px-4 py-2 bg-slate-800 text-white rounded-full text-sm font-medium hover:bg-slate-700 transition-colors shadow-lg flex items-center gap-2"
            >
              <Terminal className="w-4 h-4" />
              <span>Nhật ký</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setIsConnManagerOpen(true)}
                className="flex items-center gap-3 bg-white hover:bg-slate-50 px-4 py-2 rounded-full shadow-sm border border-slate-200 transition-colors"
              >
                {activeDevice ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-slate-700">
                      {devices.find(d => d.id === activeDevice)?.model || devices.find(d => d.id === activeDevice)?.id || 'Connected'}
                      <span className="text-slate-400 ml-1">({devices.length})</span>
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-slate-500">Chưa kết nối</span>
                  </>
                )}
              </button>
              <ConnectionManagerModal isOpen={isConnManagerOpen} onClose={() => setIsConnManagerOpen(false)} />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-8 relative">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'system' && <AppManager />}
          {activeTab === 'settings' && <Settings />}
          {activeTab !== 'dashboard' && activeTab !== 'system' && activeTab !== 'settings' && (
            <div className="flex items-center justify-center h-full text-slate-400">
              Tính năng đang được phát triển...
            </div>
          )}
        </div>

        <LogTerminal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />
        <FloatingQuickBoot />
      </main>
    </div>
  )
}

function NavItem({ icon, label, active, isExpanded, onClick }: { icon: React.ReactElement, label: string, active: boolean, isExpanded: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center ${isExpanded ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl transition-all duration-300 font-medium ${active
        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
        : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800'
        }`}
      title={!isExpanded ? label : undefined}
    >
      {React.cloneElement(icon, { className: 'w-5 h-5 shrink-0' })}
      {isExpanded && <span className="whitespace-nowrap overflow-hidden">{label}</span>}
    </button>
  )
}

export default App
