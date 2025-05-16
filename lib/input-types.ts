export interface Box {
  leftPinCount: number
  rightPinCount: number
  topPinCount: number
  bottomPinCount: number
  boxId: string
}

export interface Connection {
  connectedPorts: Array<
    { boxId: string; pinNumber: number } | { netId: string }
  >
}

export interface Net {
  netId: string
}

export interface InputNetlist {
  boxes: Array<Box>
  connections: Array<Connection>
  nets: Array<Net>
}

/** Represents a reference to a connectable point (a pin on a box or a named net). */
export type PortReference =
  | { boxId: string; pinNumber: number }
  | { netId: string }
