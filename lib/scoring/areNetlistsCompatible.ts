import type { InputNetlist } from "lib/input-types"
import { normalizeNetlist } from "./normalizeNetlist"
import type { NormalizedNetlist, NormalizedNetlistConnection } from "./types"

// A type alias for individual ports within a normalized connection
type NormalizedPort = NormalizedNetlistConnection["connectedPorts"][number]

// Helper to get a string representation of box ports connected to a net
const getBoxPortsForNet = (
  netlist: NormalizedNetlist,
  netIndex: number,
): Set<string> => {
  const ports = new Set<string>()
  for (const connection of netlist.connections) {
    let isNetInConnection = false
    for (const port of connection.connectedPorts) {
      if ("netIndex" in port && port.netIndex === netIndex) {
        isNetInConnection = true
        break
      }
    }

    if (isNetInConnection) {
      for (const port of connection.connectedPorts) {
        if ("boxIndex" in port) {
          ports.add(`b${port.boxIndex}p${port.pinNumber}`)
        }
      }
    }
  }
  return ports
}

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

  // 3. Build a map from input net indices to template net indices
  const inputNetToBoxPinsSigs = normInput.nets.map((n) =>
    getBoxPortsForNet(normInput, n.netIndex),
  )
  const templateNetToBoxPinsSigs = normTemplate.nets.map((n) =>
    getBoxPortsForNet(normTemplate, n.netIndex),
  )

  const netIndexMap: Record<number, number> = {}
  const templateNetIndicesUsed = new Set<number>()

  for (let i = 0; i < normInput.nets.length; i++) {
    const inputNetSignature = inputNetToBoxPinsSigs[i]!
    let foundMapForInputNet = false
    for (let j = 0; j < normTemplate.nets.length; j++) {
      if (templateNetIndicesUsed.has(j)) {
        continue // This template net is already mapped
      }
      const templateNetSignature = templateNetToBoxPinsSigs[j]!

      // Check if input net's connected box pins are a subset of template net's
      let isSubset = true
      for (const pinSig of inputNetSignature) {
        if (!templateNetSignature.has(pinSig)) {
          isSubset = false
          break
        }
      }

      if (isSubset) {
        // Additional check: ensure the template net doesn't connect FEWER pins than the input if both are non-empty.
        // This is implicitly handled if inputNetSignature is empty, then isSubset is true.
        // If inputNetSignature is not empty, templateNetSignature must also be not empty and contain all its pins.
        // A stronger check could be inputNetSignature.size === templateNetSignature.size for exact match,
        // but "template can have too many connections" suggests subset is fine.
        netIndexMap[i] = j
        templateNetIndicesUsed.add(j)
        foundMapForInputNet = true
        break
      }
    }
    if (!foundMapForInputNet) {
      return false // Could not find a suitable template net for this input net
    }
  }

  // Helper function to compare two NormalizedPort objects using the netIndexMap
  const arePortsEqual = (
    inputPort: NormalizedPort, // Port from normInput
    templatePort: NormalizedPort, // Port from normTemplate
    currentNetIndexMap: Record<number, number>,
  ): boolean => {
    if ("boxIndex" in inputPort && "boxIndex" in templatePort) {
      return (
        inputPort.boxIndex === templatePort.boxIndex &&
        inputPort.pinNumber === templatePort.pinNumber
      )
    }
    if ("netIndex" in inputPort && "netIndex" in templatePort) {
      const mappedInputNetIndex = currentNetIndexMap[inputPort.netIndex]
      // If inputPort.netIndex is not in map, it means something went wrong with map construction or logic
      // or the input net genuinely has no corresponding template net (which buildNetIndexMap should catch).
      if (mappedInputNetIndex === undefined) return false
      return mappedInputNetIndex === templatePort.netIndex
    }
    return false // Ports are of different types
  }

  // Helper function to check if a specific input port exists in an array of template ports
  const isPortInArray = (
    portToFind: NormalizedPort, // This port is from normInput
    portArray: NormalizedPort[], // This array is from normTemplate.connectedPorts
    currentNetIndexMap: Record<number, number>,
  ): boolean => {
    return portArray.some((p) =>
      arePortsEqual(portToFind, p, currentNetIndexMap),
    )
  }

  // 4. Check connections
  // Every connection in normInput must be satisfiable by a connection in normTemplate.
  // A template connection satisfies an input connection if all ports of the input
  // connection are present in the template connection (considering netIndexMap).
  for (const inputConnection of normInput.connections) {
    let foundMatchingTemplateConnection = false
    for (const templateConnection of normTemplate.connections) {
      let allInputPortsFoundInTemplate = true
      for (const inputPort of inputConnection.connectedPorts) {
        if (
          !isPortInArray(
            inputPort,
            templateConnection.connectedPorts,
            netIndexMap,
          )
        ) {
          allInputPortsFoundInTemplate = false
          break
        }
      }

      if (allInputPortsFoundInTemplate) {
        foundMatchingTemplateConnection = true
        break
      }
    }

    if (!foundMatchingTemplateConnection) {
      return false // No template connection could satisfy this input connection
    }
  }

  // If all checks pass, the netlists are compatible
  return true
}
