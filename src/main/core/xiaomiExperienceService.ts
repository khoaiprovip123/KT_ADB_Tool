import { XIAOMI_EXPERIENCE_ITEMS, XiaomiExperienceItem } from './xiaomiExperienceRegistry'
import { getDeviceProfile, getInstalledPackageSet, readSettingsSnapshot, CapabilityState } from './deviceProfileService'
import { runAdbCommand } from './adbService'

export interface ExperienceItemStatus {
  item: XiaomiExperienceItem
  status: CapabilityState
  currentValue?: string
}

/**
 * Đọc trạng thái chi tiết của từng tùy chọn Trải nghiệm người dùng
 */
export async function getExperienceCapabilities(deviceId: string): Promise<ExperienceItemStatus[]> {
  try {
    const profile = await getDeviceProfile(deviceId)
    const installedPkgs = await getInstalledPackageSet(deviceId)

    // Đọc settings snapshot để tìm kiếm key nhanh hơn
    const globalSettings = await readSettingsSnapshot(deviceId, 'global')
    const secureSettings = await readSettingsSnapshot(deviceId, 'secure')
    const systemSettings = await readSettingsSnapshot(deviceId, 'system')

    const result: ExperienceItemStatus[] = []

    for (const item of XIAOMI_EXPERIENCE_ITEMS) {
      const { brand, minSdk, packages } = item.detectStrategy

      // 1. Kiểm tra Brand
      if (brand && brand.length > 0) {
        const brandMatch = brand.some((b) => profile.brand.toUpperCase().includes(b.toUpperCase()))
        if (!brandMatch) {
          result.push({ item, status: 'UNSUPPORTED' })
          continue
        }
      }

      // 2. Kiểm tra Min SDK
      if (minSdk && profile.sdk < minSdk) {
        result.push({ item, status: 'UNSUPPORTED' })
        continue
      }

      // 3. Kiểm tra Packages yêu cầu
      if (packages && packages.length > 0) {
        const pkgsInstalled = packages.every((pkg) => installedPkgs.has(pkg))
        if (!pkgsInstalled) {
          result.push({ item, status: 'UNSUPPORTED' })
          continue
        }
      }

      // 4. Đọc giá trị hiện tại
      const readCmd = item.readCommand
      const snapshot =
        readCmd.namespace === 'global'
          ? globalSettings
          : readCmd.namespace === 'secure'
          ? secureSettings
          : systemSettings

      const currentValue = snapshot[readCmd.key]

      if (currentValue === undefined) {
        // Thay vì trả về UNKNOWN khi key chưa khởi tạo, mặc định coi là SUPPORTED_OFF với defaultValue
        result.push({
          item,
          status: 'SUPPORTED_OFF',
          currentValue: item.defaultValue
        })
      } else {
        const isEnabled = item.activeValues
          ? item.activeValues.includes(currentValue)
          : currentValue === '1' || currentValue === '120'
        result.push({
          item,
          status: isEnabled ? 'SUPPORTED_ON' : 'SUPPORTED_OFF',
          currentValue
        })
      }
    }

    return result
  } catch (error) {
    console.error('Failed to get experience capabilities:', error)
    return XIAOMI_EXPERIENCE_ITEMS.map((item) => ({ item, status: 'ERROR' }))
  }
}

/**
 * Đọc giá trị hiện tại của một item cụ thể
 */
export async function readExperienceItem(deviceId: string, itemId: string): Promise<string> {
  const item = XIAOMI_EXPERIENCE_ITEMS.find((i) => i.id === itemId)
  if (!item) throw new Error(`Không tìm thấy item tùy chỉnh với ID: ${itemId}`)

  const cmd = `settings get ${item.readCommand.namespace} ${item.readCommand.key}`
  const res = await runAdbCommand(deviceId, cmd, () => {})
  return res.trim()
}

/**
 * Áp dụng cấu hình bật/tắt cho item tùy biến trải nghiệm
 */
export async function applyExperienceItem(
  deviceId: string,
  itemId: string,
  enable: boolean
): Promise<{ success: boolean; output: string }> {
  const item = XIAOMI_EXPERIENCE_ITEMS.find((i) => i.id === itemId)
  if (!item) throw new Error(`Không tìm thấy item tùy chỉnh với ID: ${itemId}`)

  const cmd = enable ? item.enableCommand : item.disableCommand
  const output = await runAdbCommand(deviceId, cmd, () => {})
  const success = !output.toLowerCase().includes('failed') && !output.toLowerCase().includes('error')

  return { success, output: output.trim() }
}

/**
 * Khôi phục cấu hình mặc định (Rollback) của tùy chỉnh
 */
export async function rollbackExperienceItem(
  deviceId: string,
  itemId: string
): Promise<{ success: boolean; output: string }> {
  const item = XIAOMI_EXPERIENCE_ITEMS.find((i) => i.id === itemId)
  if (!item) throw new Error(`Không tìm thấy item tùy chỉnh với ID: ${itemId}`)

  const cmd = `settings put ${item.readCommand.namespace} ${item.readCommand.key} ${item.defaultValue}`
  const output = await runAdbCommand(deviceId, cmd, () => {})
  const success = !output.toLowerCase().includes('failed') && !output.toLowerCase().includes('error')

  return { success, output: output.trim() }
}
