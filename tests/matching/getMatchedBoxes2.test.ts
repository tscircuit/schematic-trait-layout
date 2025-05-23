import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { getMatchedBoxes } from "lib/matching/getMatchedBoxes"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"
import type { InputNetlist } from "lib/input-types"
import { getMatchedBoxTable } from "./getMatchedBoxTable"
import { getMatchedBoxString } from "./getMatchedBoxString"

test("getMatchedBoxes with an extra unmatched candidate box", () => {
  const targetCircuit = circuit()
  targetCircuit.chip("T1").leftpins(1) // chip0

  expect(`\n${targetCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
     T1
    ┌───┐
    ┤1  │
    └───┘
    "
  `)

  const candidateCircuit = circuit()
  candidateCircuit.chip("C1").leftpins(1) // chip0 - should match
  candidateCircuit.chip("C2").at(0, 3).rightpins(2) // chip1 - extra

  expect(`\n${candidateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
     C2
    ┌───┐
    │  2├
    │  1├
    └───┘
    ┌───┐
    ┤1  │
    └───┘
    "
  `)

  const { normalizedNetlist: normTarget, transform: targetTransform } =
    normalizeNetlist(targetCircuit.getNetlist())
  const { normalizedNetlist: normCandidate, transform: candidateTransform } =
    normalizeNetlist(candidateCircuit.getNetlist())

  const matchedBoxes = getMatchedBoxes({
    candidateNetlist: normCandidate,
    targetNetlist: normTarget,
  })

  expect(matchedBoxes).toMatchInlineSnapshot(`
    [
      {
        "candidateBoxIndex": 1,
        "issues": [],
        "score": 0,
        "targetBoxIndex": 0,
      },
    ]
  `)
  expect(
    getMatchedBoxString({
      matchedBoxes,
      candidateTransform,
      targetTransform,
    }),
  ).toMatchInlineSnapshot(`
    "
    cand       target
    C1       → T1
    "
  `)
  expect(matchedBoxes.length).toBe(1)
})
