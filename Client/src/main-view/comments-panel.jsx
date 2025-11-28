import { useState } from "react"

function CommentsPanel({
    comments = [],
    selection,
    showCommentInput,
    setShowCommentInput,
    handleAddComment,
    handleDeleteComment,
    handleReaction,
    selectedTag,
    isHost,
    focusOnComment
}) {

    const [commentText, setCommentText] = useState("")
    const [activeFilters, setActiveFilters] = useState([])

    const reactionButtons = [
        { emoji: "🤔", tag: "No entendí", color: "bg-yellow-500/70", hoverColor: "hover:bg-yellow-600/100", title: "No entendí" },
        { emoji: "🏃", tag: "Va muy rápido", color: "bg-orange-500/70", hoverColor: "hover:bg-orange-600/100", title: "Va muy rápido" },
        { emoji: "✅", tag: "Todo claro", color: "bg-green-500/70", hoverColor: "hover:bg-green-600/100", title: "Todo claro" },
        { emoji: "🔁", tag: "Volver a explicar", color: "bg-cyan-500/70", hoverColor: "hover:bg-cyan-600/100", title: "Volver a explicar" },
    ]

    const getTagColor = (tag) => {
        const button = reactionButtons.find(btn => btn.tag === tag)
        return button ? button.color : "bg-gray-500"
    }

    const getEmoji = (tag) => {

        if (tag === null) {
            return "💬"
        }
        const emojis = {
            "No entendí": "🤔",
            "Va muy rápido": "🏃",
            "Todo claro": "✅",
            "Volver a explicar": "🔁"
        }
        return emojis[tag]
    }

    const handleCancel = () => {
        setShowCommentInput(false)
        setCommentText("")
    }

    const handleSubmit = () => {
        handleAddComment(null, commentText)
        setCommentText("")
    }

    const toggleFilter = (tag) => {
        setActiveFilters(prev => {
            if (prev.includes(tag)) {
                return prev.filter(t => t !== tag)
            } else {
                return [...prev, tag]
            }
        })
    }

    const clearFilters = () => {
        setActiveFilters([])
    }

    const filteredComments = activeFilters.length === 0
        ? comments
        : comments.filter(comment => activeFilters.includes(comment.tag))

    return (
        <>
            {/* Panel lateral de comentarios */}
            <div className="w-full bg-gray-900 p-3 overflow-y-auto border-l border-gray-700 rounded-2xl h-full">
                <div className="flex h-1/6">
                    <div className="w-1/3 h-full items-center justify-center flex">
                        {selection &&
                            <h1 className="bg-cyan-500 rounded-2xl text-center items-center justify-center flex w-5/6 ">
                                Selección
                            </h1>
                        }
                    </div>
                    <div className="w-2/3 h-full items-center justify-center flex gap-2">
                        {/* Buttons */}
                        {reactionButtons.map((btn) => (
                            <button
                                key={btn.tag}
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors ${btn.color} ${btn.hoverColor}`}
                                title={btn.title}
                                onClick={() => {
                                    handleAddComment(btn.tag)
                                }}
                            >
                                {btn.emoji}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-3 pb-3 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <h5 className="text-gray-400 text-xs font-semibold">
                            Filtrar por:
                        </h5>
                        {activeFilters.length > 0 && (
                            <button
                                className="text-xs text-blue-400 hover:text-blue-300"
                                onClick={clearFilters}
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {reactionButtons.map((btn) => {
                            const isActive = activeFilters.includes(btn.tag)
                            return (
                                <button
                                    key={`filter-${btn.tag}`}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${isActive
                                            ? `${btn.color} text-white ring-2 ring-white`
                                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                        }`}
                                    onClick={() => toggleFilter(btn.tag)}
                                >
                                    {btn.emoji} {btn.tag}
                                </button>
                            )
                        })}
                    </div>
                    {activeFilters.length > 0 && (
                        <p className="text-gray-500 text-xs mt-2">
                            Mostrando {filteredComments.length} de {comments.length} comentarios
                        </p>
                    )}
                </div>

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
                                <div
                                    key={comment.id}
                                    className="bg-gray-800 p-2 rounded text-xs hover:bg-gray-700 transition-colors"
                                    onClick={() => focusOnComment && focusOnComment(comment.id)}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-yellow-400">
                                                {getEmoji(comment.tag)}
                                            </span>
                                            {comment.tag && (
                                                <span className={`${getTagColor(comment.tag)} text-white text-[10px] px-2 py-0.5 rounded-full font-semibold`}>
                                                    {comment.tag}
                                                </span>
                                            )}
                                        </div>
                                        {isHost && (
                                            <button
                                                className="text-green-400 hover:text-green-500 text-lg leading-none"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteComment(comment.id)}
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
                            <h3 className={`${getTagColor(selectedTag)} text-white font-bold mb-3 text-lg`}>
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