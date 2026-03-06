import PropTypes from "prop-types"

function Reactions({ items }) {
    return (
        <>
            {items.map((emoji) => (
                <div
                    key={emoji.id}
                    className="fixed z-50 pointer-events-none animate-float-up"
                    style={{
                        left: `${emoji.x}%`,
                        top: `${emoji.y}%`
                    }}
                >
                    <div className="text-5xl drop-shadow-[0_6px_16px-rgba(0,0,0,0.9)]">
                        {emoji.emoji}
                    </div>
                </div>
            ))}
        </>
    )
}

Reactions.propTypes = {
    items: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            emoji: PropTypes.string.isRequired,
            x: PropTypes.number.isRequired,
            y: PropTypes.number.isRequired,
            tag: PropTypes.string
        })
    ).isRequired
}

export default Reactions