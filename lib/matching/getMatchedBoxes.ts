import type { NormalizedNetlist } from "lib/scoring/types"
import type { MatchingIssue } from "./types"
import { computeSimilarityDistanceFromIssues } from "./computeSimilarityDistanceFromIssues"
import { getIssuesForMatchedBoxes } from "./getIssuesForMatchedBoxes"

export interface MatchedBox {
  targetBoxIndex: number
  candidateBoxIndex: number
  issues: MatchingIssue[]
  score: number
}

export function getMatchedBoxes(params: {
  candidateNetlist: NormalizedNetlist
  targetNetlist: NormalizedNetlist
}): MatchedBox[] {
  const { candidateNetlist, targetNetlist } = params
  const matchedBoxes: MatchedBox[] = []

  const usedCandidateBoxes = new Set<number>()

  // Normalized boxes are sorted by size, so we're starting with the largest box
  // and working our way down to the smallest box.
  for (
    let targetBoxIndex = 0;
    targetBoxIndex < targetNetlist.boxes.length;
    targetBoxIndex++
  ) {
    const pairingResult: Map<
      { targetBoxIndex: number; candidateBoxIndex: number },
      { issues: MatchingIssue[]; similarityDistance: number }
    > = new Map()

    for (
      let candidateBoxIndex = 0;
      candidateBoxIndex < candidateNetlist.boxes.length;
      candidateBoxIndex++
    ) {
      if (usedCandidateBoxes.has(candidateBoxIndex)) {
        continue
      }

      const issues = getIssuesForMatchedBoxes({
        candidateNetlist,
        targetNetlist,
        candidateBoxIndex,
        targetBoxIndex,
      })

      // TODO go through the matched boxes, if the candidate box is supposed to
      // share a net with one of the matched boxes but doesn't, that's an issue!

      pairingResult.set(
        { targetBoxIndex, candidateBoxIndex },
        {
          issues,
          similarityDistance: computeSimilarityDistanceFromIssues(issues),
        },
      )
    }

    // Find the best pairing (lowest score)
    let bestPairing: {
      targetBoxIndex: number
      candidateBoxIndex: number
    } | null = null
    let bestScore = Infinity

    for (const [
      pairing,
      { similarityDistance: score },
    ] of pairingResult.entries()) {
      if (score < bestScore) {
        bestScore = score
        bestPairing = pairing
      }
    }

    // If we found a valid pairing, mark the candidate box as used and add to matched boxes
    if (bestPairing) {
      const { candidateBoxIndex } = bestPairing
      const { issues, similarityDistance: score } =
        pairingResult.get(bestPairing)!

      // Mark the candidate box as used
      usedCandidateBoxes.add(candidateBoxIndex)

      // Add the matched box to the list
      matchedBoxes.push({
        targetBoxIndex,
        candidateBoxIndex,
        issues,
        score,
      })
    }
  }

  return matchedBoxes
}
