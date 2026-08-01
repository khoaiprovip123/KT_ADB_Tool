import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  AppWindow,
  BadgeCheck,
  BatteryCharging,
  Bell,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Eye,
  Gauge,
  Gamepad2,
  ListChecks,
  Loader2,
  MonitorSmartphone,
  PackageCheck,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  TerminalSquare,
  Trash2,
  Undo2,
  Wand2,
  X,
  XCircle,
  Zap,
  Globe,
  Check,
} from "lucide-react";
import { useDeviceStore } from "../../store/deviceStore";
import { toast } from "../../store/toastStore";
import {
  validateDpi,
  validatePackageName,
  validateResolution,
} from "../../utils/validation";

type SectionId =
  | "overview"
  | "interface"
  | "performance"
  | "privacy"
  | "display"
  | "debloat"
  | "dns";

type RiskLevel = "SAFE" | "MEDIUM" | "RISKY" | "DANGEROUS" | "KEEP";
type ActionSource = "experience" | "system";
type ActionState =
  | "SUPPORTED_ON"
  | "SUPPORTED_OFF"
  | "UNSUPPORTED"
  | "UNKNOWN"
  | "ERROR";
type PackageStatus = "installed" | "disabled" | "uninstalled";
type DebloatAction = "uninstall" | "disable" | "restore";

interface XiaomiExperienceItem {
  id: string;
  title: string;
  description: string;
  category:
    | "display"
    | "navigation"
    | "launcher"
    | "sound"
    | "game"
    | "ads"
    | "utility";
  risk: Exclude<RiskLevel, "KEEP">;
  defaultValue: string;
  activeValues?: string[];
  detectStrategy?: {
    brand?: string[];
    minSdk?: number;
    packages?: string[];
  };
}

interface ExperienceItemStatus {
  item: XiaomiExperienceItem;
  status: ActionState;
  currentValue?: string;
}

interface SystemTweak {
  id: string;
  label: string;
  description: string;
  category: "performance" | "privacy" | "display" | "battery";
  risk: "SAFE" | "RISKY" | "KEEP";
  defaultEnabled: boolean;
}

interface BloatwareEntry {
  package: string;
  name: string;
  description: string;
  risk: "SAFE" | "RISKY" | "KEEP";
  category: string;
  preferDisable?: boolean;
  status: PackageStatus;
}

interface UnifiedAction {
  id: string;
  source: ActionSource;
  section: SectionId;
  title: string;
  description: string;
  risk: RiskLevel;
  status: ActionState;
  currentValue?: string;
  icon: React.ReactNode;
  systemTweak?: SystemTweak;
  experienceStatus?: ExperienceItemStatus;
}

type ActionLogSource =
  | "system"
  | "experience"
  | "display"
  | "debloat"
  | "workspace";

interface ConfirmState {
  title: string;
  message: string;
  risk: RiskLevel;
  confirmLabel: string;
  onConfirm: () => void;
}

interface NotificationVerification {
  loading: boolean;
  gmsInstalled: boolean | null;
  dozeWhitelisted: boolean | null;
  backgroundAllowed: boolean | null;
  error?: string;
}

const sectionMeta: Array<{
  id: SectionId;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    id: "interface",
    label: "Giao diện",
    desc: "Điều hướng, rung",
    icon: <SlidersHorizontal className="w-4 h-4" />,
  },
  {
    id: "performance",
    label: "Hiệu năng",
    desc: "GPU, RAM, game, pin",
    icon: <Gauge className="w-4 h-4" />,
  },
  {
    id: "privacy",
    label: "Riêng tư",
    desc: "Quảng cáo, analytics",
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  {
    id: "display",
    label: "Màn hình",
    desc: "DPI, độ phân giải, FPS",
    icon: <MonitorSmartphone className="w-4 h-4" />,
  },
  {
    id: "debloat",
    label: "Debloat",
    desc: "Gói cài sẵn",
    icon: <PackageCheck className="w-4 h-4" />,
  },
  {
    id: "dns",
    label: "Cấu hình DNS",
    desc: "Mã hóa DNS, chặn QC",
    icon: <Globe className="w-4 h-4" />,
  },
];

const riskRank: Record<RiskLevel, number> = {
  SAFE: 0,
  MEDIUM: 1,
  RISKY: 2,
  DANGEROUS: 3,
  KEEP: 4,
};

const mutedPanelClass =
  "border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]";

const notificationTweakId = "system:xiaomi_notification_fix";

const hasExactPackage = (output: string, packageName: string) =>
  output
    .split(/\r?\n/)
    .some((line) => line.trim() === `package:${packageName}`);

const hasWhitelistPackage = (output: string, packageName: string) =>
  output
    .split(/\r?\n/)
    .some((line) => line.trim().split(",")[1] === packageName);

const summarizeOutput = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (!value) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const mapExperienceSection = (
  category: XiaomiExperienceItem["category"],
): SectionId => {
  if (category === "display") return "display";
  if (category === "game") return "performance";
  if (category === "ads") return "privacy";
  return "interface";
};

const mapSystemSection = (category: SystemTweak["category"]): SectionId => {
  if (category === "privacy") return "privacy";
  if (category === "display") return "display";
  return "performance";
};

const getExperienceIcon = (category: XiaomiExperienceItem["category"]) => {
  switch (category) {
    case "display":
      return <Eye className="w-4 h-4" />;
    case "navigation":
      return <SlidersHorizontal className="w-4 h-4" />;
    case "launcher":
      return <AppWindow className="w-4 h-4" />;
    case "sound":
      return <Activity className="w-4 h-4" />;
    case "game":
      return <Gamepad2 className="w-4 h-4" />;
    case "ads":
      return <Shield className="w-4 h-4" />;
    default:
      return <Wand2 className="w-4 h-4" />;
  }
};

const getSystemIcon = (category: SystemTweak["category"]) => {
  switch (category) {
    case "display":
      return <MonitorSmartphone className="w-4 h-4" />;
    case "privacy":
      return <ShieldCheck className="w-4 h-4" />;
    case "battery":
      return <BatteryCharging className="w-4 h-4" />;
    default:
      return <Cpu className="w-4 h-4" />;
  }
};

export function ExperienceCenter() {
  const { activeDevice, devices, addLog } = useDeviceStore();
  const [activeSection, setActiveSection] = useState<SectionId>("interface");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [deviceProfile, setDeviceProfile] = useState<any>(null);
  const [experienceStatuses, setExperienceStatuses] = useState<
    ExperienceItemStatus[]
  >([]);
  const [systemTweaks, setSystemTweaks] = useState<SystemTweak[]>([]);
  const [systemStatus, setSystemStatus] = useState<Record<string, boolean>>({});
  const [bloatware, setBloatware] = useState<BloatwareEntry[]>([]);
  const [debloatBrand, setDebloatBrand] = useState<string>("auto");
  const [selectedBloat, setSelectedBloat] = useState<Set<string>>(new Set());
  const [bloatSearch] = useState("");
  const [deviceDpi, setDeviceDpi] = useState<number | null>(null);
  const [customDpi, setCustomDpi] = useState(440);
  const [deviceResolution, setDeviceResolution] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(2400);
  const [animationScale, setAnimationScaleValue] = useState<0 | 0.5 | 1>(0.5);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [selectedActionId, setSelectedActionId] =
    useState<string>(notificationTweakId);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [workspaceWidth, setWorkspaceWidth] = useState(0);
  const [notificationVerification, setNotificationVerification] =
    useState<NotificationVerification>({
      loading: false,
      gmsInstalled: null,
      dozeWhitelisted: null,
      backgroundAllowed: null,
    });
  const [notificationBatchProgress, setNotificationBatchProgress] = useState<{
    current: number;
    total: number;
    pkgName: string;
  } | null>(null);
  const [notificationBatchStatus, setNotificationBatchStatus] = useState<
    "idle" | "running" | "success" | "error"
  >("idle");
  const [batchProgress, setBatchProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const refreshToken = useRef(0);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const updateWidth = () => setWorkspaceWidth(workspace.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(workspace);
    return () => observer.disconnect();
  }, []);



  useEffect(() => {
    if (activeSection === "overview") setActiveSection("interface");
  }, [activeSection]);

  // DNS States
  const [dnsMode, setDnsMode] = useState<string>("off");
  const [dnsSpecifier, setDnsSpecifier] = useState<string>("");
  const [customDns, setCustomDns] = useState<string>("");

  // Đồng bộ giá trị DPI và Resolution tùy chỉnh khi thông tin thiết bị được tải thành công
  useEffect(() => {
    if (deviceDpi !== null) {
      setCustomDpi(deviceDpi);
    }
  }, [deviceDpi]);

  useEffect(() => {
    if (deviceResolution) {
      setCustomWidth(deviceResolution.width);
      setCustomHeight(deviceResolution.height);
    }
  }, [deviceResolution]);

  const currentDevice = devices.find((device) => device.id === activeDevice);
  const isUnauthorized = currentDevice?.type === "unauthorized";
  const isOffline = currentDevice?.type === "offline";
  const isBootloader = currentDevice?.type === "bootloader";
  const isDeviceReady = Boolean(
    activeDevice && !isUnauthorized && !isOffline && !isBootloader,
  );

  const verifyNotificationFix = useCallback(async () => {
    if (!activeDevice || !isDeviceReady) {
      setNotificationVerification({
        loading: false,
        gmsInstalled: null,
        dozeWhitelisted: null,
        backgroundAllowed: null,
      });
      return;
    }

    setNotificationVerification((current) => ({
      ...current,
      loading: true,
      error: undefined,
    }));

    try {
      const [gmsPackage, whitelist, gmsWakeLock, gmsBackground, gsfBackground] =
        await Promise.all([
          window.api.runAdbCommand(
            activeDevice,
            "shell pm list packages com.google.android.gms",
          ),
          window.api.runAdbCommand(
            activeDevice,
            "shell dumpsys deviceidle whitelist",
          ),
          window.api.runAdbCommand(
            activeDevice,
            "shell cmd appops get com.google.android.gms WAKE_LOCK",
          ),
          window.api.runAdbCommand(
            activeDevice,
            "shell cmd appops get com.google.android.gms RUN_ANY_IN_BACKGROUND",
          ),
          window.api.runAdbCommand(
            activeDevice,
            "shell cmd appops get com.google.android.gsf RUN_ANY_IN_BACKGROUND",
          ),
        ]);

      const whitelistOutput = whitelist.success ? whitelist.output : "";
      const appOpsResults = [gmsWakeLock, gmsBackground, gsfBackground];

      setNotificationVerification({
        loading: false,
        gmsInstalled:
          gmsPackage.success &&
          hasExactPackage(gmsPackage.output, "com.google.android.gms"),
        dozeWhitelisted:
          whitelist.success &&
          hasWhitelistPackage(whitelistOutput, "com.google.android.gms") &&
          hasWhitelistPackage(whitelistOutput, "com.google.android.gsf"),
        backgroundAllowed: appOpsResults.every(
          (result) => result.success && /\ballow\b/i.test(result.output),
        ),
      });
    } catch (error: any) {
      setNotificationVerification({
        loading: false,
        gmsInstalled: null,
        dozeWhitelisted: null,
        backgroundAllowed: null,
        error: error?.message ?? "Không thể xác minh trạng thái thông báo.",
      });
    }
  }, [activeDevice, isDeviceReady]);

  const runTrackedAction = useCallback(
    async (
      options: {
        key: string;
        title: string;
        detail: string;
        source: ActionLogSource;
        risk?: RiskLevel;
        confirm?: boolean;
        confirmMessage?: string;
        execute: () => Promise<{ success: boolean; output: string }>;
        onSuccess?: () => Promise<void> | void;
      },
      force = false,
    ) => {
      if (!isDeviceReady) {
        toast.warning("Chưa có thiết bị sẵn sàng để thực thi lệnh.");
        return;
      }

      if (
        options.confirm &&
        !force &&
        options.risk &&
        riskRank[options.risk] >= riskRank.MEDIUM
      ) {
        setConfirmState({
          title: options.title,
          message:
            options.confirmMessage ??
            "Thao tác này thay đổi cài đặt sâu của hệ thống. Hãy xác nhận trước khi chạy.",
          risk: options.risk,
          confirmLabel: "Xác nhận chạy",
          onConfirm: () => {
            setConfirmState(null);
            void runTrackedAction(options, true);
          },
        });
        return;
      }

      setBusyKey(options.key);
      addLog(
        `[ACTION] ${options.source.toUpperCase()} ${options.title} - ${options.detail}`,
      );

      try {
        const result = await options.execute();
        const output = summarizeOutput(result.output);
        addLog(
          `[ACTION ${result.success ? "OK" : "ERROR"}] ${options.title}: ${
            output || "OK"
          }`,
        );

        if (result.success) {
          toast.success(options.title);
          await options.onSuccess?.();
        } else {
          toast.error(output || "Thao tác thất bại.");
        }
      } catch (error: any) {
        const output = error?.message ?? "Thao tác thất bại.";
        addLog(`[ACTION ERROR] ${options.title}: ${output}`);
        toast.error(output);
      } finally {
        setBusyKey(null);
      }
    },
    [addLog, isDeviceReady],
  );

  const loadWorkspace = useCallback(async () => {
    refreshToken.current += 1;
    const token = refreshToken.current;

    if (!activeDevice || isUnauthorized || isOffline) {
      setDeviceProfile(null);
      setExperienceStatuses([]);
      setSystemStatus({});
      setBloatware([]);
      setDeviceDpi(null);
      setDeviceResolution(null);
      return;
    }

    setLoading(true);
    try {
      const [
        profileResult,
        experienceResult,
        tweakListResult,
        tweakStatusResult,
        dpiResult,
        resolutionResult,
        bloatResult,
        dnsModeResult,
        dnsSpecResult,
      ] = await Promise.allSettled([
        window.api.getDeviceProfile(activeDevice),
        window.api.getXiaomiCapabilities(activeDevice),
        window.api.getTweaksList(),
        window.api.getTweaksStatus(activeDevice),
        window.api.getDpi(activeDevice),
        window.api.getResolution(activeDevice),
        window.api.getBloatwareWithStatus(activeDevice, debloatBrand),
        window.api.runAdbCommand(
          activeDevice,
          "shell settings get global private_dns_mode",
        ),
        window.api.runAdbCommand(
          activeDevice,
          "shell settings get global private_dns_specifier",
        ),
      ]);

      if (token !== refreshToken.current) return;

      if (profileResult.status === "fulfilled") {
        setDeviceProfile(profileResult.value);
      } else {
        setDeviceProfile(null);
      }

      setExperienceStatuses(
        experienceResult.status === "fulfilled"
          ? (experienceResult.value as ExperienceItemStatus[])
          : [],
      );

      setSystemTweaks(
        tweakListResult.status === "fulfilled"
          ? (tweakListResult.value as SystemTweak[])
          : [],
      );

      setSystemStatus(
        tweakStatusResult.status === "fulfilled"
          ? (tweakStatusResult.value as Record<string, boolean>)
          : {},
      );

      if (
        dpiResult.status === "fulfilled" &&
        typeof dpiResult.value === "number"
      ) {
        setDeviceDpi(dpiResult.value);
      } else {
        setDeviceDpi(null);
      }

      if (
        resolutionResult.status === "fulfilled" &&
        resolutionResult.value &&
        typeof resolutionResult.value.width === "number" &&
        typeof resolutionResult.value.height === "number"
      ) {
        setDeviceResolution(resolutionResult.value);
      } else {
        setDeviceResolution(null);
      }

      setBloatware(
        bloatResult.status === "fulfilled"
          ? (bloatResult.value as BloatwareEntry[])
          : [],
      );

      // Map DNS States
      if (
        dnsModeResult.status === "fulfilled" &&
        dnsModeResult.value &&
        dnsModeResult.value.success
      ) {
        const val = dnsModeResult.value.output.trim();
        setDnsMode(val === "null" || val === "" ? "off" : val);
      } else {
        setDnsMode("off");
      }

      if (
        dnsSpecResult.status === "fulfilled" &&
        dnsSpecResult.value &&
        dnsSpecResult.value.success
      ) {
        const val = dnsSpecResult.value.output.trim();
        setDnsSpecifier(val === "null" ? "" : val);
      } else {
        setDnsSpecifier("");
      }
    } catch (error: any) {
      toast.error(error?.message ?? "Không thể quét thiết bị.");
    } finally {
      if (token === refreshToken.current) {
        setLoading(false);
      }
    }
  }, [activeDevice, isOffline, isUnauthorized]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    void verifyNotificationFix();
  }, [verifyNotificationFix]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    if (activeDevice) {
      unsubscribe = window.api.onBatchProgress((data) => {
        setBatchProgress({ done: data.done, total: data.total });
      });
    }
    return () => unsubscribe?.();
  }, [activeDevice]);

  const unifiedActions = useMemo<UnifiedAction[]>(() => {
    const experienceActions = experienceStatuses.map((status) => ({
      id: `experience:${status.item.id}`,
      source: "experience" as const,
      section: mapExperienceSection(status.item.category),
      title: status.item.title,
      description: status.item.description,
      risk: status.item.risk,
      status: status.status,
      currentValue: status.currentValue,
      icon: getExperienceIcon(status.item.category),
      experienceStatus: status,
    }));

    const systemActions = systemTweaks.map((tweak) => {
      const enabled = Boolean(systemStatus[tweak.id]);
      return {
        id: `system:${tweak.id}`,
        source: "system" as const,
        section: mapSystemSection(tweak.category),
        title: tweak.label,
        description: tweak.description,
        risk: tweak.risk,
        status: enabled ? "SUPPORTED_ON" : "SUPPORTED_OFF",
        currentValue: enabled ? "enabled" : "default",
        icon: getSystemIcon(tweak.category),
        systemTweak: tweak,
      } satisfies UnifiedAction;
    });

    return [...experienceActions, ...systemActions].sort((a, b) => {
      const sectionOrder =
        sectionMeta.findIndex((section) => section.id === a.section) -
        sectionMeta.findIndex((section) => section.id === b.section);
      if (sectionOrder !== 0) return sectionOrder;
      return riskRank[a.risk] - riskRank[b.risk];
    });
  }, [experienceStatuses, systemStatus, systemTweaks]);



  const sectionCounts = useMemo(() => {
    const counts: Record<SectionId, number> = {
      overview: unifiedActions.filter(
        (action) => action.status !== "UNSUPPORTED" && action.risk === "SAFE",
      ).length,
      interface: 0,
      performance: 0,
      privacy: 0,
      display: 0,
      debloat: bloatware.filter((entry) => entry.status === "installed").length,
      dns: 0,
    };

    unifiedActions.forEach((action) => {
      counts[action.section] += 1;
    });

    return counts;
  }, [bloatware, unifiedActions]);

  const visibleActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery) {
      // Khi gõ từ khóa tìm kiếm: Tìm kiếm trên TẤT CẢ các nhóm/tab!
      return unifiedActions.filter(
        (action) =>
          action.title.toLowerCase().includes(normalizedQuery) ||
          action.description.toLowerCase().includes(normalizedQuery) ||
          action.currentValue?.toLowerCase().includes(normalizedQuery) ||
          action.section.toLowerCase().includes(normalizedQuery),
      );
    }

    return activeSection === "overview"
      ? unifiedActions.filter(
          (action) =>
            action.status !== "UNSUPPORTED" && action.risk === "SAFE",
        )
      : unifiedActions.filter((action) => action.section === activeSection);
  }, [activeSection, query, unifiedActions]);

  const selectedAction = useMemo(
    () =>
      unifiedActions.find((action) => action.id === selectedActionId) ?? null,
    [selectedActionId, unifiedActions],
  );

  useEffect(() => {
    if (activeSection === "debloat" || activeSection === "dns") return;
    if (visibleActions.some((action) => action.id === selectedActionId)) return;

    const preferredAction =
      activeSection === "overview"
        ? visibleActions.find((action) => action.id === notificationTweakId)
        : undefined;
    const nextAction = preferredAction ?? visibleActions[0];
    if (nextAction) setSelectedActionId(nextAction.id);
  }, [activeSection, selectedActionId, visibleActions]);

  const filteredBloatware = useMemo(() => {
    const normalized = (query || bloatSearch).trim().toLowerCase();
    const entries = normalized
      ? bloatware.filter(
          (entry) =>
            entry.package.toLowerCase().includes(normalized) ||
            entry.name.toLowerCase().includes(normalized) ||
            entry.category.toLowerCase().includes(normalized),
        )
      : bloatware;

    return entries.sort((a, b) => {
      const statusRank: Record<PackageStatus, number> = {
        installed: 0,
        disabled: 1,
        uninstalled: 2,
      };
      return statusRank[a.status] - statusRank[b.status];
    });
  }, [bloatSearch, query, bloatware]);

  const selectedBloatEntries = useMemo(
    () => bloatware.filter((entry) => selectedBloat.has(entry.package)),
    [bloatware, selectedBloat],
  );

  const profileLine = deviceProfile
    ? [
        deviceProfile.manufacturer,
        deviceProfile.model,
        deviceProfile.release ? `Android ${deviceProfile.release}` : null,
        deviceProfile.hyperOsVersionName
          ? `HyperOS ${deviceProfile.hyperOsVersionName}`
          : deviceProfile.miuiVersionName
            ? `MIUI ${deviceProfile.miuiVersionName}`
            : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : isDeviceReady
      ? "Chưa có hồ sơ thiết bị"
      : isUnauthorized
        ? "Thiết bị chưa cấp quyền ADB"
        : isOffline
          ? "Thiết bị đang offline"
          : isBootloader
            ? "Thiết bị đang ở chế độ Fastboot"
            : "Chưa chọn thiết bị";

  const refreshAfterAction = useCallback(async () => {
    await loadWorkspace();
  }, [loadWorkspace]);

  const handleSelectAction = useCallback((action: UnifiedAction) => {
    setSelectedActionId(action.id);
    setInspectorOpen(true);
  }, []);

  const handleApplyAndVerifyNotification = useCallback(() => {
    if (!activeDevice) return;
    const notificationAction = unifiedActions.find(
      (action) => action.id === notificationTweakId,
    );
    if (!notificationAction?.systemTweak) return;

    void runTrackedAction({
      key: "notification:apply-and-verify",
      title: "Áp dụng và kiểm tra thông báo",
      detail: "Google Play Services, Doze whitelist và AppOps",
      source: "system",
      risk: "SAFE",
      execute: async () => {
        const result = await window.api.applyTweak(
          activeDevice,
          notificationAction.systemTweak!.id,
          true,
        );
        return {
          success: Boolean(result.success),
          output: result.message ?? "",
        };
      },
      onSuccess: async () => {
        await loadWorkspace();
        await verifyNotificationFix();
      },
    });
  }, [
    activeDevice,
    loadWorkspace,
    runTrackedAction,
    unifiedActions,
    verifyNotificationFix,
  ]);

  const handleOptimizeAllAppNotifications = useCallback(() => {
    if (!activeDevice || !isDeviceReady) return;

    setNotificationBatchProgress({ current: 0, total: 0, pkgName: "" });
    setNotificationBatchStatus("running");
    const unsubscribe = window.api.onFixNotificationsProgress((progress) => {
      setNotificationBatchProgress(progress);
    });

    void runTrackedAction({
      key: "notification:optimize-all-apps",
      title: "Tối ưu thông báo toàn bộ ứng dụng",
      detail: "Doze whitelist, AppOps và WakeLock cho ứng dụng người dùng",
      source: "system",
      risk: "SAFE",
      execute: async () => {
        try {
          const result = await window.api.fixAllNotifications(activeDevice);
          setNotificationBatchStatus(result.success ? "success" : "error");
          return {
            success: Boolean(result.success),
            output: result.message,
          };
        } catch (error) {
          setNotificationBatchStatus("error");
          throw error;
        } finally {
          unsubscribe();
        }
      },
      onSuccess: async () => {
        await loadWorkspace();
        await verifyNotificationFix();
      },
    });
  }, [
    activeDevice,
    isDeviceReady,
    loadWorkspace,
    runTrackedAction,
    verifyNotificationFix,
  ]);

  const handleToggleAction = (action: UnifiedAction) => {
    if (!activeDevice) return;
    const nextEnable = action.status !== "SUPPORTED_ON";
    const key = `${action.source}:${action.id}`;

    if (action.source === "experience" && action.experienceStatus) {
      const item = action.experienceStatus.item;
      void runTrackedAction({
        key,
        title: `${nextEnable ? "Bật" : "Tắt"} ${action.title}`,
        detail: `Experience item: ${item.id}`,
        source: "experience",
        risk: action.risk,
        confirm: action.risk !== "SAFE",
        confirmMessage:
          "Tùy chọn này có thể thay đổi hành vi sâu của ROM hoặc launcher.",
        execute: async () => {
          const res = await window.api.applyXiaomiItem(
            activeDevice,
            item.id,
            nextEnable,
          );
          return {
            success: res.success,
            output: `${res.output}${res.usedFallback ? "\nUsed fallback command." : ""}`,
          };
        },
        onSuccess: refreshAfterAction,
      });
      return;
    }

    if (action.source === "system" && action.systemTweak) {
      const tweak = action.systemTweak;
      void runTrackedAction({
        key,
        title: `${nextEnable ? "Bật" : "Tắt"} ${action.title}`,
        detail: `System tweak: ${tweak.id}`,
        source: "system",
        risk: action.risk,
        confirm: action.risk !== "SAFE",
        execute: async () => {
          const res = await window.api.applyTweak(
            activeDevice,
            tweak.id,
            nextEnable,
          );
          return { success: Boolean(res.success), output: res.message ?? "" };
        },
        onSuccess: refreshAfterAction,
      });
    }
  };

  const handleRollbackExperience = (action: UnifiedAction) => {
    if (!activeDevice || !action.experienceStatus) return;
    const item = action.experienceStatus.item;
    void runTrackedAction({
      key: `rollback:${item.id}`,
      title: `Khôi phục ${action.title}`,
      detail: `Default value: ${item.defaultValue}`,
      source: "experience",
      risk: "MEDIUM",
      confirm: true,
      confirmMessage: "Khôi phục sẽ đưa tùy chọn về giá trị mặc định của ROM.",
      execute: async () => {
        const res = await window.api.rollbackXiaomiItem(activeDevice, item.id);
        return { success: res.success, output: res.output };
      },
      onSuccess: refreshAfterAction,
    });
  };



  const handleApplyDpi = () => {
    if (!activeDevice) return;
    const validation = validateDpi(customDpi);
    if (!validation.valid) {
      toast.error(validation.error ?? "DPI không hợp lệ.");
      return;
    }

    void runTrackedAction({
      key: "display:dpi",
      title: `Đặt DPI ${customDpi}`,
      detail: "wm density",
      source: "display",
      risk: "MEDIUM",
      confirm: true,
      execute: async () => {
        const res = await window.api.setDpi(activeDevice, customDpi);
        return { success: Boolean(res.success), output: res.message ?? "" };
      },
      onSuccess: refreshAfterAction,
    });
  };

  const handleResetDpi = () => {
    if (!activeDevice) return;
    void runTrackedAction({
      key: "display:dpi-reset",
      title: "Reset DPI",
      detail: "wm density reset",
      source: "display",
      risk: "SAFE",
      execute: async () => {
        const res = await window.api.resetDpi(activeDevice);
        return { success: Boolean(res.success), output: res.message ?? "" };
      },
      onSuccess: refreshAfterAction,
    });
  };

  const handleApplyDns = (mode: string, specifier?: string) => {
    if (!activeDevice) return;
    const targetSpecifier = specifier || customDns;

    if (
      mode === "hostname" &&
      (!targetSpecifier ||
        !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(targetSpecifier))
    ) {
      toast.error("Hostname DNS không hợp lệ (Ví dụ: dns.google)");
      return;
    }

    void runTrackedAction({
      key: "dns:change",
      title: `Thay đổi DNS sang: ${mode === "hostname" ? targetSpecifier : mode === "opportunistic" ? "Tự động" : "Tắt"}`,
      detail: "Cấu hình Private DNS",
      source: "display",
      risk: "SAFE",
      confirm: false,
      execute: async () => {
        if (mode === "hostname") {
          await window.api.runAdbCommand(
            activeDevice,
            "shell settings put global private_dns_mode hostname",
          );
          const res = await window.api.runAdbCommand(
            activeDevice,
            `shell settings put global private_dns_specifier ${targetSpecifier}`,
          );
          return { success: res.success, output: res.output };
        } else if (mode === "opportunistic") {
          const res = await window.api.runAdbCommand(
            activeDevice,
            "shell settings put global private_dns_mode opportunistic",
          );
          return { success: res.success, output: res.output };
        } else {
          const res = await window.api.runAdbCommand(
            activeDevice,
            "shell settings put global private_dns_mode off",
          );
          return { success: res.success, output: res.output };
        }
      },
      onSuccess: async () => {
        setDnsMode(mode);
        if (mode === "hostname") setDnsSpecifier(targetSpecifier);
        await loadWorkspace();
      },
    });
  };

  const handleApplyResolution = () => {
    if (!activeDevice) return;
    const validation = validateResolution(customWidth, customHeight);
    if (!validation.valid) {
      toast.error(validation.error ?? "Độ phân giải không hợp lệ.");
      return;
    }

    void runTrackedAction({
      key: "display:resolution",
      title: `Đặt độ phân giải ${customWidth}x${customHeight}`,
      detail: "wm size",
      source: "display",
      risk: "MEDIUM",
      confirm: true,
      execute: async () => {
        const res = await window.api.setResolution(
          activeDevice,
          customWidth,
          customHeight,
        );
        return { success: Boolean(res.success), output: res.message ?? "" };
      },
      onSuccess: refreshAfterAction,
    });
  };

  const handleResetResolution = () => {
    if (!activeDevice) return;
    void runTrackedAction({
      key: "display:resolution-reset",
      title: "Reset độ phân giải",
      detail: "wm size reset",
      source: "display",
      risk: "SAFE",
      execute: async () => {
        const res = await window.api.resetResolution(activeDevice);
        return { success: Boolean(res.success), output: res.message ?? "" };
      },
      onSuccess: refreshAfterAction,
    });
  };

  const handleAnimationScale = (scale: 0 | 0.5 | 1) => {
    if (!activeDevice) return;
    setAnimationScaleValue(scale);
    void runTrackedAction({
      key: `display:anim-${scale}`,
      title: `Hoạt ảnh ${scale}x`,
      detail: "window/transition/animator scale",
      source: "display",
      risk: "SAFE",
      execute: async () => {
        const res = await window.api.setAnimationScale(activeDevice, scale);
        return { success: Boolean(res.success), output: res.message ?? "OK" };
      },
      onSuccess: refreshAfterAction,
    });
  };

  const toggleBloatSelection = (entry: BloatwareEntry) => {
    if (entry.risk === "KEEP") return;
    setSelectedBloat((prev) => {
      const next = new Set(prev);
      if (next.has(entry.package)) next.delete(entry.package);
      else next.add(entry.package);
      return next;
    });
  };

  const handleBloatAction = (entry: BloatwareEntry, action: DebloatAction) => {
    if (!activeDevice) return;
    if (!validatePackageName(entry.package)) {
      toast.error("Package không hợp lệ.");
      return;
    }

    const actionLabel =
      action === "uninstall"
        ? "Gỡ"
        : action === "disable"
          ? "Vô hiệu hóa"
          : "Khôi phục";

    void runTrackedAction({
      key: `debloat:${action}:${entry.package}`,
      title: `${actionLabel} ${entry.name}`,
      detail: entry.package,
      source: "debloat",
      risk: action === "uninstall" || entry.risk === "RISKY" ? "RISKY" : "SAFE",
      confirm: action === "uninstall" || entry.risk === "RISKY",
      confirmMessage:
        "Thao tác với package hệ thống có thể ảnh hưởng đến một số chức năng ROM.",
      execute: async () => {
        const res = await window.api.debloatPackage(
          activeDevice,
          entry.package,
          action,
          Boolean(entry.preferDisable),
        );
        return { success: Boolean(res.success), output: res.message ?? "" };
      },
      onSuccess: refreshAfterAction,
    });
  };

  const handleBatchBloatAction = (action: DebloatAction) => {
    if (!activeDevice || selectedBloatEntries.length === 0) return;

    const actionLabel =
      action === "uninstall"
        ? "Gỡ hàng loạt"
        : action === "disable"
          ? "Vô hiệu hóa hàng loạt"
          : "Khôi phục hàng loạt";

    void runTrackedAction({
      key: `debloat:batch:${action}`,
      title: actionLabel,
      detail: `${selectedBloatEntries.length} package`,
      source: "debloat",
      risk:
        action === "uninstall" ||
        selectedBloatEntries.some((entry) => entry.risk === "RISKY")
          ? "RISKY"
          : "SAFE",
      confirm:
        action === "uninstall" ||
        selectedBloatEntries.some((entry) => entry.risk === "RISKY"),
      confirmMessage:
        "Bạn đang chạy thao tác hàng loạt trên các package hệ thống đã chọn.",
      execute: async () => {
        setBatchProgress({ done: 0, total: selectedBloatEntries.length });
        const results = await window.api.batchDebloat(
          activeDevice,
          selectedBloatEntries.map((entry) => ({
            package: entry.package,
            preferDisable: entry.preferDisable,
          })),
          action,
        );
        const success = results.filter((result: any) => result.success).length;
        const output = results
          .map(
            (result: any) =>
              `${result.success ? "OK" : "FAIL"} ${result.package}: ${
                result.message
              }`,
          )
          .join("\n");
        return {
          success: success > 0,
          output: `Hoàn tất ${success}/${results.length} package.\n${output}`,
        };
      },
      onSuccess: async () => {
        setSelectedBloat(new Set());
        setBatchProgress(null);
        await refreshAfterAction();
      },
    });
  };

  const notificationNeedsAttention =
    !notificationVerification.loading &&
    ![
      notificationVerification.gmsInstalled,
      notificationVerification.dozeWhitelisted,
      notificationVerification.backgroundAllowed,
    ].every(Boolean);

  const showCategoryRail = workspaceWidth >= 1180;
  const dockInspector = workspaceWidth >= 1480;
  const hasDockedInspector =
    dockInspector && inspectorOpen && Boolean(selectedAction);
  const mainPaneWidth = Math.max(
    0,
    workspaceWidth -
      (showCategoryRail ? 176 : 0) -
      (hasDockedInspector ? 300 : 0),
  );
  const compactMainPane = workspaceWidth === 0 || mainPaneWidth < 900;
  const stackDisplayControls = workspaceWidth === 0 || mainPaneWidth < 780;
  const workspaceColumns = hasDockedInspector
    ? "176px minmax(0, 1fr) 300px"
    : showCategoryRail
      ? "176px minmax(0, 1fr)"
      : "minmax(0, 1fr)";



  return (
    <>
      <div
        ref={workspaceRef}
        className="experience-center relative h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-[#f8fafc] text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
      >
        <div
          className="grid h-full min-h-0 w-full min-w-0"
          style={{ gridTemplateColumns: workspaceColumns }}
        >
          {showCategoryRail && (
            <CategoryRail
              activeSection={activeSection}
              counts={sectionCounts}
              onSelect={setActiveSection}
            />
          )}

          <div className="flex min-h-0 min-w-0 flex-col bg-white">


            {!showCategoryRail && (
              <div className="border-b border-slate-200 px-4 py-2">
                <MobileSectionTabs
                  activeSection={activeSection}
                  counts={sectionCounts}
                  onSelect={setActiveSection}
                />
              </div>
            )}

            {isDeviceReady &&
              (activeSection === "display" || activeSection === "overview") && (
                <DisplayControlPanel
                  deviceDpi={deviceDpi}
                  customDpi={customDpi}
                  setCustomDpi={setCustomDpi}
                  resolution={deviceResolution}
                  customWidth={customWidth}
                  customHeight={customHeight}
                  setCustomWidth={setCustomWidth}
                  setCustomHeight={setCustomHeight}
                  animationScale={animationScale}
                  stacked={stackDisplayControls}
                  busyKey={busyKey}
                  onApplyDpi={handleApplyDpi}
                  onResetDpi={handleResetDpi}
                  onApplyResolution={handleApplyResolution}
                  onResetResolution={handleResetResolution}
                  onAnimationScale={handleAnimationScale}
                />
              )}

            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div
                className={`flex shrink-0 gap-3 border-b border-slate-200 px-5 py-4 ${
                  compactMainPane
                    ? "flex-col"
                    : "flex-row items-center justify-between"
                }`}
              >
                <div className="min-w-0">
                  <h3 className="text-[15px] font-extrabold text-slate-950">
                    {query.trim()
                      ? `Kết quả tìm kiếm cho "${query.trim()}"`
                      : activeSection === "overview"
                        ? "Danh sách tinh chỉnh"
                        : (sectionMeta.find(
                            (section) => section.id === activeSection,
                          )?.label ?? "Tác vụ")}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    {query.trim()
                      ? `Tìm thấy ${visibleActions.length} thao tác phù hợp trên tất cả các tab`
                      : activeSection === "debloat"
                        ? `${filteredBloatware.length} package đang hiển thị`
                        : activeSection === "dns"
                          ? "Cấu hình máy chủ DNS mã hóa và chặn quảng cáo"
                          : `${visibleActions.length} thao tác trong nhóm`}
                  </p>
                </div>

                <SearchBox
                  value={query}
                  onChange={setQuery}
                  placeholder="Tìm kiếm tất cả tweak, tính năng ở mọi tab..."
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {!isDeviceReady ? (
                  <div className="p-5">
                    <EmptyState
                      icon={<TerminalSquare className="h-7 w-7" />}
                      title="Thiết bị chưa sẵn sàng"
                      message={profileLine}
                    />
                  </div>
                ) : activeSection === "debloat" ? (
                  <div className="p-4">
                    <DebloatWorkspace
                      entries={filteredBloatware}
                      selected={selectedBloat}
                      busyKey={busyKey}
                      batchProgress={batchProgress}
                      onToggle={toggleBloatSelection}
                      onAction={handleBloatAction}
                      onBatchAction={handleBatchBloatAction}
                      brand={debloatBrand}
                      onSelectBrand={setDebloatBrand}
                    />
                  </div>
                ) : activeSection === "dns" ? (
                  <div className="p-5">
                    <DnsControlPanel
                      dnsMode={dnsMode}
                      dnsSpecifier={dnsSpecifier}
                      customDns={customDns}
                      setCustomDns={setCustomDns}
                      onApplyDns={handleApplyDns}
                      loading={loading}
                    />
                  </div>
                ) : (
                  <div>
                    {loading ? (
                      <div className="p-4">
                        <LoadingRows />
                      </div>
                    ) : visibleActions.length === 0 ? (
                      <div className="p-5">
                        <EmptyState
                          icon={<ListChecks className="h-7 w-7" />}
                          title="Không có thao tác phù hợp"
                          message="Hãy đổi nhóm hoặc làm mới trạng thái thiết bị."
                        />
                      </div>
                    ) : (
                      <div className="border-t border-slate-200">
                        {visibleActions.map((action) => (
                          <ActionRow
                            key={action.id}
                            action={action}
                            busy={busyKey === `${action.source}:${action.id}`}
                            selected={selectedAction?.id === action.id}
                            needsAttention={
                              action.id === notificationTweakId &&
                              notificationNeedsAttention
                            }
                            onSelect={handleSelectAction}
                            onToggle={handleToggleAction}
                            onRollback={handleRollbackExperience}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </main>
          </div>

          {hasDockedInspector && selectedAction && (
            <div className="flex min-h-0 border-l border-slate-200 bg-[#fbfdff]">
              <ActionInspector
                action={selectedAction}
                verification={notificationVerification}
                busy={busyKey === "notification:apply-and-verify"}
                bulkBusy={busyKey === "notification:optimize-all-apps"}
                bulkProgress={notificationBatchProgress}
                bulkStatus={notificationBatchStatus}
                onClose={() => setInspectorOpen(false)}
                onApplyNotification={handleApplyAndVerifyNotification}
                onOptimizeAllNotifications={handleOptimizeAllAppNotifications}
              />
            </div>
          )}
        </div>

        {inspectorOpen && selectedAction && !dockInspector && (
          <div
            className="absolute inset-0 z-30 flex justify-end bg-slate-950/20 backdrop-blur-[1px]"
            onClick={() => setInspectorOpen(false)}
          >
            <div
              className="h-full w-[min(380px,92%)] border-l border-slate-200 bg-[#fbfdff] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <ActionInspector
                action={selectedAction}
                verification={notificationVerification}
                busy={busyKey === "notification:apply-and-verify"}
                bulkBusy={busyKey === "notification:optimize-all-apps"}
                bulkProgress={notificationBatchProgress}
                bulkStatus={notificationBatchStatus}
                onClose={() => setInspectorOpen(false)}
                onApplyNotification={handleApplyAndVerifyNotification}
                onOptimizeAllNotifications={handleOptimizeAllAppNotifications}
              />
            </div>
          </div>
        )}

        {confirmState && (
          <ConfirmDialog
            state={confirmState}
            onCancel={() => setConfirmState(null)}
          />
        )}
      </div>
    </>
  );
}

function CategoryRail({
  activeSection,
  counts,
  onSelect,
}: {
  activeSection: SectionId;
  counts: Record<SectionId, number>;
  onSelect: (section: SectionId) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-[#fbfcfe] px-2.5 py-3">
      <nav className="space-y-1" aria-label="Nhóm tinh chỉnh">
        {sectionMeta.map((section) => {
          const active = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              className={`group relative flex h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[12px] font-bold transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {active && (
                <span className="absolute -left-2.5 top-2 h-7 w-[3px] rounded-r-full bg-blue-600" />
              )}
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  active
                    ? "bg-white text-blue-600 shadow-sm"
                    : "bg-slate-100 text-slate-500 group-hover:bg-white"
                }`}
              >
                {React.cloneElement(section.icon as React.ReactElement, {
                  className: "h-3.5 w-3.5",
                })}
              </span>
              <span className="min-w-0 flex-1 truncate">{section.label}</span>
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-extrabold ${
                  active
                    ? "bg-white text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[section.id]}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function MobileSectionTabs({
  activeSection,
  counts,
  onSelect,
}: {
  activeSection: SectionId;
  counts: Record<SectionId, number>;
  onSelect: (section: SectionId) => void;
}) {
  return (
    <nav
      className="flex min-w-0 gap-1 overflow-x-auto"
      aria-label="Nhóm tinh chỉnh"
    >
      {sectionMeta.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSelect(section.id)}
          className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold ${
            activeSection === section.id
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {section.label}
          <span className="text-[9px] opacity-70">{counts[section.id]}</span>
        </button>
      ))}
    </nav>
  );
}



function ActionInspector({
  action,
  verification,
  busy,
  bulkBusy,
  bulkProgress,
  bulkStatus,
  onClose,
  onApplyNotification,
  onOptimizeAllNotifications,
}: {
  action: UnifiedAction;
  verification: NotificationVerification;
  busy: boolean;
  bulkBusy: boolean;
  bulkProgress: {
    current: number;
    total: number;
    pkgName: string;
  } | null;
  bulkStatus: "idle" | "running" | "success" | "error";
  onClose: () => void;
  onApplyNotification: () => void;
  onOptimizeAllNotifications: () => void;
}) {
  const isNotification = action.id === notificationTweakId;
  const notificationVerified = [
    verification.gmsInstalled,
    verification.dozeWhitelisted,
    verification.backgroundAllowed,
  ].every(Boolean);
  const attention =
    isNotification && !verification.loading && !notificationVerified;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[17px] font-extrabold leading-snug text-slate-950">
          {isNotification ? "Thông báo ứng dụng" : action.title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Đóng bảng chi tiết"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3.5">
        <div
          className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-extrabold ${
            verification.loading
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : attention
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : action.status === "SUPPORTED_ON"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              verification.loading
                ? "bg-blue-500"
                : attention
                  ? "bg-amber-500"
                  : action.status === "SUPPORTED_ON"
                    ? "bg-emerald-500"
                    : "bg-rose-500"
            }`}
          />
          {verification.loading
            ? "Đang kiểm tra"
            : attention
              ? "Cần kiểm tra"
              : action.status === "SUPPORTED_ON"
                ? "Đã xác minh"
                : "Đang tắt"}
        </div>
        <p className="mt-3 text-[12px] font-medium leading-relaxed text-slate-600">
          {action.description}
        </p>
      </div>

      {isNotification ? (
        <>
          <h4 className="mt-4 text-[12px] font-extrabold text-slate-900">
            Nền tảng thông báo FCM
          </h4>
          <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <VerificationRow
              icon={<BadgeCheck className="h-4 w-4" />}
              label="Google Play Services"
              detail="GCM/Firebase Cloud Messaging"
              value={verification.gmsInstalled}
              loading={verification.loading}
            />
            <VerificationRow
              icon={<BatteryCharging className="h-4 w-4" />}
              label="Doze Whitelist"
              detail="GMS và GSF được cho phép"
              value={verification.dozeWhitelisted}
              loading={verification.loading}
            />
            <VerificationRow
              icon={<Activity className="h-4 w-4" />}
              label="Quyền chạy nền"
              detail="Wake lock và AppOps"
              value={verification.backgroundAllowed}
              loading={verification.loading}
              last
            />
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[12px] font-extrabold text-slate-900">
                  Tối ưu toàn bộ ứng dụng
                </h4>
                <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-500">
                  Mở Doze, AppOps và WakeLock cho ứng dụng người dùng để nhận
                  thông báo kịp thời khi tắt màn hình.
                </p>
              </div>
            </div>

            {(bulkBusy || bulkProgress) && (
              <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
                <div className="flex items-center justify-between gap-2 text-[9px] font-bold text-slate-500">
                  <span className="min-w-0 truncate">
                    {bulkStatus === "error"
                      ? "Tối ưu ứng dụng chưa hoàn tất"
                      : bulkBusy || bulkStatus === "running"
                        ? bulkProgress?.pkgName ||
                          "Đang chuẩn bị danh sách ứng dụng"
                        : "Đã hoàn tất tối ưu ứng dụng"}
                  </span>
                  <span className="shrink-0 text-slate-700">
                    {bulkStatus === "error"
                      ? "Lỗi"
                      : bulkProgress?.total
                        ? `${bulkProgress.current}/${bulkProgress.total}`
                        : bulkBusy
                          ? "0%"
                          : "100%"}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      bulkStatus === "error" ? "bg-rose-500" : "bg-blue-600"
                    }`}
                    style={{
                      width: bulkProgress?.total
                        ? `${Math.min(100, Math.round((bulkProgress.current / bulkProgress.total) * 100))}%`
                        : bulkBusy
                          ? "8%"
                          : "100%",
                    }}
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onOptimizeAllNotifications}
              disabled={bulkBusy || busy || verification.loading}
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-[10px] font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
            >
              {bulkBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bell className="h-3.5 w-3.5 text-cyan-300" />
              )}
              Tối ưu thông báo tất cả ứng dụng
            </button>
          </div>

          <div className="mt-6">
            <h4 className="text-[13px] font-extrabold text-slate-900">
              Khuyến nghị
            </h4>
            <p className="mt-2 text-[11px] font-medium leading-relaxed text-slate-500">
              Sau khi áp dụng, hãy khóa ứng dụng gần đây và kiểm tra nhận thông
              báo sau 2–5 phút.
            </p>
          </div>

          {verification.error && (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
              {verification.error}
            </p>
          )}

          <button
            type="button"
            onClick={onApplyNotification}
            disabled={busy || bulkBusy || verification.loading}
            className="mt-auto inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-[12px] font-extrabold text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)] transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Áp dụng & kiểm tra lại
          </button>
          <p className="mt-2 text-center text-[10px] font-medium leading-relaxed text-slate-400">
            Thao tác sẽ áp dụng lại cấu hình rồi đọc trạng thái thực tế.
          </p>
        </>
      ) : (
        <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-[11px]">
          <InspectorValue
            label="Nguồn"
            value={action.source === "system" ? "Hệ thống" : "UX"}
          />
          <InspectorValue label="Mức rủi ro" value={action.risk} />
          <InspectorValue
            label="Trạng thái"
            value={action.status === "SUPPORTED_ON" ? "Đang bật" : "Đang tắt"}
          />
          <InspectorValue
            label="Giá trị hiện tại"
            value={action.currentValue ?? "--"}
          />
        </div>
      )}
    </aside>
  );
}

function VerificationRow({
  icon,
  label,
  detail,
  value,
  loading,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  value: boolean | null;
  loading: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5 ${
        last ? "" : "border-b border-slate-100"
      }`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
        {icon}
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-[11px] font-extrabold text-slate-900">
          {label}
        </strong>
        <span className="mt-0.5 block truncate text-[9.5px] font-medium text-slate-400">
          {detail}
        </span>
      </span>
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
          loading
            ? "bg-slate-100 text-slate-500"
            : value
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
        }`}
      >
        {loading ? "Đang đọc" : value ? "Đã bật" : "Cần kiểm tra"}
      </span>
    </div>
  );
}

function InspectorValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-extrabold text-slate-800">{value}</span>
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white/80 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
      />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  message,
  compact,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/45 text-center ${
        compact ? "min-h-[180px] px-4" : "px-8"
      }`}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon}
      </div>
      <p className="text-sm font-black text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs font-semibold leading-relaxed text-slate-500">
        {message}
      </p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[92px] animate-pulse rounded-2xl border border-slate-200/60 bg-white/55"
        />
      ))}
    </div>
  );
}

function DisplayControlPanel({
  deviceDpi,
  customDpi,
  setCustomDpi,
  resolution,
  customWidth,
  customHeight,
  setCustomWidth,
  setCustomHeight,
  animationScale,
  stacked,
  busyKey,
  onApplyDpi,
  onResetDpi,
  onApplyResolution,
  onResetResolution,
  onAnimationScale,
}: {
  deviceDpi: number | null;
  customDpi: number;
  setCustomDpi: (value: number) => void;
  resolution: { width: number; height: number } | null;
  customWidth: number;
  customHeight: number;
  setCustomWidth: (value: number) => void;
  setCustomHeight: (value: number) => void;
  animationScale: 0 | 0.5 | 1;
  stacked: boolean;
  busyKey: string | null;
  onApplyDpi: () => void;
  onResetDpi: () => void;
  onApplyResolution: () => void;
  onResetResolution: () => void;
  onAnimationScale: (scale: 0 | 0.5 | 1) => void;
}) {
  return (
    <section className="shrink-0 border-b border-slate-200 bg-[#fbfdff] px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-[14px] font-extrabold text-slate-950">
            Bộ điều khiển hiển thị
          </h4>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            DPI hiện tại {deviceDpi ?? "--"} · Độ phân giải{" "}
            {resolution ? `${resolution.width}x${resolution.height}` : "--"}
          </p>
        </div>
        <MonitorSmartphone className="h-5 w-5 text-blue-500" />
      </div>

      <div
        className={`grid gap-3 ${
          stacked
            ? "grid-cols-1"
            : "grid-cols-[minmax(180px,0.85fr)_minmax(290px,1.35fr)_minmax(220px,1fr)]"
        }`}
      >
        <div className="rounded-[11px] border border-slate-200 bg-white p-3">
          <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            DPI
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              min={160}
              max={640}
              value={customDpi || ""}
              onChange={(event) =>
                setCustomDpi(
                  event.target.value === "" ? 0 : Number(event.target.value),
                )
              }
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-800 outline-none focus:border-blue-400"
            />
            <IconButton
              title="Áp dụng DPI"
              onClick={onApplyDpi}
              busy={busyKey === "display:dpi"}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <IconButton
              title="Reset DPI"
              onClick={onResetDpi}
              busy={busyKey === "display:dpi-reset"}
              icon={<RotateCcw className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="rounded-[11px] border border-slate-200 bg-white p-3">
          <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            Độ phân giải
          </label>
          <div className="mt-2 grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-2">
            <input
              type="number"
              min={480}
              max={3840}
              value={customWidth || ""}
              onChange={(event) =>
                setCustomWidth(
                  event.target.value === "" ? 0 : Number(event.target.value),
                )
              }
              className="h-10 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-800 outline-none focus:border-blue-400"
            />
            <span className="text-xs font-extrabold text-slate-400">×</span>
            <input
              type="number"
              min={800}
              max={3840}
              value={customHeight || ""}
              onChange={(event) =>
                setCustomHeight(
                  event.target.value === "" ? 0 : Number(event.target.value),
                )
              }
              className="h-10 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-800 outline-none focus:border-blue-400"
            />
            <IconButton
              title="Áp dụng độ phân giải"
              onClick={onApplyResolution}
              busy={busyKey === "display:resolution"}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <IconButton
              title="Reset độ phân giải"
              onClick={onResetResolution}
              busy={busyKey === "display:resolution-reset"}
              icon={<RotateCcw className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="rounded-[11px] border border-slate-200 bg-white p-3">
          <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            Hoạt ảnh
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {([0, 0.5, 1] as const).map((scale) => (
              <button
                key={scale}
                onClick={() => onAnimationScale(scale)}
                className={`h-10 rounded-lg border text-xs font-black transition ${
                  animationScale === scale
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                }`}
              >
                {busyKey === `display:anim-${scale}` ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  `${scale}x`
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function getUnsupportedReason(strategy: {
  brand?: string[];
  minSdk?: number;
  packages?: string[];
}): string {
  const reasons: string[] = [];
  if (strategy.brand && strategy.brand.length > 0) {
    reasons.push(`Chỉ hỗ trợ ${strategy.brand.join(", ")}`);
  }
  if (strategy.minSdk) {
    const androidVer =
      strategy.minSdk === 34
        ? "14 (HyperOS 1.0+)"
        : strategy.minSdk === 31
          ? "12"
          : strategy.minSdk === 30
            ? "11"
            : strategy.minSdk === 29
              ? "10"
              : strategy.minSdk === 28
                ? "9"
                : strategy.minSdk === 26
                  ? "8"
                  : "cũ hơn";
    reasons.push(`Yêu cầu Android ${androidVer}+`);
  }
  if (strategy.packages && strategy.packages.length > 0) {
    reasons.push(`Yêu cầu ứng dụng hệ thống: ${strategy.packages.join(", ")}`);
  }
  return reasons.join(" | ") || "Không đáp ứng cấu hình thiết bị";
}

function ActionRow({
  action,
  busy,
  selected,
  needsAttention,
  onSelect,
  onToggle,
  onRollback,
}: {
  action: UnifiedAction;
  busy: boolean;
  selected: boolean;
  needsAttention?: boolean;
  onSelect: (action: UnifiedAction) => void;
  onToggle: (action: UnifiedAction) => void;
  onRollback: (action: UnifiedAction) => void;
}) {
  const isOn = action.status === "SUPPORTED_ON";
  const isUnsupported = action.status === "UNSUPPORTED";
  const isUnknown = action.status === "UNKNOWN" || action.status === "ERROR";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(action)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect(action);
      }}
      className={`group w-full max-w-full overflow-hidden border-b border-slate-200 px-4 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
        isUnsupported
          ? "bg-slate-50/70 opacity-70"
          : selected
            ? "bg-blue-50/75"
            : "bg-white hover:bg-slate-50/80"
      }`}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-[10px] border ${
            selected
              ? "border-blue-200 bg-white text-blue-600"
              : isOn
                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          {action.icon}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-black text-slate-900">
              {action.title}
            </h4>
            <SourceBadge source={action.source} />
            <RiskBadge risk={action.risk} />
          </div>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-500">
            {action.description}
          </p>
          {isUnsupported && action.experienceStatus?.item.detectStrategy && (
            <p className="mt-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100/60 rounded-lg px-2.5 py-1">
              ⚠️ Không tương thích:{" "}
              {getUnsupportedReason(
                action.experienceStatus.item.detectStrategy,
              )}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
            <StatusBadge
              status={action.status}
              needsAttention={needsAttention}
            />
            <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-600">
              {action.currentValue ?? "--"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {action.source === "experience" && !isUnsupported && (
            <IconButton
              title="Khôi phục mặc định"
              onClick={() => onRollback(action)}
              icon={<Undo2 className="h-4 w-4" />}
            />
          )}
          <SwitchButton
            active={isOn}
            disabled={isUnsupported || isUnknown || busy}
            busy={busy}
            onClick={() => onToggle(action)}
          />
        </div>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: ActionSource }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
        source === "experience"
          ? "border-cyan-200 bg-cyan-50 text-cyan-700"
          : "border-blue-200 bg-blue-50 text-blue-700"
      }`}
    >
      {source === "experience" ? "UX" : "SYS"}
    </span>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const className =
    risk === "SAFE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : risk === "MEDIUM"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : risk === "RISKY"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${className}`}
    >
      {risk}
    </span>
  );
}

function StatusBadge({
  status,
  needsAttention,
}: {
  status: ActionState;
  needsAttention?: boolean;
}) {
  if (needsAttention) {
    return (
      <span className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] text-amber-700">
        Cần kiểm tra
      </span>
    );
  }

  const content =
    status === "SUPPORTED_ON"
      ? ["Đang bật", "bg-emerald-100 text-emerald-700"]
      : status === "SUPPORTED_OFF"
        ? ["Đang tắt", "bg-rose-100 text-rose-700"]
        : status === "UNSUPPORTED"
          ? ["Không hỗ trợ", "bg-rose-100 text-rose-700"]
          : status === "ERROR"
            ? ["Lỗi đọc", "bg-rose-100 text-rose-700"]
            : ["Chưa quét", "bg-amber-100 text-amber-700"];

  return (
    <span className={`rounded-lg px-2 py-1 text-[10px] ${content[1]}`}>
      {content[0]}
    </span>
  );
}

function SwitchButton({
  active,
  disabled,
  busy,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-8 w-14 shrink-0 items-center rounded-full border px-1 transition ${
        active
          ? "border-emerald-500 bg-emerald-500"
          : "border-slate-300 bg-slate-200"
      } disabled:cursor-not-allowed disabled:opacity-50`}
      title={active ? "Tắt" : "Bật"}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition ${
          active ? "translate-x-6" : "translate-x-0"
        }`}
      >
        {busy && <Loader2 className="h-3 w-3 animate-spin text-blue-600" />}
      </span>
    </button>
  );
}

function IconButton({
  title,
  icon,
  onClick,
  busy,
}: {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={busy}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600 disabled:cursor-wait disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
    </button>
  );
}

function DebloatWorkspace({
  entries,
  selected,
  busyKey,
  batchProgress,
  onToggle,
  onAction,
  onBatchAction,
  brand,
  onSelectBrand,
}: {
  entries: BloatwareEntry[];
  selected: Set<string>;
  busyKey: string | null;
  batchProgress: { done: number; total: number } | null;
  onToggle: (entry: BloatwareEntry) => void;
  onAction: (entry: BloatwareEntry, action: DebloatAction) => void;
  onBatchAction: (action: DebloatAction) => void;
  brand: string;
  onSelectBrand: (brand: string) => void;
}) {
  const selectedCount = selected.size;

  const brands = [
    { id: "auto", label: "Tự động" },
    { id: "xiaomi", label: "Xiaomi (MIUI/HyperOS)" },
    { id: "samsung", label: "Samsung (OneUI)" },
    { id: "coloros", label: "Oppo / Realme (ColorOS)" },
    { id: "funtouch", label: "Vivo (FuntouchOS)" },
  ];

  return (
    <div className="space-y-3">
      {/* Brand preset selector bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/70 border border-slate-200/70 p-2 text-xs font-bold">
        <span className="text-slate-500 px-2 uppercase tracking-wider text-[11px]">
          Preset Hãng:
        </span>
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelectBrand(b.id)}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              brand === b.id
                ? "bg-slate-900 text-white shadow-sm font-black"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div
        className={`${mutedPanelClass} flex flex-col gap-3 rounded-2xl p-3 lg:flex-row lg:items-center lg:justify-between`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-cyan-300">
            <PackageCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">
              {selectedCount} package đã chọn
            </p>
            <p className="text-xs font-semibold text-slate-500">
              {batchProgress
                ? `Đang xử lý ${batchProgress.done}/${batchProgress.total}`
                : "Chọn package để thao tác hàng loạt"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onBatchAction("disable")}
            disabled={selectedCount === 0 || Boolean(batchProgress)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Vô hiệu hóa
          </button>
          <button
            onClick={() => onBatchAction("restore")}
            disabled={selectedCount === 0 || Boolean(batchProgress)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Undo2 className="h-4 w-4" />
            Khôi phục
          </button>
          <button
            onClick={() => onBatchAction("uninstall")}
            disabled={selectedCount === 0 || Boolean(batchProgress)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-3 text-xs font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            <Trash2 className="h-4 w-4" />
            Gỡ
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<PackageCheck className="h-7 w-7" />}
          title="Không có package phù hợp"
          message="Thử đổi từ khóa tìm kiếm hoặc quét lại thiết bị."
        />
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry) => (
            <BloatwareRow
              key={entry.package}
              entry={entry}
              selected={selected.has(entry.package)}
              busyKey={busyKey}
              onToggle={() => onToggle(entry)}
              onAction={(action) => onAction(entry, action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BloatwareRow({
  entry,
  selected,
  busyKey,
  onToggle,
  onAction,
}: {
  entry: BloatwareEntry;
  selected: boolean;
  busyKey: string | null;
  onToggle: () => void;
  onAction: (action: DebloatAction) => void;
}) {
  const busy =
    busyKey === `debloat:disable:${entry.package}` ||
    busyKey === `debloat:restore:${entry.package}` ||
    busyKey === `debloat:uninstall:${entry.package}`;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3 w-full max-w-full overflow-hidden">
      <button
        onClick={onToggle}
        disabled={entry.risk === "KEEP"}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
          selected
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-white"
        } disabled:cursor-not-allowed disabled:opacity-40`}
        title={selected ? "Bỏ chọn" : "Chọn package"}
      >
        {selected ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="truncate text-sm font-black text-slate-900">
            {entry.name}
          </h4>
          <RiskBadge risk={entry.risk} />
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
            {entry.category}
          </span>
        </div>
        <p className="mt-1 truncate font-mono text-[11px] font-bold text-slate-500">
          {entry.package}
        </p>
        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
          {entry.description || "Không có mô tả."}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <PackageStatusBadge status={entry.status} />
        <IconButton
          title="Vô hiệu hóa"
          onClick={() => onAction("disable")}
          busy={busy && busyKey?.includes(":disable:")}
          icon={<XCircle className="h-4 w-4" />}
        />
        <IconButton
          title="Khôi phục"
          onClick={() => onAction("restore")}
          busy={busy && busyKey?.includes(":restore:")}
          icon={<Undo2 className="h-4 w-4" />}
        />
        <IconButton
          title="Gỡ khỏi user 0"
          onClick={() => onAction("uninstall")}
          busy={busy && busyKey?.includes(":uninstall:")}
          icon={<Trash2 className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

function PackageStatusBadge({ status }: { status: PackageStatus }) {
  const className =
    status === "installed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "disabled"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span
      className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase ${className}`}
    >
      {status}
    </span>
  );
}

function ConfirmDialog({
  state,
  onCancel,
}: {
  state: ConfirmState;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="mb-1">
              <RiskBadge risk={state.risk} />
            </div>
            <h3 className="text-base font-black text-slate-900">
              {state.title}
            </h3>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
              {state.message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            onClick={state.onConfirm}
            className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800"
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DnsControlPanelProps {
  dnsMode: string;
  dnsSpecifier: string;
  customDns: string;
  setCustomDns: (val: string) => void;
  onApplyDns: (mode: string, specifier?: string) => void;
  loading: boolean;
}

function DnsControlPanel({
  dnsMode,
  dnsSpecifier,
  customDns,
  setCustomDns,
  onApplyDns,
  loading,
}: DnsControlPanelProps) {
  const presets = [
    {
      name: "Cloudflare",
      hostname: "one.one.one.one",
      desc: "Tốc độ & Bảo mật",
    },
    { name: "Google DNS", hostname: "dns.google", desc: "Ổn định & Phổ biến" },
    {
      name: "AdGuard DNS",
      hostname: "dns.adguard-dns.com",
      desc: "Chặn quảng cáo",
    },
    { name: "NextDNS", hostname: "dns.nextdns.io", desc: "Tùy biến bộ lọc" },
    { name: "Quad9 DNS", hostname: "dns.quad9.net", desc: "Bảo mật mã độc" },
  ];

  return (
    <div className="space-y-4">
      {/* Banner Trạng thái Hiện tại */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Globe className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-500/80">
              Trạng thái Private DNS
            </span>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-sm font-black text-slate-900">
                {dnsMode === "hostname"
                  ? "Đang bật DNS riêng tư"
                  : dnsMode === "opportunistic"
                    ? "Chế độ Tự động"
                    : "Đang Tắt"}
              </span>
              {dnsMode === "hostname" && dnsSpecifier && (
                <span className="rounded-lg border border-blue-200/60 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-blue-700 shadow-sm">
                  {dnsSpecifier}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chọn nhanh máy chủ DNS (Chiếm 2 cột trên lg) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">
            Chọn nhanh Máy chủ DNS (DoT)
          </h5>
          <div className="grid gap-3 sm:grid-cols-2">
            {presets.map((preset) => {
              const isCurrent =
                dnsMode === "hostname" && dnsSpecifier === preset.hostname;
              return (
                <button
                  key={preset.hostname}
                  disabled={loading}
                  onClick={() => onApplyDns("hostname", preset.hostname)}
                  className={`group relative flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                    isCurrent
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm"
                      : "border-slate-100 bg-slate-50/50 hover:border-blue-500/30 hover:bg-blue-50/20 text-slate-700"
                  }`}
                >
                  <div className="min-w-0 pr-4">
                    <span className="block text-xs font-black">
                      {preset.name}
                    </span>
                    <span className="block text-[10px] font-bold text-slate-400 font-mono mt-0.5 truncate">
                      {preset.hostname}
                    </span>
                    <span className="block text-[9px] font-medium text-slate-500 mt-1">
                      {preset.desc}
                    </span>
                  </div>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all ${
                      isCurrent
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200/50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                    }`}
                  >
                    {isCurrent ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nhập thủ công & Chế độ hệ thống */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">
              Nhập DNS thủ công
            </h5>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Hostname (DoT DNS)
                </label>
                <input
                  type="text"
                  disabled={loading}
                  value={customDns}
                  onChange={(e) => setCustomDns(e.target.value)}
                  placeholder="Ví dụ: dns.google"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 font-mono text-xs font-semibold text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>
              <button
                disabled={loading || !customDns}
                onClick={() => onApplyDns("hostname")}
                className="w-full h-10 rounded-xl bg-slate-900 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-md shadow-slate-950/10"
              >
                Áp dụng DNS riêng tư
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">
              Chế độ hệ thống
            </h5>
            <div className="grid gap-2">
              <button
                disabled={loading}
                onClick={() => onApplyDns("opportunistic")}
                className={`w-full h-10 rounded-xl border text-xs font-black transition ${
                  dnsMode === "opportunistic"
                    ? "border-emerald-500/20 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                Tự động (Opportunistic)
              </button>
              <button
                disabled={loading}
                onClick={() => onApplyDns("off")}
                className={`w-full h-10 rounded-xl border text-xs font-black transition ${
                  dnsMode === "off"
                    ? "border-slate-300 bg-slate-100 text-slate-800"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                Tắt Private DNS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExperienceCenter;
