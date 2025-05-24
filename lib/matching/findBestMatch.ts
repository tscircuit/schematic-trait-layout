import type { CircuitBuilder } from "lib/builder"
import type { InputNetlist } from "lib/input-types"
import { getMatchingIssues } from "./getMatchingIssues"
import { computeSimilarityDistanceFromIssues } from "./computeSimilarityDistanceFromIssues"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"

export const findBestMatch = (
  inputNetlist: InputNetlist,
  templates: Array<CircuitBuilder>,
): CircuitBuilder | null => {
  const results: Array<{
    template: CircuitBuilder
    similarityDistance: number
  }> = []

  for (const template of templates) {
    const issues = getMatchingIssues({
      candidateNetlist: normalizeNetlist(template.getNetlist())
        .normalizedNetlist,
      targetNetlist: normalizeNetlist(inputNetlist).normalizedNetlist,
    })

    const similarityDistance = computeSimilarityDistanceFromIssues(issues)

    results.push({
      template,
      similarityDistance,
    })
  }

  if (results.length === 0) {
    return null
  }

  let bestMatch = results[0]!
  for (let i = 1; i < results.length; i++) {
    if (results[i]!.similarityDistance < bestMatch.similarityDistance) {
      bestMatch = results[i]!
    }
  }

  // If all similarity distances are Infinity, it means no suitable match was found.
  // This check depends on how computeSimilarityDistanceFromIssues handles "no match".
  // Assuming lower is better and a valid match has a finite distance.
  if (bestMatch.similarityDistance === Infinity) {
    return null
  }

  return bestMatch.template
}
