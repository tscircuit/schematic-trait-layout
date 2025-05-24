import { test, expect } from "bun:test"
import template3 from "../templates/template3"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"

test("template3", () => {
  const C = template3()
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐      A
    │  3├───●──┤
    │  2├─┐ │  │
    │  1├┐│ R3 R2
    └───┘│└─┘  │
         │     │
         C     B
    "
  `)
  expect(C.getNetlist()).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxId": "U1",
          "leftPinCount": 0,
          "rightPinCount": 3,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 1,
          "boxId": "R2",
          "leftPinCount": 0,
          "rightPinCount": 0,
          "topPinCount": 1,
        },
        {
          "bottomPinCount": 1,
          "boxId": "R3",
          "leftPinCount": 0,
          "rightPinCount": 0,
          "topPinCount": 1,
        },
      ],
      "connections": [
        {
          "connectedPorts": [
            {
              "boxId": "U1",
              "pinNumber": 3,
            },
            {
              "netId": "A",
            },
            {
              "boxId": "R2",
              "pinNumber": 2,
            },
            {
              "boxId": "R3",
              "pinNumber": 2,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "R2",
              "pinNumber": 1,
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
              "pinNumber": 1,
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
              "pinNumber": 2,
            },
            {
              "boxId": "R3",
              "pinNumber": 1,
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
      ],
    }
  `)
  expect(C.getReadableNetlist()).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
                      │                │3  ── ...       
                      │       U1       │2  ── R3.1      
                      │                │1  ── C         
                      └────────────────┘


                             ...       
                              │        
                              2        
                      ┌────────────────┐
                      │       R2       │                
                      └────────────────┘
                              1        
                              │        
                              B        


                             ...       
                              │        
                              2        
                      ┌────────────────┐
                      │       R3       │                
                      └────────────────┘
                              1        
                              │        
                             U1.2      

    Complex Connections (more than 2 points):
      - Connection 1:
        - Box Pin: U1, Pin 3
        - Net: A
        - Box Pin: R2, Pin 2
        - Box Pin: R3, Pin 2"
  `)
})
