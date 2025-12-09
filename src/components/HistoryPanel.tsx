import React, { useState, useEffect, useCallback } from 'react';
import { History, Save, RotateCcw, Eye, Clock, Loader2 } from 'lucide-react';
import * as historyService from '@/services/historyService';
import type { VersionEntry } from '@/types/api';

interface HistoryPanelProps {
    fileId: string | null;
    fileName: string;
    currentContent: string;
    onRestore: (content: string) => void;
    onViewDiff?: (oldContent: string, newContent: string, oldLabel: string, newLabel: string) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
    fileId,
    fileName,
    currentContent,
    onRestore,
    onViewDiff
}) => {
    const [history, setHistory] = useState<VersionEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch history when fileId changes
    const loadHistory = useCallback(async () => {
        if (!fileId) {
            setHistory([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const versions = await historyService.fetchHistory(fileId);
            setHistory(versions.sort((a, b) => b.version - a.version)); // Newest first
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load history');
            setHistory([]);
        } finally {
            setIsLoading(false);
        }
    }, [fileId]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Create a manual checkpoint
    const handleCreateCheckpoint = async () => {
        if (!fileId) return;

        setIsCreatingCheckpoint(true);
        setError(null);

        try {
            await historyService.createCheckpoint(fileId, 'Manual checkpoint');
            await loadHistory();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create checkpoint');
        } finally {
            setIsCreatingCheckpoint(false);
        }
    };

    // Restore to a specific version
    const handleRestore = async (versionNumber: number) => {
        if (!fileId) return;

        const confirmed = window.confirm(
            `This will restore version ${versionNumber} and create a new checkpoint. Continue?`
        );

        if (!confirmed) return;

        setError(null);

        try {
            const result = await historyService.restoreVersion(fileId, versionNumber);
            onRestore(result.content);
            await loadHistory();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to restore version');
        }
    };

    // View diff between selected version and current
    const handleViewDiff = async (versionNumber: number) => {
        if (!fileId || !onViewDiff) return;

        try {
            const version = await historyService.fetchVersion(fileId, versionNumber);
            onViewDiff(version.content, currentContent, `Version ${versionNumber}`, 'Current');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load version');
        }
    };

    // Format relative time
    const formatRelativeTime = (timestamp: string): string => {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now.getTime() - then.getTime();

        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSeconds < 60) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return then.toLocaleDateString();
    };

    if (!fileId) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                    <History size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Select a file to view history</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border shrink-0">
                <div className="flex items-center gap-2">
                    <History size={14} className="text-purple-400" />
                    <span className="text-sm font-medium text-gray-200 truncate max-w-[150px]">
                        {fileName}
                    </span>
                </div>
                <button
                    onClick={handleCreateCheckpoint}
                    disabled={isCreatingCheckpoint}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-purple-700 hover:bg-purple-600 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isCreatingCheckpoint ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <Save size={12} />
                    )}
                    Save Checkpoint
                </button>
            </div>

            {/* Error message */}
            {error && (
                <div className="px-3 py-2 bg-red-900/30 text-red-400 text-xs border-b border-red-800">
                    {error}
                </div>
            )}

            {/* Version list */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <Loader2 size={24} className="animate-spin" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <Clock size={24} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No history available</p>
                            <p className="text-xs mt-1 opacity-75">Create a checkpoint to start tracking changes</p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-ide-border">
                        {history.map((version, index) => {
                            const isLatest = index === 0;
                            const isSelected = selectedVersion === version.version;

                            return (
                                <div
                                    key={version.version}
                                    onClick={() => setSelectedVersion(isSelected ? null : version.version)}
                                    className={`
                                        px-3 py-2 cursor-pointer transition-colors
                                        ${isSelected ? 'bg-purple-900/30' : 'hover:bg-white/5'}
                                    `}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {isLatest ? (
                                                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Latest" />
                                            ) : (
                                                <span className="w-2 h-2 rounded-full bg-gray-600 shrink-0" />
                                            )}
                                            <span className="text-xs font-mono text-gray-400">v{version.version}</span>
                                        </div>
                                        <span className="text-xs text-gray-500 shrink-0">
                                            {formatRelativeTime(version.timestamp)}
                                        </span>
                                    </div>

                                    <div className="mt-1 ml-4">
                                        <p className="text-sm text-gray-300 truncate">{version.description}</p>
                                        {version.label && version.label !== version.description && (
                                            <p className="text-xs text-purple-400 mt-0.5">{version.label}</p>
                                        )}
                                    </div>

                                    {/* Action buttons - shown when selected */}
                                    {isSelected && !isLatest && (
                                        <div className="flex gap-2 mt-2 ml-4">
                                            {onViewDiff && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewDiff(version.version);
                                                    }}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-700 hover:bg-blue-600 text-white rounded transition"
                                                >
                                                    <Eye size={10} /> View Diff
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRestore(version.version);
                                                }}
                                                className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-700 hover:bg-orange-600 text-white rounded transition"
                                            >
                                                <RotateCcw size={10} /> Restore
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryPanel;
