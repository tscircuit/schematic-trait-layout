import type { Side } from "."
import { PinBuilder } from "./PinBuilder"
import type { CircuitBuilder } from "./CircuitBuilder"

const SIDES_CCW = ["left", "bottom", "right", "top"] as const

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

  private makePin(globalPinNumber: number, offsetX: number, offsetY: number): PinBuilder {
    const pb = new PinBuilder(this, globalPinNumber)
    pb.x = this.x + offsetX
    pb.y = this.y + offsetY
    this.pinMap[String(globalPinNumber)] = pb
    return pb
  }

  leftside(count: number): this {
    this.leftPinCount = count
    for (let i = 0; i < count; ++i) {
      // left side: top to bottom, global pin number increases
      const globalPinNumber = this.leftPins.length + 1
      const pb = this.makePin(globalPinNumber, 0, i + 1)
      this.leftPins.push(pb)
    }
    return this
  }

  rightside(count: number): this {
    this.rightPinCount = count
    for (let i = 0; i < count; ++i) {
      // right side: bottom to top, global pin number increases
      const globalPinNumber = this.leftPinCount + this.bottomPinCount + this.rightPins.length + 1
      const pb = this.makePin(globalPinNumber, 4, count - i)
      this.rightPins.push(pb)
    }
    return this
  }

  topside(count: number): this {
    this.topPinCount = count
    for (let i = 0; i < count; ++i) {
      // top side: left to right, global pin number increases
      const globalPinNumber = this.leftPinCount + this.bottomPinCount + this.rightPinCount + this.topPins.length + 1
      const pb = this.makePin(globalPinNumber, i + 1, 0)
      this.topPins.push(pb)
    }
    return this
  }

  bottomside(count: number): this {
    this.bottomPinCount = count
    for (let i = 0; i < count; ++i) {
      // bottom side: right to left, global pin number increases
      const globalPinNumber = this.leftPinCount + this.bottomPins.length + 1
      const pb = this.makePin(globalPinNumber, count - i, this.getHeight() - 1)
      this.bottomPins.push(pb)
    }
    return this
  }

  // Aliases for test compatibility
  leftpins = this.leftside
  rightpins = this.rightside
  topside = this.topside
  bottomside = this.bottomside

  getHeight(): number {
    return Math.max(this.leftPinCount, this.rightPinCount, 1) + 2
  }

  pin(pinNumber: number): PinBuilder {
    // Find the pin in the four side arrays
    if (this.pinMap[String(pinNumber)]) return this.pinMap[String(pinNumber)]
    // fallback: try to find by order
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
