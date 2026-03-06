import expressions from "../auxiliar/expressions"
import PropTypes from "prop-types"

function CommentsFilters({ comments, activeFilters, setActiveFilters, filteredComments }) {

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


    return (
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
                {Object.values(expressions).map((btn) => {
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
    )
}

CommentsFilters.propTypes = {
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
    activeFilters: PropTypes.arrayOf(PropTypes.string).isRequired,
    setActiveFilters: PropTypes.func.isRequired,
    filteredComments: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            text: PropTypes.string,
            tag: PropTypes.string,
            codeSnippet: PropTypes.string,
            username: PropTypes.string,
            timestamp: PropTypes.number
        })
    ).isRequired
}

export default CommentsFilters