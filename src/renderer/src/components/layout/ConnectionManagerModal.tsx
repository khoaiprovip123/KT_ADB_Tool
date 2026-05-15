import React, { useState } from 'react'
import { X, Smartphone, Wifi, Loader2, Link2, KeyRound } from 'lucide-react'
import { useDeviceStore } from '../../store/deviceStore'

export function ConnectionManagerModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { devices, activeDevice, setActiveDevice } = useDeviceStore()
  const [activeTab, setActiveTab] = useState<'connect' | 'pair'>('connect')
  const [ipInput, setIpInput] = useState('')
  const [pairIpInput, setPairIpInput] = useState('')
  const [pairCode, setPairCode] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isPairing, setIsPairing] = useState(false)

  if (!isOpen) return null

  const handleConnect = async () => {
    if (!ipInput.trim()) return
    setIsConnecting(true)
    // @ts-ignore
    const success = await window.api.connectIp(ipInput.trim())
    // @ts-ignore
    await window.api.getDevices().then(devices => {
      useDeviceStore.getState().setDevices(devices)
    })
    setIsConnecting(false)
    
    if (success) {
      setIpInput('')
      onClose()
    } else {
      alert('Kết nối thất bại. Vui lòng xem Logs hoặc kiểm tra lại IP/Mạng.')
    }
  }

  const handlePair = async () => {
    if (!pairIpInput.trim() || !pairCode.trim()) return
    setIsPairing(true)
    // @ts-ignore
    const success = await window.api.pairDevice(pairIpInput.trim(), pairCode.trim())
    setIsPairing(false)
    if (success) {
      alert('Ghép nối thành công! Vui lòng xem Port kết nối trên điện thoại và dùng Direct Connect để kết nối.')
      setActiveTab('connect')
      setPairIpInput('')
      setPairCode('')
    } else {
      alert('Ghép nối thất bại. Vui lòng kiểm tra lại IP, Port và Pairing Code.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Link2 className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-800">Quản lý Kết nối</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('connect')} 
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'connect' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Kết nối Trực tiếp
            </button>
            <button 
              onClick={() => setActiveTab('pair')} 
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'pair' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Ghép nối Android 11+
            </button>
          </div>

          {activeTab === 'connect' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-left-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Kết nối Thiết bị Không dây
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Wifi className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="VD: 192.168.1.5:5555"
                    value={ipInput}
                    onChange={(e) => setIpInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
                  />
                </div>
                <button
                  onClick={handleConnect}
                  disabled={!ipInput.trim() || isConnecting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                >
                  {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kết nối'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'pair' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Thông tin Ghép nối
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Wifi className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="IP & Port (VD: 192.168.1.5:41233)"
                    value={pairIpInput}
                    onChange={(e) => setPairIpInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Mã ghép nối Wi-Fi (VD: 123456)"
                    value={pairCode}
                    onChange={(e) => setPairCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePair()}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
                  />
                </div>
                <button
                  onClick={handlePair}
                  disabled={!pairIpInput.trim() || !pairCode.trim() || isPairing}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {isPairing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ghép nối Thiết bị'}
                </button>
              </div>
            </div>
          )}

          {/* Connected Devices List */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Thiết bị Đã kết nối ({devices.length})</span>
            </label>
            
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
              {devices.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-2xl">
                  Chưa có thiết bị nào kết nối
                </div>
              ) : (
                devices.map(device => (
                  <button
                    key={device.id}
                    onClick={() => {
                      setActiveDevice(device.id)
                      onClose()
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      activeDevice === device.id
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        activeDevice === device.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {device.id.includes(':5555') ? <Wifi className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                      </div>
                      <div className="text-left">
                        <div className={`text-sm font-semibold ${activeDevice === device.id ? 'text-blue-900' : 'text-slate-700'}`}>
                          {device.model || device.id}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'device' ? 'bg-green-500' : 'bg-red-500'}`} />
                          {device.status === 'device' ? 'Đã kết nối' : device.status}
                          {device.id.includes(':5555') && <span className="text-blue-500">• Không dây</span>}
                        </div>
                      </div>
                    </div>
                    {activeDevice === device.id && (
                      <div className="w-2 h-2 rounded-full bg-blue-600 mr-2" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
