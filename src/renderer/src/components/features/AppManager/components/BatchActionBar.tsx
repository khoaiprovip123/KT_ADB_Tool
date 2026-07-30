import { motion } from "framer-motion";
import { Trash2, PowerOff, CheckCircle2, Undo2, X } from "lucide-react";

interface BatchBtnProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}

function BatchBtn({ icon, label, onClick, color }: BatchBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase group whitespace-nowrap shrink-0 ${color}`}
    >
      <div className="shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );
}

interface BatchActionBarProps {
  selectedCount: number;
  batchProgress: { current: number; total: number; action: string } | null;
  onBatchAction: (
    action: "uninstall" | "disable" | "enable" | "clear" | "stop" | "restore",
  ) => void;
  onClearSelection: () => void;
}

export function BatchActionBar({
  selectedCount,
  batchProgress,
  onBatchAction,
  onClearSelection,
}: BatchActionBarProps) {
  if (selectedCount === 0 && !batchProgress) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 max-w-[calc(100vw-3rem)] bg-slate-900/95 backdrop-blur-2xl border border-white/20 p-2 rounded-full shadow-2xl flex items-center gap-2 z-50 overflow-x-auto custom-scrollbar shrink-0"
    >
      <div className="pl-3 pr-2 py-1.5 flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xs shrink-0">
          {selectedCount}
        </div>
        <span className="text-white font-semibold text-xs whitespace-nowrap">
          Đã chọn
        </span>
      </div>

      <div className="flex items-center shrink-0">
        {batchProgress ? (
          <div className="px-4 py-1.5 min-w-[240px]">
            <div className="flex justify-between text-xs text-white/70 mb-1 font-medium">
              <span>Đang xử lý ({batchProgress.action})...</span>
              <span>
                {batchProgress.current} / {batchProgress.total}
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{
                  width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <BatchBtn
              icon={<Trash2 size={15} />}
              label="Gỡ bỏ"
              onClick={() => onBatchAction("uninstall")}
              color="hover:bg-red-500/90 text-white hover:shadow-lg hover:shadow-red-500/20"
            />
            <BatchBtn
              icon={<PowerOff size={15} />}
              label="Vô hiệu"
              onClick={() => onBatchAction("disable")}
              color="hover:bg-orange-500/90 text-white hover:shadow-lg hover:shadow-orange-500/20"
            />
            <div className="w-px h-5 bg-white/15 mx-1 shrink-0" />
            <BatchBtn
              icon={<CheckCircle2 size={15} />}
              label="Bật lại"
              onClick={() => onBatchAction("enable")}
              color="hover:bg-indigo-500/90 text-white hover:shadow-lg hover:shadow-indigo-500/20"
            />
            <BatchBtn
              icon={<Undo2 size={15} />}
              label="Khôi phục"
              onClick={() => onBatchAction("restore")}
              color="hover:bg-emerald-500/90 text-white hover:shadow-lg hover:shadow-emerald-500/20"
            />
          </div>
        )}
      </div>

      {!batchProgress && (
        <button
          onClick={onClearSelection}
          className="ml-1 mr-1.5 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/15 rounded-full transition-all shrink-0"
          title="Bỏ chọn tất cả"
        >
          <X size={16} />
        </button>
      )}
    </motion.div>
  );
}
