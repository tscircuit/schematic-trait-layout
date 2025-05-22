import { getPinSideIndex } from "lib/builder/getPinSideIndex"
import type { Side } from "lib/input-types"

export function getPinsInBox(box: {
  leftPinCount?: number
  rightPinCount?: number
  topPinCount?: number
  bottomPinCount?: number
}) {
  const totalPinCount =
    (box.leftPinCount ?? 0) +
    (box.rightPinCount ?? 0) +
    (box.topPinCount ?? 0) +
    (box.bottomPinCount ?? 0)
  const pins: Array<{
    side: Side
    indexOnSide: number
    indexFromTop?: number
    indexFromLeft?: number
    /** pinNumber or (ccwIndex + 1) */
    pinNumber: number
  }> = []
  for (let i = 0; i < totalPinCount; i++) {
    const { side, indexOnSide, indexFromTop, indexFromLeft } = getPinSideIndex(
      i + 1,
      box,
    )
    pins.push({
      side,
      indexOnSide,
      indexFromTop,
      indexFromLeft,
      pinNumber: i + 1,
    })
  }
  return pins
}
