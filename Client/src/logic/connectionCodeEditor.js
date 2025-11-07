import socket from "../logic/socketConnection"
const BASE_URL = "http://localhost:5000"

let addOutputRef = null
let setIsExecuting_coRef = null
let setIsExecuting_ceRef = null
let setCodeRef = null

const setupConsoleListeners = (addOutput, setIsExecuting_co) => {

    addOutputRef = addOutput
    setIsExecuting_coRef = setIsExecuting_co

    socket.off("output")
    socket.off("error")
    socket.off("finished")
    socket.off("killed")
    
    socket.on("output", (data) => {
        addOutputRef && addOutputRef(data, "stdout")
    })

    socket.on("error", (data) => {
        addOutputRef && addOutputRef(data, "stderr")
    })

    socket.on("finished", () => {
        setIsExecuting_coRef && setIsExecuting_coRef(false)
        setIsExecuting_ceRef && setIsExecuting_ceRef(false)
    })

    socket.on("killed", () => {
        setIsExecuting_coRef && setIsExecuting_coRef(false)
        setIsExecuting_ceRef && setIsExecuting_ceRef(false)
    })

}

const sendInput = (input) => {
    socket.emit("input", input)
}

const killExecution = () => {
    socket.emit("kill")
}

const setupExecutionListeners = (setIsExecuting_ce) => {
    setIsExecuting_ceRef = setIsExecuting_ce
}

const runCode = async (code) => {
    if(!addOutputRef || !setIsExecuting_coRef || !setIsExecuting_ceRef) {
        console.warn("ConsoleOutput no está inicializado aún")
        return
    }

    setIsExecuting_coRef && setIsExecuting_coRef(true)
    setIsExecuting_ceRef && setIsExecuting_ceRef(true)
    addOutputRef && addOutputRef("Ejecutando código...", "info")

    try {
        await fetch(`${BASE_URL}/api/run-python`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({code})
        })
    } catch (err) {
        addOutputRef && addOutputRef(`Error de red: ${err.message}`, "stderr")
        setIsExecuting_ceRef && setIsExecuting_ceRef(false)
        setIsExecuting_coRef && setIsExecuting_coRef(false)
    }
}

const emitCodeChange = (roomId, value) => {
    socket.emit("codeChange", {roomId, code: value})
}

const codeChangeListener = (setCode) => {
    setCodeRef = setCode

    socket.off("codeChange")
    
    socket.on("codeChange", (code) => {
        setCodeRef && setCodeRef(code)
    })
}

const cleanupCodeChangeListener = () => {
    socket.off("codeChange")
}

export {
    runCode,
    setupExecutionListeners,
    setupConsoleListeners,
    sendInput,
    killExecution,
    codeChangeListener,
    emitCodeChange,
    cleanupCodeChangeListener
}