import type { CircuitJson } from "circuit-json"
import type { CircuitBuilder } from "lib/builder"

export const applyCircuitLayoutToCircuitJson = (
  circuitJson: CircuitJson,
  layout: CircuitBuilder,
): CircuitJson => {
  // TODO Modify the circuit json to have chip coordinates from the layout
}
