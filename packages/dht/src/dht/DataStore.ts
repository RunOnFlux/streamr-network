import { DataEntry, PeerDescriptor, StoreDataRequest, StoreDataResponse } from '../proto/packages/dht/protos/DhtRpc'
import { PeerID, PeerIDKey } from '../helpers/PeerID'
import { Any } from '../proto/google/protobuf/any'
import { Timestamp } from '../proto/google/protobuf/timestamp'
import { ServerCallContext } from '@protobuf-ts/runtime-rpc'
import { DhtCallContext } from '../rpc-protocol/DhtCallContext'
import { DhtPeer } from './DhtPeer'
import { toProtoRpcClient } from '@streamr/proto-rpc'
import { DhtRpcServiceClient } from '../proto/packages/dht/protos/DhtRpc.client'
import { RoutingRpcCommunicator } from '../transport/RoutingRpcCommunicator'
import { Router } from './Router'
import { RecursiveFinder } from './RecursiveFinder'
import { isSamePeerDescriptor } from '../helpers/peerIdFromPeerDescriptor'
import { Logger } from '@streamr/utils'

interface DataStoreConfig {
    rpcCommunicator: RoutingRpcCommunicator
    router: Router
    recursiveFinder: RecursiveFinder
    ownPeerDescriptor: PeerDescriptor
    serviceId: string
    storeMaxTtl: number
    storeHighestTtl: number
    storeNumberOfCopies: number
}

const logger = new Logger(module)

export class DataStore {
    private readonly config: DataStoreConfig
    // A map into which each node can store one value per data key
    // The first key is the key of the data, the second key is the
    // PeerID of the storer of the data
    private store: Map<PeerIDKey, Map<PeerIDKey, DataEntry>> = new Map()
    constructor(config: DataStoreConfig) {
        this.config = config
        this.storeData = this.storeData.bind(this)
        this.config.rpcCommunicator!.registerRpcMethod(StoreDataRequest, StoreDataResponse, 'storeData', this.storeData)

    }

    public async storeDataToDht(key: Uint8Array, data: Any): Promise<PeerDescriptor[]> {
        logger.info(`Storing data to DHT ${this.config.serviceId} with key ${PeerID.fromValue(key)}`)
        const result = await this.config.recursiveFinder!.startRecursiveFind(key)
        const closestNodes = result.closestNodes
        const successfulNodes: PeerDescriptor[] = []
        const ttl = this.config.storeHighestTtl // ToDo: make TTL decrease according to some nice curve
        for (let i = 0; i < closestNodes.length && successfulNodes.length < 5; i++) {
            if (isSamePeerDescriptor(this.config.ownPeerDescriptor, closestNodes[i])) {
                this.storeLocalData(closestNodes[i], PeerID.fromValue(key), data, ttl)
                successfulNodes.push(closestNodes[i])
                continue
            }
            const dhtPeer = new DhtPeer(
                this.config.ownPeerDescriptor,
                closestNodes[i],
                toProtoRpcClient(new DhtRpcServiceClient(this.config.rpcCommunicator.getRpcClientTransport())),
                this.config.serviceId
            )
            try {
                const response = await dhtPeer.storeData({ kademliaId: key, data, ttl })
                if (response.error) {
                    logger.debug('dhtPeer.storeData() returned error: ' + response.error)
                    continue
                }
            } catch (e) {
                logger.debug('dhtPeer.storeData() threw an exception ' + e)
                continue
            }
            successfulNodes.push(closestNodes[i])
            logger.trace('dhtPeer.storeData() returned success')
        }
        return successfulNodes
    }

    public storeLocalData(storer: PeerDescriptor, dataKey: PeerID, data: Any, ttl: number): void {
        const publisherId = PeerID.fromValue(storer.kademliaId)
        if (!this.store.has(dataKey.toKey())) {
            this.store.set(dataKey.toKey(), new Map())
        }
        this.store.get(dataKey.toKey())!.set(publisherId.toKey(), { storer, data, storedAt: Timestamp.now(), ttl })
    }

    public getLocalData(key: PeerID): Map<PeerIDKey, DataEntry> | undefined {
        if (this.store.has(key.toKey())) {
            return this.store.get(key.toKey())!
        } else {
            return undefined
        }
    }

    // RPC service implementation
    private async storeData(request: StoreDataRequest, context: ServerCallContext): Promise<StoreDataResponse> {
        let ttl = request.ttl
        if (ttl > this.config.storeMaxTtl) {
            ttl = this.config.storeMaxTtl
        }
        this.storeLocalData(
            (context as DhtCallContext).incomingSourceDescriptor!,
            PeerID.fromValue(request.kademliaId),
            request.data!,
            ttl
        )
        logger.trace(this.config.ownPeerDescriptor.nodeName + ' storeData()')
        return StoreDataResponse.create()
    }

}
