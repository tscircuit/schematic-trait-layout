import type { CircuitBuilder } from "lib/builder"
import type { AddPinsToSideOp } from "../EditOperation"

export function applyAddPinsToSide(
  C: CircuitBuilder,
  op: AddPinsToSideOp,
): void {
  const { chipId, side, oldPinCount, newPinCount } = op
  // TODO
}
