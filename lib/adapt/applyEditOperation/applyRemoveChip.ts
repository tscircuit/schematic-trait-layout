import { isSamePortRef } from "lib/builder/isSamePortRef"
import type { RemoveChipOp } from "lib/adapt/EditOperation"
import type { CircuitBuilder } from "lib/builder"

export function applyRemoveChip(C: CircuitBuilder, op: RemoveChipOp) {
  const { chipId } = op
  /* 1. drop chip ---------------------------------------------------- */
  C.chips = C.chips.filter((c) => c.chipId !== chipId)

  /* 2. remove any artefact that references the chip ---------------- */
  const refBelongs = (ref: any) => "boxId" in ref && ref.boxId === chipId

  C.lines = C.lines.filter(
    (l) => !refBelongs(l.start.ref) && !refBelongs(l.end.ref),
  )
  C.connectionPoints = C.connectionPoints.filter((cp) => !refBelongs(cp.ref))
  C.netLabels = C.netLabels.filter((nl) => !refBelongs(nl.fromRef))
}
