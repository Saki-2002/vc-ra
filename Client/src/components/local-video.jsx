import Draggable from "react-draggable"
import useLocalVideo from "../hooks/useLocalVideo"
import { useEffect, useRef } from "react"

function LocalVideo() {

  const nodeRef = useRef(null)
  const videoRef = useRef(null)

  const {
    localStream,
    isAudioOn,
    isVideoOn,
    toggleAudio,
    toggleVideo
  } = useLocalVideo()

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream
    }
  }, [localStream])


  return (
    <Draggable nodeRef={nodeRef} bounds="parent" handle=".drag-handle">
      <div
        ref={nodeRef}
        className=" z-50 absolute pointer-events-auto rounded-lg w-[300px] h-[250px] bg-gray-200 flex flex-col">
        <div className="drag-handle cursor-grab bg-gray-600 w-full h-8 rounded-t-lg flex flex-col">
        </div>
        <div className="flex-1 flex flex-col items-stretch p-2 bg-green-500">
          <div className="bg-red-500 m-1 flex-1 justify-end flex flex-col relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full bg-black"
              style={{ display: isVideoOn ? "block" : "none" }}
            />
            {!isVideoOn && (
              <div className=" font-semibold absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
                Video Apagado
              </div>
            )}
            <div className="z-10  m-1 h-12 flex gap-4 items-center justify-center">
              <button
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors ${isAudioOn
                    ? `bg-green-500 hover:bg-green-600`
                    : `bg-red-500 hover:bg-red-600`
                  }`}
                onClick={toggleAudio}
                title={isAudioOn ? "Silenciar" : "Activar audio"}
              >
                🎤
              </button>
              <button
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors ${isVideoOn
                    ? `bg-green-500 hover:bg-green-600`
                    : `bg-red-500 hover:bg-red-600`
                  }`}
                onClick={toggleVideo}
                title={isVideoOn ? "Apagar cámara" : "Activar cámara"}
              >
                📽️
              </button>
            </div>
          </div>

        </div>

      </div>

    </Draggable>
  )

}

export default LocalVideo