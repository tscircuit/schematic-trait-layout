import { test, expect } from "bun:test"
import template5 from "../templates/template5"

test("template5", () => {
  const C = template5()
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐     ┌───┐
    ┤1 4├─────┤1 2├
    ┤2 3├     └───┘
    └───┘
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
          "bottomPinCount": 0,
          "boxId": "chip1",
          "leftPinCount": 1,
          "rightPinCount": 1,
          "topPinCount": 0,
        },
      ],
      "connections": [
        {
          "connectedPorts": [
            {
              "boxId": "chip1",
              "pinNumber": 1,
            },
            {
              "boxId": "chip0",
              "pinNumber": 4,
            },
          ],
        },
      ],
      "nets": [],
    }
  `)
})
