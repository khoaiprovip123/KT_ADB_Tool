import { useState, useEffect } from "react";
import {
  Sparkles,
  RefreshCw,
  Download,
  History,
  Tag,
} from "lucide-react";
import { toast } from "../../../store/toastStore";

export default function Updates() {
  const [currentVersion, setCurrentVersion] = useState("v2.4.4");
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
    window.api
      ?.getAppVersion?.()
      .then((ver) => {
        if (ver) setCurrentVersion(`v${ver}`);
      })
      .catch((err) => console.error("Lấy phiên bản lỗi:", err));
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

  const releaseHistory = [
    {
      version: "v2.4.3",
      date: "23/07/2026",
      isLatest: true,
      highlights: [
        "Thêm tính năng Ghép nối Android 11+ bằng Mã QR Scanner mDNS tự động.",
        "Hỗ trợ gỡ rác (Debloat) đa thương hiệu: Samsung OneUI, ColorOS, FuntouchOS.",
        "Hỗ trợ cài đặt & trích xuất Split APKs (XAPK / APKS / ZIP bundles).",
        "Nâng cấp giao diện Cài Đặt Glassmorphic hiện đại.",
      ],
    },
    {
      version: "v2.4.0",
      date: "15/07/2026",
      isLatest: false,
      highlights: [
        "Hỗ trợ quản lý và thao tác đồng thời nhiều thiết bị (Multi-Device Execution).",
        "Bổ sung thanh công cụ Floating Taskbar quản lý tiến trình.",
      ],
    },
    {
      version: "v2.3.6",
      date: "01/07/2026",
      isLatest: false,
      highlights: [
        "Tối ưu hóa giao diện Dark Mode toàn ứng dụng.",
        "Sửa lỗi tính toán dung lượng bộ nhớ trống trong fileService.",
      ],
    },
    {
      version: "v2.3.0",
      date: "09/06/2026",
      isLatest: false,
      highlights: [
        "Tích hợp Engine Execute-Verify-Fallback tự động khôi phục sự cố kết nối.",
        "Tích hợp tự động kiểm tra bản nâng cấp qua GitHub Release.",
      ],
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Top Banner Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
            <RefreshCw className={`w-7 h-7 ${updateStatus === "checking" ? "animate-spin" : ""}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phiên bản hiện tại</span>
              <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {currentVersion}
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white mt-1">
              {updateStatus === "available"
                ? `Phát hiện phiên bản mới ${latestVersionInfo?.version}!`
                : updateStatus === "downloading"
                ? `Đang tải bản cập nhật... ${downloadProgress}%`
                : "Hệ thống đang hoạt động ở phiên bản tối ưu nhất"}
            </h3>
          </div>
        </div>

        {updateStatus !== "checking" && updateStatus !== "downloading" && (
          <button
            onClick={handleCheckUpdate}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Kiểm tra Cập nhật</span>
          </button>
        )}
      </div>

      {/* Progress Bar when Downloading */}
      {updateStatus === "downloading" && (
        <div className="p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-indigo-900 dark:text-indigo-200">Đang tải xuống bộ cài đặt...</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">{downloadProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Update Available Box */}
      {updateStatus === "available" && latestVersionInfo && (
        <div className="p-6 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>Phiên bản {latestVersionInfo.version} đã sẵn sàng nâng cấp!</span>
            </div>
            <button
              onClick={handleDownloadInstall}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Tải & Nâng cấp tự động</span>
            </button>
          </div>
        </div>
      )}

      {/* Release History Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Lịch sử phát triển & Nhật ký phát hành (Changelog)</span>
          </h3>
          <span className="text-xs font-semibold text-slate-400">Official Releases</span>
        </div>

        <div className="space-y-4">
          {releaseHistory.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-sm hover:border-slate-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{item.version}</span>
                  {item.isLatest && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                      Phiên bản hiện tại
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-slate-400">{item.date}</span>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {item.highlights.map((point, pIdx) => (
                  <li key={pIdx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
