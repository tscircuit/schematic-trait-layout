import type { InputNetlist } from "lib/input-types"
import { normalizeNetlist } from "./normalizeNetlist"
import type { NormalizedNetlistConnection } from "./types"

// A type alias for individual ports within a normalized connection
type NormalizedPort = NormalizedNetlistConnection["connectedPorts"][number]

/**
 * For netlists to be compatible, they must have the same number of boxes. It
 * is ok if the template too many connections to labels and nets, but it must
 * have enough on the right pins as the input.
 */
export const areNetlistsCompatible = (
  input: InputNetlist,
  template: InputNetlist,
): boolean => {
  const { normalizedNetlist: normInput } = normalizeNetlist(input)
  const { normalizedNetlist: normTemplate } = normalizeNetlist(template)

  // 1. Check if the number of boxes is the same
  if (normInput.boxes.length !== normTemplate.boxes.length) {
    return false
  }

  // 2. Check pin counts for each box
  // Boxes are sorted by boxIndex in normalized netlists, so they correspond by index.
  for (let i = 0; i < normInput.boxes.length; i++) {
    const inputBox = normInput.boxes[i]!
    const templateBox = normTemplate.boxes[i]! // Corresponding box

    if (
      inputBox.leftPinCount > templateBox.leftPinCount ||
      inputBox.rightPinCount > templateBox.rightPinCount ||
      inputBox.topPinCount > templateBox.topPinCount ||
      inputBox.bottomPinCount > templateBox.bottomPinCount
    ) {
      return false // Input box requires more pins than template box offers
    }
  }

  // Helper function to compare two NormalizedPort objects
  const arePortsEqual = (
    portA: NormalizedPort,
    portB: NormalizedPort,
  ): boolean => {
    if ("boxIndex" in portA && "boxIndex" in portB) {
      return (
        portA.boxIndex === portB.boxIndex && portA.pinNumber === portB.pinNumber
      )
    }
    if ("netIndex" in portA && "netIndex" in portB) {
      return portA.netIndex === portB.netIndex
    }
    return false // Ports are of different types (e.g., one box, one net)
  }

  // Helper function to check if a specific port exists in an array of ports
  const isPortInArray = (
    portToFind: NormalizedPort,
    portArray: NormalizedPort[],
  ): boolean => {
    return portArray.some((p) => arePortsEqual(portToFind, p))
  }

  // 3. Check connections
  // Every connection in normInput must be satisfiable by a connection in normTemplate.
  // A template connection satisfies an input connection if all ports of the input
  // connection are present in the template connection.
  for (const inputConnection of normInput.connections) {
    let foundMatchingTemplateConnection = false
    for (const templateConnection of normTemplate.connections) {
      let allInputPortsFoundInTemplate = true
      for (const inputPort of inputConnection.connectedPorts) {
        if (!isPortInArray(inputPort, templateConnection.connectedPorts)) {
          allInputPortsFoundInTemplate = false
          break // This input port is not in the current template connection's ports
        }
      }

      if (allInputPortsFoundInTemplate) {
        foundMatchingTemplateConnection = true
        break // Found a template connection that satisfies the current input connection
      }
    }

    if (!foundMatchingTemplateConnection) {
      return false // No template connection could satisfy this input connection
    }
  }

  // If all checks pass, the netlists are compatible
  return true
}
