"use client";

import type { Ref } from "react";
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
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
  zoom: number;
  /** Node values on an operation's path/sequence (rendered highlighted). */
  highlightValues?: Set<number>;
  /** The single emphasized value (e.g. an operation's result / current step). */
  activeValue?: number | null;
  /** When true this is an incremental edit (insert/remove): only the changed
   * node animates in/out and the rest glide, instead of a staggered replay. */
  incremental?: boolean;
};

const EMPTY_HIGHLIGHT: Set<number> = new Set();

// Shared spring for gliding nodes/edges to their new positions after a relayout.
const SPRING = { type: "spring", stiffness: 260, damping: 26 } as const;

type Offset = { x: number; y: number };
type Offsets = Record<number, Offset>;

const ZERO: Offset = { x: 0, y: 0 };

export function TreeCanvas({
  layout,
  generationId,
  hovered,
  onHover,
  zoom,
  highlightValues = EMPTY_HIGHLIGHT,
  activeValue = null,
  incremental = false,
}: TreeCanvasProps) {
  const { nodes, edges, width, height } = layout;

  // Committed per-node offsets (accumulated across finished drags) plus the
  // live delta of the node currently being dragged. Keyed by node *value* so a
  // drag survives a relayout after an insert/remove (node ids are reassigned).
  const [offsets, setOffsets] = useState<Offsets>({});
  const [active, setActive] = useState<{ value: number; dx: number; dy: number } | null>(null);

  // Reset all dragging when a fresh tree is generated (generationId bumps only
  // on a full generate/reset — not on an incremental insert/remove).
  const [seenGeneration, setSeenGeneration] = useState(generationId);
  if (seenGeneration !== generationId) {
    setSeenGeneration(generationId);
    setOffsets({});
    setActive(null);
  }

  // A tiny movement threshold so hovering / inspecting still works — a drag only
  // starts once the pointer actually travels a few pixels.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  /** Effective position of a node = base layout + committed offset + live drag. */
  function posOf(node: LayoutNode) {
    const committed = offsets[node.value] ?? ZERO;
    const live = active?.value === node.value ? { x: active.dx, y: active.dy } : ZERO;
    return { x: node.x + committed.x + live.x, y: node.y + committed.y + live.y };
  }

  function handleDragStart(event: DragStartEvent) {
    setActive({ value: Number(event.active.id), dx: 0, dy: 0 });
    onHover(null);
  }

  // Drag deltas are in screen pixels; the SVG is rendered at `zoom` scale, so
  // convert back to layout units before applying them to node coordinates.
  function handleDragMove(event: DragMoveEvent) {
    setActive({
      value: Number(event.active.id),
      dx: event.delta.x / zoom,
      dy: event.delta.y / zoom,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const value = Number(event.active.id);
    setOffsets((prev) => {
      const base = prev[value] ?? ZERO;
      return {
        ...prev,
        [value]: { x: base.x + event.delta.x / zoom, y: base.y + event.delta.y / zoom },
      };
    });
    setActive(null);
  }

  const hoveredNodeId = hovered?.kind === "node" ? hovered.node.id : null;
  const hoveredEdgeId = hovered?.kind === "edge" ? hovered.edge.id : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <svg
        viewBox={`0 0 ${width * zoom} ${height * zoom}`}
        width={width * zoom}
        height={height * zoom}
        className="block max-w-none select-none"
        role="img"
        aria-label="Binary search tree visualization"
      >
        {/* viewBox matches the rendered pixel size; zoom is applied as a
            transform so the drawing always fills the canvas exactly (no
            preserveAspectRatio letterboxing / overflow). */}
        <g transform={`scale(${zoom})`}>
        <AnimatePresence mode="wait">
          <motion.g
            key={generationId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Edges (drawn under the nodes). Keyed by the value pair so an
                insert/remove only mounts/unmounts the affected edge; endpoints
                spring to follow nodes as they glide. */}
            <AnimatePresence>
              {edges.map((edge) => {
                const edgeHighlighted =
                  highlightValues.has(edge.from.value) &&
                  highlightValues.has(edge.to.value);
                const edgeActive = hoveredEdgeId === edge.id || edgeHighlighted;
                const from = posOf(edge.from);
                const to = posOf(edge.to);
                const delay = incremental ? 0 : edge.to.depth * 0.06;
                const ends = { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
                return (
                  <g key={`${edge.from.value}-${edge.to.value}`}>
                    {/* wide invisible hit area for easy hovering */}
                    <motion.line
                      {...ends}
                      animate={ends}
                      transition={SPRING}
                      stroke="transparent"
                      strokeWidth={16}
                      className="cursor-pointer"
                      onMouseEnter={() => onHover({ kind: "edge", edge })}
                      onMouseLeave={() => onHover(null)}
                    />
                    <motion.line
                      {...ends}
                      stroke={edgeActive ? "var(--tree-highlight)" : "var(--tree-edge)"}
                      strokeWidth={edgeActive ? 4 : 2}
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ ...ends, pathLength: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        pathLength: { delay, duration: 0.35 },
                        opacity: { delay, duration: 0.2 },
                        x1: SPRING,
                        y1: SPRING,
                        x2: SPRING,
                        y2: SPRING,
                      }}
                      className="pointer-events-none"
                    />
                  </g>
                );
              })}
            </AnimatePresence>

            {/* Nodes — keyed by value so only the inserted/removed node animates. */}
            <AnimatePresence>
              {nodes.map((node) => (
                <DraggableNode
                  key={node.value}
                  node={node}
                  pos={posOf(node)}
                  dragging={active?.value === node.value}
                  hoverActive={hoveredNodeId === node.id}
                  highlighted={highlightValues.has(node.value)}
                  emphasized={activeValue === node.value}
                  incremental={incremental}
                  onHover={onHover}
                />
              ))}
            </AnimatePresence>
          </motion.g>
        </AnimatePresence>
        </g>
      </svg>
    </DndContext>
  );
}

type DraggableNodeProps = {
  node: LayoutNode;
  pos: { x: number; y: number };
  dragging: boolean;
  hoverActive: boolean;
  highlighted: boolean;
  emphasized: boolean;
  incremental: boolean;
  onHover: (target: HoverTarget) => void;
};

function DraggableNode({
  node,
  pos,
  dragging,
  hoverActive,
  highlighted,
  emphasized,
  incremental,
  onHover,
}: DraggableNodeProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: node.value });
  // A node stands out when hovered, dragged, or emphasized by an operation
  // result. Path nodes are "highlighted" — ringed but not filled.
  const active = hoverActive || dragging || emphasized;
  const ringed = active || highlighted;
  // On an incremental edit only the newly-mounted node animates in (no stagger);
  // on a full build nodes cascade in by depth.
  const delay = incremental ? 0 : node.depth * 0.06 + 0.1;

  return (
    // Outer group carries the drag offset only (applied instantly, no spring).
    <g
      ref={setNodeRef as unknown as Ref<SVGGElement>}
      {...listeners}
      {...attributes}
      transform={`translate(${pos.x - node.x} ${pos.y - node.y})`}
      className={dragging ? "cursor-grabbing" : "cursor-grab"}
      onMouseEnter={() => onHover({ kind: "node", node })}
      onMouseLeave={() => onHover(null)}
    >
      {/* Inner group springs to the node's layout position (x/y = translate),
          so the circle + label move together and the label stays centered. */}
      <motion.g
        initial={{ x: node.x, y: node.y }}
        animate={{ x: node.x, y: node.y }}
        transition={{ x: SPRING, y: SPRING }}
      >
        <motion.circle
          cx={0}
          cy={0}
          fill={active ? "var(--tree-node-active)" : "var(--tree-node)"}
          stroke={ringed ? "var(--tree-highlight)" : "var(--tree-node-stroke)"}
          strokeWidth={ringed ? 3 : 2}
          initial={{ r: 0, opacity: 0 }}
          animate={{ r: ringed ? NODE_RADIUS + 3 : NODE_RADIUS, opacity: 1 }}
          exit={{ r: 0, opacity: 0 }}
          transition={{
            r: { type: "spring", stiffness: 320, damping: 22, delay: active ? 0 : delay },
            opacity: { delay, duration: 0.2 },
          }}
        />
        <motion.text
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--tree-node-text)"
          className="pointer-events-none font-mono text-[15px] font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: delay + 0.08, duration: 0.2 }}
        >
          {node.value}
        </motion.text>
      </motion.g>
    </g>
  );
}

