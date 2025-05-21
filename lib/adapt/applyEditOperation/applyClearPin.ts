import { isSamePortRef } from "lib/builder/isSamePortRef"
import type { CircuitBuilder } from "lib/builder"
import type { ClearPinOp } from "../EditOperation"

export function applyClearPin(C: CircuitBuilder, op: ClearPinOp): void {
  const { chipId, pinNumber } = op
  const match = (ref: any) =>
    "boxId" in ref && ref.boxId === chipId && ref.pinNumber === pinNumber

  C.lines = C.lines.filter((l) => !match(l.start.ref) && !match(l.end.ref))
  C.connectionPoints = C.connectionPoints.filter((cp) => !match(cp.ref))
  C.netLabels = C.netLabels.filter((nl) => !match(nl.fromRef))
}
