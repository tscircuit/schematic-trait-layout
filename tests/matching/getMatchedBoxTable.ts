import type { MatchedBox } from "lib/matching/types"
import type { NormalizationTransform } from "lib/scoring/normalizeNetlist"
/**
 * Returns an array of objects that can be used with console.table() to display a table of matched boxes.
 */
export function getMatchedBoxTable(params: {
  matchedBoxes: MatchedBox[]
  candidateTransform: NormalizationTransform
  targetTransform: NormalizationTransform
}): Array<{
  cbi: number
  tbi: number
  cbox: string
  tbox: string
  score: number
  issues: number
}> {
  const { matchedBoxes, candidateTransform, targetTransform } = params

  return matchedBoxes.map((mb) => {
    return {
      cbi: mb.candidateBoxIndex,
      tbi: mb.targetBoxIndex,
      cbox: Object.entries(candidateTransform.boxIdToBoxIndex).find(
        ([_, boxIndex]) => boxIndex === mb.candidateBoxIndex,
      )?.[0]!,
      tbox: Object.entries(targetTransform.boxIdToBoxIndex).find(
        ([_, boxIndex]) => boxIndex === mb.targetBoxIndex,
      )?.[0]!,
      score: mb.score,
      issues: mb.issues.length,
    }
  })
}
