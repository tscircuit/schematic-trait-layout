import { test, expect } from "bun:test"
import type { InputNetlist } from "lib/input-types"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"

test("normalizeNetlist should be invariant to box and connection order", () => {
  // Base InputNetlist
  const inputNetlistA: InputNetlist = {
    boxes: [
      {
        boxId: "U1",
        leftPinCount: 2,
        rightPinCount: 2,
        topPinCount: 0,
        bottomPinCount: 0,
      },
      {
        boxId: "R1",
        leftPinCount: 1,
        rightPinCount: 1,
        topPinCount: 0,
        bottomPinCount: 0,
      },
    ],
    nets: [{ netId: "GND" }],
    connections: [
      {
        connectedPorts: [
          { boxId: "U1", pinNumber: 1 },
          { boxId: "R1", pinNumber: 1 },
        ],
      },
      {
        connectedPorts: [{ boxId: "U1", pinNumber: 3 }, { netId: "GND" }],
      },
      {
        connectedPorts: [{ boxId: "R1", pinNumber: 2 }, { netId: "GND" }],
      },
    ],
  }

  // Variation B: Boxes swapped (R1, U1)
  const inputNetlistB: InputNetlist = {
    boxes: [
      {
        boxId: "RES_X",
        leftPinCount: 1,
        rightPinCount: 1,
        topPinCount: 0,
        bottomPinCount: 0,
      },
      {
        boxId: "IC_A",
        leftPinCount: 2,
        rightPinCount: 2,
        topPinCount: 0,
        bottomPinCount: 0,
      },
    ],
    nets: [{ netId: "VSS" }],
    connections: [
      // Connections order same as A
      {
        connectedPorts: [
          { boxId: "IC_A", pinNumber: 1 },
          { boxId: "RES_X", pinNumber: 1 },
        ],
      },
      {
        connectedPorts: [{ boxId: "IC_A", pinNumber: 3 }, { netId: "VSS" }],
      },
      {
        connectedPorts: [{ boxId: "RES_X", pinNumber: 2 }, { netId: "VSS" }],
      },
    ],
  }

  // Variation C: Connections swapped
  const inputNetlistC: InputNetlist = {
    boxes: [
      // Boxes order same as A (U1, R1)
      {
        boxId: "CHIP_ALPHA",
        leftPinCount: 2,
        rightPinCount: 2,
        topPinCount: 0,
        bottomPinCount: 0,
      },
      {
        boxId: "LOAD_1",
        leftPinCount: 1,
        rightPinCount: 1,
        topPinCount: 0,
        bottomPinCount: 0,
      },
    ],
    nets: [{ netId: "COMMON" }],
    connections: [
      // Connections swapped (order: R1-GND, U1-R1, U1-GND)
      {
        connectedPorts: [
          { boxId: "LOAD_1", pinNumber: 2 },
          { netId: "COMMON" },
        ],
      },
      {
        connectedPorts: [
          { boxId: "CHIP_ALPHA", pinNumber: 1 },
          { boxId: "LOAD_1", pinNumber: 1 },
        ],
      },
      {
        connectedPorts: [
          { boxId: "CHIP_ALPHA", pinNumber: 3 },
          { netId: "COMMON" },
        ],
      },
    ],
  }

  // Variation D: Both boxes and connections swapped
  const inputNetlistD: InputNetlist = {
    boxes: [
      // Boxes swapped (R1, U1)
      {
        boxId: "PASSIVE_Y",
        leftPinCount: 1,
        rightPinCount: 1,
        topPinCount: 0,
        bottomPinCount: 0,
      },
      {
        boxId: "DEVICE_X",
        leftPinCount: 2,
        rightPinCount: 2,
        topPinCount: 0,
        bottomPinCount: 0,
      },
    ],
    nets: [{ netId: "GROUND_Z" }],
    connections: [
      // Connections swapped (order: U1-GND, R1-GND, U1-R1)
      {
        connectedPorts: [
          { boxId: "DEVICE_X", pinNumber: 3 },
          { netId: "GROUND_Z" },
        ],
      },
      {
        connectedPorts: [
          { boxId: "PASSIVE_Y", pinNumber: 2 },
          { netId: "GROUND_Z" },
        ],
      },
      {
        connectedPorts: [
          { boxId: "DEVICE_X", pinNumber: 1 },
          { boxId: "PASSIVE_Y", pinNumber: 1 },
        ],
      },
    ],
  }

  const resA = normalizeNetlist(inputNetlistA)
  const resB = normalizeNetlist(inputNetlistB)
  const resC = normalizeNetlist(inputNetlistC)
  const resD = normalizeNetlist(inputNetlistD)

  expect(resA.normalizedNetlist).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxIndex": 0,
          "leftPinCount": 2,
          "rightPinCount": 2,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 0,
          "boxIndex": 1,
          "leftPinCount": 1,
          "rightPinCount": 1,
          "topPinCount": 0,
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
              "boxIndex": 1,
              "pinNumber": 1,
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
              "netIndex": 0,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxIndex": 1,
              "pinNumber": 2,
            },
            {
              "netIndex": 0,
            },
          ],
        },
      ],
      "nets": [
        {
          "netIndex": 0,
        },
      ],
    }
  `)

  // Check normalized netlists are identical
  expect(resB.normalizedNetlist).toEqual(resA.normalizedNetlist)
  expect(resC.normalizedNetlist).toEqual(resA.normalizedNetlist)
  expect(resD.normalizedNetlist).toEqual(resA.normalizedNetlist)

  // Snapshots will be regenerated by running the test with -u flag
})
