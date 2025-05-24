import type { CircuitBuilder } from "./CircuitBuilder"
import { Grid } from "./Grid"

export const getGridFromCircuit = (
  circuit: CircuitBuilder,
  opts: {
    chipLabels?: boolean
    showAxisLabels?: boolean
    gridScaleX?: number
    gridScaleY?: number
  } = {},
): Grid => {
  opts.chipLabels ??= true
  opts.showAxisLabels ??= false
  opts.gridScaleX ??= 1
  opts.gridScaleY ??= 1

  const g = new Grid({
    showAxisLabels: opts.showAxisLabels,
    gridScaleX: opts.gridScaleX,
    gridScaleY: opts.gridScaleY,
  })
  // 1. Draw every chip
  for (const chip of circuit.chips) {
    if (chip.isPassive) {
      g.putOverlay(chip.x, chip.y, chip.chipId[0]!)
      // TODO if the x+1,y is already occupied, then don't write to it
      g.putOverlay(chip.x + 1, chip.y, chip.chipId[1]!)
      continue
    }
    // width = 5, height = max(leftPins.length, rightPins.length, 1) + 2
    const height = Math.max(chip.leftPinCount, chip.rightPinCount, 1) + 2

    if (opts.chipLabels && chip.topPinCount === 0) {
      const labelY = chip.y + height // One row above the chip's top border
      const chipBodyWidth = 5 // Chip body is 5 characters wide
      const labelText = chip.chipId

      let displayLabel = labelText
      let labelActualX = chip.x // Base X position for the label

      if (labelText.length <= chipBodyWidth) {
        // Center the label if it's shorter than or equal to the chip width
        labelActualX += Math.floor((chipBodyWidth - labelText.length) / 2)
      } else {
        // Truncate the label if it's longer than the chip width
        displayLabel = labelText.substring(0, chipBodyWidth)
        // For truncated labels, they start at chip.x, so labelActualX is already correct.
      }

      for (let i = 0; i < displayLabel.length; i++) {
        g.putOverlay(labelActualX + i, labelY, displayLabel[i]!)
      }
    }

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
