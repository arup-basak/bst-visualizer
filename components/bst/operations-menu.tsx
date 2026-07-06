"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLineLeft,
  ArrowLineRight,
  CheckCircle,
  Minus,
  Path,
  Play,
  Plus,
  Ranking,
  SlidersHorizontal,
  WarningCircle,
  X,
  type Icon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseOpValue } from "@/lib/bst-schema";
import type { TraversalOrder } from "@/lib/bst-operations";
import { useHotkeys } from "react-hotkeys-hook";
import { AnimatePresence, motion } from "motion/react";

export type OpFeedback = { ok: boolean; message: string } | null;

type OpId =
  | "insert"
  | "remove"
  | "select"
  | "traverse"
  | "predecessor"
  | "successor";

type OperationsMenuProps = {
  disabled?: boolean;
  onInsert: (value: number) => OpFeedback;
  onRemove: (value: number) => OpFeedback;
  onSelect: (k: number) => OpFeedback;
  onTraverse: (order: TraversalOrder) => OpFeedback;
  onPredecessor: (value: number) => OpFeedback;
  onSuccessor: (value: number) => OpFeedback;
  /** Clear any highlight/animation on the canvas. */
  onClear: () => void;
};

type OpConfig = {
  id: OpId;
  label: string;
  hint: string;
  icon: Icon;
  hotkey: string;
  /** Numeric field label, or null for ops with no numeric input (traverse). */
  field: string | null;
  placeholder?: string;
};

const OPS: OpConfig[] = [
  { id: "insert", label: "Insert", hint: "Add a value to the tree", icon: Plus, hotkey: "i", field: "Value", placeholder: "e.g. 42" },
  { id: "remove", label: "Remove", hint: "Delete a value from the tree", icon: Minus, hotkey: "r", field: "Value", placeholder: "e.g. 42" },
  { id: "select", label: "Select", hint: "k-th smallest value (uses subtree sizes)", icon: Ranking, hotkey: "k", field: "k (rank)", placeholder: "e.g. 3" },
  { id: "traverse", label: "Traverse", hint: "Walk the tree from the root", icon: Path, hotkey: "t", field: null },
  { id: "predecessor", label: "Predecessor", hint: "Largest value smaller than v", icon: ArrowLineLeft, hotkey: "p", field: "Value", placeholder: "e.g. 42" },
  { id: "successor", label: "Successor", hint: "Smallest value larger than v", icon: ArrowLineRight, hotkey: "s", field: "Value", placeholder: "e.g. 42" },
];

const ORDERS: { id: TraversalOrder; label: string }[] = [
  { id: "inorder", label: "In-order" },
  { id: "preorder", label: "Pre-order" },
  { id: "postorder", label: "Post-order" },
];

export function OperationsMenu({
  disabled = false,
  onInsert,
  onRemove,
  onSelect,
  onTraverse,
  onPredecessor,
  onSuccessor,
  onClear,
}: OperationsMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeOp, setActiveOp] = useState<OpId | null>(null);
  const [value, setValue] = useState("");
  const [order, setOrder] = useState<TraversalOrder>("inorder");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<OpFeedback>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeConfig = OPS.find((o) => o.id === activeOp) ?? null;

  function openOp(id: OpId) {
    setOpen(true);
    setActiveOp(id);
    setError(null);
    setFeedback(null);
    if (id !== "traverse") setValue("");
    onClear();
  }

  function closePanel() {
    setActiveOp(null);
    setError(null);
    setFeedback(null);
    onClear();
  }

  function run() {
    if (!activeOp) return;
    if (activeOp === "traverse") {
      setFeedback(onTraverse(order));
      return;
    }
    const parsed = parseOpValue(value);
    if ("error" in parsed) {
      setError(parsed.error);
      setFeedback(null);
      return;
    }
    setError(null);
    const v = parsed.value;
    const result =
      activeOp === "insert"
        ? onInsert(v)
        : activeOp === "remove"
          ? onRemove(v)
          : activeOp === "select"
            ? onSelect(v)
            : activeOp === "predecessor"
              ? onPredecessor(v)
              : onSuccessor(v);
    setFeedback(result);
  }

  // Focus the value field whenever a value-based op opens.
  useEffect(() => {
    if (activeOp && activeOp !== "traverse") inputRef.current?.focus();
  }, [activeOp]);

  // Keyboard shortcuts (react-hotkeys-hook). Letter keys are ignored while a
  // form field is focused; Escape stays enabled everywhere so the panel can be
  // dismissed straight from the value input.
  const hotkeyOptions = { enabled: !disabled };
  useHotkeys("b", () => setOpen((o) => !o), hotkeyOptions);
  useHotkeys("i", () => openOp("insert"), hotkeyOptions);
  useHotkeys("r", () => openOp("remove"), hotkeyOptions);
  useHotkeys("k", () => openOp("select"), hotkeyOptions);
  useHotkeys("t", () => openOp("traverse"), hotkeyOptions);
  useHotkeys("p", () => openOp("predecessor"), hotkeyOptions);
  useHotkeys("s", () => openOp("successor"), hotkeyOptions);
  useHotkeys(
    "escape",
    () => {
      if (activeOp) closePanel();
      else setOpen(false);
    },
    { enabled: !disabled, enableOnFormTags: true }
  );

  return (
    <div className="absolute top-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-2">
      {/* Menu bar */}
      <div className="border-border bg-card/90 flex items-center gap-0.5 rounded-lg border p-1 shadow-sm backdrop-blur">
        <Button
          type="button"
          variant={open ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle tree operations (b)"
          title="Toggle tree operations (b)"
          disabled={disabled}
        >
          <SlidersHorizontal />
          <span className="hidden sm:inline">Operations</span>
        </Button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="ops"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex items-center gap-0.5 overflow-hidden"
            >
              <div className="bg-border mx-1 h-5 w-px shrink-0" />
              {OPS.map((op) => {
                const OpIcon = op.icon;
                const isActive = activeOp === op.id;
                return (
                  <Button
                    key={op.id}
                    type="button"
                    variant={isActive ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => (isActive ? closePanel() : openOp(op.id))}
                    aria-label={`${op.label} (${op.hotkey})`}
                    aria-pressed={isActive}
                    title={`${op.label} — ${op.hint} (${op.hotkey})`}
                    disabled={disabled}
                  >
                    <OpIcon />
                  </Button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Operation panel */}
      <AnimatePresence mode="wait">
        {open && activeConfig && (
          <motion.div
            key={activeConfig.id}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="border-border bg-card/95 w-64 rounded-xl border p-3 shadow-lg backdrop-blur"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <activeConfig.icon className="text-foreground size-4" />
                <h3 className="text-sm font-semibold">{activeConfig.label}</h3>
                <kbd className="text-muted-foreground border-border bg-muted/60 rounded border px-1 font-mono text-[10px]">
                  {activeConfig.hotkey}
                </kbd>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={closePanel}
                aria-label="Close (Esc)"
                title="Close (Esc)"
              >
                <X />
              </Button>
            </div>

            <p className="text-muted-foreground mb-2.5 text-xs">{activeConfig.hint}</p>

            {activeConfig.field ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="op-value" className="text-xs">
                  {activeConfig.field}
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    id="op-value"
                    ref={inputRef}
                    type="number"
                    inputMode="numeric"
                    value={value}
                    placeholder={activeConfig.placeholder}
                    onChange={(e) => {
                      setValue(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        run();
                      }
                    }}
                    aria-invalid={!!error}
                    className="h-8"
                  />
                  <Button type="button" size="sm" onClick={run} aria-label="Run">
                    <Play weight="fill" />
                    Run
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-1">
                  {ORDERS.map((o) => (
                    <Button
                      key={o.id}
                      type="button"
                      variant={order === o.id ? "secondary" : "outline"}
                      size="xs"
                      onClick={() => setOrder(o.id)}
                      aria-pressed={order === o.id}
                    >
                      {o.label}
                    </Button>
                  ))}
                </div>
                <Button type="button" size="sm" onClick={run} className="w-full">
                  <Play weight="fill" />
                  Run traversal
                </Button>
              </div>
            )}

            {error && <p className="text-destructive mt-2 text-xs">{error}</p>}

            <AnimatePresence mode="wait">
              {feedback && (
                <motion.div
                  key={feedback.message}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`mt-2.5 flex items-start gap-1.5 text-xs ${
                    feedback.ok ? "text-foreground" : "text-destructive"
                  }`}
                >
                  {feedback.ok ? (
                    <CheckCircle
                      weight="fill"
                      className="mt-px size-3.5 shrink-0 text-emerald-500"
                    />
                  ) : (
                    <WarningCircle weight="fill" className="mt-px size-3.5 shrink-0" />
                  )}
                  <span className="break-words">{feedback.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-muted-foreground border-border/60 mt-3 border-t pt-2 text-[11px]">
              <kbd className="font-mono">Enter</kbd> run ·{" "}
              <kbd className="font-mono">Esc</kbd> close
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
