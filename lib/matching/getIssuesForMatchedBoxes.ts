import type { NormalizedNetlist } from "lib/scoring/types"
import type { MatchingIssue } from "./types"
import { findAllMatchedPinOutOfPlace } from "./matched-box-issue-finders/findAllMatchedPinOutOfPlace"
import { findAllMatchedBoxMissingPinShape } from "./matched-box-issue-finders/findAllMatchedBoxMissingPinShape"
import { findAllSideHasWrongPinCount } from "./matched-box-issue-finders/findAllSideHasWrongPinCount"

const MATCHED_BOX_ISSUE_FINDERS = [
  findAllSideHasWrongPinCount,
  findAllMatchedPinOutOfPlace,
  findAllMatchedBoxMissingPinShape,
] as const

export function getIssuesForMatchedBoxes(params: {
  candidateNetlist: NormalizedNetlist
  targetNetlist: NormalizedNetlist
  candidateBoxIndex: number
  targetBoxIndex: number
}): MatchingIssue[] {
  const issues: MatchingIssue[] = []
  for (const finder of MATCHED_BOX_ISSUE_FINDERS) {
    issues.push(...finder(params))
  }
  return issues
}
