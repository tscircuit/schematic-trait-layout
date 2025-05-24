import type { ChipBuilder } from "lib/builder"
import type { InputNetlist } from "lib/input-types"

export type PassiveOrientation = "horizontal" | "vertical"

/**
 * Detects the orientation of a passive component based on its pin configuration
 */
export function detectPassiveOrientation(
  chip: ChipBuilder,
): PassiveOrientation {
  if (!chip.isPassive) {
    throw new Error(`Chip ${chip.chipId} is not a passive component`)
  }

  if (chip.leftPinCount > 0 || chip.rightPinCount > 0) {
    return "horizontal"
  } else {
    return "vertical"
  }
}

/**
 * Detects the expected orientation of a passive component from the target netlist
 * by analyzing the connection patterns
 */
export function detectExpectedPassiveOrientation(
  netlist: InputNetlist,
  passiveBoxId: string,
): PassiveOrientation {
  const passiveBox = netlist.boxes.find((box) => box.boxId === passiveBoxId)
  if (!passiveBox) {
    throw new Error(`Passive box ${passiveBoxId} not found in netlist`)
  }

  // Check if the passive has left/right pins (horizontal) or top/bottom pins (vertical)
  if (passiveBox.leftPinCount > 0 || passiveBox.rightPinCount > 0) {
    return "horizontal"
  } else {
    return "vertical"
  }
}

/**
 * Determines if a passive component needs orientation change to match the target
 */
export function needsOrientationChange(
  currentChip: ChipBuilder,
  targetNetlist: InputNetlist,
): {
  needsChange: boolean
  operation?: {
    type: "change_passive_orientation"
    chipId: string
    fromOrientation: PassiveOrientation
    toOrientation: PassiveOrientation
  }
} {
  if (!currentChip.isPassive) {
    return { needsChange: false }
  }

  try {
    const currentOrientation = detectPassiveOrientation(currentChip)
    const expectedOrientation = detectExpectedPassiveOrientation(
      targetNetlist,
      currentChip.chipId,
    )

    if (currentOrientation !== expectedOrientation) {
      return {
        needsChange: true,
        operation: {
          type: "change_passive_orientation",
          chipId: currentChip.chipId,
          fromOrientation: currentOrientation,
          toOrientation: expectedOrientation,
        },
      }
    }
  } catch (error) {
    // If we can't detect orientation (e.g., passive not in target), don't change
    return { needsChange: false }
  }

  return { needsChange: false }
}
