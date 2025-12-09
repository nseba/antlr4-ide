import React from 'react';
import { Check, Loader2, AlertCircle, Cloud } from 'lucide-react';
import type { SaveStatus as SaveStatusType } from '../hooks/useAutoSave';

interface SaveStatusProps {
    status: SaveStatusType;
    lastSaved: Date | null;
    error?: string | null;
    onRetry?: () => void;
}

/**
 * Component showing the current save status with visual indicators.
 */
const SaveStatus: React.FC<SaveStatusProps> = ({
    status,
    lastSaved,
    error,
    onRetry,
}) => {
    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (status === 'saving') {
        return (
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
            </div>
        );
    }

    if (status === 'saved') {
        return (
            <div className="flex items-center gap-1.5 text-sm text-green-400">
                <Check className="w-3.5 h-3.5" />
                <span>Saved{lastSaved ? ` at ${formatTime(lastSaved)}` : ''}</span>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex items-center gap-1.5 text-sm text-red-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error || 'Save failed'}</span>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="ml-1 underline hover:text-red-300 transition-colors"
                    >
                        Retry
                    </button>
                )}
            </div>
        );
    }

    // idle state - show cloud icon or last saved time
    if (lastSaved) {
        return (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Cloud className="w-3.5 h-3.5" />
                <span>Saved at {formatTime(lastSaved)}</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Cloud className="w-3.5 h-3.5" />
            <span>Auto-save enabled</span>
        </div>
    );
};

export default SaveStatus;
