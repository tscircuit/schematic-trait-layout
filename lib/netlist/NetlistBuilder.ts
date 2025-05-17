import type {
  Box,
  Connection,
  InputNetlist,
  Net,
  PortReference,
} from "lib/input-types"

export class NetlistBuilder {
  private netlist: InputNetlist

  constructor() {
    this.netlist = {
      boxes: [],
      nets: [],
      connections: [],
    }
  }

  addBox(box: Box): void {
    if (!this.netlist.boxes.find((b) => b.boxId === box.boxId)) {
      this.netlist.boxes.push(box)
    }
  }

  addNet(net: Net): void {
    if (!this.netlist.nets.find((n) => n.netId === net.netId)) {
      this.netlist.nets.push(net)
    }
  }

  // Helper: Check if two port references are the same
  private areSamePortRef(a: PortReference, b: PortReference): boolean {
    if ("boxId" in a && "boxId" in b) {
      return a.boxId === b.boxId && a.pinNumber === b.pinNumber
    }
    if ("netId" in a && "netId" in b) {
      return a.netId === b.netId
    }
    return false
  }

  // Helper: Check if a port is in a given connection
  private isPortInConnection(
    port: PortReference,
    connection: Connection,
  ): boolean {
    return connection.connectedPorts.some((p) =>
      this.areSamePortRef(port, p as PortReference),
    )
  }

  // Helper: Find the connection that contains a given port
  private findConnectionContaining(
    port: PortReference,
  ): Connection | undefined {
    return this.netlist.connections.find((conn) =>
      this.isPortInConnection(port, conn),
    )
  }

  connect(port1: PortReference, port2: PortReference): void {
    if (!port1 || !port2 || this.areSamePortRef(port1, port2)) {
      return
    }

    const conn1 = this.findConnectionContaining(port1)
    const conn2 = this.findConnectionContaining(port2)

    if (conn1 && conn2) {
      // Both ports are already in connections
      if (conn1 === conn2) {
        // They are already in the same connection, do nothing
        return
      }
      // Merge conn2 into conn1
      for (const p of conn2.connectedPorts) {
        if (!this.isPortInConnection(p as PortReference, conn1)) {
          conn1.connectedPorts.push(p as PortReference)
        }
      }
      // Remove conn2
      this.netlist.connections = this.netlist.connections.filter(
        (c) => c !== conn2,
      )
    } else if (conn1) {
      // port1 is in a connection, port2 is not
      if (!this.isPortInConnection(port2, conn1)) {
        conn1.connectedPorts.push(port2)
      }
    } else if (conn2) {
      // port2 is in a connection, port1 is not
      if (!this.isPortInConnection(port1, conn2)) {
        conn2.connectedPorts.push(port1)
      }
    } else {
      // Neither port is in a connection, create a new one
      this.netlist.connections.push({
        connectedPorts: [port1, port2],
      })
    }
  }

  getNetlist(): InputNetlist {
    // Return a deep copy to prevent external modification
    return structuredClone(this.netlist)
  }
}
