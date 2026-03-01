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

export default Reactions