# @tscircuit/pmars-layout

An automatic layout system for schematics that uses the **PMARS** pattern:

- **Partition** the input schematic
- **Match** partitions with close, pregenerated templates
- **Adapt** the template until the netlist matches the partition
- **Refine** the layout to fix overlapping or clutter caused by adaptation
- **Stitch** the laid-out partitions together

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
import { getLayoutForNetlist } from "@tscircuit/pmars-layout"

const circuitBuilder = getLayout({})
```

## Great Reference Schematics

- https://cdn.sparkfun.com/assets/7/7/2/1/9/SparkFun_STM32_Thing_Plus.pdf
