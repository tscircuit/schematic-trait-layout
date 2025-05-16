import type { InputNetlist } from "lib/input-types"
import type { NormalizedNetlist } from "./types"

interface NormalizationTransform {
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

  // Sort boxes by boxId to ensure deterministic boxIndex assignment
  const sortedBoxes = [...netlist.boxes].sort((a, b) =>
    a.boxId.localeCompare(b.boxId),
  )
  sortedBoxes.forEach((box, index) => {
    transform.boxIdToBoxIndex[box.boxId] = index
  })

  const normalizedBoxes: NormalizedNetlist["boxes"] = sortedBoxes.map(
    (box) => ({
      boxIndex: transform.boxIdToBoxIndex[box.boxId]!,
      leftPinCount: box.leftPinCount,
      rightPinCount: box.rightPinCount,
      topPinCount: box.topPinCount,
      bottomPinCount: box.bottomPinCount,
    }),
  )

  // Sort nets by netId to ensure deterministic netIndex assignment
  const sortedNets = [...netlist.nets].sort((a, b) =>
    a.netId.localeCompare(b.netId),
  )
  sortedNets.forEach((net, index) => {
    transform.netIdToNetIndex[net.netId] = index
  })

  const normalizedNets: NormalizedNetlist["nets"] = sortedNets.map((net) => ({
    netIndex: transform.netIdToNetIndex[net.netId]!,
  }))

  const normalizedConnections: NormalizedNetlist["connections"] =
    netlist.connections.map((connection) => {
      const connectedPorts = connection.connectedPorts
        .map((port) => {
          if ("boxId" in port) {
            return {
              boxIndex: transform.boxIdToBoxIndex[port.boxId],
              pinNumber: port.pinNumber,
            }
          }
          return { netIndex: transform.netIdToNetIndex[port.netId] }
        })
        .sort((a, b) => {
          const aIsBox = "boxIndex" in a
          const bIsBox = "boxIndex" in b

          if (aIsBox && !bIsBox) return -1 // boxes first
          if (!aIsBox && bIsBox) return 1 // then nets

          if (aIsBox && bIsBox) {
            // Both are boxes, sort by boxIndex then pinNumber
            if (a.boxIndex !== b.boxIndex) {
              return a.boxIndex! - b.boxIndex!
            }
            return a.pinNumber! - b.pinNumber!
          }
          // Both are nets, sort by netIndex
          // Type assertion needed as TS doesn't automatically infer both are NetPorts here
          return (
            (a as { netIndex: number }).netIndex -
            (b as { netIndex: number }).netIndex
          )
        })
      return { connectedPorts }
    })

  // Sort connections for canonical representation
  // Create a string representation for each connection's sorted ports for stable sorting
  normalizedConnections.sort((a, b) => {
    const aStr = a.connectedPorts
      .map((p) =>
        "boxIndex" in p ? `b${p.boxIndex}p${p.pinNumber}` : `n${p.netIndex}`,
      )
      .join(",")
    const bStr = b.connectedPorts
      .map((p) =>
        "boxIndex" in p ? `b${p.boxIndex}p${p.pinNumber}` : `n${p.netIndex}`,
      )
      .join(",")
    return aStr.localeCompare(bStr)
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
