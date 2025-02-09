import { toEthereumAddress } from '@streamr/utils'
import assert from 'assert'
import ValidationError from '../../../../src/errors/ValidationError'
import BroadcastMessage from '../../../../src/protocol/control_layer/broadcast_message/BroadcastMessage'
import ControlMessage from '../../../../src/protocol/control_layer/ControlMessage'
import MessageID from '../../../../src/protocol/message_layer/MessageID'
import StreamMessage from '../../../../src/protocol/message_layer/StreamMessage'
import { toStreamID } from '../../../../src/utils/StreamID'

const PUBLISHER_ID = toEthereumAddress('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')

describe('BroadcastMessage', () => {
    describe('constructor', () => {
        it('throws on null streamMessage', () => {
            assert.throws(() => new BroadcastMessage({
                requestId: 'requestId',
            } as any), ValidationError)
        })
        it('throws on bogus streamMessage', () => {
            assert.throws(() => new BroadcastMessage({
                requestId: 'requestId',
                streamMessage: {
                    fake: true
                } as any,
            }), ValidationError)
        })
        it('should create the latest version', () => {
            const streamMessage = new StreamMessage({
                messageId: new MessageID(toStreamID('streamId'), 0, 1529549961116, 0, PUBLISHER_ID, 'msgChainId'),
                content: {},
                signature: 'signature'
            })
            const msg = new BroadcastMessage({
                requestId: 'requestId',
                streamMessage,
            })
            assert(msg instanceof BroadcastMessage)
            assert.strictEqual(msg.version, ControlMessage.LATEST_VERSION)
            assert.strictEqual(msg.requestId, 'requestId')
            assert.strictEqual(msg.streamMessage, streamMessage)
        })
    })
})
