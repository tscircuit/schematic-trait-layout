import type { Side } from "lib/input-types"

/**
 * Returns a unit vector (dx, dy) for the given side
 *
 * left: { dx: -1, dy: 0 }
 * right: { dx: 1, dy: 0 }
 * top: { dx: 0, dy: 1 }
 * bottom: { dx: 0, dy: -1 }
 */
export function getUnitVecFromSide(side: Side): { dx: number; dy: number } {
  return side === "left"
    ? { dx: -1, dy: 0 }
    : side === "right"
      ? { dx: 1, dy: 0 }
      : side === "top"
        ? { dx: 0, dy: 1 }
        : { dx: 0, dy: -1 }
}
