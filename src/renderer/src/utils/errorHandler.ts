import { toast } from "../store/toastStore";

export class AdbError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "AdbError";
  }
}

export const errorMessages: Record<string, string> = {
  ECONNREFUSED: "Thiết bị ngắt kết nối. Vui lòng kiểm tra lại USB.",
  ECONNRESET: "Kết nối ADB bị reset. Hãy thử lại.",
  ETIMEDOUT: "Timeout - Thiết bị không phản hồi. Hãy kiểm tra kết nối.",
  ENOTFOUND: "Không tìm thấy thiết bị trên mạng.",
  INVALID_PACKAGE: "Tên gói ứng dụng không hợp lệ.",
  PERMISSION_DENIED: "Quyền bị từ chối. Hãy kiểm tra quyền ADB.",
  DEVICE_NOT_FOUND: "Không tìm thấy thiết bị.",
  COMMAND_FAILED: "Lệnh ADB thất bại.",
};

export const handleAdbError = (error: any): AdbError => {
  let code = "UNKNOWN_ERROR";
  let message = "Đã xảy ra lỗi không xác định";

  if (error instanceof AdbError) {
    return error;
  }

  // Parse error code
  if (error.code) {
    code = error.code;
    message = errorMessages[code] || error.message;
  } else if (error.message) {
    message = error.message;

    // Try to identify error type
    if (message.includes("ECONNREFUSED")) code = "ECONNREFUSED";
    else if (message.includes("ECONNRESET")) code = "ECONNRESET";
    else if (message.includes("ETIMEDOUT")) code = "ETIMEDOUT";
    else if (message.includes("permission")) code = "PERMISSION_DENIED";
    else if (message.includes("not found")) code = "DEVICE_NOT_FOUND";
  }

  return new AdbError(code, message, error);
};

export const showErrorToast = (
  error: any,
  action?: { label: string; onClick: () => void },
) => {
  const adbError = handleAdbError(error);

  // Log for debugging
  console.error("[ADB Error]", {
    code: adbError.code,
    message: adbError.message,
    original: adbError.originalError?.message,
  });

  // Show user-friendly message
  toast.error(adbError.message, 5000, action);
};

export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  options?: {
    errorCallback?: (error: AdbError) => void;
    successCallback?: (result: T) => void;
  },
): Promise<T | null> => {
  try {
    const result = await fn();
    options?.successCallback?.(result);
    return result;
  } catch (error) {
    const adbError = handleAdbError(error);
    options?.errorCallback?.(adbError);
    showErrorToast(adbError);
    return null;
  }
};
