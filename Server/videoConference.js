import mediasoup from "mediasoup"

let worker //Se crea uno solo
let rooms = {}
//rooms: [room1, room2, room3 ...]
//room1: {Router, peers[user1, user2 ...]}
let peers = {}
// peers: [user1, user2, user3]
//user1: socket, roomId, transports[], consumers[], producers[],
//peerDetails {username, isHost}
let transports = [] // Listado de transportes
let producers = [] //Listado de producers
let consumers = [] //Listado de consumers

//====================
// CONSTANTES GLOBALES
//====================

//MEDIACODECS
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
        clockRate: 90000
    }
]

//WEBRTCTRANSPORTS_OPTIONS
const webRtcTransport_options = {
    listenIps: [
        {
            ip: "0.0.0.0",
            announcedIp: "127.0.0.1"
        }
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true
}

//====================
// FUNCIONES GLOBALES
//====================


// CREAR WORKER
// Entrada: None
// Funcionamiento: Función async que crea un Worker
// que corresponde a uno por CPU
// Salida: Worker
const createWorker = async () => {
    //Crea un Worker
    worker = await mediasoup.createWorker({
        //Nivel de logs: Adventencias
        logLevel: "warn",
        //Puertos UDP que se utilizarán (200 puertos)
        rtcMinPort: 2000,
        rtcMaxPort: 2199
    })
    console.log("ID WORKER: ", worker.pid)
    //Se define un listener cuando ha muerto el worker
    worker.on("died", error => {
        console.error("Worker de mediasoup a muerto", error)
        //Se sale de la app
        setTimeout(() => process.exit(1), 2000)
    })
    return worker
}

// CREAR WEB RTC TRANSPORT
// Entrada: Router
// Funcionamiento: Función que crea un Transport para el servidor y
// asociarlo con un producer o consumer
// Salida: Transport
const createWebRtcTransport = async (router) => {
    try {

        const transport = await router.createWebRtcTransport(webRtcTransport_options)
        console.log("Transport creado: ", transport.id)

        //Listeners

        //Cuando se cierra el transport
        transport.on("close", () => {
            console.log("Transport closed")
        })

        //Cuando se cierra el dtls (Permite el envio)
        //Si closed, significa que no se permite más el envío,
        //entonces no tiene sentido el transport y mejor se cierra
        transport.on("dtlsstatechange", dtlsState => {
            if (dtlsState === "closed") {
                transport.close()
            }
        })
        return transport
    } catch (error) {
        console.log("Ha ocurrido un error al crear el WebRtcTransport", error)
    }
}

//QUITAR ITEMS
//Entrada: Lista (Items), socketId, tipo de lista
//Funcionamiento: Permite quitar los elementos que contengan el
//mismo socketId de una lista de transports, producers, o consumers
//Salida: Lista filtrada. (!!!) Es necesario reasignar al llamar la
//función. 
const removeItems = (items, socketId, type) => {
    items.forEach(item => {
        if (item.socketId === socketId) {
            item[type].close()
        }
    })
    items = items.filter(item => item.socketId !== socketId)
    return items
}

//CREAR ROOM
//Entrada: RoomId y SocketId
//Funcionamiento: Crea una Room y la añade a el array de las Room
//Salida: Router (Para poder utilizarlo)
const createRoom = async (roomId, socketId) => {
    let peers = []
    let router
    if (rooms[roomId]) {
        peers = rooms[roomId].peers || []
        router = rooms[roomId].router
        // Evitar duplicados
        if (!peers.includes(socketId)) {
            peers = [...peers, socketId]
        }
    } else {
        router = await worker.createRouter({ mediaCodecs })
        peers = [socketId]
    }
    console.log("Router ID:", router.id)
    rooms[roomId] = {
        router: router,
        peers: peers
    }
    return router
}


//AÑADIR TRANSPORT
//Entrada: Socket, Transport, roomId
//Funcionamiento: Añadir el transport creado a la lista de Transports
//Salida: Ninguna, se añade directo en el Array original
const addTransport = (socket, transport, roomId, direction) => {
    transports = [
        ...transports,
        { socketId: socket.id, transport, roomId, direction }
    ]

    peers[socket.id] = {
        ...peers[socket.id],
        transports: [
            ...peers[socket.id].transports,
            transport.id
        ]
    }
}

const addProducer = (socket, producer, roomId) => {
    // Eliminar producers previos del mismo tipo para este usuario
    const kind = producer.kind;
    producers.forEach(p => {
        if (p.socketId === socket.id && p.producer.kind === kind) {
            try { p.producer.close(); } catch {}
        }
    });
    producers = producers.filter(p => !(p.socketId === socket.id && p.producer.kind === kind));
    // Añadir el nuevo producer
    producers.push({ socketId: socket.id, producer, roomId, kind: producer.kind });
    // Actualizar referencia en peers
    if (peers[socket.id]) {
        // Mantener solo los ids de los producers válidos (máximo uno por tipo)
        const prev = peers[socket.id].producers || [];
        const filtered = prev.filter(pid => {
            const found = producers.find(p => p.producer.id === pid);
            return found && found.socketId === socket.id;
        });
        peers[socket.id] = {
            ...peers[socket.id],
            producers: [...filtered, producer.id]
        };
    }
}

const getTransport = (socketId) => {
    // Buscar transport de envío (direction: 'send')
    const producerTransport = transports.find(t => t.socketId === socketId && t.direction === 'send')
    return producerTransport ? producerTransport.transport : null
};

async function handleVideoConference(io) {

    worker = await createWorker()

    io.on("connection", socket => {
        // Editor colaborativo: retransmitir code-update a la sala
        socket.on("code-update", ({ roomId, code }) => {
            // Reenviar a todos los sockets de la sala excepto el emisor
            socket.to(roomId).emit("code-update", { roomId, code })
        })
        // Actualizar estado de video/audio del peer
        socket.on('peer-state-update', ({ videoEnabled, audioEnabled }) => {
            if (peers[socket.id]) {
                peers[socket.id].videoEnabled = videoEnabled
                peers[socket.id].audioEnabled = audioEnabled
                const roomId = peers[socket.id].roomId
                if (rooms[roomId]) {
                    const peerList = rooms[roomId].peers.map(pid => {
                        const p = peers[pid]
                        return {
                            userId: pid,
                            username: p?.peerDetails?.name || '',
                            videoEnabled: p?.videoEnabled ?? true,
                            audioEnabled: p?.audioEnabled ?? true
                        }
                    })
                    for (const pid of rooms[roomId].peers) {
                        if (peers[pid]?.socket) {
                            peers[pid].socket.emit('peersUpdate', peerList)
                        }
                    }
                }
            }
        })

        socket.on("disconnect", () => {
            console.log("Usuario desconectado")

            //Se eliminan los consumers, producers y transports
            consumers = removeItems(consumers, socket.id, "consumer")
            // Cerrar y eliminar todos los producers del usuario
            producers.forEach(p => {
                if (p.socketId === socket.id) {
                    try { p.producer.close() } catch {}
                }
            })
            producers = producers.filter(p => p.socketId !== socket.id)
            transports = removeItems(transports, socket.id, "transport")

            //Eliminación del usuario de la lista y sala
            if (peers[socket.id]) {
                //Obtiene la sala del usuario
                const { roomId } = peers[socket.id]
                //Borra el usuario de la lista
                delete peers[socket.id]

                //Borra al usuario de la sala
                if (rooms[roomId]) {
                    rooms[roomId] = {
                        router: rooms[roomId].router,
                        peers: rooms[roomId].peers.filter(socketId => socketId !== socket.id)
                    }
                    // Emitir actualización de peers
                    const peerList = rooms[roomId].peers.map(pid => {
                        const p = peers[pid]
                        return {
                            userId: pid,
                            username: p?.peerDetails?.name || '',
                            videoEnabled: p?.videoEnabled ?? true,
                            audioEnabled: p?.audioEnabled ?? true
                        }
                    })
                    console.log(`[SERVER] Peers de Room ${roomId} tras disconnect:`, peerList.map(p => ({ userId: p.userId, username: p.username })))
                    // Emitir a todos los sockets de la sala
                    for (const pid of rooms[roomId].peers) {
                        if (peers[pid]?.socket) {
                            peers[pid].socket.emit('peersUpdate', peerList)
                        }
                    }
                }
            }
        })

        socket.on("joinRoom", async (data, callback) => {
            // data siempre debe ser un objeto: { roomId, username }
            let roomId = ""
            let username = ""
            if (typeof data === "object" && data !== null) {
                roomId = data.roomId
                username = data.username || ""
            } else {
                // fallback por si algún cliente envía string
                roomId = data
                username = ""
            }
            console.log("[SERVER] Usuario conectado", socket.id, "username:", username)
            socket.roomId = roomId
            socket.join(roomId)

            //Se crea la Room o la busca si ya existe
            // Solo agregar el peer si no existe en la sala
            let router
            if (rooms[roomId]) {
                if (!rooms[roomId].peers.includes(socket.id)) {
                    rooms[roomId].peers.push(socket.id)
                }
                router = rooms[roomId].router
            } else {
                router = await worker.createRouter({ mediaCodecs })
                rooms[roomId] = {
                    router: router,
                    peers: [socket.id]
                }
            }

            peers[socket.id] = {
                socket,
                roomId,
                transports: [],
                consumers: [],
                producers: [],
                peerDetails: {
                    name: username,
                    isAdmin: false,
                }
            }
            callback({ rtpCapabilities: router.rtpCapabilities })
            // Mostrar solo ids y nombres de los peers
            if (rooms[roomId]) {
                const peerList = rooms[roomId].peers.map(pid => {
                    const p = peers[pid]
                    return {
                        userId: pid,
                        username: p?.peerDetails?.name || '',
                        videoEnabled: p?.videoEnabled ?? true,
                        audioEnabled: p?.audioEnabled ?? true
                    }
                })
                console.log(`[SERVER] Peers de Room ${roomId}:`, peerList.map(p => ({ userId: p.userId, username: p.username })))
                for (const pid of rooms[roomId].peers) {
                    if (peers[pid]?.socket) {
                        peers[pid].socket.emit('peersUpdate', peerList)
                    }
                }
            } else {
                console.log(`[SERVER] Room ${roomId} no encontrada en rooms`)
            }
        })

        socket.on("createWebRtcTransport", async (callback) => {

            const roomId = peers[socket.id].roomId
            const router = rooms[roomId].router
            try {
                const transport = await createWebRtcTransport(router)
                callback({
                    params: {
                        id: transport.id,
                        iceParameters: transport.iceParameters,
                        iceCandidates: transport.iceCandidates,
                        dtlsParameters: transport.dtlsParameters
                    }
                })
                // Determinar el tipo de transport según la cantidad de transports del usuario
                // Si ya tiene uno, el siguiente es 'send', el primero es 'recv'
                const userTransports = transports.filter(t => t.socketId === socket.id && t.roomId === roomId)
                const direction = userTransports.length === 0 ? 'recv' : 'send'
                addTransport(socket, transport, roomId, direction)
            } catch (err) {
                console.error("Hubo un error al crear el Transport", err)
                callback({ err })
            }
        })

        socket.on("connectTransport", async (data, callback) => {
            // data puede ser { transportId, dtlsParameters }
            let transportId, dtlsParameters
            if (data && typeof data === 'object' && 'transportId' in data && 'dtlsParameters' in data) {
                transportId = data.transportId
                dtlsParameters = data.dtlsParameters
            } else {
                // compatibilidad con clientes antiguos
                dtlsParameters = data
            }
            // Buscar el transport correcto
            let transport
            if (transportId) {
                const t = transports.find(t => t.transport.id === transportId)
                transport = t ? t.transport : null
            } else {
                // fallback: primer transport del usuario
                const t = transports.find(t => t.socketId === socket.id)
                transport = t ? t.transport : null
            }
            if (!transport) {
                callback && callback({ error: 'Transport no encontrado' })
                return
            }
            try {
                await transport.connect({ dtlsParameters })
                callback && callback({ connected: true })
                console.log("Conectado con transport: ", transport.id)
            } catch (err) {
                console.error("Error al intentar conectar con transport", err)
                callback && callback({ error: err.message })
            }
        })

        socket.on("produce", async (data, callback) => {
            // data puede ser { kind, rtpParameters }
            let kind, rtpParameters
            console.log('[SERVER][produce] Evento recibido:', data)
            if (data && typeof data === 'object' && 'kind' in data && 'rtpParameters' in data) {
                kind = data.kind
                rtpParameters = data.rtpParameters
            } else {
                kind = data
            }
            try {
                if (getTransport(socket.id)) {
                    const transport = getTransport(socket.id)
                    console.log('[SERVER][produce] Llamando a transport.produce con:', { kind, rtpParameters })
                    const producer = await transport.produce({ kind, rtpParameters })
                    console.log('[SERVER][produce] Producer creado:', producer)
                    addProducer(socket, producer, socket.roomId)
                    callback && callback({id: producer.id})
                    // Emitir actualización de peers tras producir
                    const roomId = socket.roomId
                    if (rooms[roomId]) {
                        const peerList = rooms[roomId].peers.map(pid => {
                            const p = peers[pid]
                            return {
                                userId: pid,
                                username: p?.peerDetails?.name || '',
                                videoEnabled: p?.videoEnabled ?? true,
                                audioEnabled: p?.audioEnabled ?? true
                            }
                        })
                        console.log(`[SERVER] Peers de Room ${roomId} tras produce:`, peerList.map(p => ({ userId: p.userId, username: p.username })))
                        for (const pid of rooms[roomId].peers) {
                            if (peers[pid]?.socket) {
                                peers[pid].socket.emit('peersUpdate', peerList)
                            }
                        }
                    }
                } else {
                    console.warn('[SERVER][produce] No se encontró transport de envío para el socket:', socket.id)
                }
            } catch (err) {
                console.log("Error al intentar producir", err)
                callback && callback({ error: err.message })
            }
        })


        socket.on("consume", async (producerId, rtpCapabilities, callback) => {
            try {
                const roomId = peers[socket.id].roomId
                const router = rooms[roomId].router
                console.log('[SERVER][CONSUME] Solicitud de consumo:', { producerId, rtpCapabilities, socketId: socket.id })

                if (!router.canConsume({
                    producerId,
                    rtpCapabilities
                })) {
                    console.warn('[SERVER][CONSUME] No se puede consumir este producer', producerId)
                    callback({ error: "No se puede consumir este producer" })
                    return
                }

                // Buscar transport de recepción (RecvTransport)
                const recvTransportObj = transports.find(t => t.socketId === socket.id && t.roomId === roomId && t.direction === 'recv')
                if (!recvTransportObj) {
                    callback({ error: "No se encontró RecvTransport para consumir" })
                    return
                }
                const consumer = await recvTransportObj.transport.consume({
                    producerId,
                    rtpCapabilities,
                    paused: false
                })

                // Log detallado del estado del consumer y su track
                console.log('[SERVER][CONSUME] Consumer creado:', {
                    id: consumer.id,
                    kind: consumer.kind,
                    producerId: consumer.producerId,
                    track: consumer.track,
                    readyState: consumer.readyState,
                    rtpParameters: consumer.rtpParameters
                })
                if (!consumer.track) {
                    console.error('[SERVER][CONSUME] El consumer NO tiene track:', consumer)
                } else {
                    console.log('[SERVER][CONSUME] El consumer SÍ tiene track:', consumer.track)
                }

                consumers.push({ socketId: socket.id, consumer, roomId })

                consumer.on("transportclose", () => {
                    consumers = consumers.filter(c => c.consumer.id !== consumer.id)
                })

                callback({
                    id: consumer.id,
                    producerId,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                    type: consumer.type,
                    producerPaused: consumer.producerPaused
                })
            } catch (err) {
                console.error("[SERVER][CONSUME] Error al consumir", err)
                callback({ error: err.message })
            }
        })


        socket.on("pauseProducer", async (producerId, callback) => {
            try {
                const producerData = producers.find(p => p.producer.id === producerId && p.socketId === socket.id)
                if (producerData && producerData.producer) {
                    await producerData.producer.pause()
                    callback({ paused: true })
                } else {
                    callback({ error: "Producer no encontrado" })
                }
            } catch (err) {
                console.error("Error al pausar producer", err)
                callback({ error: err.message })
            }
        })

        socket.on("resumeProducer", async (producerId, callback) => {
            try {
                const producerData = producers.find(p => p.producer.id === producerId && p.socketId === socket.id)
                if (producerData && producerData.producer) {
                    await producerData.producer.resume()
                    callback({ resumed: true })
                } else {
                    callback({ error: "Producer no encontrado" })
                }
            } catch (err) {
                console.error("Error al reanudar producer", err)
                callback({ error: err.message })
            }
        })

        socket.on("pauseConsumer", async (consumerId, callback) => {
            try {
                const consumerData = consumers.find(c => c.consumer.id === consumerId && c.socketId === socket.id)
                if (consumerData && consumerData.consumer) {
                    await consumerData.consumer.pause()
                    callback({ paused: true })
                } else {
                    callback({ error: "Consumer no encontrado" })
                }
            } catch (err) {
                console.error("Error al pausar consumer", err)
                callback({ error: err.message })
            }
        })

        socket.on("resumeConsumer", async (consumerId, callback) => {
            try {
                const consumerData = consumers.find(c => c.consumer.id === consumerId && c.socketId === socket.id)
                if (consumerData && consumerData.consumer) {
                    await consumerData.consumer.resume()
                    callback({ resumed: true })
                } else {
                    callback({ error: "Consumer no encontrado" })
                }
            } catch (err) {
                console.error("Error al reanudar consumer", err)
                callback({ error: err.message })
            }
        })

        socket.on("getProducers", (callback) => {
            try {
                const roomId = peers[socket.id].roomId
                    // Devuelve todos los producers activos con sus datos relevantes, asegurando que cada uno tenga la propiedad kind
                    const activeProducers = producers.map(p => {
                        // Si el objeto tiene p.kind, úsalo; si no, intenta p.producer.kind
                        let kind = p.kind || (p.producer && p.producer.kind)
                        return {
                            producerId: p.producer.id,
                            socketId: p.socketId,
                            kind: kind
                        }
                    })
                console.log(`[SERVER] getProducers para sala ${roomId}, solicitante ${socket.id}, producerIds:`, activeProducers.map(p => p.producerId))
                    callback(activeProducers)
            } catch (err) {
                console.error("Error al obtener producers", err)
                callback([])
            }
        })








    })







}


export default handleVideoConference