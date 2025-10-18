
import { useState, useEffect, useRef } from "react"
import "../App.css"
import LocalVideo from "./local-video"
import RemoteVideo from "./remote-video"
import CodeEditor from "./code-editor"
import socket, { joinRoom, getProducers, createWebRtcTransport, connectTransport, consume } from "../logic/connection"

import * as mediasoupClient from "mediasoup-client"
import { useDebugValue } from "react"


function MainView({ roomId, username }) {
    const [localStream, setLocalStream] = useState(null)
    const [remotePeers, setRemotePeers] = useState([])
    const [rtpCapabilities, setRtpCapabilities] = useState(null)
    const deviceRef = useRef(null)
    const recvTransportRef = useRef(null)
    const sendTransportRef = useRef(null)
    const [produced, setProduced] = useState(false)
    const [joined, setJoined] = useState(false)

    // Unirse a la sala y obtener rtpCapabilities
    useEffect(() => {
        if (!joined && roomId) {
            console.log('[DEBUG] joinRoom', roomId, username)
            joinRoom(roomId, username, async (response) => {
                console.log('[DEBUG] joinRoom response', response)
                if (response && response.rtpCapabilities) {
                    setRtpCapabilities(response.rtpCapabilities)
                    window.rtpCapabilities = response.rtpCapabilities
                    // Crear Device mediasoup-client
                    const device = new mediasoupClient.Device()
                    await device.load({ routerRtpCapabilities: response.rtpCapabilities })
                    deviceRef.current = device
                    // Crear RecvTransport
                    createWebRtcTransport(({ params }) => {
                        console.log('[DEBUG] create RecvTransport', params)
                        const recvTransport = device.createRecvTransport({
                            id: params.id,
                            iceParameters: params.iceParameters,
                            iceCandidates: params.iceCandidates,
                            dtlsParameters: params.dtlsParameters
                        })
                        recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                            console.log('[DEBUG] RecvTransport connect', params.id)
                            connectTransport(params.id, dtlsParameters, () => callback())
                        })
                        recvTransportRef.current = recvTransport
                        setJoined(true)
                    })
                    // Crear único SendTransport para video y audio
                    createWebRtcTransport(({ params }) => {
                        console.log('[DEBUG] create SendTransport', params)
                        const sendTransport = device.createSendTransport({
                            id: params.id,
                            iceParameters: params.iceParameters,
                            iceCandidates: params.iceCandidates,
                            dtlsParameters: params.dtlsParameters
                        })
                        sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                            console.log('[DEBUG] SendTransport connect', params.id)
                            connectTransport(params.id, dtlsParameters, () => callback())
                        })
                        sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                            console.log('[DEBUG] SendTransport produce', kind)
                            import('../logic/connection').then(({ produce }) => {
                                produce(kind, rtpParameters, (response) => {
                                    if (response && response.id) {
                                        console.log('[DEBUG] produce callback', response.id)
                                        callback({ id: response.id })
                                    } else {
                                        console.error('[DEBUG] produce error', response)
                                        errback && errback(response && response.error ? response.error : 'Error al producir')
                                    }
                                })
                            })
                        })
                        sendTransportRef.current = sendTransport
                    })
                }
            })
        }
    }, [roomId, username, joined])

    // Guardar streams previos para evitar recrear MediaStream innecesariamente
    const prevStreamsRef = useRef({})

    // Obtener stream local
        useEffect(() => {
                navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                        .then(stream => setLocalStream(stream))
                        .catch(() => setLocalStream(null))
        }, [roomId])

        // Exponer función global para enviar estado de video/audio
        useEffect(() => {
            window.sendPeerState = ({ videoEnabled, audioEnabled }) => {
                if (socket) {
                    socket.emit('peer-state-update', { videoEnabled, audioEnabled })
                }
            }
        }, [])

    // Produce video/audio local al tener sendTransport y localStream
    useEffect(() => {
        if (sendTransportRef.current && localStream && !produced) {
            console.log('[DEBUG] Produciendo tracks locales (video y audio en único transport)')
            const send = async () => {
                try {
                    // Esperar a que el transport esté conectado
                    if (sendTransportRef.current.readyState !== 'connected') {
                        console.log('[DEBUG] Esperando a que SendTransport esté conectado...')
                        await new Promise((resolve) => {
                            sendTransportRef.current.on('connect', () => {
                                console.log('[DEBUG] SendTransport conectado')
                                resolve()
                            })
                        })
                    }
                    const videoTrack = localStream.getVideoTracks()[0]
                    if (videoTrack) {
                        console.log('[DEBUG] produce video track', videoTrack)
                        console.log('[DEBUG] videoTrack.enabled:', videoTrack.enabled, 'muted:', videoTrack.muted, 'readyState:', videoTrack.readyState)
                        if (!videoTrack.enabled) videoTrack.enabled = true
                        console.log('[DEBUG] Llamando a sendTransport.produce para video')
                        const videoProducer = await sendTransportRef.current.produce({ track: videoTrack, appData: { type: 'video' } })
                    } else {
                        console.warn('[DEBUG] No se encontró videoTrack en localStream')
                    }
                    const audioTrack = localStream.getAudioTracks()[0]
                    if (audioTrack) {
                        console.log('[DEBUG] produce audio track', audioTrack)
                        console.log('[DEBUG] audioTrack.enabled:', audioTrack.enabled, 'muted:', audioTrack.muted, 'readyState:', audioTrack.readyState)
                        if (!audioTrack.enabled) audioTrack.enabled = true
                        console.log('[DEBUG] Llamando a sendTransport.produce para audio')
                        const audioProducer = await sendTransportRef.current.produce({ track: audioTrack, appData: { type: 'audio' } })
                    } else {
                        console.warn('[DEBUG] No se encontró audioTrack en localStream')
                    }
                    setProduced(true)
                } catch (err) {
                    // eslint-disable-next-line
                    console.error('Error produciendo tracks locales', err)
                }
            }
            send()
        }
    }, [localStream, sendTransportRef.current, produced])

    // Escuchar y consumir streams remotos reales
    useEffect(() => {
    // Estado de conexión (solo valores simples)
    console.log("joined:", joined)
    console.log("1")
        if (!joined || !deviceRef.current || !recvTransportRef.current) return
        console.log("2") 
        const handlePeersUpdate = (peerList) => {
            console.log("3") 
            console.log('[DEBUG] peersUpdate (ids):', peerList.map(p => p.userId))
            console.log("4") 
            const filteredPeers = peerList.filter(p => p.userId !== socket.id)
            console.log("5") 
            getProducers(async (producers) => {
                console.log("6") 
                console.log('[DEBUG] getProducers (ids):', producers.map(p => p.producerId))
                console.log("7")    
                const updatedPeers = await Promise.all(filteredPeers.map(async (peer) => {
                    // Buscar todos los producers de este peer
                    console.log("8")
                    const peerProducers = producers.filter(p => p.socketId === peer.userId)
                    console.log("9")
                    console.log('[DEBUG] peerProducers:', peerProducers)
                    // Validar que todos los producers tengan la propiedad kind
                    peerProducers.forEach((prod, idx) => {
                        if (!('kind' in prod)) {
                            console.error(`[ERROR] Producer sin propiedad kind:`, prod)
                        } else {
                            console.log(`[DEBUG] Producer[${idx}] kind:`, prod.kind)
                        }
                    })
                    if (peerProducers.length > 0 && peer.videoEnabled) {
                        // Consumir solo el primer video y el primer audio producer
                        console.log("10")
                        let videoTrack = null
                        console.log("11")
                        let audioTrack = null
                        console.log("12")
                        for (const prod of peerProducers) {
                            console.log("peerProducers:", peerProducers)
                            console.log("prod:",prod)
                            console.log("13")
                            console.log('videoTrack:', videoTrack)
                            console.log('prod.kind:', prod.kind)
                            videoTrack ? console.log("YES") : console.log("NO")
                            prod.kind ? console.log("YES") : console.log("NO")
                            if (!videoTrack && prod.kind === 'video') {
                                console.log("14")
                                console.log('[CLIENT] Llamando a consume para producerId:', prod.producerId, 'kind:', prod.kind);
                                console.log("15")
                                await new Promise((resolve) => {
                                    console.log("16")
                                    consume(prod.producerId, window.rtpCapabilities, async (data) => {
                                        console.log('[CONSUME] Respuesta video', data)
                                        if (data && !data.error && data.kind && data.rtpParameters) {
                                            try {
                                                const consumer = await recvTransportRef.current.consume({
                                                    id: data.id,
                                                    producerId: data.producerId,
                                                    kind: data.kind,
                                                    rtpParameters: data.rtpParameters
                                                })
                                                // Esperar a que el consumer esté en estado 'open'
                                                if (consumer) {
                                                    if (consumer.readyState !== 'open') {
                                                        await new Promise((res) => {
                                                            consumer.on('open', () => {
                                                                res()
                                                            })
                                                        })
                                                    }
                                                    if (consumer.track) {
                                                        videoTrack = consumer.track
                                                        console.log('[CONSUME] Track de video recibido:', videoTrack)
                                                    } else {
                                                        console.error('[CONSUME] Consumer de video sin track:', consumer)
                                                    }
                                                } else {
                                                    console.error('[CONSUME] Consumer de video inválido:', consumer)
                                                }
                                            } catch (err) {
                                                console.error('[DEBUG] Error creando consumer video para peer', peer.userId, err)
                                            }
                                        } else {
                                            console.error('[CONSUME] Respuesta inválida para video:', data)
                                        }
                                        resolve()
                                    })
                                })
                            }
                            if (!audioTrack && prod.kind === 'audio') {
                                console.log('[CLIENT] Llamando a consume para producerId:', prod.producerId, 'kind:', prod.kind);
                                await new Promise((resolve) => {
                                    consume(prod.producerId, window.rtpCapabilities, async (data) => {
                                        console.log('[CONSUME] Respuesta audio', data)
                                        if (data && !data.error && data.kind && data.rtpParameters) {
                                            try {
                                                const consumer = await recvTransportRef.current.consume({
                                                    id: data.id,
                                                    producerId: data.producerId,
                                                    kind: data.kind,
                                                    rtpParameters: data.rtpParameters
                                                })
                                                // Esperar a que el consumer esté en estado 'open'
                                                if (consumer) {
                                                    if (consumer.readyState !== 'open') {
                                                        await new Promise((res) => {
                                                            consumer.on('open', () => {
                                                                res()
                                                            })
                                                        })
                                                    }
                                                    if (consumer.track) {
                                                        audioTrack = consumer.track
                                                        console.log('[CONSUME] Track de audio recibido:', audioTrack)
                                                    } else {
                                                        console.error('[CONSUME] Consumer de audio sin track:', consumer)
                                                    }
                                                } else {
                                                    console.error('[CONSUME] Consumer de audio inválido:', consumer)
                                                }
                                            } catch (err) {
                                                console.error('[DEBUG] Error creando consumer audio para peer', peer.userId, err)
                                            }
                                        } else {
                                            console.error('[CONSUME] Respuesta inválida para audio:', data)
                                        }
                                        resolve()
                                    })
                                })
                            }
                            if (videoTrack && audioTrack) break
                        }
                        const stream = new window.MediaStream()
                        if (videoTrack) {
                            stream.addTrack(videoTrack)
                            console.log('[CONSUME] Track de video añadido al MediaStream:', videoTrack)
                        } else {
                            console.warn('[CONSUME] No se recibió track de video para peer', peer.userId)
                        }
                        if (audioTrack) {
                            stream.addTrack(audioTrack)
                            console.log('[CONSUME] Track de audio añadido al MediaStream:', audioTrack)
                        } else {
                            console.warn('[CONSUME] No se recibió track de audio para peer', peer.userId)
                        }
                        console.log('[CONSUME] MediaStream creado para peer', peer.userId, stream)
                        return {
                            userId: peer.userId,
                            stream,
                            videoEnabled: peer.videoEnabled,
                            audioEnabled: peer.audioEnabled,
                            username: peer.username
                        }
                    } else {
                        console.warn('[CONSUME] Peer sin producers o sin video habilitado:', peer.userId)
                        return {
                            userId: peer.userId,
                            stream: null,
                            videoEnabled: peer.videoEnabled,
                            audioEnabled: peer.audioEnabled,
                            username: peer.username
                        }
                    }
                }))
                 console.log('[DEBUG] setRemotePeers (ids):', updatedPeers.map(p => p.userId))
                 setRemotePeers(updatedPeers)
             })
         }
        socket.on("peersUpdate", handlePeersUpdate)
        return () => {
            socket.off("peersUpdate", handlePeersUpdate)
        }
    }, [joined, roomId])

    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-cyan-200">
            <div className="z-50 w-full my-[200px] flex items-center justify-center mb-4">
                <CodeEditor roomId={roomId} />
            </div>
            <div className="relative w-full h-full border border-blue-500">
                <LocalVideo stream={localStream} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {remotePeers.map(({ userId, stream, videoEnabled, audioEnabled, username }) => (
                    <RemoteVideo
                        key={userId}
                        stream={stream}
                        videoEnabled={videoEnabled}
                        audioEnabled={audioEnabled}
                        username={username}
                    />
                ))}
            </div>
        </div>
    )
}

export default MainView