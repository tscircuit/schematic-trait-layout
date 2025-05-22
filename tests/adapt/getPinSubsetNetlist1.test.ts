import { test, expect } from "bun:test"
import { getPinSubsetNetlist } from "lib/adapt/getPinSubsetNetlist"
import { CircuitBuilder } from "lib/builder"
import { getNetlistAsReadableTree } from "lib/netlist/getNetlistAsReadableTree"
import { getReadableNetlist } from "lib/netlist/getReadableNetlist"

test("getPinSubsetNetlist1", () => {
  const C = new CircuitBuilder()

  const U1 = C.chip().leftpins(2).rightpins(2)

  U1.pin(1).line(-2, 0).label()
  U1.pin(2).line(-2, 0).passive().line(-2, 0).label()
  U1.pin(3).line(2, 0).mark("m1").line(2, 0).passive().line(2, 0).label()
  U1.fromMark("m1").line(0, -2).label()
  U1.pin(4).line(6, 0).line(0, -1).intersect()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
        ┌───┐
      L─┤1 4├─────┐
    L─P─┤2 3├─┬─P─●L
        └───┘ │
              L
    "
  `)

  expect(getReadableNetlist(C.getNetlist())).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
              L1 ──  1│     chip0      │4  ── ...       
      passive1.1 ──  2│                │3  ── ...       
                      └────────────────┘


                      ┌────────────────┐
         chip0.2 ──  1│    passive1    │2  ── L2        
                      └────────────────┘


                      ┌────────────────┐
             ... ──  1│    passive2    │2  ── ...       
                      └────────────────┘

    Complex Connections (more than 2 points):
      - Connection 1:
        - Box Pin: passive2, Pin 2
        - Net: L3
        - Box Pin: chip0, Pin 4
      - Connection 2:
        - Box Pin: chip0, Pin 3
        - Net: L4
        - Box Pin: passive2, Pin 1"
  `)

  expect(getNetlistAsReadableTree(C.getNetlist())).toMatchInlineSnapshot(`
    "chip0 (Box #0)
      pin1
        L1 (Net #1)
      pin2
        passive1.pin1 (Box #2)
      pin3
        L4 (Net #4)
        passive2.pin1 (Box #5)
      pin4
        passive2.pin2 (Box #5)
        L3 (Net #6)
    passive1 (Box #2)
      pin1
        chip0.pin2 (Box #0)
      pin2
        L2 (Net #3)
    passive2 (Box #5)
      pin1
        chip0.pin3 (Box #0)
        L4 (Net #4)
      pin2
        L3 (Net #6)
        chip0.pin4 (Box #0)"
  `)

  expect(
    getPinSubsetNetlist({
      netlist: C.getNetlist(),
      chipId: "chip0",
      pinNumber: 1,
    }),
  ).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxId": "chip0.pin1",
          "leftPinCount": 0,
          "rightPinCount": 1,
          "topPinCount": 0,
        },
      ],
      "connections": [
        {
          "connectedPorts": [
            {
              "boxId": "chip0.pin1",
              "pinNumber": 1,
            },
            {
              "netId": "L1",
            },
          ],
        },
      ],
      "nets": [
        {
          "netId": "L1",
        },
      ],
    }
  `)

  expect(
    getPinSubsetNetlist({
      netlist: C.getNetlist(),
      chipId: "chip0",
      pinNumber: 2,
    }),
  ).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxId": "chip0.pin2",
          "leftPinCount": 0,
          "rightPinCount": 1,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 0,
          "boxId": "passive1",
          "leftPinCount": 1,
          "rightPinCount": 1,
          "topPinCount": 0,
        },
      ],
      "connections": [
        {
          "connectedPorts": [
            {
              "boxId": "chip0.pin2",
              "pinNumber": 1,
            },
            {
              "boxId": "passive1",
              "pinNumber": 1,
            },
          ],
        },
      ],
      "nets": [],
    }
  `)

  expect(
    getPinSubsetNetlist({
      netlist: C.getNetlist(),
      chipId: "chip0",
      pinNumber: 3,
    }),
  ).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxId": "chip0.pin3",
          "leftPinCount": 0,
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
      ],
      "connections": [
        {
          "connectedPorts": [
            {
              "boxId": "chip0.pin3",
              "pinNumber": 1,
            },
            {
              "netId": "L4",
            },
            {
              "boxId": "passive2",
              "pinNumber": 1,
            },
          ],
        },
      ],
      "nets": [
        {
          "netId": "L4",
        },
      ],
    }
  `)

  expect(
    getPinSubsetNetlist({
      netlist: C.getNetlist(),
      chipId: "chip0",
      pinNumber: 4,
    }),
  ).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxId": "chip0.pin4",
          "leftPinCount": 0,
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
      ],
      "connections": [
        {
          "connectedPorts": [
            {
              "boxId": "chip0.pin4",
              "pinNumber": 1,
            },
            {
              "boxId": "passive2",
              "pinNumber": 2,
            },
            {
              "netId": "L3",
            },
          ],
        },
      ],
      "nets": [
        {
          "netId": "L3",
        },
      ],
    }
  `)
})
