import { useState, useEffect } from "react";
import { Sparkles, Download, X, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "../../store/toastStore";

export interface UpdateInfo {
  available: boolean;
  version: string;
  changelog: string;
  downloadUrl: string | null;
}

export function UpdateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!window.api?.onUpdateAvailable) return;

    const unsubAvailable = window.api.onUpdateAvailable((info) => {
      if (info && info.available) {
        setUpdateInfo(info);
        setIsOpen(true);
      }
    });

    return () => {
      unsubAvailable();
    };
  }, []);

  if (!isOpen || !updateInfo) return null;

  const handleDownloadAndInstall = async () => {
    if (!updateInfo.downloadUrl) {
      toast.error("Không tìm thấy đường dẫn tải bản cập nhật.");
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setErrorMsg(null);

    const unsubProgress = window.api.onUpdateProgress((progress) => {
      setDownloadProgress(progress);
    });

    try {
      await window.api.downloadAndInstallUpdate(updateInfo.downloadUrl);
      setDownloadProgress(100);
      toast.success("Tải hoàn tất! Đang khởi chạy bộ cài đặt và nâng cấp...");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Quá trình tải về bản cập nhật gặp lỗi.");
      setIsDownloading(false);
      toast.error(`Cập nhật thất bại: ${err.message}`);
    } finally {
      unsubProgress();
    }
  };

  const handleClose = () => {
    if (isDownloading) return; // Tránh đóng khi đang tải
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/40 dark:border-slate-800 shadow-2xl shadow-indigo-500/20 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Gradient Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

        {/* Header section */}
        <div className="p-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-full border border-indigo-200 dark:border-indigo-800/50 mb-1">
                Phiên bản mới
              </span>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Phát hiện bản cập nhật v{updateInfo.version}
              </h3>
            </div>
          </div>
          
          {!isDownloading && (
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="px-6 py-2 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Một phiên bản nâng cấp mới đã sẵn sàng cho ứng dụng của bạn. Hãy cập nhật ngay để trải nghiệm các tính năng & cải tiến mới nhất!
          </p>

          {/* Changelog Card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Nội dung cập nhật mới</span>
            </div>
            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed pr-1 custom-scrollbar">
              {updateInfo.changelog || "• Cải tiến hiệu năng & nâng cao trải nghiệm người dùng."}
            </div>
          </div>

          {/* Download Progress Bar if downloading */}
          {isDownloading && (
            <div className="space-y-2 pt-2 animate-in fade-in">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Đang tải bản cập nhật...
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-mono">{downloadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${Math.max(downloadProgress, 5)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Ứng dụng sẽ tự động khởi động lại và hoàn tất cài đặt khi tải xong.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3">
          {!isDownloading ? (
            <>
              <button
                onClick={handleClose}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95"
              >
                Để sau
              </button>
              <button
                onClick={handleDownloadAndInstall}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Nâng cấp ngay</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium py-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Đang xử lý gói cài đặt ở chế độ nền...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
