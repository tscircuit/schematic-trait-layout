import { SIDES_CCW, type CircuitBuilder } from "lib/builder"
import type { InputNetlist } from "lib/input-types"
import { applyEditOperation } from "./applyEditOperation"
import type { AddPinsToSideOp, EditOperation } from "./EditOperation"
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

  // STEP ONE: make every box have the right number of pins per side
  for (const chip of template.chips) {
    const targetBox = targetNorm.normalizedNetlist.boxes.find(
      (b) => b.boxId === chip.chipId,
    )
    if (!targetBox) continue // (chip removed – will be handled later)

    const countsNow = {
      left: chip.leftPinCount,
      bottom: chip.bottomPinCount,
      right: chip.rightPinCount,
      top: chip.topPinCount,
    } as const

    for (const side of SIDES_CCW) {
      const currentSideCount = countsNow[side]
      const targetSideCount =
        targetBox[`${side}PinCount` as keyof typeof targetBox] as number

      if (currentSideCount < targetSideCount) {
        const op: AddPinsToSideOp = {
          type: "add_pins_to_side",
          chipId: chip.chipId,
          side,
          oldPinCount: currentSideCount,
          newPinCount: targetSideCount,
        }
        applyEditOperation(template, op)
        appliedOperations.push(op)
      }
      // (removal will be implemented later)
    }
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
