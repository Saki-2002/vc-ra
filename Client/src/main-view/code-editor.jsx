import CodeMirror, { ViewUpdate } from "@uiw/react-codemirror"
import {python} from "@codemirror/lang-python"
import { useState } from "react"
import { oneDark } from "@uiw/react-codemirror"
import {runCode} from "../logic/connectionCodeEditor"

function CodeEditor ({roomId, onExecute}) {

    const [code, setCode] = useState("")
    
    const handleChange = (value, ViewUpdate) => {
        setCode(value)
    }

    const executeCode = (roomId, code) => {
        //setOnExecute(true)
        runCode(roomId, code)
        //setOnExecute(false)
    }
    
    


    return (
        <div className="flex flex-col h-full relative overflow-hidden min-h-0">
            <div className="bg-gray-800 p-2 flex justify-between items-center">
                <h3 className="text-white font-bold">Editor de Python</h3>
                <button
                    className="bg-green-500 px-4 py-1 rounded"
                    onClick={executeCode}
                >
                    Ejecutar
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