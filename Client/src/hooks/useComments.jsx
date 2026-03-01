import { useEffect, useRef, useState, useCallback } from "react";
import * as codeEditorConnection from "../logic/connectionCodeEditor"

export default function useComments({ roomId, username, onCommentDataChange }) {

    const [comments, setComments] = useState([])
    const [selection, setSelection] = useState(null)
    const [showCommentInput, setShowCommentInput] = useState(false)
    const [selectedTag, setSelectedTag] = useState(null)

    const selectionRef = useRef(null)
    const showCommentInputRef = useRef(false)
    const selectedTagRef = useRef(null)
    const lastSelectionRef = useRef({ from: null, to: null })

    //Cambiar selección
    useEffect(() => {
        selectionRef.current = selection
    }, [selection])

    //Cambiar mensaje del Comentario 
    useEffect(() => {
        showCommentInputRef.current = showCommentInput
    }, [showCommentInput])

    //Cambiar tag seleccionada
    useEffect(() => {
        selectedTagRef.current = selectedTag
    }, [selectedTag])

    //Setup de Listeners

    useEffect(() => {

        codeEditorConnection.setupCommentListeners(
            (comment) => setComments(prev => [...prev, comment]),
            (commentId) => setComments(prev => prev.filter(c => c.id !== commentId))
        )

        return () => {
            codeEditorConnection.cleanupCommentListeners()
        }
    }, [])


    const handleAddComment = useCallback((tag = null, commentText = "", handleReaction) => {
        const currentSelection = selectionRef.current
        const currentShowCommentInput = showCommentInputRef.current
        const currentSelectedTag = selectedTagRef.current

        if (!currentSelection) {
            if (handleReaction) handleReaction(tag)
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

        codeEditorConnection.emitAddComment(roomId, newComment)

        setSelectedTag(null)
        setShowCommentInput(false)
        setSelection(null)
        lastSelectionRef.current = { from: null, to: null }

    }, [username, roomId])


    const handleDeleteComment = useCallback((commentId) => {
        codeEditorConnection.emitDeleteComment(roomId, commentId)
    }, [roomId])


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
                focusOnComment
            })
        }
    }, [
        comments,
        selection,
        showCommentInput,
        selectedTag,
        onCommentDataChange,
    ])

    
    return {
        comments,
        selection,
        showCommentInput,
        selectedTag,
        handleAddComment,
        handleDeleteComment
    }

}
