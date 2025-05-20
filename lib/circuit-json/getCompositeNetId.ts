import { cju } from "@tscircuit/circuit-json-util"
import type { CircuitJson, SchematicNetLabel } from "circuit-json"

/**
 * Returns a composite net id for a schematic net label.
 *
 * A composite net id is a net id with all the connection names (source net
 * names or chip pin names inside of it)
 *
 * Examples of composite net ids:
 * - GND,U1.1
 * - VDD,U1.4,R1.1
 */
export const getCompositeNetId = (
  circuitJson: CircuitJson,
  schNetLabel: SchematicNetLabel,
) => {
  // TODO
}
