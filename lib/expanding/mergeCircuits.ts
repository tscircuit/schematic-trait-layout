import type { CircuitBuilder } from "lib/builder"

export const mergeCircuits = (opts: {
  circuit1: CircuitBuilder
  circuit2: CircuitBuilder
  circuit1ChipId: string // Becomes the ID of the merged chip
  circuit2ChipId: string
}): CircuitBuilder => {}
