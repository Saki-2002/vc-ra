import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client"

export function useConnection(roomId) {

    const [isConnected, setIsConnected] = useState(false)
    const socketRef = useRef(null)
    const [localStream, setLocalStream] = useState(null)
    const [remoteStreams, setRemoteStreams] = useState([])
    const deviceRef = useRef(null)
    const producerTransportRef = useRef(null)


    useEffect(() => {

        socketRef.current = io("http://localhost:5000")
        const socket = socketRef.current

        socket.on("connect", () => {
            console.log("Conectado al servidor")
            setIsConnected(true)

            socket.emit("joinRoom", { roomId }, async ({ rtpCapabilities, error }) => {
                if (error) return console.error(error);
                await initDevice(rtpCapabilities)
            })
        })

        socket.on("disconnect", () => {
            console.log("Desconectado del servidor")
            setIsConnected(false)
        })

        socket.on("newProducer", async ({producerId, kind, producerSocketId}) => {
            console.log("AA")
            if(!deviceRef.current || !producerTransportRef.current) return;

            try {
                const consumer = await producerTransportRef.current.consume({
                    producerId,
                    rtpCapabilities: deviceRef.current.rtpCapabilities,
                    paused: false,
                })

                const stream = new MediaStream()
                stream.addTrack(consumer.track)

                setRemoteStreams(prev => [
                    ...prev,
                    {userId: producerSocketId, stream}
                ])
                console.log("Consumido nuevo producer: ", producerId)
            } catch (err) {
                console.error("Error consumiedo producer.", err)
            }
        })

        async function initDevice(routerRtpCapabilities) {
            try {
                const device = new mediasoupClient.Device()
                await device.load({routerRtpCapabilities})
                deviceRef.current = device
                console.log("Device listo")

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                })
                setLocalStream(stream)
                console.log("Stream Local listo")

                createProducerTransport(stream)
            } catch (err) {
                console.error("Error intentando acceder a medios", err)
            }
        }

        async function createProducerTransport(stream) {
            socket.emit("createTransport", async (transportOptions) => {
                const transport = deviceRef.current.createSendTransport(transportOptions)
                producerTransportRef.current = transport

                transport.on("connect", ({dtlsParameters}, callback, errback) => {
                    console.log("CONNECT LLAMADO")
                    socket.emit("connectTransport", {transportId: transport.id, dtlsParameters }, (res) => {
                        res?.error ? errback(res.error) : callback();
                    })
                })

                transport.on("produce", async ({kind, rtpParameters}, callback, errback) => {
                    console.log("PRODUCE LLAMADO")
                    socket.emit("produce", {kind, rtpParameters}, ({id, error}) => {
                        if(error) errback(error);
                        else callback({id})
                    })
                })

                console.log("A")
                stream.getTracks().forEach(track => transport.produce({track}))
                console.log("B")
            })
        }


        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop())
            }
        }
    }, [roomId])

    return {
        isConnected,
        localStream,
        remoteStreams
    }
}