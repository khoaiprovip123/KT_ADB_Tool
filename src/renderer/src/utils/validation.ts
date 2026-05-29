/**
 * Validation & Security Utilities
 * Centralized place for all input validation and security functions
 */

// 1. DPI Validation
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const validateDpi = (dpi: number): ValidationResult => {
  if (!Number.isInteger(dpi)) {
    return { valid: false, error: 'DPI phải là số nguyên' };
  }
  if (dpi < 160) {
    return { valid: false, error: 'DPI tối thiểu là 160' };
  }
  if (dpi > 640) {
    return { valid: false, error: 'DPI tối đa là 640' };
  }
  return { valid: true };
};

// 2. Resolution Validation
export interface ResolutionValidation extends ValidationResult {
  isLandscape?: boolean;
}

export const validateResolution = (width: number, height: number): ResolutionValidation => {
  // Basic range check
  if (width < 480 || width > 3840) {
    return { valid: false, error: 'Chiều rộng phải từ 480 đến 3840px' };
  }
  if (height < 800 || height > 3840) {
    return { valid: false, error: 'Chiều cao phải từ 800 đến 3840px' };
  }

  // Check aspect ratio (not extreme)
  const ratio = width / height;
  if (ratio < 0.3 || ratio > 3) {
    return { valid: false, error: 'Tỷ lệ khung hình không hợp lệ' };
  }

  return { 
    valid: true,
    isLandscape: width > height
  };
};

// 3. Package Name Validation - CRITICAL!
export const validatePackageName = (pkg: string): boolean => {
  // Valid format: com.example.app
  // Cannot contain: spaces, quotes, backticks, semicolons, etc.
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  
  if (!pkg || pkg.length === 0) return false;
  if (pkg.length > 255) return false;
  if (!validPattern.test(pkg)) return false;
  
  // Additional checks for common injection patterns
  if (pkg.includes(';') || pkg.includes('&') || pkg.includes('|')) return false;
  if (pkg.includes('`') || pkg.includes('"') || pkg.includes("'")) return false;
  if (pkg.includes('$') || pkg.includes('(') || pkg.includes(')')) return false;
  
  return true;
};

// 4. Shell Escaping - CRITICAL FOR SECURITY!
export const escapeShell = (str: string): string => {
  if (!validatePackageName(str)) {
    throw new Error(`Invalid input: ${str}`);
  }
  
  // Single-quote everything and escape existing single quotes
  return `'${str.replace(/'/g, "'\\''")}'`;
};

// 5. Animation Scale Validation
export const validateAnimationScale = (scale: number): ValidationResult => {
  const validScales = [0, 0.5, 1.0, 1.5];
  
  if (!validScales.includes(scale)) {
    return { 
      valid: false, 
      error: `Animation scale phải là một trong: ${validScales.join(', ')}` 
    };
  }
  
  return { valid: true };
};

// 6. Pointer Speed Validation
export const validatePointerSpeed = (speed: number): ValidationResult => {
  if (!Number.isInteger(speed)) {
    return { valid: false, error: 'Tốc độ con trỏ phải là số nguyên' };
  }
  if (speed < -7 || speed > 7) {
    return { valid: false, error: 'Tốc độ con trỏ phải từ -7 đến 7' };
  }
  return { valid: true };
};

// 7. Background Process Limit Validation
export const validateBgLimit = (limit: number): ValidationResult => {
  if (limit !== -1 && (limit < 0 || limit > 32)) {
    return { valid: false, error: 'Giới hạn nền phải từ 0 đến 32 (hoặc -1 cho mặc định)' };
  }
  return { valid: true };
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
