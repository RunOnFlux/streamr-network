import { GroupKeyResponse as OldGroupKeyResponse, EncryptedGroupKey as OldEncryptedGroupKey } from '@streamr/protocol'
import { GroupKey, GroupKeyResponse } from '../../../proto/packages/trackerless-network/protos/NetworkRpc'
import { toEthereumAddress } from '@streamr/utils'
import { binaryToHex, hexToBinary } from '../../utils'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GroupKeyResponseTranslator {

    static toProtobuf(msg: OldGroupKeyResponse): GroupKeyResponse {

        const groupKeys = msg.encryptedGroupKeys.map((groupKey) => {
            return {
                data: hexToBinary(groupKey.encryptedGroupKeyHex),
                id: groupKey.groupKeyId
            }
        })
        const translated: GroupKeyResponse = {
            recipient: hexToBinary(msg.recipient),
            requestId: msg.requestId,
            groupKeys
        }
        return translated
    }

    static toClientProtocol(msg: GroupKeyResponse): OldGroupKeyResponse {
        const encryptedGroupKeys = msg.groupKeys.map((groupKey: GroupKey) => new OldEncryptedGroupKey(
            groupKey.id,
            binaryToHex(groupKey.data),
        ))
        return new OldGroupKeyResponse({
            requestId: msg.requestId,
            recipient: toEthereumAddress(binaryToHex(msg.recipient, true)),
            encryptedGroupKeys
        })
    }
}
