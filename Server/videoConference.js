//======================
//       IMPORTS
//======================
import * as mediasoup from "mediasoup"
import { log, logErr, logEnd, logObj, logFunc, logList, logInConsole, indent, unindent, logMap } from "./logging.js"

logInConsole(false)

//======================
// CONSTANTES NECESARIAS
//======================

//mediaCodecs: Define parametros de audio y video que usará el Router
const mediaCodecs = [
    {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2
    },
    {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {
            "x-google-start-bitrate": 1000
        }
    },
    {
        kind: "video",
        mimeType: "video/H264",
        clockRate: 90000,
        parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f",
            "level-asymmetry-allowed": 1
        }
    }
]

//workerSettings: Define rtcMinPort y rtcMaxPort para crear el worker
const workerSettings = {
    rtcMinPort: 40000,
    rtcMaxPort: 40100
}

//======================
//  VARIABLES GLOBALES
//======================

let workerGlobal
let rooms = new Map()       // (roomId, { router , peersId[] })
let transports = new Map()  // (transport.id, transport)
let producers = new Map()   // (producer.id, producers)
let consumers = new Map()   // (consumer.id, consumers)
let peers = new Map()       // (socket.id, {socket , 
//              transports[], 
//              producers[], 
//              consumers[], 
//              userDetails{
//                  username, isHost
//              }})


//======================
//      FUNCIONES
//======================


const findProducerOwner = (producerId) => {
    for (const [socketId, peer] of peers.entries()) {
        const hasProducer = peer.producers.some(p => p.id === producerId)
        if (hasProducer) {
            return socketId
        }
    }
    return null
}

//(async) createRoom
//Entrada: RoomId, socketId
//Uso: Crea un Room
//Salida: Router
const createRoom = async (roomId, socketId) => {

    logFunc("createRoom")

    try {
        log("Crear new Router")
        const newRouter = await workerGlobal.createRouter({ mediaCodecs })
        log("newRouter creado")
        rooms.set(roomId, {
            router: newRouter,
            peers: [socketId]
        })
        log("rooms.set")
        logMap(roomId, rooms.get(roomId))
        console.log("Room creado con exito. Id: ", roomId)
        logEnd("Room creado con exito")
        return newRouter
    } catch (err) {
        logErr("Error al crear el Router")
        console.error("Error al crear el Router", err)
    }
}

//(async) findOrCreateRoom
//Entradas: RoomId, SocketId
//Uso: Existe una Room con RoomId ? Return Room : createRoom
//Salida: Router or Router(createRoom)
const findOrCreateRoom = async (roomId, socketId) => {

    logFunc("findOrCreateRoom")
    if (!rooms.get(roomId)) {
        const router = await createRoom(roomId, socketId)
        return router
    } else {
        rooms.get(roomId)?.peers.push(socketId)
        return rooms.get(roomId)?.router
    }
}

//(async) createWebRtcTransport
//Entradas: RoomId, SocketId
//Uso: Crea un WebRtcTransport
//Salida: transport.id, transport.iceParameters, transport.iceCandidates,
// transport.dtlsParameters
const createWebRtcTransport = async (roomId, socketId, direction) => {

    logFunc("createWebRtcTransport")
    log("get Router")
    const router = rooms.get(roomId)?.router
    logObj(router)
    if (!router) throw new Error(`No se encontró router para la sala ${roomId}`);
    log("Crear Transport")
    const transport = await router.createWebRtcTransport({
        listenIps: [{
            ip: "0.0.0.0",
            announcedIp: process.env.PUBLIC_IP || "201.188.183.15"
        }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
    })
    log("Transport creado")
    transports.set(transport.id, { transport, direction })
    logMap(transport.id, transports.get(transport.id))
    const peer = peers.get(socketId)
    peer.transports.push(transport)
    logEnd(`WebRtcTransport creado. Id: ${transport.id}. Dir: ${direction}`)
    console.log(`WebRtcTransport creado. Id: ${transport.id}. Dir: ${direction}`)

    return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
    }
}

//(async) produce
//Entradas: SocketId, TransportId, kind, rtpParameters
//Uso: Crea un producer asociado a kind y a un transport.
// Requiere rtpParameters
//Salida: Producer.id 
const produce = async (socketId, transportId, kind, rtpParameters) => {

    const transport = transports.get(transportId).transport
    if (!transport) throw new Error(`Transport no encontrado. Id: ${transportId}`);
    const producer = await transport.produce({ kind, rtpParameters })

    //Guardar producer

    producers.set(producer.id, producer)
    //set peers
    const peer = peers.get(socketId)
    peer.producers.push(producer)

    return producer.id
}

//(async) consume
//Entradas: SocketId, TransportId, ProducerId, rtpCapabilities
//Uso: Crea un consumer asociado a un producer y a un transport.
// Requiere de rtpCapabilities
//Salida: consumer.id, consumer.producerId, consumer.kind, 
// consumer.rtpParameters
const consume = async (socketId, transportId, producerId, rtpCapabilities) => {
    const transport = transports.get(transportId).transport
    if (!transport) throw new Error(`Transport no encontrado. Id: ${transportId}`);
    const producer = producers.get(producerId)
    if (!producer) throw new Error(`Producer no encontrado. Id: ${producerId}`);

    const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: false
    })

    consumer.socketId = socketId
    consumers.set(consumer.id, consumer)

    const peer = peers.get(socketId)
    peer.consumers.push(consumer)

    return ({
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters
    })
}

// createPeer
//Entradas: Socket, Username, isHost
//Uso: Crea e inicializa el objeto peer con las propiedades indicadas
//Salida: Ninguna (Modifica variables globales)
const createPeer = (socket, username, isHost) => {
    peers.set(socket.id, {
        socket,
        transports: [],
        producers: [],
        consumers: [],
        userDetails: {
            username: username,
            isHost: isHost
        }
    })
}

//(async) removeProducers
//Entradas: SocketId
//Uso: Quita y cierra los producers del map global y del peer
//Salida: Ninguna (Modifica variables globales)
const removeProducers = async (socketId) => {
    const peer = peers.get(socketId)
    if (!peer) return;

    for (const p of peer.producers) {
        try {
            await p.close()
        } catch (err) {
            console.error("Error cerrando producer", err)
        }
        producers.delete(p.id)
    }
}

//(async) removeConsumers
//Entradas: SocketId
//Uso: Quita y cierra los consumers del map global y del peer
//Salida: Ninguna (Modifica variables globales)
const removeConsumers = async (socketId) => {
    const peer = peers.get(socketId)
    if (!peer) return;

    for (const c of peer.consumers) {
        try {
            await c.close()
        } catch (err) {
            console.error("Error cerrando consumer", err)
        }
        consumers.delete(c.id)
    }
}

//(async) removeTransports
//Entradas: SocketId
//Uso: Quita y cierra los transports del map global y del peer
//Salida: Ninguna (Modifica variables globales)
const removeTransports = async (socketId) => {
    const peer = peers.get(socketId)
    if (!peer) return;

    for (const t of peer.transports) {
        try {
            await t.close()
        } catch (err) {
            console.error("Error cerrando transport", err)
        }
        transports.delete(t.id)
    }
}

//(async) removeProducers
//Entradas: SocketId, RoomId
//Uso: Borra al peer con id SocketId del map global y de la sala
//Salida: Ninguna (Modifica variables globales)
const removePeer = async (socketId, roomId) => {

    if (rooms.get(roomId) && roomId) {
        const roomPeers = rooms.get(roomId).peers
        rooms.get(roomId).peers = roomPeers.filter(id => id !== socketId)
    }

    peers.delete(socketId)
}


//======================
//  FUNCION PRINCIPAL
//======================


async function handleVideoConference(io) {

    /* Flujo:
        -> Crear Worker
        -> Conectar con cliente [io.on("connection")]
            -> Listeners
    */

    //Se crea el worker
    workerGlobal = await mediasoup.createWorker(workerSettings)

    //Conexión con Cliente
    io.on("connection", (socket) => {
        console.log("Usuario conectado con servidor (VideoConferencia). Id: ", socket.id)

        //Listeners

        //socket.on "disconnect"
        //Recibe: Nada
        //Función: Limpieza de producers, consumers, transports y peers
        //Envía: Nada
        socket.on("disconnect", async () => {
            try {
                const roomId = socket.roomId

                if (roomId) {
                    socket.to(roomId).emit("peerDisconnected", {
                        socketId: socket.id
                    })
                    "Notificar desconexión de peer"
                }


                await removeProducers(socket.id)
                await removeConsumers(socket.id)
                await removeTransports(socket.id)
                await removePeer(socket.id, socket.roomId)
                console.log("Usuario desconectado. Id: ", socket.id)
            } catch (err) {
                console.error("Error al liberar por desconexión", err)
            }
        })

        socket.on("isRoomAvailable", (roomCode, callback) => {
            try {
                const available = !rooms.has(roomCode)
                callback({available})
            } catch(err) {
                callback({error: err.message})
            }
        })



        //socket.on "joinRoom"
        //Recibe: roomId, username, isHost
        //Función: Crea o busca una room -> Crea el peer ->
        // Ingresa al usuario al room
        //Envía: router.rtpCapabilities
        socket.on("joinRoom", async (roomId, username, isHost, callback) => {
            //Obtener o crear room
            const router = await findOrCreateRoom(roomId, socket.id)
            socket.roomId = roomId
            socket.join(roomId)
            createPeer(socket, username, isHost)
            console.log(`Usuario ${socket.id} ingreso a Room ${roomId}`)

            //Emitir lista de peers remotos actualizada

            const room = rooms.get(roomId)
            const peersInfo = (room?.peers || [])
                .filter(id => id !== socket.id)
                .map(id => {
                    const p = peers.get(id)
                    return {
                        socketId: id,
                        username: p?.userDetails?.username,
                        isHost: p?.userDetails?.isHost
                    }
                })

            socket.to(roomId).emit("peerJoined", {
                socketId: socket.id,
                username,
                isHost
            })

            callback({
                rtpCapabilities: router.rtpCapabilities,
                peers: peersInfo
            })
        })

        //socket.on "createWebRtcTransport"
        //Recibe: roomId, direction
        //Función: Crear Transport
        //Envía: transportInfo 
        // { id, iceParameters, iceCandidates, dtlsParameters}
        socket.on("createWebRtcTransport", async ({ roomId, direction }, callback) => {
            try {
                const transportInfo = await createWebRtcTransport(roomId, socket.id, direction)
                callback(transportInfo)
            } catch (err) {
                console.error("Error al crear el WebRtcTransport", err)
                callback({ error: err.message })
            }
        })

        //socket.on "connectTransport"
        //Recibe: transportId, dtlsParameters
        //Función: Obtiene transport por id ->
        // conecta transport usando dtlsParameters
        //Envía: Connected: true
        socket.on("connectTransport", async ({ transportId, dtlsParameters }, callback) => {
            try {
                const transport = transports.get(transportId).transport
                if (!transport) throw new Error(`Transport no encontrado. Id: ${transportId}`);
                await transport.connect({ dtlsParameters })
                callback({ connected: true })
            } catch (err) {
                console.error("Error al conectar el transport", err)
                callback({ error: err.message })
            }
        })

        //socket.on "produce"
        //Recibe: transportId, kind, rtpParameters
        //Función: Crear producer de tipo kind. Usa rtpParameters
        //Envía: ProducerId
        socket.on("produce", async ({ transportId, kind, rtpParameters }, callback) => {
            try {
                const producerId = await produce(socket.id, transportId, kind, rtpParameters)
                const roomId = socket.roomId

                if (roomId) {
                    socket.to(roomId).emit("newProducer", {
                        producerId,
                        socketId: socket.id,
                        kind
                    })
                    console.log("Notificar de nuevo producer a la sala")
                }
                callback({ id: producerId })
            } catch (err) {
                console.error("Error al producir media", err)
                callback({ error: err.message })
            }
        })

        //socket.on "consume"
        //Recibe: roomId, transportId, producerId, rtpCapabilities
        //Función: Crear consumer asociado a producerId. Usa rtpCapabilities
        //Envía: consumerInfo 
        // {id, producerId, kind, rtpParameters}
        socket.on("consume", async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
            try {
                const consumerInfo = await consume(socket.id, transportId, producerId, rtpCapabilities)
                //socketId debería ser del producer
                const producerSocketId = findProducerOwner(producerId)
                callback({ consumerInfo, socketId: producerSocketId })
            } catch (err) {
                console.error("Error al consumir media", err)
                callback({ error: err.message })
            }
        })

        //socket.on "pauseProducer"
        //Recibe: ProducerId
        //Función: Busca y pausa el producer
        //Envía: paused: true
        socket.on("pauseProducer", async ({ producerId }, callback) => {
            try {
                const producer = producers.get(producerId)
                if (!producer) throw new Error(`Producer no encontrado. Id: ${producerId}`);
                await producer.pause()

                const roomId = socket.roomId
                if (roomId) {
                    socket.to(roomId).emit("producerPaused", {
                        socketId: socket.id,
                        producerId: producerId,
                        kind: producer.kind
                    })
                    console.log(`Producer ${producerId} (${producer.kind}) pausado - notificar a sala`)
                }

                callback({ paused: true })
            } catch (err) {
                console.error("Error al pausar producer", err)
                callback({ error: err.message })
            }
        })

        //socket.on "resumeProducer"
        //Recibe: ProducerId
        //Función: Busca y resume el producer
        //Envía: resumed: true
        socket.on("resumeProducer", async ({ producerId }, callback) => {
            try {
                const producer = producers.get(producerId)
                if (!producer) throw new Error(`Producer no encontrado. Id: ${producerId}`);
                await producer.resume()

                const roomId = socket.roomId
                if (roomId) {
                    socket.to(roomId).emit("producerResumed", {
                        socketId: socket.id,
                        producerId: producerId,
                        kind: producer.kind
                    })
                    console.log(`Producer ${producerId} (${producer.kind}) reanudado - notificar a sala`)
                }


                callback({ resumed: true })
            } catch (err) {
                console.error("Error al reanudar producer", err)
                callback({ error: err.message })
            }
        })

        //socket.on "getProducers"
        //Recibe: RoomId
        //Función: Obtiene todos los producers de una room exceptuando
        // los relacionados con el peer que hace la llamada
        //Envía: Array de ProducersId
        socket.on("getProducers", (roomId, callback) => {
            try {
                const room = rooms.get(roomId)
                if (!room) throw new Error(`Sala no encontrada: ${roomId}`);

                const producersIds = []
                for (const peerId of room.peers) {
                    if (peerId === socket.id) continue
                    const peer = peers.get(peerId)
                    if (peer) {
                        peer.producers.forEach(p => {
                            producersIds.push(p.id)
                        });
                    }
                }
                callback(producersIds)
            } catch (err) {
                console.error("Error obteniendo producers.", err)
                callback({ error: err.message })
            }
        })
    })
}

export default handleVideoConference