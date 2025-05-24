import type { NormalizedNetlist } from "lib/scoring/types"
import type { MissingConnectionBetweenBoxes, MatchedBox } from "../types"
import { convertNormalizedNetlistToInputNetlist } from "lib/netlist/convertNormalizedNetlistToInputNetlist"

export function findAllMissingConnectionBetweenBoxes(params: {
  candidateNetlist: NormalizedNetlist
  targetNetlist: NormalizedNetlist
  candidateBoxIndex: number
  targetBoxIndex: number
  matchedBoxes: MatchedBox[]
}): MissingConnectionBetweenBoxes[] {
  const { candidateNetlist, targetNetlist, candidateBoxIndex, targetBoxIndex, matchedBoxes } = params
  const issues: MissingConnectionBetweenBoxes[] = []

  const targetInputNetlist = convertNormalizedNetlistToInputNetlist(targetNetlist)
  const candidateInputNetlist = convertNormalizedNetlistToInputNetlist(candidateNetlist)

  const targetBox = targetInputNetlist.boxes[targetBoxIndex]!
  const candidateBox = candidateInputNetlist.boxes[candidateBoxIndex]!

  // Get all pins for the target box
  const targetPinCount =
    targetBox.leftPinCount +
    targetBox.rightPinCount +
    targetBox.topPinCount +
    targetBox.bottomPinCount

  // For each pin on the target box, check if it should be connected to another matched box
  for (let pinNumber = 1; pinNumber <= targetPinCount; pinNumber++) {
    // Find connections involving this pin
    const connectionsWithThisPin = targetInputNetlist.connections.filter(conn =>
      conn.connectedPorts.some(port => 
        'boxId' in port && port.boxId === targetBox.boxId && port.pinNumber === pinNumber
      )
    )

    for (const connection of connectionsWithThisPin) {
      // Check if this connection involves another box that has been matched
      for (const port of connection.connectedPorts) {
        if ('boxId' in port && port.boxId !== targetBox.boxId) {
          // Find if this box is in our matched boxes
          const otherTargetBoxIndex = targetInputNetlist.boxes.findIndex(box => box.boxId === port.boxId)
          if (otherTargetBoxIndex === -1) continue

          const matchedBoxForOtherTarget = matchedBoxes.find(mb => mb.targetBoxIndex === otherTargetBoxIndex)
          if (!matchedBoxForOtherTarget) continue

          // Check if the corresponding candidate boxes are connected
          const candidateOtherBox = candidateInputNetlist.boxes[matchedBoxForOtherTarget.candidateBoxIndex]!
          
          // Look for a connection between the candidate boxes at the same pin positions
          const candidateConnectionExists = candidateInputNetlist.connections.some(candidateConn =>
            candidateConn.connectedPorts.some(candidatePort => 
              'boxId' in candidatePort && 
              candidatePort.boxId === candidateBox.boxId && 
              candidatePort.pinNumber === pinNumber
            ) &&
            candidateConn.connectedPorts.some(candidatePort =>
              'boxId' in candidatePort && 
              candidatePort.boxId === candidateOtherBox.boxId && 
              candidatePort.pinNumber === port.pinNumber
            )
          )

          if (!candidateConnectionExists) {
            issues.push({
              type: "missing_connection_between_boxes",
              candidateBoxIndex,
              targetBoxIndex,
              targetPinNumber: pinNumber,
              expectedConnectionWithTargetBoxIndex: otherTargetBoxIndex,
              expectedConnectionWithTargetBoxPinNumber: port.pinNumber,
            })
          }
        }
      }
    }
  }

  return issues
}