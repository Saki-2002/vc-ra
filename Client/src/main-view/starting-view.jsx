import { useRef, useState } from "react"
import Draggable from "react-draggable"
import * as handleConnection from "../logic/connection"
import { useNavigate } from "react-router-dom"

function Starting_View() {

	const navigate = useNavigate()
	const [roomId, setRoomId] = useState("")
	const [username, setUsername] = useState("")

	const joinRoom = (roomId, username) => {
		//Unirse a sala
		handleConnection.joinRoom(roomId, username, false)
		navigate(`/room/${roomId}`, { state: { username } })
	}

	const createRoom = (username) => {
		const roomId = createCode()
		handleConnection.joinRoom(roomId, username, true)
		navigate(`/room/${roomId}`, { state: { username } })
	}

	const createCode = () => {
		const numero = Math.floor(Math.random()*10000)
		return String(numero).padStart(4,"0")
	}

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