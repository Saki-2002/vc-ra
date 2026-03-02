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
let roomsComments = new Map()

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

        socket.on("requestCurrentComments", (roomId, callback) => {
            const currentComments = roomsComments.get(roomId) || []
            callback({comments: currentComments})
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

        socket.on("addComment", ({roomId, comment}) => {
            const comments = roomsComments.get(roomId) || []
            comments.push(comment)
            roomsComments.set(roomId, comments)
            io.to(roomId).emit("commentAdded", {comment})
        })

        socket.on("deleteComment", ({roomId, commentId}) => {
            const comments = roomsComments.get(roomId) || []
            const filtered = comments.filter(c=> c.id !== commentId)
            roomsComments.set(roomId, filtered)

            io.to(roomId).emit("commentDeleted", {commentId})
        })

        socket.on("kill", () => {
            if(currentPythonProcess && !currentPythonProcess.killed) {
                currentPythonProcess.kill()
                console.log("Ejecución cancelada")
                io.emit("killed")
            }
        })

        socket.on("sendReaction", ({roomId, reaction}) => {
            console.log(`Reacción ${reaction.tag} en ${roomId}`)
            io.to(roomId).emit("reactionReceived", { reaction })
        })

        socket.on("disconnect", () => {
            console.log("Cliente desconectado: ", socket.id)
        })
    })
}
export default handleCodeEditor