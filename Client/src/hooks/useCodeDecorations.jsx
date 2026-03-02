import { useEffect, useState, useCallback, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { addCommentMark, removeCommentMark, clearAllCommentMarks } from "../components/code-decorations";

export default function useCodeDecorations({ editorRef, comments }) {

    const [tempHighlightId, setTempHighlightId] = useState(null)
    const tempHighlightTimerRef = useRef(null)

    useEffect(() => {
        const view = editorRef.current?.view
        if (!view) return

        view.dispatch({effects:clearAllCommentMarks.of(null)})

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
    }, [comments, editorRef])

    useEffect(() => {
        if (!tempHighlightId) return;
        const view = editorRef.current?.view
        if (!view) return;
        const comment = comments.find(c => c.id === tempHighlightId)
        if (!comment) return;

        const tempId = `temp-${tempHighlightId}`

        view.dispatch({
            effects: addCommentMark.of({
                id: tempId,
                from: comment.from,
                to: comment.to,
                tag: "temp-highlight"
            })
        })

        if (tempHighlightTimerRef.current) {
            clearTimeout(tempHighlightTimerRef.current)
        }


        tempHighlightTimerRef.current = setTimeout(() => {
            view.dispatch({
                effects: removeCommentMark.of(tempId)
            })
            setTempHighlightId(null)
            tempHighlightTimerRef.current = null
        }, 2000)

        return () => {
            if (tempHighlightTimerRef.current) {
                clearTimeout(tempHighlightTimerRef.current)
            }
            view.dispatch({effects: removeCommentMark.of(tempId)})
        }
    }, [tempHighlightId, comments, editorRef])

    const removeCommentHighlight = useCallback((commentId) => {
        const view = editorRef?.current?.view
        if(!view) return;
        
        view.dispatch({
            effects: removeCommentMark.of(commentId)
        })
    }, [editorRef])


    const focusOnComment = useCallback((commentId) => {
        const comment = comments.find(c => c.id === commentId)
        if (!comment || comment.from === undefined || comment.to === undefined) return;

        const view = editorRef.current?.view
        if (!view) return;

        view.dispatch({
            effects: EditorView.scrollIntoView(comment.from, {
                y: "center",
                yMargin: 100
            })
        })

        view.dispatch({
            selection: { anchor: comment.from, head: comment.from }
        })

        view.focus()

        setTempHighlightId(commentId)
    }, [comments, editorRef])

    return { focusOnComment, removeCommentHighlight}

}