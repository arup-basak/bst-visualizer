"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateBst, layoutTree, type TreeLayout } from "@/lib/bst";
import { MAX_HEIGHT, MAX_NODES, bstInputSchema } from "@/lib/bst-schema";

import { HoverPanel } from "./hover-panel";
import { TreeCanvas, type HoverTarget } from "./tree-canvas";

type FieldErrors = { nodes?: string; height?: string };

const TOOLTIP_W = 240;
const TOOLTIP_H = 300;

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.2;

export function BstVisualizer() {
  const [nodes, setNodes] = useState("15");
  const [height, setHeight] = useState("4");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [layout, setLayout] = useState<TreeLayout | null>(null);
  const [generationId, setGenerationId] = useState(0);
  const [hovered, setHovered] = useState<HoverTarget>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const zoomBy = (delta: number) =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100)));

  function build(rawNodes: string, rawHeight: string) {
    const parsed = bstInputSchema.safeParse({
      nodes: rawNodes,
      height: rawHeight,
    });
    if (!parsed.success) {
      const fe: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "nodes" && !fe.nodes) fe.nodes = issue.message;
        if (key === "height" && !fe.height) fe.height = issue.message;
      }
      setErrors(fe);
      return;
    }
    setErrors({});
    const tree = generateBst(parsed.data.nodes, parsed.data.height);
    setLayout(layoutTree(tree));
    setHovered(null);
    setZoom(1);
    setGenerationId((id) => id + 1);
  }

  // Build an initial tree after mount (keeps SSR output deterministic / avoids
  // a hydration mismatch from Math.random).
  useEffect(() => {
    build(nodes, height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    build(nodes, height);
  }

  function handleMove(e: React.MouseEvent) {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  // Position the tooltip near the cursor, flipping/clamping to stay in view.
  const ww = wrapperRef.current?.clientWidth ?? 0;
  const wh = wrapperRef.current?.clientHeight ?? 0;
  let tipLeft = pointer.x + 16;
  if (tipLeft + TOOLTIP_W > ww)
    tipLeft = Math.max(8, pointer.x - TOOLTIP_W - 16);
  const tipTop = Math.max(8, Math.min(pointer.y + 16, wh - TOOLTIP_H));

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Controls */}
      <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-72">
        <form
          onSubmit={handleSubmit}
          className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4 shadow-sm"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nodes">Nodes</Label>
            <Input
              id="nodes"
              type="number"
              min={1}
              max={MAX_NODES}
              value={nodes}
              onChange={(e) => setNodes(e.target.value)}
              aria-invalid={!!errors.nodes}
            />
            {errors.nodes ? (
              <p className="text-destructive text-xs">{errors.nodes}</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                How many nodes (1–{MAX_NODES}).
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="height">Max height</Label>
            <Input
              id="height"
              type="number"
              min={0}
              max={MAX_HEIGHT}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              aria-invalid={!!errors.height}
            />
            {errors.height ? (
              <p className="text-destructive text-xs">{errors.height}</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Longest root-to-leaf edges (0–{MAX_HEIGHT}).
              </p>
            )}
          </div>

          <Button type="submit" className="w-full">
            Generate BST
          </Button>
        </form>

        {layout && (
          <div className="bg-card border-border grid grid-cols-2 gap-3 rounded-xl border p-4 shadow-sm">
            <div>
              <p className="text-muted-foreground text-xs">Nodes</p>
              <p className="font-mono text-lg font-semibold">
                {layout.nodes.length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Tree height</p>
              <p className="font-mono text-lg font-semibold">
                {layout.treeHeight}
              </p>
            </div>
          </div>
        )}

        <p className="text-muted-foreground px-1 text-xs leading-relaxed">
          Hover a node or edge to inspect it · drag nodes to rearrange · scroll to
          pan · zoom with the controls on the canvas.
        </p>
      </aside>

      {/* Canvas (non-scrolling positioned wrapper hosts the tooltip) */}
      <div
        ref={wrapperRef}
        className="relative h-[60vh] min-h-[360px] w-full min-w-0 flex-1 lg:h-[74vh]"
        onMouseMove={handleMove}
      >
        <div className="bg-card border-border tree-surface h-full w-full overflow-auto rounded-xl border p-2 shadow-sm">
          {layout ? (
            <div className="flex h-max min-h-full w-max min-w-full items-center justify-center">
              <TreeCanvas
                layout={layout}
                generationId={generationId}
                hovered={hovered}
                onHover={setHovered}
                zoom={zoom}
              />
            </div>
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Generating…
            </div>
          )}
        </div>

        {/* Zoom controls — scroll/trackpad pans the canvas */}
        {layout && (
          <div className="border-border bg-card/90 absolute top-3 right-3 z-20 flex items-center gap-0.5 rounded-lg border p-1 shadow-sm backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => zoomBy(-ZOOM_STEP)}
              disabled={zoom <= ZOOM_MIN}
              aria-label="Zoom out"
            >
              <MagnifyingGlassMinus />
            </Button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="text-muted-foreground hover:text-foreground min-w-11 text-center font-mono text-xs tabular-nums"
              aria-label="Reset zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => zoomBy(ZOOM_STEP)}
              disabled={zoom >= ZOOM_MAX}
              aria-label="Zoom in"
            >
              <MagnifyingGlassPlus />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setZoom(1)}
              aria-label="Reset view"
            >
              <ArrowCounterClockwise />
            </Button>
          </div>
        )}

        {layout && hovered && (
          <div
            className="pointer-events-none absolute z-10"
            style={{ left: tipLeft, top: tipTop, width: TOOLTIP_W }}
          >
            <HoverPanel hovered={hovered} />
          </div>
        )}
      </div>
    </div>
  );
}
