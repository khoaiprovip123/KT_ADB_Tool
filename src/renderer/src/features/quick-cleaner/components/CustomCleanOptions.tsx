import React from "react";
import { CleanOptions } from "@shared/types";
import { Terminal, Trash2, FolderArchive, Cpu, Zap, PackageCheck, MessageSquare } from "lucide-react";

interface CustomCleanOptionsProps {
  options: CleanOptions;
  onChangeOptions: (newOptions: CleanOptions) => void;
  onExecuteCustom: () => void;
  isScanning: boolean;
}

export const CustomCleanOptions: React.FC<CustomCleanOptionsProps> = ({
  options,
  onChangeOptions,
  onExecuteCustom,
  isScanning,
}) => {
  const toggleOption = (key: keyof CleanOptions) => {
    onChangeOptions({
      ...options,
      [key]: !options[key],
    });
  };

  const optionCards = [
    {
      key: "cleanLogcat" as keyof CleanOptions,
      title: "Xóa Logcat Buffer",
      description: "Xóa sạch bộ đệm nhật ký hệ thống (logcat -c) giải phóng bộ nhớ tạm.",
      icon: <Terminal className="w-5 h-5 text-blue-500" />,
    },
    {
      key: "cleanTemp" as keyof CleanOptions,
      title: "File Tạm Hệ Thống (/data/local/tmp)",
      description: "Dọn dẹp các tệp tin lưu tạm thời sinh ra trong quá trình cài ứng dụng.",
      icon: <Trash2 className="w-5 h-5 text-amber-500" />,
    },
    {
      key: "cleanApk" as keyof CleanOptions,
      title: "Xóa APK Rác Trong Download",
      description: "Quét và xóa các bộ cài `.apk` dư thừa trong thư mục `/sdcard/Download`.",
      icon: <FolderArchive className="w-5 h-5 text-indigo-500" />,
    },
    {
      key: "cleanTelegramCache" as keyof CleanOptions,
      title: "Cache Telegram, Nekogram & MXH",
      description: "Quét dẹp bộ nhớ đệm hình ảnh, video, sticker tạm thời của Telegram, Nekogram, Zalo, TikTok...",
      icon: <MessageSquare className="w-5 h-5 text-cyan-500" />,
    },
    {
      key: "cleanTrimCaches" as keyof CleanOptions,
      title: "Trim Caches Toàn Hệ Thống",
      description: "Yêu cầu hệ điều hành tự động giải phóng cache của toàn bộ package.",
      icon: <PackageCheck className="w-5 h-5 text-emerald-500" />,
    },
    {
      key: "killApps" as keyof CleanOptions,
      title: "Đóng Nhanh App Ngầm (Fast Killer)",
      description: "Force stop các ứng dụng 3rd party chạy ẩn không nằm trong Whitelist.",
      icon: <Cpu className="w-5 h-5 text-red-500" />,
    },
    {
      key: "boostRam" as keyof CleanOptions,
      title: "Tăng Tốc & Thu Hồi Bộ Nhớ RAM",
      description: "Gửi tín hiệu `trim-memory` tới các ứng dụng để giải phóng RAM tối đa.",
      icon: <Zap className="w-5 h-5 text-purple-500" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Tùy Chọn Phân Khu Dọn Dẹp</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Đánh dấu tích vào các khu vực bạn muốn dọn dẹp.</p>
        </div>
        <button
          disabled={isScanning}
          onClick={onExecuteCustom}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-white" />
          <span>Thực Hiện Dọn Tùy Chỉnh</span>
        </button>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {optionCards.map((card) => {
          const checked = options[card.key];
          return (
            <div
              key={String(card.key)}
              onClick={() => toggleOption(card.key)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                checked
                  ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-400 dark:border-blue-700 shadow-md"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {}} // Controlled via parent div onClick
                className="mt-1 w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100">
                  {card.icon}
                  <span>{card.title}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
