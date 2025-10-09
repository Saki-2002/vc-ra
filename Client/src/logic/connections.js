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
    const consumerTransportRef = useRef(null)
    const remoteConsumersRef = useRef({})

    //connect
    //disconnect
    //newProducer
    //removeProducer


    useEffect(() => {
        socketRef.current = io("http://localhost:5000")
        const socket = socketRef.current

        socket.on("connect", () => {
            console.log(`Conectado cliente ${socket.id} al servidor`)
            setIsConnected(true)
        })

        socket.on("joinRoom", {roomId}, async ({rtpCapabilities, error}) => {
            if (error) return console.error(error);
            await initDevice(rtpCapabilities)
        })

        socket.on("disconnect", () => {
            console.log("Desconectado del servidor")
            setIsConnected(false)
        })

        socket.on("newProducer", async ({producerId, kind, producerSocketId}) => {
            if(!deviceRef.current) return;
            // Crear consumerTransport si no existe
            if(!consumerTransportRef.current) {
                await createConsumerTransport();
            }
            try {
                // Solicitar datos de consumo al servidor
                socket.emit("consume", {
                    producerId,
                    rtpCapabilities: deviceRef.current.rtpCapabilities
                }, async ({id, kind, rtpParameters, error}) => {
                    if(error) return console.error("Error en consume:", error);
                    // Crear el consumer en el cliente
                    const consumer = await consumerTransportRef.current.consume({
                        id,
                        producerId,
                        kind,
                        rtpParameters
                    });
                    // Guardar el consumer para poder cerrarlo después
                    remoteConsumersRef.current[producerId] = consumer;
                    const stream = new MediaStream();
                    stream.addTrack(consumer.track);
                    setRemoteStreams(prev => {
                        // Evitar duplicados por producerId
                        if (prev.some(s => s.producerId === producerId)) return prev;
                        return [
                            ...prev,
                            {userId: producerSocketId, stream, producerId}
                        ];
                    });
                    console.log("Consumido nuevo producer: ", producerId);
                });
            } catch (err) {
                console.error("Error consumiendo producer.", err);
            }
        });

        // Eliminar streams remotos y cerrar consumers cuando un usuario se desconecta
        socket.on("removeProducer", ({ userId }) => {
            setRemoteStreams(prev => {
                // Cerrar los consumers asociados a ese userId
                prev.forEach(s => {
                    if (s.userId === userId && remoteConsumersRef.current[s.producerId]) {
                        try {
                            remoteConsumersRef.current[s.producerId].close();
                        } catch (e) {}
                        delete remoteConsumersRef.current[s.producerId];
                    }
                });
                return prev.filter(s => s.userId !== userId);
            });
        });
        async function createConsumerTransport() {
            return new Promise((resolve, reject) => {
                socket.emit("createTransport", async (transportOptions) => {
                    try {
                        const transport = deviceRef.current.createRecvTransport(transportOptions);
                        consumerTransportRef.current = transport;
                        transport.on("connect", ({dtlsParameters}, callback, errback) => {
                            socket.emit("connectTransport", {transportId: transport.id, dtlsParameters }, (res) => {
                                res?.error ? errback(res.error) : callback();
                            });
                        });
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                });
            });
        }

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
            // Cerrar todos los consumers remotos al desmontar
            Object.values(remoteConsumersRef.current).forEach(consumer => {
                try { consumer.close(); } catch (e) {}
            });
            remoteConsumersRef.current = {};
        }
    }, [roomId])

    return {
        isConnected,
        localStream,
        remoteStreams
    }
}