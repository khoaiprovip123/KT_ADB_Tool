import { useState, useEffect } from "react";
import {
  X,
  Smartphone,
  Wifi,
  Loader2,
  KeyRound,
  RefreshCw,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useDeviceStore } from "../../store/deviceStore";
import { toast } from "../../store/toastStore";

export function ConnectionManagerModal({
  isOpen,
  onClose,
  initialTab = "pair",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "connect" | "pair";
}) {
  const { devices, activeDevice, setActiveDevice } = useDeviceStore();
  const [activeTab, setActiveTab] = useState<"connect" | "pair">(initialTab);
  const [pairMode, setPairMode] = useState<"qr" | "manual">("qr");

  const [ipInput, setIpInput] = useState("");
  const [pairIpInput, setPairIpInput] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [localIp, setLocalIp] = useState("192.168.1.X");

  const [isConnecting, setIsConnecting] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  // Auto generate 6-digit random code and fetch local IP
  const generateNewPairCode = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setPairCode(randomCode);
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setPairMode("qr");
      generateNewPairCode();
      window.api?.getLocalIp?.().then((ip) => {
        if (ip) setLocalIp(ip);
      }).catch(() => {});
    }
  }, [isOpen, initialTab]);

  const handleFixConnection = async () => {
    setIsFixing(true);
    try {
      const result = await window.api.fixConnection();
      if (result.success) {
        useDeviceStore.getState().setDevices(result.devices || []);
        toast.success(result.message || "Đã reset server ADB thành công!");
      } else {
        toast.error(result.message || "Reset ADB thất bại.");
      }
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  if (!isOpen) return null;

  const handleConnect = async () => {
    if (!ipInput.trim()) return;
    setIsConnecting(true);
    const success = await window.api.connectIp(ipInput.trim());
    await window.api.getDevices().then((devices) => {
      useDeviceStore.getState().setDevices(devices);
    });
    setIsConnecting(false);

    if (success) {
      setIpInput("");
      onClose();
    } else {
      toast.error("Kết nối thất bại. Vui lòng xem Logs hoặc kiểm tra lại IP/Mạng.");
    }
  };

  const handlePair = async () => {
    if (!pairIpInput.trim() || !pairCode.trim()) return;
    setIsPairing(true);
    const success = await window.api.pairDevice(
      pairIpInput.trim(),
      pairCode.trim(),
    );
    setIsPairing(false);
    if (success) {
      toast.success(
        "Ghép nối thành công! Vui lòng dùng Kết nối Trực tiếp với IP & Port vừa nhận.",
      );
      setActiveTab("connect");
      setIpInput(pairIpInput.split(":")[0] + ":5555");
      setPairIpInput("");
    } else {
      toast.error(
        "Ghép nối thất bại. Vui lòng kiểm tra lại IP, Port và Pairing Code.",
      );
    }
  };

  // Format QR Code value per Android 11+ Wireless Debugging specification
  const qrValue = `WIFI:T:ADB;S:KT_ADB_${localIp.replace(/\./g, "")};P:${pairCode};;`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10 border border-slate-100">
        {/* Fixed Header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm leading-tight">Quản lý Kết nối & Mã QR</h3>
              <p className="text-[10px] text-slate-400 font-medium">Wireless ADB / Android 11+</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab("pair")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === "pair" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Ghép nối Mã QR
            </button>
            <button
              onClick={() => setActiveTab("connect")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === "connect" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Wifi className="w-3.5 h-3.5" />
              Kết nối Trực tiếp
            </button>
          </div>

          {activeTab === "pair" && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-2">
              <div className="flex items-center justify-between bg-slate-50 p-1 rounded-lg border border-slate-200/60">
                <button
                  onClick={() => setPairMode("qr")}
                  className={`flex-1 py-1 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${pairMode === "qr" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <QrCode className="w-3 h-3" />
                  Mã QR Quét (Camera)
                </button>
                <button
                  onClick={() => setPairMode("manual")}
                  className={`flex-1 py-1 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${pairMode === "manual" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <KeyRound className="w-3 h-3" />
                  Nhập thủ công
                </button>
              </div>

              {pairMode === "qr" ? (
                <div className="flex flex-col items-center space-y-2.5 bg-indigo-50/40 border border-indigo-100 p-3 rounded-2xl">
                  {/* Compact QR Code */}
                  <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                    <QRCodeSVG
                      value={qrValue}
                      size={120}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <div className="text-center space-y-0.5 w-full">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500">Mã Pairing:</span>
                      <span className="font-mono text-sm font-extrabold text-indigo-600 tracking-wider bg-indigo-100/80 px-2 py-0.5 rounded-md border border-indigo-200">
                        {pairCode}
                      </span>
                      <button
                        onClick={generateNewPairCode}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Đổi mã mới"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-tight px-1">
                      Mở <strong className="text-slate-800">Cài đặt nhà phát triển</strong> &gt; <strong className="text-slate-800">Gỡ lỗi không dây</strong> &gt; <strong className="text-indigo-600">Ghép nối bằng mã QR</strong> rồi quét.
                    </p>
                  </div>

                  <div className="w-full pt-0.5">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Nhập IP & Port hiển thị trên ĐT (VD: 192.168.1.5:41233)"
                        value={pairIpInput}
                        onChange={(e) => setPairIpInput(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium placeholder:text-slate-400"
                      />
                      <button
                        onClick={handlePair}
                        disabled={!pairIpInput.trim() || isPairing}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shrink-0"
                      >
                        {isPairing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Ghép nối"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Wifi className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="IP & Port (VD: 192.168.1.5:41233)"
                      value={pairIpInput}
                      onChange={(e) => setPairIpInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyRound className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Mã ghép nối Wi-Fi (VD: 123456)"
                      value={pairCode}
                      onChange={(e) => setPairCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePair()}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                    />
                  </div>
                  <button
                    onClick={handlePair}
                    disabled={
                      !pairIpInput.trim() || !pairCode.trim() || isPairing
                    }
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isPairing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Ghép nối Thiết bị"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "connect" && (
            <div className="space-y-2.5 animate-in fade-in slide-in-from-left-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Kết nối Thiết bị Không dây
              </label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Wifi className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="VD: 192.168.1.5:5555"
                    value={ipInput}
                    onChange={(e) => setIpInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  />
                </div>
                <button
                  onClick={handleConnect}
                  disabled={!ipInput.trim() || isConnecting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {isConnecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Kết nối"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Connected Devices List */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Thiết bị Đã kết nối ({devices.length})
              </label>
              <button
                onClick={handleFixConnection}
                disabled={isFixing}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 disabled:text-slate-400 transition-colors uppercase tracking-wide bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-full"
                title="Tắt các tiến trình ADB xung đột và khởi động lại Server"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isFixing ? "animate-spin" : ""}`}
                />
                <span>{isFixing ? "Đang sửa..." : "Sửa lỗi kết nối"}</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
              {devices.length === 0 ? (
                <div className="text-center py-3 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  Chưa có thiết bị nào kết nối
                </div>
              ) : (
                devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => {
                      setActiveDevice(device.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      activeDevice === device.id
                        ? "bg-blue-50 border-blue-200 shadow-sm"
                        : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          activeDevice === device.id
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {device.id.includes(":5555") ? (
                          <Wifi className="w-4 h-4" />
                        ) : (
                          <Smartphone className="w-4 h-4" />
                        )}
                      </div>
                      <div className="text-left">
                        <div
                          className={`text-xs font-semibold ${activeDevice === device.id ? "text-blue-900" : "text-slate-700"}`}
                        >
                          {device.model || device.id}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${device.status === "device" ? "bg-green-500" : "bg-red-500"}`}
                          />
                          {device.status === "device"
                            ? "Đã kết nối"
                            : device.status}
                          {device.id.includes(":5555") && (
                            <span className="text-blue-500">• Không dây</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {activeDevice === device.id && (
                      <div className="w-2 h-2 rounded-full bg-blue-600 mr-2" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
