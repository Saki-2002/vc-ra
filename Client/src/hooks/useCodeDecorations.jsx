import { useEffect, useState, useCallback } from "react";
import { EditorView } from "@codemirror/view";
import { addCommentMark, removeCommentMark } from "../components/code-decorations";

export default function useCodeDecorations({ editorRef, comments }) {

    const [tempHighlightId, setTempHighlightId] = useState(null)

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

     useEffect(() => {
        if (!tempHighlightId) return;
        const view = editorRef.current?.view
        if (!view) return;
        const comment = comments.find(c => c.id === tempHighlightId)
        if (!comment) return;

        view.dispatch({
            effects: addCommentMark.of({
                id: `temp-${tempHighlightId}`,
                from: comment.from,
                to: comment.to,
                tag: "temp-highlight"
            })
        })

        const timer = setTimeout(() => {
            view.dispatch({
                effects: removeCommentMark.of(`temp-${tempHighlightId}`)
            })
            setTempHighlightId(null)
        }, 2000)

        return () => clearTimeout(timer)
    }, [tempHighlightId])



    const focusOnComment = useCallback((commentId) => {
        const comment = comments.find(c => c.id === commentId)
        if (!comment) return;

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
    }, [comments])

    return (
        focusOnComment
    )

}