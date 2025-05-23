import type { NormalizedNetlist } from "lib/scoring/types"
import type {
  MatchedBoxMissingPinShape,
  NoBoxMatchingPinCounts,
} from "../types"
import { convertNormalizedNetlistToInputNetlist } from "lib/netlist/convertNormalizedNetlistToInputNetlist"
import { getPinShapeSignature } from "lib/adapt/getPinShapeSignature"

export function findAllMatchedBoxMissingPinShape(params: {
  candidateNetlist: NormalizedNetlist
  targetNetlist: NormalizedNetlist
  candidateBoxIndex: number
  targetBoxIndex: number
}): MatchedBoxMissingPinShape[] {
  const candidateInputNetlist = convertNormalizedNetlistToInputNetlist(
    params.candidateNetlist,
  )
  const targetInputNetlist = convertNormalizedNetlistToInputNetlist(
    params.targetNetlist,
  )

  const candidatePinShapes: string[] = []
  const targetPinShapes: string[] = []

  const candidateBox = candidateInputNetlist.boxes[params.candidateBoxIndex]!
  const targetBox = targetInputNetlist.boxes[params.targetBoxIndex]!

  const candidatePinCount =
    candidateBox.leftPinCount +
    candidateBox.rightPinCount +
    candidateBox.topPinCount +
    candidateBox.bottomPinCount
  for (let i = 0; i < candidatePinCount; i++) {
    candidatePinShapes.push(
      getPinShapeSignature({
        netlist: candidateInputNetlist,
        chipId: candidateBox.boxId,
        pinNumber: i,
      }),
    )
  }

  const unusedCandidatePinShapes = [...candidatePinShapes]

  const issues: MatchedBoxMissingPinShape[] = []

  const targetPinCount =
    targetBox.leftPinCount +
    targetBox.rightPinCount +
    targetBox.topPinCount +
    targetBox.bottomPinCount
  for (let i = 0; i < targetPinCount; i++) {
    const targetPinShapeSignature = getPinShapeSignature({
      netlist: targetInputNetlist,
      chipId: targetBox.boxId,
      pinNumber: i,
    })

    if (unusedCandidatePinShapes.includes(targetPinShapeSignature)) {
      unusedCandidatePinShapes.splice(
        unusedCandidatePinShapes.indexOf(targetPinShapeSignature),
        1,
      )
      continue
    }

    issues.push({
      type: "matched_box_missing_pin_shape",
      candidateBoxIndex: params.candidateBoxIndex,
      targetBoxIndex: params.targetBoxIndex,
      targetPinNumber: i,
      targetPinShapeSignature,
    })
  }

  return issues
}
