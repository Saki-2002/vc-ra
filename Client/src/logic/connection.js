import { io } from "socket.io-client"

const SERVER_URL = "http://localhost:5000"
const socket = io(SERVER_URL, { autoConnect: true })

export const connectSocket = () => socket.connect()
export const disconnectSocket = () => socket.disconnect()

export const onConnect = (cb) => socket.on("connect", cb)
export const onDisconnect = (cb) => socket.on("disconnect", cb)

export const joinRoom = (roomId, username, callback) => {
    socket.emit("joinRoom", { roomId, username }, callback)
}

export const createWebRtcTransport = (callback) => {
    socket.emit("createWebRtcTransport", callback)
}

export const connectTransport = (transportId, dtlsParameters, callback) => {
    socket.emit("connectTransport", { transportId, dtlsParameters }, callback)
}

export const produce = (kind, rtpParameters, callback) => {
    console.log('[CONNECTION] Emitiendo produce:', { kind, rtpParameters })
    socket.emit("produce", { kind, rtpParameters }, callback)
}

export const consume = (producerId, rtpCapabilities, callback) => {
    console.log('[CONNECTION] Emitiendo consume:', { producerId, rtpCapabilities })
    socket.emit("consume", producerId, rtpCapabilities, callback)
}

export const pauseProducer = (producerId, callback) => {
    socket.emit("pauseProducer", producerId, callback)
}

export const resumeProducer = (producerId, callback) => {
    socket.emit("resumeProducer", producerId, callback)
}

export const pauseConsumer = (consumerId, callback) => {
    socket.emit("pauseConsumer", consumerId, callback)
}

export const resumeConsumer = (consumerId, callback) => {
    socket.emit("resumeConsumer", consumerId, callback)
}

export const getProducers = (callback) => {
    socket.emit("getProducers", callback)
}

export const onNewProducer = (cb) => socket.on("newProducer", cb)

export default socket