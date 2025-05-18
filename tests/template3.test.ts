import { test, expect } from "bun:test"
import template3 from "../templates/template3"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"

test("template3", () => {
  const C = template3()
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐      L
    │  3├───●──┤
    │  2├─┐ │  │
    │  1├┐│ P  P
    └───┘│└─┘  │
         │     │
         L     L
    "
  `)
  expect(C.getNetlist()).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxId": "chip0",
          "leftPinCount": 0,
          "rightPinCount": 3,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 1,
          "boxId": "passive1",
          "leftPinCount": 0,
          "rightPinCount": 0,
          "topPinCount": 1,
        },
        {
          "bottomPinCount": 1,
          "boxId": "passive2",
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
              "pinNumber": 3,
            },
            {
              "netId": "L1",
            },
            {
              "boxId": "passive1",
              "pinNumber": 2,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "passive1",
              "pinNumber": 1,
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
              "pinNumber": 1,
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
              "pinNumber": 2,
            },
            {
              "boxId": "passive2",
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
      ],
    }
  `)

  expect(
    normalizeNetlist(C.getNetlist()).normalizedNetlist,
  ).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxIndex": 0,
          "leftPinCount": 0,
          "rightPinCount": 3,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 1,
          "boxIndex": 1,
          "leftPinCount": 0,
          "rightPinCount": 0,
          "topPinCount": 1,
        },
        {
          "bottomPinCount": 1,
          "boxIndex": 2,
          "leftPinCount": 0,
          "rightPinCount": 0,
          "topPinCount": 1,
        },
      ],
      "connections": [
        {
          "connectedPorts": [
            {
              "boxIndex": 0,
              "pinNumber": 1,
            },
            {
              "netIndex": 0,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxIndex": 0,
              "pinNumber": 2,
            },
            {
              "boxIndex": 1,
              "pinNumber": 2,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxIndex": 0,
              "pinNumber": 3,
            },
            {
              "boxIndex": 2,
              "pinNumber": 2,
            },
            {
              "netIndex": 1,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxIndex": 2,
              "pinNumber": 1,
            },
            {
              "netIndex": 2,
            },
          ],
        },
      ],
      "nets": [
        {
          "netIndex": 0,
        },
        {
          "netIndex": 1,
        },
        {
          "netIndex": 2,
        },
      ],
    }
  `)
})
