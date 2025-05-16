import { test, expect } from "bun:test"
import type { InputNetlist } from "lib/input-types"
import { normalizeNetlist } from "lib/scoring/normalizeNetList"

test("normalizeNetlist should correctly normalize a simple netlist", () => {
  const inputNetlist: InputNetlist = {
    boxes: [
      { boxId: "chipA", leftPinCount: 1, rightPinCount: 1, topPinCount: 0, bottomPinCount: 0 },
      { boxId: "res1", leftPinCount: 1, rightPinCount: 1, topPinCount: 0, bottomPinCount: 0 },
    ],
    nets: [
      { netId: "N1" },
      { netId: "N2" },
    ],
    connections: [
      {
        connectedPorts: [
          { boxId: "chipA", pinNumber: 2 }, // Right pin
          { netId: "N2" },
        ],
      },
      {
        connectedPorts: [
          { boxId: "chipA", pinNumber: 1 }, // Left pin
          { boxId: "res1", pinNumber: 1 },
          { netId: "N1" },
        ],
      },
      {
        connectedPorts: [
          { boxId: "res1", pinNumber: 2 },
          // Intentionally connect to N1 again to test merging/representation
          // Though normalizeNetlist itself doesn't merge, it should represent faithfully
          { netId: "N1" },
        ],
      },
    ],
  }

  const { normalizedNetlist, transform } = normalizeNetlist(inputNetlist)

  expect(transform).toMatchInlineSnapshot(`
    {
      "boxIdToBoxIndex": {
        "chipA": 0,
        "res1": 1,
      },
      "netIdToNetIndex": {
        "N1": 0,
        "N2": 1,
      },
    }
  `)

  expect(normalizedNetlist).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxIndex": 0,
          "leftPinCount": 1,
          "rightPinCount": 1,
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
              "netIndex": 1,
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
        {
          "netIndex": 1,
        },
      ],
    }
  `)
})

test("normalizeNetlist with different ID order but same structure", () => {
  const inputNetlist1: InputNetlist = {
    boxes: [
      { boxId: "U1", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0 },
      { boxId: "R1", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0 },
    ],
    nets: [{ netId: "NetA" }],
    connections: [
      { connectedPorts: [{ boxId: "U1", pinNumber: 1 }, { netId: "NetA" }] },
      { connectedPorts: [{ boxId: "R1", pinNumber: 1 }, { netId: "NetA" }] },
    ],
  }

  const inputNetlist2: InputNetlist = {
    boxes: [ // Different order
      { boxId: "R1", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0 },
      { boxId: "U1", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0 },
    ],
    nets: [{ netId: "NetA" }], // Same net
    connections: [ // Different order
      { connectedPorts: [{ boxId: "R1", pinNumber: 1 }, { netId: "NetA" }] },
      { connectedPorts: [{ boxId: "U1", pinNumber: 1 }, { netId: "NetA" }] },
    ],
  }

  const { normalizedNetlist: norm1 } = normalizeNetlist(inputNetlist1)
  const { normalizedNetlist: norm2 } = normalizeNetlist(inputNetlist2)

  // The transform will be different because boxIds "R1" and "U1" will map to different indices
  // R1 -> 0, U1 -> 1 for inputNetlist1 (if R1 < U1)
  // U1 -> 1, R1 -> 0 for inputNetlist2 (if R1 < U1)
  // But the final normalizedNetlist structure should be identical due to sorting by ID then mapping.

  // Actually, the boxIdToBoxIndex will be {"R1":0, "U1":1} for both because we sort by ID first.
  // So the transform and normalized netlist should be identical.

  const { transform: trans1 } = normalizeNetlist(inputNetlist1)
  const { transform: trans2 } = normalizeNetlist(inputNetlist2)

  expect(trans1).toEqual(trans2)
  expect(norm1).toEqual(norm2)

  expect(norm1).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxIndex": 0,
          "leftPinCount": 1,
          "rightPinCount": 0,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 0,
          "boxIndex": 1,
          "leftPinCount": 1,
          "rightPinCount": 0,
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
              "netIndex": 0,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxIndex": 1,
              "pinNumber": 1,
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
})
