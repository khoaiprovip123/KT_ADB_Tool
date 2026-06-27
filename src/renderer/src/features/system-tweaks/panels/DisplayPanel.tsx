import { motion } from "framer-motion";
import { Monitor, Smartphone } from "lucide-react";

interface DisplayPanelProps {
  actionLoading: string | null;
  customDpi: number;
  setCustomDpi: (d: number) => void;
  deviceDpi: number | null;
  customW: number;
  setCustomW: (w: number) => void;
  customH: number;
  setCustomH: (h: number) => void;
  deviceW: number | null;
  deviceH: number | null;
  applyDpi: (dpi: number) => Promise<void>;
  handleResetDpi: () => Promise<void>;
  applyResolution: () => Promise<void>;
  handleResetResolution: () => Promise<void>;
}

export function DisplayPanel({
  actionLoading,
  customDpi,
  setCustomDpi,
  deviceDpi,
  customW,
  setCustomW,
  customH,
  setCustomH,
  deviceW,
  deviceH,
  applyDpi,
  handleResetDpi,
  applyResolution,
  handleResetResolution,
}: DisplayPanelProps) {
  return (
    <motion.div
      key="display"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DPI Density card */}
        <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl">
                  <Monitor size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    Mật độ điểm ảnh (DPI)
                  </h4>
                  <p className="text-xs text-slate-450 font-semibold">
                    Tùy biến hiển thị toàn màn hình.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>Mật độ mong muốn:</span>
                <div className="flex items-center gap-2">
                  {deviceDpi && (
                    <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded text-[10px] font-black">
                      Hiện tại: {deviceDpi} DPI
                    </span>
                  )}
                  <span className="text-blue-655 font-black">{customDpi} DPI</span>
                </div>
              </div>

              <input
                type="range"
                min="240"
                max="600"
                step="10"
                value={customDpi}
                onChange={(e) => setCustomDpi(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-650"
              />

              <div className="grid grid-cols-3 gap-2">
                <PresetButton active={customDpi === 360} onClick={() => setCustomDpi(360)} label="Nhỏ (360)" />
                <PresetButton active={customDpi === 440} onClick={() => setCustomDpi(440)} label="Mặc định" />
                <PresetButton active={customDpi === 500} onClick={() => setCustomDpi(500)} label="Lớn (500)" />
              </div>

              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                ⚠️ Lưu ý: Việc đặt DPI quá nhỏ hoặc quá lớn có thể làm méo biểu tượng hoặc đè lớp UI hiển thị.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-100 mt-6 shrink-0">
            <button
              onClick={() => applyDpi(customDpi)}
              disabled={actionLoading === "apply-dpi"}
              className="flex-1 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {actionLoading === "apply-dpi" ? "Đang áp dụng..." : "Áp dụng DPI"}
            </button>
            <button
              onClick={handleResetDpi}
              disabled={actionLoading === "reset-dpi"}
              className="px-5 py-3 bg-slate-100 border border-slate-200 text-slate-655 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-205 transition-all active:scale-95 disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>

          {/* Resolution Changer card */}
          <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      Độ phân giải hiển thị
                    </h4>
                    <p className="text-xs text-slate-450 font-semibold">
                      Tự cấu hình lại kích thước màn hình.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Độ phân giải mong muốn:</span>
                  {deviceW && deviceH && (
                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded text-[10px] font-black">
                      Hiện tại: {deviceW}x{deviceH} PX
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Rộng (Width)
                    </label>
                    <input
                      type="number"
                      value={customW}
                      onChange={(e) => setCustomW(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Cao (Height)
                    </label>
                    <input
                      type="number"
                      value={customH}
                      onChange={(e) => setCustomH(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <PresetButton
                    active={customW === 1080 && customH === 2400}
                    onClick={() => {
                      setCustomW(1080);
                      setCustomH(2400);
                    }}
                    label="FHD+ (1080x2400)"
                  />
                  <PresetButton
                    active={customW === 1440 && customH === 3200}
                    onClick={() => {
                      setCustomW(1440);
                      setCustomH(3200);
                    }}
                    label="WQHD+ (1440x3200)"
                  />
                </div>

                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  ⚠️ Lưu ý: Thay đổi độ phân giải sai tỷ lệ có thể khiến màn hình bị giãn hoặc mất cảm ứng tạm thời.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-100 mt-6 shrink-0">
              <button
                onClick={applyResolution}
                disabled={actionLoading === "apply-res"}
                className="flex-1 py-3 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {actionLoading === "apply-res" ? "Đang cấu hình..." : "Áp dụng phân giải"}
              </button>
              <button
                onClick={handleResetResolution}
                disabled={actionLoading === "reset-res"}
                className="px-5 py-3 bg-slate-100 border border-slate-200 text-slate-655 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-205 transition-all active:scale-95 disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>
      </div>
    </motion.div>
  );
}

function PresetButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-2 px-3 border rounded-xl text-center text-xs font-bold transition-all ${active ? "bg-blue-600 border-blue-650 text-white shadow-sm" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
    >
      {label}
    </button>
  );
}
