export interface XiaomiExperienceItem {
  id: string;
  title: string;
  description: string;
  category: "display" | "navigation" | "launcher" | "sound" | "game" | "ads";
  risk: "SAFE" | "MEDIUM" | "RISKY" | "DANGEROUS";
  detectStrategy: {
    brand?: string[];
    minSdk?: number;
    packages?: string[];
    settingsKeys?: Array<{
      namespace: "system" | "secure" | "global";
      key: string;
    }>;
  };
  readCommand: { namespace: "system" | "secure" | "global"; key: string };
  enableCommand: string;
  disableCommand: string;
  defaultValue: string;
  activeValues?: string[];
}

export const XIAOMI_EXPERIENCE_ITEMS: XiaomiExperienceItem[] = [
  // 1. Hiển thị & Màn hình
  {
    id: "show_refresh_rate",
    title: "Hiển thị tốc độ làm tươi",
    description:
      "Hiện số FPS/Tần số quét màn hình theo thời gian thực ở góc trái trên cùng.",
    category: "display",
    risk: "SAFE",
    detectStrategy: {
      minSdk: 29,
    },
    readCommand: { namespace: "secure", key: "show_refresh_rate" },
    enableCommand: "settings put secure show_refresh_rate 1",
    disableCommand: "settings put secure show_refresh_rate 0",
    defaultValue: "0",
  },
  {
    id: "force_high_refresh_rate",
    title: "Ép tần số quét tối đa",
    description:
      "Ép màn hình chạy ở tần số quét cao nhất liên tục (ví dụ 120Hz), loại bỏ tự động tụt Hz.",
    category: "display",
    risk: "MEDIUM",
    detectStrategy: {
      settingsKeys: [{ namespace: "system", key: "user_refresh_rate" }],
    },
    readCommand: { namespace: "system", key: "user_refresh_rate" },
    enableCommand: "settings put system user_refresh_rate 120",
    disableCommand: "settings put system user_refresh_rate 60",
    defaultValue: "60",
  },
  {
    id: "reading_mode",
    title: "Chế độ Đọc sách (Lọc ánh sáng xanh)",
    description:
      "Bật chế độ bảo vệ mắt, giảm mỏi mắt khi sử dụng điện thoại vào ban đêm.",
    category: "display",
    risk: "SAFE",
    detectStrategy: {
      settingsKeys: [{ namespace: "system", key: "screen_paper_mode" }],
    },
    readCommand: { namespace: "system", key: "screen_paper_mode" },
    enableCommand: "settings put system screen_paper_mode 1",
    disableCommand: "settings put system screen_paper_mode 0",
    defaultValue: "0",
  },
  {
    id: "speed_animations",
    title: "Tăng tốc hoạt ảnh chuyển cảnh (0.5x)",
    description:
      "Tăng tốc độ hoạt ảnh chuyển cảnh hệ thống lên gấp đôi (0.5x) giúp máy phản hồi cực kỳ nhanh nhạy và mượt mà.",
    category: "display",
    risk: "SAFE",
    detectStrategy: {
      minSdk: 21,
    },
    readCommand: { namespace: "global", key: "window_animation_scale" },
    enableCommand:
      "settings put global window_animation_scale 0.5 && settings put global transition_animation_scale 0.5 && settings put global animator_duration_scale 0.5",
    disableCommand:
      "settings put global window_animation_scale 1.0 && settings put global transition_animation_scale 1.0 && settings put global animator_duration_scale 1.0",
    defaultValue: "1.0",
    activeValues: ["0.5"],
  },

  // 2. Cảm ứng & Điều hướng
  {
    id: "touch_response_enhancement",
    title: "Tăng tốc độ phản hồi cảm ứng",
    description:
      "Giảm độ trễ cảm ứng nhận vào, tăng cảm giác vuốt chạm tức thì mượt mà hơn.",
    category: "navigation",
    risk: "SAFE",
    detectStrategy: {
      minSdk: 28,
    },
    readCommand: { namespace: "system", key: "touch_responsiveness" },
    enableCommand: "settings put system touch_responsiveness 1",
    disableCommand: "settings put system touch_responsiveness 0",
    defaultValue: "0",
  },
  {
    id: "gesture_line_hide",
    title: "Ẩn thanh gạch trắng (Full Screen Indicator)",
    description:
      "Ẩn thanh điều hướng cử chỉ phía dưới cùng để tối ưu không gian màn hình vô cực.",
    category: "navigation",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
    },
    readCommand: { namespace: "global", key: "force_fsg_nav_bar" },
    enableCommand: "settings put global force_fsg_nav_bar 1 && settings put global hide_gesture_line 1",
    disableCommand: "settings put global force_fsg_nav_bar 0 && settings put global hide_gesture_line 0",
    defaultValue: "0",
  },

  // 3. Launcher & Recent Apps
  {
    id: "recent_apps_blur",
    title: "Làm mờ ứng dụng trong Đa nhiệm",
    description:
      "Tự động làm mờ nội dung preview các ứng dụng được chọn trong màn hình đa nhiệm để bảo mật thông tin.",
    category: "launcher",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
    },
    readCommand: { namespace: "secure", key: "miui_recents_blur_enabled" },
    enableCommand: "settings put secure miui_recents_blur_enabled 1",
    disableCommand: "settings put secure miui_recents_blur_enabled 0",
    defaultValue: "0",
  },
  {
    id: "memory_extension_display",
    title: "Hiển thị RAM mở rộng trong Đa nhiệm",
    description:
      "Hiển thị số lượng RAM ảo mở rộng (Extension RAM) bên cạnh RAM thực tế ở góc đa nhiệm.",
    category: "launcher",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
    },
    readCommand: { namespace: "system", key: "show_memory_info" },
    enableCommand: "settings put system show_memory_info 1",
    disableCommand: "settings put system show_memory_info 0",
    defaultValue: "0",
  },
  {
    id: "disable_miui_optimization",
    title: "Vô hiệu hóa MIUI Optimization",
    description:
      "Tắt cơ chế tối ưu hóa độc quyền của MIUI. Giúp cài đặt file APK ngoài không bị lỗi, chạy đa nhiệm mượt mà hơn.",
    category: "launcher",
    risk: "RISKY",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
    },
    readCommand: { namespace: "global", key: "miui_optimization" },
    enableCommand: "settings put global miui_optimization 0",
    disableCommand: "settings put global miui_optimization 1",
    defaultValue: "1",
    activeValues: ["0"],
  },
  {
    id: "task_stack_ios",
    title: "Xếp chồng đa nhiệm giống iOS",
    description:
      "Chuyển đổi giao diện màn hình Đa nhiệm (Recent Apps) sang dạng xếp chồng (Stack style) mượt mà như iOS.",
    category: "launcher",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
    },
    readCommand: { namespace: "global", key: "task_stack_view_layout_style" },
    enableCommand: "settings put global task_stack_view_layout_style 2",
    disableCommand: "settings put global task_stack_view_layout_style 1",
    defaultValue: "1",
    activeValues: ["2"],
  },

  // 4. Âm thanh & Rung
  {
    id: "haptic_feedback_level",
    title: "Phản hồi rung nâng cao (MIUI Haptics)",
    description:
      "Kích hoạt bộ rung phản hồi xúc giác tự nhiên và sắc nét trên toàn hệ thống.",
    category: "sound",
    risk: "SAFE",
    detectStrategy: {
      settingsKeys: [{ namespace: "system", key: "haptic_feedback_enabled" }],
    },
    readCommand: { namespace: "system", key: "haptic_feedback_enabled" },
    enableCommand: "settings put system haptic_feedback_enabled 1",
    disableCommand: "settings put system haptic_feedback_enabled 0",
    defaultValue: "1",
  },

  // 5. Game & Tiện ích
  {
    id: "game_turbo_overlay",
    title: "Bật Game Turbo Toolbox",
    description:
      "Kích hoạt dải phím tắt tiện ích Game Turbo khi vuốt từ cạnh màn hình trong game.",
    category: "game",
    risk: "SAFE",
    detectStrategy: {
      packages: ["com.miui.securitycenter"],
    },
    readCommand: { namespace: "secure", key: "game_booster_toolbox" },
    enableCommand: "settings put secure game_booster_toolbox 1",
    disableCommand: "settings put secure game_booster_toolbox 0",
    defaultValue: "1",
  },
  {
    id: "high_performance_mode",
    title: "Kích hoạt chế độ Hiệu năng cao",
    description:
      "Mở khóa giới hạn CPU/GPU của hệ thống để tối đa hóa FPS khi chơi game và xử lý tác vụ nặng.",
    category: "game",
    risk: "MEDIUM",
    detectStrategy: {
      minSdk: 21,
    },
    readCommand: { namespace: "secure", key: "power_mode" },
    enableCommand: "settings put secure power_mode high",
    disableCommand: "settings put secure power_mode normal",
    defaultValue: "normal",
    activeValues: ["high"],
  },

  // 6. Quảng cáo & Gợi ý (Ads & Recommendation Removal)
  {
    id: "disable_personalized_ads",
    title: "Vô hiệu hóa quảng cáo cá nhân (msa)",
    description:
      "Tắt thuật toán thu thập hành vi người dùng để phân phối quảng cáo mục tiêu trên toàn hệ thống Xiaomi.",
    category: "ads",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
    },
    readCommand: { namespace: "global", key: "miui_personalized_ads_enable" },
    enableCommand: "settings put global miui_personalized_ads_enable 0",
    disableCommand: "settings put global miui_personalized_ads_enable 1",
    defaultValue: "1",
    activeValues: ["0"],
  },
  {
    id: "disable_system_recommendations",
    title: "Tắt gợi ý quảng cáo trong app Hệ thống",
    description:
      "Tắt các tin gợi ý, banner quảng cáo khó chịu trong các app Thư mục, Trình quản lý tập tin, Cài đặt.",
    category: "ads",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
    },
    readCommand: { namespace: "system", key: "miui_recommend_enable" },
    enableCommand: "settings put system miui_recommend_enable 0",
    disableCommand: "settings put system miui_recommend_enable 1",
    defaultValue: "1",
    activeValues: ["0"],
  },
  {
    id: "disable_miui_daemon",
    title: "Vô hiệu hóa Analytics chạy ngầm (MiuiDaemon)",
    description:
      "Tắt dịch vụ phân tích dữ liệu chạy ngầm của Xiaomi nhằm cải thiện thời lượng pin và tăng tính riêng tư.",
    category: "ads",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
    },
    readCommand: { namespace: "global", key: "miui_analytics_enabled" },
    enableCommand: "settings put global miui_analytics_enabled 0",
    disableCommand: "settings put global miui_analytics_enabled 1",
    defaultValue: "1",
    activeValues: ["0"],
  },
  {
    id: "smart_island",
    title: "Đảo động HyperOS (Smart Island)",
    description:
      "Kích hoạt hiệu ứng Đảo động/Capsule thông minh hiển thị sạc, nhạc, cuộc gọi trên thanh trạng thái HyperOS.",
    category: "display",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
    },
    readCommand: { namespace: "global", key: "status_bar_show_smart_island" },
    enableCommand: "settings put global status_bar_show_smart_island 1 && settings put global status_bar_show_capsule 1",
    disableCommand: "settings put global status_bar_show_smart_island 0 && settings put global status_bar_show_capsule 0",
    defaultValue: "0",
    activeValues: ["1"],
  },
  {
    id: "hide_fullscreen_shortcuts",
    title: "Ẩn phím tắt chế độ Toàn màn hình",
    description:
      "Tự động ẩn thanh gợi ý/phím tắt bàn phím ảo và thanh điều hướng vướng víu ở chế độ toàn màn hình.",
    category: "navigation",
    risk: "SAFE",
    detectStrategy: {
      minSdk: 21,
    },
    readCommand: { namespace: "secure", key: "show_keyboard_shortcuts_helper" },
    enableCommand: "settings put secure show_keyboard_shortcuts_helper 0 && settings put global policy_control immersive.full=*",
    disableCommand: "settings put secure show_keyboard_shortcuts_helper 1 && settings put global policy_control null",
    defaultValue: "1",
    activeValues: ["0"],
  },
];
