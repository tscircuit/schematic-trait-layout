import type { CircuitJson } from "circuit-json"
import type { InputNetlist, Box, Connection, Net, Side } from "lib/input-types"

/**
 * Converts a tscircuit `CircuitJson` object (array-of-records) into the very
 * small `InputNetlist` structure used by the scoring / ASCII rendering code.
 *
 * The algorithm is intentionally defensive: if we cannot confidently discover
 * a pin’s *side* we fall back to counting it as a **left** pin so that the
 * total-pin count for the box is still correct (this is good enough for every
 * current compatibility check).
 */
export const convertCircuitJsonToInputNetlist = (
  circuitJson: CircuitJson,
): InputNetlist => {
  const items = Array.isArray(circuitJson) ? circuitJson : []

  /* ------------------------------------------------------------------ *
   * 1.  Build look-up tables                                            *
   * ------------------------------------------------------------------ */
  const sourceComponentIdToBox: Map<string, Box> = new Map()
  const schematicIdToSourceId: Map<string, string> = new Map()

  /* a.  Source components → Boxes (initially with zero pin counts) */
  for (const it of items) {
    if (it.type !== "source_component") continue
    const name: string = (it as any).name ?? (it as any).source_component_id
    sourceComponentIdToBox.set((it as any).source_component_id, {
      boxId: name,
      leftPinCount: 0,
      rightPinCount: 0,
      topPinCount: 0,
      bottomPinCount: 0,
    })
  }

  /* b.  Map schematic_component_id → source_component_id                */
  for (const it of items) {
    if (it.type !== "schematic_component") continue
    schematicIdToSourceId.set(
      (it as any).schematic_component_id,
      (it as any).source_component_id,
    )
  }

  /* ------------------------------------------------------------------ *
   * 2.  Count pins per side for every box                               *
   * ------------------------------------------------------------------ */
  const bump = (box: Box, side: Side) => {
    if (side === "left") box.leftPinCount++
    else if (side === "right") box.rightPinCount++
    else if (side === "top") box.topPinCount++
    else if (side === "bottom") box.bottomPinCount++
  }

  /* a.  Prefer schematic_port.facing_direction (derive side)           */
  for (const it of items) {
    if (it.type !== "schematic_port") continue
    const facing: string | undefined = (it as any).facing_direction
    let side: Side | undefined
    switch (facing) {
      case "left":
      case "right":
      case "top":
      case "bottom":
        side = facing as Side
        break
      case "up":
        side = "top"
        break
      case "down":
        side = "bottom"
        break
      // any other value ⇒ leave `side` undefined so fallback logic applies
    }
    const scheId: string = (it as any).schematic_component_id
    const srcId = schematicIdToSourceId.get(scheId)
    if (!srcId) continue
    const box = sourceComponentIdToBox.get(srcId)
    if (!box) continue

    if (side) {
      bump(box, side)
    } else {
      /* Fall-back: try port hints (e.g. “left”, “right” etc.)           */
      const hints: string[] | undefined = (it as any).port_hints
      const guessedSide = hints?.find((h) =>
        ["left", "right", "top", "bottom"].includes(h),
      ) as Side | undefined
      bump(box, guessedSide ?? "left")
    }
  }

  /* ------------------------------------------------------------------ *
   * 3.  Build helper maps for port identification and net base names    *
   * ------------------------------------------------------------------ */
  const sourcePortIdToPortInfo = new Map<
    string,
    { boxId: string; pinNumber: number; portName: string }
  >()
  for (const it of items) {
    if (it.type !== "source_port") continue
    const srcCompId: string = (it as any).source_component_id
    const box = sourceComponentIdToBox.get(srcCompId)
    if (!box) continue // Should not happen in well-formed data
    const pinNumber = (it as any).pin_number
    if (typeof pinNumber !== "number") continue // Should have a pin number

    sourcePortIdToPortInfo.set((it as any).source_port_id, {
      boxId: box.boxId,
      pinNumber: pinNumber,
      portName: `${box.boxId}.${pinNumber}`,
    })
  }

  const tempSourceNetIdToBaseName = new Map<string, string>()
  for (const it of items) {
    if (it.type !== "source_net") continue
    const name: string = (it as any).name ?? (it as any).source_net_id
    tempSourceNetIdToBaseName.set((it as any).source_net_id, name)
  }

  /* ------------------------------------------------------------------ *
   * 4.  Process traces to form connections and composite net IDs        *
   * ------------------------------------------------------------------ */
  const finalNets: Net[] = []
  const finalConnections: Connection[] = []
  const finalNetIdSet = new Set<string>() // To track unique compositeNetIds

  for (const it of items) {
    if (it.type !== "source_trace") continue

    const tracePortObjectsForConnection: Array<{
      boxId: string
      pinNumber: number
    }> = []
    const namesForCompositeNetId: string[] = []
    const sourceNetIdsInTrace: string[] =
      (it as any).connected_source_net_ids ?? []

    for (const pid of (it as any).connected_source_port_ids ?? []) {
      const portInfo = sourcePortIdToPortInfo.get(pid)
      if (portInfo) {
        tracePortObjectsForConnection.push({
          boxId: portInfo.boxId,
          pinNumber: portInfo.pinNumber,
        })
        namesForCompositeNetId.push(portInfo.portName)
      }
    }

    for (const nid of sourceNetIdsInTrace) {
      const baseName = tempSourceNetIdToBaseName.get(nid) ?? nid
      namesForCompositeNetId.push(baseName)
    }

    const numEffectivePoints =
      tracePortObjectsForConnection.length +
      (sourceNetIdsInTrace.length > 0 ? 1 : 0)
    if (numEffectivePoints < 2) {
      continue
    }

    const connectionPortsEntry: Connection["connectedPorts"] = [
      ...tracePortObjectsForConnection,
    ]

    if (sourceNetIdsInTrace.length > 0) {
      namesForCompositeNetId.sort()
      const compositeNetId = namesForCompositeNetId.join(",")

      connectionPortsEntry.push({ netId: compositeNetId })

      if (!finalNetIdSet.has(compositeNetId)) {
        finalNets.push({ netId: compositeNetId })
        finalNetIdSet.add(compositeNetId)
      }
    }

    finalConnections.push({ connectedPorts: connectionPortsEntry })
  }

  /* ------------------------------------------------------------------ *
   * 5.  Return the InputNetlist                                         *
   * ------------------------------------------------------------------ */
  return {
    boxes: Array.from(sourceComponentIdToBox.values()),
    nets: finalNets,
    connections: finalConnections,
  }
}
