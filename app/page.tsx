import type { Metadata } from "next";

import { BstVisualizer } from "../components/bst/bst-visualizer";

export const metadata: Metadata = {
  title: "BST Visualizer",
  description:
    "Generate and explore a random binary search tree — set the node count and max height, then hover nodes and edges to inspect their properties.",
};

export default function BstPage() {
  return (
    <main className="mx-auto w-full flex-1 px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          BST Visualizer
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Choose a number of nodes and a maximum height, then generate a random
          binary search tree. Hover any node or edge to inspect its properties.
        </p>
      </header>
      <BstVisualizer />
    </main>
  );
}
