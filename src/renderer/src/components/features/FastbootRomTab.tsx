import React, { useState, useEffect } from "react";
import {
  Folder,
  HardDriveDownload,
  AlertTriangle,
  Zap,
  RefreshCw,
  Trash2,
  Cpu,
  Terminal as TerminalIcon,
  XCircle,
  Play,
  ShieldCheck,
  Lock,
  AlertOctagon,
  ShieldAlert,
  Layers,
  Sparkles,
  CheckCircle2,
  Shield,
  BookOpen,
  HelpCircle,
  Users,
  ExternalLink,
} from "lucide-react";
import { useDeviceStore } from "../../store/deviceStore";

export const FastbootRomTab: React.FC = () => {
  const { activeDevice, devices } = useDeviceStore();

  const [subTab, setSubTab] = useState<"flasher" | "guide">("flasher");
  const [romPath, setRomPath] = useState<string>("");
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const [deviceInfo, setDeviceInfo] = useState<{
    product: string;
    board?: string;
    isUnlocked?: boolean;
    currentSlot?: string;
    hasSlots?: boolean;
    slotCount?: number;
    isUserspace?: boolean;
    maxDownloadSize?: string;
    error?: string;
  } | null>(null);
  const [isCheckingDevice, setIsCheckingDevice] = useState<boolean>(false);

  // Configuration states
  const [wipeData, setWipeData] = useState<boolean>(true);
  const [lockBootloader, setLockBootloader] = useState<boolean>(false);
  const [showLockWarningModal, setShowLockWarningModal] = useState<boolean>(false);
  const [lockConfirmInput, setLockConfirmInput] = useState<string>("");
  const [rootOption, setRootOption] = useState<"none" | "alpha" | "folkpatch" | "custom">("none");
  const [slotMode, setSlotMode] = useState<"both" | "active" | "single">("both");
  const [disableVerity, setDisableVerity] = useState<boolean>(true);
  const [bypassCodenameCheck, setBypassCodenameCheck] = useState<boolean>(false);
  const [selectedPartitions, setSelectedPartitions] = useState<string[]>([]);
  const [allowCriticalPartitions, setAllowCriticalPartitions] = useState<boolean>(true);

  // Flashing execution state
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [flashProgress, setFlashProgress] = useState<{
    step: number;
    totalSteps: number;
    currentPartition: string;
    message: string;
    percentage: number;
  } | null>(null);
  const [flashLogs, setFlashLogs] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const currentDevObj = devices.find((d) => d.id === activeDevice);
  const isFastbootMode = currentDevObj?.status === "fastboot" || currentDevObj?.type === "bootloader";

  // Check fastboot device info
  const checkDevice = async () => {
    if (!activeDevice) return;
    setIsCheckingDevice(true);
    try {
      const info = await window.api.getFastbootDeviceInfo(activeDevice);
      setDeviceInfo(info);
    } catch (err: any) {
      setDeviceInfo({ product: "unknown", error: err.message });
    } finally {
      setIsCheckingDevice(false);
    }
  };

  useEffect(() => {
    if (activeDevice) {
      checkDevice();
    }
  }, [activeDevice, devices]);

  // Handle ROM folder selection & scanning
  const handleSelectRomFolder = async () => {
    try {
      const folder = await window.api.openRomFolderDialog();
      if (folder) {
        setRomPath(folder);
        await runScan(folder);
      }
    } catch (err: any) {
      console.error("Select ROM folder error:", err);
    }
  };

  const runScan = async (folder: string) => {
    if (!folder) return;
    setIsScanning(true);
    setScanResult(null);
    setLockBootloader(false);
    try {
      const result = await window.api.scanRomFolder(folder);
      if (result.error) {
        alert(`Lỗi quét ROM: ${result.error}`);
      } else {
        setScanResult(result);
        // Tự động chọn tất cả phân vùng hợp lệ (trừ phân vùng protected)
        const validPartitions = result.foundImages
          .filter((img: any) => !img.isProtected)
          .map((img: any) => img.partition);
        setSelectedPartitions(validPartitions);

        // Tự động gợi ý lựa chọn root nếu phát hiện file boot
        if (result.hasBootAlpha) setRootOption("alpha");
        else if (result.hasBootFolkpatch) setRootOption("folkpatch");
        else setRootOption("none");
      }
    } catch (err: any) {
      alert(`Không thể quét thư mục ROM: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const togglePartition = (partitionName: string) => {
    setSelectedPartitions((prev) =>
      prev.includes(partitionName)
        ? prev.filter((p) => p !== partitionName)
        : [...prev, partitionName]
    );
  };

  const handleSelectAll = () => {
    if (!scanResult) return;
    const all = scanResult.foundImages
      .filter((img: any) => !img.isProtected)
      .map((img: any) => img.partition);
    setSelectedPartitions(all);
  };

  const handleDeselectAll = () => {
    setSelectedPartitions([]);
  };

  const handleSelectSafePreset = () => {
    if (!scanResult) return;
    const safeNames = new Set(["boot", "vendor_boot", "vbmeta", "vbmeta_system", "vbmeta_vendor", "super", "dtbo", "init_boot"]);
    const safeList = scanResult.foundImages
      .filter((img: any) => !img.isProtected && safeNames.has(img.partition.replace(/_[ab]$/i, "").toLowerCase()))
      .map((img: any) => img.partition);
    setSelectedPartitions(safeList);
  };

  // Subscribe to progress and log streams
  useEffect(() => {
    const unsubProgress = window.api.onFastbootFlashProgress((data) => {
      setFlashProgress(data);
    });

    const unsubLog = window.api.onFastbootFlashLog((log) => {
      setFlashLogs((prev) => [...prev, log]);
    });

    return () => {
      unsubProgress();
      unsubLog();
    };
  }, []);

  const handleStartFlash = async () => {
    setShowConfirmModal(false);
    if (!activeDevice) {
      alert("Vui lòng kết nối thiết bị ở chế độ Fastboot!");
      return;
    }
    if (!romPath || !scanResult) {
      alert("Vui lòng chọn thư mục ROM hợp lệ!");
      return;
    }
    if (selectedPartitions.length === 0) {
      alert("Vui lòng chọn ít nhất 1 phân vùng để nạp!");
      return;
    }

    setIsFlashing(true);
    setFlashLogs([]);
    setFlashProgress(null);

    try {
      const res = await window.api.flashFastbootRom({
        deviceId: activeDevice,
        romPath,
        rootOption,
        wipeData,
        slotMode,
        disableVerity,
        targetSlot: deviceInfo?.currentSlot === "b" ? "b" : "a",
        bypassCodenameCheck,
        selectedPartitions,
        allowCriticalPartitions,
        lockBootloader,
      });

      if (!res.success) {
        alert(`Nạp ROM thất bại: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Lỗi hệ thống khi nạp ROM: ${err.message}`);
    } finally {
      setIsFlashing(false);
    }
  };

  const handleCancelFlash = async () => {
    if (confirm("Bạn có chắc chắn muốn phát lệnh HỦY nạp ROM? (Thiết bị có thể rơi vào bootloop nếu dừng dở dang)")) {
      await window.api.cancelFastbootFlash();
    }
  };

  const handleOpenUrl = (url: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (window.api?.openExternal) {
      window.api.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const checkCodenameMatch = () => {
    if (!scanResult || !deviceInfo?.product || deviceInfo.product === "unknown") return true;
    const devProd = deviceInfo.product.trim().toLowerCase();
    const romList = (scanResult.targetCodenames && scanResult.targetCodenames.length > 0)
      ? scanResult.targetCodenames
      : (scanResult.targetCodename ? [scanResult.targetCodename] : []);
    
    if (romList.length === 0) return true;

    return romList.some((rc: string) => {
      const cleanRom = rc.trim().toLowerCase();
      return devProd === cleanRom || devProd.startsWith(cleanRom) || cleanRom.startsWith(devProd);
    });
  };

  const codenameMismatch = !checkCodenameMatch();

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full space-y-6 overflow-y-auto pr-1 pb-12">
      {/* HEADER CARD */}
      <div className="shrink-0 relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black tracking-wider uppercase">
                Universal Fastboot Engine
              </span>
              {isFastbootMode ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/80 backdrop-blur-md rounded-full text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  Fastboot Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/80 backdrop-blur-md rounded-full text-xs font-bold">
                  ADB / Standard Mode
                </span>
              )}
              {deviceInfo?.isUnlocked !== undefined && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    deviceInfo.isUnlocked
                      ? "bg-emerald-500/80 text-white"
                      : "bg-red-500/80 text-white animate-pulse"
                  }`}
                >
                  {deviceInfo.isUnlocked ? "Bootloader Unlocked ✔" : "Bootloader LOCKED 🔒"}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black tracking-tight">Fastboot ROM Flasher</h2>
            <p className="text-xs text-blue-100 mt-1 max-w-xl">
              Trình nạp ROM Fastboot thông minh cho tất cả dòng thiết bị Android (Xiaomi, POCO, Redmi, Pixel, OnePlus...). Tự động nhận diện phân vùng, đối chiếu Codename an toàn và chống brick.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-black/25 backdrop-blur-md p-1 rounded-2xl border border-white/15 shadow-inner">
              <button
                type="button"
                onClick={() => setSubTab("flasher")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  subTab === "flasher"
                    ? "bg-white text-blue-700 shadow-md font-black"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Trình Nạp ROM</span>
              </button>
              <button
                type="button"
                onClick={() => setSubTab("guide")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  subTab === "guide"
                    ? "bg-white text-purple-700 shadow-md font-black"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Hướng Dẫn & Quy Chuẩn</span>
              </button>
            </div>

            <button
              onClick={checkDevice}
              disabled={isCheckingDevice}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20"
              title="Làm mới Fastboot"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDevice ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      {subTab === "flasher" && (
        <>
          {/* STEP 1: CHỌN THƯ MỤC ROM */}
          <div className="shrink-0 bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Thư mục ROM Fastboot
              </h3>
              <p className="text-xs text-slate-400">
                Chọn thư mục giải nén ROM chứa các tệp ảnh `.img` (hoặc thư mục `images/`)
              </p>
            </div>
          </div>

          {romPath && (
            <button
              onClick={() => runScan(romPath)}
              disabled={isScanning}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
              Quét lại
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={romPath}
              onChange={(e) => setRomPath(e.target.value)}
              placeholder="Chưa chọn thư mục ROM (Ví dụ: C:\ROMs\lisa_hyperos_image)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Folder className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>

          <button
            onClick={handleSelectRomFolder}
            disabled={isScanning || isFlashing}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0"
          >
            <Folder className="w-4 h-4" />
            <span>Chọn thư mục</span>
          </button>
        </div>

        {/* THÔNG TIN CODENAME & ĐỐI CHIẾU THIẾT BỊ */}
        {scanResult && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
              <Cpu className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Target Device (ROM) {scanResult.platformType && `• ${scanResult.platformType.toUpperCase()}`}
                </span>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                  {scanResult.targetCodenames && scanResult.targetCodenames.length > 0
                    ? scanResult.targetCodenames.join(" / ")
                    : scanResult.targetCodename || "Universal"}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
              <Zap className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {isFastbootMode ? "Connected Fastboot" : "Connected Device"} {deviceInfo?.hasSlots ? "• Dual Slot A/B" : "• Single Slot"}
                </span>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                  {isCheckingDevice ? (
                    <span className="text-blue-500 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Đang nhận diện...
                    </span>
                  ) : !activeDevice ? (
                    <span className="text-amber-500 font-bold">Chưa nối thiết bị</span>
                  ) : deviceInfo?.product && deviceInfo.product !== "unknown" ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {deviceInfo.product}
                      {deviceInfo.board && deviceInfo.board !== deviceInfo.product ? (
                        <span className="text-slate-400 font-normal ml-1">({deviceInfo.board})</span>
                      ) : null}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={checkDevice}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <RefreshCw className="w-3 h-3" /> Bấm để nhận diện lại
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
              <HardDriveDownload className="w-5 h-5 text-purple-500 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Phân vùng tìm thấy</span>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                  {scanResult.foundImages.length} tệp `.img`
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BÁO LỖI CODENAME MISMATCH */}
        {codenameMismatch && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Cảnh báo lệch Codename: ROM yêu cầu [<strong>{scanResult.targetCodenames?.join(", ") || scanResult.targetCodename}</strong>] nhưng thiết bị đang nối là [<strong>{deviceInfo?.product}</strong>].
              </span>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer font-bold shrink-0 ml-4">
              <input
                type="checkbox"
                checked={bypassCodenameCheck}
                onChange={(e) => setBypassCodenameCheck(e.target.checked)}
                className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              <span>Vẫn cho phép nạp</span>
            </label>
          </div>
        )}
      </div>

      {/* STEP 2: CẤU HÌNH TÙY CHỌN FLASH */}
      {scanResult && (
        <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-purple-500/20">
                2
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                  Cấu hình & Tùy chọn nạp ROM
                </h3>
                <p className="text-xs text-slate-400">
                  Thiết lập phương thức nạp dữ liệu, vá Boot Image (Root) và chế độ Slot
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* 1. CHẾ ĐỘ NẠP ROM (SCRIPT PRESETS / FLASH MODE) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Chế độ nạp ROM (Script Presets / Flash Mode)
                </label>
                {lockBootloader && (
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 dark:text-red-400 animate-pulse bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30 shadow-sm">
                    <Lock className="w-3.5 h-3.5" /> Chế độ Khóa Bootloader đang BẬT
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. FLASH ALL (CLEAN FLASH) */}
                <div
                  onClick={() => {
                    setWipeData(true);
                    setLockBootloader(false);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    wipeData && !lockBootloader
                      ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 shadow-md ring-2 ring-blue-500/20"
                      : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${wipeData && !lockBootloader ? "bg-blue-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>
                          <Trash2 className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-mono font-bold">flash_all.bat</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] rounded-full font-black uppercase tracking-wider border border-emerald-500/20">
                        AN TOÀN
                      </span>
                    </div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                      Clean Flash (Xóa sạch dữ liệu)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Format Userdata/Metadata. Giữ Bootloader <strong>UNLOCKED</strong> (Khuyên dùng nhất).
                    </p>
                  </div>
                </div>

                {/* 2. FLASH ALL EXCEPT STORAGE (UPDATE) */}
                <div
                  onClick={() => {
                    setWipeData(false);
                    setLockBootloader(false);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    !wipeData && !lockBootloader
                      ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-md ring-2 ring-indigo-500/20"
                      : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${!wipeData && !lockBootloader ? "bg-indigo-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>
                          <RefreshCw className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-mono font-bold">flash_all_except_storage.bat</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] rounded-full font-black uppercase tracking-wider border border-indigo-500/20">
                        KEEP DATA
                      </span>
                    </div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                      Save User Data (Giữ dữ liệu)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Không format data. Giữ nguyên tệp cá nhân & giữ Bootloader <strong>UNLOCKED</strong>.
                    </p>
                  </div>
                </div>

                {/* 3. FLASH ALL LOCK (RELOCK BOOTLOADER) */}
                <div
                  onClick={() => {
                    if (!lockBootloader) {
                      setShowLockWarningModal(true);
                      setLockConfirmInput("");
                    } else {
                      setLockBootloader(false);
                    }
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    lockBootloader
                      ? "bg-red-50/80 dark:bg-red-950/50 border-red-600 text-red-900 dark:text-red-200 shadow-md ring-2 ring-red-500/30"
                      : "bg-slate-50/70 dark:bg-slate-900/40 border-amber-300/80 dark:border-amber-700/50 text-slate-600 dark:text-slate-300 hover:border-red-400"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${lockBootloader ? "bg-red-600 text-white" : "bg-amber-100 dark:bg-amber-950/60 text-amber-600"}`}>
                          <Lock className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-mono font-bold">flash_all_lock.bat</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] rounded-full font-black uppercase tracking-wider border border-red-500/20">
                        NGUY HIỂM
                      </span>
                    </div>
                    <p className="text-xs font-black text-red-600 dark:text-red-400">
                      Clean All & Khóa Bootloader
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Format sạch dữ liệu & <strong>KHÓA LẠI BOOTLOADER</strong> (Yêu cầu xác nhận an toàn).
                    </p>
                  </div>
                </div>
              </div>

              {/* DANGER ALERT BANNER KHI LOCK BOOTLOADER BẬT */}
              {lockBootloader && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start justify-between gap-3 text-xs text-red-700 dark:text-red-300 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-start gap-3">
                    <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-sm block">
                        ⛔ CHẾ ĐỘ NGUY HIỂM: Thiết bị sẽ bị KHÓA LẠI BOOTLOADER sau khi nạp xong!
                      </span>
                      <span className="text-xs text-red-600/90 dark:text-red-300/90 leading-relaxed block mt-1">
                        Nếu máy là bản nội địa (China xách tay) mà bạn đang flash ROM Quốc Tế, thiết bị sẽ bị <strong>Hard-Brick ngay lập tức</strong>. Mở lại Bootloader trên HyperOS/MIUI đời mới cực kỳ khó khăn.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLockBootloader(false)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold shrink-0 transition-all shadow-sm"
                  >
                    Tắt Khóa (Về An Toàn)
                  </button>
                </div>
              )}
            </div>

            {/* 2. TÙY CHỌN PATCH ROOT (MAGISK / FOLKPATCH) */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>Tùy chọn Patch Root (Magisk / FolkPatch)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* ROOT: NONE */}
                <div
                  onClick={() => setRootOption("none")}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    rootOption === "none"
                      ? "bg-blue-600 text-white font-bold border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/30"
                      : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${rootOption === "none" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black">Không Root (Original)</p>
                      <p className={`text-[10px] mt-0.5 ${rootOption === "none" ? "text-blue-100" : "text-slate-400"}`}>
                        Boot nguyên bản gốc
                      </p>
                    </div>
                  </div>
                  {rootOption === "none" && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>

                {/* ROOT: MAGISK ALPHA */}
                {scanResult.hasBootAlpha && (
                  <div
                    onClick={() => setRootOption("alpha")}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      rootOption === "alpha"
                        ? "bg-purple-600 text-white font-bold border-purple-600 shadow-md shadow-purple-500/20 ring-2 ring-purple-500/30"
                        : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${rootOption === "alpha" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-purple-500"}`}>
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black">Magisk Alpha</p>
                        <p className={`text-[10px] mt-0.5 ${rootOption === "alpha" ? "text-purple-100" : "text-slate-400"}`}>
                          Nạp boot_alpha.img
                        </p>
                      </div>
                    </div>
                    {rootOption === "alpha" && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                )}

                {/* ROOT: FOLKPATCH */}
                {scanResult.hasBootFolkpatch && (
                  <div
                    onClick={() => setRootOption("folkpatch")}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      rootOption === "folkpatch"
                        ? "bg-indigo-600 text-white font-bold border-indigo-600 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/30"
                        : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${rootOption === "folkpatch" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-indigo-500"}`}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black">FolkPatch</p>
                        <p className={`text-[10px] mt-0.5 ${rootOption === "folkpatch" ? "text-indigo-100" : "text-slate-400"}`}>
                          Nạp boot_folkpatch.img
                        </p>
                      </div>
                    </div>
                    {rootOption === "folkpatch" && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                )}
              </div>
            </div>

            {/* 3. CẤU HÌNH PHÂN VÙNG SLOT, VBMETA & KHÓA ANTI-BRICK */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* CHẾ ĐỘ SLOT */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Chế độ Slot Phân vùng
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Flash cả 2 slot A/B để chống bootloop khi chuyển slot.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSlotMode("both")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                      slotMode === "both"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    Dual Slot A/B
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotMode("active")}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                      slotMode === "active"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    Slot hiện tại
                  </button>
                </div>
              </div>

              {/* TÙY CHỌN VBMETA */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Vbmeta Verity Patch
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Tắt AVB Verity để tránh bị treo fastboot khi mod ROM / Root.
                  </p>
                </div>
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 cursor-pointer">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    --disable-verity
                  </span>
                  <input
                    type="checkbox"
                    checked={disableVerity}
                    onChange={(e) => setDisableVerity(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* LỚP BẢO VỆ ANTI-BRICK */}
              <div className="p-4 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-2xl border border-emerald-500/30 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Lớp bảo vệ Anti-Brick
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Cho phép nạp Bootloader Firmware (`xbl`, `abl`, `tz`...).
                  </p>
                </div>
                <label className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-900/30 cursor-pointer">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Flash Firmware Image
                  </span>
                  <input
                    type="checkbox"
                    checked={allowCriticalPartitions}
                    onChange={(e) => setAllowCriticalPartitions(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: LỰA CHỌN PHÂN VÙNG CHỈ ĐỊNH NẠP (PARTITION CHECKLIST) */}
      {scanResult && (
        <div className="shrink-0 bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                Lựa chọn phân vùng chỉ định nạp ({selectedPartitions.length}/{scanResult.foundImages.length})
              </h3>
              <p className="text-xs text-slate-400">
                Tích chọn các tệp bạn muốn nạp (ví dụ: boot, vendor_boot, vbmeta, vbmeta_system, super, xbl, modem, dtbo)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={handleSelectSafePreset}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 transition-all"
              >
                Chỉ phân vùng Safe System
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all"
              >
                Bỏ chọn tất cả
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700/50">
            {scanResult.foundImages.map((img: any) => {
              const isChecked = selectedPartitions.includes(img.partition);
              return (
                <div
                  key={img.name}
                  onClick={() => !img.isProtected && togglePartition(img.partition)}
                  className={`px-4 py-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? "bg-blue-50/60 dark:bg-blue-950/20"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={img.isProtected}
                      onChange={() => togglePartition(img.partition)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                          {img.name}
                        </span>
                        {img.isProtected && (
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-[10px] font-bold">
                            KHOÁ BẢO VỆ NVRAM/IMEI
                          </span>
                        )}
                        {img.isCritical && (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded text-[10px] font-bold">
                            BOOTLOADER
                          </span>
                        )}
                        {!img.isProtected && !img.isCritical && (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-bold">
                            HỆ THỐNG (SAFE)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Target Partition: {img.partition}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                    {(img.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* THAO TÁC BẮT ĐẦU NẠP ROM & TIẾN TRÌNH */}
      {scanResult && (
        <div className="shrink-0 bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Thực thi nạp ROM Fastboot
              </h3>
            </div>

            {!isFlashing ? (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!activeDevice || (codenameMismatch && !bypassCodenameCheck)}
                className={`px-8 py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 ${
                  !activeDevice || (codenameMismatch && !bypassCodenameCheck)
                    ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20"
                }`}
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>NẠP ROM FASTBOOT NGAY</span>
              </button>
            ) : (
              <button
                onClick={handleCancelFlash}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                <span>Hủy nạp ROM</span>
              </button>
            )}
          </div>

          {/* PROGRESS BAR */}
          {flashProgress && (
            <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {flashProgress.message}
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {flashProgress.percentage}% ({flashProgress.step}/{flashProgress.totalSteps})
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${flashProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* REALTIME TERMINAL LOG */}
          {flashLogs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                <span className="flex items-center gap-1.5">
                  <TerminalIcon className="w-3.5 h-3.5" /> Nhật ký Fastboot Output
                </span>
                <span>{flashLogs.length} dòng log</span>
              </div>
              <div className="h-48 overflow-y-auto bg-slate-950 text-emerald-400 font-mono text-[11px] p-3 rounded-xl border border-slate-800 space-y-1">
                {flashLogs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )}

      {/* SUBTAB 2: HƯỚNG DẪN SỬ DỤNG & QUY CHUẨN AN TOÀN */}
      {subTab === "guide" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* BANNER TỔNG QUAN */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[11px] font-black uppercase tracking-wider">
                Quy Trình Chuẩn Quốc Tế
              </span>
              <h3 className="text-xl font-black tracking-tight text-white mt-1">
                Cẩm Nang & Quy Chuẩn Nạp ROM Fastboot Toàn Diện
              </h3>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Nạp ROM Fastboot là phương thức can thiệp sâu nhất ở cấp độ Bootloader. Đọc kỹ hướng dẫn này giúp bạn hiểu rõ từng bước, ngăn ngừa 100% rủi ro Hard-Brick và tối ưu hóa hệ thống an toàn tuyệt đối.
              </p>
            </div>
          </div>

          {/* SECTION 1: CHECKLIST CHUẨN BỊ */}
          <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm">
                1
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Chuẩn bị trước khi nạp ROM (Prerequisites)
                </h4>
                <p className="text-xs text-slate-400">Những điều kiện tiên quyết bắt buộc phải đáp ứng</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Cáp kết nối & Cổng USB</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Ưu tiên cáp USB zin theo máy. Cắm trực tiếp vào <strong>cổng USB phía sau thùng máy (Mainboard)</strong> trên PC, tuyệt đối tránh dùng cổng mở rộng (Hub USB) để chống ngắt kết nối giữa chừng.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Mức dung lượng Pin</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Pin thiết bị phải còn <strong>tối thiểu từ 60% trở lên</strong>. Tuyệt đối không nạp ROM khi máy đang yếu pin vì sập nguồn giữa lúc flash phân vùng hệ thống sẽ gây mất boot.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Trạng thái Bootloader (Unlocked)</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Máy bắt buộc đã được <strong>Mở khóa Bootloader (Unlocked)</strong> trước đó. Bạn có thể quan sát biểu tượng ổ khóa mở ở màn hình khởi động hoặc badge kiểm tra trên Tool.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Sao lưu dữ liệu cá nhân</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Khi chọn chế độ <strong>Clean Flash</strong>, toàn bộ hình ảnh, tin nhắn, danh bạ sẽ bị xóa sạch. Hãy sao lưu dữ liệu quan trọng ra máy tính hoặc đám mây trước khi thực hiện.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: XÁC ĐỊNH CODENAME & CHỐNG BRICK */}
          <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-sm">
                2
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Xác định chính xác thiết bị (Codename Verification)
                </h4>
                <p className="text-xs text-slate-400">Nguyên tắc sống còn để tránh nạp nhầm bản phần mềm</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Mỗi dòng máy Android đều có một mã định danh phần cứng duy nhất (Codename). Flash nhầm build của dòng máy khác là nguyên nhân brick phổ biến nhất. KT_ADB_Tool tự động trích xuất và đối chiếu hai chiều:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-2 font-mono text-[11px]">
                <div className="text-xs font-bold text-emerald-400 font-sans flex items-center gap-1.5">
                  <TerminalIcon className="w-4 h-4" /> Các lệnh tra cứu thủ công (ADB Mode):
                </div>
                <div className="bg-black/50 p-2.5 rounded-xl space-y-1 text-slate-300">
                  <p><span className="text-blue-400">adb</span> shell getprop ro.product.device</p>
                  <p><span className="text-blue-400">adb</span> shell getprop ro.product.model</p>
                  <p><span className="text-blue-400">adb</span> shell getprop ro.build.version.release</p>
                  <p><span className="text-blue-400">adb</span> shell getprop ro.build.version.security_patch</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-2 font-mono text-[11px]">
                <div className="text-xs font-bold text-amber-400 font-sans flex items-center gap-1.5">
                  <TerminalIcon className="w-4 h-4" /> Các lệnh tra cứu ở chế độ Fastboot:
                </div>
                <div className="bg-black/50 p-2.5 rounded-xl space-y-1 text-slate-300">
                  <p><span className="text-amber-400">fastboot</span> getvar product</p>
                  <p><span className="text-amber-400">fastboot</span> getvar unlocked</p>
                  <p><span className="text-amber-400">fastboot</span> getvar current-slot</p>
                  <p><span className="text-amber-400">fastboot</span> getvar is-userspace</p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: 3 CHẾ ĐỘ NẠP ROM */}
          <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm">
                3
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Phân biệt & Lựa chọn 3 Chế độ nạp ROM (Presets)
                </h4>
                <p className="text-xs text-slate-400">Chọn đúng kịch bản phù hợp với nhu cầu của bạn</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* CLEAN FLASH */}
              <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">flash_all.bat</span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-black rounded-full">AN TOÀN</span>
                </div>
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">Clean Flash (Khuyên dùng)</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Format sạch toàn bộ phân vùng Userdata/Metadata. Giúp thiết bị hoạt động ổn định nhất, không bị xung đột cache cũ. Giữ Bootloader luôn Unlocked.
                </p>
              </div>

              {/* KEEP DATA */}
              <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">flash_all_except_storage.bat</span>
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 text-[10px] font-black rounded-full">KEEP DATA</span>
                </div>
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">Save Data (Cập nhật)</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bỏ qua lệnh xóa dữ liệu người dùng. Thích hợp khi bạn cập nhật phiên bản mới cùng loại ROM. Giữ Bootloader Unlocked.
                </p>
              </div>

              {/* CLEAN & LOCK */}
              <div className="p-4 rounded-2xl border border-red-300 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-red-700 dark:text-red-300">flash_all_lock.bat</span>
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-600 text-[10px] font-black rounded-full">NGUY HIỂM CỰC CAO</span>
                </div>
                <h5 className="text-xs font-bold text-red-600 dark:text-red-400">Clean All & Khóa Bootloader</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Khóa lại Bootloader (OEM Lock). <strong>CHỈ DÙNG</strong> khi về lại ROM gốc chính hãng của đúng thị trường máy (ví dụ: máy chính hãng VN về ROM Global/VN). Cấm dùng cho máy xách tay.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: TÙY CHỌN NÂNG CAO */}
          <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm">
                4
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Tùy chọn Patch Root, Slot A/B & Vbmeta
                </h4>
                <p className="text-xs text-slate-400">Hiểu rõ các tính năng nâng cao trong quá trình flash</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 text-purple-600 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>Magisk Alpha / FolkPatch</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tool sẽ tự động chọn file `boot_alpha.img` hoặc `boot_folkpatch.img` có trong ROM để nạp thay cho boot gốc, giúp máy có Root ngay sau lần khởi động đầu tiên.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                  <Layers className="w-4 h-4" />
                  <span>Dual Slot A/B Mode</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Nạp đồng thời cho cả phân vùng `_a` và `_b`. Đảm bảo cả hai slot đều có cùng firmware mới, loại bỏ nguy cơ máy tự đổi slot và bị bootloop.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Vbmeta Disable Verity</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Thêm cờ `--disable-verity --disable-verification` khi nạp file vbmeta, vô hiệu hóa cơ chế xác thực AVB2.0 để tránh bị từ chối khởi động khi can thiệp hệ thống.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 5: CỨU HỘ & TROUBLESHOOTING */}
          <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-sm">
                5
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Xử lý sự cố thường gặp (Troubleshooting & FAQs)
                </h4>
                <p className="text-xs text-slate-400">Cách xử lý nhanh khi gặp lỗi trong quá trình thực hiện</p>
              </div>
            </div>

            <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-700/50">
              <div className="pt-3 first:pt-0 space-y-1">
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                  Máy bị kẹt ở màn hình Fastboot hoặc vòng lặp khởi động (Bootloop)?
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-5">
                  Không hoảng loạn. Hãy tải đúng ROM gốc (Fastboot TGZ) của dòng máy bạn, giải nén và dùng Tool nạp lại ở chế độ <strong>flash_all.bat (Clean Flash)</strong>, đảm bảo đã bật <strong>Vbmeta Disable Verity</strong>.
                </p>
              </div>

              <div className="pt-3 space-y-1">
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                  Tool không nhận thiết bị ở chế độ Fastboot trên máy tính?
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-5">
                  Mở <em>Device Manager</em> trên Windows để kiểm tra xem có mục có dấu chấm than vàng (Android Device / Kedacom USB Device) hay không. Cài đặt lại <strong>Google USB Driver</strong> hoặc đổi cổng USB cắm trực tiếp.
                </p>
              </div>

              <div className="pt-3 space-y-1">
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                  Tại sao nạp ROM Fastboot lại an toàn hơn nạp qua Recovery (TWRP/OrangeFox)?
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-5">
                  Fastboot flash trực tiếp từng khối phân vùng (`super`, `boot`, `xbl`, `modem`...) từ máy tính vào chip nhớ mà không phụ thuộc vào hệ điều hành Recovery trên máy, nạp sạch và đầy đủ firmware gốc nhất.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 6: GHI NHẬN NGUỒN CỘNG ĐỒNG */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 border border-blue-200/80 dark:border-blue-800/40 backdrop-blur-xl shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Nguồn Tham Khảo & Đóng Góp Cộng Đồng
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Các quy chuẩn nạp ROM, bảng đối chiếu Codename thiết bị và kịch bản an toàn được tham khảo và hoàn thiện với sự đóng góp quý báu từ cộng đồng:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href="https://t.me/nothingscom"
                onClick={(e) => handleOpenUrl("https://t.me/nothingscom", e)}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500 flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                    NVN
                  </span>
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-100 group-hover:text-blue-500 transition-colors">
                      NothingsVN Community
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">t.me/nothingscom</span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </a>

              <a
                href="https://t.me/ximitoolgroup"
                onClick={(e) => handleOpenUrl("https://t.me/ximitoolgroup", e)}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-500 flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    XMT
                  </span>
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-100 group-hover:text-indigo-500 transition-colors">
                      XiMi Tool Group
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">t.me/ximitoolgroup</span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẢNH BÁO NGUY HIỂM KHÓA BOOTLOADER */}
      {showLockWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-red-500 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded text-[10px] font-black uppercase tracking-wider">
                  High Risk Action
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                  CẢNH BÁO KHÓA LẠI BOOTLOADER
                </h3>
              </div>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-2xl space-y-2.5 text-xs text-red-800 dark:text-red-200 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Những rủi ro nghiêm trọng bạn cần biết:</span>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-[11px] text-red-900 dark:text-red-200/90">
                <li>
                  <strong>Nguy cơ Brick máy vĩnh viễn (The system has been destroyed):</strong> Nếu thiết bị là máy nội địa Trung Quốc (China xách tay) mà bạn đang flash ROM Quốc tế (Global / EU / India...), việc khóa Bootloader sẽ khiến máy bị <strong>Hard-Brick ngay lập tức</strong> khi khởi động!
                </li>
                <li>
                  <strong>Cực kỳ khó mở khóa lại:</strong> Chính sách Xiaomi HyperOS và MIUI đời mới yêu cầu tài khoản Level 5 Mi Community hoặc tài khoản ủy quyền EDL chính hãng rất đắt đỏ để xin mở lại Bootloader.
                </li>
                <li>
                  <strong>Chỉ nên khóa khi nào?</strong> Chỉ khóa khi máy là <strong>bản chính hãng xuất xưởng đúng phân vùng</strong> và bạn đang nạp lại <strong>đúng bản ROM gốc của hãng</strong> để mang đi bảo hành.
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Nhập chữ <span className="font-mono text-red-600 font-black">LOCK</span> để xác nhận bạn hiểu rủi ro:
              </label>
              <input
                type="text"
                value={lockConfirmInput}
                onChange={(e) => setLockConfirmInput(e.target.value)}
                placeholder="Gõ LOCK vào đây để mở khóa tùy chọn..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowLockWarningModal(false);
                  setLockBootloader(false);
                }}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
              >
                Hủy / Giữ Bootloader Mở (An toàn)
              </button>
              <button
                type="button"
                disabled={lockConfirmInput.trim().toUpperCase() !== "LOCK"}
                onClick={() => {
                  setLockBootloader(true);
                  setWipeData(true);
                  setShowLockWarningModal(false);
                }}
                className={`px-6 py-2.5 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                  lockConfirmInput.trim().toUpperCase() === "LOCK"
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/30"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Tôi Chấp Nhận & Muốn Khóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL TRƯỚC KHI NẠP ROM */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="w-7 h-7 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Xác nhận nạp ROM Fastboot
              </h3>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="font-semibold text-red-500">
                ⚠️ CẢNH BÁO AN TOÀN: Tuyệt đối KHÔNG rút cáp USB hoặc bấm phím cứng trong suốt quá trình nạp ROM!
              </p>

              {lockBootloader ? (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>CẢNH BÁO: Tùy chọn KHÓA BOOTLOADER (flash_all_lock.bat) đang BẬT!</span>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Bootloader sẽ được GIỮ MỞ KHÓA (An toàn chống brick).</span>
                </div>
              )}

              <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400">
                <li>Thiết bị: <strong>{activeDevice}</strong> ({deviceInfo?.product})</li>
                <li>Thư mục ROM: <strong className="font-mono">{romPath}</strong></li>
                <li>Chế độ nạp: <strong>{lockBootloader ? "flash_all_lock.bat (Clean & Lock)" : wipeData ? "flash_all.bat (Clean Flash)" : "flash_all_except_storage.bat (Keep Data)"}</strong></li>
                <li>Format Data: <strong>{wipeData ? "Có (Clean Flash)" : "Không (Update)"}</strong></li>
                <li>Option Root: <strong>{rootOption.toUpperCase()}</strong></li>
                <li>Chế độ Slot: <strong>{slotMode === "both" ? "Dual Slot (A/B)" : "Slot Active"}</strong></li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleStartFlash}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>XÁC NHẬN NẠP ROM</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
