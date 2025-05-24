import type { InputNetlist } from "lib/input-types"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"
import { getPinSubsetNetlist } from "./getPinSubsetNetlist"

export const getPinShapeSignature = (
  params:
    | {
        netlist: InputNetlist
        chipId: string
        pinNumber: number
      }
    | { pinShapeNetlist: InputNetlist },
): string => {
  let pinShapeNetlist: InputNetlist

  if ("pinShapeNetlist" in params) {
    pinShapeNetlist = params.pinShapeNetlist
  } else {
    const { netlist, chipId, pinNumber } = params

    pinShapeNetlist = getPinSubsetNetlist({
      chipId,
      pinNumber,
      netlist,
    })
  }

  const normNetlist = normalizeNetlist(pinShapeNetlist)

  return `${normNetlist.normalizedNetlist.boxes
    .map(
      (b) =>
        `L${b.leftPinCount}B${b.bottomPinCount}R${b.rightPinCount}T${b.topPinCount}`,
    )
    .join(",")}|C${normNetlist.normalizedNetlist.connections
    .map(
      (c) =>
        `[${c.connectedPorts
          .map((cp) =>
            "boxIndex" in cp
              ? `b${cp.boxIndex}.${cp.pinNumber}`
              : `n${cp.netIndex}`,
          )
          .join(",")}]`,
    )
    .join(",")}`
}
