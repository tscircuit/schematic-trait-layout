import { CircuitBuilder, ChipBuilder } from "lib/builder"
import type { Line, ConnectionPoint, NetLabel } from "lib/builder/circuit-types"

type Side = "left" | "bottom" | "right" | "top"

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

const calcNewPinNumber = (
  side: Side,
  oldIndex: number,
  chip1Orig: { left: number; bottom: number; right: number; top: number },
  mergedCounts: { left: number; bottom: number; right: number; top: number },
): number => {
  let base = 0
  if (side === "left") {
    base = 0
    return chip1Orig.left + oldIndex + 1
  }
  if (side === "bottom") {
    base = mergedCounts.left
    return base + chip1Orig.bottom + oldIndex + 1
  }
  if (side === "right") {
    base = mergedCounts.left + mergedCounts.bottom
    return base + chip1Orig.right + oldIndex + 1
  }
  // top
  base = mergedCounts.left + mergedCounts.bottom + mergedCounts.right
  return base + chip1Orig.top + oldIndex + 1
}

const translatePortRef = (
  ref: any,
  chip2Counts: { left: number; bottom: number; right: number; top: number },
  chip1Orig: { left: number; bottom: number; right: number; top: number },
  mergedCounts: { left: number; bottom: number; right: number; top: number },
  circuit2ChipId: string,
  circuit1ChipId: string,
) => {
  if (!("boxId" in ref) || ref.boxId !== circuit2ChipId) return ref
  const { side, index } = getSideAndIndex(ref.pinNumber, chip2Counts)
  return {
    boxId: circuit1ChipId,
    pinNumber: calcNewPinNumber(side, index, chip1Orig, mergedCounts),
  }
}

export const mergeCircuits = ({
  circuit1,
  circuit2,
  circuit1ChipId,
  circuit2ChipId,
}: {
  circuit1: CircuitBuilder
  circuit2: CircuitBuilder
  circuit1ChipId: string
  circuit2ChipId: string
}): CircuitBuilder => {
  /* ------------------------------------------------------------- *
   * 0.  Start with a clone of circuit1 (so we do not mutate it)   *
   * ------------------------------------------------------------- */
  const merged = circuit1.clone()

  /* 1.  Locate the chips                                         */
  const chip1 = merged.chips.find((c) => c.chipId === circuit1ChipId)!
  const chip2 = circuit2.chips.find((c) => c.chipId === circuit2ChipId)!
  if (!chip1 || !chip2) throw new Error("Chip IDs not found")

  /* 2.  Memorise chip1 original side-counts                       */
  const chip1Orig = {
    left: chip1.leftPinCount,
    bottom: chip1.bottomPinCount,
    right: chip1.rightPinCount,
    top: chip1.topPinCount,
  }

  /* 3.  Grow chip1 to accommodate chip2’s pins                    */
  chip1.leftPinCount += chip2.leftPinCount
  chip1.bottomPinCount += chip2.bottomPinCount
  chip1.rightPinCount += chip2.rightPinCount
  chip1.topPinCount += chip2.topPinCount

  const mergedCounts = {
    left: chip1.leftPinCount,
    bottom: chip1.bottomPinCount,
    right: chip1.rightPinCount,
    top: chip1.topPinCount,
  }

  /* 4.  Bring every *other* chip from circuit2 into merged        */
  for (const chip of circuit2.chips) {
    if (chip.chipId === circuit2ChipId) continue
    const nc = new ChipBuilder(merged, chip.chipId, chip.isPassive)
    nc.x = chip.x
    nc.y = chip.y
    nc.leftPinCount = chip.leftPinCount
    nc.bottomPinCount = chip.bottomPinCount
    nc.rightPinCount = chip.rightPinCount
    nc.topPinCount = chip.topPinCount
    merged.chips.push(nc)
  }

  /* 5.  Copy lines, points, labels – translating refs that        *
   *     pointed at chip2 so they now target chip1, using          *
   *     the mapping helpers above.                               */
  const chip2Counts = {
    left: chip2.leftPinCount,
    bottom: chip2.bottomPinCount,
    right: chip2.rightPinCount,
    top: chip2.topPinCount,
  }

  const translateRef = (r: any) =>
    translatePortRef(
      r,
      chip2Counts,
      chip1Orig,
      mergedCounts,
      circuit2ChipId,
      circuit1ChipId,
    )

  for (const l of circuit2.lines) {
    const copy: Line = {
      start: { ...l.start, ref: translateRef(l.start.ref) },
      end: { ...l.end, ref: translateRef(l.end.ref) },
    }
    merged.lines.push(copy)
  }

  for (const p of circuit2.connectionPoints) {
    const copy: ConnectionPoint = {
      ...p,
      ref: translateRef(p.ref),
    }
    merged.connectionPoints.push(copy)
  }

  for (const nl of circuit2.netLabels) {
    const copy: NetLabel = {
      ...nl,
      fromRef: translateRef(nl.fromRef),
    }
    merged.netLabels.push(copy)
  }

  /* 6.  Keep auto-label counter in a consistent range            */
  merged["autoLabelCounter"] = Math.max(
    merged["autoLabelCounter"],
    circuit2["autoLabelCounter"],
  )

  /* 7.  Done                                                     */
  return merged
}
