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
          L
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
          "boxId": "chip0",
          "leftPinCount": 0,
          "rightPinCount": 7,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 0,
          "boxId": "passive1",
          "leftPinCount": 1,
          "rightPinCount": 1,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 0,
          "boxId": "passive2",
          "leftPinCount": 1,
          "rightPinCount": 1,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 1,
          "boxId": "passive3",
          "leftPinCount": 0,
          "rightPinCount": 0,
          "topPinCount": 1,
        },
        {
          "bottomPinCount": 1,
          "boxId": "passive4",
          "leftPinCount": 0,
          "rightPinCount": 0,
          "topPinCount": 1,
        },
      ],
      "connections": [
        {
          "connectedPorts": [
            {
              "boxId": "chip0",
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
              "boxId": "passive1",
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
              "boxId": "passive2",
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
              "boxId": "passive3",
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
              "boxId": "passive4",
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
              "boxId": "chip0",
              "pinNumber": 2,
            },
            {
              "netId": "L6",
            },
            {
              "boxId": "chip0",
              "pinNumber": 1,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "chip0",
              "pinNumber": 6,
            },
            {
              "boxId": "passive1",
              "pinNumber": 1,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "chip0",
              "pinNumber": 5,
            },
            {
              "boxId": "passive2",
              "pinNumber": 1,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "chip0",
              "pinNumber": 4,
            },
            {
              "boxId": "passive3",
              "pinNumber": 2,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "chip0",
              "pinNumber": 3,
            },
            {
              "boxId": "passive4",
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
    "chip0 (Box #0)
      pin1
        chip0.pin2 (Box #0)
        L6 (Net #1)
      pin2
        L6 (Net #1)
        chip0.pin1 (Box #0)
      pin3
        passive4.pin2 (Box #2)
      pin4
        passive3.pin2 (Box #4)
      pin5
        passive2.pin1 (Box #6)
      pin6
        passive1.pin1 (Box #8)
      pin7
        L1 (Net #10)
    passive4 (Box #2)
      pin1
        L5 (Net #3)
      pin2
        chip0.pin3 (Box #0)
    passive3 (Box #4)
      pin1
        L4 (Net #5)
      pin2
        chip0.pin4 (Box #0)
    passive2 (Box #6)
      pin1
        chip0.pin5 (Box #0)
      pin2
        L3 (Net #7)
    passive1 (Box #8)
      pin1
        chip0.pin6 (Box #0)
      pin2
        L2 (Net #9)"
  `)
})
