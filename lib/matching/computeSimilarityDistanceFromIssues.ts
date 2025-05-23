import type { MatchingIssue } from "./types"

/**
 * Compute a score that is high if the issues imply the netlists are very different
 *
 * This score is used to compare different netlist pairings to determine how
 * similar or different they are
 */
export function computeSimilarityDistanceFromIssues(
  issues: MatchingIssue[],
): number {
  // TODO
  return issues.length
}
