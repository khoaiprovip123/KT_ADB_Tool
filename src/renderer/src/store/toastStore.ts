import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.duration || 4000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export const toast = {
  success: (message: string, duration?: number, action?: ToastAction) =>
    useToastStore
      .getState()
      .addToast({ message, type: "success", duration, action }),
  error: (message: string, duration?: number, action?: ToastAction) =>
    useToastStore
      .getState()
      .addToast({ message, type: "error", duration, action }),
  info: (message: string, duration?: number, action?: ToastAction) =>
    useToastStore
      .getState()
      .addToast({ message, type: "info", duration, action }),
  warning: (message: string, duration?: number, action?: ToastAction) =>
    useToastStore
      .getState()
      .addToast({ message, type: "warning", duration, action }),
};
