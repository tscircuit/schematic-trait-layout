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

export interface MatchedBoxMissingPinShape {
  type: "matched_box_missing_pin_shape"
  candidateBoxIndex: number
  targetBoxIndex: number

  targetPinNumber: number
  targetPinShapeSignature?: string
  targetPinShapeSummary?: PinShapeSummary
}

export interface MatchedPinOutOfPlace {
  type: "matched_box_pin_out_of_place"
  candidateBoxIndex: number
  targetBoxIndex: number

  targetPinNumber: number
  candidatePinNumber: number

  hopsToCorrectPosition: number
}

export type MatchingIssue =
  | NoBoxMatchingPinCounts
  | MatchedBoxMissingPinShape
  | MatchedPinOutOfPlace
  | MatchedBoxSideHasWrongPinCount

export type { MatchedBox } from "lib/matching/getMatchedBoxes"
