import type { CircuitBuilder } from "lib/builder"
import type { AddLabelToPinOp } from "../EditOperation"
import { getUnitVecFromSide } from "lib/utils/getUnitVecFromSide"

export function applyAddLabelToPin(
  C: CircuitBuilder,
  op: AddLabelToPinOp,
): void {
  const { chipId, pinNumber } = op
  const chip = C.chips.find((ch) => ch.chipId === chipId)
  if (chip && pinNumber >= 1 && pinNumber <= chip.totalPinCount) {
    const pin = chip.pin(pinNumber)
    if (pin && typeof pin.line === "function") {
      const unitVec = getUnitVecFromSide(pin.side)
      pin.line(unitVec.dx * 2, unitVec.dy * 2).label()
    }
  }
}
