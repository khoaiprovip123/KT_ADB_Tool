import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Folder,
  File,
  ChevronRight,
  Download,
  Trash2,
  RefreshCcw,
  ArrowLeft,
  HardDrive,
  Plus,
  Minus,
  Upload,
  X,
  ChevronLeft,
  FolderPlus,
  FileText,
  Image as ImageIcon,
  Music,
  Film,
  FileCode,
  Monitor,
  Smartphone,
  Search,
  Check,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDeviceStore } from "../../store/deviceStore";
import { toast } from "../../store/toastStore";
import { FileInfo, StoragePoint } from "../../../../shared/types";

export function FileManager() {
  const { activeDevice, devices } = useDeviceStore();
  const [currentPath, setCurrentPath] = useState("HOME");
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [storagePoints, setStoragePoints] = useState<StoragePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    name: string;
    data: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const confirmDeleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const confirmBulkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSelectedFileRef = useRef<string | null>(null);
  const [history, setHistory] = useState<string[]>(["HOME"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isFileDragging, setIsFileDragging] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 100;

  // Reset zoom when image changes
  useEffect(() => {
    if (previewImage) setZoom(1);
  }, [previewImage]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 0.5));
  const handleResetZoom = () => setZoom(1);

  useEffect(() => {
    if (activeDevice) {
      loadStoragePoints();
      if (currentPath !== "HOME") {
        loadFiles(currentPath);
      }
    }
  }, [activeDevice, currentPath]);

  const loadStoragePoints = async () => {
    if (!activeDevice) return;
    try {
      const points = await window.api.getStoragePoints(activeDevice);
      setStoragePoints(points);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFiles = async (path: string) => {
    if (!activeDevice) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await window.api.listDirectory(activeDevice, path);
      setFiles(data);
    } catch (err: any) {
      console.error(err);
      toast.error(`Không thể truy cập: ${err.message}`);
      setLoadError(path);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = async (path: string, isFile = false) => {
    if (!activeDevice) return;
    if (isFile) {
      const ext = path.split(".").pop()?.toLowerCase();
      if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext || "")) {
        setLoading(true);
        try {
          const base64 = await window.api.getFileBase64(activeDevice, path);
          setPreviewImage({
            name: path.split("/").pop() || "Preview",
            data: `data:image/${ext};base64,${base64}`,
          });
        } catch (err) {
          toast.error("Failed to preview image");
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    const cleanPath = path.replace(/\/+/g, "/");
    if (cleanPath === currentPath) return;

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cleanPath);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentPath(cleanPath);
    setSelectedFiles(new Set());
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentPath(history[newIndex]);
      setSelectedFiles(new Set());
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentPath(history[newIndex]);
      setSelectedFiles(new Set());
    }
  };

  const handleUp = () => {
    if (currentPath === "/" || currentPath === "") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    navigateTo("/" + parts.join("/"));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileIcon = (file: FileInfo) => {
    if (file.isDir)
      return <Folder className="w-5 h-5 text-blue-500 fill-blue-500/20" />;
    const ext = file.name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "webp":
        return <ImageIcon className="w-5 h-5 text-pink-500" />;
      case "mp4":
      case "mkv":
      case "avi":
      case "mov":
        return <Film className="w-5 h-5 text-purple-500" />;
      case "mp3":
      case "wav":
      case "flac":
        return <Music className="w-5 h-5 text-amber-500" />;
      case "pdf":
      case "doc":
      case "docx":
      case "txt":
        return <FileText className="w-5 h-5 text-blue-400" />;
      case "js":
      case "ts":
      case "json":
      case "html":
      case "css":
      case "py":
        return <FileCode className="w-5 h-5 text-emerald-500" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    const q = searchQuery.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, searchQuery]);

  // Reset page when path or search changes
  useEffect(() => {
    setPage(1);
  }, [currentPath, searchQuery]);

  const paginatedFiles = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredFiles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredFiles, page]);

  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);

  const handleDownload = async (file: FileInfo) => {
    if (!activeDevice) return;
    try {
      const destPath = await window.api.saveFileDialog(file.name);
      if (!destPath) return;
      await window.api.pullFile(
        activeDevice,
        `${currentPath}/${file.name}`,
        destPath,
      );
      toast.success("Tải về thành công!");
    } catch (err: any) {
      toast.error(`Lỗi tải về: ${err.message}`);
    }
  };

  // Clear any armed confirmation timer
  const clearConfirmTimers = () => {
    if (confirmDeleteTimerRef.current) {
      clearTimeout(confirmDeleteTimerRef.current);
      confirmDeleteTimerRef.current = null;
    }
    if (confirmBulkTimerRef.current) {
      clearTimeout(confirmBulkTimerRef.current);
      confirmBulkTimerRef.current = null;
    }
    setConfirmDeleteFile(null);
    setConfirmBulkDelete(false);
  };

  useEffect(() => {
    return () => {
      clearConfirmTimers();
    };
  }, []);

  // Multi-select helpers
  const toggleSelectFile = (fileName: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
    lastSelectedFileRef.current = fileName;
    clearConfirmTimers();
  };

  const rangeSelectFiles = (targetName: string) => {
    const last = lastSelectedFileRef.current;
    if (!last) {
      toggleSelectFile(targetName);
      return;
    }
    const names = paginatedFiles.map((f) => f.name);
    const idxA = names.indexOf(last);
    const idxB = names.indexOf(targetName);
    if (idxA === -1 || idxB === -1) {
      toggleSelectFile(targetName);
      return;
    }
    const [start, end] = idxA < idxB ? [idxA, idxB] : [idxB, idxA];
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        next.add(names[i]);
      }
      return next;
    });
    lastSelectedFileRef.current = targetName;
    clearConfirmTimers();
  };

  const isAllSelected = useMemo(() => {
    if (paginatedFiles.length === 0) return false;
    return paginatedFiles.every((f) => selectedFiles.has(f.name));
  }, [paginatedFiles, selectedFiles]);

  const isSomeSelected = useMemo(() => {
    return selectedFiles.size > 0 && !isAllSelected;
  }, [selectedFiles.size, isAllSelected]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map((f) => f.name)));
    }
    clearConfirmTimers();
  };

  // Keyboard shortcuts (Ctrl+A to select all, Esc to deselect, Delete to arm bulk delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        if (currentPath !== "HOME" && filteredFiles.length > 0) {
          e.preventDefault();
          setSelectedFiles(new Set(filteredFiles.map((f) => f.name)));
          clearConfirmTimers();
        }
      } else if (e.key === "Escape") {
        if (selectedFiles.size > 0 || confirmBulkDelete || confirmDeleteFile) {
          setSelectedFiles(new Set());
          clearConfirmTimers();
        }
      } else if (e.key === "Delete") {
        if (selectedFiles.size > 0) {
          setConfirmBulkDelete(true);
          if (confirmBulkTimerRef.current) clearTimeout(confirmBulkTimerRef.current);
          confirmBulkTimerRef.current = setTimeout(() => setConfirmBulkDelete(false), 4000);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPath, filteredFiles, selectedFiles.size, confirmBulkDelete, confirmDeleteFile]);

  // 2-Step Definitive Delete on Single Row
  const handleSingleDeleteClick = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();

    // If already armed for this file -> 2nd click! Execute deletion immediately
    if (confirmDeleteFile === fileName) {
      if (confirmDeleteTimerRef.current) {
        clearTimeout(confirmDeleteTimerRef.current);
        confirmDeleteTimerRef.current = null;
      }
      setConfirmDeleteFile(null);
      executeSingleDelete(fileName);
      return;
    }

    // First click: arm confirmation with 3.5s timeout
    clearConfirmTimers();
    setConfirmDeleteFile(fileName);
    confirmDeleteTimerRef.current = setTimeout(() => {
      setConfirmDeleteFile(null);
    }, 3500);
  };

  const executeSingleDelete = async (fileName: string) => {
    if (!activeDevice) return;
    toast.info(`Đang xóa "${fileName}"...`);
    setLoading(true);
    try {
      const ok = await window.api.deleteFile(
        activeDevice,
        `${currentPath}/${fileName}`,
      );
      if (ok) {
        toast.success(`Đã xóa vĩnh viễn: ${fileName}`);
        setSelectedFiles((prev) => {
          const next = new Set(prev);
          next.delete(fileName);
          return next;
        });
        loadFiles(currentPath);
      } else {
        toast.error(`Không thể xóa "${fileName}".`);
      }
    } catch (err: any) {
      toast.error(`Lỗi khi xóa: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 2-Step Definitive Bulk Deletion
  const handleBulkDeleteClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // If already armed -> 2nd click! Execute bulk deletion immediately
    if (confirmBulkDelete) {
      if (confirmBulkTimerRef.current) {
        clearTimeout(confirmBulkTimerRef.current);
        confirmBulkTimerRef.current = null;
      }
      setConfirmBulkDelete(false);
      executeBulkDelete();
      return;
    }

    // First click: arm confirmation with 4s timeout
    clearConfirmTimers();
    setConfirmBulkDelete(true);
    confirmBulkTimerRef.current = setTimeout(() => {
      setConfirmBulkDelete(false);
    }, 4000);
  };

  const executeBulkDelete = async () => {
    if (!activeDevice || selectedFiles.size === 0) return;
    const count = selectedFiles.size;
    const paths = Array.from(selectedFiles).map((name) => `${currentPath}/${name}`);

    toast.info(`Đang xóa dứt điểm ${count} mục...`);
    setLoading(true);
    try {
      if (window.api.deleteFiles) {
        const result = await window.api.deleteFiles(activeDevice, paths);
        if (result.success || result.deletedCount > 0) {
          toast.success(`Đã xóa thành công ${result.deletedCount}/${count} mục!`);
        } else {
          toast.error(`Xóa thất bại: ${result.errors.join("; ") || "Lỗi quyền hoặc đường dẫn"}`);
        }
      } else {
        for (const p of paths) {
          await window.api.deleteFile(activeDevice, p);
        }
        toast.success(`Đã xóa thành công ${count} mục!`);
      }
      setSelectedFiles(new Set());
      loadFiles(currentPath);
    } catch (err: any) {
      toast.error(`Lỗi khi xóa: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isFileDragging) setIsFileDragging(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsFileDragging(false);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragging(false);

    if (!activeDevice) {
      toast.warning("Vui lòng kết nối thiết bị trước.");
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const targetDir = currentPath === "HOME" ? "/sdcard/Download" : currentPath;
    let uploadedCount = 0;

    for (const file of files) {
      const localPath = window.api?.getPathForFile
        ? window.api.getPathForFile(file)
        : ((file as any).path || "");
      if (!localPath) {
        toast.error(`Không thể đọc đường dẫn tệp: ${file.name}`);
        continue;
      }
      toast.info(`Đang tải lên: ${file.name}...`);
      try {
        const ok = await window.api.pushFile(activeDevice, localPath, targetDir);
        if (ok) uploadedCount++;
      } catch (err: any) {
        toast.error(`Lỗi tải "${file.name}": ${err.message}`);
      }
    }

    if (uploadedCount > 0) {
      toast.success(`Đã tải lên ${uploadedCount} tệp tin thành công!`);
      if (currentPath !== "HOME") {
        loadFiles(currentPath);
      } else {
        navigateTo("/sdcard/Download");
      }
    }
  };

  const handleUpload = async () => {
    if (!activeDevice) return;
    try {
      const localPaths = window.api.openFilesDialog
        ? await window.api.openFilesDialog()
        : [await window.api.openFileDialog()];
      if (!localPaths || localPaths.length === 0) return;
      const targetDir = currentPath === "HOME" ? "/sdcard/Download" : currentPath;
      let count = 0;
      for (const localPath of localPaths) {
        if (!localPath) continue;
        const fileName = localPath.split(/[\\/]/).pop();
        toast.info(`Đang tải lên: ${fileName}...`);
        const ok = await window.api.pushFile(activeDevice, localPath, targetDir);
        if (ok) count++;
      }
      if (count > 0) {
        toast.success(`Đã tải lên ${count} tệp tin thành công!`);
        if (currentPath !== "HOME") {
          loadFiles(currentPath);
        } else {
          navigateTo("/sdcard/Download");
        }
      }
    } catch (err: any) {
      toast.error(`Lỗi tải lên: ${err.message}`);
    }
  };

  const handleNewFolder = async () => {
    if (!activeDevice) return;
    if (currentPath === "HOME") return;
    const name = window.prompt("Nhập tên thư mục mới:");
    if (!name) return;
    try {
      await window.api.createDirectory(activeDevice, `${currentPath}/${name}`);
      loadFiles(currentPath);
    } catch (err: any) {
      toast.error(`Lỗi tạo thư mục: ${err.message}`);
    }
  };

  const renderHomeView = () => (
    <div className="p-8">
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">
        Thiết bị lưu trữ
      </h3>
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
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${point.type === "internal" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}
              >
                {point.type === "internal" ? (
                  <HardDrive size={28} />
                ) : (
                  <Smartphone size={28} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-slate-800 truncate">
                  {point.name}
                </h4>
                <p className="text-xs text-slate-400 font-medium truncate">
                  {point.path}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2 relative z-10">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-400">Dung lượng</span>
                <span className="text-slate-600">
                  {formatSize(point.used)} / {formatSize(point.total)}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${point.percent}%` }}
                  className={`h-full rounded-full ${point.percent > 90 ? "bg-red-500" : "bg-blue-500"}`}
                />
              </div>
              <div className="text-right text-[10px] font-bold text-slate-400">
                {100 - point.percent}% còn trống
              </div>
            </div>

            {/* Background Decoration */}
            <div
              className={`absolute -bottom-4 -right-4 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity ${point.type === "internal" ? "text-blue-600" : "text-emerald-600"}`}
            >
              {point.type === "internal" ? (
                <HardDrive size={96} />
              ) : (
                <Smartphone size={96} />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const currentDevice = devices.find((d) => d.id === activeDevice);
  const isBootloader = currentDevice?.type === "bootloader";

  if (!activeDevice) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-3xl m-8">
        <HardDrive className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-700">Chưa có thiết bị</h3>
        <p className="text-slate-500 mt-2 text-center max-w-sm">
          Vui lòng kết nối thiết bị Android để quản lý tệp tin.
        </p>
      </div>
    );
  }

  if (isBootloader) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-3xl m-8 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse" />
        <HardDrive className="w-16 h-16 text-cyan-400 mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-cyan-400">Thiết bị đang ở chế độ Fastboot</h3>
        <p className="text-slate-400 mt-2 text-center max-w-sm text-xs leading-relaxed font-semibold">
          Quản lý tệp tin yêu cầu thiết bị ở chế độ bình thường (ADB). Vui lòng chuyển qua tab Bảng điều khiển để khởi động lại thiết bị.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
      {/* TOOLBAR */}
      <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-4 border border-white/50 shadow-xl shadow-blue-900/5 mb-6 shrink-0 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Windows Style Home Button */}
          <button
            onClick={() => navigateTo("HOME")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentPath === "HOME" ? "bg-slate-200 text-blue-600 shadow-sm" : "bg-slate-100/50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}
          >
            <Monitor size={14} />
            <span>This Device</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <NavBtn
              icon={<ChevronLeft />}
              onClick={handleBack}
              disabled={historyIndex === 0}
            />
            <NavBtn
              icon={<ChevronRight />}
              onClick={handleForward}
              disabled={historyIndex === history.length - 1}
            />
            <NavBtn
              icon={<ArrowLeft className="rotate-90" />}
              onClick={handleUp}
              disabled={
                currentPath === "HOME" ||
                currentPath === "/" ||
                currentPath === ""
              }
            />
            <div className="w-px h-4 bg-slate-300 mx-1" />
            <NavBtn
              icon={<RefreshCcw />}
              onClick={() =>
                currentPath === "HOME"
                  ? loadStoragePoints()
                  : loadFiles(currentPath)
              }
              loading={loading}
            />
          </div>

          <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl group focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all">
            <Folder className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar text-sm font-medium text-slate-600">
              {currentPath === "HOME" ? (
                <span className="px-2 font-black uppercase tracking-widest text-blue-600">
                  This Device
                </span>
              ) : (
                currentPath
                  .split("/")
                  .filter(Boolean)
                  .map((part, i, arr) => (
                    <React.Fragment key={i}>
                      <button
                        onClick={() =>
                          navigateTo("/" + arr.slice(0, i + 1).join("/"))
                        }
                        className="hover:text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {part}
                      </button>
                      {i < arr.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                      )}
                    </React.Fragment>
                  ))
              )}
              {currentPath === "/" && <span className="px-2">Gốc (Root)</span>}
            </div>
          </div>

          {currentPath !== "HOME" && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all w-48 shrink-0">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full text-slate-600 font-medium placeholder-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 shrink-0">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleNewFolder}
              disabled={currentPath === "HOME"}
              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 transition-all shadow-sm disabled:opacity-30"
              title="Thư mục mới"
            >
              <FolderPlus size={18} />
            </button>
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
              title="Tải tệp từ máy tính lên thư mục hiện tại"
            >
              <Upload size={16} />
              <span>Tải lên</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILE LIST / HOME VIEW */}
      <div
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
        className="flex-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl rounded-3xl border border-white/50 dark:border-slate-800 shadow-xl shadow-blue-900/5 flex flex-col relative z-0 overflow-hidden"
      >
        {/* Drop zone overlay inside FileManager */}
        {isFileDragging && (
          <div
            onDragOver={handleFileDragOver}
            onDragLeave={handleFileDragLeave}
            onDrop={handleFileDrop}
            className="absolute inset-0 z-50 bg-blue-600/90 dark:bg-blue-700/90 backdrop-blur-md border-4 border-dashed border-white rounded-3xl m-3 flex flex-col items-center justify-center gap-3 text-white pointer-events-auto animate-in fade-in zoom-in-95 duration-150 select-none"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-xl animate-bounce">
              <Upload className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold">Thả tệp vào đây để tải lên điện thoại</h4>
            <p className="text-sm text-blue-100 font-medium">
              Vị trí lưu: <span className="font-mono bg-white/20 px-2.5 py-1 rounded-lg text-white font-bold">{currentPath === "HOME" ? "/sdcard/Download" : currentPath}</span>
            </p>
          </div>
        )}
        {currentPath === "HOME" ? (
          renderHomeView()
        ) : (
          <>
            <div className="grid grid-cols-12 gap-3 px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 shrink-0 items-center select-none text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-7 flex items-center gap-3">
                {/* Checkbox chọn tất cả */}
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                    isAllSelected
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : isSomeSelected
                        ? "bg-blue-500 border-blue-500 text-white shadow-sm"
                        : "border-slate-300 dark:border-slate-600 hover:border-blue-500 bg-white dark:bg-slate-700"
                  }`}
                  title={isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả (Ctrl+A)"}
                >
                  {isAllSelected && <Check size={12} strokeWidth={3} />}
                  {isSomeSelected && <Minus size={12} strokeWidth={3} />}
                </button>
                <span>Tên tệp</span>
                {selectedFiles.size > 0 && (
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 normal-case bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                    Đã chọn {selectedFiles.size}/{filteredFiles.length}
                  </span>
                )}
              </div>
              <div className="col-span-2">
                Kích thước
              </div>
              <div className="col-span-3 text-right">
                Ngày sửa đổi
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading && files.length === 0 ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-12 bg-slate-100/50 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : loadError ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-sm border border-red-100">
                    <X size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-2">
                    Lỗi truy cập thư mục
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mb-6 text-center max-w-sm">
                    {loadError}
                  </p>
                  <button
                    onClick={() => loadFiles(loadError)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                  >
                    <RefreshCcw size={16} />
                    <span>Thử lại (Retry)</span>
                  </button>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                  <Folder className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Thư mục trống</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 min-h-full pb-32">
                  {paginatedFiles.map((file) => {
                    const isSelected = selectedFiles.has(file.name);
                    return (
                      <div
                        key={file.name}
                        className={`grid grid-cols-12 gap-3 px-6 py-2.5 items-center transition-all cursor-pointer group border-b border-slate-50 dark:border-slate-800/40 ${
                          isSelected
                            ? "bg-blue-50/90 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border-blue-100 dark:border-blue-900/50"
                            : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-200"
                        }`}
                        onClick={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            toggleSelectFile(file.name);
                          } else if (e.shiftKey) {
                            e.preventDefault();
                            rangeSelectFiles(file.name);
                          } else {
                            file.isDir
                              ? navigateTo(`${currentPath}/${file.name}`)
                              : navigateTo(`${currentPath}/${file.name}`, true);
                          }
                        }}
                        onDoubleClick={() =>
                          file.isDir &&
                          navigateTo(`${currentPath}/${file.name}`)
                        }
                      >
                        <div className="col-span-7 flex items-center gap-3 truncate">
                          {/* Row Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (e.shiftKey) {
                                rangeSelectFiles(file.name);
                              } else {
                                toggleSelectFile(file.name);
                              }
                            }}
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                : "border-slate-300 dark:border-slate-600 hover:border-blue-500 bg-white dark:bg-slate-700 opacity-60 group-hover:opacity-100"
                            }`}
                            title={isSelected ? "Bỏ chọn" : "Chọn tệp"}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </button>

                          <div className="shrink-0">{getFileIcon(file)}</div>

                          <div className="flex flex-col truncate min-w-0">
                            <span
                              className={`text-sm truncate ${isSelected ? "font-bold text-blue-700 dark:text-blue-300" : "font-semibold"}`}
                            >
                              {file.name}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">
                                Đã chọn
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="col-span-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {file.isDir ? "--" : formatSize(file.size)}
                        </div>

                        <div className="col-span-3 text-xs font-medium text-slate-400 text-right group-hover:hidden">
                          {formatDate(file.mtime)}
                        </div>

                        {/* Hover Actions */}
                        <div className="col-span-3 hidden group-hover:flex items-center justify-end gap-1.5 animate-in fade-in duration-150">
                          {!file.isDir && (
                            <ActionBtn
                              icon={<Download />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file);
                              }}
                              color="hover:bg-blue-100 text-blue-600"
                              title="Tải về máy tính"
                            />
                          )}

                          {/* 2-Step Row Delete Button */}
                          {confirmDeleteFile === file.name ? (
                            <button
                              onClick={(e) => handleSingleDeleteClick(e, file.name)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-md shadow-red-600/30 animate-pulse transition-all active:scale-95"
                              title="Bấm lần nữa để xóa hẳn ngay!"
                            >
                              <AlertTriangle size={13} />
                              <span>Xóa hẳn?</span>
                            </button>
                          ) : (
                            <ActionBtn
                              icon={<Trash2 />}
                              onClick={(e) => handleSingleDeleteClick(e, file.name)}
                              color="hover:bg-red-100 text-red-600 hover:text-red-700"
                              title="Bấm để xóa (Cần bấm 2 lần xác nhận)"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 py-8">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="text-xs font-bold text-slate-500">
                        Trang {page} / {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* FOOTER / SELECTION BAR */}
        <AnimatePresence>
          {selectedFiles.size > 0 && (
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.95 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-2xl text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-4 z-50 border border-white/10 select-none ring-1 ring-black/20"
            >
              <div className="flex items-center gap-2.5 border-r border-white/15 pr-4">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-black shadow-inner">
                  {selectedFiles.size}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Đã chọn
                </span>
              </div>

              <button
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                {isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>

              <div className="w-px h-4 bg-white/15" />

              {/* 2-Step Bulk Delete Button */}
              {confirmBulkDelete ? (
                <button
                  onClick={handleBulkDeleteClick}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/40 ring-2 ring-red-400 animate-pulse active:scale-95"
                  title="Bấm lần nữa để xóa hẳn tất cả mục đã chọn"
                >
                  <AlertTriangle size={14} />
                  <span>Bấm lại để xóa hẳn ({selectedFiles.size}) mục!</span>
                </button>
              ) : (
                <button
                  onClick={handleBulkDeleteClick}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-500/15 hover:bg-red-600 text-red-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-red-500/30 hover:border-transparent active:scale-95"
                  title="Xóa các mục đã chọn (Bấm 2 lần)"
                >
                  <Trash2 size={14} />
                  <span>Xóa ({selectedFiles.size})</span>
                </button>
              )}

              <div className="w-px h-4 bg-white/15" />

              <button
                onClick={() => {
                  setSelectedFiles(new Set());
                  clearConfirmTimers();
                }}
                className="text-xs font-semibold text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Bỏ chọn (Esc)"
              >
                Hủy
              </button>
            </motion.div>
          )}
        </AnimatePresence>


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
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-blue-400/20">
                    <ImageIcon size={22} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-base font-black text-white tracking-tight leading-none mb-1.5 drop-shadow-md">
                      {previewImage.name}
                    </h3>
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] drop-shadow-sm">
                      Đang xem ảnh chất lượng cao
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/10 shadow-xl">
                    <button
                      onClick={handleZoomOut}
                      title="Thu nhỏ"
                      className="p-2 hover:bg-white/20 text-white rounded-xl transition-all active:scale-90"
                    >
                      <Minus size={20} />
                    </button>
                    <div className="px-4 text-xs font-black text-blue-400 min-w-[70px] text-center tracking-tighter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] bg-blue-400/10 py-1 rounded-lg border border-blue-400/20">
                      {Math.round(zoom * 100)}%
                    </div>
                    <button
                      onClick={handleZoomIn}
                      title="Phóng to"
                      className="p-2 hover:bg-white/20 text-white rounded-xl transition-all active:scale-90"
                    >
                      <Plus size={20} />
                    </button>
                    <div className="w-px h-5 bg-white/20 mx-1" />
                    <button
                      onClick={handleResetZoom}
                      title="Mặc định"
                      className="p-2 hover:bg-white/20 text-white rounded-xl transition-all active:scale-90"
                    >
                      <RefreshCcw size={16} />
                    </button>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="p-3.5 bg-red-500/10 hover:bg-red-500 text-white rounded-2xl border border-red-500/20 transition-all active:scale-90 group shadow-lg shadow-red-500/10"
                  >
                    <X
                      size={26}
                      className="group-hover:rotate-90 transition-transform duration-300"
                    />
                  </button>
                </div>
              </motion.div>

              {/* Full-Screen Content Area */}
              <div
                className="relative flex-1 overflow-hidden flex items-center justify-center p-0"
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => {
                  if (e.deltaY < 0) handleZoomIn();
                  else handleZoomOut();
                }}
              >
                <div className="w-full h-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing">
                  <motion.img
                    key={previewImage.data}
                    drag={zoom > 1}
                    dragConstraints={{
                      left: -2000,
                      right: 2000,
                      top: -2000,
                      bottom: 2000,
                    }}
                    dragElastic={0.1}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                      opacity: 1,
                      scale: zoom,
                    }}
                    src={previewImage.data}
                    alt={previewImage.name}
                    className="max-w-[95vw] max-h-[85vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out pointer-events-auto"
                    style={{ transformOrigin: "center" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NavBtn({
  icon,
  onClick,
  disabled,
  loading,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`p-2 rounded-lg transition-all ${disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-white hover:text-blue-600 hover:shadow-sm active:scale-90 text-slate-500"}`}
    >
      {loading ? (
        <RefreshCcw className="w-4 h-4 animate-spin" />
      ) : (
        React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })
      )}
    </button>
  );
}

function ActionBtn({
  icon,
  onClick,
  color,
  title,
}: {
  icon: React.ReactElement;
  onClick: (e: React.MouseEvent) => void;
  color: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${color}`}
    >
      {React.cloneElement(icon, { className: "w-4 h-4" })}
    </button>
  );
}
