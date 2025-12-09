import React, { useState, useRef } from 'react';
import { X, FileText, Settings } from 'lucide-react';
import type { FileMetadata } from '@/types/api';

interface TabProps {
    file: FileMetadata;
    isActive: boolean;
    isDirty: boolean;
    onActivate: () => void;
    onClose: () => void;
    onContextMenu?: (e: React.MouseEvent, fileId: string) => void;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
}

const Tab: React.FC<TabProps> = ({
    file,
    isActive,
    isDirty,
    onActivate,
    onClose,
    onContextMenu,
    draggable = true,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const tabRef = useRef<HTMLDivElement>(null);

    // Handle close button click without triggering tab activation
    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
    };

    // Handle right-click context menu
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        onContextMenu?.(e, file.id);
    };

    // Get appropriate icon based on file type
    const FileIcon = file.type === 'grammar' ? Settings : FileText;
    const iconColor = file.type === 'grammar' ? 'text-purple-400' : 'text-blue-400';

    return (
        <div
            ref={tabRef}
            onClick={onActivate}
            onContextMenu={handleContextMenu}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
            className={`
                group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer select-none
                border-r border-ide-border min-w-0 max-w-[180px]
                transition-colors duration-100
                ${isActive
                    ? 'bg-ide-bg text-white border-b-2 border-b-ide-accent'
                    : 'bg-ide-sidebar text-gray-400 hover:bg-ide-activity hover:text-gray-200 border-b-2 border-b-transparent'
                }
            `}
        >
            {/* Dirty indicator */}
            {isDirty && (
                <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" title="Unsaved changes" />
            )}

            {/* File icon */}
            <FileIcon size={14} className={`${iconColor} shrink-0`} />

            {/* Filename */}
            <span className="truncate text-xs font-medium">{file.name}</span>

            {/* Close button - visible on hover or when active */}
            <button
                onClick={handleClose}
                className={`
                    ml-1 p-0.5 rounded hover:bg-white/20 transition-opacity shrink-0
                    ${(isHovered || isActive) ? 'opacity-100' : 'opacity-0'}
                `}
                title="Close"
            >
                <X size={12} />
            </button>
        </div>
    );
};

export default Tab;
