import React, { useState } from "react";
import { SlidersHorizontal, RefreshCcw, Trash2, Monitor, Shield, Gamepad2, Wand2, Touchpad, Layers } from "lucide-react";
import { TweakCategory } from "./types";
import { useSystemTweaks } from "./hooks/useSystemTweaks";
import { DebloatPanel } from "./panels/DebloatPanel";
import { DisplayPanel } from "./panels/DisplayPanel";
import { GenericTweaksPanel } from "./panels/GenericTweaksPanel";

export function SystemTweaks() {
  const tweaks = useSystemTweaks();
  const [activeCategory, setActiveCategory] = useState<TweakCategory>("debloat");

  if (!tweaks.activeDevice) {
    return (
      <div className="absolute inset-4 lg:inset-6 flex flex-col items-center justify-center p-8 bg-[#f8fafc]/90 backdrop-blur-3xl rounded-[32px] border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)] text-slate-800">
        <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/55 rounded-full flex items-center justify-center shadow-inner mb-6 relative">
          <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-xl animate-pulse"></div>
          <SlidersHorizontal className="w-10 h-10 text-slate-500 animate-bounce" />
        </div>
        <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
          Chưa có thiết bị kết nối
        </h3>
        <p className="text-slate-500 text-center max-w-sm text-sm font-semibold leading-relaxed">
          Vui lòng kết nối thiết bị Android bằng cáp hoặc Wi-Fi và cấp quyền gỡ lỗi USB để tiếp tục tinh chỉnh hệ thống.
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-4 lg:inset-6 flex flex-col overflow-hidden bg-[#f8fafc]/90 backdrop-blur-3xl rounded-[32px] p-5 lg:p-6 border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)] text-slate-800">
      {/* HEADER BAR */}
      <div className="bg-white/80 border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center justify-between gap-4 shrink-0 mb-4 select-none">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 shrink-0 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5 text-blue-655" />
          </div>
          <div>
            <span className="text-[9px] font-black text-blue-655 uppercase tracking-widest block">
              SYSTEM TWEAKS
            </span>
            <h2 className="text-base font-black text-slate-800 tracking-tight leading-tight">
              Tinh chỉnh hệ thống
            </h2>
          </div>
        </div>

        <button
          onClick={tweaks.loadData}
          disabled={tweaks.loading}
          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-655 hover:text-blue-600 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2 text-xs font-black"
        >
          <RefreshCcw size={13} className={tweaks.loading ? "animate-spin" : ""} />
          <span>LÀM MỚI DỮ LIỆU</span>
        </button>
      </div>

      {/* BODY SECTION */}
      <div className="flex-1 flex min-h-0 gap-5 overflow-hidden">
        {/* LEFT COLUMN: CATEGORIES SIDEBAR */}
        <div className="w-64 bg-white/50 backdrop-blur-md rounded-[28px] p-3 border border-slate-200/60 shadow-sm flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Danh mục tinh chỉnh
            </div>
            <div className="space-y-1">
              <CategoryItem
                active={activeCategory === "debloat"}
                onClick={() => setActiveCategory("debloat")}
                icon={<Trash2 size={16} />}
                title="Gỡ ứng dụng rác"
              />
              <CategoryItem
                active={activeCategory === "display"}
                onClick={() => setActiveCategory("display")}
                icon={<Monitor size={16} />}
                title="Màn hình & DPI"
              />
              <CategoryItem
                active={activeCategory === "security"}
                onClick={() => setActiveCategory("security")}
                icon={<Shield size={16} />}
                title="Bảo mật & Riêng tư"
              />
              <CategoryItem
                active={activeCategory === "game"}
                onClick={() => setActiveCategory("game")}
                icon={<Gamepad2 size={16} />}
                title="Tối ưu hóa Game"
              />
              <CategoryItem
                active={activeCategory === "animations"}
                onClick={() => setActiveCategory("animations")}
                icon={<Wand2 size={16} />}
                title="Hoạt ảnh & Tốc độ"
              />
              <CategoryItem
                active={activeCategory === "controls"}
                onClick={() => setActiveCategory("controls")}
                icon={<Touchpad size={16} />}
                title="Điều khiển & Chạm"
              />
              <CategoryItem
                active={activeCategory === "multitasking"}
                onClick={() => setActiveCategory("multitasking")}
                icon={<Layers size={16} />}
                title="Đa nhiệm & Thông báo"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RENDER CATEGORY DETAILS PANEL */}
        <div className="flex-1 bg-white/80 border border-slate-200/60 rounded-[28px] shadow-sm flex flex-col relative overflow-hidden">
          {activeCategory === "debloat" && (
            <DebloatPanel
              loading={tweaks.loading}
              actionLoading={tweaks.actionLoading}
              bloatListWithStatus={tweaks.bloatListWithStatus}
              debloatSearch={tweaks.debloatSearch}
              setDebloatSearch={tweaks.setDebloatSearch}
              selectedBloat={tweaks.selectedBloat}
              setSelectedBloat={tweaks.setSelectedBloat}
              batchProgress={tweaks.batchProgress}
              batchResult={tweaks.batchResult}
              setBatchResult={tweaks.setBatchResult}
              filteredBloat={tweaks.filteredBloat}
              toggleSelect={tweaks.toggleSelect}
              selectAllSelectable={tweaks.selectAllSelectable}
              handleSingleDebloatAction={tweaks.handleSingleDebloatAction}
              handleBatchDebloatAction={tweaks.handleBatchDebloatAction}
            />
          )}

          {activeCategory === "display" && (
            <DisplayPanel
              actionLoading={tweaks.actionLoading}
              customDpi={tweaks.customDpi}
              setCustomDpi={tweaks.setCustomDpi}
              deviceDpi={tweaks.deviceDpi}
              customW={tweaks.customW}
              setCustomW={tweaks.setCustomW}
              customH={tweaks.customH}
              setCustomH={tweaks.setCustomH}
              deviceW={tweaks.deviceW}
              deviceH={tweaks.deviceH}
              applyDpi={tweaks.applyDpi}
              handleResetDpi={tweaks.handleResetDpi}
              applyResolution={tweaks.applyResolution}
              handleResetResolution={tweaks.handleResetResolution}
            />
          )}

          {activeCategory !== "debloat" && activeCategory !== "display" && (
            <GenericTweaksPanel
              category={activeCategory}
              actionLoading={tweaks.actionLoading}
              telemetryBlocked={tweaks.telemetryBlocked}
              toggleTelemetry={tweaks.toggleTelemetry}
              developerOptionsEnabled={tweaks.developerOptionsEnabled}
              toggleDeveloperOptions={tweaks.toggleDeveloperOptions}
              usbDebuggingSafe={tweaks.usbDebuggingSafe}
              toggleUsbDebuggingSafe={tweaks.toggleUsbDebuggingSafe}
              unknownSourcesBlocked={tweaks.unknownSourcesBlocked}
              toggleUnknownSourcesBlocked={tweaks.toggleUnknownSourcesBlocked}
              cloudBackupBlocked={tweaks.cloudBackupBlocked}
              toggleCloudBackupBlocked={tweaks.toggleCloudBackupBlocked}
              verifyAdbInstallsEnabled={tweaks.verifyAdbInstallsEnabled}
              toggleVerifyAdbInstalls={tweaks.toggleVerifyAdbInstalls}
              gameModeEnabled={tweaks.gameModeEnabled}
              toggleGameMode={tweaks.toggleGameMode}
              fpsOverlayEnabled={tweaks.fpsOverlayEnabled}
              toggleFpsOverlay={tweaks.toggleFpsOverlay}
              hwAccelerationEnabled={tweaks.hwAccelerationEnabled}
              toggleHwAcceleration={tweaks.toggleHwAcceleration}
              animScale={tweaks.animScale}
              applyAnimations={tweaks.applyAnimations}
              showTouches={tweaks.showTouches}
              toggleShowTouches={tweaks.toggleShowTouches}
              pointerLocation={tweaks.pointerLocation}
              togglePointerLocation={tweaks.togglePointerLocation}
              pointerSpeed={tweaks.pointerSpeed}
              setPointerSpeed={tweaks.setPointerSpeed}
              applyPointerSpeed={tweaks.applyPointerSpeed}
              bgLimit={tweaks.bgLimit}
              applyBgLimit={tweaks.applyBgLimit}
              alwaysFinish={tweaks.alwaysFinish}
              toggleAlwaysFinish={tweaks.toggleAlwaysFinish}
              phantomOptimizer={tweaks.phantomOptimizer}
              togglePhantomOptimizer={tweaks.togglePhantomOptimizer}
              fixNotificationDelay={tweaks.fixNotificationDelay}
              freezeBackgroundApp={tweaks.freezeBackgroundApp}
              unfreezeBackgroundApp={tweaks.unfreezeBackgroundApp}
              xiaomiNotificationFixed={tweaks.xiaomiNotificationFixed}
              fixXiaomiNotificationDelay={tweaks.fixXiaomiNotificationDelay}
              loadData={tweaks.loadData}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryItem({
  active,
  onClick,
  icon,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full relative flex items-center gap-3 p-3 rounded-2xl text-left transition-all ${active ? "bg-blue-600 text-white shadow-md shadow-blue-600/10" : "text-slate-655 hover:bg-slate-100 hover:text-slate-900"}`}
    >
      <div className={`p-2 rounded-xl shrink-0 ${active ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"}`}>
        {icon}
      </div>
      <span className="text-xs font-black tracking-tight truncate">
        {title}
      </span>
    </button>
  );
}

export default SystemTweaks;
