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
  Minus,
  Square,
  X,
} from "lucide-react";
import { useDeviceStore } from "./store/deviceStore";
import { useSettingsStore } from "./store/settingsStore";
import { LogTerminal } from "./components/layout/LogTerminal";
import { FloatingQuickBoot } from "./components/layout/FloatingQuickBoot";
import { Dashboard } from "./components/features/Dashboard";
import { ControlCenterModal } from "./components/layout/ControlCenterModal";
import { ConnectionManagerModal } from "./components/layout/ConnectionManagerModal";
import { UpdateModal } from "./components/layout/UpdateModal";
import { ToastProvider } from "./components/layout/ToastProvider";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import logoImg from "./assets/images/logo.png";

const AppManager = React.lazy(() =>
  import("./components/features/AppManager").then((m) => ({
    default: m.AppManager,
  })),
);
const FileManager = React.lazy(() =>
  import("./components/features/FileManager").then((m) => ({
    default: m.FileManager,
  })),
);
const SystemOptimization = React.lazy(() =>
  import("./components/features/SystemOptimization").then((m) => ({
    default: m.SystemOptimization,
  })),
);
const ExperienceCenter = React.lazy(() =>
  import("./components/features/ExperienceCenter").then((m) => ({
    default: m.ExperienceCenter,
  })),
);
const QuickCleanerTab = React.lazy(() =>
  import("./features/quick-cleaner/QuickCleanerTab").then((m) => ({
    default: m.QuickCleanerTab,
  })),
);
const AdvancedAdb = React.lazy(() => import("./features/advanced-adb"));
const Settings = React.lazy(() => import("./features/settings/Settings"));

const TabLoading = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-4 animate-pulse">
    <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
    <p className="text-xs font-black text-slate-400 tracking-widest uppercase">
      Đang tải giao diện...
    </p>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isCcOpen, setIsCcOpen] = useState(false);
  const [isConnManagerOpen, setIsConnManagerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasUpdate, setHasUpdate] = useState(false);
  const { settings, loadSettings } = useSettingsStore();
  const { devices, activeDevice, setDevices, addLog } = useDeviceStore();

  useEffect(() => {
    if (window.api?.checkForUpdates) {
      window.api
        .checkForUpdates()
        .then((info) => {
          if (info && info.available) {
            setHasUpdate(true);
          }
        })
        .catch(console.error);
    }

    if (window.api?.onUpdateAvailable) {
      const unsub = window.api.onUpdateAvailable((info) => {
        if (info && info.available) {
          setHasUpdate(true);
        }
      });
      return () => unsub();
    }
  }, []);

  const [enableAdvancedMode, setEnableAdvancedMode] = useState(() => {
    return localStorage.getItem("enableAdvancedAdb") === "true";
  });

  useEffect(() => {
    const handleAdvancedToggle = () => {
      const isEnabled = localStorage.getItem("enableAdvancedAdb") === "true";
      setEnableAdvancedMode(isEnabled);
      if (!isEnabled && activeTab === "advanced") {
        setActiveTab("dashboard");
      }
    };
    window.addEventListener("storage", handleAdvancedToggle);
    window.addEventListener("advanced-adb-toggled", handleAdvancedToggle);
    return () => {
      window.removeEventListener("storage", handleAdvancedToggle);
      window.removeEventListener("advanced-adb-toggled", handleAdvancedToggle);
    };
  }, [activeTab]);

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
    <div className="app-shell flex h-full w-full text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
      <ToastProvider />
      <ConnectionManagerModal
        isOpen={isConnManagerOpen}
        onClose={() => setIsConnManagerOpen(false)}
        initialTab="pair"
      />
      {/* SIDEBAR */}
      <aside
        className={`app-sidebar ${isSidebarOpen ? "w-64" : "w-20"} shrink-0 transition-all duration-300 ease-in-out flex flex-col justify-between backdrop-blur-xl border-r z-10 relative`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-7 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors z-20"
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
              <img
                src={logoImg}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-xl shadow-sm"
              />
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
            {enableAdvancedMode && (
              <NavItem
                icon={<Sliders />}
                label="Nâng cao ADB"
                active={activeTab === "advanced"}
                isExpanded={isSidebarOpen}
                onClick={() => setActiveTab("advanced")}
              />
            )}
          </nav>
        </div>

        <div className="min-h-0 flex-1 px-4 pb-3">
          {activeTab === "experience" && isSidebarOpen && (
            <div
              id="experience-device-command-slot"
              className="flex h-full min-h-[136px] items-end"
              aria-label="Thông tin thiết bị và thao tác nhanh"
            />
          )}
        </div>

        <div className={`p-6 ${!isSidebarOpen ? "px-4" : ""}`}>
          <NavItem
            icon={<SettingsIcon />}
            label="Cài đặt"
            active={activeTab === "settings"}
            isExpanded={isSidebarOpen}
            badge={hasUpdate ? 1 : undefined}
            onClick={() => setActiveTab("settings")}
          />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="app-main flex-1 flex flex-col relative z-0 text-slate-800 dark:text-slate-100 overflow-hidden">
        <header
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
          className="app-header h-20 backdrop-blur-xl border-b px-8 flex items-center justify-between sticky top-0 z-20 select-none"
        >
          <h2 className="text-xl font-semibold capitalize text-slate-800 dark:text-slate-100">
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

          <div
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            className="flex items-center gap-4"
          >
            <div className="relative">
              <button
                onClick={() => setIsCcOpen(!isCcOpen)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2"
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
              className="px-4 py-2 bg-slate-800 dark:bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-slate-700 dark:hover:bg-indigo-700 transition-colors shadow-lg flex items-center gap-2"
            >
              <Terminal className="w-4 h-4" />
              <span>Nhật ký</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setIsConnManagerOpen(true)}
                className="flex items-center gap-2.5 bg-indigo-50/90 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-4 py-2 rounded-full shadow-sm border border-indigo-200/80 dark:border-indigo-800/80 transition-colors"
                title="Mở Quản lý kết nối & Quét mã QR Wireless ADB"
              >
                <QrCode className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span className="h-4 w-px bg-indigo-200 dark:bg-indigo-800" />
                {activeDevice ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
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
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Chưa kết nối
                    </span>
                  </>
                )}
              </button>
            </div>

            <div
              className="ml-1 flex items-center gap-2 rounded-full border border-white/70 bg-white/45 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-slate-700/70 dark:bg-slate-900/45"
              aria-label="Điều khiển cửa sổ"
            >
              <button
                type="button"
                onClick={() => void window.api.closeWindow()}
                className="group flex h-[18px] w-[18px] items-center justify-center rounded-full border border-red-500/30 bg-[#ff5f57] text-red-950 shadow-sm transition-transform hover:scale-110"
                title="Đóng ứng dụng"
                aria-label="Đóng ứng dụng"
              >
                <X className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-70" />
              </button>
              <button
                type="button"
                onClick={() => void window.api.minimizeWindow()}
                className="group flex h-[18px] w-[18px] items-center justify-center rounded-full border border-amber-500/30 bg-[#febc2e] text-amber-950 shadow-sm transition-transform hover:scale-110"
                title="Thu nhỏ"
                aria-label="Thu nhỏ cửa sổ"
              >
                <Minus className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-70" />
              </button>
              <button
                type="button"
                onClick={() => void window.api.maximizeWindow()}
                className="group flex h-[18px] w-[18px] items-center justify-center rounded-full border border-emerald-600/30 bg-[#28c840] text-emerald-950 shadow-sm transition-transform hover:scale-110"
                title="Phóng to hoặc khôi phục"
                aria-label="Phóng to hoặc khôi phục cửa sổ"
              >
                <Square className="h-2 w-2 opacity-0 transition-opacity group-hover:opacity-70" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative p-4 lg:p-6 flex flex-col h-full">
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
        <UpdateModal />
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  isExpanded,
  badge,
  onClick,
}: {
  icon: React.ReactElement;
  label: string;
  active: boolean;
  isExpanded: boolean;
  badge?: number | string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full flex items-center ${isExpanded ? "gap-3 px-4 justify-between" : "justify-center px-0"} py-3 rounded-xl transition-all duration-300 font-medium ${
        active
          ? "bg-white/90 text-blue-600 border border-white/90 shadow-[0_6px_18px_rgba(59,130,246,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] dark:bg-blue-600/80 dark:text-white dark:border-blue-400/20"
          : "text-slate-500 border border-transparent hover:bg-white/55 hover:border-white/70 hover:text-slate-800 dark:hover:bg-slate-800/55 dark:hover:text-slate-100"
      }`}
      title={!isExpanded ? label : undefined}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {React.cloneElement(icon, { className: "w-5 h-5 shrink-0" })}
        {isExpanded && (
          <span className="whitespace-nowrap overflow-hidden">{label}</span>
        )}
      </div>

      {badge !== undefined && (
        <span
          className={`flex items-center justify-center rounded-full bg-red-500 text-white font-bold text-[10px] leading-none shadow-md shadow-red-500/40 animate-pulse ${
            isExpanded
              ? "w-4 h-4 ml-auto shrink-0"
              : "absolute -top-1 -right-1 w-4 h-4 border-2 border-white dark:border-slate-900"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export default App;
