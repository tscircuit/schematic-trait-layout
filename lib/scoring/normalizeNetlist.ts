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

  const mainChipId = "chip0"; // Assumed convention for the main chip
  const orderedBoxIds: string[] = [];
  const orderedNetIds: string[] = [];

  // Precompute sets of existing IDs for efficient lookups
  const existingBoxIds = new Set(netlist.boxes.map(b => b.boxId));
  const existingNetIds = new Set(netlist.nets.map(n => n.netId));

  // Check if the main chip exists in the provided netlist boxes
  if (existingBoxIds.has(mainChipId)) {
    orderedBoxIds.push(mainChipId);

    let maxPinNumber = 0;
    // Determine the highest pin number used by the main chip in connections
    for (const connection of netlist.connections) {
      for (const port of connection.connectedPorts) {
        if ("boxId" in port && port.boxId === mainChipId) {
          maxPinNumber = Math.max(maxPinNumber, port.pinNumber);
        }
      }
    }

    // Iterate through main chip pins by number to establish order
    for (let pinNum = 1; pinNum <= maxPinNumber; pinNum++) {
      for (const connection of netlist.connections) {
        // Check if this connection involves the current main chip pin
        const mainChipPinInConnection = connection.connectedPorts.find(
          p => "boxId" in p && p.boxId === mainChipId && p.pinNumber === pinNum
        );

        if (mainChipPinInConnection) {
          // If so, process all ports in this connection
          for (const port of connection.connectedPorts) {
            if ("boxId" in port) {
              // If it's a box port and not the main chip itself
              if (port.boxId !== mainChipId && !orderedBoxIds.includes(port.boxId)) {
                // Add to ordered list if it's an existing box
                if (existingBoxIds.has(port.boxId)) {
                  orderedBoxIds.push(port.boxId);
                }
              }
            } else { // It's a net port
              if (!orderedNetIds.includes(port.netId)) {
                // Add to ordered list if it's an existing net
                if (existingNetIds.has(port.netId)) {
                  orderedNetIds.push(port.netId);
                }
              }
            }
          }
        }
      }
    }
  }

  // Add any remaining boxes not found through main chip pin iteration, sorted by ID
  const remainingBoxIds = Array.from(existingBoxIds)
    .filter(id => !orderedBoxIds.includes(id))
    .sort((a, b) => a.localeCompare(b));
  const finalSortedBoxIds = [...orderedBoxIds, ...remainingBoxIds];

  // Populate boxIdToBoxIndex transform and create the sortedBoxes array
  finalSortedBoxIds.forEach((boxId, index) => {
    transform.boxIdToBoxIndex[boxId] = index;
  });
  const sortedBoxes = finalSortedBoxIds.map(boxId => {
    const box = netlist.boxes.find(b => b.boxId === boxId);
    // This error should ideally not be reached if logic is correct and netlist is consistent
    if (!box) throw new Error(`Box ID ${boxId} not found in netlist.boxes.`);
    return box;
  });

  const normalizedBoxes: NormalizedNetlist["boxes"] = sortedBoxes.map(
    (box) => ({
      boxIndex: transform.boxIdToBoxIndex[box.boxId]!,
      leftPinCount: box.leftPinCount,
      rightPinCount: box.rightPinCount,
      topPinCount: box.topPinCount,
      bottomPinCount: box.bottomPinCount,
    }),
  );

  // Add any remaining nets not found through main chip pin iteration, sorted by ID
  const remainingNetIds = Array.from(existingNetIds)
    .filter(id => !orderedNetIds.includes(id))
    .sort((a, b) => a.localeCompare(b));
  const finalSortedNetIds = [...orderedNetIds, ...remainingNetIds];

  // Populate netIdToNetIndex transform and create the sortedNets array
  finalSortedNetIds.forEach((netId, index) => {
    transform.netIdToNetIndex[netId] = index;
  });
  const sortedNets = finalSortedNetIds.map(netId => {
    const net = netlist.nets.find(n => n.netId === netId);
    // This error should ideally not be reached
    if (!net) throw new Error(`Net ID ${netId} not found in netlist.nets.`);
    return net;
  });

  const normalizedNets: NormalizedNetlist["nets"] = sortedNets.map((net) => ({
    netIndex: transform.netIdToNetIndex[net.netId]!,
  }));

  const normalizedConnections: NormalizedNetlist["connections"] =
    netlist.connections.map((connection) => {
      const connectedPorts = connection.connectedPorts
        .map((port) => {
          if ("boxId" in port) {
            return {
              boxIndex: transform.boxIdToBoxIndex[port.boxId]!,
              pinNumber: port.pinNumber,
            }
          }
          return { netIndex: transform.netIdToNetIndex[port.netId]! }
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
