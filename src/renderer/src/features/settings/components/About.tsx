import { useState, useEffect } from "react";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Cpu,
  ExternalLink,
  Code2,
  Layers,
  Activity,
} from "lucide-react";

export default function About() {
  const [appVersion, setAppVersion] = useState("2.4.4");

  useEffect(() => {
    window.api
      ?.getAppVersion?.()
      .then((ver) => {
        if (ver) setAppVersion(`${ver}`);
      })
      .catch((err) => console.error("Lỗi lấy version:", err));
  }, []);

  const formattedVersion = appVersion.startsWith("v") ? appVersion : `v${appVersion}`;

  const coreFeatures = [
    {
      title: "Execute-Verify-Fallback Engine v2.4",
      desc: "Tự động kiểm tra kết quả thi hành lệnh ADB, tự động khôi phục khi gặp sự cố connection reset.",
      tag: "Engine Core",
      color: "from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50",
      icon: Zap,
    },
    {
      title: "Android 11+ Wireless Pairing & QR Scan",
      desc: "Tự động tạo mã QR quét kết nối không dây siêu nhanh bằng mDNS và camera điện thoại.",
      tag: "Wireless ADB",
      color: "from-violet-500/20 to-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-800/50",
      icon: Sparkles,
    },
    {
      title: "Multi-Device & Split APKs Support",
      desc: "Cài đặt hàng loạt APKS/XAPK/ZIP bundle, trích xuất APK gốc và thao tác đồng thời nhiều thiết bị.",
      tag: "App Manager",
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50",
      icon: Layers,
    },
    {
      title: "Multi-Brand Bloatware Presets",
      desc: "Tích hợp sẵn danh sách gỡ bỏ ứng dụng rác cho Xiaomi (HyperOS/MIUI), Samsung OneUI, ColorOS, FuntouchOS.",
      tag: "Debloat Pro",
      color: "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Hero Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-8 text-white shadow-xl shadow-indigo-500/10 border border-white/10">
        {/* Decorative background glow shapes */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-12 w-48 h-48 rounded-full bg-violet-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="relative group shrink-0">
            <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
            <div className="relative w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-all duration-300">
              <Code2 className="w-12 h-12 text-white drop-shadow-md" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                KT ADB Tool <span className="text-blue-200 font-black">Pro</span>
              </h1>
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold tracking-wide uppercase">
                {formattedVersion}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold tracking-wide uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ENTERPRISE STABLE
              </span>
            </div>

            <p className="text-blue-100/90 text-sm max-w-2xl font-medium leading-relaxed">
              Bộ công cụ quản trị & can thiệp hệ thống Android chuyên nghiệp toàn diện. Tự động hóa các thao tác kỹ thuật phức tạp qua giao diện đồ họa hiện đại, an toàn và tối ưu hiệu năng cao.
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-blue-100 font-semibold">
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/15">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>ADB Safety Protocol Active</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/15">
                <Activity className="w-4 h-4 text-sky-300" />
                <span>Fastboot & Wireless ADB Engine</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Features Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Nền tảng & Kiến trúc cốt lõi</span>
          </h3>
          <span className="text-xs font-semibold text-slate-400">v2.4.3 Architecture</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="group relative p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br border ${feat.color} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {feat.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {feat.desc}
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {feat.tag}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Specifications & Credits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phát triển bởi</span>
          <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>khoaiprovip123</span>
            <span className="text-xs text-indigo-500 font-medium">& Team Antigravity AI</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
            Xây dựng trên nền tảng Electron, React, Vite & Modern Node.js Architecture.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Môi trường thực thi</span>
          <div className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
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

        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-slate-800 flex flex-col justify-between">
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
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>GitHub Repository</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
