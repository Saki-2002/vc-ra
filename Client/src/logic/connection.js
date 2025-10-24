import * as mediasoup from "mediasoup-client"
//import { useRef } from "react"
import { io } from "socket.io-client"

const socket = io("http://localhost:5000")

//======================
//  VARIABLES GLOBALES
//======================

let deviceGlobal = null
let rtpCapabilities = null
let currentRoomId = null
let currentUsername = null
let currentIsHost = null

//======================
//      FUNCIONES
//======================

export const joinRoom = async (roomId, username, isHost) => {

    return new Promise((resolve, reject) => {
        socket.emit("joinRoom", (roomId, username, isHost, async (res) => {
            if (!res || res.error)
                reject(new Error(`Error en socket.emit(joinRoom), ${res?.error}`))
            try {
                //Guardar Información
                currentRoomId = roomId
                currentUsername = username
                isHost = currentIsHost
                rtpCapabilities = res.rtpCapabilities

                //Crear el Device y Cargarlo
                deviceGlobal = new mediasoup.Device()
                await deviceGlobal.load({rtpCapabilities})
                console.log("Device creado y cargado")
                resolve({success: true})
            } catch (err) {
                console.error("Error al cargar el device", err)
                reject(err)
            }
        }))
    })
}

export const toggleAudio = () => {

}

export const toggleVideo = () => {

}



export default () => {
    console.log("LOL")
}