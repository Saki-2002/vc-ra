import { useEffect, useState } from "react"
import * as videoConferenceConnection from "../logic/connectionVideoConference"

function useLocalVideo() {

    const [isAudioOn, setIsAudioOn] = useState(false)
    const [isVideoOn, setIsVideoOn] = useState(false)
    const [isProducing, setIsProducing] = useState(false)
    const [localStream, setLocalStream] = useState(null)


    const produceFirstTime = async () => {
        try {

            const { audioTrack, videoTrack } = await videoConferenceConnection.produce()

            const stream = new MediaStream()

            if (audioTrack) stream.addTrack(audioTrack);
            if (videoTrack) stream.addTrack(videoTrack);

            setLocalStream(stream)
            setIsAudioOn(!!audioTrack)
            setIsVideoOn(!!videoTrack)

            setIsProducing(true)

        } catch (err) {
            console.error("Error en produceFirstTime. ", err)
            setIsProducing(false)
        }


    }


    const toggleAudio = async () => {
        if (!isProducing) {
            await produceFirstTime()
            return
        }

        try {
            const result = await videoConferenceConnection.toggleAudio()
            if (result.success) {
                setIsAudioOn(result.state)

                if (localStream) {
                    const audioTrack = localStream.getAudioTracks()[0]
                    if (audioTrack) {
                        audioTrack.enabled = result.state
                    }
                }
            }
        } catch (err) {
            console.error("Error al toggle audio. ", err)
        }
    }

    const toggleVideo = async () => {
        if (!isProducing) {
            await produceFirstTime()
            return
        }

        try {
            const result = await videoConferenceConnection.toggleVideo()
            if (result.success) {
                setIsVideoOn(result.state)

                if (localStream) {
                    const videoTrack = localStream.getVideoTracks()[0]
                    if (videoTrack) {
                        videoTrack.enabled = result.state
                    }
                }
            }
        } catch (err) {
            console.error("Error al toggle video. ", err)
        }

    }

    useEffect(() => {
        return () => {
            if(localStream) {
                localStream.getTracks().forEach((t) => t.stop())
            }
        }
    }, [localStream])

    return {
        localStream,
        isAudioOn,
        isVideoOn,
        isProducing,
        produceFirstTime,
        toggleAudio,
        toggleVideo
    }

}

export default useLocalVideo