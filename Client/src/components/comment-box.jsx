import expressions from "../auxiliar/expressions"
import PropTypes from "prop-types"

function CommentBox({ comment, focusOnComment, handleDeleteComment, isHost }) {

    return (
        <div
            key={comment.id}
            className="bg-gray-800 p-2 rounded text-xs hover:bg-gray-700 transition-colors"
            onClick={() => focusOnComment && focusOnComment(comment.id)}
        >
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-yellow-400">
                        {expressions[comment.tag]?.emoji || "💬"}
                    </span>
                    {comment.tag && (
                        <span className={`${expressions[comment.tag]?.color || "bg-gray-500"} text-white text-[10px] px-2 py-0.5 rounded-full font-semibold`}>
                            {comment.tag}
                        </span>
                    )}
                </div>
                {isHost && (
                    <button
                        className="text-green-400 hover:text-green-500 text-lg leading-none"
                        onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteComment(comment.id)
                        }
                        }
                        title="Marcar como Resuelto"
                    >
                        ✓
                    </button>
                )}
            </div>
            {comment.text && (
                <p className="text-white mb-2 break-words">
                    {comment.text}
                </p>
            )}
            {comment.codeSnippet && (
                <code className="text-blue-300 text-xs block bg-gray-900 p-1 rounded overflow-x-auto">
                    {comment.codeSnippet}
                </code>
            )}
        </div>
    )
}

CommentBox.propTypes = {
    comment: PropTypes.shape({
        id: PropTypes.string.isRequired,
        text: PropTypes.string,
        tag: PropTypes.string,
        codeSnippet: PropTypes.string,
        username: PropTypes.string,
        timestamp: PropTypes.number
    }).isRequired,
    focusOnComment: PropTypes.func,
    handleDeleteComment: PropTypes.func.isRequired,
    isHost: PropTypes.bool.isRequired
}

CommentBox.defaultProps = {
    focusOnComment: null
}


export default CommentBox