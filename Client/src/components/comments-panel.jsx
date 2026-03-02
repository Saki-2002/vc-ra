import { useState } from "react"
import CommentsToolbar from "./comments-toolbar"
import CommentsFilters from "./comments-filters"
import useComments from "../hooks/useComments"
import useCodeDecorations from "../hooks/useCodeDecorations"
import useReactions from "../hooks/useReactions"
import CommentBox from "./comment-box"
import expressions from "../auxiliar/expressions"
import CommentPopup from "./comment-popup"

function CommentsPanel({
    roomId,
    username,
    onCommentDataChange,
    comments,
    setComments,
    selectedTag,
    setSelectedTag,
    isHost,
    editorRef,
    selection,
    handleReaction,
    handleAddComment,
    handleDeleteComment
}) {

    const [showCommentInput, setShowCommentInput] = useState(null)

    const {
        focusOnComment,
        removeCommentHighlight
    } = useCodeDecorations({
        editorRef,
        comments
    })

    const [commentText, setCommentText] = useState("")
    const [activeFilters, setActiveFilters] = useState([])

    const deleteAndUnmarkComment = (commentId) => {
        removeCommentHighlight(commentId)
        handleDeleteComment(commentId)
    }

    const filteredComments = activeFilters.length === 0
        ? comments
        : comments.filter(comment => activeFilters.includes(comment.tag))

    return (
        <>
            {/* Panel lateral de comentarios */}
            <div className="w-full bg-gray-900 p-3 overflow-y-auto border-l border-gray-700 rounded-2xl h-full">
                <CommentsToolbar
                    roomId={roomId}
                    selection={selection}
                    setShowCommentInput={setShowCommentInput}
                    setSelectedTag={setSelectedTag}
                    handleReaction={handleReaction}
                />
                <CommentsFilters
                    comments={comments}
                    activeFilters={activeFilters}
                    setActiveFilters={setActiveFilters}
                    filteredComments={filteredComments}
                />

                <h4 className="text-white font-bold mb-3 text-sm">
                    Comentarios ({filteredComments.length})
                </h4>

                <div className="flex-1 overflow-y-auto">
                    {filteredComments.length === 0 ? (
                        <p className="text-gray-500 text-xs italic">
                            {activeFilters.length > 0
                                ? "No hay comentarios con estos filtros"
                                : "Selecciona código y haz click en un botón de reacción"}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {filteredComments.map(comment => (
                                <CommentBox
                                    key={comment.id}
                                    comment={comment}
                                    focusOnComment={focusOnComment}
                                    handleDeleteComment={deleteAndUnmarkComment}
                                    isHost={isHost}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <CommentPopup
                selectedTag={selectedTag}
                selection={selection}
                commentText={commentText}
                setCommentText={setCommentText}
                showCommentInput={showCommentInput}
                setShowCommentInput={setShowCommentInput}
                handleAddComment={handleAddComment}
            />

        </>
    )
}

export default CommentsPanel