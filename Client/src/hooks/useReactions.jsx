import { useCallback, useEffect, useRef, useState } from "react";
import * as handleConnection from "../logic/connectionCodeEditor"
import expressions from "../auxiliar/expressions";


export default function useReactions(roomId) {

    const [floatingEmojis, setFloatingEmojis] = useState([])
    const usedReactionRef = useRef(false)


    //showFloatingEmoji
    //Muestra el Emoji Flotante
    const showFloatingEmoji = useCallback((reaction) => {
        console.log(expressions[reaction.tag]?.emoji)
        const emoji = expressions[reaction.tag]?.emoji || "💬"
        const id = Date.now() + Math.random()
        const newEmoji = {
            id,
            emoji,
            tag: reaction?.tag,
            x: Math.random() * 70 + 15,
            y: Math.random() * 60 + 20
        }

        setFloatingEmojis(prev => [...prev, newEmoji])

        setTimeout(() => {
            setFloatingEmojis(prev => prev.filter(e => e.id !== id))
        }, 3000)
    }, [])

    //handleReaction
    //Previene Spam de reacciones
    const handleReaction = useCallback((tag) => {

        //Si ya se ha usado una reacción, no la procesa
        if (usedReactionRef.current) {
            return
        }
        //Establece que se ha usado una reacción
        usedReactionRef.current = true

        handleConnection.emitReaction(roomId, { tag })

        //Luego de 2 segundos, se permite enviar otra reacción
        setTimeout(() => {
            usedReactionRef.current = false
        }, 2000)
    }, [roomId])

    //Setup Listener, para mostrarla a todos los participantes
    useEffect(() => {
        handleConnection.setupReactionListener(showFloatingEmoji)
        return () => {
            handleConnection.cleanupReactionListener()
        }
    }, [])

    return {
        floatingEmojis,
        handleReaction
    }
}