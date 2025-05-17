import { test, expect } from "bun:test"
import circuit from "lib/builder"
import { getReadableNetlist } from "lib/builder/getReadableNetlist"

test("getReadableNetlist", () => {
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

  expect(getReadableNetlist(C.getNetlist())).toMatchInlineSnapshot(`
    "Boxes:
      - Box ID: chip0, Pins: L:3 R:3 T:0 B:0
      - Box ID: chip1, Pins: L:2 R:2 T:0 B:0

    Nets:
      - Net ID: L1
      - Net ID: L2
      - Net ID: L3
      - Net ID: L4
      - Net ID: L5
      - Net ID: L6

    Connections:
      - Connection 1:
        - Box Pin: chip0, Pin 6
        - Net: L1
      - Connection 2:
        - Box Pin: chip0, Pin 4
        - Net: L2
      - Connection 3:
        - Box Pin: chip0, Pin 1
        - Net: L3
      - Connection 4:
        - Box Pin: chip0, Pin 3
        - Net: L4
      - Connection 5:
        - Box Pin: chip1, Pin 1
        - Box Pin: chip0, Pin 5
      - Connection 6:
        - Box Pin: chip1, Pin 2
        - Net: L5
      - Connection 7:
        - Box Pin: chip1, Pin 4
        - Net: L6"
  `)
})
