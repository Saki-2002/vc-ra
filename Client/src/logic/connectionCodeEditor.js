import socket from "../logic/socketConnection"
//const BASE_URL = "https://bmdt4n7d-5000.brs.devtunnels.ms"
const BASE_URL = "http://localhost:5000"

let addOutputRef = null
let setIsExecutingRef = null
let setCodeRef = null

let onCommentAddedRef = null
let onCommentDeletedRef = null
let onRemoteSelectionRef = null
let onReactionReceivedRef = null

const setupConsoleListeners = (addOutput, setIsExecuting) => {

    addOutputRef = addOutput
    setIsExecutingRef = setIsExecuting

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
        setIsExecutingRef && setIsExecutingRef(false)
    })

    socket.on("killed", () => {
        setIsExecutingRef && setIsExecutingRef(false)
    })

}

const sendInput = (input) => {
    socket.emit("input", input)
}

const killExecution = () => {
    socket.emit("kill")
}

const setupExecutionListeners = (setIsExecuting) => {
    setIsExecutingRef = setIsExecuting
}

const runCode = async (code) => {
    if (!addOutputRef || !setIsExecutingRef) {
        console.warn("ConsoleOutput no está inicializado aún")
        return
    }
    setIsExecutingRef && setIsExecutingRef(true)
    addOutputRef && addOutputRef("Ejecutando código...", "info")

    try {
        await fetch(`${BASE_URL}/api/run-python`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code })
        })
    } catch (err) {
        addOutputRef && addOutputRef(`Error de red: ${err.message}`, "stderr")
        setIsExecutingRef && setIsExecutingRef(false)
    }
}

const emitCodeChange = (roomId, value) => {
    socket.emit("codeChange", { roomId, code: value })
}

const setupCodeChangeListener = (setCode) => {
    setCodeRef = setCode

    socket.off("codeChange")

    socket.on("codeChange", ({ code }) => {
        setCodeRef && setCodeRef(code)
    })
}

const cleanupCodeChangeListener = () => {
    socket.off("codeChange")
}

const requestCurrentCode = (roomId, callback) => {
    socket.emit("requestCurrentCode", roomId, ({ code }) => {
        callback(code)
    })
}

const requestCurrentComments = (roomId, callback) => {
    socket.emit("requestCurrentComments", roomId, ({ comments }) => {
        callback(comments)
    })
}

const emitAddComment = (roomId, comment) => {
    socket.emit("addComment", { roomId, comment })
}

const emitDeleteComment = (roomId, commentId) => {
    socket.emit("deleteComment", { roomId, commentId })
}

const emitSelectionChange = (roomId, selection, username) => {
    socket.emit("selectionChanged", { roomId, selection, username })
}

const setupCommentListeners = (onCommentAdded, onCommentDeleted, onRemoteSelection) => {
    onCommentAddedRef = onCommentAdded
    onCommentDeletedRef = onCommentDeleted
    onRemoteSelectionRef = onRemoteSelection

    socket.off("commentAdded")
    socket.off("commentDeleted")
    socket.off("remoteSelection")


    socket.on("commentAdded", ({ comment }) => {
        onCommentAddedRef && onCommentAddedRef(comment)
    })

    socket.on("commentDeleted", ({ commentId }) => {
        onCommentDeletedRef && onCommentDeletedRef(commentId)
    })

    socket.on("remoteSelection", ({ socketId, username, selection }) => {
        onRemoteSelectionRef && onRemoteSelectionRef(socketId, username, selection)
    })
}

const cleanupCommentListeners = () => {
    socket.off("commentAdded")
    socket.off("commentDeleted")
    socket.off("remoteSelection")
}

const emitReaction = (roomId, reaction) => {
    socket.emit("sendReaction", { roomId, reaction })
}

const setupReactionListener = (onReactionReceived) => {
    onReactionReceivedRef = onReactionReceived

    socket.off("reactionReceived")

    socket.on("reactionReceived", ({ reaction }) => {
        console.log("Reacción recibida")
        onReactionReceivedRef && onReactionReceivedRef(reaction)
    })
}

const cleanupReactionListener = () => {
    socket.off("reactionReceived")
}

export {
    runCode,
    setupExecutionListeners,
    setupConsoleListeners,
    sendInput,
    killExecution,
    setupCodeChangeListener,
    emitCodeChange,
    cleanupCodeChangeListener,
    requestCurrentCode,
    requestCurrentComments,
    emitAddComment,
    emitDeleteComment,
    emitSelectionChange,
    setupCommentListeners,
    cleanupCommentListeners,
    emitReaction,
    setupReactionListener,
    cleanupReactionListener
}