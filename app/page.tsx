import type { Metadata } from "next";

import { AnimatedThemeToggler } from "../components/animated-theme-toggler";
import { BstVisualizer } from "../components/bst/bst-visualizer";

export const metadata: Metadata = {
  title: "BST Visualizer",
  description:
    "Generate and explore a random binary search tree — set the node count and max height, then hover nodes and edges to inspect their properties.",
};

export default function BstPage() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            BST Visualizer
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Choose a number of nodes and a maximum height, then generate a
            random binary search tree. Hover any node or edge to inspect its
            properties.
          </p>
        </div>
        <AnimatedThemeToggler
          aria-label="Toggle dark mode"
          className="border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex size-10 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none [&_svg]:size-5"
        />
      </header>
      <BstVisualizer />
    </main>
  );
}
