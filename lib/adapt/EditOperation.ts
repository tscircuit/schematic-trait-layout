import type { Side } from "lib/input-types"

export interface AddLabelToPinOp {
  type: "add_label_to_pin"
  pinNumber: number
  chipId: string
  netName?: string
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

export interface AddPassiveWithLabelToPinOp {
  type: "add_passive_with_label_to_pin"
  pinNumber: number
  chipId: string
  labelNetId: string
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

export interface ChangePassiveOrientationOp {
  type: "change_passive_orientation"
  chipId: string
  fromOrientation: "horizontal" | "vertical"
  toOrientation: "horizontal" | "vertical"
}

export type EditOperation =
  | AddLabelToPinOp
  | AddPassiveToPinOp
  | AddPassiveWithLabelToPinOp
  | ClearPinOp
  | RemoveChipOp
  | AddPinToSideOp
  | RemovePinFromSideOp
  | ChangePassiveOrientationOp
