// Pure Binary Search Tree operations — data in, data out (no React / DOM).
// Insert / remove return a *new* root (structural sharing) so React state
// updates stay immutable; queries return the value plus the path walked so the
// UI can highlight it.

import type { BSTNode } from "./bst";

export type TraversalOrder = "inorder" | "preorder" | "postorder";

function leaf(value: number): BSTNode {
  return { value, left: null, right: null };
}

/** Whether `value` exists anywhere in the tree. */
export function contains(root: BSTNode | null, value: number): boolean {
  let cur = root;
  while (cur) {
    if (value === cur.value) return true;
    cur = value < cur.value ? cur.left : cur.right;
  }
  return false;
}

/** Values visited while searching for `value`, from the root down. */
export function searchPath(root: BSTNode | null, value: number): number[] {
  const path: number[] = [];
  let cur = root;
  while (cur) {
    path.push(cur.value);
    if (value === cur.value) break;
    cur = value < cur.value ? cur.left : cur.right;
  }
  return path;
}

/** Insert `value`, returning the new root. A duplicate value is a no-op. */
export function insert(root: BSTNode | null, value: number): BSTNode {
  if (!root) return leaf(value);
  if (value === root.value) return root;
  if (value < root.value) return { ...root, left: insert(root.left, value) };
  return { ...root, right: insert(root.right, value) };
}

/** Remove `value`, returning the new root (or null if the tree becomes empty). */
export function remove(root: BSTNode | null, value: number): BSTNode | null {
  if (!root) return null;
  if (value < root.value) return { ...root, left: remove(root.left, value) };
  if (value > root.value) return { ...root, right: remove(root.right, value) };

  // Found the node to delete.
  if (!root.left) return root.right;
  if (!root.right) return root.left;

  // Two children: replace with the in-order successor (min of right subtree),
  // then delete that successor from the right subtree.
  let succ = root.right;
  while (succ.left) succ = succ.left;
  return { ...root, value: succ.value, right: remove(root.right, succ.value) };
}

/** Node count of the subtree rooted at `n` (including `n`). */
function size(n: BSTNode | null): number {
  return n ? 1 + size(n.left) + size(n.right) : 0;
}

/**
 * The k-th smallest value (1-indexed) using subtree sizes to decide, at each
 * node, whether the answer lies in the left subtree, is the node itself, or is
 * in the right subtree — an O(height) walk rather than a full in-order scan.
 */
export function kthSmallest(
  root: BSTNode | null,
  k: number
): { value: number | null; path: number[] } {
  const path: number[] = [];
  let cur = root;
  let rank = k;
  while (cur) {
    path.push(cur.value);
    const leftSize = size(cur.left);
    if (rank === leftSize + 1) return { value: cur.value, path };
    if (rank <= leftSize) {
      cur = cur.left;
    } else {
      rank -= leftSize + 1;
      cur = cur.right;
    }
  }
  return { value: null, path };
}

/** Values in the requested traversal order. */
export function traverse(root: BSTNode | null, order: TraversalOrder): number[] {
  const out: number[] = [];
  const visit = (n: BSTNode | null) => {
    if (!n) return;
    if (order === "preorder") out.push(n.value);
    visit(n.left);
    if (order === "inorder") out.push(n.value);
    visit(n.right);
    if (order === "postorder") out.push(n.value);
  };
  visit(root);
  return out;
}

/**
 * In-order predecessor of `value`: the largest value strictly smaller than it
 * (works whether or not `value` is present). Null if none exists.
 */
export function predecessor(root: BSTNode | null, value: number): number | null {
  let cur = root;
  let best: number | null = null;
  while (cur) {
    if (value > cur.value) {
      best = cur.value;
      cur = cur.right;
    } else {
      cur = cur.left;
    }
  }
  return best;
}

/**
 * In-order successor of `value`: the smallest value strictly larger than it
 * (works whether or not `value` is present). Null if none exists.
 */
export function successor(root: BSTNode | null, value: number): number | null {
  let cur = root;
  let best: number | null = null;
  while (cur) {
    if (value < cur.value) {
      best = cur.value;
      cur = cur.left;
    } else {
      cur = cur.right;
    }
  }
  return best;
}
