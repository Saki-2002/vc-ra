import {io} from "socket.io-client"

const url = "http://localhost:5000"
//const url = "https://4f4mbq09-5000.brs.devtunnels.ms/"

const socket = globalThis.__SOCKET__ || io(url)

globalThis.__SOCKET__ = socket

export default socket