import React, { useState, useEffect } from "react";
import {
  Cpu,
  Settings as SettingsIcon,
  LayoutGrid,
  Terminal,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Zap,
  Sparkles,
  Sliders,
  QrCode,
  Eraser,
} from "lucide-react";
import { useDeviceStore } from "./store/deviceStore";
import { useSettingsStore } from "./store/settingsStore";
import { LogTerminal } from "./components/layout/LogTerminal";
import { FloatingQuickBoot } from "./components/layout/FloatingQuickBoot";
import { Dashboard } from "./components/features/Dashboard";
const AppManager = React.lazy(() => import("./components/features/AppManager").then(m => ({ default: m.AppManager })));
const FileManager = React.lazy(() => import("./components/features/FileManager").then(m => ({ default: m.FileManager })));
const SystemOptimization = React.lazy(() => import("./components/features/SystemOptimization").then(m => ({ default: m.SystemOptimization })));
const ExperienceCenter = React.lazy(() => import("./components/features/ExperienceCenter").then(m => ({ default: m.ExperienceCenter })));
const QuickCleanerTab = React.lazy(() => import("./features/quick-cleaner/QuickCleanerTab").then(m => ({ default: m.QuickCleanerTab })));
const AdvancedAdb = React.lazy(() => import("./features/advanced-adb"));
const Settings = React.lazy(() => import("./features/settings/Settings"));

const TabLoading = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-4 animate-pulse">
    <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
    <p className="text-xs font-black text-slate-400 tracking-widest uppercase">Đang tải giao diện...</p>
  </div>
);
import { ControlCenterModal } from "./components/layout/ControlCenterModal";
import { ConnectionManagerModal } from "./components/layout/ConnectionManagerModal";

import { ToastProvider } from "./components/layout/ToastProvider";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import logoImg from "./assets/images/logo.png";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isCcOpen, setIsCcOpen] = useState(false);
  const [isConnManagerOpen, setIsConnManagerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { settings, loadSettings } = useSettingsStore();
  const { devices, activeDevice, setDevices, addLog } = useDeviceStore();

  useEffect(() => {
    // Tải cài đặt từ Electron Store
    loadSettings();

    // Khởi tạo ADB và tải Platform-tools tự động
    window.api.initAdb().then(() => {
      window.api.getDevices().then(setDevices);
    });

    // Lắng nghe thiết bị cắm/rút
    const unsubDevice = window.api.onDeviceUpdate((updatedDevices) => {
      setDevices(updatedDevices);
    });

    // Lắng nghe stream Log từ lệnh ADB
    const unsubLog = window.api.onLogStream((log) => {
      const cleanLog = log.trim();
      if (!cleanLog) return;
      if (cleanLog.includes("connected successfully")) return;
      if (cleanLog.includes("inaccessible or not found")) return;
      if (cleanLog.includes("not found") && cleanLog.includes("/system/bin/sh"))
        return;
      addLog(log);
    });

    return () => {
      unsubDevice();
      unsubLog();
    };
  }, [setDevices, addLog]);

  useEffect(() => {
    if (activeDevice) {
      useDeviceStore.getState().refreshDeviceInfo();
    }
  }, [activeDevice]);

  useEffect(() => {
    const root = window.document.documentElement;
    const theme = settings.theme;
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [settings.theme]);

  return (
    <div className="flex h-screen w-full bg-[#f4f7fb] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
      <ToastProvider />
      <ConnectionManagerModal
        isOpen={isConnManagerOpen}
        onClose={() => setIsConnManagerOpen(false)}
        initialTab="pair"
      />
      {/* SIDEBAR */}
      <aside
        className={`${isSidebarOpen ? "w-64" : "w-20"} transition-all duration-300 ease-in-out flex flex-col justify-between bg-white/80 backdrop-blur-xl border-r border-glass-border shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-9 bg-white border border-slate-200 shadow-sm rounded-full p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors z-20"
        >
          {isSidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <div className={`p-6 ${!isSidebarOpen ? "px-4" : ""}`}>
          <div
            className={`flex items-center ${isSidebarOpen ? "gap-3" : "justify-center"} mb-10 overflow-hidden`}
          >
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <img src={logoImg} alt="Logo" className="w-10 h-10 object-contain rounded-xl shadow-sm" />
            </div>
            {isSidebarOpen && (
              <div className="whitespace-nowrap transition-opacity duration-300">
                <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  KT ADB Tool
                </h1>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                  Enterprise Edition
                </p>
              </div>
            )}
          </div>

          <nav className="space-y-2">
            <NavItem
              icon={<LayoutGrid />}
              label="Tổng quan"
              active={activeTab === "dashboard"}
              isExpanded={isSidebarOpen}
              onClick={() => setActiveTab("dashboard")}
            />
            <NavItem
              icon={<Cpu />}
              label="Quản lý ứng dụng"
              active={activeTab === "system"}
              isExpanded={isSidebarOpen}
              onClick={() => setActiveTab("system")}
            />
            <NavItem
              icon={<FolderOpen />}
              label="Quản lý tệp tin"
              active={activeTab === "files"}
              isExpanded={isSidebarOpen}
              onClick={() => setActiveTab("files")}
            />
            <NavItem
              icon={<Zap />}
              label="Tối ưu hệ thống"
              active={activeTab === "optimize"}
              isExpanded={isSidebarOpen}
              onClick={() => setActiveTab("optimize")}
            />
            <NavItem
              icon={<Eraser />}
              label="Dọn dẹp nhanh"
              active={activeTab === "cleaner"}
              isExpanded={isSidebarOpen}
              onClick={() => setActiveTab("cleaner")}
            />
            <NavItem
              icon={<Sparkles />}
              label="UX & Tinh chỉnh"
              active={activeTab === "experience"}
              isExpanded={isSidebarOpen}
              onClick={() => setActiveTab("experience")}
            />
            <NavItem
              icon={<Sliders />}
              label="Nâng cao ADB"
              active={activeTab === "advanced"}
              isExpanded={isSidebarOpen}
              onClick={() => setActiveTab("advanced")}
            />
          </nav>
        </div>

        <div className={`p-6 ${!isSidebarOpen ? "px-4" : ""}`}>
          <NavItem
            icon={<SettingsIcon />}
            label="Cài đặt"
            active={activeTab === "settings"}
            isExpanded={isSidebarOpen}
            onClick={() => setActiveTab("settings")}
          />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative z-0">
        <header className="h-20 bg-white/50 backdrop-blur-md border-b border-white/40 px-8 flex items-center justify-between sticky top-0 z-20">
          <h2 className="text-xl font-semibold capitalize text-slate-800">
            {activeTab === "dashboard"
              ? "Tổng quan"
              : activeTab === "system"
                ? "Quản lý ứng dụng"
                : activeTab === "files"
                  ? "Quản lý tệp tin"
                  : activeTab === "optimize"
                    ? "Tối ưu hệ thống"
                    : activeTab === "cleaner"
                      ? "Dọn dẹp nhanh & RAM"
                      : activeTab === "experience"
                        ? "Trung tâm trải nghiệm"
                        : activeTab === "advanced"
                          ? "Nâng cao ADB"
                          : activeTab === "settings"
                            ? "Cài đặt"
                            : activeTab}
          </h2>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsConnManagerOpen(true)}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-full text-sm font-bold transition-all shadow-sm flex items-center gap-2"
              title="Mở Quản lý kết nối & Quét mã QR Wireless ADB"
            >
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>Quét mã QR</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setIsCcOpen(!isCcOpen)}
                className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Điều khiển</span>
              </button>
              <ControlCenterModal
                isOpen={isCcOpen}
                onClose={() => setIsCcOpen(false)}
              />
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
                      {devices.find((d) => d.id === activeDevice)?.model ||
                        devices.find((d) => d.id === activeDevice)?.id ||
                        "Connected"}
                      <span className="text-slate-400 ml-1">
                        ({devices.length})
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-slate-500">
                      Chưa kết nối
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        <div
          className={`flex-1 overflow-hidden relative ${
            activeTab === "experience" ? "p-4" : "p-8"
          }`}
        >
          <ErrorBoundary>
            <React.Suspense fallback={<TabLoading />}>
              {activeTab === "dashboard" && <Dashboard />}
              {activeTab === "system" && <AppManager />}
              {activeTab === "files" && <FileManager />}
              {activeTab === "experience" && <ExperienceCenter />}
              {activeTab === "optimize" && <SystemOptimization />}
              {activeTab === "cleaner" && <QuickCleanerTab />}
              {activeTab === "advanced" && <AdvancedAdb />}
              {activeTab === "settings" && <Settings />}
            </React.Suspense>
            {activeTab !== "dashboard" &&
              activeTab !== "system" &&
              activeTab !== "files" &&
              activeTab !== "experience" &&
              activeTab !== "optimize" &&
              activeTab !== "cleaner" &&
              activeTab !== "advanced" &&
              activeTab !== "settings" && (
                <div className="flex items-center justify-center h-full text-slate-400">
                  Tính năng đang được phát triển...
                </div>
              )}
          </ErrorBoundary>
        </div>

        <LogTerminal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />
        {activeTab === "dashboard" && <FloatingQuickBoot />}
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  isExpanded,
  onClick,
}: {
  icon: React.ReactElement;
  label: string;
  active: boolean;
  isExpanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center ${isExpanded ? "gap-3 px-4" : "justify-center px-0"} py-3 rounded-xl transition-all duration-300 font-medium ${
        active
          ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
          : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-800"
      }`}
      title={!isExpanded ? label : undefined}
    >
      {React.cloneElement(icon, { className: "w-5 h-5 shrink-0" })}
      {isExpanded && (
        <span className="whitespace-nowrap overflow-hidden">{label}</span>
      )}
    </button>
  );
}

export default App;
