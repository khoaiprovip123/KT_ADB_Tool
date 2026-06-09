export interface XiaomiApplyResult {
  success: boolean;
  output: string;
  usedFallback?: boolean;
}

export interface XiaomiRollbackResult {
  success: boolean;
  output: string;
  usedFallback?: boolean;
}
