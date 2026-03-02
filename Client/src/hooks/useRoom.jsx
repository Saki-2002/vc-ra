import { useState, useEffect, useCallback } from "react";
import * as videoConferenceConnection from "../logic/connectionVideoConference"
import * as codeEditorConnection from "../logic/connectionCodeEditor"
import useReactions from "./useReactions";

export default function useRoom(roomId) {

    const [cargando, setCargando] = useState(true)
    const [remoteStreams, setRemoteStreams] = useState(new Map())
    const [remotePeers, setRemotePeers] = useState(new Map())
    const [code, setCode] = useState("")
    const [comments, setComments] = useState([])

    const [commentData, setCommentData] = useState({
        comments: [],
        selection: null,
        showCommentInput: false,
        commentText: "",
        selectedTag: null,
        setShowCommentInput: () => { },
        setCommentText: () => { },
        handleAddComment: () => { },
        handleDeleteComment: () => { },
        handleReaction: () => { }
    })


    const initializeRoom = async () => {
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

            //Se pide el código y listado de comentarios actuales de la sala
            codeEditorConnection.requestCurrentCode(roomId, (currentCode) => {
                setCode(currentCode || "")
            })

            codeEditorConnection.requestCurrentComments(roomId, (currentComments) => {
                setComments(currentComments || [])
            })

            setCargando(false)
        } catch (err) {
            console.error("Error al inicializar Room.", err)
            setCargando(false)
        }
    }

    //Inicializar videoconferencia y obtener código y comentarios
    useEffect(() => {
        initializeRoom()

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
        setComments
    }
}