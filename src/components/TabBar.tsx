import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import Tab from './Tab';
import type { FileMetadata } from '@/types/api';

interface TabBarProps {
    tabs: FileMetadata[];
    activeTabId: string | null;
    dirtyFiles: Set<string>;
    onTabActivate: (id: string) => void;
    onTabClose: (id: string) => void;
    onTabReorder: (fromIndex: number, toIndex: number) => void;
    onNewFile: () => void;
    onCloseOthers?: (id: string) => void;
    onCloseAll?: () => void;
    onCloseToRight?: (id: string) => void;
}

interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    fileId: string | null;
}

const TabBar: React.FC<TabBarProps> = ({
    tabs,
    activeTabId,
    dirtyFiles,
    onTabActivate,
    onTabClose,
    onTabReorder,
    onNewFile,
    onCloseOthers,
    onCloseAll,
    onCloseToRight,
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftScroll, setShowLeftScroll] = useState(false);
    const [showRightScroll, setShowRightScroll] = useState(false);
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        visible: false,
        x: 0,
        y: 0,
        fileId: null,
    });

    // Check if scroll buttons should be visible
    const checkScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        setShowLeftScroll(scrollLeft > 0);
        setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
    }, []);

    // Initialize and update scroll state
    useEffect(() => {
        checkScroll();
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScroll);
            window.addEventListener('resize', checkScroll);
        }
        return () => {
            if (container) {
                container.removeEventListener('scroll', checkScroll);
            }
            window.removeEventListener('resize', checkScroll);
        };
    }, [checkScroll, tabs.length]);

    // Scroll handlers
    const scrollLeft = () => {
        scrollContainerRef.current?.scrollBy({ left: -150, behavior: 'smooth' });
    };

    const scrollRight = () => {
        scrollContainerRef.current?.scrollBy({ left: 150, behavior: 'smooth' });
    };

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
        // Add a slight delay before adding drag styling
        setTimeout(() => {
            (e.target as HTMLElement).style.opacity = '0.5';
        }, 0);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.target as HTMLElement).style.opacity = '1';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (fromIndex !== dropIndex && !isNaN(fromIndex)) {
            onTabReorder(fromIndex, dropIndex);
        }
    };

    // Context menu handlers
    const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            fileId,
        });
    };

    const closeContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, []);

    // Close context menu on click outside
    useEffect(() => {
        if (contextMenu.visible) {
            const handleClick = () => closeContextMenu();
            document.addEventListener('click', handleClick);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [contextMenu.visible, closeContextMenu]);

    // Context menu actions
    const handleContextAction = (action: 'close' | 'closeOthers' | 'closeAll' | 'closeToRight') => {
        const fileId = contextMenu.fileId;
        closeContextMenu();

        if (!fileId) return;

        switch (action) {
            case 'close':
                onTabClose(fileId);
                break;
            case 'closeOthers':
                onCloseOthers?.(fileId);
                break;
            case 'closeAll':
                onCloseAll?.();
                break;
            case 'closeToRight':
                onCloseToRight?.(fileId);
                break;
        }
    };

    return (
        <div className="flex items-center h-9 bg-ide-sidebar border-b border-ide-border relative">
            {/* Left scroll button */}
            {showLeftScroll && (
                <button
                    onClick={scrollLeft}
                    className="absolute left-0 z-10 h-full px-1 bg-ide-sidebar hover:bg-ide-activity border-r border-ide-border"
                >
                    <ChevronLeft size={14} className="text-gray-400" />
                </button>
            )}

            {/* Tabs container */}
            <div
                ref={scrollContainerRef}
                className={`flex-1 flex items-center overflow-x-auto scrollbar-hide ${showLeftScroll ? 'ml-6' : ''} ${showRightScroll ? 'mr-6' : ''}`}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {tabs.map((tab, index) => (
                    <Tab
                        key={tab.id}
                        file={tab}
                        isActive={tab.id === activeTabId}
                        isDirty={dirtyFiles.has(tab.id)}
                        onActivate={() => onTabActivate(tab.id)}
                        onClose={() => onTabClose(tab.id)}
                        onContextMenu={handleContextMenu}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, index)}
                    />
                ))}

                {/* New file button */}
                <button
                    onClick={onNewFile}
                    className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white hover:bg-ide-activity transition shrink-0"
                    title="New file"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Right scroll button */}
            {showRightScroll && (
                <button
                    onClick={scrollRight}
                    className="absolute right-0 z-10 h-full px-1 bg-ide-sidebar hover:bg-ide-activity border-l border-ide-border"
                >
                    <ChevronRight size={14} className="text-gray-400" />
                </button>
            )}

            {/* Context menu */}
            {contextMenu.visible && (
                <div
                    className="fixed z-50 bg-ide-sidebar border border-ide-border rounded shadow-lg py-1 min-w-[150px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        onClick={() => handleContextAction('close')}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-ide-activity hover:text-white"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => handleContextAction('closeOthers')}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-ide-activity hover:text-white"
                        disabled={tabs.length <= 1}
                    >
                        Close Others
                    </button>
                    <button
                        onClick={() => handleContextAction('closeToRight')}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-ide-activity hover:text-white"
                    >
                        Close to the Right
                    </button>
                    <div className="border-t border-ide-border my-1" />
                    <button
                        onClick={() => handleContextAction('closeAll')}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-ide-activity hover:text-white"
                    >
                        Close All
                    </button>
                </div>
            )}
        </div>
    );
};

export default TabBar;
