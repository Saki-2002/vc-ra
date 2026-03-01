import { useEffect, useRef } from "react";

function RemoteVideo({ stream, videoEnabled, audioEnabled, username }) {

    const videoRef = useRef(null)
    const audioRef = useRef(null)

    useEffect(() => {
        if (videoRef.current) {
            if (stream && videoEnabled) {
                if (videoRef.current.srcObject !== stream) videoRef.current.srcObject = stream
            } else {
                videoRef.current.srcObject = null
            }

        }

        if (audioRef.current) {
            if (stream && audioEnabled) {
                if (audioRef.current.srcObject !== stream) audioRef.current.srcObject = stream
            } else {
                audioRef.current.srcObject = null
            }

        }
    }, [stream, videoEnabled, audioEnabled])


    return (

        <div className="w-40 bg-opacity-30 bg-gray-300 rounded-xl">
            <div className="m-3 h-40 bg-gray-700 relative rounded-lg overflow-hidden">
                {videoEnabled ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={!audioEnabled}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="text-white text-wrap font-semibold text-2xl w-full h-full flex items-center text-center bg-gray-700">
                        Cámara Apagada
                    </div>
                )}

            </div>

            <audio
                ref={audioRef}
                autoPlay
                muted={!audioEnabled}
            />
            <div className="text-base mt-1 w-full text-center text-black font-semibold">
                {username ?? "Peer"}
            </div>

        </div>

    )

}

export default RemoteVideo