//======================
//       IMPORTS
//======================
import { useState, useEffect, useRef } from "react"
import "../App.css"
import LocalVideo from "./local-video"
import RemoteVideo from "./remote-video"
import CodeEditor from "./code-editor"
import * as mediasoupClient from "mediasoup-client"
import { useDebugValue } from "react"
import { useLocation, useParams } from "react-router-dom"
import LoadingScreen from "./loading-screen"
import * as handleConnection from "../logic/connectionVideoConference"
import ConsoleOutput from "./console-output"
import HostView from "./host-view"


//======================
//  FUNCION PRINCIPAL
//======================
function MainView() {

    //======================
    //      CONSTANTES
    //======================
    const { roomId } = useParams()
    const { state } = useLocation()
    const username = state?.username
    const isHost = state?.isHost
    const [cargando, setCargando] = useState(true)
    const [remoteStreams, setRemoteStreams] = useState(new Map())
    const [remotePeers, setRemotePeers] = useState(new Map())


    useEffect(() => {

        const initializeRoom = async () => {
            try {

                handleConnection.setMediaTracksUpdateCallback((updatedTracks) => {
                    console.log("Actualizando streams remotos:", updatedTracks.size)
                    setRemoteStreams(new Map(updatedTracks))
                })

                handleConnection.setPeersUpdateCallback((updatedPeers) => {
                    setRemotePeers(new Map(updatedPeers))
                })

                //Se llama a createConsumers
                await handleConnection.createConsumers()
                setRemoteStreams(handleConnection.getMediaTracks())
                setRemotePeers(handleConnection.getPeers())
                setCargando(false)
            } catch(err){
                console.error("Error al Inicializar Room. Por favor volver a cargar la página")
            }
        }
        initializeRoom()

        return() => {
            handleConnection.setMediaTracksUpdateCallback(null)
            handleConnection.setPeersUpdateCallback(null)
        }

    }, [])


    //======================
    //  VISTA HTML / CSS
    //======================

    /*
        Full-Screen GRAY
            Columnas: 2
                1C-> w2/3 AMBER Filas: 2
                    1F-> h4/5 INDIGO
                    2F-> h1/5 ROSE
                2C->w1/3 GREEN
            Absolute (Draggable) LocalVideo
    */
    return (
        <>
            {cargando ?
                <LoadingScreen /> :
                <>
                    <div className=" bg-gray-500 h-screen flex flex-col md:flex-row gap-4 items-stretch p-4">
                        <div className="bg-amber-600 flex-1 flex flex-col gap-4 p-4 rounded-2xl overflow-hidden">
                            <div className="bg-indigo-500 h-3/4 min-h-[100px] overflow-hidden flex flex-col">
                                <CodeEditor roomId={roomId} isHost={isHost} username={username}/>
                            </div>
                            <div className="bg-rose-500 h-1/3 min-h-[50px]">
                                <ConsoleOutput roomId={roomId}/>
                            </div>
                        </div>
                        <div className="bg-emerald-500 md:w-1/3 w-full rounded-2xl p-4">
                            <div className="flex flex-wrap gap-2 h-1/6">
                                {Array.from(remotePeers.entries()).map(([socketId, peerInfo]) => {
                                    //Crear MediaStream por cada peer
                                    const tracks = remoteStreams.get(socketId)||{}
                                    const stream = new MediaStream()
                                    if(tracks.audioTrack) stream.addTrack(tracks.audioTrack);
                                    if(tracks.videoTrack) stream.addTrack(tracks.videoTrack);

                                    const username = peerInfo?.username || `Peer-${String(socketId).slice(0,6)}`
                                    return (
                                        <RemoteVideo
                                            key={socketId}
                                            stream={stream}
                                            videoEnabled={!!tracks.videoTrack}
                                            audioEnabled={!!tracks.audioEnabled}
                                            username={username}
                                        />
                                    )
                                })}
                            </div>
                            {/*{isHost ?
                                <HostView/> :
                                <div className="h-1/6 bg-gray-700">
                                    NO HOST
                                </div>   
                            }*/}
                        </div>
                    </div>
                    <div className="fixed inset-0 pointer-events-none">
                        <LocalVideo />
                    </div>
                </>
            }
        </>
    )
}
export default MainView