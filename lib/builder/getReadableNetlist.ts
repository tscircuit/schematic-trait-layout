import type { InputNetlist, Box } from "lib/input-types"

// Helper function to generate ASCII art for a single box
const drawBoxAscii = (box: Box): string[] => {
  const output: string[] = []
  const { boxId, leftPinCount, rightPinCount, topPinCount, bottomPinCount } = box

  output.push(
    `Type: L:${leftPinCount} R:${rightPinCount} T:${topPinCount} B:${bottomPinCount}`,
  )

  const lp = leftPinCount
  const rp = rightPinCount
  const tp = topPinCount
  const bp = bottomPinCount

  const bodyHeight = Math.max(lp, rp, 1) // Min height of 1 for the box name

  const maxBoxIdDisplayLength = 15
  let displayBoxId = boxId
  if (boxId.length > maxBoxIdDisplayLength) {
    displayBoxId = `${boxId.substring(0, maxBoxIdDisplayLength - 1)}…`
  }

  const innerWidth = Math.max(displayBoxId.length + 2, 5) // +2 for padding, min width 5

  output.push(`┌${"─".repeat(innerWidth)}┐`)

  for (let i = 0; i < bodyHeight; i++) {
    const leftPinLabel = i < lp ? (i + 1).toString() : ""
    const rightPinLabel = i < rp ? (lp + i + 1).toString() : ""

    let lineContent = ""
    if (i === Math.floor((bodyHeight - 1) / 2)) {
      const paddingLeft = Math.floor((innerWidth - displayBoxId.length) / 2)
      const paddingRight = innerWidth - displayBoxId.length - paddingLeft
      lineContent = " ".repeat(paddingLeft) + displayBoxId + " ".repeat(paddingRight)
    } else {
      lineContent = " ".repeat(innerWidth)
    }
    // Ensure consistent spacing for pin labels
    const leftPart = leftPinLabel.padStart(2)
    const rightPart = rightPinLabel.padEnd(2)
    output.push(`${leftPart} │${lineContent}│ ${rightPart}`)
  }

  output.push(`└${"─".repeat(innerWidth)}┘`)

  if (tp > 0) {
    const startPin = lp + rp + 1
    const topPinsStr = Array.from({ length: tp }, (_, k) => startPin + k).join(
      ", ",
    )
    output.push(`Top Pins: ${topPinsStr}`)
  }
  if (bp > 0) {
    const startPin = lp + rp + tp + 1
    const bottomPinsStr = Array.from(
      { length: bp },
      (_, k) => startPin + k,
    ).join(", ")
    output.push(`Bottom Pins: ${bottomPinsStr}`)
  }

  return output
}

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
      lines.push(`  - Box ID: ${box.boxId}`)
      const boxArtLines = drawBoxAscii(box)
      for (const artLine of boxArtLines) {
        lines.push(`    ${artLine}`) // Indent box art
      }
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
