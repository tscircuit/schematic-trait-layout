import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { mergeCircuits } from "lib/expanding/mergeCircuits"

test("mergeCircuits1", () => {
  const C1 = new CircuitBuilder()
  const U1 = C1.chip().rightpins(2)
  U1.pin(1).line(4, 0).label()
  U1.pin(2).line(4, 0).label()

  const C2 = new CircuitBuilder()
  const U2 = C2.chip().leftpins(2)
  U2.pin(1).line(-8, 0).line(0, -2).passive().line(0, -2).label()
  U2.pin(2).line(-3, 0).line(0, -2).label()

  expect(`\n${C1.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    │  2├───L
    │  1├───L
    └───┘
    "
  `)
  expect(`\n${C2.toString()}\n`).toMatchInlineSnapshot(`
    "
            ┌───┐
    ┌───────┤1  │
    │    ┌──┤2  │
    P    │  └───┘
    │    L
    L
    "
  `)

  const mergedCircuit = mergeCircuits({
    circuit1: C1,
    circuit2: C2,
    circuit1ChipId: U1.chipId,
    circuit2ChipId: U2.chipId,
  })

  expect(`\n${mergedCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
             ┌───┐
     ┌───────┤1 4├───L
     │    ┌──┤2 3├───L
     P    │  └───┘
     │    L
     L
    "
  `)
})
