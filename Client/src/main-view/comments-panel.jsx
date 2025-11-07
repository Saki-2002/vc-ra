function CommentsPanel({ 
    comments =[], 
    selection, 
    showCommentInput, 
    commentText, 
    setShowCommentInput, 
    setCommentText, 
    handleAddComment, 
    handleDeleteComment 
}) {
    return (
        <>
            {/* Panel lateral de comentarios */}
            <div className="w-64 bg-gray-900 p-3 overflow-y-auto border-l border-gray-700">
                <h4 className="text-white font-bold mb-3 text-sm">
                    Comentarios ({comments.length})
                </h4>
                
                {comments.length === 0 ? (
                    <p className="text-gray-500 text-xs italic">
                        Selecciona código y haz click en "Comentar"
                    </p>
                ) : (
                    <div className="space-y-2">
                        {comments.map(comment => (
                            <div
                                key={comment.id}
                                className="bg-gray-800 p-2 rounded text-xs hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-yellow-400 font-semibold">💬</span>
                                    <button
                                        className="text-red-400 hover:text-red-600 text-lg leading-none"
                                        onClick={() => handleDeleteComment(comment.id)}
                                        title="Eliminar comentario"
                                    >
                                        ×
                                    </button>
                                </div>
                                <p className="text-white mb-2 break-words">
                                    {comment.text}
                                </p>
                                <code className="text-blue-300 text-xs block bg-gray-900 p-1 rounded overflow-x-auto">
                                    {comment.codeSnippet}
                                </code>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal para agregar comentario */}
            {showCommentInput && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-5 rounded-lg w-96 shadow-2xl">
                        <h3 className="text-white font-bold mb-3 text-lg">
                            Agregar Comentario
                        </h3>
                        
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
                                onClick={() => {
                                    setShowCommentInput(false)
                                    setCommentText("")
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                className={`px-4 py-2 rounded text-white text-sm transition-colors ${
                                    commentText.trim() 
                                        ? "bg-blue-500 hover:bg-blue-600" 
                                        : "bg-blue-300 cursor-not-allowed"
                                }`}
                                onClick={handleAddComment}
                                disabled={!commentText.trim()}
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