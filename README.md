# @tscircuit/pmars-layout

An automatic layout system for schematics that uses the **PMARS** pattern:

- **Partition** the input schematic
- **Match** partitions with close, pregenerated templates
- **Adapt** the template until the netlist matches the partition
- **Refine** the layout to fix overlapping or clutter caused by adaptation
- **Stitch** the laid-out partitions together

[Test Online](https://pmars-layout.vercel.app) · [tscircuit](https://github.com/tscircuit/tscircuit)

## Motivation

Creating a schematic layout algorithm is difficult. Schematics can't easily
use existing flow-diagram layout algorithms because readable schematics require
using common conventions, such as orienting ground net labels down and V+
labels up.

The PMARS layout system is designed to be an extensible way to build a complex
layout system that adheres to common conventions. We do this by pre-processing a
large set of schematic templates that represent many common scenarios for
partial or full representation of a schematic to create a large lookup table of
schematic layouts. We then process a netlist against this lookup table to find
the closest layout for a given netlist, considering factors such as the net labels
and passive components.

Because the algorithm is extended by adding new templates, it is simple to
extend to algorithm to handle new scenarios as users need them or as edge cases
are found.

## Usage

You should create an `InputNetlist` to describe your schematic input. You can
then call `getLayoutForNetlist` to get `CircuitBuilder` instance with the
layout applied.

```tsx
import { SchematicLayoutPipelineSolver } from "@tscircuit/pmars-layout"

const solver = new SchematicLayoutPipelineSolver({
  inputNetlist: {
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
    connections: [
      {
        connectedPorts: [
          { boxId: "U1", pinNumber: 1 },
          { boxId: "R1", pinNumber: 1 },
        ],
      },
      {
        connectedPorts: [{ boxId: "U1", pinNumber: 4 }, { netId: "VCC" }],
      },
    ],
    nets: [{ netId: "VCC" }, { netId: "GND" }],
  },
})

solver.solve()

console.log(solver.toAsciiString())

// You can access the position of each box via circuitBuilder.chips
```

## Great Reference Schematics

- https://cdn.sparkfun.com/assets/7/7/2/1/9/SparkFun_STM32_Thing_Plus.pdf
