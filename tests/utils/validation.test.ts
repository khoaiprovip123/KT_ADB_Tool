import { describe, it, expect } from 'vitest'
import { validateDpi, validatePackageName } from '../../src/renderer/src/utils/validation'

describe('Validation Utility Tests', () => {
  describe('validateDpi', () => {
    it('should allow DPIs between 160 and 640', () => {
      expect(validateDpi(160)).toEqual({ valid: true })
      expect(validateDpi(440)).toEqual({ valid: true })
      expect(validateDpi(640)).toEqual({ valid: true })
    })

    it('should reject DPIs less than 160', () => {
      expect(validateDpi(159)).toEqual({ valid: false, error: 'DPI tối thiểu là 160' })
      expect(validateDpi(0)).toEqual({ valid: false, error: 'DPI tối thiểu là 160' })
      expect(validateDpi(-100)).toEqual({ valid: false, error: 'DPI tối thiểu là 160' })
    })

    it('should reject DPIs greater than 640', () => {
      expect(validateDpi(641)).toEqual({ valid: false, error: 'DPI tối đa là 640' })
      expect(validateDpi(1000)).toEqual({ valid: false, error: 'DPI tối đa là 640' })
    })
  })

  describe('validatePackageName', () => {
    it('should validate valid Android package names', () => {
      expect(validatePackageName('com.android.settings')).toBe(true)
      expect(validatePackageName('com.xiaomi.joyose')).toBe(true)
      expect(validatePackageName('a.b.c.d.e')).toBe(true)
      expect(validatePackageName('my.cool_package123.app')).toBe(true)
    })

    it('should invalidate incorrect package names', () => {
      expect(validatePackageName('')).toBe(false)
      expect(validatePackageName('com')).toBe(false)
      expect(validatePackageName('com.settings; rm -rf /')).toBe(false)
      expect(validatePackageName('1com.settings')).toBe(false)
      expect(validatePackageName('com..settings')).toBe(false)
    })
  })
})
