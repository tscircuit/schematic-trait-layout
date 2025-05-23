import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { getMatchedBoxes } from "lib/matching/getMatchedBoxes"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"
import type { InputNetlist } from "lib/input-types"

test("getMatchedBoxes should correctly match boxes between two netlists", () => {
  // Define a target circuit with two chips
  const targetCircuit = circuit()
  const targetChip1 = targetCircuit.chip().at(0, 0).leftpins(2).rightpins(1) // chipId: "chip0", 3 pins
  const targetChip2 = targetCircuit.chip().at(0, 5).leftpins(1) // chipId: "chip1", 1 pin

  // Define a candidate circuit with two chips that should match the target ones
  // Note: chipC_Y is defined first but should match targetChip2
  // chipC_X should match targetChip1
  const candidateCircuit = circuit()
  const candidateChip_Y = candidateCircuit.chip().at(0, 0).leftpins(1) // chipId: "chip0", 1 pin (matches targetChip2)
  const candidateChip_X = candidateCircuit
    .chip()
    .at(0, 5)
    .leftpins(2)
    .rightpins(1) // chipId: "chip1", 3 pins (matches targetChip1)

  expect(`\n${targetCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
     U2
    ┌───┐
    ┤1  │
    └───┘
     U1
    ┌───┐
    ┤1  │
    ┤2 3├
    └───┘
    "
  `)
  expect(`\n${candidateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
     U2
    ┌───┐
    ┤1  │
    ┤2 3├
    └───┘

     U1
    ┌───┐
    ┤1  │
    └───┘
    "
  `)

  const targetNetlist: InputNetlist = targetCircuit.getNetlist()
  const candidateNetlist: InputNetlist = candidateCircuit.getNetlist()

  const { normalizedNetlist: normTarget, transform: targetTransform } =
    normalizeNetlist(targetNetlist)
  const { normalizedNetlist: normCandidate, transform: candidateTransform } =
    normalizeNetlist(candidateNetlist)

  expect(normTarget.boxes).toMatchInlineSnapshot(`
    [
      {
        "bottomPinCount": 0,
        "boxIndex": 0,
        "leftPinCount": 2,
        "rightPinCount": 1,
        "topPinCount": 0,
      },
      {
        "bottomPinCount": 0,
        "boxIndex": 1,
        "leftPinCount": 1,
        "rightPinCount": 0,
        "topPinCount": 0,
      },
    ]
  `)
  expect(normCandidate.boxes).toMatchInlineSnapshot(`
    [
      {
        "bottomPinCount": 0,
        "boxIndex": 0,
        "leftPinCount": 2,
        "rightPinCount": 1,
        "topPinCount": 0,
      },
      {
        "bottomPinCount": 0,
        "boxIndex": 1,
        "leftPinCount": 1,
        "rightPinCount": 0,
        "topPinCount": 0,
      },
    ]
  `)

  expect(normCandidate.boxes).toEqual(normTarget.boxes)

  const matchedBoxes = getMatchedBoxes({
    candidateNetlist: normCandidate,
    targetNetlist: normTarget,
  })

  expect(matchedBoxes).toMatchInlineSnapshot(`
    [
      {
        "candidateBoxIndex": 0,
        "issues": [],
        "score": 0,
        "targetBoxIndex": 0,
      },
      {
        "candidateBoxIndex": 1,
        "issues": [],
        "score": 0,
        "targetBoxIndex": 1,
      },
    ]
  `)
})
