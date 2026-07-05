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
};

type Offset = { x: number; y: number };
type Offsets = Record<number, Offset>;

const ZERO: Offset = { x: 0, y: 0 };

export function TreeCanvas({ layout, generationId, hovered, onHover, zoom }: TreeCanvasProps) {
  const { nodes, edges, width, height } = layout;

  // Committed per-node offsets (accumulated across finished drags) plus the
  // live delta of the node currently being dragged. Keyed by node id.
  const [offsets, setOffsets] = useState<Offsets>({});
  const [active, setActive] = useState<{ id: number; dx: number; dy: number } | null>(null);

  // Reset all dragging when a fresh tree is generated.
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
    const committed = offsets[node.id] ?? ZERO;
    const live = active?.id === node.id ? { x: active.dx, y: active.dy } : ZERO;
    return { x: node.x + committed.x + live.x, y: node.y + committed.y + live.y };
  }

  function handleDragStart(event: DragStartEvent) {
    setActive({ id: Number(event.active.id), dx: 0, dy: 0 });
    onHover(null);
  }

  // Drag deltas are in screen pixels; the SVG is rendered at `zoom` scale, so
  // convert back to layout units before applying them to node coordinates.
  function handleDragMove(event: DragMoveEvent) {
    setActive({
      id: Number(event.active.id),
      dx: event.delta.x / zoom,
      dy: event.delta.y / zoom,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const id = Number(event.active.id);
    setOffsets((prev) => {
      const base = prev[id] ?? ZERO;
      return {
        ...prev,
        [id]: { x: base.x + event.delta.x / zoom, y: base.y + event.delta.y / zoom },
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
        viewBox={`0 0 ${width} ${height}`}
        width={width * zoom}
        height={height * zoom}
        className="max-w-none select-none"
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
            {/* Edges (drawn under the nodes) — endpoints track dragged nodes. */}
            {edges.map((edge) => {
              const edgeActive = hoveredEdgeId === edge.id;
              const from = posOf(edge.from);
              const to = posOf(edge.to);
              const delay = edge.to.depth * 0.06;
              return (
                <g key={edge.id}>
                  {/* wide invisible hit area for easy hovering */}
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="transparent"
                    strokeWidth={16}
                    className="cursor-pointer"
                    onMouseEnter={() => onHover({ kind: "edge", edge })}
                    onMouseLeave={() => onHover(null)}
                  />
                  <motion.line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={edgeActive ? "var(--tree-highlight)" : "var(--tree-edge)"}
                    strokeWidth={edgeActive ? 4 : 2}
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
            {nodes.map((node) => (
              <DraggableNode
                key={node.id}
                node={node}
                pos={posOf(node)}
                dragging={active?.id === node.id}
                hoverActive={hoveredNodeId === node.id}
                onHover={onHover}
              />
            ))}
          </motion.g>
        </AnimatePresence>
      </svg>
    </DndContext>
  );
}

type DraggableNodeProps = {
  node: LayoutNode;
  pos: { x: number; y: number };
  dragging: boolean;
  hoverActive: boolean;
  onHover: (target: HoverTarget) => void;
};

function DraggableNode({ node, pos, dragging, hoverActive, onHover }: DraggableNodeProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: node.id });
  const active = hoverActive || dragging;
  const delay = node.depth * 0.06 + 0.1;

  return (
    <g
      ref={setNodeRef as unknown as Ref<SVGGElement>}
      {...listeners}
      {...attributes}
      transform={`translate(${pos.x - node.x} ${pos.y - node.y})`}
      className={dragging ? "cursor-grabbing" : "cursor-grab"}
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
}
