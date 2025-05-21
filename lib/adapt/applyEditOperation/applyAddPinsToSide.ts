import type { CircuitBuilder } from "lib/builder"
import type { AddPinsToSideOp } from "../EditOperation"
import { isSamePortRef } from "lib/builder/isSamePortRef"
import type { Side } from "lib/input-types"
import { PinBuilder } from "lib/builder"

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

export function applyAddPinsToSide(
  C: CircuitBuilder,
  op: AddPinsToSideOp,
): void {
  const { chipId, side, oldPinCount, newPinCount } = op
  if (newPinCount <= oldPinCount) return

  const chip = C.chips.find((c) => c.chipId === chipId)
  if (!chip) return
  const countsBefore = {
    left: chip.leftPinCount,
    bottom: chip.bottomPinCount,
    right: chip.rightPinCount,
    top: chip.topPinCount,
  }

  /* ---------- 1. change side-count & create new PinBuilder(s) ---------- */
  const delta = newPinCount - oldPinCount
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

  const newPins = new Set<PinBuilder>() // <-- NEW

  for (let i = 0; i < delta; ++i) {
    const idx = oldPinCount + i
    const pn = getPinNumber(side, idx, countsAfter)
    const pbCtor =
      (chip as any).constructor.prototype.PinBuilder?.constructor || PinBuilder // fallback if minified
    const pb = new pbCtor(chip, pn)
    sideArr.push(pb)
    newPins.add(pb) // <-- NEW
  }

  /* ---------- 2. build map: oldPin → newPin ---------- */
  const map = new Map<number, number>()
  const totalOld =
    countsBefore.left +
    countsBefore.bottom +
    countsBefore.right +
    countsBefore.top
  for (let oldPn = 1; oldPn <= totalOld; ++oldPn) {
    const { side: s, index } = getSideAndIndex(oldPn, countsBefore)
    const newPn = getPinNumber(s, index, countsAfter)
    map.set(oldPn, newPn)
  }

  /* ---------- 3. renumber existing PinBuilder objects ---------- */
  const patchSide = (arr: any[]) =>
    arr.forEach((pb) => {
      if (newPins.has(pb)) return // <-- NEW: do not touch new pins
      if (map.has(pb.pinNumber)) pb.pinNumber = map.get(pb.pinNumber)!
    })
  patchSide(chip.leftPins)
  patchSide(chip.bottomPins)
  patchSide(chip.rightPins)
  patchSide(chip.topPins)

  /* ---------- 4. update every ref inside circuit ---------- */
  patchRefs(C, chipId, map)

  /* ---------- 5. refresh pin coordinates ---------- */
  chip.pinPositionsAreSet = false
  chip.setPinPositions()
}
