import type { NormalizedNetlist } from "lib/scoring/types"
import type { MatchingIssue } from "./types"

export function getIssuesForMatchedBoxes(params: {
  candidateNetlist: NormalizedNetlist
  targetNetlist: NormalizedNetlist
  candidateBoxIndex: number
  targetBoxIndex: number
}): MatchingIssue[] {
  // TODO
  return []
}
