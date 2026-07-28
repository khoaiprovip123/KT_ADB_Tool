import React, { useState, useEffect, useMemo } from "react";
import { Shield, Plus, Trash2, X, Check, Search, RefreshCw, Smartphone, ListFilter } from "lucide-react";
import { AppInfo } from "@shared/types";

interface WhitelistModalProps {
  isOpen: boolean;
  onClose: () => void;
  whitelist: string[];
  onSave: (newWhitelist: string[]) => void;
  deviceId?: string;
}

export const WhitelistModal: React.FC<WhitelistModalProps> = ({
  isOpen,
  onClose,
  whitelist,
  onSave,
  deviceId,
}) => {
  const [list, setList] = useState<string[]>(whitelist);
  const [activeTab, setActiveTab] = useState<"scan" | "manual">("scan");
  const [deviceApps, setDeviceApps] = useState<AppInfo[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [appFilter, setAppFilter] = useState<"third" | "all">("third");
  const [manualPkg, setManualPkg] = useState("");

  // Đồng bộ props whitelist
  useEffect(() => {
    setList(whitelist);
  }, [whitelist, isOpen]);

  // Quét danh sách app từ thiết bị khi mở modal
  const fetchPackages = async () => {
    if (!deviceId) return;
    setIsLoadingApps(true);
    try {
      const apps = await window.api.getPackages(deviceId, appFilter);
      setDeviceApps(apps || []);
    } catch (err) {
      console.error("[WHITELIST] Fetch apps error:", err);
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    if (isOpen && deviceId) {
      fetchPackages();
    }
  }, [isOpen, deviceId, appFilter]);

  // Lọc app theo tìm kiếm
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return deviceApps;
    const query = searchQuery.toLowerCase().trim();
    return deviceApps.filter((app) => app.pkg.toLowerCase().includes(query));
  }, [deviceApps, searchQuery]);

  if (!isOpen) return null;

  const togglePackage = (pkg: string) => {
    if (list.includes(pkg)) {
      setList(list.filter((item) => item !== pkg));
    } else {
      setList([...list, pkg]);
    }
  };

  const handleAddManual = () => {
    const trimmed = manualPkg.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setManualPkg("");
    }
  };

  const handleRemove = (pkg: string) => {
    setList(list.filter((item) => item !== pkg));
  };

  const handleSave = () => {
    onSave(list);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Danh Sách Ngoại Lệ (Whitelist)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tích chọn ứng dụng để BẢO VỆ không bị đóng ngầm.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab("scan")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "scan"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Quét App Thiết Bị</span>
              </button>
              <button
                onClick={() => setActiveTab("manual")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "manual"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Đã Chọn ({list.length})</span>
              </button>
            </div>

            {activeTab === "scan" && (
              <div className="flex items-center gap-2">
                <select
                  value={appFilter}
                  onChange={(e) => setAppFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <option value="third">App Cài Thêm</option>
                  <option value="all">Tất Cả App</option>
                </select>

                <button
                  onClick={fetchPackages}
                  disabled={isLoadingApps}
                  className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                  title="Tải lại danh sách"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApps ? "animate-spin text-indigo-600" : ""}`} />
                </button>
              </div>
            )}
          </div>

          {/* Search Box */}
          {activeTab === "scan" && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm ứng dụng (VD: zalo, facebook, messenger...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-4 overflow-y-auto flex-1 max-h-80 space-y-2">
          {activeTab === "scan" ? (
            isLoadingApps ? (
              <div className="py-12 text-center text-slate-400 space-y-2 animate-pulse">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                <p className="text-xs font-medium">Đang quét ứng dụng trên thiết bị...</p>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Không tìm thấy ứng dụng phù hợp.
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredApps.map((app) => {
                  const isChecked = list.includes(app.pkg);
                  return (
                    <div
                      key={app.pkg}
                      onClick={() => togglePackage(app.pkg)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 shadow-sm"
                          : "bg-white dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Controlled via parent onClick
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 block">
                            {app.pkg}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {app.type === "system" ? "Hệ thống" : "Cài thêm"} • Status: {app.status}
                          </span>
                        </div>
                      </div>

                      {isChecked && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                          Bảo vệ
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Tab Thủ Công & Quản Lý Đã Chọn */
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập package thủ công (VD: com.zing.zalo)"
                  value={manualPkg}
                  onChange={(e) => setManualPkg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleAddManual}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {list.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">Chưa có ứng dụng nào trong Whitelist.</div>
                ) : (
                  list.map((pkg) => (
                    <div
                      key={pkg}
                      className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-mono text-slate-700 dark:text-slate-300"
                    >
                      <span>{pkg}</span>
                      <button
                        onClick={() => handleRemove(pkg)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Đã chọn bảo vệ <strong className="text-indigo-600 dark:text-indigo-400">{list.length}</strong> ứng dụng
          </span>

          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-xl">
              Hủy Bỏ
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Lưu Thay Đổi ({list.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
