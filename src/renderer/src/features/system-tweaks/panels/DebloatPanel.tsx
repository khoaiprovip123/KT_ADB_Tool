import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  PowerOff,
  Undo2,
  CheckCircle2,
  ListFilter,
  CheckSquare,
  Square,
  X,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { BloatwareEntry } from "../types";
import { BatchResultModal } from "../../../components/features/BatchResultModal";

interface DebloatPanelProps {
  loading: boolean;
  actionLoading: string | null;
  bloatListWithStatus: BloatwareEntry[];
  debloatSearch: string;
  setDebloatSearch: (v: string) => void;
  selectedBloat: Set<string>;
  setSelectedBloat: (s: Set<string>) => void;
  batchProgress: { current: number; total: number; action: string } | null;
  batchResult: { success: number; fail: number; skipped: number; lastError?: string; action: string } | null;
  setBatchResult: (r: any) => void;
  filteredBloat: BloatwareEntry[];
  toggleSelect: (pkg: string, risk: string) => void;
  selectAllSelectable: () => void;
  handleSingleDebloatAction: (pkg: string, action: "uninstall" | "disable" | "restore") => Promise<void>;
  handleBatchDebloatAction: (action: "uninstall" | "disable" | "restore") => Promise<void>;
}

export function DebloatPanel({
  loading,
  actionLoading,
  bloatListWithStatus,
  debloatSearch,
  setDebloatSearch,
  selectedBloat,
  setSelectedBloat,
  batchProgress,
  batchResult,
  setBatchResult,
  filteredBloat,
  toggleSelect,
  selectAllSelectable,
  handleSingleDebloatAction,
  handleBatchDebloatAction,
}: DebloatPanelProps) {
  // Stats
  const safeCount = bloatListWithStatus.filter((p) => p.risk === "SAFE").length;
  const riskyCount = bloatListWithStatus.filter((p) => p.risk === "RISKY").length;
  const keepCount = bloatListWithStatus.filter((p) => p.risk === "KEEP").length;

  const selectableCount = filteredBloat.filter((p) => p.risk !== "KEEP").length;
  const allSelected = selectedBloat.size === selectableCount && selectableCount > 0;

  return (
    <motion.div
      key="debloat"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      className="flex-1 flex flex-col h-full min-h-0 relative"
    >
      <div className="p-4 border-b border-slate-100 bg-slate-50/10 shrink-0 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative group">
            <ListFilter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Tìm gói hoặc tên ứng dụng rác..."
              value={debloatSearch}
              onChange={(e) => setDebloatSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <StatCard
              label="An toàn"
              count={safeCount}
              color="bg-green-50 text-green-700 border-green-200/50"
            />
            <StatCard
              label="Cân nhắc"
              count={riskyCount}
              color="bg-orange-50 text-orange-700 border-orange-200/50"
            />
            <StatCard
              label="Giữ lại"
              count={keepCount}
              color="bg-red-50 text-red-700 border-red-200/50"
            />
          </div>
        </div>
      </div>

      {/* TABLE HEADER */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50/30 shrink-0 items-center">
        <div className="col-span-5 flex items-center gap-3">
          <button
            onClick={selectAllSelectable}
            className={`p-1 -ml-1 rounded-md transition-colors ${allSelected ? "text-blue-600" : "text-slate-400 hover:text-blue-600"}`}
          >
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Tên ứng dụng & Package
          </span>
        </div>
        <div className="col-span-2 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Độ an toàn
        </div>
        <div className="col-span-2 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Nhóm/Chức năng
        </div>
        <div className="col-span-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Trạng thái / Thao tác
        </div>
      </div>

      {/* LIST BODY */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 divide-y divide-slate-50/60 pb-4">
        {loading && bloatListWithStatus.length === 0 ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-14 bg-slate-100/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredBloat.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 min-h-[300px]">
            <ShieldCheck className="w-16 h-16 text-emerald-400/80 mb-3 animate-pulse" />
            <p className="text-sm font-black text-slate-700">Tuyệt vời! Thiết bị cực kỳ sạch sẽ.</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Không tìm thấy ứng dụng rác nào phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          filteredBloat.map((item) => {
            const isSelected = selectedBloat.has(item.package);
            const isKeep = item.risk === "KEEP";
            const isRisky = item.risk === "RISKY";

            let classificationBadge = "bg-green-50 text-green-600 border-green-200";
            if (isRisky) classificationBadge = "bg-orange-50 text-orange-600 border-orange-200";
            if (isKeep) classificationBadge = "bg-red-50 text-red-600 border-red-200";

            let statusBadge = "bg-slate-100 text-slate-550 border-slate-200";
            let statusText = "Chưa cài";
            if (item.status === "installed") {
              statusBadge = "bg-emerald-50 text-emerald-600 border-emerald-200";
              statusText = "Đang chạy";
            } else if (item.status === "disabled") {
              statusBadge = "bg-amber-50 text-amber-600 border-amber-200";
              statusText = "Đã tắt";
            }

            return (
              <div
                key={item.package}
                className={`grid grid-cols-12 gap-4 px-4 py-3 items-center transition-all ${isSelected ? "bg-blue-50/40 border-l-4 border-l-blue-600" : "hover:bg-slate-50/40 border-l-4 border-l-transparent"} group h-[68px]`}
              >
                <div className="col-span-5 flex items-center gap-3 truncate">
                  <button
                    disabled={isKeep}
                    onClick={() => toggleSelect(item.package, item.risk)}
                    className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors shrink-0 ${isKeep ? "opacity-20 cursor-not-allowed bg-slate-100 border-slate-300" : isSelected ? "bg-blue-600 text-white" : "bg-white border border-slate-300 hover:border-blue-400 text-transparent"}`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                  </button>

                  <div className="truncate">
                    <div className="text-[10px] font-black text-blue-600 tracking-tight leading-none mb-1 group-hover:text-blue-700">
                      {item.name}
                    </div>
                    <div
                      className={`text-xs font-bold truncate ${item.status === "disabled" ? "text-slate-400 line-through font-medium" : "text-slate-750"}`}
                    >
                      {item.package}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 flex justify-center">
                  <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${classificationBadge}`}>
                    {item.risk}
                  </span>
                </div>

                <div className="col-span-2 text-center text-xs font-bold text-slate-500 uppercase tracking-tighter truncate">
                  {item.category}
                </div>

                <div className="col-span-3 flex items-center justify-end gap-2">
                  <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${statusBadge}`}>
                    {statusText}
                  </span>

                  <div className="hidden group-hover:flex items-center gap-1">
                    {item.status !== "uninstalled" ? (
                      <>
                        {item.status === "installed" ? (
                          <>
                            <ActionButton
                              icon={<PowerOff size={13} />}
                              tooltip="Vô hiệu hóa"
                              disabled={isKeep}
                              onClick={() => handleSingleDebloatAction(item.package, "disable")}
                              color="text-amber-600 hover:bg-amber-50"
                              loading={actionLoading === `disable-${item.package}`}
                            />
                            <ActionButton
                              icon={<Trash2 size={13} />}
                              tooltip="Gỡ cài đặt"
                              disabled={isKeep}
                              onClick={() => handleSingleDebloatAction(item.package, "uninstall")}
                              color="text-red-650 hover:bg-red-50"
                              loading={actionLoading === `uninstall-${item.package}`}
                            />
                          </>
                        ) : (
                          <ActionButton
                            icon={<Undo2 size={13} />}
                            tooltip="Bật lại"
                            onClick={() => handleSingleDebloatAction(item.package, "restore")}
                            color="text-emerald-655 hover:bg-emerald-50"
                            loading={actionLoading === `restore-${item.package}`}
                          />
                        )}
                      </>
                    ) : (
                      <ActionButton
                        icon={<Undo2 size={13} />}
                        tooltip="Cài lại ứng dụng gốc"
                        onClick={() => handleSingleDebloatAction(item.package, "restore")}
                        color="text-slate-600 hover:bg-slate-100"
                        loading={actionLoading === `restore-${item.package}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* BOTTOM STICKY BAR FOR BATCH DEBLOAT */}
      <AnimatePresence>
        {selectedBloat.size > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="sticky bottom-0 bg-white/95 border-t border-slate-200 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] flex items-center justify-between z-10 w-full rounded-b-3xl shrink-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-650 flex items-center justify-center text-[10px] font-black text-white">
                {selectedBloat.size}
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Đã chọn</span>
            </div>

            <div className="flex items-center gap-2">
              {batchProgress ? (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-150 px-4 py-2 rounded-xl">
                  <RefreshCcw className="w-4 h-4 animate-spin text-blue-655" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-655">
                    Xử lý {batchProgress.current}/{batchProgress.total}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBatchDebloatAction("uninstall")}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    Gỡ bỏ
                  </button>
                  <button
                    onClick={() => handleBatchDebloatAction("disable")}
                    className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5"
                  >
                    <PowerOff size={13} />
                    Tắt chạy nền
                  </button>
                  <button
                    onClick={() => handleBatchDebloatAction("restore")}
                    className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-650 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5"
                  >
                    <Undo2 size={13} />
                    Khôi phục
                  </button>
                </div>
              )}

              <button
                onClick={() => setSelectedBloat(new Set())}
                className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-xl transition-all"
                title="Hủy chọn tất cả"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BatchResultModal result={batchResult} onClose={() => setBatchResult(null)} />
    </motion.div>
  );
}

// Helpers
function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider ${color}`}>
      <span>{label}:</span>
      <span className="text-xs font-black">{count}</span>
    </div>
  );
}

function ActionButton({
  icon,
  tooltip,
  disabled,
  onClick,
  color,
  loading,
}: {
  icon: React.ReactElement;
  tooltip: string;
  disabled?: boolean;
  onClick: () => void;
  color: string;
  loading?: boolean;
}) {
  return (
    <button
      title={tooltip}
      disabled={disabled || loading}
      onClick={onClick}
      className={`p-2 rounded-lg transition-all active:scale-90 flex items-center justify-center shrink-0 border border-slate-200/30 ${disabled ? "opacity-30 cursor-not-allowed" : color} ${loading ? "opacity-50" : ""}`}
    >
      {loading ? <RefreshCcw size={13} className="animate-spin" /> : icon}
    </button>
  );
}
