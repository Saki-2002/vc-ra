import * as mediasoup from "mediasoup-client"
//import { useRef } from "react"
import socket from "../logic/socketConnection"

//const socket = io("https://4f4mbq09-5000.brs.devtunnels.ms/")

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
//      FUNCIONES
//======================


//(async) joinRoom
//Entradas: roomId, username, isHost
//Uso: Emite al server "joinRoom" (roomId, username, isHost). Luego
// guarda información y el rtpCapabilities para finalmente crear el Device
// y cargarlo.
// Salida: Promise resolve o reject
const joinRoom = async (roomId, username, isHost) => {
    return new Promise((resolve, reject) => {
        socket.emit("joinRoom", roomId, username, isHost, async (res) => {
            if (!res || res.error)
                return reject(new Error(`Error en socket.emit(joinRoom), ${res?.error}`))
            try {
                //Guardar Información
                currentRoomId = roomId
                currentUsername = username
                currentIsHost = isHost
                const routerRtpCapabilities = res.rtpCapabilities

                //Inicializar peers con lo que envía el server
                peersMap.clear()
                for (const p of (res.peers || [])) {
                    peersMap.set(p.socketId, { username: p.username, isHost: p.isHost })
                }
                if (onPeersUpdate) onPeersUpdate(new Map(peersMap))

                //Crear el Device y Cargarlo
                deviceGlobal = new mediasoup.Device()
                await deviceGlobal.load({ routerRtpCapabilities })
                console.log("Device creado y cargado")

                setupNewProducerListener()

                resolve({ success: true })
            } catch (err) {
                console.error("Error al cargar el device", err)
                reject(err)
            }
        })
    })
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

    socket.on("newProducer", async ({ producerId, socketId, kind }) => {
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
    })

    socket.on("peerJoined", ({ socketId, username, isHost }) => {
        peersMap.set(socketId, { username, isHost })
        if (onPeersUpdate) onPeersUpdate(new Map(peersMap))
    })

    socket.on("peerDisconnected", ({ socketId }) => {
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
            console.log(`Peer ${socketId} eliminado`)

            peersMap.delete(socketId)
            if (onPeersUpdate) {
                onPeersUpdate(new Map(peersMap))
            }

            if (onMediaTracksUpdate) {
                onMediaTracksUpdate(new Map(mediaTracks))
            }
        } catch (err) {
            console.error("Error al manejar desconexión")
        }
    })


    socket.on("producerPaused", ({ socketId, producerId, kind }) => {
        console.log(`Producer pausado: ${kind} de ${socketId}`)

        // Buscar el consumer correspondiente y marcarlo como pausado
        consumers.forEach((consumer) => {
            if (consumer.producerId === producerId) {
                consumer.appData.producerPaused = true
                console.log(`Consumer ${consumer.id} marcado como pausado`)
            }
        })

        saveMediaFromConsumers()
        if (onMediaTracksUpdate) onMediaTracksUpdate(new Map(mediaTracks))
    })

    socket.on("producerResumed", ({ socketId, producerId, kind }) => {
        console.log(`Producer reanudado: ${kind} de ${socketId}`)

        // Buscar el consumer correspondiente y desmarcarlo
        consumers.forEach((consumer) => {
            if (consumer.producerId === producerId) {
                consumer.appData.producerPaused = false
                console.log(`Consumer ${consumer.id} marcado como activo`)
            }
        })

        saveMediaFromConsumers()
        if (onMediaTracksUpdate) onMediaTracksUpdate(new Map(mediaTracks))
    })
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

        //Create RecvTransport
        socket.emit("createWebRtcTransport",
            { roomId: currentRoomId, direction: "recv" },
            async (res) => {
                if (!res || res.error) {
                    recvTransportPromise = null
                    return reject(new Error(`Error en socket.emit(createWebRtcTrnasport), ${res?.error}`))
                }
                try {
                    //Create RecvTransport
                    recvTransport = deviceGlobal.createRecvTransport({
                        ...res,
                        iceServers
                    })

                    recvTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
                        socket.emit("connectTransport", {
                            transportId: recvTransport.id,
                            dtlsParameters
                        },
                            (resp) => {
                                if (!resp || resp.error) return errback(resp?.error);
                                callback()
                            })
                    })

                    console.log("RecvTransport creado")
                    resolve(recvTransport)
                } catch (err) {
                    reject(err)
                } finally {
                    recvTransportPromise = null
                }
            }
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
        //Create SendTransport

        socket.emit("createWebRtcTransport",
            { roomId: currentRoomId, direction: "send" },
            async (res) => {
                if (!res || res.error) {
                    sendTransportPromise = null
                    return reject(new Error(`Error en socket.emit(createWebRtcTrnasport), ${res?.error}`))
                }
                try {
                    //Create SendTransport
                    sendTransport = deviceGlobal.createSendTransport({
                        ...res,
                        iceServers
                    })

                    sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
                        socket.emit("connectTransport", {
                            transportId: sendTransport.id,
                            dtlsParameters
                        },
                            (resp) => {
                                if (!resp || resp.error) return errback(resp?.error);
                                callback()
                            })
                    })

                    sendTransport.on("produce", async ({ kind, rtpParameters }, callback, errback) => {
                        socket.emit("produce", {
                            transportId: sendTransport.id,
                            kind,
                            rtpParameters
                        }, (resp) => {
                            if (!resp || resp.error) return errback(new Error(resp?.error));
                            callback({ id: resp.id })
                        })
                    })
                    console.log("SendTransport creado")
                    resolve(sendTransport)
                } catch (err) {
                    reject(err)
                } finally {
                    sendTransportPromise = null
                }
            }
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

    //mediaTracks = Map (socketId, {videoTrack, audioTrack})
    mediaTracks.clear()
    consumers.forEach(c => {
        const socketId = c.appData?.socketId
        if (!socketId) return;

        const producerPaused = c.appData?.producerPaused === true || c.producerPaused === true

        if (!mediaTracks.has(socketId)) {
            mediaTracks.set(socketId, {
                videoTrack: null,
                audioTrack: null
            })
        }

        const media = mediaTracks.get(socketId)

        if (c.kind === "video") {
            media.videoTrack = producerPaused ? null : c.track
        } else if (c.kind === "audio") {
            media.audioTrack = producerPaused ? null : c.track
        }

    });
}

const createConsumers = async () => {
    try {
        //Crear y conectar Transport
        //Obtener Producers
        //For Crear consumers
        await createRecvTransport()
        await getProducers()
        for (const pId of remoteProducersIds) {
            await consumeTrack(pId)
        }
        saveMediaFromConsumers() //Se obtiene mediaTracks
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

    try {
        //Crear SendTransport
        await createSendTransport()
        //Obtener tracks
        const audioTrack = await getTrack("audio")
        const videoTrack = await getTrack("video")
        //Crear producers
        await produceByKind(audioTrack, "audio")
        await produceByKind(videoTrack, "video")

        console.log("Producers creados")

        return { audioTrack, videoTrack }
    } catch (err) {

        console.error("Error al crear los producers. ", err)
        throw err
    }

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
        socket.emit("isRoomAvailable", roomCode, ({available, error}) => {
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