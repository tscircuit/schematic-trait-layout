import type { CircuitBuilder } from "lib/builder"
import type { PinBuilder } from "lib/builder"
import type { RemovePinFromSideOp } from "../EditOperation"

// Local utility, similar to the one in applyAddPinToSide.ts
const patchRefs = (
  circuit: CircuitBuilder,
  chipIdToPatch: string,
  map: Map<number, number>, // Map of oldPinNumber -> newPinNumber for pins whose numbers change
) => {
  const remap = (ref: any) => {
    if (
      "boxId" in ref &&
      ref.boxId === chipIdToPatch &&
      map.has(ref.pinNumber)
    ) {
      return { ...ref, pinNumber: map.get(ref.pinNumber)! }
    }
    return ref
  }

  for (const l of circuit.lines) {
    l.start.ref = remap(l.start.ref)
    l.end.ref = remap(l.end.ref)
  }
  for (const cp of circuit.connectionPoints) cp.ref = remap(cp.ref)
  for (const nl of circuit.netLabels) nl.fromRef = remap(nl.fromRef)
}

export function applyRemovePinFromSide(
  C: CircuitBuilder,
  op: RemovePinFromSideOp,
) {
  const { chipId, side, pinNumber: pinNumberToRemove } = op
  const chip = C.chips.find((c) => c.chipId === chipId)
  if (!chip) return

  const totalOldPins = chip.totalPinCount
  if (pinNumberToRemove < 1 || pinNumberToRemove > totalOldPins) return

  // Ensure pin positions are set before caching
  if (!chip.pinPositionsAreSet) {
    chip.setPinPositions()
  }

  // 1. Cache old positions of all pins
  const oldPos = new Map<number, { x: number; y: number }>()
  for (let pn = 1; pn <= totalOldPins; ++pn) {
    oldPos.set(pn, chip.getPinLocation(pn))
  }

  // 2. Clear artifacts connected to the pin being removed
  const matchRemovedPin = (ref: any) =>
    "boxId" in ref &&
    ref.boxId === chipId &&
    ref.pinNumber === pinNumberToRemove
  C.lines = C.lines.filter(
    (l) => !matchRemovedPin(l.start.ref) && !matchRemovedPin(l.end.ref),
  )
  C.connectionPoints = C.connectionPoints.filter(
    (cp) => !matchRemovedPin(cp.ref),
  )
  C.netLabels = C.netLabels.filter((nl) => !matchRemovedPin(nl.fromRef))

  // 3. Remove PinBuilder instance and decrement side count
  let sideArr: PinBuilder[]
  let pinCountProp: keyof typeof chip

  switch (side) {
    case "left":
      sideArr = chip.leftPins
      pinCountProp = "leftPinCount"
      break
    case "right":
      sideArr = chip.rightPins
      pinCountProp = "rightPinCount"
      break
    case "top":
      sideArr = chip.topPins
      pinCountProp = "topPinCount"
      break
    case "bottom":
      sideArr = chip.bottomPins
      pinCountProp = "bottomPinCount"
      break
    default:
      return // Invalid side
  }

  const indexInSideArray = sideArr.findIndex(
    (pb) => pb.pinNumber === pinNumberToRemove,
  )
  if (indexInSideArray === -1) {
    // This might happen if the pin isn't on the specified side,
    // or if pin numbers in PinBuilder instances are out of sync.
    // For robustness, could search all side arrays, but op.side should be correct.
    return
  }
  sideArr.splice(indexInSideArray, 1)
  ;(chip[pinCountProp] as number)--

  // 4. Build renumbering map (oldPinNumber -> newPinNumber for kept pins)
  const renumberMap = new Map<number, number>()
  for (let oldPn = 1; oldPn <= totalOldPins; ++oldPn) {
    if (oldPn === pinNumberToRemove) continue // Skip removed pin
    if (oldPn < pinNumberToRemove) {
      renumberMap.set(oldPn, oldPn)
    } else {
      renumberMap.set(oldPn, oldPn - 1)
    }
  }

  // 5. Renumber PinBuilder instances
  const allRemainingPbs: PinBuilder[] = [
    ...chip.leftPins,
    ...chip.bottomPins,
    ...chip.rightPins,
    ...chip.topPins,
  ]
  for (const pb of allRemainingPbs) {
    const oldPbPinNumber = pb.pinNumber // This is its number BEFORE re-assignment
    const newPbPinNumber = renumberMap.get(oldPbPinNumber)
    if (newPbPinNumber !== undefined) {
      ;(pb as any).pinNumber = newPbPinNumber
    }
  }

  // 6. Update circuit references
  // Create a map for patchRefs containing only pins whose numbers actually changed
  const finalEffectiveRenumberMap = new Map<number, number>()
  for (const [oldPn, newPn] of renumberMap.entries()) {
    if (oldPn !== newPn) {
      finalEffectiveRenumberMap.set(oldPn, newPn)
    }
  }
  if (finalEffectiveRenumberMap.size > 0) {
    patchRefs(C, chip.chipId, finalEffectiveRenumberMap)
  }

  // 7. Recalculate all pin positions
  chip.pinPositionsAreSet = false
  chip.setPinPositions() // Uses new counts and assigns new x/y to PinBuilders based on their new pin numbers

  // 8. Calculate deltas for moved pins and shift artifacts
  const deltaByNewPin = new Map<number, { dx: number; dy: number }>()
  for (let oldPn = 1; oldPn <= totalOldPins; ++oldPn) {
    if (oldPn === pinNumberToRemove) continue

    const newPn = renumberMap.get(oldPn)!
    const posBefore = oldPos.get(oldPn)!
    const posAfter = chip.getPinLocation(newPn) // Uses new pin number

    const dx = posAfter.x - posBefore.x
    const dy = posAfter.y - posBefore.y
    if (dx !== 0 || dy !== 0) {
      deltaByNewPin.set(newPn, { dx, dy })
    }
  }

  if (deltaByNewPin.size > 0) {
    const shiftForRef = (ref: any) =>
      "boxId" in ref && ref.boxId === chipId && deltaByNewPin.has(ref.pinNumber)
        ? deltaByNewPin.get(ref.pinNumber)!
        : null

    for (const l of C.lines) {
      const dStart = shiftForRef(l.start.ref)
      const dEnd = shiftForRef(l.end.ref)

      // If a line segment is connected to two moved pins on the same chip,
      // it should ideally maintain its relative position if both pins moved identically.
      // If only one end is connected to a moved pin, or if they move differently,
      // the current logic shifts the entire line segment based on one of the deltas.
      // A more sophisticated approach might be needed for complex line adjustments,
      // but for now, we use the simpler model from applyAddPinToSide.
      const d = dStart ?? dEnd
      if (d) {
        // If both ends are affected, and deltas are different, this simple shift might be imperfect.
        // However, typically only one end of a segment is directly affected by a pin moving,
        // or both ends move identically if part of a rigid structure.
        if (dStart) {
          l.start.x += dStart.dx
          l.start.y += dStart.dy
        }
        if (dEnd) {
          l.end.x += dEnd.dx
          l.end.y += dEnd.dy
        }
      }
    }

    for (const cp of C.connectionPoints) {
      const d = shiftForRef(cp.ref)
      if (d) {
        cp.x += d.dx
        cp.y += d.dy
      }
    }

    for (const nl of C.netLabels) {
      const d = shiftForRef(nl.fromRef)
      if (d) {
        nl.x += d.dx
        nl.y += d.dy
      }
    }
  }
}
