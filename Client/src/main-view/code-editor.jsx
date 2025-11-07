import CodeMirror, { ViewUpdate } from "@uiw/react-codemirror"
import {python} from "@codemirror/lang-python"
import { useEffect, useState } from "react"
import { oneDark } from "@uiw/react-codemirror"
import * as handleConnection from "../logic/connectionCodeEditor"

function CodeEditor ({roomId}) {

    const [code, setCode] = useState("")
    const [isExecuting, setIsExecuting] = useState(false)
    

    useEffect(()=> {
        handleConnection.setupExecutionListeners(setIsExecuting)
        handleConnection.codeChangeListener(setCode)
    }, [])
    
    const handleChange = (value) => {
        setCode(value)
        handleConnection.emitCodeChange(value)
    }

    const executeCode = async () => {
        if (isExecuting || !code.trim()) return
        setIsExecuting(true)
        await handleConnection.runCode(roomId, code)
    }
    
    


    return (
        <div className="flex flex-col h-full relative overflow-hidden min-h-0">
            <div className="bg-gray-800 p-2 flex justify-between items-center">
                <h3 className="text-white font-bold">Editor de Python</h3>
                <button
                    className={`px-4 py-1 rounded ${
                        isExecuting ? "bg-gray-500 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
                    }`}
                    onClick={executeCode}
                    disabled={isExecuting}
                >
                    {isExecuting ? "Ejecutando..." : "Ejecutar"}
                </button>
            </div>
            <CodeMirror
                className="h-full text-[16px] overflow-y-auto"
                value={code}
                height="100%"
                extensions={[python()]}
                onChange={handleChange}
                theme={oneDark}
                basicSetup={{
                    lineNumbers: true,
                    highlightActiveLineGutter: true,
                    highlightSpecialChars: true,
                    foldGutter: true,
                    drawSelection: true,
                    dropCursor: true,
                    indentOnInput: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    crosshairCursor: true,
                    highlightActiveLine: true,
                    highlightSelectionMatches: true,
                    closeBracketsKeymap: true,
                    searchKeymap: true,
                    foldKeymap: true,
                    completionKeymap: true,
                    lintKeymap: true
                }}
            />
        </div>
    )



}


export default CodeEditor