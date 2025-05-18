import { circuit } from "lib/builder"
import { test, expect } from "bun:test"

test(".intersect", () => {
  const c = circuit()
  const chip = c.chip().rightpins(2)
  chip.pin(1).line(4, 0).label("A")
  chip.pin(2).line(2, 0).line(0, -1).intersect()

  expect(`\n${c.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    │  2├─┐
    │  1├─●─A
    └───┘
    "
  `)

  expect(c.getNetlist()).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxId": "chip0",
          "leftPinCount": 0,
          "rightPinCount": 2,
          "topPinCount": 0,
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
              "netId": "A",
            },
            {
              "boxId": "chip0",
              "pinNumber": 2,
            },
          ],
        },
      ],
      "nets": [
        {
          "netId": "A",
        },
      ],
    }
  `)
})
