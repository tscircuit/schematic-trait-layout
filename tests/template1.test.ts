import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { getNetlistAsReadableTree } from "lib/netlist/getNetlistAsReadableTree"

test("template1", () => {
  const C = circuit()
  const U1 = C.chip().leftpins(2).rightpins(2)
  U1.pin(1).line(-8, 0).line(0, -2).passive().line(0, -2).label()
  U1.pin(2).line(-3, 0).line(0, -2).label()
  U1.pin(3).line(4, 0).label()
  U1.pin(4).line(4, 0).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
               -5.0         0.0         5.0      
     1.0                  U1
     0.8                 ┌──┐
     0.6                 │  │
     0.4 ┌───────────────┤1 4├   ────────D
     0.2 │         ┌─────┤2 3├   ────────C
     0.0 │         │     └──┘
    -0.2 │         │
    -0.4 │         │
    -0.6 │         │
    -0.8 │         │
    -1.0 │         │
    -1.2 │         │
    -1.4 │         │
    -1.6 │         │
    -1.8           B
    -2.0 R2
    -2.2
    -2.4
    -2.6 │
    -2.8 │
    -3.0 │
    -3.2 │
    -3.4 │
    -3.6 │
    -3.8 │
    -4.0 │
    -4.2 │
    -4.4 │
    -4.6 A
    "
  `)
  expect(C.getReadableNetlist()).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
             ... ──  1│       U1       │4  ── D         
               B ──  2│                │3  ── C         
                      └────────────────┘


                                       
                              │        
                              2        
                      ┌────────────────┐
                      │       R2       │                
                      └────────────────┘
                              1        
                              │        
                             ...       

    Complex Connections (more than 2 points):
      - Connection 1:
        - Box Pin: R2, Pin 1
        - Net: A
        - Box Pin: U1, Pin 1"
  `)
  expect(C.getNetlist()).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxId": "U1",
          "leftPinCount": 2,
          "rightPinCount": 2,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 1,
          "boxId": "R2",
          "leftPinCount": 0,
          "rightPinCount": 0,
          "topPinCount": 1,
        },
      ],
      "connections": [
        {
          "connectedPorts": [
            {
              "boxId": "R2",
              "pinNumber": 1,
            },
            {
              "netId": "A",
            },
            {
              "boxId": "U1",
              "pinNumber": 1,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "U1",
              "pinNumber": 2,
            },
            {
              "netId": "B",
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "U1",
              "pinNumber": 3,
            },
            {
              "netId": "C",
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "U1",
              "pinNumber": 4,
            },
            {
              "netId": "D",
            },
          ],
        },
      ],
      "nets": [
        {
          "netId": "A",
        },
        {
          "netId": "B",
        },
        {
          "netId": "C",
        },
        {
          "netId": "D",
        },
      ],
    }
  `)

  expect(getNetlistAsReadableTree(C.getNetlist())).toMatchInlineSnapshot(`
    "U1 (Box #0)
      pin1
        R2.pin1 (Box #2)
        A (Net #1)
      pin2
        B (Net #3)
      pin3
        C (Net #4)
      pin4
        D (Net #5)
    R2 (Box #2)
      pin1
        A (Net #1)
        U1.pin1 (Box #0)
      pin2"
  `)
})
