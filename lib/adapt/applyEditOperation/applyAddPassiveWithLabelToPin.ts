import type { CircuitBuilder } from "lib/builder"
import type { AddPassiveWithLabelToPinOp } from "../EditOperation"
import { getUnitVecFromSide } from "lib/utils/getUnitVecFromSide"

export function applyAddPassiveWithLabelToPin(
  C: CircuitBuilder,
  op: AddPassiveWithLabelToPinOp,
): void {
  const { chipId, pinNumber, labelNetId } = op
  const chip = C.chips.find((ch) => ch.chipId === chipId)
  if (!chip) return
  
  // Ensure the pin exists & already has at least one segment to attach
  const pin = chip.pin(pinNumber)

  if (pin.lastDx === 0 && pin.lastDy === 0 && !pin.lastCreatedLine) {
    const unitVec = getUnitVecFromSide(pin.side)
    pin.line(unitVec.dx * 2, unitVec.dy * 2)
  }

  // Add passive and then add label
  const passivePin = pin.passive()
  passivePin.label(labelNetId)
}