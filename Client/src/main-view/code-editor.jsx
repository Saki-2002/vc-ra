import CodeMirror from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"
import { useEffect, useRef, useState } from "react"
import * as handleConnection from "../logic/connectionCodeEditor"
import { EditorView, Decoration } from "@codemirror/view"
import { StateField, StateEffect } from "@codemirror/state"
import { EditorState } from "@codemirror/state"
import CommentsPanel from "./comments-panel"

const addCommentMark = StateEffect.define()
const removeCommentMark = StateEffect.define()

const commentField = StateField.define({

    create() {
        return Decoration.none
    },
    update(decorations, tr) {
        decorations = decorations.map(tr.changes)

        for (let effect of tr.effects) {
            if (effect.is(addCommentMark)) {
                decorations = decorations.update({
                    add: [Decoration.mark({
                        class: "comment-highlight",
                        attributes: { "data-comment-id": effect.value.id }
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


function CodeEditor({ roomId, isHost, username, onCommentDataChange }) {

    const [code, setCode] = useState("")
    const [isExecuting, setIsExecuting] = useState(false)
    const isRemoteChange = useRef(false)
    const editorRef = useRef(null)

    //Estados de comentarios
    const [comments, setComments] = useState([])
    const [selection, setSelection] = useState(null)
    const [showCommentInput, setShowCommentInput] = useState(false)
    const [commentText, setCommentText] = useState("")

    useEffect(() => {
        handleConnection.requestCurrentCode(roomId, (currentCode) => {
            setCode(currentCode)
        })

        handleConnection.requestCurrentComments(roomId, (currentComments) => {
            setComments(currentComments || [])
        })
    }, [roomId])

    useEffect(() => {
        handleConnection.setupExecutionListeners(setIsExecuting)

        const handleRemoteCodeChange = (newCode) => {
            isRemoteChange.current = true
            setCode(newCode)
        }

        handleConnection.codeChangeListener(handleRemoteCodeChange)

        handleConnection.setupCommentListeners(
            (comment) => {
                setComments(prev => [...prev, comment])
            },
            (commentId) => {
                setComments(prev => prev.filter(c => c.id !== commentId))
            },
            null
        )
        return () => {
            handleConnection.cleanupCodeChangeListener()
            handleConnection.cleanupCommentListeners()
        }
    }, [])

    useEffect(() => {
        const view = editorRef.current?.view
        if (!view) return

        comments.forEach(comment => {
            if (comment.from !== undefined && comment.to !== undefined) {
                view.dispatch({
                    effects: addCommentMark.of({
                        id: comment.id,
                        from: comment.from,
                        to: comment.to
                    })
                })
            }
        })
    }, [comments])

    useEffect(() => {
        if (onCommentDataChange) {
            onCommentDataChange({
                comments,
                selection,
                showCommentInput,
                commentText,
                setShowCommentInput,
                setCommentText,
                handleAddComment,
                handleDeleteComment
            })
        }
    }, [
        comments,
        selection,
        showCommentInput,
        commentText,
    ])

    const handleChange = (value) => {

        if (!isHost) return

        setCode(value)

        if (!isRemoteChange.current) {
            handleConnection.emitCodeChange(roomId, value)
        }

        isRemoteChange.current = false
    }

    const handleSelectionChange = (viewUpdate) => {
        const { state } = viewUpdate
        const { from, to } = state.selection.main

        if (from !== to) {
            setSelection({
                from,
                to,
                text: state.sliceDoc(from, to)
            })
        } else {
            setSelection(null)
        }
    }

    const handleAddComment = () => {
        if (!selection || !commentText.trim()) return;

        const newComment = {
            id: `comment-${Date.now()}`,
            text: commentText,
            username: username,
            timestamp: Date.now(),
            ...(selection && {
                from: selection.from,
                to: selection.to,
                codeSnippet: selection.text
            })
        }

        handleConnection.emitAddComment(roomId, newComment)

        setCommentText("")
        setShowCommentInput(false)
        setSelection(null)
    }

    const handleDeleteComment = (commentId) => {

        const view = editorRef.current?.view

        if (view) {
            view.dispatch({
                effects: removeCommentMark.of(commentId)
            })
        }
        handleConnection.emitDeleteComment(roomId, commentId)
    }

    const executeCode = async () => {
        if (isExecuting || !code.trim()) return
        await handleConnection.runCode(code)
    }




    return (
        <div className="flex flex-col h-full relative overflow-hidden min-h-0 rounded-2xl">
            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="bg-gray-800 p-2 flex justify-between items-center">
                    <h3 className="text-white font-bold">Editor de Python</h3>
                    <div className="flex gap-2">
                        <button
                            className="bg-yellow-500 px-3 py-1 rounded text-sm"
                            onClick={() => setShowCommentInput(true)}
                        >
                            Comentar
                        </button>
                    </div>
                    <button
                        className={`px-4 py-1 rounded ${isExecuting ? "bg-gray-500 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
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
            </div>
        </div>
    )



}


export default CodeEditor