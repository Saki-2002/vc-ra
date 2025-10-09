import { useEffect,useRef } from "react"

function RemoteVideo ({stream}){

    const videoRef = useRef(null)

    useEffect(() => {
        if(videoRef.current && stream){
            if(stream instanceof MediaStream){
                videoRef.current.srcObject = stream
                videoRef.current.play().catch(err => {
                    console.warn("No se pudo auto Play:", err)
                })
            } else {
                console.warn("Stream Inválido", stream)
            }
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