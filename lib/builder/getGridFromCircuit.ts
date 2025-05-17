import type { CircuitBuilder } from "./CircuitBuilder"
import { Grid } from "./Grid"

export const getGridFromCircuit = (circuit: CircuitBuilder): Grid => {
  const g = new Grid()
  // 1. Draw every chip
  for (const chip of circuit.chips) {
    // Passive chips: if all pin counts <= 1, draw as 'P'
    const isPassive =
      (chip.leftPinCount + chip.rightPinCount + chip.topPinCount + chip.bottomPinCount) <= 2 &&
      (chip.leftPinCount === 1 || chip.rightPinCount === 1 || chip.topPinCount === 1 || chip.bottomPinCount === 1)
    if (isPassive) {
      g.putOverlay(chip.x, chip.y, "P")
      continue
    }
    // width = 5, height = max(leftPins.length, rightPins.length, 1) + 2
    const height = Math.max(chip.leftPinCount, chip.rightPinCount, 1) + 2
    for (let row = 0; row < height; ++row) {
      let leftChar = " "
      let rightChar = " "
      let mid0 = " "
      let mid1 = " "
      let mid2 = " "
      // left pin numbers
      if (row > 0 && row <= chip.leftPinCount) {
        leftChar = String(chip.leftPins[row - 1]?.pinNumber ?? " ")
      }
      // right pin numbers
      if (row > 0 && row <= chip.rightPinCount) {
        rightChar = String(chip.rightPins[chip.rightPinCount - row]?.pinNumber ?? " ")
      }
      // top/bottom border
      if (row === 0) {
        mid0 = "┌"
        mid1 = "───"
        mid2 = "┐"
        leftChar = " "
        rightChar = " "
      } else if (row === height - 1) {
        mid0 = "└"
        mid1 = "───"
        mid2 = "┘"
        leftChar = " "
        rightChar = " "
      } else {
        mid0 = "│"
        mid1 = "   "
        mid2 = "│"
      }
      // Compose row string
      const rowStr =
        leftChar +
        mid0 +
        (mid1.length === 3 ? mid1 : mid1.padEnd(3, " ")) +
        mid2 +
        rightChar
      // Place each character
      for (let col = 0; col < rowStr.length; ++col) {
        g.putOverlay(chip.x + col, chip.y + row, rowStr[col])
      }
    }
  }
  // 2. Draw labels
  for (const label of circuit.netLabels) {
    for (let i = 0; i < label.labelId.length; ++i) {
      g.putOverlay(label.x + i, label.y, label.labelId[i])
    }
  }
  // 3. Draw traces
  for (const line of circuit.lines) {
    if (line.start.x === line.end.x) {
      // vertical
      const x = line.start.x
      const y0 = Math.min(line.start.y, line.end.y)
      const y1 = Math.max(line.start.y, line.end.y)
      for (let y = y0; y <= y1; ++y) {
        g.addEdge(x, y, "up")
        g.addEdge(x, y, "down")
      }
    } else if (line.start.y === line.end.y) {
      // horizontal
      const y = line.start.y
      const x0 = Math.min(line.start.x, line.end.x)
      const x1 = Math.max(line.start.x, line.end.x)
      for (let x = x0; x <= x1; ++x) {
        g.addEdge(x, y, "left")
        g.addEdge(x, y, "right")
      }
    }
  }
  // 4. Draw connectionPoints with showAsIntersection
  for (const cp of circuit.connectionPoints) {
    if ((cp as any).showAsIntersection) {
      g.putOverlay(cp.x, cp.y, "●")
    }
  }
  return g
}
