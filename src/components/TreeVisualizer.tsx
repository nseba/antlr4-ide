import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ParseNode, Token } from '@/types';
import { Maximize, Minus, Plus, RefreshCw } from 'lucide-react';

interface TreeVisualizerProps {
  data: ParseNode | null;
  onSelectToken: (token: Token | null) => void;
  selectedToken: Token | null;
}

const TreeVisualizer: React.FC<TreeVisualizerProps> = ({ data, onSelectToken, selectedToken }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

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
        setZoom(event.transform.k);
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
        if (d.data.token) {
          onSelectToken(d.data.token);
        } else {
          onSelectToken(null);
        }
      });

    // Node Circles/Rects
    node.append("circle")
      .attr("r", 6)
      .attr("fill", d => {
        if (d.data.type === 'error') return '#ef4444'; // Red
        if (d.data.type === 'token') return '#3b82f6'; // Blue
        return '#10b981'; // Green
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

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
      .style("text-shadow", "0 1px 2px #000");

      // Highlight selected
      if (selectedToken) {
          // This would ideally be a reactive update, but for D3 strict mode we might just re-render or use another effect
          // Simpler here:
           g.selectAll(".node circle")
            .attr("stroke", (d: any) => {
               if (d.data.token && d.data.token.tokenIndex === selectedToken.tokenIndex) return "#fbbf24"; // Amber
               return "#fff";
            })
            .attr("stroke-width", (d: any) => {
                if (d.data.token && d.data.token.tokenIndex === selectedToken.tokenIndex) return 3;
                return 1;
            });
      }

  }, [data, selectedToken, onSelectToken]);

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
         const t = d3.zoomIdentity.translate(50, height/2).scale(0.8);
         d3.select(svgRef.current).transition().call(d3.zoom<SVGSVGElement, unknown>().transform, t);
     }
  }

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
