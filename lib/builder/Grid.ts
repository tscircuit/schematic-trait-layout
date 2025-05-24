import type { Edge } from "./circuit-types"

export const EDGE_MASKS = {
  left: 1,
  right: 2,
  up: 4,
  down: 8,
}

export function glyph(mask: number): string {
  switch (mask) {
    case 0:
      return " "
    case EDGE_MASKS.left:
    case EDGE_MASKS.right:
      return "─"
    case EDGE_MASKS.up:
    case EDGE_MASKS.down:
      return "│"
    case EDGE_MASKS.left | EDGE_MASKS.right:
      return "─"
    case EDGE_MASKS.up | EDGE_MASKS.down:
      return "│"
    case EDGE_MASKS.left | EDGE_MASKS.up:
      return "┘"
    case EDGE_MASKS.left | EDGE_MASKS.down:
      return "┐"
    case EDGE_MASKS.right | EDGE_MASKS.up:
      return "└"
    case EDGE_MASKS.right | EDGE_MASKS.down:
      return "┌"
    case EDGE_MASKS.left | EDGE_MASKS.right | EDGE_MASKS.up:
      return "┴"
    case EDGE_MASKS.left | EDGE_MASKS.right | EDGE_MASKS.down:
      return "┬"
    case EDGE_MASKS.left | EDGE_MASKS.up | EDGE_MASKS.down:
      return "┤"
    case EDGE_MASKS.right | EDGE_MASKS.up | EDGE_MASKS.down:
      return "├"
    case EDGE_MASKS.left | EDGE_MASKS.right | EDGE_MASKS.up | EDGE_MASKS.down:
      return "┼"
    default:
      return " "
  }
}

export class Grid {
  traces = new Map<string, number>() // key "x,y" → Edge mask
  overlay = new Map<string, string>() // key "x,y" → literal char
  gridScaleX: number
  gridScaleY: number
  showAxisLabels: boolean

  constructor(
    options: {
      gridScaleX?: number
      gridScaleY?: number
      gridScale?: number
      showAxisLabels?: boolean
    } = {},
  ) {
    // Support both new separate scales and legacy gridScale for backward compatibility
    this.gridScaleX = options.gridScaleX ?? options.gridScale ?? 1
    this.gridScaleY = options.gridScaleY ?? options.gridScale ?? 1
    this.showAxisLabels = options.showAxisLabels ?? false
  }

  addEdge(x: number, y: number, edge: Edge): void {
    const scaledX = Math.round(x * this.gridScaleX)
    const scaledY = Math.round(y * this.gridScaleY)
    const key = `${scaledX},${scaledY}`
    const maskValue = EDGE_MASKS[edge]
    this.traces.set(key, (this.traces.get(key) ?? 0) | maskValue)
  }

  putOverlay(x: number, y: number, ch: string): void {
    const scaledX = Math.round(x * this.gridScaleX)
    const scaledY = Math.round(y * this.gridScaleY)
    this.overlay.set(`${scaledX},${scaledY}`, ch)
  }

  *coords(): IterableIterator<[number, number]> {
    const seen = new Set<string>()
    for (const key of this.traces.keys()) seen.add(key)
    for (const key of this.overlay.keys()) seen.add(key)
    for (const key of seen) {
      const [xs, ys] = key.split(",")
      yield [Number(xs), Number(ys)]
    }
  }

  toString(): string {
    if (this.traces.size === 0 && this.overlay.size === 0) return ""

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const [x, y] of this.coords()) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }

    const rows: string[] = []

    // Add X-axis labels only if showAxisLabels is true
    if (this.showAxisLabels) {
      const labelInterval = Math.max(1, Math.round(5 * this.gridScaleX))
      let xAxisRow = "     " // Space for Y-axis labels + margin
      for (let x = minX; x <= maxX; x++) {
        if (x % labelInterval === 0) {
          const displayX =
            this.gridScaleX !== 1
              ? (x / this.gridScaleX).toFixed(1).slice(-4)
              : x
          const xStr = displayX.toString()
          xAxisRow += xStr
          // Add spaces to align the next number
          for (let i = 1; i < labelInterval && x + i <= maxX; i++) {
            xAxisRow += " "
          }
          // Skip the next positions since we've already handled them
          x += labelInterval - 1
        } else {
          xAxisRow += " "
        }
      }
      rows.push(xAxisRow)
    }

    for (let y = maxY; y >= minY; y--) {
      let row = ""

      // Add Y-axis label only if showAxisLabels is true
      if (this.showAxisLabels) {
        const displayY = (y / this.gridScaleY).toFixed(1).slice(-4)
        const yLabel = displayY.toString().padStart(4, " ")
        row = `${yLabel} `
      }
      for (let x = minX; x <= maxX; x++) {
        const key = `${x},${y}`
        const over = this.overlay.get(key)
        const trace = this.traces.get(key) ?? 0
        row += over ?? glyph(trace)
      }
      rows.push(row.replace(/ +$/g, ""))
    }
    return rows.join("\n")
  }
}
