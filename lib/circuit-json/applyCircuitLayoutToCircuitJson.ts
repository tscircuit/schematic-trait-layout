import type {
  CircuitJson,
  SchematicNetLabel,
  SchematicPort,
  SchematicTrace,
  SourceTrace,
  SourcePort,
  SourceNet,
  Point,
  SchematicTraceEdge,
} from "circuit-json"
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
  // Work on a deep-clone so callers keep their original object intact
  let cj = structuredClone(circuitJson)

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

    let cjChipWidth = layoutChip.getWidth() - 0.8
    let cjChipHeight = layoutChip.getHeight() - 2

    if (layoutChip.isPassive) {
      cjChipWidth = 1
      cjChipHeight = 1
    }

    schematicComponent.center = {
      x: layoutChip.x + layoutChip.getWidth() / 2,
      y: layoutChip.y + layoutChip.getHeight() / 2 - 0.5,
    }
    schematicComponent.size = {
      width: cjChipWidth,
      height: cjChipHeight,
    }

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

  // const netIndexToLayoutNetId = new Map<number, string>()
  // for (const [netId, netIndex] of Object.entries(
  //   layoutNorm.transform.netIdToNetIndex,
  // )) {
  //   netIndexToLayoutNetId.set(netIndex, netId)
  // }

  const netIndexToCompositeNetId = new Map<number, string>()
  for (const [netId, netIndex] of Object.entries(
    cjNorm.transform.netIdToNetIndex,
  )) {
    netIndexToCompositeNetId.set(netIndex, netId)
  }

  // Filter all existing schematic_net_label items
  cj = cj.filter((elm) => elm.type !== "schematic_net_label")

  // Create new schematic_net_label items from layout.netLabels
  const newSchematicNetLabels: SchematicNetLabel[] = []
  for (const layoutLabel of layout.netLabels) {
    const netIndex = layoutNorm.transform.netIdToNetIndex[layoutLabel.labelId]
    const compositeNetId = netIndexToCompositeNetId.get(netIndex)!
    const newLabel: SchematicNetLabel = {
      type: "schematic_net_label",
      schematic_net_label_id: compositeNetId,
      source_net_id: layoutLabel.labelId, // Assumes layoutLabel.labelId is the source_net identifier
      text:
        compositeNetId.split(",").find((n) => !n.includes(".")) ??
        compositeNetId, // The text to be displayed
      center: { x: layoutLabel.x, y: layoutLabel.y },
      anchor_position: { x: layoutLabel.x, y: layoutLabel.y }, // Typically same as center for labels
      anchor_side: layoutLabel.anchorSide,
    }
    newSchematicNetLabels.push(newLabel)
  }

  // Add all newly created labels to the circuitJson array
  if (newSchematicNetLabels.length > 0) {
    cj.push(...newSchematicNetLabels)
  }

  // Create schematic_trace for each layout.lines
  const newSchematicTraces: SchematicTrace[] = []
  for (const layoutLine of layout.lines) {
    const newSchematicTrace: SchematicTrace = {
      type: "schematic_trace",
      edges: [
        {
          from: {
            x: layoutLine.start.x,
            y: layoutLine.start.y,
          },
          to: {
            x: layoutLine.end.x,
            y: layoutLine.end.y,
          },
        },
      ],
      schematic_trace_id: "asd",
      source_trace_id: "asd",
      junctions: [],
    }
    newSchematicTraces.push(newSchematicTrace)
  }

  cj = cj.filter((c) => c.type !== "schematic_trace")
  cj.push(...newSchematicTraces)

  // Filter all schematic_traces (they won't properly connect after the moving)
  cj = cj.filter((c) => c.type !== "schematic_text")

  return cj
}
