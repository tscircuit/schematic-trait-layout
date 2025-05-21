import type { CircuitBuilder } from "lib/builder"
import type { AddPassiveToPinOp } from "../EditOperation"

export function applyAddPassiveToPin(
  C: CircuitBuilder,
  op: AddPassiveToPinOp,
): void {
  const { chipId, pinNumber } = op
  const chip = C.chips.find((ch) => ch.chipId === chipId)
  if (!chip) return
  // Ensure the pin exists & already has at least one segment to attach
  const pin = chip.pin(pinNumber)
  pin.passive()
}
