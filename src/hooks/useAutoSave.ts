import { useState, useEffect, useRef, useCallback } from 'react';
import { updateFile } from '../services/fileService';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
    /** Throttle delay in milliseconds (default: 1000) */
    throttleMs?: number;
    /** Called after successful save */
    onSave?: () => void;
    /** Called on save error */
    onError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
    /** Current save status */
    status: SaveStatus;
    /** Timestamp of last successful save */
    lastSaved: Date | null;
    /** Manually trigger a save */
    saveNow: () => Promise<void>;
    /** Mark content as dirty (triggers auto-save) */
    markDirty: () => void;
    /** Error message if status is 'error' */
    error: string | null;
}

/**
 * Hook for auto-saving file content with throttling.
 * Saves automatically:
 * - After keyboard input (throttled)
 * - When window loses focus
 * - Before page unload
 *
 * @param fileId - The file ID to save to
 * @param content - Current file content
 * @param options - Configuration options
 */
export function useAutoSave(
    fileId: string | null,
    content: string,
    options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
    const { throttleMs = 1000, onSave, onError } = options;

    const [status, setStatus] = useState<SaveStatus>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Track the content that was last saved to avoid unnecessary saves
    const lastSavedContentRef = useRef<string>(content);
    const pendingContentRef = useRef<string>(content);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);
    const isSavingRef = useRef(false);
    const fileIdRef = useRef(fileId);

    // Keep fileId ref updated
    useEffect(() => {
        fileIdRef.current = fileId;
    }, [fileId]);

    // Keep pending content updated
    useEffect(() => {
        pendingContentRef.current = content;
    }, [content]);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Perform the actual save
    const performSave = useCallback(async (immediate = false) => {
        const currentFileId = fileIdRef.current;
        const currentContent = pendingContentRef.current;

        if (!currentFileId || currentContent === lastSavedContentRef.current) {
            return;
        }

        // Prevent concurrent saves
        if (isSavingRef.current && !immediate) {
            return;
        }

        isSavingRef.current = true;
        setStatus('saving');
        setError(null);

        try {
            await updateFile(currentFileId, currentContent);

            if (!isMountedRef.current) return;

            lastSavedContentRef.current = currentContent;
            setLastSaved(new Date());
            setStatus('saved');
            onSave?.();

            // Reset to idle after a brief moment
            setTimeout(() => {
                if (isMountedRef.current) {
                    setStatus('idle');
                }
            }, 1500);
        } catch (err) {
            if (!isMountedRef.current) return;

            const errorMessage = err instanceof Error ? err.message : 'Save failed';
            setError(errorMessage);
            setStatus('error');
            onError?.(err instanceof Error ? err : new Error(errorMessage));
        } finally {
            isSavingRef.current = false;
        }
    }, [onSave, onError]);

    // Manual save function
    const saveNow = useCallback(async () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        await performSave(true);
    }, [performSave]);

    // Mark content as dirty and trigger throttled save
    const markDirty = useCallback(() => {
        // Clear existing timeout and set a new one (throttle)
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            performSave();
        }, throttleMs);
    }, [throttleMs, performSave]);

    // Save on window blur (focus lost)
    useEffect(() => {
        const handleBlur = () => {
            if (pendingContentRef.current !== lastSavedContentRef.current) {
                // Clear any pending throttled save and save immediately
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
                performSave(true);
            }
        };

        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [performSave]);

    // Save before page unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (pendingContentRef.current !== lastSavedContentRef.current && fileIdRef.current) {
                // Use synchronous XHR for beforeunload (navigator.sendBeacon doesn't work well with JSON)
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', `/api/files/${fileIdRef.current}`, false); // synchronous
                xhr.setRequestHeader('Content-Type', 'application/json');
                try {
                    xhr.send(JSON.stringify({ content: pendingContentRef.current }));
                } catch {
                    // Ignore errors on unload
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // Reset when file changes
    useEffect(() => {
        lastSavedContentRef.current = content;
        setStatus('idle');
        setError(null);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, [fileId]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        status,
        lastSaved,
        saveNow,
        markDirty,
        error,
    };
}
