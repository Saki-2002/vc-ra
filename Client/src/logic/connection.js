import * as mediasoup from "mediasoup-client"
import {io} from "socket.io-client"

const socket = io("http://localhost:5000")

export function handleConnection () {

}

export function joinRoom(roomId, username, isHost) {
    //Unirse a la Room
    socket.emit("joinRoom", roomId, username, isHost)
    
    //Crear consumers inicialmente
}

export function toggleAudio() {
    
} 

export function toggleVideo(){

}



export default () => {
    console.log("LOL")
}