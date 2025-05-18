import type { PortReference } from "./circuit-types"

export const isSamePortRef = (
  ref1: PortReference,
  ref2: PortReference,
): boolean => {
  if ("boxId" in ref1 && "boxId" in ref2) {
    return ref1.boxId === ref2.boxId && ref1.pinNumber === ref2.pinNumber
  }
  if ("netId" in ref1 && "netId" in ref2) {
    return ref1.netId === ref2.netId
  }
  if ("lineId" in ref1 && "lineId" in ref2) {
    return ref1.lineId === ref2.lineId
  }
  return false
}
