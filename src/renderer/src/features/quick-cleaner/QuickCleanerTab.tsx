import React, { useState, useEffect, useCallback } from "react";
import { useDeviceStore } from "../../store/deviceStore";
import { QuickCleanCard } from "./components/QuickCleanCard";
import { CustomCleanOptions } from "./components/CustomCleanOptions";
import { CleaningProgressModal } from "./components/CleaningProgressModal";
import { WhitelistModal } from "./components/WhitelistModal";
import { ScanResult, CleanOptions, CleanProgressData, DEFAULT_WHITELIST_PACKAGES } from "@shared/types";
import { RefreshCw, SlidersHorizontal, Sparkles, Shield, Cpu, HardDrive, AlertCircle } from "lucide-react";

export const QuickCleanerTab: React.FC = () => {
  const { activeDevice } = useDeviceStore();
  const [activeMode, setActiveMode] = useState<"quick" | "custom">("quick");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [whitelist, setWhitelist] = useState<string[]>(DEFAULT_WHITELIST_PACKAGES);

  // Custom Options State
  const [customOptions, setCustomOptions] = useState<CleanOptions>({
    cleanLogcat: true,
    cleanTemp: true,
    cleanApk: true,
    cleanTelegramCache: true,
    cleanTrimCaches: true,
    cleanAppCache: false,
    killApps: true,
    boostRam: true,
  });

  // Modal State
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isWhitelistOpen, setIsWhitelistOpen] = useState(false);
  const [progressData, setProgressData] = useState<CleanProgressData | null>(null);
  const [realtimeLogs, setRealtimeLogs] = useState<string[]>([]);

  // Tải danh sách Whitelist từ Store
  useEffect(() => {
    window.api.getCleanerWhitelist().then((saved) => {
      if (Array.isArray(saved) && saved.length > 0) {
        setWhitelist(saved);
      }
    });
  }, []);

  // Lắng nghe tiến trình realtime từ Backend
  useEffect(() => {
    const unsub = window.api.onCleanerProgress((data: CleanProgressData) => {
      setProgressData(data);
      if (data.logLine) {
        setRealtimeLogs((prev) => [...prev, data.logLine]);
      }
    });
    return () => unsub();
  }, []);

  // Quét thông tin thiết bị
  const handleScan = useCallback(async () => {
    if (!activeDevice) return;
    setIsScanning(true);
    try {
      const res = await window.api.cleanerScan(activeDevice);
      setScanResult(res);
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setIsScanning(false);
    }
  }, [activeDevice]);

  useEffect(() => {
    if (activeDevice) {
      handleScan();
    }
  }, [activeDevice, handleScan]);

  // Thực thi 1-Click Clean (Quick)
  const handleQuickClean = async () => {
    if (!activeDevice) return;
    setIsProgressOpen(true);
    setRealtimeLogs(["[Bắt đầu] Chế độ Dọn Dẹp Nhanh 1-Click..."]);
    setProgressData({
      step: 0,
      totalSteps: 7,
      message: "Đang khởi chạy kịch bản 1-Click Clean...",
      percentage: 0,
      logLine: "Đang kết nối thiết bị...",
    });

    const quickOpts: CleanOptions = {
      cleanLogcat: true,
      cleanTemp: true,
      cleanApk: true,
      cleanTelegramCache: true,
      cleanTrimCaches: true,
      cleanAppCache: false,
      killApps: true,
      boostRam: true,
    };

    try {
      await window.api.cleanerExecute(activeDevice, quickOpts, whitelist);
      await handleScan(); // Quét lại thông số sau khi hoàn tất
    } catch (err: any) {
      setRealtimeLogs((prev) => [...prev, `[LỖI THỰC THI] ${err.message}`]);
    }
  };

  // Thực thi Custom Clean
  const handleExecuteCustom = async () => {
    if (!activeDevice) return;
    setIsProgressOpen(true);
    setRealtimeLogs(["[Bắt đầu] Thực thi kịch bản dọn dẹp Tùy Chỉnh..."]);
    setProgressData({
      step: 0,
      totalSteps: 5,
      message: "Đang khởi tạo các tác vụ tùy chọn...",
      percentage: 0,
      logLine: "Đang kết nối thiết bị...",
    });

    try {
      await window.api.cleanerExecute(activeDevice, customOptions, whitelist);
      await handleScan();
    } catch (err: any) {
      setRealtimeLogs((prev) => [...prev, `[LỖI THỰC THI] ${err.message}`]);
    }
  };

  const handleSaveWhitelist = async (newWhitelist: string[]) => {
    setWhitelist(newWhitelist);
    await window.api.saveCleanerWhitelist(newWhitelist);
  };

  if (!activeDevice) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 text-center p-8">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Chưa kết nối thiết bị Android</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          Vui lòng kết nối điện thoại của bạn qua USB hoặc Wireless ADB để sử dụng tính năng Dọn Dẹp Nhanh.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-8 pb-16 pr-2">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Dọn Dẹp Nhanh & Tối Ưu RAM</span>
            {scanResult && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800">
                Android {scanResult.androidRelease} (SDK {scanResult.sdkVersion})
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Giải phóng bộ nhớ rác, dọn cache và tăng tốc thiết bị Android 11 đến 17 an toàn qua ADB.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            title="Quét lại hệ thống"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {/* Mode Switcher */}
          <div className="flex p-1 bg-slate-200/80 dark:bg-slate-800 rounded-2xl">
            <button
              onClick={() => setActiveMode("quick")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeMode === "quick"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nhanh (1-Click)</span>
            </button>
            <button
              onClick={() => setActiveMode("custom")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeMode === "custom"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Tùy Chỉnh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Metric Stats Bar */}
      {scanResult && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">RAM Khả Dụng</span>
              <span className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                {scanResult.ramInfo.memAvailableMb} / {scanResult.ramInfo.memTotalMb} MB
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block">Phạm Vi Quét Cache</span>
              <span className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                {scanResult.cache.totalPackagesCount} ứng dụng
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">App Đang Chạy Ngầm</span>
                <span className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                  {scanResult.runningApps.length} Tiến Trình
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsWhitelistOpen(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Whitelist
            </button>
          </div>
        </div>
      )}

      {/* Main Mode Area */}
      {activeMode === "quick" ? (
        <QuickCleanCard
          ramUsedPercentage={scanResult?.ramInfo.usedPercentage || 0}
          memTotalMb={scanResult?.ramInfo.memTotalMb || 0}
          memAvailableMb={scanResult?.ramInfo.memAvailableMb || 0}
          onQuickClean={handleQuickClean}
          isScanning={isScanning}
          onOpenWhitelist={() => setIsWhitelistOpen(true)}
        />
      ) : (
        <CustomCleanOptions
          options={customOptions}
          onChangeOptions={setCustomOptions}
          onExecuteCustom={handleExecuteCustom}
          isScanning={isScanning}
        />
      )}

      {/* Modals */}
      <CleaningProgressModal
        isOpen={isProgressOpen}
        onClose={() => setIsProgressOpen(false)}
        progressData={progressData}
        logs={realtimeLogs}
      />

      <WhitelistModal
        isOpen={isWhitelistOpen}
        onClose={() => setIsWhitelistOpen(false)}
        whitelist={whitelist}
        onSave={handleSaveWhitelist}
        deviceId={activeDevice}
      />
    </div>
  );
};
