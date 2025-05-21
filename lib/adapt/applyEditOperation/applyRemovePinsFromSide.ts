import type { CircuitBuilder } from "lib/builder"
import type { RemovePinsFromSideOp } from "../EditOperation"
import { isSamePortRef } from "lib/builder/isSamePortRef"
import type { Side } from "lib/input-types"

const getSideAndIndex = (
  pin: number,
  counts: { left: number; bottom: number; right: number; top: number },
): { side: Side; index: number } => {
  if (pin <= counts.left) return { side: "left", index: pin - 1 }
  pin -= counts.left
  if (pin <= counts.bottom) return { side: "bottom", index: pin - 1 }
  pin -= counts.bottom
  if (pin <= counts.right) return { side: "right", index: pin - 1 }
  pin -= counts.right
  return { side: "top", index: pin - 1 }
}

const getPinNumber = (
  side: Side,
  idx: number,
  counts: { left: number; bottom: number; right: number; top: number },
) =>
  side === "left"
    ? idx + 1
    : side === "bottom"
      ? counts.left + idx + 1
      : side === "right"
        ? counts.left + counts.bottom + idx + 1
        : counts.left + counts.bottom + counts.right + idx + 1

const patchRefs = (
  C: CircuitBuilder,
  chipId: string,
  map: Map<number, number>,
) => {
  const remap = (ref: any) =>
    "boxId" in ref && ref.boxId === chipId && map.has(ref.pinNumber)
      ? { ...ref, pinNumber: map.get(ref.pinNumber)! }
      : ref

  for (const l of C.lines) {
    l.start.ref = remap(l.start.ref)
    l.end.ref = remap(l.end.ref)
  }
  for (const cp of C.connectionPoints) cp.ref = remap(cp.ref)
  for (const nl of C.netLabels) nl.fromRef = remap(nl.fromRef)
}

export function applyRemovePinsFromSide(
  C: CircuitBuilder,
  op: RemovePinsFromSideOp,
): void {
  const { chipId, side, oldPinCount, newPinCount } = op
  if (oldPinCount <= newPinCount) return

  const chip = C.chips.find((c) => c.chipId === chipId)
  if (!chip) return
  const countsBefore = {
    left: chip.leftPinCount,
    bottom: chip.bottomPinCount,
    right: chip.rightPinCount,
    top: chip.topPinCount,
  }

  /* ---------- 1. change side-count & remove PinBuilder(s) ---------- */
  const delta = oldPinCount - newPinCount
  chip[`${side}PinCount` as const] = newPinCount
  const countsAfter = {
    left: chip.leftPinCount,
    bottom: chip.bottomPinCount,
    right: chip.rightPinCount,
    top: chip.topPinCount,
  }

  const sideArr =
    side === "left"
      ? chip.leftPins
      : side === "right"
        ? chip.rightPins
        : side === "top"
          ? chip.topPins
          : chip.bottomPins

  // Remove last (old-new) PinBuilder objects from side array
  const removedPins = sideArr.splice(newPinCount, delta)

  // Build map for remaining pins
  const map = new Map<number, number>()
  const totalOld =
    countsBefore.left +
    countsBefore.bottom +
    countsBefore.right +
    countsBefore.top
  const totalNew =
    countsAfter.left + countsAfter.bottom + countsAfter.right + countsAfter.top
  for (let oldPn = 1; oldPn <= totalOld; ++oldPn) {
    const { side: s, index } = getSideAndIndex(oldPn, countsBefore)
    if (s === side && index >= newPinCount) continue // removed pin
    const newPn = getPinNumber(s, index, countsAfter)
    map.set(oldPn, newPn)
  }

  // Delete lines / points / labels referencing the removed pins
  const removedPinNumbers = new Set<number>(
    removedPins.map((pb: any) => pb.pinNumber),
  )
  const isRemovedRef = (ref: any) =>
    "boxId" in ref &&
    ref.boxId === chipId &&
    removedPinNumbers.has(ref.pinNumber)

  C.lines = C.lines.filter(
    (l) => !isRemovedRef(l.start.ref) && !isRemovedRef(l.end.ref),
  )
  C.connectionPoints = C.connectionPoints.filter((cp) => !isRemovedRef(cp.ref))
  C.netLabels = C.netLabels.filter((nl) => !isRemovedRef(nl.fromRef))

  // Renumber remaining PinBuilder objects
  const patchSide = (arr: any[]) =>
    arr.forEach((pb) => {
      if (map.has(pb.pinNumber)) pb.pinNumber = map.get(pb.pinNumber)!
    })
  patchSide(chip.leftPins)
  patchSide(chip.bottomPins)
  patchSide(chip.rightPins)
  patchSide(chip.topPins)

  // Update every ref inside circuit
  patchRefs(C, chipId, map)

  // Refresh pin coordinates
  chip.pinPositionsAreSet = false
  chip.setPinPositions()
}
