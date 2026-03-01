import {io} from "socket.io-client"

const url = "http://localhost:5000"
//const url = "https://bmdt4n7d-5000.brs.devtunnels.ms/"

const socket = globalThis.__SOCKET__ || io(url)

globalThis.__SOCKET__ = socket

export default socket