import type { CircuitBuilder } from "lib/builder"
import type {
  InputNetlist,
  Box,
  Connection,
  Net,
  PortReference,
} from "lib/input-types"

/**
 * Gets the subset of the netlist directly connected to the given pin.
 *
 * The pin is added to the netlist as a box. with only a single pin.
 *
 */
export function getPinSubsetNetlist(params: {
  netlist: InputNetlist
  chipId: string
  pinNumber: number
}): InputNetlist {
  const { netlist, chipId, pinNumber } = params

  const pinBoxId = `${chipId}.pin${pinNumber}`
  const newBoxes: Box[] = [
    {
      boxId: pinBoxId,
      leftPinCount: 0,
      rightPinCount: 1, // This single pin will be pinNumber 1
      topPinCount: 0,
      bottomPinCount: 0,
    },
  ]

  const newNets: Net[] = []
  const newConnections: Connection[] = []

  const processedBoxIds = new Set<string>([pinBoxId])
  const processedNetIds = new Set<string>()

  for (const connection of netlist.connections) {
    const isTargetPinInConnection = connection.connectedPorts.some(
      (p) => "boxId" in p && p.boxId === chipId && p.pinNumber === pinNumber,
    )

    if (isTargetPinInConnection) {
      const subsetConnectionPorts: PortReference[] = [
        { boxId: pinBoxId, pinNumber: 1 },
      ]

      for (const port of connection.connectedPorts) {
        if ("boxId" in port) {
          if (port.boxId === chipId && port.pinNumber === pinNumber) {
            // Skip the target pin itself
            continue
          }
          subsetConnectionPorts.push({
            boxId: port.boxId,
            pinNumber: port.pinNumber,
          })
          if (!processedBoxIds.has(port.boxId)) {
            const originalBox = netlist.boxes.find(
              (b) => b.boxId === port.boxId,
            )
            if (originalBox) {
              newBoxes.push(originalBox)
            }
            processedBoxIds.add(port.boxId)
          }
        } else if ("netId" in port) {
          subsetConnectionPorts.push({ netId: port.netId })
          if (!processedNetIds.has(port.netId)) {
            newNets.push({ netId: port.netId })
            processedNetIds.add(port.netId)
          }
        }
      }

      if (subsetConnectionPorts.length > 1) {
        newConnections.push({ connectedPorts: subsetConnectionPorts })
      }
    }
  }

  return {
    boxes: newBoxes,
    nets: newNets,
    connections: newConnections,
  }
}
