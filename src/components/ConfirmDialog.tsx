import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    dangerousConfirmText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    onDangerous?: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Save',
    cancelText = 'Cancel',
    dangerousConfirmText,
    onConfirm,
    onCancel,
    onDangerous,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative bg-ide-sidebar border border-ide-border rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-yellow-500/20 rounded-full shrink-0">
                        <AlertTriangle className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                        <p className="text-gray-400 text-sm">{message}</p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-ide-activity rounded transition"
                    >
                        {cancelText}
                    </button>
                    {onDangerous && dangerousConfirmText && (
                        <button
                            onClick={onDangerous}
                            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition"
                        >
                            {dangerousConfirmText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm bg-ide-accent text-white rounded hover:bg-blue-600 transition"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
