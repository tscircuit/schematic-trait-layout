import { SIDES_CCW, type CircuitBuilder } from "lib/builder"
import type { InputNetlist } from "lib/input-types"
import { applyEditOperation } from "./applyEditOperation"
import type { AddPinToSideOp, EditOperation } from "./EditOperation"
import { computeEditOperationsToFixPinSubsetNetlist } from "./computeEditOperationsToFixPinSubsetNetlist"
import { transformTargetForPassiveCompatibility } from "./transformTargetForPassiveCompatibility"

/**
 * Mutates template until it has the same normalized netlist as the target.
 *
 * It does this by examining the sizes of chips,then each pin subset. Each time
 * it sees a difference, it creates and applies an edit operation to correct
 * the template.
 *
 * We record all the operations so that we can "playback" the changes to the
 * template.
 *
 * TODO perform box matching (see getMatchedBoxes) to correctly adapt the right boxes
 * to eachother, don't use chipId/boxId to do the matching
 */
export function adaptTemplateToTarget(params: {
  template: CircuitBuilder
  target: InputNetlist
}): {
  appliedOperations: EditOperation[]
} {
  const { template, target: originalTarget } = params
  const appliedOperations: EditOperation[] = []

  // Transform the target to be compatible with template passive structures
  const target = transformTargetForPassiveCompatibility(
    template,
    originalTarget,
  )
  const targetBoxes = target.boxes

  // Remove chips that exist in template but not in target
  const targetChipIds = new Set(targetBoxes.map((box) => box.boxId))
  const chipsToRemove = template.chips.filter(
    (chip) => !targetChipIds.has(chip.chipId),
  )

  for (const chip of chipsToRemove) {
    const op: EditOperation = {
      type: "remove_chip",
      chipId: chip.chipId,
    }
    applyEditOperation(template, op)
    appliedOperations.push(op)
  }

  // Make every box have the right number of pins per side
  for (const chip of template.chips) {
    const targetBox = targetBoxes.find((b) => b.boxId === chip.chipId)
    if (!targetBox) continue // (chip removed – will be handled later)

    // Skip passive components - their connections should be handled semantically
    if (chip.isPassive) continue

    const countsNow = {
      left: chip.leftPinCount,
      bottom: chip.bottomPinCount,
      right: chip.rightPinCount,
      top: chip.topPinCount,
    } as const

    for (const side of SIDES_CCW) {
      const currentSideCount = countsNow[side]
      const targetSideCount = targetBox[
        `${side}PinCount` as keyof typeof targetBox
      ] as number

      while (
        (chip[`${side}PinCount` as keyof typeof chip] as number) <
        targetSideCount
      ) {
        let afterPin: number
        if (side === "left") {
          // Add to the start (top-most) of the left side.
          afterPin = 0
        } else if (side === "bottom") {
          // Add to the end (left-most) of the bottom side.
          afterPin = chip.leftPinCount + chip.bottomPinCount
        } else if (side === "right") {
          // Add to the end (top-most) of the right side.
          afterPin =
            chip.leftPinCount + chip.bottomPinCount + chip.rightPinCount
        } else {
          // side === "top"
          // Add to the end (right-most) of the top side.
          afterPin = chip.totalPinCount
        }

        const op: AddPinToSideOp = {
          type: "add_pin_to_side",
          chipId: chip.chipId,
          side,
          betweenPinNumbers: [afterPin, afterPin + 1],
        }
        applyEditOperation(template, op)
        appliedOperations.push(op)
      }

      // Remove excess pins
      while (
        (chip[`${side}PinCount` as keyof typeof chip] as number) >
        targetSideCount
      ) {
        const op: EditOperation = {
          type: "remove_pin_from_side",
          chipId: chip.chipId,
          side,
          pinNumber: chip.totalPinCount, // Remove the highest numbered pin
        }
        applyEditOperation(template, op)
        appliedOperations.push(op)
      }
    }
  }

  // Go through each pin and make sure it has the right shape by
  // comparing the target pin subset to the current pin subset.
  // Only process chips that exist in the target (skip chips that will be removed)
  for (const chip of template.chips) {
    const targetBox = targetBoxes.find((b) => b.boxId === chip.chipId)
    if (!targetBox) continue // Skip chips that don't exist in target

    for (let pinNumber = 1; pinNumber <= chip.totalPinCount; pinNumber++) {
      const currentNetlistForPin = template.getNetlist()
      const operationsForPin = computeEditOperationsToFixPinSubsetNetlist({
        currentNetlist: currentNetlistForPin,
        targetNetlist: target,
        chipId: chip.chipId,
        pinNumber: pinNumber,
      })

      for (const op of operationsForPin) {
        applyEditOperation(template, op)
        appliedOperations.push(op)
      }
    }
  }

  return {
    appliedOperations,
  }
}
