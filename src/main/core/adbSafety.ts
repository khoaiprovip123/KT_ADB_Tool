/**
 * ADB Safety Layer - Cung cấp cơ chế xác thực đầu vào, đánh giá rủi ro
 * và ngăn chặn tấn công Command Injection khi thực thi lệnh ADB.
 */

export type RiskLevel = 'SAFE' | 'MEDIUM' | 'RISKY' | 'DANGEROUS'

export type CommandMode =
  | 'READ_ONLY'
  | 'WRITE_SETTING'
  | 'PACKAGE_OP'
  | 'FILE_OP'
  | 'REBOOT_OP'
  | 'RAW_SHELL'

export interface EvaluationResult {
  allowed: boolean
  risk: RiskLevel
  mode: CommandMode
  reason?: string
}

// Regex kiểm tra Package Name Android (ví dụ: com.android.settings)
const PACKAGE_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/

// Regex kiểm tra Key của Android Settings (ví dụ: window_animation_scale)
const SETTINGS_KEY_REGEX = /^[a-zA-Z0-9_.-]+$/

// Danh sách các ký tự nguy hiểm cấm xuất hiện trong đường dẫn để chống chèn lệnh
const DANGEROUS_PATH_CHARS = /[;&|`$\n\r]/

/**
 * Kiểm tra tính hợp lệ của Android Package Name.
 */
export function validatePackageName(pkg: string): boolean {
  if (!pkg || pkg.length > 128) return false
  return PACKAGE_NAME_REGEX.test(pkg)
}

/**
 * Kiểm tra tính hợp lệ của Android Settings Key.
 */
export function validateSettingsKey(key: string): boolean {
  if (!key || key.length > 128) return false
  return SETTINGS_KEY_REGEX.test(key)
}

/**
 * Kiểm tra tính hợp lệ và an toàn của đường dẫn tệp tin trên thiết bị.
 * Chống Path Traversal (..) và Command Injection.
 */
export function validateRemotePath(remotePath: string): boolean {
  if (!remotePath || remotePath.length > 512) return false
  
  // Chống chèn ký tự điều khiển lệnh
  if (DANGEROUS_PATH_CHARS.test(remotePath)) return false
  
  // Chống Path Traversal quay ngược thư mục nguy hiểm
  if (remotePath.includes('..')) return false

  // Cho phép các thư mục Android an toàn hoặc cấu trúc root chuẩn
  return (
    remotePath.startsWith('/') ||
    remotePath.startsWith('/sdcard') ||
    remotePath.startsWith('/storage') ||
    remotePath.startsWith('/data/local/tmp')
  )
}

/**
 * Đánh giá mức độ rủi ro và phân loại chế độ hoạt động của một ADB command thô.
 */
export function evaluateCommand(cmd: string): EvaluationResult {
  const trimmed = cmd.trim()

  if (!trimmed) {
    return { allowed: false, risk: 'SAFE', mode: 'READ_ONLY', reason: 'Lệnh rỗng.' }
  }

  // Phát hiện và chặn chèn nhiều câu lệnh (Command Chaining / Command Injection)
  const commandInjectionRegex = /[;&|`$\n\r]/
  if (commandInjectionRegex.test(trimmed)) {
    return {
      allowed: false,
      risk: 'DANGEROUS',
      mode: 'RAW_SHELL',
      reason: 'Phát hiện ký tự nối lệnh hoặc subshell nguy hiểm (Command Injection).'
    }
  }

  // 1. Phân loại REBOOT_OP (Khởi động lại)
  if (trimmed === 'reboot' || trimmed.startsWith('reboot ')) {
    return { allowed: true, risk: 'MEDIUM', mode: 'REBOOT_OP' }
  }

  // 2. Phân loại WRITE_SETTING (Ghi đè cài đặt hệ thống)
  if (trimmed.startsWith('settings put ')) {
    const parts = trimmed.split(/\s+/)
    // settings put <namespace> <key> <value>
    if (parts.length >= 4) {
      const namespace = parts[2]
      const key = parts[3]
      
      if (!['global', 'system', 'secure'].includes(namespace)) {
        return { allowed: false, risk: 'DANGEROUS', mode: 'WRITE_SETTING', reason: `Namespace cài đặt không hợp lệ: ${namespace}` }
      }
      if (!validateSettingsKey(key)) {
        return { allowed: false, risk: 'DANGEROUS', mode: 'WRITE_SETTING', reason: `Cấu trúc cài đặt Key không an toàn: ${key}` }
      }

      // Các cài đặt hệ thống thường an toàn hoặc rủi ro trung bình
      const isRiskyKey = ['miui_optimization', 'background_process_limit'].includes(key)
      return {
        allowed: true,
        risk: isRiskyKey ? 'RISKY' : 'SAFE',
        mode: 'WRITE_SETTING'
      }
    }
    return { allowed: false, risk: 'DANGEROUS', mode: 'WRITE_SETTING', reason: 'Sai định dạng cấu hình settings put.' }
  }

  // 3. Phân loại READ_ONLY Settings (Đọc cài đặt)
  if (trimmed.startsWith('settings get ')) {
    return { allowed: true, risk: 'SAFE', mode: 'READ_ONLY' }
  }

  // 4. Phân loại PACKAGE_OP (Cài đặt, gỡ cài đặt, biên dịch ART)
  if (trimmed.startsWith('pm ') || trimmed.startsWith('cmd package ')) {
    // Chặn các tác vụ nguy hại hoặc can thiệp lõi nếu không thuộc whitelist
    if (trimmed.includes('disable-user') || trimmed.includes('uninstall')) {
      // Cần trích xuất package name để xác thực
      const parts = trimmed.split(/\s+/)
      const pkg = parts[parts.length - 1] // Thường package ở cuối cùng
      if (pkg && !validatePackageName(pkg)) {
        return { allowed: false, risk: 'DANGEROUS', mode: 'PACKAGE_OP', reason: `Tên Package không an toàn hoặc sai định dạng: ${pkg}` }
      }
      return { allowed: true, risk: 'RISKY', mode: 'PACKAGE_OP' }
    }
    
    if (trimmed.includes('compile')) {
      return { allowed: true, risk: 'MEDIUM', mode: 'PACKAGE_OP' }
    }

    return { allowed: true, risk: 'SAFE', mode: 'PACKAGE_OP' }
  }

  // 5. Phân loại FILE_OP (rm, mkdir, mv)
  if (trimmed.startsWith('rm ') || trimmed.startsWith('mkdir ') || trimmed.startsWith('mv ')) {
    if (trimmed.includes('rm -rf /') && !trimmed.includes('rm -rf /sdcard') && !trimmed.includes('rm -rf /storage')) {
      return { allowed: false, risk: 'DANGEROUS', mode: 'FILE_OP', reason: 'Cấm xóa phân vùng hệ thống root.' }
    }
    return { allowed: true, risk: 'RISKY', mode: 'FILE_OP' }
  }

  // Mặc định là RAW_SHELL (rủi ro cao nếu không nhận diện được)
  return {
    allowed: true,
    risk: 'MEDIUM',
    mode: 'RAW_SHELL'
  }
}

/**
 * Xây dựng lệnh Shell an toàn dựa trên template và tham số hóa để ngăn chặn Command Injection.
 */
export function buildShellCommand(template: string, args: Record<string, string | number>): string {
  let command = template

  for (const [key, value] of Object.entries(args)) {
    const stringVal = String(value)
    
    // Validate dữ liệu truyền vào theo từng loại khóa
    if (key.toLowerCase().includes('package') || key === 'pkg') {
      if (!validatePackageName(stringVal)) {
        throw new Error(`Đầu vào không hợp lệ cho tham số Package Name: ${stringVal}`)
      }
    } else if (key.toLowerCase().includes('path') || key === 'remote') {
      if (!validateRemotePath(stringVal)) {
        throw new Error(`Đầu vào không hợp lệ cho tham số File Path: ${stringVal}`)
      }
    } else if (key.toLowerCase().includes('key') || key === 'setting') {
      if (!validateSettingsKey(stringVal)) {
        throw new Error(`Đầu vào không hợp lệ cho tham số Settings Key: ${stringVal}`)
      }
    } else {
      // Với các tham số thông thường, lọc sạch ký tự chèn shell nguy hiểm
      if (DANGEROUS_PATH_CHARS.test(stringVal)) {
        throw new Error(`Đầu vào chứa ký tự đặc biệt nguy hiểm: ${stringVal}`)
      }
    }

    // Thay thế an toàn
    command = command.replace(new RegExp(`{${key}}`, 'g'), stringVal)
  }

  return command
}
