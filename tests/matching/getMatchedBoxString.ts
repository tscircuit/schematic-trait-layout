import type { MatchedBox } from "lib/matching/types"
import type { NormalizationTransform } from "lib/scoring/normalizeNetlist"
import { getMatchedBoxTable } from "./getMatchedBoxTable"

export function getMatchedBoxString(params: {
  matchedBoxes: MatchedBox[]
  candidateTransform: NormalizationTransform
  targetTransform: NormalizationTransform
}): string {
  return `\ncand       target\n${getMatchedBoxTable(params)
    .map((r) => `${r.cbox.padEnd(8)} → ${r.tbox}`)
    .join("\n")}\n`
}
