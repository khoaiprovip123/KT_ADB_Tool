import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Cpu,
  ExternalLink,
  Code2,
  Layers,
  FolderTree,
  Monitor,
  CheckCircle2,
  Wrench,
  Terminal,
  Wifi,
  Users,
} from "lucide-react";

export default function About() {
  const [appVersion, setAppVersion] = useState("2.5.0");

  const handleOpenUrl = (url: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (window.api?.openExternal) {
      window.api.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  };

  useEffect(() => {
    window.api
      ?.getAppVersion?.()
      .then((ver) => {
        if (ver) setAppVersion(`${ver}`);
      })
      .catch((err) => console.error("Lỗi lấy version:", err));
  }, []);

  const formattedVersion = appVersion.startsWith("v") ? appVersion : `v${appVersion}`;

  const featureSections = [
    {
      title: "Quản lý ứng dụng (App Manager)",
      desc: "Phân loại app hệ thống / người dùng / đã tắt. Dọn rác (bloatware) với database Xiaomi & đa thương hiệu. Thao tác hàng loạt, cài APK kéo thả.",
      icon: Layers,
      iconBg: "bg-blue-500 text-white shadow-lg shadow-blue-500/30",
      badge: "App Control",
    },
    {
      title: "Quản lý tệp tin (File Manager)",
      desc: "Duyệt bộ nhớ trong và thẻ nhớ ngoài. Xem trước ảnh, push/pull file siêu nhanh, đổi tên & xóa trực tiếp.",
      icon: FolderTree,
      iconBg: "bg-violet-500 text-white shadow-lg shadow-violet-500/30",
      badge: "Storage Engine",
    },
    {
      title: "Bảo mật & Tối ưu hệ thống",
      desc: "Tinh chỉnh hiệu năng, pin, DPI, độ phân giải. Blacklist bảo vệ package cốt lõi khi debloat & tùy biến trải nghiệm Xiaomi (MIUI/HyperOS).",
      icon: ShieldCheck,
      iconBg: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
      badge: "Security & Debloat",
    },
    {
      title: "Giao diện & Scrcpy Mirroring",
      desc: "Giao diện Glassmorphism hiện đại, phản hồi realtime qua ADB log stream. Tích hợp sẵn Scrcpy truyền hình ảnh không độ trễ.",
      icon: Monitor,
      iconBg: "bg-amber-500 text-white shadow-lg shadow-amber-500/30",
      badge: "Display Mirror",
    },
  ];

  const systemReqs = [
    "Windows 10 / 11 (64-bit)",
    "USB Debugging đã bật trên thiết bị Android",
    "Driver USB phù hợp (Google USB Driver hoặc driver OEM)",
    "Đóng gói sẵn binary ADB & Scrcpy (không cần cài lẻ)",
  ];

  const techStack = [
    { label: "Frontend", val: "React, Tailwind CSS, Framer Motion, Zustand" },
    { label: "Backend", val: "Electron 30+, Node.js, ADBKit Core" },
    { label: "Build Tools", val: "electron-vite, electron-builder" },
    { label: "ADB Engine", val: "ADB Platform Tools v1.0.41 & Scrcpy v3.0" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* HyperOS Style Control Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-8 text-white shadow-2xl shadow-indigo-500/20 border border-white/20">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-12 w-56 h-56 rounded-full bg-violet-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* HyperOS Circular Icon Glow */}
          <div className="relative group shrink-0">
            <div className="absolute inset-0 bg-white/40 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-300" />
            <div className="relative w-20 h-20 rounded-full bg-white/20 backdrop-blur-2xl border border-white/40 flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-all duration-300">
              <Code2 className="w-10 h-10 text-white drop-shadow-md" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-2.5">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                KT ADB Tool <span className="text-blue-200 font-black">Pro</span>
              </h1>
              <span className="px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold tracking-wide uppercase">
                {formattedVersion}
              </span>
              <span className="px-3.5 py-1 rounded-full bg-emerald-400/20 backdrop-blur-md border border-emerald-400/40 text-emerald-200 text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                ENTERPRISE STABLE
              </span>
            </div>

            <p className="text-blue-100/90 text-sm max-w-2xl font-medium leading-relaxed">
              Giải pháp quản lý thiết bị Android qua ADB chuyên nghiệp toàn diện, thiết kế theo phong cách HyperOS Control Center với hiệu ứng Glassmorphism mờ viền sắc nét, an toàn và tối ưu hiệu năng cao.
            </p>

            {/* HyperOS Capsule Control Buttons */}
            <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-white font-semibold">
              <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>ADB Safety Protocol Active</span>
              </div>
              <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-sky-400 text-slate-900 flex items-center justify-center font-bold">
                  <Wifi className="w-3.5 h-3.5" />
                </div>
                <span>Fastboot & Wireless ADB Engine</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Yêu cầu hệ thống & Công nghệ phát triển (Control Tiles) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Yêu cầu hệ thống Tile */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 space-y-4 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
              <Wrench className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Yêu cầu hệ thống
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            {systemReqs.map((req, idx) => (
              <li key={idx} className="flex items-center gap-3 font-medium">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-400/20 dark:text-emerald-300 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Công nghệ phát triển Tile */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 space-y-4 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Công nghệ phát triển
            </h3>
          </div>
          <div className="space-y-2.5 text-xs">
            {techStack.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/60 pb-2">
                <span className="font-semibold text-slate-500 dark:text-slate-400">{item.label}</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Sections Grid (HyperOS Round Tiles) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Tính năng nổi bật (HyperOS Control Center)</span>
          </h3>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {formattedVersion} Release
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {featureSections.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="group relative p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden"
              >
                <div className="flex items-start gap-4">
                  {/* Circular Vibrant Icon Badge */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-white/20 shrink-0 ${feat.iconBg}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {feat.title}
                      </h4>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600">
                        {feat.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Community References & Special Credits */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 border border-blue-200/80 dark:border-blue-800/40 backdrop-blur-xl shadow-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Nguồn Tham Khảo & Đóng Góp Cộng Đồng
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trân trọng cảm ơn các dữ liệu kịch bản, bảng codename và kinh nghiệm quý báu từ cộng đồng Android
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {/* NothingsVN */}
          <a
            href="https://t.me/nothingscom"
            onClick={(e) => handleOpenUrl("https://t.me/nothingscom", e)}
            target="_blank"
            rel="noreferrer"
            className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500 dark:hover:border-blue-400 shadow-sm hover:shadow-md transition-all group flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                NVN
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Cộng đồng NothingsVN
                </h4>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  t.me/nothingscom
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
          </a>

          {/* XiMiToolGroup */}
          <a
            href="https://t.me/ximitoolgroup"
            onClick={(e) => handleOpenUrl("https://t.me/ximitoolgroup", e)}
            target="_blank"
            rel="noreferrer"
            className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-400 shadow-sm hover:shadow-md transition-all group flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                XMT
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  XiMi Tool Group
                </h4>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  t.me/ximitoolgroup
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0" />
          </a>
        </div>
      </div>

      {/* System Specifications & Credits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 space-y-2 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phát triển bởi</span>
          <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>khoaiprovip123</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
            Mã nguồn được đóng gói đầy đủ binary ADB & Scrcpy, sẵn sàng vận hành.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 space-y-2 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Môi trường thực thi</span>
          <div className="space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Electron Runtime</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">v30+</span>
            </div>
            <div className="flex justify-between">
              <span>ADB Client Protocol</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">v1.0.41</span>
            </div>
            <div className="flex justify-between">
              <span>Scrcpy Display Engine</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">v3.0</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 flex flex-col justify-between shadow-xl">
          <div>
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Bản quyền & Giấy phép</span>
            <h4 className="font-bold text-sm text-white mt-1">KT ADB Tool Pro Enterprise</h4>
            <p className="text-xs text-slate-400 mt-1 leading-snug">
              © 2026 khoaiprovip123. All rights reserved.
            </p>
          </div>
          <div className="pt-3 flex items-center gap-3 text-xs font-semibold text-indigo-300">
            <a
              href="https://github.com/khoaiprovip123/KT_ADB_Tool"
              onClick={(e) => handleOpenUrl("https://github.com/khoaiprovip123/KT_ADB_Tool", e)}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 border border-white/15 cursor-pointer"
            >
              <span>GitHub README & Source</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
