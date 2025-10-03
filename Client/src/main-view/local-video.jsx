import { useEffect, useRef } from "react";

function LocalVideo({stream}) {
  
  const videoRef = useRef(null)
  const localContainerRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const drag = (e) => {
      const el = localContainerRef.current
      el.style.left = e.clientX - el.offsetWidth / 2 + "px"
      el.style.top = e.clientY - el.offsetHeight / 2 + "px"
  }

  return (
    <div
      ref={localContainerRef}
      className="absolute top-[20px] left-[20px] w-[180px] h-[180px] cursor-move flex flex-col items-center justify-start border-2 border-dashed border-gray-700 rounded-md bg-red-500 overflow-hidden p-[5px]"
      onMouseDown={(e) => {
        const move = (ev) => drag(ev);
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", () => window.removeEventListener("mousemove", move), { once: true });
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
  )
}
export default LocalVideo