import type { CircuitBuilder } from "lib/builder"
import type { AddPassiveToPinOp } from "../EditOperation"
import { getUnitVecFromSide } from "lib/utils/getUnitVecFromSide"

export function applyAddPassiveToPin(
  C: CircuitBuilder,
  op: AddPassiveToPinOp,
): void {
  const { chipId, pinNumber } = op
  const chip = C.chips.find((ch) => ch.chipId === chipId)
  if (!chip) return
  // Ensure the pin exists & already has at least one segment to attach
  const pin = chip.pin(pinNumber)

  if (pin.lastDx === 0 && pin.lastDy === 0 && !pin.lastCreatedLine) {
    const unitVec = getUnitVecFromSide(pin.side)
    pin.line(unitVec.dx * 2, unitVec.dy * 2)
  }

  pin.passive()
}
