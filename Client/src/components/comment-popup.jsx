import expressions from "../auxiliar/expressions"

function CommentPopup({
    selectedTag,
    selection,
    commentText,
    setCommentText,
    showCommentInput,
    setShowCommentInput,
    handleAddComment
}) {

    const handleCancel = () => {
        setShowCommentInput(false)
        setCommentText("")
    }

    const handleSubmit = () => {
        handleAddComment(selectedTag, commentText)
        setCommentText("")
        setShowCommentInput(false)
    }

    return (
        <>
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
            )
            }
        </>
    )
}

export default CommentPopup