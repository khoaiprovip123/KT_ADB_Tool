import { useState } from 'react'
import { toast } from '../../../../store/toastStore'
import { AppInfo, BatchProgress, BatchResult } from '../types'
import { withRetry } from '../utils'

export function useAppActions(
  activeDevice: string | null,
  packages: AppInfo[],
  setPackages: React.Dispatch<React.SetStateAction<AppInfo[]>>,
  selectedApps: Set<string>,
  clearSelection: () => void,
  loadPackages: (forceRefresh?: boolean) => Promise<void>
) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null)
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null)

  const executeAction = async (pkg: string, action: 'uninstall' | 'disable' | 'enable' | 'clear' | 'stop' | 'restore') => {
    if (!activeDevice) return { success: false, output: 'No device connected' }
    try {
      return await withRetry(() => window.api.manageApp(activeDevice, pkg, action))
    } catch (err: any) {
      return { success: false, output: err.message }
    }
  }

  const handleSingleAction = async (app: AppInfo, action: 'uninstall' | 'disable' | 'enable' | 'clear' | 'stop' | 'restore') => {
    if (!activeDevice) return
    const pkg = app.pkg
    
    if (action === 'uninstall' && app.type === 'system') {
      if (!window.confirm(`CẢNH BÁO: Gỡ ứng dụng hệ thống (${pkg}) có thể gây lỗi treo logo (bootloop). Bạn vẫn muốn tiếp tục?`)) return
    }

    setActionLoading(`${action}-${pkg}`)
    try {
      const res = await withRetry(() => window.api.manageApp(activeDevice, pkg, action))
      if (res.success) {
        if (action === 'uninstall') setPackages(prev => prev.filter(p => p.pkg !== pkg))
        else if (action === 'disable') setPackages(prev => prev.map(p => p.pkg === pkg ? { ...p, status: 'disabled' } : p))
        else if (action === 'enable' || action === 'restore') setPackages(prev => prev.map(p => p.pkg === pkg ? { ...p, status: 'enabled' } : p))
        
        let undoAction: any = undefined
        if (action === 'disable') {
          undoAction = { label: 'Hoàn tác', onClick: () => handleSingleAction(app, 'enable') }
        } else if (action === 'enable') {
          undoAction = { label: 'Hoàn tác', onClick: () => handleSingleAction(app, 'disable') }
        }

        toast.success(`Thành công: ${pkg}`, 5000, undoAction)
      } else if (!res.success) {
        toast.error(`Lỗi: ${res.output}`)
      }
    } catch (err: any) {
      toast.error(`Lỗi hệ thống: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleExtract = async (pkg: string) => {
    if (!activeDevice) return
    try {
      const fileName = `${pkg}.apk`
      const destPath = await window.api.saveFileDialog(fileName)
      if (!destPath) return

      setActionLoading(`extract-${pkg}`)
      const success = await withRetry(() => window.api.extractApp(activeDevice, pkg, destPath))
      if (success) toast.success(`Đã lưu: ${destPath}`)
      else toast.error('Trích xuất thất bại!')
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleInstallApk = async () => {
    if (!activeDevice) return
    try {
      const apkPath = await window.api.openApkDialog()
      if (!apkPath) return
      setActionLoading('installing-apk')
      const success = await withRetry(() => window.api.installApk(activeDevice, apkPath))
      if (success) {
        toast.success('Cài đặt thành công!')
        setTimeout(() => loadPackages(true), 2000)
      } else toast.error('Cài đặt thất bại!')
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleBatchAction = async (action: 'uninstall' | 'disable' | 'enable' | 'clear' | 'stop' | 'restore', explicitApps?: string[]) => {
    const appsList = explicitApps || Array.from(selectedApps)
    if (appsList.length === 0) return
    const appsToProcessObj = packages.filter(p => appsList.includes(p.pkg))
    
    if (!explicitApps) { // Chỉ hỏi xác nhận nếu không phải là undo (explicitApps === undefined)
      if (action === 'uninstall' || action === 'disable') {
        const hasSystem = appsToProcessObj.some(a => a.type === 'system')
        if (hasSystem) {
          if (!window.confirm(`CẢNH BÁO: Bạn đang thao tác trên app hệ thống. Tiếp tục?`)) return
        } else {
          if (!window.confirm(`Thực hiện trên ${appsList.length} ứng dụng?`)) return
        }
      }
    }

    const appsToProcess = appsList
    setBatchProgress({ current: 0, total: appsToProcess.length, action })
    let successCount = 0, failCount = 0, lastError = ''
    let removedPkgs: string[] = [], modifiedPkgs: {pkg: string, status: 'enabled'|'disabled'}[] = []

    for (let i = 0; i < appsToProcess.length; i++) {
      const pkg = appsToProcess[i]
      setBatchProgress({ current: i + 1, total: appsToProcess.length, action })
      const res = await executeAction(pkg, action)
      if (res.success) {
        successCount++
        if (action === 'uninstall') removedPkgs.push(pkg)
        else if (action === 'disable') modifiedPkgs.push({pkg, status: 'disabled'})
        else if (action === 'enable' || action === 'restore') modifiedPkgs.push({pkg, status: 'enabled'})
      } else {
        failCount++, lastError = res.output
      }
    }

    setPackages(prev => {
      let next = prev
      if (removedPkgs.length > 0) next = next.filter(p => !removedPkgs.includes(p.pkg))
      if (modifiedPkgs.length > 0) {
        next = next.map(p => {
          const mod = modifiedPkgs.find(m => m.pkg === p.pkg)
          return mod ? { ...p, status: mod.status } : p
        })
      }
      return next
    })
    
    setBatchProgress(null)
    clearSelection()
    setBatchResult({ success: successCount, fail: failCount, skipped: 0, lastError, action })
    
    // Undo Toast
    if (successCount > 0) {
      let undoAction: any = undefined
      if (action === 'disable') {
        undoAction = { label: 'Hoàn tác', onClick: () => handleBatchAction('enable', appsToProcess) }
      } else if (action === 'enable') {
        undoAction = { label: 'Hoàn tác', onClick: () => handleBatchAction('disable', appsToProcess) }
      }

      if (undoAction) {
        toast.success(`Đã xử lý ${successCount} ứng dụng`, 5000, undoAction)
      }
    }
  }

  return {
    actionLoading,
    batchProgress,
    batchResult,
    setBatchResult,
    handleSingleAction,
    handleExtract,
    handleInstallApk,
    handleBatchAction
  }
}
