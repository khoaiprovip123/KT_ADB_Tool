import { useEffect, useRef } from "react";
import { TerminalSquare, Trash2, X, Download } from "lucide-react";
import { useDeviceStore } from "../../store/deviceStore";
import { toast } from "../../store/toastStore";

export function LogTerminal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { logs, clearLogs } = useDeviceStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen]);

  const downloadLogs = (format: "txt" | "json") => {
    if (logs.length === 0) {
      toast.warning("Không có dữ liệu nhật ký để xuất!");
      return;
    }

    let content = "";
    let mimeType = "text/plain";
    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "_");
    let filename = `adb_system_logs_${dateStr}`;

    if (format === "json") {
      content = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          totalLogs: logs.length,
          logs: logs,
        },
        null,
        2,
      );
      mimeType = "application/json";
      filename += ".json";
    } else {
      content = logs.join("\n");
      filename += ".txt";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl h-[520px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] border border-white/60 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="h-14 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between px-6 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 font-bold shrink-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
              <TerminalSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm">Nhật ký Hệ thống ADB</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadLogs("txt")}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-colors text-xs font-semibold"
              title="Xuất file .TXT"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>TXT</span>
            </button>

            <button
              onClick={() => downloadLogs("json")}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-colors text-xs font-semibold"
              title="Xuất file .JSON"
            >
              <Download className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>JSON</span>
            </button>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-1"></div>

            <button
              onClick={clearLogs}
              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-rose-500 transition-colors"
              title="Xóa nhật ký"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Đóng panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Terminal Console Output */}
        <div className="flex-1 p-5 overflow-y-auto font-mono text-xs bg-slate-950 text-emerald-400 leading-relaxed custom-scrollbar">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <TerminalSquare className="w-8 h-8 opacity-40" />
              <p>Chưa có nhật ký ghi nhận.</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="mb-1.5 break-all flex gap-2">
                <span className="text-slate-600 select-none">&gt;</span>
                <span className="flex-1">{log}</span>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}
