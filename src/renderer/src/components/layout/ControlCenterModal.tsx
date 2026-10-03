import React, { useState, useEffect } from "react";
import {
  Wifi,
  Settings,
  Smartphone,
  PowerOff,
  Cast,
  RotateCcw,
  Unplug,
  Loader2,
  Maximize2,
  Volume2,
  Camera,
  Video,
  ChevronLeft,
  Circle,
  Square,
  FolderOpen,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { useDeviceStore } from "../../store/deviceStore";
import { useSettingsStore } from "../../store/settingsStore";
import { toast } from "../../store/toastStore";

export function ControlCenterModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { activeDevice } = useDeviceStore();
  const { settings, updateSettings } = useSettingsStore();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [injectDenied, setInjectDenied] = useState(false);


  const borderless = !!settings.scrcpyBorderless;
  const audio = !!settings.scrcpyAudio;

  useEffect(() => {
    if (isOpen && activeDevice && window.api?.isScreenRecording) {
      window.api.isScreenRecording(activeDevice).then((rec) => setIsRecording(rec));
    }
  }, [isOpen, activeDevice]);

  const handleDisconnect = async () => {
    if (!activeDevice) return;
    setIsDisconnecting(true);
    await window.api.disconnectDevice(activeDevice);
    const devs = await window.api.getDevices();
    useDeviceStore.getState().setDevices(devs);
    setIsDisconnecting(false);
    onClose();
  };

  const runAction = (cmd: string) => {
    if (!activeDevice) return;
    window.api.runAdbCommand(activeDevice, cmd);
    onClose();
  };

  /**
   * Gọi navAction với cơ chế Fallback Intent.
   * Hiển thị toast nếu dùng fallback hoặc nếu bị từ chối quyền.
   */
  const runNavAction = async (
    action: "home" | "back" | "recents" | "screenOff",
  ) => {
    if (!activeDevice) return;
    try {
      const result = await window.api.navAction(activeDevice, action);
      if (result.success) {
        if (result.usedFallback) {
          toast.info(
            `Đã dùng Intent fallback (Home). Để bật phím ảo đầy đủ, hãy bật "Gỡ lỗi USB (Bảo mật)" trong Tùy chọn nhà phát triển.`,
          );
        }
        setInjectDenied(false);
        onClose();
      } else if (result.output === "INJECT_EVENTS_DENIED") {
        setInjectDenied(true);
        toast.error(
          "Thiết bị chưa cấp quyền INJECT_EVENTS. Nhấn nút \"Mở cài đặt bảo mật\" bên dưới để bật.",
        );
      } else {
        toast.error(`Thao tác thất bại: ${result.output}`);
      }
    } catch (e: any) {
      toast.error(`Lỗi: ${e?.message ?? "Unknown error"}`);
    }
  };

  const toggleBorderless = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateSettings({ scrcpyBorderless: !borderless });
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateSettings({ scrcpyAudio: !audio });
  };

  const runScrcpy = (turnScreenOff: boolean) => {
    if (!activeDevice) return;
    window.api.runScrcpy(activeDevice, turnScreenOff, borderless, audio);
    onClose();
  };

  const handleTakeScreenshot = async () => {
    if (!activeDevice || isCapturing) return;
    setIsCapturing(true);
    try {
      const res = await window.api.takeScreenshot(activeDevice);
      if (res.success && res.filePath) {
        toast.success("Đã chụp màn hình và sao chép vào bộ nhớ tạm (Clipboard)!");
      } else {
        toast.error(`Lỗi chụp màn hình: ${res.error || "Không xác định"}`);
      }
    } catch (e: any) {
      toast.error(`Lỗi chụp màn hình: ${e.message}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleToggleRecording = async () => {
    if (!activeDevice) return;
    if (isRecording) {
      setIsRecording(false);
      try {
        const res = await window.api.stopScreenRecord(activeDevice);
        if (res.success && res.filePath) {
          toast.success("Đã lưu video quay màn hình vào thư mục Videos!");
        } else {
          toast.error(`Lỗi lưu video: ${res.error || "Không thành công"}`);
        }
      } catch (e: any) {
        toast.error(`Lỗi dừng quay video: ${e.message}`);
      }
    } else {
      try {
        const res = await window.api.startScreenRecord(activeDevice);
        if (res.success) {
          setIsRecording(true);
          toast.info("Đang quay video màn hình thiết bị...");
        } else {
          toast.error(res.error || "Không thể bắt đầu quay video");
        }
      } catch (e: any) {
        toast.error(`Lỗi quay video: ${e.message}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      <div className="absolute top-16 right-8 w-84 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-3xl border border-white/50 dark:border-slate-800 shadow-2xl shadow-blue-900/20 p-5 z-50 animate-in fade-in slide-in-from-top-4 max-h-[88vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Trung tâm Điều khiển
          </h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            {activeDevice ? activeDevice.slice(0, 16) : "Chưa chọn thiết bị"}
          </span>
        </div>

        {/* Scrcpy Screen Mirroring Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <button
            onClick={() => runScrcpy(false)}
            className="col-span-2 flex items-center gap-3 p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <Cast className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <span className="block font-semibold text-xs">
                Phản chiếu Màn hình (Scrcpy)
              </span>
              <span className="block text-[11px] text-blue-200">
                Chiếu màn hình lên máy tính
              </span>
            </div>
          </button>

          <button
            onClick={() => runScrcpy(true)}
            className="col-span-2 flex items-center gap-3 p-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl transition-all shadow-md active:scale-[0.98]"
          >
            <Smartphone className="w-5 h-5 shrink-0 text-slate-400" />
            <div className="text-left">
              <span className="block font-semibold text-xs">
                Phản chiếu Bí mật (Tiết kiệm Pin)
              </span>
              <span className="block text-[11px] text-slate-400">
                Chiếu PC nhưng tắt màn hình điện thoại
              </span>
            </div>
          </button>
        </div>

        {/* Scrcpy Feature Toggles */}
        <div className="space-y-1.5 p-2 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl mb-3 border border-slate-200/60 dark:border-slate-700/60">
          {/* Borderless */}
          <div className="flex items-center justify-between p-1.5 px-2">
            <div className="flex items-center gap-2">
              <Maximize2 className={`w-3.5 h-3.5 ${borderless ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Chiếu không viền
              </span>
            </div>
            <button
              type="button"
              onClick={toggleBorderless}
              className={`w-8 h-4.5 rounded-full transition-colors p-0.5 relative shrink-0 ${
                borderless ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  borderless ? "translate-x-3.5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Audio Forwarding */}
          <div className="flex items-center justify-between p-1.5 px-2">
            <div className="flex items-center gap-2">
              <Volume2 className={`w-3.5 h-3.5 ${audio ? "text-violet-600 dark:text-violet-400" : "text-slate-400"}`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Truyền âm thanh ra PC
              </span>
            </div>
            <button
              type="button"
              onClick={toggleAudio}
              className={`w-8 h-4.5 rounded-full transition-colors p-0.5 relative shrink-0 ${
                audio ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  audio ? "translate-x-3.5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 1-Click Screen Capture & Record */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={handleTakeScreenshot}
            disabled={isCapturing || !activeDevice}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition-all border border-sky-200/60 dark:border-sky-800/60 active:scale-95"
            title="Chụp ảnh màn hình lưu vào Pictures và sao chép vào Clipboard"
          >
            {isCapturing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            <span className="text-xs font-semibold">Chụp màn hình</span>
          </button>

          <button
            onClick={handleToggleRecording}
            disabled={!activeDevice}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl transition-all border active:scale-95 ${
              isRecording
                ? "bg-red-600 text-white animate-pulse border-red-700"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border-rose-200/60 dark:border-rose-800/60"
            }`}
            title={isRecording ? "Đang quay màn hình - Bấm để kết thúc và lưu" : "Bắt đầu quay video màn hình (.mp4)"}
          >
            <Video className="w-4 h-4" />
            <span className="text-xs font-semibold">
              {isRecording ? "Dừng quay" : "Quay video"}
            </span>
          </button>
        </div>

        {/* Mở nhanh thư mục lưu trữ */}
        <div className="flex items-center justify-between px-1 mb-3 text-[11px] text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => window.api.openCaptureFolder("screenshots")}
            className="flex items-center gap-1 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            title="Mở thư mục chứa ảnh chụp màn hình"
          >
            <FolderOpen className="w-3.5 h-3.5" /> Mở thư mục ảnh
          </button>
          <button
            type="button"
            onClick={() => window.api.openCaptureFolder("videos")}
            className="flex items-center gap-1 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            title="Mở thư mục chứa video quay màn hình"
          >
            <FolderOpen className="w-3.5 h-3.5" /> Mở thư mục video
          </button>
        </div>

        {/* Android Navigation Keys */}
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center justify-between p-1.5 px-3 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Phím ảo:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => runNavAction("back")}
                className="p-1.5 px-2 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/50 hover:text-blue-600 transition-all text-xs font-semibold shadow-sm flex items-center gap-1 active:scale-90"
                title="Quay lại (Back)"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                onClick={() => runNavAction("home")}
                className="p-1.5 px-2 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/50 hover:text-blue-600 transition-all text-xs font-semibold shadow-sm flex items-center gap-1 active:scale-90"
                title="Trang chính (Home)"
              >
                <Circle className="w-3 h-3" /> Home
              </button>
              <button
                onClick={() => runNavAction("recents")}
                className="p-1.5 px-2 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/50 hover:text-blue-600 transition-all text-xs font-semibold shadow-sm flex items-center gap-1 active:scale-90"
                title="Đa nhiệm (Recents)"
              >
                <Square className="w-3 h-3" /> Menu
              </button>
            </div>
          </div>

          {/* Banner 1-click mở Dev Settings khi thiếu quyền INJECT_EVENTS */}
          {injectDenied && activeDevice && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Chưa bật &quot;Gỡ lỗi USB (Bảo mật)&quot;</span>
              </div>
              <button
                onClick={async () => {
                  if (!activeDevice) return;
                  await window.api.navAction(activeDevice, "openDevSettings");
                  toast.info("Đã mở Tùy chọn nhà phát triển trên thiết bị. Bật \"Gỡ lỗi USB (Cài đặt bảo mật)\" và kết nối lại.");
                }}
                className="flex items-center gap-1 shrink-0 font-bold underline hover:no-underline text-amber-700 dark:text-amber-400"
              >
                <ExternalLink className="w-3 h-3" /> Mở cài đặt
              </button>
            </div>
          )}
        </div>

        {/* Quick Settings Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <ActionBtn
            icon={<Wifi />}
            label="Bật/Tắt WiFi"
            onClick={() => runAction("svc wifi enable")}
            color="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
          />
          <ActionBtn
            icon={<RotateCcw />}
            label="Tự động Xoay"
            onClick={() =>
              runAction("settings put system accelerometer_rotation 1")
            }
            color="bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100"
          />
          <ActionBtn
            icon={<Settings />}
            label="Cài đặt Android"
            onClick={() => runAction("am start -a android.settings.SETTINGS")}
            color="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
          />
          <ActionBtn
            icon={<PowerOff />}
            label="Tắt màn hình"
            onClick={() => runNavAction("screenOff")}
            color="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100"
          />
        </div>

        {/* Nút Xóa / Ngắt kết nối thiết bị */}
        {activeDevice && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold text-xs transition-colors border border-red-200/60 dark:border-red-800/60 shadow-sm"
              title="Xóa / Ngắt kết nối thiết bị đang chọn"
            >
              {isDisconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
              ) : (
                <Unplug className="w-3.5 h-3.5" />
              )}
              <span>Xóa / Ngắt kết nối thiết bị này</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  color,
}: {
  icon: React.ReactElement;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 p-2.5 rounded-xl transition-all ${color} border border-transparent hover:border-black/5 active:scale-95`}
    >
      {React.cloneElement(icon, { className: "w-4 h-4 shrink-0" })}
      <span className="text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
        {label}
      </span>
    </button>
  );
}
