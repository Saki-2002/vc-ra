import { useEffect, useRef, useState, useCallback } from "react";
import * as codeEditorConnection from "../logic/connectionCodeEditor"

export default function useComments({ roomId, username, onCommentDataChange, comments, setComments }) {

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


    const handleAddComment = useCallback((tag = null, commentText = "") => {
        const currentSelection = selectionRef.current
        const currentSelectedTag = selectedTagRef.current

        if (!currentSelection) {
            return
        }

        const effectiveTag = currentSelectedTag.current || tag || null
        const finalText = commentText.trim() || ""

        const newComment = {
            id: `comment-${Date.now()}`,
            text: finalText,
            username,
            timestamp: Date.now(),
            tag: effectiveTag,
            from: currentSelection.from,
            to: currentSelection.to,
            codeSnippet: currentSelection.text
        }

        codeEditorConnection.emitAddComment(roomId, newComment)

        setSelectedTag(null)
        setSelection(null)

    }, [username, roomId])


    const handleDeleteComment = useCallback((commentId) => {
        codeEditorConnection.emitDeleteComment(roomId, commentId)
    }, [roomId])
    
    return {
        handleAddComment,
        handleDeleteComment,
        setSelection,
        selection,
        setSelectedTag,
        selectedTag
    }

}
