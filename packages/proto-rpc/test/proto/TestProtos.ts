// @generated by protobuf-ts 2.8.0 with parameter server_generic,generate_dependencies
// @generated from protobuf file "TestProtos.proto" (syntax proto3)
// tslint:disable
import { ServiceType } from "@protobuf-ts/runtime-rpc";
import { MessageType } from "@protobuf-ts/runtime";
/**
 * @generated from protobuf message RouteMessageWrapper
 */
export interface RouteMessageWrapper {
    /**
     * @generated from protobuf field: PeerDescriptor sourcePeer = 1;
     */
    sourcePeer?: PeerDescriptor;
    /**
     * @generated from protobuf field: string nonce = 2;
     */
    nonce: string;
    /**
     * @generated from protobuf field: PeerDescriptor destinationPeer = 3;
     */
    destinationPeer?: PeerDescriptor;
    /**
     * @generated from protobuf field: PeerDescriptor previousPeer = 4;
     */
    previousPeer?: PeerDescriptor;
    /**
     * @generated from protobuf field: bytes message = 5;
     */
    message: Uint8Array; // Expected to be of type Message
}
/**
 * @generated from protobuf message RouteMessageAck
 */
export interface RouteMessageAck {
    /**
     * @generated from protobuf field: PeerDescriptor sourcePeer = 1;
     */
    sourcePeer?: PeerDescriptor;
    /**
     * @generated from protobuf field: string nonce = 2;
     */
    nonce: string;
    /**
     * @generated from protobuf field: PeerDescriptor destinationPeer = 3;
     */
    destinationPeer?: PeerDescriptor;
    /**
     * @generated from protobuf field: string error = 4;
     */
    error: string;
}
/**
 * @generated from protobuf message PingRequest
 */
export interface PingRequest {
    /**
     * @generated from protobuf field: string nonce = 1;
     */
    nonce: string;
}
/**
 * @generated from protobuf message PingResponse
 */
export interface PingResponse {
    /**
     * @generated from protobuf field: string nonce = 1;
     */
    nonce: string;
}
/**
 * @generated from protobuf message ClosestPeersRequest
 */
export interface ClosestPeersRequest {
    /**
     * @generated from protobuf field: PeerDescriptor peerDescriptor = 1;
     */
    peerDescriptor?: PeerDescriptor;
    /**
     * @generated from protobuf field: string nonce = 2;
     */
    nonce: string; // requestId
}
/**
 * @generated from protobuf message ClosestPeersResponse
 */
export interface ClosestPeersResponse {
    /**
     * @generated from protobuf field: repeated PeerDescriptor peers = 1;
     */
    peers: PeerDescriptor[];
    /**
     * @generated from protobuf field: string nonce = 2;
     */
    nonce: string; // requestId
}
/**
 * @generated from protobuf message PeerDescriptor
 */
export interface PeerDescriptor {
    /**
     * @generated from protobuf field: bytes peerId = 1;
     */
    peerId: Uint8Array;
    /**
     * @generated from protobuf field: NodeType type = 2;
     */
    type: NodeType;
    /**
     * @generated from protobuf field: ConnectivityMethod udp = 3;
     */
    udp?: ConnectivityMethod;
    /**
     * @generated from protobuf field: ConnectivityMethod tcp = 4;
     */
    tcp?: ConnectivityMethod;
    /**
     * @generated from protobuf field: ConnectivityMethod websocket = 5;
     */
    websocket?: ConnectivityMethod;
    /**
     * @generated from protobuf field: optional bool openInternet = 6;
     */
    openInternet?: boolean;
}
/**
 * @generated from protobuf message ConnectivityMethod
 */
export interface ConnectivityMethod {
    /**
     * @generated from protobuf field: uint32 port = 2;
     */
    port: number;
    /**
     * @generated from protobuf field: string ip = 3;
     */
    ip: string;
}
/**
 * @generated from protobuf enum NodeType
 */
export enum NodeType {
    /**
     * @generated from protobuf enum value: NODEJS = 0;
     */
    NODEJS = 0,
    /**
     * @generated from protobuf enum value: BROWSER = 1;
     */
    BROWSER = 1
}
// @generated message type with reflection information, may provide speed optimized methods
class RouteMessageWrapper$Type extends MessageType<RouteMessageWrapper> {
    constructor() {
        super("RouteMessageWrapper", [
            { no: 1, name: "sourcePeer", kind: "message", T: () => PeerDescriptor },
            { no: 2, name: "nonce", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "destinationPeer", kind: "message", T: () => PeerDescriptor },
            { no: 4, name: "previousPeer", kind: "message", T: () => PeerDescriptor },
            { no: 5, name: "message", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message RouteMessageWrapper
 */
export const RouteMessageWrapper = new RouteMessageWrapper$Type();
// @generated message type with reflection information, may provide speed optimized methods
class RouteMessageAck$Type extends MessageType<RouteMessageAck> {
    constructor() {
        super("RouteMessageAck", [
            { no: 1, name: "sourcePeer", kind: "message", T: () => PeerDescriptor },
            { no: 2, name: "nonce", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "destinationPeer", kind: "message", T: () => PeerDescriptor },
            { no: 4, name: "error", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message RouteMessageAck
 */
export const RouteMessageAck = new RouteMessageAck$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PingRequest$Type extends MessageType<PingRequest> {
    constructor() {
        super("PingRequest", [
            { no: 1, name: "nonce", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message PingRequest
 */
export const PingRequest = new PingRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PingResponse$Type extends MessageType<PingResponse> {
    constructor() {
        super("PingResponse", [
            { no: 1, name: "nonce", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message PingResponse
 */
export const PingResponse = new PingResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ClosestPeersRequest$Type extends MessageType<ClosestPeersRequest> {
    constructor() {
        super("ClosestPeersRequest", [
            { no: 1, name: "peerDescriptor", kind: "message", T: () => PeerDescriptor },
            { no: 2, name: "nonce", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message ClosestPeersRequest
 */
export const ClosestPeersRequest = new ClosestPeersRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ClosestPeersResponse$Type extends MessageType<ClosestPeersResponse> {
    constructor() {
        super("ClosestPeersResponse", [
            { no: 1, name: "peers", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => PeerDescriptor },
            { no: 2, name: "nonce", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message ClosestPeersResponse
 */
export const ClosestPeersResponse = new ClosestPeersResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PeerDescriptor$Type extends MessageType<PeerDescriptor> {
    constructor() {
        super("PeerDescriptor", [
            { no: 1, name: "peerId", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 2, name: "type", kind: "enum", T: () => ["NodeType", NodeType] },
            { no: 3, name: "udp", kind: "message", T: () => ConnectivityMethod },
            { no: 4, name: "tcp", kind: "message", T: () => ConnectivityMethod },
            { no: 5, name: "websocket", kind: "message", T: () => ConnectivityMethod },
            { no: 6, name: "openInternet", kind: "scalar", opt: true, T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message PeerDescriptor
 */
export const PeerDescriptor = new PeerDescriptor$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ConnectivityMethod$Type extends MessageType<ConnectivityMethod> {
    constructor() {
        super("ConnectivityMethod", [
            { no: 2, name: "port", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 3, name: "ip", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message ConnectivityMethod
 */
export const ConnectivityMethod = new ConnectivityMethod$Type();
/**
 * @generated ServiceType for protobuf service DhtRpcService
 */
export const DhtRpcService = new ServiceType("DhtRpcService", [
    { name: "getClosestPeers", options: {}, I: ClosestPeersRequest, O: ClosestPeersResponse },
    { name: "ping", options: {}, I: PingRequest, O: PingResponse },
    { name: "routeMessage", options: {}, I: RouteMessageWrapper, O: RouteMessageAck }
]);
