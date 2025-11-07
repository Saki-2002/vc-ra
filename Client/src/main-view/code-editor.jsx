import CodeMirror from "@uiw/react-codemirror"
import {python} from "@codemirror/lang-python"
import { useEffect, useRef, useState } from "react"
import * as handleConnection from "../logic/connectionCodeEditor"
import { EditorView, Decoration } from "@codemirror/view"
import {StateField, StateEffect} from "@codemirror/state"
import {EditorState} from "@codemirror/state"
import CommentsPanel from "./comments-panel"

const addCommentMark = StateEffect.define()
const removeCommentMark = StateEffect.define()

const commentField = StateField.define({
    
    create(){
        return Decoration.none
    },
    update(decorations, tr) {
        decorations = decorations.map(tr.changes)

        for(let effect of tr.effects) {
            if(effect.is(addCommentMark)) {
                decorations = decorations.update({
                    add: [Decoration.mark({
                        class: "comment-highlight",
                        attributes: {"data-comment-id": effect.value.id}
                    }).range(effect.value.from, effect.value.to)]
                })
            } else if (effect.is(removeCommentMark)) {
                decorations = decorations.update({
                    filter: (from, to, value) => {
                        return value.spec.attributes?.["data-comment-id"] !== effect.value
                    }
                })
            }
        }
        return decorations
    },
    provide: f => EditorView.decorations.from(f)
})


function CodeEditor ({roomId, isHost}) {

    const [code, setCode] = useState("")
    const [isExecuting, setIsExecuting] = useState(false)
    const isRemoteChange = useRef(false)
    const editorRef = useRef(null)

    //Estados de comentarios
    const [comments, setComments] = useState([])
    const [selection, setSelection] = useState(null)
    const [showCommentInput, setShowCommentInput] = useState(false)
    const [commentText, setCommentText] = useState("")
    
    useEffect(()=> {
        handleConnection.requestCurrentCode(roomId, (currentCode) => {
            setCode(currentCode)
        })
    }, [roomId])

    useEffect(()=> {
        handleConnection.setupExecutionListeners(setIsExecuting)

        const handleRemoteCodeChange = (newCode) => {
            isRemoteChange.current = true
            setCode(newCode)
        }

        handleConnection.codeChangeListener(handleRemoteCodeChange)

        return () => {
            handleConnection.cleanupCodeChangeListener()
        }
    }, [])

    useEffect(() => {
        if(!editorRef.current) return;
        const view = editorRef.current.view
        if (!view) return;

        //Agregar decoraciones
        comments.forEach(comment => {
            view.dispatch({
                effects: addCommentMark.of({
                    id: comment.id,
                    from: comment.from,
                    to: comment.to
                })
            })
        })
    }, [comments])
    
    const handleChange = (value) => {

        if(!isHost) return

        setCode(value)

        if(!isRemoteChange.current) {
            handleConnection.emitCodeChange(roomId, value)
        }

        isRemoteChange.current = false
    }

    const handleSelectionChange = (viewUpdate) => {
        const {state} = viewUpdate
        const {from, to} = state.selection.main

        if (from !== to) {
            setSelection(prev => {
                if(prev?.from === from && prev?.to === to) return prev;
                return {
                    from,
                    to,
                    text: state.sliceDoc(from, to)
                }
            })
        } else {
            setSelection(null)
        }
    }

    const handleAddComment = () => {
        if(!selection || !commentText.trim()) return;

        const newComment = {
            id: `comment-${Date.now()}`,
            from: selection.from,
            to: selection.to,
            text: commentText,
            codeSnippet: selection.text
        }

        setComments([...comments, newComment])
        setCommentText("")
        setShowCommentInput(false)
        setSelection(null)
    }

    const handleDeleteComment = (commentId) => {
        setComments(comments.filter(c => c.id !== commentId))

        if(editorRef.current?.view) {
            editorRef.current.view.dispatch({
                effects: removeCommentMark.of(commentId)
            })
        }
    }

    const executeCode = async () => {
        if (isExecuting || !code.trim()) return
        await handleConnection.runCode(code)
    }
    
    


    return (
        <div className="flex flex-col h-full relative overflow-hidden min-h-0">
            <div className="bg-gray-800 p-2 flex justify-between items-center">
                <h3 className="text-white font-bold">Editor de Python</h3>
                <div className ="flex gap-2">
                    {selection && (
                        <button
                            className="bg-yellow-500 px-3 py-1 rounded text-sm"
                            onClick={() => setShowCommentInput(true)}    
                        >
                            Comentar
                        </button>
                    )}
                </div>
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
                ref={editorRef}
                value={code}
                height="100%"
                extensions={[
                    python(),
                    commentField,
                    EditorView.updateListener.of(handleSelectionChange),
                    ...(isHost ? [] : [
                        EditorView.editable.of(false),
                        EditorState.readOnly.of(true)
                    ])
                ]}
                onChange={handleChange}
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
            <CommentsPanel
                comments={comments}
                selection={selection}
                showCommentInput={showCommentInput}
                commentText={commentText}
                setShowCommentInput={setShowCommentInput}
                setCommentText={setCommentText}
                handleAddComment={handleAddComment}
                handleDeleteComment={handleDeleteComment}
            />
        </div>
    )



}


export default CodeEditor