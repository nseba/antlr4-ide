import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Filter,
  Zap,
  FileWarning,
  Layers,
} from 'lucide-react';
import type {
  AnalysisResult,
  UnusedRule,
  ComplexityMetrics,
  PerformanceIssue,
  AmbiguityHint,
  Severity,
  ComplexityScore,
} from '@/types';

interface AnalysisPanelProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  onNavigateToRule: (ruleName: string, line: number) => void;
}

type SortField = 'name' | 'line' | 'score' | 'depth' | 'alternatives';
type SortDirection = 'asc' | 'desc';

const severityIcons: Record<Severity, React.ReactNode> = {
  info: <Info className="w-4 h-4 text-blue-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  error: <AlertCircle className="w-4 h-4 text-orange-400" />,
  critical: <AlertCircle className="w-4 h-4 text-red-400" />,
};

const complexityColors: Record<ComplexityScore, string> = {
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  result,
  isAnalyzing,
  onNavigateToRule,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    unused: true,
    complexity: true,
    performance: true,
    ambiguity: false,
  });

  const [complexitySort, setComplexitySort] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'score',
    direction: 'desc',
  });

  const [filterScore, setFilterScore] = useState<ComplexityScore | 'all'>('all');

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const sortedComplexity = useMemo(() => {
    if (!result) return [];

    let filtered = [...result.complexity];

    // Apply filter
    if (filterScore !== 'all') {
      filtered = filtered.filter((c) => c.score === filterScore);
    }

    // Apply sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (complexitySort.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'line':
          comparison = a.line - b.line;
          break;
        case 'score': {
          const scoreOrder: Record<ComplexityScore, number> = { low: 0, medium: 1, high: 2, critical: 3 };
          comparison = scoreOrder[a.score] - scoreOrder[b.score];
          break;
        }
        case 'depth':
          comparison = a.depth - b.depth;
          break;
        case 'alternatives':
          comparison = a.alternatives - b.alternatives;
          break;
      }
      return complexitySort.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [result, complexitySort, filterScore]);

  const handleSort = (field: SortField) => {
    setComplexitySort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  if (isAnalyzing) {
    return (
      <div className="p-4 text-center text-ide-textSecondary">
        <div className="animate-pulse">Analyzing grammar...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4 text-center text-ide-textSecondary">
        <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No analysis results yet.</p>
        <p className="text-sm mt-1">Run the parser or click Analyze to see results.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto text-sm">
      {/* Summary Section */}
      <Section
        title="Summary"
        icon={<Info className="w-4 h-4" />}
        expanded={expandedSections.summary}
        onToggle={() => toggleSection('summary')}
      >
        <div className="grid grid-cols-2 gap-2 p-3">
          <StatCard label="Total Rules" value={result.summary.totalRules} />
          <StatCard label="Parser Rules" value={result.summary.parserRules} />
          <StatCard label="Lexer Rules" value={result.summary.lexerRules} />
          <StatCard label="Fragments" value={result.summary.fragmentRules} />
          <StatCard
            label="Unused Rules"
            value={result.summary.unusedRules}
            highlight={result.summary.unusedRules > 0 ? 'warning' : undefined}
          />
          <StatCard
            label="High Complexity"
            value={result.summary.highComplexityRules}
            highlight={result.summary.highComplexityRules > 0 ? 'error' : undefined}
          />
          <StatCard
            label="Performance Issues"
            value={result.summary.performanceIssues}
            highlight={result.summary.performanceIssues > 0 ? 'warning' : undefined}
          />
          <StatCard
            label="Analysis Time"
            value={`${result.duration.toFixed(0)}ms`}
          />
        </div>
      </Section>

      {/* Unused Rules Section */}
      {result.unusedRules.length > 0 && (
        <Section
          title={`Unused Rules (${result.unusedRules.length})`}
          icon={<FileWarning className="w-4 h-4 text-yellow-400" />}
          expanded={expandedSections.unused}
          onToggle={() => toggleSection('unused')}
        >
          <div className="divide-y divide-ide-border">
            {result.unusedRules.map((rule) => (
              <UnusedRuleItem
                key={rule.name}
                rule={rule}
                onClick={() => onNavigateToRule(rule.name, rule.line)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Complexity Report Section */}
      <Section
        title={`Complexity Report (${result.complexity.length})`}
        icon={<Layers className="w-4 h-4 text-blue-400" />}
        expanded={expandedSections.complexity}
        onToggle={() => toggleSection('complexity')}
      >
        {/* Filter controls */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-ide-border bg-ide-bg/50">
          <Filter className="w-3 h-3 text-ide-textSecondary" />
          <select
            value={filterScore}
            onChange={(e) => setFilterScore(e.target.value as ComplexityScore | 'all')}
            className="bg-ide-sidebar border border-ide-border rounded px-2 py-1 text-xs"
          >
            <option value="all">All Scores</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-ide-bg/50 text-xs text-ide-textSecondary border-b border-ide-border">
          <SortableHeader
            label="Rule"
            field="name"
            currentSort={complexitySort}
            onSort={handleSort}
            className="col-span-4"
          />
          <SortableHeader
            label="Score"
            field="score"
            currentSort={complexitySort}
            onSort={handleSort}
            className="col-span-2"
          />
          <SortableHeader
            label="Depth"
            field="depth"
            currentSort={complexitySort}
            onSort={handleSort}
            className="col-span-2"
          />
          <SortableHeader
            label="Alts"
            field="alternatives"
            currentSort={complexitySort}
            onSort={handleSort}
            className="col-span-2"
          />
          <div className="col-span-2 text-center">Flags</div>
        </div>

        {/* Table body */}
        <div className="divide-y divide-ide-border max-h-64 overflow-y-auto">
          {sortedComplexity.map((metric) => (
            <ComplexityRow
              key={metric.name}
              metric={metric}
              onClick={() => onNavigateToRule(metric.name, metric.line)}
            />
          ))}
        </div>
      </Section>

      {/* Performance Issues Section */}
      {result.performanceIssues.length > 0 && (
        <Section
          title={`Performance Issues (${result.performanceIssues.length})`}
          icon={<Zap className="w-4 h-4 text-orange-400" />}
          expanded={expandedSections.performance}
          onToggle={() => toggleSection('performance')}
        >
          <div className="divide-y divide-ide-border">
            {result.performanceIssues.map((issue, idx) => (
              <PerformanceIssueItem
                key={`${issue.rule}-${idx}`}
                issue={issue}
                onClick={() => onNavigateToRule(issue.rule, issue.line)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Ambiguity Hints Section */}
      {result.ambiguityHints.length > 0 && (
        <Section
          title={`Ambiguity Hints (${result.ambiguityHints.length})`}
          icon={<Info className="w-4 h-4 text-blue-400" />}
          expanded={expandedSections.ambiguity}
          onToggle={() => toggleSection('ambiguity')}
        >
          <div className="divide-y divide-ide-border">
            {result.ambiguityHints.map((hint, idx) => (
              <AmbiguityHintItem
                key={`${hint.rule}-${idx}`}
                hint={hint}
                onClick={() => onNavigateToRule(hint.rule, hint.line)}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

// Sub-components

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon, expanded, onToggle, children }) => (
  <div className="border-b border-ide-border">
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-sidebar/50 transition-colors"
    >
      {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      {icon}
      <span className="font-medium">{title}</span>
    </button>
    {expanded && <div className="bg-ide-panel">{children}</div>}
  </div>
);

interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: 'warning' | 'error';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, highlight }) => (
  <div className="bg-ide-sidebar/50 rounded px-3 py-2">
    <div className="text-xs text-ide-textSecondary">{label}</div>
    <div
      className={`text-lg font-semibold ${
        highlight === 'error'
          ? 'text-orange-400'
          : highlight === 'warning'
            ? 'text-yellow-400'
            : 'text-ide-text'
      }`}
    >
      {value}
    </div>
  </div>
);

interface SortableHeaderProps {
  label: string;
  field: SortField;
  currentSort: { field: SortField; direction: SortDirection };
  onSort: (field: SortField) => void;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  field,
  currentSort,
  onSort,
  className,
}) => (
  <button
    onClick={() => onSort(field)}
    className={`flex items-center gap-1 hover:text-ide-text transition-colors ${className}`}
  >
    {label}
    {currentSort.field === field && (
      <ArrowUpDown className={`w-3 h-3 ${currentSort.direction === 'asc' ? 'rotate-180' : ''}`} />
    )}
  </button>
);

interface UnusedRuleItemProps {
  rule: UnusedRule;
  onClick: () => void;
}

const UnusedRuleItem: React.FC<UnusedRuleItemProps> = ({ rule, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-start gap-2 px-3 py-2 hover:bg-ide-sidebar/50 text-left transition-colors"
  >
    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-mono text-ide-text">{rule.name}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-ide-sidebar text-ide-textSecondary">
          {rule.type}
        </span>
        <span className="text-xs text-ide-textSecondary">Line {rule.line}</span>
      </div>
      <div className="text-xs text-ide-textSecondary mt-1">{rule.suggestion}</div>
    </div>
  </button>
);

interface ComplexityRowProps {
  metric: ComplexityMetrics;
  onClick: () => void;
}

const ComplexityRow: React.FC<ComplexityRowProps> = ({ metric, onClick }) => (
  <button
    onClick={onClick}
    className="w-full grid grid-cols-12 gap-1 px-3 py-2 hover:bg-ide-sidebar/50 text-left transition-colors items-center"
  >
    <div className="col-span-4 font-mono truncate" title={metric.name}>
      {metric.name}
    </div>
    <div className={`col-span-2 ${complexityColors[metric.score]}`}>
      {metric.score}
    </div>
    <div className="col-span-2 text-ide-textSecondary">{metric.depth}</div>
    <div className="col-span-2 text-ide-textSecondary">{metric.alternatives}</div>
    <div className="col-span-2 flex gap-1 justify-center">
      {metric.directlyRecursive && (
        <span title="Directly recursive" className="text-xs px-1 rounded bg-purple-500/20 text-purple-400">
          D
        </span>
      )}
      {metric.indirectlyRecursive && (
        <span title="Indirectly recursive" className="text-xs px-1 rounded bg-blue-500/20 text-blue-400">
          I
        </span>
      )}
      {metric.lookahead > 2 && (
        <span title={`Lookahead: ${metric.lookahead}`} className="text-xs px-1 rounded bg-yellow-500/20 text-yellow-400">
          L{metric.lookahead}
        </span>
      )}
    </div>
  </button>
);

interface PerformanceIssueItemProps {
  issue: PerformanceIssue;
  onClick: () => void;
}

const PerformanceIssueItem: React.FC<PerformanceIssueItemProps> = ({ issue, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-start gap-2 px-3 py-2 hover:bg-ide-sidebar/50 text-left transition-colors"
  >
    {severityIcons[issue.severity]}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-mono text-ide-text">{issue.rule}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-ide-sidebar text-ide-textSecondary">
          {issue.category}
        </span>
        <span className="text-xs text-ide-textSecondary">Line {issue.line}</span>
      </div>
      <div className="text-ide-text mt-1">{issue.issue}</div>
      <div className="text-xs text-ide-textSecondary mt-1">{issue.description}</div>
      <div className="text-xs text-green-400 mt-1">
        <span className="text-ide-textSecondary">Suggestion:</span> {issue.suggestion}
      </div>
    </div>
  </button>
);

interface AmbiguityHintItemProps {
  hint: AmbiguityHint;
  onClick: () => void;
}

const AmbiguityHintItem: React.FC<AmbiguityHintItemProps> = ({ hint, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-start gap-2 px-3 py-2 hover:bg-ide-sidebar/50 text-left transition-colors"
  >
    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-mono text-ide-text">{hint.rule}</span>
        <span className="text-xs text-ide-textSecondary">Line {hint.line}</span>
      </div>
      <div className="text-xs text-ide-textSecondary mt-1">{hint.description}</div>
      <div className="text-xs text-ide-textSecondary mt-1">
        Alternatives: {hint.alternativeIndices.map((i) => i + 1).join(', ')}
      </div>
    </div>
  </button>
);

export default AnalysisPanel;
