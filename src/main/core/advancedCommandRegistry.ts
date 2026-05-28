import { RiskLevel, CommandMode } from './adbSafety'

export interface AdvancedCommandDefinition {
  id: string
  title: string
  description: string
  category: 'diagnostics' | 'appops' | 'permissions' | 'settings' | 'components' | 'network'
  risk: RiskLevel
  mode: CommandMode
  readTemplate?: string
  applyTemplate?: string
  rollbackTemplate?: string
  needsConfirmText?: string
}

export const ADVANCED_COMMANDS: AdvancedCommandDefinition[] = [
  // ── DIAGNOSTICS (READ ONLY) ───────────────────────────────────────────────
  {
    id: 'diag_battery',
    title: 'Thông tin pin chi tiết',
    description: 'Chẩn đoán sức khỏe pin, dung lượng hiện tại, nhiệt độ và dòng sạc qua dumpsys battery.',
    category: 'diagnostics',
    risk: 'SAFE',
    mode: 'READ_ONLY',
    readTemplate: 'dumpsys battery'
  },
  {
    id: 'diag_power',
    title: 'Thông tin nguồn & thời lượng pin',
    description: 'Xem trạng thái WakeLocks, độ sáng màn hình hiện tại và các yếu tố tiêu thụ điện năng.',
    category: 'diagnostics',
    risk: 'SAFE',
    mode: 'READ_ONLY',
    readTemplate: 'dumpsys power'
  },
  {
    id: 'diag_activity_top',
    title: 'Lấy hoạt cảnh hiển thị (Top Activity)',
    description: 'Xác định nhanh ứng dụng và activity đang chạy trên màn hình hiện tại.',
    category: 'diagnostics',
    risk: 'SAFE',
    mode: 'READ_ONLY',
    readTemplate: 'dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity"'
  },
  {
    id: 'diag_package_info',
    title: 'Tra cứu thông tin ứng dụng',
    description: 'Xem chi tiết đường dẫn cài đặt, phiên bản, quyền hạn và chữ ký số của gói ứng dụng.',
    category: 'diagnostics',
    risk: 'SAFE',
    mode: 'READ_ONLY',
    readTemplate: 'dumpsys package {package}'
  },

  // ── APPOPS MANAGER ────────────────────────────────────────────────────────
  {
    id: 'appops_get',
    title: 'Xem toàn bộ AppOps của ứng dụng',
    description: 'Đọc chi tiết các quyền can thiệp ẩn của gói ứng dụng được chọn.',
    category: 'appops',
    risk: 'SAFE',
    mode: 'READ_ONLY',
    readTemplate: 'appops get {package}'
  },
  {
    id: 'appops_run_background',
    title: 'Bật/Tắt chạy ngầm (RUN_IN_BACKGROUND)',
    description: 'Kiểm soát khả năng hoạt động ngầm của ứng dụng để tiết kiệm pin.',
    category: 'appops',
    risk: 'MEDIUM',
    mode: 'PACKAGE_OP',
    readTemplate: 'appops get {package} RUN_IN_BACKGROUND',
    applyTemplate: 'appops set {package} RUN_IN_BACKGROUND {value}',
    rollbackTemplate: 'appops set {package} RUN_IN_BACKGROUND allow',
    needsConfirmText: 'Thao tác chặn chạy ngầm có thể khiến ứng dụng không nhận được thông báo kịp thời.'
  },
  {
    id: 'appops_wake_lock',
    title: 'Chặn WakeLock (WAKE_LOCK)',
    description: 'Chặn ứng dụng tự động đánh thức màn hình hoặc giữ thiết bị hoạt động ở chế độ chờ.',
    category: 'appops',
    risk: 'RISKY',
    mode: 'PACKAGE_OP',
    readTemplate: 'appops get {package} WAKE_LOCK',
    applyTemplate: 'appops set {package} WAKE_LOCK {value}',
    rollbackTemplate: 'appops set {package} WAKE_LOCK allow',
    needsConfirmText: 'Chặn WakeLock có thể gây ngắt quãng hoặc lỗi chạy ngầm của các ứng dụng nghe nhạc/GPS.'
  },
  {
    id: 'appops_draw_overlay',
    title: 'Quyền hiển thị trên ứng dụng khác',
    description: 'Bật/Tắt trực tiếp quyền hiển thị cửa sổ nổi (SYSTEM_ALERT_WINDOW) của ứng dụng.',
    category: 'appops',
    risk: 'RISKY',
    mode: 'PACKAGE_OP',
    readTemplate: 'appops get {package} SYSTEM_ALERT_WINDOW',
    applyTemplate: 'appops set {package} SYSTEM_ALERT_WINDOW {value}',
    rollbackTemplate: 'appops set {package} SYSTEM_ALERT_WINDOW allow'
  },

  // ── PERMISSIONS MANAGER ───────────────────────────────────────────────────
  {
    id: 'perm_grant_runtime',
    title: 'Cấp quyền Runtime nâng cao',
    description: 'Ép buộc cấp quyền chạy (như đọc ảnh, định vị, máy ảnh...) mà không cần hỏi trên màn hình.',
    category: 'permissions',
    risk: 'MEDIUM',
    mode: 'PACKAGE_OP',
    applyTemplate: 'pm grant {package} {permission}',
    rollbackTemplate: 'pm revoke {package} {permission}'
  },
  {
    id: 'perm_revoke_runtime',
    title: 'Thu hồi quyền Runtime nâng cao',
    description: 'Thu hồi quyền của một ứng dụng lập tức.',
    category: 'permissions',
    risk: 'MEDIUM',
    mode: 'PACKAGE_OP',
    applyTemplate: 'pm revoke {package} {permission}'
  },

  // ── SETTINGS EXPLORER ─────────────────────────────────────────────────────
  {
    id: 'setting_process_limit',
    title: 'Giới hạn tiến trình nền (Background Process Limit)',
    description: 'Cấu hình tối đa số lượng tiến trình được chạy ngầm trong RAM (mặc định: standard).',
    category: 'settings',
    risk: 'RISKY',
    mode: 'WRITE_SETTING',
    readTemplate: 'settings get global background_process_limit',
    applyTemplate: 'settings put global background_process_limit {value}',
    rollbackTemplate: 'settings put global background_process_limit 0',
    needsConfirmText: 'Giới hạn quá nghiêm ngặt có thể làm đóng ứng dụng chạy ngầm liên tục, tốn pin khi khởi động lại.'
  },

  // ── COMPONENTS CONTROL ────────────────────────────────────────────────────
  {
    id: 'component_force_stop',
    title: 'Buộc dừng ứng dụng lập tức',
    description: 'Đóng băng và giải phóng toàn bộ RAM của ứng dụng được chọn (force-stop).',
    category: 'components',
    risk: 'MEDIUM',
    mode: 'PACKAGE_OP',
    applyTemplate: 'am force-stop {package}'
  },
  {
    id: 'component_clear_data',
    title: 'Xóa toàn bộ dữ liệu ứng dụng',
    description: 'Khôi phục ứng dụng về trạng thái mới cài đặt (Clear Data). Toàn bộ file và acc đăng nhập sẽ bị xóa.',
    category: 'components',
    risk: 'DANGEROUS',
    mode: 'PACKAGE_OP',
    applyTemplate: 'pm clear {package}',
    needsConfirmText: 'Hành động này sẽ XÓA SẠCH toàn bộ dữ liệu, tài khoản đăng nhập của ứng dụng này và không thể phục hồi!'
  },

  // ── NETWORK & DEBUG ───────────────────────────────────────────────────────
  {
    id: 'net_ip_addr',
    title: 'Xem địa chỉ IP mạng',
    description: 'Hiển thị các giao diện mạng Wi-Fi/4G và địa chỉ IP cục bộ hiện tại.',
    category: 'network',
    risk: 'SAFE',
    mode: 'READ_ONLY',
    readTemplate: 'ip addr show'
  },
  {
    id: 'net_ss_connections',
    title: 'Liệt kê các kết nối mạng hoạt động',
    description: 'Liệt kê các socket mạng đang mở hoặc đang trao đổi dữ liệu ra internet.',
    category: 'network',
    risk: 'SAFE',
    mode: 'READ_ONLY',
    readTemplate: 'netstat -anp || ss -an'
  }
]
