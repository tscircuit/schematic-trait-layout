import type { CircuitBuilder } from "lib/builder"
import type { ChangePassiveOrientationOp } from "../EditOperation"

export function applyChangePassiveOrientation(
  C: CircuitBuilder,
  op: ChangePassiveOrientationOp,
): void {
  const chip = C.chips.find((c) => c.chipId === op.chipId)
  if (!chip) {
    throw new Error(`Chip ${op.chipId} not found`)
  }

  if (!chip.isPassive) {
    throw new Error(`Chip ${op.chipId} is not a passive component`)
  }

  // For now, we'll implement a simple rotation by swapping pin configurations
  // This assumes the passive has exactly 2 pins
  if (chip.totalPinCount !== 2) {
    throw new Error(
      `Passive orientation change only supports 2-pin passives, got ${chip.totalPinCount} pins`,
    )
  }

  // Determine current orientation
  const currentOrientation =
    chip.leftPinCount > 0 || chip.rightPinCount > 0 ? "horizontal" : "vertical"

  if (currentOrientation === op.toOrientation) {
    // No change needed
    return
  }

  // Transform the passive orientation
  if (op.toOrientation === "horizontal") {
    // Convert vertical to horizontal: bottom/top pins -> left/right pins
    chip.leftPinCount = 1
    chip.rightPinCount = 1
    chip.bottomPinCount = 0
    chip.topPinCount = 0

    // Update pin arrays
    chip.leftPins = [chip.bottomPins[0] || chip.topPins[0]]
    chip.rightPins = [chip.topPins[0] || chip.bottomPins[0]]
    chip.bottomPins = []
    chip.topPins = []
  } else {
    // Convert horizontal to vertical: left/right pins -> bottom/top pins
    chip.bottomPinCount = 1
    chip.topPinCount = 1
    chip.leftPinCount = 0
    chip.rightPinCount = 0

    // Update pin arrays
    chip.bottomPins = [chip.leftPins[0] || chip.rightPins[0]]
    chip.topPins = [chip.rightPins[0] || chip.leftPins[0]]
    chip.leftPins = []
    chip.rightPins = []
  }

  // Note: This is a simplified implementation. A more complete version would:
  // 1. Update connection endpoints to match the new pin positions
  // 2. Adjust line routing to account for the rotated passive
  // 3. Handle position adjustments for the passive component
}
