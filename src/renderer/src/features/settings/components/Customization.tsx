import { useState } from "react";
import {
  Sun,
  Moon,
  Monitor,
  Check,
  RefreshCw,
  FolderDown,
  Sliders,
  Minimize2,
  Maximize2,
  Image,
  Upload,
  Trash2,
  Sparkles,
  Palette,
  Eye,
  Volume2,
} from "lucide-react";
import { useSettingsStore } from "../../../store/settingsStore";
import { toast } from "../../../store/toastStore";
import { WALLPAPER_PRESETS } from "../constants/wallpapers";

export default function Customization() {
  const { settings, updateSettings } = useSettingsStore();
  const theme = settings.theme || "system";
  const [language, setLanguage] = useState("vi");

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    updateSettings({ theme: newTheme });
    toast.success(
      `Đã chuyển sang giao diện ${
        newTheme === "light"
          ? "Sáng (Light)"
          : newTheme === "dark"
          ? "Tối (Dark)"
          : "Theo hệ thống"
      }`
    );
  };

  const handleToggleAutoRefresh = () => {
    const nextVal = !settings.autoRefresh;
    updateSettings({ autoRefresh: nextVal });
    toast.info(nextVal ? "Đã bật tự động làm mới thiết bị" : "Đã tắt tự động làm mới thiết bị");
  };

  const handleToggleAutoBackup = () => {
    const nextVal = !settings.autoBackupApk;
    updateSettings({ autoBackupApk: nextVal });
    toast.info(nextVal ? "Đã bật tự động sao lưu APK khi trích xuất" : "Đã tắt tự động sao lưu APK");
  };

  const handleToggleMinimizeToTray = () => {
    const nextVal = settings.minimizeToTray === false ? true : false;
    updateSettings({ minimizeToTray: nextVal });
    toast.info(
      nextVal
        ? "Đã bật thu nhỏ xuống Khay Hệ Thống khi đóng ứng dụng"
        : "Đã tắt thu nhỏ xuống Khay Hệ Thống (bấm [X] sẽ thoát app hoàn toàn)",
    );
  };

  const handleToggleScrcpyBorderless = () => {
    const nextVal = !settings.scrcpyBorderless;
    updateSettings({ scrcpyBorderless: nextVal });
    toast.info(
      nextVal
        ? "Đã bật chế độ chiếu không viền (Borderless)"
        : "Đã tắt chế độ chiếu không viền (dùng khung viền mặc định)",
    );
  };

  const handleToggleScrcpyAudio = () => {
    const nextVal = !settings.scrcpyAudio;
    updateSettings({ scrcpyAudio: nextVal });
    toast.info(
      nextVal
        ? "Đã bật truyền âm thanh điện thoại lên PC qua Scrcpy (Android 11+)"
        : "Đã tắt truyền âm thanh Scrcpy",
    );
  };

  const handleSelectPreset = (presetId: string) => {
    updateSettings({
      wallpaperType: "preset",
      wallpaperPreset: presetId,
    });
    toast.success(
      `Đã áp dụng hình nền "${WALLPAPER_PRESETS.find((p) => p.id === presetId)?.name}"`,
    );
  };

  const handleSelectCustomWallpaper = async () => {
    try {
      if (!window.api?.selectWallpaper) return;
      const res = await window.api.selectWallpaper();
      if (res && res.dataUrl) {
        updateSettings({
          wallpaperType: "custom",
          wallpaperCustomDataUrl: res.dataUrl,
        });
        toast.success(`Đã tải hình nền thành công: ${res.fileName}`);
      }
    } catch (err: any) {
      toast.error(`Lỗi tải hình nền: ${err.message || err}`);
    }
  };

  const handleRemoveCustomWallpaper = async () => {
    try {
      if (window.api?.removeCustomWallpaper) {
        await window.api.removeCustomWallpaper();
      }
      updateSettings({
        wallpaperType: "none",
        wallpaperCustomDataUrl: undefined,
      });
      toast.info("Đã khôi phục giao diện mặc định (không hình nền)");
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message || err}`);
    }
  };

  const handleDisableWallpaper = () => {
    updateSettings({ wallpaperType: "none" });
    toast.info("Đã dùng màu nền hệ thống mặc định");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Tùy chỉnh Giao diện & Hành vi</span>
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Cá nhân hóa chế độ hiển thị, màu sắc và tự động hóa hệ thống của phần mềm
          </p>
        </div>
      </div>

      {/* 1. Theme Appearance Section */}
      <div className="space-y-4">
        <label className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
          1. Chế độ nền (Appearance Theme)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Light Theme */}
          <button
            onClick={() => handleThemeChange("light")}
            className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-left ${
              theme === "light"
                ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 text-blue-900 dark:text-blue-200 shadow-md shadow-blue-500/10"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            {theme === "light" && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="w-full h-20 bg-slate-100 rounded-xl border border-slate-200 flex flex-col p-2 gap-1.5 overflow-hidden">
              <div className="w-full h-3 bg-white rounded-md shadow-sm" />
              <div className="w-2/3 h-2 bg-slate-300/80 rounded-md" />
              <div className="w-1/2 h-2 bg-blue-400/80 rounded-md" />
            </div>
            <div className="flex items-center gap-2 font-bold text-xs">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Giao diện Sáng (Light)</span>
            </div>
          </button>

          {/* Dark Theme */}
          <button
            onClick={() => handleThemeChange("dark")}
            className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-left ${
              theme === "dark"
                ? "bg-slate-900 border-blue-500 text-white shadow-xl shadow-blue-500/10"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            {theme === "dark" && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="w-full h-20 bg-slate-950 rounded-xl border border-slate-800 flex flex-col p-2 gap-1.5 overflow-hidden">
              <div className="w-full h-3 bg-slate-800 rounded-md shadow-sm" />
              <div className="w-2/3 h-2 bg-slate-700 rounded-md" />
              <div className="w-1/2 h-2 bg-indigo-500 rounded-md" />
            </div>
            <div className="flex items-center gap-2 font-bold text-xs">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Giao diện Tối (Dark)</span>
            </div>
          </button>

          {/* System Theme */}
          <button
            onClick={() => handleThemeChange("system")}
            className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-left ${
              theme === "system"
                ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-600 text-indigo-900 dark:text-indigo-200 shadow-md shadow-indigo-500/10"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            {theme === "system" && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="w-full h-20 bg-gradient-to-r from-slate-100 to-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center">
              <Monitor className="w-7 h-7 text-slate-500 dark:text-slate-300" />
            </div>
            <div className="flex items-center gap-2 font-bold text-xs">
              <Monitor className="w-4 h-4 text-slate-500" />
              <span>Tự động theo Hệ điều hành</span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Wallpaper & Liquid Glassmorphism Section */}
      <div className="space-y-5 p-5 sm:p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
          <div>
            <label className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>2. Hình nền & Hiệu ứng Kính Mờ (Liquid Glass)</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Cài đặt hình nền nghệ thuật phủ dưới lớp kính mờ Liquid Glassmorphism sang trọng
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={handleDisableWallpaper}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                settings.wallpaperType === "none" || !settings.wallpaperType
                  ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Mặc định
            </button>
            <button
              onClick={() => {
                updateSettings({
                  wallpaperType: "preset",
                  wallpaperPreset: settings.wallpaperPreset || "aurora",
                });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                settings.wallpaperType === "preset"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Tuyển chọn
            </button>
            <button
              onClick={() => {
                if (settings.wallpaperCustomDataUrl) {
                  updateSettings({ wallpaperType: "custom" });
                } else {
                  handleSelectCustomWallpaper();
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                settings.wallpaperType === "custom"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Ảnh cá nhân
            </button>
          </div>
        </div>

        {/* PRESET GALLERY */}
        {settings.wallpaperType === "preset" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Chọn phong cách màu sắc:
              </span>
              <span className="text-[11px] text-slate-400">
                6 bộ gradient phong cách Glassmorphism
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {WALLPAPER_PRESETS.map((preset) => {
                const isSelected =
                  settings.wallpaperPreset === preset.id ||
                  (!settings.wallpaperPreset && preset.id === "aurora");
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`relative group p-3 rounded-2xl border-2 transition-all flex flex-col text-left overflow-hidden ${
                      isSelected
                        ? "border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20"
                        : "border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Visual Color Pill preview */}
                    <div
                      className="w-full h-16 rounded-xl shadow-inner mb-2.5 transition-transform duration-300 group-hover:scale-[1.02] flex items-end p-2 relative overflow-hidden"
                      style={{ background: preset.gradient }}
                    >
                      <div className="absolute inset-0 bg-black/10" />
                      <span className="relative z-10 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-black/40 text-white backdrop-blur-md">
                        {preset.badge}
                      </span>
                    </div>

                    <div className="flex items-center justify-between w-full">
                      <div className="min-w-0 pr-1">
                        <h5 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                          {preset.name}
                        </h5>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {preset.category}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CUSTOM WALLPAPER UPLOADER */}
        {settings.wallpaperType === "custom" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {settings.wallpaperCustomDataUrl ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-24 h-16 rounded-xl overflow-hidden shadow-md shrink-0 border border-white/40 dark:border-slate-700 relative">
                    <img
                      src={settings.wallpaperCustomDataUrl}
                      alt="Ảnh nền tùy chọn"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Image className="w-4 h-4 text-purple-500" />
                      <span>Hình nền cá nhân đang áp dụng</span>
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Ảnh được lưu giữ vĩnh viễn trên máy tính của bạn
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleSelectCustomWallpaper}
                    className="px-3.5 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 rounded-xl text-xs font-bold transition-all border border-purple-200 dark:border-purple-800 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Đổi ảnh khác</span>
                  </button>
                  <button
                    onClick={handleRemoveCustomWallpaper}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                    title="Xóa ảnh nền này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={handleSelectCustomWallpaper}
                className="cursor-pointer border-2 border-dashed border-purple-300 dark:border-purple-800/60 hover:border-purple-500 p-8 rounded-2xl flex flex-col items-center justify-center gap-3 text-center bg-purple-50/30 dark:bg-purple-950/10 transition-all hover:bg-purple-50/60"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center shadow-inner">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    Bấm vào đây để chọn ảnh nền từ máy tính
                  </h5>
                  <p className="text-xs text-slate-400 mt-1">
                    Hỗ trợ định dạng JPG, PNG, WebP hoặc ảnh chụp màn hình
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BLUR & OPACITY TUNING SLIDERS (Only shown when wallpaper is active) */}
        {settings.wallpaperType && settings.wallpaperType !== "none" && (
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
            {/* Blur slider */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-500" />
                  Độ mờ hậu cảnh (Blur)
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  {settings.wallpaperBlur ?? 20}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="2"
                value={settings.wallpaperBlur ?? 20}
                onChange={(e) =>
                  updateSettings({ wallpaperBlur: parseInt(e.target.value, 10) })
                }
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-medium">
                <span>Rõ nét (0px)</span>
                <span>Mờ tự nhiên (20px)</span>
                <span>Mờ sâu (40px)</span>
              </div>
            </div>

            {/* Overlay Darkness / Glass Tint slider */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-500" />
                  Độ phủ tương phản (Glass Tint)
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                  {settings.wallpaperOverlay ?? 35}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={settings.wallpaperOverlay ?? 35}
                onChange={(e) =>
                  updateSettings({
                    wallpaperOverlay: parseInt(e.target.value, 10),
                  })
                }
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-medium">
                <span>Trong suốt (10%)</span>
                <span>Cân bằng (35%)</span>
                <span>Đậm dịu mắt (80%)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. System Automation Controls */}
      <div className="space-y-4">
        <label className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
          3. Tự động hóa & Tùy chọn hệ thống
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                  Tự động làm mới danh sách thiết bị
                </h4>
                <p className="text-[11px] text-slate-400">
                  Quét và cập nhật trạng thái thiết bị ADB mỗi 4 giây
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleAutoRefresh}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 relative shrink-0 ${
                settings.autoRefresh ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.autoRefresh ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FolderDown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                  Tự động lưu file nén APK Bundle
                </h4>
                <p className="text-[11px] text-slate-400">
                  Tạo file ZIP khi trích xuất ứng dụng có nhiều split APKs
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleAutoBackup}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 relative shrink-0 ${
                settings.autoBackupApk ? "bg-purple-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.autoBackupApk ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Minimize2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                  Thu nhỏ xuống Khay Hệ Thống (System Tray)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Khi đóng ứng dụng hoặc phản chiếu màn hình, app sẽ chạy ngầm ở góc taskbar thay vì tắt hẳn
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleMinimizeToTray}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 relative shrink-0 ${
                settings.minimizeToTray !== false ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.minimizeToTray !== false ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Maximize2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                  Chiếu Scrcpy Không Viền (Borderless)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Ẩn toàn bộ viền và thanh tiêu đề khi phản chiếu màn hình (Giữ phím Alt để kéo di chuyển cửa sổ)
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleScrcpyBorderless}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 relative shrink-0 ${
                settings.scrcpyBorderless ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.scrcpyBorderless ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                  Truyền Âm Thanh Scrcpy (Audio Forwarding)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Phát trực tiếp âm thanh điện thoại ra loa máy tính (Opus Codec chất lượng cao - Hỗ trợ Android 11+)
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleScrcpyAudio}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 relative shrink-0 ${
                settings.scrcpyAudio ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.scrcpyAudio ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Language & Regional Settings */}
      <div className="space-y-4">
        <label className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
          4. Ngôn ngữ hiển thị (Language)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setLanguage("vi")}
            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
              language === "vi"
                ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇻🇳</span>
              <div className="text-left">
                <h4 className="font-bold text-xs">Tiếng Việt</h4>
                <p className="text-[10px] text-slate-400">Ngôn ngữ mặc định hệ thống</p>
              </div>
            </div>
            {language === "vi" && <Check className="w-4 h-4 text-emerald-600" />}
          </button>

          <button
            onClick={() => {
              setLanguage("en");
              toast.info("English language pack will be supported in v2.5!");
            }}
            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
              language === "en"
                ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 opacity-60"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇺🇸</span>
              <div className="text-left">
                <h4 className="font-bold text-xs">English (US)</h4>
                <p className="text-[10px] text-slate-400">Sắp hỗ trợ ở bản tiếp theo</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
