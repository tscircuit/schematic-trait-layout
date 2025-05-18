import type { CircuitBuilder } from "./CircuitBuilder"
import { Grid } from "./Grid"

export const getGridFromCircuit = (circuit: CircuitBuilder): Grid => {
  const g = new Grid()
  // 1. Draw every chip
  for (const chip of circuit.chips) {
    const totalPins =
      chip.leftPinCount +
      chip.rightPinCount +
      chip.topPinCount +
      chip.bottomPinCount
    const isHorizontalPassive =
      chip.leftPinCount === 1 &&
      chip.rightPinCount === 1 &&
      chip.topPinCount === 0 &&
      chip.bottomPinCount === 0
    const isVerticalPassive =
      chip.topPinCount === 1 &&
      chip.bottomPinCount === 1 &&
      chip.leftPinCount === 0 &&
      chip.rightPinCount === 0
    const isTwoPinPassive =
      totalPins === 2 && (isHorizontalPassive || isVerticalPassive)

    if (isTwoPinPassive) {
      g.putOverlay(chip.x, chip.y, "P")
      continue
    }
    // width = 5, height = max(leftPins.length, rightPins.length, 1) + 2
    const height = Math.max(chip.leftPinCount, chip.rightPinCount, 1) + 2
    for (let r = 0; r < height; ++r) {
      // r is visual row index from bottom (0) to top (height-1)
      // Pins are now rendered inside mid1, so leftChar and rightChar are not used here.
      let mid0 = " "
      let mid1 = " "
      let mid2 = " "

      const isBottomBorder = r === 0
      const isTopBorder = r === height - 1
      const isPinRow = !isBottomBorder && !isTopBorder

      if (isBottomBorder) {
        mid0 = "└"
        mid1 = "───" // TODO: Add bottom pins display if any
        mid2 = "┘"
      } else if (isTopBorder) {
        mid0 = "┌"
        mid1 = "───" // TODO: Add top pins display if any
        mid2 = "┐"
      } else {
        // Pin rows
        const pinSlotDisplayIndex = r - 1
        // const numPinSlots = height - 2 // Not strictly needed here anymore

        const leftPinData =
          pinSlotDisplayIndex < chip.leftPinCount
            ? chip.leftPins[chip.leftPinCount - 1 - pinSlotDisplayIndex]
            : undefined
        const rightPinData =
          pinSlotDisplayIndex < chip.rightPinCount
            ? chip.rightPins[pinSlotDisplayIndex]
            : undefined

        mid0 = leftPinData ? "┤" : "│"
        // mid1 will be populated with pin numbers or spaces
        mid2 = rightPinData ? "├" : "│"

        const lpStr = leftPinData ? String(leftPinData.pinNumber) : null
        const rpStr = rightPinData ? String(rightPinData.pinNumber) : null

        if (lpStr && rpStr) {
          // Assumes single-digit pins to fit "X Y" format in 3 chars
          mid1 = `${lpStr} ${rpStr}`
        } else if (lpStr) {
          mid1 = `${lpStr}  `
        } else if (rpStr) {
          mid1 = `  ${rpStr}`
        } else {
          mid1 = "   "
        }
      }
      // Compose row string for the 5-character wide chip body
      const rowStr =
        mid0 +
        (mid1.length === 3 ? mid1 : mid1.padEnd(3, " ")) + // Ensure mid1 is 3 chars
        mid2
      // Place each character of the 5-char wide chip body
      for (let col = 0; col < rowStr.length; ++col) {
        // rowStr.length is 5
        g.putOverlay(chip.x + col, chip.y + r, rowStr[col])
      }
    }
  }
  // 2. Draw labels
  for (const label of circuit.netLabels) {
    if (label.labelId.length > 0) {
      // Render only the first character of the label as an abbreviation.
      const abbreviatedChar = label.labelId[0]
      g.putOverlay(label.x, label.y, abbreviatedChar)
    }
  }
  // 3. Draw traces
  for (const line of circuit.lines) {
    if (line.start.x === line.end.x) {
      // Vertical line
      const x = line.start.x
      const y_start_coord = line.start.y
      const y_end_coord = line.end.y
      const y_min = Math.min(y_start_coord, y_end_coord)
      const y_max = Math.max(y_start_coord, y_end_coord)

      if (y_min === y_max) continue // Skip zero-length lines

      g.addEdge(x, y_start_coord, y_start_coord < y_end_coord ? "up" : "down")
      g.addEdge(x, y_end_coord, y_start_coord < y_end_coord ? "down" : "up")
      for (let y = y_min + 1; y < y_max; ++y) {
        g.addEdge(x, y, "up")
        g.addEdge(x, y, "down")
      }
    } else if (line.start.y === line.end.y) {
      // Horizontal line
      const y = line.start.y
      const x_start_coord = line.start.x
      const x_end_coord = line.end.x
      const x_min = Math.min(x_start_coord, x_end_coord)
      const x_max = Math.max(x_start_coord, x_end_coord)

      if (x_min === x_max) continue // Skip zero-length lines

      g.addEdge(
        x_start_coord,
        y,
        x_start_coord < x_end_coord ? "right" : "left",
      )
      g.addEdge(x_end_coord, y, x_start_coord < x_end_coord ? "left" : "right")
      for (let x = x_min + 1; x < x_max; ++x) {
        g.addEdge(x, y, "left")
        g.addEdge(x, y, "right")
      }
    }
    // Diagonal lines are not handled by this logic
  }
  // 4. Draw connectionPoints with showAsIntersection
  for (const cp of circuit.connectionPoints) {
    if ((cp as any).showAsIntersection) {
      g.putOverlay(cp.x, cp.y, "●")
    }
  }
  return g
}
