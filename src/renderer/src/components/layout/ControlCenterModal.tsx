import React, { useState } from "react";
import {
  Wifi,
  Settings,
  Smartphone,
  PowerOff,
  Cast,
  RotateCcw,
  Unplug,
  Loader2,
  Maximize2,
} from "lucide-react";
import { useDeviceStore } from "../../store/deviceStore";
import { useSettingsStore } from "../../store/settingsStore";

export function ControlCenterModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { activeDevice } = useDeviceStore();
  const { settings, updateSettings } = useSettingsStore();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const borderless = !!settings.scrcpyBorderless;

  const handleDisconnect = async () => {
    if (!activeDevice) return;
    setIsDisconnecting(true);
    await window.api.disconnectDevice(activeDevice);
    const devs = await window.api.getDevices();
    useDeviceStore.getState().setDevices(devs);
    setIsDisconnecting(false);
    onClose();
  };

  const runAction = (cmd: string) => {
    if (!activeDevice) return;
    window.api.runAdbCommand(activeDevice, cmd);
    onClose();
  };

  const toggleBorderless = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateSettings({ scrcpyBorderless: !borderless });
  };

  const runScrcpy = (turnScreenOff: boolean) => {
    if (!activeDevice) return;
    window.api.runScrcpy(activeDevice, turnScreenOff, borderless);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      <div className="absolute top-16 right-8 w-80 bg-white/90 backdrop-blur-3xl rounded-3xl border border-white/50 shadow-2xl shadow-blue-900/10 p-6 z-50 animate-in fade-in slide-in-from-top-4">
        <h3 className="text-lg font-bold mb-4 text-slate-800 border-b border-slate-100 pb-2">
          Trung tâm Điều khiển
        </h3>

        {/* Scrcpy Screen Mirroring Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => runScrcpy(false)}
            className="col-span-2 flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl transition-all shadow-md hover:shadow-lg"
          >
            <Cast className="w-5 h-5" />
            <div className="text-left">
              <span className="block font-semibold text-sm">
                Phản chiếu Màn hình
              </span>
              <span className="block text-xs text-blue-200">
                Bật Scrcpy (Bình thường)
              </span>
            </div>
          </button>

          <button
            onClick={() => runScrcpy(true)}
            className="col-span-2 flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl transition-all shadow-md"
          >
            <Smartphone className="w-5 h-5" />
            <div className="text-left">
              <span className="block font-semibold text-sm">
                Phản chiếu Bí mật
              </span>
              <span className="block text-xs text-slate-400">
                Phản chiếu nhưng tắt màn hình điện thoại
              </span>
            </div>
          </button>
        </div>

        {/* Scrcpy Borderless Mode Toggle */}
        <div className="flex items-center justify-between p-2.5 px-3 bg-slate-100/90 rounded-2xl mb-4 border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg transition-colors ${borderless ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500"}`}>
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-semibold text-slate-700">
                Chiếu không viền
              </span>
              <span className="block text-[10px] text-slate-400">
                Borderless (Giữ Alt kéo cửa sổ)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleBorderless}
            className={`w-9 h-5 rounded-full transition-colors p-0.5 relative shrink-0 ${
              borderless ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                borderless ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Quick Settings Grid */}
        <div className="grid grid-cols-2 gap-3">
          <ActionBtn
            icon={<Wifi />}
            label="Bật/Tắt WiFi"
            onClick={() => runAction("svc wifi enable")}
            color="bg-blue-50 text-blue-600 hover:bg-blue-100"
          />
          <ActionBtn
            icon={<Wifi className="rotate-45" />}
            label="Phát WiFi"
            onClick={() => runAction("cmd tethering tether wifi")}
            color="bg-orange-50 text-orange-600 hover:bg-orange-100"
          />
          <ActionBtn
            icon={<RotateCcw />}
            label="Tự động Xoay"
            onClick={() =>
              runAction(
                "settings put system accelerometer_rotation 1",
              )
            }
            color="bg-purple-50 text-purple-600 hover:bg-purple-100"
          />
          <ActionBtn
            icon={<Settings />}
            label="Cài đặt"
            onClick={() =>
              runAction("am start -a android.settings.SETTINGS")
            }
            color="bg-slate-100 text-slate-700 hover:bg-slate-200"
          />
          <ActionBtn
            icon={<PowerOff />}
            label="Tắt màn hình"
            onClick={() => runAction("input keyevent 26")}
            color="bg-red-50 text-red-600 hover:bg-red-100 col-span-2"
          />
        </div>

        {/* Nút Xóa / Ngắt kết nối thiết bị */}
        {activeDevice && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs transition-colors border border-red-200/60 shadow-sm"
              title="Xóa / Ngắt kết nối thiết bị đang chọn"
            >
              {isDisconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
              ) : (
                <Unplug className="w-3.5 h-3.5" />
              )}
              <span>Xóa / Ngắt kết nối thiết bị này</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  color,
}: {
  icon: React.ReactElement;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 p-3 rounded-xl transition-all ${color} border border-transparent hover:border-black/5`}
    >
      {React.cloneElement(icon, { className: "w-4 h-4" })}
      <span className="text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
        {label}
      </span>
    </button>
  );
}
