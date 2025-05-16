import { test, expect } from "bun:test"
import type { InputNetlist } from "lib/input-types"
import { areNetlistsCompatible } from "lib/scoring/areNetlistsCompatible"

test("areNetlistsCompatible: identical netlists", () => {
  const netlist: InputNetlist = {
    boxes: [
      {
        boxId: "U1",
        leftPinCount: 1,
        rightPinCount: 1,
        topPinCount: 0,
        bottomPinCount: 0,
      },
    ],
    nets: [{ netId: "N1" }],
    connections: [
      {
        connectedPorts: [
          { boxId: "U1", pinNumber: 1 },
          { netId: "N1" },
        ],
      },
    ],
  }
  expect(areNetlistsCompatible(netlist, netlist)).toBe(true)
})

test("areNetlistsCompatible: template has more pins on a box", () => {
  const input: InputNetlist = {
    boxes: [
      {
        boxId: "U1",
        leftPinCount: 1,
        rightPinCount: 0,
        topPinCount: 0,
        bottomPinCount: 0,
      },
    ],
    nets: [],
    connections: [],
  }
  const template: InputNetlist = {
    boxes: [
      {
        boxId: "U1",
        leftPinCount: 2, // More pins
        rightPinCount: 1,
        topPinCount: 0,
        bottomPinCount: 0,
      },
    ],
    nets: [],
    connections: [],
  }
  expect(areNetlistsCompatible(input, template)).toBe(true)
})

test("areNetlistsCompatible: input requires more pins than template", () => {
  const input: InputNetlist = {
    boxes: [
      {
        boxId: "U1",
        leftPinCount: 2,
        rightPinCount: 0,
        topPinCount: 0,
        bottomPinCount: 0,
      },
    ],
    nets: [],
    connections: [],
  }
  const template: InputNetlist = {
    boxes: [
      {
        boxId: "U1",
        leftPinCount: 1, // Fewer pins
        rightPinCount: 0,
        topPinCount: 0,
        bottomPinCount: 0,
      },
    ],
    nets: [],
    connections: [],
  }
  expect(areNetlistsCompatible(input, template)).toBe(false)
})

test("areNetlistsCompatible: different number of boxes", () => {
  const input: InputNetlist = {
    boxes: [{ boxId: "U1", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, }],
    nets: [],
    connections: [],
  }
  const template: InputNetlist = {
    boxes: [
      { boxId: "U1", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
      { boxId: "U2", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
    ],
    nets: [],
    connections: [],
  }
  expect(areNetlistsCompatible(input, template)).toBe(false)
})

test("areNetlistsCompatible: template has extra connections", () => {
  const input: InputNetlist = {
    boxes: [{ boxId: "B1", leftPinCount: 1, rightPinCount: 1, topPinCount: 0, bottomPinCount: 0, }],
    nets: [{ netId: "N1" }],
    connections: [
      { connectedPorts: [{ boxId: "B1", pinNumber: 1 }, { netId: "N1" }] },
    ],
  }
  const template: InputNetlist = {
    boxes: [{ boxId: "TB1", leftPinCount: 1, rightPinCount: 1, topPinCount: 0, bottomPinCount: 0, }],
    nets: [{ netId: "TN1" }, { netId: "TN2" }],
    connections: [
      { connectedPorts: [{ boxId: "TB1", pinNumber: 1 }, { netId: "TN1" }] },
      { connectedPorts: [{ boxId: "TB1", pinNumber: 2 }, { netId: "TN2" }] }, // Extra connection
    ],
  }
  expect(areNetlistsCompatible(input, template)).toBe(true)
})

test("areNetlistsCompatible: input connection not satisfiable (missing port in template connection)", () => {
  const input: InputNetlist = {
    boxes: [
      { boxId: "A", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
      { boxId: "B", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
    ],
    nets: [],
    connections: [
      // Connection A.1 to B.1
      { connectedPorts: [{ boxId: "A", pinNumber: 1 }, { boxId: "B", pinNumber: 1 }] },
    ],
  }
  const template: InputNetlist = {
    boxes: [
      { boxId: "TA", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
      { boxId: "TB", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
    ],
    nets: [{ netId: "TN1" }],
    connections: [
      // Template connects TA.1 to a net, not to TB.1 directly in this connection
      { connectedPorts: [{ boxId: "TA", pinNumber: 1 }, { netId: "TN1" }] },
      // And TB.1 is also connected to that net, but not in the *same* connection as TA.1
      // { connectedPorts: [{ boxId: "TB", pinNumber: 1 }, { netId: "TN1" }] },
      // For the input A.1-B.1 to be satisfied, there must be a *single* template connection
      // that contains *both* TA.1 and TB.1 (or their equivalents after normalization).
    ],
  }
  // Normalization maps A->TA (index 0), B->TB (index 1)
  // Input connection: {boxIndex:0, pin:1}, {boxIndex:1, pin:1}
  // Template connection: {boxIndex:0, pin:1}, {netIndex:0}
  // The input connection is not a "sub-connection" of the template one.
  expect(areNetlistsCompatible(input, template)).toBe(false)
})

test("areNetlistsCompatible: input connection satisfied by a larger template connection", () => {
  const input: InputNetlist = {
    boxes: [
      { boxId: "X", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
      { boxId: "Y", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
    ],
    nets: [],
    connections: [
      { connectedPorts: [{ boxId: "X", pinNumber: 1 }, { boxId: "Y", pinNumber: 1 }] },
    ],
  }
  const template: InputNetlist = {
    boxes: [
      { boxId: "TX", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
      { boxId: "TY", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
    ],
    nets: [{ netId: "TNEXTRA" }],
    connections: [
      {
        connectedPorts: [
          { boxId: "TX", pinNumber: 1 },
          { boxId: "TY", pinNumber: 1 },
          { netId: "TNEXTRA" }, // Template connection has an extra port
        ],
      },
    ],
  }
  expect(areNetlistsCompatible(input, template)).toBe(true)
})

test("areNetlistsCompatible: different boxIds but compatible structure", () => {
  const input: InputNetlist = {
    boxes: [{ boxId: "chip1", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, }],
    nets: [],
    connections: [],
  }
  const template: InputNetlist = {
    boxes: [{ boxId: "deviceA", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, }],
    nets: [],
    connections: [],
  }
  // Normalization will map chip1 -> 0 and deviceA -> 0, making them compatible.
  expect(areNetlistsCompatible(input, template)).toBe(true)
})

test("areNetlistsCompatible: different netIds but compatible structure and connections", () => {
  const input: InputNetlist = {
    boxes: [{ boxId: "B1", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, }],
    nets: [{ netId: "SignalA" }],
    connections: [
      { connectedPorts: [{ boxId: "B1", pinNumber: 1 }, { netId: "SignalA" }] },
    ],
  }
  const template: InputNetlist = {
    boxes: [{ boxId: "B1", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, }],
    nets: [{ netId: "WireX" }],
    connections: [
      { connectedPorts: [{ boxId: "B1", pinNumber: 1 }, { netId: "WireX" }] },
    ],
  }
  // Normalization maps SignalA -> 0 and WireX -> 0.
  expect(areNetlistsCompatible(input, template)).toBe(true)
})

test("areNetlistsCompatible: input connection not satisfied because template connection is missing a required box pin", () => {
  const input: InputNetlist = {
    boxes: [
      { boxId: "U1", leftPinCount: 1, rightPinCount: 1, topPinCount: 0, bottomPinCount: 0, },
      { boxId: "U2", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
    ],
    nets: [],
    connections: [
      {
        connectedPorts: [
          { boxId: "U1", pinNumber: 1 }, // U1.L1
          { boxId: "U2", pinNumber: 1 }, // U2.L1
        ],
      },
    ],
  }
  const template: InputNetlist = {
    boxes: [
      { boxId: "U1", leftPinCount: 1, rightPinCount: 1, topPinCount: 0, bottomPinCount: 0, },
      { boxId: "U2", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
    ],
    nets: [{ netId: "N1" }],
    connections: [
      {
        connectedPorts: [
          { boxId: "U1", pinNumber: 1 }, // U1.L1
          { netId: "N1" }, // Connects to a net, but not U2.L1 in *this* connection
        ],
      },
      // U2.L1 might be connected to N1 elsewhere, or not at all, but the specific
      // input connection (U1.L1 - U2.L1) is not present as a subset of any template connection.
    ],
  }
  expect(areNetlistsCompatible(input, template)).toBe(false)
})

test("areNetlistsCompatible: complex compatible case", () => {
  const input: InputNetlist = {
    boxes: [
      { boxId: "chipA", leftPinCount: 1, rightPinCount: 1, topPinCount: 0, bottomPinCount: 0, },
      { boxId: "res1", leftPinCount: 1, rightPinCount: 1, topPinCount: 0, bottomPinCount: 0, },
    ],
    nets: [{ netId: "N1" }],
    connections: [
      {
        connectedPorts: [
          { boxId: "chipA", pinNumber: 1 }, // chipA Left Pin 1
          { boxId: "res1", pinNumber: 1 }, // res1 Left Pin 1
        ],
      },
      {
        connectedPorts: [
          { boxId: "res1", pinNumber: 2 }, // res1 Right Pin 1
          { netId: "N1" },
        ],
      },
    ],
  }
  const template: InputNetlist = {
    boxes: [
      { boxId: "IC1", leftPinCount: 2, rightPinCount: 2, topPinCount: 1, bottomPinCount: 1, }, // chipA equivalent, more pins
      { boxId: "R01", leftPinCount: 1, rightPinCount: 1, topPinCount: 0, bottomPinCount: 0, }, // res1 equivalent
    ],
    nets: [{ netId: "NetAlpha" }, { netId: "NetBeta" }], // N1 equivalent + extra
    connections: [
      { // Satisfies input's chipA.L1 - res1.L1
        connectedPorts: [
          { boxId: "IC1", pinNumber: 1 },    // chipA.L1
          { boxId: "R01", pinNumber: 1 },    // res1.L1
          { netId: "NetBeta" },             // Extra connection part
        ],
      },
      { // Satisfies input's res1.R1 - N1
        connectedPorts: [
          { boxId: "R01", pinNumber: 2 },    // res1.R1
          { netId: "NetAlpha" },            // N1
        ],
      },
      { // Extra connection in template
        connectedPorts: [
          { boxId: "IC1", pinNumber: 2 },    // chipA.L2 (unused by input)
          { netId: "NetBeta" },
        ],
      },
    ],
  }
  // Normalization: chipA -> IC1 (idx 0), res1 -> R01 (idx 1)
  // N1 -> NetAlpha (idx 0)
  // Input conn1: {b:0,p:1}, {b:1,p:1} -> Found in template conn1 (which also has {n:1})
  // Input conn2: {b:1,p:2}, {n:0} -> Found in template conn2
  expect(areNetlistsCompatible(input, template)).toBe(true)
})

test("areNetlistsCompatible: input has a 3-port connection, template satisfies it", () => {
  const input: InputNetlist = {
    boxes: [
      { boxId: "B1", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
      { boxId: "B2", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
    ],
    nets: [{ netId: "N1" }],
    connections: [
      {
        connectedPorts: [
          { boxId: "B1", pinNumber: 1 },
          { boxId: "B2", pinNumber: 1 },
          { netId: "N1" },
        ],
      },
    ],
  }
  const template: InputNetlist = {
    boxes: [
      { boxId: "TB1", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
      { boxId: "TB2", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
    ],
    nets: [{ netId: "TN1" }, { netId: "TN2" /* extra net */ }],
    connections: [
      {
        connectedPorts: [
          { boxId: "TB1", pinNumber: 1 },
          { boxId: "TB2", pinNumber: 1 },
          { netId: "TN1" },
          // Could even have { netId: "TN2" } here, and it would still be compatible
        ],
      },
    ],
  }
  expect(areNetlistsCompatible(input, template)).toBe(true)
})

test("areNetlistsCompatible: input 3-port connection, template has only 2-port connections that cover parts of it", () => {
  const input: InputNetlist = {
    boxes: [
      { boxId: "B1", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
      { boxId: "B2", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
    ],
    nets: [{ netId: "N1" }],
    connections: [
      { // B1.1 - B2.1 - N1
        connectedPorts: [
          { boxId: "B1", pinNumber: 1 },
          { boxId: "B2", pinNumber: 1 },
          { netId: "N1" },
        ],
      },
    ],
  }
  const template: InputNetlist = {
    boxes: [
      { boxId: "TB1", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
      { boxId: "TB2", leftPinCount: 1, rightPinCount: 0, topPinCount: 0, bottomPinCount: 0, },
    ],
    nets: [{ netId: "TN1" }],
    connections: [
      { // TB1.1 - TN1
        connectedPorts: [
          { boxId: "TB1", pinNumber: 1 },
          { netId: "TN1" },
        ],
      },
      { // TB2.1 - TN1
        connectedPorts: [
          { boxId: "TB2", pinNumber: 1 },
          { netId: "TN1" },
        ],
      },
      // No single template connection contains all three of {B1.1, B2.1, N1} (after normalization)
    ],
  }
  expect(areNetlistsCompatible(input, template)).toBe(false)
})
