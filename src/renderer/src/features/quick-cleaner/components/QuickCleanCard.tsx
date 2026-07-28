import React from "react";
import { Zap, ShieldCheck, Cpu, HardDrive, Sparkles } from "lucide-react";

interface QuickCleanCardProps {
  ramUsedPercentage: number;
  memTotalMb: number;
  memAvailableMb: number;
  onQuickClean: () => void;
  isScanning: boolean;
  onOpenWhitelist: () => void;
}

export const QuickCleanCard: React.FC<QuickCleanCardProps> = ({
  ramUsedPercentage,
  memTotalMb,
  memAvailableMb,
  onQuickClean,
  isScanning,
  onOpenWhitelist,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-xl">
      {/* Background Graphic Accents */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left Side: Text & Ram Metric */}
        <div className="space-y-4 text-center md:text-left flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-blue-100">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span>Chế độ Dọn Dẹp Nhanh 1-Click</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight">Tối Ưu & Dọn Dẹp Toàn Diện</h2>
          <p className="text-sm text-blue-100/90 max-w-lg leading-relaxed">
            Tự động dọn dẹp logcat, file rác tạm, giải phóng bộ nhớ Trim Caches và đóng các ứng dụng ngầm không thuộc danh sách ưu tiên.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-4 max-w-md pt-2">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <div className="flex items-center gap-2 text-xs text-blue-200 mb-1">
                <Cpu className="w-4 h-4 text-blue-300" />
                <span>RAM Đã Sử Dụng</span>
              </div>
              <div className="text-xl font-bold">{ramUsedPercentage}%</div>
              <div className="text-[11px] text-blue-200/80">Khả dụng: {memAvailableMb} / {memTotalMb} MB</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <div className="flex items-center gap-2 text-xs text-blue-200 mb-1">
                <HardDrive className="w-4 h-4 text-purple-300" />
                <span>An Toàn & Tương Thích</span>
              </div>
              <div className="text-xl font-bold">Android 11 - 17</div>
              <div className="text-[11px] text-blue-200/80">ADB Native Protocol</div>
            </div>
          </div>
        </div>

        {/* Right Side: Big Action Button */}
        <div className="flex flex-col items-center justify-center gap-3">
          <button
            disabled={isScanning}
            onClick={onQuickClean}
            className="group relative flex items-center justify-center w-36 h-36 rounded-full bg-white text-blue-600 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 font-extrabold cursor-pointer border-4 border-white/40"
          >
            <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping pointer-events-none"></div>
            <div className="flex flex-col items-center gap-1.5 z-10">
              <Zap className="w-10 h-10 text-blue-600 fill-blue-600 group-hover:rotate-12 transition-transform duration-300" />
              <span className="text-base font-black tracking-wide uppercase">DỌN NGAY</span>
            </div>
          </button>

          <button
            onClick={onOpenWhitelist}
            className="flex items-center gap-1.5 text-xs text-blue-200 hover:text-white underline font-semibold transition-colors pt-1"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Quản lý danh sách Whitelist</span>
          </button>
        </div>
      </div>
    </div>
  );
};
