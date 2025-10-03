import { useEffect,useRef } from "react"
import { normalizeModuleId } from "vite/module-runner"

function RemoteVideo (stream, userId){

    const videoRef = useRef(null)

    useEffect(() => {
        if(videoRef.current && stream){
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <div className="w-[180px] h-[180px] border-2 border-gray-500 rounded-md overflow-hidden m-2">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={false}
                className="w-full h-full object-cover"
            />
        </div>
    )
}

export default RemoteVideo