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
import {
  generateBst,
  layoutTree,
  type BSTNode,
  type TreeLayout,
} from "@/lib/bst";
import {
  contains,
  insert,
  kthSmallest,
  predecessor,
  remove,
  searchPath,
  successor,
  traverse,
  type TraversalOrder,
} from "@/lib/bst-operations";
import { MAX_HEIGHT, MAX_NODES, bstInputSchema } from "@/lib/bst-schema";

import { HoverPanel } from "./hover-panel";
import { OperationsMenu, type OpFeedback } from "./operations-menu";
import { TreeCanvas, type HoverTarget } from "./tree-canvas";

type Highlight = { values: number[]; active: number | null };

const ORDER_LABELS: Record<TraversalOrder, string> = {
  inorder: "In-order",
  preorder: "Pre-order",
  postorder: "Post-order",
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

type FieldErrors = { nodes?: string; height?: string };

const TOOLTIP_W = 240;
const TOOLTIP_H = 300;

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.2;

const DEFAULT_NODES = "15";
const DEFAULT_HEIGHT = "4";

export function BstVisualizer() {
  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [root, setRoot] = useState<BSTNode | null>(null);
  const [layout, setLayout] = useState<TreeLayout | null>(null);
  const [generationId, setGenerationId] = useState(0);
  const [hovered, setHovered] = useState<HoverTarget>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // Static highlight (search/select/pred/succ paths), and a separate animated
  // traversal sequence that reveals one node at a time.
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [traverseSeq, setTraverseSeq] = useState<number[] | null>(null);
  const [traverseStep, setTraverseStep] = useState(0);
  // True for structural edits (insert/remove) so the canvas animates only the
  // changed node instead of replaying the whole tree.
  const [incremental, setIncremental] = useState(false);
  // Bumped on a full reset to remount the operations menu (closing its panel).
  const [resetCount, setResetCount] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // A structural edit (insert/remove) deferred until its search-path walk
  // finishes animating. Held in a ref so the reveal effect can fire it without
  // re-subscribing. Flushed early if the animation is interrupted.
  const pendingCommit = useRef<(() => void) | null>(null);

  const zoomBy = (delta: number) =>
    setZoom((z) =>
      Math.min(
        ZOOM_MAX,
        Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100),
      ),
    );

  // Commit a new tree root: relayout and reset transient view state.
  // `replay` (generate/reset) bumps generationId to replay the full staggered
  // grow animation and clear drag offsets; an incremental edit (insert/remove)
  // leaves generationId alone so only the changed node animates and drags/
  // positions of the surviving nodes are preserved.
  function applyRoot(newRoot: BSTNode | null, replay = true) {
    setRoot(newRoot);
    setLayout(layoutTree(newRoot));
    setHovered(null);
    setHighlight(null);
    setTraverseSeq(null);
    setTraverseStep(0);
    setIncremental(!replay);
    if (replay) setGenerationId((id) => id + 1);
  }

  function clearHighlight() {
    // If a walk is interrupted before it finishes, commit its edit now so the
    // tree stays consistent (applyRoot resets the transient state itself).
    if (pendingCommit.current) {
      const commit = pendingCommit.current;
      pendingCommit.current = null;
      commit();
      return;
    }
    setHighlight(null);
    setTraverseSeq(null);
    setTraverseStep(0);
  }

  // Animate a search-path walk (reusing the traversal reveal machinery), then
  // run `commit` — the deferred insert/remove — once the last node is reached.
  function walkThenCommit(path: number[], commit: () => void) {
    setHighlight(null);
    setTraverseSeq(path);
    setTraverseStep(0);
    pendingCommit.current = commit;
  }

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
    applyRoot(tree);
    setZoom(1);
  }

  // Reset the canvas: clear the tree to an empty state and restore the default
  // inputs — but do NOT regenerate a new tree. applyRoot(null) clears the root,
  // highlights, hover, drag offsets and traversal; bumping resetCount remounts
  // the operations menu so any open panel closes too.
  function handleReset() {
    setNodes(DEFAULT_NODES);
    setHeight(DEFAULT_HEIGHT);
    setErrors({});
    setResetCount((c) => c + 1);
    setZoom(1);
    applyRoot(null);
  }

  const nodeCount = layout?.nodes.length ?? 0;

  function handleInsert(value: number): OpFeedback {
    if (contains(root, value)) {
      setHighlight({ values: searchPath(root, value), active: value });
      setTraverseSeq(null);
      return { ok: false, message: `${value} is already in the tree.` };
    }
    // Walk the comparison path down to the insertion point, then drop the new
    // node in (it animates in via the incremental edit).
    const newRoot = insert(root, value);
    walkThenCommit(searchPath(root, value), () => {
      applyRoot(newRoot, false);
      setHighlight({ values: searchPath(newRoot, value), active: value });
    });
    return {
      ok: true,
      message: `Inserting ${value} — walking the search path…`,
    };
  }

  function handleRemove(value: number): OpFeedback {
    if (!contains(root, value)) {
      return { ok: false, message: `${value} is not in the tree.` };
    }
    // Walk the search path down to the target node, then remove it (it animates
    // out via the incremental edit).
    const newRoot = remove(root, value);
    walkThenCommit(searchPath(root, value), () => applyRoot(newRoot, false));
    return {
      ok: true,
      message: `Removing ${value} — walking the search path…`,
    };
  }

  function handleSelect(k: number): OpFeedback {
    if (!root) return { ok: false, message: "The tree is empty." };
    if (k < 1 || k > nodeCount)
      return { ok: false, message: `k must be between 1 and ${nodeCount}.` };
    const { value, path } = kthSmallest(root, k);
    setTraverseSeq(null);
    setHighlight({ values: path, active: value });
    return { ok: true, message: `${ordinal(k)} smallest value is ${value}.` };
  }

  function handleTraverse(order: TraversalOrder): OpFeedback {
    if (!root) return { ok: false, message: "The tree is empty." };
    const seq = traverse(root, order);
    setHighlight(null);
    setTraverseSeq(seq);
    setTraverseStep(0);
    return { ok: true, message: `${ORDER_LABELS[order]}: ${seq.join(" → ")}` };
  }

  function handlePredecessor(value: number): OpFeedback {
    if (!root) return { ok: false, message: "The tree is empty." };
    const p = predecessor(root, value);
    if (p === null) {
      clearHighlight();
      return {
        ok: false,
        message: `No predecessor — ${value} is ≤ the minimum.`,
      };
    }
    setTraverseSeq(null);
    setHighlight({ values: [p], active: p });
    return { ok: true, message: `predecessor(${value}) = ${p}.` };
  }

  function handleSuccessor(value: number): OpFeedback {
    if (!root) return { ok: false, message: "The tree is empty." };
    const s = successor(root, value);
    if (s === null) {
      clearHighlight();
      return {
        ok: false,
        message: `No successor — ${value} is ≥ the maximum.`,
      };
    }
    setTraverseSeq(null);
    setHighlight({ values: [s], active: s });
    return { ok: true, message: `successor(${value}) = ${s}.` };
  }

  // Build an initial tree after mount (keeps SSR output deterministic / avoids
  // a hydration mismatch from Math.random).
  useEffect(() => {
    build(nodes, height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reveal a traversal / search-path walk one node at a time.
  useEffect(() => {
    if (!traverseSeq) return;
    // Walk finished: if this was an insert/remove, commit the edit after a short
    // pause on the final node so the structural change is easy to follow.
    if (traverseStep >= traverseSeq.length) {
      if (!pendingCommit.current) return;
      const commit = pendingCommit.current;
      pendingCommit.current = null;
      const id = setTimeout(commit, 360);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setTraverseStep((s) => s + 1), 420);
    return () => clearTimeout(id);
  }, [traverseSeq, traverseStep]);

  const highlightValues = traverseSeq
    ? new Set(traverseSeq.slice(0, traverseStep))
    : new Set(highlight?.values ?? []);
  const activeValue = traverseSeq
    ? traverseStep > 0
      ? traverseSeq[traverseStep - 1]
      : null
    : (highlight?.active ?? null);

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

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Generate BST
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              aria-label="Reset the canvas"
              title="Reset the canvas"
            >
              <ArrowCounterClockwise />
              Reset
            </Button>
          </div>
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
                {layout.treeHeight < 0 ? "—" : layout.treeHeight}
              </p>
            </div>
          </div>
        )}

        <p className="text-muted-foreground px-1 text-xs leading-relaxed">
          Hover a node or edge to inspect it · drag nodes to rearrange · scroll
          to pan · zoom with the controls on the canvas. Open{" "}
          <span className="text-foreground font-medium">Operations</span>{" "}
          (top-left or press <kbd className="font-mono">b</kbd>) to insert,
          remove, select the k-th smallest, traverse, or find a predecessor /
          successor.
        </p>
      </aside>

      {/* Canvas (non-scrolling positioned wrapper hosts the tooltip) */}
      <div
        ref={wrapperRef}
        className="relative h-[60vh] min-h-90 w-full min-w-0 flex-1 lg:h-[74vh]"
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
                highlightValues={highlightValues}
                activeValue={activeValue}
                incremental={incremental}
              />
            </div>
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Generating…
            </div>
          )}
        </div>

        {/* Operations menu bar — toggle open with animations, or drive it
            entirely from the keyboard (b / i / r / k / t / p / s, Esc). */}
        <OperationsMenu
          key={resetCount}
          disabled={!layout}
          onInsert={handleInsert}
          onRemove={handleRemove}
          onSelect={handleSelect}
          onTraverse={handleTraverse}
          onPredecessor={handlePredecessor}
          onSuccessor={handleSuccessor}
          onClear={clearHighlight}
        />

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
