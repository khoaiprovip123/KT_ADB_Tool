import { runAdbCommand } from './adbService'
import { ADVANCED_COMMANDS } from './advancedCommandRegistry'
import { evaluateCommand, buildShellCommand } from './adbSafety'

export class AdvancedAdbService {
  /**
   * Đọc danh sách thuộc tính getprop và trả về mảng key-value
   */
  async getProps(deviceId: string): Promise<Array<{ key: string; value: string }>> {
    try {
      const output = await runAdbCommand(deviceId, 'getprop', () => {})
      const lines = output.split('\n')
      const result: Array<{ key: string; value: string }> = []

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        
        // Định dạng getprop: [ro.product.model]: [Redmi Note 12]
        const match = trimmed.match(/^\[([^\]]+)\]:\s*\[([^\]]*)\]$/)
        if (match) {
          result.push({
            key: match[1],
            value: match[2]
          })
        }
      }
      return result
    } catch (error) {
      console.error('Lỗi khi đọc getprop:', error)
      return []
    }
  }

  /**
   * Đọc danh sách settings của một namespace
   */
  async getSettingsList(deviceId: string, namespace: string): Promise<Array<{ key: string; value: string }>> {
    if (!['global', 'system', 'secure'].includes(namespace)) {
      throw new Error(`Namespace không hợp lệ: ${namespace}`)
    }

    try {
      const output = await runAdbCommand(deviceId, `settings list ${namespace}`, () => {})
      const lines = output.split('\n')
      const result: Array<{ key: string; value: string }> = []

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        const eqIdx = trimmed.indexOf('=')
        if (eqIdx !== -1) {
          result.push({
            key: trimmed.slice(0, eqIdx),
            value: trimmed.slice(eqIdx + 1)
          })
        } else {
          result.push({
            key: trimmed,
            value: ''
          })
        }
      }
      return result
    } catch (error) {
      console.error(`Lỗi khi đọc settings list ${namespace}:`, error)
      return []
    }
  }

  /**
   * Đọc dumpsys dịch vụ cụ thể
   */
  async getDumpsys(deviceId: string, service: string): Promise<string> {
    const cleanService = service.trim().toLowerCase()
    // Giới hạn chỉ cho phép các dumpsys an toàn để tránh quá tải
    const allowedDumpsys = ['battery', 'power', 'display', 'window', 'wifi', 'activity']
    
    // Nếu dumpsys có chứa tham số package
    let isAllowed = false
    for (const allowed of allowedDumpsys) {
      if (cleanService.startsWith(allowed)) {
        isAllowed = true
        break
      }
    }

    if (!isAllowed) {
      throw new Error(`Dịch vụ dumpsys không được hỗ trợ hoặc không an toàn: ${service}`)
    }

    return await runAdbCommand(deviceId, `dumpsys ${service}`, () => {})
  }

  /**
   * Thực thi một preset command trong Registry với các tham số tương ứng
   */
  async executePresetCommand(
    deviceId: string,
    commandId: string,
    params: Record<string, string | number>
  ): Promise<{ success: boolean; output: string }> {
    const definition = ADVANCED_COMMANDS.find((c) => c.id === commandId)
    if (!definition) {
      return { success: false, output: `Không tìm thấy lệnh có ID: ${commandId}` }
    }

    const template = definition.applyTemplate || definition.readTemplate
    if (!template) {
      return { success: false, output: `Lệnh ${commandId} không có template thực thi.` }
    }

    try {
      // 1. Dựng câu lệnh shell an toàn từ template và tham số hóa
      const shellCmd = buildShellCommand(template, params)

      // 2. Đánh giá tính an toàn của câu lệnh trước khi chạy
      const safetyCheck = evaluateCommand(shellCmd)
      if (!safetyCheck.allowed) {
        return {
          success: false,
          output: `[BLOCKED BY SAFETY LAYER] Lệnh bị chặn vì lý do bảo mật: ${safetyCheck.reason || 'Không an toàn'}`
        }
      }

      // 3. Thực thi câu lệnh
      const output = await runAdbCommand(deviceId, shellCmd, () => {})
      return { success: true, output }
    } catch (error: any) {
      return { success: false, output: error.message || 'Lỗi không xác định khi chạy lệnh preset.' }
    }
  }

  /**
   * Thực thi câu lệnh thô (Raw ADB Shell) trong tab Power User
   */
  async executeRawShell(deviceId: string, command: string): Promise<{ success: boolean; output: string }> {
    const trimmed = command.trim()
    
    // Ngăn chặn các câu lệnh cực kỳ nguy hiểm có thể phá hủy thiết bị
    if (
      trimmed.includes('rm -rf /') &&
      !trimmed.includes('rm -rf /sdcard') &&
      !trimmed.includes('rm -rf /storage') &&
      !trimmed.includes('rm -rf /data/local/tmp')
    ) {
      return {
        success: false,
        output: '[BLOCKED] Cấm xóa phân vùng hệ thống root.'
      }
    }

    if (trimmed.includes('dd if=') || trimmed.includes('mkfs') || trimmed.includes('reboot edl')) {
      return {
        success: false,
        output: '[BLOCKED] Cấm ghi đè phân vùng thô (dd/mkfs) hoặc nạp chế độ EDL nguy hiểm.'
      }
    }

    try {
      // Đánh giá tính an toàn
      const safetyCheck = evaluateCommand(trimmed)
      if (!safetyCheck.allowed) {
        return {
          success: false,
          output: `[BLOCKED BY SAFETY LAYER] ${safetyCheck.reason || 'Lệnh không an toàn.'}`
        }
      }

      const output = await runAdbCommand(deviceId, trimmed, () => {})
      return { success: true, output }
    } catch (error: any) {
      return { success: false, output: error.message || 'Lỗi khi thực thi lệnh thô.' }
    }
  }
}

export const advancedAdbService = new AdvancedAdbService()
