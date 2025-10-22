import * as mediasoup from "mediasoup"

const mediaCodecs = [
    {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2
    },
    {
        kind: "video",
        mimeType: "video/H264",
        clockRate: 90000,
        parameters:
        {
            "packetization-mode": 1,
            "profile-level-id": "42e01f",
            "level-asymmetry-allowed": 1
        }
    }
]

const workerSettings = {
    rtcMinPort: 2000,
    rtcMaxPort: 2020
}


//Variables Globales
let workerGlobal
let rooms = new Map() // (roomId, { router , peers[] })
let transports = new Map() // (transport.id, transport)
let producers = new Map()
let consumers = new Map()
let peers = new Map() // (socket.id, 
// {socket , 
// transports[], 
// producers[], 
// consumers[], 
// userDetails{
//      username, isHost
//}})

//FUNCIONES


//Entrada: Worker, conexión Socket y RoomId
//Salida: Router
const createRoom = async (roomId, socketId) => {

    try {
        const newRouter = await workerGlobal.createRouter({ mediaCodecs })
        rooms.set(roomId, {
            router: newRouter,
            peers: [socketId]
        })
        console.log("Room creado con exito. Id: ", roomId)
    } catch (err) {
        console.error("Error al crear el Router", err)
    }
}

const findOrCreateRoom = async (roomId, socketId) => {

    if (!rooms.get(roomId)) {
        await createRoom(roomId, socketId)
    } else {
        rooms.get(roomId)?.peers.push(socketId)
    }
}

const getRouter = (roomId) => {
    return rooms.get(roomId)?.router
}

const createWebRtcTransport = async (roomId, socketId) => {

    const router = getRouter(roomId)
    if (!router) throw new Error(`No se encontró router para la sala ${roomId}`);
    const transport = await router.createWebRtcTransport({
        listenIps: [{
            ip: "0.0.0.0",
            announcedIp: "127.0.0.1"
        }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
    })

    transports.set(transport.id, transport)
    const peer = peers.get(socketId)
    peer.transports.push(transport)
    console.log("WebRtcTransport creado. Id: ", transport.id)

    return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
    }
}

const produce = async (socketId, transportId, kind, rtpParameters) => {

    const transport = transports.get(transportId)
    if (!transport) throw new Error(`Transport no encontrado. Id: ${transportId}`);
    const producer = await transport.produce({ kind, rtpParameters })

    //Guardar producer

    producers.set(producer.id, producer)
    //set peers
    const peer = peers.get(socketId)
    peer.producers.push(producer)

    return producer.id
}

const consume = async(socketId, transportId, producerId, rtpCapabilities) => {
    const transport = transports.get(transportId)
    if(!transport) throw new Error(`Transport no encontrado. Id: ${transportId}`);
    const producer = producers.get(producerId)
    if(!producer) throw new Error(`Producer no encontrado. Id: ${producerId}`);

    const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: false
    })

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

const removePeer = async (socketId, roomId) => {

    if (rooms.get(roomId) && roomId) {
        const roomPeers = rooms.get(roomId).peers
        rooms.get(roomId).peers = roomPeers.filter(id => id !== socketId)
    }

    peers.delete(socketId)
}



async function handleVideoConference(io) {

    workerGlobal = await mediasoup.createWorker(workerSettings)


    //Conexión con Cliente
    io.on("connection", (socket) => {
        console.log("Usuario conectado con servidor. Id: ", socket.id)

        //Listeners
        socket.on("disconnect", async () => {
            try {
                await removeProducers(socket.id)
                await removeConsumers(socket.id)
                await removeTransports(socket.id)
                await removePeer(socket.id, socket.roomId)
                console.log("Usuario desconectado. Id: ", socket.id)
            } catch (err) {
                console.error("Error al liberar por desconexión", err)
            }
        })

        socket.on("joinRoom", async (roomId, username, isHost) => {
            //Obtener o crear room
            await findOrCreateRoom(roomId, socket.id)
            socket.roomId = roomId
            createPeer(socket, username, isHost)
            console.log(`Usuario ${socket.id} ingreso a Room ${roomId}`)
        })

        socket.on("createWebRtcTransport", async (callback) => {
            try {
                const transportInfo = await createWebRtcTransport(socket.roomId, socket.id)
                callback(transportInfo)
            } catch (err) {
                console.error("Error al crear el WebRtcTransport", err)
                callback({ error: err.message })
            }
        })

        socket.on("connectTransport", async ({ transportId, dtlsParameters }, callback) => {
            try {
                const transport = transports.get(transportId)
                if (!transport) throw new Error(`Transport no encontrado. Id: ${transportId}`);
                await transport.connect({ dtlsParameters })
                callback({ connected: true })
            } catch (err) {
                console.error("Error al conectar el transport", err)
                callback({ error: err.message })
            }
        })

        socket.on("produce", async ({ transportId, kind, rtpParameters }, callback) => {
            try {
                const producerId = await produce(socket.id, transportId, kind, rtpParameters)
                callback(producerId)
            } catch (err) {
                console.error("Error al producir media", err)
                callback({ error: err.message })
            }
        })

        socket.on("consume", async ({transportId, producerId, rtpCapabilities}, callback) => {
            try {
                const consumerInfo = await consume(socket.id, transportId, producerId, rtpCapabilities)
                callback(consumerInfo)
            } catch(err) {
                console.error("Error al consumir media", err)
                callback({error: err.message})
            }
        })

        socket.on("pauseProducer", async ({producerId}, callback) =>{
            try {
                const producer = producers.get(producerId)
                if(!producer) throw new Error (`Producer no encontrado. Id: ${producerId}`);
                await producer.pause()
                callback({paused: true})
            } catch (err) {
                console.error("Error al pausar producer", err)
                callback({error: err.message})
            }
        })

        socket.on("resumeProducer", async ({producerId}, callback) =>{
            try {
                const producer = producers.get(producerId)
                if(!producer) throw new Error (`Producer no encontrado. Id: ${producerId}`);
                await producer.resume()
                callback({resumed: true})
            } catch (err) {
                console.error("Error al renaudar producer", err)
                callback({error: err.message})
            }
        })





    })

    // Crear un worker


}

export default handleVideoConference