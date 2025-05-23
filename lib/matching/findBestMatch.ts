import type { CircuitBuilder } from "lib/builder"
import type { InputNetlist } from "lib/input-types"
import { getMatchingIssues } from "./getMatchingIssues"

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
      candidateNetlist: template.getNetlist(),
      targetNetlist: inputNetlist,
    })

    const similarityDistance = computeSimilarityDistanceFromIssues(issues)

    results.push({
      template,
      similarityDistance,
    })
  }

  // TODO find the lowest similarity distance

  // TODO return the template with the lowest similarity distance
}
