import React, { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Terminal, X, Zap, HardDrive, Cpu } from "lucide-react";
import { CleanProgressData } from "@shared/types";

interface CleaningProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progressData: CleanProgressData | null;
  logs: string[];
}

export const CleaningProgressModal: React.FC<CleaningProgressModalProps> = ({
  isOpen,
  onClose,
  progressData,
  logs,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (!isOpen) return null;

  const isComplete = progressData?.isComplete ?? false;
  const hasFailures = (progressData?.summary?.failedTasksCount ?? 0) > 0;
  const percentage = progressData?.percentage || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isComplete ? hasFailures ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-600/10 text-blue-600'}`}>
              {isComplete ? hasFailures ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {isComplete ? hasFailures ? "Dọn Dẹp Hoàn Tất Một Phần" : "Hoàn Tất Dọn Dẹp" : "Đang Tiến Hành Dọn Dẹp..."}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {progressData?.message || "Đang kết nối tới thiết bị ADB..."}
              </p>
            </div>
          </div>
          {isComplete && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500 dark:text-slate-400">Tiến trình</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">{percentage}%</span>
            </div>
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Results Summary Grid (Khi hoàn tất) */}
          {isComplete && progressData?.summary && (
            <div className="grid grid-cols-3 gap-3 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-center">
                <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">RAM Giải Phóng</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  +{progressData.summary.freedRamMb} MB
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-center">
                <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Bộ Nhớ Đã Dọn</span>
                <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                  +{progressData.summary.freedStorageMb} MB
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-center">
                <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-1" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">App Đã Đóng</span>
                <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                  {progressData.summary.closedAppsCount} App
                </span>
              </div>
            </div>
          )}

          {/* Terminal Console Stream */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Terminal className="w-4 h-4 text-slate-400" />
              <span>Nhật ký lệnh thực thi ADB Realtime:</span>
            </div>
            <div className="bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-xs h-48 overflow-y-auto space-y-1 shadow-inner border border-slate-800">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">Đang khởi chạy kịch bản...</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed whitespace-pre-wrap">
                    {log.startsWith("[LỖI]") ? (
                      <span className="text-red-400">{log}</span>
                    ) : log.startsWith("===") ? (
                      <span className="text-emerald-400 font-bold">{log}</span>
                    ) : (
                      <span className="text-slate-300">{log}</span>
                    )}
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            disabled={!isComplete}
            onClick={onClose}
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
              isComplete
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-600/20"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isComplete ? "Hoàn Tất" : "Đang xử lý..."}
          </button>
        </div>
      </div>
    </div>
  );
};
