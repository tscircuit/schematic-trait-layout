import { test, expect } from "bun:test"
import { circuit } from "lib/builder"

test("flipX should flip the circuit horizontally", () => {
  const c = circuit()
  const u1 = c.chip().rightpins(2)
  u1.pin(2).line(2, 0).label("A")
  u1.pin(1).line(2, 0).label("B")

  expect(`\n${c.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    │  2├─A
    │  1├─B
    └───┘
    "
  `)

  c.flipX()

  // When we flip, the pins are renumbered to be CCW
  expect(`\n${c.toString()}\n`).toMatchInlineSnapshot(`
    "
      ┌───┐
    A─┤1  │
    B─┤2  │
      └───┘
    "
  `)
})
