import { test, expect } from "bun:test"
import { circuit } from "lib/builder/legacy-circuit"
import { findBestMatch } from "lib/scoring/findBestMatch"
import type { InputNetlist } from "lib/input-types"

test("findBestMatch should find a compatible template and snapshot it", () => {
  // 1. Construct an input netlist using the circuit builder
  const inputCircuit = circuit()
  const u1 = inputCircuit.chip().leftpins(3) // chip0, global pin 1 is right pin 1
  u1.pin(1).line(-5, 0).mark("m1").line(0, -2).passive().line(0, -2).label() // Connects chip0.pin(1) to net "SignalOut"
  u1.fromMark("m1").line(-3, 0).label()
  u1.pin(2).line(-2, 0).label()

  expect(`\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
            ┌───┐
    L──┬────┤1  │
       │  L─┤2  │
       P    │3  │
       │    └───┘
       L
    "
  `)

  // 2. Find the best match against all templates
  const bestMatchCircuit = findBestMatch(inputCircuit.getNetlist())

  // 3. Assert that a match was found
  expect(bestMatchCircuit).not.toBeNull()

  // 4. Take an inline snapshot of the matched template's string representation
  // This input is designed to match template1.
  expect(`\n${bestMatchCircuit!.toString()}\n`).toMatchInlineSnapshot(`
    "
    L
    │   ┌───┐
    ├───┤1  │
    │ L─┤2  │
    P  ┌┤3  │
    │  │└───┘
    L  L
    "
  `)
})
