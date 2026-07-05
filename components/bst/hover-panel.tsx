"use client";

import { AnimatePresence, motion } from "motion/react";

import type { HoverTarget } from "./tree-canvas";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-mono text-sm font-medium">{value}</span>
    </div>
  );
}

export function HoverPanel({ hovered }: { hovered: HoverTarget }) {
  return (
    <div className="bg-card/90 border-border w-60 rounded-xl border p-4 shadow-lg backdrop-blur">
      <AnimatePresence mode="wait">
        {hovered === null && (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-muted-foreground text-sm"
          >
            Hover a node or edge to inspect its properties.
          </motion.p>
        )}

        {hovered?.kind === "node" && (
          <motion.div
            key={`node-${hovered.node.id}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ background: "var(--tree-highlight)" }}
              />
              <h3 className="text-sm font-semibold">Node</h3>
            </div>
            <Row label="Value" value={hovered.node.value} />
            <Row label="Depth" value={hovered.node.depth} />
            <Row label="Subtree height" value={hovered.node.subtreeHeight} />
            <Row
              label="Balance factor"
              value={
                <span
                  className={
                    Math.abs(hovered.node.balanceFactor) > 1
                      ? "text-destructive"
                      : undefined
                  }
                >
                  {hovered.node.balanceFactor > 0 ? "+" : ""}
                  {hovered.node.balanceFactor}
                </span>
              }
            />
            <Row label="Leaf" value={hovered.node.isLeaf ? "yes" : "no"} />
            <Row label="Parent" value={hovered.node.parentValue ?? "— (root)"} />
            <Row label="Left child" value={hovered.node.leftValue ?? "—"} />
            <Row label="Right child" value={hovered.node.rightValue ?? "—"} />
          </motion.div>
        )}

        {hovered?.kind === "edge" && (
          <motion.div
            key={`edge-${hovered.edge.id}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-4 rounded-full"
                style={{ background: "var(--tree-highlight)" }}
              />
              <h3 className="text-sm font-semibold">Edge</h3>
            </div>
            <Row
              label="Connects"
              value={`${hovered.edge.from.value} → ${hovered.edge.to.value}`}
            />
            <Row
              label="Direction"
              value={hovered.edge.direction === "L" ? "left child" : "right child"}
            />
            <Row
              label="Value delta"
              value={`${hovered.edge.delta > 0 ? "+" : ""}${hovered.edge.delta}`}
            />
            <Row label="Parent depth" value={hovered.edge.from.depth} />
            <Row label="Child depth" value={hovered.edge.to.depth} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
