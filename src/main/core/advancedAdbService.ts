import { runAdbCommand, runAdbCommandDetailed } from "./adbCore";
import { ADVANCED_COMMANDS } from "./advancedCommandRegistry";
import { evaluateCommand, buildShellCommand, cleanAdbPrefix } from "./adbSafety";

const GETPROP_REGEX = /^\[([^\]]+)\]:\s*\[([^\]]*)\]$/;
export type PresetAction = "read" | "apply" | "rollback";

export class AdvancedAdbService {
  /**
   * Đọc danh sách thuộc tính getprop và trả về mảng key-value
   */
  async getProps(
    deviceId: string,
  ): Promise<Array<{ key: string; value: string }>> {
    try {
      const output = await runAdbCommand(deviceId, "getprop", () => {});
      const lines = output.split("\n");
      const result: Array<{ key: string; value: string }> = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Định dạng getprop: [ro.product.model]: [Redmi Note 12]
        const match = trimmed.match(GETPROP_REGEX);
        if (match) {
          result.push({
            key: match[1],
            value: match[2],
          });
        }
      }
      return result;
    } catch (error) {
      console.error("Lỗi khi đọc getprop:", error);
      return [];
    }
  }

  /**
   * Đọc danh sách settings của một namespace
   */
  async getSettingsList(
    deviceId: string,
    namespace: string,
  ): Promise<Array<{ key: string; value: string }>> {
    if (!["global", "system", "secure"].includes(namespace)) {
      throw new Error(`Namespace không hợp lệ: ${namespace}`);
    }

    try {
      const output = await runAdbCommand(
        deviceId,
        `settings list ${namespace}`,
        () => {},
      );

      if (
        output.startsWith("FAILED") ||
        output.startsWith("ERROR") ||
        output.startsWith("CRITICAL ERROR") ||
        output.includes("[BLOCKED BY SAFETY LAYER]")
      ) {
        return [];
      }

      const lines = output.split("\n");
      const result: Array<{ key: string; value: string }> = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          result.push({
            key: trimmed.slice(0, eqIdx),
            value: trimmed.slice(eqIdx + 1),
          });
        } else {
          result.push({
            key: trimmed,
            value: "",
          });
        }
      }
      return result;
    } catch (error) {
      console.error(`Lỗi khi đọc settings list ${namespace}:`, error);
      return [];
    }
  }

  /**
   * Đọc dumpsys dịch vụ cụ thể
   */
  async getDumpsys(deviceId: string, service: string): Promise<string> {
    const cleanService = service.trim().toLowerCase();
    
    // Chỉ cho phép chữ cái thường (ví dụ: battery, wifi, activity)
    if (!/^[a-z]+$/.test(cleanService)) {
      throw new Error(`Dịch vụ không hợp lệ: ${service}`);
    }

    const allowedDumpsys = [
      "battery",
      "power",
      "display",
      "window",
      "wifi",
      "activity",
    ];

    if (!allowedDumpsys.includes(cleanService)) {
      throw new Error(
        `Dịch vụ dumpsys không được hỗ trợ hoặc không an toàn: ${service}`,
      );
    }

    return await runAdbCommand(deviceId, `dumpsys ${cleanService}`, () => {});
  }

  /**
   * Thực thi một preset command trong Registry với các tham số tương ứng
   */
  async executePresetCommand(
    deviceId: string,
    commandId: string,
    params: Record<string, string | number>,
    action: PresetAction,
  ): Promise<{ success: boolean; output: string }> {
    const definition = ADVANCED_COMMANDS.find((c) => c.id === commandId);
    if (!definition) {
      return {
        success: false,
        output: `Không tìm thấy lệnh có ID: ${commandId}`,
      };
    }

    const template =
      action === "read"
        ? definition.readTemplate
        : action === "rollback"
          ? definition.rollbackTemplate
          : definition.applyTemplate;
    if (!template) {
      return {
        success: false,
        output: `Lệnh ${commandId} không hỗ trợ thao tác ${action}.`,
      };
    }

    try {
      // 1. Dựng câu lệnh shell an toàn từ template và tham số hóa
      const shellCmd = buildShellCommand(template, params);
      if (/\{[a-zA-Z0-9_]+\}/.test(shellCmd)) {
        return {
          success: false,
          output: "Thiếu tham số bắt buộc cho câu lệnh.",
        };
      }

      const outputs: string[] = [];
      const subCommands = shellCmd
        .split("&&")
        .map((part) => part.trim())
        .filter(Boolean);

      for (const subCommand of subCommands) {
        const safetyCheck = evaluateCommand(subCommand);
        if (!safetyCheck.allowed) {
          return {
            success: false,
            output: `[BLOCKED BY SAFETY LAYER] ${safetyCheck.reason || "Lệnh không an toàn."}`,
          };
        }

        const result = await runAdbCommandDetailed(deviceId, subCommand);
        outputs.push(result.output);
        if (!result.success) {
          return { success: false, output: outputs.join("\n").trim() };
        }
      }

      return { success: true, output: outputs.join("\n").trim() };
    } catch (error: any) {
      return {
        success: false,
        output: error.message || "Lỗi không xác định khi chạy lệnh preset.",
      };
    }
  }

  /**
   * Thực thi câu lệnh thô (Raw ADB Shell) trong tab Power User
   */
  async executeRawShell(
    deviceId: string,
    command: string,
  ): Promise<{ success: boolean; output: string }> {
    const trimmed = cleanAdbPrefix(command);

    // Ngăn chặn các câu lệnh cực kỳ nguy hiểm có thể phá hủy thiết bị
    if (
      trimmed.includes("rm -rf /") &&
      !trimmed.includes("rm -rf /sdcard") &&
      !trimmed.includes("rm -rf /storage") &&
      !trimmed.includes("rm -rf /data/local/tmp")
    ) {
      return {
        success: false,
        output: "[BLOCKED] Cấm xóa phân vùng hệ thống root.",
      };
    }

    if (
      trimmed.includes("dd if=") ||
      trimmed.includes("mkfs") ||
      trimmed.includes("reboot edl")
    ) {
      return {
        success: false,
        output:
          "[BLOCKED] Cấm ghi đè phân vùng thô (dd/mkfs) hoặc nạp chế độ EDL nguy hiểm.",
      };
    }

    try {
      // Đánh giá tính an toàn
      const safetyCheck = evaluateCommand(trimmed);
      if (!safetyCheck.allowed) {
        return {
          success: false,
          output: `[BLOCKED BY SAFETY LAYER] ${safetyCheck.reason || "Lệnh không an toàn."}`,
        };
      }

      const result = await runAdbCommandDetailed(deviceId, trimmed);
      return { success: result.success, output: result.output };
    } catch (error: any) {
      return {
        success: false,
        output: error.message || "Lỗi khi thực thi lệnh thô.",
      };
    }
  }
}

export const advancedAdbService = new AdvancedAdbService();
