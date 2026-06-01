import React, { useEffect, useState } from "react";
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Smartphone,
  Settings as SettingsIcon,
  MonitorPlay,
  Battery,
  Thermometer,
  ShieldAlert,
} from "lucide-react";
import { useDeviceStore } from "../../store/deviceStore";

function RealTimeClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
        {time.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      </div>
      <div className="text-3xl font-black text-slate-700 tracking-tight font-mono">
        {time.toLocaleTimeString("vi-VN", { hour12: false })}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { activeDevice, devices } = useDeviceStore();
  const activeDeviceObj = devices.find((d) => d.id === activeDevice);
  const isReady = activeDeviceObj?.type === "device";

  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showBatteryModal, setShowBatteryModal] = useState(false);

  const loadInfo = () => {
    if (!activeDevice || !isReady) {
      setInfo(null);
      return;
    }
    setLoading(true);
    window.api
      .getDeviceInfo(activeDevice)
      .then((data) => {
        setInfo(data);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadInfo();
    // Refresh 5 minutes instead of 30s to avoid lag
    const interval = setInterval(loadInfo, 300000);
    return () => clearInterval(interval);
  }, [activeDevice, isReady]);

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col overflow-y-auto custom-scrollbar pr-2">
      {!activeDevice ? (
        <div className="text-center p-12 bg-white/60 backdrop-blur-2xl rounded-3xl border border-white shadow-xl shadow-slate-200/50 flex-1 flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Smartphone className="text-slate-400 w-10 h-10 animate-pulse" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Chưa kết nối thiết bị</h3>
          <p className="text-slate-500">
            Vui lòng kết nối thiết bị Android qua USB và bật Gỡ lỗi USB.
          </p>
        </div>
      ) : !isReady ? (
        <div className="text-center p-12 bg-white/60 backdrop-blur-2xl rounded-3xl border border-white shadow-xl shadow-slate-200/50 flex-1 flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-amber-50 rounded-full mx-auto mb-6 flex items-center justify-center border border-amber-100 shadow-inner">
            <ShieldAlert className="text-amber-500 w-10 h-10 animate-bounce" />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-slate-800">
            Thiết bị chưa được ủy quyền
          </h3>
          <p className="text-slate-500 max-w-md mx-auto mb-4 leading-relaxed">
            Vui lòng kiểm tra màn hình điện thoại của bạn, chọn{" "}
            <strong className="text-slate-700">
              &quot;Luôn cho phép từ máy tính này&quot;
            </strong>{" "}
            và nhấn{" "}
            <strong className="text-slate-700">
              &quot;Cho phép&quot; (OK)
            </strong>{" "}
            để tiếp tục.
          </p>
          <div className="text-xs text-amber-600 bg-amber-50/50 px-4 py-2 rounded-full border border-amber-100 font-medium">
            Đang chờ xác nhận từ thiết bị ({activeDevice})...
          </div>
        </div>
      ) : loading && !info ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          <div className="lg:col-span-8 bg-white/60 backdrop-blur-2xl rounded-3xl p-8 border border-white shadow-xl shadow-slate-200/50 flex flex-col">
            <div className="flex gap-5 mb-8">
              <div className="w-20 h-20 bg-slate-200/50 rounded-2xl animate-pulse"></div>
              <div className="flex-1 space-y-3 py-2">
                <div className="h-8 bg-slate-200/50 rounded-lg w-1/3 animate-pulse"></div>
                <div className="h-4 bg-slate-200/50 rounded-lg w-1/4 animate-pulse"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-slate-100/50 rounded-2xl animate-pulse"
                ></div>
              ))}
            </div>
            <div className="mt-10 space-y-4">
              <div className="h-20 bg-slate-100/50 rounded-2xl animate-pulse"></div>
              <div className="h-20 bg-slate-100/50 rounded-2xl animate-pulse"></div>
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="h-48 bg-white/60 backdrop-blur-2xl rounded-3xl animate-pulse border border-white shadow-xl shadow-slate-200/50"></div>
            <div className="flex-1 bg-white/60 backdrop-blur-2xl rounded-3xl animate-pulse border border-white shadow-xl shadow-slate-200/50"></div>
          </div>
        </div>
      ) : info ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Main Device Profile - spans 8 cols */}
          <div className="lg:col-span-8 bg-white/80 backdrop-blur-2xl rounded-3xl p-8 border border-white shadow-xl shadow-blue-900/5 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex gap-5 items-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                    {info.model}
                  </h2>
                  <div className="text-sm font-bold text-orange-600 tracking-wide mt-0.5">
                    {info.customOs}
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 font-medium mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    Đã kết nối qua ADB
                  </div>
                </div>
              </div>

              {/* Real-time Clock */}
              <div className="hidden sm:block">
                <RealTimeClock />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4 z-10">
              <InfoBox icon={<Cpu />} label="Vi xử lý" value={info.cpuName} />
              <InfoBox
                icon={<HardDrive />}
                label="Kiến trúc"
                value={info.cpuAbi}
              />
              <InfoBox
                icon={<Smartphone />}
                label="Mã định danh"
                value={info.codename}
              />

              <InfoBox
                icon={<Smartphone />}
                label="Hệ điều hành"
                value={info.osVer}
              />
              <InfoBox
                icon={<Smartphone />}
                label="Bản dựng"
                value={info.buildId}
              />
              <InfoBox
                icon={<MonitorPlay />}
                label="Độ phân giải"
                value={info.resolution}
              />
            </div>

            {/* RAM & Storage Progress */}
            <div className="mt-8 flex flex-col gap-4 z-10">
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <MemoryStick className="w-4 h-4 text-indigo-500" /> Sử dụng
                    RAM
                  </h4>
                  <span className="text-sm font-medium text-slate-500">
                    {info.ramTotal - info.ramFree}MB / {info.ramTotal}MB
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-400 to-purple-500 h-3 rounded-full transition-all duration-1000"
                    style={{
                      width: `${((info.ramTotal - info.ramFree) / info.ramTotal) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-cyan-500" /> Dung lượng
                    bộ nhớ
                  </h4>
                  <span className="text-sm font-medium text-slate-500">
                    {info.storageUsed} / {info.storageTotal}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${info.storagePercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - spans 4 cols */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Battery Card */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl p-6 border border-white shadow-xl shadow-slate-200/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Battery className="w-5 h-5 text-green-500" />
                  Tình trạng Pin
                </h3>
                <button
                  onClick={() => setShowBatteryModal(true)}
                  className="px-3 py-1 text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-100 rounded-full transition-all duration-300 shadow-sm hover:shadow-indigo-200"
                >
                  Xem thêm
                </button>
              </div>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-5xl font-black text-slate-800">
                  {info.batteryLevel}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 mb-6 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${info.batteryLevel}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100/50">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-orange-900 text-sm">
                    Nhiệt độ
                  </span>
                </div>
                <span className="text-lg font-bold text-orange-600">
                  {info.batteryTemp}°C
                </span>
              </div>
            </div>

            {/* System Security & Insights */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl p-6 border border-white shadow-xl shadow-slate-200/50 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-500" />
                Trạng thái bảo mật
              </h3>

              <div className="flex flex-col gap-3 flex-1">
                {/* Bootloader */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${info.bootloaderStatus === "Locked" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"}`}
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      Bootloader
                    </span>
                  </div>
                  <span
                    className={`text-sm font-bold ${info.bootloaderStatus === "Locked" ? "text-green-600" : "text-orange-600"}`}
                  >
                    {info.bootloaderStatus === "Locked"
                      ? "Đã khóa"
                      : info.bootloaderStatus === "Unlocked"
                        ? "Đã mở khóa"
                        : info.bootloaderStatus}
                  </span>
                </div>

                {/* SELinux */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${info.selinux === "Enforcing" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                    >
                      <SettingsIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      SELinux
                    </span>
                  </div>
                  <span
                    className={`text-sm font-bold ${info.selinux === "Enforcing" ? "text-green-600" : "text-red-600"}`}
                  >
                    {info.selinux === "Enforcing"
                      ? "Nghiêm ngặt"
                      : info.selinux === "Permissive"
                        ? "Nới lỏng"
                        : info.selinux}
                  </span>
                </div>

                {/* Root Status */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${info.isRooted === "Yes" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}
                    >
                      <Cpu className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      Quyền Root
                    </span>
                  </div>
                  <span
                    className={`text-sm font-bold ${info.isRooted === "Yes" ? "text-red-600" : "text-blue-600"}`}
                  >
                    {info.isRooted === "Yes" ? "Đã Root" : "Chưa Root"}
                  </span>
                </div>

                {/* Crypto State */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${info.cryptoState === "Encrypted" ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-600"}`}
                    >
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      Mã hóa dữ liệu
                    </span>
                  </div>
                  <span
                    className={`text-sm font-bold ${info.cryptoState === "Encrypted" ? "text-green-600" : "text-slate-600"}`}
                  >
                    {info.cryptoState === "Encrypted"
                      ? "Đã mã hóa"
                      : "Chưa mã hóa"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Battery Detail Modal */}
      {showBatteryModal && info && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-6 border border-white shadow-2xl shadow-indigo-950/20 max-w-md w-full relative overflow-hidden transform scale-100 transition-all duration-300">
            {/* Background Gradients */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-green-400/10 to-emerald-500/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-full translate-y-1/3 -translate-x-1/3 blur-2xl"></div>

            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Battery className="w-6 h-6 text-green-500 animate-pulse" />
                  Thông số Pin chi tiết
                </h3>
                <button
                  onClick={() => setShowBatteryModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Health Overview */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-2xl border border-emerald-100/50 mb-5 text-center">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  Sức khỏe pin (Battery Health)
                </div>
                <div className="text-4xl font-black text-emerald-600 tracking-tight">
                  {info.batteryHealthPercent !== undefined
                    ? `${info.batteryHealthPercent}%`
                    : "Đang đo..."}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-2">
                  {info.batteryWearPercent !== undefined
                    ? info.batteryWearPercent > 20
                      ? `Pin bị chai ${info.batteryWearPercent}% (Khuyên dùng: Nên cân nhắc thay pin)`
                      : `Tình trạng hoạt động hoàn hảo (Chai ${info.batteryWearPercent}%)`
                    : "Đang phân tích hiệu năng pin..."}
                </div>
              </div>

              {/* Specs Grid */}
              <div className="space-y-3">
                <SpecRow
                  label="Loại pin (Công nghệ)"
                  value={info.batteryTech || "Li-poly"}
                />
                <SpecRow
                  label="Dung lượng thiết kế (NSX)"
                  value={
                    info.batteryDesignCap
                      ? `${info.batteryDesignCap} mAh`
                      : "Đang quét..."
                  }
                />
                <SpecRow
                  label="Dung lượng thực tế (Tối đa)"
                  value={
                    info.batteryActualCap
                      ? `${info.batteryActualCap} mAh`
                      : "Đang quét..."
                  }
                />
                <SpecRow
                  label="Dung lượng thực tế hiện tại"
                  value={
                    info.batteryCurrentCap
                      ? `${info.batteryCurrentCap} mAh`
                      : "Đang quét..."
                  }
                />
                <SpecRow
                  label="Điện áp vào (Sạc)"
                  value={
                    info.batteryVoltIn !== undefined
                      ? info.batteryIsCharging
                        ? `${info.batteryVoltIn} V`
                        : "0.00 V (Không sạc)"
                      : "Đang quét..."
                  }
                  isHighlight={info.batteryIsCharging}
                />
                <SpecRow
                  label="Điện áp ra (Pin)"
                  value={
                    info.batteryVoltOut
                      ? `${info.batteryVoltOut} V`
                      : "Đang quét..."
                  }
                />
                <SpecRow
                  label="Tỷ lệ chai pin"
                  value={
                    info.batteryWearPercent !== undefined
                      ? `${info.batteryWearPercent}%`
                      : "Đang quét..."
                  }
                  isWarning={info.batteryWearPercent > 15}
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowBatteryModal(false)}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all text-sm shadow-md shadow-indigo-500/20"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpecRow({
  label,
  value,
  isHighlight = false,
  isWarning = false,
}: {
  label: string;
  value: string;
  isHighlight?: boolean;
  isWarning?: boolean;
}) {
  return (
    <div className="flex justify-between items-center p-3 bg-slate-50/80 border border-slate-100 rounded-2xl">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span
        className={`text-sm font-bold ${
          isWarning
            ? "text-red-500"
            : isHighlight
              ? "text-green-600"
              : "text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactElement;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 flex flex-col justify-center min-w-0">
      <div className="flex items-center gap-2 text-slate-500 mb-1">
        {React.cloneElement(icon, { className: "w-4 h-4 shrink-0" })}
        <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap truncate">
          {label}
        </span>
      </div>
      <div
        className="font-semibold text-slate-800 text-sm truncate"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
