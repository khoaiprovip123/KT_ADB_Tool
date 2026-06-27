import { Search, RefreshCw, Copy, Check } from "lucide-react";

interface DeviceProfilePanelProps {
  loading: boolean;
  activeProfileTab: "props" | "settings_global" | "settings_secure" | "settings_system";
  setActiveProfileTab: (tab: any) => void;
  profileSearch: string;
  setProfileSearch: (search: string) => void;
  filteredProps: Array<{ key: string; value: string }>;
  filteredSettings: Array<{ key: string; value: string }>;
  copiedKey: string | null;
  handleCopyToClipboard: (text: string, label: string) => void;
}

export function DeviceProfilePanel({
  loading,
  activeProfileTab,
  setActiveProfileTab,
  profileSearch,
  setProfileSearch,
  filteredProps,
  filteredSettings,
  copiedKey,
  handleCopyToClipboard,
}: DeviceProfilePanelProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4 border-b border-slate-100 shrink-0">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar select-none">
          {[
            { id: "props", label: "System Properties (getprop)" },
            { id: "settings_global", label: "Settings Global" },
            { id: "settings_secure", label: "Settings Secure" },
            { id: "settings_system", label: "Settings System" },
          ].map((pTab) => (
            <button
              key={pTab.id}
              onClick={() => {
                setActiveProfileTab(pTab.id);
                setProfileSearch("");
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] lg:text-[11px] font-black transition-all whitespace-nowrap border ${
                activeProfileTab === pTab.id
                  ? "bg-indigo-600 border-indigo-600/10 text-white shadow-md shadow-indigo-500/20"
                  : "bg-slate-50 border-slate-200/60 text-slate-655 hover:bg-slate-100 hover:text-slate-850"
              }`}
            >
              {pTab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm kiếm key hoặc value..."
            value={profileSearch}
            onChange={(e) => setProfileSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400 font-semibold shadow-inner"
          />
        </div>
      </div>

      {/* Flat Table List for Key-Values Explorer */}
      <div className="flex-1 overflow-y-auto mt-4 custom-scrollbar rounded-2xl border border-slate-200/60 bg-slate-50/20">
        {loading ? (
          <div className="py-24 text-center animate-pulse text-slate-550 font-extrabold text-sm flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <span>Đang trích xuất dữ liệu nâng cao...</span>
          </div>
        ) : activeProfileTab === "props" ? (
          filteredProps.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-bold select-none">
              Không tìm thấy bản ghi nào khớp.
            </div>
          ) : (
            <div className="divide-y divide-slate-200/60">
              {filteredProps.map((p, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-indigo-50/20 transition-colors gap-3 group"
                >
                  <div className="font-mono text-xs font-black text-indigo-655 break-all select-all flex-1 pr-4">
                    {p.key}
                  </div>
                  <div className="flex items-center gap-2 max-w-full sm:max-w-[65%] shrink-0">
                    <span className="font-mono text-[11px] text-slate-655 bg-white border border-slate-200 rounded-xl px-3 py-1.5 break-all select-all shadow-sm">
                      {p.value}
                    </span>
                    <button
                      onClick={() => handleCopyToClipboard(p.value, p.key)}
                      className="p-2 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                      title="Copy giá trị"
                    >
                      {copiedKey === p.value ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredSettings.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-bold select-none">
            Không tìm thấy bản ghi nào khớp.
          </div>
        ) : (
          <div className="divide-y divide-slate-200/60">
            {filteredSettings.map((s, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-cyan-50/15 transition-colors gap-3 group"
              >
                <div className="font-mono text-xs font-black text-cyan-700 break-all select-all flex-1 pr-4">
                  {s.key}
                </div>
                <div className="flex items-center gap-2 max-w-full sm:max-w-[65%] shrink-0">
                  <span className="font-mono text-[11px] text-slate-655 bg-white border border-slate-200 rounded-xl px-3 py-1.5 break-all select-all shadow-sm">
                    {s.value}
                  </span>
                  <button
                    onClick={() => handleCopyToClipboard(s.value, s.key)}
                    className="p-2 hover:bg-slate-100 text-slate-400 hover:text-cyan-700 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                    title="Copy giá trị"
                  >
                    {copiedKey === s.value ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
