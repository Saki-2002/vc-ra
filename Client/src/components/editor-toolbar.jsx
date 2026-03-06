import PropTypes from "prop-types"

function EditorToolbar({ isExecuting, onExecute }) {
    return (
        <div className="bg-gray-800 p-2 flex justify-between items-center">
            <h3 className="text-white font-bold">Editor de Python</h3>
            <button
                className={`px-4 py-1 rounded ${isExecuting ? "bg-gray-500 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
                    }`}
                onClick={onExecute}
                disabled={isExecuting}
            >
                {isExecuting ? "⏳" : "▶️"}
            </button>
        </div>
    )
}

EditorToolbar.propTypes = {
    isExecuting: PropTypes.bool.isRequired,
    onExecute: PropTypes.func.isRequired
}

export default EditorToolbar