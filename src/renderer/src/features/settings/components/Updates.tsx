import { useState, useEffect } from "react";
import { Sparkles, Package, Loader2, ArrowUpCircle } from "lucide-react";
import { toast } from "../../../store/toastStore";

export default function Updates() {
  const [currentVersion, setCurrentVersion] = useState("v2.3.3-PRO-MAX");
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "available" | "no-update" | "downloading" | "error"
  >("idle");
  const [latestVersionInfo, setLatestVersionInfo] = useState<{
    version: string;
    changelog: string;
    downloadUrl: string | null;
  } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    // Lấy phiên bản hiện tại từ Electron Main Process
    window.api.getAppVersion().then((ver) => {
      if (ver) setCurrentVersion(`v${ver}`);
    }).catch(err => console.error("Lấy phiên bản lỗi:", err));
  }, []);

  const handleCheckUpdate = async () => {
    setUpdateStatus("checking");
    try {
      const info = await window.api.checkForUpdates();
      if (info.available) {
        setLatestVersionInfo({
          version: `v${info.version}`,
          changelog: info.changelog,
          downloadUrl: info.downloadUrl,
        });
        setUpdateStatus("available");
        toast.success(`Phát hiện phiên bản mới: v${info.version}`);
      } else {
        setUpdateStatus("no-update");
        toast.info("Bạn đang sử dụng phiên bản mới nhất.");
      }
    } catch (err: any) {
      console.error(err);
      setUpdateStatus("error");
      toast.error(err.message || "Lỗi kiểm tra cập nhật");
    }
  };

  const handleDownloadInstall = async () => {
    if (!latestVersionInfo?.downloadUrl) {
      toast.error("Không tìm thấy đường dẫn tải về.");
      return;
    }

    setUpdateStatus("downloading");
    setDownloadProgress(0);

    // Đăng ký listener nhận tiến độ tải về
    const unsubscribe = window.api.onUpdateProgress((prog) => {
      setDownloadProgress(prog);
    });

    try {
      await window.api.downloadAndInstallUpdate(latestVersionInfo.downloadUrl);
    } catch (err: any) {
      console.error(err);
      setUpdateStatus("error");
      toast.error(`Cập nhật thất bại: ${err.message}`);
    } finally {
      unsubscribe();
    }
  };

  return (
    <div className="space-y-8 text-slate-600 h-full flex flex-col">
      <div className="flex justify-between items-center pb-8 border-b border-slate-200/60">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">
            Trung tâm Cập nhật
          </h2>
          <p className="text-sm font-medium text-slate-400 mt-1">
            Đảm bảo bạn luôn trải nghiệm phiên bản mạnh mẽ nhất
          </p>
        </div>
        
        {updateStatus !== "checking" && updateStatus !== "downloading" && (
          <button
            onClick={handleCheckUpdate}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2.5 shadow-xl shadow-blue-500/20"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Kiểm tra ngay
          </button>
        )}
      </div>

      {/* Trạng thái hiện tại */}
      {updateStatus === "checking" && (
        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4 animate-pulse">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <div>
            <h4 className="text-blue-900 font-bold">Đang kiểm tra máy chủ...</h4>
            <p className="text-xs text-blue-500">Vui lòng đợi giây lát</p>
          </div>
        </div>
      )}

      {updateStatus === "downloading" && (
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <div className="flex-1">
              <h4 className="text-blue-900 font-bold">Đang tải bản cập nhật ngầm...</h4>
              <p className="text-xs text-blue-500">Ứng dụng sẽ tự động đóng và cài đè khi hoàn thành</p>
            </div>
            <span className="text-sm font-black text-blue-600">{downloadProgress}%</span>
          </div>
          <div className="h-2.5 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {updateStatus === "available" && latestVersionInfo && (
        <div className="bg-indigo-50/60 p-6 rounded-3xl border border-indigo-100/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md shadow-indigo-900/5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <ArrowUpCircle size={28} />
            </div>
            <div>
              <h4 className="text-indigo-900 font-black text-lg tracking-tight">
                Phát hiện phiên bản mới: {latestVersionInfo.version}
              </h4>
              <p className="text-sm font-bold text-slate-500 mt-1">
                Phiên bản của bạn: {currentVersion}
              </p>
              {latestVersionInfo.changelog && (
                <div className="mt-3 text-xs bg-white/70 p-3.5 rounded-xl border border-indigo-50 text-slate-600 max-h-32 overflow-y-auto max-w-lg scrollbar-hide">
                  <span className="font-black text-slate-700 block mb-1">Tính năng mới:</span>
                  <p className="whitespace-pre-line leading-relaxed">{latestVersionInfo.changelog}</p>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleDownloadInstall}
            className="w-full md:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all shrink-0"
          >
            Tải & Cài đặt ngay
          </button>
        </div>
      )}

      {updateStatus === "no-update" && (
        <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-emerald-950 font-black tracking-tight text-lg">
                Hệ thống đã sẵn sàng
              </h4>
              <p className="text-sm font-bold text-emerald-600">
                Bạn đang chạy trên phiên bản mới nhất: {currentVersion}
              </p>
            </div>
          </div>
          <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
            Mới nhất
          </span>
        </div>
      )}

      {updateStatus === "idle" && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/60 flex items-center justify-between shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
              <Package size={24} />
            </div>
            <div>
              <h4 className="text-slate-800 font-black tracking-tight text-lg">
                KT ADB Tool Pro
              </h4>
              <p className="text-sm font-bold text-slate-400">
                Phiên bản hiện tại: {currentVersion}
              </p>
            </div>
          </div>
          <button
            onClick={handleCheckUpdate}
            className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest hover:underline"
          >
            Kiểm tra
          </button>
        </div>
      )}

      {/* Lịch sử phát triển */}
      <div className="flex-1 overflow-y-auto pr-4 space-y-8 scrollbar-hide">
        <h3 className="text-xl font-black text-slate-800 tracking-tight sticky top-0 bg-white/60 backdrop-blur-md py-4 z-10">
          Lịch sử Phát triển
        </h3>

        <div className="space-y-10 relative before:absolute before:inset-0 before:ml-6 before:h-full before:w-0.5 before:bg-slate-200/60">
          {/* Version 2.3.3 */}
          <div className="relative pl-14 group">
            <div className="absolute left-0 top-1.5 w-12 h-12 rounded-2xl bg-indigo-600 border-4 border-white shadow-xl flex items-center justify-center z-10 transform group-hover:scale-110 transition-transform shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="p-6 rounded-[2rem] bg-indigo-50/10 border border-indigo-100 shadow-lg shadow-indigo-900/5 group-hover:border-indigo-300 transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="font-black text-slate-800 text-xl tracking-tighter">
                  v2.3.3-PRO-MAX <span className="ml-2 text-indigo-600">⚡</span>
                </div>
                <time className="text-xs text-indigo-500 font-black uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                  09/06/2026
                </time>
              </div>
              <ul className="text-slate-500 text-sm font-bold space-y-3 relative z-10">
                <li className="flex items-start gap-2.5 bg-white/60 p-2.5 rounded-xl border border-indigo-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                  <span>
                    **Sửa lỗi tự động cập nhật**: Thêm cấu hình chạy quyền admin qua shell Windows để kích hoạt UAC prompt, sửa lỗi treo tiến trình cài đè khi tải về 100%.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Version 2.3.2 */}
          <div className="relative pl-14 group">
            <div className="absolute left-0 top-1.5 w-12 h-12 rounded-2xl bg-indigo-600 border-4 border-white shadow-xl flex items-center justify-center z-10 transform group-hover:scale-110 transition-transform shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="p-6 rounded-[2rem] bg-indigo-50/10 border border-indigo-100 shadow-lg shadow-indigo-900/5 group-hover:border-indigo-300 transition-colors relative overflow-hidden text-opacity-70">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="font-black text-slate-700 text-xl tracking-tighter">
                  v2.3.2-PRO-MAX
                </div>
                <time className="text-xs text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                  09/06/2026
                </time>
              </div>
              <ul className="text-slate-400 text-sm font-bold space-y-3 relative z-10">
                <li className="flex items-start gap-2.5 bg-white/60 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></div>
                  <span>
                    **Kiểm tra tính năng cập nhật**: Phát hành phiên bản thử nghiệm v2.3.2-PRO-MAX để xác thực luồng tải và cài đè ngầm tự động.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Version 2.3.1 */}
          <div className="relative pl-14 group">
            <div className="absolute left-0 top-1.5 w-12 h-12 rounded-2xl bg-indigo-600 border-4 border-white shadow-xl flex items-center justify-center z-10 transform group-hover:scale-110 transition-transform shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="p-6 rounded-[2rem] bg-indigo-50/10 border border-indigo-100 shadow-lg shadow-indigo-900/5 group-hover:border-indigo-300 transition-colors relative overflow-hidden text-opacity-70">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="font-black text-slate-700 text-xl tracking-tighter">
                  v2.3.1-PRO-MAX
                </div>
                <time className="text-xs text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                  09/06/2026
                </time>
              </div>
              <ul className="text-slate-400 text-sm font-bold space-y-3 relative z-10">
                <li className="flex items-start gap-2.5 bg-white/60 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></div>
                  <span>
                    **Sửa lỗi phân phối CI**: Sửa quyền ghi tạo GitHub Release và chuyển đổi hoàn toàn cấu hình GitHub Actions sang đóng gói bằng `electron-builder` chính thức.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Version 2.3.0 */}
          <div className="relative pl-14 group">
            <div className="absolute left-0 top-1.5 w-12 h-12 rounded-2xl bg-indigo-600 border-4 border-white shadow-xl flex items-center justify-center z-10 transform group-hover:scale-110 transition-transform shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="p-6 rounded-[2rem] bg-indigo-50/10 border border-indigo-100 shadow-lg shadow-indigo-900/5 group-hover:border-indigo-300 transition-colors relative overflow-hidden text-opacity-70">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="font-black text-slate-700 text-xl tracking-tighter">
                  v2.3.0-PRO-MAX
                </div>
                <time className="text-xs text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                  09/06/2026
                </time>
              </div>
              <ul className="text-slate-400 text-sm font-bold space-y-3 relative z-10">
                <li className="flex items-start gap-2.5 bg-white/60 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></div>
                  <span>
                    **Tự động cập nhật**: Tích hợp tính năng kiểm tra, tự động tải và cài đặt cập nhật ngầm không thông qua người dùng.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 bg-white/60 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></div>
                  <span>
                    **Engine Execute-Verify-Fallback**: Đột phá công nghệ tự động xác minh kết quả sau khi thực thi lệnh ADB. Tự động chuyển đổi sang lệnh thay thế (fallback) nếu lệnh chính không có hiệu lực, đảm bảo tương thích 100% trên HyperOS/MIUI/Android.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
