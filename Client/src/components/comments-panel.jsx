import { useState } from "react"
import CommentsToolbar from "./comments-toolbar"
import CommentsFilters from "./comments-filters"
import useCodeDecorations from "../hooks/useCodeDecorations"
import CommentBox from "./comment-box"
import CommentPopup from "./comment-popup"
import PropTypes from "prop-types"

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

CommentsPanel.propTypes = {
    roomId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    onCommentDataChange: PropTypes.func,
    comments: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            text: PropTypes.string,
            tag: PropTypes.string,
            codeSnippet: PropTypes.string,
            username: PropTypes.string,
            timestamp: PropTypes.number
        })
    ).isRequired,
    setComments: PropTypes.func.isRequired,
    selectedTag: PropTypes.string,
    setSelectedTag: PropTypes.func.isRequired,
    isHost: PropTypes.bool.isRequired,
    editorRef: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.shape({ current: PropTypes.any })
    ]),
    selection: PropTypes.shape({
        text: PropTypes.string,
        from: PropTypes.number,
        to: PropTypes.number
    }),
    handleReaction: PropTypes.func.isRequired,
    handleAddComment: PropTypes.func.isRequired,
    handleDeleteComment: PropTypes.func.isRequired
}

CommentsPanel.defaultProps = {
    onCommentDataChange: () => {},
    selectedTag: null,
    selection: null,
    editorRef: null
}

export default CommentsPanel