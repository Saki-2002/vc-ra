import { useCallback, useEffect, useRef, useState } from "react"
import * as handleConnection from "../logic/connectionCodeEditor"

function ConsoleOutput({ roomId }) {

    const [output, setOutput] = useState([])
    const [isExecuting, setIsExecuting] = useState(false)
    const [userInput, setUserInput] = useState("")
    const consoleRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight
        }

        if (isExecuting && inputRef.current) {
            inputRef.current.focus()
        }
    }, [output, isExecuting])

    const clearConsole = useCallback(() => {
        if(isExecuting) {
            handleConnection.killExecution()
        } else {
            setOutput([])    
        }
        setUserInput("")
    }, [isExecuting])

    const addOutput = useCallback((text, type = "stdout") => {
        setOutput(prev => [...prev, { text, type, timestamp: Date.now() }])
    }, [])

    useEffect(() => {
        handleConnection.setupConsoleListeners(addOutput,setIsExecuting)
    }, [addOutput])

    const handleInputChange = (e) => {
        setUserInput(e.target.value)
    }

    const handleInputSubmit = (e) => {
        e.preventDefault()
        if (userInput.trim()) {
            addOutput(userInput, "input")
            handleConnection.sendInput(userInput)
            setUserInput("")
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault()
            handleInputSubmit(e)
        }
    }



    return (
        <div className="w-full h-full flex flex-1 flex-col">
            <div className="bg-gray-800 w-full p-2 flex justify-between items-center h-10 rounded-t-2xl">
                <h1 className="text-white font-bold">
                    Consola Python
                </h1>
                <button
                    onClick={clearConsole}
                    className="bg-white rounded px-4 py-1 font-semibold">
                    {isExecuting ? "Cancelar" : "Limpiar"}
                </button>
            </div>
            <div
                className=" bg-black flex flex-1 flex-col overflow-y-auto p-2 font-mono text-sm rounded-b-2xl"
                ref={consoleRef}
                onClick={() => inputRef.current?.focus()}
            >
                {isExecuting && (
                    <div className="text-yellow-400 animate-pulse">
                        Ejecutando Codigo...
                    </div>
                )}
                {output.length === 0 && !isExecuting ? (
                    <div className="text-gray-500 italic">
                        Presiona Ejecutar para correr el código...
                    </div>
                ) : (
                    output.map((line, index) => {
                        const lines = line.text.split(`\n`).filter(l => l.trim() !== ``)

                        return lines.map((textLine, lineIndex) => (
                            <div
                                key={`${index}-${lineIndex}`}
                                className={`
                                    mb-1 whitespace-pre-wrap break-words
                                    ${line.type === `stdout` ? `text-white` : ``}
                                    ${line.type === `stderr` ? `text-red-500 font-bold` : ``}
                                    ${line.type === `info` ? `text-gray-500` : ``}
                                    ${line.type === `input` ? `text-blue-300` : ``}
                                `}
                            >
                                <span className="text-gray-500 mr-2">&gt;</span>
                                {textLine}
                            </div>
                        ))
                    })
                )}

                {isExecuting && (
                    <div className="flex items-center text-white mb-1">
                        <span className="text-gray-500 mr-2">&gt;</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={userInput}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-transparent outline-none text-white caret-white"
                            placeholder=""
                            autoFocus
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

export default ConsoleOutput