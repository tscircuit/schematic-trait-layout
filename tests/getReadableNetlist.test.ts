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
  U2.pin(4).line(2, 0).mark("m2").line(0, 4).label()
  U2.fromMark("m2").line(0, -2).passive().line(0, -2).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
               L       L
       ┌───┐   │       │
    L──┤1 6├───┘       │
       │2 5├──┐  ┌───┐ │
     ┌─┤3 4├┐ └──┤1 4├─┤
     │ └───┘│  ┌─┤2 3│ │
     L      L  L └───┘ P
                       │
                       L
    "
  `)

  expect(getReadableNetlist(C.getNetlist())).toMatchInlineSnapshot(`
    "Boxes:
      - Box ID: chip0
        Type: L:3 R:3 T:0 B:0
                        ┌────────────────┐
                L3 ──  1│                │6  ── L1        
                       2│     chip0      │5  ── chip1.1   
                L4 ──  3│                │4  ── L2        
                        └────────────────┘
      - Box ID: chip1
        Type: L:2 R:2 T:0 B:0
                        ┌────────────────┐
           chip0.5 ──  1│     chip1      │4  ── ...       
                L5 ──  2│                │3               
                        └────────────────┘
      - Box ID: passive1
        Type: L:0 R:0 T:1 B:1
                               ...       
                                │        
                                2        
                        ┌────────────────┐
                        │    passive1    │                
                        └────────────────┘
                                1        
                                │        
                                L7       

    Complex Connections (more than 2 points):
      - Connection 1:
        - Box Pin: chip1, Pin 4
        - Net: L6
        - Box Pin: passive1, Pin 2"
    `)
})
