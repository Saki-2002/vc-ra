    // Guardar referencia a los producers locales
    const localProducersRef = useRef({});
    // Función para desactivar audio o video
    const disableMedia = (kind) => {
        const producer = localProducersRef.current[kind];
        if (producer) {
            producer.close();
            socketRef.current.emit("closeProducer", { kind });
            delete localProducersRef.current[kind];
        }
    };
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client"

export function useConnection(roomId) {

    const socketRef = useRef(null)
    const deviceRef = useRef(null)
    const producerTransportRef = useRef(null)
    const consumerTransportRef = useRef(null)
    const remoteConsumersRef = useRef({})
    const [isConnected, setIsConnected] = useState(false)
    const [localStream, setLocalStream] = useState(null)
    const [remoteStreams, setRemoteStreams] = useState([])

    useEffect(() => {

        socketRef.current = io("http://localhost:5000")
        const socket = socketRef.current


        socket.on("connect", () => {
            console.log(`Conectado cliente ${socket.id} al servidor`)
            setIsConnected(true)
        })

        socket.on("disconnect", () => {
            console.log(`Cliente ${socket.id} desconectado del servidor`)
            setIsConnected(false)
        })

        socket.emit("joinRoom", { roomId }, async ({ rtpCapabilities, error }) => {
            if (error) return console.error("Error al ingresar a la sala", error);
            await initDevice(rtpCapabilities)
        })

        socket.on("newProducer", async ({ producerId, kind, producerSocketId }) => {
            //Comprobaciones Iniciales

            //Si no existe un device falla
            if (!deviceRef.current) return;
            //Si no existe un transport lo crea
            if (!consumerTransportRef.current) {
                await createConsumerTransport()
            }
            // Creación del consumer

            try {
                socket.emit("consume", {
                    producerId,
                    rtpCapabilities: deviceRef.current.rtpCapabilities
                }, async ({ id, kind, rtpParameters, error }) => {
                    if (error) return console.error("Error en consume", error);
                    //Crear el consumer
                    const consumer = await consumerTransportRef.current.consume({
                        id,
                        producerId,
                        kind,
                        rtpParameters
                    });
                    //Guardar el consumer en un Array para luego cerrarlo
                    remoteConsumersRef.current[producerId] = consumer
                    const stream = new MediaStream()
                    stream.addTrack(consumer.track)
                    setRemoteStreams(prev => {
                        if (prev.some(s => s.producerId === producerId)) return prev;
                        return [
                            ...prev,
                            { userId: producerSocketId, stream, producerId }
                        ]
                    })
                    console.log("Consumido nuevo producer:", producerId)
                })
            } catch (err) {
                console.log("Error al crear un consumer", err)
            }
        })

        //Eliminar un producer
        socket.on("removeProducer", ({userId}) => {
            setRemoteStreams(prev => {
                //Cerrar los consumers asociados a un Usuario Id
                prev.forEach(s => {
                    if(s.userId === userId && remoteConsumersRef.current[s.producerId]) {
                        try {
                            remoteConsumersRef.current[s.producerId].close()
                        } catch (e) {
                            delete remoteConsumersRef.current[s.producerId]
                        }
                    }
                })
                return prev.filter(s => s.userId !== userId)
            })
        })



        async function initDevice(routerRtpCapabilities) {
            try {
                //Creación del Device
                const device = new mediasoupClient.Device()
                await device.load({ routerRtpCapabilities })
                deviceRef.current = device
                console.log("Device Creado")

                //Inicializar obtención de Media Local

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                })
                setLocalStream(stream)
                console.log("Stream Local Obtenido")

                //Creación de Transport Productor
                createProducerTransport(stream)

            } catch (err) {
                console.error("Error al crear un Device", err)
            }
        }

        //Función para Crear un Transport Productor 
        async function createProducerTransport(stream) {
            //Se emite createTransport para que el Server cree su propio Transport
            if (producerTransportRef.current) return;
            socket.emit("createTransport", async (transportOptions) => {
                //Se crea un transport local
                const transport = deviceRef.current.createSendTransport(transportOptions)
                producerTransportRef.current = transport

                //Se llama automaticamente cuando se intenta producir
                //o consumir y no se ha conectado antes
                transport.on("connect", ({ dtlsParameters }, callback, errback) => {
                    socket.emit("connectTransport", { transportId: transport.id, dtlsParameters }, (res) => {
                        res?.error ? errback(res.error) : callback();
                    })
                })

                //Se ejecuta produce
                transport.on("produce", async ({ kind, rtpParameters }, callback, errback) => {
                    // Se emite produce para crear un produce para un cliente
                    // y media especifico (audio o video, no ambas)
                    socket.emit("produce", { kind, rtpParameters }, ({ id, error }) => {
                        if (error) errback(error);
                        else callback(id);
                    })
                })

                // Por cada track de stream ("audio, video"), se crea un producer y se guarda referencia
                stream.getTracks().forEach(track => {
                    const kind = track.kind;
                    const producer = transport.produce({ track });
                    // Guardar referencia para poder cerrarlo después
                    localProducersRef.current[kind] = producer;
                });
    // Exponer la función para desactivar media
    // Puedes usar disableMedia('audio') o disableMedia('video') desde el componente
            })
        }

        async function createConsumerTransport() {
            return new Promise((resolve) => {
                socket.emit("createTransport", async (transportOptions) => {
                    //Se crea un transport local
                    const transport = deviceRef.current.createRecvTransport(transportOptions)
                    consumerTransportRef.current = transport

                    //Se emite al servidor para crear un transport
                    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
                        socket.emit("connectTransport", { transportId: transport.id, dtlsParameters }, (res) => {
                            res?.error ? errback(res.error) : callback();
                        })
                    })
                })
            })
        }

        //Bloque que se ejecuta cuando el componente se desmonta
        //o cuando cambia el roomId
        return () => {
            //Desconectar Socket (Conexión Cliente-Server) si existe
            if (socketRef.current) socketRef.current.disconnect();
            //Parar cada media del stream local si existen
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop())
            }
            //Cierra çada consumer creado
            for (const i in remoteConsumersRef.current) {
                const consumer = remoteConsumersRef.current[i];
                try {
                    consumer.close()
                } catch (err) {
                    console.error("Error cerrando consumer", err)
                }
            }
            //Restablece los remoteConsumers a vacio
            remoteConsumersRef.current = {}
        }

    }, [roomId])

    return {
        isConnected,
        localStream,
        remoteStreams,
        disableMedia // <-- exporta la función para usarla en la UI
    }
}