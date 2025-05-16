import { test, expect } from "bun:test"
import sample2 from "../samples/sample2"

test("sample1", () => {
  const C = sample2()
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
          L
    ┌───┐ │
    │   ├─┘┌─B─L
    │   ├──┘
    │   ├────B─L
    │   ├─────┐
    │   ├──┐  │
    │   ├┐ │  │
    │   ├● │  │
    └───┘│ B  B
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
              "pinNumber": 1,
            },
            {
              "netId": "L",
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
              "netId": "L",
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
              "netId": "L",
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
              "pinNumber": 1,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "passive3",
              "pinNumber": 2,
            },
            {
              "netId": "L",
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
              "boxId": "passive4",
              "pinNumber": 1,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "passive4",
              "pinNumber": 2,
            },
            {
              "netId": "L",
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
              "netId": "L",
            },
            {
              "boxId": "chip0",
              "pinNumber": 7,
            },
          ],
        },
      ],
      "nets": [
        {
          "netId": "L",
        }
      ],
    }
  `)
})
