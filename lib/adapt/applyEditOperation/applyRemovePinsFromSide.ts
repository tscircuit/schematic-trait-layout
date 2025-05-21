import type { CircuitBuilder } from "lib/builder"
import type { RemovePinsFromSideOp } from "../EditOperation"

export function applyRemovePinsFromSide(
  C: CircuitBuilder,
  op: RemovePinsFromSideOp,
): void {
  const { chipId, side, oldPinCount, newPinCount } = op
  // TODO
}
