import * as mediasoup from "mediasoup-client"
import socket from "../logic/socketConnection"

//======================
//  VARIABLES GLOBALES
//======================

let deviceGlobal = null
let currentRoomId = null
let currentUsername = null
let currentIsHost = null
let sendTransport = null
let sendTransportPromise = null
let recvTransport = null
let recvTransportPromise = null
let consumers = new Map()
let producers = new Map()
let remoteProducersIds = []
let mediaTracks = new Map()
let onMediaTracksUpdate = null
let peersMap = new Map()
let onPeersUpdate = null

let localMediaStream = null
let producePromise = null

//======================
//  ICE SERVERS (TURN)
//======================

const iceServers = [
    { urls: "stun:stun.relay.metered.ca:80" },
    {
        urls: "turn:global.relay.metered.ca:80",
        username: "4a32a8ce099528d1b2c30eb7",
        credential: "F8HHR7pzKNYsIJU9"
    },
    {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "4a32a8ce099528d1b2c30eb7",
        credential: "F8HHR7pzKNYsIJU9"
    },
    {
        urls: "turn:global.relay.metered.ca:443",
        username: "4a32a8ce099528d1b2c30eb7",
        credential: "F8HHR7pzKNYsIJU9"
    },
    {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "4a32a8ce099528d1b2c30eb7",
        credential: "F8HHR7pzKNYsIJU9"
    }
]

//======================
//  FUNCIONES AUXILIARES (extraídas para reducir anidamiento)
//======================

// ✅ Manejar callbacks del connectTransport
const handleConnectTransportCallback = (callback, errback, resp) => {
    if (!resp || resp.error) return errback(resp?.error)
    callback()
}

// ✅ Manejar callbacks del produce
const handleProduceCallback = (callback, errback, resp) => {
    if (!resp || resp.error) return errback(new Error(resp?.error))
    callback({ id: resp.id })
}

// ✅ Procesar respuesta de createWebRtcTransport para recv
const handleRecvTransportResponse = (res, resolve, reject) => {
    if (!res || res.error) {
        recvTransportPromise = null
        return reject(new Error(`Error en createWebRtcTransport: ${res?.error}`))
    }

    try {
        recvTransport = deviceGlobal.createRecvTransport({
            ...res,
            iceServers
        })

        recvTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            socket.emit("connectTransport", {
                transportId: recvTransport.id,
                dtlsParameters
            }, (resp) => handleConnectTransportCallback(callback, errback, resp))
        })

        console.log("RecvTransport creado")
        resolve(recvTransport)
    } catch (err) {
        reject(err)
    } finally {
        recvTransportPromise = null
    }
}

// ✅ Procesar respuesta de createWebRtcTransport para send
const handleSendTransportResponse = (res, resolve, reject) => {
    if (!res || res.error) {
        sendTransportPromise = null
        return reject(new Error(`Error en createWebRtcTransport: ${res?.error}`))
    }

    try {
        sendTransport = deviceGlobal.createSendTransport({
            ...res,
            iceServers
        })

        sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            socket.emit("connectTransport", {
                transportId: sendTransport.id,
                dtlsParameters
            }, (resp) => handleConnectTransportCallback(callback, errback, resp))
        })

        sendTransport.on("produce", async ({ kind, rtpParameters }, callback, errback) => {
            socket.emit("produce", {
                transportId: sendTransport.id,
                kind,
                rtpParameters
            }, (resp) => handleProduceCallback(callback, errback, resp))
        })

        console.log("SendTransport creado")
        resolve(sendTransport)
    } catch (err) {
        reject(err)
    } finally {
        sendTransportPromise = null
    }
}

// ✅ Manejar nuevos producers
const handleNewProducerEvent = async ({ producerId, socketId, kind }) => {
    console.log(`Nuevo producer detectado: ${kind} de ${socketId}`)

    try {
        await consumeTrack(producerId)
        saveMediaFromConsumers()

        if (onMediaTracksUpdate) {
            onMediaTracksUpdate(new Map(mediaTracks))
        }
    } catch (err) {
        console.error("Error al consumir nuevo producer", err)
    }
}

// ✅ Manejar peer desconectado
const handlePeerDisconnectedEvent = ({ socketId }) => {
    console.log("Peer desconectado")

    try {
        const consumersToRemove = []
        consumers.forEach((c, cId) => {
            if (c.appData?.socketId === socketId) {
                consumersToRemove.push(cId)
            }
        })

        consumersToRemove.forEach(cId => {
            const consumer = consumers.get(cId)
            if (consumer) {
                consumer.close()
                consumers.delete(cId)
                console.log(`Consumer ${cId} eliminado`)
            }
        })

        mediaTracks.delete(socketId)
        peersMap.delete(socketId)

        if (onPeersUpdate) {
            onPeersUpdate(new Map(peersMap))
        }

        if (onMediaTracksUpdate) {
            onMediaTracksUpdate(new Map(mediaTracks))
        }
    } catch (err) {
        console.error("Error al manejar desconexión", err)
    }
}

// ✅ Marcar producer como pausado
const markProducerPaused = (producerId) => {
    consumers.forEach((consumer) => {
        if (consumer.producerId === producerId) {
            consumer.producerPaused = true
            console.log(`Consumer ${consumer.id} marcado como pausado`)
        }
    })
}

// ✅ Marcar producer como activo
const markProducerActive = (producerId) => {
    consumers.forEach((consumer) => {
        if (consumer.producerId === producerId) {
            consumer.producerPaused = false
            console.log(`Consumer ${consumer.id} marcado como activo`)
        }
    })
}

// ✅ Manejar pausa de producer
const handleProducerPausedEvent = ({ socketId, producerId, kind }) => {
    console.log(`Producer pausado: ${kind} de ${socketId}`)
    markProducerPaused(producerId)
    saveMediaFromConsumers()
    if (onMediaTracksUpdate) onMediaTracksUpdate(new Map(mediaTracks))
}

// ✅ Manejar reanudación de producer
const handleProducerResumedEvent = ({ socketId, producerId, kind }) => {
    console.log(`Producer reanudado: ${kind} de ${socketId}`)
    markProducerActive(producerId)
    saveMediaFromConsumers()
    if (onMediaTracksUpdate) onMediaTracksUpdate(new Map(mediaTracks))
}

//======================
//      FUNCIONES PÚBLICAS
//======================

const joinRoom = async (roomId, username, isHost) => {
    return new Promise((resolve, reject) => {
        socket.emit("joinRoom", roomId, username, isHost, async (res) => {
            if (!res || res.error)
                return reject(new Error(`Error en socket.emit(joinRoom), ${res?.error}`))
            try {
                currentRoomId = roomId
                currentUsername = username
                currentIsHost = isHost
                const routerRtpCapabilities = res.rtpCapabilities

                peersMap.clear()
                for (const p of (res.peers || [])) {
                    peersMap.set(p.socketId, { username: p.username, isHost: p.isHost })
                }
                if (onPeersUpdate) onPeersUpdate(new Map(peersMap))

                deviceGlobal = new mediasoup.Device()
                await deviceGlobal.load({ routerRtpCapabilities })
                console.log("Device creado y cargado")

                setupNewProducerListener()

                resolve({ success: true, peers: res.peers })
            } catch (err) {
                console.error("Error al cargar el device", err)
                reject(err)
            }
        })
    })
}

const getLocalMediaStream = async () => {
    if (localMediaStream && localMediaStream.active) return localMediaStream

    try {
        localMediaStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        })
        return localMediaStream
    } catch (err) {
        console.warn("Fallo getUserMedia ideal, reintentando simple...", err)
    }

    localMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    })
    return localMediaStream
}

const setPeersUpdateCallback = (callback) => {
    onPeersUpdate = callback
    if (callback) callback(new Map(peersMap))
}

const getPeers = () => new Map(peersMap)
const getSelfSocketId = () => socket.id

const setMediaTracksUpdateCallback = (callback) => {
    onMediaTracksUpdate = callback
}

const setupNewProducerListener = () => {
    socket.off("newProducer")
    socket.off("peerDisconnected")
    socket.off("peerJoined")
    socket.off("producerPaused")
    socket.off("producerResumed")

    socket.on("newProducer", handleNewProducerEvent)
    socket.on("peerJoined", ({ socketId, username, isHost }) => {
        peersMap.set(socketId, { username, isHost })
        if (onPeersUpdate) onPeersUpdate(new Map(peersMap))
    })
    socket.on("peerDisconnected", handlePeerDisconnectedEvent)
    socket.on("producerPaused", handleProducerPausedEvent)
    socket.on("producerResumed", handleProducerResumedEvent)
}

const createRecvTransport = async () => {
    if (recvTransport) {
        console.log("RecvTransport ya existe. Reutilizando")
        return recvTransport
    }

    if (recvTransportPromise) {
        console.log("Esperando a que se cree el RecvTransport Existente")
        return recvTransportPromise
    }

    recvTransportPromise = new Promise((resolve, reject) => {
        socket.emit("createWebRtcTransport",
            { roomId: currentRoomId, direction: "recv" },
            (res) => handleRecvTransportResponse(res, resolve, reject)
        )
    })
    return recvTransportPromise
}

const createSendTransport = async () => {
    if (sendTransport) {
        console.log("SendTransport ya existe. Reutilizando")
        return sendTransport
    }

    if (sendTransportPromise) {
        console.log("Esperando a que se cree el SendTransport Existente")
        return sendTransportPromise
    }

    sendTransportPromise = new Promise((resolve, reject) => {
        socket.emit("createWebRtcTransport",
            { roomId: currentRoomId, direction: "send" },
            (res) => handleSendTransportResponse(res, resolve, reject)
        )
    })

    return sendTransportPromise
}

const getProducers = async () => {
    return new Promise((resolve, reject) => {
        socket.emit("getProducers",
            currentRoomId,
            (res) => {
                if (!res || res.error)
                    return reject(new Error(`Error en socket.emit(getProducers), ${res?.error}`))
                try {
                    remoteProducersIds = res
                    resolve(remoteProducersIds)
                } catch (err) {
                    reject(err)
                }
            }
        )
    })
}

const consumeTrack = async (pId) => {
    return new Promise((resolve, reject) => {
        console.log("CONSUMETRACK IN")
        socket.emit("consume", {
            roomId: currentRoomId,
            rtpCapabilities: deviceGlobal.rtpCapabilities,
            producerId: pId,
            transportId: recvTransport.id
        }, async (res) => {
            console.log("IN RES")
            if (!res || res.error)
                return reject(new Error(`Error en socket.emit(consume), ${res?.error}`))
            try {
                console.log("Respuesta: ", res)

                const { consumerInfo, socketId } = res

                const consumer = await recvTransport.consume({
                    id: consumerInfo.id,
                    producerId: consumerInfo.producerId,
                    kind: consumerInfo.kind,
                    rtpParameters: consumerInfo.rtpParameters,
                    appData: { socketId: socketId }
                })

                consumer.producerPaused = false
                if (consumer.paused) {
                    await consumer.resume().catch(() => { })
                }

                socket.emit("resumeConsumer", { consumerId: consumer.id }, () => { })

                console.log("After await recvTransportConsume")
                consumers.set(consumer.id, consumer)
                console.log(`Consumer de tipo ${consumer.kind} creado para producer ${pId}`)
                resolve(consumer)
            } catch (err) {
                reject(err)
            }
        })
    })
}

const saveMediaFromConsumers = () => {
    mediaTracks.clear()
    consumers.forEach(c => {
        const socketId = c.appData?.socketId
        if (!socketId) return;

        const producerPaused = c.producerPaused === true

        if (!mediaTracks.has(socketId)) {
            mediaTracks.set(socketId, {
                videoTrack: null,
                audioTrack: null
            })
        }

        const media = mediaTracks.get(socketId)

        if (c.track && c.track.readyState === "live") {
            c.track.enabled = true

            if (c.kind === "video") {
                media.videoTrack = producerPaused ? null : c.track
            } else if (c.kind === "audio") {
                media.audioTrack = producerPaused ? null : c.track
            }
        } else {

            if (c.kind === "video") {
                media.videoTrack = null
            } else if (c.kind === "audio") {
                media.audioTrack = null
            }
        }


    });
}

const createConsumers = async () => {
    try {
        await createRecvTransport()
        await getProducers()
        for (const pId of remoteProducersIds) {
            await consumeTrack(pId)
        }
        saveMediaFromConsumers()
        if (onMediaTracksUpdate) {
            onMediaTracksUpdate(new Map(mediaTracks))
        }
    } catch (err) {
        throw err
    }
}

const getMediaTracks = () => {
    return mediaTracks
}

const produceByKind = async (track, kind) => {
    try {
        if (!track) throw new Error(`No existe el track de tipo ${kind}`);

        const existing = producers.get(kind)
        if (existing && !existing.closed) {
            await existing.replaceTrack({ track })
            console.log(`Producer ${kind} reutilizado con replaceTrack`)
            return existing
        }

        const producer = await sendTransport.produce({ track })
        producers.set(kind, producer)
        console.log(`Producer de tipo ${kind} creado`)

        return producer
    } catch (err) {
        console.error(`Error al producir media de tipo ${kind}. `, err)
        throw err
    }
}

const produce = async () => {
    if (producePromise) return producePromise

    producePromise = (async () => {
        try {
            await createSendTransport()
            const localStream = await getLocalMediaStream()
            const audioTrack = localStream.getAudioTracks()[0] || null
            const videoTrack = localStream.getVideoTracks()[0] || null

            await produceByKind(audioTrack, "audio")
            await produceByKind(videoTrack, "video")

            console.log("Producers creados")

            return { audioTrack, videoTrack }
        } catch (err) {
            console.error("Error al crear los producers. ", err)
            throw err
        } finally {
            producePromise = null
        }
    })()

    return producePromise
}

const getTrack = async (kind) => {
    try {
        const option = kind === "audio"
            ? { audio: true }
            : { video: { width: 1280, height: 720 } }

        const stream = await navigator.mediaDevices.getUserMedia(option)
        const track = kind === "audio"
            ? stream.getAudioTracks()[0]
            : stream.getVideoTracks()[0]

        if (!track) throw new Error(`No se pudo obtener el track de tipo ${kind}`)

        return track
    } catch (err) {
        console.error(`Error al obtener el track de tipo ${kind}.`, err)
        throw err
    }
}

const toggleAudio = async () => {
    const producer = producers.get("audio")
    if (!producer) {
        console.warn("No hay producer de audio")
        return { success: false, state: false }
    }

    return new Promise((resolve, reject) => {
        if (producer.paused) {
            socket.emit("resumeProducer",
                { producerId: producer.id },
                (res) => {
                    if (!res || res.error) {
                        console.error("Error al reanudar audio")
                        return reject(res?.error)
                    }
                    producer.resume()
                    console.log("Audio reanudado")
                    resolve({ success: true, state: true })
                })
        } else {
            socket.emit("pauseProducer",
                { producerId: producer.id },
                (res) => {
                    if (!res || res.error) {
                        console.error("Error al pausar audio")
                        return reject(res.error)
                    }
                    producer.pause()
                    console.log("Audio pausado")
                    resolve({ success: true, state: false })
                }
            )
        }
    })
}

const toggleVideo = async () => {
    const producer = producers.get("video")
    if (!producer) {
        console.warn("No hay producer de video")
        return { success: false, state: false }
    }

    return new Promise((resolve, reject) => {
        if (producer.paused) {
            socket.emit("resumeProducer",
                { producerId: producer.id },
                (res) => {
                    if (!res || res.error) {
                        console.error("Error al reanudar video")
                        return reject(res?.error)
                    }
                    producer.resume()
                    console.log("Video reanudado")
                    resolve({ success: true, state: true })
                })
        } else {
            socket.emit("pauseProducer",
                { producerId: producer.id },
                (res) => {
                    if (!res || res.error) {
                        console.error("Error al pausar video")
                        return reject(res.error)
                    }
                    producer.pause()
                    console.log("Video pausado")
                    resolve({ success: true, state: false })
                }
            )
        }
    })
}

const isRoomAvailable = async (roomCode) => {
    return await new Promise((resolve) => {
        socket.emit("isRoomAvailable", roomCode, ({ available, error }) => {
            if (error) return resolve(false);
            resolve(available)
        })
    })
}

export {
    joinRoom,
    createConsumers,
    toggleAudio,
    toggleVideo,
    getMediaTracks,
    produce,
    setMediaTracksUpdateCallback,
    setPeersUpdateCallback,
    getPeers,
    getSelfSocketId,
    isRoomAvailable
}