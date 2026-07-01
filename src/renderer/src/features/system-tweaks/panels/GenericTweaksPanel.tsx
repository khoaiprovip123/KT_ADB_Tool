import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  SlidersHorizontal,
  Shield,
  FolderLock,
  CloudOff,
  ShieldAlert,
  Gamepad2,
  Eye,
  Cpu,
  RefreshCcw,
  Touchpad,
  Monitor,
  Layers,
  AlertCircle,
  Bell,
} from "lucide-react";
import { TweakCategory } from "../types";

interface GenericTweaksPanelProps {
  category: TweakCategory;
  actionLoading: string | null;

  // Security / Privacy
  telemetryBlocked: boolean;
  toggleTelemetry: (enable: boolean) => Promise<void>;
  developerOptionsEnabled: boolean;
  toggleDeveloperOptions: (enable: boolean) => Promise<void>;
  usbDebuggingSafe: boolean;
  toggleUsbDebuggingSafe: (enable: boolean) => Promise<void>;
  unknownSourcesBlocked: boolean;
  toggleUnknownSourcesBlocked: (enable: boolean) => Promise<void>;
  cloudBackupBlocked: boolean;
  toggleCloudBackupBlocked: (enable: boolean) => Promise<void>;
  verifyAdbInstallsEnabled: boolean;
  toggleVerifyAdbInstalls: (enable: boolean) => Promise<void>;

  // Game
  gameModeEnabled: boolean;
  toggleGameMode: (enable: boolean) => Promise<void>;
  fpsOverlayEnabled: boolean;
  toggleFpsOverlay: (enable: boolean) => Promise<void>;
  hwAccelerationEnabled: boolean;
  toggleHwAcceleration: (enable: boolean) => Promise<void>;

  // Animations
  animScale: number;
  applyAnimations: (scale: number) => Promise<void>;

  // Controls
  showTouches: boolean;
  toggleShowTouches: (enable: boolean) => Promise<void>;
  pointerLocation: boolean;
  togglePointerLocation: (enable: boolean) => Promise<void>;
  pointerSpeed: number;
  setPointerSpeed: (s: number) => void;
  applyPointerSpeed: (s: number) => Promise<void>;

  // Multitasking
  bgLimit: number;
  applyBgLimit: (l: number) => Promise<void>;
  alwaysFinish: boolean;
  toggleAlwaysFinish: (enable: boolean) => Promise<void>;
  phantomOptimizer: boolean;
  togglePhantomOptimizer: (enable: boolean) => Promise<void>;
  fixNotificationDelay: (pkg: string) => Promise<void>;
  freezeBackgroundApp: (pkg: string) => Promise<void>;
  unfreezeBackgroundApp: (pkg: string) => Promise<void>;
  xiaomiNotificationFixed: boolean;
  fixXiaomiNotificationDelay: () => Promise<void>;
  loadData: () => Promise<void>;
}

export function GenericTweaksPanel({
  category,
  actionLoading,
  telemetryBlocked,
  toggleTelemetry,
  developerOptionsEnabled,
  toggleDeveloperOptions,
  usbDebuggingSafe,
  toggleUsbDebuggingSafe,
  unknownSourcesBlocked,
  toggleUnknownSourcesBlocked,
  cloudBackupBlocked,
  toggleCloudBackupBlocked,
  verifyAdbInstallsEnabled,
  toggleVerifyAdbInstalls,
  gameModeEnabled,
  toggleGameMode,
  fpsOverlayEnabled,
  toggleFpsOverlay,
  hwAccelerationEnabled,
  toggleHwAcceleration,
  animScale,
  applyAnimations,
  showTouches,
  toggleShowTouches,
  pointerLocation,
  togglePointerLocation,
  pointerSpeed,
  setPointerSpeed,
  applyPointerSpeed,
  bgLimit,
  applyBgLimit,
  alwaysFinish,
  toggleAlwaysFinish,
  phantomOptimizer,
  togglePhantomOptimizer,
  fixNotificationDelay,
  freezeBackgroundApp,
  unfreezeBackgroundApp,
  xiaomiNotificationFixed,
  fixXiaomiNotificationDelay,
  loadData,
}: GenericTweaksPanelProps) {
  // Local inputs
  const [pkgNotifyInput, setPkgNotifyInput] = useState("");
  const [pkgFreezeInput, setPkgFreezeInput] = useState("");

  return (
    <motion.div
      key={category}
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar space-y-6"
    >
      {/* 1. SECURITY & PRIVACY */}
      {category === "security" && (
        <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden space-y-4">
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Quyền riêng tư & Bảo mật hệ thống
            </h4>
            <p className="text-xs text-slate-450 font-semibold">
              Tăng độ bảo mật dữ liệu cá nhân bằng cách khóa các tiến trình thu thập ẩn.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            <TweakSwitchRow
              icon={<ShieldCheck className="text-green-500" />}
              title="Chặn Telemetry & Theo dõi người dùng"
              desc="Khóa toàn bộ ID quảng cáo, logs phân tích hành vi và telemetry ngầm gửi về hãng sản xuất com.miui.analytics và com.miui.msa.global."
              active={telemetryBlocked}
              onToggle={toggleTelemetry}
              loading={actionLoading === "telemetry"}
            />

            <TweakSwitchRow
              icon={<SlidersHorizontal className="text-blue-500" />}
              title="Cấu hình Tùy chọn nhà phát triển"
              desc="Bật hoặc ẩn hoàn toàn menu Developer Options trong cài đặt của thiết bị để tránh người khác thay đổi."
              active={developerOptionsEnabled}
              onToggle={toggleDeveloperOptions}
              loading={actionLoading === "devoptions"}
            />

            <TweakSwitchRow
              icon={<Shield className="text-amber-500" />}
              title="Xác thực an toàn ADB Wifi"
              desc="Buộc thiết bị sử dụng cổng wifi được mã hóa khi mở gỡ lỗi adb từ xa."
              active={usbDebuggingSafe}
              onToggle={toggleUsbDebuggingSafe}
              loading={actionLoading === "usbdebugsafe"}
            />

            <TweakSwitchRow
              icon={<FolderLock className="text-rose-500" />}
              title="Chặn cài đặt từ Nguồn không xác định"
              desc="Khóa quyền cài đặt trực tiếp ứng dụng từ tệp tin APK ngoài Google Play (install_non_market_apps) để phòng chống mã độc."
              active={unknownSourcesBlocked}
              onToggle={toggleUnknownSourcesBlocked}
              loading={actionLoading === "unknownsources"}
            />

            <TweakSwitchRow
              icon={<CloudOff className="text-purple-500" />}
              title="Khóa sao lưu Google Cloud ngầm"
              desc="Chặn tính năng tự động đồng bộ và tải dữ liệu hệ thống, ứng dụng nhạy cảm lên máy chủ đám mây của Google."
              active={cloudBackupBlocked}
              onToggle={toggleCloudBackupBlocked}
              loading={actionLoading === "cloudbackup"}
            />

            <TweakSwitchRow
              icon={<ShieldAlert className="text-emerald-500" />}
              title="Quét bảo mật ứng dụng cài qua USB"
              desc="Kích hoạt chế độ tự động xác thực và quét bảo mật mọi ứng dụng cài đặt thông qua cổng kết nối ADB/USB."
              active={verifyAdbInstallsEnabled}
              onToggle={toggleVerifyAdbInstalls}
              loading={actionLoading === "verifyadb"}
            />
          </div>
        </div>
      )}

      {/* 2. GAME OPTIMIZATION */}
      {category === "game" && (
        <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden space-y-4">
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Chế độ tối ưu hóa Game & Ép xung phần cứng
            </h4>
            <p className="text-xs text-slate-450 font-semibold">
              Tập trung tối đa xung nhịp phần cứng cho tác vụ chơi game.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            <TweakSwitchRow
              icon={<Gamepad2 className="text-purple-500" />}
              title="Chế độ chơi game ẩn (Game Mode)"
              desc="Giải phóng RAM trống tức thì, tối ưu phân bổ luồng CPU giúp hạn chế giật lag FPS khi chơi game nặng."
              active={gameModeEnabled}
              onToggle={toggleGameMode}
              loading={actionLoading === "gamemode"}
            />

            <TweakSwitchRow
              icon={<Eye className="text-blue-500" />}
              title="Hiển thị tần số quét / FPS"
              desc="Bật bộ đếm FPS thời gian thực của Android hiển thị trực tiếp góc trái màn hình."
              active={fpsOverlayEnabled}
              onToggle={toggleFpsOverlay}
              loading={actionLoading === "fps"}
            />

            <TweakSwitchRow
              icon={<Cpu className="text-emerald-500" />}
              title="Ép buộc kết xuất GPU 2D (Force GPU Rendering)"
              desc="Buộc hệ thống sử dụng nhân đồ họa GPU Skia để vẽ các phần tử giao diện 2D thay vì dùng CPU, giúp cuộn mượt hơn."
              active={hwAccelerationEnabled}
              onToggle={toggleHwAcceleration}
              loading={actionLoading === "hwaccel"}
            />
          </div>
        </div>
      )}

      {/* 3. ANIMATIONS & SPEED */}
      {category === "animations" && (
        <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden space-y-6">
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Hoạt ảnh & Tốc độ chuyển cảnh hệ thống
            </h4>
            <p className="text-xs text-slate-450 font-semibold">
              Tăng hoặc giảm thời gian chờ của animation. Animation càng nhanh, cảm giác máy phản hồi càng tốc độ.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <AnimScaleCard
              label="Tắt hoạt ảnh"
              desc="Tối đa tốc độ chuyển tab"
              scale={0}
              active={animScale === 0}
              onClick={() => applyAnimations(0)}
              loading={actionLoading === "apply-anim" && animScale === 0}
            />
            <AnimScaleCard
              label="Siêu mượt"
              desc="Nhẹ nhàng & Tốc độ (0.5x)"
              scale={0.5}
              active={animScale === 0.5}
              onClick={() => applyAnimations(0.5)}
              loading={actionLoading === "apply-anim" && animScale === 0.5}
            />
            <AnimScaleCard
              label="Mặc định"
              desc="Tốc độ tiêu chuẩn (1.0x)"
              scale={1.0}
              active={animScale === 1.0}
              onClick={() => applyAnimations(1.0)}
              loading={actionLoading === "apply-anim" && animScale === 1.0}
            />
            <AnimScaleCard
              label="Chậm rãi"
              desc="Chuyển động rõ nét (1.5x)"
              scale={1.5}
              active={animScale === 1.5}
              onClick={() => applyAnimations(1.5)}
              loading={actionLoading === "apply-anim" && animScale === 1.5}
            />
          </div>
        </div>
      )}

      {/* 4. CONTROLS & INTERACTION */}
      {category === "controls" && (
        <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden space-y-6">
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Điều khiển & Tương tác cảm biến chạm
            </h4>
            <p className="text-xs text-slate-450 font-semibold">
              Tinh chỉnh độ nhạy điểm chạm và phản hồi con trỏ trên hệ điều hành.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            <TweakSwitchRow
              icon={<Touchpad className="text-indigo-500" />}
              title="Hiển thị phản hồi điểm chạm (Show Touches)"
              desc="Hiển thị một chấm tròn nhỏ màu trắng tại vị trí ngón tay chạm vào màn hình cảm ứng, hữu ích khi quay video màn hình."
              active={showTouches}
              onToggle={toggleShowTouches}
              loading={actionLoading === "showtouches"}
            />

            <TweakSwitchRow
              icon={<Monitor className="text-blue-500" />}
              title="Hiển thị tọa độ con trỏ (Pointer Location)"
              desc="Vẽ các đường kẻ trục XY thời gian thực và ghi lại vết cảm ứng trực tiếp trên đỉnh màn hình để test vùng chết cảm ứng."
              active={pointerLocation}
              onToggle={togglePointerLocation}
              loading={actionLoading === "pointerlocation"}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-4">
              <div>
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                  Tốc độ con trỏ cảm ứng (Pointer Speed)
                </h5>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Tùy chỉnh tốc độ di chuyển con trỏ (khi dùng chuột/bàn rê Bluetooth).
                </p>
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="-7"
                  max="7"
                  step="1"
                  value={pointerSpeed}
                  onChange={(e) => setPointerSpeed(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-650"
                />
                <span className="w-12 text-center text-xs font-black text-indigo-655 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg">
                  {pointerSpeed}
                </span>
              </div>

              <button
                onClick={() => applyPointerSpeed(pointerSpeed)}
                disabled={actionLoading === "pointerspeed"}
                className="w-full py-3 bg-indigo-650 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md disabled:opacity-50"
              >
                {actionLoading === "pointerspeed" ? "Đang cập nhật..." : "Cập nhật tốc độ con trỏ"}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                  Tốc độ phản ứng DPI ảo chuột
                </h5>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Lưu ý: Tốc độ mặc định của hệ thống Android là 0.
                </p>
              </div>
              <div className="h-12 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-500">
                Giá trị con trỏ hợp lệ: Từ -7 (Chậm nhất) đến +7 (Nhanh nhất).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MULTITASKING & NOTIFICATIONS */}
      {category === "multitasking" && (
        <>
          {/* Part 1: RAM & Background limit */}
          <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden space-y-6">
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Giới hạn Chạy ngầm & RAM Đa nhiệm
              </h4>
              <p className="text-xs text-slate-450 font-semibold">
                Điều khiển cách hệ thống Android giữ tiến trình ngầm và giải phóng RAM.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    Giới hạn số tiến trình chạy ngầm
                  </h5>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    Giảm tiến trình chạy nền sẽ giải phóng nhiều RAM hơn cho app hiện tại.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <PresetButton active={bgLimit === -1} onClick={() => applyBgLimit(-1)} label="Tiêu chuẩn" />
                  <PresetButton active={bgLimit === 0} onClick={() => applyBgLimit(0)} label="Không có" />
                  <PresetButton active={bgLimit === 1} onClick={() => applyBgLimit(1)} label="1 tiến trình" />
                  <PresetButton active={bgLimit === 2} onClick={() => applyBgLimit(2)} label="2 tiến trình" />
                  <PresetButton active={bgLimit === 3} onClick={() => applyBgLimit(3)} label="3 tiến trình" />
                  <PresetButton active={bgLimit === 4} onClick={() => applyBgLimit(4)} label="4 tiến trình" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-[10px] text-slate-550 leading-relaxed font-semibold">
                  💡 **Lời khuyên**: Đối với các dòng máy yếu (RAM 3GB - 4GB), hãy đặt giới hạn ở mức **3 hoặc 4 tiến trình** để cải thiện đáng kể độ mượt của game mà không gây trễ tin nhắn Zalo/Messenger quá nặng.
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100 pt-4 border-t border-slate-100">
              {/* Don't Keep Activities */}
              <TweakSwitchRow
                icon={<Layers className="text-rose-500" />}
                title="Không giữ hoạt động (Don't Keep Activities)"
                desc="Phá hủy lập tức mọi tác vụ/giao diện ứng dụng ngay khi người dùng nhấn Home hoặc chuyển sang ứng dụng khác."
                active={alwaysFinish}
                onToggle={toggleAlwaysFinish}
                loading={actionLoading === "always_finish"}
              />

              {/* Phantom Process Killer Optimizer */}
              <TweakSwitchRow
                icon={<Cpu className="text-emerald-500" />}
                title="Tối ưu hóa Tiến trình Ẩn (Phantom Processes)"
                desc="Nâng giới hạn tiến trình phụ lên 32 (chỉ hỗ trợ Android 12 trở lên) nhằm ngăn ngừa tình trạng kill app chạy ngầm quá đà."
                active={phantomOptimizer}
                onToggle={togglePhantomOptimizer}
                loading={actionLoading === "phantom"}
              />
            </div>
          </div>

          {/* Part 2: Fix Notification & Background Autostart */}
          <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Sửa lỗi trễ thông báo & Cho phép tự khởi chạy
              </h4>
              <p className="text-xs text-slate-450 font-semibold">
                Đưa ứng dụng vào danh sách loại trừ tối ưu pin (Doze Whitelist) để nhận thông báo tức thời.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Nhập tên gói ứng dụng (Ví dụ: com.whatsapp, com.facebook.orca...)"
                  value={pkgNotifyInput}
                  onChange={(e) => setPkgNotifyInput(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black text-slate-700 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300"
                />
                <button
                  onClick={() => {
                    fixNotificationDelay(pkgNotifyInput);
                    setPkgNotifyInput("");
                  }}
                  disabled={!pkgNotifyInput || actionLoading === "fix_notify"}
                  className="px-5 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md disabled:opacity-50 shrink-0"
                >
                  {actionLoading === "fix_notify" ? "Đang sửa..." : "Sửa trễ thông báo"}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                💡 **Mẹo**: Lệnh này sẽ tự động loại bỏ ứng dụng khỏi chế độ ngủ tiết kiệm pin (Doze mode), cho phép chạy nền và nâng bucket ưu tiên lên hoạt động tích cực (standby-bucket active).
              </p>
            </div>
          </div>

          {/* Part 2.5: Fix Notification Delay for Xiaomi (ALL ROMs) */}
          <div className="bg-[#fcf8f2] p-6 rounded-3xl border border-amber-200/80 shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-550 text-white rounded-2xl shadow-md shrink-0">
                <Bell size={22} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    Sửa lỗi trễ thông báo Xiaomi (Mọi ROM & HyperOS)
                  </h4>
                  {xiaomiNotificationFixed ? (
                    <span className="px-2.5 py-0.5 bg-green-500 text-white rounded-full text-[9px] font-black uppercase tracking-wider">
                      Đã tối ưu (Whitelist)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-black uppercase tracking-wider">
                      Chưa tối ưu
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-450 font-semibold leading-relaxed">
                  Bỏ qua tối ưu pin ở cấp hệ thống (Doze Mode & AppOps) đối với Google Play Services để đảm bảo kết nối FCM hoạt động theo thời gian thực trên mọi phiên bản HyperOS/MIUI (China, Global, EU).
                </p>
              </div>
            </div>

            <div className="pl-14 space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={fixXiaomiNotificationDelay}
                  disabled={actionLoading === "fix_xiaomi_notify"}
                  className="px-5 py-3 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-700 active:scale-95 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading === "fix_xiaomi_notify" ? "Đang xử lý..." : "Áp dụng sửa lỗi trễ thông báo"}
                </button>
                <button
                  onClick={loadData}
                  disabled={actionLoading === "fix_xiaomi_notify"}
                  className="px-5 py-3 bg-white border border-slate-200 text-slate-655 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                >
                  Kiểm tra lại
                </button>
              </div>
              <div className="p-4 bg-white/70 border border-amber-200/50 rounded-2xl text-[10px] text-slate-550 leading-relaxed font-semibold space-y-1">
                <p className="text-slate-700 font-bold">⚠️ Hướng dẫn bổ sung:</p>
                <p>1. Cấp quyền **Tự động khởi chạy nền** cho các ứng dụng bị ảnh hưởng (Cài đặt → Ứng dụng → Quyền ứng dụng → Tự động khởi chạy nền).</p>
                <p>2. Với một số app như WhatsApp, Telegram, nên gỡ cài đặt rồi cài lại từ CH Play để thiết lập lại cơ chế thông báo.</p>
                <p>3. Hao pin có thể tăng nhẹ khoảng 1-2% qua đêm do socket kết nối FCM với Google luôn duy trì trên Wifi khi tắt màn hình.</p>
              </div>
            </div>
          </div>

          {/* Part 3: Freeze Background Applications */}
          <div className="bg-white/90 p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Quản lý Đóng băng / Tắt chạy nền
              </h4>
              <p className="text-xs text-slate-450 font-semibold">
                Khóa quyền chạy ngầm của các ứng dụng không cần thiết nhằm tiết kiệm năng lượng triệt để.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Nhập tên gói ứng dụng cần chặn chạy nền..."
                  value={pkgFreezeInput}
                  onChange={(e) => setPkgFreezeInput(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-black text-slate-700 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300"
                />
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      freezeBackgroundApp(pkgFreezeInput);
                      setPkgFreezeInput("");
                    }}
                    disabled={!pkgFreezeInput || actionLoading === "freeze_bg"}
                    className="px-5 py-3 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  >
                    {actionLoading === "freeze_bg" ? "Đang chặn..." : "Đóng băng nền"}
                  </button>
                  <button
                    onClick={() => {
                      unfreezeBackgroundApp(pkgFreezeInput);
                      setPkgFreezeInput("");
                    }}
                    disabled={!pkgFreezeInput || actionLoading === "unfreeze_bg"}
                    className="px-5 py-3 bg-white border border-slate-200 text-slate-655 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  >
                    {actionLoading === "unfreeze_bg" ? "Đang mở..." : "Kích hoạt lại"}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                ⚠️ **Lưu ý**: Đóng băng nền sẽ chặn quyền `RUN_IN_BACKGROUND` của gói thông qua AppOps và chuyển trạng thái standby thành `restricted`. Ứng dụng sẽ không thể gửi tin nhắn hoặc đẩy dịch vụ nền trừ khi được bạn mở trực tiếp.
              </p>
            </div>
          </div>

          {/* Part 4: Xiaomi Multitasking Lock explanation */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-6 rounded-3xl border border-blue-100 shadow-sm space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-md shrink-0">
                <AlertCircle size={22} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Hướng dẫn Khóa ứng dụng đa nhiệm (MIUI / HyperOS)
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Do cơ chế khóa ứng dụng đa nhiệm (Recent lock) nằm sâu trong ứng dụng bảo mật độc quyền của Xiaomi, **không có lệnh ADB công khai** nào có thể trực tiếp thực hiện tính năng này. Bạn có thể thiết lập bằng cách thủ công sau:
                </p>
              </div>
            </div>

            <div className="pl-14 space-y-2 text-xs text-slate-600 font-semibold list-decimal leading-relaxed">
              <p>🔹 **Cách 1 (Từ ứng dụng Bảo mật - Khuyên dùng cho HyperOS):**</p>
              <p className="pl-4">1. Mở ứng dụng **Bảo mật (Security)** mặc định trên điện thoại.</p>
              <p className="pl-4">2. Nhấn vào biểu tượng **Cài đặt (Bánh răng)** ở góc trên bên phải.</p>
              <p className="pl-4">3. Chọn mục **Tăng tốc (Boost speed)** → **Khóa ứng dụng (Lock apps)**.</p>
              <p className="pl-4">4. Gạt bật công tắc cho các ứng dụng bạn muốn khóa lại.</p>

              <p className="pt-2">🔹 **Cách 2 (Từ màn hình Đa nhiệm - Dành cho MIUI cũ):**</p>
              <p className="pl-4">1. Vuốt lên giữ để mở màn hình Đa nhiệm gần đây.</p>
              <p className="pl-4">2. Ấn giữ lâu vào thẻ xem trước của ứng dụng mong muốn.</p>
              <p className="pl-4">3. Nhấn vào **biểu tượng Ổ khóa** để giữ ứng dụng chạy ngầm vĩnh viễn.</p>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// Child Components
function TweakSwitchRow({
  icon,
  title,
  desc,
  active,
  onToggle,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  active: boolean;
  onToggle: (enable: boolean) => void;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-6 gap-6 transition-all hover:bg-slate-50/20 px-4 -mx-4 rounded-xl">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl shrink-0 mt-0.5 shadow-sm">
          {icon}
        </div>
        <div className="space-y-1">
          <h5 className="text-sm font-black text-slate-800 tracking-tight leading-none">
            {title}
          </h5>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-lg">
            {desc}
          </p>
        </div>
      </div>

      <button
        onClick={() => onToggle(!active)}
        disabled={loading}
        className={`relative w-14 h-8 rounded-full transition-colors flex items-center px-1 shrink-0 ${active ? "bg-blue-600" : "bg-slate-200"} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <motion.div
          animate={{ x: active ? 24 : 0 }}
          className="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center"
        >
          {loading && <RefreshCcw size={10} className="animate-spin text-blue-650" />}
        </motion.div>
      </button>
    </div>
  );
}

function AnimScaleCard({
  label,
  desc,
  scale,
  active,
  onClick,
  loading,
}: {
  label: string;
  desc: string;
  scale: number;
  active: boolean;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`relative p-5 rounded-2xl border text-left flex flex-col justify-between transition-all group overflow-hidden ${active ? "bg-purple-600 border-purple-600 text-white shadow-xl shadow-purple-600/20" : "bg-slate-50 border-slate-200 text-slate-655 hover:bg-slate-100 hover:border-purple-200"}`}
    >
      <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-purple-200" : "text-slate-400"}`}>
          {label}
        </span>
        {loading ? (
          <RefreshCcw size={14} className="animate-spin text-purple-200" />
        ) : (
          <span className={`text-base font-black ${active ? "text-white" : "text-purple-600"}`}>
            {scale}x
          </span>
        )}
      </div>
      <p className={`text-[10px] font-bold ${active ? "text-purple-100" : "text-slate-500"}`}>
        {desc}
      </p>
    </button>
  );
}

function PresetButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-2 px-3 border rounded-xl text-center text-xs font-bold transition-all ${active ? "bg-blue-600 border-blue-650 text-white shadow-sm" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
    >
      {label}
    </button>
  );
}
