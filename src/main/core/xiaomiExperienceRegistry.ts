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
    title: "Ép tần số quét màn hình",
    description:
      "Ép màn hình duy trì tần số quét tối đa (60Hz / 90Hz / 120Hz / 144Hz), loại bỏ tự động tụt Hz.",
    category: "display",
    risk: "MEDIUM",
    detectStrategy: {
      settingsKeys: [{ namespace: "system", key: "peak_refresh_rate" }],
    },
    readCommand: { namespace: "system", key: "peak_refresh_rate" },
    enableCommand: "settings put system peak_refresh_rate 90 && settings put system min_refresh_rate 90",
    disableCommand: "settings put system peak_refresh_rate 60 && settings put system min_refresh_rate 60",
    fallbackEnableCommands: [
      "settings put system screen_refresh_rate 90 && settings put system user_refresh_rate 90",
    ],
    fallbackDisableCommands: [
      "settings put system screen_refresh_rate 60 && settings put system user_refresh_rate 60",
    ],
    defaultValue: "60",
    activeValues: ["120", "90", "144", "165"],
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
      minSdk: 34,
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
  {
    id: "haptic_intensity",
    title: "Cường độ rung phản hồi nâng cao (MIUI Haptics)",
    description: "Ép mức phản hồi xúc giác lên tối đa cho các tác vụ cuộn, gõ phím hệ thống.",
    category: "sound",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
      minSdk: 30,
    },
    readCommand: { namespace: "system", key: "vibrate_on_touch_intensity" },
    enableCommand: "settings put system haptic_feedback_enabled 1 && settings put system vibrate_on_touch_intensity 3",
    disableCommand: "settings put system haptic_feedback_enabled 0 && settings put system vibrate_on_touch_intensity 0",
    defaultValue: "0",
    activeValues: ["3", "2", "1"],
  },
  {
    id: "back_gesture_edge_width",
    title: "Tối ưu hóa vùng nhận diện vuốt cạnh (Cử chỉ quay lại)",
    description: "Mở rộng vùng cảm ứng hai bên mép màn hình giúp vuốt Back nhạy hơn khi dùng ốp lưng dày.",
    category: "navigation",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
      minSdk: 29,
    },
    readCommand: { namespace: "secure", key: "back_gesture_edge_width" },
    enableCommand: "settings put secure back_gesture_edge_width 60",
    disableCommand: "settings put secure back_gesture_edge_width 30",
    defaultValue: "30",
    activeValues: ["60"],
  },
  {
    id: "miui_fast_charge",
    title: "Bật tối ưu hóa sạc nhanh khi màn hình sáng (Mi Fast Charge)",
    description: "Giảm thuật toán bóp dòng sạc của Xiaomi khi người dùng vừa sạc vừa sáng màn hình đọc tin tức.",
    category: "utility",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
      minSdk: 31,
    },
    readCommand: { namespace: "global", key: "miui_fast_charge" },
    enableCommand: "settings put global miui_fast_charge 1",
    disableCommand: "settings put global miui_fast_charge 0",
    defaultValue: "0",
    activeValues: ["1"],
  },
  {
    id: "miui_memory_extension_size",
    title: "Cấu hình dung lượng RAM ảo (Memory Extension)",
    description: "Tắt RAM ảo (giá trị 0) giúp giảm chu kỳ ghi của bộ nhớ flash UFS, giảm lag giật trên các dòng chip cũ. Yêu cầu Reboot máy.",
    category: "utility",
    risk: "RISKY",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
      minSdk: 31,
    },
    readCommand: { namespace: "global", key: "miui_memory_extension_size" },
    enableCommand: "settings put global miui_memory_extension_size 4096",
    disableCommand: "settings put global miui_memory_extension_size 0",
    defaultValue: "0",
    activeValues: ["4096", "2048", "6144", "8192"],
  },
  {
    id: "app_hibernation_targets_enabled",
    title: "Vô hiệu hóa tính năng Ngủ đông ứng dụng ngầm (App Hibernation)",
    description: "Ngăn không cho hệ thống tự động thu hồi quyền và đóng băng các app ít dùng, giúp nhận thông báo Zalo/Telegram tức thì.",
    category: "utility",
    risk: "SAFE",
    detectStrategy: {
      minSdk: 31,
    },
    readCommand: { namespace: "global", key: "app_hibernation_targets_enabled" },
    enableCommand: "settings put global app_hibernation_targets_enabled 0",
    disableCommand: "settings put global app_hibernation_targets_enabled 1",
    defaultValue: "1",
    activeValues: ["0"],
  },
  {
    id: "user_experience_program",
    title: "Tắt Chương trình cải thiện trải nghiệm người dùng (User Experience)",
    description: "Ngăn chặn tiến trình ngầm thu thập log thao tác màn hình gửi về server máy chủ.",
    category: "ads",
    risk: "SAFE",
    detectStrategy: {
      minSdk: 28,
    },
    readCommand: { namespace: "global", key: "user_experience_program" },
    enableCommand: "settings put global user_experience_program 0",
    disableCommand: "settings put global user_experience_program 1",
    defaultValue: "1",
    activeValues: ["0"],
  },
  {
    id: "getapps_auto_update",
    title: "Chặn GetApps tự động tải và cập nhật ứng dụng rác",
    description: "Đặc trị cho các máy xách tay ROM gốc Trung Quốc, ngăn tự động cài đặt app rác vùng nội địa.",
    category: "ads",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
      minSdk: 30,
    },
    readCommand: { namespace: "global", key: "getapps_auto_update" },
    enableCommand: "settings put global getapps_auto_update 0",
    disableCommand: "settings put global getapps_auto_update 1",
    defaultValue: "1",
    activeValues: ["0"],
  },
  {
    id: "miui_upload_log",
    title: "Tắt dịch vụ tải lên nhật ký lỗi tự động (MiuiUploadLog)",
    description: "Tiết kiệm băng thông mạng ngầm và giảm tải CPU xử lý nén file log zip ngầm.",
    category: "ads",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
      minSdk: 29,
    },
    readCommand: { namespace: "global", key: "miui_upload_log" },
    enableCommand: "settings put global miui_upload_log 0",
    disableCommand: "settings put global miui_upload_log 1",
    defaultValue: "1",
    activeValues: ["0"],
  },
  {
    id: "dc_backlight_mode",
    title: "Kích hoạt chế độ chống nhấp nháy màn hình (DC Dimming)",
    description: "Giúp bảo vệ mắt khi sử dụng điện thoại Xiaomi màn hình OLED/AMOLED trong môi trường đêm tối thiếu sáng.",
    category: "display",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
      minSdk: 30,
    },
    readCommand: { namespace: "system", key: "dc_backlight_mode" },
    enableCommand: "settings put system dc_backlight_mode 1",
    disableCommand: "settings put system dc_backlight_mode 0",
    defaultValue: "0",
    activeValues: ["1"],
  },
  {
    id: "device_level_list",
    title: "Kích hoạt Họa tiết nâng cao hệ thống (Advanced Textures)",
    description: "Ép hệ thống nhận diện cấu hình phần cứng ở mức cao nhất để mở khóa tùy chọn 'Họa tiết nâng cao' trong cài đặt hiển thị gốc. Cần reboot để áp dụng.",
    category: "display",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
      minSdk: 31,
    },
    readCommand: { namespace: "system", key: "deviceLevelList" },
    enableCommand: "settings put system deviceLevelList v:1,c:3,g:3",
    disableCommand: "settings put system deviceLevelList null",
    defaultValue: "null",
    activeValues: ["v:1,c:3,g:3", "v:1,c:2,g:2", "v:1,c:1,g:1"],
  },
  {
    id: "control_center_blur",
    title: "Sửa lỗi Thanh Trung tâm điều khiển bị xám (Force Control Center Blur)",
    description: "Ép buộc nhân đồ họa render hiệu ứng làm mờ Gaussian (Blur) cho phông nền Control Center và thanh thông báo thay vì màu xám đục mặc định.",
    category: "display",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
      minSdk: 30,
    },
    readCommand: { namespace: "system", key: "background_blur_supported" },
    enableCommand: "settings put system background_blur_supported 1 && settings put system control_center_blur 1 && settings put global background_blur_supported 1",
    disableCommand: "settings put system background_blur_supported 0 && settings put system control_center_blur 0 && settings put global background_blur_supported 0",
    defaultValue: "0",
    activeValues: ["1"],
  },
  {
    id: "miui_blur_enable",
    title: "Bật mờ nhòe giao diện ứng dụng gần đây (Recents Thumbnail Gaussian Blur)",
    description: "Kích hoạt công cụ làm mờ cục bộ cho các cửa sổ xem trước trong trình đa nhiệm, tăng cường độ mượt khi vuốt ngang chuyển app.",
    category: "display",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
      minSdk: 30,
    },
    readCommand: { namespace: "system", key: "miui_blur_enable" },
    enableCommand: "settings put system miui_blur_enable 1 && settings put system multisp_view_blur 1",
    disableCommand: "settings put system miui_blur_enable 0 && settings put system multisp_view_blur 0",
    defaultValue: "0",
    activeValues: ["1"],
  },
  {
    id: "miui_floating_window_blur",
    title: "Ép hiệu ứng mờ nền cho Cửa sổ nổi (Floating Window Blur Fix)",
    description: "Giúp phần nền phía dưới các cửa sổ ứng dụng thu nhỏ (Freeform/Floating Window) có hiệu ứng mờ sâu, tách biệt không gian hiển thị rõ ràng hơn.",
    category: "display",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
      minSdk: 31,
    },
    readCommand: { namespace: "secure", key: "miui_floating_window_blur" },
    enableCommand: "settings put secure miui_floating_window_blur 1",
    disableCommand: "settings put secure miui_floating_window_blur 0",
    defaultValue: "0",
    activeValues: ["1"],
  },
  {
    id: "log_blur_supported",
    title: "Bật làm mờ thời gian thực khi kéo thanh trạng thái (Real-time Status Bar Blur)",
    description: "Xử lý triệt để hiện tượng mất hiệu ứng mờ nhòe khi kéo thanh thông báo trạng thái xuống ở một số bản ROM nội địa TQ bị tùy biến cắt giảm.",
    category: "display",
    risk: "SAFE",
    detectStrategy: {
      brand: ["XIAOMI", "REDMI", "POCO"],
      minSdk: 31,
    },
    readCommand: { namespace: "system", key: "log_blur_supported" },
    enableCommand: "settings put system log_blur_supported 1 && settings put system disable_html_blur 0",
    disableCommand: "settings put system log_blur_supported 0 && settings put system disable_html_blur 1",
    defaultValue: "0",
    activeValues: ["1"],
  },
];
