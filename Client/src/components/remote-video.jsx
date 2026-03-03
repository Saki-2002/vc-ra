import { useEffect, useRef } from "react";

function RemoteVideo({ stream, videoEnabled, audioEnabled, username }) {

    const videoRef = useRef(null)
    const audioRef = useRef(null)

    useEffect(() => {
        const videoEl = videoRef.current;
        const audioEl = audioRef.current;

        if (!stream) {
            if (videoEl) videoEl.srcObject = null;
            if (audioEl) audioEl.srcObject = null;
            return;
        }

        if (videoEl) {
            videoEl.srcObject = stream;
            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.play().catch(() => { });
        }

        if (audioEl) {
            audioEl.srcObject = stream;
            audioEl.muted = !audioEnabled;
            audioEl.playsInline = true;
            audioEl.play().catch(() => { });
        }
    }, [stream, audioEnabled]);

    return (

        <div className="w-[calc(50%-0.25rem)] bg-opacity-30 bg-gray-300 rounded-xl">
            <div className="m-3 h-40 bg-gray-700 relative rounded-lg overflow-hidden">
                {videoEnabled ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={true}
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