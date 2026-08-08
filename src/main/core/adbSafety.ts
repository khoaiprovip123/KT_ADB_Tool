/**
 * ADB Safety Layer - Cung cấp cơ chế xác thực đầu vào, đánh giá rủi ro
 * và ngăn chặn tấn công Command Injection khi thực thi lệnh ADB.
 */

export type RiskLevel = "SAFE" | "MEDIUM" | "RISKY" | "DANGEROUS";

export type CommandMode =
  | "READ_ONLY"
  | "WRITE_SETTING"
  | "PACKAGE_OP"
  | "FILE_OP"
  | "REBOOT_OP"
  | "RAW_SHELL";

export interface EvaluationResult {
  allowed: boolean;
  risk: RiskLevel;
  mode: CommandMode;
  reason?: string;
}

import {
  validatePackageName,
  validateRemotePath,
  shellQuote,
  SETTINGS_KEY_REGEX,
  REMOTE_PATH_DANGEROUS_CHARS,
} from "../../shared/validation";

export { validatePackageName, validateRemotePath, shellQuote };

/**
 * Kiểm tra tính hợp lệ của Android Settings Key.
 */
export function validateSettingsKey(key: string): boolean {
  if (!key || key.length > 128) return false;
  return SETTINGS_KEY_REGEX.test(key);
}

/**
 * Đánh giá mức độ rủi ro và phân loại chế độ hoạt động của một ADB command thô.
 */
export function evaluateCommand(cmd: string): EvaluationResult {
  const trimmed = cmd.trim();

  if (!trimmed) {
    return {
      allowed: false,
      risk: "SAFE",
      mode: "READ_ONLY",
      reason: "Lệnh rỗng.",
    };
  }

  // Phát hiện và chặn chèn nhiều câu lệnh (Command Chaining / Command Injection)
  const commandInjectionRegex = /[;&|`$\n\r]/;
  if (commandInjectionRegex.test(trimmed)) {
    return {
      allowed: false,
      risk: "DANGEROUS",
      mode: "RAW_SHELL",
      reason:
        "Phát hiện ký tự nối lệnh hoặc subshell nguy hiểm (Command Injection).",
    };
  }

  // 1. Phân loại REBOOT_OP (Khởi động lại)
  if (trimmed === "reboot" || trimmed.startsWith("reboot ")) {
    return { allowed: true, risk: "MEDIUM", mode: "REBOOT_OP" };
  }

  // 2. Phân loại WRITE_SETTING (Ghi đè cài đặt hệ thống)
  if (trimmed.startsWith("settings put ")) {
    const parts = trimmed.split(/\s+/);
    // settings put <namespace> <key> <value>
    if (parts.length >= 4) {
      const namespace = parts[2];
      const key = parts[3];

      if (!["global", "system", "secure"].includes(namespace)) {
        return {
          allowed: false,
          risk: "DANGEROUS",
          mode: "WRITE_SETTING",
          reason: `Namespace cài đặt không hợp lệ: ${namespace}`,
        };
      }
      if (!validateSettingsKey(key)) {
        return {
          allowed: false,
          risk: "DANGEROUS",
          mode: "WRITE_SETTING",
          reason: `Cấu trúc cài đặt Key không an toàn: ${key}`,
        };
      }

      // Các cài đặt hệ thống thường an toàn hoặc rủi ro trung bình
      const isRiskyKey = [
        "miui_optimization",
        "background_process_limit",
      ].includes(key);
      return {
        allowed: true,
        risk: isRiskyKey ? "RISKY" : "SAFE",
        mode: "WRITE_SETTING",
      };
    }
    return {
      allowed: false,
      risk: "DANGEROUS",
      mode: "WRITE_SETTING",
      reason: "Sai định dạng cấu hình settings put.",
    };
  }

  if (trimmed.startsWith("settings delete ")) {
    const parts = trimmed.split(/\s+/);
    if (
      parts.length === 4 &&
      ["global", "system", "secure"].includes(parts[2]) &&
      validateSettingsKey(parts[3])
    ) {
      return { allowed: true, risk: "MEDIUM", mode: "WRITE_SETTING" };
    }
    return {
      allowed: false,
      risk: "DANGEROUS",
      mode: "WRITE_SETTING",
      reason: "Sai định dạng settings delete.",
    };
  }

  // 3. Phân loại READ_ONLY Settings (Đọc cài đặt)
  if (trimmed.startsWith("settings get ")) {
    return { allowed: true, risk: "SAFE", mode: "READ_ONLY" };
  }

  // Device Idle whitelist có cả lệnh đọc và ghi; phải phân loại trước dumpsys chung.
  if (trimmed === "dumpsys deviceidle whitelist") {
    return { allowed: true, risk: "SAFE", mode: "READ_ONLY" };
  }
  const whitelistMutation = trimmed.match(
    /^dumpsys deviceidle whitelist ([+-])([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+)$/,
  );
  if (whitelistMutation) {
    return { allowed: true, risk: "RISKY", mode: "PACKAGE_OP" };
  }
  if (trimmed.startsWith("dumpsys deviceidle whitelist ")) {
    return {
      allowed: false,
      risk: "DANGEROUS",
      mode: "PACKAGE_OP",
      reason: "Sai định dạng Device Idle whitelist.",
    };
  }

  // Chỉ cho phép đọc hoặc đặt một AppOp cụ thể với mode hữu hạn.
  if (
    /^cmd appops get [a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+ [A-Z][A-Z0-9_]{1,63}$/.test(
      trimmed,
    )
  ) {
    return { allowed: true, risk: "SAFE", mode: "READ_ONLY" };
  }
  if (
    /^cmd appops set [a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+ [A-Z][A-Z0-9_]{1,63} (?:allow|deny|ignore|default|foreground)$/.test(
      trimmed,
    )
  ) {
    return { allowed: true, risk: "RISKY", mode: "PACKAGE_OP" };
  }
  if (trimmed.startsWith("cmd appops ")) {
    return {
      allowed: false,
      risk: "DANGEROUS",
      mode: "PACKAGE_OP",
      reason: "Sai định dạng hoặc AppOps mode không được phép.",
    };
  }

  if (trimmed === "cmd uimode night") {
    return { allowed: true, risk: "SAFE", mode: "READ_ONLY" };
  }
  if (/^cmd uimode night (?:yes|no|auto|custom)$/.test(trimmed)) {
    return { allowed: true, risk: "MEDIUM", mode: "WRITE_SETTING" };
  }
  if (trimmed.startsWith("cmd uimode")) {
    return {
      allowed: false,
      risk: "DANGEROUS",
      mode: "RAW_SHELL",
      reason: "Sai định dạng cmd uimode.",
    };
  }

  // 3b. Các lệnh đọc-only an toàn (getprop, dumpsys, cat, ls, wm, df, getenforce, which, id, ...)
  const SAFE_READ_PREFIXES = [
    "getprop",
    "dumpsys",
    "cat ", // CHÚ Ý: cat chỉ an toàn khi đường dẫn đã được xác thực qua validateRemotePath ở tầng trên để tránh Path Traversal đọc file hệ thống nhạy cảm.
    "ls ",
    "ls\n",
    "wm size",
    "wm density",
    "df",
    "du ",
    "ps ",
    "ip ",
    "netstat ",
    "ss ",
    "getenforce",
    "which ",
    "id",
    "uname",
    "uptime",
    "date",
    "cat\t",
    "head ",
    "tail ",
    "grep ",
    "logcat",
    "dmesg",
  ];
  if (SAFE_READ_PREFIXES.some((p) => trimmed.startsWith(p))) {
    return { allowed: true, risk: "SAFE", mode: "READ_ONLY" };
  }

  // 3c. Các lệnh service/cmd đọc (am start, cmd activity, cmd package list, svc, input, ...)
  const SAFE_CMD_PREFIXES = [
    "am start",
    "am broadcast",
    "am force-stop",
    "am kill ",
    "am kill-all",
    "am send-trim-memory ",
    "am compact ",
    "am set-standby-bucket ",
    "cmd activity",
    "cmd package list",
    "cmd notification",
    "cmd device_config",
    "cmd settings",
    "cmd power",
    "svc power",
    "svc wifi",
    "svc data",
    "input ",
    "screencap ",
    "screenrecord ",
    "content query",
    "content read",
    "appops ",
    "service call ",
    "dumpsys ",
  ];
  if (SAFE_CMD_PREFIXES.some((p) => trimmed.startsWith(p))) {
    return { allowed: true, risk: "MEDIUM", mode: "RAW_SHELL" };
  }

  // 3d. Các lệnh pm an toàn (list, path, dump, clear, enable, install-existing)
  if (
    trimmed.startsWith("pm list ") ||
    trimmed.startsWith("pm path ") ||
    trimmed.startsWith("pm dump ") ||
    trimmed.startsWith("pm clear ") ||
    trimmed.startsWith("pm enable ") ||
    trimmed.startsWith("pm install-existing ")
  ) {
    return { allowed: true, risk: "SAFE", mode: "PACKAGE_OP" };
  }

  // 3e. settings list (đọc toàn bộ settings namespace)
  if (trimmed.startsWith("settings list ")) {
    return { allowed: true, risk: "SAFE", mode: "READ_ONLY" };
  }

  // 3f. device_config list (đọc config)
  if (trimmed.startsWith("device_config ")) {
    return { allowed: true, risk: "SAFE", mode: "READ_ONLY" };
  }

  // 4. Phân loại PACKAGE_OP (Cài đặt, gỡ cài đặt, biên dịch ART)
  if (trimmed.startsWith("pm ") || trimmed.startsWith("cmd package ")) {
    // Chặn các tác vụ nguy hại hoặc can thiệp lõi nếu không thuộc whitelist
    if (trimmed.includes("disable-user") || trimmed.includes("uninstall")) {
      // Tìm chuỗi khớp định dạng Package Name trong câu lệnh
      const match = trimmed.match(
        /(?:disable-user|uninstall)(?:\s+-[a-zA-Z0-9-]+|\s+--[a-zA-Z0-9-]+|\s+\d+)*\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+)/,
      );
      if (!match) {
        return {
          allowed: false,
          risk: "DANGEROUS",
          mode: "PACKAGE_OP",
          reason: "Không tìm thấy tên Package hợp lệ hoặc sai cấu trúc lệnh.",
        };
      }
      const pkg = match[1];
      if (pkg.length > 128) {
        return {
          allowed: false,
          risk: "DANGEROUS",
          mode: "PACKAGE_OP",
          reason: "Tên Package quá dài.",
        };
      }
      return { allowed: true, risk: "RISKY", mode: "PACKAGE_OP" };
    }

    if (trimmed.includes("compile")) {
      return { allowed: true, risk: "MEDIUM", mode: "PACKAGE_OP" };
    }

    return { allowed: true, risk: "SAFE", mode: "PACKAGE_OP" };
  }

  // 5. Phân loại FILE_OP (rm, mkdir, mv)
  if (
    trimmed.startsWith("rm ") ||
    trimmed.startsWith("mkdir ") ||
    trimmed.startsWith("mv ")
  ) {
    const normalizedSpaces = trimmed.replace(/\s+/g, " ");
    const tokens = normalizedSpaces.split(" ");
    const rmIndex = tokens.findIndex((t) => t === "rm");
    if (rmIndex !== -1) {
      let hasRecursive = false;
      const paths: string[] = [];
      for (let i = rmIndex + 1; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.startsWith("-")) {
          if (token.includes("r")) {
            hasRecursive = true;
          }
        } else {
          paths.push(token);
        }
      }
      if (hasRecursive) {
        for (const p of paths) {
          const isApprovedRoot = [
            "/sdcard",
            "/storage",
            "/data/local/tmp",
          ].some((root) => p === root || p.startsWith(`${root}/`));
          if (!isApprovedRoot) {
            return {
              allowed: false,
              risk: "DANGEROUS",
              mode: "FILE_OP",
              reason:
                "Lệnh xóa đệ quy chỉ được phép trong /sdcard, /storage hoặc /data/local/tmp.",
            };
          }
        }
      }
    }
    return { allowed: true, risk: "RISKY", mode: "FILE_OP" };
  }

  // 6. Cho phép setprop cấu hình locale/ngôn ngữ/quốc gia
  if (
    trimmed.startsWith("setprop persist.sys.locale ") ||
    trimmed.startsWith("setprop persist.sys.language ") ||
    trimmed.startsWith("setprop persist.sys.country ")
  ) {
    const parts = trimmed.split(/\s+/);
    if (parts.length === 3) {
      const val = parts[2];
      if (/^[a-zA-Z0-9_-]+$/.test(val)) {
        return { allowed: true, risk: "MEDIUM", mode: "RAW_SHELL" };
      }
    }
  }

  // Mặc định KHÔNG cho phép — chỉ các lệnh đã được whitelist ở trên mới chạy.
  // Nếu cần mở rộng, hãy thêm pattern cụ thể phía trên thay vì mở default.
  return {
    allowed: false,
    risk: "DANGEROUS",
    mode: "RAW_SHELL",
    reason:
      "Lệnh không nằm trong danh sách cho phép. Cần whitelist cụ thể để thực thi.",
  };
}

/**
 * Xây dựng lệnh Shell an toàn dựa trên template và tham số hóa để ngăn chặn Command Injection.
 */
export function buildShellCommand(
  template: string,
  args: Record<string, string | number>,
): string {
  let command = template;

  for (const [key, value] of Object.entries(args)) {
    const stringVal = String(value);

    // Validate dữ liệu truyền vào theo từng loại khóa
    if (key.toLowerCase().includes("package") || key === "pkg") {
      if (!validatePackageName(stringVal)) {
        throw new Error(
          `Đầu vào không hợp lệ cho tham số Package Name: ${stringVal}`,
        );
      }
    } else if (key.toLowerCase().includes("path") || key === "remote") {
      if (!validateRemotePath(stringVal)) {
        throw new Error(
          `Đầu vào không hợp lệ cho tham số File Path: ${stringVal}`,
        );
      }
    } else if (key.toLowerCase().includes("key") || key === "setting") {
      if (!validateSettingsKey(stringVal)) {
        throw new Error(
          `Đầu vào không hợp lệ cho tham số Settings Key: ${stringVal}`,
        );
      }
    } else {
      // Với các tham số thông thường, lọc sạch ký tự chèn shell nguy hiểm
      if (REMOTE_PATH_DANGEROUS_CHARS.test(stringVal)) {
        throw new Error(`Đầu vào chứa ký tự đặc biệt nguy hiểm: ${stringVal}`);
      }
    }

    // Thay thế an toàn
    command = command.replace(new RegExp(`{${key}}`, "g"), stringVal);
  }

  return command;
}

/**
 * Làm sạch tất cả các tiền tố "adb shell", "shell", "adb" lặp lại dư thừa ở đầu câu lệnh.
 */
export function cleanAdbPrefix(cmd: string): string {
  return cmd
    .trim()
    .replace(/^(adb\s+shell\s+|shell\s+|adb\s+)+/i, "")
    .trim();
}
