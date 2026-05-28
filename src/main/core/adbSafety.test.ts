import { describe, it, expect } from 'vitest'
import {
  validatePackageName,
  validateSettingsKey,
  validateRemotePath,
  evaluateCommand,
  buildShellCommand
} from './adbSafety'

describe('ADB Safety Layer Tests', () => {
  describe('validatePackageName', () => {
    it('should validate correct package names', () => {
      expect(validatePackageName('com.android.settings')).toBe(true)
      expect(validatePackageName('com.example.my_app123')).toBe(true)
      expect(validatePackageName('a.b.c')).toBe(true)
    })

    it('should invalidate incorrect package names', () => {
      expect(validatePackageName('')).toBe(false)
      expect(validatePackageName('com')).toBe(false) // must have at least one dot
      expect(validatePackageName('com.settings; rm -rf /')).toBe(false) // space & semicolon
      expect(validatePackageName('1com.settings')).toBe(false) // starts with number
      expect(validatePackageName('a'.repeat(130))).toBe(false) // too long
    })
  })

  describe('validateSettingsKey', () => {
    it('should validate correct settings keys', () => {
      expect(validateSettingsKey('window_animation_scale')).toBe(true)
      expect(validateSettingsKey('pointer_speed')).toBe(true)
      expect(validateSettingsKey('development_settings_enabled')).toBe(true)
    })

    it('should invalidate incorrect settings keys', () => {
      expect(validateSettingsKey('')).toBe(false)
      expect(validateSettingsKey('pointer speed')).toBe(false) // contains space
      expect(validateSettingsKey('key; reboot')).toBe(false) // command injection attempt
      expect(validateSettingsKey('a'.repeat(130))).toBe(false) // too long
    })
  })

  describe('validateRemotePath', () => {
    it('should validate safe remote paths', () => {
      expect(validateRemotePath('/sdcard/Download/test.apk')).toBe(true)
      expect(validateRemotePath('/storage/emulated/0/DCIM')).toBe(true)
      expect(validateRemotePath('/data/local/tmp/app.apk')).toBe(true)
    })

    it('should invalidate unsafe remote paths', () => {
      expect(validateRemotePath('')).toBe(false)
      expect(validateRemotePath('/sdcard/Download/../../etc/passwd')).toBe(false) // path traversal
      expect(validateRemotePath('/sdcard/Download/file.txt; rm -rf /')).toBe(false) // command injection
      expect(validateRemotePath('/sdcard/`id`')).toBe(false) // backticks
      expect(validateRemotePath('/a'.repeat(520))).toBe(false) // too long
    })
  })

  describe('evaluateCommand', () => {
    it('should properly evaluate empty commands', () => {
      const res = evaluateCommand('')
      expect(res.allowed).toBe(false)
      expect(res.reason).toContain('Lệnh rỗng')
    })

    it('should evaluate reboot commands', () => {
      const res = evaluateCommand('reboot')
      expect(res.allowed).toBe(true)
      expect(res.risk).toBe('MEDIUM')
      expect(res.mode).toBe('REBOOT_OP')
    })

    it('should evaluate settings put commands', () => {
      // safe setting
      const res1 = evaluateCommand('settings put system pointer_speed 0')
      expect(res1.allowed).toBe(true)
      expect(res1.risk).toBe('SAFE')
      expect(res1.mode).toBe('WRITE_SETTING')

      // risky setting
      const res2 = evaluateCommand('settings put global background_process_limit 2')
      expect(res2.allowed).toBe(true)
      expect(res2.risk).toBe('RISKY')
      expect(res2.mode).toBe('WRITE_SETTING')

      // invalid setting namespace
      const res3 = evaluateCommand('settings put invalid_ns key val')
      expect(res3.allowed).toBe(false)
      expect(res3.risk).toBe('DANGEROUS')

      // command injection settings key
      const res4 = evaluateCommand('settings put system key;reboot val')
      expect(res4.allowed).toBe(false)
      expect(res4.risk).toBe('DANGEROUS')
    })

    it('should evaluate settings get commands', () => {
      const res = evaluateCommand('settings get global adb_enabled')
      expect(res.allowed).toBe(true)
      expect(res.risk).toBe('SAFE')
      expect(res.mode).toBe('READ_ONLY')
    })

    it('should evaluate pm package commands', () => {
      // safe pm list
      const res1 = evaluateCommand('pm list packages')
      expect(res1.allowed).toBe(true)
      expect(res1.risk).toBe('SAFE')

      // uninstall package with invalid name
      const res2 = evaluateCommand('pm uninstall invalid_pkg_name;')
      expect(res2.allowed).toBe(false)
      expect(res2.risk).toBe('DANGEROUS')

      // uninstall package with valid name
      const res3 = evaluateCommand('pm uninstall com.example.app')
      expect(res3.allowed).toBe(true)
      expect(res3.risk).toBe('RISKY')
    })

    it('should evaluate file operation commands', () => {
      // dangerous root deletion
      const res1 = evaluateCommand('rm -rf /')
      expect(res1.allowed).toBe(false)
      expect(res1.risk).toBe('DANGEROUS')

      // normal deletion
      const res2 = evaluateCommand('rm -rf /sdcard/Download/temp')
      expect(res2.allowed).toBe(true)
      expect(res2.risk).toBe('RISKY')
    })
  })

  describe('buildShellCommand', () => {
    it('should build command with safe arguments', () => {
      const cmd = buildShellCommand('pm uninstall {package}', { package: 'com.example.app' })
      expect(cmd).toBe('pm uninstall com.example.app')
    })

    it('should throw error for unsafe arguments', () => {
      // unsafe package
      expect(() => buildShellCommand('pm uninstall {package}', { package: 'com.example.app; reboot' })).toThrow()
      
      // unsafe remote path
      expect(() => buildShellCommand('rm -rf {path}', { path: '/sdcard/../../etc' })).toThrow()
      
      // unsafe standard variable with dangerous chars
      expect(() => buildShellCommand('echo {val}', { val: 'hello; rm -rf /' })).toThrow()
    })
  })
})
