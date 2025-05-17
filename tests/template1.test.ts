import { test, expect } from "bun:test"
import sample1 from "../templates/template1"

test("sample1", () => {
  const C = sample1()
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
            ┌───┐
    ┌───────┤1 4├───L
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
              "boxId": "chip0",
              "pinNumber": 1,
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
})
