//======================
//       IMPORTS
//======================
import { useState } from "react"
import * as handleConnection from "../logic/connectionVideoConference"
import { useNavigate } from "react-router-dom"


//======================
//	FUNCION PRINCIPAL
//======================
function Starting_View() {


	//======================
	//		CONSTANTES
	//======================

	const navigate = useNavigate()
	const [roomId, setRoomId] = useState("")
	const [username, setUsername] = useState("")


	//======================
	//		FUNCIONES
	//======================

	//(async) joinRoom
	//Entradas: RoomId, username
	//Uso: Llama a joinRoom de handleConnection ->
	// navega a */room/{roomId} [main-view]
	//Salida: Ninguna
	const joinRoom = async (roomId, username) => {
		if (!roomId) return
		if (!username) return
		//Unirse a sala
		const isHost = false
		await handleConnection.joinRoom(roomId, username, isHost)
		navigate(`/room/${roomId}`, { state: { username, isHost } })
	}

	//(async) createRoom
	//Entradas: username
	//Uso: Codigo al azar -> llama a joinRoom de handleConnection ->
	// navega a */room/{roomId} [main-view]
	//Salida: Ninguna
	const createRoom = async (username) => {
		if (!username) return
		const roomId = await createCode()
		const isHost = true
		await handleConnection.joinRoom(roomId, username, isHost)
		navigate(`/room/${roomId}`, { state: { username, isHost } })
	}

	//createCode
	//Entradas: Ninguna
	//Uso: Crea un codigo de 4 digitos al azar
	//Salida: String de 4 digitos
	const createCode = async () => {
		for (let i = 0; i < 30; i++) {
			const numero = Math.floor(Math.random() * 10000)
			const code = String(numero).padStart(4, "0")
			const available = await handleConnection.isRoomAvailable(code)
			if (available) return code
		}
		throw new Error("No hay códigos disponibles. Intenta de nuevo")
	}



	//======================
	//	Vista HTML / CSS
	//======================

	return (
		<>
			<div className="bg-slate-700 w-screen h-screen flex items-center justify-center">
				<div className="flex flex-col gap-4">
					<h1 className="text-center text-5xl font-semibold text-white">
						App. de Videoconferencia <br/> con comentarios anónimos
					</h1>
					<input
						type="text"
						className="bg-white px-2 py-1 rounded w-full my-10"
						placeholder="Ingresa tu nombre de Usuario..."
						value={username}
						onChange={(e) => setUsername(e.target.value)}
					/>
					<div className="flex gap-20 items-center">
						<button
							className="bg-green-500 hover:bg-green-700 px-4 py-2 rounded w-full h-1/2"
							onClick={() => createRoom(username)}>
							Crear Sala
						</button>
						<div className="flex flex-col gap-2 w-full">
							<input
								type="text"
								className="bg-white px-2 py-1 rounded w-full"
								placeholder="Id de la Sala..."
								value={roomId}
								onChange={(e) => setRoomId(e.target.value)}
							/>
							<button
								className="bg-blue-500 hover:bg-blue-700 px-2 py-2 rounded w-full"
								onClick={() => joinRoom(roomId, username)}>
								Unirse a Sala
							</button>
						</div>

					</div>

				</div>

			</div>
		</>
	)
}
export default Starting_View