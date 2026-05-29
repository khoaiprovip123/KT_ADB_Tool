export const validateDpi = (dpi: number): { valid: boolean; error?: string } => {
  if (dpi < 160) return { valid: false, error: 'DPI tối thiểu là 160' }
  if (dpi > 640) return { valid: false, error: 'DPI tối đa là 640' }
  return { valid: true }
}

export const validatePackageName = (pkg: string): boolean => {
  const packageRegex = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/
  return packageRegex.test(pkg)
}

export const escapeShell = (str: string): string => {
  return `'${str.replace(/'/g, "'\\''")}'`
}
