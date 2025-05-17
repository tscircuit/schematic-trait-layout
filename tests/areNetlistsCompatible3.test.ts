import { test, expect } from "bun:test"
import template4 from "../templates/template4"
import { circuit } from "lib/builder/legacy-circuit"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"
import { areNetlistsCompatible } from "lib/scoring/areNetlistsCompatible"

test("areNetlistsCompatible with template4", () => {
  // Create input circuit
  const inputCircuit = circuit()
  const u1 = inputCircuit.chip().rightpins(3) // chip0, global pin 1 is right pin 1
  u1.pin(3).line(5, 0).mark("m1").line(0, -2).passive().line(0, -2).label() // Connects chip0.pin(1) to net "SignalOut"
  u1.fromMark("m1").line(3, 0).label()
  u1.pin(2).line(2, 0).label()

  // Get template circuit
  const templateCircuit = template4()

  // Get netlists
  const inputNetlist = inputCircuit.getNetlist()
  const templateNetlist = templateCircuit.getNetlist()

  // Normalize netlists
  const { normalizedNetlist: normInput } = normalizeNetlist(inputNetlist)
  const { normalizedNetlist: normTemplate } = normalizeNetlist(templateNetlist)

  // Check compatibility
  const isCompatible = areNetlistsCompatible(inputNetlist, templateNetlist)

  // Create snapshots
  expect(`\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    │  3├────┬──L
    │  2├─L  │
    │  1│    P
    └───┘    │
             L
    "
  `)

  expect(`\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
            L
    ┌───┐   │
    │  3├───┤
    │  2├─L │
    │  1├┐  P
    └───┘│  │
         L  L
    "
  `)

  expect(normInput).toMatchInlineSnapshot(`
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
      ],
      "connections": [
        {
          "connectedPorts": [
            {
              "boxIndex": 0,
              "pinNumber": 2,
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
              "pinNumber": 3,
            },
            {
              "boxIndex": 1,
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

  expect(normTemplate).toMatchInlineSnapshot(`
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
              "netIndex": 1,
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
              "boxIndex": 1,
              "pinNumber": 2,
            },
            {
              "netIndex": 2,
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
              "netIndex": 3,
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
        {
          "netIndex": 3,
        },
      ],
    }
  `)

  expect(isCompatible).toBe(true)
})
