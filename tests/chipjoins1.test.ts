import { test, expect } from "bun:test"
import { circuit } from "lib/builder"

test("chipjoins1", () => {
  const C = circuit()
  const U1 = C.chip().leftpins(3).rightpins(3)
  const U2 = C.chip().leftpins(2).rightpins(2).at(10, -1)

  U1.pin(6).line(4, 0).mark("m1").line(0, 2).label()

  U1.pin(5).line(3, 0).connect()
  U1.pin(4).line(1, 0).line(0, -2).label()

  U1.pin(1).line(-3, 0).label()
  U1.pin(3).line(-2, 0).line(0, -2).label()

  U2.pin(1).line(-3, 0).line(0, 1).connect()
  U2.pin(2).line(-2, 0).line(0, -1).label()
  U2.pin(4).line(2, 0).line(0, 4).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
               L       L
       ┌───┐   │       │
    L──┤1 6├───┘       │
       ┤2 5├──┐  ┌───┐ │
     ┌─┤3 4├┐ └──┤1 4├─┘
     │ └───┘│  ┌─┤2 3├
     L      L  L └───┘
    "
  `)
})
