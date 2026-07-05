// Pure, framework-free Binary Search Tree generation + layout.
// No React / DOM here — just data in, data out.

export type BSTNode = {
  value: number;
  left: BSTNode | null;
  right: BSTNode | null;
};

export type LayoutNode = {
  id: number;
  value: number;
  x: number;
  y: number;
  depth: number;
  parentValue: number | null;
  leftValue: number | null;
  rightValue: number | null;
  subtreeHeight: number; // edges on the longest downward path (leaf = 0)
  balanceFactor: number; // height(left) - height(right)
  isLeaf: boolean;
};

export type LayoutEdge = {
  id: string;
  from: LayoutNode; // parent
  to: LayoutNode; // child
  direction: "L" | "R";
  delta: number; // child.value - parent.value
};

export type TreeLayout = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number; // pixel height of the SVG
  treeHeight: number; // structural height of the tree (edges, root = 0)
};

// ---- Feasibility helpers -------------------------------------------------

/** Maximum number of nodes a tree of the given height (edges) can hold. */
export function maxNodesFor(height: number): number {
  return 2 ** (height + 1) - 1;
}

/** Minimum height (edges) needed to hold n nodes. */
export function minHeightFor(n: number): number {
  return Math.ceil(Math.log2(n + 1)) - 1;
}

/** A (count, maxHeight) pair is buildable iff count fits within maxHeight. */
export function isFeasible(count: number, maxHeight: number): boolean {
  return count >= 1 && count <= maxNodesFor(maxHeight);
}

// ---- Generation ----------------------------------------------------------

/** Fisher–Yates shuffle using an injected RNG (kept pure for testing). */
function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** `count` distinct random integers, sorted ascending. */
function uniqueSortedValues(count: number, rand: () => number): number[] {
  const range = Math.max(99, count * 3);
  const pool = Array.from({ length: range }, (_, i) => i + 1);
  return shuffle(pool, rand)
    .slice(0, count)
    .sort((a, b) => a - b);
}

/**
 * Build a BST from sorted values, choosing a random root split at each level
 * such that both subtrees still fit within the remaining height budget.
 * This yields varied (not always perfectly balanced) shapes that always
 * respect the cap; a balanced tree is the natural fallback when the cap is tight.
 */
function buildFromSorted(
  values: number[],
  heightBudget: number,
  rand: () => number
): BSTNode | null {
  const n = values.length;
  if (n === 0) return null;

  // Each subtree may hold at most this many nodes within the remaining budget.
  const cap = maxNodesFor(heightBudget - 1);
  const minRoot = Math.max(0, n - 1 - cap); // right subtree can't exceed cap
  const maxRoot = Math.min(n - 1, cap); // left subtree can't exceed cap
  const rootIdx = minRoot + Math.floor(rand() * (maxRoot - minRoot + 1));

  return {
    value: values[rootIdx],
    left: buildFromSorted(values.slice(0, rootIdx), heightBudget - 1, rand),
    right: buildFromSorted(values.slice(rootIdx + 1), heightBudget - 1, rand),
  };
}

/**
 * Generate a random BST with exactly `count` unique integer values whose
 * height is <= `maxHeight`. Throws if the combination is infeasible.
 */
export function generateBst(
  count: number,
  maxHeight: number,
  rand: () => number = Math.random
): BSTNode {
  if (!isFeasible(count, maxHeight)) {
    throw new Error(
      `Cannot build a BST with ${count} nodes and height <= ${maxHeight}.`
    );
  }
  const values = uniqueSortedValues(count, rand);
  return buildFromSorted(values, maxHeight, rand)!;
}

// ---- Layout --------------------------------------------------------------

const H_SPACING = 68; // horizontal gap between adjacent in-order nodes
const V_SPACING = 92; // vertical gap between depths
const PADDING = 56;
export const NODE_RADIUS = 24;

function heightOf(n: BSTNode | null): number {
  if (!n) return -1;
  return 1 + Math.max(heightOf(n.left), heightOf(n.right));
}

/** Assign screen coordinates + per-node stats and build the edge list. */
export function layoutTree(root: BSTNode | null): TreeLayout {
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  const byNode = new Map<BSTNode, LayoutNode>();
  const order: BSTNode[] = [];

  if (!root) {
    return { nodes, edges, width: PADDING * 2, height: PADDING * 2, treeHeight: -1 };
  }

  let inorderIndex = 0;
  let idCounter = 0;
  let maxDepth = 0;

  const walk = (n: BSTNode, depth: number, parentValue: number | null) => {
    if (n.left) walk(n.left, depth + 1, n.value);

    const hL = heightOf(n.left);
    const hR = heightOf(n.right);
    const ln: LayoutNode = {
      id: idCounter++,
      value: n.value,
      x: PADDING + NODE_RADIUS + inorderIndex * H_SPACING,
      y: PADDING + NODE_RADIUS + depth * V_SPACING,
      depth,
      parentValue,
      leftValue: n.left?.value ?? null,
      rightValue: n.right?.value ?? null,
      subtreeHeight: Math.max(hL, hR) + 1,
      balanceFactor: hL - hR,
      isLeaf: !n.left && !n.right,
    };
    inorderIndex++;
    maxDepth = Math.max(maxDepth, depth);
    byNode.set(n, ln);
    order.push(n);
    nodes.push(ln);

    if (n.right) walk(n.right, depth + 1, n.value);
  };

  walk(root, 0, null);

  for (const n of order) {
    const parent = byNode.get(n)!;
    if (n.left) {
      const child = byNode.get(n.left)!;
      edges.push({
        id: `${parent.id}-${child.id}`,
        from: parent,
        to: child,
        direction: "L",
        delta: child.value - parent.value,
      });
    }
    if (n.right) {
      const child = byNode.get(n.right)!;
      edges.push({
        id: `${parent.id}-${child.id}`,
        from: parent,
        to: child,
        direction: "R",
        delta: child.value - parent.value,
      });
    }
  }

  const width = PADDING * 2 + NODE_RADIUS * 2 + (inorderIndex - 1) * H_SPACING;
  const height = PADDING * 2 + NODE_RADIUS * 2 + maxDepth * V_SPACING;

  return { nodes, edges, width, height, treeHeight: maxDepth };
}
