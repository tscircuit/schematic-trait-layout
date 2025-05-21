import type { CircuitBuilder } from "lib/builder"
import type { ClearPinOp } from "../EditOperation"

export function applyClearPin(C: CircuitBuilder, op: ClearPinOp): void {
  const { chipId, pinNumber } = op
  // TODO
}
