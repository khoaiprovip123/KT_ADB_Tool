import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  Zap,
  AlertTriangle,
  Loader2,
  Search,
  Undo2,
  RotateCcw,
  X,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  Landmark,
  ShoppingBag,
  Wrench,
  HelpCircle,
} from "lucide-react";
import { toast } from "../../store/toastStore";

interface NotificationAppItem {
  packageName: string;
  name: string;
  category: "chat" | "banking" | "shopping" | "utility" | "other";
  isRecommended: boolean;
  dozeWhitelisted: boolean;
  standbyActive: boolean;
  postNotificationAllowed: boolean;
  appOps10008Allowed: boolean;
  appOps10053Allowed: boolean;
  backgroundAllowed: boolean;
  isFixed: boolean;
}

interface StepDetail {
  doze: boolean;
  standbyBucket: boolean;
  postNotification: boolean;
  appOps10008: boolean;
  appOps10053: boolean;
  backgroundOps: boolean;
}

interface AppFixStatus {
  success: boolean;
  steps: StepDetail;
  message?: string;
}

interface NotificationFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDevice: string;
}

export function NotificationFixModal({
  isOpen,
  onClose,
  activeDevice,
}: NotificationFixModalProps) {
  const [apps, setApps] = useState<NotificationAppItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<
    "recommended" | "all" | "not_fixed" | "fixed"
  >("recommended");
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(
    new Set(),
  );
  const [fixingPackage, setFixingPackage] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    pkgName: string;
  } | null>(null);
  const [fixResults, setFixResults] = useState<Record<string, AppFixStatus>>({});

  // Tải danh sách app
  const loadApps = useCallback(async () => {
    if (!activeDevice || !window.api?.scanNotificationApps) return;
    setLoading(true);
    try {
      const scanned = await window.api.scanNotificationApps(activeDevice);
      setApps(scanned);

      // Mặc định chọn trước tất cả các app gợi ý
      const initialSelected = new Set<string>();
      for (const app of scanned) {
        if (app.isRecommended) {
          initialSelected.add(app.packageName);
        }
      }
      setSelectedPackages(initialSelected);
    } catch (err: any) {
      toast.error("Không thể quét danh sách ứng dụng: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [activeDevice]);

  useEffect(() => {
    if (isOpen) {
      loadApps();
    } else {
      setSearchQuery("");
      setBatchProgress(null);
    }
  }, [isOpen, loadApps]);

  // Phím Escape để đóng modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !batchRunning) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, batchRunning, onClose]);

  // Lắng nghe tiến trình batch
  useEffect(() => {
    if (!isOpen || !window.api?.onFixNotificationsProgress) return;
    const unsub = window.api.onFixNotificationsProgress((data) => {
      setBatchProgress(data);
    });
    return () => unsub();
  }, [isOpen]);

  // Lọc danh sách app
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        app.name.toLowerCase().includes(query) ||
        app.packageName.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      const hasResult = fixResults[app.packageName];
      const isFixed = hasResult ? hasResult.success : app.isFixed;

      if (filterMode === "recommended") return app.isRecommended;
      if (filterMode === "not_fixed") return !isFixed;
      if (filterMode === "fixed") return isFixed;
      return true;
    });
  }, [apps, searchQuery, filterMode, fixResults]);

  // Toggle chọn app
  const toggleSelect = (pkg: string) => {
    setSelectedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPackages((prev) => {
      const next = new Set(prev);
      for (const a of filteredApps) next.add(a.packageName);
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedPackages((prev) => {
      const next = new Set(prev);
      for (const a of filteredApps) next.delete(a.packageName);
      return next;
    });
  };

  // Fix 1 app
  const handleFixSingle = async (pkg: string) => {
    if (!activeDevice || !window.api?.fixSingleNotification || batchRunning)
      return;
    setFixingPackage(pkg);
    try {
      const result = await window.api.fixSingleNotification(activeDevice, pkg);
      setFixResults((prev) => ({
        ...prev,
        [pkg]: {
          success: result.success,
          steps: result.steps,
          message: result.message,
        },
      }));

      if (result.success) {
        toast.success(`Đã tối ưu thông báo thành công cho ${result.name}`);
        setApps((prev) =>
          prev.map((a) =>
            a.packageName === pkg
              ? {
                  ...a,
                  isFixed: true,
                  dozeWhitelisted: true,
                  backgroundAllowed: true,
                }
              : a,
          ),
        );
      } else {
        toast.error(`Fix cho ${result.name} thất bại: ${result.message}`);
      }
    } catch (err: any) {
      toast.error("Lỗi khi sửa thông báo: " + err.message);
    } finally {
      setFixingPackage(null);
    }
  };

  // Fix batch apps
  const handleFixSelected = async () => {
    if (!activeDevice || !window.api?.fixBatchNotifications || batchRunning)
      return;
    const targetList = Array.from(selectedPackages);
    if (targetList.length === 0) {
      toast.info("Vui lòng tích chọn ít nhất một ứng dụng cần tối ưu.");
      return;
    }

    setBatchRunning(true);
    setBatchProgress({ current: 0, total: targetList.length, pkgName: "" });

    try {
      const summary = await window.api.fixBatchNotifications(
        activeDevice,
        targetList,
      );

      const newResults: Record<string, AppFixStatus> = {};
      const successSet = new Set<string>();

      for (const res of summary.results) {
        newResults[res.packageName] = {
          success: res.success,
          steps: res.steps,
          message: res.message,
        };
        if (res.success) successSet.add(res.packageName);
      }

      setFixResults((prev) => ({ ...prev, ...newResults }));

      setApps((prev) =>
        prev.map((a) =>
          successSet.has(a.packageName)
            ? {
                ...a,
                isFixed: true,
                dozeWhitelisted: true,
                backgroundAllowed: true,
              }
            : a,
        ),
      );

      if (summary.success) {
        toast.success(
          `Hoàn tất! Đã tối ưu ${summary.count}/${summary.total} ứng dụng.`,
        );
      } else {
        toast.warning(summary.message || "Không thể tối ưu thông báo.");
      }
    } catch (err: any) {
      toast.error("Lỗi khi xử lý hàng loạt: " + err.message);
    } finally {
      setBatchRunning(false);
      setBatchProgress(null);
    }
  };

  // Hoàn tác batch
  const handleRestoreSelected = async () => {
    if (!activeDevice || !window.api?.restoreBatchNotifications || batchRunning)
      return;
    const targetList = Array.from(selectedPackages);
    setBatchRunning(true);
    try {
      const res = await window.api.restoreBatchNotifications(
        activeDevice,
        targetList.length > 0 ? targetList : undefined,
      );
      if (res.success) {
        toast.success(res.message);
        await loadApps();
      } else {
        toast.warning(res.message);
      }
    } catch (err: any) {
      toast.error("Lỗi khi hoàn tác: " + err.message);
    } finally {
      setBatchRunning(false);
    }
  };

  if (!isOpen) return null;

  // Lấy icon danh mục
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "chat":
        return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
      case "banking":
        return <Landmark className="w-3.5 h-3.5 text-emerald-500" />;
      case "shopping":
        return <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />;
      case "utility":
        return <Wrench className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const modalContent = (
    <div
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={() => {
        if (!batchRunning) onClose();
      }}
    >
      <div
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        className="relative flex flex-col w-full max-w-4xl h-[92vh] max-h-[860px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP DECORATIVE ACCENT BAR */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shrink-0" />

        {/* HEADER SECTION */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 shrink-0">
              <Bell className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Khắc phục trễ thông báo Xiaomi / HyperOS
                </h3>
                <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80">
                  MIUI & HyperOS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tự động cấu hình Doze, Standby Bucket, AppOps 10008 / 10053 cho Zalo, Messenger, Telegram, MoMo, App Ngân hàng...
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={batchRunning}
            className="group flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-[#ff5f57] text-red-950 shadow-sm transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
            title="Đóng cửa sổ (Esc)"
            aria-label="Đóng cửa sổ"
          >
            <X className="h-3 w-3 opacity-70 transition-opacity group-hover:opacity-100" />
          </button>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS (COMPACT & CLEAN) */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* SEARCH BOX */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh app (Zalo, Momo, MB Bank, Shopee...)"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
            />
          </div>

          {/* FILTER PILLS */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 text-xs font-bold text-slate-600 dark:text-slate-300">
            {[
              { id: "recommended", label: "Gợi ý ưu tiên" },
              { id: "all", label: "Tất cả" },
              { id: "not_fixed", label: "Chưa tối ưu" },
              { id: "fixed", label: "Đã tối ưu" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition text-xs ${
                  filterMode === tab.id
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SELECT ACTIONS */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={selectAll}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              Chọn lọc ({filteredApps.length})
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition"
            >
              Bỏ chọn
            </button>
          </div>
        </div>

        {/* BATCH PROGRESS BAR */}
        {batchRunning && batchProgress && (
          <div className="px-6 py-2.5 bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-900 shrink-0 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200 mb-1.5">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                Đang xử lý: {batchProgress.pkgName || "Khởi tạo..."}
              </span>
              <span>
                {batchProgress.current} / {batchProgress.total} (
                {Math.round((batchProgress.current / batchProgress.total) * 100)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-blue-200 dark:bg-blue-900/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300 shadow-sm"
                style={{
                  width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* APP LIST VIEW */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 dark:divide-slate-800/80 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-slate-400">
              <Loader2 className="h-9 w-9 animate-spin text-blue-500 mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Đang quét ứng dụng trên thiết bị...
              </p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng chờ trong giây lát.</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-slate-400 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500 mb-2 opacity-80" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Không tìm thấy ứng dụng phù hợp
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Hãy thử đổi từ khóa tìm kiếm hoặc bấm tab "Tất cả" để xem toàn bộ ứng dụng người dùng.
              </p>
            </div>
          ) : (
            filteredApps.map((app) => {
              const isSelected = selectedPackages.has(app.packageName);
              const result = fixResults[app.packageName];
              const isCurrentlyFixing = fixingPackage === app.packageName;
              const isOptimized = result ? result.success : app.isFixed;

              return (
                <div
                  key={app.packageName}
                  className={`flex items-center justify-between px-6 py-3.5 transition-colors ${
                    isSelected
                      ? "bg-blue-50/50 dark:bg-blue-950/20"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  {/* APP INFO */}
                  <div className="flex items-center gap-3.5 min-w-0 mr-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(app.packageName)}
                      className="h-4 w-4 rounded-md border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />

                    {/* APP ICON AVATAR */}
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700">
                      {getCategoryIcon(app.category)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {app.name}
                        </span>
                        {app.isRecommended && (
                          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100/80 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                            Khuyên dùng
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {app.packageName}
                      </p>
                    </div>
                  </div>

                  {/* STATUS & ACTIONS */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* STATUS BADGE */}
                    {isCurrentlyFixing ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Đang tối ưu...
                      </span>
                    ) : isOptimized ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Đã tối ưu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Chưa tối ưu
                      </span>
                    )}

                    {/* QUICK FIX BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleFixSingle(app.packageName)}
                      disabled={isCurrentlyFixing || batchRunning}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 transition border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                    >
                      <Zap className="h-3.5 w-3.5 text-amber-500 group-hover:text-white" />
                      <span>Fix</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER ACTIONS BAR */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>
              Đã chọn:{" "}
              <strong className="text-blue-600 dark:text-blue-400 font-extrabold text-sm">
                {selectedPackages.size}
              </strong>{" "}
              / {apps.length} ứng dụng
            </span>
            <button
              type="button"
              onClick={loadApps}
              disabled={loading || batchRunning}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold"
              title="Quét lại toàn bộ ứng dụng từ điện thoại"
            >
              <RotateCcw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Quét lại
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={batchRunning}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleRestoreSelected}
              disabled={batchRunning || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
              title="Khôi phục trạng thái cũ từ bản sao lưu an toàn"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Hoàn tác Snapshot</span>
            </button>

            <button
              type="button"
              onClick={handleFixSelected}
              disabled={batchRunning || loading || selectedPackages.size === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-extrabold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {batchRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-amber-300" />
              )}
              <span>Tối ưu {selectedPackages.size} ứng dụng đã chọn</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
