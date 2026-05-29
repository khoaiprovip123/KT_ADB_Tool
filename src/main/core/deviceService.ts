import * as path from 'path'
import { app } from 'electron'
import { spawn } from 'child_process'
import { adbState } from './adbService'

function getAdbExe(): string {
  const binPath = app.isPackaged
    ? path.join(process.resourcesPath, 'bin')
    : path.join(__dirname, '../../resources/bin')
  return path.join(binPath, 'adb.exe')
}

// Chạy Scrcpy
export async function runScrcpy(deviceId: string, turnScreenOff: boolean, onLog: (log: string) => void) {
  try {
    const binPath = app.isPackaged
      ? path.join(process.resourcesPath, 'bin')
      : path.join(__dirname, '../../resources/bin')
    const scrcpyExe = path.join(binPath, 'scrcpy', 'scrcpy.exe')

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
    const adbExe = getAdbExe()

    onLog('Đang chuyển đổi sang chế độ Wireless (TCPIP 5555)...')
    await new Promise<void>((resolve, reject) => {
      const tcpip = spawn(adbExe, ['-s', deviceId, 'tcpip', '5555'])
      tcpip.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error('TCP IP switch failed'))
      })
    })

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

// Kết nối IP trực tiếp
export async function connectIp(ip: string, onLog: (log: string) => void) {
  try {
    const adbExe = getAdbExe()
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
    const adbExe = getAdbExe()

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

export { adbState }

export interface StorageStats {
  total: number
  used: number
  free: number
  percentage: number
}

export async function getStorageStats(deviceId: string): Promise<StorageStats | null> {
  try {
    const output = await adbState.client.shell(deviceId, 'df -k /data')
    const chunks = []
    for await (const chunk of output) {
      chunks.push(chunk)
    }
    const text = Buffer.concat(chunks).toString()
    const lines = text.split('\n')
    
    for (const line of lines) {
      if (line.includes('/data') && !line.includes('tmpfs')) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 5) {
          // df -k returns values in 1K-blocks
          const total = parseInt(parts[1]) * 1024
          const used = parseInt(parts[2]) * 1024
          let free = parseInt(parts[3]) * 1024
          if (isNaN(free) && parts.length >= 6) {
             free = parseInt(parts[4]) * 1024
          }
          const percentageStr = parts.find(p => p.includes('%')) || '0%'
          const percentage = parseInt(percentageStr.replace('%', ''))
          
          if (!isNaN(total) && !isNaN(used) && !isNaN(percentage)) {
            return { total, used, free: total - used, percentage }
          }
        }
      }
    }
    return null
  } catch (err) {
    console.error('getStorageStats error:', err)
    return null
  }
}
