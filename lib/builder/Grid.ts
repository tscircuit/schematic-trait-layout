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

  addEdge(x: number, y: number, edge: Edge): void {
    const key = `${Math.round(x)},${Math.round(y)}`
    const maskValue = EDGE_MASKS[edge]
    this.traces.set(key, (this.traces.get(key) ?? 0) | maskValue)
  }

  putOverlay(x: number, y: number, ch: string): void {
    this.overlay.set(`${Math.round(x)},${Math.round(y)}`, ch)
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
    for (let y = maxY; y >= minY; y--) {
      let row = ""
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
