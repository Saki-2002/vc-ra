
import { useEffect, useRef, useState } from "react"
import Draggable from "react-draggable"

function LocalVideo({ stream }) {
  const videoRef = useRef(null)
  const nodeRef = useRef(null)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  // Enviar estado al servidor cuando cambie
  useEffect(() => {
    window.sendPeerState && window.sendPeerState({ videoEnabled, audioEnabled })
  }, [videoEnabled, audioEnabled])

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      // Actualiza estado de tracks si el stream cambia
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) videoTrack.enabled = videoEnabled
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) audioTrack.enabled = audioEnabled
    }
  }, [stream, videoEnabled, audioEnabled])

  const handleToggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) videoTrack.enabled = !videoEnabled
      setVideoEnabled(!videoEnabled)
    }
  }

  const handleToggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) audioTrack.enabled = !audioEnabled
      setAudioEnabled(!audioEnabled)
    }
  }

  return (
    <Draggable nodeRef={nodeRef} bounds="parent" handle=".drag-handle">
      <div ref={nodeRef} className=" drag-handle absolute top-[20px] left-[20px] w-[180px] h-[180px] flex flex-col items-center justify-start border-2 border-dashed border-gray-700 rounded-md bg-red-500 overflow-hidden p-[5px]">
        <div className="w-full flex justify-end gap-2 mb-1">
          <button
            className={`px-2 py-1 rounded ${videoEnabled ? "bg-green-500" : "bg-gray-400"} text-white text-xs`}
            onClick={handleToggleVideo}
          >
            {videoEnabled ? "Desactivar Video" : "Activar Video"}
          </button>
          <button
            className={`px-2 py-1 rounded ${audioEnabled ? "bg-green-500" : "bg-gray-400"} text-white text-xs`}
            onClick={handleToggleAudio}
          >
            {audioEnabled ? "Desactivar Audio" : "Activar Audio"}
          </button>
        </div>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
    </Draggable>
  )
}

export default LocalVideo