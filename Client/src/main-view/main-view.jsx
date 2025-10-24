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
    const cargando = false



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
                    <div className=" bg-gray-500 min-h-screen flex flex-col md:flex-row gap-4 items-stretch p-4">
                        <div className="bg-amber-600 flex-1 flex flex-col gap-4 p-4 rounded-2xl">
                            <div className="bg-indigo-500 flex-1 min-h-[100px]">
                            </div>
                            <div className="bg-rose-500 h-1/5 min-h-[50px]">
                            </div>
                        </div>
                        <div className="bg-emerald-500 md:w-1/3 w-full rounded-2xl p-4">
                        </div>
                    </div>
                    <div className="fixed inset-0 pointer-events-none">
                        <LocalVideo/>
                    </div>
                    
                </>

            }
        </>
    )
}
export default MainView