import { Check, Copy } from "lucide-react";
import { CommandHistoryItem } from "../types";

interface HistoryPanelProps {
  historyItems: CommandHistoryItem[];
  copiedKey: string | null;
  handleCopyToClipboard: (text: string, label: string) => void;
}

export function HistoryPanel({
  historyItems,
  copiedKey,
  handleCopyToClipboard,
}: HistoryPanelProps) {
  const getRiskBadgeStyles = (risk: string) => {
    switch (risk) {
      case "SAFE":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "MEDIUM":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "RISKY":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "DANGEROUS":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20 font-black";
      default:
        return "bg-slate-500/10 text-slate-655 border-slate-500/20";
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0 select-none">
        <div>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
            Lịch sử lệnh đã thực thi
          </h4>
          <p className="text-xs text-slate-450 font-semibold">
            Danh sách lưu vết tất cả các lệnh đã thực hiện trong phiên hiện tại.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-4 custom-scrollbar rounded-2xl border border-slate-200/60 bg-slate-50/20 min-h-0">
        {historyItems.length === 0 ? (
          <div className="py-24 text-center text-slate-400 font-bold select-none">
            Chưa có lệnh nào được lưu lịch sử.
          </div>
        ) : (
          <div className="divide-y divide-slate-200/60">
            {historyItems.map((item, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-3">
                <div className="flex justify-between items-start flex-wrap gap-2 select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-450">{item.timestamp}</span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${getRiskBadgeStyles(
                        item.risk
                      )}`}
                    >
                      {item.risk}
                    </span>
                  </div>

                  <span
                    className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase ${
                      item.success
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                    }`}
                  >
                    {item.success ? "Thành công" : "Thất bại"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="font-mono text-xs font-black text-slate-800 break-all select-all flex-1">
                    adb shell {item.command}
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(`adb shell ${item.command}`, "lệnh")}
                    className="p-2 hover:bg-slate-100 text-slate-400 hover:text-indigo-650 rounded-xl transition-colors border border-transparent hover:border-slate-200 shrink-0"
                    title="Copy lệnh"
                  >
                    {copiedKey === `adb shell ${item.command}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {item.output && (
                  <div className="bg-slate-900 border border-white/5 rounded-xl p-3 max-h-32 overflow-y-auto custom-scrollbar font-mono text-[10px] text-cyan-400 select-all leading-normal whitespace-pre-wrap break-all shadow-inner">
                    {item.output}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
