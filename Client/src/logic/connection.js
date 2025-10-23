import * as mediasoup from "mediasoup-client"
//import { useRef } from "react"
import { io } from "socket.io-client"

const socket = io("http://localhost:5000")

let device = null
let recvTransport = null
let producersId = []
let consumers = new Map ()



function loadDevice(routerRtpCapabilities) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!device) device = new mediasoup.Device();
            if (!device.loaded) {
                await device.load({routerRtpCapabilities})
            }
            resolve()
        } catch (err) {
            reject(err)
        }
    })
}

function getProducers(roomId) {
    return new Promise((resolve, reject) => {
        socket.emit("getProducers", roomId, (res) => {
            if (!res || res.error) return reject(new Error(res?.error));
            producersId = Array.isArray(res) ? res : []
            resolve(producersId)
        })
    })
}

function createRecvTransport(roomId) {
    return new Promise((resolve, reject) => {
        socket.emit("createWebRtcTransport", { roomId, direction: "recv" }, (res) => {
            if (!res || res.error) return reject(new Error(res?.error));

            recvTransport = device.createRecvTransport(res)

            recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
                socket.emit("connectTransport", { transportId: recvTransport.id, dtlsParameters }, (connectRes) => {
                    if (!connectRes || connectRes.error) {
                        errback(new Error(connectRes?.error))
                    } else {
                        callback()
                    }
                })
            })
            resolve()
        })
    })
}

function createConsumers(roomId) {

    if(!recvTransport) return Promise.reject(new Error("RecvTransport no está listo"));
    if(!device || !device.loaded) return Promise.reject(new Error("Device no existe o no está cargado"));

    const tasks = producersId.map((producerId) => {
        return new Promise((resolve, reject) => {
            socket.emit(
                "consume",
                {roomId, producerId, rtpCapabilities: device.rtpCapabilities},
                async (res) => {
                    if(!res || res.error) return reject(new Error(res?.error));
                    try {
                        const {id, kind, rtpParameters} = res
                        const consumer = await recvTransport.consume({id, producerId, kind, rtpParameters})
                        consumers.set(producerId, consumer)
                        resolve({producerId, consumer, kind})
                    } catch(err) {
                        reject(err)
                    }
                }
            )
        })
    })

    return Promise.allSettled(tasks).then((results) => {
        const ok = results.filter(r => r.status === "fulfilled").map(r => r.value)
        const fails = results.filter(r => r.status === "rejected").map(r => r.reason)
        if (fails.length) console.warn("Algunos consumers fallaron: ", fails);
        return ok
    })

}

export async function joinRoom(roomId, username, isHost) {

    //emit joinRoom
    //get routerRtpCapabilities
    //create and load Device 
    //get producers
    //create webrtctransport
    //create recvTransport
    //for each producer
    //recvTransport consume
    //socket emit consume

    try {

        //Listener joinRoom
        const joinRoomRes = await new Promise((resolve, reject) => {
            socket.emit("joinRoom", roomId, username, isHost, (res) => {
                if (!res || res.error) return reject(new Error(res?.error));
                resolve(res)
            })
        })

        //Get routerRtpCapabilities
        const routerRtpCapabilities = joinRoomRes.rtpCapabilities

        //Create and Load Device
        await loadDevice(routerRtpCapabilities)

        //Get producers
        const producers = await getProducers(roomId)

        //Crear Transport Recv
        if (!recvTransport) {
            await createRecvTransport(roomId)
        }

        //Crear consumers por cada producer

        await createConsumers(roomId)


    } catch (err) {
        console.error("Error en joinRoom: ", err)
    }

}


export function produce() {
    //Crear SendTransport
    //
}

export function toggleAudio() {

}

export function toggleVideo() {

}



export default () => {
    console.log("LOL")
}