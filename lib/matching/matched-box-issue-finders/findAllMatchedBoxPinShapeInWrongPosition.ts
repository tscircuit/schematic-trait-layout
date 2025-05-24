import type { NormalizedNetlist } from "lib/scoring/types"
import type { MatchedBoxPinShapeInWrongPosition } from "../types"
import { convertNormalizedNetlistToInputNetlist } from "lib/netlist/convertNormalizedNetlistToInputNetlist"
import { getPinShapeSignature } from "lib/adapt/getPinShapeSignature"
import type { Side } from "lib/input-types"
import { getPinSideIndex } from "lib/builder/getPinSideIndex"

export function findAllMatchedBoxPinShapeInWrongPosition(params: {
  candidateNetlist: NormalizedNetlist
  targetNetlist: NormalizedNetlist
  candidateBoxIndex: number
  targetBoxIndex: number
}): MatchedBoxPinShapeInWrongPosition[] {
  const candidateInputNetlist = convertNormalizedNetlistToInputNetlist(
    params.candidateNetlist,
  )
  const targetInputNetlist = convertNormalizedNetlistToInputNetlist(
    params.targetNetlist,
  )

  const candidatePinShapes: {
    signature: string
    side: Side
    indexOnSide: number
    pinNumber: number
  }[] = []

  const candidateBox = candidateInputNetlist.boxes[params.candidateBoxIndex]!
  const targetBox = targetInputNetlist.boxes[params.targetBoxIndex]!

  const candidatePinCount =
    candidateBox.leftPinCount +
    candidateBox.rightPinCount +
    candidateBox.topPinCount +
    candidateBox.bottomPinCount
  for (let i = 0; i < candidatePinCount; i++) {
    candidatePinShapes.push({
      signature: getPinShapeSignature({
        netlist: candidateInputNetlist,
        chipId: candidateBox.boxId,
        pinNumber: i + 1,
      }),
      ...getPinSideIndex(i + 1, candidateBox),
      pinNumber: i + 1,
    })
  }

  const issues: MatchedBoxPinShapeInWrongPosition[] = []

  const targetPinCount =
    targetBox.leftPinCount +
    targetBox.rightPinCount +
    targetBox.topPinCount +
    targetBox.bottomPinCount
  for (let i = 0; i < targetPinCount; i++) {
    const targetPinShapeSignature = getPinShapeSignature({
      netlist: targetInputNetlist,
      chipId: targetBox.boxId,
      pinNumber: i + 1,
    })
    const { side: targetPinShapeSide, indexOnSide: targetPinShapeIndexOnSide } =
      getPinSideIndex(i + 1, targetBox)

    const allCandidatePinShapesWithSameSignatureOnSide =
      candidatePinShapes.filter(
        (pinShape) =>
          pinShape.signature === targetPinShapeSignature &&
          pinShape.side === targetPinShapeSide,
      )

    if (allCandidatePinShapesWithSameSignatureOnSide.length === 0) break

    let bestHopsToCorrectPosition = Infinity
    for (const candidatePinShape of allCandidatePinShapesWithSameSignatureOnSide) {
      const hopsToCorrectPosition = Math.abs(
        candidatePinShape.indexOnSide - targetPinShapeIndexOnSide,
      )
      if (hopsToCorrectPosition < bestHopsToCorrectPosition) {
        bestHopsToCorrectPosition = hopsToCorrectPosition
      }
    }

    issues.push({
      type: "matched_box_pin_shape_in_wrong_position",
      candidateBoxIndex: params.candidateBoxIndex,
      targetBoxIndex: params.targetBoxIndex,
      targetPinNumber: i + 1,
      hopsToCorrectPosition: bestHopsToCorrectPosition,
    })
  }

  return issues
}
