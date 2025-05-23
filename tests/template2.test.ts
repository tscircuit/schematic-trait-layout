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
     U1   A
    ┌───┐ │
    │  7├─┘┌─R2─B
    │  6├──┘
    │  5├────R3─C
    │  4├─────┤
    │  3├──┤  │
    │  2├┐ │  │
    │  1├● │  │
    └───┘│ R5 R4
         │ │  │
         F E  D
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
              "netId": "A",
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
              "netId": "B",
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
              "netId": "C",
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
              "netId": "D",
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
              "netId": "E",
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
              "netId": "F",
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
        {
          "netId": "E",
        },
        {
          "netId": "F",
        },
      ],
    }
  `)

  expect(getNetlistAsReadableTree(C.getNetlist())).toMatchInlineSnapshot(`
    "U1 (Box #0)
      pin1
        U1.pin2 (Box #0)
        F (Net #1)
      pin2
        F (Net #1)
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
        A (Net #10)
    R5 (Box #2)
      pin1
        E (Net #3)
      pin2
        U1.pin3 (Box #0)
    R4 (Box #4)
      pin1
        D (Net #5)
      pin2
        U1.pin4 (Box #0)
    R3 (Box #6)
      pin1
        U1.pin5 (Box #0)
      pin2
        C (Net #7)
    R2 (Box #8)
      pin1
        U1.pin6 (Box #0)
      pin2
        B (Net #9)"
  `)
})
