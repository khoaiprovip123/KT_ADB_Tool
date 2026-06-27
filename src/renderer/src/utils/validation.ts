import {
  validateResolution as sharedValidateResolution,
  validatePackageName as sharedValidatePackageName,
  escapeShell as sharedEscapeShell,
  validateAnimationScale as sharedValidateAnimationScale,
  validatePointerSpeed as sharedValidatePointerSpeed,
  validateBgLimit as sharedValidateBgLimit,
  ValidationResult,
} from "../../../shared/validation";

export type { ValidationResult };

export const validateDpi = (dpi: number): ValidationResult => {
  if (!Number.isInteger(dpi)) {
    return { valid: false, error: "DPI phải là số nguyên" };
  }
  if (dpi < 160) {
    return { valid: false, error: "DPI tối thiểu là 160" };
  }
  if (dpi > 640) {
    return { valid: false, error: "DPI tối đa là 640" };
  }
  return { valid: true };
};

export interface ResolutionValidation extends ValidationResult {
  isLandscape?: boolean;
}

export const validateResolution = (
  width: number,
  height: number,
): ResolutionValidation => {
  const ok = sharedValidateResolution(width, height);
  if (!ok) {
    return { valid: false, error: "Độ phân giải phải từ 480-3840 (W) và 800-3840 (H)" };
  }
  return {
    valid: true,
    isLandscape: width > height,
  };
};

export const validatePackageName = (pkg: string): boolean => {
  return sharedValidatePackageName(pkg);
};

export const escapeShell = (str: string): string => {
  return sharedEscapeShell(str);
};

export const validateAnimationScale = (scale: number): ValidationResult => {
  // Shared chỉ định nghĩa scale là 0 | 0.5 | 1. Tuy nhiên ta cho phép thêm 1.5.
  const ok = sharedValidateAnimationScale(scale) || scale === 1.5;
  if (!ok) {
    return {
      valid: false,
      error: "Animation scale phải là một trong: 0, 0.5, 1.0, 1.5",
    };
  }
  return { valid: true };
};

export const validatePointerSpeed = (speed: number): ValidationResult => {
  return sharedValidatePointerSpeed(speed);
};

export const validateBgLimit = (limit: number): ValidationResult => {
  return sharedValidateBgLimit(limit);
};

export default {
  validateDpi,
  validateResolution,
  validatePackageName,
  escapeShell,
  validateAnimationScale,
  validatePointerSpeed,
  validateBgLimit,
};
