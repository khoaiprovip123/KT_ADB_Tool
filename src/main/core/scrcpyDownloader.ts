import axios from 'axios'
import AdmZip from 'adm-zip'
import fs from 'fs'
import path from 'path'

const DL_URL = 'https://github.com/Genymobile/scrcpy/releases/download/v2.4/scrcpy-win64-v2.4.zip'

export async function ensureScrcpy(binPath: string, onProgress: (msg: string) => void) {
  const scrcpyExe = path.join(binPath, 'scrcpy.exe')
  
  if (fs.existsSync(scrcpyExe)) {
    return scrcpyExe
  }

  onProgress('Scrcpy not found. Downloading Scrcpy from GitHub...')
  
  if (!fs.existsSync(binPath)) {
    fs.mkdirSync(binPath, { recursive: true })
  }

  const zipPath = path.join(binPath, 'scrcpy.zip')

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

    onProgress('Scrcpy Download complete. Extracting...')

    const zip = new AdmZip(zipPath)
    
    // Extract to resources/bin/scrcpy
    const scrcpyFolder = path.join(binPath, 'scrcpy')
    if (!fs.existsSync(scrcpyFolder)) fs.mkdirSync(scrcpyFolder, { recursive: true })
    
    zip.extractAllTo(scrcpyFolder, true)
    
    // Move files from nested scrcpy-win64-v2.4 to scrcpy/
    const extractedNested = path.join(scrcpyFolder, 'scrcpy-win64-v2.4')
    if (fs.existsSync(extractedNested)) {
      const files = fs.readdirSync(extractedNested)
      for (const file of files) {
        const oldPath = path.join(extractedNested, file)
        const newPath = path.join(scrcpyFolder, file)
        if (fs.existsSync(newPath)) {
          try { fs.unlinkSync(newPath) } catch (e) {} // ignore if cannot delete
        }
        try { fs.renameSync(oldPath, newPath) } catch (e) {} // ignore if busy
      }
      try { fs.rmSync(extractedNested, { recursive: true, force: true }) } catch (e) {}
    }

    // Xoá zip
    try { fs.unlinkSync(zipPath) } catch (e) {}
    
    onProgress('Scrcpy installed successfully!')
    return path.join(scrcpyFolder, 'scrcpy.exe')
  } catch (error: any) {
    onProgress(`Failed to download Scrcpy: ${error.message}`)
    throw error
  }
}
