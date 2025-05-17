import {
  type InputNetlist,
  type Box,
  type Net,
  type Connection,
} from "../types"
import { getReadableNetlist } from "../utils/netlist-utils"
import type { ChipBuilder } from "./legacy-circuit"

type Edge = "left" | "right" | "up" | "down"
type Side = "left" | "right" | "top" | "bottom"
type PortReference = { boxId: string; pinNumber: number } | { netId: string }
type BoxPinLayoutEntry = { side: Side; count: number; startGlobalPin: number }

export class CircuitBuilder {
  chips: ChipBuilder[] = []

  clone(): CircuitBuilder {
    // TODO: Implement clone method
  }

  private _calculateChipVisualDimensions(pinCounts: {
    left: number
    right: number
    top: number
    bottom: number
  }): { bodyWidth: number; bodyHeight: number } {
    // TODO: Implement _calculateChipVisualDimensions method
    return { bodyWidth: 0, bodyHeight: 0 }
  }

  private _drawChipOutlineAndPinNumbers(
    chipId: string,
    originX: number,
    originY: number,
    bodyWidth: number,
    bodyHeight: number,
    pinCounts: { left: number; right: number; top: number; bottom: number },
    boxLayout: ReadonlyArray<BoxPinLayoutEntry>,
    targetGrid: Grid,
  ): void {
    // TODO: Implement _drawChipOutlineAndPinNumbers method
  }

  bifurcateX(chipId: string): [CircuitBuilder, CircuitBuilder] {
    // TODO: Implement bifurcateX method
    return [new CircuitBuilder(), new CircuitBuilder()]
  }

  private _retainReachableFromChip(chipId: string): void {
    // TODO: Implement _retainReachableFromChip method
  }

  chip(): any {
    // TODO: Implement chip method
    return null
  }

  recordBoxPinLayout(
    chipId: string,
    side: Side,
    count: number,
    startGlobalPin: number,
  ): void {
    if (!this.boxPinLayouts[chipId]) {
      this.boxPinLayouts[chipId] = []
    }
    this.boxPinLayouts[chipId].push({ side, count, startGlobalPin })
  }

  addEdge(x: number, y: number, edge: Edge): void {
    this.grid.addEdge(x, y, edge)
  }

  putOverlay(x: number, y: number, ch: string): void {
    this.grid.putOverlay(x, y, ch)
  }

  associateCoordinateWithNetItem(
    x: number,
    y: number,
    item: PortReference,
  ): void {
    // TODO: Implement associateCoordinateWithNetItem method
  }

  private areSamePortRef(a: PortReference, b: PortReference): boolean {
    if ("boxId" in a && "boxId" in b)
      return a.boxId === b.boxId && a.pinNumber === b.pinNumber
    if ("netId" in a && "netId" in b) return a.netId === b.netId
    return false
  }

  private isPortInConnection(item: PortReference, conn: Connection): boolean {
    return conn.connectedPorts.some((p) =>
      this.areSamePortRef(item, p as PortReference),
    )
  }

  private findConnectionContaining(
    item: PortReference,
  ): Connection | undefined {
    return this.netlistComponents.connections.find((c) =>
      this.isPortInConnection(item, c),
    )
  }

  connectItems(a: PortReference | null, b: PortReference | null): void {
    // TODO: Implement connectItems method
  }

  drawOrthogonalSegment(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    item: PortReference | null,
  ): void {
    // TODO: Implement drawOrthogonalSegment method
  }

  private drawOrthogonalSegmentOnGrid(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    item: PortReference | null,
    grid: Grid,
  ): void {
    // TODO: Implement drawOrthogonalSegmentOnGrid method
  }

  toString(): string {
    return this.grid.toString()
  }

  getNetlist(): InputNetlist {
    return structuredClone(this.netlistComponents)
  }

  getReadableNetlist(): string {
    return getReadableNetlist(this.getNetlist())
  }

  flipX(): this {
    // TODO: Implement flipX method
    return this
  }
}
