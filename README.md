# @tscircuit/mash-layout

An automatic layout system for schematics that uses a pre-baked templates and
a scoring system to determine the best layout.

## Motivation

Creating a schematic layout algorithm is difficult. Schematics can't easily
use existing flow-diagram layout algorithms because readable schematics require
using common conventions, such as orienting ground net labels down and V+
labels up.

The mash layout system is designed to be an extensible way to build a complex
layout system that adheres to common conventions. We do this by pre-processing a
massive set of schematic templates that represent many common scenarios for
partial or full representation of a schematic to create a large lookup table of
schematic layouts. We then process a netlist against this lookup table to find
the best layout for the netlist, considering factors such as the net labels and
passive components.

Because the algorithm is extended by adding new templates, it is simple to
extend to algorithm to handle new scenarios as users need them.

The scoring system allows a template to fit a netlist that is not a perfect
match for a subsequent "mashing" phase. In the mashing phase, the template is
algorithmically adjusted to fit the netlist (such as by adding a missing pin)

## Great Reference Schematics

- https://cdn.sparkfun.com/assets/7/7/2/1/9/SparkFun_STM32_Thing_Plus.pdf
