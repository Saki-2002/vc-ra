import { useEffect, useRef, useState } from "react"
import Draggable from "react-draggable"

function LocalVideo(ref) {
  const nodeRef = useRef(null)

  return (
    <Draggable nodeRef={nodeRef} bounds="parent" handle=".drag-handle">
      <div
        ref={nodeRef}
        className=" z-50 absolute pointer-events-auto rounded-lg w-[300px] h-[250px] bg-gray-200 flex flex-col">
          <div className="drag-handle cursor-grab bg-gray-600 w-full h-8 rounded-t-lg flex flex-col">
          </div>
          <div className="flex-1 flex flex-col items-stretch p-2 bg-green-500">
            <div className="bg-red-500 m-1 flex-1 justify-end flex flex-col">
              <div className="bg-purple-500 m-1 h-12 flex gap-4 items-center justify-center">
                <button className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-700 flex items-center justify-center text-xl">
                  🎤
                </button>
                <button className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-700 flex items-center justify-center text-xl">
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