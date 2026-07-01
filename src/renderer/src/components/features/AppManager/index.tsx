import React, { useEffect, useState } from "react";
import {
  Package,
  Search,
  ListFilter,
  ChevronDown,
  Upload,
  RefreshCcw,
  User,
  Settings,
  Ban,
  CheckSquare,
  Square,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDeviceStore } from "../../../store/deviceStore";
import { BatchResultModal } from "../BatchResultModal";

import { AppInfo } from "./types";
import { CACHE_KEY_PREFIX } from "./constants";
import { useAppFiltering } from "./hooks/useAppFiltering";
import { useAppSelection } from "./hooks/useAppSelection";
import { useAppActions } from "./hooks/useAppActions";
import { AppRow } from "./components/AppRow";
import { BatchActionBar } from "./components/BatchActionBar";

function FilterBtn({
  active,
  onClick,
  label,
  icon,
  isWarning,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  isWarning?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-5 py-2 rounded-full transition-all duration-300 font-bold text-[12px] whitespace-nowrap ${
        active
          ? isWarning
            ? "text-red-600"
            : "text-blue-600"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {active && (
        <motion.div
          layoutId="active-filter-bg"
          className={`absolute inset-0 rounded-full shadow-sm border ${isWarning ? "bg-red-50 border-red-100" : "bg-white border-slate-200/50"}`}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );
}



export function AppManager() {
  const { activeDevice, devices } = useDeviceStore();
  const [packages, setPackages] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const filtering = useAppFiltering(packages);
  const selection = useAppSelection(packages, filtering.filteredPackages);
  const actions = useAppActions(
    activeDevice,
    packages,
    setPackages,
    selection.selectedApps,
    selection.clearSelection,
    loadPackages,
  );

  useEffect(() => {
    if (activeDevice) {
      loadPackages(false);
      selection.clearSelection();
      filtering.setPresetFilter("none");
    }
  }, [activeDevice]);

  // Keyboard shortcuts phase 2
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A Select all
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        selection.selectAll();
      }
      // Delete key
      if (e.key === "Delete" && selection.selectedApps.size > 0) {
        e.preventDefault();
        actions.handleBatchAction("uninstall");
      }
      // Escape clear selection
      if (e.key === "Escape") {
        e.preventDefault();
        selection.clearSelection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selection, actions]);

  async function loadPackages(forceRefresh = false) {
    if (!activeDevice) return;
    const cacheKey = `${CACHE_KEY_PREFIX}${activeDevice}`;

    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setPackages(JSON.parse(cached));
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }
    }

    if (forceRefresh || packages.length === 0) {
      setLoading(true);
    }

    try {
      const pkgs: AppInfo[] = await window.api.getPackages(activeDevice, "all");
      setPackages(pkgs);
      localStorage.setItem(cacheKey, JSON.stringify(pkgs));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const currentDevice = devices.find((d) => d.id === activeDevice);
  const isBootloader = currentDevice?.type === "bootloader";

  if (!activeDevice) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-3xl m-8">
        <Package className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-700">Chưa có thiết bị</h3>
        <p className="text-slate-500 mt-2 text-center max-w-sm">
          Vui lòng kết nối thiết bị Android để quản lý ứng dụng.
        </p>
      </div>
    );
  }

  if (isBootloader) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-3xl m-8 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse" />
        <Package className="w-16 h-16 text-cyan-400 mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-cyan-400">Thiết bị đang ở chế độ Fastboot</h3>
        <p className="text-slate-400 mt-2 text-center max-w-sm text-xs leading-relaxed font-semibold">
          Quản lý ứng dụng yêu cầu thiết bị ở chế độ bình thường (ADB). Vui lòng chuyển qua tab Bảng điều khiển để khởi động lại thiết bị.
        </p>
      </div>
    );
  }

  const applyPreset = (presetKey: string) => {
    filtering.setPresetFilter(presetKey);
    selection.applyPresetSelection(presetKey);
    filtering.setFilter("all");
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
      <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 border border-white/50 shadow-xl shadow-blue-900/5 mb-6 shrink-0 relative z-10">
        <div className="flex flex-col gap-6">
          <div className="flex justify-center">
            <div className="inline-flex bg-slate-200/30 p-1 rounded-[2rem] border border-slate-200/50 shadow-inner">
              <FilterBtn
                active={filtering.filter === "all"}
                onClick={() => filtering.setFilter("all")}
                label={`Tất cả (${loading ? "..." : packages.length})`}
                icon={<Package size={14} />}
              />
              <FilterBtn
                active={filtering.filter === "user"}
                onClick={() => filtering.setFilter("user")}
                label={`Người dùng (${loading ? "..." : filtering.userCount})`}
                icon={<User size={14} />}
              />
              <FilterBtn
                active={filtering.filter === "system"}
                onClick={() => filtering.setFilter("system")}
                label={`Hệ thống (${loading ? "..." : filtering.systemCount})`}
                icon={<Settings size={14} />}
                isWarning
              />
              <FilterBtn
                active={filtering.filter === "disabled"}
                onClick={() => filtering.setFilter("disabled")}
                label={`Đã tắt (${loading ? "..." : filtering.disabledCount})`}
                icon={<Ban size={14} />}
              />
            </div>
          </div>


          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative shrink-0">
              <select
                value={filtering.presetFilter}
                onChange={(e) => applyPreset(e.target.value)}
                className="pl-10 pr-10 py-3 bg-white/80 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none shadow-sm min-w-[200px] cursor-pointer"
              >
                <option value="none">Tất cả danh mục</option>
                <option value="xiaomi">Xiaomi Bloatware</option>
                <option value="samsung">Samsung Bloatware</option>
                <option value="google">Google Bloatware</option>
              </select>
              <ListFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="flex-1 relative group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Tìm kiếm (nhấn Ctrl+A để chọn tất cả)..."
                value={filtering.searchQuery}
                onChange={(e) => filtering.setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-inner"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={actions.handleInstallApk}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
              >
                <Upload size={18} />
                Cài APK
              </button>
              <button
                onClick={() => loadPackages(true)}
                disabled={loading}
                className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm"
                title="Làm mới"
              >
                <RefreshCcw
                  size={20}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white/60 backdrop-blur-3xl rounded-3xl border border-white/50 shadow-xl shadow-blue-900/5 flex flex-col relative z-0 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0 items-center">
          <div className="col-span-6 flex items-center gap-3">
            <button
              onClick={selection.selectAll}
              className={`p-1 -ml-1 rounded-md transition-colors ${selection.allSelected ? "text-blue-600" : "text-slate-400 hover:text-blue-600"}`}
            >
              {selection.allSelected ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tên Package
            </span>
          </div>
          <div className="col-span-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
            Trạng thái
          </div>
          <div className="col-span-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
            Thao tác
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 px-2 pb-2">
          {loading && packages.length === 0 ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-slate-100/50 rounded-2xl animate-pulse"
                ></div>
              ))}
            </div>
          ) : filtering.filteredPackages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Package className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Không tìm thấy ứng dụng</p>
            </div>
          ) : (
            <div className="flex-1 w-full overflow-y-auto custom-scrollbar">
              <div className="min-h-full pb-32">
                {filtering.paginatedPackages.map((app) => (
                  <AppRow
                    key={app.pkg}
                    app={app}
                    isSelected={selection.selectedApps.has(app.pkg)}
                    actionLoading={actions.actionLoading}
                    onToggleSelect={selection.toggleSelect}
                    onAction={actions.handleSingleAction}
                    onExtract={actions.handleExtract}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(selection.selectedApps.size > 0 || actions.batchProgress) && (
          <BatchActionBar
            selectedCount={selection.selectedApps.size}
            batchProgress={actions.batchProgress}
            onBatchAction={actions.handleBatchAction}
            onClearSelection={selection.clearSelection}
          />
        )}
      </AnimatePresence>

      <BatchResultModal
        result={actions.batchResult}
        onClose={() => actions.setBatchResult(null)}
      />
    </div>
  );
}
