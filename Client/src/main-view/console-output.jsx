import { useEffect, useRef, useState } from "react"




function ConsoleOutput ({roomId}) {

    const [output, setOutput] = useState([])
    const [isExecuting, setIsExecuting] = useState(false)
    const consoleRef = useRef(null)
    
    useEffect(() =>{
        if(consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight
        }
    }, [output])

    const clearConsole = () => {
        setOutput([])
    }

    const addOutput = (text, type="stdout") => {
        setOutput(prev=> [...prev, {text, type, timestamp : Date.now()}])
    }

    

    return (
        <div className="w-full h-full flex flex-1 flex-col">
            <div className="bg-gray-800 w-full p-2 flex justify-between items-center h-10">
                <h1 className="text-white font-bold">
                    Consola Python
                </h1>
                <button
                    onClick={clearConsole}
                    className="bg-white rounded px-4 py-1 font-semibold">
                    Limpiar Consola
                </button>
            </div>
            <div
                className=" bg-black flex flex-1 flex-col overflow-y-auto p-2 font-mono text-sm"
                ref={consoleRef}
            >
                {isExecuting && (
                    <div className="text-yellow-400 animate-pulse">
                        Ejecutando Codigo...
                    </div>
                )}                
                {output.length === 0 && !isExecuting ? (
                    <div className="text-gray-500 italic">
                        ...
                    </div>
                ) : (
                    output.map((line, index) => (
                        <div
                            key={index}
                            className={`
                                mb-1 whitespace-pre-wrap break-words
                                ${line.type === `stdout` ? `text-green-400` : ``}
                                ${line.type === `stderr` ? `text-red-500 font-bold` : ``}
                                ${line.type === `info` ? `text-gray-400` : ``}
                            `}
                        >
                            {line.text}
                        </div>
                    ))
                )}
            </div>
        </div>
    )



}

export default ConsoleOutput