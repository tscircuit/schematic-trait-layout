import { test, expect } from "bun:test"
import { circuit } from "lib/builder"

test.skip("bifurcate1", () => {
  const C = circuit()
  const U1 = C.chip().leftpins(3).rightpins(3)

  U1.pin(6).line(4, 0).mark("m1").line(0, 2).label()
  U1.fromMark("m1").line(0, -2).passive().line(0, -2).label()

  U1.pin(5).line(2, 0).label()
  U1.pin(4).line(1, 0).line(0, -2).label()

  U1.pin(1).line(-3, 0).label()
  U1.pin(3).line(-2, 0).line(0, -2).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
               L
       ┌───┐   │
    L──┤1 6├───┤
       ┤2 5├─L │
     ┌─┤3 4├┐  P
     │ └───┘│  │
     L      L  L
    "
  `)

  const [left, right] = C.bifurcateX(U1.chipId)

  expect(`\n${left.toString()}\n`).toMatchInlineSnapshot(`
    "
       ┌───┐
    L──┤1  │
       │2  │
     ┌─┤3  │
     │ └───┘
     L
    "
  `)

  expect(`\n${right.toString()}\n`).toMatchInlineSnapshot(`
    "
            L
    ┌───┐   │
    │  3├───┤
    │  2├─L │
    │  1├┐  P
    └───┘│
         L
    "
  `)

  expect(right.getNetlist()).toMatchInlineSnapshot(`
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
              "boxId": "chip0",
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
              "pinNumber": 1,
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
          "netId": "L3",
        },
        {
          "netId": "L4",
        },
      ],
    }
  `)
})
