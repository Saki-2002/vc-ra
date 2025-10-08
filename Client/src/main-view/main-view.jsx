import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import debounce from "lodash.debounce";
import { useConnection } from "../logic/connection";
import LocalVideo from "./local-video";
import RemoteVideo from "./remote-video";
import TextEditor from "./text-editor";

function Main_Component({ roomId }) {
  const { isConnected, localStream, remoteStreams, socketRef } = useConnection(roomId);
  const [editorValue, setEditorValue] = useState("");
  const selfUpdateRef = useRef(false);

  useEffect(() => {
    if (!socketRef?.current) return;
    const socket = socketRef.current;
    // Escuchar actualizaciones de texto
    const handler = ({ text }) => {
      if (!selfUpdateRef.current) setEditorValue(text);
    };
    socket.on("textUpdate", handler);
    return () => {
      socket.off("textUpdate", handler);
    };
  }, [socketRef]);

  const handleEditorChange = (value) => {
    setEditorValue(value);
    if (socketRef?.current) {
      selfUpdateRef.current = true;
      socketRef.current.emit("textUpdate", { roomId, text: value });
      setTimeout(() => (selfUpdateRef.current = false), 50);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Video local flotante y movible */}
      {localStream && <LocalVideo stream={localStream} />}

      <div className="flex w-full h-full">
        {/* Panel izquierdo: editor de texto */}
        <div className="flex flex-col justify-start items-center w-1/2 border-r border-gray-300 p-4 bg-gray-50">
          <div className="w-full h-full mt-4">
            <TextEditor value={editorValue} onChange={handleEditorChange} />
          </div>
        </div>

        {/* Panel derecho: Videos remotos */}
        <div className="flex flex-col justify-start items-start w-1/2 p-4">
          <div className="grid grid-cols-2 gap-4 w-full">
            {remoteStreams.map(({ userId, stream, producerId }) => (
              <RemoteVideo
                key={userId + "-" + producerId}
                stream={stream}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main_Component;
