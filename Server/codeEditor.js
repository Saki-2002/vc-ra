import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { spawn } from "child_process"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


let currentPythonProcess = null
let currentTmpFile = null
//let activePythonProcesses = new Map()

let roomsCode = new Map()

function handleCodeEditor(app, io) {

    app.post("/api/run-python", (req, res) => {
        try {
            let code = ""
            if (req.body && typeof req.body.code === "string") code = req.body.code

            if (!code.trim()) {
                return res.status(400).json({ error: "Codigo vacio" })
            }

            if(currentPythonProcess && !currentPythonProcess.killed) {
                currentPythonProcess.kill()
            }

            if(currentTmpFile && fs.existsSync(currentTmpFile)) {
                fs.unlinkSync(currentTmpFile)
            }

            const tmpFile = path.join(__dirname, `temp_${Date.now()}.py`)
            fs.writeFileSync(tmpFile, code, "utf8")
            currentTmpFile = tmpFile

            currentPythonProcess = spawn("python", ["-u", tmpFile])

            currentPythonProcess.stdout.on("data", (data) => {
                io.emit("output", data.toString())
            })

            currentPythonProcess.stderr.on("data", (data) => {
                io.emit("error", data.toString())
            })

            currentPythonProcess.on("close", (code) => {
                fs.existsSync(tmpFile) && fs.unlinkSync(tmpFile)
                io.emit("finished")
                currentPythonProcess = null
                console.log("Proceso terminado")
            })

            res.json({success: true})

        } catch (err) {
            return res.status(500).json({ error: err.message })
        }
    })


    io.on("connection", (socket) => {
        console.log("Usuario conectado con servidor (Editor de Codigo). Id: ", socket.id)

        socket.on("requestCurrentCode", (roomId, callback) => {
            const currentCode = roomsCode.get(roomId) || ""
            callback({code: currentCode})
        })

        socket.on("input", (input) => {
            if(currentPythonProcess){
                currentPythonProcess.stdin.write(input + "\n")
            }
        })

        socket.on("codeChange", ({roomId, code}) => {
            roomsCode.set(roomId, code)
            socket.to(roomId).emit("codeChange", {code})
        })

        socket.on("kill", () => {
            if(currentPythonProcess && !currentPythonProcess.killed) {
                currentPythonProcess.kill()
                console.log("Ejecución cancelada")
                io.emit("killed")
            }
        })

        socket.on("disconnect", () => {
            console.log("Cliente desconectado: ", socket.id)
        })
    })
}
export default handleCodeEditor