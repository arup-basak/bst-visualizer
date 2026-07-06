# BST Visualizer

An interactive playground for **binary search trees**. Generate a random tree, then explore and manipulate it — insert and remove values, find the k‑th smallest, walk it in different orders, and locate a value's neighbours — all with smooth, purposeful animation so you can *see* the algorithm work, not just read about it.

## The idea

Binary search trees are one of the first data structures where behaviour matters more than definition: the same set of values can produce many different shapes, and each operation follows a path down the tree. This app makes that concrete.

You start with a random tree of a chosen size and height. From there, every operation is visual:

- **Structural edits** (insert / remove) change the tree, and only the affected node animates — it grows in or shrinks out while its neighbours glide to make room. The rest of the tree stays put, so your eye follows the actual change instead of a full redraw.
- **Queries** (select, traverse, predecessor, successor) don't change the tree; they light up the nodes and edges they visit, so the search path or traversal order is visible directly on the drawing.

The goal is a tool that's equally useful for learning ("what does removing a node with two children actually do?") and for demonstrating ("here's an in‑order traversal, step by step").

## Features

### Generate & reset
- Choose a **node count** and a **maximum height**; the app builds a random, valid BST that respects both. Inputs are validated, with clear messages when a combination is impossible (too many nodes for the height).
- A live stat card shows the current **node count** and **tree height**.
- **Reset** clears the canvas back to a clean starting state.

### Tree operations (the Operations menu)
A compact menu bar sits on the canvas. Toggle it open to reveal the operations; picking one slides out a small input panel with a short explanation and a result read‑out.

| Operation | What it does |
|-----------|--------------|
| **Insert** | Adds a value in its correct position, highlighting the search path down to where it lands. Duplicates are rejected. |
| **Remove** | Deletes a value, correctly handling leaf, single‑child, and two‑child cases (the two‑child case is replaced by its in‑order successor). |
| **Select** | Finds the **k‑th smallest** value, using subtree sizes to descend directly to the answer rather than scanning the whole tree. |
| **Traverse** | Walks the tree from the root in **in‑order**, **pre‑order**, or **post‑order**, revealing one node at a time and printing the full sequence. |
| **Predecessor** | Finds the largest value **smaller** than a given one (its in‑order predecessor). |
| **Successor** | Finds the smallest value **larger** than a given one (its in‑order successor). |

Every operation reports back in plain language — the result value, the ordered sequence, or why it couldn't run (empty tree, value not found, k out of range).

### Keyboard control
The whole Operations menu is keyboard‑driven, so you can work without reaching for the mouse:

| Key | Action |
|-----|--------|
| `b` | Toggle the operations bar |
| `i` | Insert |
| `r` | Remove |
| `k` | Select (k‑th smallest) |
| `t` | Traverse |
| `p` | Predecessor |
| `s` | Successor |
| `Enter` | Run the current operation |
| `Esc` | Close the panel |

Shortcuts stay out of your way while you're typing in a field, and `Esc` always closes the panel.

### Inspecting the tree
- **Hover** any node to see its value, depth, subtree size, subtree height, balance factor, and its parent and children. Hover any edge to see what it connects, its direction, and the value difference across it.
- **Drag** nodes to rearrange the layout by hand; a node you've moved keeps its position across inserts and removes.
- **Zoom** in and out, and scroll/trackpad to pan around large trees.
- Light and dark themes, with an animated theme toggle.

## How to run

This project uses **bun**.

- Install dependencies: `bun install`
- Start the dev server: `bun run dev`
- Open the app at the printed local URL.

## Notes

- The tree is generated on the client after load, so the same node count and height can produce different shapes each time.
- Trees are capped in size and height to keep the drawing readable and generation feasible.
