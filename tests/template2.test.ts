import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { getNetlistAsReadableTree } from "lib/netlist/getNetlistAsReadableTree"

test("template2", () => {
  const C = circuit()
  const U1 = C.chip().rightpins(7)

  U1.pin(7).line(2, 0).line(0, 2).label()
  U1.pin(6).line(3, 0).line(0, 1).line(2, 0).passive().line(2, 0).label()
  U1.pin(5).line(5, 0).passive().line(2, 0).label()
  U1.pin(4).line(6, 0).line(0, -4).passive().line(0, -2).label()
  U1.pin(3).line(3, 0).line(0, -3).passive().line(0, -2).label()
  U1.pin(2).line(1, 0).line(0, -4).label() // Default label "L"

  // Pin 7 connects to the horizontal segment of Pin 6's trace
  U1.pin(1).line(1, 0).intersect()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1   L
    ┌───┐ │
    │  7├─┘┌─P──L
    │  6├──┘
    │  5├────P──L
    │  4├─────┤
    │  3├──┤  │
    │  2├┐ │  │
    │  1├● │  │
    └───┘│ P  P
         │ │  │
         L L  L
    "
  `)
  expect(C.getNetlist()).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxId": "U1",
          "leftPinCount": 0,
          "rightPinCount": 7,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 0,
          "boxId": "R2",
          "leftPinCount": 1,
          "rightPinCount": 1,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 0,
          "boxId": "R3",
          "leftPinCount": 1,
          "rightPinCount": 1,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 1,
          "boxId": "R4",
          "leftPinCount": 0,
          "rightPinCount": 0,
          "topPinCount": 1,
        },
        {
          "bottomPinCount": 1,
          "boxId": "R5",
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
              "pinNumber": 7,
            },
            {
              "netId": "L1",
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "R2",
              "pinNumber": 2,
            },
            {
              "netId": "L2",
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "R3",
              "pinNumber": 2,
            },
            {
              "netId": "L3",
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "R4",
              "pinNumber": 1,
            },
            {
              "netId": "L4",
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "R5",
              "pinNumber": 1,
            },
            {
              "netId": "L5",
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
              "netId": "L6",
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
              "pinNumber": 6,
            },
            {
              "boxId": "R2",
              "pinNumber": 1,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "U1",
              "pinNumber": 5,
            },
            {
              "boxId": "R3",
              "pinNumber": 1,
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
              "boxId": "R4",
              "pinNumber": 2,
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
              "boxId": "R5",
              "pinNumber": 2,
            },
          ],
        },
      ],
      "nets": [
        {
          "netId": "L1",
        },
        {
          "netId": "L2",
        },
        {
          "netId": "L3",
        },
        {
          "netId": "L4",
        },
        {
          "netId": "L5",
        },
        {
          "netId": "L6",
        },
      ],
    }
  `)

  expect(getNetlistAsReadableTree(C.getNetlist())).toMatchInlineSnapshot(`
    "U1 (Box #0)
      pin1
        U1.pin2 (Box #0)
        L6 (Net #1)
      pin2
        L6 (Net #1)
        U1.pin1 (Box #0)
      pin3
        R5.pin2 (Box #2)
      pin4
        R4.pin2 (Box #4)
      pin5
        R3.pin1 (Box #6)
      pin6
        R2.pin1 (Box #8)
      pin7
        L1 (Net #10)
    R5 (Box #2)
      pin1
        L5 (Net #3)
      pin2
        U1.pin3 (Box #0)
    R4 (Box #4)
      pin1
        L4 (Net #5)
      pin2
        U1.pin4 (Box #0)
    R3 (Box #6)
      pin1
        U1.pin5 (Box #0)
      pin2
        L3 (Net #7)
    R2 (Box #8)
      pin1
        U1.pin6 (Box #0)
      pin2
        L2 (Net #9)"
  `)
})
