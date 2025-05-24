import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { getMatchedBoxes } from "lib/matching/getMatchedBoxes"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"
import { getMatchedBoxString } from "./getMatchedBoxString"

test("getMatchedBoxes4 - match connected boxes properly", () => {
  // Create target circuit with 2 boxes that are connected
  const targetCircuit = circuit()
  const T1 = targetCircuit.chip("T1").leftpins(1).rightpins(1)
  const T2 = targetCircuit.chip("T2").leftpins(1).rightpins(1).at(6, 0)

  // Connect T1.pin(2) to T2.pin(1) via a net
  T1.pin(2).line(2, 0).connect()
  T2.pin(1).line(-2, 0).connect()

  // Create candidate circuit with 2 boxes that are also connected
  const candidateCircuit = circuit()
  const C0 = candidateCircuit.chip("C3").leftpins(1).rightpins(1).at(0, 5)
  const C1 = candidateCircuit.chip("C1").leftpins(1).rightpins(1)
  const C2 = candidateCircuit.chip("C2").leftpins(1).rightpins(1).at(6, 0)
  const C3 = candidateCircuit.chip("C3").leftpins(1).rightpins(1).at(0, -5)

  // Connect C1.pin(2) to C2.pin(1) via a net
  C1.pin(2).line(2, 0).connect()
  C2.pin(1).line(-2, 0).connect()

  expect(`\n${targetCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
     T1    T2
    ┌───┐ ┌───┐
    ┤1 2├─┤1 2├
    └───┘ └───┘
    "
  `)

  expect(`\n${candidateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
     C3
    ┌───┐
    ┤1 2├
    └───┘

     C1    C2
    ┌───┐ ┌───┐
    ┤1 2├─┤1 2├
    └───┘ └───┘

     C3
    ┌───┐
    ┤1 2├
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

  // Check that we have matched boxes without connection issues
  expect(matchedBoxes.length).toBe(2)

  // Look for missing connection issues - should be none since both circuits have the same connection
  const connectionIssues = matchedBoxes.flatMap((mb) =>
    mb.issues.filter(
      (issue) => issue.type === "missing_connection_between_boxes",
    ),
  )

  expect(connectionIssues.length).toBe(0)

  // Snapshot the matching results
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
    C2       → T2
    "
  `)
})
