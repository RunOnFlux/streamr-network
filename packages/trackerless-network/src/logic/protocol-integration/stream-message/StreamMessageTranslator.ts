import {
    MessageID,
    StreamMessage as OldStreamMessage,
    StreamMessageType as OldStreamMessageType,
    MessageRef as OldMessageRef,
    EncryptedGroupKey as OldEncryptedGroupKey,
    GroupKeyRequest as OldGroupKeyRequest,
    GroupKeyResponse as OldGroupKeyResponse,
    StreamID,
    EncryptionType as OldEncryptionType,
} from '@streamr/protocol'
import {
    EncryptedGroupKey,
    EncryptionType,
    GroupKeyRequest,
    GroupKeyResponse,
    MessageRef,
    StreamMessage,
    StreamMessageType
} from '../../../proto/packages/trackerless-network/protos/NetworkRpc'
import { EthereumAddress } from '@streamr/utils'
import { GroupKeyRequestTranslator } from './GroupKeyRequestTranslator'
import { GroupKeyResponseTranslator } from './GroupKeyResponseTranslator'

const oldEnryptionTypeTranslator = (encryptionType: OldEncryptionType): EncryptionType => {
    if (encryptionType === OldEncryptionType.AES) {
        return EncryptionType.AES
    }
    return EncryptionType.NONE
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StreamMessageTranslator {

    private static readonly textEncoder = new TextEncoder() 
    private static readonly textDecoder = new TextDecoder()

    static toProtobuf(msg: OldStreamMessage): StreamMessage {
        let content: Uint8Array
        let messageType: StreamMessageType
        const contentType = msg.contentType
        if (msg.messageType === OldStreamMessageType.MESSAGE) {
            content = this.textEncoder.encode(msg.serializedContent)
            messageType = StreamMessageType.MESSAGE
        } else if (msg.messageType === OldStreamMessageType.GROUP_KEY_REQUEST) {
            content = GroupKeyRequest.toBinary(
                GroupKeyRequestTranslator.toProtobuf(
                    OldGroupKeyRequest.deserialize(
                        msg.serializedContent,
                        OldStreamMessageType.GROUP_KEY_REQUEST) as OldGroupKeyRequest
                )
            )
            messageType = StreamMessageType.GROUP_KEY_REQUEST
        } else if (msg.messageType === OldStreamMessageType.GROUP_KEY_RESPONSE) {
            content = GroupKeyResponse.toBinary(
                GroupKeyResponseTranslator.toProtobuf(
                    OldGroupKeyResponse.deserialize(
                        msg.serializedContent,
                        OldStreamMessageType.GROUP_KEY_RESPONSE) as OldGroupKeyResponse
                )
            )
            messageType = StreamMessageType.GROUP_KEY_RESPONSE
        } else {
            throw new Error('invalid message type')
        }
        const messageRef: MessageRef = {
            timestamp: msg.getTimestamp(),
            sequenceNumber: msg.getSequenceNumber(),
            streamId: msg.getStreamId() as string,
            streamPartition: msg.getStreamPartition(),
            publisherId: this.textEncoder.encode(msg.getPublisherId()),
            messageChainId: msg.getMsgChainId()
        }
        let previousMessageRef: MessageRef | undefined = undefined
        if (msg.getPreviousMessageRef()) {
            previousMessageRef = {
                timestamp: msg.getPreviousMessageRef()!.timestamp,
                sequenceNumber: msg.getPreviousMessageRef()!.sequenceNumber,
                streamId: msg.getStreamId() as string,
                streamPartition: msg.getStreamPartition(),
                publisherId: this.textEncoder.encode(msg.getPublisherId()),
                messageChainId: msg.getMsgChainId()
            }
        }
        let newGroupKey: EncryptedGroupKey | undefined = undefined
        if (msg.getNewGroupKey()) {
            newGroupKey = {
                data: this.textEncoder.encode(msg.getNewGroupKey()!.encryptedGroupKeyHex),
                groupKeyId: msg.getNewGroupKey()!.groupKeyId,
            }
        }
        const translated: StreamMessage = {
            content,
            contentType,
            encryptionType: oldEnryptionTypeTranslator(msg.encryptionType),
            messageRef: messageRef,
            previousMessageRef,
            messageType: messageType,
            signature: this.textEncoder.encode(msg.signature),
            groupKeyId: msg.groupKeyId ?? undefined,
            newGroupKey,
        }
        return translated
    }

    static toClientProtocol<T>(msg: StreamMessage): OldStreamMessage<T> {
        let content: string
        let contentType: OldStreamMessageType
        if (msg.messageType === StreamMessageType.MESSAGE) {
            contentType = OldStreamMessageType.MESSAGE
            content = this.textDecoder.decode(msg.content)
        } else if (msg.messageType === StreamMessageType.GROUP_KEY_REQUEST) {
            contentType = OldStreamMessageType.GROUP_KEY_REQUEST
            content = GroupKeyRequestTranslator.toClientProtocol(GroupKeyRequest.fromBinary(msg.content)).serialize()
        } else if (msg.messageType === StreamMessageType.GROUP_KEY_RESPONSE) {
            contentType = OldStreamMessageType.GROUP_KEY_RESPONSE
            content = GroupKeyResponseTranslator.toClientProtocol(GroupKeyResponse.fromBinary(msg.content)).serialize()
        } else {
            throw new Error('invalid message type')
        }
        const messageId = new MessageID(
            msg.messageRef!.streamId as StreamID,
            msg.messageRef!.streamPartition,
            Number(msg.messageRef!.timestamp),
            msg.messageRef!.sequenceNumber,
            this.textDecoder.decode(msg.messageRef!.publisherId) as EthereumAddress,
            msg.messageRef!.messageChainId
        )
        let prevMsgRef: OldMessageRef | undefined = undefined
        if (msg.previousMessageRef) {
            prevMsgRef = new OldMessageRef(Number(msg.previousMessageRef!.timestamp), msg.previousMessageRef!.sequenceNumber)
        }
        let newGroupKey: OldEncryptedGroupKey | undefined = undefined
        if (msg.newGroupKey) {
            newGroupKey = new OldEncryptedGroupKey(
                msg.newGroupKey!.groupKeyId,
                this.textDecoder.decode(msg.newGroupKey!.data),
            )
        }
        const translated = new OldStreamMessage<T>({
            signature: this.textDecoder.decode(msg.signature),
            newGroupKey,
            groupKeyId: msg.groupKeyId,
            content,
            messageType: contentType,
            encryptionType: msg.encryptionType,
            messageId,
            prevMsgRef
        })
        return translated
    }
}
