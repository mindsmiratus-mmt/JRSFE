// components/ui/toast.tsx
import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toastVariants = cva(
    "fixed bottom-4 right-4 z-[99999] flex items-center gap-3 rounded-lg border px-5 py-4 text-sm font-medium shadow-lg transition-all animate-in slide-in-from-bottom-5",
    {
        variants: {
            variant: {
                default: "bg-background text-foreground border",
                success: "bg-green-600 text-white border-green-700",
                error: "bg-red-600 text-white border-red-700",
                warning: "bg-yellow-600 text-white border-yellow-700",
                info: "bg-blue-600 text-white border-blue-700",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

interface ToastProps extends VariantProps<typeof toastVariants> {
    message: string;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, variant, onClose }) => {
    React.useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={cn(toastVariants({ variant }))}>
            <span>{message}</span>
            <button
                onClick={onClose}
                className="ml-auto opacity-70 hover:opacity-100 transition"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
};

// ---- Global Toast state ---- //
let toastId = 0;
const listeners: ((toast: ToastState) => void)[] = [];

interface ToastState {
    id: number;
    message: string;
    variant: "default" | "success" | "error" | "warning" | "info";
}

export const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = React.useState<ToastState[]>([]);
    const root = document.getElementById("toast-root") || document.body;

    React.useEffect(() => {
        const handler = (toast: ToastState) => {
            setToasts((prev) => [...prev, toast]);
        };
        listeners.push(handler);
        return () => {
            const index = listeners.indexOf(handler);
            if (index > -1) listeners.splice(index, 1);
        };
    }, []);

    const removeToast = (id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return createPortal(
        <>
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    variant={toast.variant}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </>,
        root
    );
};

// ---- Public toast api ---- //
export const toast = {
    success: (message: string) => listeners.forEach(fn => fn({ id: ++toastId, message, variant: "success" })),
    error: (message: string) => listeners.forEach(fn => fn({ id: ++toastId, message, variant: "error" })),
    warning: (message: string) => listeners.forEach(fn => fn({ id: ++toastId, message, variant: "warning" })),
    info: (message: string) => listeners.forEach(fn => fn({ id: ++toastId, message, variant: "info" })),
};

