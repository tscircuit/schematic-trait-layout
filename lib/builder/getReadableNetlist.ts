import type { InputNetlist } from "lib/input-types"

/**
 * Returns a string representation of the netlist that is easy to read.
 *
 * This is useful for debugging.
 */
export const getReadableNetlist = (netlist: InputNetlist): string => {
  const lines: string[] = []

  lines.push("Boxes:")
  if (netlist.boxes.length === 0) {
    lines.push("  (none)")
  } else {
    for (const box of netlist.boxes) {
      lines.push(
        `  - Box ID: ${box.boxId}, Pins: L:${box.leftPinCount} R:${box.rightPinCount} T:${box.topPinCount} B:${box.bottomPinCount}`,
      )
    }
  }
  lines.push("")

  lines.push("Nets:")
  if (netlist.nets.length === 0) {
    lines.push("  (none)")
  } else {
    for (const net of netlist.nets) {
      lines.push(`  - Net ID: ${net.netId}`)
    }
  }
  lines.push("")

  lines.push("Connections:")
  if (netlist.connections.length === 0) {
    lines.push("  (none)")
  } else {
    for (let i = 0; i < netlist.connections.length; i++) {
      const connection = netlist.connections[i]
      lines.push(`  - Connection ${i + 1}:`)
      for (const port of connection.connectedPorts) {
        if ("boxId" in port) {
          lines.push(`    - Box Pin: ${port.boxId}, Pin ${port.pinNumber}`)
        } else if ("netId" in port) {
          lines.push(`    - Net: ${port.netId}`)
        }
      }
    }
  }

  return lines.join("\n")
}
