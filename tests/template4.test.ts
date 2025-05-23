import { test, expect } from "bun:test"
import template4 from "../templates/template4"

test("template4", () => {
  const C = template4()
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1     A
    ┌───┐   │
    │  3├───┤
    │  2├─C │
    │  1├┐  R2
    └───┘│  │
         D  B
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
              "boxId": "U1",
              "pinNumber": 1,
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
})
