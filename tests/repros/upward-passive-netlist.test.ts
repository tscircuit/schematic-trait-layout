import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"

test("upward-passive-netlist", () => {
  const C = new CircuitBuilder()

  const U1 = C.chip().rightpins(2).leftpins(2)

  U1.pin(3).line(2, 0).line(0, 2).passive().line(0, 2).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
          A
          │
     U1   │
    ┌───┐ R2
    ┤1 2├ │
    ┤2 1├─┘
    └───┘
    "
  `)

  expect(C.getReadableNetlist()).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
            R2.2 ──  1│       U1       │4               
                     2│                │3               
                      └────────────────┘


                             U1.1      
                              │        
                              2        
                      ┌────────────────┐
                      │       R2       │                
                      └────────────────┘
                              1        
                              │        
                              A        

    Complex Connections (more than 2 points):
      (none)"
  `)
})
