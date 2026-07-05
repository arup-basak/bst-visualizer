import { z } from "zod";
import { maxNodesFor } from "./bst";

// Caps keep the SVG readable and generation feasible.
export const MAX_NODES = 63;
export const MAX_HEIGHT = 10;

export const bstInputSchema = z
  .object({
    nodes: z.coerce
      .number({ message: "Enter a number" })
      .int("Must be a whole number")
      .min(1, "At least 1 node")
      .max(MAX_NODES, `At most ${MAX_NODES} nodes`),
    height: z.coerce
      .number({ message: "Enter a number" })
      .int("Must be a whole number")
      .min(0, "Height can't be negative")
      .max(MAX_HEIGHT, `At most ${MAX_HEIGHT}`),
  })
  .refine((v) => v.nodes <= maxNodesFor(v.height), {
    message:
      "Too many nodes for this height — a tree of this height holds at most 2^(height+1) − 1 nodes.",
    path: ["nodes"],
  });

export type BstInput = z.infer<typeof bstInputSchema>;
