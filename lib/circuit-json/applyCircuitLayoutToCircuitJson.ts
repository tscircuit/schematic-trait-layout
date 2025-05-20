import type { CircuitJson } from "circuit-json"
import type { CircuitBuilder } from "lib/builder"
import type { InputNetlist } from "lib/input-types"
import { cju } from "@tscircuit/circuit-json-util"
/**
 * Re-position/rotate schematic components in the circuit json to match the
 * layout of the circuit builder.
 */
export const applyCircuitLayoutToCircuitJson = (
  circuitJson: CircuitJson,
  circuitJsonNetlist: InputNetlist,
  layout: CircuitBuilder,
): CircuitJson => {
  // 1.  Work on a deep-clone so callers keep their original object intact
  let cj = structuredClone(circuitJson)

  // 2. Filter all schematic_traces (they won't properly connect after the moving)
  cj = cj.filter((c) => c.type !== "schematic_trace")

  // 3. Match up chips in the layout with the circuit json based on the netlist,
  // keeping in mind that the
  const cjComponentIdToLayoutChipId = new Map<string, string>()
  const layoutNetlist = layout.getNetlist()

  // 4. Set schematic_component.center to the layout's chip coordinates
  for (const schematicComponent of cju(cj).schematic_component.list()) {
    // TODO
    // schematicComponent.center = ...
  }

  // 5. Move the schematic_port to the new locations

  // 6. Change schematic_component.symbol_name for passives to match the
  // correct orientation. e.g. "boxresistor_down" -> "boxresistor_right"
  // The direction "up", "down", "left", "right" can be determined by the
  // relative position of pin1 and pin2, if pin1 is above pin2 the direction is
  // "down", if pin1 is to the left of pin2 the direction is "right"

  return cj
}
