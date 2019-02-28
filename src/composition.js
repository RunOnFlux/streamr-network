const uuidv4 = require('uuid/v4')
const TrackerServer = require('./protocol/TrackerServer')
const TrackerNode = require('./protocol/TrackerNode')
const NodeToNode = require('./protocol/NodeToNode')
const Tracker = require('./logic/Tracker')
const Node = require('./logic/Node')
const Client = require('./logic/Client')
const NetworkNode = require('./NetworkNode')
const OverlayTopology = require('./logic/OverlayTopology')
const { startEndpoint } = require('./connection/WsEndpoint')
const { MessageID, MessageReference, StreamID } = require('./identifiers')

async function startTracker(host, port, id = uuidv4()) {
    const identity = {
        'streamr-peer-id': id,
        'streamr-peer-type': 'tracker'
    }
    return startEndpoint(host, port, identity).then((endpoint) => {
        return new Tracker(id, new TrackerServer(endpoint))
    }).catch((err) => {
        throw err
    })
}

async function startNode(host, port, id = uuidv4()) {
    const identity = {
        'streamr-peer-id': id,
        'streamr-peer-type': 'node'
    }
    return startEndpoint(host, port, identity).then((endpoint) => {
        return new Node(id, new TrackerNode(endpoint), new NodeToNode(endpoint))
    }).catch((err) => {
        throw err
    })
}

async function startClient(host, port, id = uuidv4(), nodeAddress) {
    const identity = {
        'streamr-peer-id': id,
        'streamr-peer-type': 'client'
    }
    return startEndpoint(host, port, identity).then(async (endpoint) => {
        const client = new Client(id, new NodeToNode(endpoint))
        if (nodeAddress) {
            await client.connectToNode(nodeAddress)
        }
        return client
    }).catch((err) => {
        throw err
    })
}

async function startNetworkNode(host, port, id = uuidv4()) {
    const identity = {
        'streamr-peer-id': id,
        'streamr-peer-type': 'node'
    }
    return startEndpoint(host, port, identity).then((endpoint) => {
        return new NetworkNode(id, new TrackerNode(endpoint), new NodeToNode(endpoint))
    }).catch((err) => {
        throw err
    })
}

module.exports = {
    startTracker,
    startNode,
    startClient,
    startNetworkNode,
    MessageID,
    MessageReference,
    StreamID,
    OverlayTopology
}
