import { useEffect, useRef, useState, useCallback } from "react";
import * as codeEditorConnection from "../logic/connectionCodeEditor"

export default function useCodeEditor({ roomId, isHost, code, setCode, setSelection, selection}) {

    const isRemoteChange = useRef(false)
    const lastSelectionRef = useRef({from: null, to:null})
    const [isExecuting, setIsExecuting] = useState(false)

    // Setear una sola vez los Listeners 
    useEffect(() => {
        codeEditorConnection.setupExecutionListeners(setIsExecuting)

        const handleRemoteCodeChange = (newCode) => {
            isRemoteChange.current = true
            setCode(newCode)
        }

        codeEditorConnection.setupCodeChangeListener(handleRemoteCodeChange)

        return () => {
            codeEditorConnection.cleanupCodeChangeListener()
        }
    }, [setCode])

    const handleChange = useCallback((value) => {

        if (!isHost) return

        setCode(value)

        if (!isRemoteChange.current) {
            codeEditorConnection.emitCodeChange(roomId, value)
        }

        isRemoteChange.current = false
    }, [isHost, roomId, setCode])

    const handleSelectionChange = useCallback((viewUpdate) => {
        if (!viewUpdate.selectionSet || !setSelection) return;

        const { state } = viewUpdate
        const { from, to } = state.selection.main
        const lastSel = lastSelectionRef.current

        if(from === to) {
            if(lastSel.from !== null || lastSel.to !== null) {
                lastSelectionRef.current = {from: null, to: null}
                setSelection(null)
            }
            return
        }

        if (lastSel.from === from && lastSel.to === to) {
            return
        }

        lastSelectionRef.current = {from, to}
        
        setSelection({
            from,
            to,
            text: state.sliceDoc(from, to)
        })
        
    }, [setSelection])

    const executeCode = useCallback(async () => {
        if (isExecuting || !code.trim()) return
        await codeEditorConnection.runCode(code)
        console.log("B")
    },[isExecuting, code])


    return {
        handleChange,
        handleSelectionChange,
        executeCode,
        isExecuting
    }
}