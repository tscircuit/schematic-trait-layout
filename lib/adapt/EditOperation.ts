import type { Side } from "lib/input-types"

export interface AddLabelToPinOp {
  type: "add_label_to_pin"
  pinNumber: number
  chipId: string
}

export interface AddPinsToSideOp {
  type: "add_pins_to_side"
  side: Side
  chipId: string
  oldPinCount: number
  newPinCount: number
}

export interface RemovePinsFromSideOp {
  type: "remove_pins_from_side"
  side: Side
  chipId: string
  oldPinCount: number
  newPinCount: number
}

export interface AddPinToSideOp {
  type: "add_pin_to_side"
  side: Side
  chipId: string
  betweenPinNumbers: [number, number]
}

export interface RemovePinFromSideOp {
  type: "remove_pin_from_side"
  side: Side
  chipId: string
  pinNumber: number
}

export interface AddPassiveToPinOp {
  type: "add_passive_to_pin"
  pinNumber: number
  chipId: string
}

export interface ClearPinOp {
  type: "clear_pin"
  pinNumber: number
  chipId: string
}

export interface RemoveChipOp {
  type: "remove_chip"
  chipId: string
}

export type EditOperation =
  | RemovePinsFromSideOp
  | AddLabelToPinOp
  | AddPinsToSideOp
  | AddPassiveToPinOp
  | ClearPinOp
  | RemoveChipOp
  | AddPinToSideOp
  | RemovePinFromSideOp
