import { NodeType, PeerDescriptor, PeerID, peerIdFromPeerDescriptor } from '@streamr/dht'
import { ProxyDirection } from '../../src/proto/packages/trackerless-network/protos/NetworkRpc'
import { waitForCondition, waitForEvent3, toEthereumAddress } from '@streamr/utils'
import { NetworkNode } from '../../src/NetworkNode'
import { MessageID, MessageRef, StreamMessage, StreamMessageType, toStreamID, toStreamPartID } from '@streamr/protocol'
import { randomEthereumAddress } from '@streamr/test-utils'
import { NodeID, getNodeIdFromPeerDescriptor } from '../../src/identifiers'

const PROXIED_NODE_USER_ID = randomEthereumAddress()

describe('Proxy connections', () => {

    const proxyNodeDescriptor1: PeerDescriptor = {
        kademliaId: PeerID.fromString(`proxyNode1`).value,
        type: NodeType.NODEJS,
        nodeName: 'proxyNode',
        websocket: { ip: 'localhost', port: 23132 }
    }
    const proxyNodeDescriptor2: PeerDescriptor = {
        kademliaId: PeerID.fromString(`proxyNode2`).value,
        type: NodeType.NODEJS,
        nodeName: 'proxyNode',
        websocket: { ip: 'localhost', port: 23133 }
    }
    const proxiedNodeDescriptor: PeerDescriptor = {
        kademliaId: PeerID.fromString(`proxiedNode`).value,
        type: NodeType.NODEJS,
    }
    const proxiedPeerId = peerIdFromPeerDescriptor(proxiedNodeDescriptor)

    const streamPartId = toStreamPartID(toStreamID('proxy-test'), 0)

    const message = new StreamMessage({
        messageId: new MessageID(
            toStreamID('proxy-test'),
            0,
            666,
            0,
            toEthereumAddress(randomEthereumAddress()),
            'msgChainId'
        ),
        prevMsgRef: new MessageRef(665, 0),
        content: {
            hello: 'world'
        },
        messageType: StreamMessageType.MESSAGE,
        signature: '0x1111',
    })

    let proxyNode1: NetworkNode
    let proxyNode2: NetworkNode
    let proxiedNode: NetworkNode

    beforeEach(async () => {
        proxyNode1 = new NetworkNode({
            layer0: {
                entryPoints: [proxyNodeDescriptor1],
                peerDescriptor: proxyNodeDescriptor1,
            },
            networkNode: {
                acceptProxyConnections: true
            }
        })
        await proxyNode1.start()
        await proxyNode1.setStreamPartEntryPoints(streamPartId, [proxyNodeDescriptor1])
        await proxyNode1.stack.getStreamrNode()!.joinStream(streamPartId)
       
        proxyNode2 = new NetworkNode({
            layer0: {
                entryPoints: [proxyNodeDescriptor1],
                peerDescriptor: proxyNodeDescriptor2,
            },
            networkNode: {
                acceptProxyConnections: true
            }
        })
        await proxyNode2.start()
        proxyNode2.setStreamPartEntryPoints(streamPartId, [proxyNodeDescriptor1])
        await proxyNode2.stack.getStreamrNode()!.joinStream(streamPartId)

        proxiedNode = new NetworkNode({
            layer0: {
                entryPoints: [proxyNodeDescriptor1],
                peerDescriptor: proxiedNodeDescriptor,
            },
            networkNode: {}
        })
        await proxiedNode.start(false)
    }, 30000)

    afterEach(async () => {
        await proxyNode1.stop()
        await proxyNode2.stop()
        await proxiedNode.stop()
    })

    it('happy path publishing', async () => {
        await proxiedNode.setProxies(streamPartId, [proxyNodeDescriptor1], ProxyDirection.PUBLISH, PROXIED_NODE_USER_ID, 1)

        await Promise.all([
            waitForEvent3(proxyNode1.stack.getStreamrNode()! as any, 'newMessage'),
            proxiedNode.publish(message)
        ])
    })

    it('happy path subscribing', async () => {
        await proxiedNode.setProxies(streamPartId, [proxyNodeDescriptor1], ProxyDirection.SUBSCRIBE, PROXIED_NODE_USER_ID, 1)
        proxiedNode.subscribe(streamPartId)
        await Promise.all([
            waitForEvent3(proxiedNode.stack.getStreamrNode()! as any, 'newMessage'),
            proxyNode1.publish(message)
        ])
    })

    it('can leave proxy publish connection', async () => {
        await proxiedNode.setProxies(streamPartId, [proxyNodeDescriptor1], ProxyDirection.PUBLISH, PROXIED_NODE_USER_ID, 1)
        expect(proxiedNode.hasStreamPart(streamPartId)).toBe(true) 
        expect(proxyNode1.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.PUBLISH)).toBe(true) 

        await proxiedNode.setProxies(streamPartId, [], ProxyDirection.PUBLISH, PROXIED_NODE_USER_ID, 0)
        expect(proxiedNode.hasStreamPart(streamPartId)).toBe(false) 
        await waitForCondition(() => 
            proxyNode1.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.PUBLISH) === false)
    })

    it('can leave proxy subscribe connection', async () => {
        await proxiedNode.setProxies(streamPartId, [proxyNodeDescriptor1], ProxyDirection.SUBSCRIBE, PROXIED_NODE_USER_ID, 1)
        expect(proxiedNode.hasStreamPart(streamPartId)).toBe(true) 
        expect(proxyNode1.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE)).toBe(true) 

        await proxiedNode.setProxies(streamPartId, [], ProxyDirection.SUBSCRIBE, PROXIED_NODE_USER_ID, 0)
        expect(proxiedNode.hasStreamPart(streamPartId)).toBe(false)
        await waitForCondition(() => 
            proxyNode1.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE) === false)

    })

    it('can open multiple proxy connections', async () => {
        await proxiedNode.setProxies(
            streamPartId,
            [proxyNodeDescriptor1, proxyNodeDescriptor2],
            ProxyDirection.SUBSCRIBE,
            PROXIED_NODE_USER_ID
        )
        expect(proxiedNode.hasStreamPart(streamPartId)).toBe(true)
        expect(proxiedNode.stack.getStreamrNode().getStream(streamPartId)!.layer2.getTargetNeighborIds().length).toBe(2)
        expect(proxyNode1.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE)).toBe(true) 
        expect(proxyNode2.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE)).toBe(true) 
    })

    it('can open multiple proxy connections and close one', async () => {
        await proxiedNode.setProxies(
            streamPartId,
            [proxyNodeDescriptor1, proxyNodeDescriptor2],
            ProxyDirection.SUBSCRIBE,
            PROXIED_NODE_USER_ID
        )
        expect(proxiedNode.hasStreamPart(streamPartId)).toBe(true)
        expect(proxiedNode.stack.getStreamrNode().getStream(streamPartId)!.layer2.getTargetNeighborIds().length).toBe(2)
        expect(proxyNode1.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE)).toBe(true) 
        expect(proxyNode2.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE)).toBe(true)
        
        await proxiedNode.setProxies(streamPartId, [proxyNodeDescriptor1], ProxyDirection.SUBSCRIBE, PROXIED_NODE_USER_ID)
        expect(proxiedNode.hasStreamPart(streamPartId)).toBe(true)
        expect(proxiedNode.stack.getStreamrNode().getStream(streamPartId)!.layer2.getTargetNeighborIds().length).toBe(1)
        await waitForCondition(() => 
            proxyNode2.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE) === false)
        expect(proxyNode1.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE)).toBe(true)
    })

    it('can open and close all connections', async () => {
        await proxiedNode.setProxies(
            streamPartId,
            [proxyNodeDescriptor1, proxyNodeDescriptor2],
            ProxyDirection.SUBSCRIBE,
            PROXIED_NODE_USER_ID
        )
        expect(proxiedNode.hasStreamPart(streamPartId)).toBe(true)
        expect(proxiedNode.stack.getStreamrNode().getStream(streamPartId)!.layer2.getTargetNeighborIds().length).toBe(2)
        expect(proxyNode1.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE)).toBe(true) 
        expect(proxyNode2.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE)).toBe(true)

        await proxiedNode.setProxies(streamPartId, [], ProxyDirection.SUBSCRIBE, PROXIED_NODE_USER_ID)
        expect(proxiedNode.hasStreamPart(streamPartId)).toBe(false)
        await waitForCondition(() => 
            proxyNode1.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE) === false)
        await waitForCondition(() => 
            proxyNode2.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE) === false)
    })

    it('will reconnect if proxy node goes offline and comes back online', async () => {
        await proxiedNode.setProxies(
            streamPartId,
            [proxyNodeDescriptor1],
            ProxyDirection.SUBSCRIBE,
            PROXIED_NODE_USER_ID
        )
        expect(proxiedNode.hasStreamPart(streamPartId)).toBe(true)
        proxyNode1.unsubscribe(streamPartId)
        await waitForCondition(() => 
            proxiedNode.hasProxyConnection(streamPartId, getNodeIdFromPeerDescriptor(proxyNodeDescriptor1), ProxyDirection.SUBSCRIBE))
        expect(proxyNode1.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE)).toBe(false)
    
        await proxyNode1.stack.getStreamrNode()!.joinStream(streamPartId)
        await waitForCondition(() => 
            proxiedNode.hasProxyConnection(streamPartId, getNodeIdFromPeerDescriptor(proxyNodeDescriptor1), ProxyDirection.SUBSCRIBE)
        , 25000)
        expect(proxyNode1.hasProxyConnection(streamPartId, proxiedPeerId.toKey() as unknown as NodeID, ProxyDirection.SUBSCRIBE)).toBe(true)

    }, 30000)

    it('cannot subscribe on proxy publish streams', async () => {
        await proxiedNode.setProxies(
            streamPartId,
            [proxyNodeDescriptor1],
            ProxyDirection.PUBLISH,
            PROXIED_NODE_USER_ID
        )
        await expect(proxiedNode.subscribe(streamPartId)).rejects.toThrow('Cannot subscribe')
    })

    it('connect publish on proxy subscribe streams', async () => {
        await proxiedNode.setProxies(
            streamPartId,
            [proxyNodeDescriptor1],
            ProxyDirection.SUBSCRIBE,
            PROXIED_NODE_USER_ID
        )
        await expect(proxiedNode.publish(message)).rejects.toThrow('Cannot publish')
    })

})
