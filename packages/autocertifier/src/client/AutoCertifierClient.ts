import { EventEmitter } from 'eventemitter3'
import { ITransport, ListeningRpcCommunicator } from '@streamr/dht'
import { IAutoCertifierService } from '../proto/packages/autocertifier/protos/AutoCertifier.server'
import { SessionIdRequest, SessionIdResponse } from '../proto/packages/autocertifier/protos/AutoCertifier'
import { ServerCallContext } from '@protobuf-ts/runtime-rpc'
import { filePathToNodeFormat } from '../utlis/filePathToNodeFormat'
import { RestClient } from './RestClient'
import { CertifiedSubdomain } from '../data/CertifiedSubdomain'
import fs from 'fs'
import * as forge from 'node-forge'
import { Logger } from '@streamr/utils'

interface AutoCertifierClientEvents {
    updatedSubdomain: (domain: CertifiedSubdomain) => void
}

const logger = new Logger(module)

export class AutoCertifierClient extends EventEmitter<AutoCertifierClientEvents> implements IAutoCertifierService {

    private readonly SERVICE_ID = 'AutoCertifier'
    private readonly ONE_DAY = 1000 * 60 * 60 * 24
    private readonly rpcCommunicator: ListeningRpcCommunicator
    private updateTimeout?: NodeJS.Timeout
    private readonly restClient: RestClient
    private readonly subdomainPath: string
    private readonly streamrWebSocketPort: number
    private readonly ongoingSessions: Set<string> = new Set()

    constructor(subdomainPath: string, streamrWebSocketPort: number, restApiUrl: string, restApiCaCert: string,
        rpcTransport: ITransport) {
        super()

        this.restClient = new RestClient(restApiUrl, restApiCaCert)
        this.subdomainPath = filePathToNodeFormat(subdomainPath)
        this.streamrWebSocketPort = streamrWebSocketPort

        this.rpcCommunicator = new ListeningRpcCommunicator(this.SERVICE_ID, rpcTransport)
        this.rpcCommunicator.registerRpcMethod(
            SessionIdRequest,
            SessionIdResponse,
            'getSessionId',
            (req: SessionIdRequest, context) => this.getSessionId(req, context)
        )
    }

    public async start(): Promise<void> {
        if (!fs.existsSync(this.subdomainPath)) {
            await this.createCertificate()
        } else {
            const subdomain = JSON.parse(fs.readFileSync(this.subdomainPath, 'utf8')) as CertifiedSubdomain
            const certObj = forge.pki.certificateFromPem(subdomain.certificate.cert)
            const expiryTime = certObj.validity.notAfter.getTime()

            if (Date.now() > expiryTime) {
                await this.updateCertificate()
            } else {
                await this.updateSubdomainIpAndPort()
                this.scheduleCertificateUpdate(expiryTime)
                this.emit('updatedSubdomain', subdomain)
            }
        }
    }

    public async stop(): Promise<void> {
        this.rpcCommunicator.stop()
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout)
            this.updateTimeout = undefined
        }
    }

    private scheduleCertificateUpdate(expiryTime: number): void {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout)
            this.updateTimeout = undefined
        }
        // update certificate 1 day before it expires

        let updateIn = expiryTime - Date.now()
        if (updateIn > this.ONE_DAY) {
            updateIn = updateIn - this.ONE_DAY
        }

        this.updateTimeout = setTimeout(this.updateCertificate, updateIn)
    }

    private createCertificate = async (): Promise<void> => {
        const sessionId = await this.restClient.createSession()
        let certifiedSubdomain: CertifiedSubdomain

        this.ongoingSessions.add(sessionId)

        try {
            certifiedSubdomain = await this.restClient.createNewSubdomainAndCertificate(this.streamrWebSocketPort, sessionId)
        } finally {
            this.ongoingSessions.delete(sessionId)
        }

        fs.writeFileSync(this.subdomainPath, JSON.stringify(certifiedSubdomain))
        const certObj = forge.pki.certificateFromPem(certifiedSubdomain.certificate.cert)

        const expiryTime = certObj.validity.notAfter.getTime()
        this.scheduleCertificateUpdate(expiryTime)

        this.emit('updatedSubdomain', certifiedSubdomain)
    }

    private updateCertificate = async (): Promise<void> => {
        const sessionId = await this.restClient.createSession()
        this.ongoingSessions.add(sessionId)

        const oldSubdomain = JSON.parse(fs.readFileSync(this.subdomainPath, 'utf8')) as CertifiedSubdomain
        const certifiedSubdomain = await this.restClient.updateCertificate(oldSubdomain.subdomain, 
            this.streamrWebSocketPort, oldSubdomain.token, sessionId)

        this.ongoingSessions.delete(sessionId)

        fs.writeFileSync(this.subdomainPath, JSON.stringify(certifiedSubdomain))
        const certObj = forge.pki.certificateFromPem(certifiedSubdomain.certificate.cert)

        const expiryTime = certObj.validity.notAfter.getTime()
        this.scheduleCertificateUpdate(expiryTime)

        this.emit('updatedSubdomain', certifiedSubdomain)
    }

    // This method should be called by Streamr DHT whenever the IP address or port of the node changes

    public updateSubdomainIpAndPort = async (): Promise<void> => {
        if (!fs.existsSync(this.subdomainPath)) {
            logger.warn('updateSubdomainIpAndPort() called while subdomain file does not exist')
            return
        }
        const oldSubdomain = JSON.parse(fs.readFileSync(this.subdomainPath, 'utf8')) as CertifiedSubdomain
        const sessionId = await this.restClient.createSession()
        this.ongoingSessions.add(sessionId)
        await this.restClient.updateSubdomainIpAndPort(oldSubdomain.subdomain, this.streamrWebSocketPort, sessionId, oldSubdomain.token)
        this.ongoingSessions.delete(sessionId)
    }

    // IAutoCertifierService implementation

    public async getSessionId(request: SessionIdRequest, _context: ServerCallContext): Promise<SessionIdResponse> {
        logger.info('getSessionId() called ' + this.ongoingSessions.size + ' ongoing sessions')
        if (this.ongoingSessions.has(request.sessionId)) {
            return { sessionId: request.sessionId }
        } else {
            return { error: 'client has no such ongoing session' }
        }
    }
}
