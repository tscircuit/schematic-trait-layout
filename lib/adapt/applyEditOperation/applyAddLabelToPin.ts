import type { CircuitBuilder } from "lib/builder"
import type { AddLabelToPinOp } from "../EditOperation"

export function applyAddLabelToPin(
  C: CircuitBuilder,
  op: AddLabelToPinOp,
): void {
  const { chipId, pinNumber } = op
  // TODO
}
