import type { CircuitBuilder } from "lib/builder"
import type { AddPassiveToPinOp } from "../EditOperation"

export function applyAddPassiveToPin(
  C: CircuitBuilder,
  op: AddPassiveToPinOp,
): void {
  const { chipId, pinNumber } = op
  // TODO
}
