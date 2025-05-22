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
            ┌───┐
    ├───────┤1 4├───L
    │    ┌──┤2 3├───L
    P    │  └───┘
    │    L
    L
    "
  `)
  expect(C.getNetlist()).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxId": "chip0",
          "leftPinCount": 2,
          "rightPinCount": 2,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 1,
          "boxId": "passive1",
          "leftPinCount": 0,
          "rightPinCount": 0,
          "topPinCount": 1,
        },
      ],
      "connections": [
        {
          "connectedPorts": [
            {
              "boxId": "passive1",
              "pinNumber": 1,
            },
            {
              "netId": "L1",
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
              "netId": "L2",
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
              "netId": "L3",
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
              "netId": "L4",
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "chip0",
              "pinNumber": 1,
            },
            {
              "boxId": "passive1",
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
      ],
    }
  `)

  expect(getNetlistAsReadableTree(C.getNetlist())).toMatchInlineSnapshot(`
    "chip0 (Box #0)
      pin1
        passive1.pin2 (Box #1)
      pin2
        L2 (Net #3)
      pin3
        L3 (Net #4)
      pin4
        L4 (Net #5)
    passive1 (Box #1)
      pin1
        L1 (Net #2)
      pin2
        chip0.pin1 (Box #0)"
  `)
})
