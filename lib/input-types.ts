export interface Box {
  leftPinCount: number
  rightPinCount: number
  topPinCount: number
  bottomPinCount: number
  boxId: string
}

export interface Connection {
  from: { boxId: string; pinNumber: number } | { netId: string }
  to: { boxId: string; pinNumber: number } | { netId: string }
}

export interface Net {
  netId: string
}

export interface InputNetlist {
  boxes: Array<Box>
  connections: Array<Connection>
  nets: Array<Net>
}
