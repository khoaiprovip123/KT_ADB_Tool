import adb from 'adbkit'
import { ensureAdb } from './adbDownloader'
import { ensureScrcpy } from './scrcpyDownloader'
import path from 'path'
import { app } from 'electron'
import { spawn } from 'child_process'

export const adbState = {
  client: adb.createClient()
}

export async function initAdb(onProgress: (msg: string) => void) {
  try {
    const binPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'bin')
      : path.join(__dirname, '../../resources/bin')
      
    const adbExe = await ensureAdb(binPath, onProgress)
    
    // Update the client in our state object
    adbState.client = adb.createClient({ bin: adbExe })
    onProgress('ADB Client connected successfully.')

    ensureScrcpy(binPath, onProgress).catch(() => {})

    return true
  } catch (err: any) {
    onProgress(`Init failed: ${err.message}`)
    return false
  }
}

export async function getDevices() {
  try {
    const devices = await adbState.client.listDevices()
    return devices
  } catch (error) {
    console.error('Error listing devices:', error)
    return []
  }
}

export async function watchDevices(onUpdate: (devices: any[]) => void) {
  try {
    const tracker = await adbState.client.trackDevices()
    tracker.on('add', async () => {
      const devs = await getDevices()
      onUpdate(devs)
    })
    tracker.on('remove', async () => {
      const devs = await getDevices()
      onUpdate(devs)
    })
    tracker.on('end', () => console.log('Tracking ended'))
  } catch (error) {
    console.error('Error tracking devices:', error)
  }
}

// Hàm thực thi lệnh Shell bất đồng bộ và trả Stream về UI
export async function runAdbCommand(deviceId: string, command: string, onLog: (log: string) => void) {
  try {
    const shellCommand = command.startsWith('adb shell ') ? command.replace('adb shell ', '') : command;
    // Bọc qua adbkit hoặc child_process
    const stream = await adbState.client.shell(deviceId, shellCommand)
    
    // Đọc stream
    stream.on('data', (data) => {
      onLog(data.toString())
    })

    return new Promise((resolve) => {
      let output = ''
      stream.on('data', (data) => {
        const text = data.toString()
        output += text
        onLog(text)
      })
      stream.on('end', () => resolve(output))
      stream.on('error', (err) => resolve(`ERROR: ${err.message}`))
    })
  } catch (error: any) {
    onLog(`CRITICAL ERROR: ${error.message}`)
    return 'FAILED'
  }
}

// Chạy Scrcpy
export async function runScrcpy(deviceId: string, turnScreenOff: boolean, onLog: (log: string) => void) {
  try {
    const binPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'bin')
      : path.join(__dirname, '../../resources/bin')
    const scrcpyExe = path.join(binPath, 'scrcpy', 'scrcpy.exe')
    
    // Thêm --no-audio để tránh lỗi văng app khi PC không cắm loa/tai nghe (WASAPI error)
    const args = ['-s', deviceId, '--no-audio']
    if (turnScreenOff) args.push('--turn-screen-off')

    const scrcpyProcess = spawn(scrcpyExe, args)
    
    scrcpyProcess.stdout.on('data', (data) => onLog(`[Scrcpy] ${data}`))
    scrcpyProcess.stderr.on('data', (data) => onLog(`[Scrcpy Warning] ${data}`))
    scrcpyProcess.on('close', (code) => onLog(`[Scrcpy] Exited with code ${code}`))
    
    return 'STARTED'
  } catch (error: any) {
    onLog(`CRITICAL ERROR (Scrcpy): ${error.message}`)
    return 'FAILED'
  }
}

// Bật tính năng kết nối không dây
export async function connectWifi(deviceId: string, ip: string, onLog: (log: string) => void) {
  try {
    const binPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'bin')
      : path.join(__dirname, '../../resources/bin')
    const adbExe = path.join(binPath, 'adb.exe')
    
    onLog('Đang chuyển đổi sang chế độ Wireless (TCPIP 5555)...')
    await new Promise<void>((resolve, reject) => {
      const tcpip = spawn(adbExe, ['-s', deviceId, 'tcpip', '5555'])
      tcpip.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error('TCP IP switch failed'))
      })
    })

    // Đợi 2s để adbd khởi động lại trên điện thoại
    await new Promise(r => setTimeout(r, 2000))
    
    onLog(`Đang kết nối tới ${ip}:5555 ...`)
    await new Promise<void>((resolve, reject) => {
      const connect = spawn(adbExe, ['connect', `${ip}:5555`])
      connect.stdout.on('data', d => onLog(d.toString()))
      connect.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error('Connect failed'))
      })
    })
    
    return true
  } catch (err: any) {
    onLog(`Lỗi kết nối WiFi: ${err.message}`)
    return false
  }
}

// Kết nối IP trực tiếp (không cần USB)
export async function connectIp(ip: string, onLog: (log: string) => void) {
  try {
    const binPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'bin')
      : path.join(__dirname, '../../resources/bin')
    const adbExe = path.join(binPath, 'adb.exe')
    
    // Nếu ip không có port thì mặc định thêm :5555
    const targetIp = ip.includes(':') ? ip : `${ip}:5555`
    
    onLog(`Đang kết nối tới ${targetIp} ...`)
    await new Promise<void>((resolve, reject) => {
      const connect = spawn(adbExe, ['connect', targetIp])
      
      const timeout = setTimeout(() => {
        connect.kill()
        reject(new Error('Timeout: Thiết bị không phản hồi sau 10s. Vui lòng kiểm tra lại mạng hoặc IP.'))
      }, 10000)

      connect.stdout.on('data', d => onLog(d.toString()))
      connect.stderr.on('data', d => onLog(d.toString()))
      connect.on('close', (code) => {
        clearTimeout(timeout)
        if (code === 0) resolve()
        else reject(new Error('Connect failed'))
      })
    })
    
    return true
  } catch (err: any) {
    onLog(`Lỗi kết nối IP: ${err.message}`)
    return false
  }
}

// Ghép nối thiết bị qua Android 11+ Pairing Code
export async function pairDevice(ipPort: string, code: string, onLog: (log: string) => void) {
  try {
    const binPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'bin')
      : path.join(__dirname, '../../resources/bin')
    const adbExe = path.join(binPath, 'adb.exe')
    
    onLog(`Đang ghép nối với ${ipPort} bằng mã ${code} ...`)
    await new Promise<void>((resolve, reject) => {
      const pair = spawn(adbExe, ['pair', ipPort, code])
      
      const timeout = setTimeout(() => {
        pair.kill()
        reject(new Error('Timeout: Thiết bị không phản hồi sau 10s. Vui lòng kiểm tra lại mạng, IP hoặc Port.'))
      }, 10000)

      let output = ''
      pair.stdout.on('data', d => {
        const text = d.toString()
        output += text
        onLog(text)
      })
      pair.stderr.on('data', d => {
        const text = d.toString()
        output += text
        onLog(text)
      })
      
      pair.on('close', (exitCode) => {
        clearTimeout(timeout)
        if (exitCode === 0 && output.toLowerCase().includes('successfully paired')) {
          resolve()
        } else if (exitCode === 0 && output.toLowerCase().includes('failed')) {
          reject(new Error('Pairing failed: Sai mã code hoặc hết thời gian ghép nối.'))
        } else if (exitCode === 0) {
          resolve() 
        } else {
          reject(new Error('Pairing failed'))
        }
      })
    })
    
    return true
  } catch (err: any) {
    onLog(`Lỗi ghép nối: ${err.message}`)
    return false
  }
}

export async function getDeviceInfo(deviceId: string) {
  try {
    const getPropRaw = await new Promise<string>((resolve) => {
      let data = ''
      adbState.client.shell(deviceId, 'getprop').then(s => {
        s.on('data', c => data += c)
        s.on('end', () => resolve(data))
      })
    })

    const wmSizeRaw = await new Promise<string>((resolve) => {
      let data = ''
      adbState.client.shell(deviceId, 'wm size').then(s => {
        s.on('data', c => data += c)
        s.on('end', () => resolve(data))
      })
    })

    const uptimeRaw = await new Promise<string>((resolve) => {
      let data = ''
      adbState.client.shell(deviceId, 'uptime').then(s => {
        s.on('data', c => data += c)
        s.on('end', () => resolve(data))
      })
    })

    const deviceName = getPropRaw.match(/\[persist\.sys\.device_name\]: \[(.*?)\]/)?.[1]
    const marketName = getPropRaw.match(/\[ro\.product\.marketname\]: \[(.*?)\]/)?.[1]
    const modelProp = getPropRaw.match(/\[ro\.product\.model\]: \[(.*?)\]/)?.[1] || 'Unknown Device'
    const brand = getPropRaw.match(/\[ro\.product\.brand\]: \[(.*?)\]/)?.[1] || 'Unknown'
    
    let model = deviceName || marketName
    if (!model) {
      model = `${brand.toUpperCase()} ${modelProp}`
    }

    const osVer = getPropRaw.match(/\[ro\.build\.version\.release\]: \[(.*?)\]/)?.[1] || 'Unknown'
    const sdkVer = getPropRaw.match(/\[ro\.build\.version\.sdk\]: \[(.*?)\]/)?.[1] || 'Unknown'
    const cpuAbi = getPropRaw.match(/\[ro\.product\.cpu\.abi\]: \[(.*?)\]/)?.[1] || 'Unknown'

    // Lấy IP address chuẩn xác qua ip route
    const ipRaw = await new Promise<string>((resolve) => {
      let data = ''
      adbState.client.shell(deviceId, 'ip route').then(s => {
        s.on('data', c => data += c)
        s.on('end', () => resolve(data))
      }).catch(() => resolve(''))
    })
    const wlanMatch = ipRaw.match(/wlan0.*src\s+(\d+\.\d+\.\d+\.\d+)/)
    const ipAddr = wlanMatch ? wlanMatch[1] : (getPropRaw.match(/\[dhcp\.wlan0\.ipaddress\]: \[(.*?)\]/)?.[1] || 'Not Connected')
    
    // Additional OS info
    const codename = getPropRaw.match(/\[ro\.build\.product\]: \[(.*?)\]/)?.[1] || getPropRaw.match(/\[ro\.product\.device\]: \[(.*?)\]/)?.[1] || 'Unknown'
    const board = getPropRaw.match(/\[ro\.board\.platform\]: \[(.*?)\]/)?.[1] || getPropRaw.match(/\[ro\.hardware\]: \[(.*?)\]/)?.[1] || 'Unknown'
    const buildId = getPropRaw.match(/\[ro\.build\.display\.id\]: \[(.*?)\]/)?.[1] || 'Unknown'
    const socModel = getPropRaw.match(/\[ro\.soc\.model\]: \[(.*?)\]/)?.[1] || ''
    
    // Process CPU Name
    let cpuName = socModel || board.toUpperCase()
    // Map common codenames to readable Snapdragon/MediaTek names if socModel is missing
    const cpuMap: Record<string, string> = {
      'lahaina': 'Snapdragon 888',
      'taro': 'Snapdragon 8 Gen 1',
      'kalama': 'Snapdragon 8 Gen 2',
      'pineapple': 'Snapdragon 8 Gen 3',
      'sm8150': 'Snapdragon 855',
      'sm8250': 'Snapdragon 865',
      'lisa': 'Snapdragon 778G',
      'yupik': 'Snapdragon 778G',
      'renoir': 'Snapdragon 780G',
      'kona': 'Snapdragon 865',
      'lito': 'Snapdragon 765G',
      'mt6893': 'Dimensity 1200'
    }
    if (!socModel && cpuMap[board.toLowerCase()]) {
      cpuName = cpuMap[board.toLowerCase()]
    }

    const resolutionMatch = wmSizeRaw.match(/Physical size: (.*)/)
    const resolution = resolutionMatch ? resolutionMatch[1].trim() : 'Unknown'
    const uptimeStr = uptimeRaw.trim()
    
    // Parse MIUI / HyperOS
    const miuiVer = getPropRaw.match(/\[ro\.miui\.ui\.version\.name\]: \[(.*?)\]/)?.[1]
    const hyperVer = getPropRaw.match(/\[ro\.mi\.os\.version\.name\]: \[(.*?)\]/)?.[1]
    const incVer = getPropRaw.match(/\[ro\.build\.version\.incremental\]: \[(.*?)\]/)?.[1] || 'Unknown'
    
    let customOs = 'Stock/Other'
    if (hyperVer) {
      const cleanVer = incVer.replace(/^OS/, '')
      customOs = `HyperOS ${cleanVer}`
    } else if (miuiVer) {
      customOs = `MIUI ${miuiVer} (${incVer})`
    } else {
      customOs = incVer
    }

    // Lấy thông số Storage
    const storageRaw = await new Promise<string>((resolve) => {
      let data = ''
      adbState.client.shell(deviceId, 'df').then(s => {
        s.on('data', c => data += c)
        s.on('end', () => resolve(data))
      })
    })
    
    let storageTotal = '0GB'
    let storageUsed = '0GB'
    let storagePercent = 0
    const storageLines = storageRaw.split('\n')
    for (const line of storageLines) {
      if (line.trim().endsWith('/data')) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 5) {
          const total1K = parseInt(parts[1]) || 0
          const avail1K = parseInt(parts[3]) || 0
          
          const totalGB = total1K / 1024 / 1024
          const availGB = avail1K / 1024 / 1024
          
          const standardSizes = [32, 64, 128, 256, 512, 1024]
          let physicalGB = 32
          for (const size of standardSizes) {
            if (totalGB <= size * 0.95) {
              physicalGB = size
              break
            }
          }
          if (totalGB > 1024 * 0.95) physicalGB = Math.ceil(totalGB / 128) * 128
          
          const usedGB = physicalGB - availGB
          
          storageTotal = `${physicalGB}GB`
          storageUsed = `${usedGB.toFixed(1)}GB`
          storagePercent = Math.round((usedGB / physicalGB) * 100)
          break
        }
      }
    }

    // Security & Boot Info
    const verifiedBootRaw = getPropRaw.match(/\[ro\.boot\.verifiedbootstate\]: \[(.*?)\]/)?.[1] || 'unknown'
    let bootloaderStatus = 'Locked'
    if (verifiedBootRaw === 'orange') bootloaderStatus = 'Unlocked'
    else if (verifiedBootRaw === 'yellow') bootloaderStatus = 'Custom Key'
    
    const cryptoStateRaw = getPropRaw.match(/\[ro\.crypto\.state\]: \[(.*?)\]/)?.[1] || 'unencrypted'
    const cryptoState = cryptoStateRaw.charAt(0).toUpperCase() + cryptoStateRaw.slice(1)
    
    const selinux = await new Promise<string>((resolve) => {
      let data = ''
      adbState.client.shell(deviceId, 'getenforce').then(s => {
        s.on('data', c => data += c)
        s.on('end', () => resolve(data.trim()))
      }).catch(() => resolve('Unknown'))
    })
    
    const suExists = await new Promise<boolean>((resolve) => {
      adbState.client.shell(deviceId, 'which su').then(s => {
        s.on('data', () => resolve(true))
        s.on('end', () => resolve(false))
      }).catch(() => resolve(false))
    })
    const isRooted = suExists ? 'Yes' : 'No'

    // Lấy thông số pin
    const batteryRaw = await new Promise<string>((resolve) => {
      let data = ''
      adbState.client.shell(deviceId, 'dumpsys battery').then(s => {
        s.on('data', c => data += c)
        s.on('end', () => resolve(data))
      })
    })
    
    const levelMatch = batteryRaw.match(/level: (\d+)/)
    const tempMatch = batteryRaw.match(/temperature: (\d+)/)
    const batteryLevel = levelMatch ? parseInt(levelMatch[1]) : 0
    const batteryTemp = tempMatch ? (parseInt(tempMatch[1]) / 10).toFixed(1) : '0'

    // Lấy thông số RAM
    const ramRaw = await new Promise<string>((resolve) => {
      let data = ''
      adbState.client.shell(deviceId, 'dumpsys meminfo').then(s => {
        s.on('data', c => data += c)
        s.on('end', () => resolve(data))
      })
    })
    
    const totalRamMatch = ramRaw.match(/Total RAM: ([\d,]+)K/)
    const freeRamMatch = ramRaw.match(/Free RAM: ([\d,]+)K/)
    const totalRam = totalRamMatch ? parseInt(totalRamMatch[1].replace(/,/g, '')) / 1024 : 0
    const freeRam = freeRamMatch ? parseInt(freeRamMatch[1].replace(/,/g, '')) / 1024 : 0

    return {
      model: model,
      brand: brand.toUpperCase(),
      osVer: `Android ${osVer}`,
      sdkVer: `API ${sdkVer}`,
      cpuAbi,
      ipAddr,
      bootloaderStatus,
      cryptoState: cryptoState.charAt(0).toUpperCase() + cryptoState.slice(1),
      selinux,
      isRooted,
      resolution,
      uptimeStr,
      batteryLevel,
      batteryTemp,
      ramTotal: Math.round(totalRam),
      ramFree: Math.round(freeRam),
      storageTotal,
      storageUsed,
      storagePercent,
      customOs,
      codename,
      board: board.toUpperCase(),
      cpuName,
      buildId
    }
  } catch (err) {
    console.error('Failed to get device info:', err)
    return null
  }
}

export interface AppInfo {
  pkg: string;
  type: 'system' | 'user';
  status: 'enabled' | 'disabled';
}

export async function getPackages(deviceId: string, filter: 'all' | 'system' | 'third' = 'all') {
  try {
    const execCmd = async (cmd: string): Promise<string[]> => {
      const output = await new Promise<string>((resolve) => {
        let data = ''
        adbState.client.shell(deviceId, cmd).then(s => {
          s.on('data', c => data += c)
          s.on('end', () => resolve(data))
        }).catch(() => resolve(''))
      })
      return output.split('\n')
        .filter(line => line.includes('package:'))
        .map(line => line.replace('package:', '').trim())
        .filter(pkg => pkg.length > 0)
    }

    const [systemPkgs, thirdPkgs, disabledPkgs] = await Promise.all([
      execCmd('pm list packages -s'),
      execCmd('pm list packages -3'),
      execCmd('pm list packages -d')
    ])

    const sysSet = new Set(systemPkgs)
    const thirdSet = new Set(thirdPkgs)
    const disabledSet = new Set(disabledPkgs)

    let allPkgs = new Set<string>()
    if (filter === 'all' || filter === 'system') systemPkgs.forEach(p => allPkgs.add(p))
    if (filter === 'all' || filter === 'third') thirdPkgs.forEach(p => allPkgs.add(p))
    
    if (filter === 'all') {
      const allList = await execCmd('pm list packages')
      allList.forEach(p => allPkgs.add(p))
    }

    const result: AppInfo[] = []
    allPkgs.forEach(pkg => {
      result.push({
        pkg,
        type: sysSet.has(pkg) ? 'system' : 'user',
        status: disabledSet.has(pkg) ? 'disabled' : 'enabled'
      })
    })

    return result
  } catch (err) {
    console.error('Failed to get packages:', err)
    return []
  }
}

const BLACKLIST = [
  'android',
  'com.android.systemui',
  'com.android.settings',
  'com.android.phone',
  'com.android.contacts',
  'com.miui.securitycenter'
]

export async function manageApp(deviceId: string, pkgName: string, action: 'uninstall' | 'disable' | 'enable' | 'clear' | 'stop' | 'restore', onLog: (log: string) => void) {
  try {
    if ((action === 'uninstall' || action === 'disable') && BLACKLIST.includes(pkgName)) {
      onLog(`[CRITICAL] Ứng dụng ${pkgName} là gói hệ thống cốt lõi. Đã CHẶN thao tác để tránh hard-brick!`)
      return { success: false, output: 'Bị chặn bởi hệ thống bảo vệ (Blacklist).' }
    }

    let cmd = ''
    switch (action) {
      case 'uninstall':
        cmd = `pm uninstall -k --user 0 ${pkgName}`
        break
      case 'disable':
        cmd = `pm disable-user --user 0 ${pkgName}`
        break
      case 'enable':
        cmd = `pm enable ${pkgName}`
        break
      case 'restore':
        cmd = `cmd package install-existing ${pkgName}`
        break
      case 'clear':
        cmd = `pm clear ${pkgName}`
        break
      case 'stop':
        cmd = `am force-stop ${pkgName}`

        break
    }

    onLog(`Đang thực thi: ${cmd}`)
    
    const output = await new Promise<string>((resolve) => {
      let data = ''
      adbState.client.shell(deviceId, cmd).then(s => {
        s.on('data', c => data += c)
        s.on('end', () => resolve(data))
      })
    })

    const outLower = output.toLowerCase()
    const isSuccess = !outLower.includes('failure') && !outLower.includes('error') && !outLower.includes('exception') && !outLower.includes('denied')
    
    onLog(`Kết quả: ${output.trim()}`)
    return { success: isSuccess, output: output.trim() }
  } catch (err: any) {
    onLog(`Lỗi khi ${action} ứng dụng ${pkgName}: ${err.message}`)
    return { success: false, output: err.message }
  }
}

// Trích xuất APK
export async function extractApp(deviceId: string, pkgName: string, destPath: string, onLog: (log: string) => void) {
  try {
    onLog(`Đang trích xuất APK của ${pkgName}...`)
    
    // 1. Lấy đường dẫn APK trên thiết bị
    const pathOutput = await new Promise<string>((resolve) => {
      let data = ''
      adbState.client.shell(deviceId, `pm path ${pkgName}`).then(s => {
        s.on('data', c => data += c)
        s.on('end', () => resolve(data.trim()))
      })
    })

    const apkPath = pathOutput.replace('package:', '').trim()
    if (!apkPath) throw new Error('Không tìm thấy đường dẫn APK')

    onLog(`Đường dẫn: ${apkPath}`)
    
    // 2. Pull file về PC
    const transfer = await adbState.client.pull(deviceId, apkPath)
    return new Promise((resolve, reject) => {
      const fs = require('fs')
      const outStream = fs.createWriteStream(destPath)
      transfer.on('progress', (stats) => {
        onLog(`Đang tải: ${((stats.bytesTransferred / 1024) / 1024).toFixed(2)} MB...`)
      })
      transfer.on('end', () => {
        onLog(`Trích xuất thành công: ${destPath}`)
        resolve(true)
      })
      transfer.on('error', (err) => {
        onLog(`Lỗi pull file: ${err.message}`)
        reject(err)
      })
      transfer.pipe(outStream)
    })
  } catch (err: any) {
    onLog(`Lỗi trích xuất: ${err.message}`)
    return false
  }
}

// Cài đặt APK
export async function installApk(deviceId: string, apkPath: string, onLog: (log: string) => void) {
  try {
    onLog(`Đang cài đặt APK: ${apkPath}...`)
    // Đẩy file lên thiết bị trước
    const remotePath = `/data/local/tmp/${Date.now()}.apk`
    const transfer = await adbState.client.push(deviceId, apkPath, remotePath)
    await new Promise((resolve, reject) => {
      transfer.on('end', resolve)
      transfer.on('error', reject)
    })

    // Cài đặt bằng pm install với các flag mạnh mẽ
    const output = await new Promise<string>((resolve) => {
      let data = ''
      // -r: Reinstall, -d: Allow downgrade, -t: Allow test packages, -g: Grant all permissions
      adbState.client.shell(deviceId, `pm install -r -d -t -g "${remotePath}"`).then(s => {
        s.on('data', c => data += c)
        s.on('end', () => resolve(data.trim()))
      })
    })

    // Xoá file tạm
    await adbState.client.shell(deviceId, `rm "${remotePath}"`)

    if (output.toLowerCase().includes('success')) {
      onLog('Cài đặt hoàn tất thành công!')
      return true
    } else {
      onLog(`Lỗi cài đặt: ${output}`)
      return false
    }
  } catch (err: any) {
    onLog(`Lỗi hệ thống: ${err.message}`)
    return false
  }
}
// --- File Manager Operations ---

export async function listDirectory(deviceId: string, remotePath: string) {
  try {
    if (!deviceId) throw new Error('Device ID is required')
    
    // Timeout for readdir
    const files = await Promise.race([
      adbState.client.readdir(deviceId, remotePath),
      new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Read Directory Timeout')), 8000))
    ])

    return files.map(file => ({
      name: file.name,
      size: file.size,
      mtime: file.mtime,
      mode: file.mode,
      isDir: (file.mode & 0o040000) === 0o040000,
      isFile: (file.mode & 0o100000) === 0o100000
    })).sort((a, b) => {
      if (a.isDir && !b.isDir) return -1
      if (!a.isDir && b.isDir) return 1
      return a.name.localeCompare(b.name)
    })
  } catch (err: any) {
    console.error(`Failed to list directory ${remotePath}:`, err)
    throw err
  }
}

export async function createDirectory(deviceId: string, remotePath: string) {
  try {
    await adbState.client.shell(deviceId, `mkdir -p "${remotePath}"`)
    return true
  } catch (err) {
    console.error(`Failed to create directory ${remotePath}:`, err)
    return false
  }
}

export async function deleteFile(deviceId: string, remotePath: string) {
  try {
    // rm -rf for both files and directories
    await adbState.client.shell(deviceId, `rm -rf "${remotePath}"`)
    return true
  } catch (err) {
    console.error(`Failed to delete ${remotePath}:`, err)
    return false
  }
}

export async function renameFile(deviceId: string, oldPath: string, newPath: string) {
  try {
    await adbState.client.shell(deviceId, `mv "${oldPath}" "${newPath}"`)
    return true
  } catch (err) {
    console.error(`Failed to rename ${oldPath} to ${newPath}:`, err)
    return false
  }
}

export async function pushFile(deviceId: string, localPath: string, remotePath: string, onLog: (log: string) => void) {
  try {
    onLog(`Đang tải lên: ${path.basename(localPath)} -> ${remotePath}`)
    const transfer = await adbState.client.push(deviceId, localPath, remotePath)
    return new Promise((resolve, reject) => {
      transfer.on('progress', (stats) => {
        onLog(`Đang đẩy file: ${((stats.bytesTransferred / 1024) / 1024).toFixed(2)} MB...`)
      })
      transfer.on('end', () => {
        onLog(`Tải lên thành công!`)
        resolve(true)
      })
      transfer.on('error', (err) => {
        onLog(`Lỗi tải lên: ${err.message}`)
        reject(err)
      })
    })
  } catch (err: any) {
    onLog(`Lỗi hệ thống khi đẩy file: ${err.message}`)
    return false
  }
}

export async function pullFile(deviceId: string, remotePath: string, localPath: string, onLog: (log: string) => void) {
  try {
    onLog(`Đang tải về: ${remotePath} -> ${localPath}`)
    const transfer = await adbState.client.pull(deviceId, remotePath)
    return new Promise((resolve, reject) => {
      const fs = require('fs')
      const outStream = fs.createWriteStream(localPath)
      transfer.on('progress', (stats) => {
        onLog(`Đang kéo file: ${((stats.bytesTransferred / 1024) / 1024).toFixed(2)} MB...`)
      })
      transfer.on('end', () => {
        onLog(`Tải về thành công!`)
        resolve(true)
      })
      transfer.on('error', (err) => {
        onLog(`Lỗi tải về: ${err.message}`)
        reject(err)
      })
      transfer.pipe(outStream)
    })
  } catch (err: any) {
    onLog(`Lỗi hệ thống khi kéo file: ${err.message}`)
    return false
  }
}

export async function getFileBase64(deviceId: string, remotePath: string) {
  try {
    const transfer = await adbState.client.pull(deviceId, remotePath)
    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = []
      transfer.on('data', (chunk: Buffer) => chunks.push(chunk))
      transfer.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve(buffer.toString('base64'))
      })
      transfer.on('error', (err) => {
        console.error('Transfer error:', err)
        reject(err)
      })
    })
  } catch (err: any) {
    console.error(`getFileBase64 Error: ${err.message}`)
    throw err
  }
}

export async function getStoragePoints(deviceId: string) {
  // Clean deviceId (remove any parentheses or extra info)
  const cleanId = deviceId.split(' ')[0].trim()
  
  try {
    const output = await Promise.race([
      new Promise<string>((resolve, reject) => {
        let data = ''
        adbState.client.shell(cleanId, 'df').then(s => {
          s.on('data', c => data += c)
          s.on('end', () => resolve(data))
          s.on('error', reject)
        }).catch(reject)
      }),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('ADB Timeout')), 4000))
    ])

    console.log(`Raw DF Output: ${output}`)
    const lines = output.split('\n')
    const storagePoints: any[] = []

    const getPhysicalSize = (totalGB: number) => {
      const standards = [8, 16, 32, 64, 128, 256, 512, 1024]
      for (const s of standards) {
        if (totalGB <= s * 0.95) return s
      }
      return Math.ceil(totalGB / 128) * 128
    }

    // Parse Internal Storage (/data or /sdcard or /storage/emulated/0)
    let internalLine = lines.find(l => l.includes(' /data')) || lines.find(l => l.includes('/storage/emulated')) || lines.find(l => l.includes('/sdcard'))
    
    if (internalLine) {
      const parts = internalLine.trim().split(/\s+/)
      if (parts.length >= 4) {
        const total1K = parseInt(parts[1]) || 0
        const avail1K = parseInt(parts[3]) || 0
        const totalGB = total1K / 1024 / 1024
        const availGB = avail1K / 1024 / 1024
        const physicalGB = getPhysicalSize(totalGB)
        const usedGB = Math.max(0, physicalGB - availGB)
        
        storagePoints.push({
          name: 'Bộ nhớ trong',
          path: '/sdcard',
          type: 'internal',
          total: physicalGB * 1024 * 1024 * 1024,
          used: usedGB * 1024 * 1024 * 1024,
          percent: Math.max(0, Math.min(100, Math.round((usedGB / physicalGB) * 100)))
        })
      }
    }

    // Parse External Storage
    lines.forEach(line => {
      if (line.includes('/storage/') && !line.includes('/emulated') && !line.includes('self')) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 4) {
          const mountPath = parts[parts.length - 1]
          const id = mountPath.split('/').pop()
          const total1K = parseInt(parts[1]) || 0
          const avail1K = parseInt(parts[3]) || 0
          if (total1K > 0) {
            storagePoints.push({
              name: `Thẻ nhớ (${id})`,
              path: mountPath,
              type: 'external',
              total: total1K * 1024,
              used: (total1K - avail1K) * 1024,
              percent: Math.max(0, Math.min(100, Math.round(((total1K - avail1K) / total1K) * 100)))
            })
          }
        }
      }
    })

    // Fallback: If no storage points found, at least provide /sdcard
    if (storagePoints.length === 0) {
      storagePoints.push({
        name: 'Bộ nhớ trong',
        path: '/sdcard',
        type: 'internal',
        total: 0,
        used: 0,
        percent: 0
      })
    }

    return storagePoints
  } catch (err) {
    console.error('getStoragePoints Error:', err)
    return [{ name: 'Bộ nhớ trong', path: '/sdcard', type: 'internal', total: 0, used: 0, percent: 0 }]
  }
}
