import { useRef, useState } from "react"
import Draggable from "react-draggable"
import PopUp_Entrar_Sala from "./popup-entrar-sala"
import { joinRoom, getProducers } from "../logic/connection"
import MainView from "./main-view"

function Starting_View() {
	const nodeRef = useRef(null)
	const [renderPopUp, setRenderPopUp] = useState(false)
	const [showPopUp, setShowPopUp] = useState(false)
	const popUpRef = useRef(null)
	const [idSala, setIdSala] = useState("")
	const [error, setError] = useState("")
	const [inRoom, setInRoom] = useState(false)
	const [roomId, setRoomId] = useState("")
	const [username, setUsername] = useState("")

	const openPopUp = () => {
		setRenderPopUp(true)
		setTimeout(() => setShowPopUp(true), 10)
	}
	const closePopUp = () => {
		setShowPopUp(false)
		setTimeout(() => setRenderPopUp(false), 100)
	}
	const onMouseDown = () => {
		// Puedes dejarlo para el draggable
	}

	// Ingresar a sala específica
	const handleIngresarSala = (valor) => {
		setError("")
		joinRoom(valor, username || "Usuario", (response) => {
			if (response?.error) {
				setError("La sala no existe")
			} else {
				setRoomId(valor)
				setInRoom(true)
				window.history.pushState({}, '', `/${valor}`)
			}
		})
	}

	// Crear sala con ID automático
	const handleCrearSala = () => {
		setError("")
		// Genera un ID aleatorio entre 1 y 9999
		const newRoomId = Math.floor(Math.random() * 9999) + 1
		joinRoom(newRoomId.toString(), username || "Usuario", (response) => {
			if (response?.error) {
				setError(response.error)
			} else {
				setRoomId(newRoomId.toString())
				setInRoom(true)
				window.history.pushState({}, '', `/${newRoomId}`)
			}
		})
	}

	if (inRoom) {
		return <MainView roomId={roomId} username={username || "Usuario"} />
	}

	return (
		<>
			<title>VC-AF</title>
			<div className="flex flex-col items-center static w-screen h-screen bg-yellow-200">
				<div className="py-10 align-middle place-items-center border-black ">
					<input
						type="text"
						placeholder="Tu nombre"
						value={username}
						onChange={e => setUsername(e.target.value)}
						className="mb-4 px-2 py-1 border rounded"
					/>
					<button
						className="bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-full py-2 px-4 mr-2"
						onClick={openPopUp}
					>
						Ingresar a una sala especifica
					</button>
					<button
						className="bg-green-500 hover:bg-green-700 text-white font-bold rounded-full py-2 px-4"
						onClick={handleCrearSala}
					>
						Crear sala
					</button>
				</div>
				{renderPopUp &&
					<PopUp_Entrar_Sala
						ref={popUpRef}
						showPopUp={showPopUp}
						onMouseDown={onMouseDown}
						closePopUp={closePopUp}
						onIngresarSala={handleIngresarSala}
					/>
				}
				{error && (
					<div className="mt-4 text-red-600">{error}</div>
				)}
			</div>
		</>
	)
}

export default Starting_View
