// @generated by protobuf-ts 2.8.2 with parameter server_generic,generate_dependencies,long_type_number
// @generated from protobuf file "packages/trackerless-network/protos/NetworkRpc.proto" (syntax proto3)
// tslint:disable
import { Empty } from "../../../google/protobuf/empty";
import { ServiceType } from "@protobuf-ts/runtime-rpc";
import { MessageType } from "@protobuf-ts/runtime";
import { PeerDescriptor } from "../../dht/protos/DhtRpc";
/**
 * @generated from protobuf message MessageID
 */
export interface MessageID {
    /**
     * @generated from protobuf field: string streamId = 1;
     */
    streamId: string;
    /**
     * @generated from protobuf field: int32 streamPartition = 2;
     */
    streamPartition: number;
    /**
     * @generated from protobuf field: int64 timestamp = 3;
     */
    timestamp: number;
    /**
     * @generated from protobuf field: int32 sequenceNumber = 4;
     */
    sequenceNumber: number;
    /**
     * @generated from protobuf field: bytes publisherId = 5;
     */
    publisherId: Uint8Array;
    /**
     * @generated from protobuf field: string messageChainId = 6;
     */
    messageChainId: string;
}
/**
 * @generated from protobuf message MessageRef
 */
export interface MessageRef {
    /**
     * @generated from protobuf field: int64 timestamp = 1;
     */
    timestamp: number;
    /**
     * @generated from protobuf field: int32 sequenceNumber = 2;
     */
    sequenceNumber: number;
}
/**
 * @generated from protobuf message StreamMessage
 */
export interface StreamMessage {
    /**
     * @generated from protobuf field: StreamMessageType messageType = 1;
     */
    messageType: StreamMessageType;
    /**
     * @generated from protobuf field: ContentType contentType = 2;
     */
    contentType: ContentType;
    /**
     * @generated from protobuf field: EncryptionType encryptionType = 3;
     */
    encryptionType: EncryptionType;
    /**
     * @generated from protobuf field: bytes content = 4;
     */
    content: Uint8Array;
    /**
     * @generated from protobuf field: bytes signature = 5;
     */
    signature: Uint8Array;
    /**
     * @generated from protobuf field: MessageID messageId = 6;
     */
    messageId?: MessageID;
    /**
     * @generated from protobuf field: optional MessageRef previousMessageRef = 7;
     */
    previousMessageRef?: MessageRef;
    /**
     * @generated from protobuf field: optional string groupKeyId = 8;
     */
    groupKeyId?: string;
    /**
     * @generated from protobuf field: optional GroupKey newGroupKey = 9;
     */
    newGroupKey?: GroupKey;
}
/**
 * @generated from protobuf message GroupKeyRequest
 */
export interface GroupKeyRequest {
    /**
     * @generated from protobuf field: string requestId = 1;
     */
    requestId: string;
    /**
     * @generated from protobuf field: bytes recipientId = 2;
     */
    recipientId: Uint8Array;
    /**
     * @generated from protobuf field: bytes rsaPublicKey = 3;
     */
    rsaPublicKey: Uint8Array;
    /**
     * @generated from protobuf field: repeated string groupKeyIds = 4;
     */
    groupKeyIds: string[];
}
/**
 * @generated from protobuf message GroupKeyResponse
 */
export interface GroupKeyResponse {
    /**
     * @generated from protobuf field: string requestId = 1;
     */
    requestId: string;
    /**
     * @generated from protobuf field: bytes recipientId = 2;
     */
    recipientId: Uint8Array;
    /**
     * @generated from protobuf field: repeated GroupKey groupKeys = 3;
     */
    groupKeys: GroupKey[];
}
/**
 * @generated from protobuf message GroupKey
 */
export interface GroupKey {
    /**
     * @generated from protobuf field: string id = 1;
     */
    id: string;
    /**
     * @generated from protobuf field: bytes data = 2;
     */
    data: Uint8Array;
}
/**
 * @generated from protobuf message StreamHandshakeRequest
 */
export interface StreamHandshakeRequest {
    /**
     * @generated from protobuf field: string randomGraphId = 1;
     */
    randomGraphId: string;
    /**
     * @generated from protobuf field: string senderId = 2;
     */
    senderId: string;
    /**
     * @generated from protobuf field: string requestId = 3;
     */
    requestId: string;
    /**
     * @generated from protobuf field: optional string concurrentHandshakeTargetId = 4;
     */
    concurrentHandshakeTargetId?: string;
    /**
     * @generated from protobuf field: repeated string neighborIds = 5;
     */
    neighborIds: string[];
    /**
     * @generated from protobuf field: dht.PeerDescriptor senderDescriptor = 6;
     */
    senderDescriptor?: PeerDescriptor;
    /**
     * @generated from protobuf field: optional string interleaveSourceId = 7;
     */
    interleaveSourceId?: string;
}
/**
 * @generated from protobuf message StreamHandshakeResponse
 */
export interface StreamHandshakeResponse {
    /**
     * @generated from protobuf field: bool accepted = 1;
     */
    accepted: boolean;
    /**
     * @generated from protobuf field: string requestId = 2;
     */
    requestId: string;
    /**
     * @generated from protobuf field: optional dht.PeerDescriptor interleaveTargetDescriptor = 3;
     */
    interleaveTargetDescriptor?: PeerDescriptor;
}
/**
 * @generated from protobuf message InterleaveNotice
 */
export interface InterleaveNotice {
    /**
     * @generated from protobuf field: string senderId = 1;
     */
    senderId: string;
    /**
     * @generated from protobuf field: string randomGraphId = 2;
     */
    randomGraphId: string;
    /**
     * @generated from protobuf field: dht.PeerDescriptor interleaveTargetDescriptor = 3;
     */
    interleaveTargetDescriptor?: PeerDescriptor;
}
/**
 * @generated from protobuf message LeaveStreamNotice
 */
export interface LeaveStreamNotice {
    /**
     * @generated from protobuf field: string randomGraphId = 1;
     */
    randomGraphId: string;
    /**
     * @generated from protobuf field: string senderId = 2;
     */
    senderId: string;
}
/**
 * @generated from protobuf message NeighborUpdate
 */
export interface NeighborUpdate {
    /**
     * @generated from protobuf field: string senderId = 1;
     */
    senderId: string; // TODO: remove redundant info NET-1028
    /**
     * @generated from protobuf field: string randomGraphId = 2;
     */
    randomGraphId: string;
    /**
     * @generated from protobuf field: bool removeMe = 3;
     */
    removeMe: boolean;
    /**
     * @generated from protobuf field: repeated dht.PeerDescriptor neighborDescriptors = 4;
     */
    neighborDescriptors: PeerDescriptor[];
}
/**
 * @generated from protobuf message ProxyConnectionRequest
 */
export interface ProxyConnectionRequest {
    /**
     * @generated from protobuf field: string senderId = 1;
     */
    senderId: string; // TODO: remove redundant info NET-1028
    /**
     * @generated from protobuf field: string streamId = 2;
     */
    streamId: string;
    /**
     * @generated from protobuf field: uint32 streamPartition = 3;
     */
    streamPartition: number;
    /**
     * @generated from protobuf field: ProxyDirection direction = 4;
     */
    direction: ProxyDirection;
    /**
     * @generated from protobuf field: bytes userId = 5;
     */
    userId: Uint8Array;
    /**
     * @generated from protobuf field: dht.PeerDescriptor senderDescriptor = 6;
     */
    senderDescriptor?: PeerDescriptor;
}
/**
 * @generated from protobuf message ProxyConnectionResponse
 */
export interface ProxyConnectionResponse {
    /**
     * @generated from protobuf field: string senderId = 1;
     */
    senderId: string; // TODO: remove redundant info NET-1028
    /**
     * @generated from protobuf field: string streamId = 2;
     */
    streamId: string;
    /**
     * @generated from protobuf field: uint32 streamPartition = 3;
     */
    streamPartition: number;
    /**
     * @generated from protobuf field: ProxyDirection direction = 4;
     */
    direction: ProxyDirection;
    /**
     * @generated from protobuf field: bool accepted = 5;
     */
    accepted: boolean;
}
/**
 * @generated from protobuf message TemporaryConnectionRequest
 */
export interface TemporaryConnectionRequest {
    /**
     * @generated from protobuf field: string senderId = 1;
     */
    senderId: string;
}
/**
 * @generated from protobuf message TemporaryConnectionResponse
 */
export interface TemporaryConnectionResponse {
    /**
     * @generated from protobuf field: bool accepted = 1;
     */
    accepted: boolean;
}
/**
 * @generated from protobuf enum StreamMessageType
 */
export enum StreamMessageType {
    /**
     * @generated from protobuf enum value: MESSAGE = 0;
     */
    MESSAGE = 0,
    /**
     * @generated from protobuf enum value: GROUP_KEY_REQUEST = 1;
     */
    GROUP_KEY_REQUEST = 1,
    /**
     * @generated from protobuf enum value: GROUP_KEY_RESPONSE = 2;
     */
    GROUP_KEY_RESPONSE = 2
}
/**
 * @generated from protobuf enum ContentType
 */
export enum ContentType {
    /**
     * @generated from protobuf enum value: JSON = 0;
     */
    JSON = 0,
    /**
     * @generated from protobuf enum value: BINARY = 1;
     */
    BINARY = 1
}
/**
 * @generated from protobuf enum EncryptionType
 */
export enum EncryptionType {
    /**
     * @generated from protobuf enum value: NONE = 0;
     */
    NONE = 0,
    /**
     * @generated from protobuf enum value: AES = 1;
     */
    AES = 1
}
/**
 * @generated from protobuf enum ProxyDirection
 */
export enum ProxyDirection {
    /**
     * @generated from protobuf enum value: PUBLISH = 0;
     */
    PUBLISH = 0,
    /**
     * @generated from protobuf enum value: SUBSCRIBE = 1;
     */
    SUBSCRIBE = 1
}
// @generated message type with reflection information, may provide speed optimized methods
class MessageID$Type extends MessageType<MessageID> {
    constructor() {
        super("MessageID", [
            { no: 1, name: "streamId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "streamPartition", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 3, name: "timestamp", kind: "scalar", T: 3 /*ScalarType.INT64*/, L: 2 /*LongType.NUMBER*/ },
            { no: 4, name: "sequenceNumber", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 5, name: "publisherId", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 6, name: "messageChainId", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message MessageID
 */
export const MessageID = new MessageID$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MessageRef$Type extends MessageType<MessageRef> {
    constructor() {
        super("MessageRef", [
            { no: 1, name: "timestamp", kind: "scalar", T: 3 /*ScalarType.INT64*/, L: 2 /*LongType.NUMBER*/ },
            { no: 2, name: "sequenceNumber", kind: "scalar", T: 5 /*ScalarType.INT32*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message MessageRef
 */
export const MessageRef = new MessageRef$Type();
// @generated message type with reflection information, may provide speed optimized methods
class StreamMessage$Type extends MessageType<StreamMessage> {
    constructor() {
        super("StreamMessage", [
            { no: 1, name: "messageType", kind: "enum", T: () => ["StreamMessageType", StreamMessageType] },
            { no: 2, name: "contentType", kind: "enum", T: () => ["ContentType", ContentType] },
            { no: 3, name: "encryptionType", kind: "enum", T: () => ["EncryptionType", EncryptionType] },
            { no: 4, name: "content", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 5, name: "signature", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 6, name: "messageId", kind: "message", T: () => MessageID },
            { no: 7, name: "previousMessageRef", kind: "message", T: () => MessageRef },
            { no: 8, name: "groupKeyId", kind: "scalar", opt: true, T: 9 /*ScalarType.STRING*/ },
            { no: 9, name: "newGroupKey", kind: "message", T: () => GroupKey }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message StreamMessage
 */
export const StreamMessage = new StreamMessage$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GroupKeyRequest$Type extends MessageType<GroupKeyRequest> {
    constructor() {
        super("GroupKeyRequest", [
            { no: 1, name: "requestId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "recipientId", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "rsaPublicKey", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 4, name: "groupKeyIds", kind: "scalar", repeat: 2 /*RepeatType.UNPACKED*/, T: 9 /*ScalarType.STRING*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message GroupKeyRequest
 */
export const GroupKeyRequest = new GroupKeyRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GroupKeyResponse$Type extends MessageType<GroupKeyResponse> {
    constructor() {
        super("GroupKeyResponse", [
            { no: 1, name: "requestId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "recipientId", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "groupKeys", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => GroupKey }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message GroupKeyResponse
 */
export const GroupKeyResponse = new GroupKeyResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GroupKey$Type extends MessageType<GroupKey> {
    constructor() {
        super("GroupKey", [
            { no: 1, name: "id", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "data", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message GroupKey
 */
export const GroupKey = new GroupKey$Type();
// @generated message type with reflection information, may provide speed optimized methods
class StreamHandshakeRequest$Type extends MessageType<StreamHandshakeRequest> {
    constructor() {
        super("StreamHandshakeRequest", [
            { no: 1, name: "randomGraphId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "senderId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "requestId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "concurrentHandshakeTargetId", kind: "scalar", opt: true, T: 9 /*ScalarType.STRING*/ },
            { no: 5, name: "neighborIds", kind: "scalar", repeat: 2 /*RepeatType.UNPACKED*/, T: 9 /*ScalarType.STRING*/ },
            { no: 6, name: "senderDescriptor", kind: "message", T: () => PeerDescriptor },
            { no: 7, name: "interleaveSourceId", kind: "scalar", opt: true, T: 9 /*ScalarType.STRING*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message StreamHandshakeRequest
 */
export const StreamHandshakeRequest = new StreamHandshakeRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class StreamHandshakeResponse$Type extends MessageType<StreamHandshakeResponse> {
    constructor() {
        super("StreamHandshakeResponse", [
            { no: 1, name: "accepted", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 2, name: "requestId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "interleaveTargetDescriptor", kind: "message", T: () => PeerDescriptor }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message StreamHandshakeResponse
 */
export const StreamHandshakeResponse = new StreamHandshakeResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class InterleaveNotice$Type extends MessageType<InterleaveNotice> {
    constructor() {
        super("InterleaveNotice", [
            { no: 1, name: "senderId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "randomGraphId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "interleaveTargetDescriptor", kind: "message", T: () => PeerDescriptor }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message InterleaveNotice
 */
export const InterleaveNotice = new InterleaveNotice$Type();
// @generated message type with reflection information, may provide speed optimized methods
class LeaveStreamNotice$Type extends MessageType<LeaveStreamNotice> {
    constructor() {
        super("LeaveStreamNotice", [
            { no: 1, name: "randomGraphId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "senderId", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message LeaveStreamNotice
 */
export const LeaveStreamNotice = new LeaveStreamNotice$Type();
// @generated message type with reflection information, may provide speed optimized methods
class NeighborUpdate$Type extends MessageType<NeighborUpdate> {
    constructor() {
        super("NeighborUpdate", [
            { no: 1, name: "senderId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "randomGraphId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "removeMe", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 4, name: "neighborDescriptors", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => PeerDescriptor }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message NeighborUpdate
 */
export const NeighborUpdate = new NeighborUpdate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ProxyConnectionRequest$Type extends MessageType<ProxyConnectionRequest> {
    constructor() {
        super("ProxyConnectionRequest", [
            { no: 1, name: "senderId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "streamId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "streamPartition", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 4, name: "direction", kind: "enum", T: () => ["ProxyDirection", ProxyDirection] },
            { no: 5, name: "userId", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 6, name: "senderDescriptor", kind: "message", T: () => PeerDescriptor }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message ProxyConnectionRequest
 */
export const ProxyConnectionRequest = new ProxyConnectionRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ProxyConnectionResponse$Type extends MessageType<ProxyConnectionResponse> {
    constructor() {
        super("ProxyConnectionResponse", [
            { no: 1, name: "senderId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "streamId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "streamPartition", kind: "scalar", T: 13 /*ScalarType.UINT32*/ },
            { no: 4, name: "direction", kind: "enum", T: () => ["ProxyDirection", ProxyDirection] },
            { no: 5, name: "accepted", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message ProxyConnectionResponse
 */
export const ProxyConnectionResponse = new ProxyConnectionResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class TemporaryConnectionRequest$Type extends MessageType<TemporaryConnectionRequest> {
    constructor() {
        super("TemporaryConnectionRequest", [
            { no: 1, name: "senderId", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message TemporaryConnectionRequest
 */
export const TemporaryConnectionRequest = new TemporaryConnectionRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class TemporaryConnectionResponse$Type extends MessageType<TemporaryConnectionResponse> {
    constructor() {
        super("TemporaryConnectionResponse", [
            { no: 1, name: "accepted", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
}
/**
 * @generated MessageType for protobuf message TemporaryConnectionResponse
 */
export const TemporaryConnectionResponse = new TemporaryConnectionResponse$Type();
/**
 * @generated ServiceType for protobuf service NetworkRpc
 */
export const NetworkRpc = new ServiceType("NetworkRpc", [
    { name: "sendData", options: {}, I: StreamMessage, O: Empty },
    { name: "leaveStreamNotice", options: {}, I: LeaveStreamNotice, O: Empty }
]);
/**
 * @generated ServiceType for protobuf service ProxyConnectionRpc
 */
export const ProxyConnectionRpc = new ServiceType("ProxyConnectionRpc", [
    { name: "requestConnection", options: {}, I: ProxyConnectionRequest, O: ProxyConnectionResponse }
]);
/**
 * @generated ServiceType for protobuf service HandshakeRpc
 */
export const HandshakeRpc = new ServiceType("HandshakeRpc", [
    { name: "handshake", options: {}, I: StreamHandshakeRequest, O: StreamHandshakeResponse },
    { name: "interleaveNotice", options: {}, I: InterleaveNotice, O: Empty }
]);
/**
 * @generated ServiceType for protobuf service NeighborUpdateRpc
 */
export const NeighborUpdateRpc = new ServiceType("NeighborUpdateRpc", [
    { name: "neighborUpdate", options: {}, I: NeighborUpdate, O: NeighborUpdate }
]);
/**
 * @generated ServiceType for protobuf service TemporaryConnectionRpc
 */
export const TemporaryConnectionRpc = new ServiceType("TemporaryConnectionRpc", [
    { name: "openConnection", options: {}, I: TemporaryConnectionRequest, O: TemporaryConnectionResponse }
]);
