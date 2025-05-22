import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { getMatchedBoxes } from "lib/matching/getMatchedBoxes"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"
import type { InputNetlist } from "lib/input-types"

test("getMatchedBoxes with an extra unmatched target box", () => {
  const targetCircuit = circuit()
  targetCircuit.chip().leftpins(1) // chip0
  targetCircuit.chip().rightpins(2) // chip1 - extra

  const candidateCircuit = circuit()
  candidateCircuit.chip().leftpins(1) // chip0 - should match chip0 from target

  const { normalizedNetlist: normTarget } = normalizeNetlist(
    targetCircuit.getNetlist(),
  )
  const { normalizedNetlist: normCandidate } = normalizeNetlist(
    candidateCircuit.getNetlist(),
  )

  const matchedBoxes = getMatchedBoxes({
    candidateNetlist: normCandidate,
    targetNetlist: normTarget,
  })

  // targetNetlist.boxes[1] (the larger one) will be iterated first by getMatchedBoxes
  // if normalizeNetlist sorts it to be targetBoxIndex 0.
  // Let's check the normalization:
  // Target: chip0 (1 pin), chip1 (2 pins). DFS might start with chip1.
  // If chip1 (2 pins) becomes targetBoxIndex 0, it won't find a match in candidate (only 1-pin chip).
  // Then chip0 (1 pin) becomes targetBoxIndex 1, it will match candidate's chip0.
  // So, the result depends on the stable sorting of normalizeNetlist and how getMatchedBoxes handles unmatchable target boxes.
  // getMatchedBoxes only returns *successful* matches.

  // To make it predictable:
  // Target: chipBig (2 pins), chipSmall (1 pin)
  // Candidate: chipSmallCand (1 pin)
  // normTarget: chipBig (idx 0), chipSmall (idx 1)
  // normCand: chipSmallCand (idx 0)
  // Iteration 1: targetBoxIndex 0 (chipBig). Best match in candidate? None (chipSmallCand is too small or different). No match added.
  // Iteration 2: targetBoxIndex 1 (chipSmall). Best match in candidate? chipSmallCand. Match added.
  // Expected: one match for chipSmall.

  const predictableTarget = circuit()
  const ptChipBig = predictableTarget.chip().rightpins(2) // chip0
  const ptChipSmall = predictableTarget.chip().leftpins(1) // chip1

  const predictableCandidate = circuit()
  const pcChipSmall = predictableCandidate.chip().leftpins(1) // chip0

  const { normalizedNetlist: normPredTarget } = normalizeNetlist(
    predictableTarget.getNetlist(),
  )
  const { normalizedNetlist: normPredCandidate } = normalizeNetlist(
    predictableCandidate.getNetlist(),
  )

  const matchedBoxesPred = getMatchedBoxes({
    candidateNetlist: normPredCandidate,
    targetNetlist: normPredTarget,
  })

  // Assuming chipBig (2 pins) is targetBoxIndex 0, and chipSmall (1 pin) is targetBoxIndex 1
  // And pcChipSmall (1 pin) is candidateBoxIndex 0
  // Match should be: targetBoxIndex 1 (chipSmall) with candidateBoxIndex 0 (pcChipSmall)
  expect(matchedBoxesPred).toMatchInlineSnapshot(`
    [
      {
        "candidateBoxIndex": 0,
        "issues": [],
        "score": 0,
        "targetBoxIndex": 1,
      },
    ]
  `)
  expect(matchedBoxesPred.length).toBe(1)
})
