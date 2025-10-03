import { useState, useRef, useEffect } from "react";
import "../App.css";
import { useConnection } from "../logic/connection";
import LocalVideo from "./local-video";
import RemoteVideo from "./remote-video";
//import TextEditor from "./text-editor";



function Main_Component({roomId}) {

    const { isConnected, localStream, remoteStreams } = useConnection(roomId);

    console.log(`isConnected: ${isConnected}`)
    console.log(`localStream: ${localStream}`)
    console.log(`remoteStreams: ${remoteStreams}`)

    return (
        <>
            <div className="relative w-full h-full border border-blue-500">
                <LocalVideo stream={localStream} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {remoteStreams.map(({userId, stream}) => (
                    <RemoteVideo key={userId} stream={stream} />
                ))}
            </div>
        </>
    )
}

export default Main_Component