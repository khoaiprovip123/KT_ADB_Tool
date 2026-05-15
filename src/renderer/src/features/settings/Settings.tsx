import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, RefreshCw, Palette } from 'lucide-react'
import About from './components/About'
import Updates from './components/Updates'
import Customization from './components/Customization'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'about' | 'updates' | 'customization'>('about')

  const renderContent = () => {
    switch (activeTab) {
      case 'about':
        return <About />
      case 'updates':
        return <Updates />
      case 'customization':
        return <Customization />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full bg-white/60 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden border border-white/50 shadow-2xl shadow-blue-900/5 p-8">
      {/* Horizontal Tab Bar - Segmented Control Style */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex bg-slate-100/50 p-1.5 rounded-[2rem] border border-slate-200/40 shadow-inner">
          <SettingsTab 
            active={activeTab === 'about'} 
            onClick={() => setActiveTab('about')} 
            label="Giới thiệu" 
            icon={<Info size={16} />}
          />
          <SettingsTab 
            active={activeTab === 'updates'} 
            onClick={() => setActiveTab('updates')} 
            label="Cập nhật" 
            icon={<RefreshCw size={16} />}
          />
          <SettingsTab 
            active={activeTab === 'customization'} 
            onClick={() => setActiveTab('customization')} 
            label="Tùy chỉnh" 
            icon={<Palette size={16} />}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function SettingsTab({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2.5 px-6 py-2.5 rounded-full transition-all duration-300 font-bold text-[13px] ${
        active
          ? 'text-blue-600'
          : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {active && (
        <motion.div 
          layoutId="active-bg"
          className="absolute inset-0 bg-white rounded-full shadow-md border border-slate-200/50"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2.5">
        {icon}
        {label}
      </span>
    </button>
  )
}
