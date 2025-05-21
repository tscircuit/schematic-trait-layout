import { SIDES_CCW, type CircuitBuilder } from "lib/builder"
import type { InputNetlist } from "lib/input-types"
import type { EditOperation } from "./EditOperation"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"
import { getPinsInBox } from "lib/utils/getPinsInBox"

/**
 * Mutates template until it has the same normalized netlist as the target.
 *
 * It does this by examining the sizes of chips,then each pin subset. Each time
 * it sees a difference, it creates and applies an edit operation to correct
 * the template.
 *
 * We record all the operations so that we can "playback" the changes to the
 * template.
 */
export function adaptTemplateToTarget(params: {
  template: CircuitBuilder
  target: InputNetlist
}): {
  appliedOperations: EditOperation[]
} {
  const { template, target } = params
  const appliedOperations: EditOperation[] = []

  const getCurrentNorm = () => normalizeNetlist(template.getNetlist())
  const targetNorm = normalizeNetlist(target)
  const boxes1 = getCurrentNorm().normalizedNetlist.boxes

  // STEP ONE: Make sure all the boxes have the correct number of pins on each
  // side
  for (let boxIndex = 0; boxIndex < boxes1.length; boxIndex++) {
    const box = boxes1[boxIndex]!

    const targetBox = targetNorm.normalizedNetlist.boxes[boxIndex]!

    if (!targetBox) {
      // TODO create remove_chip operation
    }

    for (const side of SIDES_CCW) {
      const currentSideCount = box[`${side}PinCount` as keyof typeof box]
      const targetSideCount =
        targetBox[`${side}PinCount` as keyof typeof targetBox]
      if (currentSideCount > targetSideCount) {
        // TODO create remove_pins_from_side operation and apply
      } else if (currentSideCount < targetSideCount) {
        // TODO create add_pins_to_side operation and apply
      }
    }

    // TODO create add_pins_to_side or remove_pins_from_side operations
  }

  /** boxes with correct pin counts */
  const boxes2 = getCurrentNorm().normalizedNetlist.boxes

  // STEP TWO: Go through each pin and make sure it has the right shape by
  // comparing the target pin subset to the current pin subset.
  for (let boxIndex = 0; boxIndex < boxes2.length; boxIndex++) {
    const box = boxes2[boxIndex]!
    const pinsInBox = getPinsInBox(box)
    for (const { pinNumber, side } of pinsInBox) {
      // TODO
    }
  }

  return {
    appliedOperations,
  }
}
