export type PinShape =
  | "not_connected"
  | "connected_to_label"
  | "connected_to_passive"

export interface NoBoxMatchingPinCounts {
  type: "no_box_matching_pin_counts"
  candidateBoxIndex: number
  targetBoxIndex: number
}

export interface MatchedBoxMissingPinShape {
  type: "matched_box_missing_pin_shape"
  candidateBoxIndex: number
  targetBoxIndex: number

  targetPinNumber: number
  targetPinShape: PinShape
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
