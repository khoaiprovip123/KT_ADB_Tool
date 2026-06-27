import { useState, useEffect, useMemo, useCallback } from "react";
import { useDeviceStore } from "../../../store/deviceStore";
import { useAdbWithRetry } from "../../../hooks/useAdbWithRetry";
import { handleAdbError, showErrorToast } from "../../../utils/errorHandler";
import { toast } from "../../../store/toastStore";
import { BloatwareEntry } from "../types";
import {
  validateDpi,
  validateResolution,
  validatePackageName,
  escapeShell,
} from "../../../utils/validation";

export function useSystemTweaks() {
  const { activeDevice, addLog } = useDeviceStore();

  // Common loading states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Debloat States
  const [bloatListWithStatus, setBloatListWithStatus] = useState<BloatwareEntry[]>([]);
  const [debloatSearch, setDebloatSearch] = useState("");
  const [selectedBloat, setSelectedBloat] = useState<Set<string>>(new Set());

  // Batch progress
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    action: string;
  } | null>(null);
  const [batchResult, setBatchResult] = useState<{
    success: number;
    fail: number;
    skipped: number;
    lastError?: string;
    action: string;
  } | null>(null);

  // Display/DPI States
  const [customDpi, setCustomDpi] = useState<number>(440);
  const [customW, setCustomW] = useState<number>(1080);
  const [customH, setCustomH] = useState<number>(2400);
  const [deviceDpi, setDeviceDpi] = useState<number | null>(null);
  const [deviceW, setDeviceW] = useState<number | null>(null);
  const [deviceH, setDeviceH] = useState<number | null>(null);

  // Speed States
  const [animScale, setAnimScale] = useState<number>(0.5);

  // Security / Privacy States
  const [telemetryBlocked, setTelemetryBlocked] = useState(false);
  const [developerOptionsEnabled, setDeveloperOptionsEnabled] = useState(true);
  const [usbDebuggingSafe, setUsbDebuggingSafe] = useState(true);
  const [unknownSourcesBlocked, setUnknownSourcesBlocked] = useState(false);
  const [cloudBackupBlocked, setCloudBackupBlocked] = useState(false);
  const [verifyAdbInstallsEnabled, setVerifyAdbInstallsEnabled] = useState(false);

  // Gaming / FPS States
  const [fpsOverlayEnabled, setFpsOverlayEnabled] = useState(false);
  const [gameModeEnabled, setGameModeEnabled] = useState(false);
  const [hwAccelerationEnabled, setHwAccelerationEnabled] = useState(false);

  // Interaction / Controls States
  const [showTouches, setShowTouches] = useState(false);
  const [pointerLocation, setPointerLocation] = useState(false);
  const [pointerSpeed, setPointerSpeed] = useState(0);

  // Multitasking & Notifications States
  const [bgLimit, setBgLimit] = useState<number>(-1);
  const [alwaysFinish, setAlwaysFinish] = useState<boolean>(false);
  const [phantomOptimizer, setPhantomOptimizer] = useState<boolean>(false);

  const { executeWithRetry } = useAdbWithRetry();

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    if (type === "error") {
      toast.error(msg);
    } else {
      toast.success(msg);
    }
  };

  const withRetry = useCallback(
    async <T,>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
      return executeWithRetry(fn, { maxRetries });
    },
    [executeWithRetry],
  );

  // Load all tweaks status and display metrics from actual device
  const loadData = useCallback(async () => {
    if (!activeDevice) return;
    setLoading(true);
    try {
      // 1. Debloat Packages
      const bloatData = await window.api.getBloatwareWithStatus(activeDevice);
      setBloatListWithStatus(bloatData);

      // 2. Display Metrics
      const dpi = await window.api.getDpi(activeDevice);
      const res = await window.api.getResolution(activeDevice);
      if (dpi) {
        setCustomDpi(dpi);
        setDeviceDpi(dpi);
      }
      if (res) {
        setCustomW(res.width);
        setCustomH(res.height);
        setDeviceW(res.width);
        setDeviceH(res.height);
      }

      // 3. System Tweaks Status
      const tweakStatus = await window.api.getTweaksStatus(activeDevice);

      // Map security states
      setTelemetryBlocked(
        !!(tweakStatus["disable_analytics"] && tweakStatus["disable_msa"])
      );

      try {
        const sourcesRes = await window.api.runAdbCommand(
          activeDevice,
          "shell settings get secure install_non_market_apps"
        );
        if (sourcesRes.success) {
          setUnknownSourcesBlocked(sourcesRes.output.trim() === "0");
        }
      } catch {
        /* ignore */
      }

      try {
        const backupRes = await window.api.runAdbCommand(
          activeDevice,
          "shell settings get secure backup_enabled"
        );
        if (backupRes.success) {
          setCloudBackupBlocked(backupRes.output.trim() === "0");
        }
      } catch {
        /* ignore */
      }

      try {
        const verifyRes = await window.api.runAdbCommand(
          activeDevice,
          "shell settings get global verifier_verify_adb_installs"
        );
        if (verifyRes.success) {
          setVerifyAdbInstallsEnabled(verifyRes.output.trim() === "1");
        }
      } catch {
        /* ignore */
      }

      // Read current animation scale if any
      setFpsOverlayEnabled(!!tweakStatus["fps_overlay"]);
      setHwAccelerationEnabled(!!tweakStatus["force_gpu"]);
      setGameModeEnabled(!!tweakStatus["miui_optimization"]);

      // 4. Multitasking & Notification States
      try {
        const limitRes = await window.api.runAdbCommand(
          activeDevice,
          "shell settings get global background_process_limit"
        );
        if (limitRes.success) {
          const val = limitRes.output.trim();
          setBgLimit(
            val === "null" || val === "" || val === "-1" ? -1 : Number(val)
          );
        }
      } catch {
        /* ignore */
      }

      try {
        const finishRes = await window.api.runAdbCommand(
          activeDevice,
          "shell settings get global always_finish_activities"
        );
        if (finishRes.success) {
          setAlwaysFinish(finishRes.output.trim() === "1");
        }
      } catch {
        /* ignore */
      }

      try {
        const phantomRes = await window.api.runAdbCommand(
          activeDevice,
          "shell device_config get activity_manager max_phantom_processes"
        );
        if (phantomRes.success) {
          setPhantomOptimizer(phantomRes.output.trim() === "32");
        }
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error("Failed to load tweaks data:", err);
    } finally {
      setLoading(false);
    }
  }, [activeDevice]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Setup batch progress listener
  useEffect(() => {
    let unsub: (() => void) | null = null;
    if (activeDevice) {
      unsub = window.api.onBatchProgress((data) => {
        setBatchProgress((prev) =>
          prev ? { ...prev, current: data.done, total: data.total } : null
        );
      });
    }
    return () => unsub?.();
  }, [activeDevice]);

  // Filtered Debloat List
  const filteredBloat = useMemo(() => {
    let list = bloatListWithStatus;

    if (debloatSearch) {
      const q = debloatSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.package.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [bloatListWithStatus, debloatSearch]);

  // Selection helpers
  const toggleSelect = (pkg: string, classification: string) => {
    if (classification === "KEEP") return; // Safety lock
    const newSet = new Set(selectedBloat);
    if (newSet.has(pkg)) newSet.delete(pkg);
    else newSet.add(pkg);
    setSelectedBloat(newSet);
  };

  const selectAllSelectable = () => {
    const selectable = filteredBloat.filter((p) => p.risk !== "KEEP");
    if (selectedBloat.size === selectable.length && selectable.length > 0) {
      setSelectedBloat(new Set());
    } else {
      setSelectedBloat(new Set(selectable.map((p) => p.package)));
    }
  };

  // Single debloat operation
  const handleSingleDebloatAction = async (
    pkg: string,
    action: "uninstall" | "disable" | "restore"
  ) => {
    const matched = bloatListWithStatus.find((p) => p.package === pkg);
    if (!matched) return;

    if (action === "uninstall" && matched.risk === "RISKY") {
      if (
        !window.confirm(
          `CẢNH BÁO: Gói ${pkg} được đánh giá ở mức RỦI RO (RISKY). Bạn vẫn muốn tiếp tục?`
        )
      )
        return;
    }

    setActionLoading(`${action}-${pkg}`);
    try {
      const res = await window.api.debloatPackage(
        activeDevice!,
        pkg,
        action,
        matched.preferDisable ?? false
      );
      if (res.success) {
        toast.success(`Thao tác [${action}] thành công với gói: ${pkg}`);
        await loadData();
      } else {
        toast.error(`Lỗi: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Batch debloat operation
  const handleBatchDebloatAction = async (
    action: "uninstall" | "disable" | "restore"
  ) => {
    if (selectedBloat.size === 0) return;
    const count = selectedBloat.size;

    if (action === "uninstall") {
      const hasRisky = bloatListWithStatus.some(
        (p) => selectedBloat.has(p.package) && p.risk === "RISKY"
      );
      const msg = hasRisky
        ? `CẢNH BÁO NGUY HIỂM: Một vài ứng dụng được chọn có phân loại RỦI RO (RISKY). Gỡ cài đặt có thể làm mất tính năng hệ thống. Tiếp tục gỡ ${count} ứng dụng?`
        : `Xác nhận gỡ cài đặt ${count} ứng dụng rác đã chọn?`;
      if (!window.confirm(msg)) return;
    } else {
      if (
        !window.confirm(
          `Xác nhận thực hiện [${action}] trên ${count} ứng dụng đã chọn?`
        )
      )
        return;
    }

    const appsToProcess = Array.from(selectedBloat).map((pkg) => {
      const matched = bloatListWithStatus.find((p) => p.package === pkg);
      return { package: pkg, preferDisable: matched?.preferDisable };
    });

    setBatchProgress({ current: 0, total: appsToProcess.length, action });
    try {
      const results = await window.api.batchDebloat(
        activeDevice!,
        appsToProcess,
        action
      );
      const successCount = results.filter(
        (r: { package: string; success: boolean; message: string }) => r.success
      ).length;
      const failCount = results.length - successCount;

      setBatchResult({
        success: successCount,
        fail: failCount,
        skipped: 0,
        lastError: failCount > 0 ? "Một số package xử lý thất bại" : undefined,
        action,
      });
      setSelectedBloat(new Set());
      await loadData();
    } catch (err: any) {
      toast.error(`Lỗi hàng loạt: ${err.message}`);
    } finally {
      setBatchProgress(null);
    }
  };

  // --- Display & DPI command execution ---
  const applyDpi = async (dpi: number) => {
    if (!activeDevice) return;
    const validation = validateDpi(dpi);
    if (!validation.valid) {
      toast.error(validation.error!);
      return;
    }
    setActionLoading("apply-dpi");
    try {
      const res = await executeWithRetry(
        () => window.api.setDpi(activeDevice, dpi),
        {
          maxRetries: 3,
          onRetry: (attempt) => {
            addLog(`[RETRY ${attempt}] setDpi - waiting...`);
          },
        }
      );
      if (res.success) {
        setCustomDpi(dpi);
        setDeviceDpi(dpi);
        toast.success(res.message);
      } else {
        toast.error(`Thất bại: ${res.message}`);
      }
    } catch (error) {
      const adbError = handleAdbError(error);
      addLog(`[ERROR] setDpi failed: ${adbError.message}`);
      showErrorToast(adbError);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetDpi = async () => {
    if (!activeDevice) return;
    setActionLoading("reset-dpi");
    try {
      const res = await window.api.resetDpi(activeDevice);
      if (res.success) {
        showToast(res.message);
        await loadData();
      } else {
        showToast(`Thất bại: ${res.message}`, "error");
      }
    } catch (e: any) {
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const applyResolution = async () => {
    if (!activeDevice) return;
    const validation = validateResolution(customW, customH);
    if (!validation.valid) {
      toast.error(validation.error!);
      return;
    }
    setActionLoading("apply-res");
    try {
      const res = await executeWithRetry(
        () => window.api.setResolution(activeDevice, customW, customH),
        { maxRetries: 3 }
      );
      if (res.success) {
        setDeviceW(customW);
        setDeviceH(customH);
        toast.success(res.message);
      } else {
        toast.error(`Thất bại: ${res.message}`);
      }
    } catch (error) {
      showErrorToast(error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetResolution = async () => {
    if (!activeDevice) return;
    setActionLoading("reset-res");
    try {
      const res = await window.api.resetResolution(activeDevice);
      if (res.success) {
        showToast(res.message);
        await loadData();
      } else {
        showToast(`Thất bại: ${res.message}`, "error");
      }
    } catch (e: any) {
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  // --- Animations Speed commands ---
  const applyAnimations = async (scale: number) => {
    if (!activeDevice) return;
    setActionLoading("apply-anim");
    try {
      await window.api.setAnimationScale(activeDevice, scale as any);
      setAnimScale(scale);
      showToast(`Đã cấu hình hoạt ảnh hệ thống: ${scale}x.`);
    } catch (e: any) {
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  // --- Security & Privacy Commands ---
  const toggleTelemetry = async (enable: boolean) => {
    if (!activeDevice) return;
    setTelemetryBlocked(enable);
    setActionLoading("telemetry");
    try {
      await Promise.all([
        window.api.applyTweak(activeDevice, "disable_analytics", enable),
        window.api.applyTweak(activeDevice, "disable_msa", enable),
        window.api.applyTweak(activeDevice, "ad_id_limit", enable),
        window.api.applyTweak(activeDevice, "disable_daemon", enable),
        window.api.applyTweak(activeDevice, "disable_quickapp", enable),
      ]);
      showToast(
        enable
          ? "Đã tắt thu thập dữ liệu & chặn ID quảng cáo."
          : "Đã bật lại theo dõi quảng cáo gốc."
      );
    } catch (e: any) {
      setTelemetryBlocked(!enable);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleDeveloperOptions = async (enable: boolean) => {
    if (!activeDevice) return;
    setDeveloperOptionsEnabled(enable);
    setActionLoading("devoptions");
    try {
      await window.api.runAdbCommand(
        activeDevice,
        `settings put global development_settings_enabled ${enable ? "1" : "0"}`
      );
      showToast(
        enable
          ? "Đã kích hoạt Tùy chọn nhà phát triển."
          : "Đã ẩn Tùy chọn nhà phát triển."
      );
    } catch (e: any) {
      setDeveloperOptionsEnabled(!enable);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUsbDebuggingSafe = async (enable: boolean) => {
    if (!activeDevice) return;
    setUsbDebuggingSafe(enable);
    setActionLoading("usbdebugsafe");
    try {
      await window.api.runAdbCommand(
        activeDevice,
        `settings put global adb_wifi_enabled ${enable ? "1" : "0"}`
      );
      showToast(
        enable
          ? "Đã tối ưu hóa kết nối ADB không dây an toàn."
          : "Đã tắt tối ưu adb wifi."
      );
    } catch (e: any) {
      setUsbDebuggingSafe(!enable);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUnknownSourcesBlocked = async (enable: boolean) => {
    if (!activeDevice) return;
    setUnknownSourcesBlocked(enable);
    setActionLoading("unknownsources");
    try {
      await window.api.runAdbCommand(
        activeDevice,
        `settings put secure install_non_market_apps ${enable ? "0" : "1"}`
      );
      showToast(
        enable
          ? "Đã khóa quyền cài đặt ứng dụng từ nguồn không xác định."
          : "Đã mở quyền cài đặt từ nguồn không xác định."
      );
    } catch (e: any) {
      setUnknownSourcesBlocked(!enable);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleCloudBackupBlocked = async (enable: boolean) => {
    if (!activeDevice) return;
    setCloudBackupBlocked(enable);
    setActionLoading("cloudbackup");
    try {
      await window.api.runAdbCommand(
        activeDevice,
        `settings put secure backup_enabled ${enable ? "0" : "1"}`
      );
      showToast(
        enable
          ? "Đã chặn tự động sao lưu dữ liệu ngầm lên Google Cloud."
          : "Đã bật lại sao lưu Google Cloud."
      );
    } catch (e: any) {
      setCloudBackupBlocked(!enable);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleVerifyAdbInstalls = async (enable: boolean) => {
    if (!activeDevice) return;
    setVerifyAdbInstallsEnabled(enable);
    setActionLoading("verifyadb");
    try {
      await window.api.runAdbCommand(
        activeDevice,
        `settings put global verifier_verify_adb_installs ${enable ? "1" : "0"}`
      );
      showToast(
        enable
          ? "Đã kích hoạt quét bảo mật ứng dụng cài qua USB."
          : "Đã tắt quét bảo mật ứng dụng cài qua USB."
      );
    } catch (e: any) {
      setVerifyAdbInstallsEnabled(!enable);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  // --- Gaming & FPS Commands ---
  const toggleFpsOverlay = async (enable: boolean) => {
    if (!activeDevice) return;
    setFpsOverlayEnabled(enable);
    setActionLoading("fps");
    try {
      await window.api.applyTweak(activeDevice, "fps_overlay", enable);
      showToast(
        enable
          ? "Đã hiển thị tần số quét / FPS lên màn hình."
          : "Đã ẩn tần số quét."
      );
    } catch (e: any) {
      setFpsOverlayEnabled(!enable);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleGameMode = async (enable: boolean) => {
    if (!activeDevice) return;
    setGameModeEnabled(enable);
    setActionLoading("gamemode");
    try {
      await window.api.applyTweak(activeDevice, "miui_optimization", !enable);
      showToast(
        enable
          ? "Đã tối ưu RAM & phân bổ CPU tối đa cho chế độ Game."
          : "Đã tắt Game Mode."
      );
    } catch (e: any) {
      setGameModeEnabled(!enable);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleHwAcceleration = async (enable: boolean) => {
    if (!activeDevice) return;
    setHwAccelerationEnabled(enable);
    setActionLoading("hwaccel");
    try {
      await window.api.applyTweak(activeDevice, "force_gpu", enable);
      showToast(
        enable
          ? "Đã kích hoạt ép buộc kết xuất GPU (Skia) 2D."
          : "Đã tắt ép buộc kết xuất GPU."
      );
    } catch (e: any) {
      setHwAccelerationEnabled(!enable);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  // --- Controls & Touch Commands ---
  const toggleShowTouches = async (enable: boolean) => {
    if (!activeDevice) return;
    setShowTouches(enable);
    setActionLoading("showtouches");
    try {
      await window.api.runAdbCommand(
        activeDevice,
        `settings put system show_touches ${enable ? "1" : "0"}`
      );
      showToast(
        enable
          ? "Đã bật hiển thị điểm chạm khi nhấn màn hình."
          : "Đã ẩn điểm chạm."
      );
    } catch (e: any) {
      setShowTouches(!enable);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const togglePointerLocation = async (enable: boolean) => {
    if (!activeDevice) return;
    setPointerLocation(enable);
    setActionLoading("pointerlocation");
    try {
      await window.api.runAdbCommand(
        activeDevice,
        `settings put system pointer_location ${enable ? "1" : "0"}`
      );
      showToast(
        enable
          ? "Đã bật đường vẽ tọa độ con trỏ cảm ứng."
          : "Đã tắt đường vẽ tọa độ."
      );
    } catch (e: any) {
      setPointerLocation(!enable);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const applyPointerSpeed = async (speed: number) => {
    if (!activeDevice) return;
    setActionLoading("pointerspeed");
    try {
      await window.api.runAdbCommand(
        activeDevice,
        `settings put system pointer_speed ${speed}`
      );
      setPointerSpeed(speed);
      showToast(`Đã đổi tốc độ con trỏ chuột/cảm ứng thành: ${speed}`);
    } catch (e: any) {
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const fixNotificationDelay = async (pkg: string) => {
    if (!activeDevice || !pkg) return;
    if (!validatePackageName(pkg)) {
      toast.error("Tên gói ứng dụng không hợp lệ!");
      return;
    }
    setActionLoading("fix_notify");
    addLog(`[ACTION] Bắt đầu sửa trễ thông báo cho: ${pkg}`);
    try {
      const safePkg = escapeShell(pkg);

      addLog(`[EXEC] shell dumpsys deviceidle whitelist +${safePkg}`);
      const res1 = await executeWithRetry(
        () =>
          window.api.runAdbCommand(
            activeDevice,
            `shell dumpsys deviceidle whitelist +${safePkg}`
          ),
        { maxRetries: 2 }
      );
      addLog(`[RESULT] ${res1.output.trim() || "Success"}`);

      addLog(`[EXEC] shell cmd appops set ${safePkg} RUN_IN_BACKGROUND allow`);
      const res2 = await executeWithRetry(
        () =>
          window.api.runAdbCommand(
            activeDevice,
            `shell cmd appops set ${safePkg} RUN_IN_BACKGROUND allow`
          ),
        { maxRetries: 2 }
      );
      addLog(`[RESULT] ${res2.output.trim() || "Success"}`);

      addLog(`[EXEC] shell am set-standby-bucket ${safePkg} active`);
      const res3 = await executeWithRetry(
        () =>
          window.api.runAdbCommand(
            activeDevice,
            `shell am set-standby-bucket ${safePkg} active`
          ),
        { maxRetries: 2 }
      );
      addLog(`[RESULT] ${res3.output.trim() || "Success"}`);

      addLog(
        `[SUCCESS] Đã hoàn tất cấu hình tối ưu thông báo & chạy nền cho ${pkg}`
      );
      toast.success(`Đã tối ưu thông báo & chạy nền cho gói: ${pkg}`);
    } catch (error) {
      const adbError = handleAdbError(error);
      addLog(`[ERROR] ${adbError.message}`);
      showErrorToast(adbError);
    } finally {
      setActionLoading(null);
    }
  };

  const freezeBackgroundApp = async (pkg: string) => {
    if (!activeDevice || !pkg) return;
    if (!validatePackageName(pkg)) {
      showToast("Tên gói ứng dụng không hợp lệ!", "error");
      return;
    }
    setActionLoading("freeze_bg");
    addLog(`[ACTION] Chặn chạy ngầm (Đóng băng) gói ứng dụng: ${pkg}`);
    try {
      const safePkg = escapeShell(pkg);
      addLog(`[EXEC] shell cmd appops set ${safePkg} RUN_IN_BACKGROUND ignore`);
      const res1 = await withRetry(() =>
        window.api.runAdbCommand(
          activeDevice,
          `shell cmd appops set ${safePkg} RUN_IN_BACKGROUND ignore`
        )
      );
      addLog(`[RESULT] ${res1.output.trim() || "Success"}`);

      addLog(`[EXEC] shell am set-standby-bucket ${safePkg} restricted`);
      const res2 = await withRetry(() =>
        window.api.runAdbCommand(
          activeDevice,
          `shell am set-standby-bucket ${safePkg} restricted`
        )
      );
      addLog(`[RESULT] ${res2.output.trim() || "Success"}`);

      addLog(`[SUCCESS] Đã đóng băng thành công chạy ngầm của ${pkg}`);
      showToast(`Đã đóng băng chạy nền cho gói: ${pkg}`);
    } catch (e: any) {
      addLog(`[ERROR] Đóng băng thất bại: ${e.message}`);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const unfreezeBackgroundApp = async (pkg: string) => {
    if (!activeDevice || !pkg) return;
    if (!validatePackageName(pkg)) {
      showToast("Tên gói ứng dụng không hợp lệ!", "error");
      return;
    }
    setActionLoading("unfreeze_bg");
    addLog(`[ACTION] Khôi phục chạy ngầm cho gói ứng dụng: ${pkg}`);
    try {
      const safePkg = escapeShell(pkg);
      addLog(`[EXEC] shell cmd appops set ${safePkg} RUN_IN_BACKGROUND allow`);
      const res1 = await withRetry(() =>
        window.api.runAdbCommand(
          activeDevice,
          `shell cmd appops set ${safePkg} RUN_IN_BACKGROUND allow`
        )
      );
      addLog(`[RESULT] ${res1.output.trim() || "Success"}`);

      addLog(`[EXEC] shell am set-standby-bucket ${safePkg} active`);
      const res2 = await withRetry(() =>
        window.api.runAdbCommand(
          activeDevice,
          `shell am set-standby-bucket ${safePkg} active`
        )
      );
      addLog(`[RESULT] ${res2.output.trim() || "Success"}`);

      addLog(`[SUCCESS] Đã mở băng thành công cho ${pkg}`);
      showToast(`Đã khôi phục chạy nền cho gói: ${pkg}`);
    } catch (e: any) {
      addLog(`[ERROR] Mở băng thất bại: ${e.message}`);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const applyBgLimit = async (limit: number) => {
    if (!activeDevice) return;
    setActionLoading("bg_limit");
    addLog(
      `[ACTION] Thiết lập giới hạn tiến trình nền về: ${limit === -1 ? "Mặc định" : limit}`
    );
    try {
      if (limit === -1) {
        addLog(`[EXEC] shell settings delete global background_process_limit`);
        const res = await window.api.runAdbCommand(
          activeDevice,
          `shell settings delete global background_process_limit`
        );
        addLog(`[RESULT] ${res.output.trim() || "Success"}`);
        showToast("Đã thiết lập giới hạn đa nhiệm về mặc định của Android.");
      } else {
        addLog(
          `[EXEC] shell settings put global background_process_limit ${limit}`
        );
        const res = await window.api.runAdbCommand(
          activeDevice,
          `shell settings put global background_process_limit ${limit}`
        );
        addLog(`[RESULT] ${res.output.trim() || "Success"}`);
        showToast(
          `Đã giới hạn số tiến trình chạy nền tối đa: ${limit} tiến trình.`
        );
      }
      setBgLimit(limit);
      addLog(`[SUCCESS] Đồng bộ cài đặt giới hạn tiến trình nền thành công`);
    } catch (e: any) {
      addLog(`[ERROR] Thiết lập giới hạn chạy nền thất bại: ${e.message}`);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleAlwaysFinish = async (enable: boolean) => {
    if (!activeDevice) return;
    setAlwaysFinish(enable);
    setActionLoading("always_finish");
    addLog(
      `[ACTION] ${enable ? "Bật" : "Tắt"} tính năng Không giữ hoạt động (always_finish_activities)`
    );
    try {
      addLog(
        `[EXEC] shell settings put global always_finish_activities ${enable ? "1" : "0"}`
      );
      const res = await window.api.runAdbCommand(
        activeDevice,
        `shell settings put global always_finish_activities ${enable ? "1" : "0"}`
      );
      addLog(`[RESULT] ${res.output.trim() || "Success"}`);
      addLog(
        `[SUCCESS] Đã thay đổi trạng thái always_finish_activities thành ${enable}`
      );
      showToast(
        enable
          ? "Đã bật chế độ hủy ngay tiến trình khi thoát (tiết kiệm RAM)."
          : "Đã tắt chế độ hủy tiến trình (Đa nhiệm bình thường)."
      );
    } catch (e: any) {
      setAlwaysFinish(!enable);
      addLog(
        `[ERROR] Cấu hình always_finish_activities thất bại: ${e.message}`
      );
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const togglePhantomOptimizer = async (enable: boolean) => {
    if (!activeDevice) return;
    setPhantomOptimizer(enable);
    setActionLoading("phantom");
    addLog(
      `[ACTION] ${enable ? "Tối ưu hóa" : "Khôi phục"} giới hạn Phantom Processes (Android 12+)`
    );
    try {
      if (enable) {
        addLog(
          `[EXEC] shell device_config put activity_manager max_phantom_processes 32`
        );
        const res1 = await window.api.runAdbCommand(
          activeDevice,
          `shell device_config put activity_manager max_phantom_processes 32`
        );
        addLog(`[RESULT] ${res1.output.trim() || "Success"}`);
        addLog(
          `[EXEC] shell device_config set_sync_disabled_for_tests persistent`
        );
        const res2 = await window.api.runAdbCommand(
          activeDevice,
          `shell "/system/bin/device_config set_sync_disabled_for_tests persistent"`
        );
        addLog(`[RESULT] ${res2.output.trim() || "Success"}`);
      } else {
        addLog(
          `[EXEC] shell device_config delete activity_manager max_phantom_processes`
        );
        const res1 = await window.api.runAdbCommand(
          activeDevice,
          `shell device_config delete activity_manager max_phantom_processes`
        );
        addLog(`[RESULT] ${res1.output.trim() || "Success"}`);
        addLog(`[EXEC] shell device_config set_sync_disabled_for_tests none`);
        const res2 = await window.api.runAdbCommand(
          activeDevice,
          `shell "/system/bin/device_config set_sync_disabled_for_tests none"`
        );
        addLog(`[RESULT] ${res2.output.trim() || "Success"}`);
      }
      addLog(`[SUCCESS] Cấu hình Phantom Processes thành công`);
      showToast(
        enable
          ? "Đã tăng giới hạn phantom processes lên 32."
          : "Đã khôi phục giới hạn phantom processes mặc định."
      );
    } catch (e: any) {
      setPhantomOptimizer(!enable);
      addLog(`[ERROR] Cấu hình Phantom Processes thất bại: ${e.message}`);
      showToast(`Thất bại: ${e.message}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  return {
    activeDevice,
    addLog,
    loading,
    actionLoading,
    bloatListWithStatus,
    debloatSearch,
    setDebloatSearch,
    selectedBloat,
    setSelectedBloat,
    batchProgress,
    batchResult,
    setBatchResult,
    customDpi,
    setCustomDpi,
    customW,
    setCustomW,
    customH,
    setCustomH,
    deviceDpi,
    deviceW,
    deviceH,
    animScale,
    telemetryBlocked,
    developerOptionsEnabled,
    usbDebuggingSafe,
    unknownSourcesBlocked,
    cloudBackupBlocked,
    verifyAdbInstallsEnabled,
    fpsOverlayEnabled,
    gameModeEnabled,
    hwAccelerationEnabled,
    showTouches,
    pointerLocation,
    pointerSpeed,
    setPointerSpeed,
    bgLimit,
    alwaysFinish,
    phantomOptimizer,
    loadData,
    toggleSelect,
    selectAllSelectable,
    handleSingleDebloatAction,
    handleBatchDebloatAction,
    applyDpi,
    handleResetDpi,
    applyResolution,
    handleResetResolution,
    applyAnimations,
    toggleTelemetry,
    toggleDeveloperOptions,
    toggleUsbDebuggingSafe,
    toggleUnknownSourcesBlocked,
    toggleCloudBackupBlocked,
    toggleVerifyAdbInstalls,
    toggleFpsOverlay,
    toggleGameMode,
    toggleHwAcceleration,
    toggleShowTouches,
    togglePointerLocation,
    applyPointerSpeed,
    fixNotificationDelay,
    freezeBackgroundApp,
    unfreezeBackgroundApp,
    applyBgLimit,
    toggleAlwaysFinish,
    togglePhantomOptimizer,
    filteredBloat,
  };
}
