import { useState } from "react";
import {
  Sun,
  Moon,
  Monitor,
  Check,
  RefreshCw,
  FolderDown,
  Sliders,
} from "lucide-react";
import { useSettingsStore } from "../../../store/settingsStore";
import { toast } from "../../../store/toastStore";

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

      {/* 2. System Automation Controls */}
      <div className="space-y-4">
        <label className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
          2. Tự động hóa & Tùy chọn hệ thống
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
        </div>
      </div>

      {/* 3. Language & Regional Settings */}
      <div className="space-y-4">
        <label className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
          3. Ngôn ngữ hiển thị (Language)
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
