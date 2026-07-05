"use client";

import { AnimatePresence, motion } from "motion/react";

import { NODE_RADIUS, type LayoutEdge, type LayoutNode, type TreeLayout } from "@/lib/bst";

export type HoverTarget =
  | { kind: "node"; node: LayoutNode }
  | { kind: "edge"; edge: LayoutEdge }
  | null;

type TreeCanvasProps = {
  layout: TreeLayout;
  generationId: number;
  hovered: HoverTarget;
  onHover: (target: HoverTarget) => void;
};

export function TreeCanvas({ layout, generationId, hovered, onHover }: TreeCanvasProps) {
  const { nodes, edges, width, height } = layout;

  const hoveredNodeId = hovered?.kind === "node" ? hovered.node.id : null;
  const hoveredEdgeId = hovered?.kind === "edge" ? hovered.edge.id : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="h-auto max-w-none select-none"
      role="img"
      aria-label="Binary search tree visualization"
    >
      <AnimatePresence mode="wait">
        <motion.g
          key={generationId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Edges (drawn under the nodes) */}
          {edges.map((edge) => {
            const active = hoveredEdgeId === edge.id;
            const delay = edge.to.depth * 0.06;
            return (
              <g key={edge.id}>
                {/* wide invisible hit area for easy hovering */}
                <line
                  x1={edge.from.x}
                  y1={edge.from.y}
                  x2={edge.to.x}
                  y2={edge.to.y}
                  stroke="transparent"
                  strokeWidth={16}
                  className="cursor-pointer"
                  onMouseEnter={() => onHover({ kind: "edge", edge })}
                  onMouseLeave={() => onHover(null)}
                />
                <motion.line
                  x1={edge.from.x}
                  y1={edge.from.y}
                  x2={edge.to.x}
                  y2={edge.to.y}
                  stroke={active ? "var(--tree-highlight)" : "var(--tree-edge)"}
                  strokeWidth={active ? 4 : 2}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ pathLength: { delay, duration: 0.35 }, opacity: { delay, duration: 0.2 } }}
                  className="pointer-events-none"
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const active = hoveredNodeId === node.id;
            const delay = node.depth * 0.06 + 0.1;
            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => onHover({ kind: "node", node })}
                onMouseLeave={() => onHover(null)}
              >
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  fill={active ? "var(--tree-node-active)" : "var(--tree-node)"}
                  stroke={active ? "var(--tree-highlight)" : "var(--tree-node-stroke)"}
                  strokeWidth={active ? 3 : 2}
                  initial={{ r: 0, opacity: 0 }}
                  animate={{ r: active ? NODE_RADIUS + 3 : NODE_RADIUS, opacity: 1 }}
                  transition={{
                    r: { type: "spring", stiffness: 320, damping: 22, delay: active ? 0 : delay },
                    opacity: { delay, duration: 0.2 },
                  }}
                />
                <motion.text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--tree-node-text)"
                  className="pointer-events-none font-mono text-[15px] font-semibold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: delay + 0.08, duration: 0.2 }}
                >
                  {node.value}
                </motion.text>
              </g>
            );
          })}
        </motion.g>
      </AnimatePresence>
    </svg>
  );
}
