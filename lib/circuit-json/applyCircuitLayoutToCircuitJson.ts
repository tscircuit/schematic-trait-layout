import type { CircuitJson } from "circuit-json"
import type { CircuitBuilder } from "lib/builder"
import type { InputNetlist } from "lib/input-types"
import { cju } from "@tscircuit/circuit-json-util"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"
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

  const layoutNetlist = layout.getNetlist()
  const layoutNorm = normalizeNetlist(layoutNetlist)
  const cjNorm = normalizeNetlist(circuitJsonNetlist)

  const layoutBoxIndexToBoxId = new Map<number, string>()
  for (const [boxId, boxIndex] of Object.entries(
    layoutNorm.transform.boxIdToBoxIndex,
  )) {
    layoutBoxIndexToBoxId.set(boxIndex, boxId)
  }

  for (const schematicComponent of cju(cj).schematic_component.list()) {
    const sourceComponent = cju(cj).source_component.get(
      schematicComponent.source_component_id,
    )!
    const schematicPorts = cju(cj).schematic_port.list({
      schematic_component_id: schematicComponent.schematic_component_id,
    })
    // Find the schematic box index
    const boxIndex = cjNorm.transform.boxIdToBoxIndex[sourceComponent.name]!

    // Find the layout boxId
    const layoutBoxId = layoutBoxIndexToBoxId.get(boxIndex)!

    const layoutChip = layout.chips.find((c) => c.chipId === layoutBoxId)!
    console.log(layoutChip.chipId)

    schematicComponent.center = {
      x: layoutChip.x + layoutChip.getWidth() / 2,
      y: layoutChip.y + layoutChip.getHeight() / 2,
    }

    console.table(
      schematicPorts.map((p) => {
        const layoutPort = layoutChip.pin(p.pin_number!)
        return {
          name: sourceComponent.name,
          layoutChipId: layoutChip.chipId,
          pin_number: p.pin_number,
          og_x: p.center.x.toFixed(1),
          og_y: p.center.y.toFixed(1),
          layout_x: layoutPort.x.toFixed(1),
          layout_y: layoutPort.y.toFixed(1),
        }
      }),
    )

    for (const schematicPort of schematicPorts) {
      const { pin_number } = schematicPort
      // Use getPinLocation to get the static position of the pin,
      // as layoutChip.pin(pin_number!).x/y might have been modified by fluent calls.
      const { x: layoutX, y: layoutY } = layoutChip.getPinLocation(pin_number!)
      schematicPort.center = {
        x: layoutX,
        y: layoutY,
      }
    }

    // TODO Change schematic_component.symbol_name for passives to match the
    // correct orientation. e.g. "boxresistor_down" -> "boxresistor_right"
    // The direction "up", "down", "left", "right" can be determined by the
    // relative position of pin1 and pin2, if pin1 is above pin2 the direction is
    // "down", if pin1 is to the left of pin2 the direction is "right"
  }

  return cj
}
