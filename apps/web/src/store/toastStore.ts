import { create } from "zustand";

export interface Toast {
    id: string;
    message: string;
    variant: "success" | "error" | "info";
}

interface ToastState {
    toasts: Toast[];
    addToast: (message: string, variant?: Toast["variant"]) => void;
    removeToast: (id: string) => void;
}

let toastIdCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],

    addToast: (message, variant = "info") => {
        const id = `toast-${Date.now()}-${++toastIdCounter}`;
        set((state) => ({
            toasts: [...state.toasts, { id, message, variant }],
        }));
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id),
            }));
        }, 3000);
    },

    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),
}));
