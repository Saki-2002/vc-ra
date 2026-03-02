import { useState } from "react"
import CommentsToolbar from "./comments-toolbar"
import CommentsFilters from "./comments-filters"
import useComments from "../hooks/useComments"
import useCodeDecorations from "../hooks/useCodeDecorations"
import useReactions from "../hooks/useReactions"
import CommentBox from "./comment-box"
import expressions from "../auxiliar/expressions"

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

    const handleCancel = () => {
        setShowCommentInput(false)
        setCommentText("")
    }

    const handleSubmit = () => {
        handleAddComment(selectedTag, commentText)
        setCommentText("")
        setShowCommentInput(false)
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
                    handleAddComment={handleAddComment}
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

            {/* Modal para agregar comentario */}
            {showCommentInput && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-5 rounded-lg w-96 shadow-2xl">
                        <div className="w-full h-full flex justify-center items-center gap-10">
                            <h3 className="text-white font-bold mb-3 text-lg">
                                Agregar Comentario
                            </h3>
                            <h3 className={`${expressions[selectedTag]?.color} text-white font-bold mb-3 text-lg`}>
                                {selectedTag}
                            </h3>
                        </div>
                        {/* Vista previa del código seleccionado */}
                        <div className="bg-gray-900 p-3 rounded mb-3 max-h-32 overflow-auto">
                            <p className="text-gray-400 text-xs mb-1">Código seleccionado:</p>
                            <code className="text-blue-300 text-sm whitespace-pre-wrap">
                                {selection?.text}
                            </code>
                        </div>

                        {/* Área de texto para el comentario */}
                        <textarea
                            className="w-full bg-gray-700 text-white p-3 rounded mb-3 outline-none resize-none focus:ring-2 focus:ring-blue-500"
                            rows="4"
                            placeholder="Escribe tu comentario..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            autoFocus
                        />

                        {/* Botones de acción */}
                        <div className="flex gap-2 justify-end">
                            <button
                                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white text-sm transition-colors"
                                onClick={handleCancel}
                            >
                                Cancelar
                            </button>
                            <button
                                className="px-4 py-2 rounded text-white text-sm transition-colors bg-blue-500 hover:bg-blue-600"
                                onClick={handleSubmit}
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default CommentsPanel