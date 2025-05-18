import { circuit } from "lib/builder"
import { test, expect } from "bun:test"

test("clone", () => {
  const C = circuit()
  const U1 = C.chip().leftpins(3).rightpins(3)

  U1.pin(6).line(4, 0).mark("m1").line(0, 2).label()
  U1.fromMark("m1").line(0, -2).passive().line(0, -2).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
            L
    ┌───┐   │
    ┤1 6├───┤
    ┤2 5├   │
    ┤3 4├   P
    └───┘   │
            L
    "
  `)

  const C2 = C.clone()

  expect(`\n${C2.toString()}\n`).toMatchInlineSnapshot(`
    "
            L
    ┌───┐   │
    ┤1 6├───┤
    ┤2 5├   │
    ┤3 4├   P
    └───┘   │
            L
    "
  `)
})
