
import express from "express"
import http from "http"
import mediasoup from "mediasoup"
import { Server } from "socket.io"
import handleVideoConference from "./videoConference.js"
import fs from "fs"
import path from "path"

const app = express()
app.use(express.json())
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

import { exec } from "child_process";

app.post("/api/run-python", (req, res) => {
  let code = "";
  if (req.body && req.body.code) {
    code = req.body.code;
  }
  // Guardar el código en un archivo temporal
  // Obtener ruta absoluta del directorio actual
  // Crear archivo temporal en el mismo directorio que app.js
  // Obtener ruta absoluta del directorio actual de app.js
  const tmpFile = path.join(process.cwd(), "temp_code.py");
  fs.writeFileSync(tmpFile, code, "utf8");
  // Ejecutar el código con python
  exec(`python "${tmpFile}"`, { timeout: 5000 }, (err, stdout, stderr) => {
    fs.unlinkSync(tmpFile);
    if (err) {
      return res.json({ error: stderr || err.message });
    }
    res.json({ output: stdout });
  });
});

//Inicio de server en port indicado
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

handleVideoConference(io)