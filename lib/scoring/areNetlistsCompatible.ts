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
  const { normalizedNetlist: normInput, transform: normInputTransform } =
    normalizeNetlist(input)
  const { normalizedNetlist: normTemplate, transform: normTemplateTransform } =
    normalizeNetlist(template)

  // 1. Check if the set of Box IDs is identical.
  // This ensures that normInput.boxes[i] and normTemplate.boxes[i] correspond
  // to the same original component, assuming normalizeNetlist sorts them by ID
  // before creating the indexed 'boxes' array in NormalizedNetlist.
  const inputUniqueBoxIds = Object.keys(
    normInputTransform.boxIdToBoxIndex,
  ).sort()
  const templateUniqueBoxIds = Object.keys(
    normTemplateTransform.boxIdToBoxIndex,
  ).sort()

  if (
    inputUniqueBoxIds.length !== templateUniqueBoxIds.length ||
    !inputUniqueBoxIds.every((id, index) => id === templateUniqueBoxIds[index])
  ) {
    return false // Sets of Box IDs are not identical
  }

  // 2. Check pin counts for each box.
  // Since sets of Box IDs are identical and normalizeNetlist produces sorted box arrays,
  // normInput.boxes[i] corresponds to normTemplate.boxes[i].
  for (let i = 0; i < normInput.boxes.length; i++) {
    const inputBox = normInput.boxes[i]!
    const templateBox = normTemplate.boxes[i]!

    if (
      inputBox.leftPinCount > templateBox.leftPinCount ||
      inputBox.rightPinCount > templateBox.rightPinCount ||
      inputBox.topPinCount > templateBox.topPinCount ||
      inputBox.bottomPinCount > templateBox.bottomPinCount
    ) {
      return false // Input box requires more pins than template box offers
    }
  }

  // Create reverse lookup maps from index to ID for robust comparison
  const createReverseMap = (
    idToIndexMap: Record<string, number>,
  ): Record<number, string> => {
    const reverseMap: Record<number, string> = {}
    for (const [id, index] of Object.entries(idToIndexMap)) {
      reverseMap[index] = id
    }
    return reverseMap
  }

  const inputNetIndexToId = createReverseMap(
    normInputTransform.netIdToNetIndex,
  )
  const templateNetIndexToId = createReverseMap(
    normTemplateTransform.netIdToNetIndex,
  )
  const inputBoxIndexToId = createReverseMap(
    normInputTransform.boxIdToBoxIndex,
  )
  const templateBoxIndexToId = createReverseMap(
    normTemplateTransform.boxIdToBoxIndex,
  )

  // Helper function to compare two NormalizedPort objects by their original IDs.
  // portA is assumed to be from the input netlist, portB from the template netlist.
  const arePortsEqual = (
    portA: NormalizedPort,
    portB: NormalizedPort,
  ): boolean => {
    if ("boxIndex" in portA && "boxIndex" in portB) {
      const boxIdA = inputBoxIndexToId[portA.boxIndex]
      const boxIdB = templateBoxIndexToId[portB.boxIndex]
      return (
        boxIdA === boxIdB &&
        boxIdA !== undefined && // Ensure IDs were found (i.e., index was valid)
        portA.pinNumber === portB.pinNumber
      )
    }
    if ("netIndex" in portA && "netIndex" in portB) {
      const netIdA = inputNetIndexToId[portA.netIndex]
      const netIdB = templateNetIndexToId[portB.netIndex]
      return netIdA === netIdB && netIdA !== undefined // Ensure IDs were found
    }
    return false // Ports are of different types or an ID lookup failed
  }

  // Helper function to check if a specific port from the input's connection
  // exists in an array of ports from the template's connection.
  const isPortInArray = (
    portToFind: NormalizedPort, // This port is from normInput's connection (acts as portA)
    portArray: NormalizedPort[], // This array is from normTemplate's connection (elements act as portB)
  ): boolean => {
    return portArray.some((pInTemplateArray) =>
      arePortsEqual(portToFind, pInTemplateArray),
    )
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
