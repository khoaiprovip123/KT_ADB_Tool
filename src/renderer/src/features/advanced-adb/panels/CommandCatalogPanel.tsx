import { Search, Wifi, Settings, Play, RotateCcw, Maximize2, Minimize2, Terminal, RefreshCcw } from "lucide-react";
import { AdvancedCommandDefinition } from "../types";

interface CommandCatalogPanelProps {
  catalogSearch: string;
  setCatalogSearch: (search: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  commandParams: Record<string, string>;
  handleParamChange: (key: string, val: string) => void;
  handleExecutePreset: (cmdId: string, actionType: "read" | "apply" | "rollback") => Promise<void>;
  catalogProcessingId: string | null;
  catalogOutput: string;
  setCatalogOutput: (out: string) => void;
  isCatalogTerminalMaximized: boolean;
  setIsCatalogTerminalMaximized: (max: boolean) => void;
  filteredCommands: AdvancedCommandDefinition[];
}

export function CommandCatalogPanel({
  catalogSearch,
  setCatalogSearch,
  selectedCategory,
  setSelectedCategory,
  commandParams,
  handleParamChange,
  handleExecutePreset,
  catalogProcessingId,
  catalogOutput,
  setCatalogOutput,
  isCatalogTerminalMaximized,
  setIsCatalogTerminalMaximized,
  filteredCommands,
}: CommandCatalogPanelProps) {
  const getRiskBadgeStyles = (risk: string) => {
    switch (risk) {
      case "SAFE":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "MEDIUM":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "RISKY":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "DANGEROUS":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20 font-black animate-pulse";
      default:
        return "bg-slate-500/10 text-slate-655 border-slate-500/20";
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Category selectors */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4 border-b border-slate-100 shrink-0">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar select-none">
          {[
            { id: "all", label: "Tất cả" },
            { id: "diagnostics", label: "Diagnostics" },
            { id: "appops", label: "AppOps" },
            { id: "permissions", label: "Permissions" },
            { id: "settings", label: "Settings" },
            { id: "components", label: "Components" },
            { id: "network", label: "Network" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 border rounded-xl text-[10px] lg:text-[11px] font-black transition-all capitalize whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-indigo-600 border-indigo-650/10 text-white shadow-md shadow-indigo-500/10"
                  : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm kiếm preset..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400 font-semibold shadow-inner"
          />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-5 overflow-hidden mt-4 relative">
        {/* Left: Command Card List */}
        <div
          className={`overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-4 transition-all duration-300 lg:col-span-3 ${isCatalogTerminalMaximized ? "hidden lg:hidden" : ""}`}
        >
          {filteredCommands.length === 0 ? (
            <div className="text-center py-20 text-slate-500 font-bold select-none">
              Không tìm thấy câu lệnh phù hợp.
            </div>
          ) : (
            filteredCommands.map((cmd) => {
              const previewText = cmd.applyTemplate || cmd.readTemplate || "";
              const hasPackageParam = previewText.includes("{package}");
              const hasPermParam = previewText.includes("{permission}");
              const hasValueParam = previewText.includes("{value}");

              return (
                <div
                  key={cmd.id}
                  className={`rounded-2xl p-4.5 border transition-all duration-300 flex flex-col justify-between group shadow-sm ${
                    cmd.risk === "DANGEROUS"
                      ? "bg-gradient-to-br from-rose-500/[0.02] to-transparent border-rose-250 hover:border-rose-450"
                      : cmd.risk === "RISKY"
                        ? "bg-gradient-to-br from-amber-500/[0.02] to-transparent border-amber-250 hover:border-amber-450"
                        : "bg-white hover:bg-slate-50 border-slate-200/60 hover:border-indigo-500/30"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-3 select-none">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-455">
                        {cmd.category}
                      </span>
                      <span
                        className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border tracking-wider uppercase ${getRiskBadgeStyles(
                          cmd.risk
                        )}`}
                      >
                        Risk: {cmd.risk}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-[14px] leading-snug text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                      {cmd.id === "net_fix_captive_portal" && <Wifi className="w-4 h-4 text-emerald-500" />}
                      {cmd.id === "perm_write_secure_settings" && <Settings className="w-4 h-4 text-amber-500" />}
                      <span>{cmd.title}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
                      {cmd.description}
                    </p>

                    {/* Parameters inputs */}
                    {(hasPackageParam || hasPermParam || hasValueParam) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100">
                        {hasPackageParam && (
                          <div>
                            <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                              Package Name
                            </label>
                            <input
                              type="text"
                              placeholder="com.example.app"
                              value={commandParams.package || ""}
                              onChange={(e) => handleParamChange("package", e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 font-bold"
                            />
                          </div>
                        )}
                        {hasPermParam && (
                          <div>
                            <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                              Permission Name
                            </label>
                            <input
                              type="text"
                              placeholder="android.permission.CAMERA"
                              value={commandParams.permission || ""}
                              onChange={(e) => handleParamChange("permission", e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 font-bold"
                            />
                          </div>
                        )}
                        {hasValueParam && (
                          <div>
                            <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                              Value / Mode
                            </label>
                            <input
                              type="text"
                              placeholder="allow / ignore / 1 / 0"
                              value={commandParams.value || ""}
                              onChange={(e) => handleParamChange("value", e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 font-bold"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Buttons group */}
                  <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-slate-100 shrink-0 select-none">
                    {cmd.readTemplate && (
                      <button
                        onClick={() => handleExecutePreset(cmd.id, "read")}
                        disabled={catalogProcessingId === cmd.id}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-750 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        <RefreshCcw className="w-3 h-3" />
                        Đọc giá trị
                      </button>
                    )}
                    {cmd.applyTemplate && (
                      <button
                        onClick={() => handleExecutePreset(cmd.id, "apply")}
                        disabled={catalogProcessingId === cmd.id}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-755 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md shadow-indigo-500/10 transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Áp dụng
                      </button>
                    )}
                    {cmd.rollbackTemplate && (
                      <button
                        onClick={() => handleExecutePreset(cmd.id, "rollback")}
                        disabled={catalogProcessingId === cmd.id}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Hoàn tác
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Output Terminal Console */}
        <div
          className={`bg-slate-950 rounded-[28px] border border-white/5 flex flex-col overflow-hidden shadow-2xl relative transition-all duration-300 ${
            isCatalogTerminalMaximized ? "lg:col-span-5 h-full" : "lg:col-span-2 h-full min-h-[300px]"
          }`}
        >
          {/* Scanline CRT overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-10 opacity-70"></div>
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              backgroundImage: "radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.4) 100%)",
            }}
          ></div>

          {/* Terminal Title Bar */}
          <div className="bg-slate-900 border-b border-white/5 px-4 py-3 flex items-center justify-between shrink-0 select-none z-20">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Preset Terminal Console
              </span>
            </div>
            <div className="flex items-center gap-2">
              {catalogOutput && (
                <button
                  onClick={() => setCatalogOutput("")}
                  className="px-2 py-0.5 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded text-[8px] font-black uppercase tracking-wider transition-colors"
                >
                  Clear Console
                </button>
              )}
              <button
                onClick={() => setIsCatalogTerminalMaximized(!isCatalogTerminalMaximized)}
                className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                {isCatalogTerminalMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Console Text body */}
          <div className="flex-1 p-5 overflow-y-auto custom-scrollbar font-mono text-[11px] text-cyan-400 leading-relaxed select-all z-20">
            {catalogOutput ? (
              <pre className="whitespace-pre-wrap break-all font-mono">{catalogOutput}</pre>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-semibold select-none">
                Chưa có kết quả lệnh chạy...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
