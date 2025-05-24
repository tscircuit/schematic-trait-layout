import type { CircuitBuilder } from "lib/builder"
import type { AddLabelToPinOp } from "../EditOperation"
import { getUnitVecFromSide } from "lib/utils/getUnitVecFromSide"
import { getPinSideIndex } from "lib/builder/getPinSideIndex"

export function applyAddLabelToPin(C: CircuitBuilder, op: AddLabelToPinOp): void {
  const { chipId, pinNumber, netName } = op
  const chip = C.chips.find((c) => c.chipId === chipId)
  if (!chip) return

  if (pinNumber < 1 || pinNumber > chip.totalPinCount) return

  const pin = chip.pin(pinNumber)
  if (!pin || typeof pin.line !== "function") return

  // Determine which side the pin is on and get the unit vector for the line direction
  const { side } = getPinSideIndex(pinNumber, chip)
  const { dx, dy } = getUnitVecFromSide(side)

  // Create a line segment from the pin
  pin.line(dx * 2, dy * 2)

  // Add a label at the end of the line
  const labelText = netName || C.generateAutoLabel()
  pin.label(labelText)
}
