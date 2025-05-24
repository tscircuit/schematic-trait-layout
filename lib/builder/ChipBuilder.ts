import type { Side } from "."
import { PinBuilder } from "./PinBuilder"
import type { CircuitBuilder } from "./CircuitBuilder"
import { getPinSideIndex } from "./getPinSideIndex"

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
    public readonly isPassive: boolean = false,
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
    this.pinMap[`${side}${indexOnSide}`] = pb
    return pb
  }

  leftpins(count: number): this {
    if (this.pinPositionsAreSet) {
      throw new Error("Pin positions are already set, cannot add new pins")
    }
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
    if (this.pinPositionsAreSet) {
      throw new Error("Pin positions are already set, cannot add new pins")
    }
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
        offsetX: this.rightPinCount === 1 ? 1 : this.getWidth(),
        offsetY: i + 1,
      })
      this.rightPins.push(pb)
    }
    return this
  }

  toppins(count: number): this {
    if (this.pinPositionsAreSet) {
      throw new Error("Pin positions are already set, cannot add new pins")
    }
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
    if (this.pinPositionsAreSet) {
      throw new Error("Pin positions are already set, cannot add new pins")
    }
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

  getWidth(): number {
    if (this.isPassive) {
      // Horizontal passive (left-right pins) uses defaultPassiveWidth
      // Vertical passive (top-bottom pins) uses defaultPassiveHeight
      const isHorizontal = this.leftPinCount > 0 || this.rightPinCount > 0
      return isHorizontal
        ? this.circuit.defaultPassiveWidth
        : this.circuit.defaultPassiveHeight
    }
    // Temporary, eventually need to handle top and bottom pin counts
    return this.circuit.defaultChipWidth
  }

  getHeight(): number {
    if (this.isPassive) {
      // Horizontal passive (left-right pins) uses defaultPassiveHeight
      // Vertical passive (top-bottom pins) uses defaultPassiveWidth
      const isHorizontal = this.leftPinCount > 0 || this.rightPinCount > 0
      return isHorizontal
        ? this.circuit.defaultPassiveHeight
        : this.circuit.defaultPassiveWidth
    }
    return (
      Math.max(this.leftPinCount, this.rightPinCount) *
        this.circuit.defaultPinSpacing +
      this.circuit.defaultPinSpacing
    )
  }

  getCenter(): { x: number; y: number } {
    if (this.isPassive) {
      return {
        x: this.x,
        y: this.y,
      }
    }
    return {
      x: this.x + this.getWidth() / 2,
      y: this.y + this.getHeight() / 2,
    }
  }

  get totalPinCount(): number {
    return (
      this.leftPinCount +
      this.rightPinCount +
      this.topPinCount +
      this.bottomPinCount
    )
  }

  setPinPositions(): void {
    // if (this.isPassive) {
    //   const pb1 = this._getPin(1)
    //   const pb2 = this._getPin(2)
    //   pb1.x = this.x
    //   pb1.y = this.y
    //   pb2.x = this.x
    //   pb2.y = this.y
    //   return
    // }

    for (let pn = 1; pn <= this.totalPinCount; pn++) {
      const pb = this._getPin(pn)
      const pinLocation = this.getPinLocation(pn)
      pb.x = pinLocation.x
      pb.y = pinLocation.y
    }
    this.pinPositionsAreSet = true
  }

  pinPositionsAreSet = false

  private _getPin(pinNumber: number): PinBuilder {
    let n = pinNumber
    if (n <= this.leftPins.length) return this.leftPins[n - 1]!
    n -= this.leftPins.length
    if (n <= this.bottomPins.length) return this.bottomPins[n - 1]!
    n -= this.bottomPins.length
    if (n <= this.rightPins.length) return this.rightPins[n - 1]!
    n -= this.rightPins.length
    if (n <= this.topPins.length) return this.topPins[n - 1]!
    throw new Error(`Pin number ${pinNumber} not found`)
  }

  pin(pinNumber: number): PinBuilder {
    if (!this.pinPositionsAreSet) {
      this.setPinPositions()
    }
    // Find the pin by its 1-based ccwPinNumber by checking sides in order: Left, Bottom, Right, Top
    return this._getPin(pinNumber)
  }

  public getPinLocation(pinNumber: number): { x: number; y: number } {
    const { side, indexFromTop, indexFromLeft } = getPinSideIndex(
      pinNumber,
      this,
    )

    if (this.isPassive) {
      const dx =
        (this.leftPinCount > 0 ? this.getWidth() / 2 : 0) *
        (pinNumber === 1 ? 1 : -1)
      const dy =
        (this.bottomPinCount > 0 ? this.getHeight() / 2 : 0) *
        (pinNumber === 2 ? 1 : -1)
      return { x: this.x + dx, y: this.y + dy }
    }

    let pinX: number
    let pinY: number
    const spacing = this.circuit.defaultPinSpacing

    if (side === "left" || side === "right") {
      pinX = this.x + (side === "left" ? 0 : this.getWidth())
      pinY = this.y + this.getHeight() - spacing - indexFromTop! * spacing
    } else {
      // top or bottom
      pinX = this.x + indexFromLeft! * spacing
      pinY = this.y + (side === "bottom" ? 0 : this.getHeight())
    }
    return { x: pinX, y: pinY }
  }

  addMark(name: string, pinBuilder: PinBuilder): void {
    this.marks[name] = { pinBuilder, state: pinBuilder.getMarkableState() }
  }

  fromMark(name: string): PinBuilder {
    if (!this.marks[name]) {
      throw new Error(`Mark "${name}" not found`)
    }
    const { pinBuilder, state } = this.marks[name]

    pinBuilder.applyMarkableState(state)
    return pinBuilder
  }
}
