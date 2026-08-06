import { useState, useEffect } from "react";
import {
  Sparkles,
  RefreshCw,
  Download,
  History,
  Tag,
} from "lucide-react";
import { toast } from "../../../store/toastStore";

interface ReleaseItem {
  version: string;
  date: string;
  highlights: string[];
}

const DEFAULT_RELEASE_HISTORY: ReleaseItem[] = [
  {
    version: "v2.5.4",
    date: "06/08/2026",
    highlights: [
      "⚡ [Bản Chính Thức 2.5.4] Tích hợp quy chuẩn 100% Danh Mục Khối Lệnh AOSP & Xiaomi MIUI/HyperOS (Android 9–17 Specs).",
      "🛠️ Khắc phục triệt để lỗi lệnh 'service call' trên Windows (Họa tiết nâng cao HyperOS 2 / HyperOS 3).",
      "🎛️ Nâng cấp Action Inspector: Tích hợp nút Bật/Tắt trực tiếp, thẻ tag phân loại hãng (Xiaomi/Samsung/AOSP) và thanh cuộn tùy biến.",
      "🔒 Bổ sung lệnh 'cmd uimode' vào Whitelist An Toàn (adbSafety.ts).",
      "🔔 Tối ưu Sửa Trễ Thông Báo 104/104 App với Standby ACTIVE (Level 10) & Millet White list.",
    ],
  },
  {
    version: "v2.5.3",
    date: "01/08/2026",
    highlights: [
      "⚡ Khắc phục triệt để lỗi trễ thông báo 100% App (FCM Push Fix): Tự động mở Doze Mode, cấp quyền AppOps (RUN_ANY_IN_BACKGROUND, WAKE_LOCK) và tắt Standby cho toàn bộ ứng dụng người dùng & Google Play Services.",
      "🛡️ Tự động lọc danh sách ứng dụng chuẩn theo '--user 0' loại bỏ hoàn toàn lỗi 'No UID' trên thiết bị Android/Xiaomi có sử dụng ứng dụng kép (Dual Apps / Parallel Space).",
      "🔍 Tìm kiếm Toàn cục (Global Search): Cho phép gõ từ khóa tìm kiếm tức thì tất cả các tweak & tính năng trên toàn bộ các tab (Giao diện, Hiệu năng, Riêng tư, Màn hình, Debloat).",
      "⚙️ Chế độ Tùy chọn Nâng cao (Developer Mode): Cho phép bật/tắt ẩn hiện tab 'Nâng cao ADB' trên thanh điều hướng chính linh hoạt theo nhu cầu.",
    ],
  },
  {
    version: "v2.5.0",
    date: "28/07/2026",
    highlights: [
      "Nâng cấp hệ thống Cập nhật tự động (Auto-Update) với giao diện Glassmorphism hiện đại.",
      "Tự động nhận diện & đồng bộ IP LAN chính xác cho kết nối Wireless ADB & USB ADB.",
      "Tùy chỉnh giao diện Quản lý ứng dụng: Nút thao tác luôn luôn hiển thị & nhãn Disabled nổi bật.",
    ],
  },
  {
    version: "v2.4.4",
    date: "25/07/2026",
    highlights: [
      "Cải tiến công cụ Quét dọn nhanh (Quick Cleaner) tối ưu bộ nhớ đệm & file rác hệ thống.",
      "Bổ sung danh sách loại trừ (Whitelist) bảo vệ ứng dụng hệ thống quan trọng.",
      "Sửa các lỗi nhỏ và tối ưu hóa thời gian phản hồi lệnh ADB.",
    ],
  },
  {
    version: "v2.4.3",
    date: "23/07/2026",
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
    highlights: [
      "Hỗ trợ quản lý và thao tác đồng thời nhiều thiết bị (Multi-Device Execution).",
      "Bổ sung thanh công cụ Floating Taskbar quản lý tiến trình.",
    ],
  },
  {
    version: "v2.3.6",
    date: "01/07/2026",
    highlights: [
      "Tối ưu hóa giao diện Dark Mode toàn ứng dụng.",
      "Sửa lỗi tính toán dung lượng bộ nhớ trống trong fileService.",
    ],
  },
  {
    version: "v2.3.0",
    date: "09/06/2026",
    highlights: [
      "Tích hợp Engine Execute-Verify-Fallback tự động khôi phục sự cố kết nối.",
      "Tích hợp tự động kiểm tra bản nâng cấp qua GitHub Release.",
    ],
  },
];

export default function Updates() {
  const [currentVersion, setCurrentVersion] = useState("v2.5.4");
  const [releaseHistory, setReleaseHistory] = useState<ReleaseItem[]>(
    DEFAULT_RELEASE_HISTORY,
  );
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
        if (ver) {
          const v = ver.startsWith("v") ? ver : `v${ver}`;
          setCurrentVersion(v);
        }
      })
      .catch((err) => console.error("Lấy phiên bản lỗi:", err));

    // Lấy lịch sử Releases từ GitHub API để hiển thị động
    fetch("https://api.github.com/repos/khoaiprovip123/KT_ADB_Tool/releases", {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const fetched: ReleaseItem[] = data.map((rel: any) => {
            const rawBody = rel.body || "";
            const rawLines = rawBody
              .split("\n")
              .map((l: string) =>
                l
                  .replace(/^[\s*\-#]+/, "")
                  .replace(/\*\*/g, "")
                  .trim(),
              )
              .filter((l: string) => l.length > 0);

            // Deduplicate lines
            const uniqueLines = Array.from(new Set<string>(rawLines));

            const dateObj = new Date(rel.published_at || rel.created_at);
            const dateStr = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString("vi-VN")
              : "";
            return {
              version: rel.tag_name.startsWith("v")
                ? rel.tag_name
                : `v${rel.tag_name}`,
              date: dateStr,
              highlights:
                uniqueLines.length > 0 ? uniqueLines : [rel.name || "Bản cập nhật mới"],
            };
          });

          const mergedMap = new Map<string, ReleaseItem>();

          // Priority to DEFAULT_RELEASE_HISTORY if local highlights exist
          DEFAULT_RELEASE_HISTORY.forEach((item) => {
            mergedMap.set(item.version, item);
          });

          fetched.forEach((item) => {
            if (!mergedMap.has(item.version)) {
              mergedMap.set(item.version, item);
            }
          });

          const mergedList = Array.from(mergedMap.values()).sort((a, b) =>
            a.version < b.version ? 1 : -1,
          );
          setReleaseHistory(mergedList);
        }
      })
      .catch((err) =>
        console.warn("Lấy lịch sử release GitHub thất bại:", err),
      );
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
      setDownloadProgress(100);
      toast.success("Tải hoàn tất! Đang mở bộ cài đặt...");
    } catch (err: any) {
      console.error(err);
      setUpdateStatus("error");
      toast.error(`Cập nhật thất bại: ${err.message}`);
    } finally {
      unsubscribe();
    }
  };



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
                  {(item.version === currentVersion ||
                    item.version.replace(/^v/, "") ===
                      currentVersion.replace(/^v/, "")) && (
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
