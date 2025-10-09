
import express from "express"
import http from "http"
import mediasoup from "mediasoup"
import { Server } from "socket.io"

const app = express()
const PORT = 5000
const server = http.createServer(app)

//Se crea un servidor
const io = new Server(server, {
  cors: {
    //Permite peticiones desde cliente
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
})

//Ejemplo de API Servidor
app.get("/api", (req, res) => {
  res.json({ message: "Hola desde el servidor Node.js 🚀" });
});

//Inicio de server en port indicado
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

//CREACIÓN DE WORKER
//Es uno por cada CPU del server. Con uno basta
const worker = await mediasoup.createWorker({
  logLevel: "warn",
  rtcMinPort: 2000,
  rtcMaxPort: 2020,
})


//CREACIÓN DE ROUTERS (SALAS)

//Se crea un Map de Routers, ya que son varios y representan las 
//salas de videoconferencias
const routers = new Map();

//Función que crea una sala si no existe, o retorna una si ya existe
async function getOrCreateRouter(roomId) {
  if (routers.has(roomId)) {
    return routers.get(roomId)
  }

  //Configuración de Media
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

  //Se crea una sala (router)
  const router = await worker.createRouter({ mediaCodecs })
  //Se guarda en el map
  routers.set(roomId, router)

  //Se retorna la sala
  return router
}

//io -> Server   .on -> para escuchar eventos   socket -> representa una conexión cliente-server especif
//"connection" -> cuando un cliente se conecta
io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado: ", socket.id)

  //socket.on -> se espera escuchar el evento "joinRoom" que debería emitir el cliente
  //Se envía el roomId y también el callback (función de Socket.IO para responder directo al cliente)
  socket.on("joinRoom", async ({ roomId }, callback) => {
    try {
      socket.roomId = roomId
      socket.join(roomId)
      const router = await getOrCreateRouter(roomId)
      //devolvemos al cliente los rtpCapabilities para que configure su Device
      callback({ rtpCapabilities: router.rtpCapabilities })
      console.log(`Cliente ${socket.id} se unió a la sala ${roomId}`)

      //Obtiene todos los sockets de una sala lógica, y excluye
      //el socket actual
      const otherSockets = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
      .filter(id => id!== socket.id);

      //Busca los ids de otros usuarios
      for (let otherId of otherSockets) {
        //Guarda el usuario
        const otherSocket = io.sockets.sockets.get(otherId)
        //Si existe el usuario y tiene producers, continua
        if(otherSocket && otherSocket.producers){
          //Busca los productores del usuario
          for (let producer of otherSocket.producers){
            //Emite newProducer. Significa que el cliente recibe
            //una notificación de que hay un nuevo productor
            //que no se había considerado antes. Esto para considerarlo
            //y luego consumir su media
            socket.emit("newProducer", {
              producerId: producer.id,
              kind: producer.kind,
              producerSocketId: otherSocket.id
            })
          }
        }
      }

      //Obtener todos los producers automatico

      //Obtiene los sockets conectados a la sala y lo añade al Array otherSockets
      //.filter filtra los resultados para excluir al cliente recién conectado
      /* const otherSockets = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
         .filter(id => id!== socket.id);
 
       //Se itera por todos los otros sockets
       for (let otherId of otherSockets) {
         const otherSocket = io.sockets.sockets.get(otherId)
         console.log("TESTEO")
         console.log(otherId)
         console.log(otherSocket)
         console.log(otherSocket.producers)
         if (otherSocket && otherSocket.producers) {
           for (let producer of otherSocket.producers) {
             socket.emit("newProducer", {
               producerId: producer.id,
               kind: producer.kind,
               producerSocketId: otherSocket.id
             })
           }
         }
       }*/

    } catch (err) {
      console.error("Error al unir cliente a la sala", err)
      //Devolvemos un objeto con campo "error" para que sepa que falló
      callback({ error: err.message })
    }
  })

  //Evento que permite crear un transport
  socket.on("createTransport", async (callback) => {
    try {
      //Se obtiene el router asociado al roomId
      const router = routers.get(socket.roomId);

      //Se crea el transport
      const transport = await router.createWebRtcTransport({
        // ip -> todas las interfaces locales   announcedIp -> IP publica
        listenIps: [{ ip: "0.0.0.0", announcedIp: "127.0.0.1" }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
      })

      socket.transport = transport

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      })

      console.log(`Transport ${transport.id} creado para cliente ${socket.id}`)

    } catch (err) {
      console.error("Error al crear transport", err)
      callback({ error: err.message })
    }
  })

  socket.on("connectTransport", async ({ transportId, dtlsParameters }, callback) => {
    try {
      const transport = socket.transport
      if (!transport || transport.id !== transportId) {
        throw new Error("Transport no encontrado");
      }

      await transport.connect({ dtlsParameters })
      console.log(`Transport ${transport.id} conectado para cliente ${socket.id}`)
      callback({})
    } catch (err) {
      console.error("Error en ConnectTransport", err)
      callback({ error: err.message })
    }
  })


  //Evento cuando un cliente quiere producir audio o video
  //kind -> "audio" o "video"   rtpParameters -> Parametros de como enviar media al server
  socket.on("produce", async ({ kind, rtpParameters }, callback) => {
    try {
      const transport = socket.transport
      if (!transport) throw new Error("Transport no creado");

      const producer = await transport.produce({ kind, rtpParameters })

      if (!socket.producers) socket.producers = [];
      socket.producers.push(producer)


      callback({ id: producer.id })
      console.log(`Cliente ${socket.id} produjo ${kind} con id ${producer.id}`)
      socket.to(socket.roomId).emit("newProducer", {
        producerId: producer.id,
        kind,
        producerSocketId: socket.id
      })
    } catch (err) {
      console.error("Error al producir media", err)
      callback({ error: err.message })
    }
  })

  socket.on("consume", async ({ producerId }, callback) => {
    try {
      const router = routers.get(socket.roomId)
      const transport = socket.transport
      if (!transport) throw new Error("Transport no creado");

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities: router.rtpCapabilities,
        paused: false,
      })

      callback({
        id: consumer.id,
        producerId: producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters
      })

      console.log(`Cliente ${socket.id} está consumiendo Producer ${producerId}`)

    } catch (err) {
      console.error("Error al crear Consumer", err)
      callback({ error: err.message })
    }
  })

  socket.on("disconnect", () => {
    if (socket.producers) {
      socket.producers.forEach(p => p.close())
    }

    if (socket.transport) {
      socket.transport.close()
    }

    console.log(`El cliente ${socket.id} se ha desconectado de la sala ${socket.roomId}`)
  })

})