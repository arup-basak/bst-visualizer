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

// Operation inputs (insert / remove / predecessor / successor take a value;
// select takes a rank k). Range checks that depend on the current tree (e.g.
// k ≤ node count) are done at the call site so messages can be specific.
export const opValueSchema = z.coerce
  .number({ message: "Enter a number" })
  .int("Whole number only")
  .min(0, "Must be ≥ 0")
  .max(9999, "Too large");

/** Parse an operation input string, returning the number or an error message. */
export function parseOpValue(raw: string): { value: number } | { error: string } {
  const parsed = opValueSchema.safeParse(raw);
  if (parsed.success) return { value: parsed.data };
  return { error: parsed.error.issues[0]?.message ?? "Invalid number" };
}
