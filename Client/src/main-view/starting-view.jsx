//======================
//       IMPORTS
//======================
import { useRef, useState } from "react"
import * as handleConnection from "../logic/connection"
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
		//Unirse a sala
		await handleConnection.joinRoom(roomId, username, false)
		navigate(`/room/${roomId}`, { state: { username } })
	}

	//(async) createRoom
	//Entradas: username
	//Uso: Codigo al azar -> llama a joinRoom de handleConnection ->
	// navega a */room/{roomId} [main-view]
	//Salida: Ninguna
	const createRoom = async (username) => {
		const roomId = createCode()
		await handleConnection.joinRoom(roomId, username, true)
		navigate(`/room/${roomId}`, { state: { username } })
	}

	//createCode
	//Entradas: Ninguna
	//Uso: Crea un codigo de 4 digitos al azar
	//Salida: String de 4 digitos
	const createCode = () => {
		const numero = Math.floor(Math.random()*10000)
		return String(numero).padStart(4,"0")
	}



//======================
//	Vista HTML / CSS
//======================

/*
	Full-Screen RED
		Filas: 3
			1F-> Columnas: 2
				1C -> Botón Crear Sala GREEN
				2C -> Botón Unirse Sala BLUE
			2F-> Input "Ingresa el Id de Sala..."
			3F-> Input "Ingresa tu nombre de Usuario..."
*/
	return (
		<>
			<div className="bg-red-900 w-screen h-screen flex items-center justify-center">
				<div className="flex flex-col gap-4">
					<div className="flex gap-4">
						<button
							className="bg-green-500 hover:bg-green-700 px-4 py-2 rounded w-1/2"
							onClick={() => createRoom(username)}>
							Crear Sala
						</button>
						<button
							className="bg-blue-500 hover:bg-blue-700 px-4 py-2 rounded w-1/2"
							onClick={() => joinRoom(roomId, username)}>
							Unirse a Sala
						</button>
					</div>
					<div className="flex flex-col gap-2">
						<input
							type="text"
							className="bg-white px-2 py-1 rounded w-80"
							placeholder="Ingresa el Id de la Sala..."
							value={roomId}
							onChange={(e) => setRoomId(e.target.value)}
						/>
						<input
							type="text"
							className="bg-white px-2 py-1 rounded w-80"
							placeholder="Ingresa tu nombre de Usuario..."
							value={username}
							onChange={(e) => setUsername(e.target.value)}
						/>
					</div>
				</div>

			</div>
		</>
	)
}
export default Starting_View