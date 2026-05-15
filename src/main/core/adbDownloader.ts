import axios from 'axios'
import AdmZip from 'adm-zip'
import fs from 'fs'
import path from 'path'

const DL_URL = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip'

export async function ensureAdb(binPath: string, onProgress: (msg: string) => void) {
  const adbExe = path.join(binPath, 'adb.exe')
  
  if (fs.existsSync(adbExe)) {
    return adbExe
  }

  onProgress('ADB not found. Downloading Platform-Tools...')
  
  if (!fs.existsSync(binPath)) {
    fs.mkdirSync(binPath, { recursive: true })
  }

  const zipPath = path.join(binPath, 'platform-tools.zip')

  try {
    const response = await axios({
      method: 'GET',
      url: DL_URL,
      responseType: 'stream'
    })

    const writer = fs.createWriteStream(zipPath)
    response.data.pipe(writer)

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })

    onProgress('Download complete. Extracting...')

    const zip = new AdmZip(zipPath)
    zip.extractAllTo(binPath, true)
    
    // The zip contains a folder "platform-tools", we need to move its contents to binPath
    const extractedDir = path.join(binPath, 'platform-tools')
    if (fs.existsSync(extractedDir)) {
      const files = fs.readdirSync(extractedDir)
      for (const file of files) {
        const oldPath = path.join(extractedDir, file)
        const newPath = path.join(binPath, file)
        if (fs.existsSync(newPath)) fs.unlinkSync(newPath) // overwrite
        fs.renameSync(oldPath, newPath)
      }
      fs.rmSync(extractedDir, { recursive: true, force: true })
    }

    fs.unlinkSync(zipPath) // Clean up zip
    
    onProgress('ADB installed successfully!')
    return adbExe
  } catch (error: any) {
    onProgress(`Failed to download ADB: ${error.message}`)
    throw error
  }
}
