import { useState, useCallback } from 'react';
import { ToastType } from '@/components/Toast';
import { ToastItem } from '@/components/ToastContainer';

let toastId = 0;

interface UseToastReturn {
    toasts: ToastItem[];
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    dismissToast: (id: string) => void;
    clearToasts: () => void;
}

export function useToast(): UseToastReturn {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = `toast-${++toastId}`;
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const clearToasts = useCallback(() => {
        setToasts([]);
    }, []);

    return {
        toasts,
        showToast,
        dismissToast,
        clearToasts
    };
}
