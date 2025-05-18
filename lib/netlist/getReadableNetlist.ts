import type {
  InputNetlist,
  Box,
  Connection,
  PortReference,
} from "lib/input-types"

// Helper function to determine the label for a pin connection
const getPinConnectionLabel = (
  boxId: string,
  pinNumber: number,
  connections: ReadonlyArray<Connection>,
): string | null => {
  const relevantConnections = connections.filter((conn) =>
    conn.connectedPorts.some(
      (p) => "boxId" in p && p.boxId === boxId && p.pinNumber === pinNumber,
    ),
  )

  if (relevantConnections.length === 0) {
    return null // No connection
  }

  // A pin should ideally be part of only one connection object due to merging logic in the builder.
  // If it appears in multiple connection objects (e.g. if merging failed or was bypassed),
  // or if the single connection it's in is complex (connects to multiple other things),
  // we simplify the label to "...".
  if (relevantConnections.length > 1) {
    return "..."
  }

  const connection = relevantConnections[0]
  const otherPorts = connection.connectedPorts.filter((p) => {
    if (
      "boxId" in p &&
      typeof p.boxId === "string" &&
      typeof p.pinNumber === "number"
    ) {
      // Type guard for PortReference
      return !(p.boxId === boxId && p.pinNumber === pinNumber)
    }
    return true // Keep netIds or other types of ports
  })

  if (otherPorts.length === 0) {
    // This case (a pin connected only to itself within a connection object) should ideally not occur.
    return null
  }

  if (otherPorts.length === 1) {
    const otherPort = otherPorts[0]
    if (
      "boxId" in otherPort &&
      typeof otherPort.boxId === "string" &&
      typeof otherPort.pinNumber === "number"
    ) {
      return `${otherPort.boxId}.${otherPort.pinNumber}`
    }
    if ("netId" in otherPort && typeof otherPort.netId === "string") {
      return otherPort.netId
    }
  }

  // If connected to more than one other port, or if the port types are mixed/unexpected.
  return "..."
}

// Helper function to format content within a cell, centering it.
const formatCell = (content: string, cellWidth: number): string => {
  const contentLen = content.length
  if (contentLen >= cellWidth) {
    // If content is too long, truncate it. For single char like '│', ensure it's not cut.
    return content.substring(0, cellWidth > 0 ? cellWidth : 0)
  }
  const paddingTotal = cellWidth - contentLen
  const paddingLeft = Math.floor(paddingTotal / 2)
  const paddingRight = paddingTotal - paddingLeft
  return " ".repeat(paddingLeft) + content + " ".repeat(paddingRight)
}

// Helper function to generate ASCII art for a single box
const drawBoxAscii = (
  box: Box,
  connections: ReadonlyArray<Connection>,
): string[] => {
  const output: string[] = []
  const { boxId, leftPinCount, rightPinCount, topPinCount, bottomPinCount } =
    box

  const BOX_INNER_WIDTH = 16
  const SIDE_PADDING_WIDTH = 16

  const lp = leftPinCount
  const rp = rightPinCount
  const tp = topPinCount
  const bp = bottomPinCount

  const bodyHeight = Math.max(lp, rp, 1) // Min height of 1 for the box name

  // Max length for boxId *inside* the box
  const maxDisplayableBoxIdLength = BOX_INNER_WIDTH - 2
  let displayBoxId = boxId
  if (boxId.length > maxDisplayableBoxIdLength) {
    displayBoxId = `${boxId.substring(0, maxDisplayableBoxIdLength - 1)}…`
  }

  const innerWidth = BOX_INNER_WIDTH

  // --- TOP PINS ---
  if (tp > 0) {
    let labelsRow = ""
    let pinsRow = ""
    let connectorsRow = ""

    const baseCellWidth = Math.floor(innerWidth / tp)
    const remainderCells = innerWidth % tp
    const cellWidths: number[] = Array(tp).fill(baseCellWidth)
    for (let i = 0; i < remainderCells; i++) {
      cellWidths[i % tp]++ // Distribute remainder
    }

    for (let i = 0; i < tp; i++) {
      const currentTopPinNumber = lp + bp + rp + i + 1 // CCW: L, B, R, then T
      const pinStr = currentTopPinNumber.toString()
      const connLabel =
        getPinConnectionLabel(boxId, currentTopPinNumber, connections) ?? ""
      const cellWidth = cellWidths[i]

      labelsRow += formatCell(connLabel, cellWidth)
      pinsRow += formatCell(pinStr, cellWidth)
      connectorsRow += formatCell("│", cellWidth)
    }
    output.push(" ".repeat(SIDE_PADDING_WIDTH + 1) + labelsRow)
    output.push(" ".repeat(SIDE_PADDING_WIDTH + 1) + connectorsRow)
    output.push(" ".repeat(SIDE_PADDING_WIDTH + 1) + pinsRow)
  }

  // --- BOX TOP BORDER ---
  output.push(`${" ".repeat(SIDE_PADDING_WIDTH)}┌${"─".repeat(innerWidth)}┐`)

  // --- BOX MIDDLE (SIDES and NAME) ---
  for (let i = 0; i < bodyHeight; i++) {
    const currentLeftPinNumber = i < lp ? i + 1 : 0
    // Right pins are numbered CCW: after Left and Bottom pins.
    // Visually, they appear from top to bottom (i=0 is top-most right pin slot).
    // Pin number for visual index `i` is `lp + bp + (rp - 1 - i) + 1`.
    const currentRightPinNumber = i < rp ? lp + bp + (rp - 1 - i) + 1 : 0

    const leftPinLabel =
      currentLeftPinNumber > 0 ? currentLeftPinNumber.toString() : ""
    const rightPinLabel =
      currentRightPinNumber > 0 ? currentRightPinNumber.toString() : ""

    let leftDecorator = ""
    if (currentLeftPinNumber > 0) {
      const label = getPinConnectionLabel(
        boxId,
        currentLeftPinNumber,
        connections,
      )
      if (label) {
        leftDecorator = `${label} ── `
      }
    }

    let rightDecorator = ""
    if (currentRightPinNumber > 0) {
      const label = getPinConnectionLabel(
        boxId,
        currentRightPinNumber,
        connections,
      )
      if (label) {
        rightDecorator = ` ── ${label}`
      }
    }

    let lineContent = ""
    if (i === Math.floor((bodyHeight - 1) / 2)) {
      const paddingLeft = Math.floor((innerWidth - displayBoxId.length) / 2)
      const paddingRight = innerWidth - displayBoxId.length - paddingLeft
      lineContent =
        " ".repeat(paddingLeft) + displayBoxId + " ".repeat(paddingRight)
    } else {
      lineContent = " ".repeat(innerWidth)
    }

    const leftPinDisplay = leftPinLabel.padStart(2)
    const rightPinDisplay = rightPinLabel.padEnd(2)

    const leftPart = `${leftDecorator}${leftPinDisplay}`
    const rightPart = `${rightPinDisplay}${rightDecorator}`

    const paddedLeftFull = leftPart.padStart(SIDE_PADDING_WIDTH)
    const paddedRightFull = rightPart.padEnd(SIDE_PADDING_WIDTH)

    output.push(`${paddedLeftFull}│${lineContent}│${paddedRightFull}`)
  }

  // --- BOX BOTTOM BORDER ---
  output.push(`${" ".repeat(SIDE_PADDING_WIDTH)}└${"─".repeat(innerWidth)}┘`)

  // --- BOTTOM PINS ---
  if (bp > 0) {
    let labelsRow = ""
    let pinsRow = ""
    let connectorsRow = ""

    const baseCellWidth = Math.floor(innerWidth / bp)
    const remainderCells = innerWidth % bp
    const cellWidths: number[] = Array(bp).fill(baseCellWidth)
    for (let i = 0; i < remainderCells; i++) {
      cellWidths[i % bp]++ // Distribute remainder
    }

    for (let i = 0; i < bp; i++) {
      const currentBottomPinNumber = lp + i + 1 // CCW: L, then B
      const pinStr = currentBottomPinNumber.toString()
      const connLabel =
        getPinConnectionLabel(boxId, currentBottomPinNumber, connections) ?? ""
      const cellWidth = cellWidths[i]

      labelsRow += formatCell(connLabel, cellWidth)
      pinsRow += formatCell(pinStr, cellWidth)
      connectorsRow += formatCell("│", cellWidth)
    }
    output.push(" ".repeat(SIDE_PADDING_WIDTH + 1) + pinsRow)
    output.push(" ".repeat(SIDE_PADDING_WIDTH + 1) + connectorsRow)
    output.push(" ".repeat(SIDE_PADDING_WIDTH + 1) + labelsRow)
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
      lines.push("\n")
      const boxArtLines = drawBoxAscii(box, netlist.connections)
      for (const artLine of boxArtLines) {
        lines.push(`  ${artLine}`)
      }
    }
  }
  lines.push("")

  const complexConnections = netlist.connections.filter(
    (conn) => conn.connectedPorts.length > 2,
  )

  lines.push("Complex Connections (more than 2 points):")
  if (complexConnections.length === 0) {
    lines.push("  (none)")
  } else {
    for (let i = 0; i < complexConnections.length; i++) {
      const connection = complexConnections[i]
      lines.push(`  - Connection ${i + 1}:`) // Or use original index if preferred
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

export { NetlistBuilder } from "./NetlistBuilder"
