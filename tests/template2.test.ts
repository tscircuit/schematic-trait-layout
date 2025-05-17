import { test, expect } from "bun:test"
import template2 from "../templates/template2"

test("template2", () => {
  const C = template2()
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
          L
    ┌───┐ │
    │  7├─┘┌─P─L
    │  6├──┘
    │  5├────P─L
    │  4├─────┐
    │  3├──┐  │
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
              "boxId": "chip0",
              "pinNumber": 3,
            },
            {
              "boxId": "passive4",
              "pinNumber": 2,
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
})
