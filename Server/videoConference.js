import mediasoup from "mediasoup"
import { generateProducerRemoteParameters } from "mediasoup-client/fakeParameters"

let worker //Se crea uno solo
let rooms = {} //Tiene un Router y una lista de peers
let peers = {} //Tiene el socket, roomName,
// transports, producers,consumers, y peerDetails
let transports = [] // Listado de transportes
let producers = [] //Listado de producers
let consumers = [] //Listado de consumers



//Configuración de MediaCodecs
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


//Función para crear un Worker
const createWorker = async () => {
    //Crea un worker con mediasoup
    worker = await mediasoup.createWorker({
        //Nivel de logs: adventerncias
        logLevel: "warn",
        //Puertos UDP que se utilizarán
        rtcMinPort: 2000,
        rtcMaxPort: 2199
    })
    console.log("ID WORKER: ", worker.pid)
    //Se define un listener cuando ha muerto el worker
    worker.on("died", error => {
        console.error("Worker de mediasoup a muerto", error)
        //Se exitea de la applicación
        setTimeout(() => process.exit(1), 2000)
    })
    //Devuelve el worker
    return worker
}

//Función para crear un webrtc transport
const createWebRtcTransport = async (router) => {
    try {
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

        const transport = await router.createWebRtcTransport(webRtcTransport_options)
        console.log("Transport creado: ", transport.id)

        //Listeners

        transport.on("close", () => {
            console.log("Transport closed")
        })

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

//Función para quitar items de las listas
const removeItems = (items, socketId, type) => {
    items.forEach(item => {
        if (item.socketId === socketId) {
            item[type].close()
        }
    })
    items = items.filter(item => item.socketId !== socketId)
    return items
}

const createRoom = async (roomId, socketId) => {

    let peers = []
    let router

    if (rooms[roomId]) {
        peers= rooms[roomId].peers || []
        router= rooms[roomId].router
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

const addTransport = (socket, transport, roomId) => {
    transports = [
        ...transports,
        {socketId: socket.id, transport, roomId}
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
        {socketId: socket.id, producer, roomId}
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
        {socketId: socket.id, consumer, roomId}
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

    //Crear Media Codecs
    //Crear Worker

    //Crear Router según petición

    //Crear transports para server
    //Crear 2 transports producer x usuario

    //Crear (2 * (Usuarios-1)) transports consumer x usuario

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

            //Se crea la Room
            let router = await createRoom(roomId, socketId)
            
            peers[socket.id] = {
                socket,
                roomId,
                transports:[],
                consumers:[],
                producers:[],
                peerDetails:{
                    name:"",
                    isAdmin: false,
                }
            }
            callback({rtpCapabilities: router.rtpCapabilities})
        })

        socket.on("createWebRtcTransport", async (callback) => {
            
            roomId= peers[socket.id].roomId
            router= rooms[roomId].router
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
                callback({err})
            }
        })





    })







}


export default handleVideoConference