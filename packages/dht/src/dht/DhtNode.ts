import { RemoteDhtNode } from './RemoteDhtNode'
import KBucket from 'k-bucket'
import { EventEmitter } from 'eventemitter3'
import { SortedContactList } from './contact/SortedContactList'
import { RoutingRpcCommunicator } from '../transport/RoutingRpcCommunicator'
import { ServerCallContext } from '@protobuf-ts/runtime-rpc'
import { PeerID, PeerIDKey } from '../helpers/PeerID'
import {
    ClosestPeersRequest,
    ClosestPeersResponse,
    LeaveNotice,
    ConnectivityResponse,
    Message,
    NodeType,
    PeerDescriptor,
    PingRequest,
    PingResponse,
    FindMode,
    DataEntry,
} from '../proto/packages/dht/protos/DhtRpc'
import { DisconnectionType, ITransport, TransportEvents } from '../transport/ITransport'
import { ConnectionManager, PortRange, TlsCertificate } from '../connection/ConnectionManager'
import { DhtRpcServiceClient, ExternalApiServiceClient } from '../proto/packages/dht/protos/DhtRpc.client'
import {
    Logger,
    MetricsContext,
    hexToBinary,
    waitForCondition
} from '@streamr/utils'
import { toProtoRpcClient } from '@streamr/proto-rpc'
import { RandomContactList } from './contact/RandomContactList'
import { Empty } from '../proto/google/protobuf/empty'
import { DhtCallContext } from '../rpc-protocol/DhtCallContext'
import { Any } from '../proto/google/protobuf/any'
import { isSamePeerDescriptor, keyFromPeerDescriptor, peerIdFromPeerDescriptor } from '../helpers/peerIdFromPeerDescriptor'
import { Router } from './routing/Router'
import { RecursiveFinder, RecursiveFindResult } from './find/RecursiveFinder'
import { DataStore } from './store/DataStore'
import { PeerDiscovery } from './discovery/PeerDiscovery'
import { LocalDataStore } from './store/LocalDataStore'
import { IceServer } from '../connection/WebRTC/WebRtcConnector'
import { registerExternalApiRpcMethods } from './registerExternalApiRpcMethods'
import { RemoteExternalApi } from './RemoteExternalApi'
import { UUID } from '../helpers/UUID'
import { isBrowserEnvironment } from '../helpers/browser/isBrowserEnvironment'
import { sample } from 'lodash'
import { DefaultConnectorFacade, DefaultConnectorFacadeConfig } from '../connection/ConnectorFacade'
import { MarkRequired } from 'ts-essentials'

export interface DhtNodeEvents {
    newContact: (peerDescriptor: PeerDescriptor, closestPeers: PeerDescriptor[]) => void
    contactRemoved: (peerDescriptor: PeerDescriptor, closestPeers: PeerDescriptor[]) => void
    joinCompleted: () => void
    newKbucketContact: (peerDescriptor: PeerDescriptor, closestPeers: PeerDescriptor[]) => void
    kbucketContactRemoved: (peerDescriptor: PeerDescriptor) => void
    newOpenInternetContact: (peerDescriptor: PeerDescriptor, closestPeers: PeerDescriptor[]) => void
    openInternetContactRemoved: (peerDescriptor: PeerDescriptor, closestPeers: PeerDescriptor[]) => void
    newRandomContact: (peerDescriptor: PeerDescriptor, closestPeers: PeerDescriptor[]) => void
    randomContactRemoved: (peerDescriptor: PeerDescriptor, closestPeers: PeerDescriptor[]) => void
}

export interface DhtNodeOptions {
    serviceId?: string
    joinParallelism?: number
    maxNeighborListSize?: number
    numberOfNodesPerKBucket?: number
    joinNoProgressLimit?: number
    getClosestContactsLimit?: number  // TODO better name?
    dhtJoinTimeout?: number
    metricsContext?: MetricsContext
    storeHighestTtl?: number
    storeMaxTtl?: number
    networkConnectivityTimeout?: number
    storeNumberOfCopies?: number  // TODO better name?

    transportLayer?: ITransport
    peerDescriptor?: PeerDescriptor
    entryPoints?: PeerDescriptor[]
    websocketHost?: string
    websocketPortRange?: PortRange
    peerId?: string

    rpcRequestTimeout?: number
    iceServers?: IceServer[]
    webrtcAllowPrivateAddresses?: boolean
    webrtcDatachannelBufferThresholdLow?: number
    webrtcDatachannelBufferThresholdHigh?: number
    webrtcNewConnectionTimeout?: number
    webrtcPortRange?: PortRange
    maxMessageSize?: number
    maxConnections?: number
    tlsCertificate?: TlsCertificate
    externalIp?: string
}

type StrictDhtNodeOptions = MarkRequired<DhtNodeOptions, 
    'serviceId' |
    'joinParallelism' |
    'maxNeighborListSize' |
    'numberOfNodesPerKBucket' |
    'joinNoProgressLimit' |
    'dhtJoinTimeout' |
    'getClosestContactsLimit' |
    'maxConnections' |
    'storeHighestTtl' |
    'storeMaxTtl' |
    'networkConnectivityTimeout' |
    'storeNumberOfCopies' |
    'metricsContext' |
    'peerId'>

const logger = new Logger(module)

export type Events = TransportEvents & DhtNodeEvents

export const createPeerDescriptor = (msg?: ConnectivityResponse, peerId?: string): PeerDescriptor => {
    let kademliaId: Uint8Array
    if (msg) {
        kademliaId = peerId ? hexToBinary(peerId) : PeerID.fromIp(msg.host).value
    } else {
        kademliaId = hexToBinary(peerId!)
    }
    const nodeType = isBrowserEnvironment() ? NodeType.BROWSER : NodeType.NODEJS 
    const ret: PeerDescriptor = { kademliaId, type: nodeType }
    if (msg && msg.websocket) {
        ret.websocket = { host: msg.websocket.host, port: msg.websocket.port, tls: msg.websocket.tls }
        ret.openInternet = true
    }
    return ret
}

export class DhtNode extends EventEmitter<Events> implements ITransport {

    private readonly config: StrictDhtNodeOptions
    private bucket?: KBucket<RemoteDhtNode>
    private connections: Map<PeerIDKey, RemoteDhtNode> = new Map()
    private neighborList?: SortedContactList<RemoteDhtNode>
    private openInternetPeers?: SortedContactList<RemoteDhtNode>
    private randomPeers?: RandomContactList<RemoteDhtNode>
    private rpcCommunicator?: RoutingRpcCommunicator
    private transportLayer?: ITransport
    private ownPeerDescriptor?: PeerDescriptor
    public router?: Router
    public dataStore?: DataStore
    private localDataStore = new LocalDataStore()
    private recursiveFinder?: RecursiveFinder
    private peerDiscovery?: PeerDiscovery

    public connectionManager?: ConnectionManager
    private started = false
    private stopped = false
    private entryPointDisconnectTimeout?: NodeJS.Timeout

    constructor(conf: DhtNodeOptions) {
        super()
        this.config = {
            serviceId: 'layer0',
            joinParallelism: 3,
            maxNeighborListSize: 200,
            numberOfNodesPerKBucket: 8,
            joinNoProgressLimit: 4,
            dhtJoinTimeout: 60000,
            getClosestContactsLimit: 5,
            maxConnections: 80,
            storeHighestTtl: 60000,
            storeMaxTtl: 60000,
            networkConnectivityTimeout: 10000,
            storeNumberOfCopies: 5,
            metricsContext: new MetricsContext(),
            peerId: new UUID().toHex(),
            ...conf  // TODO use merge() if we don't want that explicit undefined values override defaults?
        }
        this.send = this.send.bind(this)
    }

    public async start(): Promise<void> {
        if (this.started || this.stopped) {
            return
        }
        logger.trace(`Starting new Streamr Network DHT Node with serviceId ${this.config.serviceId}`)
        this.started = true

        if (isBrowserEnvironment()) {
            this.config.websocketPortRange = undefined
            if (this.config.peerDescriptor) {
                this.config.peerDescriptor.websocket = undefined
            }
        }
        // If transportLayer is given, do not create a ConnectionManager
        if (this.config.transportLayer) {
            this.transportLayer = this.config.transportLayer
            this.ownPeerDescriptor = this.transportLayer.getPeerDescriptor()
            if (this.config.transportLayer instanceof ConnectionManager) {
                this.connectionManager = this.config.transportLayer
            }
        } else {
            const connectorFacadeConfig: DefaultConnectorFacadeConfig = {
                transportLayer: this,
                entryPoints: this.config.entryPoints,
                iceServers: this.config.iceServers,
                webrtcAllowPrivateAddresses: this.config.webrtcAllowPrivateAddresses,
                webrtcDatachannelBufferThresholdLow: this.config.webrtcDatachannelBufferThresholdLow,
                webrtcDatachannelBufferThresholdHigh: this.config.webrtcDatachannelBufferThresholdHigh,
                webrtcNewConnectionTimeout: this.config.webrtcNewConnectionTimeout,
                webrtcPortRange: this.config.webrtcPortRange,
                maxMessageSize: this.config.maxMessageSize,
                tlsCertificate: this.config.tlsCertificate,
                externalIp: this.config.externalIp,
                createOwnPeerDescriptor: (connectivityResponse: ConnectivityResponse) => this.generatePeerDescriptorCallBack(connectivityResponse),
            }
            // If own PeerDescriptor is given in config, create a ConnectionManager with ws server
            if (this.config.peerDescriptor?.websocket) {
                connectorFacadeConfig.websocketHost = this.config.peerDescriptor.websocket.host
                connectorFacadeConfig.websocketPortRange = { 
                    min: this.config.peerDescriptor.websocket.port,
                    max: this.config.peerDescriptor.websocket.port
                }
            // If websocketPortRange is given, create ws server using it, websocketHost can be undefined
            } else if (this.config.websocketPortRange) { 
                connectorFacadeConfig.websocketHost = this.config.websocketHost
                connectorFacadeConfig.websocketPortRange = this.config.websocketPortRange
            }

            const connectionManager = new ConnectionManager({
                createConnectorFacade: () => new DefaultConnectorFacade(connectorFacadeConfig),
                maxConnections: this.config.maxConnections,
                metricsContext: this.config.metricsContext
            })
            await connectionManager.start()
            this.connectionManager = connectionManager
            this.transportLayer = connectionManager
        }

        this.rpcCommunicator = new RoutingRpcCommunicator(
            this.config.serviceId,
            this.transportLayer.send,
            { rpcRequestTimeout: this.config.rpcRequestTimeout }
        )

        this.transportLayer.on('message', (message: Message) => this.handleMessage(message))

        this.bindDefaultServerMethods()
        this.initKBuckets(peerIdFromPeerDescriptor(this.ownPeerDescriptor!))
        this.peerDiscovery = new PeerDiscovery({
            rpcCommunicator: this.rpcCommunicator,
            ownPeerDescriptor: this.ownPeerDescriptor!,
            bucket: this.bucket!,
            connections: this.connections,
            neighborList: this.neighborList!,
            randomPeers: this.randomPeers!,
            openInternetPeers: this.openInternetPeers!,
            joinNoProgressLimit: this.config.joinNoProgressLimit,
            getClosestContactsLimit: this.config.getClosestContactsLimit,
            joinTimeout: this.config.dhtJoinTimeout,
            serviceId: this.config.serviceId,
            parallelism: this.config.joinParallelism,
            addContact: this.addNewContact.bind(this),
            connectionManager: this.connectionManager
        })
        this.router = new Router({
            rpcCommunicator: this.rpcCommunicator,
            connections: this.connections,
            ownPeerDescriptor: this.ownPeerDescriptor!,
            addContact: this.addNewContact.bind(this),
            serviceId: this.config.serviceId,
            connectionManager: this.connectionManager
        })
        this.recursiveFinder = new RecursiveFinder({
            rpcCommunicator: this.rpcCommunicator,
            router: this.router,
            sessionTransport: this,
            connections: this.connections,
            ownPeerDescriptor: this.ownPeerDescriptor!,
            serviceId: this.config.serviceId,
            addContact: this.addNewContact.bind(this),
            isPeerCloserToIdThanSelf: this.isPeerCloserToIdThanSelf.bind(this),
            localDataStore: this.localDataStore
        })
        this.dataStore = new DataStore({
            rpcCommunicator: this.rpcCommunicator,
            recursiveFinder: this.recursiveFinder,
            ownPeerDescriptor: this.ownPeerDescriptor!,
            serviceId: this.config.serviceId,
            highestTtl: this.config.storeHighestTtl,
            maxTtl: this.config.storeMaxTtl,
            numberOfCopies: this.config.storeNumberOfCopies,
            localDataStore: this.localDataStore,
            dhtNodeEmitter: this,
            getNodesClosestToIdFromBucket: (id: Uint8Array, n?: number) => {
                return this.bucket!.closest(id, n)
            }
        })
        registerExternalApiRpcMethods(this)
        if (this.connectionManager! && this.config.entryPoints && this.config.entryPoints.length > 0 
            && !isSamePeerDescriptor(this.config.entryPoints[0], this.ownPeerDescriptor!)) {
            this.connectToEntryPoint(this.config.entryPoints[0])
        }
    }

    private initKBuckets = (selfId: PeerID) => {
        this.bucket = new KBucket<RemoteDhtNode>({
            localNodeId: selfId.value,
            numberOfNodesPerKBucket: this.config.numberOfNodesPerKBucket,
            numberOfNodesToPing: this.config.numberOfNodesPerKBucket
        })
        this.bucket.on('ping', (oldContacts: RemoteDhtNode[], newContact: RemoteDhtNode) => this.onKBucketPing(oldContacts, newContact))
        this.bucket.on('removed', (contact: RemoteDhtNode) => this.onKBucketRemoved(contact))
        this.bucket.on('added', (contact: RemoteDhtNode) => this.onKBucketAdded(contact))
        this.bucket.on('updated', () => {
            // TODO: Update contact info to the connection manager and reconnect
        })
        this.neighborList = new SortedContactList(selfId, this.config.maxNeighborListSize)
        this.neighborList.on('contactRemoved', (removedContact: RemoteDhtNode, activeContacts: RemoteDhtNode[]) => {
            if (this.stopped) {
                return
            }
            this.emit('contactRemoved', removedContact.getPeerDescriptor(), activeContacts.map((c) => c.getPeerDescriptor()))
            this.randomPeers!.addContact(
                new RemoteDhtNode(
                    this.ownPeerDescriptor!,
                    removedContact.getPeerDescriptor(),
                    toProtoRpcClient(new DhtRpcServiceClient(this.rpcCommunicator!.getRpcClientTransport())),
                    this.config.serviceId
                )
            )
        })
        this.neighborList.on('newContact', (newContact: RemoteDhtNode, activeContacts: RemoteDhtNode[]) =>
            this.emit('newContact', newContact.getPeerDescriptor(), activeContacts.map((c) => c.getPeerDescriptor()))
        )
        this.openInternetPeers = new SortedContactList(selfId, this.config.maxNeighborListSize / 2)
        this.openInternetPeers.on('contactRemoved', (removedContact: RemoteDhtNode, activeContacts: RemoteDhtNode[]) =>
            this.emit('openInternetContactRemoved', removedContact.getPeerDescriptor(), activeContacts.map((c) => c.getPeerDescriptor()))
        )
        this.openInternetPeers.on('newContact', (newContact: RemoteDhtNode, activeContacts: RemoteDhtNode[]) =>
            this.emit('newOpenInternetContact', newContact.getPeerDescriptor(), activeContacts.map((c) => c.getPeerDescriptor()))
        )
        this.transportLayer!.on('connected', (peerDescriptor: PeerDescriptor) => this.onTransportConnected(peerDescriptor))

        this.transportLayer!.on('disconnected', (peerDescriptor: PeerDescriptor, disonnectionType: DisconnectionType) => {
            this.onTransportDisconnected(peerDescriptor, disonnectionType)
        })

        this.transportLayer!.getAllConnectionPeerDescriptors().forEach((peer) => {
            const remoteDhtNode = new RemoteDhtNode(
                this.ownPeerDescriptor!,
                peer,
                toProtoRpcClient(new DhtRpcServiceClient(this.rpcCommunicator!.getRpcClientTransport())),
                this.config.serviceId
            )
            if (isSamePeerDescriptor(peer, this.ownPeerDescriptor!)) {
                logger.error('own peerdescriptor added to connections in initKBucket')
            }
            this.connections.set(keyFromPeerDescriptor(peer), remoteDhtNode)
        })
        this.randomPeers = new RandomContactList(selfId, this.config.maxNeighborListSize)
        this.randomPeers.on('contactRemoved', (removedContact: RemoteDhtNode, activeContacts: RemoteDhtNode[]) =>
            this.emit('randomContactRemoved', removedContact.getPeerDescriptor(), activeContacts.map((c) => c.getPeerDescriptor()))
        )
        this.randomPeers.on('newContact', (newContact: RemoteDhtNode, activeContacts: RemoteDhtNode[]) =>
            this.emit('newRandomContact', newContact.getPeerDescriptor(), activeContacts.map((c) => c.getPeerDescriptor()))
        )
    }

    private onTransportConnected(peerDescriptor: PeerDescriptor): void {

        if (isSamePeerDescriptor(this.ownPeerDescriptor!, peerDescriptor)) {
            logger.error('onTransportConnected() to self')
        }

        const remoteDhtNode = new RemoteDhtNode(
            this.ownPeerDescriptor!,
            peerDescriptor,
            toProtoRpcClient(new DhtRpcServiceClient(this.rpcCommunicator!.getRpcClientTransport())),
            this.config.serviceId
        )
        if (!this.connections.has(PeerID.fromValue(remoteDhtNode.id).toKey())) {
            this.connections.set(PeerID.fromValue(remoteDhtNode.id).toKey(), remoteDhtNode)
            logger.trace('connectionschange add ' + this.connections.size)
        } else {
            logger.trace('new connection not set to connections, there is already a connection with the peer ID')
        }
        logger.trace('connected: ' + keyFromPeerDescriptor(peerDescriptor) + ' ' + this.connections.size)
        this.emit('connected', peerDescriptor)
    }

    private onTransportDisconnected(peerDescriptor: PeerDescriptor, dicsonnectionType: DisconnectionType): void {
        logger.trace('disconnected: ' + keyFromPeerDescriptor(peerDescriptor))
        this.connections.delete(keyFromPeerDescriptor(peerDescriptor))
        // only remove from bucket if we are on layer 0
        if (this.connectionManager) {
            this.bucket!.remove(peerDescriptor.kademliaId)

            if (dicsonnectionType === 'OUTGOING_GRACEFUL_LEAVE' || dicsonnectionType === 'INCOMING_GRACEFUL_LEAVE') {
                logger.trace(keyFromPeerDescriptor(peerDescriptor) + ' ' + 'onTransportDisconnected with type ' + dicsonnectionType)
                this.removeContact(peerDescriptor, true)
            } else {
                logger.trace(keyFromPeerDescriptor(peerDescriptor) + ' ' + 'onTransportDisconnected with type ' + dicsonnectionType)
            }
        }

        this.emit('disconnected', peerDescriptor, dicsonnectionType)
    }

    private bindDefaultServerMethods(): void {
        if (!this.started || this.stopped) {
            return
        }
        logger.trace(`Binding default DHT RPC methods`)
        this.rpcCommunicator!.registerRpcMethod(ClosestPeersRequest, ClosestPeersResponse, 'getClosestPeers',
            (req: ClosestPeersRequest, context) => this.getClosestPeers(req, context))
        this.rpcCommunicator!.registerRpcMethod(PingRequest, PingResponse, 'ping',
            (req: PingRequest, context) => this.ping(req, context))
        this.rpcCommunicator!.registerRpcNotification(LeaveNotice, 'leaveNotice',
            (req: LeaveNotice, context) => this.leaveNotice(req, context))
    }

    private isPeerCloserToIdThanSelf(peer1: PeerDescriptor, compareToId: PeerID): boolean {
        const distance1 = this.bucket!.distance(peer1.kademliaId, compareToId.value)
        const distance2 = this.bucket!.distance(this.ownPeerDescriptor!.kademliaId, compareToId.value)
        return distance1 < distance2
    }

    private handleMessage(message: Message): void {
        if (message.serviceId === this.config.serviceId) {
            logger.trace('callig this.handleMessageFromPeer ' + keyFromPeerDescriptor(message.sourceDescriptor!)
                + ' ' + message.serviceId + ' ' + message.messageId)
            this.rpcCommunicator?.handleMessageFromPeer(message)
        } else {
            logger.trace('emit "message" ' + keyFromPeerDescriptor(message.sourceDescriptor!) + ' ' + message.serviceId + ' ' + message.messageId)
            this.emit('message', message)
        }
    }

    private generatePeerDescriptorCallBack = (connectivityResponse: ConnectivityResponse) => {
        if (this.config.peerDescriptor) {
            this.ownPeerDescriptor = this.config.peerDescriptor
        } else {
            this.ownPeerDescriptor = createPeerDescriptor(connectivityResponse, this.config.peerId)
        }
        return this.ownPeerDescriptor
    }

    private getClosestPeerDescriptors(kademliaId: Uint8Array, limit: number): PeerDescriptor[] {
        const closestPeers = this.bucket!.closest(kademliaId, limit)
        return closestPeers.map((remoteDhtNode: RemoteDhtNode) => remoteDhtNode.getPeerDescriptor())
    }

    private onKBucketPing(oldContacts: RemoteDhtNode[], newContact: RemoteDhtNode): void {
        if (this.stopped) {
            return
        }
        const sortingList: SortedContactList<RemoteDhtNode> = new SortedContactList(this.getNodeId(), 100)
        sortingList.addContacts(oldContacts)
        const sortedContacts = sortingList.getAllContacts()
        this.connectionManager?.weakUnlockConnection(sortedContacts[sortedContacts.length - 1].getPeerDescriptor())
        this.bucket?.remove(sortedContacts[sortedContacts.length - 1].getPeerId().value)
        this.bucket!.add(newContact)
    }

    private onKBucketRemoved(contact: RemoteDhtNode): void {
        if (this.stopped) {
            return
        }
        this.connectionManager?.weakUnlockConnection(contact.getPeerDescriptor())
        logger.trace(`Removed contact ${keyFromPeerDescriptor(contact.getPeerDescriptor())}`)
        this.emit(
            'kbucketContactRemoved',
            contact.getPeerDescriptor()
        )
        if (this.bucket!.count() === 0
            && !this.peerDiscovery!.isJoinOngoing()
            && this.config.entryPoints
            && this.config.entryPoints.length > 0
        ) {
            setImmediate(async () => {
                await Promise.all(this.config.entryPoints!.map((entryPoint) => 
                    this.peerDiscovery!.rejoinDht(entryPoint)
                )) 
            })
        }
    }

    private onKBucketAdded(contact: RemoteDhtNode): void {
        if (this.stopped) {
            return
        }
        if (!this.stopped && !contact.getPeerId().equals(this.getNodeId())) {
            // Important to lock here, before the ping result is known
            this.connectionManager?.weakLockConnection(contact.getPeerDescriptor())
            if (this.connections.has(contact.getPeerId().toKey())) {
                logger.trace(`Added new contact ${keyFromPeerDescriptor(contact.getPeerDescriptor())}`)
                this.emit(
                    'newKbucketContact',
                    contact.getPeerDescriptor(),
                    this.neighborList!.getClosestContacts(this.config.getClosestContactsLimit).map((peer) => peer.getPeerDescriptor())
                )
            } else {    // open connection by pinging
                logger.trace('starting ping ' + keyFromPeerDescriptor(contact.getPeerDescriptor()))
                contact.ping().then((result) => {
                    if (result) {
                        logger.trace(`Added new contact ${keyFromPeerDescriptor(contact.getPeerDescriptor())}`)
                        this.emit(
                            'newKbucketContact',
                            contact.getPeerDescriptor(),
                            this.neighborList!.getClosestContacts(this.config.getClosestContactsLimit).map((peer) => peer.getPeerDescriptor())
                        )
                    } else {
                        logger.trace('ping failed ' + keyFromPeerDescriptor(contact.getPeerDescriptor()))
                        this.connectionManager?.weakUnlockConnection(contact.getPeerDescriptor())
                        this.removeContact(contact.getPeerDescriptor())
                        this.addClosestContactToBucket()
                    }
                    return
                }).catch((_e) => {
                    this.connectionManager?.weakUnlockConnection(contact.getPeerDescriptor())
                    this.removeContact(contact.getPeerDescriptor())
                    this.addClosestContactToBucket()
                })
            }
        }
    }

    private addClosestContactToBucket(): void {
        if (!this.started || this.stopped) {
            return
        }
        const closest = this.getClosestActiveContactNotInBucket()
        if (closest) {
            this.addNewContact(closest.getPeerDescriptor())
        }
    }

    private getClosestActiveContactNotInBucket(): RemoteDhtNode | undefined {
        for (const contactId of this.neighborList!.getContactIds()) {
            if (!this.bucket!.get(contactId.value) && this.neighborList!.isActive(contactId)) {
                return this.neighborList!.getContact(contactId).contact
            }
        }
        return undefined
    }

    public getClosestContacts(maxCount?: number): PeerDescriptor[] {
        return this.neighborList!.getClosestContacts(maxCount).map((c) => c.getPeerDescriptor())
    }

    public getNodeId(): PeerID {
        return peerIdFromPeerDescriptor(this.ownPeerDescriptor!)
    }

    public getBucketSize(): number {
        return this.bucket!.count()
    }

    private addNewContact(contact: PeerDescriptor, setActive = false): void {
        if (!this.started || this.stopped) {
            return
        }
        if (!isSamePeerDescriptor(contact, this.ownPeerDescriptor!)) {
            logger.trace(`Adding new contact ${keyFromPeerDescriptor(contact)}`)
            const remoteDhtNode = new RemoteDhtNode(
                this.ownPeerDescriptor!,
                contact,
                toProtoRpcClient(new DhtRpcServiceClient(this.rpcCommunicator!.getRpcClientTransport())),
                this.config.serviceId
            )
            if (!this.bucket!.get(contact.kademliaId) && !this.neighborList!.getContact(peerIdFromPeerDescriptor(contact))) {
                this.neighborList!.addContact(remoteDhtNode)
                if (contact.openInternet) {
                    this.openInternetPeers!.addContact(remoteDhtNode)
                }
                if (setActive) {
                    const peerId = peerIdFromPeerDescriptor(contact)
                    this.neighborList!.setActive(peerId)
                    this.openInternetPeers!.setActive(peerId)
                }
                this.bucket!.add(remoteDhtNode)
            } else {
                this.randomPeers!.addContact(remoteDhtNode)
            }
        }
    }

    private connectToEntryPoint(entryPoint: PeerDescriptor): void {
        this.connectionManager!.lockConnection(entryPoint, 'temporary-layer0-connection')
        this.entryPointDisconnectTimeout = setTimeout(() => {
            this.connectionManager!.unlockConnection(entryPoint, 'temporary-layer0-connection')
        }, 10 * 1000)
    }

    public removeContact(contact: PeerDescriptor, removeFromOpenInternetPeers = false): void {
        if (!this.started || this.stopped) {
            return
        }
        logger.trace(`Removing contact ${keyFromPeerDescriptor(contact)}`)
        const peerId = peerIdFromPeerDescriptor(contact)
        this.bucket!.remove(peerId.value)
        this.neighborList!.removeContact(peerId)
        this.randomPeers!.removeContact(peerId)
        if (removeFromOpenInternetPeers) {
            this.openInternetPeers!.removeContact(peerId)
        }
    }

    public async send(msg: Message): Promise<void> {
        if (!this.started || this.stopped) {
            return
        }
        const reachableThrough = this.peerDiscovery!.isJoinOngoing() ? this.config.entryPoints || [] : []
        await this.router!.send(msg, reachableThrough)
    }

    public async joinDht(entryPointDescriptors: PeerDescriptor[], doAdditionalRandomPeerDiscovery?: boolean, retry?: boolean): Promise<void> {
        if (!this.started) {
            throw new Error('Cannot join DHT before calling start() on DhtNode')
        }
        await Promise.all(entryPointDescriptors.map((entryPoint) => 
            this.peerDiscovery!.joinDht(entryPoint, doAdditionalRandomPeerDiscovery, retry)
        ))
    }

    public async startRecursiveFind(idToFind: Uint8Array, findMode?: FindMode, excludedPeer?: PeerDescriptor): Promise<RecursiveFindResult> {
        return this.recursiveFinder!.startRecursiveFind(idToFind, findMode, excludedPeer)
    }

    public async storeDataToDht(key: Uint8Array, data: Any): Promise<PeerDescriptor[]> {
        if (this.peerDiscovery!.isJoinOngoing() && this.config.entryPoints && this.config.entryPoints.length > 0) {
            return this.storeDataViaPeer(key, data, sample(this.config.entryPoints)!)
        }
        return this.dataStore!.storeDataToDht(key, data)
    }

    public async storeDataViaPeer(key: Uint8Array, data: Any, peer: PeerDescriptor): Promise<PeerDescriptor[]> {
        const target = new RemoteExternalApi(
            this.ownPeerDescriptor!,
            peer,
            this.config.serviceId,
            toProtoRpcClient(new ExternalApiServiceClient(this.rpcCommunicator!.getRpcClientTransport()))
        )
        return await target.storeData(key, data)
    }

    public async getDataFromDht(idToFind: Uint8Array): Promise<DataEntry[]> {
        if (this.peerDiscovery!.isJoinOngoing() && this.config.entryPoints && this.config.entryPoints.length > 0) {
            return this.findDataViaPeer(idToFind, sample(this.config.entryPoints)!)
        }
        const result = await this.recursiveFinder!.startRecursiveFind(idToFind, FindMode.DATA)
        return result.dataEntries ?? []
    }

    public async deleteDataFromDht(idToDelete: Uint8Array): Promise<void> {
        if (!this.stopped) {
            return this.dataStore!.deleteDataFromDht(idToDelete)
        }
    }

    public async findDataViaPeer(idToFind: Uint8Array, peer: PeerDescriptor): Promise<DataEntry[]> {
        const target = new RemoteExternalApi(
            this.ownPeerDescriptor!,
            peer,
            this.config.serviceId,
            toProtoRpcClient(new ExternalApiServiceClient(this.rpcCommunicator!.getRpcClientTransport()))
        )
        return await target.findData(idToFind)
    }

    public getRpcCommunicator(): RoutingRpcCommunicator {
        return this.rpcCommunicator!
    }

    public getTransport(): ITransport {
        return this.transportLayer!
    }

    public getPeerDescriptor(): PeerDescriptor {
        return this.ownPeerDescriptor!
    }

    public getAllConnectionPeerDescriptors(): PeerDescriptor[] {
        return Array.from(this.connections.values()).map((peer) => peer.getPeerDescriptor())
    }

    public getKBucketPeers(): PeerDescriptor[] {
        return this.bucket!.toArray().map((remoteDhtNode: RemoteDhtNode) => remoteDhtNode.getPeerDescriptor())
    }

    public getNumberOfConnections(): number {
        return this.connections.size
    }

    public getNumberOfLocalLockedConnections(): number {
        return this.connectionManager!.getNumberOfLocalLockedConnections()
    }

    public getNumberOfRemoteLockedConnections(): number {
        return this.connectionManager!.getNumberOfRemoteLockedConnections()
    }

    public getNumberOfWeakLockedConnections(): number {
        return this.connectionManager!.getNumberOfWeakLockedConnections()
    }

    public async waitForNetworkConnectivity(): Promise<void> {
        await waitForCondition(() => this.connections.size > 0, this.config.networkConnectivityTimeout)
    }

    public hasJoined(): boolean {
        return this.peerDiscovery!.isJoinCalled()
    }

    public async stop(): Promise<void> {
        if (this.stopped || !this.started) {
            return
        }
        logger.trace('stop()')
        this.stopped = true

        if (this.entryPointDisconnectTimeout) {
            clearTimeout(this.entryPointDisconnectTimeout)
        }
        this.bucket!.toArray().forEach((remoteDhtNode: RemoteDhtNode) => this.bucket!.remove(remoteDhtNode.id))
        this.bucket!.removeAllListeners()
        this.localDataStore.clear()
        this.neighborList!.stop()
        this.randomPeers!.stop()
        this.openInternetPeers!.stop()
        this.rpcCommunicator!.stop()
        this.router!.stop()
        this.recursiveFinder!.stop()
        this.peerDiscovery!.stop()
        if (this.connectionManager) {
            await this.connectionManager.stop()
        }
        this.transportLayer = undefined
        this.connectionManager = undefined
        this.connections.clear()
        this.removeAllListeners()
    }

    // IDHTRpcService implementation
    private async getClosestPeers(request: ClosestPeersRequest, context: ServerCallContext): Promise<ClosestPeersResponse> {
        this.addNewContact((context as DhtCallContext).incomingSourceDescriptor!)
        const response = {
            peers: this.getClosestPeerDescriptors(request.kademliaId, this.config.getClosestContactsLimit),
            requestId: request.requestId
        }
        return response
    }

    // IDHTRpcService implementation
    private async ping(request: PingRequest, context: ServerCallContext): Promise<PingResponse> {
        logger.trace('received ping request: ' + keyFromPeerDescriptor((context as DhtCallContext).incomingSourceDescriptor!))
        setImmediate(() => {
            this.addNewContact((context as DhtCallContext).incomingSourceDescriptor!)
        })
        const response: PingResponse = {
            requestId: request.requestId
        }
        return response
    }

    // IDHTRpcService implementation
    private async leaveNotice(request: LeaveNotice, context: ServerCallContext): Promise<Empty> {
        // TODO check signature??
        if (request.serviceId === this.config.serviceId) {
            this.removeContact((context as DhtCallContext).incomingSourceDescriptor!)
        }
        return {}
    }
}
