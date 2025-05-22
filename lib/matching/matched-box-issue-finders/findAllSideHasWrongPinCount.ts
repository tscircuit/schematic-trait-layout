import type { NormalizedNetlist } from "lib/scoring/types"
import type {
  MatchedBoxSideHasWrongPinCount,
  NoBoxMatchingPinCounts,
} from "../types"
import { SIDES_CCW } from "lib/builder"

export function findAllSideHasWrongPinCount(params: {
  candidateNetlist: NormalizedNetlist
  targetNetlist: NormalizedNetlist
  candidateBoxIndex: number
  targetBoxIndex: number
}): MatchedBoxSideHasWrongPinCount[] {
  const candidateBox = params.candidateNetlist.boxes[params.candidateBoxIndex]!
  const targetBox = params.targetNetlist.boxes[params.targetBoxIndex]!
  const issues: MatchedBoxSideHasWrongPinCount[] = []
  for (const side of SIDES_CCW) {
    const candidatePinCount = candidateBox[`${side}PinCount`] ?? 0
    const targetPinCount = targetBox[`${side}PinCount`] ?? 0
    if (candidatePinCount !== targetPinCount) {
      issues.push({
        type: "matched_box_side_has_wrong_pin_count",
        candidateBoxIndex: params.candidateBoxIndex,
        targetBoxIndex: params.targetBoxIndex,
      })
    }
  }
  return issues
}
