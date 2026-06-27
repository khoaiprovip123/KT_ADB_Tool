import {
  Smartphone,
  ShieldAlert,
  RefreshCw,
  Info,
  Sliders,
  Terminal,
  History,
  Cpu,
  Zap,
  Globe,
} from "lucide-react";
import { useAdvancedAdb } from "./hooks/useAdvancedAdb";
import { DeviceProfilePanel } from "./panels/DeviceProfilePanel";
import { CommandCatalogPanel } from "./panels/CommandCatalogPanel";
import { RawShellPanel } from "./panels/RawShellPanel";
import { HistoryPanel } from "./panels/HistoryPanel";

export function AdvancedAdb() {
  const tweaks = useAdvancedAdb();

  return (
    <div className="absolute inset-4 lg:inset-6 flex flex-col overflow-hidden bg-[#f8fafc]/90 backdrop-blur-3xl rounded-[32px] p-5 lg:p-6 border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)] text-slate-800">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes warning-red-glow {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.25; }
        }
      `,
        }}
      />

      {!tweaks.activeDevice ? (
        <div className="text-center p-12 bg-white/60 backdrop-blur-2xl rounded-[32px] border border-slate-200/60 shadow-md flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-28 h-28 bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/50 rounded-full mx-auto mb-6 flex items-center justify-center shadow-inner relative select-none">
            <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-xl animate-pulse"></div>
            <Smartphone className="text-slate-500 w-12 h-12 relative z-10 animate-bounce" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2 select-none">
            Chưa kết nối thiết bị
          </h3>
          <p className="text-slate-500 max-w-sm text-sm font-medium">
            Kết nối thiết bị Android bằng cáp hoặc Wi-Fi và cấp quyền Gỡ lỗi USB để kích hoạt bảng điều khiển nâng cao.
          </p>
        </div>
      ) : tweaks.isUnauthorized || tweaks.isOffline ? (
        <div className="text-center p-12 bg-white/60 backdrop-blur-3xl rounded-[32px] border border-slate-200/60 shadow-md flex-1 flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>

          <div className="w-24 h-24 bg-gradient-to-tr from-rose-500/10 to-amber-500/10 border border-rose-500/20 rounded-[28px] mx-auto mb-6 flex items-center justify-center shadow-md relative animate-pulse select-none">
            <ShieldAlert className="text-rose-550 w-11 h-11 relative z-10" />
          </div>

          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2 select-none">
            {tweaks.isUnauthorized ? "Thiết bị chưa được xác thực" : "Thiết bị đang ngoại tuyến"}
          </h3>
          <p className="text-slate-500 max-w-md text-sm mb-8 leading-relaxed font-semibold">
            {tweaks.isUnauthorized
              ? "Vui lòng kiểm tra màn hình điện thoại của bạn và xác nhận quyền gỡ lỗi USB để kích hoạt các tính năng ADB nâng cao."
              : "Thiết bị đã ngắt kết nối hoặc phản hồi chậm. Vui lòng kiểm tra lại cáp USB hoặc trạng thái kết nối."}
          </p>

          {tweaks.isUnauthorized && (
            <div className="w-full max-w-md bg-slate-50 border border-slate-200/60 rounded-2xl p-5 mb-8 text-left space-y-3.5 shadow-sm">
              <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-widest block mb-1">
                HƯỚNG DẪN XỬ LÝ NHANH
              </span>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-xs text-slate-655 font-semibold leading-relaxed">
                  Mở khóa màn hình điện thoại Android của bạn.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-xs text-slate-655 font-semibold leading-relaxed">
                  Một hộp thoại yêu cầu cấp quyền <strong className="text-slate-800">&quot;Cho phép gỡ lỗi USB?&quot;</strong> sẽ xuất hiện.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p className="text-xs text-slate-655 font-semibold leading-relaxed">
                  Tích chọn <strong className="text-slate-800">&quot;Luôn cho phép từ máy tính này&quot;</strong> và nhấn <strong className="text-indigo-650">Cho phép (OK)</strong>.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={tweaks.loadDeviceProfile}
            disabled={tweaks.loading}
            className="px-6 py-3.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 active:scale-97 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-rose-500/15 flex items-center gap-2 border border-rose-500/10"
          >
            <RefreshCw className={`w-4 h-4 ${tweaks.loading ? "animate-spin" : ""}`} />
            <span>Tôi đã cấp quyền - Quét lại ngay</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-4">
          {/* TOP HEADER BAR */}
          <div className="bg-white/80 border border-slate-200/80 p-4 rounded-[28px] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 select-none">
            <div className="flex items-center gap-4.5">
              {tweaks.deviceProfile ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-2.5 shrink-0 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-indigo-650" />
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 shrink-0 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-slate-450" />
                </div>
              )}
              <div>
                <span className="text-[9px] font-black text-indigo-650 uppercase tracking-widest block">
                  ADVANCED PANEL
                </span>
                <h2 className="text-base font-black text-slate-800 tracking-tight leading-tight">
                  {tweaks.deviceProfile
                    ? `${tweaks.deviceProfile.manufacturer} ${tweaks.deviceProfile.model}`
                    : "Đang nạp thiết bị..."}
                </h2>
                {tweaks.deviceProfile && (
                  <p className="text-[10px] font-bold text-slate-450 mt-0.5">
                    Android {tweaks.deviceProfile.release} • SDK {tweaks.deviceProfile.sdk} • Serial: {tweaks.activeDevice}
                  </p>
                )}
              </div>
            </div>

            {/* Horizontal Nav Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200/60 max-w-full overflow-x-auto custom-scrollbar">
              <button
                onClick={() => tweaks.setSubTab("profile")}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 ${
                  tweaks.subTab === "profile"
                    ? "bg-white text-indigo-650 shadow-sm border border-slate-200/30"
                    : "text-slate-500 hover:text-slate-850 hover:bg-white/50"
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Device Explorer</span>
              </button>
              <button
                onClick={() => tweaks.setSubTab("catalog")}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 ${
                  tweaks.subTab === "catalog"
                    ? "bg-white text-indigo-650 shadow-sm border border-slate-200/30"
                    : "text-slate-500 hover:text-slate-850 hover:bg-white/50"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Command Catalog</span>
              </button>
              <button
                onClick={() => tweaks.setSubTab("shell")}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 ${
                  tweaks.subTab === "shell"
                    ? "bg-white text-indigo-650 shadow-sm border border-slate-200/30"
                    : "text-slate-500 hover:text-slate-850 hover:bg-white/50"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Raw Shell Runner</span>
              </button>
              <button
                onClick={() => tweaks.setSubTab("history")}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 ${
                  tweaks.subTab === "history"
                    ? "bg-white text-indigo-650 shadow-sm border border-slate-200/30"
                    : "text-slate-500 hover:text-slate-850 hover:bg-white/50"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Lịch sử lệnh</span>
              </button>
            </div>
          </div>

          {/* HUD status */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-white border border-slate-200/60 rounded-[22px] shadow-sm select-none shrink-0">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">LÕI ADB:</span>
                <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-550 animate-ping"></span>
                  Active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className={`w-4 h-4 ${tweaks.hudBattery.charging ? "text-amber-500 animate-bounce" : "text-slate-400"}`} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">PIN:</span>
                <span className="text-[10px] font-mono font-extrabold text-slate-700">
                  {tweaks.hudBattery.level}% <span className="text-[9px] text-slate-450 font-sans font-bold">({tweaks.hudBattery.temp}°C)</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-600" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">IP LAN:</span>
                <span className="text-[10px] font-mono font-extrabold text-slate-655 bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 rounded-lg">
                  {tweaks.hudNetwork.ip}
                </span>
              </div>
            </div>

            <button
              onClick={tweaks.loadDeviceProfile}
              disabled={tweaks.loading}
              className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:scale-95 text-slate-600 hover:text-slate-800 disabled:opacity-50 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${tweaks.loading ? "animate-spin" : ""}`} />
              <span>Quét lại toàn bộ</span>
            </button>
          </div>

          {/* Content panel */}
          <div className="flex-1 min-h-0 bg-white backdrop-blur-2xl rounded-[32px] border border-slate-200 p-5 lg:p-6 flex flex-col overflow-hidden shadow-sm relative">
            {tweaks.subTab === "profile" && (
              <DeviceProfilePanel
                loading={tweaks.loading}
                activeProfileTab={tweaks.activeProfileTab}
                setActiveProfileTab={tweaks.setActiveProfileTab}
                profileSearch={tweaks.profileSearch}
                setProfileSearch={tweaks.setProfileSearch}
                filteredProps={tweaks.filteredProps}
                filteredSettings={tweaks.filteredSettings}
                copiedKey={tweaks.copiedKey}
                handleCopyToClipboard={tweaks.handleCopyToClipboard}
              />
            )}

            {tweaks.subTab === "catalog" && (
              <CommandCatalogPanel
                catalogSearch={tweaks.catalogSearch}
                setCatalogSearch={tweaks.setCatalogSearch}
                selectedCategory={tweaks.selectedCategory}
                setSelectedCategory={tweaks.setSelectedCategory}
                commandParams={tweaks.commandParams}
                handleParamChange={tweaks.handleParamChange}
                handleExecutePreset={tweaks.handleExecutePreset}
                catalogProcessingId={tweaks.catalogProcessingId}
                catalogOutput={tweaks.catalogOutput}
                setCatalogOutput={tweaks.setCatalogOutput}
                isCatalogTerminalMaximized={tweaks.isCatalogTerminalMaximized}
                setIsCatalogTerminalMaximized={tweaks.setIsCatalogTerminalMaximized}
                filteredCommands={tweaks.filteredCommands}
              />
            )}

            {tweaks.subTab === "shell" && (
              <RawShellPanel
                shellInput={tweaks.shellInput}
                setShellInput={tweaks.setShellInput}
                shellLogs={tweaks.shellLogs}
                setShellLogs={tweaks.setShellLogs}
                rawShellUnlocked={tweaks.rawShellUnlocked}
                slideValue={tweaks.slideValue}
                isShellTerminalMaximized={tweaks.isShellTerminalMaximized}
                setIsShellTerminalMaximized={tweaks.setIsShellTerminalMaximized}
                handleShellSubmit={tweaks.handleShellSubmit}
                handleKeyDown={tweaks.handleKeyDown}
                handleSlideChange={tweaks.handleSlideChange}
                handleSlideEnd={tweaks.handleSlideEnd}
              />
            )}

            {tweaks.subTab === "history" && (
              <HistoryPanel
                historyItems={tweaks.historyItems}
                copiedKey={tweaks.copiedKey}
                handleCopyToClipboard={tweaks.handleCopyToClipboard}
              />
            )}
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {tweaks.confirmModal && tweaks.confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-[4px] z-[9999] flex items-center justify-center p-4 select-none">
          <div className="bg-white border border-slate-200/80 rounded-[32px] w-full max-w-lg p-6 shadow-2xl shadow-slate-900/25 transform scale-100 transition-all">
            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-slate-100 select-none">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  tweaks.confirmModal.risk === "DANGEROUS"
                    ? "bg-rose-500/10 text-rose-600"
                    : tweaks.confirmModal.risk === "RISKY"
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-indigo-500/10 text-indigo-650"
                }`}
              >
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border select-none tracking-widest ${
                    tweaks.confirmModal.risk === "DANGEROUS"
                      ? "bg-rose-500/10 text-rose-600 border-rose-500/20 font-black"
                      : tweaks.confirmModal.risk === "RISKY"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-indigo-500/10 text-indigo-655 border-indigo-500/20"
                  }`}
                >
                  {tweaks.confirmModal.risk} RISK LEVEL
                </span>
                <h3 className="font-black text-slate-800 text-[17px] mt-1 tracking-tight">
                  {tweaks.confirmModal.title}
                </h3>
              </div>
            </div>

            <div className="mb-5">
              <p className="text-xs text-slate-655 leading-relaxed font-semibold">
                {tweaks.confirmModal.message}
              </p>
            </div>

            <div className="mb-6 select-none">
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5">
                CÂU LỆNH ADB SẼ CHẠY
              </span>
              <div className="bg-slate-950 border border-white/5 p-4 rounded-2xl font-mono text-[11px] text-cyan-400 select-all break-all shadow-inner leading-relaxed">
                {tweaks.confirmModal.commandText}
              </div>
            </div>

            <div className="flex gap-3 justify-end select-none">
              <button
                onClick={() => tweaks.setConfirmModal(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 transition-all duration-200 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 active:scale-95"
              >
                Hủy bỏ
              </button>
              <button
                onClick={tweaks.confirmModal.onConfirm}
                className={`px-5 py-3 text-white text-xs font-extrabold rounded-2xl shadow-lg transition-all duration-200 active:scale-95 ${
                  tweaks.confirmModal.risk === "DANGEROUS"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                    : tweaks.confirmModal.risk === "RISKY"
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                }`}
              >
                Tôi xác nhận và tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none select-none">
        {tweaks.toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4.5 py-3 rounded-2xl border backdrop-blur-xl shadow-xl transition-all duration-300 pointer-events-auto flex items-center gap-3 ${
              t.type === "success"
                ? "bg-white/95 text-emerald-600 border-slate-200 shadow-emerald-500/5"
                : t.type === "error"
                  ? "bg-white/95 text-rose-600 border-slate-200 shadow-rose-500/5"
                  : t.type === "warning"
                    ? "bg-white/95 text-amber-600 border-slate-200 shadow-amber-500/5"
                    : "bg-white/95 text-slate-655 border-slate-200 shadow-slate-500/5"
            }`}
          >
            <span className="text-xs font-bold">{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdvancedAdb;
