import type { InputNetlist, Box, Connection } from "lib/input-types"

// Helper function to find a simple net connection for a pin
const getConnectedNet = (
  boxId: string,
  pinNumber: number,
  connections: ReadonlyArray<Connection>,
): string | null => {
  for (const conn of connections) {
    if (conn.connectedPorts.length === 2) {
      const boxPort = conn.connectedPorts.find(
        (p) => "boxId" in p && p.boxId === boxId && p.pinNumber === pinNumber,
      )
      const netPort = conn.connectedPorts.find((p) => "netId" in p)

      if (boxPort && netPort && "netId" in netPort) {
        return netPort.netId
      }
    }
  }
  return null
}

// Helper function to generate ASCII art for a single box
const drawBoxAscii = (
  box: Box,
  connections: ReadonlyArray<Connection>,
): string[] => {
  const output: string[] = []
  const { boxId, leftPinCount, rightPinCount, topPinCount, bottomPinCount } = box

  const BOX_INNER_WIDTH = 16
  const SIDE_PADDING_WIDTH = 16

  output.push(
    `Type: L:${leftPinCount} R:${rightPinCount} T:${topPinCount} B:${bottomPinCount}`,
  )

  const lp = leftPinCount
  const rp = rightPinCount
  const tp = topPinCount
  const bp = bottomPinCount

  const bodyHeight = Math.max(lp, rp, 1) // Min height of 1 for the box name

  // Max length for boxId *inside* the box, allowing for " name " or " truncatedN… "
  const maxDisplayableBoxIdLength = BOX_INNER_WIDTH - 2
  let displayBoxId = boxId
  if (boxId.length > maxDisplayableBoxIdLength) {
    // Truncate to maxDisplayableBoxIdLength - 1 to make space for the ellipsis
    displayBoxId = `${boxId.substring(0, maxDisplayableBoxIdLength - 1)}…`
  }
  // If boxId is shorter, it will be padded with spaces later when creating lineContent.

  const innerWidth = BOX_INNER_WIDTH // Fixed inner width

  output.push(`${" ".repeat(SIDE_PADDING_WIDTH)}┌${"─".repeat(innerWidth)}┐`)

  for (let i = 0; i < bodyHeight; i++) {
    const currentLeftPinNumber = i < lp ? i + 1 : 0
    const currentRightPinNumber = i < rp ? lp + i + 1 : 0

    const leftPinLabel = currentLeftPinNumber > 0 ? currentLeftPinNumber.toString() : ""
    const rightPinLabel = currentRightPinNumber > 0 ? currentRightPinNumber.toString() : ""

    let leftDecorator = ""
    if (currentLeftPinNumber > 0) {
      const netId = getConnectedNet(boxId, currentLeftPinNumber, connections)
      if (netId) {
        leftDecorator = `${netId} ── `
      }
    }

    let rightDecorator = ""
    if (currentRightPinNumber > 0) {
      const netId = getConnectedNet(boxId, currentRightPinNumber, connections)
      if (netId) {
        rightDecorator = ` ── ${netId}`
      }
    }

    let lineContent = ""
    if (i === Math.floor((bodyHeight - 1) / 2)) {
      const paddingLeft = Math.floor((innerWidth - displayBoxId.length) / 2)
      const paddingRight = innerWidth - displayBoxId.length - paddingLeft
      lineContent = " ".repeat(paddingLeft) + displayBoxId + " ".repeat(paddingRight)
    } else {
      lineContent = " ".repeat(innerWidth)
    }
    // Prepare parts for left and right of the box
    const leftPinDisplay = leftPinLabel.padStart(2) // e.g., " 1" or "10"
    const rightPinDisplay = rightPinLabel.padEnd(2)  // e.g., "4 " or "10"

    const leftPart = `${leftDecorator}${leftPinDisplay}` // e.g., "L1 ──  1" or "  1"
    const rightPart = `${rightPinDisplay}${rightDecorator}` // e.g., "4  ── L2" or "4 "

    const paddedLeftFull = leftPart.padStart(SIDE_PADDING_WIDTH)
    const paddedRightFull = rightPart.padEnd(SIDE_PADDING_WIDTH)

    output.push(
      `${paddedLeftFull}│${lineContent}│${paddedRightFull}`,
    )
  }

  output.push(`${" ".repeat(SIDE_PADDING_WIDTH)}└${"─".repeat(innerWidth)}┘`)

  if (tp > 0) {
    const startPin = lp + rp + 1
    const topPinsStr = Array.from({ length: tp }, (_, k) => startPin + k).join(
      ", ",
    )
    output.push(" ".repeat(SIDE_PADDING_WIDTH) + `Top Pins: ${topPinsStr}`)
  }
  if (bp > 0) {
    const startPin = lp + rp + tp + 1
    const bottomPinsStr = Array.from(
      { length: bp },
      (_, k) => startPin + k,
    ).join(", ")
    output.push(" ".repeat(SIDE_PADDING_WIDTH) + `Bottom Pins: ${bottomPinsStr}`)
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
      const boxArtLines = drawBoxAscii(box, netlist.connections)
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
