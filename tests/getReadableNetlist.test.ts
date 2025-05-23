import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { getReadableNetlist } from "lib/netlist/getReadableNetlist"

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
        U1     A       F
       ┌───┐   │       │
    C──┤1 6├───┘  U2   │
       ┤2 5├──┐  ┌───┐ │
     ┌─┤3 4├┐ └──┤1 4├─┤
     │ └───┘│  ┌─┤2 3├ │
     D      B  E └───┘ R3
                       │
                       G
    "
  `)

  expect(getReadableNetlist(C.getNetlist())).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
               C ──  1│                │6  ── A         
                     2│       U1       │5  ── U2.1      
               D ──  3│                │4  ── B         
                      └────────────────┘


                      ┌────────────────┐
            U1.5 ──  1│       U2       │4  ── ...       
               E ──  2│                │3               
                      └────────────────┘


                             ...       
                              │        
                              2        
                      ┌────────────────┐
                      │       R3       │                
                      └────────────────┘
                              1        
                              │        
                              G        

    Complex Connections (more than 2 points):
      - Connection 1:
        - Box Pin: U2, Pin 4
        - Net: F
        - Box Pin: R3, Pin 2"
    `)
})
