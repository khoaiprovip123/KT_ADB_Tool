export interface AppInfo {
  pkg: string;
  type: "system" | "user";
  status: "enabled" | "disabled";
}

export interface BatchProgress {
  current: number;
  total: number;
  action: string;
}

export interface BatchResult {
  success: number;
  fail: number;
  skipped: number;
  lastError?: string;
  action: string;
}
