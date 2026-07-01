import { useEffect, useState } from "react";
import {
  Sparkles,
  Smartphone,
  Eye,
  Sliders,
  AppWindow,
  Volume2,
  Gamepad2,
  Megaphone,
  XCircle,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Info,
  ShieldAlert,
  Bell,
  Zap,
  Check,
  Cpu,
} from "lucide-react";
import { useDeviceStore } from "../../store/deviceStore";

interface XiaomiExperienceItem {
  id: string;
  title: string;
  description: string;
  category: "display" | "navigation" | "launcher" | "sound" | "game" | "ads" | "utility";
  risk: "SAFE" | "MEDIUM" | "RISKY" | "DANGEROUS";
  defaultValue: string;
  activeValues?: string[];
  isXiaomiOnly?: boolean;
}

interface ExperienceItemStatus {
  item: XiaomiExperienceItem;
  status:
    | "SUPPORTED_ON"
    | "SUPPORTED_OFF"
    | "UNSUPPORTED"
    | "UNKNOWN"
    | "ERROR";
  currentValue?: string;
}

interface ToastMessage {
  id: number;
  msg: string;
  type: "success" | "error" | "info" | "warning";
}

const FULL_XIAOMI_CAPABILITIES: XiaomiExperienceItem[] = [
  // ═══ HIỂN THỊ & MÀN HÌNH ═══
  {
    id: "show_refresh_rate",
    title: "Hiển thị tốc độ làm tươi (FPS)",
    description:
      "Hiện số FPS/Tần số quét màn hình theo thời gian thực ở góc trái trên cùng.",
    category: "display",
    risk: "SAFE",
    defaultValue: "0",
    activeValues: ["1"],
  },
  {
    id: "force_high_refresh_rate",
    title: "Ép tần số quét tối đa (120Hz)",
    description:
      "Ép màn hình chạy ở tần số quét cao nhất liên tục (120Hz), loại bỏ tự động tụt Hz.",
    category: "display",
    risk: "MEDIUM",
    defaultValue: "60",
    activeValues: ["120", "90", "144"],
  },
  {
    id: "reading_mode",
    title: "Chế độ Đọc sách (Lọc ánh sáng xanh)",
    description:
      "Bật chế độ bảo vệ mắt, giảm mỏi mắt khi sử dụng điện thoại vào ban đêm.",
    category: "display",
    risk: "SAFE",
    defaultValue: "0",
    activeValues: ["1"],
  },
  {
    id: "speed_animations",
    title: "Tăng tốc hoạt ảnh chuyển cảnh (0.5x)",
    description:
      "Tăng tốc độ hoạt ảnh chuyển cảnh hệ thống lên gấp đôi (0.5x) giúp máy phản hồi cực kỳ nhanh nhạy.",
    category: "display",
    risk: "SAFE",
    defaultValue: "1.0",
    activeValues: ["0.5"],
  },
  {
    id: "smart_island",
    title: "Đảo động HyperOS (Smart Island)",
    description:
      "Kích hoạt hiệu ứng Đảo động/Capsule thông minh hiển thị sạc, nhạc, cuộc gọi trên thanh trạng thái HyperOS.",
    category: "display",
    risk: "SAFE",
    defaultValue: "0",
    activeValues: ["1"],
    isXiaomiOnly: true,
  },
  {
    id: "dark_mode",
    title: "Bật Dark Mode toàn hệ thống",
    description:
      "Kích hoạt chế độ tối trên toàn bộ giao diện hệ thống và ứng dụng hỗ trợ.",
    category: "display",
    risk: "SAFE",
    defaultValue: "1",
    activeValues: ["2"],
  },
  {
    id: "dynamic_resolution",
    title: "Tắt Dynamic Resolution (Tăng chất lượng hiển thị)",
    description:
      "Tắt cơ chế tự động hạ độ phân giải để tiết kiệm pin. Màn hình luôn hiển thị ở độ phân giải tối đa.",
    category: "display",
    risk: "SAFE",
    defaultValue: "1",
    activeValues: ["0"],
    isXiaomiOnly: true,
  },
  // ═══ CỬ CHỈ & ĐIỀU HƯỚNG ═══
  {
    id: "gesture_line_hide",
    title: "Ẩn thanh gạch trắng (Full Screen Indicator)",
    description:
      "Ẩn thanh điều hướng cử chỉ phía dưới cùng để tối ưu không gian màn hình vô cực.",
    category: "navigation",
    risk: "SAFE",
    defaultValue: "0",
    activeValues: ["1"],
    isXiaomiOnly: true,
  },
  {
    id: "hide_fullscreen_shortcuts",
    title: "Ẩn phím tắt chế độ Toàn màn hình",
    description:
      "Tự động ẩn thanh gợi ý/phím tắt bàn phím ảo và thanh điều hướng ở chế độ toàn màn hình.",
    category: "navigation",
    risk: "SAFE",
    defaultValue: "1",
    activeValues: ["0"],
  },
  {
    id: "touch_response_enhancement",
    title: "Tăng tốc độ phản hồi cảm ứng",
    description:
      "Giảm độ trễ cảm ứng nhận vào từ 500ms xuống 200ms, tăng cảm giác vuốt chạm tức thì mượt mà hơn.",
    category: "navigation",
    risk: "SAFE",
    defaultValue: "500",
    activeValues: ["250", "200", "150"],
  },
  {
    id: "immersive_fullscreen",
    title: "Chế độ Toàn màn hình tuyệt đối",
    description:
      "Ẩn hoàn toàn thanh trạng thái và thanh điều hướng, giúp toàn bộ màn hình hiển thị nội dung.",
    category: "navigation",
    risk: "MEDIUM",
    defaultValue: "null",
    activeValues: ["immersive.full=*"],
  },
  // ═══ LAUNCHER & ĐA NHIỆM ═══
  {
    id: "recent_apps_blur",
    title: "Làm mờ ứng dụng trong Đa nhiệm",
    description:
      "Tự động làm mờ nội dung preview các ứng dụng trong màn hình đa nhiệm để bảo mật thông tin.",
    category: "launcher",
    risk: "SAFE",
    defaultValue: "0",
    activeValues: ["1"],
    isXiaomiOnly: true,
  },
  {
    id: "memory_extension_display",
    title: "Hiển thị RAM mở rộng trong Đa nhiệm",
    description:
      "Hiển thị số lượng RAM ảo mở rộng (Extension RAM) bên cạnh RAM thực tế ở góc đa nhiệm.",
    category: "launcher",
    risk: "SAFE",
    defaultValue: "0",
    activeValues: ["1"],
    isXiaomiOnly: true,
  },
  {
    id: "disable_miui_optimization",
    title: "Vô hiệu hóa MIUI Optimization",
    description:
      "Tắt cơ chế tối ưu hóa độc quyền của MIUI. Giúp cài đặt file APK ngoài không bị lỗi, chạy đa nhiệm mượt mà hơn.",
    category: "launcher",
    risk: "RISKY",
    defaultValue: "1",
    activeValues: ["0"],
    isXiaomiOnly: true,
  },
  {
    id: "task_stack_ios",
    title: "Xếp chồng đa nhiệm giống iOS",
    description:
      "Chuyển đổi giao diện màn hình Đa nhiệm sang dạng xếp chồng (Stack style) như iOS.",
    category: "launcher",
    risk: "SAFE",
    defaultValue: "1",
    activeValues: ["2"],
    isXiaomiOnly: true,
  },
  // ═══ ÂM THANH & RUNG ═══
  {
    id: "haptic_feedback_level",
    title: "Phản hồi rung nâng cao (MIUI Haptics)",
    description:
      "Kích hoạt bộ rung phản hồi xúc giác tự nhiên và sắc nét trên toàn hệ thống.",
    category: "sound",
    risk: "SAFE",
    defaultValue: "1",
    activeValues: ["1"],
  },
  // ═══ GAME & HIỆU NĂNG ═══
  {
    id: "game_turbo_overlay",
    title: "Bật Game Turbo Toolbox",
    description:
      "Kích hoạt dải phím tắt tiện ích Game Turbo khi vuốt từ cạnh màn hình trong game.",
    category: "game",
    risk: "SAFE",
    defaultValue: "1",
    activeValues: ["1"],
    isXiaomiOnly: true,
  },
  {
    id: "high_performance_mode",
    title: "Kích hoạt chế độ Hiệu năng cao",
    description:
      "Mở khóa giới hạn CPU/GPU của hệ thống để tối đa hóa FPS khi chơi game và xử lý tác vụ nặng.",
    category: "game",
    risk: "MEDIUM",
    defaultValue: "0",
    activeValues: ["2"],
  },
  // ═══ CHẶN QUẢNG CÁO & GỢI Ý ═══
  {
    id: "disable_personalized_ads",
    title: "Vô hiệu hóa quảng cáo cá nhân (MSA)",
    description:
      "Tắt thuật toán thu thập hành vi người dùng để phân phối quảng cáo mục tiêu trên toàn hệ thống Xiaomi.",
    category: "ads",
    risk: "SAFE",
    defaultValue: "1",
    activeValues: ["0"],
    isXiaomiOnly: true,
  },
  {
    id: "disable_system_recommendations",
    title: "Tắt gợi ý quảng cáo trong app Hệ thống",
    description:
      "Tắt các tin gợi ý, banner quảng cáo khó chịu trong các app Thư mục, Trình quản lý tập tin, Cài đặt.",
    category: "ads",
    risk: "SAFE",
    defaultValue: "1",
    activeValues: ["0"],
    isXiaomiOnly: true,
  },
  {
    id: "disable_miui_daemon",
    title: "Vô hiệu hóa Analytics chạy ngầm (MiuiDaemon)",
    description:
      "Tắt dịch vụ phân tích dữ liệu chạy ngầm của Xiaomi nhằm cải thiện thời lượng pin và tăng tính riêng tư.",
    category: "ads",
    risk: "SAFE",
    defaultValue: "1",
    activeValues: ["0"],
    isXiaomiOnly: true,
  },
  // ═══ TIỆN ÍCH BỔ SUNG ═══
  {
    id: "hide_bg_notification",
    title: "Ẩn thông báo \"Ứng dụng đang chạy ngầm\"",
    description:
      "Ẩn cảnh báo hệ thống về ứng dụng chạy ngầm, giúp thanh thông báo sạch sẽ hơn.",
    category: "utility",
    risk: "SAFE",
    defaultValue: "1",
    activeValues: ["0"],
  },
];

export function UserExperience() {
  const { activeDevice, devices } = useDeviceStore();
  const [capabilities, setCapabilities] = useState<ExperienceItemStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deviceProfile, setDeviceProfile] = useState<any>(null);

  // Phát hiện trạng thái thiết bị thực tế
  const currentDevice = devices.find((d) => d.id === activeDevice);
  const isUnauthorized = currentDevice?.type === "unauthorized";
  const isOffline = currentDevice?.type === "offline";
  const isBootloader = currentDevice?.type === "bootloader";

  const isXiaomiDevice =
    deviceProfile &&
    (deviceProfile.manufacturer?.toLowerCase().includes("xiaomi") ||
      deviceProfile.manufacturer?.toLowerCase().includes("redmi") ||
      deviceProfile.manufacturer?.toLowerCase().includes("poco") ||
      deviceProfile.manufacturer?.toLowerCase().includes("blackshark") ||
      deviceProfile.brand?.toLowerCase().includes("xiaomi") ||
      deviceProfile.brand?.toLowerCase().includes("redmi") ||
      deviceProfile.brand?.toLowerCase().includes("poco"));

  const displayCapabilities = FULL_XIAOMI_CAPABILITIES.map((item) => {
    const realStatus = capabilities.find((c) => c.item.id === item.id);
    const isUnsupported =
      realStatus?.status === "UNSUPPORTED" ||
      (deviceProfile && !isXiaomiDevice && item.isXiaomiOnly);

    let status = realStatus?.status || ("UNKNOWN" as const);
    if (isUnsupported) status = "UNSUPPORTED" as const;

    return {
      item,
      status,
      currentValue: isUnsupported
        ? "Chỉ hỗ trợ Xiaomi/Poco/Redmi"
        : realStatus?.currentValue || (loading ? "Đang quét..." : "Chưa quét"),
    };
  });

  // System State for Toast & Modal
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    risk: "SAFE" | "MEDIUM" | "RISKY" | "DANGEROUS";
    onConfirm: () => void;
  } | null>(null);

  const categories = [
    {
      id: "all",
      label: "Tất cả tweak",
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: "display",
      label: "Hiển thị & Màn hình",
      icon: <Eye className="w-4 h-4" />,
    },
    {
      id: "navigation",
      label: "Cử chỉ & Điều hướng",
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      id: "launcher",
      label: "Launcher & Đa nhiệm",
      icon: <AppWindow className="w-4 h-4" />,
    },
    {
      id: "sound",
      label: "Âm thanh & Rung",
      icon: <Volume2 className="w-4 h-4" />,
    },
    {
      id: "game",
      label: "Game & Hiệu năng",
      icon: <Gamepad2 className="w-4 h-4" />,
    },
    {
      id: "ads",
      label: "Chặn QC & Gợi ý",
      icon: <Megaphone className="w-4 h-4" />,
    },
    {
      id: "utility",
      label: "Tiện ích bổ sung",
      icon: <Sliders className="w-4 h-4" />,
    },
  ];

  // Toast trigger
  const showToast = (
    msg: string,
    type: "success" | "error" | "info" | "warning" = "success",
  ) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const loadCapabilities = async () => {
    if (!activeDevice) return;

    // Nếu thiết bị offline hoặc unauthorized thì không chạy lệnh ADB tránh làm bẩn logs và crash
    if (isUnauthorized || isOffline) {
      setDeviceProfile(null);
      setCapabilities([]);
      return;
    }

    setLoading(true);
    try {
      const profile = await window.api.getDeviceProfile(activeDevice);
      setDeviceProfile(profile);

      const data = await window.api.getXiaomiCapabilities(activeDevice);
      setCapabilities(data);
    } catch (err) {
      console.error("Lỗi khi tải thông tin tùy biến:", err);
      showToast("Không thể kết nối hoặc quét tính năng thiết bị", "error");
      setDeviceProfile(null);
      setCapabilities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCapabilities();
  }, [activeDevice, isUnauthorized, isOffline]);

  const handleToggle = async (itemId: string, currentStatus: string) => {
    if (!activeDevice) return;

    // Tìm item trong capabilities gốc để kiểm tra rủi ro
    const capItem = displayCapabilities.find((c) => c.item.id === itemId);
    if (!capItem) return;

    const nextEnable = currentStatus === "SUPPORTED_OFF";

    const executeToggle = async () => {
      setProcessingId(itemId);
      try {
        const res = await window.api.applyXiaomiItem(
          activeDevice,
          itemId,
          nextEnable,
        );
        if (res.success) {
          const fallbackNote = res.usedFallback ? " (dùng lệnh thay thế)" : "";
          showToast(
            `Đã ${nextEnable ? "kích hoạt" : "vô hiệu hóa"} thành công: ${capItem.item.title}${fallbackNote}`,
            res.usedFallback ? "warning" : "success",
          );
          await loadCapabilities();
        } else {
          showToast(`Lệnh không tương thích với ROM này. Chi tiết: ${res.output?.substring(0, 120)}`, "error");
        }
      } catch (error: any) {
        showToast(`Thất bại: ${error.message}`, "error");
      } finally {
        setProcessingId(null);
      }
    };

    // Yêu cầu xác nhận nếu có rủi ro cao
    if (capItem.item.risk !== "SAFE") {
      setConfirmModal({
        isOpen: true,
        title: capItem.item.title,
        message: `Tính năng này có mức độ rủi ro ${capItem.item.risk}. Việc kích hoạt hoặc thay đổi các cài đặt sâu của hệ thống có thể ảnh hưởng đến hiệu năng hoặc trải nghiệm chung. Bạn có chắc chắn muốn tiếp tục?`,
        risk: capItem.item.risk,
        onConfirm: () => {
          setConfirmModal(null);
          executeToggle();
        },
      });
    } else {
      executeToggle();
    }
  };

  const handleRollback = async (itemId: string) => {
    if (!activeDevice) return;
    const capItem = displayCapabilities.find((c) => c.item.id === itemId);
    if (!capItem) return;

    const executeRollback = async () => {
      setProcessingId(itemId);
      try {
        const res = await window.api.rollbackXiaomiItem(activeDevice, itemId);
        if (res.success) {
          showToast(
            `Đã khôi phục cài đặt gốc cho: ${capItem.item.title}`,
            "success",
          );
          await loadCapabilities();
        } else {
          showToast(`Lỗi: ${res.output}`, "error");
        }
      } catch (error: any) {
        showToast(`Thất bại: ${error.message}`, "error");
      } finally {
        setProcessingId(null);
      }
    };

    setConfirmModal({
      isOpen: true,
      title: `Khôi phục mặc định`,
      message: `Bạn đang yêu cầu khôi phục tính năng "${capItem.item.title}" về cài đặt mặc định ban đầu của nhà sản xuất (${capItem.item.defaultValue}). Xác nhận thực hiện?`,
      risk: "MEDIUM",
      onConfirm: () => {
        setConfirmModal(null);
        executeRollback();
      },
    });
  };

  const handleQuickOptimize = async () => {
    if (!activeDevice) return;
    const safeOffItems = displayCapabilities.filter(
      (c) => c.status === "SUPPORTED_OFF" && c.item.risk === "SAFE",
    );
    if (safeOffItems.length === 0) {
      showToast("Tất cả tùy chọn an toàn đã được kích hoạt!", "info");
      return;
    }

    setLoading(true);
    let successCount = 0;
    for (const c of safeOffItems) {
      try {
        const res = await window.api.applyXiaomiItem(
          activeDevice,
          c.item.id,
          true,
        );
        if (res.success) {
          successCount++;
        }
      } catch (error) {
        console.error(`Lỗi khi tối ưu hóa ${c.item.title}:`, error);
      }
    }
    showToast(
      `Đã tối ưu hóa nhanh thành công ${successCount}/${safeOffItems.length} tùy chọn an toàn!`,
      "success",
    );
    await loadCapabilities();
    setLoading(false);
  };

  const getRiskStyles = (risk: string) => {
    switch (risk) {
      case "SAFE":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "MEDIUM":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "RISKY":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "DANGEROUS":
        return "bg-rose-500/10 text-rose-600 border-rose-500/30 font-extrabold animate-pulse";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUPPORTED_ON":
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 shadow-sm shadow-emerald-500/5 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Đang Bật
          </span>
        );
      case "SUPPORTED_OFF":
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold bg-slate-500/10 text-slate-400 px-3 py-1 rounded-full border border-slate-500/15 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Đang Tắt
          </span>
        );
      case "UNSUPPORTED":
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full border border-rose-500/15 select-none">
            <XCircle className="w-3.5 h-3.5" /> Không Hỗ Trợ
          </span>
        );
      case "UNKNOWN":
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/15 select-none">
            <HelpCircle className="w-3.5 h-3.5" /> Chưa Quét
          </span>
        );
      case "ERROR":
      default:
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold bg-red-500/10 text-red-400 px-3 py-1 rounded-full border border-red-500/15 animate-shake select-none">
            <AlertTriangle className="w-3.5 h-3.5" /> Lỗi Hệ Thống
          </span>
        );
    }
  };

  const filteredCapabilities = displayCapabilities.filter(
    (c) => activeCategory === "all" || c.item.category === activeCategory,
  );

  const supportedCapabilities = displayCapabilities.filter(
    (c) => c.status !== "UNSUPPORTED",
  );
  const totalSupported = supportedCapabilities.length;
  const enabledCount = supportedCapabilities.filter(
    (c) => c.status === "SUPPORTED_ON",
  ).length;

  const safeCapabilities = displayCapabilities.filter(
    (c) => c.item.risk === "SAFE" && c.status !== "UNSUPPORTED",
  );
  const totalSafeCount = safeCapabilities.length;
  const enabledSafeCount = safeCapabilities.filter(
    (c) => c.status === "SUPPORTED_ON",
  ).length;

  const optimizationScore =
    totalSafeCount > 0
      ? Math.round((enabledSafeCount / totalSafeCount) * 100)
      : 0;

  return (
    <div className="absolute inset-8 max-w-7xl mx-auto flex flex-col overflow-hidden bg-white/80 backdrop-blur-3xl rounded-[32px] p-5.5 border border-slate-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.06)] text-slate-800">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes radar-sweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes holographic-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        .cyber-neon-indigo {
          text-shadow: 0 0 8px rgba(99, 102, 241, 0.25);
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.35);
        }
      `,
        }}
      />

      {/* ── HEADER & PROFILE & INTEGRATED MINI HUD ──────────────────────────────── */}
      {!activeDevice ? (
        <div className="text-center p-12 bg-white/80 backdrop-blur-2xl rounded-[32px] border border-slate-200/50 shadow-xl flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-24 h-24 bg-gradient-to-tr from-slate-150 to-white border border-slate-200/60 rounded-full mx-auto mb-6 flex items-center justify-center shadow-inner relative select-none">
            <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-xl animate-pulse"></div>
            <Smartphone className="text-slate-400 w-11 h-11 relative z-10 animate-bounce" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
            Chưa kết nối thiết bị
          </h3>
          <p className="text-slate-500 max-w-sm text-sm font-medium">
            Vui lòng cắm cáp kết nối thiết bị Android, bật Gỡ lỗi USB (USB
            Debugging) để bắt đầu cá nhân hóa giao diện.
          </p>
        </div>
      ) : isBootloader ? (
        <div className="text-center p-12 bg-slate-900 rounded-[32px] border border-slate-800 shadow-2xl flex-1 flex flex-col items-center justify-center min-h-[450px] text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse" />
          <div className="w-20 h-20 bg-cyan-950/50 rounded-[28px] mx-auto mb-6 flex items-center justify-center border border-cyan-800/50 shadow-lg shadow-cyan-500/10">
            <Cpu className="text-cyan-400 w-10 h-10 animate-pulse" />
          </div>
          <h3 className="text-2xl font-black text-cyan-400 tracking-tight mb-2 uppercase">
            Thiết bị ở chế độ Fastboot
          </h3>
          <p className="text-slate-400 max-w-md text-xs mb-8 leading-relaxed font-semibold">
            Giao diện tùy biến trải nghiệm chỉ hỗ trợ khi thiết bị hoạt động ở chế độ bình thường (ADB). Vui lòng chuyển qua tab Bảng điều khiển để khởi động lại thiết bị.
          </p>
        </div>
      ) : isUnauthorized || isOffline ? (
        <div className="text-center p-12 bg-white/80 backdrop-blur-3xl rounded-[32px] border border-slate-200/50 shadow-xl flex-1 flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>
          {/* Animated Glow Backdrops */}
          <div className="absolute w-72 h-72 rounded-full bg-rose-500/5 blur-3xl -top-20 -right-20 pointer-events-none animate-pulse"></div>
          <div
            className="absolute w-72 h-72 rounded-full bg-amber-500/5 blur-3xl -bottom-20 -left-20 pointer-events-none animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>

          <div className="w-20 h-20 bg-gradient-to-tr from-rose-500/10 to-amber-500/10 border border-rose-500/20 rounded-[28px] mx-auto mb-6 flex items-center justify-center shadow-md relative animate-pulse">
            <ShieldAlert className="text-rose-500 w-10 h-10 relative z-10" />
          </div>

          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2 select-none">
            {isUnauthorized
              ? "Thiết bị chưa được xác thực"
              : "Thiết bị đang ngoại tuyến"}
          </h3>
          <p className="text-slate-500 max-w-md text-sm mb-8 leading-relaxed font-semibold">
            {isUnauthorized
              ? "Vui lòng kiểm tra màn hình điện thoại của bạn và xác nhận quyền gỡ lỗi USB để kích hoạt các tính năng cá nhân hóa giao diện nâng cao."
              : "Thiết bị đã ngắt kết nối hoặc phản hồi chậm. Vui lòng kiểm tra lại cáp USB hoặc trạng thái kết nối."}
          </p>

          {isUnauthorized && (
            <div className="w-full max-w-md bg-slate-50/80 border border-slate-200/50 rounded-2xl p-5 mb-8 text-left space-y-3.5 shadow-sm">
              <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-widest block mb-1">
                HƯỚNG DẪN XỬ LÝ NHANH
              </span>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-xs text-slate-650 font-semibold leading-relaxed">
                  Mở khóa màn hình điện thoại Android của bạn.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-xs text-slate-650 font-semibold leading-relaxed">
                  Một hộp thoại yêu cầu cấp quyền{" "}
                  <strong className="text-slate-800">
                    &quot;Cho phép gỡ lỗi USB?&quot;
                  </strong>{" "}
                  sẽ xuất hiện.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p className="text-xs text-slate-650 font-semibold leading-relaxed">
                  Tích chọn{" "}
                  <strong className="text-slate-800">
                    &quot;Luôn cho phép từ máy tính này&quot;
                  </strong>{" "}
                  và nhấn{" "}
                  <strong className="text-indigo-650">Cho phép (OK)</strong>.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={loadCapabilities}
            disabled={loading}
            className="px-6 py-3.5 bg-gradient-to-r from-rose-650 to-amber-650 hover:from-rose-700 hover:to-amber-700 active:scale-97 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-rose-500/10 flex items-center gap-2 border border-rose-500/15"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Tôi đã cấp quyền - Quét lại ngay</span>
          </button>
        </div>
      ) : (
        <>
          {deviceProfile && (
            <div className="bg-gradient-to-r from-indigo-50/40 via-white to-blue-50/30 rounded-3xl p-4 border border-slate-200/50 shadow-sm mb-4.5 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between relative overflow-hidden group shrink-0 select-none">
              {/* Decorative Glow Blob */}
              <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>

              {/* Left Side: Device info */}
              <div className="flex gap-4 items-center relative z-10">
                <div className="w-12 h-12 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">
                      {deviceProfile.manufacturer} {deviceProfile.model}
                    </h3>
                    <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-extrabold text-slate-650 rounded-full border border-slate-200 uppercase tracking-widest">
                      API {deviceProfile.sdk}
                    </span>
                  </div>
                  <div className="text-[10px] font-extrabold text-indigo-650 tracking-wider uppercase mt-1 flex items-center gap-1.5">
                    <Info className="w-3 h-3 text-indigo-500" />
                    {deviceProfile.hyperOsVersionName
                      ? `HyperOS (${deviceProfile.incremental})`
                      : deviceProfile.miuiVersionName
                        ? `MIUI ${deviceProfile.miuiVersionName}`
                        : `Android OS v${deviceProfile.release}`}
                  </div>
                </div>
              </div>

              {/* Right Side: Mini Shield Integrated HUD & Quick Actions */}
              <div className="flex flex-wrap items-center gap-4 relative z-10 border-t lg:border-t-0 border-slate-150/60 pt-3 lg:pt-0">
                {/* Mini integrated stats shield */}
                <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4.5 py-2 rounded-2xl border border-slate-200/60 shadow-sm">
                  {/* Circular Radar mini */}
                  <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                    <div className="absolute w-10 h-10 rounded-full border border-dashed border-indigo-500/10 animate-[radar-sweep_12s_linear_infinite]"></div>
                    <svg className="w-9 h-9 transform -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        stroke="rgba(0,0,0,0.02)"
                        strokeWidth="3"
                        fill="transparent"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        stroke="url(#miniHUDGradient)"
                        strokeWidth="3.5"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 14}
                        strokeDashoffset={
                          2 * Math.PI * 14 * (1 - optimizationScore / 100)
                        }
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient
                          id="miniHUDGradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="absolute text-[11px] font-black text-indigo-650 cyber-neon-indigo">
                      {optimizationScore}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none mb-0.5">
                      HỆ THỐNG
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 leading-none">
                      {enabledCount}/{totalSupported} Kích hoạt
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleQuickOptimize}
                    disabled={
                      loading || totalSafeCount - enabledSafeCount === 0
                    }
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-97 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-transparent text-white text-xs font-extrabold rounded-2xl border border-indigo-500/10 shadow-sm shadow-indigo-600/5 transition-all flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Tối ưu hóa nhanh</span>
                  </button>

                  <button
                    onClick={loadCapabilities}
                    disabled={loading}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 disabled:opacity-50 text-slate-700 rounded-2xl border border-slate-200 shadow-sm transition-all"
                    title="Quét lại thiết bị"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── HORIZONTAL SCROLLABLE CATEGORY TABS ───────────────────────────────── */}
          <div className="bg-slate-50/60 border border-slate-200/50 rounded-2xl p-1.5 mb-4 shrink-0 overflow-hidden select-none">
            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1 px-0.5">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center gap-2 whitespace-nowrap shrink-0 ${
                      isActive
                        ? "bg-indigo-600 border-transparent text-white shadow-md shadow-indigo-600/15"
                        : "bg-white border-slate-200/60 hover:bg-slate-100/80 text-slate-650 hover:text-indigo-600"
                    }`}
                  >
                    <span
                      className={
                        isActive
                          ? "text-cyan-300"
                          : "text-slate-450 group-hover:text-indigo-500"
                      }
                    >
                      {cat.icon}
                    </span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── FEATURE GRID (100% WIDTH, FULL RESPONSIVE Layout) ───────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 custom-scrollbar flex flex-col">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-[145px] bg-slate-50/50 rounded-3xl border border-slate-200/40 animate-pulse relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-transparent"></div>
                  </div>
                ))}
              </div>
            ) : filteredCapabilities.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/30 rounded-3xl border border-slate-200/50 min-h-[300px]">
                <Sparkles className="w-10 h-10 text-slate-300 mb-3 animate-pulse" />
                <p className="text-slate-400 text-xs font-bold">
                  Không tìm thấy tùy chọn nào trong danh mục này.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {filteredCapabilities.map((capItem) => {
                  const { item, status } = capItem;
                  const isEnabled = status === "SUPPORTED_ON";
                  const isLocked = status === "UNSUPPORTED";
                  const isProcessing = processingId === item.id;
                  const currentValue = capItem.currentValue;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-3xl p-5 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group ${
                        isLocked
                          ? "opacity-45 bg-slate-50/40 border-slate-200/45 cursor-not-allowed select-none"
                          : isEnabled
                            ? "bg-gradient-to-br from-white to-emerald-50/[0.12] border-emerald-500/25 hover:border-emerald-500/40 shadow-sm hover:shadow-[0_8px_24px_rgba(16,185,129,0.04)]"
                            : "bg-white hover:bg-slate-50/10 border-slate-200/70 hover:border-indigo-500/25 shadow-[0_4px_16px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)]"
                      }`}
                    >
                      {/* Interactive glow inside active card */}
                      {isEnabled && !isLocked && (
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                      )}

                      <div>
                        {/* Status row */}
                        <div className="flex justify-between items-center mb-3 select-none">
                          {getStatusBadge(isLocked ? "UNSUPPORTED" : status)}
                          {item.isXiaomiOnly && !isXiaomiDevice ? (
                            <span className="text-[9px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100/65 rounded-full uppercase tracking-wider select-none">
                              Chỉ Xiaomi
                            </span>
                          ) : (
                            <span
                              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border tracking-wide uppercase select-none ${getRiskStyles(
                                item.risk,
                              )}`}
                            >
                              {item.risk}
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h4
                          className={`font-black text-sm leading-snug group-hover:text-indigo-650 transition-colors ${isLocked ? "text-slate-400" : "text-slate-800"}`}
                        >
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-2 line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      {/* Action buttons (Always spaced and structured) */}
                      <div className="flex items-center justify-between border-t border-slate-150/60 pt-3 mt-4 select-none shrink-0">
                        <div className="flex flex-col">
                          <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                            GIÁ TRỊ
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 font-mono truncate max-w-[100px] leading-tight">
                            {currentValue !== undefined &&
                            !isLocked &&
                            currentValue !== "Chỉ hỗ trợ Xiaomi/Poco/Redmi"
                              ? currentValue
                              : "—"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Rollback button */}
                          {!isLocked && status !== "UNKNOWN" && (
                            <button
                              onClick={() => handleRollback(item.id)}
                              disabled={isProcessing}
                              title="Khôi phục mặc định"
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-100 active:scale-90 rounded-xl transition-all border border-slate-200/50 shadow-sm bg-white shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Switch button (Fully custom & spaced) */}
                          <button
                            onClick={() => handleToggle(item.id, status)}
                            disabled={isLocked || isProcessing}
                            className={`w-12 h-6 rounded-full transition-all duration-300 relative flex items-center px-1 border shrink-0 ${
                              isLocked
                                ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-50"
                                : isEnabled
                                  ? "bg-gradient-to-r from-blue-500 to-emerald-500 border-transparent shadow-[0_2px_6px_rgba(16,185,129,0.2)]"
                                  : "bg-slate-200 border-slate-300/60 hover:border-indigo-500/20"
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full transition-all duration-350 shadow flex items-center justify-center ${
                                isEnabled ? "translate-x-6" : "translate-x-0"
                              } bg-white`}
                            >
                              {isProcessing && (
                                <span className="w-2.5 h-2.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                              )}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TOAST MESSAGES SYSTEM ────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none select-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4.5 py-3.5 rounded-2xl border backdrop-blur-xl shadow-xl transition-all duration-300 animate-slide-in pointer-events-auto flex items-center gap-3 ${
              toast.type === "success"
                ? "bg-white/95 text-emerald-600 border-emerald-500/15"
                : toast.type === "error"
                  ? "bg-white/95 text-rose-600 border-rose-500/15"
                  : toast.type === "warning"
                    ? "bg-white/95 text-amber-600 border-amber-500/15"
                    : "bg-white/95 text-indigo-600 border-indigo-500/15"
            }`}
          >
            {toast.type === "success" ? (
              <Check className="w-4 h-4 shrink-0 animate-bounce text-emerald-400" />
            ) : (
              <Bell className="w-4 h-4 shrink-0 animate-bounce" />
            )}
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {toast.msg}
            </span>
          </div>
        ))}
      </div>

      {/* ── CUSTOM CONFIRM DIALOG ────────────────────────────────────────────── */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-[32px] w-full max-w-md p-6.5 transform scale-100 transition-all">
            {/* Warning Icon Banner */}
            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-slate-100 select-none">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  confirmModal.risk === "DANGEROUS"
                    ? "bg-rose-50 text-rose-500 animate-pulse"
                    : confirmModal.risk === "RISKY"
                      ? "bg-amber-50 text-amber-500"
                      : "bg-indigo-50 text-indigo-500"
                }`}
              >
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border select-none tracking-widest ${
                    confirmModal.risk === "DANGEROUS"
                      ? "bg-rose-50 text-rose-600 border-rose-200 font-black"
                      : confirmModal.risk === "RISKY"
                        ? "bg-amber-50 text-amber-600 border-amber-200"
                        : "bg-indigo-50 text-indigo-600 border-indigo-200"
                  }`}
                >
                  {confirmModal.risk} RISK LEVEL
                </span>
                <h3 className="font-black text-slate-800 text-lg mt-1 tracking-tight">
                  Cảnh Báo An Toàn
                </h3>
              </div>
            </div>

            {/* Content text */}
            <div className="mb-6">
              <h4 className="font-extrabold text-slate-700 text-sm mb-1.5">
                {confirmModal.title}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {confirmModal.message}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 transition-all duration-200 text-slate-600 text-xs font-bold rounded-2xl active:scale-95 border border-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-5 py-3 text-white text-xs font-extrabold rounded-2xl shadow-lg transition-all duration-200 active:scale-95 ${
                  confirmModal.risk === "DANGEROUS"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                    : confirmModal.risk === "RISKY"
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
    </div>
  );
}

export default UserExperience;
