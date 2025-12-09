import React, { useEffect, useState } from 'react';
import { X, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

export type ToastType = 'info' | 'warning' | 'error' | 'success';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
    id,
    message,
    type,
    duration = 3000,
    onDismiss
}) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                setIsExiting(true);
                setTimeout(() => onDismiss(id), 200); // Wait for exit animation
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [id, duration, onDismiss]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => onDismiss(id), 200);
    };

    const getIcon = () => {
        switch (type) {
            case 'info':
                return <Info size={16} className="text-blue-400" />;
            case 'warning':
                return <AlertTriangle size={16} className="text-yellow-400" />;
            case 'error':
                return <AlertCircle size={16} className="text-red-400" />;
            case 'success':
                return <CheckCircle size={16} className="text-green-400" />;
        }
    };

    const getBorderColor = () => {
        switch (type) {
            case 'info':
                return 'border-l-blue-500';
            case 'warning':
                return 'border-l-yellow-500';
            case 'error':
                return 'border-l-red-500';
            case 'success':
                return 'border-l-green-500';
        }
    };

    return (
        <div
            className={`
                flex items-center gap-3 px-4 py-3 bg-ide-sidebar border border-ide-border border-l-4 ${getBorderColor()}
                rounded shadow-lg min-w-[280px] max-w-[400px]
                transform transition-all duration-200 ease-out
                ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
            `}
            role="alert"
        >
            {getIcon()}
            <span className="flex-1 text-sm text-gray-200">{message}</span>
            <button
                onClick={handleDismiss}
                className="p-1 text-gray-400 hover:text-white transition-colors rounded hover:bg-white/10"
                aria-label="Dismiss"
            >
                <X size={14} />
            </button>
        </div>
    );
};

export default Toast;
