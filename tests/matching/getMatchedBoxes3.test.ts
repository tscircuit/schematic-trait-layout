import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { getMatchedBoxes } from "lib/matching/getMatchedBoxes"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"
import type { InputNetlist } from "lib/input-types"
import { getMatchedBoxString } from "./getMatchedBoxString"

test("getMatchedBoxes3 - always match the largest target box first (even if it means throwing away a good match)", () => {
  const targetCircuit = circuit()
  targetCircuit.chip("T1").leftpins(1) // chip0
  targetCircuit.chip("T2").at(8, 0).rightpins(2) // chip1 - extra

  const candidateCircuit = circuit()
  candidateCircuit.chip("C1").leftpins(1) // chip0 - should match chip0 from target

  expect(`\n${targetCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
            ┌───┐
    ┌───┐   │  2├
    ┤1  │   │  1├
    └───┘   └───┘
    "
  `)

  expect(`\n${candidateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
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

  expect(
    getMatchedBoxString({
      matchedBoxes,
      candidateTransform,
      targetTransform,
    }),
  ).toMatchInlineSnapshot(`
    "
    cand       target
    C1       → T2
    "
  `)
})
