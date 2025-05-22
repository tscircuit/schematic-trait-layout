import type { NormalizedNetlist } from "lib/scoring/types"
import type { NoBoxMatchingPinCounts } from "../types"

export function findAllMatchedBoxMissingPinShape(params: {
  candidateNetlist: NormalizedNetlist
  targetNetlist: NormalizedNetlist
  candidateBoxIndex: number
  targetBoxIndex: number
}): NoBoxMatchingPinCounts[] {
  // TODO
  return []
}
