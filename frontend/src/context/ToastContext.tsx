import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const TOAST_DURATION = 3500;
const MAX_STACKED = 3;

const ICONS: Record<ToastType, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
};

const STYLES: Record<ToastType, string> = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = nextId++;
        setToasts(prev => {
            const next = [...prev, { id, message, type }];
            // Max 3 stacked (§4) — drop the oldest first.
            return next.length > MAX_STACKED ? next.slice(next.length - MAX_STACKED) : next;
        });
        setTimeout(() => dismiss(id), TOAST_DURATION);
    }, [dismiss]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[1060] flex flex-col gap-2 items-end pointer-events-none">
                {toasts.map(toast => {
                    const Icon = ICONS[toast.type];
                    return (
                        <div
                            key={toast.id}
                            className={`pointer-events-auto flex items-start gap-2 px-4 py-3 rounded-lg border shadow-lg max-w-sm animate-slide-in ${STYLES[toast.type]}`}
                        >
                            <Icon className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={1.5} />
                            <span className="text-sm flex-1">{toast.message}</span>
                            <button
                                onClick={() => dismiss(toast.id)}
                                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                                aria-label="Cerrar"
                            >
                                <X className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
