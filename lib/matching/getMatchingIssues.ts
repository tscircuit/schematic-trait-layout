import type { NormalizedNetlist } from "lib/scoring/types"
import type { MatchingIssue } from "./types"
import { findAllNoBoxMatchingPinCounts } from "./netlist-issue-finders/findAllNoBoxMatchingPinCounts"
import { getIssuesForMatchedBoxes } from "./getIssuesForMatchedBoxes"
import { getMatchedBoxes } from "./getMatchedBoxes"

export function getMatchingIssues(params: {
  candidateNetlist: NormalizedNetlist
  targetNetlist: NormalizedNetlist
}): MatchingIssue[] {
  const { candidateNetlist, targetNetlist } = params
  const noBoxMatchingPinCounts = findAllNoBoxMatchingPinCounts({
    candidateNetlist,
    targetNetlist,
  })

  const matchedBoxes = getMatchedBoxes({
    candidateNetlist,
    targetNetlist,
  })

  return [
    ...noBoxMatchingPinCounts,
    ...matchedBoxes.flatMap((matchedBox) => matchedBox.issues),
  ]
}
