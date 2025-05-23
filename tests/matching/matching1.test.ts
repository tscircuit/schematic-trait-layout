import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { findBestMatch } from "lib/matching/findBestMatch"
import type { InputNetlist } from "lib/input-types"
import { TEMPLATE_FNS } from "templates/index"
import { getMatchingIssues } from "lib/matching/getMatchingIssues"
import template3 from "templates/template3"
import template4 from "templates/template4"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"

test("findBestMatch should find a compatible template and snapshot it", () => {
  // 1. Construct an input netlist using the circuit builder
  const inputCircuit = circuit()
  const u1 = inputCircuit.chip().rightpins(3) // chip0, global pin 1 is right pin 1
  u1.pin(3).line(5, 0).mark("m1").line(0, -2).passive().line(0, -2).label() // Connects chip0.pin(1) to net "SignalOut"
  u1.fromMark("m1").line(3, 0).label()
  u1.pin(2).line(2, 0).label()

  expect(`\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐
    │  3├────┼──B
    │  2├─C  │
    │  1├    R2
    └───┘    │
             A
    "
  `)

  expect(`\n${template3().toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐      A
    │  3├───●──┤
    │  2├─┐ │  │
    │  1├┐│ R3 R2
    └───┘│└─┘  │
         │     │
         C     B
    "
  `)
  expect(`\n${template4().toString()}\n`).toMatchInlineSnapshot(`
    "
     U1     A
    ┌───┐   │
    │  3├───┤
    │  2├─C │
    │  1├┐  R2
    └───┘│  │
         D  B
    "
  `)

  // Matching issues
  expect(
    getMatchingIssues({
      targetNetlist: normalizeNetlist(inputCircuit.getNetlist())
        .normalizedNetlist,
      candidateNetlist: normalizeNetlist(template3().getNetlist())
        .normalizedNetlist,
    }),
  ).toMatchInlineSnapshot(`
    [
      {
        "candidateBoxIndex": 0,
        "targetBoxIndex": 0,
        "targetPinNumber": 1,
        "targetPinShapeSignature": "L0B0R1T0|C",
        "type": "matched_box_missing_pin_shape",
      },
    ]
  `)
  expect(
    getMatchingIssues({
      targetNetlist: normalizeNetlist(inputCircuit.getNetlist())
        .normalizedNetlist,
      candidateNetlist: normalizeNetlist(template4().getNetlist())
        .normalizedNetlist,
    }),
  ).toMatchInlineSnapshot(`
    [
      {
        "candidateBoxIndex": 0,
        "targetBoxIndex": 0,
        "targetPinNumber": 1,
        "targetPinShapeSignature": "L0B0R1T0|C",
        "type": "matched_box_missing_pin_shape",
      },
    ]
  `)

  // 2. Find the best match against all templates
  const bestMatchCircuit = findBestMatch(
    inputCircuit.getNetlist(),
    TEMPLATE_FNS.map((fn) => fn()),
  )

  // 3. Assert that a match was found
  expect(bestMatchCircuit).not.toBeNull()

  // 4. Take an inline snapshot of the matched template's string representation
  // This input is designed to match template1.
  // TODO this is incorrect, template4 is a better match than template3
  expect(`\n${bestMatchCircuit!.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐      A
    │  3├───●──┤
    │  2├─┐ │  │
    │  1├┐│ R3 R2
    └───┘│└─┘  │
         │     │
         C     B
    "
  `)
})
