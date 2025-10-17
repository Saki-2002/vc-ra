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
                transport.close
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
    } else {
        router = await worker.createRouter({ mediaCodecs })
    }
    console.log("Router ID:", router.id)
    rooms[roomId] = {
        router: router,
        peers: [...peers, socketId]
    }
    return router
}


//AÑADIR TRANSPORT
//Entrada: Socket, Transport, roomId
//Funcionamiento: Añadir el transport creado a la lista de Transports
//Salida: Ninguna, se añade directo en el Array original
const addTransport = (socket, transport, roomId) => {
    transports = [
        ...transports,
        { socketId: socket.id, transport, roomId }
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
    producers = [
        ...producers,
        { socketId: socket.id, producer, roomId }
    ]
    peers[socket.id] = {
        ...peers[socket.id],
        producers: [
            ...peers[socket.id].producers,
            producer.id
        ]
    }
}

const addConsumer = (socket, consumer, roomId) => {
    consumers = [
        ...consumers,
        { socketId: socket.id, consumer, roomId }
    ]

    peers[socket.id] = {
        ...peers[socket.id],
        consumers: [
            ...peers[socket.id].consumers,
            consumer.id
        ]
    }
}

async function handleVideoConference() {

    worker = await createWorker()

    io.on("connection", socket => {

        socket.on("disconnect", () => {
            console.log("Usuario desconectado")

            //Se eliminan los consumers, producers y transports
            consumers = removeItems(consumers, socket.id, "consumer")
            producers = removeItems(producers, socket.id, "producer")
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
                }
            }
        })

        socket.on("joinRoom", async (roomId, callback) => {

            socket.roomId = roomId
            socket.join(roomId)

            //Se crea la Room o la busca si ya existe
            let router = await createRoom(roomId, socketId)

            //Se crea un usuario en el listado 
            peers[socket.id] = {
                socket,
                roomId,
                transports: [],
                consumers: [],
                producers: [],
                peerDetails: {
                    name: "",
                    isAdmin: false,
                }
            }
            callback({ rtpCapabilities: router.rtpCapabilities })
        })

        socket.on("createWebRtcTransport", async (callback) => {

            roomId = peers[socket.id].roomId
            router = rooms[roomId].router
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
                addTransport(socket, transport, roomId)
            } catch (err) {
                console.error("Hubo un error al crear el Transport", err)
                callback({ err })
            }
        })

        socket.on("connectTransport", (dtlsParameters, callback) => {
            try {
                if (transports[socket.id]) {
                    const transport = transports[socket.id].connect({ dtlsParameters })
                    callback({
                        id: transport.id,
                        iceParameters: transport.iceParameters,
                        iceCandidates: transport.iceCandidates,
                        dtlsParameters: transport.dtlsParameters
                    })
                }
                console.log("Conectado con transport: ", transport.id)
            } catch (err) {
                console.error("Error al intentar conectar con transport", err)
            }
        })

        socket.on("produce", async (kind, rtpParameters, callback) => {
            try {
                if (transports[socket.id]) {
                    const transport = transports[socket.id]
                    const producer = await transport.produce({ kind, rtpParameters })
                    addProducer(socket, producer, socket.roomId)
                    callback(producer.id)
                }
            }
        })




    })







}


export default handleVideoConference