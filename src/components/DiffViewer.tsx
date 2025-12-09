import React, { useMemo } from 'react';
import { X, Minus, Plus } from 'lucide-react';

interface DiffViewerProps {
    oldContent: string;
    newContent: string;
    oldLabel: string;
    newLabel: string;
    onClose: () => void;
}

interface DiffLine {
    type: 'unchanged' | 'added' | 'removed';
    oldLineNum?: number;
    newLineNum?: number;
    content: string;
}

/**
 * Simple line-by-line diff algorithm
 */
function computeDiff(oldContent: string, newContent: string): DiffLine[] {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const result: DiffLine[] = [];

    // Use a simple LCS-based diff approach
    const lcs = computeLCS(oldLines, newLines);

    let oldIdx = 0;
    let newIdx = 0;
    let lcsIdx = 0;
    let oldLineNum = 1;
    let newLineNum = 1;

    while (oldIdx < oldLines.length || newIdx < newLines.length) {
        if (lcsIdx < lcs.length && oldIdx < oldLines.length && oldLines[oldIdx] === lcs[lcsIdx] &&
            newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
            // Line is in both - unchanged
            result.push({
                type: 'unchanged',
                oldLineNum: oldLineNum++,
                newLineNum: newLineNum++,
                content: oldLines[oldIdx]
            });
            oldIdx++;
            newIdx++;
            lcsIdx++;
        } else if (oldIdx < oldLines.length && (lcsIdx >= lcs.length || oldLines[oldIdx] !== lcs[lcsIdx])) {
            // Line only in old - removed
            result.push({
                type: 'removed',
                oldLineNum: oldLineNum++,
                content: oldLines[oldIdx]
            });
            oldIdx++;
        } else if (newIdx < newLines.length && (lcsIdx >= lcs.length || newLines[newIdx] !== lcs[lcsIdx])) {
            // Line only in new - added
            result.push({
                type: 'added',
                newLineNum: newLineNum++,
                content: newLines[newIdx]
            });
            newIdx++;
        } else {
            break; // Safety break
        }
    }

    return result;
}

/**
 * Compute Longest Common Subsequence of two string arrays
 */
function computeLCS(a: string[], b: string[]): string[] {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find LCS
    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            lcs.unshift(a[i - 1]);
            i--;
            j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }

    return lcs;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
    oldContent,
    newContent,
    oldLabel,
    newLabel,
    onClose
}) => {
    const diffLines = useMemo(() => computeDiff(oldContent, newContent), [oldContent, newContent]);

    const stats = useMemo(() => {
        let additions = 0;
        let deletions = 0;
        diffLines.forEach(line => {
            if (line.type === 'added') additions++;
            if (line.type === 'removed') deletions++;
        });
        return { additions, deletions };
    }, [diffLines]);

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-ide-sidebar border border-ide-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-semibold text-white">Diff View</h2>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 text-red-400">
                                <Minus size={12} /> {stats.deletions} deletion{stats.deletions !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-1 text-green-400">
                                <Plus size={12} /> {stats.additions} addition{stats.additions !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Labels */}
                <div className="flex border-b border-ide-border shrink-0">
                    <div className="flex-1 px-4 py-2 text-xs font-medium text-red-400 bg-red-900/20">
                        {oldLabel}
                    </div>
                    <div className="flex-1 px-4 py-2 text-xs font-medium text-green-400 bg-green-900/20 border-l border-ide-border">
                        {newLabel}
                    </div>
                </div>

                {/* Diff content */}
                <div className="flex-1 overflow-auto font-mono text-xs">
                    <table className="w-full border-collapse">
                        <tbody>
                            {diffLines.map((line, idx) => (
                                <tr
                                    key={idx}
                                    className={`
                                        ${line.type === 'added' ? 'bg-green-900/20' : ''}
                                        ${line.type === 'removed' ? 'bg-red-900/20' : ''}
                                    `}
                                >
                                    {/* Old line number */}
                                    <td className="w-12 px-2 py-0.5 text-right text-gray-500 border-r border-ide-border select-none">
                                        {line.oldLineNum || ''}
                                    </td>
                                    {/* New line number */}
                                    <td className="w-12 px-2 py-0.5 text-right text-gray-500 border-r border-ide-border select-none">
                                        {line.newLineNum || ''}
                                    </td>
                                    {/* Change indicator */}
                                    <td className="w-6 px-1 py-0.5 text-center select-none">
                                        {line.type === 'added' && <Plus size={10} className="text-green-400 inline" />}
                                        {line.type === 'removed' && <Minus size={10} className="text-red-400 inline" />}
                                    </td>
                                    {/* Content */}
                                    <td className={`px-2 py-0.5 whitespace-pre ${
                                        line.type === 'added' ? 'text-green-300' :
                                        line.type === 'removed' ? 'text-red-300' : 'text-gray-300'
                                    }`}>
                                        {line.content || ' '}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="flex justify-end px-4 py-3 border-t border-ide-border shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-sm bg-ide-activity hover:bg-ide-border text-white rounded transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DiffViewer;
