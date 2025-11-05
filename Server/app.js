
import express from "express"
import http from "http"
import { Server } from "socket.io"
import handleVideoConference from "./videoConference.js"
import handleCodeEditor from "./codeEditor.js"


const app = express()
app.use(express.json())
const PORT = 5000
const server = http.createServer(app)

//Se crea un servidor
const io = new Server(server, {
  cors: {
    //Permite peticiones desde cliente
    origin: "http://localhost:5173",
    //origin: "*",
    methods: ["GET", "POST"]
  }
})

//Inicio de server en port indicado
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

handleVideoConference(io)
handleCodeEditor(io)