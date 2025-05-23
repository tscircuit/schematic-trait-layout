import type { Side } from "lib/input-types"

export type PinShapeSummary =
  | "not_connected"
  | "connected_to_label"
  | "connected_to_passive"

export interface NoBoxMatchingPinCounts {
  type: "no_box_matching_pin_counts"
  candidateBoxIndex: number
  targetBoxIndex: number
}

export interface MatchedBoxSideHasWrongPinCount {
  type: "matched_box_side_has_wrong_pin_count"
  candidateBoxIndex: number
  targetBoxIndex: number
}

/**
 * @deprecated Use MatchedBoxMissingPinShapeOnSide instead
 */
export interface MatchedBoxMissingPinShape {
  type: "matched_box_missing_pin_shape"
  candidateBoxIndex: number
  targetBoxIndex: number

  targetPinNumber: number
  targetPinShapeSignature?: string
  targetPinShapeSummary?: PinShapeSummary
}

export interface MatchedBoxMissingPinShapeOnSide {
  type: "matched_box_missing_pin_shape_on_side"
  candidateBoxIndex: number
  targetBoxIndex: number

  side: Side
  targetPinNumber: number
  targetPinShapeSignature?: string
  targetPinShapeSummary?: PinShapeSummary
}

export interface MatchedBoxPinShapeInWrongPosition {
  type: "matched_box_pin_shape_in_wrong_position"
  candidateBoxIndex: number
  targetBoxIndex: number

  targetPinNumber: number

  hopsToCorrectPosition: number
}

export type MatchingIssue =
  | NoBoxMatchingPinCounts
  | MatchedBoxMissingPinShape
  | MatchedBoxSideHasWrongPinCount
  | MatchedBoxPinShapeInWrongPosition
  | MatchedBoxMissingPinShapeOnSide

export type { MatchedBox } from "lib/matching/getMatchedBoxes"
