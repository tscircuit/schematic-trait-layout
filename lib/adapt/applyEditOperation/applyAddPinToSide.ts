import type { CircuitBuilder, ChipBuilder } from "lib/builder"
import { PinBuilder } from "lib/builder"
import type { AddPinToSideOp } from "../EditOperation"
import type { Side } from "lib/input-types"
import type { PortReference } from "lib/builder/circuit-types"

export function applyAddPinToSide(C: CircuitBuilder, op: AddPinToSideOp) {
  const { chipId, side, betweenPinNumbers } = op
  const chip = C.chips.find((c) => c.chipId === chipId)
  if (!chip) return

  // TODO
}
