import type {
  InputNetlist,
  Box,
  Net,
  PortReference,
  Connection,
} from "../input-types"
import { buildEncounterMapFromNetlist } from "../scoring/buildEncounterMapFromNetlist"

const INDENT_STEP = "  "
const indentation = (level: number) => INDENT_STEP.repeat(level)

interface ProcessItem {
  id: string
  type: "box" | "net"
  encounterIndex: number
  details: Box | Net
}

/**
 * Generates a human-readable string representation of the netlist as an indented tree,
 * ordered by the encounter index from a DFS traversal.
 *
 * @param netlist The input netlist to represent.
 * @returns A string representing the netlist as an indented tree.
 */
export const getNetlistAsReadableTree = (netlist: InputNetlist): string => {
  const outputLines: string[] = []
  const encounterMap = buildEncounterMapFromNetlist(netlist)

  const allItems: ProcessItem[] = []
  for (const box of netlist.boxes) {
    allItems.push({
      id: box.boxId,
      type: "box",
      encounterIndex: encounterMap[box.boxId] ?? Infinity,
      details: box,
    })
  }
  for (const net of netlist.nets) {
    allItems.push({
      id: net.netId,
      type: "net",
      encounterIndex: encounterMap[net.netId] ?? Infinity,
      details: net,
    })
  }

  allItems.sort(
    (a, b) => a.encounterIndex - b.encounterIndex || a.id.localeCompare(b.id),
  )

  for (const item of allItems) {
    if (item.type === "box") {
      const box = item.details as Box
      outputLines.push(
        `${indentation(0)}${box.boxId} (Box #${item.encounterIndex})`,
      )

      const totalPinCount =
        (box.leftPinCount ?? 0) +
        (box.rightPinCount ?? 0) +
        (box.topPinCount ?? 0) +
        (box.bottomPinCount ?? 0)

      for (let pinNumber = 1; pinNumber <= totalPinCount; pinNumber++) {
        outputLines.push(`${indentation(1)}pin${pinNumber}`)

        let pinHasConnections = false
        for (const connection of netlist.connections) {
          const isPinInConnection = connection.connectedPorts.some(
            (p) =>
              "boxId" in p &&
              p.boxId === box.boxId &&
              p.pinNumber === pinNumber,
          )

          if (isPinInConnection) {
            for (const otherPort of connection.connectedPorts) {
              if (
                "boxId" in otherPort &&
                (otherPort.boxId !== box.boxId ||
                  otherPort.pinNumber !== pinNumber)
              ) {
                outputLines.push(
                  `${indentation(2)}${otherPort.boxId}.pin${
                    otherPort.pinNumber
                  } (Box #${encounterMap[otherPort.boxId] ?? "N/A"})`,
                )
                pinHasConnections = true
              } else if ("netId" in otherPort) {
                outputLines.push(
                  `${indentation(2)}${otherPort.netId} (Net #${
                    encounterMap[otherPort.netId] ?? "N/A"
                  })`,
                )
                pinHasConnections = true
              }
            }
          }
        }
        if (!pinHasConnections) {
          // Optionally indicate if a pin has no explicit connections listed
          // outputLines.push(`${indentation(2)}-> (No explicit connections)`);
        }
      }
    } else {
      // // item.type === "net"
      // const net = item.details as Net
      // outputLines.push(
      //   `${indentation(0)}${net.netId} (Net #${item.encounterIndex})`,
      // )
      // for (const connection of netlist.connections) {
      //   const isNetInConnection = connection.connectedPorts.some(
      //     (p) => "netId" in p && p.netId === net.netId,
      //   )
      //   if (isNetInConnection) {
      //     for (const otherPort of connection.connectedPorts) {
      //       if ("boxId" in otherPort) {
      //         outputLines.push(
      //           `${indentation(1)}-> ${otherPort.boxId}.pin${
      //             otherPort.pinNumber
      //           } (Box #${encounterMap[otherPort.boxId] ?? "N/A"})`,
      //         )
      //       }
      //       // Connections between two nets are not typical for this model
      //       // else if ("netId" in otherPort && otherPort.netId !== net.netId) {
      //       //   outputLines.push(
      //       //     `${indentation(1)}-> ${otherPort.netId} (Net #${
      //       //       encounterMap[otherPort.netId] ?? "N/A"
      //       //     })`,
      //       //   );
      //       // }
      //     }
      //   }
      // }
    }
  }

  return outputLines.join("\n")
}
