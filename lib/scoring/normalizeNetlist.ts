import type { InputNetlist } from "lib/input-types"
import type { NormalizedNetlist } from "./types"
import { buildEncounterMapFromNetlist } from "./buildEncounterMapFromNetlist"

export interface NormalizationTransform {
  boxIdToBoxIndex: Record<string, number>
  netIdToNetIndex: Record<string, number>
}

/**
 * A normalized netlist allows netlists to be compared for similarity,
 * superficial differences from ids are removed and items are sorted so that
 * two functionally identical netlists will have the same normalized representation
 */
export const normalizeNetlist = (
  netlist: InputNetlist,
): {
  normalizedNetlist: NormalizedNetlist
  transform: NormalizationTransform
} => {
  const transform: NormalizationTransform = {
    boxIdToBoxIndex: {},
    netIdToNetIndex: {},
  }

  /* ---------- box ordering via DFS ---------- */
  const encounterMap = buildEncounterMapFromNetlist(netlist)

  const finalSortedBoxIds = netlist.boxes
    .map((b) => b.boxId)
    .sort((a, b) => {
      const ai = encounterMap[a] ?? Number.MAX_SAFE_INTEGER
      const bi = encounterMap[b] ?? Number.MAX_SAFE_INTEGER
      return ai !== bi ? ai - bi : a.localeCompare(b)
    })
  // ───────── populate transforms ─────────
  finalSortedBoxIds.forEach((id, idx) => {
    transform.boxIdToBoxIndex[id] = idx
  })

  const normalizedBoxes: NormalizedNetlist["boxes"] = finalSortedBoxIds.map(
    (id) => {
      const box = netlist.boxes.find((b) => b.boxId === id)!
      return {
        boxIndex: transform.boxIdToBoxIndex[id]!,
        leftPinCount: box.leftPinCount,
        rightPinCount: box.rightPinCount,
        topPinCount: box.topPinCount,
        bottomPinCount: box.bottomPinCount,
      }
    },
  )

  /* ---------- nets (unchanged) ---------- */
  const finalSortedNetIds = netlist.nets
    .map((n) => n.netId)
    .sort((a, b) => encounterMap[a]! - encounterMap[b]!)
  finalSortedNetIds.forEach(
    (nid, idx) => (transform.netIdToNetIndex[nid] = idx),
  )

  const normalizedNets: NormalizedNetlist["nets"] = finalSortedNetIds.map(
    (nid) => ({
      netIndex: transform.netIdToNetIndex[nid]!,
    }),
  )

  /* ---------- connections (unchanged) ---------- */
  const normalizedConnections: NormalizedNetlist["connections"] =
    netlist.connections.map((c) => {
      const connectedPorts = c.connectedPorts
        .map((p) => {
          if ("boxId" in p) {
            return {
              boxIndex: transform.boxIdToBoxIndex[p.boxId]!,
              pinNumber: p.pinNumber,
            }
          }
          return { netIndex: transform.netIdToNetIndex[p.netId]! }
        })
        .sort((a, b) => {
          const aIsBox = "boxIndex" in a
          const bIsBox = "boxIndex" in b
          if (aIsBox && !bIsBox) return -1
          if (!aIsBox && bIsBox) return 1
          if (aIsBox && bIsBox) {
            if (a.boxIndex !== b.boxIndex) return a.boxIndex! - b.boxIndex!
            return a.pinNumber! - b.pinNumber!
          }
          return (
            (a as { netIndex: number }).netIndex -
            (b as { netIndex: number }).netIndex
          )
        })
      return { connectedPorts }
    })

  // Ensure deterministic ordering of connections
  normalizedConnections.sort((a, b) => {
    const sig = (x: typeof a) =>
      x.connectedPorts
        .map((p) =>
          "boxIndex" in p ? `b${p.boxIndex}p${p.pinNumber}` : `n${p.netIndex}`,
        )
        .join(",")
    return sig(a).localeCompare(sig(b))
  })

  return {
    normalizedNetlist: {
      boxes: normalizedBoxes,
      nets: normalizedNets,
      connections: normalizedConnections,
    },
    transform,
  }
}
