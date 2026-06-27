export interface AdvancedCommandDefinition {
  id: string;
  title: string;
  description: string;
  category:
    | "diagnostics"
    | "appops"
    | "permissions"
    | "settings"
    | "components"
    | "network";
  risk: "SAFE" | "MEDIUM" | "RISKY" | "DANGEROUS";
  mode:
    | "READ_ONLY"
    | "WRITE_SETTING"
    | "PACKAGE_OP"
    | "FILE_OP"
    | "REBOOT_OP"
    | "RAW_SHELL";
  readTemplate?: string;
  applyTemplate?: string;
  rollbackTemplate?: string;
  needsConfirmText?: string;
}

export interface CommandHistoryItem {
  timestamp: string;
  command: string;
  risk: string;
  success: boolean;
  output: string;
}

export interface ToastMessage {
  id: number;
  msg: string;
  type: "success" | "error" | "info" | "warning";
}
