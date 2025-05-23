import type { NormalizedNetlist } from "lib/scoring/types"
import type { InputNetlist } from "lib/input-types"

export const convertNormalizedNetlistToInputNetlist = (
  normalizedNetlist: NormalizedNetlist,
): InputNetlist => {
  const boxes: InputNetlist["boxes"] = normalizedNetlist.boxes.map((b) => ({
    boxId: `box${b.boxIndex}`,
    leftPinCount: b.leftPinCount,
    rightPinCount: b.rightPinCount,
    topPinCount: b.topPinCount,
    bottomPinCount: b.bottomPinCount,
  }))

  const nets: InputNetlist["nets"] = normalizedNetlist.nets.map((n) => ({
    netId: `net${n.netIndex}`,
  }))

  const connections: InputNetlist["connections"] =
    normalizedNetlist.connections.map((c) => ({
      connectedPorts: c.connectedPorts.map((p) => {
        if ("boxIndex" in p) {
          return {
            boxId: `box${p.boxIndex}`,
            pinNumber: p.pinNumber,
          }
        }
        return {
          netId: `net${p.netIndex}`,
        }
      }),
    }))

  return {
    boxes,
    nets,
    connections,
  }
}
