import { useEffect, useRef, useState} from "react"

function RemoteVideo({ stream, videoEnabled, audioEnabled, username }) {
    const videoRef = useRef(null)
    const lastStreamRef = useRef(null)
    const [filteredStream, setFilteredStream] = useState(null)

    useEffect(() => {
        console.log("stream:", stream)
        if (stream instanceof MediaStream) {
            const videoTracks = stream.getVideoTracks()
            const audioTracks = stream.getAudioTracks()
            console.log('[REMOTE-VIDEO] user:', username, 'videoTracks:', videoTracks, 'audioTracks:', audioTracks)
            // Solo crea el filteredStream si el stream original cambia
            const newFilteredStream = new MediaStream()
            if (videoTracks[0]) newFilteredStream.addTrack(videoTracks[0])
            if (audioTracks[0]) newFilteredStream.addTrack(audioTracks[0])
            setFilteredStream(newFilteredStream)
        } else {
            setFilteredStream(null)
        }
    }, [stream])

    useEffect(() => {
        const videoEl = videoRef.current
        if (!videoEl) return
        // Forzar actualización del srcObject siempre que cambie filteredStream
        if (videoEnabled && filteredStream instanceof MediaStream) {
            videoEl.srcObject = filteredStream
            lastStreamRef.current = filteredStream
        } else {
            if (videoEl.srcObject) {
                videoEl.srcObject = null
                lastStreamRef.current = null
            }
        }
    }, [filteredStream, videoEnabled])

    return (
        <div className="relative w-[180px] h-[180px] border-2 border-gray-500 rounded-md overflow-hidden m-2 flex items-center justify-center bg-gray-200">
            {/* Si el video está activado y hay stream, muestra el video. Si no, box gris */}
            {videoEnabled && filteredStream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    onLoadedMetadata={() => {
                        const videoEl = videoRef.current
                        if (videoEl && videoEl.paused) {
                            videoEl.play().catch(err => {
                                console.warn("No se pudo auto Play:", err)
                            })
                        }
                    }}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-400 text-gray-700 font-bold text-xl">
                    <span>{username?.[0]?.toUpperCase() || "?"}</span>
                </div>
            )}
            {/* Overlay si el micrófono está desactivado */}
            {!audioEnabled && (
                <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold z-10">
                    Micrófono apagado
                </div>
            )}
        </div>
    )
}

export default RemoteVideo