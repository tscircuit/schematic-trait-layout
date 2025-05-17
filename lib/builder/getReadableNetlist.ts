import type { InputNetlist, Box, Connection, PortReference } from "lib/input-types"

// Helper function to determine the label for a pin connection
const getPinConnectionLabel = (
  boxId: string,
  pinNumber: number,
  connections: ReadonlyArray<Connection>,
): string | null => {
  const relevantConnections = connections.filter(conn =>
    conn.connectedPorts.some(
      p => "boxId" in p && p.boxId === boxId && p.pinNumber === pinNumber,
    )
  );

  if (relevantConnections.length === 0) {
    return null; // No connection
  }

  // A pin should ideally be part of only one connection object due to merging logic in the builder.
  // If it appears in multiple connection objects (e.g. if merging failed or was bypassed),
  // or if the single connection it's in is complex (connects to multiple other things),
  // we simplify the label to "...".
  if (relevantConnections.length > 1) {
    return "...";
  }

  const connection = relevantConnections[0];
  const otherPorts = connection.connectedPorts.filter(p => {
    if ("boxId" in p && typeof p.boxId === 'string' && typeof p.pinNumber === 'number') { // Type guard for PortReference
      return !(p.boxId === boxId && p.pinNumber === pinNumber);
    }
    return true; // Keep netIds or other types of ports
  });

  if (otherPorts.length === 0) {
    // This case (a pin connected only to itself within a connection object) should ideally not occur.
    return null;
  }

  if (otherPorts.length === 1) {
    const otherPort = otherPorts[0];
    if ("boxId" in otherPort && typeof otherPort.boxId === 'string' && typeof otherPort.pinNumber === 'number') {
      return `${otherPort.boxId}.${otherPort.pinNumber}`;
    }
    if ("netId" in otherPort && typeof otherPort.netId === 'string') {
      return otherPort.netId;
    }
  }

  // If connected to more than one other port, or if the port types are mixed/unexpected.
  return "...";
};

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
    // Right pins are numbered CCW, so after left and bottom pins.
    // Visually, they appear from top to bottom on the diagram (i=0 is top-most right pin slot).
    // So, i=0 corresponds to the highest right pin number (lp + bp + rp).
    // And i=rp-1 corresponds to the lowest right pin number (lp + bp + 1).
    const currentRightPinNumber = i < rp ? lp + bp + (rp - 1 - i) + 1 : 0

    const leftPinLabel = currentLeftPinNumber > 0 ? currentLeftPinNumber.toString() : ""
    const rightPinLabel = currentRightPinNumber > 0 ? currentRightPinNumber.toString() : ""

    let leftDecorator = ""
    if (currentLeftPinNumber > 0) {
      const label = getPinConnectionLabel(boxId, currentLeftPinNumber, connections)
      if (label) {
        leftDecorator = `${label} ── `
      }
    }

    let rightDecorator = ""
    if (currentRightPinNumber > 0) {
      const label = getPinConnectionLabel(boxId, currentRightPinNumber, connections)
      if (label) {
        rightDecorator = ` ── ${label}`
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
    // Top pins are after left, bottom, and right pins in CCW order
    const startPin = lp + bp + rp + 1
    const topPinsStr = Array.from({ length: tp }, (_, k) => startPin + k).join(
      ", ",
    )
    output.push(" ".repeat(SIDE_PADDING_WIDTH) + `Top Pins: ${topPinsStr}`)
  }
  if (bp > 0) {
    // Bottom pins are after left pins in CCW order
    const startPin = lp + 1
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
