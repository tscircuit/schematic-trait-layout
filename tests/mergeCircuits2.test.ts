import { test, expect } from "bun:test"
import circuit, { CircuitBuilder } from "lib/builder"
import { mergeCircuits } from "lib/expanding/mergeCircuits"

test("mergeCircuits2", () => {
  const T1 = circuit()
  const T1_U1 = T1.chip().leftpins(2)
  T1_U1.pin(1).line(-2, 0).label()
  T1_U1.pin(2).line(-2, 0).label()

  expect(`\n${T1.toString()}\n`).toMatchInlineSnapshot(`
    "
      ┌───┐
    L─┤1  │
    L─┤2  │
      └───┘
    "
  `)

  const T1_flipped = T1.clone().flipX()

  expect(`\n${T1_flipped.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    │  1├─L
    │  2├─L
    └───┘
    "
  `)

  const merged = mergeCircuits({
    circuit1: T1,
    circuit2: T1_flipped,
    circuit1ChipId: T1_U1.chipId,
    circuit2ChipId: T1_U1.chipId,
  })

  expect(`\n${merged.toString()}\n`).toMatchInlineSnapshot(`
    "
      ┌───┐
    L─┤1 4├─L
    L─┤2 3├─L
      └───┘
    "
  `)
})
