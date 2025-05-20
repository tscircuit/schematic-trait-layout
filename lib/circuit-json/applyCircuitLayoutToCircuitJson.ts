import type {
  CircuitJson,
  SchematicNetLabel,
  SchematicPort,
  SchematicTrace,
  SourceTrace,
  SourceComponent,
  SourcePort,
  SourceNet,
  Point,
  SchematicTraceEdge,
} from "circuit-json"
import type { CircuitBuilder } from "lib/builder"
import type { InputNetlist } from "lib/input-types"
import { cju } from "@tscircuit/circuit-json-util"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"

// Helper to prepare maps for net name construction
// This logic is similar to parts of convertCircuitJsonToInputNetlist
export function prepareNetNameHelpers(circuitJson: CircuitJson): {
  sourcePortIdToPortInfo: Map<
    string,
    { boxId: string; pinNumber: number; portName: string }
  >
  tempSourceNetIdToBaseName: Map<string, string>
  allSchematicPorts: SchematicPort[]
  allSchematicTraces: SchematicTrace[]
  allSourceTraces: SourceTrace[]
} {
  const items = Array.isArray(circuitJson) ? circuitJson : []
  const cj = cju(circuitJson)

  const sourceComponentIdToBoxId = new Map<string, string>()
  for (const it of items) {
    if (it.type === "source_component") {
      const sc = it as SourceComponent
      sourceComponentIdToBoxId.set(
        sc.source_component_id,
        sc.name ?? sc.source_component_id,
      )
    }
  }

  const sourcePortIdToPortInfo = new Map<
    string,
    { boxId: string; pinNumber: number; portName: string }
  >()
  for (const it of items) {
    if (it.type === "source_port") {
      const sp = it as SourcePort
      const boxId = sourceComponentIdToBoxId.get(sp.source_component_id)
      if (!boxId || typeof sp.pin_number !== "number") continue
      sourcePortIdToPortInfo.set(sp.source_port_id, {
        boxId: boxId,
        pinNumber: sp.pin_number,
        portName: `${boxId}.${sp.pin_number}`,
      })
    }
  }

  const tempSourceNetIdToBaseName = new Map<string, string>()
  for (const it of items) {
    if (it.type === "source_net") {
      const sn = it as SourceNet
      tempSourceNetIdToBaseName.set(
        sn.source_net_id,
        sn.name ?? sn.source_net_id,
      )
    }
  }

  return {
    sourcePortIdToPortInfo,
    tempSourceNetIdToBaseName,
    allSchematicPorts: cj.schematic_port.list(),
    allSchematicTraces: cj.schematic_trace.list(),
    allSourceTraces: cj.source_trace.list(),
  }
}

// Helper: compare points with tolerance
const pointsEqual = (p1: Point, p2: Point, tol = 0.001): boolean =>
  Math.abs(p1.x - p2.x) < tol && Math.abs(p1.y - p2.y) < tol

// Helper: check if a point is an endpoint of any segment in a schematic trace's route
const isPointOnSchematicTraceRoute = (
  point: Point,
  schematicTrace: SchematicTrace,
): boolean => {
  if (!schematicTrace.route) return false
  // Assuming route is SchematicTraceEdge[] based on typical usage,
  // though spec in markdown is incomplete.
  for (const edge of schematicTrace.route as SchematicTraceEdge[]) {
    if (pointsEqual(point, edge.from) || pointsEqual(point, edge.to)) {
      return true
    }
  }
  return false
}

interface GetSchematicNetLabelNetNameParams {
  circuitJson: CircuitJson
  schematicNetLabelId: string
  sourcePortIdToPortInfo: Map<
    string,
    { boxId: string; pinNumber: number; portName: string }
  >
  tempSourceNetIdToBaseName: Map<string, string>
  allSchematicPorts: SchematicPort[]
  allSchematicTraces: SchematicTrace[]
  allSourceTraces: SourceTrace[]
}

/**
 * Calculates the composite net name for a given schematic_net_label.
 * The composite net name is formed by sorting and joining the names of all
 * connected ports and the base names of all connected source_nets.
 */
export function getSchematicNetLabelNetName({
  circuitJson,
  schematicNetLabelId,
  sourcePortIdToPortInfo,
  tempSourceNetIdToBaseName,
  allSchematicPorts,
  allSchematicTraces,
  allSourceTraces,
}: GetSchematicNetLabelNetNameParams): string | null {
  const cj = cju(circuitJson)
  const schLabel = cj.schematic_net_label.get(schematicNetLabelId)

  if (!schLabel) return null

  const labelAnchorPos = schLabel.anchor_position
  const labelSourceNetId = schLabel.source_net_id

  // Case 1: Label is part of a net with explicit traces
  const connectedSchematicTraces = allSchematicTraces.filter((st) =>
    isPointOnSchematicTraceRoute(labelAnchorPos, st),
  )

  for (const schemTrace of connectedSchematicTraces) {
    const schemTraceConnectedSourcePortIds = new Set<string>()
    const schemTraceConnectedSourceNetIds = new Set<string>()
    // Add the current label's source_net_id to the set for this trace
    schemTraceConnectedSourceNetIds.add(labelSourceNetId)

    const pointsInRoute = new Set<Point>()
    if (schemTrace.route) {
      for (const edge of schemTrace.route as SchematicTraceEdge[]) {
        pointsInRoute.add(edge.from)
        pointsInRoute.add(edge.to)
      }
    }

    for (const point of pointsInRoute) {
      for (const sp of allSchematicPorts) {
        if (pointsEqual(sp.center, point)) {
          schemTraceConnectedSourcePortIds.add(sp.source_port_id)
        }
      }
      for (const otherLabel of cj.schematic_net_label.list()) {
        if (
          otherLabel.schematic_net_label_id !== schematicNetLabelId &&
          pointsEqual(otherLabel.anchor_position, point)
        ) {
          schemTraceConnectedSourceNetIds.add(otherLabel.source_net_id)
        }
      }
    }

    for (const sourceTrace of allSourceTraces) {
      const stSourcePortIds = new Set(
        sourceTrace.connected_source_port_ids ?? [],
      )
      const stSourceNetIds = new Set(sourceTrace.connected_source_net_ids ?? [])

      const portsMatch =
        schemTraceConnectedSourcePortIds.size === stSourcePortIds.size &&
        [...schemTraceConnectedSourcePortIds].every((id) =>
          stSourcePortIds.has(id),
        )
      const netsMatch =
        schemTraceConnectedSourceNetIds.size === stSourceNetIds.size &&
        [...schemTraceConnectedSourceNetIds].every((id) =>
          stSourceNetIds.has(id),
        )

      if (portsMatch && netsMatch) {
        const names: string[] = []
        stSourcePortIds.forEach((pid) => {
          const portInfo = sourcePortIdToPortInfo.get(pid)
          if (portInfo) names.push(portInfo.portName)
        })
        stSourceNetIds.forEach((nid) => {
          names.push(tempSourceNetIdToBaseName.get(nid) ?? nid)
        })
        if (names.length > 0) {
          return names.sort().join(",")
        }
      }
    }
  }

  // Case 2: Label might be directly on a port (no intermediate schematic_trace)
  for (const sp of allSchematicPorts) {
    if (pointsEqual(sp.center, labelAnchorPos)) {
      // Label is on this port. Find source_trace connecting this port and label's net.
      const schemTraceConnectedSourcePortIds = new Set([sp.source_port_id])
      const schemTraceConnectedSourceNetIds = new Set([labelSourceNetId])

      for (const sourceTrace of allSourceTraces) {
        const stSourcePortIds = new Set(
          sourceTrace.connected_source_port_ids ?? [],
        )
        const stSourceNetIds = new Set(
          sourceTrace.connected_source_net_ids ?? [],
        )

        const portsMatch =
          schemTraceConnectedSourcePortIds.size === stSourcePortIds.size &&
          [...schemTraceConnectedSourcePortIds].every((id) =>
            stSourcePortIds.has(id),
          )
        const netsMatch =
          schemTraceConnectedSourceNetIds.size === stSourceNetIds.size &&
          [...schemTraceConnectedSourceNetIds].every((id) =>
            stSourceNetIds.has(id),
          )

        if (portsMatch && netsMatch) {
          const names: string[] = []
          stSourcePortIds.forEach((pid) => {
            const portInfo = sourcePortIdToPortInfo.get(pid)
            if (portInfo) names.push(portInfo.portName)
          })
          stSourceNetIds.forEach((nid) => {
            names.push(tempSourceNetIdToBaseName.get(nid) ?? nid)
          })
          if (names.length > 0) {
            return names.sort().join(",")
          }
        }
      }
    }
  }

  // Case 3: Label represents a source_net that is not connected to any ports (e.g., a lone GND symbol)
  const baseName = tempSourceNetIdToBaseName.get(labelSourceNetId)
  if (baseName) {
    for (const sourceTrace of allSourceTraces) {
      if (
        sourceTrace.connected_source_net_ids?.includes(labelSourceNetId) &&
        (sourceTrace.connected_source_port_ids?.length ?? 0) === 0 &&
        (sourceTrace.connected_source_net_ids?.length ?? 0) === 1
      ) {
        return baseName // Composite name is just the base name
      }
    }
  }

  return null // Unable to determine composite net name
}
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

  // HACK: Add schematic_net_label_id since core doesn't add it currently
  let schLabelIdCounter = 0
  for (const schLabel of cju(cj).schematic_net_label.list()) {
    schLabel.schematic_net_label_id ??= `schematic_net_label_${schLabelIdCounter++}`
  }

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

    let cjChipWidth = layoutChip.getWidth() - 2
    let cjChipHeight = layoutChip.getHeight() - 2

    if (layoutChip.isPassive) {
      cjChipWidth = 1
      cjChipHeight = 1
    }

    schematicComponent.center = {
      x: layoutChip.x + layoutChip.getWidth() / 2,
      y: layoutChip.y + layoutChip.getHeight() / 2,
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
        y: layoutY + 0.5,
      }
    }

    // TODO Change schematic_component.symbol_name for passives to match the
    // correct orientation. e.g. "boxresistor_down" -> "boxresistor_right"
    // The direction "up", "down", "left", "right" can be determined by the
    // relative position of pin1 and pin2, if pin1 is above pin2 the direction is
    // "down", if pin1 is to the left of pin2 the direction is "right"
  }

  const netIndexToLayoutNetId = new Map<number, string>()
  for (const [netId, netIndex] of Object.entries(
    layoutNorm.transform.netIdToNetIndex,
  )) {
    netIndexToLayoutNetId.set(netIndex, netId)
  }

  console.log({
    "layoutNorm.transform": layoutNorm.transform,
    "cjNorm.transform": cjNorm.transform,
  })

  console.log({ netIndexToLayoutNetId })

  const netNameHelpers = prepareNetNameHelpers(cj)

  /* ------------------------------------------------------------------ *
   *  Re-position schematic_net_label items to the coordinates of the
   *  corresponding CircuitBuilder.netLabels (layout).
   *  A match is made via the visible text (e.g. "GND", "L1", …).
   * ------------------------------------------------------------------ */
  for (const schLabel of cju(cj).schematic_net_label.list()) {
    const netLabelId = getSchematicNetLabelNetName({
      circuitJson: cj,
      schematicNetLabelId: schLabel.schematic_net_label_id,
      ...netNameHelpers,
    })
    console.table({ netLabelId })
    const sourceNet = cju(cj).source_net.get(schLabel.source_net_id)!
    const netIndex = cjNorm.transform.netIdToNetIndex[sourceNet.name]!
    const layoutNetId = netIndexToLayoutNetId.get(netIndex)!

    const layoutLabel = layout.netLabels.find(
      (nl) => nl.labelId === layoutNetId,
    )
    console.log({ layoutLabel })
    if (!layoutLabel) continue // no matching label in layout

    // move both the visual centre and the anchor-point
    schLabel.center = { x: layoutLabel.x, y: layoutLabel.y }
    schLabel.anchor_position = { x: layoutLabel.x, y: layoutLabel.y }
    schLabel.anchor_side = layoutLabel.anchorSide
    // keep existing anchor_side / other props untouched
  }

  // Filter all schematic_traces (they won't properly connect after the moving)
  cj = cj.filter((c) => c.type !== "schematic_trace")

  return cj
}
