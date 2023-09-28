import { NodeID } from '../identifiers'
import { StreamMessage } from '../proto/packages/trackerless-network/protos/NetworkRpc'

export interface IStreamNode {
        
    on(event: 'message', listener: (message: StreamMessage) => void): this

    once(event: 'message', listener: (message: StreamMessage) => void): this

    off(event: 'message', listener: (message: StreamMessage) => void): void

    broadcast(msg: StreamMessage, previousNode?: NodeID): void
    stop(): void
    start(): Promise<void>
    getTargetNeighborIds(): NodeID[]
}
