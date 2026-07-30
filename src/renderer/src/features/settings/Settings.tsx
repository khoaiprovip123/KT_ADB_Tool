import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, RefreshCw, Palette, Zap, Sparkles } from "lucide-react";
import About from "./components/About";
import Updates from "./components/Updates";
import Customization from "./components/Customization";
import AdbPreferences from "./components/AdbPreferences";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<
    "about" | "customization" | "adb" | "updates"
  >("about");

  const renderContent = () => {
    switch (activeTab) {
      case "about":
        return <About />;
      case "customization":
        return <Customization />;
      case "adb":
        return <AdbPreferences />;
      case "updates":
        return <Updates />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/60 dark:border-slate-800/80 shadow-2xl overflow-hidden p-6 md:p-8 space-y-6">
      {/* Top Header & Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0 border border-white/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              Trung tâm Cài đặt & Cấu hình
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Quản lý hệ thống, tùy chỉnh giao diện và bảo trì kết nối ADB
            </p>
          </div>
        </div>

        {/* Tab Controls (HyperOS Capsule Switcher) */}
        <div className="inline-flex bg-slate-200/70 dark:bg-slate-950/80 p-1.5 rounded-full border border-slate-300/50 dark:border-slate-800/80 backdrop-blur-xl shadow-inner">
          <SettingsTab
            active={activeTab === "about"}
            onClick={() => setActiveTab("about")}
            label="Giới thiệu"
            icon={<Info size={15} />}
          />
          <SettingsTab
            active={activeTab === "customization"}
            onClick={() => setActiveTab("customization")}
            label="Giao diện"
            icon={<Palette size={15} />}
          />
          <SettingsTab
            active={activeTab === "adb"}
            onClick={() => setActiveTab("adb")}
            label="ADB Engine"
            icon={<Zap size={15} />}
          />
          <SettingsTab
            active={activeTab === "updates"}
            onClick={() => setActiveTab("updates")}
            label="Cập nhật"
            icon={<RefreshCw size={15} />}
          />
        </div>
      </div>

      {/* Dynamic Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SettingsTab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-bold text-xs whitespace-nowrap ${
        active
          ? "text-blue-600 dark:text-blue-400"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
      }`}
    >
      {active && (
        <motion.div
          layoutId="settings-active-pill"
          className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700/60"
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );
}
