import type { CircuitBuilder } from "lib/builder"
import { PinBuilder } from "lib/builder"
import type { AddPinToSideOp } from "../EditOperation"
import type { Side } from "lib/input-types"

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

export function applyAddPinToSide(C: CircuitBuilder, op: AddPinToSideOp): void {
  const { chipId, side, betweenPinNumbers } = op
  const chip = C.chips.find((c) => c.chipId === chipId)
  if (!chip) return

  // 1. Cache canonical pin coordinates (use geometry, not the
  //    possibly-shifted builder state)
  const totalOldPins = chip.totalPinCount
  const oldPos = new Map<number, { x: number; y: number }>() // key = OLD pin #
  for (let pn = 1; pn <= totalOldPins; ++pn) {
    oldPos.set(pn, chip.getPinLocation(pn))
  }

  /* ---------- 1. identify insertion position ---------- */
  const afterPin = Math.min(...betweenPinNumbers) // pin number we insert *after*
  const sideArr =
    side === "left"
      ? chip.leftPins
      : side === "right"
        ? chip.rightPins
        : side === "top"
          ? chip.topPins
          : chip.bottomPins

  const insertIdx = sideArr.findIndex((pb) => pb.pinNumber === afterPin) + 1
  if (insertIdx === 0) return // could not locate gap – abort

  /* ---------- 2. enlarge side-count & insert new PinBuilder ---------- */
  chip[`${side}PinCount` as const] += 1
  const newPinNumber = afterPin + 1
  const newPB = new PinBuilder(chip, newPinNumber)
  sideArr.splice(insertIdx, 0, newPB)

  /* ---------- 3. build old→new mapping ---------- */
  const map = new Map<number, number>()
  const totalOldPinsBefore = chip.totalPinCount - 1 // before insertion
  for (let oldPn = 1; oldPn <= totalOldPinsBefore; ++oldPn) {
    if (oldPn > afterPin) map.set(oldPn, oldPn + 1)
  }

  /* ---------- 4. renumber existing PinBuilder objects ---------- */
  const newPinSet = new Set<PinBuilder>([newPB])
  const renumberArr = (arr: PinBuilder[]) =>
    arr.forEach((pb) => {
      if (newPinSet.has(pb)) return
      if (map.has(pb.pinNumber)) pb.pinNumber = map.get(pb.pinNumber)!
    })
  renumberArr(chip.leftPins)
  renumberArr(chip.rightPins)
  renumberArr(chip.topPins)
  renumberArr(chip.bottomPins)

  /* ---------- 5. update every reference inside circuit ---------- */
  patchRefs(C, chipId, map)

  // 3. Recalculate every pin position
  chip.pinPositionsAreSet = false
  chip.setPinPositions()

  // 4.  Work out how much every *pre-existing* pin moved
  const deltaByPin = new Map<number, { dx: number; dy: number }>() // key = NEW pin #
  for (let oldPn = 1; oldPn <= totalOldPins; ++oldPn) {
    const before = oldPos.get(oldPn)!
    const newPn = map.get(oldPn) ?? oldPn // new number after renumbering
    const after = chip.getPinLocation(newPn)
    const dx = after.x - before.x
    const dy = after.y - before.y
    if (dx || dy) deltaByPin.set(newPn, { dx, dy })
  }

  // 5. Helper to get shift for a ref
  const shiftForRef = (ref: any) =>
    "boxId" in ref && ref.boxId === chipId && deltaByPin.has(ref.pinNumber)
      ? deltaByPin.get(ref.pinNumber)!
      : null

  // 6. Shift artifacts whose coordinates depend on the moved pins

  /* ---- shift whole line segments that touch a moved pin ---- */
  for (const l of C.lines) {
    const d = shiftForRef(l.start.ref) ?? shiftForRef(l.end.ref)
    if (d) {
      l.start.x += d.dx
      l.start.y += d.dy
      l.end.x += d.dx
      l.end.y += d.dy
    }
  }

  /* ---- shift connection-points ---- */
  for (const cp of C.connectionPoints) {
    const d = shiftForRef(cp.ref)
    if (d) {
      cp.x += d.dx
      cp.y += d.dy
    }
  }

  /* ---- shift net-labels anchored to the moved pins ---- */
  for (const nl of C.netLabels) {
    const d = shiftForRef(nl.fromRef)
    if (d) {
      nl.x += d.dx
      nl.y += d.dy
    }
  }
}
