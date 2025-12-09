import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { ParseNode, Token } from '@/types';
import { Minus, Plus, RefreshCw } from 'lucide-react';

interface TreeVisualizerProps {
  data: ParseNode | null;
  onSelectToken: (token: Token | null) => void;
  selectedToken: Token | null;
  /** Callback when a node is clicked, provides full node data with positions */
  onNodeClick?: (node: ParseNode) => void;
  /** Currently selected node ID */
  selectedNodeId?: string | null;
}

const TreeVisualizer: React.FC<TreeVisualizerProps> = ({
  data,
  onSelectToken,
  selectedToken,
  onNodeClick,
  selectedNodeId
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Format position info for tooltip
  const formatPosition = useCallback((node: ParseNode): string => {
    if (node.startLine !== undefined && node.startColumn !== undefined) {
      if (node.endLine !== undefined && node.endColumn !== undefined) {
        return `${node.startLine}:${node.startColumn} - ${node.endLine}:${node.endColumn}`;
      }
      return `${node.startLine}:${node.startColumn}`;
    }
    return '';
  }, []);

  // Truncate text for tooltip preview
  const truncateText = useCallback((text: string | undefined, maxLen = 50): string => {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
  }, []);

  // Re-render tree when data changes
  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const g = svg.append("g").attr("transform", "translate(40,0)");

    // Define tree layout
    const root = d3.hierarchy<ParseNode>(data);

    // Basic tree layout config
    const treeLayout = d3.tree<ParseNode>()
      .size([height - 100, width - 200]) // Initial size, will expand
      .nodeSize([40, 120]); // Fixed node size ensures no overlap

    treeLayout(root);

    // Zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoomBehavior);

    // Initial center
    const initialTransform = d3.zoomIdentity.translate(50, height / 2).scale(0.8);
    svg.call(zoomBehavior.transform, initialTransform);

    // Links
    const linkGenerator = d3.linkHorizontal<d3.HierarchyLink<ParseNode>, d3.HierarchyPointNode<ParseNode>>()
      .x(d => d.y)
      .y(d => d.x);

    g.selectAll(".link")
      .data(root.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d => linkGenerator(d) || "")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-width", 1.5);

    // Nodes
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter().append("g")
      .attr("class", d => `node ${d.data.type}`)
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();

        // Call the new onNodeClick callback with full node data
        if (onNodeClick) {
          onNodeClick(d.data);
        }

        // Also maintain backward compatibility with onSelectToken
        if (d.data.token) {
          onSelectToken(d.data.token);
        } else {
          onSelectToken(null);
        }
      })
      .on("mouseenter", (event, d) => {
        // Show tooltip
        if (tooltipRef.current) {
          const nodeData = d.data;
          const pos = formatPosition(nodeData);
          const text = truncateText(nodeData.matchedText);

          let tooltipContent = `<div class="font-semibold">${nodeData.type === 'token' ? 'Token' : 'Rule'}: ${nodeData.name}</div>`;
          if (text) {
            tooltipContent += `<div class="text-gray-300 mt-1">Text: "${text}"</div>`;
          }
          if (pos) {
            tooltipContent += `<div class="text-gray-400 text-xs mt-1">Position: ${pos}</div>`;
          }

          tooltipRef.current.innerHTML = tooltipContent;
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.style.left = `${event.pageX + 10}px`;
          tooltipRef.current.style.top = `${event.pageY + 10}px`;
        }

        // Highlight effect on circle
        d3.select(event.currentTarget).select("circle")
          .transition()
          .duration(150)
          .attr("r", 8);
      })
      .on("mousemove", (event) => {
        // Update tooltip position
        if (tooltipRef.current) {
          tooltipRef.current.style.left = `${event.pageX + 10}px`;
          tooltipRef.current.style.top = `${event.pageY + 10}px`;
        }
      })
      .on("mouseleave", (event) => {
        // Hide tooltip
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }

        // Remove highlight effect
        d3.select(event.currentTarget).select("circle")
          .transition()
          .duration(150)
          .attr("r", 6);
      });

    // Node Circles
    node.append("circle")
      .attr("r", 6)
      .attr("fill", d => {
        if (d.data.type === 'error') return '#ef4444'; // Red
        if (d.data.type === 'token') return '#3b82f6'; // Blue
        return '#10b981'; // Green
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("class", "transition-all");

    // Node Labels
    node.append("text")
      .attr("dy", -12)
      .attr("x", 0)
      .style("text-anchor", "middle")
      .text(d => {
        if (d.data.type === 'token') return `"${d.data.name}"`;
        return d.data.name;
      })
      .style("font-size", "12px")
      .style("font-family", "monospace")
      .style("fill", "#ccc")
      .style("text-shadow", "0 1px 2px #000")
      .style("pointer-events", "none"); // Labels don't block clicks

    // Highlight selected node or token
    const highlightSelection = () => {
      g.selectAll(".node circle")
        .attr("stroke", (d: d3.HierarchyPointNode<ParseNode>) => {
          // Check if this node is selected
          if (selectedNodeId && d.data.id === selectedNodeId) return "#fbbf24"; // Amber
          // Check if this node's token is selected
          if (selectedToken && d.data.token && d.data.token.tokenIndex === selectedToken.tokenIndex) return "#fbbf24";
          return "#fff";
        })
        .attr("stroke-width", (d: d3.HierarchyPointNode<ParseNode>) => {
          if (selectedNodeId && d.data.id === selectedNodeId) return 3;
          if (selectedToken && d.data.token && d.data.token.tokenIndex === selectedToken.tokenIndex) return 3;
          return 1;
        });
    };

    highlightSelection();

  }, [data, selectedToken, selectedNodeId, onSelectToken, onNodeClick, formatPosition, truncateText]);

  const handleZoomIn = () => {
    if (svgRef.current) {
      d3.select(svgRef.current).transition().call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 1.2);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current) {
      d3.select(svgRef.current).transition().call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 0.8);
    }
  };

  const handleReset = () => {
    if (svgRef.current && containerRef.current) {
      const height = containerRef.current.clientHeight;
      const t = d3.zoomIdentity.translate(50, height / 2).scale(0.8);
      d3.select(svgRef.current).transition().call(d3.zoom<SVGSVGElement, unknown>().transform, t);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="mb-2">No Parse Tree Available</p>
          <p className="text-sm">Run the parser to generate a tree.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#151515] overflow-hidden" ref={containerRef}>
      <svg ref={svgRef} className="w-full h-full" />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 bg-gray-800 text-white text-sm px-3 py-2 rounded shadow-lg pointer-events-none max-w-xs"
        style={{ display: 'none' }}
      />

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button onClick={handleZoomOut} className="p-2 bg-ide-activity rounded hover:bg-ide-border text-white transition">
          <Minus size={16} />
        </button>
        <button onClick={handleReset} className="p-2 bg-ide-activity rounded hover:bg-ide-border text-white transition">
          <RefreshCw size={16} />
        </button>
        <button onClick={handleZoomIn} className="p-2 bg-ide-activity rounded hover:bg-ide-border text-white transition">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

export default TreeVisualizer;
