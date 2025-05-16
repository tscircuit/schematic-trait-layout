import { test, expect } from "bun:test"
import sample1 from "../samples/sample1"

test("sample1", () => {
  const C = sample1()
  expect(C.bodyWidth).toMatchInlineSnapshot(`5`)
  expect(C.bodyHeight).toMatchInlineSnapshot(`5`)
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
            ┌───┐
    ┌───────┤   ├───L
    │       │   │
    B    ┌──┤   ├───L
    │    │  └───┘
    L    L
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
              "boxId": "chip0",
              "pinNumber": 1,
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
              "netId": "L",
            },
          ],
        },
      ],
      "nets": [
        {
          "netId": "L",
        },
      ],
    }
  `)
})
