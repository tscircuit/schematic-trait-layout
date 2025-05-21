import type { CircuitBuilder } from "lib/builder"
import type { AddPinToSideOp } from "../EditOperation"

export function applyAddPinToSide(C: CircuitBuilder, op: AddPinToSideOp) {
  const { chipId, side, betweenPinNumbers } = op
  // TODO
}
