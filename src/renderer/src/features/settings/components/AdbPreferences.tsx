import { useState } from "react";
import {
  RefreshCw,
  ShieldCheck,
  Zap,
  RotateCcw,
} from "lucide-react";
import { toast } from "../../../store/toastStore";
import { useDeviceStore } from "../../../store/deviceStore";

export default function AdbPreferences() {
  const [isResetting, setIsResetting] = useState(false);
  const [safetyLevel, setSafetyLevel] = useState<"standard" | "strict">("strict");

  const handleResetAdb = async () => {
    setIsResetting(true);
    try {
      const res = await window.api.fixConnection();
      if (res.success) {
        useDeviceStore.getState().setDevices(res.devices || []);
        toast.success("Khởi động lại Server ADB & dọn dẹp tiến trình thành công!");
      } else {
        toast.error(`Reset thất bại: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Cấu hình ADB Core Engine & Bảo mật</span>
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Quản lý cấp độ bảo vệ an toàn lệnh shell và bảo trì kết nối ADB server
          </p>
        </div>
      </div>

      {/* Safety Level Selector */}
      <div className="space-y-4">
        <label className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
          1. Chế độ bảo vệ An toàn Lệnh (Safety Guard Level)
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => {
              setSafetyLevel("strict");
              toast.success("Đã bật chế độ bảo vệ An toàn nghiêm ngặt (Strict Safety Guard)");
            }}
            className={`p-5 rounded-2xl border-2 text-left transition-all ${
              safetyLevel === "strict"
                ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 shadow-md shadow-amber-500/10"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs">Nghiêm ngặt (Strict Protection - Khuyên dùng)</h4>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Default</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tự động lọc và ngăn chặn triệt để các lệnh nguy hiểm (`rm -rf /`, `dd`, `reboot bootloader` khi chưa xác nhận), bảo vệ thiết bị tuyệt đối.
            </p>
          </button>

          <button
            onClick={() => {
              setSafetyLevel("standard");
              toast.info("Đã chuyển sang chế độ Tiêu chuẩn (Standard)");
            }}
            className={`p-5 rounded-2xl border-2 text-left transition-all ${
              safetyLevel === "standard"
                ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 shadow-md shadow-blue-500/10"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs">Tiêu chuẩn (Standard Protection)</h4>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Advanced Users</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Cảnh báo khi chạy lệnh can thiệp hệ thống sâu nhưng cho phép thực thi linh hoạt hơn đối với người dùng kinh nghiệm.
            </p>
          </button>
        </div>
      </div>

      {/* ADB Maintenance Tools */}
      <div className="space-y-4 pt-2">
        <label className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
          2. Công cụ Bảo trì & Sửa lỗi ADB Server
        </label>

        <div className="p-6 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Khởi động lại Server ADB & Xóa tiến trình treo</span>
              </h4>
              <p className="text-xs text-slate-400 max-w-xl">
                Sử dụng khi gặp sự cố ADB bị đơ, không nhận diện thiết bị hoặc cổng kết nối bị chiếm dụng bởi phần mềm giả lập khác.
              </p>
            </div>

            <button
              onClick={handleResetAdb}
              disabled={isResetting}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
              <span>{isResetting ? "Đang xử lý..." : "Reset ADB Server ngay"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
