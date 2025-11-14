import CodeMirror from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"
import { useEffect, useRef, useState, useCallback } from "react"
import * as handleConnection from "../logic/connectionCodeEditor"
import { EditorView, Decoration } from "@codemirror/view"
import { StateField, StateEffect } from "@codemirror/state"
import { EditorState } from "@codemirror/state"

const addCommentMark = StateEffect.define()
const removeCommentMark = StateEffect.define()

const getHighlightClass = (tag) => {
    const classMap = {
        "Confusion": "comment-highlight-yellow",
        "Velocidad": "comment-highlight-orange",
        "Entendido": "comment-highlight-green",
        "Repetir": "comment-highlight-cyan",
    }
    return classMap[tag] || "comment-highlight"
}

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
                        class: getHighlightClass(effect.value.tag),
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
    const [selectedTag, setSelectedTag] = useState(null)

    const selectionRef = useRef(null)
    const showCommentInputRef = useRef(false)
    const selectedTagRef = useRef(null)

    useEffect(() => {
        selectionRef.current = selection
    }, [selection])
    
    useEffect(() => {
        showCommentInputRef.current = showCommentInput
    }, [showCommentInput])

    useEffect(() => {
        selectedTagRef.current = selectedTag
    }, [selectedTag])

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
                        to: comment.to,
                        tag: comment.tag
                    })
                })
            }
        })
    }, [comments])

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

    const handleAddComment = useCallback((tag = null, commentText = "") => {

        const currentSelection = selectionRef.current
        const currentShowCommentInput = showCommentInputRef.current
        const currentSelectedTag = selectedTagRef.current

        if (!currentSelection) {
            handleReaction(tag)
            return
        }

        if (tag && !currentShowCommentInput) {
            setSelectedTag(tag)
            setShowCommentInput(true)
            return
        }

        const effectiveTag = currentSelectedTag || tag || null

        const finalText = commentText.trim() || ""

        const newComment = {
            id: `comment-${Date.now()}`,
            text: finalText,
            username: username,
            timestamp: Date.now(),
            tag: effectiveTag,
            from: currentSelection.from,
            to: currentSelection.to,
            codeSnippet: currentSelection.text
        }

        handleConnection.emitAddComment(roomId, newComment)

        setSelectedTag(null)
        setShowCommentInput(false)
        setSelection(null)

    }, [username, roomId])

    const handleReaction = useCallback((tag) => {
        console.log("TAG: ", tag)
    }, [])

    const handleDeleteComment = useCallback((commentId) => {

        const view = editorRef.current?.view

        if (view) {
            view.dispatch({
                effects: removeCommentMark.of(commentId)
            })
        }
        handleConnection.emitDeleteComment(roomId, commentId)
    }, [roomId])

    const executeCode = async () => {
        if (isExecuting || !code.trim()) return
        await handleConnection.runCode(code)
    }



    useEffect(() => {
        if (onCommentDataChange) {
            onCommentDataChange({
                comments,
                selection,
                showCommentInput,
                selectedTag,
                setShowCommentInput,
                handleAddComment,
                handleDeleteComment,
                handleReaction
            })
        }
    }, [
        comments,
        selection,
        showCommentInput,
        selectedTag,
        onCommentDataChange
    ])

    return (
        <div className="flex flex-col h-full relative overflow-hidden min-h-0 rounded-2xl">
            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="bg-gray-800 p-2 flex justify-between items-center">
                    <h3 className="text-white font-bold">Editor de Python</h3>
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
                        highlightSelectionMatches: false,
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