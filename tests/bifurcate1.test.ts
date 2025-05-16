import { test, expect } from "bun:test"
import { circuit } from "lib/builder"

test("bifurcate1", () => {
  const C = circuit()
  const U1 = C.chip().leftpins(3).rightpins(3)

  U1.pin(4).line(4, 0).mark("m1").line(0, 2).label()
  U1.fromMark("m1").line(0, -2).passive().line(0, -2).label()

  U1.pin(5).line(2, 0).label()
  U1.pin(6).line(1, 0).line(0, -2).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    │1 6├┐  L
    │2 5├┼L │
    │3 4├L──┤
    └───┘   │
            P
            │
            L
    "
  `)
})
