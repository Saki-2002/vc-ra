import { useState, useEffect } from "react";
import * as videoConferenceConnection from "../logic/connectionVideoConference"
import * as codeEditorConnection from "../logic/connectionCodeEditor"
import useReactions from "./useReactions";

export default function useInitializeRoom(roomId) {

    const [cargando, setCargando] = useState(true)
    const [remoteStreams, setRemoteStreams] = useState(new Map())
    const [remotePeers, setRemotePeers] = useState(new Map())
    const [code, setCode] = useState("")
    const [comments, setComments] = useState([])
    const [isExecuting, setIsExecuting] = useState(false)

    //(async) initializeVideoConference
    //Entradas: Ninguna
    //Uso: Inicializa la sala actualizando los streams remotos y preparando los streams locales
    //Salida: Ninguna
    const initializeVideoConference = async () => {
        try {
            //Actualiza los streams remotos
            videoConferenceConnection.setMediaTracksUpdateCallback((updatedTracks) => {
                console.log("Actualizando streams remotos:", updatedTracks.size)
                setRemoteStreams(new Map(updatedTracks))
            })

            //Actualiza la lista de peers
            videoConferenceConnection.setPeersUpdateCallback((updatedPeers) => {
                setRemotePeers(new Map(updatedPeers))
            })

            //Se llama a createConsumers
            await videoConferenceConnection.createConsumers()
            setRemoteStreams(videoConferenceConnection.getMediaTracks())
            setRemotePeers(videoConferenceConnection.getPeers())
            setCargando(false)
        } catch (err) {
            console.error("Error al Inicializar Room. Por favor volver a cargar la página")
        }
    }

    //Se pide el código y listado de comentarios actuales de la sala
    const requestCodeAndComments = () => {
        codeEditorConnection.requestCurrentCode(roomId, (currentCode) => {
            setCode(currentCode || "")
        })

        codeEditorConnection.requestCurrentComments(roomId, (currentComments) => {
            setComments(currentComments || [])
        })
    }

    useEffect(() => {

        initializeVideoConference()
        requestCodeAndComments()

        return () => {
            videoConferenceConnection.setMediaTracksUpdateCallback(null)
            videoConferenceConnection.setPeersUpdateCallback(null)
        }

    }, [roomId])

    return {
        cargando,
        remoteStreams,
        remotePeers,
        code,
        setCode,
        comments,
        setComments,
        isExecuting
    }

}

