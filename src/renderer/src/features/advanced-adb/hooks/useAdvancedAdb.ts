import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDeviceStore } from "../../../store/deviceStore";
import { AdvancedCommandDefinition, CommandHistoryItem, ToastMessage } from "../types";

function extractValidDeviceIp(text: string): string | null {
  if (!text) return null;
  const matches = Array.from(
    text.matchAll(
      /(?:inet\s+|src\s+|addr:)?\b((?:192\.168|10\.|172\.(?:1[6-9]|2[0-9]|3[01]))\.\d+\.\d+)\b/g,
    ),
  );
  for (const m of matches) {
    const ip = m[1];
    if (
      ip &&
      ip !== "127.0.0.1" &&
      !ip.startsWith("0.") &&
      !ip.startsWith("169.254")
    ) {
      return ip;
    }
  }

  const allIps = Array.from(
    text.matchAll(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g),
  );
  for (const m of allIps) {
    const ip = m[1];
    if (
      ip &&
      ip !== "127.0.0.1" &&
      !ip.startsWith("0.") &&
      !ip.startsWith("127.") &&
      !ip.startsWith("169.254") &&
      !ip.startsWith("255.")
    ) {
      return ip;
    }
  }
  return null;
}

export function useAdvancedAdb() {
  const { activeDevice, devices } = useDeviceStore();

  // Phát hiện trạng thái thiết bị thực tế
  const currentDevice = devices.find((d) => d.id === activeDevice);
  const isUnauthorized = currentDevice?.type === "unauthorized";
  const isOffline = currentDevice?.type === "offline";

  // Tab con hiện tại
  const [subTab, setSubTab] = useState<"profile" | "catalog" | "shell" | "history">("profile");

  // Trạng thái chung
  const [loading, setLoading] = useState(false);
  const [deviceProfile, setDeviceProfile] = useState<any>(null);

  // --- SUB-TAB: DEVICE PROFILE STATE ---
  const [activeProfileTab, setActiveProfileTab] = useState<
    "props" | "settings_global" | "settings_secure" | "settings_system"
  >("props");
  const [profileSearch, setProfileSearch] = useState("");
  const [debouncedProfileSearch, setDebouncedProfileSearch] = useState("");
  const [propsList, setPropsList] = useState<Array<{ key: string; value: string }>>([]);
  const [settingsList, setSettingsList] = useState<Array<{ key: string; value: string }>>([]);

  // Debounce search profile
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProfileSearch(profileSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [profileSearch]);

  // --- SUB-TAB: COMMAND CATALOG STATE ---
  const [commands, setCommands] = useState<AdvancedCommandDefinition[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [commandParams, setCommandParams] = useState<Record<string, string>>({});
  const [catalogProcessingId, setCatalogProcessingId] = useState<string | null>(null);
  const [catalogOutput, setCatalogOutput] = useState<string>("");
  const [isCatalogTerminalMaximized, setIsCatalogTerminalMaximized] = useState(false);

  // --- SUB-TAB: RAW SHELL STATE ---
  const [shellInput, setShellInput] = useState("");
  const [shellLogs, setShellLogs] = useState<
    Array<{ type: "input" | "output" | "error" | "system"; text: string }>
  >([]);
  const [rawShellUnlocked, setRawShellUnlocked] = useState(false);
  const [slideValue, setSlideValue] = useState(0);
  const [isShellTerminalMaximized, setIsShellTerminalMaximized] = useState(false);
  const [typedCommands, setTypedCommands] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // --- SUB-TAB: HISTORY STATE ---
  const [historyItems, setHistoryItems] = useState<CommandHistoryItem[]>([]);

  // State Toast & Copy Info
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // State Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    risk: "SAFE" | "MEDIUM" | "RISKY" | "DANGEROUS";
    commandText: string;
    onConfirm: () => void;
  } | null>(null);

  // Giả lập dữ liệu chẩn đoán pin và mạng cho HUD
  const [hudBattery, setHudBattery] = useState({
    level: 85,
    temp: 36.4,
    charging: true,
  });
  const [hudNetwork, setHudNetwork] = useState({
    ip: "...",
    signal: "Tuyệt vời",
    type: "WIFI",
  });

  // Toast trigger
  const showToast = useCallback((
    msg: string,
    type: "success" | "error" | "info" | "warning" = "success"
  ) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Copy to clipboard helper
  const handleCopyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    showToast(`Đã sao chép: ${label}`, "success");
    setTimeout(() => setCopiedKey(null), 2000);
  }, [showToast]);

  // Tải danh sách command registry động
  useEffect(() => {
    let cancelled = false;
    void window.api
      .getAdvancedCommands()
      .then((commandList: AdvancedCommandDefinition[]) => {
        if (!cancelled) setCommands(commandList);
      })
      .catch(() => {
        if (!cancelled) {
          setCommands([]);
          showToast("Không tải được danh mục lệnh Advanced ADB", "error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const loadHudInfo = useCallback(async () => {
    if (!activeDevice) return;
    try {
      const batteryRes = await window.api.executeRawShell(activeDevice, "dumpsys battery");
      if (batteryRes.success && batteryRes.output) {
        const lines = batteryRes.output.split("\n");
        let level = 85;
        let temp = 36.2;
        let charging = false;

        lines.forEach((line) => {
          if (line.includes("level:")) {
            level = parseInt(line.split(":")[1].trim()) || 85;
          }
          if (line.includes("temperature:")) {
            temp = (parseInt(line.split(":")[1].trim()) || 360) / 10;
          }
          if (line.includes("status:")) {
            const status = parseInt(line.split(":")[1].trim());
            charging = status === 2 || status === 5;
          }
        });
        setHudBattery({ level, temp, charging });
      }

      let detectedIp = "";
      const storeDeviceInfo = useDeviceStore.getState().deviceInfo;
      if (
        storeDeviceInfo?.ipAddr &&
        storeDeviceInfo.ipAddr !== "Not Connected" &&
        storeDeviceInfo.ipAddr !== "Unknown"
      ) {
        detectedIp = storeDeviceInfo.ipAddr;
      }

      if (!detectedIp) {
        const deviceIpMatch = activeDevice.match(/^(\d+\.\d+\.\d+\.\d+)/);
        if (deviceIpMatch) {
          detectedIp = deviceIpMatch[1];
        }
      }

      if (!detectedIp) {
        const probes = [
          "ip addr show dev wlan0",
          "ip addr show dev wlan1",
          "ip route show",
          "ip addr show",
        ];
        for (const probe of probes) {
          const ipRes = await window.api.executeRawShell(activeDevice, probe);
          if (ipRes.success && ipRes.output) {
            const extracted = extractValidDeviceIp(ipRes.output);
            if (extracted) {
              detectedIp = extracted;
              break;
            }
          }
        }
      }

      setHudNetwork((prev) => ({
        ...prev,
        ip: detectedIp || "N/A",
      }));
    } catch (e) {
      console.error("Lỗi load HUD:", e);
    }
  }, [activeDevice]);

  const loadProfileData = useCallback(async () => {
    if (!activeDevice || isUnauthorized || isOffline) return;
    try {
      if (activeProfileTab === "props") {
        const props = await window.api.getProps(activeDevice);
        if (Array.isArray(props)) {
          setPropsList(props);
        }
      } else {
        const namespace = activeProfileTab.replace("settings_", "") as "global" | "secure" | "system";
        const settings = await window.api.getSettings(activeDevice, namespace);
        if (Array.isArray(settings)) {
          setSettingsList(settings);
        }
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu profile:", err);
    }
  }, [activeDevice, isUnauthorized, isOffline, activeProfileTab]);

  // Tải profile thiết bị và thông tin getprop/settings
  const loadDeviceProfile = useCallback(async () => {
    if (!activeDevice) return;

    if (isUnauthorized || isOffline) {
      setDeviceProfile(null);
      return;
    }

    setLoading(true);
    try {
      const profile = await window.api.getDeviceProfile(activeDevice);
      setDeviceProfile(profile);
      await loadProfileData();
      await loadHudInfo();
    } catch (error) {
      console.error("Lỗi khi tải thông tin nâng cao thiết bị:", error);
      showToast("Không thể kết nối nâng cao với thiết bị", "error");
    } finally {
      setLoading(false);
    }
  }, [activeDevice, isUnauthorized, isOffline, loadProfileData, loadHudInfo, showToast]);

  useEffect(() => {
    loadDeviceProfile();
  }, [loadDeviceProfile]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const addHistory = useCallback((
    command: string,
    risk: string,
    success: boolean,
    output: string
  ) => {
    const newItem: CommandHistoryItem = {
      timestamp: new Date().toLocaleTimeString(),
      command,
      risk,
      success,
      output,
    };
    setHistoryItems((prev) => [newItem, ...prev]);
  }, []);

  // --- CATALOG ACTIONS ---
  const handleParamChange = (key: string, val: string) => {
    setCommandParams((prev) => ({ ...prev, [key]: val }));
  };

  const handleExecutePreset = async (
    cmdId: string,
    actionType: "read" | "apply" | "rollback"
  ) => {
    if (!activeDevice) return;
    const cmd = commands.find((c) => c.id === cmdId);
    if (!cmd) return;

    const finalParams = { ...commandParams };

    if (cmdId === "setting_process_limit" && actionType === "apply") {
      finalParams.value = finalParams.value || "4";
    }

    const template =
      actionType === "apply"
        ? cmd.applyTemplate || cmd.readTemplate
        : actionType === "rollback"
          ? cmd.rollbackTemplate || cmd.readTemplate
          : cmd.readTemplate;

    let previewCommand = template || "";
    for (const [k, v] of Object.entries(finalParams)) {
      previewCommand = previewCommand.replace(`{${k}}`, v);
    }

    const executeAction = async () => {
      setCatalogProcessingId(cmdId);
      setCatalogOutput("");
      showToast(`Đang chạy: ${cmd.title}...`, "info");

      try {
        const res = await window.api.executePreset(
          activeDevice,
          cmdId,
          finalParams,
          actionType,
        );
        setCatalogOutput(res.output);
        if (res.success) {
          showToast(`Thực thi thành công: ${cmd.title}`, "success");
          await loadHudInfo();
        } else {
          showToast(`Lỗi: ${cmd.title}`, "error");
        }
        addHistory(previewCommand, cmd.risk, res.success, res.output);
      } catch (error: any) {
        setCatalogOutput(`Thất bại: ${error.message}`);
        showToast(`Thất bại: ${error.message}`, "error");
        addHistory(previewCommand, cmd.risk, false, error.message);
      } finally {
        setCatalogProcessingId(null);
      }
    };

    if (actionType === "apply" && cmd.risk !== "SAFE") {
      const msg = cmd.needsConfirmText
        ? cmd.needsConfirmText
        : `Lệnh này được đánh giá ở mức độ rủi ro ${cmd.risk}. Bạn có chắc chắn muốn áp dụng thay đổi này lên thiết bị?`;

      setConfirmModal({
        isOpen: true,
        title: cmd.title,
        message: msg,
        risk: cmd.risk,
        commandText: `adb shell ${previewCommand}`,
        onConfirm: () => {
          setConfirmModal(null);
          executeAction();
        },
      });
    } else {
      executeAction();
    }
  };

  const executeShellCommand = useCallback(async (deviceId: string, cmd: string) => {
    setShellLogs((prev) => [
      ...prev,
      { type: "input", text: `$ adb shell ${cmd}` },
    ]);

    try {
      const res = await window.api.executeRawShell(deviceId, cmd);

      if (res.success) {
        setShellLogs((prev) => [
          ...prev,
          { type: "output", text: res.output || "(Không có kết quả trả về)" },
        ]);
        showToast("Thực thi thành công", "success");
        addHistory(cmd, "RAW_SHELL", true, res.output);
        await loadHudInfo();
      } else {
        setShellLogs((prev) => [...prev, { type: "error", text: res.output }]);
        showToast("Lỗi hoặc lệnh bị từ chối", "error");
        addHistory(cmd, "RAW_SHELL", false, res.output);
      }
    } catch (error: any) {
      setShellLogs((prev) => [...prev, { type: "error", text: error.message }]);
      showToast(error.message, "error");
      addHistory(cmd, "RAW_SHELL", false, error.message);
    }
  }, [addHistory, loadHudInfo, showToast]);

  // --- RAW SHELL RUNNER ---
  const handleShellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDevice || !shellInput.trim()) return;

    const cmd = shellInput.trim();
    const deviceId = activeDevice;
    setShellInput("");
    setTypedCommands((prev) => {
      if (prev[prev.length - 1] === cmd) return prev;
      return [...prev, cmd];
    });
    setHistoryIndex(-1);

    setConfirmModal({
      isOpen: true,
      title: "Xác nhận chạy lệnh Raw Shell",
      message: "Cảnh báo: Bạn đang tự chạy lệnh ADB trực tiếp (Raw Shell). Lệnh này có thể can thiệp sâu vào hệ thống và gây brick thiết bị hoặc mất mát dữ liệu nếu sai sót.",
      risk: "DANGEROUS",
      commandText: `adb shell ${cmd}`,
      onConfirm: () => {
        setConfirmModal(null);
        executeShellCommand(deviceId, cmd);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typedCommands.length === 0) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex =
        historyIndex === -1
          ? typedCommands.length - 1
          : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setShellInput(typedCommands[nextIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= typedCommands.length) {
        setHistoryIndex(-1);
        setShellInput("");
      } else {
        setHistoryIndex(nextIndex);
        setShellInput(typedCommands[nextIndex]);
      }
    }
  };

  // --- SLIDE TO UNLOCK LOGIC ---
  const handleSlideChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setSlideValue(val);
    if (val >= 100) {
      setRawShellUnlocked(true);
      showToast("Cảnh báo: Đã truy cập lõi Shell hệ thống!", "warning");
    }
  };

  const handleSlideEnd = () => {
    if (slideValue < 100) {
      let current = slideValue;
      const interval = setInterval(() => {
        current -= 8;
        if (current <= 0) {
          current = 0;
          clearInterval(interval);
        }
        setSlideValue(current);
      }, 15);
    }
  };

  // Filtered lists
  const filteredProps = useMemo(() => {
    return propsList.filter(
      (p) =>
        p.key.toLowerCase().includes(debouncedProfileSearch.toLowerCase()) ||
        p.value.toLowerCase().includes(debouncedProfileSearch.toLowerCase())
    );
  }, [propsList, debouncedProfileSearch]);

  const filteredSettings = useMemo(() => {
    return settingsList.filter(
      (s) =>
        s.key.toLowerCase().includes(debouncedProfileSearch.toLowerCase()) ||
        s.value.toLowerCase().includes(debouncedProfileSearch.toLowerCase())
    );
  }, [settingsList, debouncedProfileSearch]);

  const filteredCommands = useMemo(() => {
    return commands.filter((cmd) => {
      const matchesSearch =
        cmd.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        cmd.description.toLowerCase().includes(catalogSearch.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || cmd.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [commands, catalogSearch, selectedCategory]);

  return {
    activeDevice,
    devices,
    currentDevice,
    isUnauthorized,
    isOffline,
    subTab,
    setSubTab,
    loading,
    deviceProfile,
    activeProfileTab,
    setActiveProfileTab,
    profileSearch,
    setProfileSearch,
    propsList,
    settingsList,
    commands,
    catalogSearch,
    setCatalogSearch,
    selectedCategory,
    setSelectedCategory,
    commandParams,
    setCommandParams,
    catalogProcessingId,
    catalogOutput,
    setCatalogOutput,
    isCatalogTerminalMaximized,
    setIsCatalogTerminalMaximized,
    shellInput,
    setShellInput,
    shellLogs,
    setShellLogs,
    rawShellUnlocked,
    setRawShellUnlocked,
    slideValue,
    setSlideValue,
    isShellTerminalMaximized,
    setIsShellTerminalMaximized,
    typedCommands,
    historyIndex,
    historyItems,
    toasts,
    copiedKey,
    confirmModal,
    setConfirmModal,
    hudBattery,
    hudNetwork,
    loadDeviceProfile,
    loadHudInfo,
    loadProfileData,
    handleParamChange,
    handleExecutePreset,
    executeShellCommand,
    handleShellSubmit,
    handleKeyDown,
    handleSlideChange,
    handleSlideEnd,
    handleCopyToClipboard,
    filteredProps,
    filteredSettings,
    filteredCommands,
  };
}
