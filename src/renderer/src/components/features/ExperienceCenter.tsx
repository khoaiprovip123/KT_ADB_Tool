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
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  TerminalSquare,
  Trash2,
  Undo2,
  Wand2,
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

const sectionMeta: Array<{
  id: SectionId;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    id: "overview",
    label: "Tổng quan",
    desc: "Lệnh khuyến nghị",
    icon: <Sparkles className="w-4 h-4" />,
  },
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

const panelClass =
  "border border-white/70 bg-white/72 backdrop-blur-2xl shadow-[0_18px_60px_rgba(15,23,42,0.08)]";

const mutedPanelClass =
  "border border-slate-200/70 bg-white/62 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.04)]";

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
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
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
  const [selectedBloat, setSelectedBloat] = useState<Set<string>>(new Set());
  const [bloatSearch, setBloatSearch] = useState("");
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
  const [batchProgress, setBatchProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const refreshToken = useRef(0);

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
  const isDeviceReady = Boolean(activeDevice && !isUnauthorized && !isOffline && !isBootloader);

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
        window.api.getBloatwareWithStatus(activeDevice),
        window.api.runAdbCommand(activeDevice, "shell settings get global private_dns_mode"),
        window.api.runAdbCommand(activeDevice, "shell settings get global private_dns_specifier"),
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

  const metrics = useMemo(() => {
    const supportedActions = unifiedActions.filter(
      (action) => action.status !== "UNSUPPORTED",
    );
    const enabledActions = supportedActions.filter(
      (action) => action.status === "SUPPORTED_ON",
    );
    const safePending = supportedActions.filter(
      (action) => action.risk === "SAFE" && action.status === "SUPPORTED_OFF",
    ).length;
    const riskyActions = supportedActions.filter(
      (action) => riskRank[action.risk] >= riskRank.RISKY,
    ).length;

    return {
      total: supportedActions.length,
      enabled: enabledActions.length,
      safePending,
      riskyActions,
      score:
        supportedActions.length === 0
          ? 0
          : Math.round((enabledActions.length / supportedActions.length) * 100),
    };
  }, [unifiedActions]);

  const sectionCounts = useMemo(() => {
    const counts: Record<SectionId, number> = {
      overview: unifiedActions.filter(
        (action) => action.status === "SUPPORTED_OFF" && action.risk === "SAFE",
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
    const base =
      activeSection === "overview"
        ? unifiedActions.filter(
            (action) =>
              action.status === "SUPPORTED_OFF" && action.risk === "SAFE",
          )
        : unifiedActions.filter((action) => action.section === activeSection);

    if (!normalizedQuery) return base;
    return base.filter(
      (action) =>
        action.title.toLowerCase().includes(normalizedQuery) ||
        action.description.toLowerCase().includes(normalizedQuery) ||
        action.currentValue?.toLowerCase().includes(normalizedQuery),
    );
  }, [activeSection, query, unifiedActions]);

  const filteredBloatware = useMemo(() => {
    const normalized = bloatSearch.trim().toLowerCase();
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
  }, [bloatSearch, bloatware]);

  const selectedBloatEntries = useMemo(
    () => bloatware.filter((entry) => selectedBloat.has(entry.package)),
    [bloatware, selectedBloat],
  );

  const activeDeviceName =
    currentDevice?.model || currentDevice?.id || "Chưa kết nối";
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

  const handleSafeOptimize = () => {
    if (!activeDevice) return;
    const safeActions = unifiedActions.filter(
      (action) => action.status === "SUPPORTED_OFF" && action.risk === "SAFE",
    );

    if (safeActions.length === 0) {
      toast.info("Không còn thao tác an toàn đang tắt.");
      return;
    }

    void runTrackedAction({
      key: "workspace:safe-optimize",
      title: "Tối ưu an toàn",
      detail: `${safeActions.length} thao tác SAFE`,
      source: "workspace",
      risk: "SAFE",
      execute: async () => {
        let success = 0;
        const lines: string[] = [];
        for (const action of safeActions) {
          if (action.source === "experience" && action.experienceStatus) {
            const item = action.experienceStatus.item;
            const res = await window.api.applyXiaomiItem(
              activeDevice,
              item.id,
              true,
            );
            if (res.success) success += 1;
            lines.push(
              `${res.success ? "OK" : "FAIL"} experience:${item.id} ${summarizeOutput(
                res.output,
              )}`,
            );
          }

          if (action.source === "system" && action.systemTweak) {
            const tweak = action.systemTweak;
            const res = await window.api.applyTweak(
              activeDevice,
              tweak.id,
              true,
            );
            if (res.success) success += 1;
            lines.push(
              `${res.success ? "OK" : "FAIL"} system:${tweak.id} ${summarizeOutput(
                res.message,
              )}`,
            );
          }
        }

        return {
          success: success > 0,
          output: `Đã chạy ${success}/${safeActions.length} thao tác.\n${lines.join(
            "\n",
          )}`,
        };
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

    if (mode === "hostname" && (!targetSpecifier || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(targetSpecifier))) {
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
            "shell settings put global private_dns_mode hostname"
          );
          const res = await window.api.runAdbCommand(
            activeDevice,
            `shell settings put global private_dns_specifier ${targetSpecifier}`
          );
          return { success: res.success, output: res.output };
        } else if (mode === "opportunistic") {
          const res = await window.api.runAdbCommand(
            activeDevice,
            "shell settings put global private_dns_mode opportunistic"
          );
          return { success: res.success, output: res.output };
        } else {
          const res = await window.api.runAdbCommand(
            activeDevice,
            "shell settings put global private_dns_mode off"
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

  return (
    <div className="experience-center h-full w-full min-w-0 min-h-0 overflow-hidden rounded-[18px] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_26%),linear-gradient(135deg,#eef5fb_0%,#f8fafc_45%,#eef2f7_100%)] p-3 text-slate-800">
      <div className="flex flex-col h-full w-full min-w-0 min-h-0 gap-3">
        <header
          className={`${panelClass} flex flex-col gap-3 rounded-2xl p-3 shrink-0`}
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-100/80 pb-2">
            {/* Device Info & Brand in 1 Place */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-cyan-300 shadow-sm">
                <Smartphone className="h-5 w-5" />
                <span
                  className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white ${
                    isDeviceReady ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">UX & Tinh chỉnh</span>
                  <span className="text-slate-250">|</span>
                  <h3 className="text-sm font-black text-slate-955 leading-none">
                    {activeDeviceName}
                  </h3>
                  {deviceProfile?.sdk && (
                    <span className="rounded-full border border-slate-200 bg-white px-1.5 py-0.2 text-[8px] font-black uppercase text-slate-500">
                      API {deviceProfile.sdk}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1 truncate">
                  {profileLine}
                </p>
              </div>
            </div>

            {/* Metrics & Actions on the Right (Vùng khoanh đỏ) - Compact version to prevent layout overflow */}
            <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0 max-w-[65%]">
              {/* Score pill */}
              <div className="flex h-7 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/60 px-2 text-[10px] font-black text-emerald-700">
                <Activity className="h-3 w-3" />
                <span>Score {metrics.score}%</span>
              </div>

              {/* Status metrics */}
              <div className="flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700">
                <BadgeCheck className="h-3 w-3 text-emerald-600" />
                <span>Đã bật: <strong className="font-black">{metrics.enabled}/{metrics.total}</strong></span>
              </div>
              <div className="flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-700">
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                <span>Rủi ro: <strong className="font-black">{metrics.riskyActions}</strong></span>
              </div>

              {/* Action buttons */}
              <button
                onClick={() => void loadWorkspace()}
                disabled={!isDeviceReady || loading}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-2.5 w-2.5 ${loading ? "animate-spin" : ""}`}
                />
                Quét lại
              </button>
              <button
                onClick={handleSafeOptimize}
                disabled={
                  !isDeviceReady || loading || metrics.safePending === 0
                }
                className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-900 px-2 text-[10px] font-black text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
              >
                <Zap className="h-2.5 w-2.5 text-cyan-300" />
                Tối ưu SAFE
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Navigation tabs */}
            <nav className="flex items-center gap-0.5 rounded-lg bg-slate-100/80 p-0.5 min-w-0 overflow-x-auto scrollbar-none flex-1">
              {sectionMeta.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`group flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold transition-all shrink-0 ${
                    activeSection === section.id
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200/30"
                      : "text-slate-655 hover:text-slate-900 hover:bg-white/40"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                      activeSection === section.id
                        ? "bg-blue-50 text-blue-600"
                        : "bg-slate-200/60 text-slate-500 group-hover:bg-slate-200"
                    }`}
                  >
                    {React.cloneElement(section.icon as React.ReactElement, { className: "w-2.5 h-2.5" })}
                  </span>
                  <span className="font-extrabold truncate">
                    {section.label}
                  </span>
                  <span
                    className={`rounded-full px-1 text-[8.5px] font-black min-w-[14px] h-3.5 flex items-center justify-center ${
                      activeSection === section.id
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {sectionCounts[section.id]}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex min-h-0 flex-col gap-3 overflow-hidden w-full max-w-full">
          <section
            className={`${panelClass} flex min-h-0 flex-1 flex-col rounded-2xl overflow-hidden w-full max-w-full`}
          >
            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-950">
                  {sectionMeta.find((section) => section.id === activeSection)
                    ?.label ?? "Tác vụ"}
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {activeSection === "debloat"
                    ? `${filteredBloatware.length} package đang hiển thị`
                    : activeSection === "dns"
                      ? "Cấu hình máy chủ DNS mã hóa và chặn quảng cáo"
                      : `${visibleActions.length} thao tác trong nhóm`}
                </p>
              </div>

              {activeSection !== "dns" && (
                activeSection === "debloat" ? (
                  <SearchBox
                    value={bloatSearch}
                    onChange={setBloatSearch}
                    placeholder="Tìm package, tên app, nhóm..."
                  />
                ) : (
                  <SearchBox
                    value={query}
                    onChange={setQuery}
                    placeholder="Tìm tweak, trạng thái, giá trị..."
                  />
                )
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!isDeviceReady ? (
                <EmptyState
                  icon={<TerminalSquare className="h-7 w-7" />}
                  title="Thiết bị chưa sẵn sàng"
                  message={profileLine}
                />
              ) : activeSection === "debloat" ? (
                <DebloatWorkspace
                  entries={filteredBloatware}
                  selected={selectedBloat}
                  busyKey={busyKey}
                  batchProgress={batchProgress}
                  onToggle={toggleBloatSelection}
                  onAction={handleBloatAction}
                  onBatchAction={handleBatchBloatAction}
                />
              ) : (
                <div className="space-y-4">
                  {(activeSection === "display" ||
                    activeSection === "overview") && (
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
                      busyKey={busyKey}
                      onApplyDpi={handleApplyDpi}
                      onResetDpi={handleResetDpi}
                      onApplyResolution={handleApplyResolution}
                      onResetResolution={handleResetResolution}
                      onAnimationScale={handleAnimationScale}
                    />
                  )}

                  {activeSection === "dns" && (
                    <DnsControlPanel
                      dnsMode={dnsMode}
                      dnsSpecifier={dnsSpecifier}
                      customDns={customDns}
                      setCustomDns={setCustomDns}
                      onApplyDns={handleApplyDns}
                      loading={loading}
                    />
                  )}

                  {activeSection !== "dns" && (
                    loading ? (
                      <LoadingRows />
                    ) : visibleActions.length === 0 ? (
                      <EmptyState
                        icon={<ListChecks className="h-7 w-7" />}
                        title="Không có thao tác phù hợp"
                        message="Hãy đổi nhóm hoặc làm mới trạng thái thiết bị."
                      />
                    ) : (
                      <div className="space-y-2.5">
                        {visibleActions.map((action) => (
                          <ActionRow
                            key={action.id}
                            action={action}
                            busy={busyKey === `${action.source}:${action.id}`}
                            onToggle={handleToggleAction}
                            onRollback={handleRollbackExperience}
                          />
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {confirmState && (
        <ConfirmDialog
          state={confirmState}
          onCancel={() => setConfirmState(null)}
        />
      )}
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
  busyKey: string | null;
  onApplyDpi: () => void;
  onResetDpi: () => void;
  onApplyResolution: () => void;
  onResetResolution: () => void;
  onAnimationScale: (scale: 0 | 0.5 | 1) => void;
}) {
  return (
    <div className={`${mutedPanelClass} rounded-2xl p-4`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-slate-900">
            Bộ điều khiển hiển thị
          </h4>
          <p className="text-xs font-semibold text-slate-500">
            DPI hiện tại {deviceDpi ?? "--"} · Độ phân giải{" "}
            {resolution ? `${resolution.width}x${resolution.height}` : "--"}
          </p>
        </div>
        <MonitorSmartphone className="h-5 w-5 text-blue-500" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
          <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            DPI
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              min={160}
              max={640}
              value={customDpi || ""}
              onChange={(event) => setCustomDpi(event.target.value === "" ? 0 : Number(event.target.value))}
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

        <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
          <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            Độ phân giải
          </label>
          <div className="mt-2 grid grid-cols-[1fr_1fr_auto_auto] gap-2">
            <input
              type="number"
              min={480}
              max={3840}
              value={customWidth || ""}
              onChange={(event) => setCustomWidth(event.target.value === "" ? 0 : Number(event.target.value))}
              className="h-10 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-800 outline-none focus:border-blue-400"
            />
            <input
              type="number"
              min={800}
              max={3840}
              value={customHeight || ""}
              onChange={(event) => setCustomHeight(event.target.value === "" ? 0 : Number(event.target.value))}
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

        <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
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
    </div>
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
    reasons.push(
      `Yêu cầu ứng dụng hệ thống: ${strategy.packages.join(", ")}`,
    );
  }
  return reasons.join(" | ") || "Không đáp ứng cấu hình thiết bị";
}

function ActionRow({
  action,
  busy,
  onToggle,
  onRollback,
}: {
  action: UnifiedAction;
  busy: boolean;
  onToggle: (action: UnifiedAction) => void;
  onRollback: (action: UnifiedAction) => void;
}) {
  const isOn = action.status === "SUPPORTED_ON";
  const isUnsupported = action.status === "UNSUPPORTED";
  const isUnknown = action.status === "UNKNOWN" || action.status === "ERROR";

  return (
    <div
      className={`group rounded-2xl border px-4 py-3 transition w-full max-w-full overflow-hidden ${
        isUnsupported
          ? "border-slate-200/60 bg-slate-50/60 opacity-70"
          : isOn
            ? "border-emerald-200/80 bg-emerald-50/45"
            : "border-slate-200/70 bg-white/75 hover:border-blue-200 hover:bg-white"
      }`}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
            isOn
              ? "border-emerald-200 bg-white text-emerald-600"
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
              ⚠️ Không tương thích: {getUnsupportedReason(action.experienceStatus.item.detectStrategy)}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
            <StatusBadge status={action.status} />
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

function StatusBadge({ status }: { status: ActionState }) {
  const content =
    status === "SUPPORTED_ON"
      ? ["Đang bật", "bg-emerald-100 text-emerald-700"]
      : status === "SUPPORTED_OFF"
        ? ["Đang tắt", "bg-slate-100 text-slate-600"]
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
}: {
  entries: BloatwareEntry[];
  selected: Set<string>;
  busyKey: string | null;
  batchProgress: { done: number; total: number } | null;
  onToggle: (entry: BloatwareEntry) => void;
  onAction: (entry: BloatwareEntry, action: DebloatAction) => void;
  onBatchAction: (action: DebloatAction) => void;
}) {
  const selectedCount = selected.size;

  return (
    <div className="space-y-3">
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
    { name: "Cloudflare", hostname: "one.one.one.one", desc: "Tốc độ & Bảo mật" },
    { name: "Google DNS", hostname: "dns.google", desc: "Ổn định & Phổ biến" },
    { name: "AdGuard DNS", hostname: "dns.adguard-dns.com", desc: "Chặn quảng cáo" },
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
                {dnsMode === "hostname" ? "Đang bật DNS riêng tư" : dnsMode === "opportunistic" ? "Chế độ Tự động" : "Đang Tắt"}
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
              const isCurrent = dnsMode === "hostname" && dnsSpecifier === preset.hostname;
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
                    <span className="block text-xs font-black">{preset.name}</span>
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
                    {isCurrent ? <Check className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
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
