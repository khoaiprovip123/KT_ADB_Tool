import React, { useState, useEffect, useMemo } from 'react'
import { Folder, File, ChevronRight, Search, Download, Trash2, RefreshCcw, ArrowLeft, MoreVertical, HardDrive, Plus, Minus, Upload, X, CheckCircle2, ChevronLeft, FolderPlus, FileText, Image as ImageIcon, Music, Film, FileCode, Monitor, Smartphone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDeviceStore } from '../../store/deviceStore'

interface FileInfo {
  name: string;
  size: number;
  mtime: Date;
  mode: number;
  isDir: boolean;
  isFile: boolean;
}

export function FileManager() {
  const { activeDevice } = useDeviceStore()
  const [currentPath, setCurrentPath] = useState('HOME')
  const [files, setFiles] = useState<FileInfo[]>([])
  const [storagePoints, setStoragePoints] = useState<{name: string, path: string, type: string, used: number, total: number, percent: number}[]>([])
  const [loading, setLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState<{name: string, data: string} | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [history, setHistory] = useState<string[]>(['HOME'])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [zoom, setZoom] = useState(1)

  // Reset zoom when image changes
  useEffect(() => {
    if (previewImage) setZoom(1)
  }, [previewImage])

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 4))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5))
  const handleResetZoom = () => setZoom(1)

  useEffect(() => {
    if (activeDevice) {
      loadStoragePoints()
      if (currentPath !== 'HOME') {
        loadFiles(currentPath)
      }
    }
  }, [activeDevice, currentPath])

  const loadStoragePoints = async () => {
    if (!activeDevice) return
    try {
      // @ts-ignore
      const points = await window.api.getStoragePoints(activeDevice)
      setStoragePoints(points)
    } catch (err) {
      console.error(err)
    }
  }

  const loadFiles = async (path: string) => {
    if (!activeDevice) return
    setLoading(true)
    try {
      // @ts-ignore
      const data = await window.api.listDirectory(activeDevice, path)
      setFiles(data)
    } catch (err) {
      console.error(err)
      alert(`Không thể truy cập thư mục: ${path}`)
      if (history.length > 1) {
        handleBack()
      }
    } finally {
      setLoading(false)
    }
  }

  const navigateTo = async (path: string, isFile = false) => {
    if (isFile) {
      const ext = path.split('.').pop()?.toLowerCase()
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) {
        setLoading(true)
        try {
          // @ts-ignore
          const base64 = await window.api.getFileBase64(activeDevice, path)
          setPreviewImage({ name: path.split('/').pop() || 'Preview', data: `data:image/${ext};base64,${base64}` })
        } catch (err) {
          console.error('Failed to preview image:', err)
        } finally {
          setLoading(false)
        }
      }
      return
    }

    const cleanPath = path.replace(/\/+/g, '/')
    if (cleanPath === currentPath) return
    
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(cleanPath)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    setCurrentPath(cleanPath)
    setSelectedFiles(new Set())
  }

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setCurrentPath(history[newIndex])
      setSelectedFiles(new Set())
    }
  }

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setCurrentPath(history[newIndex])
      setSelectedFiles(new Set())
    }
  }

  const handleUp = () => {
    if (currentPath === '/' || currentPath === '') return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    navigateTo('/' + parts.join('/'))
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileIcon = (file: FileInfo) => {
    if (file.isDir) return <Folder className="w-5 h-5 text-blue-500 fill-blue-500/20" />
    const ext = file.name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': return <ImageIcon className="w-5 h-5 text-pink-500" />
      case 'mp4': case 'mkv': case 'avi': case 'mov': return <Film className="w-5 h-5 text-purple-500" />
      case 'mp3': case 'wav': case 'flac': return <Music className="w-5 h-5 text-amber-500" />
      case 'pdf': case 'doc': case 'docx': case 'txt': return <FileText className="w-5 h-5 text-blue-400" />
      case 'js': case 'ts': case 'json': case 'html': case 'css': case 'py': return <FileCode className="w-5 h-5 text-emerald-500" />
      default: return <File className="w-5 h-5 text-slate-400" />
    }
  }

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files
    const q = searchQuery.toLowerCase()
    return files.filter(f => f.name.toLowerCase().includes(q))
  }, [files, searchQuery])

  const toggleSelect = (name: string) => {
    const newSet = new Set(selectedFiles)
    if (newSet.has(name)) newSet.delete(name)
    else newSet.add(name)
    setSelectedFiles(newSet)
  }

  const handleDownload = async (file: FileInfo) => {
    try {
      // @ts-ignore
      const destPath = await window.api.saveFileDialog(file.name)
      if (!destPath) return
      // @ts-ignore
      await window.api.pullFile(activeDevice, `${currentPath}/${file.name}`, destPath)
      alert('Tải về thành công!')
    } catch (err: any) {
      alert(`Lỗi tải về: ${err.message}`)
    }
  }

  const handleDelete = async () => {
    if (selectedFiles.size === 0) return
    if (!window.confirm(`Xóa ${selectedFiles.size} mục đã chọn? Thao tác này không thể hoàn tác.`)) return
    
    setLoading(true)
    try {
      for (const name of selectedFiles) {
        // @ts-ignore
        await window.api.deleteFile(activeDevice, `${currentPath}/${name}`)
      }
      setSelectedFiles(new Set())
      loadFiles(currentPath)
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    try {
      // @ts-ignore
      const localPath = await window.api.openFileDialog()
      if (!localPath) return
      const fileName = localPath.split(/[\\/]/).pop()
      // @ts-ignore
      await window.api.pushFile(activeDevice, localPath, `${currentPath}/${fileName}`)
      loadFiles(currentPath)
    } catch (err: any) {
      alert(`Lỗi tải lên: ${err.message}`)
    }
  }

  const handleNewFolder = async () => {
    if (currentPath === 'HOME') return
    const name = window.prompt('Nhập tên thư mục mới:')
    if (!name) return
    try {
      // @ts-ignore
      await window.api.createDirectory(activeDevice, `${currentPath}/${name}`)
      loadFiles(currentPath)
    } catch (err: any) {
      alert(`Lỗi tạo thư mục: ${err.message}`)
    }
  }

  const renderHomeView = () => (
    <div className="p-8">
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Thiết bị lưu trữ</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {storagePoints.map((point: any) => (
          <motion.div
            key={point.path}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigateTo(point.path)}
            className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-900/5 border border-white hover:border-blue-500/30 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${point.type === 'internal' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {point.type === 'internal' ? <HardDrive size={28} /> : <Smartphone size={28} />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-slate-800 truncate">{point.name}</h4>
                <p className="text-xs text-slate-400 font-medium truncate">{point.path}</p>
              </div>
            </div>

            <div className="mt-6 space-y-2 relative z-10">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-400">Dung lượng</span>
                <span className="text-slate-600">{formatSize(point.used)} / {formatSize(point.total)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${point.percent}%` }}
                  className={`h-full rounded-full ${point.percent > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                />
              </div>
              <div className="text-right text-[10px] font-bold text-slate-400">
                {100 - point.percent}% còn trống
              </div>
            </div>

            {/* Background Decoration */}
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity ${point.type === 'internal' ? 'text-blue-600' : 'text-emerald-600'}`}>
              {point.type === 'internal' ? <HardDrive size={96} /> : <Smartphone size={96} />}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )

  if (!activeDevice) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-3xl m-8">
        <HardDrive className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-700">Chưa có thiết bị</h3>
        <p className="text-slate-500 mt-2 text-center max-w-sm">Vui lòng kết nối thiết bị Android để quản lý tệp tin.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
      {/* TOOLBAR */}
      <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-4 border border-white/50 shadow-xl shadow-blue-900/5 mb-6 shrink-0 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Windows Style Home Button */}
          <button 
            onClick={() => navigateTo('HOME')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentPath === 'HOME' ? 'bg-slate-200 text-blue-600 shadow-sm' : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
          >
            <Monitor size={14} />
            <span>This Device</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <NavBtn icon={<ChevronLeft />} onClick={handleBack} disabled={historyIndex === 0} />
            <NavBtn icon={<ChevronRight />} onClick={handleForward} disabled={historyIndex === history.length - 1} />
            <NavBtn icon={<ArrowLeft className="rotate-90" />} onClick={handleUp} disabled={currentPath === 'HOME' || currentPath === '/' || currentPath === ''} />
            <div className="w-px h-4 bg-slate-300 mx-1" />
            <NavBtn icon={<RefreshCcw />} onClick={() => currentPath === 'HOME' ? loadStoragePoints() : loadFiles(currentPath)} loading={loading} />
          </div>

          <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl group focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all">
            <Folder className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar text-sm font-medium text-slate-600">
              {currentPath === 'HOME' ? (
                <span className="px-2 font-black uppercase tracking-widest text-blue-600">This Device</span>
              ) : (
                currentPath.split('/').filter(Boolean).map((part, i, arr) => (
                  <React.Fragment key={i}>
                    <button 
                      onClick={() => navigateTo('/' + arr.slice(0, i + 1).join('/'))}
                      className="hover:text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {part}
                    </button>
                    {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                  </React.Fragment>
                ))
              )}
              {currentPath === '/' && <span className="px-2">Gốc (Root)</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleNewFolder} disabled={currentPath === 'HOME'} className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm disabled:opacity-30" title="Thư mục mới">
              <FolderPlus size={18} />
            </button>
            <button onClick={handleUpload} disabled={currentPath === 'HOME'} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-30">
              <Upload size={16} />
              <span>Tải lên</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILE LIST / HOME VIEW */}
      <div className="flex-1 bg-white/60 backdrop-blur-3xl rounded-3xl border border-white/50 shadow-xl shadow-blue-900/5 flex flex-col relative z-0 overflow-hidden">
        {currentPath === 'HOME' ? renderHomeView() : (
          <>
            <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0 items-center">
              <div className="col-span-7 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tên tệp</span>
              </div>
              <div className="col-span-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Kích thước</div>
              <div className="col-span-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ngày sửa đổi</div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading && files.length === 0 ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-12 bg-slate-100/50 rounded-xl animate-pulse" />)}
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Folder className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Thư mục trống</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredFiles.map((file) => {
                    const isSelected = selectedFiles.has(file.name)
                    return (
                      <div 
                        key={file.name}
                        className={`grid grid-cols-12 gap-4 px-6 py-3 items-center transition-all cursor-pointer group ${isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50/50'}`}
                        onClick={() => file.isDir ? navigateTo(`${currentPath}/${file.name}`) : navigateTo(`${currentPath}/${file.name}`, true)}
                        onDoubleClick={() => file.isDir && navigateTo(`${currentPath}/${file.name}`)}
                      >
                        <div className="col-span-7 flex items-center gap-3 truncate">
                          <div className="shrink-0">{getFileIcon(file)}</div>
                          <div className="flex flex-col truncate">
                            <span className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{file.name}</span>
                            {isSelected && <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">Đã chọn</span>}
                          </div>
                        </div>
                        <div className="col-span-2 text-xs font-medium text-slate-500">
                          {file.isDir ? '--' : formatSize(file.size)}
                        </div>
                        <div className="col-span-3 text-xs font-medium text-slate-400 text-right group-hover:hidden">
                          {formatDate(file.mtime)}
                        </div>
                        {/* Hover Actions */}
                        <div className="col-span-3 hidden group-hover:flex items-center justify-end gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
                          {!file.isDir && <ActionBtn icon={<Download />} onClick={(e) => { e.stopPropagation(); handleDownload(file); }} color="hover:bg-blue-100 text-blue-600" />}
                          <ActionBtn icon={<Trash2 />} onClick={(e) => { e.stopPropagation(); setSelectedFiles(new Set([file.name])); handleDelete(); }} color="hover:bg-red-100 text-red-600" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* FOOTER / SELECTION BAR */}
        <AnimatePresence>
          {selectedFiles.size > 0 && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 100, opacity: 0 }} 
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-2xl text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 border border-white/10"
            >
              <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black">{selectedFiles.size}</div>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Đã chọn</span>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={handleDelete} className="flex items-center gap-2 text-xs font-bold hover:text-red-400 transition-colors uppercase tracking-wider">
                  <Trash2 size={14} /> Xóa
                </button>
                <div className="w-px h-4 bg-white/10" />
                <button onClick={() => setSelectedFiles(new Set())} className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider">
                  Hủy
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {currentPath === 'HOME' ? storagePoints.length : files.length} MỤC
            </span>
            {currentPath !== 'HOME' && (
              <>
                <div className="w-px h-3 bg-slate-200" />
                <span>{files.filter(f => f.isDir).length} THƯ MỤC</span>
                <span>{files.filter(f => f.isFile).length} TỆP TIN</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-blue-500/60 font-bold bg-blue-50/50 px-3 py-1 rounded-lg border border-blue-100/50">
            <Monitor size={10} className="shrink-0" />
            <span>{currentPath === 'HOME' ? 'THIS DEVICE' : currentPath.toUpperCase()}</span>
          </div>
        </div>

        {/* IMAGE PREVIEW MODAL */}
        <AnimatePresence>
          {previewImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex flex-col bg-slate-950/98 backdrop-blur-3xl"
              onClick={() => setPreviewImage(null)}
            >
              {/* Immersive Floating Header */}
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center justify-between px-10 py-6 shrink-0 bg-slate-900/60 backdrop-blur-3xl border-b border-white/10 z-20"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-blue-400/20">
                    <ImageIcon size={22} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-base font-black text-white tracking-tight leading-none mb-1.5 drop-shadow-md">{previewImage.name}</h3>
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] drop-shadow-sm">Đang xem ảnh chất lượng cao</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/10 shadow-xl">
                    <button onClick={handleZoomOut} title="Thu nhỏ" className="p-2 hover:bg-white/20 text-white rounded-xl transition-all active:scale-90"><Minus size={20} /></button>
                    <div className="px-4 text-xs font-black text-blue-400 min-w-[70px] text-center tracking-tighter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] bg-blue-400/10 py-1 rounded-lg border border-blue-400/20">{Math.round(zoom * 100)}%</div>
                    <button onClick={handleZoomIn} title="Phóng to" className="p-2 hover:bg-white/20 text-white rounded-xl transition-all active:scale-90"><Plus size={20} /></button>
                    <div className="w-px h-5 bg-white/20 mx-1" />
                    <button onClick={handleResetZoom} title="Mặc định" className="p-2 hover:bg-white/20 text-white rounded-xl transition-all active:scale-90"><RefreshCcw size={16} /></button>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <button onClick={() => setPreviewImage(null)} className="p-3.5 bg-red-500/10 hover:bg-red-500 text-white rounded-2xl border border-red-500/20 transition-all active:scale-90 group shadow-lg shadow-red-500/10">
                    <X size={26} className="group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                </div>
              </motion.div>

              {/* Full-Screen Content Area */}
              <div 
                className="relative flex-1 overflow-hidden flex items-center justify-center p-0" 
                onClick={e => e.stopPropagation()}
                onWheel={(e) => {
                  if (e.deltaY < 0) handleZoomIn();
                  else handleZoomOut();
                }}
              >
                <div className="w-full h-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing">
                  <motion.img 
                    key={previewImage.data}
                    drag={zoom > 1}
                    dragConstraints={{ left: -2000, right: 2000, top: -2000, bottom: 2000 }}
                    dragElastic={0.1}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ 
                      opacity: 1, 
                      scale: zoom,
                    }}
                    src={previewImage.data} 
                    alt={previewImage.name} 
                    className="max-w-[95vw] max-h-[85vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out pointer-events-auto"
                    style={{ transformOrigin: 'center' }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function NavBtn({ icon, onClick, disabled, loading }: { icon: React.ReactNode, onClick: () => void, disabled?: boolean, loading?: boolean }) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled || loading}
      className={`p-2 rounded-lg transition-all ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white hover:text-blue-600 hover:shadow-sm active:scale-90 text-slate-500'}`}
    >
      {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
    </button>
  )
}

function ActionBtn({ icon, onClick, color }: { icon: React.ReactElement, onClick: (e: React.MouseEvent) => void, color: string }) {
  return (
    <button 
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${color}`}
    >
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
    </button>
  )
}
