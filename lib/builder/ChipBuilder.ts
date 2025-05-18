import type { Side } from "."
import { PinBuilder } from "./PinBuilder"
import type { CircuitBuilder } from "./CircuitBuilder"

const SIDES_CCW = ["left", "bottom", "right", "top"] as const

interface MakePinParams {
  side: Side
  indexOnSide: number
  ccwPinNumber: number
  offsetX: number
  offsetY: number
}

export class ChipBuilder {
  public x = 0
  public y = 0
  public leftPins: PinBuilder[] = []
  public rightPins: PinBuilder[] = []
  public topPins: PinBuilder[] = []
  public bottomPins: PinBuilder[] = []
  public leftPinCount = 0
  public rightPinCount = 0
  public topPinCount = 0
  public bottomPinCount = 0
  private pinMap: Record<string, PinBuilder> = {}
  private marks: Record<string, { pinBuilder: PinBuilder; state: any }> = {}

  constructor(
    public readonly circuit: CircuitBuilder,
    public readonly chipId: string,
  ) {}

  at(x: number, y: number): this {
    this.x = x
    this.y = y
    return this
  }

  private makePin({
    side,
    indexOnSide,
    ccwPinNumber,
    offsetX,
    offsetY,
  }: MakePinParams): PinBuilder {
    const pb = new PinBuilder(this, ccwPinNumber)
    pb.x = this.x + offsetX
    pb.y = this.y + offsetY
    this.pinMap[`${side}${indexOnSide}`] = pb
    return pb
  }

  leftpins(count: number): this {
    this.leftPinCount = count
    // Pins are created and stored in this.leftPins in visual top-to-bottom order.
    // Pin 1 (if on the left side) is the topmost.
    // OffsetY needs to be higher for topmost pins.
    // If count = 2:
    //   i=0 (topmost pin, e.g. Pin 1): ccwPinNumber=1. offsetY should be 2 (or count).
    //   i=1 (next pin down, e.g. Pin 2): ccwPinNumber=2. offsetY should be 1.
    for (let i = 0; i < count; ++i) {
      // i is the 0-indexed visual position from the top of the left side.
      const ccwPinNumber = i + 1
      const offsetY = count - i // Higher 'y' for pins closer to the top.
      const pb = this.makePin({
        side: "left",
        indexOnSide: i,
        ccwPinNumber,
        offsetX: 0,
        offsetY,
      })
      this.leftPins.push(pb)
    }
    return this
  }

  rightpins(count: number): this {
    this.rightPinCount = count
    for (let i = 0; i < count; ++i) {
      // right side: pins are numbered bottom-to-top.
      // i = 0 corresponds to the bottom-most pin on this side.
      // offsetY should be i + 1 (1 for bottom-most, up to 'count' for top-most).
      const ccwPinNumber = this.leftPinCount + this.bottomPinCount + i + 1
      const pb = this.makePin({
        side: "right",
        indexOnSide: i,
        ccwPinNumber,
        offsetX: this.rightPinCount === 1 ? 1 : 4,
        offsetY: i + 1,
      })
      this.rightPins.push(pb)
    }
    return this
  }

  toppins(count: number): this {
    this.topPinCount = count
    for (let i = 0; i < count; ++i) {
      // top side: left to right, ccwPinNumber increases
      const ccwPinNumber =
        this.leftPinCount + this.bottomPinCount + this.rightPinCount + i + 1
      const pb = this.makePin({
        side: "top",
        indexOnSide: i,
        ccwPinNumber,
        offsetX: i + 1,
        offsetY: 0,
      })
      this.topPins.push(pb)
    }
    return this
  }

  bottompins(count: number): this {
    this.bottomPinCount = count
    for (let i = 0; i < count; ++i) {
      // bottom side: right to left, ccwPinNumber increases
      const ccwPinNumber = this.leftPinCount + i + 1
      const pb = this.makePin({
        side: "bottom",
        indexOnSide: i,
        ccwPinNumber,
        offsetX: i,
        offsetY: 0,
      })
      this.bottomPins.push(pb)
    }
    return this
  }

  getHeight(): number {
    if (
      this.leftPinCount === 0 &&
      this.rightPinCount === 0 &&
      this.topPinCount === 1 &&
      this.bottomPinCount === 1
    ) {
      return 1
    }
    return Math.max(this.leftPinCount, this.rightPinCount, 1) + 2
  }

  pin(pinNumber: number): PinBuilder {
    // Find the pin by its 1-based ccwPinNumber by checking sides in order: Left, Bottom, Right, Top.
    let n = pinNumber
    if (n <= this.leftPins.length) return this.leftPins[n - 1]
    n -= this.leftPins.length
    if (n <= this.bottomPins.length) return this.bottomPins[n - 1]
    n -= this.bottomPins.length
    if (n <= this.rightPins.length) return this.rightPins[n - 1]
    n -= this.rightPins.length
    if (n <= this.topPins.length) return this.topPins[n - 1]
    throw new Error(`Pin number ${pinNumber} not found`)
  }

  addMark(name: string, pinBuilder: PinBuilder): void {
    this.marks[name] = { pinBuilder, state: pinBuilder.getMarkableState() }
  }

  fromMark(name: string): PinBuilder {
    const { pinBuilder, state } = this.marks[name]
    pinBuilder.applyMarkableState(state)
    return pinBuilder
  }
}
