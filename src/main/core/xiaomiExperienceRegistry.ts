export interface XiaomiExperienceItem {
  id: string;
  title: string;
  description: string;
  category: "display" | "navigation" | "launcher" | "sound" | "game" | "ads" | "utility";
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
  /** Danh sách lệnh thay thế khi lệnh chính không hoạt động (auto-fallback) */
  fallbackEnableCommands?: string[];
  fallbackDisableCommands?: string[];
  defaultValue: string;
  activeValues?: string[];
}

export const XIAOMI_EXPERIENCE_ITEMS: XiaomiExperienceItem[] = [
  // ═══════════════════════════════════════════════════════════
  // 1. HIỂN THỊ & MÀN HÌNH
  // ═══════════════════════════════════════════════════════════
  {
    id: "show_refresh_rate",
    title: "Hiển thị tốc độ làm tươi (FPS)",
    description:
      "Hiện số FPS/Tần số quét màn hình theo thời gian thực ở góc trái trên cùng.",
    category: "display",
    risk: "SAFE",
    detectStrategy: {
      minSdk: 29,
    },
    readCommand: { namespace: "global", key: "show_refresh_rate" },
    enableCommand: "settings put global show_refresh_rate 1",
    disableCommand: "settings put global show_refresh_rate 0",
    fallbackEnableCommands: [
      "settings put system fps_show 1",
      "settings put system show_refresh_rate 1",
      "settings put secure show_refresh_rate 1",
    ],
    fallbackDisableCommands: [
      "settings put system fps_show 0",
      "settings put system show_refresh_rate 0",
      "settings put secure show_refresh_rate 0",
    ],
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
    detectStrategy: {
      settingsKeys: [{ namespace: "system", key: "peak_refresh_rate" }],
    },
    readCommand: { namespace: "system", key: "peak_refresh_rate" },
    enableCommand: "settings put system peak_refresh_rate 120 && settings put system min_refresh_rate 120",
    disableCommand: "settings put system peak_refresh_rate 60 && settings put system min_refresh_rate 60",
    fallbackEnableCommands: [
      "settings put system screen_refresh_rate 120 && settings put system user_refresh_rate 120",
    ],
    fallbackDisableCommands: [
      "settings put system screen_refresh_rate 60 && settings put system user_refresh_rate 60",
    ],
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
    detectStrategy: {
      settingsKeys: [{ namespace: "system", key: "reading_mode_status" }],
    },
    readCommand: { namespace: "system", key: "reading_mode_status" },
    enableCommand: "settings put system reading_mode_status 1",
    disableCommand: "settings put system reading_mode_status 0",
    fallbackEnableCommands: [
      "settings put secure night_display_activated 1",
      "settings put system eye_care_mode 1",
    ],
    fallbackDisableCommands: [
      "settings put secure night_display_activated 0",
      "settings put system eye_care_mode 0",
    ],
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
    id: "dark_mode",
    title: "Bật Dark Mode toàn hệ thống",
    description:
      "Kích hoạt chế độ tối trên toàn bộ giao diện hệ thống và ứng dụng hỗ trợ.",
    category: "display",
    risk: "SAFE",
    detectStrategy: {
      minSdk: 29,
    },
    readCommand: { namespace: "secure", key: "ui_night_mode" },
    enableCommand: "settings put secure ui_night_mode 2",
    disableCommand: "settings put secure ui_night_mode 1",
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
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
    },
    readCommand: { namespace: "global", key: "dynamic_resolution_switch" },
    enableCommand: "settings put global dynamic_resolution_switch 0",
    disableCommand: "settings put global dynamic_resolution_switch 1",
    defaultValue: "1",
    activeValues: ["0"],
  },

  // ═══════════════════════════════════════════════════════════
  // 2. CỬ CHỈ & ĐIỀU HƯỚNG
  // ═══════════════════════════════════════════════════════════
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
    readCommand: { namespace: "global", key: "hide_gesture_line" },
    enableCommand: "settings put global hide_gesture_line 1",
    disableCommand: "settings put global hide_gesture_line 0",
    fallbackEnableCommands: [
      "settings put global policy_control immersive.full=*",
      "settings put secure navigation_bar_visible 0",
    ],
    fallbackDisableCommands: [
      "settings put global policy_control null",
      "settings put secure navigation_bar_visible 1",
    ],
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
    readCommand: { namespace: "secure", key: "show_ime_with_hard_keyboard" },
    enableCommand: "settings put secure show_ime_with_hard_keyboard 0 && settings put secure show_keyboard_shortcuts_helper 0",
    disableCommand: "settings put secure show_ime_with_hard_keyboard 1 && settings put secure show_keyboard_shortcuts_helper 1",
    fallbackEnableCommands: [
      "settings put system keyboard_shortcuts_disabled 1",
    ],
    fallbackDisableCommands: [
      "settings put system keyboard_shortcuts_disabled 0",
    ],
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
    detectStrategy: {
      minSdk: 28,
    },
    readCommand: { namespace: "secure", key: "long_press_timeout" },
    enableCommand: "settings put secure long_press_timeout 200",
    disableCommand: "settings put secure long_press_timeout 500",
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
    detectStrategy: {
      minSdk: 21,
    },
    readCommand: { namespace: "global", key: "policy_control" },
    enableCommand: "settings put global policy_control immersive.full=*",
    disableCommand: "settings put global policy_control null",
    defaultValue: "null",
    activeValues: ["immersive.full=*"],
  },

  // ═══════════════════════════════════════════════════════════
  // 3. LAUNCHER & ĐA NHIỆM
  // ═══════════════════════════════════════════════════════════
  {
    id: "recent_apps_blur",
    title: "Làm mờ ứng dụng trong Đa nhiệm",
    description:
      "Tự động làm mờ nội dung preview các ứng dụng trong màn hình đa nhiệm để bảo mật thông tin.",
    category: "launcher",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
    },
    readCommand: { namespace: "secure", key: "recents_blur" },
    enableCommand: "settings put secure recents_blur 1",
    disableCommand: "settings put secure recents_blur 0",
    fallbackEnableCommands: [
      "settings put secure recents_thumbnail_blur 1",
      "settings put system enable_recents_blur 1",
    ],
    fallbackDisableCommands: [
      "settings put secure recents_thumbnail_blur 0",
      "settings put system enable_recents_blur 0",
    ],
    defaultValue: "0",
    activeValues: ["1"],
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
    readCommand: { namespace: "global", key: "meminfo_show_swap" },
    enableCommand: "settings put global meminfo_show_swap 1",
    disableCommand: "settings put global meminfo_show_swap 0",
    fallbackEnableCommands: [
      "settings put global show_memory_in_recents 1",
      "settings put system recents_show_memory_info 1",
    ],
    fallbackDisableCommands: [
      "settings put global show_memory_in_recents 0",
      "settings put system recents_show_memory_info 0",
    ],
    defaultValue: "0",
    activeValues: ["1"],
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
    readCommand: { namespace: "secure", key: "miui_optimization" },
    enableCommand: "settings put secure miui_optimization 0 && settings put global miui_optimization 0",
    disableCommand: "settings put secure miui_optimization 1 && settings put global miui_optimization 1",
    fallbackEnableCommands: [
      "settings put global package_verifier_enable 0 && settings put global verifier_verify_adb_installs 0",
    ],
    fallbackDisableCommands: [
      "settings put global package_verifier_enable 1 && settings put global verifier_verify_adb_installs 1",
    ],
    defaultValue: "1",
    activeValues: ["0"],
  },
  {
    id: "task_stack_ios",
    title: "Xếp chồng đa nhiệm giống iOS",
    description:
      "Chuyển đổi giao diện màn hình Đa nhiệm sang dạng xếp chồng (Stack style) như iOS.",
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

  // ═══════════════════════════════════════════════════════════
  // 4. ÂM THANH & RUNG
  // ═══════════════════════════════════════════════════════════
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
    enableCommand: "settings put system haptic_feedback_enabled 1 && settings put system haptic_on_touch 1",
    disableCommand: "settings put system haptic_feedback_enabled 0 && settings put system haptic_on_touch 0",
    fallbackEnableCommands: [
      "settings put system miui_haptic_enabled 1 && settings put system vibrate_on_touch_intensity 3",
    ],
    fallbackDisableCommands: [
      "settings put system miui_haptic_enabled 0 && settings put system vibrate_on_touch_intensity 0",
    ],
    defaultValue: "1",
    activeValues: ["1"],
  },

  // ═══════════════════════════════════════════════════════════
  // 5. GAME & HIỆU NĂNG
  // ═══════════════════════════════════════════════════════════
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
    enableCommand: "settings put secure game_booster_toolbox 1 && am start -n com.xiaomi.gaming/.ui.GameTurboActivity",
    disableCommand: "settings put secure game_booster_toolbox 0 && am force-stop com.xiaomi.gaming",
    defaultValue: "1",
    activeValues: ["1"],
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
    readCommand: { namespace: "global", key: "power_mode" },
    enableCommand: "settings put global power_mode 2",
    disableCommand: "settings put global power_mode 0",
    fallbackEnableCommands: [
      "settings put system high_performance_mode 1 && settings put global game_turbo_mode 1",
      "cmd power set-mode 2",
    ],
    fallbackDisableCommands: [
      "settings put system high_performance_mode 0 && settings put global game_turbo_mode 0",
      "cmd power set-mode 0",
    ],
    defaultValue: "0",
    activeValues: ["2"],
  },

  // ═══════════════════════════════════════════════════════════
  // 6. CHẶN QUẢNG CÁO & GỢI Ý
  // ═══════════════════════════════════════════════════════════
  {
    id: "disable_personalized_ads",
    title: "Vô hiệu hóa quảng cáo cá nhân (MSA)",
    description:
      "Tắt thuật toán thu thập hành vi người dùng để phân phối quảng cáo mục tiêu trên toàn hệ thống Xiaomi.",
    category: "ads",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
    },
    readCommand: { namespace: "global", key: "miui_personalized_ads_enable" },
    enableCommand: "pm uninstall -k --user 0 com.miui.systemAdSolution",
    disableCommand: "pm install-existing --user 0 com.miui.systemAdSolution",
    fallbackEnableCommands: [
      "pm uninstall -k --user 0 com.xiaomi.miuiad",
      "pm disable-user --user 0 com.miui.systemAdSolution",
    ],
    fallbackDisableCommands: [
      "pm install-existing --user 0 com.xiaomi.miuiad",
      "pm enable com.miui.systemAdSolution",
    ],
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
    enableCommand: "pm uninstall -k --user 0 com.miui.cleanmaster && pm uninstall -k --user 0 com.miui.powerkeeper && pm uninstall -k --user 0 com.miui.translation.kingsoft && pm uninstall -k --user 0 com.xiaomi.mipicks && pm uninstall -k --user 0 com.xiaomi.miuiad",
    disableCommand: "pm install-existing --user 0 com.miui.cleanmaster && pm install-existing --user 0 com.miui.powerkeeper && pm install-existing --user 0 com.miui.translation.kingsoft && pm install-existing --user 0 com.xiaomi.mipicks && pm install-existing --user 0 com.xiaomi.miuiad",
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
    enableCommand: "pm disable-user --user 0 com.miui.daemon",
    disableCommand: "pm enable com.miui.daemon",
    fallbackEnableCommands: [
      "pm disable-user --user 0 com.xiaomi.analytics",
      "pm disable-user --user 0 com.miui.analytics",
      "pm uninstall -k --user 0 com.miui.daemon",
    ],
    fallbackDisableCommands: [
      "pm enable com.xiaomi.analytics",
      "pm enable com.miui.analytics",
      "pm install-existing --user 0 com.miui.daemon",
    ],
    defaultValue: "1",
    activeValues: ["0"],
  },

  // ═══════════════════════════════════════════════════════════
  // 7. TIỆN ÍCH BỔ SUNG
  // ═══════════════════════════════════════════════════════════
  {
    id: "hide_bg_notification",
    title: "Ẩn thông báo \"Ứng dụng đang chạy ngầm\"",
    description:
      "Ẩn cảnh báo hệ thống về ứng dụng chạy ngầm, giúp thanh thông báo sạch sẽ hơn.",
    category: "utility",
    risk: "SAFE",
    detectStrategy: {
      minSdk: 26,
    },
    readCommand: { namespace: "secure", key: "show_notification_channel_warning" },
    enableCommand: "settings put secure show_notification_channel_warning 0",
    disableCommand: "settings put secure show_notification_channel_warning 1",
    defaultValue: "1",
    activeValues: ["0"],
  },
];
