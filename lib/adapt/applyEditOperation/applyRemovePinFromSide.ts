import type { CircuitBuilder } from "lib/builder"
import type { RemovePinFromSideOp } from "../EditOperation"

export function applyRemovePinFromSide(
  C: CircuitBuilder,
  op: RemovePinFromSideOp,
) {
  const { chipId, side, pinNumber } = op
  // TODO
}
