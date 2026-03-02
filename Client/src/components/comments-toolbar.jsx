import expressions from "../auxiliar/expressions"
import useReactions from "../hooks/useReactions"
import useComments from "../hooks/useComments"

function CommentsToolbar({ setShowCommentInput, selection, setSelectedTag, handleReaction }) {

    const handleButtonClick = (tag) => {
        setSelectedTag(tag)
        if (!selection) {
            handleReaction(tag)
        } else {
            setShowCommentInput(true)
        }
    }

    return (
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
                {Object.values(expressions).map((btn) => (
                    <button
                        key={btn.tag}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors ${btn.color} ${btn.hoverColor}`}
                        title={btn.title}
                        onClick={() => 
                            handleButtonClick(btn.tag)
                        }
                    >
                        {btn.emoji}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default CommentsToolbar